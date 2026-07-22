-- Bug found during verification: handle_new_user() (0003) inserts every fresh signup with the default
-- role='branch_staff', but branch_staff_requires_branch demands a non-null branch_id on that same insert —
-- so every single signup failed with a check-constraint violation before a founder ever got the chance to
-- assign a real role/branch. Fix: new profiles start with role = null ("unassigned"), which every RLS policy
-- already denies by default (no policy matches a null role), so an unassigned account can do nothing until a
-- founder_admin assigns it — without needing a special-cased default role.

alter table public.profiles alter column role drop not null;
alter table public.profiles alter column role drop default;

alter table public.profiles drop constraint branch_staff_requires_branch;
alter table public.profiles add constraint branch_staff_requires_branch
  check (role is null or role <> 'branch_staff' or branch_id is not null);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end;
$$;

-- profiles_update_own (0008) compared role/branch_id with plain `=`, which is NULL-unsafe: for an unassigned
-- account (role/branch_id both null), `null = null` evaluates to unknown, not true, so the WITH CHECK would
-- silently block that account from ever updating even its own full_name. Switch to IS NOT DISTINCT FROM.
drop policy profiles_update_own on public.profiles;

create policy profiles_update_own on public.profiles
for update to authenticated
using (id = auth.uid())
with check (
  id = auth.uid()
  and role is not distinct from (select p.role from public.profiles p where p.id = auth.uid())
  and branch_id is not distinct from (select p.branch_id from public.profiles p where p.id = auth.uid())
  and is_active is not distinct from (select p.is_active from public.profiles p where p.id = auth.uid())
);
