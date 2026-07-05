-- Step 5: reports & communication — audit log, notifications, WhatsApp
-- integration (stubbed sending), and daily report run history.

-- ---------------------------------------------------------------------------
-- audit_logs: append-only trail of admin-meaningful actions. Any org member
-- can insert (the action runs as them); only admins can read it back.
-- ---------------------------------------------------------------------------

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_organization_id_idx on public.audit_logs (organization_id);
create index if not exists audit_logs_created_at_idx on public.audit_logs (created_at desc);

alter table public.audit_logs enable row level security;

create policy "Org members can log audit events"
  on public.audit_logs for insert
  with check (organization_id in (select public.get_user_org_ids()));

create policy "Admins can view their school's audit log"
  on public.audit_logs for select
  using (public.is_org_admin(organization_id));

-- ---------------------------------------------------------------------------
-- notifications: in-app notification center, one row per recipient. Realtime
-- needs replica identity full up front (Step 4 lesson: the default PK-only
-- identity doesn't carry organization_id/recipient_id into the WAL, so RLS
-- can't evaluate the change and Realtime silently drops it).
-- ---------------------------------------------------------------------------

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_organization_id_idx on public.notifications (organization_id);
create index if not exists notifications_recipient_id_idx on public.notifications (recipient_id);
create index if not exists notifications_recipient_unread_idx
  on public.notifications (recipient_id) where read_at is null;

alter table public.notifications replica identity full;
alter table public.notifications enable row level security;

create policy "Users can view their own notifications"
  on public.notifications for select
  using (recipient_id = auth.uid());

create policy "Users can mark their own notifications read"
  on public.notifications for update
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

create policy "Org members can create notifications for org-mates"
  on public.notifications for insert
  with check (
    organization_id in (select public.get_user_org_ids())
    and recipient_id in (
      select user_id from public.organization_members
      where organization_id = notifications.organization_id
    )
  );

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- whatsapp_settings: one row per org, holds Twilio credentials (account_sid +
-- access_token = Auth Token, phone_number_id = the WhatsApp-enabled sender
-- number) — deliberately NOT the "members can view" pattern used by
-- school_settings, since this is a secret. Admin-only in both directions.
-- ---------------------------------------------------------------------------

create table if not exists public.whatsapp_settings (
  organization_id uuid primary key references public.organizations (id) on delete cascade,
  provider text check (provider is null or provider in ('twilio')),
  account_sid text,
  phone_number_id text,
  access_token text,
  is_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger whatsapp_settings_set_updated_at
  before update on public.whatsapp_settings
  for each row execute function public.set_updated_at();

alter table public.whatsapp_settings enable row level security;

create policy "Admins can view their school's WhatsApp settings"
  on public.whatsapp_settings for select
  using (public.is_org_admin(organization_id));

create policy "Admins can manage their school's WhatsApp settings"
  on public.whatsapp_settings for all
  using (public.is_org_admin(organization_id))
  with check (public.is_org_admin(organization_id));

-- ---------------------------------------------------------------------------
-- whatsapp_messages: outbound message log. Admin-only, same reasoning as
-- settings (recipient phone numbers + message content are sensitive).
-- ---------------------------------------------------------------------------

create type public.whatsapp_message_status as enum ('pending', 'sent', 'failed', 'disabled');

create table if not exists public.whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  recipient_phone text not null,
  recipient_name text,
  template_key text,
  body text not null,
  status public.whatsapp_message_status not null default 'pending',
  provider_message_id text,
  error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create index if not exists whatsapp_messages_organization_id_idx
  on public.whatsapp_messages (organization_id);
create index if not exists whatsapp_messages_created_at_idx
  on public.whatsapp_messages (created_at desc);

alter table public.whatsapp_messages enable row level security;

create policy "Admins can view their school's WhatsApp message log"
  on public.whatsapp_messages for select
  using (public.is_org_admin(organization_id));

create policy "Admins can log WhatsApp messages"
  on public.whatsapp_messages for insert
  with check (public.is_org_admin(organization_id));

-- ---------------------------------------------------------------------------
-- report_runs: history of generated reports, including the daily cron job.
-- ---------------------------------------------------------------------------

create type public.report_run_status as enum ('success', 'failed');

create table if not exists public.report_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  report_type text not null,
  run_date date not null,
  status public.report_run_status not null,
  summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists report_runs_organization_id_idx on public.report_runs (organization_id);
create index if not exists report_runs_run_date_idx on public.report_runs (run_date desc);

alter table public.report_runs enable row level security;

create policy "Members can view their school's report runs"
  on public.report_runs for select
  using (organization_id in (select public.get_user_org_ids()));

create policy "Admins can manage their school's report runs"
  on public.report_runs for all
  using (public.is_org_admin(organization_id))
  with check (public.is_org_admin(organization_id));

-- ---------------------------------------------------------------------------
-- class_attendance_stats: per-class rollup for the analytics class-comparison
-- chart, same shape/percentage formula as student_attendance_stats (Step 4).
-- ---------------------------------------------------------------------------

create view public.class_attendance_stats
with (security_invoker = true) as
select
  c.id as class_id,
  c.organization_id,
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
from public.classes c
left join public.attendance_sessions s on s.class_id = c.id
left join public.attendance_records r on r.session_id = s.id
group by c.id;

grant select on public.class_attendance_stats to authenticated;
