import { supabase } from './supabase';

/**
 * Admin dashboard totals for general school events.
 *
 * Subject and class attendance are excluded in the database: the
 * `get_admin_dashboard_stats` function only counts attendance rows that
 * belong to an event with no subject, so the client cannot request them
 * and no attendance row is ever sent to the device.
 */
export type AdminDashboardStats = {
  students: number;
  teachers: number;
  generalEvents: number;
  generalEventAttendance: number;
};

/**
 * Reads the four dashboard totals. The function is admin-only and is
 * enforced by the database, so a non-admin caller receives
 * `{ success: false }` instead of data.
 */
export async function getAdminDashboardStats(): Promise<{
  stats: AdminDashboardStats | null;
  error: string | null;
}> {
  const { data, error } = await supabase.rpc('get_admin_dashboard_stats');

  if (error) {
    console.error('[Admin] get_admin_dashboard_stats failed:', error.message);
    return { stats: null, error: error.message };
  }

  const result = (data ?? {}) as Partial<AdminDashboardStats> & {
    success?: boolean;
    message?: string;
  };

  if (result.success === false) {
    return {
      stats: null,
      error: result.message ?? 'Administrator access is required.',
    };
  }

  return {
    stats: {
      students: result.students ?? 0,
      teachers: result.teachers ?? 0,
      generalEvents: result.generalEvents ?? 0,
      generalEventAttendance: result.generalEventAttendance ?? 0,
    },
    error: null,
  };
}

/**
 * A student or teacher account, as shown in User Management.
 *
 * `admin` is not a member of this type on purpose: the admin list is
 * handled by a separate administrative view, and the database policy
 * only exposes `student` and `teacher` rows anyway.
 */
export type AdminUser = {
  id: string;
  full_name: string | null;
  email: string;
  role: 'student' | 'teacher';
};

/**
 * Reads the student and teacher accounts through the normal anon
 * client. Row Level Security decides what comes back: the
 * "Admins can view student and teacher profiles" policy lets an admin
 * read these rows and nothing else, and returns no rows at all for a
 * student or teacher caller. No service-role key is used.
 */
export async function getAdminUsers(): Promise<{
  users: AdminUser[];
  error: string | null;
}> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, role')
    .in('role', ['student', 'teacher'])
    .order('full_name', { ascending: true });

  if (error) {
    console.error('[Admin] Could not load users:', error.message);
    return { users: [], error: error.message };
  }

  if (!data) {
    return { users: [], error: null };
  }

  return { users: data as AdminUser[], error: null };
}

/** One general school event's attendance summary. */
export type GeneralEventReportRow = {
  eventId: string;
  title: string;
  startTime: string | null;
  endTime: string | null;
  records: number;
};

export type GeneralEventReport = {
  totalRecords: number;
  events: GeneralEventReportRow[];
};

/**
 * Reads the general-event attendance report, optionally limited to
 * attendance scanned between `from` and `to` (ISO strings).
 *
 * Subject and class attendance is filtered out in the database with
 * the same `events.subject_id is null` test the dashboard uses, so the
 * unfiltered `totalRecords` is the same number as the dashboard's
 * `generalEventAttendance`. Aggregates only: no attendance row is
 * returned to the device.
 */
export async function getGeneralEventAttendanceReport(
  from?: string | null,
  to?: string | null
): Promise<{ report: GeneralEventReport | null; error: string | null }> {
  const { data, error } = await supabase.rpc(
    'get_general_event_attendance_report',
    {
      p_from: from ?? null,
      p_to: to ?? null,
    }
  );

  if (error) {
    console.error('[Admin] Report query failed:', error.message);
    return { report: null, error: error.message };
  }

  const result = (data ?? {}) as Partial<GeneralEventReport> & {
    success?: boolean;
    message?: string;
  };

  if (result.success === false) {
    return {
      report: null,
      error: result.message ?? 'Administrator access is required.',
    };
  }

  return {
    report: {
      totalRecords: result.totalRecords ?? 0,
      events: result.events ?? [],
    },
    error: null,
  };
}