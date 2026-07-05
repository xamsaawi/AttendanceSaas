-- Step 4: attendance system — sessions, records, locking, calculations.

-- ---------------------------------------------------------------------------
-- school_settings additions: working days + per-session cutoffs + grace period.
-- ---------------------------------------------------------------------------

alter table public.school_settings
  add column if not exists working_days smallint[] not null default '{1,2,3,4,5}',
  add column if not exists before_break_cutoff time not null default '10:00',
  add column if not exists after_break_cutoff time not null default '15:00',
  add column if not exists attendance_lock_grace_hours integer not null default 2
    check (attendance_lock_grace_hours >= 0);

alter table public.school_settings
  add constraint school_settings_working_days_check
    check (working_days <@ array[1,2,3,4,5,6,7]::smallint[]);

-- ---------------------------------------------------------------------------
-- Enums.
-- ---------------------------------------------------------------------------

create type public.attendance_status as enum ('present', 'absent', 'late', 'excused', 'half_day');
create type public.attendance_session_type as enum ('before_break', 'after_break');

-- ---------------------------------------------------------------------------
-- attendance_sessions: one row per class + date + session ("header").
-- Locking lives here so it can be enforced/overridden at this granularity
-- rather than duplicated across every student row.
-- ---------------------------------------------------------------------------

create table if not exists public.attendance_sessions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  class_id uuid not null references public.classes (id) on delete cascade,
  session_date date not null,
  session_type public.attendance_session_type not null,
  submitted_by uuid references public.profiles (id) on delete set null,
  submitted_at timestamptz,
  -- null = follow the computed auto-lock rule; true = admin force-locked early;
  -- false = admin has re-opened an auto-locked session for correction.
  locked_override boolean,
  locked_override_by uuid references public.profiles (id) on delete set null,
  locked_override_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint attendance_sessions_unique_slot unique (class_id, session_date, session_type)
);

create trigger attendance_sessions_set_updated_at
  before update on public.attendance_sessions
  for each row execute function public.set_updated_at();

create index if not exists attendance_sessions_organization_id_idx
  on public.attendance_sessions (organization_id);
create index if not exists attendance_sessions_class_date_idx
  on public.attendance_sessions (class_id, session_date);
create index if not exists attendance_sessions_date_idx
  on public.attendance_sessions (session_date);

-- ---------------------------------------------------------------------------
-- attendance_records: one row per student within a session ("lines").
-- organization_id is denormalized so RLS selects don't need a join.
-- ---------------------------------------------------------------------------

create table if not exists public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  session_id uuid not null references public.attendance_sessions (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  status public.attendance_status not null default 'present',
  notes text,
  marked_by uuid references public.profiles (id) on delete set null,
  marked_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint attendance_records_unique_student_per_session unique (session_id, student_id)
);

create trigger attendance_records_set_updated_at
  before update on public.attendance_records
  for each row execute function public.set_updated_at();

create index if not exists attendance_records_organization_id_idx
  on public.attendance_records (organization_id);
create index if not exists attendance_records_session_id_idx
  on public.attendance_records (session_id);
create index if not exists attendance_records_student_id_idx
  on public.attendance_records (student_id);

-- ---------------------------------------------------------------------------
-- Helper functions (security definer stable — same convention as
-- get_user_org_ids / is_org_admin).
-- ---------------------------------------------------------------------------

-- New teacher-gate: true if the caller is the homeroom teacher of this class.
create or replace function public.is_class_teacher(p_class_id uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.classes
    where id = p_class_id and homeroom_teacher_id = auth.uid()
  );
$$;

-- The instant at which a class/date/session auto-locks: that session's
-- cutoff time + configurable grace hours, evaluated in the school's
-- timezone, capped at midnight of the next day so a session is never left
-- open indefinitely. There is no scheduled job enforcing this — it's a pure
-- function of now(), evaluated on every read/write.
create or replace function public.attendance_lock_at(
  p_class_id uuid,
  p_session_date date,
  p_session_type public.attendance_session_type
)
returns timestamptz
language sql
security definer set search_path = public
stable
as $$
  select least(
    (
      (p_session_date + (case
        when p_session_type = 'before_break' then s.before_break_cutoff
        else s.after_break_cutoff
      end))
      + make_interval(hours => s.attendance_lock_grace_hours)
    ) at time zone coalesce(s.timezone, 'UTC'),
    ((p_session_date + 1)::timestamp) at time zone coalesce(s.timezone, 'UTC')
  )
  from public.classes c
  join public.school_settings s on s.organization_id = c.organization_id
  where c.id = p_class_id;
$$;

-- Effective lock state, honoring any admin override.
create or replace function public.attendance_session_is_locked(
  p_class_id uuid,
  p_session_date date,
  p_session_type public.attendance_session_type,
  p_locked_override boolean
)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select case
    when p_locked_override is not null then p_locked_override
    else now() > public.attendance_lock_at(p_class_id, p_session_date, p_session_type)
  end;
$$;

