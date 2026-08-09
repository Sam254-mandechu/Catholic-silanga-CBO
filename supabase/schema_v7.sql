-- =====================================================================
-- Catholic Silanga CBO — Schema additions v7
-- Notification system + per-member contributions panel
--   + RLS tweaks so the TreasurerPortal can verify contributions.
--
-- Run after schema_v6.sql. Safe to re-run.
-- =====================================================================

-- =====================================================================
-- 1. NOTIFICATIONS TABLE
-- =====================================================================
create table if not exists public.notifications (
  id uuid primary key default uuid_generate_v4(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  kind text not null check (kind in (
    'task_assigned',
    'task_updated',
    'task_completed',
    'role_changed',
    'contribution_submitted',
    'contribution_verified',
    'contribution_rejected',
    'announcement_posted',
    'mention',
    'system'
  )),
  title text not null,
  message text not null,
  link text,            -- route within the SPA, e.g. /member-dashboard?tab=tasks
  payload jsonb,        -- arbitrary structured context (e.g. { task_id, donation_id })
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_recipient_idx
  on public.notifications (recipient_id, created_at desc);

create index if not exists notifications_unread_idx
  on public.notifications (recipient_id) where read_at is null;

alter table public.notifications enable row level security;

-- Recipients read their own notifications.
drop policy if exists "Notifications self-read" on public.notifications;
create policy "Notifications self-read"
  on public.notifications for select to authenticated
  using (recipient_id = auth.uid());

-- Recipients can mark their own notifications as read (update read_at only).
drop policy if exists "Notifications self-mark-read" on public.notifications;
create policy "Notifications self-mark-read"
  on public.notifications for update to authenticated
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

-- Anyone authenticated can insert a notification for someone else
-- (we trust the server-side code / RPCs to validate intent).
drop policy if exists "Notifications insert-by-authenticated" on public.notifications;
create policy "Notifications insert-by-authenticated"
  on public.notifications for insert to authenticated
  with check (true);

-- Admin / recipient can delete.
drop policy if exists "Notifications delete-by-self-or-admin" on public.notifications;
create policy "Notifications delete-by-self-or-admin"
  on public.notifications for delete to authenticated
  using (recipient_id = auth.uid() or public.is_admin());

-- =====================================================================
-- 2. NOTIFICATION RPC (write side, with SECURITY DEFINER)
--    Use this from your services — it's the only sanctioned way to
--    create a notification so we can validate inputs server-side.
-- =====================================================================
create or replace function public.create_notification(
  p_recipient uuid,
  p_kind text,
  p_title text,
  p_message text,
  p_link text default null,
  p_payload jsonb default null,
  p_actor uuid default null
)
returns public.notifications
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.notifications;
begin
  if p_recipient is null then
    raise exception 'recipient required';
  end if;
  if p_kind is null or p_kind = '' then
    raise exception 'kind required';
  end if;

  insert into public.notifications (
    recipient_id, actor_id, kind, title, message, link, payload
  )
  values (
    p_recipient, p_actor, p_kind, p_title, p_message, p_link, p_payload
  )
  returning * into row;

  return row;
end;
$$;

grant execute on function public.create_notification(
  uuid, text, text, text, text, jsonb, uuid
) to authenticated;

-- =====================================================================
-- 3. RPC: list notifications for the current user with optional unread filter
-- =====================================================================
create or replace function public.list_my_notifications(p_unread_only boolean default false)
returns setof public.notifications
language sql
stable
security invoker
set search_path = public
as $$
  select * from public.notifications
  where recipient_id = auth.uid()
    and (not p_unread_only or read_at is null)
  order by created_at desc
  limit 200;
$$;

grant execute on function public.list_my_notifications(boolean) to authenticated;

-- =====================================================================
-- 4. RPC: mark one or many notifications as read
-- =====================================================================
create or replace function public.mark_notifications_read(p_ids uuid[])
returns int
language plpgsql
security invoker
set search_path = public
as $$
declare
  updated int;
begin
  with updated_rows as (
    update public.notifications
       set read_at = now()
     where recipient_id = auth.uid()
       and id = any(p_ids)
       and read_at is null
    returning 1
  )
  select count(*) into updated from updated_rows;
  return updated;
end;
$$;

grant execute on function public.mark_notifications_read(uuid[]) to authenticated;

-- =====================================================================
-- 5. RPC: unread count (lightweight for the navbar badge)
-- =====================================================================
create or replace function public.unread_notification_count()
returns int
language sql
stable
security invoker
set search_path = public
as $$
  select count(*)::int
    from public.notifications
    where recipient_id = auth.uid() and read_at is null;
$$;

grant execute on function public.unread_notification_count() to authenticated;

-- =====================================================================
-- 6. TREASURER PORTAL HOOKS
--    Allow users with role='treasurer' (not just admin) to verify
--    donations. Existing "Donations admin-update" policy is admin-only;
--    we add a treasurer equivalent so the TreasurerPortal works.
-- =====================================================================
drop policy if exists "Donations treasurer-or-admin-update" on public.donations;
create policy "Donations treasurer-or-admin-update"
  on public.donations for update to authenticated
  using (public.is_treasurer_or_admin())
  with check (public.is_treasurer_or_admin());

-- Treasurer can read every donation.
drop policy if exists "Donations treasurer-read" on public.donations;
create policy "Donations treasurer-read"
  on public.donations for select to authenticated
  using (
    donor_id = auth.uid()
    or public.is_admin()
    or public.is_treasurer_or_admin()
  );

-- =====================================================================
-- 7. PER-MEMBER CONTRIBUTIONS PANEL
--    Add a helper RPC so each member can fetch their own contributions
--    without exposing donor_id to non-owners.
-- =====================================================================
create or replace function public.list_my_donations(p_limit int default 100)
returns setof public.donations
language sql
stable
security invoker
set search_path = public
as $$
  select * from public.donations
  where donor_id = auth.uid()
  order by created_at desc
  limit greatest(p_limit, 1);
$$;

grant execute on function public.list_my_donations(int) to authenticated;

-- =====================================================================
-- 8. ADMIN UPDATE MEMBER RPC (used by the Edit Member dialog)
-- =====================================================================
create or replace function public.admin_update_member(
  target_user_id uuid,
  patch jsonb
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.profiles;
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;
  if target_user_id is null then
    raise exception 'target_user_id required';
  end if;

  update public.profiles p set
    display_name   = coalesce(patch->>'display_name',   p.display_name),
    phone          = case when patch ? 'phone'          then patch->>'phone'          else p.phone end,
    address        = case when patch ? 'address'        then patch->>'address'        else p.address end,
    bio            = case when patch ? 'bio'            then patch->>'bio'            else p.bio end,
    photo_url      = case when patch ? 'photo_url'      then patch->>'photo_url'      else p.photo_url end,
    hierarchy_role = case when patch ? 'hierarchy_role' then (patch->>'hierarchy_role')::text else p.hierarchy_role end,
    role           = case when patch ? 'role'           then (patch->>'role')::text   else p.role end,
    updated_at     = now()
  where p.id = target_user_id
  returning * into row;

  if not found then
    raise exception 'Member % not found', target_user_id;
  end if;

  -- Notify the member if hierarchy_role changed
  if patch ? 'hierarchy_role'
     and (patch->>'hierarchy_role') is distinct from row.hierarchy_role::text then
    perform public.create_notification(
      p_recipient := row.id,
      p_kind := 'role_changed',
      p_title := 'Your role was updated',
      p_message := 'You are now listed as ' || (patch->>'hierarchy_role') || '.',
      p_link := '/member-dashboard?tab=profile',
      p_payload := jsonb_build_object('hierarchy_role', patch->>'hierarchy_role'),
      p_actor := auth.uid()
    );
  end if;

  return row;
end;
$$;

grant execute on function public.admin_update_member(uuid, jsonb) to authenticated;

-- =====================================================================
-- 9. RPC: send a notification to every active member (broadcast)
--    Used when an announcement is posted.
-- =====================================================================
create or replace function public.broadcast_notification(
  p_kind text,
  p_title text,
  p_message text,
  p_link text default null,
  p_payload jsonb default null
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted int;
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;
  insert into public.notifications (recipient_id, actor_id, kind, title, message, link, payload)
  select p.id, auth.uid(), p_kind, p_title, p_message, p_link, p_payload
  from public.profiles p
  where p.status = 'active';
  get diagnostics inserted = row_count;
  return inserted;
end;
$$;

grant execute on function public.broadcast_notification(
  text, text, text, text, jsonb
) to authenticated;

-- =====================================================================
-- 10. AUTO-NOTIFY: when admin verifies / rejects a donation, ping the donor
-- =====================================================================
create or replace function public.donation_status_changed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  msg text;
  kind text;
begin
  if (tg_op = 'UPDATE' and old.status is distinct from new.status) then
    if new.status = 'completed' then
      kind := 'contribution_verified';
      msg  := 'Your contribution of ' || new.amount || ' ' || new.currency ||
              ' for "' || new.purpose || '" has been verified. Thank you!';
    elsif new.status = 'failed' then
      kind := 'contribution_rejected';
      msg  := 'Your contribution of ' || new.amount || ' ' || new.currency ||
              ' could not be verified. Please contact the treasurer.';
    else
      return new;
    end if;

    if new.donor_id is not null then
      perform public.create_notification(
        p_recipient := new.donor_id,
        p_kind := kind,
        p_title := case when kind = 'contribution_verified'
                       then 'Contribution verified' else 'Contribution rejected' end,
        p_message := msg,
        p_link := '/member-dashboard?tab=contributions',
        p_payload := jsonb_build_object('donation_id', new.id, 'amount', new.amount, 'currency', new.currency, 'status', new.status),
        p_actor := auth.uid()
      );
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists donations_status_notify on public.donations;
create trigger donations_status_notify
  after update of status on public.donations
  for each row
  execute function public.donation_status_changed();

-- =====================================================================
-- HOW TO USE
-- =====================================================================
-- 1. Run this file in the Supabase SQL Editor (after v6.sql).
-- 2. After running, the frontend can:
--      - List a user's notifications via /member-dashboard bell
--      - Mark them as read via supabase.rpc('mark_notifications_read', [...])
--      - Show an unread badge via supabase.rpc('unread_notification_count')
--      - Send per-member notifications via supabase.rpc('create_notification', ...)
--      - Broadcast a site-wide notification via supabase.rpc('broadcast_notification', ...)
-- 3. The TreasurerPortal will now be able to verify donations because
--    the is_treasurer_or_admin() policy is active.
-- 4. Donations inserted by members will get auto-notifications when the
--    status flips to completed/failed, courtesy of the trigger.