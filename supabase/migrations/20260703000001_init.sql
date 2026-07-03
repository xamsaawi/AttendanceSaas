-- Initial schema foundation: organizations, profiles, membership.
-- Attendance-specific tables land in later migrations.

create extension if not exists "pgcrypto";

-- Reusable trigger to keep updated_at in sync on every row update.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Organizations (tenants). Every workspace using the product belongs to one.
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger organizations_set_updated_at
  before update on public.organizations
  for each row execute function public.set_updated_at();

-- Profiles extend auth.users with app-facing fields.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Automatically create a profile row when a new auth user is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Organization membership with role-based access.
create type public.org_role as enum ('owner', 'admin', 'member');

create table if not exists public.organization_members (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.org_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

-- Security definer helper: bypasses RLS to avoid recursive policy checks
-- when organization_members needs to reference itself.
create or replace function public.get_user_org_ids()
returns setof uuid
language sql
security definer set search_path = public
stable
as $$
  select organization_id from public.organization_members
  where user_id = auth.uid();
$$;

-- Row Level Security
alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.organization_members enable row level security;

create policy "Members can view their organizations"
  on public.organizations for select
  using (id in (select public.get_user_org_ids()));

create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Members can view their organization's membership"
  on public.organization_members for select
  using (organization_id in (select public.get_user_org_ids()));
