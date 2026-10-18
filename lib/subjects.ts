import { supabase } from './supabase';
import type { Role } from './profiles';

export type Subject = {
  id: string;
  teacher_id: string;
  name: string;
  department: string;
  subject_code: string | null;
  created_at: string;
  teacher_name?: string | null;
  enrolled?: boolean;
};

/**
 * Teachers see only their own subjects.
 * Students can browse all subjects and see their enrollment status.
 */
export async function getSubjects(
  userId: string,
  role: Role
): Promise<{ subjects: Subject[]; error: string | null }> {
  let query = supabase
    .from('subjects')
    .select(
      'id, teacher_id, name, department, subject_code, created_at, ' +
        'teacher:profiles!subjects_teacher_id_fkey(full_name)'
    )
    .order('name', { ascending: true });

  // IMPORTANT: Restrict teachers to their own subjects.
  if (role === 'teacher') {
    query = query.eq('teacher_id', userId);
  }

  const { data, error } = await query;

  if (error || !data) {
    return {
      subjects: [],
      error: error?.message ?? 'Could not load subjects.',
    };
  }

  let enrolledIds = new Set<string>();

  if (role === 'student') {
    const { data: enrolled, error: enrollmentError } = await supabase
      .from('subject_enrollments')
      .select('subject_id')
      .eq('student_id', userId);

    if (enrollmentError) {
      return { subjects: [], error: enrollmentError.message };
    }

    enrolledIds = new Set(
      (enrolled ?? []).map((row) => row.subject_id)
    );
  }

  const subjects = (data as any[]).map((row) => ({
    id: row.id,
    teacher_id: row.teacher_id,
    name: row.name,
    department: row.department,
    subject_code: row.subject_code,
    created_at: row.created_at,
    teacher_name: row.teacher?.full_name ?? null,
    enrolled:
      role === 'student' ? enrolledIds.has(row.id) : undefined,
  })) as Subject[];

  return { subjects, error: null };
}

/** Creates a subject owned by the signed-in teacher. */
export async function createSubject(input: {
  name: string;
  department: string;
  subject_code?: string;
}): Promise<{ error: string | null }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Please sign in again.' };
  }

  const { error } = await supabase.from('subjects').insert({
    teacher_id: user.id,
    name: input.name.trim(),
    department: input.department.trim(),
    subject_code: input.subject_code?.trim() || null,
  });

  return { error: error?.message ?? null };
}

export async function enrollInSubject(
  subjectId: string,
  studentId: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('subject_enrollments')
    .insert({
      subject_id: subjectId,
      student_id: studentId,
    });

  if (error?.code === '23505') {
    return { error: 'You are already enrolled in this subject.' };
  }

  return { error: error?.message ?? null };
}

export async function unenrollFromSubject(
  subjectId: string,
  studentId: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('subject_enrollments')
    .delete()
    .eq('subject_id', subjectId)
    .eq('student_id', studentId);

  return { error: error?.message ?? null };
}

export async function saveTeacherDepartment(
  userId: string,
  department: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('profiles')
    .update({ department: department.trim() })
    .eq('id', userId);

  return { error: error?.message ?? null };
}
