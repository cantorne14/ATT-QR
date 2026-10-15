-- ============================================================
-- Migration 001 — Persist teacher QR codes
--
-- Purpose: let a teacher reopen the QR code of any event they
-- created, including after signing out or restarting the app.
--
-- Safety:
--   * Adds ONE new table. No existing table, column, row, policy
--     or attendance record is modified or removed.
--   * Idempotent: can be run multiple times safely.
--   * Events created before this migration keep working; their QR
--     code is rebuilt from the event row until the event is saved
--     again.
--
-- HOW TO RUN:
--   1. Supabase Dashboard -> SQL Editor
--   2. Paste this file, click "Run"
-- ============================================================

create table if not exists public.event_qr_codes (
  event_id uuid primary key references public.events (id) on delete cascade,
  payload text not null,
  created_at timestamptz not null default now()
);

alter table public.event_qr_codes enable row level security;

-- Only the teacher who created the event can read its QR payload.
drop policy if exists "Teachers can read their own event QR codes" on public.event_qr_codes;
create policy "Teachers can read their own event QR codes"
  on public.event_qr_codes for select
  using (
    exists (
      select 1 from public.events e
      where e.id = event_qr_codes.event_id
        and e.created_by = auth.uid()
    )
  );

-- Only the teacher who created the event can store its QR payload.
drop policy if exists "Teachers can insert their own event QR codes" on public.event_qr_codes;
create policy "Teachers can insert their own event QR codes"
  on public.event_qr_codes for insert
  with check (
    exists (
      select 1 from public.events e
      where e.id = event_qr_codes.event_id
        and e.created_by = auth.uid()
    )
  );

-- Needed when a teacher re-saves an event that already has a QR payload.
drop policy if exists "Teachers can update their own event QR codes" on public.event_qr_codes;
create policy "Teachers can update their own event QR codes"
  on public.event_qr_codes for update
  using (
    exists (
      select 1 from public.events e
      where e.id = event_qr_codes.event_id
        and e.created_by = auth.uid()
    )
  );