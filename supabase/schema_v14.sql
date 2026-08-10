-- =====================================================================
-- Catholic Silanga CBO — Schema v14
-- Comprehensive notification system for the 7 user-spec triggers:
--   1. meeting_scheduled       — broadcast to all active members
--   2. task_published          — system roles for visibility
--   3. rsvp_submitted          — admin + secretary
--   4. donation_submitted      — admin + treasurer
--   5. poll_vote               — admin + secretary
--   6. news_posted             — all members
--   7. record_published        — all members
-- Plus poll vote count RPC + poll winner RPC.
--
-- Run after schema_v13.sql. Safe to re-run (CREATE OR REPLACE / IF NOT EXISTS).
-- =====================================================================


-- =====================================================================
-- 1. EXPAND notification kind check constraint
--    The existing notification kind CHECK only allows the original 10 kinds.
--    We need to add 7 new ones. Drop the existing constraint and re-add.
-- =====================================================================
alter table public.notifications drop constraint if exists notifications_kind_check;

alter table public.notifications
  add constraint notifications_kind_check check (kind in (
    'task_assigned',
    'task_updated',
    'task_completed',
    'task_published',
    'role_changed',
    'contribution_submitted',
    'contribution_verified',
    'contribution_rejected',
    'announcement_posted',
    'news_posted',
    'meeting_scheduled',
    'rsvp_submitted',
    'poll_vote',
    'record_published',
    'mention',
    'system'
  ));


