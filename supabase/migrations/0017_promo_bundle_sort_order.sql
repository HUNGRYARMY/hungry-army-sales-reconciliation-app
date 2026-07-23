-- Manual display ordering for promos and bundles, same pattern as products.sort_order (0015) and
-- branches.sort_order (0016) — active items reorderable, discontinued stays alphabetical.
alter table public.promos add column sort_order integer;
alter table public.bundles add column sort_order integer;
