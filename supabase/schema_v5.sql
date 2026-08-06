-- =====================================================================
-- Catholic Silanga CBO — Schema additions v5
-- Adds: extended roles (moderator/secretary/treasurer), meetings
-- (rsvps, attendance, minutes), polls/voting, expenses + financial
-- reports, and a full set of role-gated RPC functions.
--
-- Run this AFTER schema.sql, schema_v2.sql, schema_v3.sql, schema_v4.sql.
-- Safe to re-run: uses IF NOT EXISTS / DROP POLICY IF EXISTS / CREATE OR REPLACE.
-- =====================================================================

-- =====================================================================
-- 1. EXTEND PROFILES.ROLE TO ACCEPT NEW VALUES
-- =====================================================================

-- Drop the existing check so we can widen the allowed set.
alter table public.profiles drop constraint if exists profiles_role_check;

-- New allowed values: admin, member, moderator, secretary, treasurer.
-- (We deliberately keep "moderator" though it's not used yet — leaves the
-- door open for an admin-light role without a schema migration later.)
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('admin','member','moderator','secretary','treasurer'));

-- =====================================================================
-- 2. ROLE HELPERS
--    is_admin() stays admin-only (don't widen it; secretary/treasurer
--    are NOT admins, just role-gated contributors).
-- =====================================================================

create or replace function public.is_admin()
returns boolean
language sql stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role = 'admin' from public.profiles where id = auth.uid()),
    false
  );
$$;

create or replace function public.is_secretary()
returns boolean
language sql stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role = 'secretary' from public.profiles where id = auth.uid()),
    false
  );
$$;

create or replace function public.is_treasurer()
returns boolean
language sql stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role = 'treasurer' from public.profiles where id = auth.uid()),
    false
  );
$$;

-- Convenience: secretary-or-admin (frequent pattern in policies).
create or replace function public.is_secretary_or_admin()
returns boolean
language sql stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role in ('admin','secretary') from public.profiles where id = auth.uid()),
    false
  );
$$;

-- Convenience: treasurer-or-admin.
create or replace function public.is_treasurer_or_admin()
returns boolean
language sql stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role in ('admin','treasurer') from public.profiles where id = auth.uid()),
    false
  );
$$;

-- =====================================================================
-- 3. MEETINGS
-- =====================================================================

create table if not exists public.meetings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  scheduled_at timestamptz not null,
  location text,
  meeting_type text not null default 'general'
    check (meeting_type in ('general','committee','emergency','agm')),
  status text not null default 'scheduled'
    check (status in ('scheduled','in_progress','completed','cancelled')),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists meetings_scheduled_at_idx on public.meetings (scheduled_at asc);
create index if not exists meetings_status_idx on public.meetings (status);

drop trigger if exists trg_meetings_updated on public.meetings;
create trigger trg_meetings_updated
  before update on public.meetings
  for each row execute function public.set_updated_at();

-- Updated_at trigger function defined in schema.sql; create-or-replace here
-- to be robust if v5 is ever run before schema.sql.
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

-- ----- RSVPs -----
create table if not exists public.meeting_rsvps (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings (id) on delete cascade,
  member_id uuid not null references public.profiles (id) on delete cascade,
  response text not null check (response in ('attending','not_attending','maybe')),
  reason text,
  submitted_at timestamptz not null default now(),
  unique (meeting_id, member_id)
);

create index if not exists meeting_rsvps_meeting_idx on public.meeting_rsvps (meeting_id);
create index if not exists meeting_rsvps_member_idx on public.meeting_rsvps (member_id);

-- ----- Attendance -----
create table if not exists public.meeting_attendance (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings (id) on delete cascade,
  member_id uuid not null references public.profiles (id) on delete cascade,
  status text not null check (status in ('present','absent','excused')),
  checked_in_at timestamptz not null default now(),
  marked_by uuid references auth.users (id) on delete set null,
  unique (meeting_id, member_id)
);

create index if not exists meeting_attendance_meeting_idx on public.meeting_attendance (meeting_id);
create index if not exists meeting_attendance_member_idx on public.meeting_attendance (member_id);

-- ----- Minutes -----
create table if not exists public.meeting_minutes (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null unique references public.meetings (id) on delete cascade,
  agenda text,
  discussions text,
  decisions text,
  action_items jsonb not null default '[]'::jsonb,
  published_by uuid references auth.users (id) on delete set null,
  published_at timestamptz not null default now()
);

-- =====================================================================
-- 4. POLLS / VOTING
-- =====================================================================

