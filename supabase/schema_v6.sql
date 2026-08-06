-- =====================================================================
-- Catholic Silanga CBO — Schema additions v6
-- Adds editable site content (welcome message, mission, vision, contact,
-- legal pages, hero image) + storage policies for profile photos.
--
-- Run this AFTER schema_v3.sql (you should already have all v5 tables).
-- Safe to re-run (uses if not exists / drop policy if exists patterns).
--
-- ⚠️  CONFLICT WARNING — SITE_CONTENT TABLE SHAPE ⚠️
-- schema_v4.sql also creates a `site_content` table, but with a
-- different shape (singleton id=1 with named columns). Whichever
-- runs FIRST wins. The frontend uses THIS v6 (key/value) shape.
--
-- If you already ran v4 and the table is in the v4 shape, v6 will
-- no-op. This file now auto-detects that situation and migrates
-- any v4 data into v6 key/value rows before exiting.
-- =====================================================================

-- ----- Pre-flight: migrate v4 singleton → v6 key/value if needed -----
-- Uses a permanent staging table (not TEMP) because temp tables created
-- inside a DO block are dropped when the block ends — we need the data
-- to survive into the next SELECT below.
create table if not exists public._v4_site_content_migration (
  key text primary key,
  value text
);

do $$
declare
  has_v4_id boolean;
  r record;
begin
  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'site_content'
      and column_name = 'id'
      and data_type = 'integer'
  ) into has_v4_id;

  if has_v4_id then
    for r in select * from public.site_content loop
      insert into public._v4_site_content_migration(key, value) values
        ('welcome_title',       r.welcome_title),
        ('welcome_subtitle',    r.welcome_subtitle),
        ('welcome_message',     r.welcome_message),
        ('welcome_image_url',   r.welcome_image_url),
        ('mission',             r.mission_text),
        ('vision',              r.vision_text),
        ('values',              r.values_text),
        ('terms_of_service',    r.terms_of_service),
        ('privacy_policy',      r.privacy_policy),
        ('contact_address',     r.contact_address),
        ('contact_phone',       r.contact_phone),
        ('contact_email',       r.contact_email),
        ('contact_hours',       r.contact_hours),
        ('social_facebook',     r.social_facebook),
        ('social_twitter',      r.social_twitter),
        ('social_instagram',    r.social_instagram),
        ('social_youtube',      r.social_youtube)
      on conflict (key) do nothing;
    end loop;

    drop table public.site_content cascade;
  end if;
end
$$;

-- ----- site_content: editable copy + image refs for public pages -----
create table if not exists public.site_content (
  key text primary key,
  value text not null,
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);

-- Restore any data we migrated above
insert into public.site_content (key, value)
select key, value from public._v4_site_content_migration
on conflict (key) do nothing;

-- Clean up the staging table
drop table if exists public._v4_site_content_migration;

alter table public.site_content enable row level security;

drop policy if exists "Site content readable by everyone" on public.site_content;
create policy "Site content readable by everyone"
  on public.site_content for select using (true);

drop policy if exists "Site content admin-write" on public.site_content;
create policy "Site content admin-write"
  on public.site_content for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ----- Storage bucket for profile photos -----
-- (You may already have 'gallery' from earlier. We use a separate bucket so
--  profile photos are easy to manage/list independently.)
insert into storage.buckets (id, name, public)
values ('profile-photos', 'profile-photos', true)
on conflict (id) do nothing;

-- ----- Storage policies for profile-photos bucket -----
-- Anyone can view (bucket is public).
-- Authenticated users can upload to their own folder (path starts with their auth.uid()).
-- Users can update/delete only their own files.
drop policy if exists "Profile photos public read" on storage.objects;
create policy "Profile photos public read"
  on storage.objects for select using (bucket_id = 'profile-photos');

drop policy if exists "Users upload their own profile photo" on storage.objects;
create policy "Users upload their own profile photo"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users update their own profile photo" on storage.objects;
create policy "Users update their own profile photo"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users delete their own profile photo" on storage.objects;
create policy "Users delete their own profile photo"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Admins can manage any file in the bucket
drop policy if exists "Admins manage any profile photo" on storage.objects;
create policy "Admins manage any profile photo"
  on storage.objects for all to authenticated
  using (bucket_id = 'profile-photos' and public.is_admin())
  with check (bucket_id = 'profile-photos' and public.is_admin());

-- ----- Seed: insert default values for known keys (only if absent) -----
insert into public.site_content (key, value) values
  ('welcome_message',     'Welcome to Catholic Silanga CBO. We are a community of faith, hope, and service.'),
  ('welcome_subtitle',    'Building a stronger parish together.'),
  ('home_hero_image',     ''),
  ('mission',             'To deepen the Catholic faith of our members through worship, education, charity, and fellowship, while serving the broader Silanga community with the love of Christ.'),
  ('vision',              'A vibrant, inclusive Catholic community where every member grows in faith, every family finds support, and every neighbor experiences the love of God through our actions.'),
  ('contact_address',     'Catholic Silanga CBO, Silanga Parish, Nairobi, Kenya'),
  ('contact_phone',       '+254 7XX XXX XXX'),
  ('contact_email',       'info@catholicsilanga.org'),
  ('contact_hours',       'Office hours: Mon–Fri, 9:00 AM – 5:00 PM'),
  ('terms_of_service',    'Terms of Service — placeholder. Edit from admin panel.'),
  ('privacy_policy',      'Privacy Policy — placeholder. Edit from admin panel.')
on conflict (key) do nothing;

-- =====================================================================
-- USAGE
-- =====================================================================
-- Admin edits these from /admin-dashboard → Site Content tab.
-- Public pages fetch the row they need on mount and fall back to
-- hardcoded defaults if the row is missing.
-- Profile photos: bucket `profile-photos`, path `${userId}/avatar-${ts}.jpg`.
-- =====================================================================