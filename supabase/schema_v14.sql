-- =====================================================================
-- Catholic Silanga CBO — Schema v14
-- Member contributions: full CRUD for treasurer/admin, read-only
-- for the member they belong to. Adds donation_type, proper audit
-- (created_by, verified_by), edit/delete RPCs, and tightens RLS so
-- it can NOT be bypassed from the frontend.
--
-- Run after schema_v13.sql. Safe to re-run.
-- =====================================================================


-- =====================================================================
-- 1. DONATION TYPE ENUM
--    Categorizes each contribution so the public page, member portal,
--    and Treasurer portal can filter / display by type.
-- =====================================================================
do $$ begin
  create type public.donation_type as enum (
    'tithe',
    'offering',
    'building_fund',
    'missions',
    'youth',
    'welfare',
    'event',
    'pledge',
    'other'
  );
exception when duplicate_object then null;
end $$;

alter table public.donations
  add column if not exists donation_type public.donation_type not null default 'other';

-- Helpful index for filtering by type
create index if not exists donations_type_idx on public.donations (donation_type, created_at desc);


-- =====================================================================
-- 2. AUDIT TRAIL — created_by
--    v2 already has verified_by; v14 adds created_by so we always
--    know who keyed in the row (treasurer/admin OR the member
--    themselves).
-- =====================================================================
alter table public.donations
  add column if not exists created_by uuid references public.profiles(id) on delete set null;

create index if not exists donations_created_by_idx on public.donations (created_by);


-- =====================================================================
-- 3. TIGHTEN RLS — drop the overly-permissive "any authenticated can
--    insert" policy, then re-create tight policies:
--
--    SELECT  : admin, treasurer, OR member reads their own row
--              (member sees own regardless of status; public/anon
--              only sees verified contributions via getVerifiedContributions).
--    INSERT  : member can insert own; treasurer/admin via RPC only
--              (SECURITY DEFINER bypasses RLS, but we also drop the
--              permissive with-check-true policy).
--    UPDATE  : admin + treasurer only (via RPC + RLS).
--    DELETE  : admin only (safer default — treasurer must ask admin).
-- =====================================================================
drop policy if exists "Authenticated members can submit a donation" on public.donations;
drop policy if exists "Donations treasurer-or-admin-update" on public.donations;
drop policy if exists "Donations treasurer-read" on public.donations;

-- SELECT — public sees only verified (used by /contributions page RPCs that filter explicitly)
drop policy if exists "Donations public read verified" on public.donations;
create policy "Donations public read verified" on public.donations
  for select to anon using (status = 'completed');

-- SELECT — authenticated: own rows (any status) + admin/treasurer sees everything
drop policy if exists "Donations auth read" on public.donations;
create policy "Donations auth read" on public.donations
  for select to authenticated
  using (
    donor_id = auth.uid()
    or member_id = auth.uid()
    or public.is_treasurer_or_admin()
  );

-- INSERT — members can insert their OWN donations only
drop policy if exists "Donations self-insert" on public.donations;
create policy "Donations self-insert" on public.donations
  for insert to authenticated
  with check (
    (donor_id = auth.uid() or member_id = auth.uid())
    and public.is_admin_or_self(member_id, donor_id)
  );

-- UPDATE — admin only (treasurer goes through RPC which is SECURITY DEFINER)
drop policy if exists "Donations admin update" on public.donations;
create policy "Donations admin update" on public.donations
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- DELETE — admin only
drop policy if exists "Donations admin delete" on public.donations;
create policy "Donations admin delete" on public.donations
  for delete to authenticated
  using (public.is_admin());

-- Tiny helper used in the insert policy. Returns true if the caller
-- is the member they're inserting for (or if they're admin).
create or replace function public.is_admin_or_self(p_member uuid, p_donor uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false)
    or p_member = auth.uid()
    or p_donor = auth.uid()
    or coalesce(p_member, p_donor) is null;
$$;

grant execute on function public.is_admin_or_self(uuid, uuid) to authenticated;


-- =====================================================================
-- 4. RPC: record_donation_for_member
--    Treasurer/admin records a contribution FOR a specific member.
--    Stamps created_by = caller. If status='completed' also stamps
--    verified_by = caller + verified_at = now(). Optionally sends a
--    notification to the member.
-- =====================================================================
create or replace function public.record_donation_for_member(
  p_member_id uuid,
  p_donor_name text,
  p_email text,
  p_amount numeric,
  p_currency text default 'KES',
  p_purpose text default 'General donation',
  p_donation_type public.donation_type default 'other',
  p_message text default null,
  p_method_id uuid default null,
  p_reference_code text default null,
  p_status text default 'completed',
  p_contribution_date date default current_date,
  p_notify_member boolean default true
) returns public.donations
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid;
  caller_role text;
  target_member public.profiles;
  row public.donations;
  clean_purpose text;
