-- Step 3: core school management — grades, sections, classes, students,
-- teachers (profile extension), guardians.

create extension if not exists "pg_trgm";

-- ---------------------------------------------------------------------------
-- Grades & sections: org-scoped master lists.
-- ---------------------------------------------------------------------------

create table if not exists public.grades (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint grades_org_name_key unique (organization_id, name)
);

create trigger grades_set_updated_at
  before update on public.grades
  for each row execute function public.set_updated_at();

create index if not exists grades_organization_id_idx on public.grades (organization_id);

create table if not exists public.sections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sections_org_name_key unique (organization_id, name)
);

create trigger sections_set_updated_at
  before update on public.sections
  for each row execute function public.set_updated_at();

create index if not exists sections_organization_id_idx on public.sections (organization_id);

-- ---------------------------------------------------------------------------
-- Classes: grade + section + academic_year + optional homeroom teacher.
-- ---------------------------------------------------------------------------

create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  academic_year_id uuid not null references public.academic_years (id) on delete cascade,
  grade_id uuid not null references public.grades (id) on delete cascade,
  section_id uuid not null references public.sections (id) on delete cascade,
  homeroom_teacher_id uuid references public.profiles (id) on delete set null,
  capacity integer check (capacity is null or capacity > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint classes_unique_combo unique (academic_year_id, grade_id, section_id)
);

create trigger classes_set_updated_at
  before update on public.classes
  for each row execute function public.set_updated_at();

create index if not exists classes_organization_id_idx on public.classes (organization_id);
create index if not exists classes_academic_year_id_idx on public.classes (academic_year_id);
create index if not exists classes_grade_id_idx on public.classes (grade_id);
create index if not exists classes_homeroom_teacher_id_idx on public.classes (homeroom_teacher_id);

-- ---------------------------------------------------------------------------
-- Students.
-- ---------------------------------------------------------------------------

create type public.student_status as enum ('active', 'inactive', 'graduated', 'withdrawn');

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  admission_number text not null,
  first_name text not null,
  last_name text not null,
  full_name text generated always as (first_name || ' ' || last_name) stored,
  date_of_birth date,
  gender text check (gender is null or gender in ('male', 'female', 'other')),
  class_id uuid references public.classes (id) on delete set null,
  status public.student_status not null default 'active',
  enrollment_date date not null default current_date,
  photo_url text,
  address text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint students_org_admission_number_key unique (organization_id, admission_number)
);

create trigger students_set_updated_at
  before update on public.students
  for each row execute function public.set_updated_at();

create index if not exists students_organization_id_idx on public.students (organization_id);
create index if not exists students_class_id_idx on public.students (class_id);
create index if not exists students_status_idx on public.students (status);
create index if not exists students_full_name_trgm_idx
  on public.students using gin (full_name gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- Teacher profile extension (org-scoped attributes of a membership).
-- ---------------------------------------------------------------------------

create table if not exists public.teacher_profiles (
  organization_id uuid not null,
  user_id uuid not null,
  staff_id text,
  phone text,
  subjects text[] not null default '{}',
  qualification text,
  hire_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organization_id, user_id),
  constraint teacher_profiles_member_fkey
    foreign key (organization_id, user_id)
    references public.organization_members (organization_id, user_id)
    on delete cascade,
  constraint teacher_profiles_org_staff_id_key unique (organization_id, staff_id)
);

create trigger teacher_profiles_set_updated_at
  before update on public.teacher_profiles
  for each row execute function public.set_updated_at();

create index if not exists teacher_profiles_organization_id_idx
  on public.teacher_profiles (organization_id);

-- ---------------------------------------------------------------------------
-- Guardians (contact-only, no auth) & student_guardians join.
-- ---------------------------------------------------------------------------

create table if not exists public.guardians (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  full_name text not null,
  phone text,
  email text,
  address text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger guardians_set_updated_at
  before update on public.guardians
  for each row execute function public.set_updated_at();

create index if not exists guardians_organization_id_idx on public.guardians (organization_id);
create index if not exists guardians_full_name_trgm_idx
  on public.guardians using gin (full_name gin_trgm_ops);

create table if not exists public.student_guardians (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  guardian_id uuid not null references public.guardians (id) on delete cascade,
  relationship text not null check (
    relationship in ('mother', 'father', 'guardian', 'grandparent', 'sibling', 'other')
  ),
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  constraint student_guardians_unique_pair unique (student_id, guardian_id)
);

create index if not exists student_guardians_student_id_idx
  on public.student_guardians (student_id);
create index if not exists student_guardians_guardian_id_idx
  on public.student_guardians (guardian_id);

-- At most one primary guardian per student.
create unique index if not exists student_guardians_one_primary_idx
  on public.student_guardians (student_id)
  where is_primary;

-- ---------------------------------------------------------------------------
-- Row Level Security — same "any member selects, only admins mutate" pattern.
-- ---------------------------------------------------------------------------

alter table public.grades enable row level security;
alter table public.sections enable row level security;
alter table public.classes enable row level security;
alter table public.students enable row level security;
alter table public.teacher_profiles enable row level security;
alter table public.guardians enable row level security;
alter table public.student_guardians enable row level security;

create policy "Members can view their school's grades"
  on public.grades for select using (organization_id in (select public.get_user_org_ids()));
create policy "Admins can manage their school's grades"
  on public.grades for all
  using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));

create policy "Members can view their school's sections"
  on public.sections for select using (organization_id in (select public.get_user_org_ids()));
create policy "Admins can manage their school's sections"
  on public.sections for all
  using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));

create policy "Members can view their school's classes"
  on public.classes for select using (organization_id in (select public.get_user_org_ids()));
create policy "Admins can manage their school's classes"
  on public.classes for all
  using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));

create policy "Members can view their school's students"
  on public.students for select using (organization_id in (select public.get_user_org_ids()));
create policy "Admins can manage their school's students"
  on public.students for all
  using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));

create policy "Members can view their school's teacher profiles"
  on public.teacher_profiles for select
  using (organization_id in (select public.get_user_org_ids()));
create policy "Admins can manage their school's teacher profiles"
  on public.teacher_profiles for all
  using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));

create policy "Members can view their school's guardians"
  on public.guardians for select using (organization_id in (select public.get_user_org_ids()));
create policy "Admins can manage their school's guardians"
  on public.guardians for all
  using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));

create policy "Members can view their school's student-guardian links"
  on public.student_guardians for select
  using (organization_id in (select public.get_user_org_ids()));
create policy "Admins can manage their school's student-guardian links"
  on public.student_guardians for all
  using (public.is_org_admin(organization_id)) with check (public.is_org_admin(organization_id));

-- ---------------------------------------------------------------------------
-- Profiles: previously only self-viewable/self-editable (see init migration),
-- which meant listing another member's name (Team page, Teacher management)
-- silently returned nothing under RLS. Teachers management needs to display
-- other teachers' names and let admins update another teacher's photo, so
-- extend visibility/editability to org-mates, matching the "any member can
-- view, only admins can mutate" pattern used everywhere else.
-- ---------------------------------------------------------------------------

create policy "Members can view profiles of their org-mates"
  on public.profiles for select
  using (
    id in (
      select user_id from public.organization_members
      where organization_id in (select public.get_user_org_ids())
    )
  );

create policy "Admins can update profiles of their org members"
  on public.profiles for update
  using (
    exists (
      select 1 from public.organization_members om
      where om.user_id = profiles.id
        and public.is_org_admin(om.organization_id)
    )
  );
