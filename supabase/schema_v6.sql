-- =====================================================================
-- Catholic Silanga CBO — Schema additions v6
-- Adds editable site content (welcome message, mission, vision, contact,
-- legal pages, hero image) + storage policies for profile photos.
--
-- Run this AFTER schema_v3.sql (you should already have all v5 tables).
-- Safe to re-run (uses if not exists / drop policy if exists patterns).
-- =====================================================================

-- ----- site_content: editable copy + image refs for public pages -----
create table if not exists public.site_content (
  key text primary key,
  value text not null,
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);

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