create table if not exists public.polls (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  type text not null default 'single_choice'
    check (type in ('single_choice','multiple_choice','yes_no')),
  status text not null default 'open'
    check (status in ('open','closed')),
  closes_at timestamptz not null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists polls_status_idx on public.polls (status);
create index if not exists polls_closes_at_idx on public.polls (closes_at);

create table if not exists public.poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls (id) on delete cascade,
  label text not null,
  display_order int not null default 0
);

create index if not exists poll_options_poll_idx on public.poll_options (poll_id, display_order);

create table if not exists public.poll_votes (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls (id) on delete cascade,
  option_id uuid not null references public.poll_options (id) on delete cascade,
  voter_id uuid not null references auth.users (id) on delete cascade,
  voted_at timestamptz not null default now(),
  unique (poll_id, voter_id)
);

create index if not exists poll_votes_poll_idx on public.poll_votes (poll_id);
create index if not exists poll_votes_option_idx on public.poll_votes (option_id);

-- =====================================================================
-- 5. EXPENSES + FINANCIAL REPORTS
-- =====================================================================

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  amount numeric not null check (amount > 0),
  currency text not null default 'KES',
  category text not null
    check (category in ('operations','events','charity','utilities','salaries','supplies','maintenance','other')),
  description text,
  receipt_url text,
  vendor text,
  expense_date date not null,
  recorded_by uuid references auth.users (id) on delete set null,
  approved_by uuid references auth.users (id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists expenses_date_idx on public.expenses (expense_date desc);
create index if not exists expenses_category_idx on public.expenses (category);
create index if not exists expenses_approved_idx on public.expenses (approved_at);

create table if not exists public.financial_reports (
  id uuid primary key default gen_random_uuid(),
  period_start date not null,
  period_end date not null,
  opening_balance numeric not null default 0,
  total_income numeric not null default 0,
  total_expenses numeric not null default 0,
  closing_balance numeric not null default 0,
  notes text,
  status text not null default 'draft'
    check (status in ('draft','submitted','approved')),
  prepared_by uuid references auth.users (id) on delete set null,
  approved_by uuid references auth.users (id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  check (period_end >= period_start),
  unique (period_start, period_end)
);

create index if not EXISTS financial_reports_period_idx on public.financial_reports (period_start desc, period_end desc);
create index if not exists financial_reports_status_idx on public.financial_reports (status);

-- =====================================================================
-- 6. ROW LEVEL SECURITY — enable on all new tables
-- =====================================================================

alter table public.meetings           enable row level security;
alter table public.meeting_rsvps      enable row level security;
alter table public.meeting_attendance enable row level security;
alter table public.meeting_minutes    enable row level security;
alter table public.polls              enable row level security;
alter table public.poll_options       enable row level security;
alter table public.poll_votes         enable row level security;
alter table public.expenses           enable row level security;
alter table public.financial_reports  enable row level security;

-- =====================================================================
-- 7. POLICIES — meetings
-- =====================================================================

-- All authenticated members can read meetings.
drop policy if exists "Meetings readable by authenticated" on public.meetings;
create policy "Meetings readable by authenticated"
  on public.meetings for select to authenticated using (true);

-- Only secretary/admin can write meetings.
drop policy if exists "Meetings secretary-write" on public.meetings;
create policy "Meetings secretary-write"
  on public.meetings for all to authenticated
  using (public.is_secretary_or_admin())
  with check (public.is_secretary_or_admin());

-- RSVPs: all members can read; members can write their own; secretary/admin too.
drop policy if exists "Meeting RSVPs readable by authenticated" on public.meeting_rsvps;
create policy "Meeting RSVPs readable by authenticated"
  on public.meeting_rsvps for select to authenticated using (true);

drop policy if exists "Meeting RSVPs self-write" on public.meeting_rsvps;
create policy "Meeting RSVPs self-write"
  on public.meeting_rsvps for insert to authenticated
  with check (member_id = auth.uid() or public.is_secretary_or_admin());

drop policy if exists "Meeting RSVPs self-update" on public.meeting_rsvps;
create policy "Meeting RSVPs self-update"
  on public.meeting_rsvps for update to authenticated
  using (member_id = auth.uid() or public.is_secretary_or_admin())
  with check (member_id = auth.uid() or public.is_secretary_or_admin());

drop policy if exists "Meeting RSVPs secretary-delete" on public.meeting_rsvps;
create policy "Meeting RSVPs secretary-delete"
  on public.meeting_rsvps for delete to authenticated
  using (public.is_secretary_or_admin());

-- Attendance: all read; secretary/admin write.
drop policy if exists "Meeting attendance readable by authenticated" on public.meeting_attendance;
create policy "Meeting attendance readable by authenticated"
  on public.meeting_attendance for select to authenticated using (true);

drop policy if exists "Meeting attendance secretary-write" on public.meeting_attendance;
create policy "Meeting attendance secretary-write"
  on public.meeting_attendance for all to authenticated
  using (public.is_secretary_or_admin())
  with check (public.is_secretary_or_admin());

-- Minutes: all read; secretary/admin write.
drop policy if exists "Meeting minutes readable by authenticated" on public.meeting_minutes;
create policy "Meeting minutes readable by authenticated"
  on public.meeting_minutes for select to authenticated using (true);

drop policy if exists "Meeting minutes secretary-write" on public.meeting_minutes;
create policy "Meeting minutes secretary-write"
  on public.meeting_minutes for all to authenticated
  using (public.is_secretary_or_admin())
  with check (public.is_secretary_or_admin());

-- =====================================================================
-- 8. POLICIES — polls
-- =====================================================================

drop policy if exists "Polls readable by authenticated" on public.polls;
create policy "Polls readable by authenticated"
  on public.polls for select to authenticated using (true);

drop policy if exists "Polls secretary-admin-write" on public.polls;
create policy "Polls secretary-admin-write"
  on public.polls for all to authenticated
  using (public.is_secretary_or_admin())
  with check (public.is_secretary_or_admin());

drop policy if exists "Poll options readable by authenticated" on public.poll_options;
create policy "Poll options readable by authenticated"
  on public.poll_options for select to authenticated using (true);

drop policy if exists "Poll options secretary-admin-write" on public.poll_options;
create policy "Poll options secretary-admin-write"
  on public.poll_options for all to authenticated
  using (public.is_secretary_or_admin())
  with check (public.is_secretary_or_admin());

-- Votes: readable by any authenticated. Insert/update via RPC only
-- (the cast_poll_vote RPC is SECURITY DEFINER and does the validation).
-- We still allow a self-read for the voter's own row even if RLS would
-- otherwise hide other voters' choices; the read policy below grants
-- full visibility, which is fine for a CBO where voting is transparent.
drop policy if exists "Poll votes readable by authenticated" on public.poll_votes;
create policy "Poll votes readable by authenticated"
  on public.poll_votes for select to authenticated using (true);

-- No direct INSERT/UPDATE/DELETE on poll_votes — must go through cast_poll_vote().
-- (We rely on the RPC's SECURITY DEFINER to bypass RLS for the actual write.)

-- =====================================================================
-- 9. POLICIES — expenses
-- =====================================================================

drop policy if exists "Expenses readable by authenticated" on public.expenses;
create policy "Expenses readable by authenticated"
  on public.expenses for select to authenticated using (true);

drop policy if exists "Expenses treasurer-write" on public.expenses;
create policy "Expenses treasurer-write"
  on public.expenses for insert to authenticated
  with check (public.is_treasurer_or_admin());

drop policy if exists "Expenses treasurer-update" on public.expenses;
create policy "Expenses treasurer-update"
  on public.expenses for update to authenticated
  using (public.is_treasurer_or_admin())
  with check (public.is_treasurer_or_admin());

drop policy if exists "Expenses admin-update-approval" on public.expenses;
create policy "Expenses admin-update-approval"
  on public.expenses for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Expenses admin-delete" on public.expenses;
create policy "Expenses admin-delete"
  on public.expenses for delete to authenticated
  using (public.is_admin());

-- =====================================================================
-- 10. POLICIES — financial reports
-- =====================================================================

drop policy if exists "Financial reports readable by authenticated" on public.financial_reports;
create policy "Financial reports readable by authenticated"
  on public.financial_reports for select to authenticated using (true);

drop policy if exists "Financial reports treasurer-write" on public.financial_reports;
create policy "Financial reports treasurer-write"
  on public.financial_reports for insert to authenticated
  with check (public.is_treasurer_or_admin());

drop policy if exists "Financial reports treasurer-update" on public.financial_reports;
create policy "Financial reports treasurer-update"
  on public.financial_reports for update to authenticated
  using (public.is_treasurer_or_admin())
  with check (public.is_treasurer_or_admin());

drop policy if exists "Financial reports admin-update-approval" on public.financial_reports;
create policy "Financial reports admin-update-approval"
  on public.financial_reports for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Financial reports admin-delete" on public.financial_reports;
create policy "Financial reports admin-delete"
  on public.financial_reports for delete to authenticated
  using (public.is_admin());

-- =====================================================================
-- 11. RPC: ADMIN ACTIONS
-- =====================================================================

-- admin_delete_member: removes a profile AND its auth.users row.
-- SECURITY DEFINER so it can hit auth.users (which the caller can't write to).
create or replace function public.admin_delete_member(target_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid;
  target_count int;
begin
  caller_id := auth.uid();
  if caller_id is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_admin() then
    raise exception 'Only admins can delete members';
  end if;

  if target_user_id = caller_id then
    raise exception 'Admins cannot delete themselves';
  end if;

  -- Make sure the target exists.
  select count(*) into target_count from public.profiles where id = target_user_id;
  if target_count = 0 then
    raise exception 'Target profile not found';
  end if;

  -- Delete the auth user (cascade removes the profile via FK on delete cascade).
  delete from auth.users where id = target_user_id;

  -- Belt-and-suspenders: if the profile still exists (e.g. FK isn't a cascade
  -- in some setups), clean it up explicitly.
  delete from public.profiles where id = target_user_id;

  return true;
end;
$$;

grant execute on function public.admin_delete_member(uuid) to authenticated;

-- admin_set_system_role: update a profile's role.
-- SECURITY DEFINER so admins can promote/demote without being blocked by RLS.
create or replace function public.admin_set_system_role(
  target_user_id uuid,
  new_role text
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid;
  updated_row public.profiles;
begin
  caller_id := auth.uid();
  if caller_id is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_admin() then
    raise exception 'Only admins can change roles';
  end if;

  if new_role not in ('admin','member','moderator','secretary','treasurer') then
    raise exception 'Invalid role: %', new_role;
  end if;

  update public.profiles
    set role = new_role,
        updated_at = now()
    where id = target_user_id;

  if not found then
    raise exception 'Target profile not found';
  end if;

  select * into updated_row from public.profiles where id = target_user_id;
  return updated_row;
end;
$$;

grant execute on function public.admin_set_system_role(uuid, text) to authenticated;

-- =====================================================================
-- 12. RPC: MEETINGS
-- =====================================================================

-- submit_meeting_rsvp: upsert the caller's own RSVP.
create or replace function public.submit_meeting_rsvp(
  meeting_id uuid,
  response text,
  reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid;
  caller_status text;
begin
  caller_id := auth.uid();
  if caller_id is null then
    raise exception 'Not authenticated';
  end if;

  if response not in ('attending','not_attending','maybe') then
    raise exception 'Invalid response: %', response;
  end if;

  -- Must be an active member.
  select status into caller_status
    from public.profiles where id = caller_id;
  if caller_status is null or caller_status <> 'active' then
    raise exception 'Only active members can RSVP';
  end if;

  -- Ensure the meeting exists.
  if not exists (select 1 from public.meetings where id = meeting_id) then
    raise exception 'Meeting not found';
  end if;

  insert into public.meeting_rsvps (meeting_id, member_id, response, reason)
    values (meeting_id, caller_id, response, reason)
    on conflict (meeting_id, member_id) do update
      set response = excluded.response,
          reason = excluded.reason,
          submitted_at = now();
end;
$$;

grant execute on function public.submit_meeting_rsvp(uuid, text, text) to authenticated;

-- check_in_to_meeting: self-service check-in (when meeting is "today or past").
create or replace function public.check_in_to_meeting(meeting_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid;
  caller_status text;
  meeting_scheduled_at timestamptz;
  meeting_status text;
begin
  caller_id := auth.uid();
  if caller_id is null then
    raise exception 'Not authenticated';
  end if;

  select status into caller_status
    from public.profiles where id = caller_id;
  if caller_status is null or caller_status <> 'active' then
    raise exception 'Only active members can check in';
  end if;

  select scheduled_at, status into meeting_scheduled_at, meeting_status
    from public.meetings where id = meeting_id;

  if meeting_scheduled_at is null then
    raise exception 'Meeting not found';
  end if;

  -- Allow check-in from 1 hour before scheduled time onwards.
  if meeting_scheduled_at > now() + interval '1 hour' then
    raise exception 'Cannot check in yet — meeting starts at %', meeting_scheduled_at;
  end if;

  if meeting_status = 'cancelled' then
    raise exception 'Meeting was cancelled';
  end if;

  insert into public.meeting_attendance (meeting_id, member_id, status, marked_by)
    values (meeting_id, caller_id, 'present', caller_id)
    on conflict (meeting_id, member_id) do update
      set status = 'present',
          checked_in_at = now(),
          marked_by = excluded.marked_by;
end;
$$;

grant execute on function public.check_in_to_meeting(uuid) to authenticated;

-- mark_meeting_attendance: secretary/admin marks a member's attendance.
create or replace function public.mark_meeting_attendance(
  meeting_id uuid,
  member_id uuid,
  status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid;
begin
  caller_id := auth.uid();
  if caller_id is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_secretary_or_admin() then
    raise exception 'Only secretary or admin can mark attendance';
  end if;

  if status not in ('present','absent','excused') then
    raise exception 'Invalid attendance status: %', status;
  end if;

  if not exists (select 1 from public.meetings where id = meeting_id) then
    raise exception 'Meeting not found';
  end if;

  if not exists (select 1 from public.profiles where id = member_id) then
    raise exception 'Member not found';
  end if;

  insert into public.meeting_attendance (meeting_id, member_id, status, marked_by)
    values (meeting_id, member_id, status, caller_id)
    on conflict (meeting_id, member_id) do update
      set status = excluded.status,
          checked_in_at = now(),
          marked_by = excluded.marked_by;
end;
$$;

grant execute on function public.mark_meeting_attendance(uuid, uuid, text) to authenticated;

-- write_meeting_minutes: secretary/admin upserts minutes for a meeting.
create or replace function public.write_meeting_minutes(
  meeting_id uuid,
  agenda text,
  discussions text,
  decisions text,
  action_items jsonb default '[]'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid;
begin
  caller_id := auth.uid();
  if caller_id is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_secretary_or_admin() then
    raise exception 'Only secretary or admin can write minutes';
  end if;

  if not exists (select 1 from public.meetings where id = meeting_id) then
    raise exception 'Meeting not found';
  end if;

  insert into public.meeting_minutes (
    meeting_id, agenda, discussions, decisions, action_items, published_by, published_at
  )
  values (
    meeting_id, agenda, discussions, decisions,
    coalesce(action_items, '[]'::jsonb),
    caller_id, now()
  )
  on conflict (meeting_id) do update set
    agenda = excluded.agenda,
    discussions = excluded.discussions,
    decisions = excluded.decisions,
    action_items = excluded.action_items,
    published_by = excluded.published_by,
    published_at = now();
end;
$$;

grant execute on function public.write_meeting_minutes(uuid, text, text, text, jsonb) to authenticated;

-- =====================================================================
-- 13. RPC: POLLS
-- =====================================================================

-- cast_poll_vote: validates poll is open, voter hasn't voted, and inserts.
create or replace function public.cast_poll_vote(
  poll_id uuid,
  option_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid;
  caller_status text;
  poll_status text;
  poll_closes_at timestamptz;
  option_poll_id uuid;
begin
  caller_id := auth.uid();
  if caller_id is null then
    raise exception 'Not authenticated';
  end if;

  select status into caller_status
    from public.profiles where id = caller_id;
  if caller_status is null or caller_status <> 'active' then
    raise exception 'Only active members can vote';
  end if;

  select status, closes_at into poll_status, poll_closes_at
    from public.polls where id = poll_id;
  if poll_status is null then
    raise exception 'Poll not found';
  end if;
  if poll_status <> 'open' then
    raise exception 'Poll is closed';
  end if;
  if poll_closes_at <= now() then
    raise exception 'Poll voting window has ended';
  end if;

  -- Verify the option belongs to this poll.
  select poll_id into option_poll_id
    from public.poll_options where id = option_id;
  if option_poll_id is null then
    raise exception 'Option not found';
  end if;
  if option_poll_id <> poll_id then
    raise exception 'Option does not belong to this poll';
  end if;

  -- Check the voter hasn't already voted.
  if exists (
    select 1 from public.poll_votes
      where poll_id = cast_poll_vote.poll_id
        and voter_id = caller_id
  ) then
    raise exception 'You have already voted in this poll';
  end if;

  insert into public.poll_votes (poll_id, option_id, voter_id)
    values (poll_id, option_id, caller_id);
end;
$$;

grant execute on function public.cast_poll_vote(uuid, uuid) to authenticated;

-- close_poll: secretary/admin marks a poll closed.
create or replace function public.close_poll(poll_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_secretary_or_admin() then
    raise exception 'Only secretary or admin can close a poll';
  end if;

  update public.polls
    set status = 'closed'
    where id = close_poll.poll_id;

  if not found then
    raise exception 'Poll not found';
  end if;
end;
$$;

grant execute on function public.close_poll(uuid) to authenticated;

-- =====================================================================
-- 14. RPC: FINANCES
-- =====================================================================

-- record_expense: treasurer/admin records a new expense from a JSON payload.
-- Returns the inserted row.
create or replace function public.record_expense(p_expense jsonb)
returns public.expenses
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid;
  inserted public.expenses;
begin
  caller_id := auth.uid();
  if caller_id is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_treasurer_or_admin() then
    raise exception 'Only treasurer or admin can record expenses';
  end if;

  insert into public.expenses (
    title, amount, currency, category, description,
    receipt_url, vendor, expense_date, recorded_by
  )
  values (
    p_expense->>'title',
    (p_expense->>'amount')::numeric,
    coalesce(p_expense->>'currency', 'KES'),
    p_expense->>'category',
    p_expense->>'description',
    p_expense->>'receipt_url',
    p_expense->>'vendor',
    (p_expense->>'expense_date')::date,
    caller_id
  )
  returning * into inserted;

  return inserted;
end;
$$;

grant execute on function public.record_expense(jsonb) to authenticated;

-- approve_expense: admin-only — sets approved_by and approved_at.
create or replace function public.approve_expense(expense_id uuid)
returns public.expenses
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid;
  updated public.expenses;
begin
  caller_id := auth.uid();
  if caller_id is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_admin() then
    raise exception 'Only admins can approve expenses';
  end if;

  update public.expenses
    set approved_by = caller_id,
        approved_at = now()
    where id = approve_expense.expense_id
    returning * into updated;

  if updated.id is null then
    raise exception 'Expense not found';
  end if;

  return updated;
end;
$$;

grant execute on function public.approve_expense(uuid) to authenticated;

-- submit_financial_report: treasurer/admin rolls up a period and creates a report.
-- Aggregates income from donations.status='completed' AND all expenses
-- (of any approval status) in the period.
create or replace function public.submit_financial_report(
  p_start date,
  p_end date,
  p_notes text default null
)
returns public.financial_reports
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid;
  v_income   numeric := 0;
  v_expenses numeric := 0;
  v_opening  numeric := 0;
  v_closing  numeric := 0;
  inserted   public.financial_reports;
begin
  caller_id := auth.uid();
  if caller_id is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_treasurer_or_admin() then
    raise exception 'Only treasurer or admin can submit financial reports';
  end if;

  if p_end < p_start then
    raise exception 'period_end must be >= period_start';
  end if;

  -- Income: sum of completed donations created in the period.
  -- (Donations table has created_at; we use that as the date of receipt.)
  select coalesce(sum(amount), 0) into v_income
    from public.donations
    where status = 'completed'
      and created_at >= p_start::timestamptz
      and created_at < (p_end + 1)::timestamptz;

  -- Expenses: sum of expenses with expense_date in the period.
  select coalesce(sum(amount), 0) into v_expenses
    from public.expenses
    where expense_date >= p_start
      and expense_date <= p_end;

  -- Opening balance: closing balance of the most recent prior report, or 0.
  select coalesce(closing_balance, 0) into v_opening
    from public.financial_reports
    where period_end < p_start
    order by period_end desc
    limit 1;

  v_closing := v_opening + v_income - v_expenses;

  insert into public.financial_reports (
    period_start, period_end, opening_balance,
    total_income, total_expenses, closing_balance,
    notes, status, prepared_by
  )
  values (
    p_start, p_end, v_opening,
    v_income, v_expenses, v_closing,
    p_notes, 'submitted', caller_id
  )
  returning * into inserted;

  return inserted;
end;
$$;

grant execute on function public.submit_financial_report(date, date, text) to authenticated;

-- approve_financial_report: admin-only.
create or replace function public.approve_financial_report(report_id uuid)
returns public.financial_reports
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid;
  updated public.financial_reports;
begin
  caller_id := auth.uid();
  if caller_id is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_admin() then
    raise exception 'Only admins can approve financial reports';
  end if;

  update public.financial_reports
    set status = 'approved',
        approved_by = caller_id,
        approved_at = now()
    where id = approve_financial_report.report_id
    returning * into updated;

  if updated.id is null then
    raise exception 'Financial report not found';
  end if;

  return updated;
end;
$$;

grant execute on function public.approve_financial_report(uuid) to authenticated;

-- =====================================================================
-- End of schema v5.
-- =====================================================================
