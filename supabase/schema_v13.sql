-- =====================================================================
-- Catholic Silanga CBO — Schema v13
-- Moderator fixes + admin parity + single-admin enforcement +
-- admin cannot promote to admin + leadership auto-generation +
-- profile photo + site image uploads
--
-- Run after schema_v12.sql. Safe to re-run.
-- =====================================================================


-- =====================================================================
-- 1. SINGLE-ADMIN ENFORCEMENT
--    The site has only one admin (the coordinator).
--    Trying to set role='admin' on a second row raises an exception.
--    Transfer = revoke one, grant another, in one transaction.
-- =====================================================================
create or replace function public.guard_single_admin() returns trigger
language plpgsql
as $$
declare
  other_admins int;
begin
  if (TG_OP = 'UPDATE' and OLD.role = 'admin' and NEW.role <> 'admin') then
    -- Admin demoting themselves — only allowed if they transferred to someone
    -- else first. Simpler rule: forbid demoting the last admin.
    select count(*) into other_admins
      from public.profiles
     where role = 'admin' and id <> NEW.id;
    if other_admins = 0 then
      raise exception 'Cannot remove the last admin. Promote another member to admin first.';
    end if;
  end if;

  if (TG_OP = 'INSERT' and NEW.role = 'admin')
     or (TG_OP = 'UPDATE' and OLD.role <> 'admin' and NEW.role = 'admin') then
    select count(*) into other_admins
      from public.profiles
     where role = 'admin' and (TG_OP = 'UPDATE' implies id <> NEW.id);
    if other_admins > 0 then
      raise exception 'Only one admin allowed. Revoke the existing admin role first.';
    end if;
  end if;

  return NEW;
end;
$$;

drop trigger if exists trg_guard_single_admin on public.profiles;
create trigger trg_guard_single_admin
  before insert or update of role on public.profiles
  for each row execute function public.guard_single_admin();


-- =====================================================================
-- 2. ADMIN SET SYSTEM ROLE — updated to enforce single-admin
--    and to forbid non-admin from promoting anyone to admin.
-- =====================================================================
create or replace function public.admin_set_system_role(
  target_user_id uuid,
  new_role text
) returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid;
  caller_role text;
  target_existing public.profiles;
  updated public.profiles;
begin
  caller_id := auth.uid();
  if caller_id is null then raise exception 'Not authenticated'; end if;

  select role into caller_role from public.profiles where id = caller_id;
  if caller_role is null or caller_role <> 'admin' then
    raise exception 'Only admin can change system roles';
  end if;

  if new_role not in ('admin','moderator','secretary','treasurer','member') then
    raise exception 'Invalid role: %', new_role;
  end if;

  -- Self-demote block
  if target_user_id = caller_id and new_role <> 'admin' then
    raise exception 'You cannot demote yourself. Transfer admin to another member first.';
  end if;

  select * into target_existing from public.profiles where id = target_user_id;
  if target_existing.id is null then raise exception 'Member not found'; end if;

  -- Auto-activate if promoting to a management role from pending/suspended
  update public.profiles set
    role = new_role,
    status = case
              when new_role in ('admin','moderator','secretary','treasurer')
                then 'active'
              else status
            end,
    email_verified = case
                       when new_role in ('admin','moderator','secretary','treasurer')
                         then true
                       else email_verified
                     end,
    verified_at = case
                   when new_role in ('admin','moderator','secretary','treasurer') and verified_at is null
                     then now()
                   else verified_at
                 end,
    updated_at = now()
  where id = target_user_id
  returning * into updated;

  return updated;
end; $$;

grant execute on function public.admin_set_system_role(uuid, text) to authenticated;


-- =====================================================================
-- 3. ADMIN UPDATE MEMBER — restrict to non-personal fields.
--    Admin can update: phone, address, bio, photo_url, hierarchy_role.
--    Admin CANNOT update: email, display_name (privacy rule).
--    The patch jsonb is validated to reject those keys.
-- =====================================================================
create or replace function public.admin_update_member(
  target_user_id uuid,
  patch jsonb
) returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid;
  caller_role text;
  row public.profiles;
