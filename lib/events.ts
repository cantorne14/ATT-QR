import { supabase } from './supabase';
import { buildQRPayload } from './qr';
import type { Role } from './profiles';

export type Event = {
  eventId: string;
  title: string;
  start: string;
  end: string;
  subjectId?: string | null;
  classEnd?: string | null;
};

export type CloudEvent = {
  id: string;
  event_code: string;
  title: string;
  start_time: string | null;
  end_time: string | null;
  created_by: string | null;
  created_at: string;
  subject_id?: string | null;
  class_end_time?: string | null;
};

export type EventQrPayload = {
  payload: string;
  persisted: boolean;
};

/**
 * Calculates Class End Time from Start Time + duration.
 */
export function addDuration(
  start: Date,
  durationMinutes: number
): Date | null {
  if (
    !Number.isFinite(start.getTime()) ||
    !Number.isFinite(durationMinutes) ||
    durationMinutes <= 0
  ) {
    return null;
  }

  return new Date(
    start.getTime() + Math.round(durationMinutes * 60 * 1000)
  );
}

export async function createEvent(
  event: Event
): Promise<{ error: string | null }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Please sign in again.' };
  }

  const { data: savedEvent, error } = await supabase
    .from('events')
    .upsert(
      {
        event_code: event.eventId,
        title: event.title,
        start_time: event.start || null,
        end_time: event.end || null,
        class_end_time: event.classEnd || null,
        created_by: user.id,
        subject_id: event.subjectId ?? null,
      },
      { onConflict: 'event_code' }
    )
    .select('id')
    .single();

  if (error) {
    return { error: error.message };
  }

  if (!savedEvent) {
    return { error: 'The event could not be saved.' };
  }

  const { error: qrError } = await supabase
    .from('event_qr_codes')
    .upsert(
      {
        event_id: savedEvent.id,
        payload: buildQRPayload(event),
      },
      { onConflict: 'event_id' }
    );

  return { error: qrError?.message ?? null };
}

export async function getEventsByTeacher(
  teacherId: string
): Promise<CloudEvent[]> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('created_by', teacherId)
    .order('created_at', { ascending: false });

  if (error || !data) {
    return [];
  }

  return data as CloudEvent[];
}

export async function getEventByCode(
  code: string
): Promise<CloudEvent | null> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('event_code', code)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as CloudEvent;
}

export async function getEventQrPayload(
  eventId: string,
  teacherId: string
): Promise<EventQrPayload | null> {
  const { data: qr } = await supabase
    .from('event_qr_codes')
    .select('payload')
    .eq('event_id', eventId)
    .maybeSingle();

  if (qr?.payload) {
    return {
      payload: qr.payload as string,
      persisted: true,
    };
  }

  const { data: event } = await supabase
    .from('events')
    .select('event_code, title, start_time, end_time')
    .eq('id', eventId)
    .eq('created_by', teacherId)
    .maybeSingle();

  if (!event) {
    return null;
  }

  return {
    payload: buildQRPayload({
      eventId: event.event_code,
      title: event.title,
      start: event.start_time ?? undefined,
      end: event.end_time ?? undefined,
    }),
    persisted: false,
  };
}

export type TodayClass = {
  id: string;
  event_code: string;
  title: string;
  start_time: string | null;
  end_time: string | null;
  class_end_time: string | null;
  subject_id: string | null;
  subject_name: string | null;
  teacher_name: string | null;
};

/**
 * Only Class End Time determines whether a class has ended.
 * Never use end_time because it controls QR expiration.
 *
 * Legacy classes with no class_end_time remain visible.
 */
function hasClassEnded(
  classEndTime: string | null | undefined,
  nowMs: number
): boolean {
  if (!classEndTime) {
    return false;
  }

  const endMs = new Date(classEndTime).getTime();

  if (!Number.isFinite(endMs)) {
    return false;
  }

  return nowMs >= endMs;
}

/**
 * Returns classes that are still visible on Home.
 *
 * Teachers see their own classes.
 * Students see only classes whose subjects they are enrolled in.
 * Classes are visible before Start Time and disappear after Class End Time.
 */
export async function getTodaysClasses(
  userId: string,
  role: Role
): Promise<{ classes: TodayClass[]; error: string | null }> {
  const now = new Date();
  const nowMs = now.getTime();

  // Include classes that started earlier today or on previous days,
  // provided their Class End Time has not passed.
  let query = supabase
    .from('events')
    .select(
      'id, event_code, title, start_time, end_time, class_end_time, subject_id, ' +
        'subjects(name, teacher_id, profiles!subjects_teacher_id_fkey(full_name))'
    )
    .lte('start_time', now.toISOString())
    .order('start_time', { ascending: true });

  if (role === 'teacher') {
    query = query.eq('created_by', userId);
  }

  const { data, error } = await query;

  if (error || !data) {
    return {
      classes: [],
      error: error?.message ?? 'Could not load classes.',
    };
  }

  let enrolled = new Set<string>();

  if (role === 'student') {
    const { data: rows, error: enrollmentError } = await supabase
      .from('subject_enrollments')
      .select('subject_id')
      .eq('student_id', userId);

    if (enrollmentError) {
      return {
        classes: [],
        error: enrollmentError.message,
      };
    }

    enrolled = new Set(
      (rows ?? []).map((row: { subject_id: string }) => row.subject_id)
    );
  }

  const classes = (data as any[])
    .filter(
      (row) =>
        role === 'teacher' ||
        (row.subject_id && enrolled.has(row.subject_id))
    )
    .filter(
      (row) => !hasClassEnded(row.class_end_time, nowMs)
    )
    .map((row) => ({
      id: row.id,
      event_code: row.event_code,
      title: row.title,
      start_time: row.start_time,
      end_time: row.end_time,
      class_end_time: row.class_end_time ?? null,
      subject_id: row.subject_id ?? null,
      subject_name: row.subjects?.name ?? null,
      teacher_name: row.subjects?.profiles?.full_name ?? null,
    })) as TodayClass[];

  return { classes, error: null };
}
