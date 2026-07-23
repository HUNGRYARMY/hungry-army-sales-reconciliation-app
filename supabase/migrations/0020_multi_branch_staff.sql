-- Some staff (e.g. a cashier covering more than one branch) need to work at different branches on
-- different days. profiles.branch_id previously pinned a branch_staff member to exactly one branch
-- forever. Replaces that with profile_branches (the SET of branches someone is allowed to operate at)
-- plus profiles.active_branch_id (which one they're currently working as) — every RLS policy and query
-- that scopes by "the caller's branch" already goes through current_user_branch_id(), so redefining that
-- one function to read active_branch_id instead of branch_id is the only change those policies need.
-- Single-branch staff just get one profile_branches row with active_branch_id pre-set to it, so nothing
-- changes for them day-to-day — the branch switcher only needs to appear in the UI when there's more
-- than one to choose from.

create table public.profile_branches (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  branch_id uuid not null references public.branches(id) on delete cascade,
  primary key (profile_id, branch_id)
);
alter table public.profile_branches enable row level security;

create policy profile_branches_select on public.profile_branches
for select to authenticated
using (profile_id = auth.uid() or public.current_user_role() in ('founder_admin', 'supervisor'));

create policy profile_branches_admin_write on public.profile_branches
for all to authenticated
using (public.current_user_role() = 'founder_admin')
with check (public.current_user_role() = 'founder_admin');

alter table public.profiles add column active_branch_id uuid references public.branches(id);

-- Backfill: every existing branch_staff's single branch_id becomes their one allowed + active branch.
insert into public.profile_branches (profile_id, branch_id)
select id, branch_id from public.profiles where role = 'branch_staff' and branch_id is not null;

update public.profiles set active_branch_id = branch_id where role = 'branch_staff';

create or replace function public.current_user_branch_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select active_branch_id from public.profiles where id = auth.uid()
$$;

alter table public.profiles drop constraint branch_staff_requires_branch;
alter table public.profiles add constraint branch_staff_requires_active_branch
  check (role <> 'branch_staff' or active_branch_id is not null);

-- profiles_update_own (0008) references branch_id in its WITH CHECK, which blocks dropping the column
-- below unless the policy is dropped first — recreated immediately after, against active_branch_id
-- instead, so a branch_staff account still can't grant itself privileges via a raw update. active_branch_id
-- gets the same lock role/is_active already had: only set_active_branch()'s validated RPC may change it.
drop policy profiles_update_own on public.profiles;
alter table public.profiles drop column branch_id;

create policy profiles_update_own on public.profiles
for update to authenticated
using (id = auth.uid())
with check (
  id = auth.uid()
  and role = (select p.role from public.profiles p where p.id = auth.uid())
  and coalesce(active_branch_id::text, '') = coalesce((select p.active_branch_id::text from public.profiles p where p.id = auth.uid()), '')
  and is_active = (select p.is_active from public.profiles p where p.id = auth.uid())
);

-- Narrow SECURITY DEFINER function: a branch_staff member can only switch their active branch to one
-- they're actually assigned to in profile_branches, never an arbitrary branch — same pattern as
-- confirm_delivery_receipt/void_sale_tally.
create function public.set_active_branch(p_branch_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.profile_branches where profile_id = auth.uid() and branch_id = p_branch_id
  ) then
    raise exception 'you are not assigned to that branch';
  end if;
  update public.profiles set active_branch_id = p_branch_id where id = auth.uid();
end;
$$;
