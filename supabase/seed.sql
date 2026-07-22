-- Every value below marked PLACEHOLDER needs the real business number before this seed is used against a
-- live deploy. Re-run is safe locally (`supabase db reset` truncates and reseeds); for a hosted project this
-- file is applied once by hand and then products/prices/branches are managed going forward via the founder
-- dashboard (Phase C) or Supabase Studio.

-- Branches — names are the shorthand confirmed with the user; closing_time is reference metadata only.
insert into public.branches (name, closing_time, is_active) values
  ('Branch 1', '19:00', true),
  ('Branch 2', '20:00', true),
  ('Branch 3', '21:00', false);  -- opening soon — flip is_active to true once it's actually taking sales

-- Products — PLACEHOLDER flavor names. 6 flavors x 2 sizes = 12 SKUs.
with flavors(flavor_name) as (
  values ('Flavor 1'), ('Flavor 2'), ('Flavor 3'), ('Flavor 4'), ('Flavor 5'), ('Flavor 6')
)
insert into public.products (flavor_name, size)
select flavor_name, size::public.product_size
from flavors, unnest(array['regular', 'junior']) as size;

-- Prices — PLACEHOLDER amounts, effective from a safely-past date so any realistic test/sale date resolves.
insert into public.price_history (product_id, price, effective_date)
select id, case size when 'regular' then 25.00 else 15.00 end, date '2020-01-01'
from public.products;

-- Discounts — 20% is the PH statutory senior/PWD rate; confirm before relying on it in production.
insert into public.discount_settings (discount_type, rate, description) values
  ('none', 0, 'No discount'),
  ('senior', 0.20, 'Senior citizen statutory discount'),
  ('pwd', 0.20, 'PWD statutory discount');
-- 'promo' and 'other' are not seeded here: 'promo' rates come from the promos table (add real promos via the
-- founder dashboard as they're introduced), 'other' is a per-transaction manual entry with no fixed rate.

-- Variance thresholds — PLACEHOLDER global defaults, independent per metric (pesos for cash, units for
-- shrinkage). Adjust via the founder dashboard once real tolerance levels are known; per-branch overrides
-- can be added the same way without any schema change.
insert into public.variance_thresholds (branch_id, metric, threshold_value) values
  (null, 'cash_variance', 200.00),
  (null, 'shrinkage', 5);