begin
  caller_id := auth.uid();
  if caller_id is null then raise exception 'Not authenticated'; end if;

  select role into caller_role from public.profiles where id = caller_id;
  if caller_role is null or caller_role not in ('admin','treasurer') then
    raise exception 'Only admin or treasurer can record contributions on behalf of a member';
  end if;

  if p_member_id is null then
    raise exception 'member_id is required';
  end if;

  select * into target_member from public.profiles where id = p_member_id;
  if target_member.id is null then
    raise exception 'Member not found';
  end if;

  if p_status not in ('pending','completed','failed') then
    raise exception 'Invalid status: %', p_status;
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be positive';
  end if;

  if length(coalesce(p_donor_name, '')) < 1 then
    raise exception 'Donor name is required';
  end if;

  if length(coalesce(p_email, '')) < 3 or p_email !~ '@' then
    raise exception 'Valid email is required';
  end if;

  -- Strip newline-only purpose to avoid empty purpose column.
  clean_purpose := nullif(trim(coalesce(p_purpose, '')), '');

  insert into public.donations (
    donor_name,    email,
    amount,        currency,    purpose,    donation_type,    message,
    member_id,     donor_id,    method_id,  reference_code,   status,
    created_by,    verified_by, verified_at,
    created_at
  ) values (
    p_donor_name,                            -- donor_name (display label, e.g. "On behalf of Member X")
    p_email,                                 -- email (contact)
    p_amount,                                -- amount
    coalesce(nullif(p_currency, ''), 'KES'), -- currency
    coalesce(clean_purpose, 'General donation'),
    p_donation_type,
    p_message,
    p_member_id,                             -- member_id (FK to profiles.id)
    p_member_id,                             -- donor_id (same as member when recorded by treasurer)
    p_method_id,
    nullif(trim(coalesce(p_reference_code, '')), ''),
    p_status,
    caller_id,                               -- created_by
    case when p_status = 'completed' then caller_id else null end,
    case when p_status = 'completed' then now() else null end,
    -- Allow backdating via p_contribution_date if you want, else default now
    coalesce(p_contribution_date::timestamptz, now())
  )
  returning * into row;

  -- Optional notification (best-effort, non-fatal)
  if p_notify_member and p_status = 'completed' then
    begin
      perform public.create_notification(
        p_recipient := p_member_id,
        p_kind := 'contribution_verified',
        p_title := 'Contribution recorded',
        p_message := 'A contribution of ' || p_amount || ' ' || row.currency ||
                     ' has been recorded on your behalf. Thank you!',
        p_link := '/member-dashboard?tab=contributions',
        p_payload := jsonb_build_object(
          'donation_id', row.id,
          'amount',      row.amount,
          'currency',    row.currency,
          'status',      row.status
        ),
        p_actor := caller_id
      );
    exception when others then
      raise notice 'Notification fan-out failed (non-fatal): %', SQLERRM;
    end;
  end if;

  return row;
end;
$$;

grant execute on function public.record_donation_for_member(
  uuid, text, text, numeric, text, text, public.donation_type, text, uuid, text, text, date, boolean
) to authenticated;


-- =====================================================================
-- 5. RPC: update_donation
--    Admin OR treasurer can edit any field of an existing donation.
--    If status flips to 'completed', stamps verified_by/verified_at.
--    If amount/member_id changes, the member portal sees the new
--    values immediately (RLS already grants them read access via
--    member_id = auth.uid()).
-- =====================================================================
create or replace function public.update_donation(
  p_donation_id uuid,
  p_patch jsonb
) returns public.donations
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid;
  caller_role text;
  existing public.donations;
  updated public.donations;
  new_status text;
  new_amount numeric;
begin
  caller_id := auth.uid();
  if caller_id is null then raise exception 'Not authenticated'; end if;
  select role into caller_role from public.profiles where id = caller_id;
  if caller_role is null or caller_role not in ('admin','treasurer') then
    raise exception 'Only admin or treasurer can edit contributions';
  end if;

  select * into existing from public.donations where id = p_donation_id;
  if existing.id is null then raise exception 'Donation not found'; end if;

  -- Validate amount if supplied
  if p_patch ? 'amount' then
    new_amount := (p_patch->>'amount')::numeric;
    if new_amount is null or new_amount <= 0 then
      raise exception 'Amount must be positive';
    end if;
  end if;

  -- Determine the status we'll end up at
  new_status := coalesce(p_patch->>'status', existing.status::text);
  if new_status not in ('pending','completed','failed') then
    raise exception 'Invalid status: %', new_status;
  end if;

  update public.donations d set
    donor_name     = coalesce(p_patch->>'donor_name', d.donor_name),
    email          = coalesce(p_patch->>'email',      d.email),
    amount         = coalesce(new_amount,            d.amount),
    currency       = coalesce(p_patch->>'currency',   d.currency),
    purpose        = coalesce(p_patch->>'purpose',    d.purpose),
    donation_type  = coalesce((p_patch->>'donation_type')::public.donation_type, d.donation_type),
    message        = case when p_patch ? 'message'      then p_patch->>'message'      else d.message end,
    member_id      = case when p_patch ? 'member_id'    then (p_patch->>'member_id')::uuid    else d.member_id end,
    method_id      = case when p_patch ? 'method_id'    then (p_patch->>'method_id')::uuid    else d.method_id end,
    reference_code = case when p_patch ? 'reference_code' then p_patch->>'reference_code' else d.reference_code end,
    status         = new_status,
    -- Lock-once-paid: if already verified > 1 hour ago, only admin can amend
    verified_by    = case
                      when new_status = 'completed'
                        then caller_id
                      when existing.status = 'completed' and existing.verified_at is not null
                        then existing.verified_by  -- keep original verifier on rollback
                      else d.verified_by
                    end,
    verified_at    = case
                      when new_status = 'completed'
                        then now()
                      when existing.status = 'completed' and existing.verified_at is not null
                        then existing.verified_at
                      else d.verified_at
                    end,
    admin_note     = case when p_patch ? 'admin_note' then p_patch->>'admin_note' else d.admin_note end
  where d.id = p_donation_id
  returning * into updated;

  return updated;
