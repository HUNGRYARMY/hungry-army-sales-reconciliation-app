-- Phase D: reporting. A single function backs both the day report (p_start = p_end) and the month report
-- (p_start/p_end spanning a calendar month) — on-screen table and CSV export both read from this exact
-- same call, so they can never disagree with each other the way three separate hand-rolled aggregations
-- might. Each figure is its own scalar subquery (not a join) specifically to avoid fan-out: joining
-- sale_tally/bundle_sale/daily_cash_entry/daily_product_ledger together on branch_id alone, without also
-- matching on date, would multiply rows across every date combination and wildly overcount every sum.
--
-- Deliberately not SECURITY DEFINER — the caller's own RLS applies, same as every other dashboard query.
-- Only founder_admin/supervisor have full SELECT access on the underlying tables (0008), which is exactly
-- who this report is for.
create function public.branch_period_summary(p_start date, p_end date, p_branch_id uuid default null)
returns table (
  branch_id uuid,
  gross_sales_revenue numeric,
  cash_counted numeric,
  digital_payments numeric,
  reported_total numeric,
  computed_gross_sales numeric,
  cash_variance numeric,
  cash_days_submitted integer,
  period_days integer,
  shrinkage_units numeric,
  shrinkage_flagged_count integer,
  shrinkage_explained_count integer
)
language sql
stable
as $$
  select
    b.id as branch_id,
    coalesce(
      (select sum(st.line_revenue) from public.sale_tally st
       where st.branch_id = b.id and st.is_void = false and st.date between p_start and p_end), 0
    ) + coalesce(
      (select sum(bs.line_revenue) from public.bundle_sale bs
       where bs.branch_id = b.id and bs.is_void = false and bs.date between p_start and p_end), 0
    ) as gross_sales_revenue,
    coalesce(
      (select sum(ce.cash_counted) from public.daily_cash_entry ce
       where ce.branch_id = b.id and ce.date between p_start and p_end), 0
    ) as cash_counted,
    coalesce(
      (select sum(ce.digital_payments) from public.daily_cash_entry ce
       where ce.branch_id = b.id and ce.date between p_start and p_end), 0
    ) as digital_payments,
    coalesce(
      (select sum(ce.reported_total) from public.daily_cash_entry ce
       where ce.branch_id = b.id and ce.date between p_start and p_end), 0
    ) as reported_total,
    coalesce(
      (select sum(ce.computed_gross_sales) from public.daily_cash_entry ce
       where ce.branch_id = b.id and ce.date between p_start and p_end), 0
    ) as computed_gross_sales,
    coalesce(
      (select sum(ce.variance_vs_cash) from public.daily_cash_entry ce
       where ce.branch_id = b.id and ce.date between p_start and p_end), 0
    ) as cash_variance,
    (
      select count(*)::integer from public.daily_cash_entry ce
      where ce.branch_id = b.id and ce.date between p_start and p_end
    ) as cash_days_submitted,
    (p_end - p_start + 1)::integer as period_days,
    coalesce(
      (select sum(l.unexplained_variance) from public.daily_product_ledger l
       where l.branch_id = b.id and l.date between p_start and p_end), 0
    ) as shrinkage_units,
    (
      select count(*)::integer from public.daily_product_ledger l
      where l.branch_id = b.id and l.date between p_start and p_end and l.unexplained_variance <> 0
    ) as shrinkage_flagged_count,
    (
      select count(*)::integer from public.daily_product_ledger l
      where l.branch_id = b.id and l.date between p_start and p_end
        and l.unexplained_variance <> 0 and l.explanation is not null
    ) as shrinkage_explained_count
  from public.branches b
  where p_branch_id is null or b.id = p_branch_id
  order by b.sort_order nulls last, b.name
$$;
