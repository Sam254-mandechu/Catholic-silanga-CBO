-- =====================================================================
-- Catholic Silanga CBO — Schema additions v2
-- Run this in the Supabase SQL Editor after schema.sql
-- Adds: member registration fields, hierarchy, tasks, payment methods,
-- expanded donations (verified by admin), and announcements policies.
-- =====================================================================

-- ---------- Extend profiles with registration / hierarchy fields -----
alter table public.profiles
  add column if not exists national_id    text,
  add column if not exists member_code    text unique,
  add column if not exists hierarchy_role text
    check (hierarchy_role is null or hierarchy_role in
      ('Chairperson','Vice Chairperson','Secretary','Vice Secretary',
       'Treasurer','Vice Treasurer','Coordinator','Member')),
  add column if not exists verified_at    timestamptz;

create index if not exists profiles_verified_idx
  on public.profiles (status, hierarchy_role);

-- ---------- TASKS (assigned to members by admin) ----------
create table if not exists public.tasks (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text not null,
  assignee_id uuid not null references public.profiles (id) on delete cascade,
  assignee_name text not null,        -- denormalized for simpler reads
  status text not null default 'pending'
    check (status in ('pending','in_progress','completed','cancelled')),
  priority text not null default 'medium'
    check (priority in ('low','medium','high')),
  due_date date,
  assigned_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists tasks_assignee_idx on public.tasks (assignee_id, status);
create index if not exists tasks_priority_idx on public.tasks (priority, due_date);

drop trigger if exists trg_tasks_updated on public.tasks;
create trigger trg_tasks_updated
  before update on public.tasks
  for each row execute function public.set_updated_at();

alter table public.tasks enable row level security;

drop policy if exists "Tasks visible to assignee or admin" on public.tasks;
create policy "Tasks visible to assignee or admin"
  on public.tasks for select to authenticated
  using (assignee_id = auth.uid() or public.is_admin());

drop policy if exists "Members update their own task status" on public.tasks;
create policy "Members update their own task status"
  on public.tasks for update to authenticated
  using (assignee_id = auth.uid() or public.is_admin())
  with check (assignee_id = auth.uid() or public.is_admin());

drop policy if exists "Tasks admin-write" on public.tasks;
create policy "Tasks admin-write"
  on public.tasks for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------- PAYMENT METHODS (admin sets, everyone reads) ----------
create table if not exists public.payment_methods (
  id uuid primary key default uuid_generate_v4(),
  method text not null check (method in ('bank','mpesa','paybill','till','mobile_money','card','cash','other')),
  label text not null,                -- e.g. "Equity Bank Account"
  details jsonb not null,             -- free-form: account_no, bank_name, paybill_no, etc.
  instructions text,                  -- plain-English instructions for payers
  is_active boolean not null default true,
  display_order int not null default 0,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists pay_methods_active_idx on public.payment_methods (is_active, display_order);

drop trigger if exists trg_pay_methods_updated on public.payment_methods;
create trigger trg_pay_methods_updated
  before update on public.payment_methods
  for each row execute function public.set_updated_at();

alter table public.payment_methods enable row level security;

drop policy if exists "Payment methods publicly readable" on public.payment_methods;
create policy "Payment methods publicly readable"
  on public.payment_methods for select using (is_active = true or public.is_admin());

drop policy if exists "Payment methods admin-write" on public.payment_methods;
create policy "Payment methods admin-write"
  on public.payment_methods for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------- DONATIONS: extend for verification + receipt proof ------
alter table public.donations
  add column if not exists member_id uuid references public.profiles (id) on delete set null,
  add column if not exists method_id  uuid references public.payment_methods (id) on delete set null,
  add column if not exists reference_code text,           -- MPESA / bank reference number
  add column if not exists proof_url text,                -- URL of uploaded screenshot
  add column if not exists verified_by uuid references public.profiles (id) on delete set null,
  add column if not exists verified_at timestamptz,
  add column if not exists admin_note text;

create index if not exists donations_member_idx on public.donations (member_id);
create index if not exists donations_status_created_idx on public.donations (status, created_at desc);

-- Allow logged-in members to submit donations tied to themselves, too
drop policy if exists "Authenticated members can submit a donation" on public.donations;
create policy "Authenticated members can submit a donation"
  on public.donations for insert to authenticated with check (true);

-- Visible contributions page should read donations where status='completed'
-- (already covered by existing read policy when donor_id = auth.uid() or admin)

-- ---------- ANNOUNCEMENTS: tweak so authenticated users see only public ones -----
drop policy if exists "Announcements publicly readable" on public.announcements;
create policy "Announcements publicly readable"
  on public.announcements for select
  using (
    expires_at is null or expires_at > now()
  );

-- Admin can create regardless of date
drop policy if exists "Announcements admin-write" on public.announcements;
create policy "Announcements admin-write"
  on public.announcements for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- =====================================================================
-- End of schema v2.
-- =====================================================================
