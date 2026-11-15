// Demo identity: signs in as a synthetic student, keeps the token for this browser tab and restores it on reload.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { student_profile } from '@/lib/api_types';
import { fetch_profile, login } from '@/lib/api_client';

type auth_ctx = {
  student: student_profile | null;
  token: string | null;
  checking: boolean;
  login_open: boolean;
  set_login_open: (open: boolean) => void;
  sign_in: (student_id: string) => Promise<void>;
  sign_out: () => void;
};

const storage_key = 'trojan_compass.auth';
const AuthContext = createContext<auth_ctx | null>(null);

function read_token(): string | null {
  try {
    return sessionStorage.getItem(storage_key);
  } catch {
    return null;
  }
}

function write_token(token: string | null): void {
  try {
    if (token) sessionStorage.setItem(storage_key, token);
    else sessionStorage.removeItem(storage_key);
  } catch {
    /* storage blocked: the session lasts until reload */
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, set_token] = useState<string | null>(read_token);
  const [student, set_student] = useState<student_profile | null>(null);
  const [checking, set_checking] = useState<boolean>(() => read_token() !== null);
  const [login_open, set_login_open] = useState(false);

  // Restore a stored session: the profile always comes from the server for the token, never from storage.
  useEffect(() => {
    const stored = read_token();
    if (!stored) return;
    let cancelled = false;
    fetch_profile(stored)
      .then((p) => {
        if (!cancelled) set_student(p);
      })
      .catch(() => {
        if (cancelled) return;
        write_token(null);
        set_token(null);
      })
      .finally(() => {
        if (!cancelled) set_checking(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const sign_in = useCallback(async (student_id: string) => {
    const res = await login(student_id);
    write_token(res.access_token);
    set_token(res.access_token);
    set_student(res.student);
    set_checking(false);
    set_login_open(false);
  }, []);

  const sign_out = useCallback(() => {
    write_token(null);
    set_token(null);
    set_student(null);
  }, []);

  const value = useMemo<auth_ctx>(
    () => ({ student, token, checking, login_open, set_login_open, sign_in, sign_out }),
    [student, token, checking, login_open, sign_in, sign_out],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function use_auth(): auth_ctx {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('use_auth must be used inside AuthProvider');
  return ctx;
}
