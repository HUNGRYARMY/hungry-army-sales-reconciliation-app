create table public.branches (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  closing_time time,              -- reference only; business day is plain midnight-to-midnight, no rollover logic depends on this
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 1:1 with auth.users; role + branch scoping lives here rather than JWT custom claims
-- (avoids stale-claim risk if a founder reassigns someone mid-day)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role public.user_role not null default 'branch_staff',
  branch_id uuid references public.branches(id),   -- null for commissary/founder/supervisor
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint branch_staff_requires_branch check (role <> 'branch_staff' or branch_id is not null)
);
create index idx_profiles_branch on public.profiles(branch_id);

-- New auth.users rows get a default (most-restrictive) profile automatically;
-- a founder_admin assigns the real role/branch afterward.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''), 'branch_staff');
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