-- =====================================================================
-- 2. RPC: notify_role_members
--    Looks up all active members with the given role and inserts one
--    notification per recipient. Returns the count of rows inserted.
-- =====================================================================
create or replace function public.notify_role_members(
  p_target_role text,
  p_kind text,
  p_title text,
  p_message text,
  p_link text default null,
  p_payload jsonb default null,
  p_actor uuid default null,
  p_exclude_user_id uuid default null
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid;
  inserted int;
begin
  caller_id := auth.uid();
  if caller_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_target_role not in ('admin','moderator','secretary','treasurer','member') then
    raise exception 'Invalid target role: %', p_target_role;
  end if;

  insert into public.notifications (recipient_id, actor_id, kind, title, message, link, payload)
  select p.id, p_actor, p_kind, p_title, p_message, p_link, p_payload
    from public.profiles p
   where p.status = 'active'
     and p.role = p_target_role
     and (p_exclude_user_id is null or p.id <> p_exclude_user_id);

  get diagnostics inserted = row_count;
  return inserted;
end;
$$;

grant execute on function public.notify_role_members(
  text, text, text, text, text, jsonb, uuid, uuid
) to authenticated;


-- =====================================================================
-- 3. RPC: notify_all_members
--    Broadcast to every active member. Used for meeting_scheduled,
--    news_posted, record_published, etc.
-- =====================================================================
create or replace function public.notify_all_members(
  p_kind text,
  p_title text,
  p_message text,
  p_link text default null,
  p_payload jsonb default null,
  p_actor uuid default null,
  p_exclude_user_id uuid default null
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid;
  inserted int;
begin
  caller_id := auth.uid();
  if caller_id is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.notifications (recipient_id, actor_id, kind, title, message, link, payload)
  select p.id, p_actor, p_kind, p_title, p_message, p_link, p_payload
    from public.profiles p
   where p.status = 'active'
     and (p_exclude_user_id is null or p.id <> p_exclude_user_id);

  get diagnostics inserted = row_count;
  return inserted;
end;
$$;

grant execute on function public.notify_all_members(
  text, text, text, text, jsonb, uuid, uuid
) to authenticated;


-- =====================================================================
-- 4. TRIGGER: meeting_scheduled
--    When a new meeting is INSERTED, broadcast to all active members.
--    Listens for the canonical 'public' schema on 'meetings' table.
-- =====================================================================
create or replace function public.notify_meeting_scheduled() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted int;
  when_text text;
begin
  when_text := to_char(new.scheduled_at at time zone 'UTC', 'Mon DD, YYYY "at" HH24:MI "UTC"');
  insert into public.notifications (recipient_id, actor_id, kind, title, message, link, payload)
  select p.id, new.created_by, 'meeting_scheduled',
         'New meeting scheduled',
         '"' || new.title || '" is scheduled for ' || when_text ||
           coalesce(' at ' || new.location, '.'),
         '/meetings',
         jsonb_build_object('meeting_id', new.id, 'scheduled_at', new.scheduled_at)
    from public.profiles p
   where p.status = 'active'
     and p.id <> coalesce(new.created_by, '00000000-0000-0000-0000-000000000000'::uuid);

  get diagnostics inserted = row_count;
  return new;
end;
$$;

drop trigger if exists trg_notify_meeting_scheduled on public.meetings;
create trigger trg_notify_meeting_scheduled
  after insert on public.meetings
  for each row execute function public.notify_meeting_scheduled();


-- =====================================================================
-- 5. TRIGGER: rsvp_submitted → admin + secretary
-- =====================================================================
create or replace function public.notify_rsvp_submitted() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted int;
  meeting_title text;
  voter_name text;
begin
  select title into meeting_title from public.meetings where id = new.meeting_id;
  select display_name into voter_name from public.profiles where id = new.member_id;

  insert into public.notifications (recipient_id, actor_id, kind, title, message, link, payload)
  select p.id, new.member_id, 'rsvp_submitted',
         'New RSVP',
         coalesce(voter_name, 'A member') || ' responded "' || new.response ||
           '" to "' || coalesce(meeting_title, 'a meeting') || '".',
         '/meetings',
         jsonb_build_object('meeting_id', new.meeting_id, 'rsvp_id', new.id, 'response', new.response)
    from public.profiles p
   where p.status = 'active'
     and p.role in ('admin', 'secretary')
     and p.id <> new.member_id;

  get diagnostics inserted = row_count;
  return new;
end;
$$;

drop trigger if exists trg_notify_rsvp_submitted on public.meeting_rsvps;
create trigger trg_notify_rsvp_submitted
  after insert on public.meeting_rsvps
  for each row execute function public.notify_rsvp_submitted();


-- =====================================================================
-- 6. TRIGGER: poll_vote → admin + secretary
-- =====================================================================
create or replace function public.notify_poll_vote() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted int;
  poll_title text;
  option_label text;
  voter_name text;
begin
  select title into poll_title from public.polls where id = new.poll_id;
  select label into option_label from public.poll_options where id = new.option_id;
  select display_name into voter_name from public.profiles where id = new.voter_id;

  insert into public.notifications (recipient_id, actor_id, kind, title, message, link, payload)
  select p.id, new.voter_id, 'poll_vote',
         'New poll vote',
         coalesce(voter_name, 'A member') || ' voted "' || coalesce(option_label, '?') ||
           '" on "' || coalesce(poll_title, 'a poll') || '".',
         '/meetings',
         jsonb_build_object('poll_id', new.poll_id, 'option_id', new.option_id, 'vote_id', new.id)
    from public.profiles p
   where p.status = 'active'
     and p.role in ('admin', 'secretary')
     and p.id <> new.voter_id;

  get diagnostics inserted = row_count;
  return new;
end;
$$;

drop trigger if exists trg_notify_poll_vote on public.poll_votes;
create trigger trg_notify_poll_vote
  after insert on public.poll_votes
  for each row execute function public.notify_poll_vote();


-- =====================================================================
-- 7. TRIGGER: donation_submitted (from member) → admin + treasurer
--    The existing donations_status_notify trigger fires on completion/failure.
--    This one fires on initial INSERT so admin/treasurer know there's a new
--    contribution pending verification.
-- =====================================================================
create or replace function public.notify_donation_submitted() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted int;
  donor_name text;
begin
  donor_name := new.donor_name;

  insert into public.notifications (recipient_id, actor_id, kind, title, message, link, payload)
  select p.id, new.donor_id, 'donation_submitted',
         'New contribution pending',
         coalesce(donor_name, 'A donor') || ' contributed ' || new.amount || ' ' || new.currency ||
           ' for "' || new.purpose || '". Awaiting verification.',
         '/treasurer-portal',
         jsonb_build_object('donation_id', new.id, 'amount', new.amount, 'currency', new.currency)
    from public.profiles p
   where p.status = 'active'
     and p.role in ('admin', 'treasurer');

  get diagnostics inserted = row_count;
  return new;
end;
$$;

drop trigger if exists trg_notify_donation_submitted on public.donations;
create trigger trg_notify_donation_submitted
  after insert on public.donations
  for each row execute function public.notify_donation_submitted();


-- =====================================================================
-- 8. RPC: get_poll_results
--    Returns per-option vote counts + the leading option (highest count).
--    Used by the public Polls UI so anyone can see live outcomes.
-- =====================================================================
create or replace function public.get_poll_results(p_poll_id uuid)
returns table (
  option_id uuid,
  option_label text,
  display_order int,
  vote_count bigint,
  is_winner boolean
)
language sql
stable
security invoker
set search_path = public
as $$
  with counts as (
    select
      po.id,
      po.label,
      po.display_order,
      coalesce(v.cnt, 0) as cnt
    from public.poll_options po
    left join (
      select option_id, count(*) as cnt
      from public.poll_votes
      where poll_id = p_poll_id
      group by option_id
    ) v on v.option_id = po.id
    where po.poll_id = p_poll_id
  ),
  max_v as (select max(cnt) as m from counts)
  select
    c.id,
    c.label,
    c.display_order,
    c.cnt,
    (c.cnt > 0 and c.cnt = (select m from max_v)) as is_winner
  from counts c
  order by c.display_order, c.label;
$$;

grant execute on function public.get_poll_results(uuid) to anon, authenticated;


-- =====================================================================
-- 9. Enable realtime on tables that trigger notifications
--    (already on profiles + site_content; add meetings, meeting_rsvps,
--    poll_votes, donations so the frontend can react to live changes)
-- =====================================================================
do $$ begin
  alter publication supabase_realtime add table public.meetings;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table public.meeting_rsvps;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table public.poll_votes;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table public.donations;
exception when duplicate_object then null;
end $$;


-- =====================================================================
-- HOW TO USE
-- =====================================================================
-- 1. Run this in Supabase SQL Editor (after v13.sql).
-- 2. Triggers are AUTOMATIC — meeting INSERT, RSVP INSERT, poll vote INSERT,
--    and donation INSERT all fire notifications without any frontend code.
-- 3. For news + financial records, the frontend calls:
--      notify_all_members('news_posted', ..., '/news', payload)
--      notify_all_members('record_published', ..., '/finance', payload)
-- 4. For task publish, frontend calls:
--      notify_role_members('admin', 'task_published', ..., '/admin-dashboard', payload)
--      notify_role_members('moderator', 'task_published', ..., '/moderator-portal', payload)
--      notify_role_members('secretary', 'task_published', ..., '/secretary-portal', payload)
--      notify_role_members('treasurer', 'task_published', ..., '/treasurer-portal', payload)
-- 5. The Polls UI calls get_poll_results(poll_id) to display live vote counts.
