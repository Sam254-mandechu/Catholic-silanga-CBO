-- =====================================================================
-- Catholic Silanga CBO — Schema additions v11
-- Moderator Portal round 2: announcement editing, member unsuspend,
-- announcements.created_by audit column.
--
-- Run after schema_v10.sql. Safe to re-run.
-- =====================================================================


-- =====================================================================
-- 1. announcements.created_by — so we know who posted what
--    (idempotent: only adds the column if missing).
-- =====================================================================
alter table public.announcements
  add column if not exists created_by uuid references public.profiles(id) on delete set null;

create index if not exists announcements_created_by_idx
  on public.announcements (created_by);


-- =====================================================================
-- 2. RPC: update_announcement(announcement_id, patch)
--    Moderator (or admin) can edit any announcement. Updates title,
--    content, priority, expires_at. Records updated_at. Returns the
--    updated row.
-- =====================================================================
create or replace function public.update_announcement(
  p_announcement_id uuid,
  p_patch jsonb
)
returns public.announcements
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid;
  caller_role text;
  row public.announcements;
begin
  caller_id := auth.uid();
  if caller_id is null then
    raise exception 'Not authenticated';
  end if;

  select role into caller_role from public.profiles where id = caller_id;
  if caller_role is null or caller_role not in ('admin', 'moderator') then
    raise exception 'Only admin or moderator can update announcements';
  end if;

  update public.announcements a set
    title       = coalesce(p_patch->>'title',       a.title),
    content     = coalesce(p_patch->>'content',     a.content),
    priority    = coalesce(p_patch->>'priority',    a.priority),
    expires_at  = case
                    when p_patch ? 'expires_at' then
                      case
                        when p_patch->>'expires_at' = '' then null
                        else (p_patch->>'expires_at')::timestamptz
                      end
                    else a.expires_at
                  end
  where a.id = p_announcement_id
  returning * into row;

  if row.id is null then
    raise exception 'Announcement not found';
  end if;

  return row;
end;
$$;

grant execute on function public.update_announcement(uuid, jsonb) to authenticated;


-- =====================================================================
-- 3. RPC: unsuspend_member(target_user_id, reason)
--    Re-activates a suspended member. Preserves their existing
--    hierarchy_role (does not reset it). Fires a notification.
--    Allowed: admin OR moderator. Moderators cannot unsuspend admins.
-- =====================================================================
create or replace function public.unsuspend_member(
  target_user_id uuid,
  p_reason text default null
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid;
  caller_role text;
  target_role text;
  target_status text;
  updated public.profiles;
begin
  caller_id := auth.uid();
  if caller_id is null then
    raise exception 'Not authenticated';
  end if;

  select role into caller_role from public.profiles where id = caller_id;
  if caller_role is null or caller_role not in ('admin','moderator') then
    raise exception 'Only admin or moderator can unsuspend members';
  end if;

  if target_user_id = caller_id then
    raise exception 'You cannot change your own status';
  end if;

  select role, status into target_role, target_status
    from public.profiles where id = target_user_id;
  if target_role is null then
    raise exception 'Target profile not found';
  end if;

  -- Moderators cannot touch admin accounts
  if caller_role = 'moderator' and target_role = 'admin' then
    raise exception 'Moderators cannot modify admin accounts';
  end if;

  if target_status <> 'suspended' then
    raise exception 'Member is not currently suspended (status=%)', target_status;
  end if;

  update public.profiles
    set status = 'active',
        updated_at = now()
    where id = target_user_id
    returning * into updated;

  perform public.create_notification(
    p_recipient := target_user_id,
    p_kind := 'system',
    p_title := 'Your account has been reactivated',
    p_message := coalesce(
      p_reason,
      'Your account has been reactivated by a moderator. Welcome back.'
    ),
    p_link := '/member-dashboard',
    p_payload := jsonb_build_object('previous_status', 'suspended'),
    p_actor := caller_id
  );

  return updated;
end;
$$;

grant execute on function public.unsuspend_member(uuid, text) to authenticated;


-- =====================================================================
-- 4. RPC: admin_list_members(p_status)
--    Returns all profiles filtered by status (or all if null).
--    Used by the moderator members tab to show active + suspended
--    members alongside pending. Admins can use this too.
-- =====================================================================
create or replace function public.admin_list_members(p_status text default null)
returns setof public.profiles
language sql
stable
security invoker
set search_path = public
as $$
  select * from public.profiles
  where (p_status is null or status = p_status)
  order by
    case status when 'pending' then 0 when 'active' then 1 when 'suspended' then 2 else 3 end,
    joined_at desc;
$$;

grant execute on function public.admin_list_members(text) to authenticated;


-- =====================================================================
-- 5. Tighten announcements policy — split moderator write into
--    separate insert / update / delete policies for clarity.
--    (The existing "Announcements moderator-write" with `for all`
--     already covers UPDATE, but we add an explicit UPDATE policy so
--     future Supabase policy tooling shows it explicitly.)
-- =====================================================================
-- The existing `Announcements moderator-write` policy (created in v8)
-- already covers all operations for moderators. No change needed.


-- =====================================================================
-- 6. Backfill: set announcements.created_by to the first admin if null
--    (so existing announcements have a known author)
-- =====================================================================
update public.announcements
  set created_by = (
    select id from public.profiles
    where role = 'admin' and status = 'active'
    order by joined_at asc
    limit 1
  )
where created_by is null;


-- =====================================================================
-- HOW TO USE
-- =====================================================================
-- 1. Run this file in the Supabase SQL Editor (after v10.sql).
-- 2. ModeratorPortal will gain:
--    - Members tab: filter by status (Pending / Active / Suspended / All),
--      re-activate suspended members, view member detail modal.
--    - Announcements tab: edit any announcement.
--    - News tab: edit news articles.
-- 3. The announcements.created_by column is auto-populated for
--    existing rows (backfilled to the earliest active admin).
-- 4. unsuspend_member() preserves hierarchy_role (does not reset it).