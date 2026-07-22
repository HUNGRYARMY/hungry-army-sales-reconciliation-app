-- Bug found during verification: for discount_type='other' submitted without manual_discount_rate,
-- stamp_sale_tally() set discount_rate_applied := new.manual_discount_rate (i.e. NULL), which then failed
-- the column's own NOT NULL constraint before the deliberately-named other_requires_manual_entry CHECK
-- constraint (0005) ever got evaluated — so callers saw a generic "null value in column ... violates
-- not-null constraint" instead of a clear, actionable error. Same class of imprecision for discount_type=
-- 'promo' with a null promo_id (it did correctly reject, just with a slightly indirect "Promo <NULL> not
-- found" message). Validate explicitly in the trigger, which always runs first, so the error is clear
-- regardless of constraint evaluation order. The CHECK constraints in 0005 stay in place as a safety net.

create or replace function public.stamp_sale_tally()
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
    if new.promo_id is null then
      raise exception 'discount_type=promo requires promo_id';
    end if;
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
    if new.manual_discount_rate is null or new.discount_reason is null then
      raise exception 'discount_type=other requires both manual_discount_rate and discount_reason';
    end if;
    new.discount_rate_applied := new.manual_discount_rate;
    new.needs_review := true;
  end if;

  return new;
end;
$$;
