-- branch_today_stock (0013) ordered by flavor_name then size, which interleaves regular/junior rows of
-- different flavors instead of grouping all regular products above all junior ones. Reorder by size first
-- (product_size enum is declared 'regular' before 'junior', so this sorts regular-then-junior), then the
-- same manual sort_order/flavor_name ordering Admin's Products screen already uses within each size group.
create or replace function public.branch_today_stock(p_branch_id uuid)
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
  order by p.size, p.sort_order nulls last, p.flavor_name
$$;
