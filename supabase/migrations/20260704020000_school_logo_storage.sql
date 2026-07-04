-- Storage bucket for school logos. Objects are stored under `${organization_id}/...`.

insert into storage.buckets (id, name, public)
values ('school-logos', 'school-logos', true)
on conflict (id) do nothing;

create policy "Anyone can view school logos"
  on storage.objects for select
  using (bucket_id = 'school-logos');

create policy "Admins can upload their school's logo"
  on storage.objects for insert
  with check (
    bucket_id = 'school-logos'
    and public.is_org_admin(((storage.foldername(name))[1])::uuid)
  );

create policy "Admins can replace their school's logo"
  on storage.objects for update
  using (
    bucket_id = 'school-logos'
    and public.is_org_admin(((storage.foldername(name))[1])::uuid)
  );

create policy "Admins can delete their school's logo"
  on storage.objects for delete
  using (
    bucket_id = 'school-logos'
    and public.is_org_admin(((storage.foldername(name))[1])::uuid)
  );
