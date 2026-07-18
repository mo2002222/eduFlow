
-- ============= ENUMS =============
create type public.app_role as enum ('teacher','student');
create type public.attendance_status as enum ('present','absent');
create type public.exam_kind as enum ('quiz','exam');
create type public.question_type as enum ('mcq','tf','short');
create type public.submission_status as enum ('in_progress','submitted','graded');
create type public.grade_source as enum ('exam','assignment');

-- ============= PROFILES =============
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text not null default '',
  phone text,
  grade_level text,
  avatar_url text,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
create policy "profiles self read" on public.profiles for select to authenticated using (true);
create policy "profiles self update" on public.profiles for update to authenticated using (id = auth.uid());
create policy "profiles self insert" on public.profiles for insert to authenticated with check (id = auth.uid());

-- ============= USER ROLES =============
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  unique(user_id, role)
);
alter table public.user_roles enable row level security;
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
create policy "roles read all auth" on public.user_roles for select to authenticated using (true);

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.user_roles where user_id=_user_id and role=_role)
$$;

-- ============= SIGNUP TRIGGER =============
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare _role app_role;
begin
  insert into public.profiles (id, full_name, email, phone, grade_level)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name',''),
    coalesce(new.email,''),
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'grade_level'
  );
  _role := coalesce((new.raw_user_meta_data->>'role')::app_role, 'student'::app_role);
  insert into public.user_roles (user_id, role) values (new.id, _role);
  return new;
end $$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============= GROUPS =============
create or replace function public.gen_join_code(_subject text)
returns text language plpgsql as $$
declare prefix text; suffix text;
begin
  prefix := upper(regexp_replace(coalesce(nullif(_subject,''),'GRP'),'[^A-Za-z]','','g'));
  if length(prefix) < 3 then prefix := rpad(prefix,3,'X'); end if;
  prefix := substring(prefix from 1 for 4);
  suffix := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 6));
  return prefix || '-' || suffix;
end $$;

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  subject text not null default '',
  grade text not null default '',
  description text,
  image_url text,
  join_code text not null unique default public.gen_join_code('GRP'),
  created_at timestamptz not null default now()
);
create index on public.groups(teacher_id);
alter table public.groups enable row level security;
grant select, insert, update, delete on public.groups to authenticated;
grant all on public.groups to service_role;

create table public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  unique(group_id, student_id)
);
create index on public.group_members(student_id);
alter table public.group_members enable row level security;
grant select, insert, delete on public.group_members to authenticated;
grant all on public.group_members to service_role;

-- helpers
create or replace function public.is_group_teacher(_group_id uuid, _user uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.groups where id=_group_id and teacher_id=_user)
$$;
create or replace function public.is_group_member(_group_id uuid, _user uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.group_members where group_id=_group_id and student_id=_user)
$$;

-- groups RLS
create policy "groups teacher all" on public.groups for all to authenticated
  using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());
create policy "groups student read joined" on public.groups for select to authenticated
  using (public.is_group_member(id, auth.uid()));

-- group_members RLS
create policy "gm teacher manage" on public.group_members for all to authenticated
  using (public.is_group_teacher(group_id, auth.uid()))
  with check (public.is_group_teacher(group_id, auth.uid()));
create policy "gm student self insert" on public.group_members for insert to authenticated
  with check (student_id = auth.uid());
create policy "gm student self read" on public.group_members for select to authenticated
  using (student_id = auth.uid() or public.is_group_teacher(group_id, auth.uid()));
create policy "gm student self delete" on public.group_members for delete to authenticated
  using (student_id = auth.uid());

-- ============= SESSIONS =============
create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  number int not null default 1,
  title text not null,
  description text,
  date date not null default current_date,
  start_time time not null default '09:00',
  notes text,
  created_at timestamptz not null default now()
);
create index on public.sessions(group_id);
alter table public.sessions enable row level security;
grant select, insert, update, delete on public.sessions to authenticated;
grant all on public.sessions to service_role;
create policy "sessions teacher all" on public.sessions for all to authenticated
  using (public.is_group_teacher(group_id, auth.uid()))
  with check (public.is_group_teacher(group_id, auth.uid()));
