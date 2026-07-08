-- Teachers now authenticate with Google OAuth instead of an admin-issued
-- password. Admins pre-register a teacher's Gmail address; the account is
-- created automatically (and linked to the right school) the first time
-- that address signs in with Google, via the /auth/callback route.

create table if not exists public.teacher_invites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  email text not null,
  full_name text not null,
  staff_id text,
  phone text,
  subjects text[] not null default '{}',
  qualification text,
  hire_date date,
  accepted_at timestamptz,
  accepted_user_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint teacher_invites_org_email_key unique (organization_id, email)
);

create index if not exists teacher_invites_email_idx on public.teacher_invites (lower(email));
create index if not exists teacher_invites_organization_id_idx
  on public.teacher_invites (organization_id);

alter table public.teacher_invites enable row level security;

-- Invite rows are only ever read/written by server code using the
-- service-role client (invite creation by admins, acceptance during the
-- OAuth callback), so the only policy needed is for admins to see the
-- pending invite list in the dashboard.
create policy "Admins can view their school's teacher invites"
  on public.teacher_invites for select
  using (public.is_org_admin(organization_id));

create policy "Admins can manage their school's teacher invites"
  on public.teacher_invites for all
  using (public.is_org_admin(organization_id))
  with check (public.is_org_admin(organization_id));
