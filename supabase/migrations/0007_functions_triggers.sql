-- Helper functions backing RLS. SECURITY DEFINER so they bypass RLS on profiles when reading it internally —
-- without this, a policy on profiles that calls current_user_role() would recurse into profiles' own RLS.
create function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

create function public.current_user_branch_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select branch_id from public.profiles where id = auth.uid()
$$;

-- Per-branch override if one exists, else the global default (branch_id is null), else null (no threshold
-- configured => never blocks). cash_variance and shrinkage are looked up independently by callers.
create function public.get_variance_threshold(p_branch_id uuid, p_metric public.threshold_metric)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select threshold_value from public.variance_thresholds where branch_id = p_branch_id and metric = p_metric),
    (select threshold_value from public.variance_thresholds where branch_id is null and metric = p_metric)
  )
$$;

-- Stamps unit_price/discount_rate_applied server-side so price/discount are never client-trusted; the client
-- only ever sends product_id + discount_type (+ promo_id or manual rate/reason) + qty.
create function public.stamp_sale_tally()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_price numeric(10,2);
  v_rate numeric(5,4);
  v_promo_active boolean;
begin
  v_price := public.get_price_on_date(new.product_id, new.date);
  if v_price is null then
    raise exception 'No price found for product % effective on or before %', new.product_id, new.date;
  end if;
  new.unit_price := v_price;

  if new.discount_type = 'none' then
    new.discount_rate_applied := 0;

  elsif new.discount_type in ('senior', 'pwd') then
    select rate into v_rate from public.discount_settings where discount_type = new.discount_type;
    new.discount_rate_applied := coalesce(v_rate, 0);

  elsif new.discount_type = 'promo' then
    select rate, (status = 'active') into v_rate, v_promo_active
    from public.promos where id = new.promo_id;
    if v_rate is null then
      raise exception 'Promo % not found', new.promo_id;
    end if;
    if not v_promo_active then
      raise exception 'Promo % is not active', new.promo_id;
    end if;
    new.discount_rate_applied := v_rate;

  elsif new.discount_type = 'other' then
    new.discount_rate_applied := new.manual_discount_rate;
    new.needs_review := true;
  end if;

  return new;
end;
$$;

create trigger trg_stamp_sale_tally
before insert on public.sale_tally
for each row execute function public.stamp_sale_tally();

-- Stamps unit_price from bundles.price. Per-flavor "sold" credit for bundle components is computed on demand
-- by trg_close_out_ledger (joining bundle_sale to bundle_components), not written out separately here — this
-- keeps the two reconciliation loops (revenue vs. shrinkage) independent without duplicating bookkeeping.
create function public.stamp_bundle_sale()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_price numeric(10,2);
  v_active boolean;
begin
  select price, (status = 'active') into v_price, v_active
  from public.bundles where id = new.bundle_id;

  if v_price is null then
    raise exception 'Bundle % not found', new.bundle_id;
  end if;
  if not v_active then
    raise exception 'Bundle % is not active', new.bundle_id;
  end if;

  new.unit_price := v_price;
  return new;
end;
$$;

create trigger trg_stamp_bundle_sale
before insert on public.bundle_sale
for each row execute function public.stamp_bundle_sale();

-- The ledger closeout trigger: fires once per branch/product/day (unique constraint on end_of_day_disposition),
-- computes the full carryover_in -> available -> sold/wasted/carryover_out chain, and upserts daily_product_ledger.
-- If unexplained_variance breaches the shrinkage threshold and no explanation was supplied on the disposition
-- row, the whole insert (and therefore the ledger write) is rolled back until staff resubmit with one.
create function public.close_out_ledger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_carryover_in integer;
  v_shipped_in integer;
  v_unit_sold integer;
  v_bundle_sold integer;
  v_sold integer;
  v_variance integer;
  v_threshold numeric;
begin
  select coalesce(carryover_out, 0) into v_carryover_in
  from public.daily_product_ledger
  where branch_id = new.branch_id and product_id = new.product_id and date < new.date
  order by date desc
  limit 1;
  v_carryover_in := coalesce(v_carryover_in, 0);

  select coalesce(sum(qty), 0) into v_shipped_in
  from public.deliveries
  where branch_id = new.branch_id and product_id = new.product_id and date = new.date;

  select coalesce(sum(qty_sold), 0) into v_unit_sold
  from public.sale_tally
  where branch_id = new.branch_id and product_id = new.product_id and date = new.date and is_void = false;

  select coalesce(sum(bs.qty_bundles_sold * bc.qty_per_bundle), 0) into v_bundle_sold
  from public.bundle_sale bs
  join public.bundle_components bc on bc.bundle_id = bs.bundle_id
  where bs.branch_id = new.branch_id and bs.date = new.date
    and bc.product_id = new.product_id and bs.is_void = false;

  v_sold := v_unit_sold + v_bundle_sold;
  v_variance := v_carryover_in + v_shipped_in - v_sold - new.qty_wasted - new.qty_carried_forward;
  v_threshold := public.get_variance_threshold(new.branch_id, 'shrinkage');

  if v_threshold is not null and abs(v_variance) > v_threshold and new.explanation is null then
    raise exception
      'Shrinkage variance % exceeds threshold % for branch % / product % / date % — explanation required',
      v_variance, v_threshold, new.branch_id, new.product_id, new.date;
  end if;

  insert into public.daily_product_ledger (
    date, branch_id, product_id, carryover_in, shipped_in, sold, wasted, carryover_out, explanation, closed_out_at
  ) values (
    new.date, new.branch_id, new.product_id, v_carryover_in, v_shipped_in, v_sold,
    new.qty_wasted, new.qty_carried_forward, new.explanation, now()
  )
  on conflict (branch_id, product_id, date) do update set
    carryover_in = excluded.carryover_in,
    shipped_in = excluded.shipped_in,
    sold = excluded.sold,
    wasted = excluded.wasted,
    carryover_out = excluded.carryover_out,
    explanation = excluded.explanation,
    closed_out_at = excluded.closed_out_at;

  return new;
end;
$$;

create trigger trg_close_out_ledger
after insert on public.end_of_day_disposition
for each row execute function public.close_out_ledger();

-- Computes computed_gross_sales server-side (sum of that day's sale_tally + bundle_sale line_revenue) and
-- enforces the cash_variance threshold the same way close_out_ledger enforces shrinkage.
create function public.stamp_cash_entry()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_gross numeric(12,2);
  v_variance numeric(12,2);
  v_threshold numeric;
begin
  select coalesce(sum(line_revenue), 0) into v_gross
  from (
    select line_revenue from public.sale_tally
    where branch_id = new.branch_id and date = new.date and is_void = false
    union all
    select line_revenue from public.bundle_sale
    where branch_id = new.branch_id and date = new.date and is_void = false
  ) s;

  new.computed_gross_sales := v_gross;
  v_variance := new.cash_counted + new.digital_payments - v_gross;
  v_threshold := public.get_variance_threshold(new.branch_id, 'cash_variance');

  if v_threshold is not null and abs(v_variance) > v_threshold and new.explanation is null then
    raise exception
      'Cash variance % exceeds threshold % for branch % / date % — explanation required',
      v_variance, v_threshold, new.branch_id, new.date;
  end if;

  return new;
end;
$$;

create trigger trg_stamp_cash_entry
before insert on public.daily_cash_entry
for each row execute function public.stamp_cash_entry();
