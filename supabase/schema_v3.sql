-- =====================================================================
-- Catholic Silanga CBO — Schema additions v3
-- Magic-admin email allow-list (DB-side, secure).
--
-- Run this AFTER schema.sql and schema_v2.sql.
--
-- Why this exists:
--   We want certain emails (e.g. chairperson@catholicsilanga.org) to
--   automatically become admins on first login. RLS policies check
--   public.is_admin(), which looks at profiles.role — chicken-and-egg
--   for a brand-new account. This RPC runs with SECURITY DEFINER,
--   bypasses RLS safely, and updates the caller's profile if their
--   email is on the allow-list.
-- =====================================================================

-- ----- Allow-list table -----
create table if not exists public.secret_admin_emails (
  email text primary key,
  added_by uuid references auth.users(id) on delete set null,
  added_at timestamptz not null default now(),
  note text
);

alter table public.secret_admin_emails enable row level security;

drop policy if exists "Admin allowlist self-read" on public.secret_admin_emails;
create policy "Admin allowlist self-read"
  on public.secret_admin_emails for select to authenticated
  using (email = (select email from auth.users where id = auth.uid()));

drop policy if exists "Admin allowlist admin-write" on public.secret_admin_emails;
create policy "Admin allowlist admin-write"
  on public.secret_admin_emails for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ----- Promote-by-email RPC -----
-- Bypasses RLS via SECURITY DEFINER. Updates the CALLER's profile only.
create or replace function public.promote_admin_by_email(target_email text)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid;
  caller_email text;
  is_on_list boolean;
  updated_row public.profiles;
begin
  caller_id := auth.uid();
  if caller_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Look up the caller's email from auth.users
  select email into caller_email
    from auth.users where id = caller_id;

  if caller_email is null or lower(caller_email) <> lower(target_email) then
    raise exception 'Email mismatch — cannot promote a different account';
  end if;

  -- Check the allow-list
  select exists(
    select 1 from public.secret_admin_emails
    where lower(email) = lower(target_email)
  ) into is_on_list;

  if not is_on_list then
    raise exception 'Email % is not on the admin allow-list', target_email;
  end if;

  -- Upsert profile (handle the case where the trigger hasn't created it yet)
  insert into public.profiles (
    id, email, display_name, role, status, hierarchy_role,
    email_verified, verified_at, updated_at
  )
  values (
    caller_id, caller_email,
    coalesce(split_part(caller_email, '@', 1), 'Admin'),
    'admin', 'active', 'Chairperson',
    true, now(), now()
  )
  on conflict (id) do update set
    role = 'admin',
    status = 'active',
    hierarchy_role = coalesce(public.profiles.hierarchy_role, 'Chairperson'),
    verified_at = coalesce(public.profiles.verified_at, now()),
    updated_at = now();

  select * into updated_row from public.profiles where id = caller_id;
  return updated_row;
end;
$$;

grant execute on function public.promote_admin_by_email(text) to authenticated;

-- ----- Convenience: list allowlist (admin-only) -----
create or replace function public.list_admin_emails()
returns table(email text, added_at timestamptz, note text)
language sql
stable
security definer
set search_path = public
as $$
  select email, added_at, note from public.secret_admin_emails
  where public.is_admin()
  order by added_at desc;
$$;

grant execute on function public.list_admin_emails() to authenticated;

-- ----- Seed with a placeholder so the table is ready -----
-- Add your real admin emails below (or via the Supabase dashboard later).
insert into public.secret_admin_emails (email, note) values
  ('admin@catholicsilanga.org', 'Primary admin — replace with your real email')
on conflict (email) do nothing;

-- =====================================================================
-- OPTIONAL: auto-trigger promotion on first login.
-- We use a hook on auth.users to auto-promote when someone signs in for
-- the first time and their email is on the allow-list. Saves a round-trip.
-- =====================================================================

create or replace function public.handle_admin_email_login()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  on_list boolean;
begin
  select exists(
    select 1 from public.secret_admin_emails where lower(email) = lower(new.email)
  ) into on_list;

  if on_list then
    -- Upsert profile as admin/active
    insert into public.profiles (
      id, email, display_name, role, status, hierarchy_role,
      email_verified, verified_at, updated_at
    )
    values (
      new.id, new.email,
      coalesce(split_part(new.email, '@', 1), 'Admin'),
      'admin', 'active', 'Chairperson',
      (new.email_confirmed_at is not null), now(), now()
    )
    on conflict (id) do update set
      role = 'admin',
      status = 'active',
      verified_at = coalesce(public.profiles.verified_at, now()),
      updated_at = now();
  end if;

  return new;
end;
$$;

-- Hook into auth flow. Runs after email/password sign-in.
drop trigger if exists on_auth_user_confirmed on auth.users;
create trigger on_auth_user_confirmed
  after update of email_confirmed_at on auth.users
  for each row when (new.email_confirmed_at is not null)
  execute function public.handle_admin_email_login();

-- Also run on signup insert (in case email confirmation is OFF and the
-- user is created already-confirmed).
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_admin_email_login();

-- =====================================================================
-- HOW TO USE
-- =====================================================================
-- 1. Run this file in the Supabase SQL editor.
-- 2. To add a new admin email:
--      insert into public.secret_admin_emails (email) values ('you@you.com');
-- 3. To remove an admin email (and demote them):
--      delete from public.secret_admin_emails where email = 'you@you.com';
--      update public.profiles set role = 'member' where email = 'you@you.com';
-- 4. To promote manually via RPC (e.g. from an admin script):
--      select public.promote_admin_by_email('user@example.com');
-- 5. From your frontend, the magic-admin flow just works:
--      user registers -> trigger fires -> profile set to role='admin'
--      user logs in -> is_admin() returns true -> full admin access
