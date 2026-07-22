create table public.products (
  id uuid primary key default gen_random_uuid(),
  flavor_name text not null,
  size public.product_size not null,
  status public.catalog_status not null default 'active',
  created_at timestamptz not null default now(),
  unique (flavor_name, size)
);
-- junior is just a normal, independent products row (own id / price history / ledger) — no special-casing needed
-- never hard-delete: discontinuing a flavor sets status='discontinued', historical records stay intact

create table public.price_history (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id),
  price numeric(10,2) not null check (price >= 0),
  effective_date date not null,
  created_at timestamptz not null default now(),
  unique (product_id, effective_date)
);
create index idx_price_history_lookup on public.price_history(product_id, effective_date desc);

-- "price in effect on date D" — used everywhere revenue is computed so a future price change
-- never retroactively changes past reconciliation numbers
create function public.get_price_on_date(p_product_id uuid, p_as_of date)
returns numeric
language sql
stable
as $$
  select price from public.price_history
  where product_id = p_product_id and effective_date <= p_as_of
  order by effective_date desc
  limit 1
$$;

-- senior/pwd only now — promo_x replaced by the promos table below, "other" is a manual per-transaction entry
create table public.discount_settings (
  discount_type public.discount_type primary key,
  rate numeric(5,4) not null default 0 check (rate between 0 and 1),
  description text,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);

-- configurable, named promos (mirrors the bundles pattern below) — replaces the fixed promo_x discount type
create table public.promos (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  rate numeric(5,4) not null check (rate between 0 and 1),
  status public.catalog_status not null default 'active',
  created_at timestamptz not null default now()
);

create table public.bundles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price numeric(10,2) not null check (price >= 0),
  status public.catalog_status not null default 'active',
  created_at timestamptz not null default now()
);

create table public.bundle_components (
  id uuid primary key default gen_random_uuid(),
  bundle_id uuid not null references public.bundles(id) on delete cascade,
  product_id uuid not null references public.products(id),
  qty_per_bundle integer not null check (qty_per_bundle > 0),
  unique (bundle_id, product_id)
);
