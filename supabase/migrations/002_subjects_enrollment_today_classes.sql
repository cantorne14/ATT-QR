-- ============================================================
-- Migration 002 — Teacher departments, subjects, enrollment,
-- event-to-subject linking, and server-enforced attendance
--
-- Purpose: let teachers own a subject list, let students optionally
-- enroll in those subjects, link events to a subject, and enforce
-- the enrollment check on the server when a QR code is scanned.
--
-- Safety:
--   * Additive only for the new subject features. Existing events,
--     attendance rows and profiles are preserved.
--   * Legacy events whose `subject_id` is null stay scannable by any
--     student. Events linked to a subject require enrollment.
--   * Idempotent: can be run multiple times safely.
--
-- BREAKING CHANGE (intentional):
--   * The direct client insert policy on `attendance` is removed.
--     Attendance must go through `register_qr_attendance`, which
--     checks the signed-in user's student role, the event window, the
--     subject enrollment and duplicates before inserting.
--   * Scanning a QR code that is not linked to a saved event no longer
--     auto-creates that event. The teacher must create it first.
--
-- HOW TO RUN:
--   1. Back up the database (Supabase Dashboard -> Database -> Backups)
--   2. Supabase Dashboard -> SQL Editor
--   3. Paste this file, click "Run"
-- ============================================================

begin;

alter table public.profiles
  add column if not exists department text;

alter table public.events
  add column if not exists subject_id uuid;

-- Keep new sign-ups' name, role, and teacher department in the profile row.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role, department)
  values (
    new.id,
    coalesce(new.email, ''),
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    case when new.raw_user_meta_data ->> 'role' = 'teacher' then 'teacher' else 'student' end,
    nullif(new.raw_user_meta_data ->> 'department', '')
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(public.profiles.full_name, excluded.full_name),
    role = coalesce(public.profiles.role, excluded.role),
    department = coalesce(public.profiles.department, excluded.department);
  return new;
end;
$$;

-- Prevent a normal signed-in user from changing their own role to teacher.
create or replace function public.prevent_profile_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and old.role is distinct from new.role then
    raise exception 'Profile role cannot be changed by the client.';
  end if;
  return new;
end;
$$;
drop trigger if exists prevent_profile_role_escalation_trigger on public.profiles;
create trigger prevent_profile_role_escalation_trigger
  before update on public.profiles
  for each row execute function public.prevent_profile_role_escalation();

create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  department text not null,
  subject_code text,
  created_at timestamptz not null default now(),
  constraint subjects_teacher_name_unique unique (teacher_id, name)
);

alter table public.subjects enable row level security;

create table if not exists public.subject_enrollments (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  enrolled_at timestamptz not null default now(),
  constraint subject_enrollments_unique unique (subject_id, student_id)
);

alter table public.subject_enrollments enable row level security;

-- Add FK only if it does not already exist. PostgREST embeds `subjects` in
-- event queries through this constraint name, so it must stay stable.
do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'events_subject_id_fkey'
      and conrelid = 'public.events'::regclass
  ) then
    alter table public.events
      add constraint events_subject_id_fkey
      foreign key (subject_id) references public.subjects(id) on delete set null;
  end if;
end $$;

create index if not exists subjects_teacher_id_idx on public.subjects(teacher_id);
create index if not exists subject_enrollments_student_id_idx on public.subject_enrollments(student_id);
create index if not exists events_subject_id_idx on public.events(subject_id);

-- A signed-in user may read the teacher profile details displayed beside subjects.
drop policy if exists "Authenticated users can view teacher profiles" on public.profiles;
create policy "Authenticated users can view teacher profiles"
  on public.profiles for select to authenticated
  using (role = 'teacher');

-- Subjects are browseable by signed-in users. Only their owning teacher may manage them.
drop policy if exists "Authenticated users can browse subjects" on public.subjects;
create policy "Authenticated users can browse subjects"
  on public.subjects for select to authenticated
  using (true);

drop policy if exists "Teachers can create their own subjects" on public.subjects;
create policy "Teachers can create their own subjects"
  on public.subjects for insert to authenticated
  with check (
    teacher_id = auth.uid()
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'teacher')
  );

drop policy if exists "Teachers can update their own subjects" on public.subjects;
create policy "Teachers can update their own subjects"
  on public.subjects for update to authenticated
  using (teacher_id = auth.uid())
  with check (teacher_id = auth.uid());

drop policy if exists "Teachers can delete their own subjects" on public.subjects;
create policy "Teachers can delete their own subjects"
  on public.subjects for delete to authenticated
  using (teacher_id = auth.uid());

