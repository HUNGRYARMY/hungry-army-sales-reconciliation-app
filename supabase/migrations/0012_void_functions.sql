-- Void/correction flow (Phase B). sale_tally/bundle_sale deliberately have no UPDATE RLS policy (0008) —
-- append-only. Rather than opening a general UPDATE policy (which would let a raw client mutate qty_sold/
-- unit_price/discount_rate_applied — exactly the revenue fields the server-stamping trigger exists to
-- protect), voiding goes through these narrow SECURITY DEFINER functions: they can only flip is_void/
-- void_reason, they authorize internally, and every call writes an entry_audit_log row.
--
-- Authorization (matches the default agreed in the Phase A plan's open items):
--   - branch_staff may void only their own same-day entries at their own branch
--   - founder_admin/supervisor may void anything, anytime
-- "Same-day" is evaluated in Asia/Manila time, matching the app's business-day rule (see businessDate.ts).

create function public.void_sale_tally(p_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.sale_tally;
  v_role public.user_role;
begin
  v_role := public.current_user_role();

  select * into v_row from public.sale_tally where id = p_id;
  if v_row.id is null then
    raise exception 'sale_tally row % not found', p_id;
  end if;
  if v_row.is_void then
    raise exception 'already voided';
  end if;
  if p_reason is null or btrim(p_reason) = '' then
    raise exception 'void reason is required';
  end if;

  if v_role in ('founder_admin', 'supervisor') then
    null; -- allowed anytime, any branch, even after ledger closeout
  elsif v_role = 'branch_staff' then
    if v_row.branch_id <> public.current_user_branch_id() then
      raise exception 'cannot void another branch''s entry';
    end if;
    if v_row.entered_by <> auth.uid() then
      raise exception 'can only void your own entries';
    end if;
    if v_row.date <> (now() at time zone 'Asia/Manila')::date then
      raise exception 'can only void same-day entries';
    end if;
    -- daily_product_ledger.sold is a closeout snapshot, not a live view — voiding after that product's
    -- disposition already ran would silently desync it. Self-service voiding is only safe before closeout.
    if exists (
      select 1 from public.daily_product_ledger
      where branch_id = v_row.branch_id and product_id = v_row.product_id and date = v_row.date
    ) then
      raise exception 'this item''s end-of-day disposition is already closed for today — ask a founder/admin to correct it';
    end if;
  else
    raise exception 'not authorized to void sales';
  end if;

  update public.sale_tally set is_void = true, void_reason = btrim(p_reason) where id = p_id;

  insert into public.entry_audit_log (entry_table, entry_id, field_changed, old_value, new_value, reason, changed_by)
  values ('sale_tally', p_id, 'is_void', 'false', 'true', btrim(p_reason), auth.uid());
end;
$$;

create function public.void_bundle_sale(p_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.bundle_sale;
  v_role public.user_role;
begin
  v_role := public.current_user_role();

  select * into v_row from public.bundle_sale where id = p_id;
  if v_row.id is null then
    raise exception 'bundle_sale row % not found', p_id;
  end if;
  if v_row.is_void then
    raise exception 'already voided';
  end if;
  if p_reason is null or btrim(p_reason) = '' then
    raise exception 'void reason is required';
  end if;

  if v_role in ('founder_admin', 'supervisor') then
    null;
  elsif v_role = 'branch_staff' then
    if v_row.branch_id <> public.current_user_branch_id() then
      raise exception 'cannot void another branch''s entry';
    end if;
    if v_row.entered_by <> auth.uid() then
      raise exception 'can only void your own entries';
    end if;
    if v_row.date <> (now() at time zone 'Asia/Manila')::date then
      raise exception 'can only void same-day entries';
    end if;
    -- a bundle credits each component product's `sold` figure dynamically at closeout (see
    -- close_out_ledger) — if any component's disposition already closed today, voiding here would
    -- desync that component's ledger the same way a direct sale_tally void would.
    if exists (
      select 1
      from public.bundle_components bc
      join public.daily_product_ledger l
        on l.branch_id = v_row.branch_id and l.product_id = bc.product_id and l.date = v_row.date
      where bc.bundle_id = v_row.bundle_id
    ) then
      raise exception 'a component of this bundle is already closed for today — ask a founder/admin to correct it';
    end if;
  else
    raise exception 'not authorized to void sales';
  end if;

  update public.bundle_sale set is_void = true, void_reason = btrim(p_reason) where id = p_id;

  insert into public.entry_audit_log (entry_table, entry_id, field_changed, old_value, new_value, reason, changed_by)
  values ('bundle_sale', p_id, 'is_void', 'false', 'true', btrim(p_reason), auth.uid());
end;
$$;