create policy "sessions member read" on public.sessions for select to authenticated
  using (public.is_group_member(group_id, auth.uid()));

-- ============= ATTENDANCE =============
create table public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  status attendance_status not null,
  marked_at timestamptz not null default now(),
  unique(session_id, student_id)
);
create index on public.attendance_records(student_id);
alter table public.attendance_records enable row level security;
grant select, insert, update, delete on public.attendance_records to authenticated;
grant all on public.attendance_records to service_role;

create or replace function public.session_group(_session_id uuid)
returns uuid language sql stable security definer set search_path=public as $$
  select group_id from public.sessions where id=_session_id
$$;

create policy "att teacher all" on public.attendance_records for all to authenticated
  using (public.is_group_teacher(public.session_group(session_id), auth.uid()))
  with check (public.is_group_teacher(public.session_group(session_id), auth.uid()));
create policy "att student self read" on public.attendance_records for select to authenticated
  using (student_id = auth.uid());

-- ============= FILES =============
create table public.files (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  session_id uuid references public.sessions(id) on delete cascade,
  uploader_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  path text not null,
  bucket text not null default 'group-files',
  mime text,
  size bigint,
  created_at timestamptz not null default now()
);
create index on public.files(group_id);
alter table public.files enable row level security;
grant select, insert, update, delete on public.files to authenticated;
grant all on public.files to service_role;
create policy "files teacher all" on public.files for all to authenticated
  using (public.is_group_teacher(group_id, auth.uid()))
  with check (public.is_group_teacher(group_id, auth.uid()));
create policy "files member read" on public.files for select to authenticated
  using (public.is_group_member(group_id, auth.uid()));

-- ============= ASSIGNMENTS =============
create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  session_id uuid references public.sessions(id) on delete cascade,
  title text not null,
  description text,
  due_date timestamptz,
  total_marks int not null default 100,
  created_at timestamptz not null default now()
);
create index on public.assignments(group_id);
alter table public.assignments enable row level security;
grant select, insert, update, delete on public.assignments to authenticated;
grant all on public.assignments to service_role;
create policy "asg teacher all" on public.assignments for all to authenticated
  using (public.is_group_teacher(group_id, auth.uid()))
  with check (public.is_group_teacher(group_id, auth.uid()));
create policy "asg member read" on public.assignments for select to authenticated
  using (public.is_group_member(group_id, auth.uid()));

create table public.assignment_submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  content text,
  files jsonb not null default '[]'::jsonb,
  submitted_at timestamptz not null default now(),
  grade numeric,
  feedback text,
  graded_at timestamptz,
  unique(assignment_id, student_id)
);
create index on public.assignment_submissions(student_id);
alter table public.assignment_submissions enable row level security;
grant select, insert, update, delete on public.assignment_submissions to authenticated;
grant all on public.assignment_submissions to service_role;

create or replace function public.assignment_group(_aid uuid)
returns uuid language sql stable security definer set search_path=public as $$
  select group_id from public.assignments where id=_aid
$$;

create policy "sub teacher manage" on public.assignment_submissions for all to authenticated
  using (public.is_group_teacher(public.assignment_group(assignment_id), auth.uid()))
  with check (public.is_group_teacher(public.assignment_group(assignment_id), auth.uid()));
create policy "sub student own read" on public.assignment_submissions for select to authenticated
  using (student_id = auth.uid());
create policy "sub student own write" on public.assignment_submissions for insert to authenticated
  with check (student_id = auth.uid());
create policy "sub student own update" on public.assignment_submissions for update to authenticated
  using (student_id = auth.uid() and graded_at is null);

