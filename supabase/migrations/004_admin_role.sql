-- ============================================================
-- Migration 004 — Add the `admin` profile role
--
-- Purpose: let `public.profiles.role` store a third value, `admin`,
-- so a manually created Supabase Auth account can be recognised by
-- the app. No admin screens or permissions are added here.
--
-- What this does NOT change:
--   * No new table, no new column, no new policy on other tables.
--   * No existing row is updated: every current student/teacher
--     profile keeps its role.
--   * Sign-up behaviour is unchanged. `handle_new_user` still maps
--     every metadata role other than 'teacher' to 'student', so a
--     public registration can never become an admin.
--   * No admin gets broader access. Existing Row Level Security
--     policies stay exactly as they were, and an admin profile only
--     reads its own row like everyone else.
--
-- How `admin` is granted:
--   Manually, by the project owner, through the Supabase dashboard.
--   See the "Create the first admin account" steps at the bottom of
--   this file.
--
-- Safety:
--   * The old CHECK is replaced by a slightly wider one. Every value
--     that was valid before ('student', 'teacher') is still valid, so
--     this cannot fail on existing data.
--   * Idempotent: safe to run multiple times.
--
-- HOW TO RUN:
--   1. Supabase Dashboard -> SQL Editor
--   2. Paste this file, click "Run"
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1. Widen the role CHECK so 'admin' is an accepted value.
-- The original CHECK was declared inline on the column, so
-- PostgreSQL named it `profiles_role_check`.
-- ------------------------------------------------------------
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('student', 'teacher', 'admin'));

-- ------------------------------------------------------------
-- 2. Close the only remaining self-promotion path.
--
-- `prevent_profile_role_escalation` already blocks UPDATEs, but the
-- insert policy only verified that the row belonged to the caller.
-- Now that 'admin' exists, a signed-in user whose profile row was
-- missing could have inserted their own row with role = 'admin'.
-- The policy below is the smallest fix: an ordinary account may
-- only create a student or teacher profile for itself. Promotion
-- to 'admin' stays a manual, owner-only action done from the
-- dashboard, where RLS does not apply to the SQL editor.
-- ------------------------------------------------------------
drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id and role in ('student', 'teacher'));

commit;

-- ============================================================
-- Create the first admin account (manual, owner only)
--
-- Do this from the Supabase dashboard, NOT from the app.
--
-- STEP 1 — Create the authentication user
--   Dashboard -> Authentication -> Users -> "Add user"
--     Email:      the admin's real address
--     Password:   a strong password you type yourself
--     Tick "Auto Confirm User" so the account can sign in
--     (otherwise it must confirm via email first)
--   Click "Create user".
--
-- STEP 2 — Copy the generated UUID
--   Stay on the Users list and copy the new row's User UID. It looks
--   like 00000000-0000-0000-0000-000000000000. Do not type it by
--   hand and never paste it into the app source code.
--
-- STEP 3 — Point that profile at the admin role
--   Dashboard -> SQL Editor -> paste the block below, replace
--   <ADMIN_USER_UUID> with the UID from step 2, then "Run".
--
--   insert into public.profiles (id, email, full_name, role)
--   values (
--     '<ADMIN_USER_UUID>',
--     'admin@example.com',
--     'System Administrator',
--     'admin'
--   )
--   on conflict (id) do update set
--     role = excluded.role,
--     full_name = coalesce(public.profiles.full_name, excluded.full_name);
--
--   `on conflict (id) do update` is deliberate: if the
--   `handle_new_user` trigger already created the profile row when
--   the user was added, this promotes that same row instead of
--   failing or creating a duplicate. The `id` is the primary key and
--   references `auth.users (id)`, so a mismatch is impossible.
--
--   Replace 'admin@example.com' with the same email used in step 1
--   so the stored email matches the login.
--
-- STEP 4 — Verify
--   Dashboard -> Table Editor -> public.profiles, find the row, and
--   confirm `role` reads `admin`.
--
-- STEP 5 — Sign in
--   Open the app's existing Sign In screen and log in with that
--   email and password. The app reads the role from this profile
--   row, so no new screen is needed.
--
-- The SQL editor runs with elevated database privileges and is not
-- reachable from the Expo app, so no service-role key is involved
-- and no credential is added to the repository.
-- ============================================================