-- Step 2: school domain — settings, academic calendar, and role management.

-- 'member' was a placeholder; this product is teacher/admin/owner scoped.
alter type public.org_role rename value 'member' to 'teacher';

-- Let the Team page list member emails without querying auth.users client-side.
alter table public.profiles add column if not exists email text;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, new.raw_user_meta_data ->> 'full_name', new.email);
  return new;
end;
$$;

update public.profiles p
set email = u.email
from auth.users u
where p.id = u.id and p.email is null;

-- Security definer helper: true if the current user is an owner/admin of org_id.
create or replace function public.is_org_admin(org_id uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.organization_members
    where organization_id = org_id
      and user_id = auth.uid()
      and role in ('owner', 'admin')
  );
$$;

-- School settings: one row per organization, auto-created alongside the org.
create table if not exists public.school_settings (
  organization_id uuid primary key references public.organizations (id) on delete cascade,
  timezone text not null default 'UTC',
  address text,
  phone text,
  contact_email text,
  logo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger school_settings_set_updated_at
  before update on public.school_settings
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_organization()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.school_settings (organization_id) values (new.id);
  return new;
end;
$$;

create trigger on_organization_created
  after insert on public.organizations
  for each row execute function public.handle_new_organization();

-- Academic years.
create table if not exists public.academic_years (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  start_date date not null,
  end_date date not null,
  is_current boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint academic_years_dates_check check (end_date > start_date)
);

create trigger academic_years_set_updated_at
  before update on public.academic_years
  for each row execute function public.set_updated_at();

create index if not exists academic_years_organization_id_idx
  on public.academic_years (organization_id);

-- Terms belong to an academic year.
create table if not exists public.terms (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  academic_year_id uuid not null references public.academic_years (id) on delete cascade,
  name text not null,
  start_date date not null,
  end_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint terms_dates_check check (end_date > start_date)
);

create trigger terms_set_updated_at
  before update on public.terms
  for each row execute function public.set_updated_at();

create index if not exists terms_organization_id_idx on public.terms (organization_id);
create index if not exists terms_academic_year_id_idx on public.terms (academic_year_id);

-- Holidays, optionally tied to an academic year.
create table if not exists public.holidays (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  academic_year_id uuid references public.academic_years (id) on delete set null,
  name text not null,
  start_date date not null,
  end_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint holidays_dates_check check (end_date >= start_date)
);

create trigger holidays_set_updated_at
  before update on public.holidays
  for each row execute function public.set_updated_at();

create index if not exists holidays_organization_id_idx on public.holidays (organization_id);

-- Row Level Security
alter table public.school_settings enable row level security;
alter table public.academic_years enable row level security;
alter table public.terms enable row level security;
alter table public.holidays enable row level security;

create policy "Members can view their school's settings"
  on public.school_settings for select
  using (organization_id in (select public.get_user_org_ids()));

create policy "Admins can update their school's settings"
  on public.school_settings for update
  using (public.is_org_admin(organization_id));

create policy "Members can view their school's academic years"
  on public.academic_years for select
  using (organization_id in (select public.get_user_org_ids()));

create policy "Admins can manage their school's academic years"
  on public.academic_years for all
  using (public.is_org_admin(organization_id))
  with check (public.is_org_admin(organization_id));

create policy "Members can view their school's terms"
  on public.terms for select
  using (organization_id in (select public.get_user_org_ids()));

create policy "Admins can manage their school's terms"
  on public.terms for all
  using (public.is_org_admin(organization_id))
  with check (public.is_org_admin(organization_id));

create policy "Members can view their school's holidays"
  on public.holidays for select
  using (organization_id in (select public.get_user_org_ids()));

create policy "Admins can manage their school's holidays"
  on public.holidays for all
  using (public.is_org_admin(organization_id))
  with check (public.is_org_admin(organization_id));

-- Round out organization/membership management for admins.
create policy "Admins can update their organization"
  on public.organizations for update
  using (public.is_org_admin(id));

create policy "Admins can update membership roles"
  on public.organization_members for update
  using (public.is_org_admin(organization_id));

create policy "Admins can remove members"
  on public.organization_members for delete
  using (public.is_org_admin(organization_id));
