import { supabase } from './supabase';

/**
 * `admin` is assigned manually by the project owner through the Supabase
 * dashboard. It is never offered during sign-up, and the database rejects
 * any client attempt to create or change a profile into that role.
 */
export type Role = 'student' | 'teacher' | 'admin';

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: Role;
  /** Teacher department. Null for students and for teachers who have not set it. */
  department: string | null;
};

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, department')
    .eq('id', userId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as Profile;
}

/**
 * `role` is intentionally absent: it is assigned at sign-up by the
 * `handle_new_user` trigger, and a database trigger rejects any client
 * update that would change it.
 */
export async function updateProfile(
  userId: string,
  updates: { full_name?: string }
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId);

  return { error: error?.message ?? null };
}
