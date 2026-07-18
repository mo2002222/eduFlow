
-- Add meeting_url to sessions
alter table public.sessions add column if not exists meeting_url text;

-- Storage policies for group-files (private bucket)
drop policy if exists "group-files teacher write" on storage.objects;
drop policy if exists "group-files teacher update" on storage.objects;
drop policy if exists "group-files teacher delete" on storage.objects;
drop policy if exists "group-files member read" on storage.objects;

create policy "group-files teacher write" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'group-files'
    and public.is_group_teacher( (split_part(name, '/', 1))::uuid, auth.uid() )
  );
create policy "group-files teacher delete" on storage.objects for delete to authenticated
  using (
    bucket_id = 'group-files'
    and public.is_group_teacher( (split_part(name, '/', 1))::uuid, auth.uid() )
  );
create policy "group-files member read" on storage.objects for select to authenticated
  using (
    bucket_id = 'group-files'
    and (
      public.is_group_teacher( (split_part(name, '/', 1))::uuid, auth.uid() )
      or public.is_group_member( (split_part(name, '/', 1))::uuid, auth.uid() )
    )
  );

-- Storage policies for assignment-submissions (private bucket): path = {group_id}/{assignment_id}/{user_id}/...
drop policy if exists "asg-sub student write" on storage.objects;
drop policy if exists "asg-sub student read own" on storage.objects;
drop policy if exists "asg-sub teacher read" on storage.objects;

create policy "asg-sub student write" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'assignment-submissions'
    and split_part(name, '/', 3) = auth.uid()::text
  );
create policy "asg-sub student read own" on storage.objects for select to authenticated
  using (
    bucket_id = 'assignment-submissions'
    and (
      split_part(name, '/', 3) = auth.uid()::text
      or public.is_group_teacher( (split_part(name, '/', 1))::uuid, auth.uid() )
    )
  );
