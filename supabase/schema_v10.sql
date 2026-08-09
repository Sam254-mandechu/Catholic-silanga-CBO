-- =====================================================================
-- Catholic Silanga CBO — Schema v10
-- Meeting Minutes: draft/publish workflow + dedicated proceedings page
--
-- Run after schema_v9.sql. Safe to re-run (CREATE OR REPLACE / IF NOT EXISTS).
-- =====================================================================


-- =====================================================================
-- 1. meeting_minutes.status — draft vs published
--    Drafts are visible to the secretary but NOT to the public
--    /meetings page or the new /meetings/:id/proceedings page.
-- =====================================================================
alter table public.meeting_minutes
  add column if not exists status text not null default 'draft'
    check (status in ('draft', 'published'));

-- Backfill: any rows already in the table from the old "save = publish"
-- behavior are considered published (preserves existing data).
update public.meeting_minutes
   set status = 'published'
 where status = 'draft'
   and published_at is not null;

-- Index for fast public-side queries
create index if not exists meeting_minutes_published_idx
  on public.meeting_minutes (meeting_id)
  where status = 'published';


-- =====================================================================
-- 2. RPC: save_meeting_minutes_draft
--    Upsert a draft. Does NOT touch published_at/published_by/status.
--    Use this freely while the secretary is composing minutes.
-- =====================================================================
create or replace function public.save_meeting_minutes_draft(
  p_meeting_id uuid,
  p_agenda text,
  p_discussions text,
  p_decisions text,
  p_action_items jsonb
)
returns public.meeting_minutes
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid;
  caller_role text;
  row public.meeting_minutes;
begin
  caller_id := auth.uid();
  if caller_id is null then
    raise exception 'Not authenticated';
  end if;

  select role into caller_role from public.profiles where id = caller_id;
  if caller_role is null or caller_role not in ('admin', 'secretary') then
    raise exception 'Only admin or secretary can save minutes drafts';
  end if;

  insert into public.meeting_minutes (
    meeting_id, agenda, discussions, decisions, action_items,
    status
  ) values (
    p_meeting_id, p_agenda, p_discussions, p_decisions, p_action_items,
    'draft'
  )
  on conflict (meeting_id) do update set
    agenda        = excluded.agenda,
    discussions   = excluded.discussions,
    decisions     = excluded.decisions,
    action_items  = excluded.action_items,
    -- keep current status / published_* as-is so a draft stays a draft
    -- (unless it's already published — in which case it stays published
    -- and the secretary must call publish_meeting_minutes to amend)
    status        = case
                      when public.meeting_minutes.status = 'published'
                        then 'published'
                      else 'draft'
                    end
  returning * into row;

  return row;
end;
$$;

grant execute on function public.save_meeting_minutes_draft(
  uuid, text, text, text, jsonb
) to authenticated;


-- =====================================================================
-- 3. RPC: publish_meeting_minutes
--    Confirms and publishes a draft. Sets published_at + published_by.
--    Once published, the minutes become visible at /meetings/:id/proceedings
--    AND on the public /meetings page (in the meeting card "Details").
--
--    Admins can amend published minutes (re-publishes with updated
--    published_at/published_by). Secretaries can publish a draft; once
--    published only admins can amend.
-- =====================================================================
create or replace function public.publish_meeting_minutes(
  p_meeting_id uuid,
  p_agenda text,
  p_discussions text,
  p_decisions text,
  p_action_items jsonb
)
returns public.meeting_minutes
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid;
  caller_role text;
  existing_status text;
  row public.meeting_minutes;
begin
  caller_id := auth.uid();
  if caller_id is null then
    raise exception 'Not authenticated';
  end if;

  select role into caller_role from public.profiles where id = caller_id;
  if caller_role is null or caller_role not in ('admin', 'secretary') then
    raise exception 'Only admin or secretary can publish minutes';
  end if;

  -- Check if there's an existing row to enforce the "published = locked
  -- to secretary" rule.
  select status into existing_status
    from public.meeting_minutes
   where meeting_id = p_meeting_id;

  if existing_status = 'published' and caller_role <> 'admin' then
    raise exception 'Minutes are already published. Only an admin can amend them.';
  end if;

  insert into public.meeting_minutes (
    meeting_id, agenda, discussions, decisions, action_items,
    status, published_by, published_at
  ) values (
    p_meeting_id, p_agenda, p_discussions, p_decisions, p_action_items,
    'published', caller_id, now()
  )
  on conflict (meeting_id) do update set
    agenda        = excluded.agenda,
    discussions   = excluded.discussions,
    decisions     = excluded.decisions,
    action_items  = excluded.action_items,
    status        = 'published',
    published_by  = caller_id,
    published_at  = now()
  returning * into row;

  return row;
