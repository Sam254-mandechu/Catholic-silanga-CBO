-- =====================================================================
-- Catholic Silanga CBO — Schema additions v4
-- Site CMS (welcome message, mission, vision, terms, contact info)
-- + storage bucket for profile photos & gallery
--
-- Run after schema_v3.sql.
-- =====================================================================

-- ----- Site content (singleton row keyed by id=1) -----
create table if not exists public.site_content (
  id int primary key default 1 check (id = 1),
  welcome_title text not null default 'Welcome to Catholic Silanga CBO',
  welcome_subtitle text not null default 'United in faith, building our community together',
  welcome_message text,
  welcome_image_url text,
  mission_text text not null default 'To empower the Catholic Silanga community through faith-driven collaboration, sustainable development, and shared stewardship of our parish and neighbors.',
  vision_text text not null default 'A thriving Catholic Silanga community where every member contributes to spiritual growth, social welfare, and lasting positive change.',
  values_text text,
  terms_of_service text,
  privacy_policy text,
  contact_address text,
  contact_phone text,
  contact_email text,
  contact_hours text,
  social_facebook text,
  social_twitter text,
  social_instagram text,
  social_youtube text,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

alter table public.site_content enable row level security;

-- Public read
drop policy if exists "Site content publicly readable" on public.site_content;
create policy "Site content publicly readable"
  on public.site_content for select using (true);

-- Admin write
drop policy if exists "Site content admin-write" on public.site_content;
create policy "Site content admin-write"
  on public.site_content for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Seed row 1
insert into public.site_content (id) values (1) on conflict (id) do nothing;

-- ----- Storage buckets -----
-- Profile photos (private — only owner + admin can read; owner can write)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-photos', 'profile-photos', true, 5242880, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do nothing;

-- Gallery (already-public bucket; just make sure it exists)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('gallery', 'gallery', true, 10485760, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

-- Site assets (welcome image, hero, etc.)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('site-assets', 'site-assets', true, 10485760, array['image/jpeg','image/png','image/webp','image/svg+xml'])
on conflict (id) do nothing;

-- ----- Storage RLS -----
-- Profile photos: owner can upload/update/delete their own folder
-- Folder convention: {user_id}/avatar.{ext}
drop policy if exists "Profile photo owner upload" on storage.objects;
create policy "Profile photo owner upload"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'profile-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Profile photo owner update" on storage.objects;
create policy "Profile photo owner update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'profile-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Profile photo owner delete" on storage.objects;
create policy "Profile photo owner delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'profile-photos'
    and (auth.uid()::text = (storage.foldername(name))[1] or public.is_admin())
  );

-- Gallery & site-assets: admin-only write, public read (public bucket default already handles read)
drop policy if exists "Gallery admin write" on storage.objects;
create policy "Gallery admin write"
  on storage.objects for all to authenticated
  using (
    bucket_id in ('gallery','site-assets')
    and public.is_admin()
  )
  with check (
    bucket_id in ('gallery','site-assets')
    and public.is_admin()
  );

-- =====================================================================
-- HOW TO USE
-- =====================================================================
-- 1. Run this file in the Supabase SQL editor.
-- 2. Storage buckets 'profile-photos', 'gallery', 'site-assets' will be
--    created automatically with the policies above.
-- 3. To upload via the admin UI: just navigate to /admin-dashboard ->
--    "Site Content" tab. No manual file uploads needed.
-- 4. To test: register a member, go to /member-dashboard, click the
--    avatar to upload a new photo. It'll appear on the public Members page.