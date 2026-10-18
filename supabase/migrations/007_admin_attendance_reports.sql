 -- ============================================================
-- Migration 007 — Admin attendance report for general events
--
-- Purpose: give an admin a per-event attendance summary for general
-- school events, plus one overall total. Read only, no rows returned.
--
-- Why a migration is required:
--   `attendance` is readable only by the student who owns a row or by
--   a teacher for their own events, so an admin cannot read it at all.
--   Returning aggregates instead of rows keeps the exposure as small
--   as the dashboard's.
--
-- Subject separation (the important rule):
--   Every query below requires `e.subject_id is null`, the same test
--   the app already uses to label an event "General event" and the
--   same test used by `get_admin_dashboard_stats`. Subject and class
--   attendance therefore cannot appear in this report, and with no
--   date filter the `totalRecords` value equals the dashboard's
--   `generalEventAttendance` for the same data.
--
-- What this does NOT change:
--   * No table, column, row, policy or function is modified.
--   * No admin gains row-level access to `attendance`.
--   * Teacher reports, subject attendance and QR scanning are
--     untouched; the teachers' own queries are unchanged.
--
-- Arguments:
--   p_from / p_to  optional bounds on `attendance.scanned_at`.
--                   NULL means unbounded on that side.
--
-- Safety: Idempotent, safe to run more than once.
-- Requires: migrations/005 (defines public.is_admin).
--
-- HOW TO RUN:
--   1. Supabase Dashboard -> SQL Editor
--   2. Paste this file, click "Run"
-- ============================================================

begin;

create or replace function public.get_general_event_attendance_report(
  p_from timestamptz default null,
  p_to timestamptz default null
)
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

    -- Overall general-event attendance, same filter as the dashboard.
    'totalRecords', (
      select count(*)
      from public.attendance a
      join public.events e on e.id = a.event_id
      where e.subject_id is null
        and (p_from is null or a.scanned_at >= p_from)
        and (p_to is null or a.scanned_at <= p_to)
    ),

    -- One summary per general event that has records in the range.
    'events', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'eventId', e.id,
          'title', e.title,
          'startTime', e.start_time,
          'endTime', e.end_time,
          'records', count(a.id)
        )
        order by e.start_time desc nulls last, e.title
      )
      from public.events e
      join public.attendance a on a.event_id = e.id
      where e.subject_id is null
        and (p_from is null or a.scanned_at >= p_from)
        and (p_to is null or a.scanned_at <= p_to)
      group by e.id, e.title, e.start_time, e.end_time
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.get_general_event_attendance_report(timestamptz, timestamptz) from public;
grant execute on function public.get_general_event_attendance_report(timestamptz, timestamptz) to authenticated;

commit;

-- ============================================================
-- Verify (optional, from the SQL Editor)
--
--   select public.get_general_event_attendance_report();
--
--   `totalRecords` must equal the dashboard's
--   `generalEventAttendance`, and must be smaller than this whenever
--   subject classes exist:
--
--   select count(*) as subject_attendance
--   from public.attendance a
--   join public.events e on e.id = a.event_id
--   where e.subject_id is not null;
--
--   Date range check (records scanned inside the range only):
--
--   select public.get_general_event_attendance_report(
--     '2026-01-01T00:00:00Z', '2026-12-31T23:59:59Z');
-- ============================================================