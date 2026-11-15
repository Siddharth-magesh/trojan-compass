// Per-device storage: the conversation index per demo student and checklist ticks per conversation.
import { useSyncExternalStore } from 'react';

export type conversation_entry = { session_id: string; title: string; updated_at: string; has_checklist: boolean };

const prefix = 'trojan_compass.';
const listeners = new Set<() => void>();
const snapshots = new Map<string, { raw: string | null; value: unknown }>();

function notify(): void {
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const on_storage = (e: StorageEvent) => {
    if (e.key?.startsWith(prefix)) listener();
  };
  window.addEventListener('storage', on_storage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', on_storage);
  };
}

function read_raw(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

// Returns the same object while the stored string is unchanged, as useSyncExternalStore requires.
function read<T>(key: string, fallback: T): T {
  const raw = read_raw(key);
  const cached = snapshots.get(key);
  if (cached && cached.raw === raw) return cached.value as T;
  let value: T = fallback;
  if (raw) {
    try {
      value = JSON.parse(raw) as T;
    } catch {
      value = fallback;
    }
  }
  snapshots.set(key, { raw, value });
  return value;
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or blocked: the UI keeps working without persistence */
  }
  notify();
}

const empty_list: conversation_entry[] = [];
const empty_ticks: Record<string, boolean> = {};
const conversations_key = (student_id: string) => prefix + 'conversations.' + student_id;

export function use_conversations(student_id: string | null): conversation_entry[] {
  const list = useSyncExternalStore(subscribe, () => (student_id ? read(conversations_key(student_id), empty_list) : empty_list));
  return list;
}

export function upsert_conversation(student_id: string, entry: conversation_entry): void {
  const list = read(conversations_key(student_id), empty_list).filter((c) => c.session_id !== entry.session_id);
  const previous = read(conversations_key(student_id), empty_list).find((c) => c.session_id === entry.session_id);
  const merged = { ...entry, title: previous?.title ?? entry.title, has_checklist: entry.has_checklist || Boolean(previous?.has_checklist) };
  write(conversations_key(student_id), [merged, ...list]);
}

export function remove_conversation(student_id: string, session_id: string): void {
  write(conversations_key(student_id), read(conversations_key(student_id), empty_list).filter((c) => c.session_id !== session_id));
}

export function checklist_scope(student_id: string | null, session_id: string | null, title: string): string {
  return prefix + 'checklist.' + (student_id ?? 'guest') + '.' + (session_id ?? 'draft') + '.' + title.toLowerCase().replace(/\s+/g, '_');
}

export function use_checked_items(scope: string): Record<string, boolean> {
  return useSyncExternalStore(subscribe, () => read(scope, empty_ticks));
}

export function toggle_checked_item(scope: string, item_id: string): void {
  const current = read(scope, empty_ticks);
  write(scope, { ...current, [item_id]: !current[item_id] });
}
