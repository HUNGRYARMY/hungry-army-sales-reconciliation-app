-- Manual display ordering for branches, same pattern as products.sort_order (0015).
alter table public.branches add column sort_order integer;
