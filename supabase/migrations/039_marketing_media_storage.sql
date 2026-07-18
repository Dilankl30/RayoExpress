-- RayoExpress | Migration 039: storage for home advertising media

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'marketing-media',
  'marketing-media',
  true,
  26214400,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'video/mp4',
    'video/webm',
    'video/quicktime'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "marketing_media_select" on storage.objects;
drop policy if exists "marketing_media_insert_admin" on storage.objects;
drop policy if exists "marketing_media_update_admin" on storage.objects;
drop policy if exists "marketing_media_delete_admin" on storage.objects;

create policy "marketing_media_select"
on storage.objects
for select
using (bucket_id = 'marketing-media');

create policy "marketing_media_insert_admin"
on storage.objects
for insert
with check (
  bucket_id = 'marketing-media'
  and public.current_user_is_admin()
);

create policy "marketing_media_update_admin"
on storage.objects
for update
using (
  bucket_id = 'marketing-media'
  and public.current_user_is_admin()
)
with check (
  bucket_id = 'marketing-media'
  and public.current_user_is_admin()
);

create policy "marketing_media_delete_admin"
on storage.objects
for delete
using (
  bucket_id = 'marketing-media'
  and public.current_user_is_admin()
);
