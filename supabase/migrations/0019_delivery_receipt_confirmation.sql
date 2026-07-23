-- Branch staff had no way to confirm what they actually received vs. what commissary logged as shipped —
-- a shortage in transit (or a commissary miscount) silently became "unexplained shrinkage" at end-of-day,
-- misattributed to the branch. Adds a receipt-confirmation step: branch staff records qty_received,
-- a separate column from commissary's own `qty` (which stays untouched as the "sent" figure — branch
-- staff never edits it, only adds their own count alongside it). Downstream stock/ledger math is switched
-- to read qty_received instead of qty, so a shortage in transit shows up immediately as a delivery
-- discrepancy rather than surfacing later as branch-level shrinkage.
--
-- Deliberate scope cut: if a delivery is never confirmed, it contributes 0 to shipped_in/stock — this is
-- intentional, not an oversight. It surfaces as an unexplained-variance breach at end-of-day closeout
-- (the existing shrinkage-threshold gate from 0007), which is the same "never silently absorb a
-- discrepancy" pattern already used elsewhere in this app, rather than adding a second blocking gate.

alter table public.deliveries add column qty_received integer;
alter table public.deliveries add column received_by uuid references public.profiles(id);
alter table public.deliveries add column received_at timestamptz;
alter table public.deliveries add column receipt_discrepancy_reason text;

alter table public.deliveries add constraint deliveries_qty_received_nonnegative
  check (qty_received is null or qty_received >= 0);
alter table public.deliveries add constraint deliveries_receipt_reason_required_if_mismatch
  check (qty_received is null or qty_received = qty or receipt_discrepancy_reason is not null);

-- Narrow SECURITY DEFINER function, matching the void_sale_tally/void_bundle_sale pattern (0012): branch
-- staff get no general UPDATE policy on deliveries (which would let a raw client edit commissary's `qty`,
-- the exact field this feature exists to protect) — this function can only ever touch the four receipt
-- columns, authorizes internally, and every call writes an entry_audit_log row.
create function public.confirm_delivery_receipt(p_delivery_id uuid, p_qty_received integer, p_discrepancy_reason text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.deliveries;
  v_role public.user_role;
  v_old_qty_received integer;
begin
  v_role := public.current_user_role();

  select * into v_row from public.deliveries where id = p_delivery_id;
  if v_row.id is null then
    raise exception 'delivery % not found', p_delivery_id;
  end if;
  if p_qty_received is null or p_qty_received < 0 then
    raise exception 'enter the quantity actually received';
  end if;
  if p_qty_received <> v_row.qty and (p_discrepancy_reason is null or btrim(p_discrepancy_reason) = '') then
    raise exception 'a reason is required when the received quantity does not match what was logged';
  end if;

  if v_role in ('founder_admin', 'supervisor') then
    null; -- allowed anytime, any branch (e.g. correcting a stale/mistaken confirmation)
  elsif v_role = 'branch_staff' then
    if v_row.branch_id <> public.current_user_branch_id() then
      raise exception 'cannot confirm another branch''s delivery';
    end if;
    if v_row.date <> (now() at time zone 'Asia/Manila')::date then
      raise exception 'can only confirm same-day deliveries — ask a founder/admin to correct an older one';
    end if;
    if exists (
      select 1 from public.daily_product_ledger
      where branch_id = v_row.branch_id and product_id = v_row.product_id and date = v_row.date
    ) then
      raise exception 'this item''s end-of-day disposition is already closed for today — ask a founder/admin to correct it';
    end if;
  else
    raise exception 'not authorized to confirm deliveries';
  end if;

  v_old_qty_received := v_row.qty_received;

  update public.deliveries
  set qty_received = p_qty_received,
      received_by = auth.uid(),
      received_at = now(),
      receipt_discrepancy_reason = case when p_qty_received = v_row.qty then null else btrim(p_discrepancy_reason) end
  where id = p_delivery_id;

  insert into public.entry_audit_log (entry_table, entry_id, field_changed, old_value, new_value, reason, changed_by)
  values (
    'deliveries', p_delivery_id, 'qty_received',
    coalesce(v_old_qty_received::text, 'unconfirmed'), p_qty_received::text,
    coalesce(btrim(p_discrepancy_reason), 'matches logged quantity'), auth.uid()
  );
end;
$$;

-- Switch shipped_in from commissary's logged qty to the branch's confirmed qty_received (sum ignores the
-- nulls left by unconfirmed deliveries, same as before).
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
    select product_id, sum(qty_received) as qty
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

-- Same switch in the actual ledger closeout trigger (the source of truth once a day closes, not just the
-- live preview above).
create or replace function public.close_out_ledger()
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

  select coalesce(sum(qty_received), 0) into v_shipped_in
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

-- Every delivery logged before this feature existed predates any concept of confirmation — treat them all
-- as confirmed-as-logged so today's/historical stock and ledger figures don't suddenly drop to 0 the
-- moment this migration lands. Only deliveries logged after this point require an actual staff confirmation.
update public.deliveries set qty_received = qty, received_at = coalesce(received_at, now()) where qty_received is null;
