-- =====================================================================
-- Catholic Silanga CBO — Schema additions v9
-- 1. Fix handle_new_user() to insert status='pending' so new signups
--    actually show up under pending members.
-- 2. New-signup notification: trigger on profiles insert fires
--    broadcast_notification for admins + moderators.
-- 3. Fines system: fines table + RLS + 3 RPCs (record / mark_paid / waive)
-- 4. Treasurer manual-entry RPCs:
--    - treasurer_record_donation: full control over all fields,
--      inserts with status='completed' (treasurer enters verified).
--    - treasurer_edit_donation: edits un-approved rows; LOCKED after approval.
--    - treasurer_record_expense + treasurer_edit_expense: same.
-- 5. TreasurerPortal /admin functions can also re-issue a "manual verify"
--    on a pending donation if the original submitter was wrong.
--
-- Run after schema_v8.sql. Safe to re-run (all CREATE OR REPLACE / IF NOT EXISTS).
-- =====================================================================

-- =====================================================================
-- 1. FIX: handle_new_user() should insert status='pending'
--    Previously, new signups silently defaulted to status='active' because
--    the column DEFAULT was 'active' and the INSERT didn't specify status.
--    That meant new users immediately had member-portal access without
--    anyone approving them.
-- =====================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, status)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    'pending'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Note: this only affects NEW signups from this point on. Existing users
-- who registered before this fix and got status='active' are unchanged
-- (they were already admitted; we don't want to retroactively lock anyone out).
-- The trigger in schema.sql is re-attached in case it was missing.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================================
-- 2. NEW-SIGNUP NOTIFICATION: when a new pending profile is created,
--    notify every active admin + moderator so they can approve/reject.
-- =====================================================================
create or replace function public.notify_admins_new_signup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  admin_count int;
begin
  -- Only fire for NEW pending accounts (not for status flips on existing users).
  if (tg_op = 'INSERT') and (new.status = 'pending') then
    -- Use the existing broadcast_notification but route through a dedicated
    -- helper so we can scope to admins + moderators only.
    insert into public.notifications (recipient_id, actor_id, kind, title, message, link, payload)
    select p.id, new.id, 'system',
      'New member awaiting approval',
      new.display_name || ' (' || new.email || ') just registered and needs to be approved.',
      '/admin-dashboard',
      jsonb_build_object('new_user_id', new.id, 'display_name', new.display_name)
    from public.profiles p
    where p.status = 'active' and p.role in ('admin', 'moderator');

    get diagnostics admin_count = row_count;
    raise notice 'Notified % admins/moderators of new signup: % (%)',
      admin_count, new.display_name, new.email;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notify_admins_new_signup on public.profiles;
create trigger trg_notify_admins_new_signup
  after insert on public.profiles
  for each row
  execute function public.notify_admins_new_signup();

-- =====================================================================
-- 3. FINES SYSTEM
-- =====================================================================

create table if not exists public.fines (
  id uuid primary key default uuid_generate_v4(),
  member_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric not null check (amount > 0),
  currency text not null default 'KES',
  reason text not null check (length(reason) >= 3),
  status text not null default 'unpaid'
    check (status in ('unpaid', 'paid', 'waived')),
  issued_by uuid not null references public.profiles(id) on delete set null,
  due_date date,
  paid_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists fines_member_idx on public.fines (member_id, status);
create index if not exists fines_status_idx on public.fines (status);
create index if not exists fines_created_idx on public.fines (created_at desc);

alter table public.fines enable row level security;

-- Helper: can current user issue fines? Treasurer, admin, or moderator.
-- (Moderator per your decision — they can issue fines.)
create or replace function public.can_issue_fines()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(
    (select role in ('admin','treasurer','moderator') and status = 'active'
       from public.profiles where id = auth.uid()),
    false
  );
$$;

-- Members see their own fines.
drop policy if exists "Fines self read" on public.fines;
create policy "Fines self read"
  on public.fines for select to authenticated
  using (
    member_id = auth.uid()
    or public.can_issue_fines()
  );

-- Issue / edit / waive is gated to can_issue_fines().
drop policy if exists "Fines issuer write" on public.fines;
create policy "Fines issuer write"
  on public.fines for all to authenticated
  using (public.can_issue_fines())
  with check (public.can_issue_fines());

-- RPC: record_fine
create or replace function public.record_fine(
  p_member_id uuid,
  p_amount numeric,
  p_reason text,
  p_due_date date default null,
  p_notes text default null
)
returns public.fines
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid;
  caller_role text;
  member_role text;
  member_status text;
  inserted public.fines;
begin
  caller_id := auth.uid();
  if caller_id is null then
    raise exception 'Not authenticated';
  end if;

  select role into caller_role from public.profiles where id = caller_id;
  if caller_role is null or caller_role not in ('admin','treasurer','moderator') then
    raise exception 'Only admin, treasurer, or moderator can issue fines';
  end if;

  if not public.can_issue_fines() then
    raise exception 'Your account is not active — cannot issue fines';
  end if;

  if p_member_id = caller_id then
    raise exception 'You cannot fine yourself';
  end if;

  select role, status into member_role, member_status from public.profiles where id = p_member_id;
  if member_role is null then
    raise exception 'Target member not found';
  end if;
  if member_status <> 'active' then
    raise exception 'Cannot fine a non-active member';
  end if;

  -- Moderators cannot fine admins.
  if caller_role = 'moderator' and member_role = 'admin' then
    raise exception 'Moderators cannot fine admin accounts';
  end if;

  if p_amount <= 0 then
    raise exception 'Fine amount must be positive';
  end if;

  if length(coalesce(p_reason, '')) < 3 then
    raise exception 'Fine reason is required (at least 3 characters)';
  end if;

  insert into public.fines (member_id, amount, reason, issued_by, due_date, notes)
  values (p_member_id, p_amount, p_reason, caller_id, p_due_date, p_notes)
  returning * into inserted;

  -- Notify the fined member.
  perform public.create_notification(
    p_recipient := p_member_id,
    p_kind := 'system',
    p_title := 'You have been fined ' || inserted.amount || ' ' || inserted.currency,
    p_message := p_reason,
    p_link := '/member-dashboard?tab=fines',
    p_payload := jsonb_build_object('fine_id', inserted.id, 'amount', inserted.amount, 'currency', inserted.currency),
    p_actor := caller_id
  );

  return inserted;
end;
$$;

grant execute on function public.record_fine(uuid, numeric, text, date, text) to authenticated;

-- RPC: mark_fine_paid (any issuer role can mark a fine as collected).
create or replace function public.mark_fine_paid(p_fine_id uuid)
returns public.fines
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid;
  updated public.fines;
begin
  caller_id := auth.uid();
  if caller_id is null then
    raise exception 'Not authenticated';
  end if;

  if not public.can_issue_fines() then
    raise exception 'Not authorized';
  end if;

  update public.fines
    set status = 'paid',
        paid_at = now(),
        updated_at = now()
    where id = p_fine_id
    returning * into updated;

  if updated.id is null then
    raise exception 'Fine not found';
  end if;

  -- Notify the fined member.
  perform public.create_notification(
    p_recipient := updated.member_id,
    p_kind := 'system',
    p_title := 'Your fine was marked as paid',
    p_message := 'The ' || updated.amount || ' ' || updated.currency ||
                 ' fine has been recorded as paid. Thank you.',
    p_link := '/member-dashboard?tab=fines',
    p_payload := jsonb_build_object('fine_id', updated.id),
    p_actor := caller_id
  );

  return updated;
end;
$$;

grant execute on function public.mark_fine_paid(uuid) to authenticated;

-- RPC: waive_fine (cancel without payment).
create or replace function public.waive_fine(p_fine_id uuid, p_reason text default null)
returns public.fines
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid;
  updated public.fines;
begin
  caller_id := auth.uid();
  if caller_id is null then
    raise exception 'Not authenticated';
  end if;

  if not public.can_issue_fines() then
    raise exception 'Not authorized';
  end if;

  update public.fines
    set status = 'waived',
        notes = coalesce(updated.notes, '') ||
                case when p_reason is not null
                     then case when notes is null then '' else E'\n' end ||
                          '[Waived] ' || p_reason
                     else ''
                end,
        updated_at = now()
    where id = p_fine_id
    returning * into updated;

  if updated.id is null then
    raise exception 'Fine not found';
  end if;

  perform public.create_notification(
    p_recipient := updated.member_id,
    p_kind := 'system',
    p_title := 'Your fine was waived',
    p_message := coalesce(p_reason, 'A fine was waived in your favor.'),
    p_link := '/member-dashboard?tab=fines',
    p_payload := jsonb_build_object('fine_id', updated.id),
    p_actor := caller_id
  );

  return updated;
end;
$$;

grant execute on function public.waive_fine(uuid, text) to authenticated;

-- Public read for transparency on finance page (only paid fines are visible
-- as income — unpaid ones are pending receivables, not income yet).
drop policy if exists "Fines public read" on public.fines;
create policy "Fines public read"
  on public.fines for select using (true);

-- =====================================================================
-- 4. TREASURER MANUAL-ENTRY: donations + expenses
--    Treasurer (or admin) can create a fully-specified donation/expense
--    from scratch — donor info, amount, payment method, everything.
--    For donations, manual entries default to status='completed' (the
--    treasurer IS the verifier). For expenses, manual entries default
--    to status='pending' for admin approval (we don't let treasurer
--    self-approve expenses).
-- =====================================================================

-- RPC: treasurer_record_donation
-- Used when the treasurer records a donation that came in via physical
-- collection (cash at Sunday service, M-Pesa confirmation outside the
-- site, etc.). Inserts a fully-specified donation row with status='completed'.
create or replace function public.treasurer_record_donation(
  p_donor_name text,
  p_email text,
  p_amount numeric,
  p_currency text default 'KES',
  p_purpose text default 'General donation',
  p_message text default null,
  p_method_id uuid default null,
  p_reference_code text default null,
  p_donor_id uuid default null,
  p_created_at timestamptz default null
)
returns public.donations
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid;
  caller_role text;
  inserted public.donations;
begin
  caller_id := auth.uid();
  if caller_id is null then
    raise exception 'Not authenticated';
  end if;

  select role into caller_role from public.profiles where id = caller_id;
  if caller_role is null or caller_role not in ('admin','treasurer') then
    raise exception 'Only admin or treasurer can record donations manually';
  end if;

  if p_amount <= 0 then
    raise exception 'Donation amount must be positive';
  end if;
  if length(coalesce(p_donor_name, '')) < 1 then
    raise exception 'Donor name is required';
  end if;
  if length(coalesce(p_email, '')) < 3 or p_email !~ '@' then
    raise exception 'Valid donor email is required';
  end if;

  insert into public.donations (
    donor_name, email, amount, currency, purpose, message,
    member_id, method_id, reference_code, donor_id, status,
    verified_by, verified_at, created_at
  ) values (
    p_donor_name, p_email, p_amount,
    coalesce(nullif(p_currency, ''), 'KES'),
    coalesce(nullif(p_purpose, ''), 'General donation'),
    p_message,
    p_donor_id,                 -- member_id (linked profile if applicable)
    p_method_id,
    nullif(p_reference_code, ''),
    p_donor_id,                 -- donor_id
    'completed',                -- treasurer IS the verifier
    caller_id,
    now(),
    coalesce(p_created_at, now())
  )
  returning * into inserted;

  -- Notify the donor if linked to a member profile.
  if inserted.donor_id is not null then
    perform public.create_notification(
      p_recipient := inserted.donor_id,
      p_kind := 'contribution_verified',
      p_title := 'Contribution verified',
      p_message := 'Your contribution of ' || inserted.amount || ' ' ||
                   inserted.currency || ' for "' || inserted.purpose ||
                   '" has been recorded by the Treasurer. Thank you!',
      p_link := '/member-dashboard?tab=contributions',
      p_payload := jsonb_build_object(
        'donation_id', inserted.id, 'amount', inserted.amount,
        'currency', inserted.currency, 'status', 'completed'
      ),
      p_actor := caller_id
    );
  end if;

  return inserted;
end;
$$;

grant execute on function public.treasurer_record_donation(
  text, text, numeric, text, text, text, uuid, text, uuid, timestamptz
) to authenticated;

-- RPC: treasurer_edit_donation
-- Allows the treasurer (or admin) to edit a donation. LOCKED once
-- verified_by is set AND verified_at is more than 1 hour old (so the
-- treasurer can't retroactively rewrite an audited entry).
create or replace function public.treasurer_edit_donation(
  p_donation_id uuid,
  p_patch jsonb
)
returns public.donations
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid;
  caller_role text;
  existing public.donations;
  updated public.donations;
begin
  caller_id := auth.uid();
  if caller_id is null then
    raise exception 'Not authenticated';
  end if;

  select role into caller_role from public.profiles where id = caller_id;
  if caller_role is null or caller_role not in ('admin','treasurer') then
    raise exception 'Only admin or treasurer can edit donations';
  end if;

  select * into existing from public.donations where id = p_donation_id;
  if existing.id is null then
    raise exception 'Donation not found';
  end if;

  -- Lock: if verified_at is older than 1 hour, refuse.
  if existing.verified_at is not null
     and existing.verified_at < now() - interval '1 hour'
     and caller_role <> 'admin' then
    raise exception 'This donation was verified over an hour ago and is locked. Only admins can amend.';
  end if;

  update public.donations d set
    donor_name   = coalesce(p_patch->>'donor_name',   d.donor_name),
    email        = coalesce(p_patch->>'email',        d.email),
    amount       = case when p_patch ? 'amount'       then (p_patch->>'amount')::numeric else d.amount end,
    currency     = coalesce(p_patch->>'currency',     d.currency),
    purpose      = coalesce(p_patch->>'purpose',      d.purpose),
    message      = case when p_patch ? 'message'      then p_patch->>'message' else d.message end,
    method_id    = case when p_patch ? 'method_id'    then (p_patch->>'method_id')::uuid else d.method_id end,
    reference_code = case when p_patch ? 'reference_code' then p_patch->>'reference_code' else d.reference_code end,
    admin_note   = case when p_patch ? 'admin_note'   then p_patch->>'admin_note' else d.admin_note end
    where d.id = p_donation_id
    returning * into updated;

  return updated;
end;
$$;

grant execute on function public.treasurer_edit_donation(uuid, jsonb) to authenticated;

-- RPC: treasurer_record_expense — manual entry. Status='pending' so
-- admin must approve (separation of duties).
create or replace function public.treasurer_record_expense(
  p_title text,
  p_amount numeric,
  p_category text,
  p_currency text default 'KES',
  p_description text default null,
  p_vendor text default null,
  p_receipt_url text default null,
  p_expense_date date default current_date
)
returns public.expenses
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid;
  caller_role text;
  inserted public.expenses;
begin
  caller_id := auth.uid();
  if caller_id is null then
    raise exception 'Not authenticated';
  end if;

  select role into caller_role from public.profiles where id = caller_id;
  if caller_role is null or caller_role not in ('admin','treasurer') then
    raise exception 'Only admin or treasurer can record expenses';
  end if;

  if length(coalesce(p_title, '')) < 1 then
    raise exception 'Expense title is required';
  end if;
  if p_amount <= 0 then
    raise exception 'Expense amount must be positive';
  end if;

  insert into public.expenses (
    title, amount, currency, category, description,
    vendor, receipt_url, expense_date, recorded_by
  ) values (
    p_title, p_amount, coalesce(nullif(p_currency, ''), 'KES'),
    p_category, p_description, p_vendor, p_receipt_url,
    coalesce(p_expense_date, current_date), caller_id
  )
  returning * into inserted;

  return inserted;
end;
$$;

grant execute on function public.treasurer_record_expense(
  text, numeric, text, text, text, text, text, date
) to authenticated;

-- RPC: treasurer_edit_expense — locked after admin approval.
create or replace function public.treasurer_edit_expense(
  p_expense_id uuid,
  p_patch jsonb
)
returns public.expenses
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid;
  caller_role text;
  existing public.expenses;
  updated public.expenses;
begin
  caller_id := auth.uid();
  if caller_id is null then
    raise exception 'Not authenticated';
  end if;

  select role into caller_role from public.profiles where id = caller_id;
  if caller_role is null or caller_role not in ('admin','treasurer') then
    raise exception 'Only admin or treasurer can edit expenses';
  end if;

  select * into existing from public.expenses where id = p_expense_id;
  if existing.id is null then
    raise exception 'Expense not found';
  end if;

  -- Lock after admin approval
  if existing.approved_at is not null and caller_role <> 'admin' then
    raise exception 'This expense was approved by an admin and is locked. Only admins can amend.';
  end if;

  update public.expenses e set
    title       = coalesce(p_patch->>'title',       e.title),
    amount      = case when p_patch ? 'amount'      then (p_patch->>'amount')::numeric else e.amount end,
    currency    = coalesce(p_patch->>'currency',    e.currency),
    category    = coalesce(p_patch->>'category',    e.category),
    description = case when p_patch ? 'description' then p_patch->>'description' else e.description end,
    vendor      = case when p_patch ? 'vendor'      then p_patch->>'vendor'      else e.vendor end,
    receipt_url = case when p_patch ? 'receipt_url' then p_patch->>'receipt_url' else e.receipt_url end,
    expense_date = case when p_patch ? 'expense_date' then (p_patch->>'expense_date')::date else e.expense_date end
    where e.id = p_expense_id
    returning * into updated;

  return updated;
end;
$$;

grant execute on function public.treasurer_edit_expense(uuid, jsonb) to authenticated;

-- =====================================================================
-- 5. FINE STATS VIEW: total collected (paid) + total outstanding (unpaid)
--    Used by FinanceOverviewPage for the public dashboard.
-- =====================================================================
create or replace view public.fine_stats as
select
  coalesce(sum(case when status = 'paid'    then amount else 0 end), 0) as total_collected,
  coalesce(sum(case when status = 'unpaid'  then amount else 0 end), 0) as total_outstanding,
  coalesce(sum(case when status = 'waived'  then amount else 0 end), 0) as total_waived,
  count(*) filter (where status = 'unpaid') as unpaid_count,
  count(*) filter (where status = 'paid')   as paid_count,
  count(*) filter (where status = 'waived') as waived_count
from public.fines;

grant select on public.fine_stats to anon, authenticated;

-- =====================================================================
-- HOW TO USE
-- =====================================================================
-- 1. Run this file in the Supabase SQL Editor (after v8.sql).
-- 2. New signups from this point on get status='pending' and trigger
--    a notification to all active admin + moderator profiles.
-- 3. TreasurerPortal gains "Record donation" / "Record expense" /
--    "Issue fine" buttons. After deploy, the Treasurer UI will
--    auto-bind to the new RPCs.
-- 4. Fines show on the public /finance page as:
--    - "Collected fines" (paid) — counted as income
--    - "Outstanding fines" (unpaid) — shown as a separate stat, NOT income
-- 5. Edits to donations/expenses are locked 1 hour after verification
--    for treasurer; admin can always amend.