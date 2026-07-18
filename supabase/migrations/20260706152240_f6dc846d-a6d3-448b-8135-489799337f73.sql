
drop policy if exists "es student own update" on public.exam_submissions;
create policy "es student own update" on public.exam_submissions for update to authenticated
  using (student_id = auth.uid()) with check (student_id = auth.uid());

create table if not exists public.section_reads (
  user_id uuid not null references auth.users(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  section text not null,
  last_read_at timestamptz not null default now(),
  primary key (user_id, group_id, section)
);
grant select, insert, update, delete on public.section_reads to authenticated;
grant all on public.section_reads to service_role;
alter table public.section_reads enable row level security;
drop policy if exists "sr own all" on public.section_reads;
create policy "sr own all" on public.section_reads for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
