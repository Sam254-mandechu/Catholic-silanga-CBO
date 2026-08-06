-- =====================================================================
-- Catholic Silanga CBO — Schema additions v4
-- Adds `published` flag to events + fixes some small gaps.
-- =====================================================================

-- Add published column to events
alter table public.events
  add column if not exists published boolean not null default true;

-- Add an index on events for filtering by published status
create index if not exists events_published_idx on public.events (published, event_date);

-- Update the public read policy to filter unpublished events for non-admins
drop policy if exists "Events publicly readable" on public.events;
create policy "Events publicly readable"
  on public.events for select
  using (published = true or public.is_admin());

-- Same for news (already filters by published, but make explicit)
drop policy if exists "News publicly readable when published" on public.news;
create policy "News publicly readable when published"
  on public.news for select
  using (published = true or public.is_admin());
