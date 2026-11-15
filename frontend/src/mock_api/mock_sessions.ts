// Mock session persistence in localStorage, scoped by demo student.
import type { session_message, session_response } from '@/lib/api_types';

type stored_session = session_response & { pending: string | null };
const storage_key = 'trojan_compass.mock.sessions';

function read_all(): Record<string, stored_session> {
  try {
    return JSON.parse(localStorage.getItem(storage_key) ?? '{}') as Record<string, stored_session>;
  } catch {
    return {};
  }
}

export function create_session_id(): string {
  return 'sess_' + Math.random().toString(36).slice(2, 10);
}

export function read_session(student_id: string, session_id: string): stored_session | null {
  return read_all()[student_id + ':' + session_id] ?? null;
}

export function append_message(student_id: string, session_id: string, message: session_message, pending: string | null): void {
  const all = read_all();
  const key = student_id + ':' + session_id;
  const current = all[key] ?? { session_id, messages: [], pending: null };
  all[key] = { session_id, messages: [...current.messages, message], pending: message.role === 'assistant' ? pending : current.pending };
  localStorage.setItem(storage_key, JSON.stringify(all));
}
