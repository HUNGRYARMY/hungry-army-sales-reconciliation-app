-- RLS is enabled on every table below; Postgres denies all access once enabled until a policy grants it.
-- All policies target `authenticated` only (never `anon`) since every real user — branch staff, commissary,
-- founder — signs in via Supabase Auth.

-- branches: readable by everyone signed in (needed for dropdowns/context on the tablet); writes founder-only.
alter table public.branches enable row level security;

create policy branches_select_all on public.branches
for select to authenticated
using (true);

create policy branches_admin_insert on public.branches
for insert to authenticated
with check (public.current_user_role() = 'founder_admin');

create policy branches_admin_update on public.branches
for update to authenticated
using (public.current_user_role() = 'founder_admin')
with check (public.current_user_role() = 'founder_admin');

-- profiles: everyone can see/update their own row; founder/supervisor can see everyone. Self-update is
-- restricted (via the WITH CHECK subqueries) to leave role/branch_id/is_active unchanged — otherwise a
-- branch_staff account could grant itself founder_admin through a plain self-service update.
alter table public.profiles enable row level security;

create policy profiles_select on public.profiles
for select to authenticated
using (id = auth.uid() or public.current_user_role() in ('founder_admin', 'supervisor'));

create policy profiles_update_own on public.profiles
for update to authenticated
using (id = auth.uid())
with check (
  id = auth.uid()
  and role = (select p.role from public.profiles p where p.id = auth.uid())
  and coalesce(branch_id::text, '') = coalesce((select p.branch_id::text from public.profiles p where p.id = auth.uid()), '')
  and is_active = (select p.is_active from public.profiles p where p.id = auth.uid())
);

create policy profiles_update_admin on public.profiles
for update to authenticated
using (public.current_user_role() = 'founder_admin')
with check (public.current_user_role() = 'founder_admin');

-- Catalog tables: readable by everyone signed in, writable by founder_admin only.
alter table public.products enable row level security;
alter table public.price_history enable row level security;
alter table public.discount_settings enable row level security;
alter table public.promos enable row level security;
alter table public.bundles enable row level security;
alter table public.bundle_components enable row level security;

create policy products_select_all on public.products for select to authenticated using (true);
create policy products_admin_insert on public.products for insert to authenticated with check (public.current_user_role() = 'founder_admin');
create policy products_admin_update on public.products for update to authenticated using (public.current_user_role() = 'founder_admin') with check (public.current_user_role() = 'founder_admin');

create policy price_history_select_all on public.price_history for select to authenticated using (true);
create policy price_history_admin_insert on public.price_history for insert to authenticated with check (public.current_user_role() = 'founder_admin');

create policy discount_settings_select_all on public.discount_settings for select to authenticated using (true);
create policy discount_settings_admin_update on public.discount_settings for update to authenticated using (public.current_user_role() = 'founder_admin') with check (public.current_user_role() = 'founder_admin');
create policy discount_settings_admin_insert on public.discount_settings for insert to authenticated with check (public.current_user_role() = 'founder_admin');

create policy promos_select_all on public.promos for select to authenticated using (true);
create policy promos_admin_insert on public.promos for insert to authenticated with check (public.current_user_role() = 'founder_admin');
create policy promos_admin_update on public.promos for update to authenticated using (public.current_user_role() = 'founder_admin') with check (public.current_user_role() = 'founder_admin');

create policy bundles_select_all on public.bundles for select to authenticated using (true);
create policy bundles_admin_insert on public.bundles for insert to authenticated with check (public.current_user_role() = 'founder_admin');
create policy bundles_admin_update on public.bundles for update to authenticated using (public.current_user_role() = 'founder_admin') with check (public.current_user_role() = 'founder_admin');

create policy bundle_components_select_all on public.bundle_components for select to authenticated using (true);
create policy bundle_components_admin_insert on public.bundle_components for insert to authenticated with check (public.current_user_role() = 'founder_admin');
create policy bundle_components_admin_update on public.bundle_components for update to authenticated using (public.current_user_role() = 'founder_admin') with check (public.current_user_role() = 'founder_admin');

-- deliveries: commissary/founder/supervisor log and see everything; branch_staff sees only their own branch.
alter table public.deliveries enable row level security;

create policy deliveries_select on public.deliveries
for select to authenticated
using (
  public.current_user_role() in ('commissary_staff', 'founder_admin', 'supervisor')
  or branch_id = public.current_user_branch_id()
);

create policy deliveries_insert on public.deliveries
for insert to authenticated
with check (public.current_user_role() in ('commissary_staff', 'founder_admin', 'supervisor'));