-- Convenience wrapper keyed by session id, for attendance_records RLS.
create or replace function public.attendance_session_locked(p_session_id uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select public.attendance_session_is_locked(s.class_id, s.session_date, s.session_type, s.locked_override)
  from public.attendance_sessions s
  where s.id = p_session_id;
$$;

-- ---------------------------------------------------------------------------
-- SQL views for "attendance calculations". Both use security_invoker = true
-- so they respect the QUERYING user's RLS, not the view owner's.
-- ---------------------------------------------------------------------------

create view public.attendance_session_overview
with (security_invoker = true) as
select
  s.id as session_id,
  s.organization_id,
  s.class_id,
  c.grade_id,
  c.section_id,
  c.homeroom_teacher_id,
  s.session_date,
  s.session_type,
  s.submitted_by,
  s.submitted_at,
  s.locked_override,
  public.attendance_lock_at(s.class_id, s.session_date, s.session_type) as effective_lock_at,
  public.attendance_session_is_locked(s.class_id, s.session_date, s.session_type, s.locked_override) as is_locked,
  (select count(*)::int from public.students st
    where st.class_id = s.class_id and st.status = 'active') as total_students,
  count(r.id)::int as marked_count,
  count(*) filter (where r.status = 'present')::int as present_count,
  count(*) filter (where r.status = 'absent')::int as absent_count,
  count(*) filter (where r.status = 'late')::int as late_count,
  count(*) filter (where r.status = 'excused')::int as excused_count,
  count(*) filter (where r.status = 'half_day')::int as half_day_count
from public.attendance_sessions s
join public.classes c on c.id = s.class_id
left join public.attendance_records r on r.session_id = s.id
group by s.id, c.grade_id, c.section_id, c.homeroom_teacher_id;

grant select on public.attendance_session_overview to authenticated;

-- All-time per-student aggregate. Term/date-scoped percentages are computed
-- in the app layer directly from attendance_records (see queries.ts) rather
-- than a second parameterized view, since views can't take date-range
-- arguments and an unbounded date-generation view isn't worth the
-- complexity at school-app scale.
create view public.student_attendance_stats
with (security_invoker = true) as
select
  st.id as student_id,
  st.organization_id,
  st.class_id,
  count(r.id)::int as total_marked,
  count(*) filter (where r.status = 'present')::int as present_count,
  count(*) filter (where r.status = 'absent')::int as absent_count,
  count(*) filter (where r.status = 'late')::int as late_count,
  count(*) filter (where r.status = 'excused')::int as excused_count,
  count(*) filter (where r.status = 'half_day')::int as half_day_count,
  round(
    100.0 * (
      count(*) filter (where r.status in ('present', 'late'))
      + 0.5 * count(*) filter (where r.status = 'half_day')
    ) / nullif(count(*) filter (where r.status <> 'excused'), 0),
    1
  ) as attendance_percentage
from public.students st
left join public.attendance_records r on r.student_id = st.id
group by st.id;

grant select on public.student_attendance_stats to authenticated;

-- Percentage formula (documented decision): present + late count fully,
-- half_day counts as 0.5, excused sessions are removed from BOTH numerator
-- and denominator (neither help nor hurt), absent counts fully against.

-- ---------------------------------------------------------------------------
-- Row Level Security.
-- ---------------------------------------------------------------------------

alter table public.attendance_sessions enable row level security;
alter table public.attendance_records enable row level security;

create policy "Members can view their school's attendance sessions"
  on public.attendance_sessions for select
  using (organization_id in (select public.get_user_org_ids()));

create policy "Admins can manage their school's attendance sessions"
  on public.attendance_sessions for all
  using (public.is_org_admin(organization_id))
  with check (public.is_org_admin(organization_id));

create policy "Teachers create sessions for their own unlocked class"
  on public.attendance_sessions for insert
  with check (
    public.is_class_teacher(class_id)
    and not public.attendance_session_is_locked(class_id, session_date, session_type, locked_override)
  );

create policy "Teachers update sessions for their own unlocked class"
  on public.attendance_sessions for update
  using (
    public.is_class_teacher(class_id)
    and not public.attendance_session_is_locked(class_id, session_date, session_type, locked_override)
  )
  with check (
    public.is_class_teacher(class_id)
    and not public.attendance_session_is_locked(class_id, session_date, session_type, locked_override)
  );

create policy "Members can view their school's attendance records"
  on public.attendance_records for select
  using (organization_id in (select public.get_user_org_ids()));

create policy "Admins can manage their school's attendance records"
  on public.attendance_records for all
  using (public.is_org_admin(organization_id))
  with check (public.is_org_admin(organization_id));

create policy "Teachers create records for their own unlocked sessions"
  on public.attendance_records for insert
  with check (
    exists (
      select 1 from public.attendance_sessions s
      where s.id = session_id and public.is_class_teacher(s.class_id)
    )
    and not public.attendance_session_locked(session_id)
  );

create policy "Teachers update records for their own unlocked sessions"
  on public.attendance_records for update
  using (
    exists (
      select 1 from public.attendance_sessions s
      where s.id = session_id and public.is_class_teacher(s.class_id)
    )
    and not public.attendance_session_locked(session_id)
  )
  with check (
    exists (
      select 1 from public.attendance_sessions s
      where s.id = session_id and public.is_class_teacher(s.class_id)
    )
    and not public.attendance_session_locked(session_id)
  );

-- Teachers get no delete policy on either table — only admins can delete,
-- via the "manage" ("for all") policy above.

-- ---------------------------------------------------------------------------
-- Realtime: add both tables to the default publication so postgres_changes
-- subscriptions fire (RLS is still enforced per-subscriber).
--
-- REPLICA IDENTITY FULL is required here: the RLS policies above filter on
-- organization_id, but with the default replica identity (primary key only)
-- the WAL payload for UPDATE/DELETE doesn't include that column, so Realtime
-- can't evaluate the SELECT policy per-subscriber and silently drops the
-- change instead of forwarding it.
-- ---------------------------------------------------------------------------

alter table public.attendance_sessions replica identity full;
alter table public.attendance_records replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'attendance_sessions'
  ) then
    alter publication supabase_realtime add table public.attendance_sessions;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'attendance_records'
  ) then
    alter publication supabase_realtime add table public.attendance_records;
  end if;
end $$;
