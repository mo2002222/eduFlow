
# EduFlow — Build Plan

A full educational management platform for Teachers and Students, built on the supported stack (TanStack Start + Lovable Cloud / Supabase Postgres + Storage). Messaging, global search, real-time, analytics, and AI are explicitly deferred per your scope-trim answers.

## Stack mapping (vs. your original spec)

| You asked for | We'll use |
|---|---|
| Node/Express APIs | TanStack `createServerFn` (RPC) |
| MongoDB / Mongoose | Postgres + RLS via Lovable Cloud |
| JWT + bcrypt + refresh tokens | Supabase Auth (handles all of this) |
| Cloudinary | Lovable Cloud Storage buckets |
| Redux Toolkit | TanStack Query (server state) + minimal local state |
| React Router | TanStack Router (file-based) |
| React Hook Form, Tailwind, Axios | React Hook Form, Tailwind v4, native fetch via server fns |

## Roles
- `teacher`, `student` — stored in a dedicated `user_roles` table (never on profiles, per security rules). Role chosen at registration.

## Database schema (Postgres)

```
profiles            id(uuid=auth.users.id), full_name, phone, grade_level, avatar_url
user_roles          id, user_id, role ('teacher'|'student')
groups              id, teacher_id, name, subject, grade, description, image_url, join_code (unique), created_at
group_members       id, group_id, student_id, joined_at  (unique on group_id+student_id)
sessions            id, group_id, number, title, description, date, start_time
attendance_records  id, session_id, student_id, status ('present'|'absent'), marked_at  (unique on session+student)
files               id, group_id, session_id?, uploader_id, name, path, mime, size, kind
assignments         id, group_id, title, description, due_date, attachments[]
assignment_submissions id, assignment_id, student_id, files[], submitted_at, grade?, feedback?
exams               id, group_id, session_id?, type ('quiz'|'exam'), title, description,
                    start_at, end_at, duration_minutes, total_marks, published_results
exam_questions      id, exam_id, order, type ('mcq'|'tf'|'short'), prompt, options jsonb, correct jsonb, marks
exam_submissions    id, exam_id, student_id, started_at, submitted_at, answers jsonb, score?, feedback?, status
grades              id, group_id, student_id, source ('exam'|'assignment'), source_id, score, max_score, feedback
notifications       id, user_id, type, title, body, link, read_at, created_at
```

All tables get RLS:
- Teachers: full CRUD on their own groups and everything under them.
- Students: read access only to groups they joined; write only their own submissions/attendance views.
- `has_role(uid, role)` security-definer function for role checks.

Storage buckets: `avatars` (public), `group-images` (public), `group-files` (private, RLS-gated), `assignment-submissions` (private).

## Pages & routes

```
/                              Landing (Register as Teacher/Student, Login)
/login
/register/teacher
/register/student
/forgot-password
/reset-password
/_authenticated/               Layout w/ sidebar, gated by Supabase session
  dashboard                    Role-aware (teacher vs student dashboard)
  groups                       List (teacher: own; student: joined)
  groups/new                   Teacher only
  groups/join                  Student: enter join code
  groups/$id                   Tabs: Overview | Sessions | Files | Assignments | Exams | Grades | Students
  groups/$id/sessions/$sid     Tabs: Info | Attendance | Files | Assignment | Quiz | Notes
  exams/$id/take               Student exam runner (timer, autosave, autosubmit)
  exams/$id/review             Teacher review + publish
  profile                      Personal info + (student) attendance %, results, timeline
  notifications                Inbox
  settings                     Theme (light/dark), password
```

## Server functions (high level)

Auth helpers, profile, roles, groups (create/edit/delete/join by code/list), sessions (CRUD + attendance mark/read), files (upload/list/delete via signed URLs), assignments (CRUD + submit + grade), exams (CRUD + questions + start/save/submit/autosubmit + auto-grade MCQ/TF + manual grade short answer + publish), grades (read aggregated by student), notifications (list/markRead, trigger inserts on new session/assignment/exam/grade).

All protected with `requireSupabaseAuth`; RLS is the backstop.

## UI/UX

- Modern educational design: clean sidebar shell, card-based dashboards, soft shadows, generous spacing.
- Tailwind v4 design tokens in `src/styles.css` (oklch). Brand: a calm indigo/teal palette with a warm accent.
- Dark/light mode toggle via `.dark` class + localStorage.
- shadcn components for forms, tables, dialogs, tabs, toasts.
- Loading skeletons + error boundaries on every route.
- Mobile-friendly (collapsible sidebar).

## Out of scope for v1 (per your answers)
- In-app messaging / inbox / broadcast
- Global cross-entity search
- Real-time / push updates (notifications are pull-based)
- Analytics & advanced reporting
- AI features
- Exam auto-grading of short-answer (manual only; MCQ + True/False auto-graded)

## Build order

1. Enable Lovable Cloud + migration for all tables, roles, RLS, storage buckets, triggers (profile + role on signup, join-code generator, notification triggers).
2. Auth pages + role-aware registration + auth state wiring + `_authenticated` layout with sidebar.
3. Teacher/Student dashboards with real aggregates.
4. Groups: create/edit/delete/list/join + group detail tab shell.
5. Sessions CRUD + attendance marking + history.
6. Files (group + session) with Lovable Cloud Storage.
7. Assignments (create/submit/grade).
8. Exams (builder, runner with timer/autosave/autosubmit, auto-grading, review/publish).
9. Grades aggregation + student profile timeline.
10. Notifications inbox + dark mode + polish.

## Notes on scope realism

This is genuinely a large app (10 feature areas, ~25 routes, ~14 tables). I'll build it end-to-end in this turn without placeholders, but expect some polish/edge-case iteration after you click through. If you'd rather I pause for review between phases, say so now — otherwise I'll proceed straight through.
