-- =====================================================================
-- Catholic Silanga CBO — Supabase Database Schema
-- Run this once in the Supabase SQL Editor (Database → SQL Editor → New query).
-- Safe to re-run: uses IF NOT EXISTS / CREATE OR REPLACE everywhere.
-- =====================================================================

-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- =====================================================================
-- PROFILES (mirror of auth.users; one row per member)
-- =====================================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  display_name text not null,
  role text not null default 'member' check (role in ('admin','member','moderator')),
  status text not null default 'active' check (status in ('active','pending','suspended')),
  phone text,
  address text,
  bio text,
  photo_url text,
  email_verified boolean not null default false,
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_email_idx on public.profiles (email);
create index if not exists profiles_role_idx on public.profiles (role);

-- =====================================================================
-- PROJECTS
-- =====================================================================
create table if not exists public.projects (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text not null,
  image text,
  status text not null default 'planning' check (status in ('planning','ongoing','completed')),
  budget numeric not null default 0,
  progress int not null default 0 check (progress between 0 and 100),
  category text not null default 'General',
  location text,
  beneficiaries int default 0,
  start_date date not null default current_date,
  end_date date,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists projects_status_idx on public.projects (status);
create index if not exists projects_category_idx on public.projects (category);
create index if not exists projects_start_date_idx on public.projects (start_date desc);

-- =====================================================================
-- NEWS
-- =====================================================================
create table if not exists public.news (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  excerpt text not null,
  content text not null,
  image text,
  author text not null,
  category text not null default 'Community',
  tags text[] not null default '{}',
  published boolean not null default true,
  author_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists news_category_idx on public.news (category);
create index if not exists news_created_idx on public.news (created_at desc);

-- =====================================================================
-- EVENTS
-- =====================================================================
create table if not exists public.events (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text not null,
  image text,
  event_date date not null,
  end_date date,
  event_time text not null,
  location text not null,
  category text not null default 'Community',
  registration_link text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists events_date_idx on public.events (event_date asc);

-- =====================================================================
-- GALLERY
-- =====================================================================
create table if not exists public.gallery (
  id uuid primary key default uuid_generate_v4(),
  url text not null,
  title text,
  category text default 'General',
  uploaded_by uuid references public.profiles (id) on delete set null,
  uploaded_at timestamptz not null default now()
);

create index if not exists gallery_category_idx on public.gallery (category);

-- =====================================================================
-- LEADERSHIP
-- =====================================================================
create table if not exists public.leadership (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  position text not null,
  bio text not null,
  photo text,
  email text,
  phone text,
  display_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists leadership_order_idx on public.leadership (display_order asc);

-- =====================================================================
-- CONTACTS (form submissions from /contact)
-- =====================================================================
create table if not exists public.contacts (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  email text not null,
  phone text,
  subject text not null,
  message text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists contacts_created_idx on public.contacts (created_at desc);

-- =====================================================================
-- DONATIONS
-- =====================================================================
create table if not exists public.donations (
  id uuid primary key default uuid_generate_v4(),
  donor_name text not null,
  email text not null,
  amount numeric not null check (amount > 0),
  currency text not null default 'USD',
  purpose text not null,
  message text,
  status text not null default 'pending' check (status in ('pending','completed','failed')),
  donor_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists donations_status_idx on public.donations (status);
create index if not exists donations_created_idx on public.donations (created_at desc);

-- =====================================================================
-- ANNOUNCEMENTS
-- =====================================================================
create table if not exists public.announcements (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  content text not null,
  priority text not null default 'medium' check (priority in ('low','medium','high')),
  published_at timestamptz not null default now(),
  expires_at timestamptz
);

-- =====================================================================
-- Trigger: when a new auth.users row is created, insert a matching profiles row.
-- =====================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================================
-- updated_at triggers
-- =====================================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists trg_profiles_updated   on public.profiles;
drop trigger if exists trg_projects_updated   on public.projects;
drop trigger if exists trg_news_updated       on public.news;
drop trigger if exists trg_events_updated     on public.events;
create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger trg_projects_updated before update on public.projects
  for each row execute function public.set_updated_at();
create trigger trg_news_updated before update on public.news
  for each row execute function public.set_updated_at();
create trigger trg_events_updated before update on public.events
  for each row execute function public.set_updated_at();

-- =====================================================================
-- ROW LEVEL SECURITY
-- =====================================================================
alter table public.profiles    enable row level security;
alter table public.projects    enable row level security;
alter table public.news        enable row level security;
alter table public.events      enable row level security;
alter table public.gallery     enable row level security;
alter table public.leadership  enable row level security;
alter table public.contacts    enable row level security;
alter table public.donations   enable row level security;
alter table public.announcements enable row level security;

-- Helper: is current user admin
create or replace function public.is_admin()
returns boolean
language sql stable
as $$
  select coalesce(
    (select role = 'admin' from public.profiles where id = auth.uid()),
    false
  );
$$;

-- ----- PROFILES -----
drop policy if exists "Profiles readable by anyone authenticated" on public.profiles;
create policy "Profiles readable by anyone authenticated"
  on public.profiles for select to authenticated using (true);

drop policy if exists "Profiles self-update" on public.profiles;
create policy "Profiles self-update"
  on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "Profiles admin-update" on public.profiles;
create policy "Profiles admin-update"
  on public.profiles for update to authenticated
  using (public.is_admin());

drop policy if exists "Profiles admin-delete" on public.profiles;
create policy "Profiles admin-delete"
  on public.profiles for delete to authenticated
  using (public.is_admin());

-- ----- PROJECTS -----
drop policy if exists "Projects publicly readable" on public.projects;
create policy "Projects publicly readable"
  on public.projects for select using (true);

drop policy if exists "Projects admin-write" on public.projects;
create policy "Projects admin-write"
  on public.projects for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ----- NEWS -----
drop policy if exists "News publicly readable when published" on public.news;
create policy "News publicly readable when published"
  on public.news for select using (published = true or public.is_admin());

drop policy if exists "News admin-write" on public.news;
create policy "News admin-write"
  on public.news for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ----- EVENTS -----
drop policy if exists "Events publicly readable" on public.events;
create policy "Events publicly readable"
  on public.events for select using (true);

drop policy if exists "Events admin-write" on public.events;
create policy "Events admin-write"
  on public.events for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ----- GALLERY -----
drop policy if exists "Gallery publicly readable" on public.gallery;
create policy "Gallery publicly readable"
  on public.gallery for select using (true);

drop policy if exists "Gallery admin-write" on public.gallery;
create policy "Gallery admin-write"
  on public.gallery for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ----- LEADERSHIP -----
drop policy if exists "Leadership publicly readable" on public.leadership;
create policy "Leadership publicly readable"
  on public.leadership for select using (true);

drop policy if exists "Leadership admin-write" on public.leadership;
create policy "Leadership admin-write"
  on public.leadership for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ----- CONTACTS -----
drop policy if exists "Anyone can submit a contact" on public.contacts;
create policy "Anyone can submit a contact"
  on public.contacts for insert to anon, authenticated with check (true);

drop policy if exists "Contacts admin-read" on public.contacts;
create policy "Contacts admin-read"
  on public.contacts for select to authenticated
  using (public.is_admin());

-- ----- DONATIONS -----
drop policy if exists "Anyone can record donation" on public.donations;
create policy "Anyone can record donation"
  on public.donations for insert to anon, authenticated with check (true);

drop policy if exists "Donations self-or-admin-read" on public.donations;
create policy "Donations self-or-admin-read"
  on public.donations for select to authenticated
  using (donor_id = auth.uid() or public.is_admin());

drop policy if exists "Donations admin-update" on public.donations;
create policy "Donations admin-update"
  on public.donations for update to authenticated
  using (public.is_admin());

-- ----- ANNOUNCEMENTS -----
drop policy if exists "Announcements publicly readable" on public.announcements;
create policy "Announcements publicly readable"
  on public.announcements for select using (true);

drop policy if exists "Announcements admin-write" on public.announcements;
create policy "Announcements admin-write"
  on public.announcements for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- =====================================================================
-- Seed an admin: change the email below to your own after first signing up.
-- (You'll need to register through the app first, then run this update.)
-- =====================================================================
-- update public.profiles set role = 'admin' where email = 'youremail@yourdomain.com';

-- =====================================================================
-- End of schema.
-- =====================================================================
