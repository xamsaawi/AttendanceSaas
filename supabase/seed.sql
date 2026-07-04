-- Local development seed data. Run automatically by `supabase db reset`.
-- Local dev only — never run this against a remote/production project:
-- the demo user is created by inserting straight into auth.users, which
-- is a local-seed convenience, not something the app or Supabase Auth API does.

do $$
declare
  demo_user_id uuid := '00000000-0000-0000-0000-000000000001';
  demo_org_id uuid;
  demo_year_id uuid;
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token
  ) values (
    '00000000-0000-0000-0000-000000000000',
    demo_user_id,
    'authenticated',
    'authenticated',
    'owner@demo.school',
    crypt('password123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Demo Owner"}',
    now(), now(), '', ''
  );

  insert into auth.identities (
    id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(), demo_user_id, demo_user_id::text,
    format('{"sub":"%s","email":"owner@demo.school"}', demo_user_id)::jsonb,
    'email', now(), now(), now()
  );

  insert into public.organizations (name, slug)
  values ('Demo Academy', 'demo-academy')
  returning id into demo_org_id;

  insert into public.organization_members (organization_id, user_id, role)
  values (demo_org_id, demo_user_id, 'owner');

  update public.school_settings
  set timezone = 'Africa/Mogadishu',
      address = '123 Example Street, Demo City',
      phone = '+252-61-0000000',
      contact_email = 'owner@demo.school'
  where organization_id = demo_org_id;

  insert into public.academic_years (organization_id, name, start_date, end_date, is_current)
  values (demo_org_id, '2025/2026', '2025-09-01', '2026-06-30', true)
  returning id into demo_year_id;

  insert into public.terms (organization_id, academic_year_id, name, start_date, end_date)
  values
    (demo_org_id, demo_year_id, 'Term 1', '2025-09-01', '2025-12-19'),
    (demo_org_id, demo_year_id, 'Term 2', '2026-01-05', '2026-03-27'),
    (demo_org_id, demo_year_id, 'Term 3', '2026-04-13', '2026-06-30');

  insert into public.holidays (organization_id, academic_year_id, name, start_date, end_date)
  values
    (demo_org_id, demo_year_id, 'Winter Break', '2025-12-20', '2026-01-04'),
    (demo_org_id, demo_year_id, 'Spring Break', '2026-03-28', '2026-04-12');
end $$;