-- Students can see their own enrollments; a teacher can see enrollments in their subjects.
drop policy if exists "Users can read relevant subject enrollments" on public.subject_enrollments;
create policy "Users can read relevant subject enrollments"
  on public.subject_enrollments for select to authenticated
  using (
    student_id = auth.uid()
    or exists (
      select 1 from public.subjects s
      where s.id = subject_enrollments.subject_id and s.teacher_id = auth.uid()
    )
  );

drop policy if exists "Students can enroll themselves" on public.subject_enrollments;
create policy "Students can enroll themselves"
  on public.subject_enrollments for insert to authenticated
  with check (
    student_id = auth.uid()
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'student')
  );

drop policy if exists "Students can unenroll themselves" on public.subject_enrollments;
create policy "Students can unenroll themselves"
  on public.subject_enrollments for delete to authenticated
  using (student_id = auth.uid());

-- Teachers can only attach their own subject to events they create.
-- Remove the older permissive insert policy so it cannot bypass this check.
drop policy if exists "Users can insert events" on public.events;
drop policy if exists "Teachers can create events for their own subjects" on public.events;
create policy "Teachers can create events for their own subjects"
  on public.events for insert to authenticated
  with check (
    created_by = auth.uid()
    and (subject_id is null or exists (
      select 1 from public.subjects s where s.id = subject_id and s.teacher_id = auth.uid()
    ))
  );

drop policy if exists "Users can update their own events" on public.events;
drop policy if exists "Teachers can update events for their own subjects" on public.events;
create policy "Teachers can update events for their own subjects"
  on public.events for update to authenticated
  using (created_by = auth.uid())
  with check (
    created_by = auth.uid()
    and (subject_id is null or exists (
      select 1 from public.subjects s where s.id = subject_id and s.teacher_id = auth.uid()
    ))
  );

-- Critical: remove direct client inserts. Attendance must go through the RPC below.
drop policy if exists "Students can insert their own attendance" on public.attendance;

create or replace function public.register_qr_attendance(p_event_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile_role text;
  v_event public.events%rowtype;
  v_subject_name text;
  v_teacher_name text;
begin
  if v_user_id is null then
    return jsonb_build_object('success', false, 'code', 'not_signed_in', 'message', 'Please sign in to scan.');
  end if;

  select role into v_profile_role from public.profiles where id = v_user_id;
  if v_profile_role is distinct from 'student' then
    return jsonb_build_object('success', false, 'code', 'students_only', 'message', 'QR scanning is available for student accounts only.');
  end if;

  select * into v_event
  from public.events
  where event_code = trim(p_event_code)
  limit 1;

  if not found then
    return jsonb_build_object('success', false, 'code', 'event_not_found', 'message', 'This QR code is not linked to a saved event. Ask your teacher to reopen or recreate the event QR code.');
  end if;

  if v_event.start_time is not null and now() < v_event.start_time then
    return jsonb_build_object('success', false, 'code', 'not_started', 'message', 'Event has not started yet.');
  end if;
  if v_event.end_time is not null and now() > v_event.end_time then
    return jsonb_build_object('success', false, 'code', 'ended', 'message', 'Event has already ended.');
  end if;

  -- Legacy events without a subject remain usable. Subject-linked events require enrollment.
  if v_event.subject_id is not null then
    if not exists (
      select 1 from public.subject_enrollments se
      where se.subject_id = v_event.subject_id and se.student_id = v_user_id
    ) then
      select s.name, p.full_name into v_subject_name, v_teacher_name
      from public.subjects s
      left join public.profiles p on p.id = s.teacher_id
      where s.id = v_event.subject_id;
      return jsonb_build_object(
        'success', false,
        'code', 'subject_not_enrolled',
        'subjectName', coalesce(v_subject_name, 'this subject'),
        'teacherName', coalesce(v_teacher_name, 'your teacher'),
        'eventTitle', v_event.title,
        'message', 'Subject Not Added! You have not enrolled in ' || coalesce(v_subject_name, 'this subject') || ' with ' || coalesce(v_teacher_name, 'your teacher') || '. Please add this subject in your Subjects tab before recording attendance.'
      );
    end if;
  end if;

  insert into public.attendance (student_id, event_id)
  values (v_user_id, v_event.id)
  on conflict (student_id, event_id) do nothing;

  if not found then
    return jsonb_build_object('success', false, 'code', 'already_registered', 'eventTitle', v_event.title, 'message', 'Already registered for this event.');
  end if;

  return jsonb_build_object('success', true, 'code', 'recorded', 'eventTitle', v_event.title, 'message', 'Attendance recorded!');
end;
$$;

revoke all on function public.register_qr_attendance(text) from public;
grant execute on function public.register_qr_attendance(text) to authenticated;

commit;