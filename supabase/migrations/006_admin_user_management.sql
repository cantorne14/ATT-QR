-- ============================================================
-- Migration 006 — Admin user management (read only)
--
-- Purpose: let an `admin` read the profile rows of students and
-- teachers so User Management can list them. Nothing else.
--
-- Why a migration is required:
--   `profiles` is readable today only as the caller's own row, plus
--   teacher rows (readable by any signed-in user) and the attendees
--   of a teacher's own events. An admin therefore cannot read a
--   single student row, so the list cannot be built without this.
--
-- What this does NOT change:
--   * No table, column, row or function is modified.
--   * The policy is SELECT only. Admin accounts cannot be edited,
--     deleted, promoted or demoted from the app.
--   * Only `student` and `teacher` rows are exposed, so an admin
--     cannot read another admin's profile either.
--   * Students and teachers are unaffected: `public.is_admin()`
--     is false for them, and every existing policy stays in place.
--   * `is_admin()` is `security definer`, so testing the role inside
--     a policy on `profiles` does not recurse through this table's
--     RLS.
--
-- Safety: Idempotent, safe to run more than once.
-- Requires: migrations/005 (defines public.is_admin).
--
-- HOW TO RUN:
--   1. Supabase Dashboard -> SQL Editor
--   2. Paste this file, click "Run"
-- ============================================================

begin;

drop policy if exists "Admins can view student and teacher profiles" on public.profiles;
create policy "Admins can view student and teacher profiles"
  on public.profiles for select to authenticated
  using (public.is_admin() and profiles.role in ('student', 'teacher'));

commit;

-- ============================================================
-- Verify (optional)
--
--   -- Policies now on public.profiles:
--   select policyname, cmd, qual
--   from pg_policies
--   where schemaname = 'public' and tablename = 'profiles'
--   order by policyname;
--
--   The new row must show cmd = 'SELECT'. In the app, sign in as the
--   admin: User Management lists students and teachers. Signed in as
--   a student or teacher the screen must show "Admins Only" and the
--   query must return no rows.
-- ============================================================