-- Any teacher can now mark attendance for any class in their own school,
-- not just the class they're the homeroom teacher of. is_class_teacher()
-- backs every teacher insert/update policy on attendance_sessions and
-- attendance_records (see 20260705010000_attendance_system.sql), so
-- redefining it here is enough to change the access rule everywhere without
-- touching those policies.
create or replace function public.is_class_teacher(p_class_id uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1
    from public.classes c
    join public.organization_members m
      on m.organization_id = c.organization_id
     and m.user_id = auth.uid()
     and m.role = 'teacher'
    where c.id = p_class_id
  );
$$;
