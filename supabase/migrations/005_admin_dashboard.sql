-- ============================================================
-- Migration 005 — Admin dashboard totals (general events only)
--
-- Purpose: let an `admin` profile read the four dashboard totals
-- without widening access to individual rows.
--
-- Why a migration is required:
--   * `attendance` is readable only by the student who owns a row
--     or by a teacher for their own events, so no admin can count it.
--   * `profiles` is readable only as the caller's own row (plus
--     teacher rows, which are readable by everyone signed in), so
--     an admin cannot count students.
--   * `events` is already readable by any authenticated user.
--
-- What this does NOT change:
--   * No table, column, row or existing policy is touched.
--   * No admin gains row-level read access to `profiles` or
--     `attendance`; this returns four numbers only.
--   * Student and teacher permissions are unchanged.
--   * Subject / class attendance is excluded by the same
--     `subject_id is null` test the app already uses to label an
--     event "General event" (see app/(tabs)/teacher.tsx).
--
-- How general and subject events are distinguished:
--   events.subject_id is null      -> general school event
--   events.subject_id is not null  -> subject / class event
--   The predicate lives inside the function, so the client cannot
--   ask for subject attendance.
--
-- Safety: Idempotent, safe to run more than once.
--
-- HOW TO RUN:
--   1. Supabase Dashboard -> SQL Editor
--   2. Paste this file, click "Run"
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1. is_admin()
-- Reads the caller's role with elevated privileges so a policy or
-- function on `profiles` can test it without recursing through the
-- RLS policies of `profiles` itself.
-- Returns false for signed-out callers.
-- ------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- ------------------------------------------------------------
-- 2. get_admin_dashboard_stats()
-- Returns the four Admin dashboard totals as jsonb:
--   students              -> profiles with role = 'student'
--   teachers              -> profiles with role = 'teacher'
--   generalEvents         -> events with no subject
--   generalEventAttendance-> attendance rows of those events only
--
-- Same response convention as `register_qr_attendance`:
-- { success: false, code, message } when the caller is not an admin.
-- ------------------------------------------------------------
create or replace function public.get_admin_dashboard_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    return jsonb_build_object(
      'success', false,
      'code', 'not_admin',
      'message', 'Administrator access is required.'
    );
  end if;

  return jsonb_build_object(
    'success', true,
    'students', (
      select count(*) from public.profiles where role = 'student'
    ),
    'teachers', (
      select count(*) from public.profiles where role = 'teacher'
    ),
    'generalEvents', (
      select count(*) from public.events where subject_id is null
    ),
    'generalEventAttendance', (
      select count(*)
      from public.attendance a
      join public.events e on e.id = a.event_id
      where e.subject_id is null
    )
  );
end;
$$;

revoke all on function public.get_admin_dashboard_stats() from public;
grant execute on function public.get_admin_dashboard_stats() to authenticated;

commit;

-- ============================================================
-- Verify (optional, from the SQL Editor)
--
--   select public.get_admin_dashboard_stats();
--
--   The SQL editor runs as the database owner, so the true counts can
--   be compared directly:
--
--   select
--     (select count(*) from public.events where subject_id is null)
--       as general_events,
--     (select count(*) from public.events where subject_id is not null)
--       as subject_events,
--     (select count(*)
--        from public.attendance a
--        join public.events e on e.id = a.event_id
--       where e.subject_id is null) as general_attendance,
--     (select count(*)
--        from public.attendance a
--        join public.events e on e.id = a.event_id
--       where e.subject_id is not null) as subject_attendance;
--
--   `generalEvents` and `generalEventAttendance` must match the first
--   and third values only, and must stay smaller than the subject
--   columns whenever subject classes exist.
-- ============================================================