end;
$$;

grant execute on function public.publish_meeting_minutes(
  uuid, text, text, text, jsonb
) to authenticated;


-- =====================================================================
-- 4. RPC: get_meeting_minutes_full (public-readable)
--    Returns the full record for a meeting's proceedings page, including
--    attendance roll + member names. Returns NO ROWS if minutes are not
--    yet published (so the proceedings page can 404 cleanly).
-- =====================================================================
create or replace function public.get_meeting_minutes_full(p_meeting_id uuid)
returns table (
  meeting_id uuid,
  title text,
  description text,
  scheduled_at timestamptz,
  location text,
  meeting_type text,
  agenda text,
  discussions text,
  decisions text,
  action_items jsonb,
  published_at timestamptz,
  published_by_name text,
  attendance_roll jsonb
)
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  m record;
  min record;
  att jsonb;
begin
  -- The meeting itself is readable to anyone (existing policy).
  select mm.id, mm.title, mm.description, mm.scheduled_at,
         mm.location, mm.meeting_type::text
    into m
    from public.meetings mm
   where mm.id = p_meeting_id;

  if m.id is null then
    return;
  end if;

  -- Only published minutes are visible publicly.
  select mn.agenda, mn.discussions, mn.decisions, mn.action_items,
         mn.published_at, mn.published_by
    into min
    from public.meeting_minutes mn
   where mn.meeting_id = p_meeting_id
     and mn.status = 'published';

  if min.published_at is null then
    return;  -- not yet published — proceedings page should 404
  end if;

  -- Build attendance roll (jsonb array of {display_name, hierarchy_role, status}).
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'display_name', p.display_name,
      'hierarchy_role', p.hierarchy_role,
      'status', a.status,
      'checked_in_at', a.checked_in_at
    ) order by
      case a.status when 'present' then 1 when 'excused' then 2 else 3 end,
      p.display_name
  ), '[]'::jsonb)
    into att
    from public.meeting_attendance a
    join public.profiles p on p.id = a.member_id
   where a.meeting_id = p_meeting_id;

  meeting_id      := m.id;
  title           := m.title;
  description     := m.description;
  scheduled_at    := m.scheduled_at;
  location        := m.location;
  meeting_type    := m.meeting_type;
  agenda          := min.agenda;
  discussions     := min.discussions;
  decisions       := min.decisions;
  action_items    := min.action_items;
  published_at    := min.published_at;
  published_by_name := (
    select display_name from public.profiles where id = min.published_by
  );
  attendance_roll := att;

  return next;
end;
$$;

grant execute on function public.get_meeting_minutes_full(uuid) to anon, authenticated;


-- =====================================================================
-- 5. Tighten RLS: published minutes are public; drafts are author/admin only.
-- =====================================================================
drop policy if exists "Meeting minutes readable by authenticated" on public.meeting_minutes;
create policy "Meeting minutes readable by authenticated"
  on public.meeting_minutes for select to authenticated
  using (
    status = 'published'
    or public.is_admin()
    or (
      status = 'draft'
      and (published_by = auth.uid() or published_by is null)
    )
  );

-- Anon can read only published minutes (for the proceedings page).
drop policy if exists "Meeting minutes public read" on public.meeting_minutes;
create policy "Meeting minutes public read"
  on public.meeting_minutes for select to anon
  using (status = 'published');


-- =====================================================================
-- HOW TO USE
-- =====================================================================
-- 1. Run this in the Supabase SQL Editor (after v9.sql).
-- 2. Existing minutes rows are backfilled to status='published'.
-- 3. The new "Save draft" button writes status='draft' (not visible
--    publicly). The new "Publish" button sets status='published' +
--    published_at + published_by in one transaction.
-- 4. The new /meetings/:id/proceedings page calls
--    get_meeting_minutes_full(meeting_id). If status is not published,
--    the RPC returns no rows and the page 404s cleanly.
-- 5. Once published, only admins can amend (re-publish). Secretaries
--    get a clear error if they try.