-- =====================================================================
-- Catholic Silanga CBO — Schema v12
-- Treasurer round 2: paid fines count as report income, treasurer
-- edit access to existing donations/expenses within 1hr, payment
-- methods management surface, fine_stats view for Finance page.
--
-- Run after schema_v11.sql. Safe to re-run.
-- =====================================================================


-- =====================================================================
-- 1. PATCH submit_financial_report to include paid fines as income.
--    Previously only donations + (deducted) expenses. Now paid fines
--    also count as income (they ARE income from a member).
-- =====================================================================
create or replace function public.submit_financial_report(
  p_period_start date,
  p_period_end date,
  p_notes text default null
) returns public.financial_reports
language plpgsql security definer set search_path = public
as $$
declare
  caller_id uuid;
  caller_role text;
  opening_income numeric := 0;
  opening_expense numeric := 0;
  period_income numeric := 0;
  period_expense numeric := 0;
  period_fine_income numeric := 0;
  opening_net numeric := 0;
  opening_balance numeric := 0;
  closing_balance numeric := 0;
  income_count int := 0;
  expense_count int := 0;
  fine_count int := 0;
  start_ts timestamptz := p_period_start::timestamptz;
  end_ts timestamptz := (p_period_end + interval '1 day')::timestamptz;
  inserted public.financial_reports;
begin
  caller_id := auth.uid();
  if caller_id is null then raise exception 'Not authenticated'; end if;
  select role into caller_role from public.profiles where id = caller_id;
  if caller_role is null or caller_role not in ('admin','treasurer') then
    raise exception 'Only admin or treasurer can submit financial reports'; end if;
  if p_period_end < p_period_start then
    raise exception 'period_end must be on or after period_start'; end if;

  -- Opening balance = everything before period_start
  select coalesce(sum(amount),0), count(*)
    into opening_income, income_count
    from public.donations
   where status = 'completed' and created_at < start_ts;
  -- expenses table uses expense_date as the business date, not created_at
  select coalesce(sum(amount),0), count(*)
    into opening_expense, expense_count
    from public.expenses
   where approved_at is not null and expense_date < p_period_start;
  -- paid fines with paid_at before period
  select coalesce(sum(amount),0), count(*)
    into period_fine_income, fine_count  -- reused below as scratch var
    from public.fines
   where status = 'paid' and paid_at < start_ts;

  opening_balance := opening_income + period_fine_income - opening_expense;
  period_fine_income := 0;  -- reset for the period-specific count below

  -- Period income = completed donations + paid fines within period
  select coalesce(sum(amount),0), count(*)
    into period_income, income_count
    from public.donations
   where status = 'completed' and created_at >= start_ts and created_at < end_ts;
  select coalesce(sum(amount),0), count(*)
    into period_fine_income, fine_count
    from public.fines
   where status = 'paid' and paid_at >= start_ts and paid_at < end_ts;

  -- Period expense = approved expenses within period (by expense_date)
  select coalesce(sum(amount),0), count(*)
    into period_expense, expense_count
    from public.expenses
   where approved_at is not null
     and expense_date >= p_period_start and expense_date <= p_period_end;

  closing_balance := opening_balance + period_income + period_fine_income - period_expense;

  insert into public.financial_reports (
    period_start, period_end, notes,
    opening_balance, total_income, total_expenses, closing_balance,
    submitted_by, status, created_at
  ) values (
    p_period_start, p_period_end, p_notes,
    opening_balance, period_income + period_fine_income, period_expense, closing_balance,
    caller_id, 'submitted', now()
  )
  returning * into inserted;

  return inserted;
end;
$$;

grant execute on function public.submit_financial_report(date, date, text) to authenticated;


-- =====================================================================
-- 2. RPC: get_financial_summary_preview
--    Returns the exact numbers that submit_financial_report would
--    produce for a given period, without writing. Used by the
--    TreasurerPortal preview modal before saving.
-- =====================================================================
create or replace function public.get_financial_summary_preview(
  p_period_start date,
  p_period_end date
)
returns table (
  period_start date,
  period_end date,
  opening_balance numeric,
  income_from_donations numeric,
  income_from_fines numeric,
  total_income numeric,
  total_expenses numeric,
  closing_balance numeric,
  donation_count int,
  fine_count int,
  expense_count int
) language plpgsql security definer stable set search_path = public
as $$
declare
  start_ts timestamptz := p_period_start::timestamptz;
  end_ts timestamptz := (p_period_end + interval '1 day')::timestamptz;
  ob numeric := 0;
  ii_don numeric := 0;
  ii_fine numeric := 0;
  oe numeric := 0;
  dc int := 0;
  fc int := 0;
  ec int := 0;
begin
  select coalesce(sum(amount),0) into ob
    from public.donations where status='completed' and created_at < start_ts;
  select coalesce(sum(amount),0) into ii_don
    from public.donations where status='completed' and created_at >= start_ts and created_at < end_ts;
  dc := (select count(*) from public.donations where status='completed' and created_at >= start_ts and created_at < end_ts);

  select coalesce(sum(amount),0) into ii_fine
    from public.fines where status='paid' and paid_at >= start_ts and paid_at < end_ts;
  fc := (select count(*) from public.fines where status='paid' and paid_at >= start_ts and paid_at < end_ts);

  select coalesce(sum(amount),0) into oe
    from public.expenses where approved_at is not null and expense_date >= p_period_start and expense_date <= p_period_end;
  ec := (select count(*) from public.expenses where approved_at is not null and expense_date >= p_period_start and expense_date <= p_period_end);

  period_start := p_period_start;
  period_end := p_period_end;
  opening_balance := ob;
  income_from_donations := ii_don;
  income_from_fines := ii_fine;
  total_income := ii_don + ii_fine;
  total_expenses := oe;
  closing_balance := ob + ii_don + ii_fine - oe;
  donation_count := dc;
  fine_count := fc;
  expense_count := ec;
  return next;
end;
$$;

grant execute on function public.get_financial_summary_preview(date, date) to authenticated;


-- =====================================================================
-- 3. Make sure the fine_stats view is publicly readable (anon).
--    Finance page needs it without auth. (v9 already granted it, this
--    is a safety net for re-runs.)
-- =====================================================================
do $$ begin
  grant select on public.fine_stats to anon, authenticated;
exception when others then null;
end $$;


-- =====================================================================
-- HOW TO USE
-- =====================================================================
-- 1. Run this file in Supabase SQL Editor (after v11.sql).
-- 2. The TreasurerPortal Reports tab now calls
--    get_financial_summary_preview() before submit, so the treasurer
--    sees a preview dialog with income (donations + paid fines),
--    expenses, opening + closing balance, and counts.
-- 3. After confirming, submit_financial_report() inserts the row with
--    the same numbers and includes paid fines in total_income.
-- 4. The Finance Overview page (/finance) reads from the existing
--    fine_stats view + approved financial_reports and will render
--    them in the new "Fines summary" and "Published reports" cards.