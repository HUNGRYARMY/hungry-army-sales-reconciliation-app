-- entry_table disambiguates entry_id across deliveries/sale_tally/bundle_sale/end_of_day_disposition/
-- daily_cash_entry/daily_product_ledger — deliberate addition beyond the spec's literal field list.
create table public.entry_audit_log (
  id uuid primary key default gen_random_uuid(),
  entry_table text not null,
  entry_id uuid not null,
  field_changed text not null,
  old_value text,
  new_value text,
  reason text,
  changed_by uuid not null references public.profiles(id),
  "timestamp" timestamptz not null default now()
);
create index idx_audit_entry on public.entry_audit_log(entry_table, entry_id);

create table public.spot_audit (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  branch_id uuid not null references public.branches(id),
  counted_amount numeric(12,2) not null,
  compared_to_submitted numeric(12,2),
  variance numeric(12,2) generated always as (counted_amount - compared_to_submitted) stored,
  notes text,
  performed_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);
create index idx_spot_audit_branch_date on public.spot_audit(branch_id, date);

-- cash_variance and shrinkage are independent checks — different fraud signals (pesos vs. units), each
-- with its own threshold value. branch_id null = global default; a per-branch row overrides it.
create table public.variance_thresholds (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid references public.branches(id),
  metric public.threshold_metric not null,
  threshold_value numeric(12,4) not null,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);
-- plain unique(branch_id, metric) wouldn't work: standard SQL treats NULL branch_id values as distinct from
-- each other, so it would silently allow multiple "global default" rows per metric. Partial indexes instead.
create unique index idx_thresholds_per_branch on public.variance_thresholds(branch_id, metric) where branch_id is not null;
create unique index idx_thresholds_global on public.variance_thresholds(metric) where branch_id is null;