-- ============= EXAMS =============
create table public.exams (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  session_id uuid references public.sessions(id) on delete cascade,
  kind exam_kind not null default 'exam',
  title text not null,
  description text,
  start_at timestamptz not null,
  end_at timestamptz not null,
  duration_minutes int not null default 60,
  total_marks int not null default 100,
  published_results boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.exams(group_id);
alter table public.exams enable row level security;
grant select, insert, update, delete on public.exams to authenticated;
grant all on public.exams to service_role;
create policy "exam teacher all" on public.exams for all to authenticated
  using (public.is_group_teacher(group_id, auth.uid()))
  with check (public.is_group_teacher(group_id, auth.uid()));
create policy "exam member read" on public.exams for select to authenticated
  using (public.is_group_member(group_id, auth.uid()));

create table public.exam_questions (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams(id) on delete cascade,
  ord int not null default 0,
  type question_type not null,
  prompt text not null,
  options jsonb not null default '[]'::jsonb,
  correct jsonb,
  marks int not null default 1
);
create index on public.exam_questions(exam_id);
alter table public.exam_questions enable row level security;
grant select, insert, update, delete on public.exam_questions to authenticated;
grant all on public.exam_questions to service_role;

create or replace function public.exam_group(_eid uuid)
returns uuid language sql stable security definer set search_path=public as $$
  select group_id from public.exams where id=_eid
$$;

create policy "eq teacher all" on public.exam_questions for all to authenticated
  using (public.is_group_teacher(public.exam_group(exam_id), auth.uid()))
  with check (public.is_group_teacher(public.exam_group(exam_id), auth.uid()));
create policy "eq member read" on public.exam_questions for select to authenticated
  using (public.is_group_member(public.exam_group(exam_id), auth.uid()));

create table public.exam_submissions (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  answers jsonb not null default '{}'::jsonb,
  auto_score numeric,
  manual_score numeric,
  score numeric,
  feedback text,
  status submission_status not null default 'in_progress',
  unique(exam_id, student_id)
);
create index on public.exam_submissions(student_id);
alter table public.exam_submissions enable row level security;
grant select, insert, update, delete on public.exam_submissions to authenticated;
grant all on public.exam_submissions to service_role;
create policy "es teacher all" on public.exam_submissions for all to authenticated
  using (public.is_group_teacher(public.exam_group(exam_id), auth.uid()))
  with check (public.is_group_teacher(public.exam_group(exam_id), auth.uid()));
create policy "es student own read" on public.exam_submissions for select to authenticated
  using (student_id = auth.uid());
create policy "es student own write" on public.exam_submissions for insert to authenticated
  with check (student_id = auth.uid());
create policy "es student own update" on public.exam_submissions for update to authenticated
  using (student_id = auth.uid() and status <> 'graded');

-- ============= GRADES =============
create table public.grades (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  source grade_source not null,
  source_id uuid not null,
  score numeric not null,
  max_score numeric not null,
  feedback text,
  created_at timestamptz not null default now(),
  unique(source, source_id, student_id)
);
create index on public.grades(student_id);
alter table public.grades enable row level security;
grant select, insert, update, delete on public.grades to authenticated;
grant all on public.grades to service_role;
create policy "grades teacher all" on public.grades for all to authenticated
  using (public.is_group_teacher(group_id, auth.uid()))
  with check (public.is_group_teacher(group_id, auth.uid()));
create policy "grades student own read" on public.grades for select to authenticated
  using (student_id = auth.uid());

-- ============= NOTIFICATIONS =============
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index on public.notifications(user_id, created_at desc);
alter table public.notifications enable row level security;
grant select, insert, update, delete on public.notifications to authenticated;
grant all on public.notifications to service_role;
create policy "notif own read" on public.notifications for select to authenticated
  using (user_id = auth.uid());
create policy "notif own update" on public.notifications for update to authenticated
  using (user_id = auth.uid());
create policy "notif insert auth" on public.notifications for insert to authenticated
  with check (true);

-- ============= NOTIFICATION TRIGGERS =============
create or replace function public.notify_group_members(_group uuid, _type text, _title text, _body text, _link text)
returns void language plpgsql security definer set search_path=public as $$
begin
  insert into public.notifications(user_id, type, title, body, link)
  select gm.student_id, _type, _title, _body, _link
  from public.group_members gm where gm.group_id = _group;
end $$;

create or replace function public.on_session_insert() returns trigger language plpgsql security definer set search_path=public as $$
begin
  perform public.notify_group_members(new.group_id, 'session', 'New session: ' || new.title, new.description, '/groups/' || new.group_id::text);
  return new;
end $$;
create trigger trg_session_notify after insert on public.sessions for each row execute function public.on_session_insert();

create or replace function public.on_assignment_insert() returns trigger language plpgsql security definer set search_path=public as $$
begin
  perform public.notify_group_members(new.group_id, 'assignment', 'New assignment: ' || new.title, new.description, '/groups/' || new.group_id::text);
  return new;
end $$;
create trigger trg_assignment_notify after insert on public.assignments for each row execute function public.on_assignment_insert();

create or replace function public.on_exam_insert() returns trigger language plpgsql security definer set search_path=public as $$
begin
  perform public.notify_group_members(new.group_id, 'exam', 'New ' || new.kind || ': ' || new.title, new.description, '/groups/' || new.group_id::text);
  return new;
end $$;
create trigger trg_exam_notify after insert on public.exams for each row execute function public.on_exam_insert();

create or replace function public.on_grade_insert() returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.notifications(user_id, type, title, body, link)
  values(new.student_id, 'grade', 'New grade posted', 'You received ' || new.score || '/' || new.max_score, '/groups/' || new.group_id::text);
  return new;
end $$;
create trigger trg_grade_notify after insert on public.grades for each row execute function public.on_grade_insert();

-- ============= STORAGE BUCKETS =============
insert into storage.buckets (id, name, public) values
  ('avatars','avatars',true),
  ('group-images','group-images',true),
  ('group-files','group-files',false),
  ('assignment-submissions','assignment-submissions',false)
on conflict (id) do nothing;

-- Avatars: own folder
create policy "avatars public read" on storage.objects for select using (bucket_id='avatars');
create policy "avatars own write" on storage.objects for insert to authenticated
  with check (bucket_id='avatars' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "avatars own update" on storage.objects for update to authenticated
  using (bucket_id='avatars' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "avatars own delete" on storage.objects for delete to authenticated
  using (bucket_id='avatars' and auth.uid()::text = (storage.foldername(name))[1]);

-- Group images: teachers write; public read
create policy "group-images public read" on storage.objects for select using (bucket_id='group-images');
create policy "group-images auth write" on storage.objects for insert to authenticated
  with check (bucket_id='group-images');
create policy "group-images auth update" on storage.objects for update to authenticated
  using (bucket_id='group-images');
create policy "group-images auth delete" on storage.objects for delete to authenticated
  using (bucket_id='group-images');

-- Group files: bucket-level auth (row policy on public.files governs visibility; downloads use signed URLs)
create policy "group-files auth read" on storage.objects for select to authenticated using (bucket_id='group-files');
create policy "group-files auth write" on storage.objects for insert to authenticated with check (bucket_id='group-files');
create policy "group-files auth update" on storage.objects for update to authenticated using (bucket_id='group-files');
create policy "group-files auth delete" on storage.objects for delete to authenticated using (bucket_id='group-files');

-- Assignment submissions
create policy "asg-sub auth read" on storage.objects for select to authenticated using (bucket_id='assignment-submissions');
create policy "asg-sub auth write" on storage.objects for insert to authenticated with check (bucket_id='assignment-submissions');
create policy "asg-sub auth update" on storage.objects for update to authenticated using (bucket_id='assignment-submissions');
create policy "asg-sub auth delete" on storage.objects for delete to authenticated using (bucket_id='assignment-submissions');
