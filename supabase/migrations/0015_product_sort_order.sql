-- Manual display ordering for the admin product list, requested by the user: active regular flavors grouped
-- together, active junior flavors grouped together, discontinued at the bottom, with manual reordering
-- within each active group. Sort order is scoped per group (regular/junior) by the application logic, not
-- enforced in SQL — nothing here prevents storing any integer, the grouping itself is what makes moving a
-- regular flavor into the junior list a non-action (the UI never offers that drag/move target).
alter table public.products add column sort_order integer;
