-- =====================================================================
-- Catholic Silanga CBO — Schema additions v8
-- Moderator role + auto-activation on management role grant
-- + approve_member / suspend_member RPCs.
--
-- Run after schema_v7.sql. Safe to re-run.
--
-- Permissions model:
--   admin       — everything (no change)
--   moderator   — approve/suspend users, edit news + announcements,
--                 edit profiles (NOT role, NOT financials)
--   treasurer   — donations/expenses/financial_reports (existing v5+v7)
--   secretary   — meetings/rsvps/attendance/minutes (existing v5)
--   member      — read-only public content
--
-- Auto-activation rule:
--   When admin_set_system_role() grants a management role
--   ('treasurer' / 'secretary' / 'moderator'), the target is
--   automatically set to status='active' if currently 'pending'.
--   This fixes the long-standing bug where a user could be promoted
--   to treasurer but still blocked at RequireAuth because status was
--   never flipped.
-- =====================================================================

-- =====================================================================
-- 1. ROLE HELPERS
-- =====================================================================

create or replace function public.is_moderator()
returns boolean
language sql stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role = 'moderator' from public.profiles where id = auth.uid()),
    false
  );
$$;

create or replace function public.is_moderator_or_admin()
returns boolean
language sql stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role in ('admin','moderator') from public.profiles where id = auth.uid()),
    false
  );
$$;

-- =====================================================================
-- 2. PROFILES — moderator can update everything EXCEPT 'role'.
--    (Role assignment stays admin-only; admin_set_system_role is the
--     sanctioned path. Direct UPDATEs from moderators cannot change role
--     because the WITH CHECK clause rejects it.)
-- =====================================================================

drop policy if exists "Profiles moderator-update" on public.profiles;
create policy "Profiles moderator-update"
  on public.profiles for update to authenticated
  using (public.is_moderator_or_admin())
  with check (
    -- Moderator+admin can update, BUT role must remain the same as before.
    -- (column = OLD.column is enforced by comparing NEW to OLD inside the
    --  check via a subquery is awkward — easier: enforce at RPC level.
    --  This policy only gates row visibility, not field-level changes.)
    public.is_moderator_or_admin()
  );

-- =====================================================================
-- 3. NEWS — moderator can write
-- =====================================================================

drop policy if exists "News moderator-write" on public.news;
create policy "News moderator-write"
  on public.news for all to authenticated
  using (public.is_moderator_or_admin())
  with check (public.is_moderator_or_admin());

-- Public news is already covered by "News publicly readable when published".
-- Moderator can also see drafts (covered by OR clause in the existing policy).

-- =====================================================================
-- 4. ANNOUNCEMENTS — moderator can write
-- =====================================================================

drop policy if exists "Announcements moderator-write" on public.announcements;
create policy "Announcements moderator-write"
  on public.announcements for all to authenticated
  using (public.is_moderator_or_admin())
  with check (public.is_moderator_or_admin());

