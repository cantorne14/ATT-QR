import { useState, useEffect, useSyncExternalStore } from 'react';
import { supabase } from './supabase';
import { getProfile, type Role } from './profiles';
import type { Session, User } from '@supabase/supabase-js';

type AuthState = {
  session: Session | null;
  user: User | null;
  loading: boolean;
};

let globalSession: Session | null = null;
let globalUser: User | null = null;
let globalLoading = true;

let listeners: Set<() => void> = new Set();
let initialized = false;
let cachedRole: { userId: string; role: Role } | null = null;

// Keep a stable snapshot so React can detect auth changes correctly.
let authSnapshot: AuthState = {
  session: globalSession,
  user: globalUser,
  loading: globalLoading,
};

function notify() {
  listeners.forEach((listener) => listener());
}

function subscribeToAuth(callback: () => void) {
  listeners.add(callback);

  return () => {
    listeners.delete(callback);
  };
}

function getAuthSnapshot(): AuthState {
  return authSnapshot;
}

export function setAuth(session: Session | null) {
  const nextUserId = session?.user?.id ?? null;

  if (cachedRole && cachedRole.userId !== nextUserId) {
    cachedRole = null;
  }

  globalSession = session;
  globalUser = session?.user ?? null;
  globalLoading = false;

  // Update the snapshot before notifying React.
  authSnapshot = {
    session: globalSession,
    user: globalUser,
    loading: globalLoading,
  };

  notify();
}

/**
 * Restores the persisted Supabase session and subscribes to auth changes.
 */
export function initAuth() {
  if (initialized) return;
  initialized = true;

  console.log('[Auth] Initializing...');

  supabase.auth.onAuthStateChange((_event, session) => {
    console.log('[Auth] Auth event:', _event);
    setAuth(session);
  });

  supabase.auth.getSession().then(
    ({ data, error }) => {
      if (error) {
        console.error('[Auth] Session restore error:', error.message);
        setAuth(null);
        return;
      }

      console.log(
        '[Auth] Restored session:',
        data.session ? 'Found' : 'None'
      );

      setAuth(data.session);
    },
    (error) => {
      console.error('[Auth] Session restore failed:', error);
      setAuth(null);
    }
  );
}

export function useAuth(): AuthState {
  return useSyncExternalStore(
    subscribeToAuth,
    getAuthSnapshot,
    getAuthSnapshot
  );
}

/**
 * Reads the signed-in user's role from the profiles table.
 */
export function useRole(): {
  role: Role | null;
  roleLoading: boolean;
} {
  const { user } = useAuth();

  const [state, setState] = useState<{
    userId: string | null;
    role: Role | null;
    loading: boolean;
  }>({
    userId: null,
    role: null,
    loading: true,
  });

  useEffect(() => {
    if (!user) {
      setState({
        userId: null,
        role: null,
        loading: false,
      });
      return;
    }

    if (cachedRole && cachedRole.userId === user.id) {
      setState({
        userId: user.id,
        role: cachedRole.role,
        loading: false,
      });
      return;
    }

    let active = true;

    setState({
      userId: user.id,
      role: null,
      loading: true,
    });

    getProfile(user.id)
      .then((profile) => {
        const role: Role = profile?.role ?? 'student';

        cachedRole = {
          userId: user.id,
          role,
        };

        if (active) {
          setState({
            userId: user.id,
            role,
            loading: false,
          });
        }
      })
      .catch((error) => {
        console.error('[Auth] Failed to load profile:', error);

        if (active) {
          setState({
            userId: user.id,
            role: 'student',
            loading: false,
          });
        }
      });

    return () => {
      active = false;
    };
  }, [user]);

  return {
    role: state.userId === (user?.id ?? null) ? state.role : null,
    roleLoading: user
      ? state.userId !== user.id || state.loading
      : false,
  };
}

export type SignUpProfile = {
  full_name: string;
  role: 'student' | 'teacher';
  department?: string;
};

export async function signUp(
  email: string,
  password: string,
  profile?: SignUpProfile
) {
  // Name, role and department travel as user metadata so the
  // `handle_new_user` database trigger can fill the profile row.
  // Writing them from the client instead would be rejected by the
  // role-escalation trigger.
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: profile
      ? {
          data: {
            full_name: profile.full_name,
            role: profile.role,
            department: profile.department ?? '',
          },
        }
      : undefined,
  });

  if (!error && data.session) {
    setAuth(data.session);
  }

  return { data, error };
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (!error && data.session) {
    setAuth(data.session);
  }

  return { data, error };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();

  setAuth(null);

  return { error: error ?? null };
}
