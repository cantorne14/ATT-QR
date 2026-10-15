import { supabase } from './supabase';
import { parseQRPayload } from './qr';

export type AttendanceRecord = {
  id: string;
  eventId: string;
  eventTitle: string;
  scannedAt: string;
};

export type RegisterResult = {
  success: boolean;
  message: string;
  eventTitle?: string;
  /** Machine-readable reason the scan was refused, e.g. 'subject_not_enrolled'. */
  code?: string;
  /** Only present when code is 'subject_not_enrolled'. */
  subjectName?: string;
  teacherName?: string;
};

export type TeacherEventAttendance = {
  eventId: string;
  eventCode: string;
  title: string;
  startTime: string | null;
  endTime: string | null;
  attendeeCount: number;
  attendees: {
    studentId: string;
    studentName: string | null;
    scannedAt: string;
  }[];
};

export type TeacherEventSummary = {
  eventId: string;
  eventCode: string;
  title: string;
  attendeeCount: number;
};

/**
 * Records attendance for a scanned QR code.
 *
 * The payload is parsed on-device only to reject malformed codes. Role,
 * event window, subject enrollment and duplicate checks are all enforced by
 * the `register_qr_attendance` RPC, which is the only writer allowed to
 * insert into `attendance`.
 */
export async function registerAttendance(
  rawPayload: string,
  studentId: string
): Promise<RegisterResult> {
  const parsed = parseQRPayload(rawPayload);
  if (!parsed.ok) {
    return { success: false, message: parsed.message };
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== studentId) {
    return { success: false, message: 'Please sign in again before scanning.' };
  }

  const { data, error } = await supabase.rpc('register_qr_attendance', {
    p_event_code: parsed.payload.event,
  });

  if (error) {
    console.error('[Attendance] register_qr_attendance failed:', error.message);
    return { success: false, message: 'Could not verify attendance. Please try again.' };
  }

  const result = (data ?? {}) as {
    success?: boolean;
    message?: string;
    eventTitle?: string;
    code?: string;
    subjectName?: string;
    teacherName?: string;
  };

  return {
    success: Boolean(result.success),
    message: result.message ?? 'Could not verify this QR code. Please try again.',
    eventTitle: result.eventTitle,
    code: result.code,
    subjectName: result.subjectName,
    teacherName: result.teacherName,
  };
}

export async function getAttendanceHistory(
  studentId: string
): Promise<AttendanceRecord[]> {
  const { data, error } = await supabase
    .from('attendance')
    .select('id, scanned_at, events ( event_code, title )')
    .eq('student_id', studentId)
    .order('scanned_at', { ascending: false });

  if (error || !data) {
    return [];
  }

  return data.map((row: any) => ({
    id: row.id,
    eventId: row.events?.event_code ?? '',
    eventTitle: row.events?.title ?? '',
    scannedAt: row.scanned_at,
  }));
}

export async function getTeacherEventAttendance(
  teacherId: string
): Promise<TeacherEventAttendance[]> {
  const { data: events, error: eventError } = await supabase
    .from('events')
    .select('id, event_code, title, start_time, end_time')
    .eq('created_by', teacherId)
    .order('created_at', { ascending: false });

  if (eventError || !events) return [];

  const eventIds = events.map((e: any) => e.id);
  if (eventIds.length === 0) return [];

  const { data: attendance } = await supabase
    .from('attendance')
    .select('student_id, scanned_at, event_id')
    .in('event_id', eventIds)
    .order('scanned_at', { ascending: false });

  const att = attendance ?? [];

  // Fetch profiles for attendee names (uses RLS: Teachers can view profiles of their attendees)
  const studentIds = [...new Set(att.map((a: any) => a.student_id as string))];
  let profileMap: Record<string, string | null> = {};
  if (studentIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', studentIds);
    if (profiles) {
      for (const p of profiles as any[]) {
        profileMap[p.id] = p.full_name ?? null;
      }
    }
    for (const a of att as any[]) {
      if (a.profiles?.full_name && !profileMap[a.student_id]) {
        profileMap[a.student_id] = a.profiles.full_name;
      }
    }
  }

  return events.map((e: any) => {
    const rows = att.filter((a: any) => a.event_id === e.id);
    return {
      eventId: e.id,
      eventCode: e.event_code,
      title: e.title,
      startTime: e.start_time,
      endTime: e.end_time,
      attendeeCount: rows.length,
      attendees: rows.map((a: any) => ({
        studentId: a.student_id,
        studentName: profileMap[a.student_id] ?? a.profiles?.full_name ?? null,
        scannedAt: a.scanned_at,
      })),
    };
  });
}

export async function getTeacherEventSummary(
  teacherId: string
): Promise<TeacherEventSummary[]> {
  const { data: events, error: eventError } = await supabase
    .from('events')
    .select('id, event_code, title')
    .eq('created_by', teacherId)
    .order('created_at', { ascending: false });

  if (eventError || !events) return [];

  const eventIds = events.map((e: any) => e.id);
  if (eventIds.length === 0) return [];

  const { data: attRows } = await supabase
    .from('attendance')
    .select('event_id')
    .in('event_id', eventIds);

  const counts: Record<string, number> = {};
  (attRows ?? []).forEach((r: any) => {
    counts[r.event_id] = (counts[r.event_id] ?? 0) + 1;
  });

  return events.map((e: any) => ({
    eventId: e.id,
    eventCode: e.event_code,
    title: e.title,
    attendeeCount: counts[e.id] ?? 0,
  }));
}