create policy deliveries_update_admin on public.deliveries
for update to authenticated
using (public.current_user_role() in ('founder_admin', 'supervisor'))
with check (public.current_user_role() in ('founder_admin', 'supervisor'));

-- daily_product_ledger: read-only for branch_staff/commissary; written exclusively by trg_close_out_ledger
-- (which runs SECURITY DEFINER and bypasses RLS) — no insert policy needed. founder_admin can correct rows.
alter table public.daily_product_ledger enable row level security;

create policy ledger_select on public.daily_product_ledger
for select to authenticated
using (
  public.current_user_role() in ('commissary_staff', 'founder_admin', 'supervisor')
  or branch_id = public.current_user_branch_id()
);

create policy ledger_update_admin on public.daily_product_ledger
for update to authenticated
using (public.current_user_role() = 'founder_admin')
with check (public.current_user_role() = 'founder_admin');

-- sale_tally / bundle_sale: branch_staff insert/select their own branch only; founder/supervisor read all.
-- No update/delete policies at all — append-only. Void/correction flow is scoped and built in Phase B.
alter table public.sale_tally enable row level security;
alter table public.bundle_sale enable row level security;

create policy sale_tally_select on public.sale_tally
for select to authenticated
using (
  public.current_user_role() in ('founder_admin', 'supervisor')
  or branch_id = public.current_user_branch_id()
);

create policy sale_tally_insert on public.sale_tally
for insert to authenticated
with check (
  public.current_user_role() = 'branch_staff'
  and branch_id = public.current_user_branch_id()
);

create policy bundle_sale_select on public.bundle_sale
for select to authenticated
using (
  public.current_user_role() in ('founder_admin', 'supervisor')
  or branch_id = public.current_user_branch_id()
);

create policy bundle_sale_insert on public.bundle_sale
for insert to authenticated
with check (
  public.current_user_role() = 'branch_staff'
  and branch_id = public.current_user_branch_id()
);

-- end_of_day_disposition / daily_cash_entry: same branch-scoped append-only pattern.
alter table public.end_of_day_disposition enable row level security;
alter table public.daily_cash_entry enable row level security;

create policy disposition_select on public.end_of_day_disposition
for select to authenticated
using (
  public.current_user_role() in ('founder_admin', 'supervisor')
  or branch_id = public.current_user_branch_id()
);

create policy disposition_insert on public.end_of_day_disposition
for insert to authenticated
with check (
  public.current_user_role() = 'branch_staff'
  and branch_id = public.current_user_branch_id()
);

create policy cash_entry_select on public.daily_cash_entry
for select to authenticated
using (
  public.current_user_role() in ('founder_admin', 'supervisor')
  or branch_id = public.current_user_branch_id()
);

create policy cash_entry_insert on public.daily_cash_entry
for insert to authenticated
with check (
  public.current_user_role() = 'branch_staff'
  and branch_id = public.current_user_branch_id()
);

-- entry_audit_log: founder/supervisor read-only for now; nothing writes to it yet in Phase A (the void/
-- correction flow that will populate it is Phase B scope, via its own SECURITY DEFINER path).
alter table public.entry_audit_log enable row level security;

create policy audit_log_select_admin on public.entry_audit_log
for select to authenticated
using (public.current_user_role() in ('founder_admin', 'supervisor'));

-- spot_audit: founder/supervisor only, full access.
alter table public.spot_audit enable row level security;

create policy spot_audit_all_admin on public.spot_audit
for all to authenticated
using (public.current_user_role() in ('founder_admin', 'supervisor'))
with check (public.current_user_role() in ('founder_admin', 'supervisor'));

-- variance_thresholds: branch_staff can read the global default and their own branch's override (so the
-- tablet UI can show what applies to them); only founder/supervisor can write.
alter table public.variance_thresholds enable row level security;

create policy thresholds_select on public.variance_thresholds
for select to authenticated
using (
  public.current_user_role() in ('founder_admin', 'supervisor')
  or branch_id is null
  or branch_id = public.current_user_branch_id()
);

create policy thresholds_admin_insert on public.variance_thresholds
for insert to authenticated
with check (public.current_user_role() in ('founder_admin', 'supervisor'));

create policy thresholds_admin_update on public.variance_thresholds
for update to authenticated
using (public.current_user_role() in ('founder_admin', 'supervisor'))
with check (public.current_user_role() in ('founder_admin', 'supervisor'));

create policy thresholds_admin_delete on public.variance_thresholds
for delete to authenticated
using (public.current_user_role() in ('founder_admin', 'supervisor'));