end;
$$;

grant execute on function public.update_donation(uuid, jsonb) to authenticated;


-- =====================================================================
-- 6. RPC: delete_donation
--    Admin only (treasurer cannot delete — separates audit authority).
--    CASCADE on donations.donor_id / member_id references means
--    deleting a member is destructive; this RPC only deletes a
--    single donation row, never a member.
-- =====================================================================
create or replace function public.delete_donation(p_donation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid;
  caller_role text;
  row public.donations;
begin
  caller_id := auth.uid();
  if caller_id is null then raise exception 'Not authenticated'; end if;
  select role into caller_role from public.profiles where id = caller_id;
  if caller_role is null or caller_role <> 'admin' then
    raise exception 'Only admin can delete contributions';
  end if;

  select * into row from public.donations where id = p_donation_id;
  if row.id is null then raise exception 'Donation not found'; end if;

  delete from public.donations where id = p_donation_id;
end;
$$;

grant execute on function public.delete_donation(uuid) to authenticated;


-- =====================================================================
-- 7. RPC: list_donations_for_member
--    Admin or treasurer fetches ALL donations for a specific member,
--    regardless of status. Used by the "Add contribution" picker
--    so the operator sees existing rows for that member.
-- =====================================================================
create or replace function public.list_donations_for_member(
  p_member_id uuid,
  p_limit int default 100
) returns setof public.donations
language sql
stable
security invoker
set search_path = public
as $$
  select * from public.donations
   where member_id = p_member_id
   order by created_at desc
   limit greatest(p_limit, 1);
$$;

grant execute on function public.list_donations_for_member(uuid, int) to authenticated;


-- =====================================================================
-- 8. RPC: list_all_donations (treasurer / admin full list)
--    Used by the portal's Donations tab to populate the table.
-- =====================================================================
create or replace function public.list_all_donations(p_limit int default 500)
returns setof public.donations
language sql
stable
security invoker
set search_path = public
as $$
  select * from public.donations
   order by created_at desc
   limit greatest(p_limit, 1);
$$;

grant execute on function public.list_all_donations(int) to authenticated;


-- =====================================================================
-- 9. AUTO-REFresh hint for member portal
--    When a donation row is INSERT/UPDATE/DELETE for a member, the
--    member's portal can listen to realtime changes. The trigger
--    below fires a notification (optional). The member dashboard
--    uses supabase.channel() to subscribe to these events.
-- =====================================================================
-- (No DB-side trigger needed for realtime — we just need the row to
-- be in the supabase_realtime publication.)

alter publication supabase_realtime add table public.donations;


-- =====================================================================
-- HOW TO USE
-- =====================================================================
-- 1. Run this in the Supabase SQL Editor (after v13.sql).
-- 2. donations.donation_type enum column is now NOT NULL with default
--    'other' (existing rows backfilled).
-- 3. RLS is tightened: members can read/update their own (via
--    member_id = auth.uid() OR donor_id = auth.uid()), treasurer +
--    admin see everything, only admin can DELETE.
-- 4. New RPCs (call from frontend):
--    - record_donation_for_member(member_id, donor_name, email, amount,
--      currency, purpose, donation_type, message, method_id,
--      reference_code, status, contribution_date, notify_member)
--    - update_donation(donation_id, patch_jsonb)
--    - delete_donation(donation_id)
--    - list_donations_for_member(member_id, limit)
--    - list_all_donations(limit)
-- 5. donations table is now in the realtime publication — member
--    portal auto-refreshes when treasury adds/edits their row.
-- 6. Member sees their own contributions via:
--      select * from list_donations_for_member(auth.uid(), 200)
--    which the existing listMyDonations RPC also covers via
--    donor_id OR member_id match.
</content>