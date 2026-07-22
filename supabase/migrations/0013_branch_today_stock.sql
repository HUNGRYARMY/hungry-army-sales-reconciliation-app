-- Gap found during Phase B testing: branch staff had no way to see their starting stock during the day.
-- carryover_in is only ever written into daily_product_ledger by the end-of-day closeout trigger (0007),
-- so "today" simply has no ledger row until the branch closes out — carryover and today's shipments were
-- effectively invisible while staff were actually selling. This function computes the same figures live,
-- without needing a ledger row to exist yet.
--
-- Deliberately NOT security definer: it should return only what the caller's own RLS already lets them see
-- (branch_staff scoped to their own branch via the existing SELECT policies on daily_product_ledger/
-- deliveries/sale_tally) — a branch_staff passing another branch's id just gets zeroed-out rows, not an error.

create function public.branch_today_stock(p_branch_id uuid)
returns table (
  product_id uuid,
  flavor_name text,
  size public.product_size,
  carryover_in integer,
  shipped_in integer,
  available integer,
  sold_today integer,
  remaining_estimate integer
)
language sql
stable
as $$
  select
    p.id,
    p.flavor_name,
    p.size,
    coalesce(co.carryover_out, 0)::integer as carryover_in,
    coalesce(sh.qty, 0)::integer as shipped_in,
    (coalesce(co.carryover_out, 0) + coalesce(sh.qty, 0))::integer as available,
    coalesce(sd.qty, 0)::integer as sold_today,
    (coalesce(co.carryover_out, 0) + coalesce(sh.qty, 0) - coalesce(sd.qty, 0))::integer as remaining_estimate
  from public.products p
  left join lateral (
    select l.carryover_out
    from public.daily_product_ledger l
    where l.branch_id = p_branch_id
      and l.product_id = p.id
      and l.date < (now() at time zone 'Asia/Manila')::date
    order by l.date desc
    limit 1
  ) co on true
  left join (
    select product_id, sum(qty) as qty
    from public.deliveries
    where branch_id = p_branch_id and date = (now() at time zone 'Asia/Manila')::date
    group by product_id
  ) sh on sh.product_id = p.id
  left join (
    select product_id, sum(qty_sold) as qty
    from public.sale_tally
    where branch_id = p_branch_id
      and date = (now() at time zone 'Asia/Manila')::date
      and is_void = false
    group by product_id
  ) sd on sd.product_id = p.id
  where p.status = 'active'
  order by p.flavor_name, p.size
$$;