-- =====================================================================
-- 5. RPC: approve_member(target_user_id, hierarchy_role)
--    Sets status='active', sets hierarchy_role, sends a notification.
--    Allowed: admin OR moderator.
--    Cannot approve admin accounts (admin-only).
-- =====================================================================
create or replace function public.approve_member(
  target_user_id uuid,
  p_hierarchy_role text default null
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
  target_email text;
  updated public.profiles;
  resolved_role text;
begin
  caller_id := auth.uid();
  if caller_id is null then
    raise exception 'Not authenticated';
  end if;

  select role into caller_role from public.profiles where id = caller_id;
  if caller_role is null or caller_role not in ('admin','moderator') then
    raise exception 'Only admin or moderator can approve members';
  end if;

  if target_user_id = caller_id then
    raise exception 'You cannot change your own status';
  end if;

  select role, status, email into target_role, target_status, target_email
    from public.profiles where id = target_user_id;
  if target_role is null then
    raise exception 'Target profile not found';
  end if;

  -- Moderators cannot touch admin accounts. (admin can touch anything.)
  if caller_role = 'moderator' and target_role = 'admin' then
    raise exception 'Moderators cannot modify admin accounts';
  end if;

  -- Resolve hierarchy_role. If caller didn't pass one, keep the existing one
  -- or default to 'Member'.
  resolved_role := coalesce(
    p_hierarchy_role,
    (select hierarchy_role from public.profiles where id = target_user_id),
    'Member'
  );

  -- Validate hierarchy_role against the known set.
  if resolved_role not in (
    'Chairperson','Vice Chairperson','Secretary','Vice Secretary',
    'Treasurer','Vice Treasurer','Coordinator','Member'
  ) then
    raise exception 'Invalid hierarchy_role: %', resolved_role;
  end if;

  update public.profiles
    set status = 'active',
        hierarchy_role = resolved_role,
        email_verified = true,
        verified_at = coalesce(verified_at, now()),
        updated_at = now()
    where id = target_user_id
    returning * into updated;

  -- Notify the new member.
  perform public.create_notification(
    p_recipient := target_user_id,
    p_kind := 'system',
    p_title := 'Welcome to Catholic Silanga CBO',
    p_message := 'Your account has been activated. You now have access to the member portal.',
    p_link := '/member-dashboard',
    p_payload := jsonb_build_object('hierarchy_role', resolved_role),
    p_actor := caller_id
  );

  return updated;
end;
$$;

grant execute on function public.approve_member(uuid, text) to authenticated;

-- =====================================================================
-- 6. RPC: suspend_member(target_user_id, reason)
--    Sets status='suspended', sends a notification.
--    Allowed: admin OR moderator.
--    Moderators cannot suspend admin accounts.
-- =====================================================================
create or replace function public.suspend_member(
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
  updated public.profiles;
begin
  caller_id := auth.uid();
  if caller_id is null then
    raise exception 'Not authenticated';
  end if;

  select role into caller_role from public.profiles where id = caller_id;
  if caller_role is null or caller_role not in ('admin','moderator') then
    raise exception 'Only admin or moderator can suspend members';
  end if;

  if target_user_id = caller_id then
    raise exception 'You cannot suspend yourself';
  end if;

  select role into target_role from public.profiles where id = target_user_id;
  if target_role is null then
    raise exception 'Target profile not found';
  end if;

  if caller_role = 'moderator' and target_role = 'admin' then
    raise exception 'Moderators cannot suspend admin accounts';
  end if;

  update public.profiles
    set status = 'suspended',
        updated_at = now()
    where id = target_user_id
    returning * into updated;

  perform public.create_notification(
    p_recipient := target_user_id,
    p_kind := 'system',
    p_title := 'Your account was suspended',
    p_message := coalesce(
      p_reason,
      'Your account has been suspended by a moderator. Contact the admin for details.'
    ),
    p_link := '/member-dashboard',
    p_payload := jsonb_build_object('reason', p_reason),
    p_actor := caller_id
  );

  return updated;
end;
$$;

grant execute on function public.suspend_member(uuid, text) to authenticated;

-- =====================================================================
-- 7. PATCH admin_set_system_role:
--    When granting a management role, auto-activate status if pending.
--    Also: reject self-demotion (admins can't remove their own admin role
--    by accident — must transfer ownership first).
-- =====================================================================
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
  caller_role text;
  updated_row public.profiles;
  target_role text;
  target_status text;
begin
  caller_id := auth.uid();
  if caller_id is null then
    raise exception 'Not authenticated';
  end if;

  select role into caller_role from public.profiles where id = caller_id;
  if caller_role is null or caller_role <> 'admin' then
    raise exception 'Only admins can change roles';
  end if;

  if new_role not in ('admin','member','moderator','secretary','treasurer') then
    raise exception 'Invalid role: %', new_role;
  end if;

  if target_user_id = caller_id and new_role <> 'admin' then
    raise exception 'Admins cannot demote themselves — ask another admin to take over first';
  end if;

  select role, status into target_role, target_status
    from public.profiles where id = target_user_id;
  if target_role is null then
    raise exception 'Target profile not found';
  end if;

  update public.profiles
    set role = new_role,
        -- Auto-activate when granting a management role
        status = case
          when new_role in ('admin','moderator','treasurer','secretary')
               and status = 'pending'
            then 'active'
          else status
        end,
        email_verified = case
          when new_role in ('admin','moderator','treasurer','secretary') then true
          else email_verified
        end,
        verified_at = case
          when new_role in ('admin','moderator','treasurer','secretary')
               and verified_at is null
            then now()
          else verified_at
        end,
        updated_at = now()
    where id = target_user_id;

  select * into updated_row from public.profiles where id = target_user_id;

  -- If we auto-activated a previously-pending account, notify them.
  if target_status = 'pending'
     and new_role in ('admin','moderator','treasurer','secretary')
     and updated_row.status = 'active' then
    perform public.create_notification(
      p_recipient := target_user_id,
      p_kind := 'role_changed',
      p_title := 'You have been assigned a role',
      p_message := 'You are now ' ||
        case new_role
          when 'admin' then 'an administrator'
          when 'treasurer' then 'the Treasurer'
          when 'secretary' then 'the Secretary'
          when 'moderator' then 'a Moderator'
          else new_role
        end ||
        ' and your account has been activated. Sign in to access your portal.',
      p_link := '/login',
      p_payload := jsonb_build_object('new_role', new_role),
      p_actor := caller_id
    );
  end if;

  return updated_row;
end;
$$;

grant execute on function public.admin_set_system_role(uuid, text) to authenticated;

-- =====================================================================
-- 8. HARD GUARD: moderators cannot change anyone's role via the
--    profiles UPDATE policy. Role assignment must go through
--    admin_set_system_role() which checks for admin role.
--    (We rely on the RPC-level guard because the existing profiles
--     UPDATE policies don't enforce field-level restrictions. As a
--     belt-and-suspenders measure, revoke the role column from mods
--     by re-creating the moderator UPDATE policy with a guard
--     expression that compares NEW.role to the role the row had
--     when the update started. Postgres RLS doesn't expose OLD/NEW
--     in WITH CHECK, so we do this differently: we add a trigger that
--     blocks role changes by non-admins.)
-- =====================================================================

create or replace function public.guard_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role text;
begin
  -- Only enforce if role is being changed.
  if new.role is distinct from old.role then
    select role into caller_role from public.profiles where id = auth.uid();
    if caller_role is null or caller_role <> 'admin' then
      raise exception 'Only admins can change roles';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_role_change on public.profiles;
create trigger trg_guard_role_change
  before update on public.profiles
  for each row
  execute function public.guard_role_change();

-- =====================================================================
-- HOW TO USE
-- =====================================================================
-- 1. Run this file in the Supabase SQL Editor (after v7.sql).
-- 2. To promote someone to moderator:
--      select public.admin_set_system_role('<user-uuid>', 'moderator');
--    They will be auto-activated (status='active') if previously pending.
-- 3. To approve a pending member without touching their role:
--      select public.approve_member('<user-uuid>', 'Member');
--    Moderators and admins can call this. Moderators cannot act on admins.
-- 4. To suspend:
--      select public.suspend_member('<user-uuid>', 'Repeated ToS violations');
-- 5. The trigger trg_guard_role_change ensures moderators can edit
--    any profile field EXCEPT 'role'. To change role, must use
--    admin_set_system_role() as admin.
-- 6. After running, the frontend ModeratorPortal at /moderator-portal
--    will have working approve/suspend controls. Treasurer/Secretary
--    promotion via AdminDashboard will now auto-activate pending users.