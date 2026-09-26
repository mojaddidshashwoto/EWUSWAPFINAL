-- Profile management extension for avatar uploads and field-level visibility.
-- Depends on the namespaced Skill Swap migrations.

do $$ begin
  alter table public.ss_profile_privacy add column show_skills boolean not null default true;
  alter table public.ss_profile_privacy add column show_email boolean not null default false;
exception when duplicate_column then null; end $$;

insert into storage.buckets (id, name, public)
values ('ss-profile-avatars', 'ss-profile-avatars', true)
on conflict (id) do update set public = true;

drop policy if exists ss_profile_avatars_public_read on storage.objects;
create policy ss_profile_avatars_public_read on storage.objects
for select using (bucket_id = 'ss-profile-avatars');

drop policy if exists ss_profile_avatars_owner_insert on storage.objects;
create policy ss_profile_avatars_owner_insert on storage.objects
for insert to authenticated
with check (bucket_id = 'ss-profile-avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists ss_profile_avatars_owner_update on storage.objects;
create policy ss_profile_avatars_owner_update on storage.objects
for update to authenticated
using (bucket_id = 'ss-profile-avatars' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'ss-profile-avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists ss_profile_avatars_owner_delete on storage.objects;
create policy ss_profile_avatars_owner_delete on storage.objects
for delete to authenticated
using (bucket_id = 'ss-profile-avatars' and (storage.foldername(name))[1] = auth.uid()::text);
