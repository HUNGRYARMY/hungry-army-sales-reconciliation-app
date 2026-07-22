-- Founder-facing review queue for discount_type='other' sale_tally rows (auto-flagged needs_review=true by
-- stamp_sale_tally, 0007). Tracks who cleared a flag and when, via the same narrow-RPC pattern as voiding
-- (0012): no general UPDATE policy on sale_tally, just a function that can only touch these specific columns,
-- authorizes internally, and writes to entry_audit_log.

alter table public.sale_tally add column reviewed_by uuid references public.profiles(id);
alter table public.sale_tally add column reviewed_at timestamptz;

create function public.mark_discount_reviewed(p_id uuid, p_notes text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.sale_tally;
begin
  if public.current_user_role() not in ('founder_admin', 'supervisor') then
    raise exception 'only founder_admin/supervisor can mark discounts reviewed';
  end if;

  select * into v_row from public.sale_tally where id = p_id;
  if v_row.id is null then
    raise exception 'sale_tally row % not found', p_id;
  end if;
  if not v_row.needs_review then
    raise exception 'row is not flagged for review';
  end if;

  update public.sale_tally
  set needs_review = false, reviewed_by = auth.uid(), reviewed_at = now()
  where id = p_id;

  insert into public.entry_audit_log (entry_table, entry_id, field_changed, old_value, new_value, reason, changed_by)
  values ('sale_tally', p_id, 'needs_review', 'true', 'false', p_notes, auth.uid());
end;
$$;
