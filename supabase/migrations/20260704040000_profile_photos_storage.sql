-- Private bucket for student/teacher profile photos. Objects live under
-- `${organization_id}/students/...` or `${organization_id}/teachers/...`.
-- No select policy: reads are always minted server-side as signed URLs via
-- the admin client, never read directly by clients.

insert into storage.buckets (id, name, public)
values ('profile-photos', 'profile-photos', false)
on conflict (id) do nothing;

create policy "Admins can upload profile photos for their school"
  on storage.objects for insert
  with check (
    bucket_id = 'profile-photos'
    and public.is_org_admin(((storage.foldername(name))[1])::uuid)
  );

create policy "Admins can replace profile photos for their school"
  on storage.objects for update
  using (
    bucket_id = 'profile-photos'
    and public.is_org_admin(((storage.foldername(name))[1])::uuid)
  );

create policy "Admins can delete profile photos for their school"
  on storage.objects for delete
  using (
    bucket_id = 'profile-photos'
    and public.is_org_admin(((storage.foldername(name))[1])::uuid)
  );
