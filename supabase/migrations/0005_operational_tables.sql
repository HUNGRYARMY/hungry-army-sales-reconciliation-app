create table public.deliveries (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  branch_id uuid not null references public.branches(id),
  product_id uuid not null references public.products(id),
  qty integer not null check (qty > 0),
  delivery_time timestamptz not null default now(),
  entered_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);
create index idx_deliveries_branch_product_date on public.deliveries(branch_id, product_id, date);

-- One row per branch/product/date, written by the end_of_day_disposition closeout trigger (see 0007). Not
-- directly writable by clients — carryover_in/shipped_in/sold/wasted/carryover_out are all trigger-computed.
create table public.daily_product_ledger (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  branch_id uuid not null references public.branches(id),
  product_id uuid not null references public.products(id),
  carryover_in integer not null default 0,
  shipped_in integer not null default 0,
  available integer generated always as (carryover_in + shipped_in) stored,
  sold integer not null default 0,
  wasted integer not null default 0,
  carryover_out integer not null default 0,
  -- references raw columns, not `available` — Postgres generated columns can't reference another generated column
  unexplained_variance integer generated always as
    (carryover_in + shipped_in - sold - wasted - carryover_out) stored,
  explanation text,             -- copied from end_of_day_disposition.explanation when shrinkage threshold is breached
  closed_out_at timestamptz,
  unique (branch_id, product_id, date)
);
create index idx_ledger_branch_date on public.daily_product_ledger(branch_id, date);

-- One-tap entries. unit_price/discount_rate_applied are stamped server-side by a trigger (0007) — the client
-- only ever sends product_id + discount_type (+ promo_id or manual rate/reason) + qty, never a price.
create table public.sale_tally (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  branch_id uuid not null references public.branches(id),
  product_id uuid not null references public.products(id),
  qty_sold integer not null check (qty_sold > 0),
  discount_type public.discount_type not null default 'none',
  promo_id uuid references public.promos(id),             -- required iff discount_type = 'promo'
  manual_discount_rate numeric(5,4),                       -- required iff discount_type = 'other'
  discount_reason text,                                    -- required iff discount_type = 'other'
  needs_review boolean not null default false,             -- auto-true for 'other', surfaced on founder dashboard
  unit_price numeric(10,2) not null default 0,             -- snapshot, trigger-set
  discount_rate_applied numeric(5,4) not null default 0,   -- snapshot, trigger-set
  line_revenue numeric(12,2) generated always as (qty_sold * unit_price * (1 - discount_rate_applied)) stored,
  is_void boolean not null default false,
  void_reason text,
  entered_by uuid not null references public.profiles(id),
  "timestamp" timestamptz not null default now(),
  constraint promo_requires_id check (discount_type <> 'promo' or promo_id is not null),
  constraint other_requires_manual_entry check (
    discount_type <> 'other' or (manual_discount_rate is not null and discount_reason is not null)
  )
);
create index idx_sale_tally_branch_date on public.sale_tally(branch_id, date);
create index idx_sale_tally_branch_product_date on public.sale_tally(branch_id, product_id, date);

create table public.bundle_sale (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  branch_id uuid not null references public.branches(id),
  bundle_id uuid not null references public.bundles(id),
  qty_bundles_sold integer not null check (qty_bundles_sold > 0),
  unit_price numeric(10,2) not null default 0,           -- snapshot of bundles.price, trigger-set
  line_revenue numeric(12,2) generated always as (qty_bundles_sold * unit_price) stored,
  is_void boolean not null default false,
  void_reason text,
  entered_by uuid not null references public.profiles(id),
  "timestamp" timestamptz not null default now()
);
create index idx_bundle_sale_branch_date on public.bundle_sale(branch_id, date);

create table public.end_of_day_disposition (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  branch_id uuid not null references public.branches(id),
  product_id uuid not null references public.products(id),
  qty_wasted integer not null default 0 check (qty_wasted >= 0),
  reason text,
  qty_carried_forward integer not null default 0 check (qty_carried_forward >= 0),
  notes text,
  -- required if this closeout's unexplained_variance breaches the branch's shrinkage threshold; enforced by
  -- the trg_close_out_ledger trigger. Deliberate addition beyond the plan's literal column list: without this
  -- field on the row actually being inserted, staff would have nothing to fill in on a rejected submission.
  explanation text,
  entered_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (branch_id, product_id, date),
  constraint reason_required_if_wasted check (qty_wasted = 0 or reason is not null)
);

create table public.daily_cash_entry (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  branch_id uuid not null references public.branches(id),
  cash_counted numeric(12,2) not null check (cash_counted >= 0),
  digital_payments numeric(12,2) not null default 0 check (digital_payments >= 0),
  reported_total numeric(12,2) generated always as (cash_counted + digital_payments) stored,
  computed_gross_sales numeric(12,2) not null default 0,   -- snapshot, trigger-set from that day's sale_tally + bundle_sale
  variance_vs_cash numeric(12,2) generated always as
    (cash_counted + digital_payments - computed_gross_sales) stored,
  cash_photo_path text,        -- Supabase Storage object path, see 0009
  notes text,
  explanation text,            -- required if variance_vs_cash breaches the branch's cash_variance threshold
  entered_by uuid not null references public.profiles(id),
  "timestamp" timestamptz not null default now(),
  unique (branch_id, date)
);
