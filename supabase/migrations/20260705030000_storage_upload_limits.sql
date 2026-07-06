-- Enforce image-only, 5MB-max uploads at the storage layer as a backstop for
-- the app-level checks in validateImageFile() (src/lib/validations/image-upload.ts)
-- neither bucket had a file_size_limit/allowed_mime_types set before this.

update storage.buckets
set file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id in ('school-logos', 'profile-photos');
