-- =====================================================================
-- Catholic Silanga CBO — Schema v11
-- Treasurer "Create Record" wizard: snapshot financial summaries over
-- a date range into a public-readable table.
--
-- Run after schema_v10.sql. Safe to re-run.
-- =====================================================================


-- =====================================================================
-- 1. financial_record_summaries
--    Each row = one published Treasurer/Admin snapshot of activity
--    over a date range. Public-readable once status='published'.
-- =====================================================================
create table if not exists public.financial_record_summaries (
  id uuid primary key default uuid_generate_v4(),
  title text not null check (length(title) >= 3 and length(title) <= 200),
  period_start date not null,
  period_end date not null,
  -- Snapshot of totals at time of creation. These are the numbers that
  -- the public will see forever — they don't update if later transactions
  -- are edited (immutable record-keeping).
  total_donations numeric not null default 0,
  donation_count int not null default 0,
  total_expenses numeric not null default 0,
  expense_count int not null default 0,
  total_fines_paid numeric not null default 0,
  fines_paid_count int not null default 0,
  total_fines_unpaid numeric not null default 0,
  fines_unpaid_count int not null default 0,
  total_fines_waived numeric not null default 0,
  fines_waived_count int not null default 0,
  total_income numeric not null default 0,       -- donations + fines_paid
  net_position numeric not null default 0,        -- total_income - total_expenses
  -- JSONB lines array for a per-category breakdown on the public page
  -- (one row per category, e.g. "Operations expenses 12,500 / 3 entries")
  lines jsonb not null default '[]'::jsonb,
  -- Which categories were included in this snapshot (so the public page
  -- can render the "what's counted" legend).
  included_categories text[] not null default '{}',
  notes text,
  status text not null default 'draft'
    check (status in ('draft', 'published')),
  created_by uuid not null references public.profiles(id) on delete set null,
  published_by uuid references public.profiles(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint period_dates_valid check (period_end >= period_start)
);

create index if not exists fin_record_summaries_period_idx
  on public.financial_record_summaries (period_start desc, period_end desc);

create index if not exists fin_record_summaries_published_idx
  on public.financial_record_summaries (status, published_at desc)
  where status = 'published';

alter table public.financial_record_summaries enable row level security;

-- Public (anon) reads published only
drop policy if exists "Fin record summaries public read" on public.financial_record_summaries;
create policy "Fin record summaries public read" on public.financial_record_summaries
  for select to anon using (status = 'published');

-- Authenticated: read all (so treasurer sees drafts they made)
drop policy if exists "Fin record summaries auth read" on public.financial_record_summaries;
create policy "Fin record summaries auth read" on public.financial_record_summaries
  for select to authenticated using (true);

-- Only admin + treasurer can insert/update
drop policy if exists "Fin record summaries treasurer write" on public.financial_record_summaries;
create policy "Fin record summaries treasurer write" on public.financial_record_summaries
  for all to authenticated
  using (public.is_treasurer_or_admin())
  with check (public.is_treasurer_or_admin());


-- =====================================================================
-- 2. RPC: preview_financial_summary
--    Live preview without persisting. Takes a date range + a set of
--    categories and returns the totals + a per-line breakdown.
--    The Treasurer UI calls this to populate the preview panel before
--    publishing.
-- =====================================================================
create or replace function public.preview_financial_summary(
  p_period_start date,
  p_period_end date,
  p_include_donations boolean default true,
  p_include_expenses boolean default true,
  p_include_fines_paid boolean default true,
  p_include_fines_unpaid boolean default true,
  p_include_fines_waived boolean default false
) returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  result jsonb;
  total_donations numeric := 0;
  donation_count int := 0;
  total_expenses numeric := 0;
  expense_count int := 0;
  total_fines_paid numeric := 0;
  fines_paid_count int := 0;
  total_fines_unpaid numeric := 0;
  fines_unpaid_count int := 0;
  total_fines_waived numeric := 0;
  fines_waived_count int := 0;
  lines jsonb := '[]'::jsonb;
  included text[] := '{}';
  category text;
begin
  -- Donations (verified only — completed status, in date range)
  if p_include_donations then
    select coalesce(sum(amount), 0), count(*)::int
      into total_donations, donation_count
      from public.donations
     where status = 'completed'
       and created_at >= p_period_start::timestamptz
       and created_at <  (p_period_end + 1)::timestamptz;
    if donation_count > 0 then
      lines := lines || jsonb_build_array(jsonb_build_object(
        'category', 'donations', 'label', 'Verified donations',
        'amount', total_donations, 'count', donation_count));
      included := array_append(included, 'donations');
    end if;
  end if;

  -- Expenses (approved only — approved_at not null)
  if p_include_expenses then
    select coalesce(sum(amount), 0), count(*)::int
      into total_expenses, expense_count
      from public.expenses
     where approved_at is not null
       and expense_date >= p_period_start
       and expense_date <= p_period_end;
    if expense_count > 0 then
      lines := lines || jsonb_build_array(jsonb_build_object(
        'category', 'expenses', 'label', 'Approved expenses',
        'amount', total_expenses, 'count', expense_count));
      included := array_append(included, 'expenses');
    end if;
  end if;

  -- Fines (paid)
  if p_include_fines_paid then
    select coalesce(sum(amount), 0), count(*)::int
      into total_fines_paid, fines_paid_count
      from public.fines
     where status = 'paid'
       and created_at >= p_period_start::timestamptz
       and created_at <  (p_period_end + 1)::timestamptz;
    if fines_paid_count > 0 then
      lines := lines || jsonb_build_array(jsonb_build_object(
        'category', 'fines_paid', 'label', 'Fines paid',
        'amount', total_fines_paid, 'count', fines_paid_count));
      included := array_append(included, 'fines_paid');
    end if;
  end if;

  -- Fines (unpaid) — receivables, not income
  if p_include_fines_unpaid then
    select coalesce(sum(amount), 0), count(*)::int
      into total_fines_unpaid, fines_unpaid_count
      from public.fines
     where status = 'unpaid'
       and created_at >= p_period_start::timestamptz
       and created_at <  (p_period_end + 1)::timestamptz;
    if fines_unpaid_count > 0 then
      lines := lines || jsonb_build_array(jsonb_build_object(
        'category', 'fines_unpaid', 'label', 'Fines outstanding (receivables)',
        'amount', total_fines_unpaid, 'count', fines_unpaid_count));
      included := array_append(included, 'fines_unpaid');
    end if;
  end if;

  -- Fines (waived)
  if p_include_fines_waived then
    select coalesce(sum(amount), 0), count(*)::int
      into total_fines_waived, fines_waived_count
      from public.fines
     where status = 'waived'
       and created_at >= p_period_start::timestamptz
       and created_at <  (p_period_end + 1)::timestamptz;
    if fines_waived_count > 0 then
      lines := lines || jsonb_build_array(jsonb_build_object(
        'category', 'fines_waived', 'label', 'Fines waived',
        'amount', total_fines_waived, 'count', fines_waived_count));
      included := array_append(included, 'fines_waived');
    end if;
  end if;

  result := jsonb_build_object(
    'period_start', p_period_start,
    'period_end', p_period_end,
    'total_donations', total_donations,
    'donation_count', donation_count,
    'total_expenses', total_expenses,
    'expense_count', expense_count,
    'total_fines_paid', total_fines_paid,
    'fines_paid_count', fines_paid_count,
    'total_fines_unpaid', total_fines_unpaid,
    'fines_unpaid_count', fines_unpaid_count,
    'total_fines_waived', total_fines_waived,
    'fines_waived_count', fines_waived_count,
    'total_income', total_donations + total_fines_paid,
    'net_position', (total_donations + total_fines_paid) - total_expenses,
    'lines', lines,
    'included_categories', included
  );

  return result;
end; $$;

grant execute on function public.preview_financial_summary(
  date, date, boolean, boolean, boolean, boolean, boolean
) to authenticated;


-- =====================================================================
-- 3. RPC: create_financial_record_summary
--    Persists a snapshot. Returns the inserted row.
--    Requires caller is admin or treasurer (defense in depth — RLS also
--    enforces this).
-- =====================================================================
create or replace function public.create_financial_record_summary(
  p_title text,
  p_period_start date,
  p_period_end date,
  p_include_donations boolean default true,
  p_include_expenses boolean default true,
  p_include_fines_paid boolean default true,
  p_include_fines_unpaid boolean default true,
  p_include_fines_waived boolean default false,
  p_publish boolean default true,
  p_notes text default null
) returns public.financial_record_summaries
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid;
  caller_role text;
  preview jsonb;
  row public.financial_record_summaries;
begin
  caller_id := auth.uid();
  if caller_id is null then
    raise exception 'Not authenticated';
  end if;

  select role into caller_role from public.profiles where id = caller_id;
  if caller_role is null or caller_role not in ('admin','treasurer') then
    raise exception 'Only admin or treasurer can create financial records';
  end if;

  if length(coalesce(p_title, '')) < 3 then
    raise exception 'Title must be at least 3 characters';
  end if;

  if p_period_end < p_period_start then
    raise exception 'period_end must be on or after period_start';
  end if;

  -- Get a fresh preview (numbers are snapshotted — won't change later)
  preview := public.preview_financial_summary(
    p_period_start, p_period_end,
    p_include_donations, p_include_expenses,
    p_include_fines_paid, p_include_fines_unpaid, p_include_fines_waived
  );

  insert into public.financial_record_summaries (
    title, period_start, period_end,
    total_donations, donation_count,
    total_expenses, expense_count,
    total_fines_paid, fines_paid_count,
    total_fines_unpaid, fines_unpaid_count,
    total_fines_waived, fines_waived_count,
    total_income, net_position,
    lines, included_categories,
    notes,
    status, created_by, published_by, published_at
  ) values (
    p_title, p_period_start, p_period_end,
    (preview->>'total_donations')::numeric,
    (preview->>'donation_count')::int,
    (preview->>'total_expenses')::numeric,
    (preview->>'expense_count')::int,
    (preview->>'total_fines_paid')::numeric,
    (preview->>'fines_paid_count')::int,
    (preview->>'total_fines_unpaid')::numeric,
    (preview->>'fines_unpaid_count')::int,
    (preview->>'total_fines_waived')::numeric,
    (preview->>'fines_waived_count')::int,
    (preview->>'total_income')::numeric,
    (preview->>'net_position')::numeric,
    preview->'lines',
    array(select jsonb_array_elements_text(preview->'included_categories')),
    p_notes,
    case when p_publish then 'published' else 'draft' end,
    caller_id,
    case when p_publish then caller_id else null end,
    case when p_publish then now() else null end
  )
  returning * into row;

  return row;
end; $$;

grant execute on function public.create_financial_record_summary(
  text, date, date, boolean, boolean, boolean, boolean, boolean, boolean, text
) to authenticated;


-- =====================================================================
-- 4. RPC: list_financial_record_summaries
--    Authenticated: returns ALL records (so treasurer can see drafts).
--    Anon would only see published (handled by RLS — anon SELECT policy
--    filters to status='published').
-- =====================================================================
create or replace function public.list_financial_record_summaries(
  p_include_drafts boolean default false
) returns setof public.financial_record_summaries
language sql
stable
security invoker
set search_path = public
as $$
  select * from public.financial_record_summaries
   where (p_include_drafts or status = 'published')
   order by period_start desc, created_at desc;
$$;

grant execute on function public.list_financial_record_summaries(boolean) to anon, authenticated;


-- =====================================================================
-- 5. RPC: get_financial_record_summary
--    Single record by id. Public-readable only if status='published'.
-- =====================================================================
create or replace function public.get_financial_record_summary(p_id uuid)
returns public.financial_record_summaries
language sql
stable
security invoker
set search_path = public
as $$
  select * from public.financial_record_summaries where id = p_id;
$$;

grant execute on function public.get_financial_record_summary(uuid) to anon, authenticated;


-- =====================================================================
-- HOW TO USE
-- =====================================================================
-- 1. Run this file in the Supabase SQL Editor (after v10.sql).
-- 2. The Treasurer goes to /treasurer-portal → "Records" tab.
-- 3. They pick which categories to include (checkboxes),
--    pick a date range, type a title, and click "Preview".
-- 4. The preview calls preview_financial_summary() and renders the
--    totals + per-category breakdown live.
-- 5. They click "Create record" → a confirmation dialog shows the
--    EXACT preview → they click "Confirm and publish".
-- 6. create_financial_record_summary() persists the snapshot and
--    sets status='published'.
-- 7. The new record appears on the public /finance page under
--    "Published financial records" (newest first), each linked to
--    /finance/:id for the dedicated detail view.