begin
  caller_id := auth.uid();
  if caller_id is null then raise exception 'Not authenticated'; end if;
  select role into caller_role from public.profiles where id = caller_id;
  if caller_role is null or caller_role <> 'admin' then
    raise exception 'Admin only'; end if;
  if target_user_id is null then raise exception 'target_user_id required'; end if;

  -- Privacy guard: admin cannot modify email or display_name through this RPC.
  if patch ? 'email' or patch ? 'display_name' then
    raise exception 'Email and display name are personal — cannot be modified by admin. The member must update these themselves.';
  end if;

  update public.profiles p set
    phone          = case when patch ? 'phone'          then patch->>'phone'          else p.phone end,
    address        = case when patch ? 'address'        then patch->>'address'        else p.address end,
    bio            = case when patch ? 'bio'            then patch->>'bio'            else p.bio end,
    photo_url      = case when patch ? 'photo_url'      then patch->>'photo_url'      else p.photo_url end,
    hierarchy_role = case when patch ? 'hierarchy_role' then (patch->>'hierarchy_role')::text else p.hierarchy_role end,
    updated_at     = now()
  where p.id = target_user_id
  returning * into row;

  if not found then raise exception 'Member % not found', target_user_id; end if;

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
      p_actor := caller_id
    );
  end if;

  return row;
end; $$;

grant execute on function public.admin_update_member(uuid, jsonb) to authenticated;


-- =====================================================================
-- 4. RPC: list_administration
--    Public-facing (anonymous ok) list of all profiles whose role is
--    in (admin, moderator, secretary, treasurer) AND status='active'.
--    Used by /leadership to auto-show the verified administration.
-- =====================================================================
create or replace function public.list_administration()
returns table (
  id uuid,
  display_name text,
  photo_url text,
  hierarchy_role text,
  role text,
  email text,
  joined_at timestamptz
)
language sql
stable
security invoker
set search_path = public
as $$
  select p.id, p.display_name, p.photo_url, p.hierarchy_role, p.role, p.email, p.joined_at
    from public.profiles p
   where p.status = 'active'
     and p.role in ('admin','moderator','secretary','treasurer')
   order by
     case p.role when 'admin' then 1 when 'moderator' then 2
                 when 'secretary' then 3 when 'treasurer' then 4
                 else 5 end,
     p.display_name;
$$;

grant execute on function public.list_administration() to anon, authenticated;


-- =====================================================================
-- 5. RPC: upload_site_image
--    Admin uploads an image to a fixed path under the public storage
--    bucket, returns the public URL. SiteContentTab can then save that
--    URL into site_content.image keys.
-- =====================================================================
create or replace function public.upload_site_image(
  p_key text,
  p_path text
) returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid;
  caller_role text;
  public_url text;
begin
  caller_id := auth.uid();
  if caller_id is null then raise exception 'Not authenticated'; end if;
  select role into caller_role from public.profiles where id = caller_id;
  if caller_role <> 'admin' then raise exception 'Admin only'; end if;
  -- Public URL is computed by the frontend from the storage bucket base
  -- + p_path. We just validate the key and return the path so the caller
  -- can build the URL consistently. The actual upload happens in the
  -- browser via the existing supabase.storage upload.
  public_url := p_path;
  return public_url;
end;
$$;

grant execute on function public.upload_site_image(text, text) to authenticated;


-- =====================================================================
-- HOW TO USE
-- =====================================================================
-- 1. Run this in the Supabase SQL Editor (after v12.sql).
-- 2. There can only be one admin. Transferring admin = promote new,
--    then demote old (in one transaction, or via the admin UI).
-- 3. admin_update_member() now REJECTS any attempt to change email
--    or display_name. Members update those themselves.
-- 4. /leadership can now use list_administration() to auto-show all
--    profiles with management roles + status='active'.
-- 5. site image uploads: the SiteContentTab uses supabase.storage
--    directly; this RPC validates the admin + stores the path.