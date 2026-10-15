-- ============================================================
-- Migration 003 — Separate class end time for Home visibility
--
-- Purpose: give an event its own "class end" time so a class leaves
-- the Home screen when the class is over, instead of being tied to
-- the QR code expiration time stored in `end_time`.
--
-- `end_time` keeps controlling QR code expiration and is NOT changed
-- here. `register_qr_attendance` is not touched.
--
-- Safety:
--   * Adds ONE nullable column and ONE index.
--   * No existing table, column, row, policy or attendance record is
--     modified or removed.
--   * Idempotent: can be run multiple times safely.
--   * Existing events keep a NULL `class_end_time`, which the app
--     reads as "no class end configured", so they stay listed on Home
--     exactly as they do today. Nothing is backfilled from `end_time`.
--
-- HOW TO RUN:
--   1. Supabase Dashboard -> SQL Editor
--   2. Paste this file, click "Run"
-- ============================================================

begin;

alter table public.events
  add column if not exists class_end_time timestamptz;

create index if not exists events_class_end_time_idx
  on public.events(class_end_time);

commit;