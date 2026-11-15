// Conversation state: sends messages, turns the SSE stream (session, status, answer_delta, final, clarification, error)
// into assistant turns, restores past sessions and tracks which answer's sources are shown.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLocation } from 'wouter';
import type { clarification_event, error_code, final_response, session_message, status_event } from '@/lib/api_types';
import { api_error, fetch_session, open_chat_stream, read_sse } from '@/lib/api_client';
import { use_auth } from '@/lib/auth_provider';
import type { activity_step, assistant_message, chat_message, ui_error } from '@/lib/chat_types';
import { upsert_conversation } from '@/lib/local_store';

type focus_state = { message_id: string; citation_id: number; nonce: number } | null;

type chat_ctx = {
  messages: chat_message[];
  session_id: string | null;
  streaming: boolean;
  loading_session: boolean;
  load_error: string | null;
  selected_id: string | null;
  focus: focus_state;
  send: (text: string) => boolean;
  stop: () => void;
  regenerate: () => void;
  new_chat: () => void;
  open_session: (session_id: string) => void;
  set_feedback: (message_id: string, value: 'up' | 'down' | null) => void;
  select_message: (message_id: string) => void;
  focus_citation: (message_id: string, citation_id: number) => void;
};

const ChatContext = createContext<chat_ctx | null>(null);
const server_errors: error_code[] = ['rate_limited', 'upstream_failed', 'guard_blocked', 'unknown'];

let counter = 0;
const uid = (p: string) => p + '_' + Date.now().toString(36) + '_' + (counter++).toString(36);

function from_history(m: session_message): chat_message {
  if (m.role === 'user') return { id: uid('u'), role: 'user', content: m.content };
  const base: assistant_message = { id: uid('a'), role: 'assistant', phase: 'done', steps: [], delta_text: '', from_history: true };
  return m.final ? { ...base, final: m.final } : { ...base, clarification: { question: m.content } };
}

function last_answer_id(list: chat_message[]): string | null {
  for (let i = list.length - 1; i >= 0; i--) {
    const m = list[i];
    if (m.role === 'assistant' && m.final) return m.id;
  }
  return null;
}

export function ChatProvider({ children }: { children: ReactNode }) {
  const { token, student, set_login_open } = use_auth();
  const [, navigate] = useLocation();
  const student_id = student?.student_id ?? null;

  const [messages, set_messages] = useState<chat_message[]>([]);
  const [session_id, set_session_id] = useState<string | null>(null);
  const [streaming, set_streaming] = useState(false);
  const [loading_session, set_loading_session] = useState(false);
  const [load_error, set_load_error] = useState<string | null>(null);
  const [selected_id, set_selected_id] = useState<string | null>(null);
  const [focus, set_focus] = useState<focus_state>(null);

  const abort_ref = useRef<AbortController | null>(null);
  const session_ref = useRef<string | null>(null);
  const generation = useRef(0);
  const messages_ref = useRef(messages);
  messages_ref.current = messages;

  const clear = useCallback(() => {
    generation.current++;
    abort_ref.current?.abort();
    abort_ref.current = null;
    session_ref.current = null;
    set_messages([]);
    set_session_id(null);
    set_streaming(false);
    set_loading_session(false);
    set_load_error(null);
    set_selected_id(null);
    set_focus(null);
  }, []);

  // A conversation belongs to one demo student: switching or signing out starts fresh.
  const owner = useRef(student_id);
  useEffect(() => {
    if (owner.current !== student_id) {
      if (owner.current !== null) clear();
      owner.current = student_id;
    }
  }, [student_id, clear]);

  const update_assistant = useCallback((id: string, fn: (m: assistant_message) => assistant_message) => {
    set_messages((list) => list.map((m) => (m.id === id && m.role === 'assistant' ? fn(m) : m)));
  }, []);

  const run = useCallback(
    (text: string, prior: chat_message[]) => {
      if (!token || !student_id) return;
      const user: chat_message = { id: uid('u'), role: 'user', content: text };
      const asst_id = uid('a');
      set_messages([...prior, user, { id: asst_id, role: 'assistant', phase: 'streaming', steps: [], delta_text: '' }]);
      set_streaming(true);
      const ctrl = new AbortController();
      abort_ref.current = ctrl;
      const gen = generation.current;
      const started = performance.now();
      const elapsed = () => Math.round(performance.now() - started);
      const fail = (error: ui_error) => update_assistant(asst_id, (m) => ({ ...m, phase: 'error', error, duration_ms: elapsed() }));

      void (async () => {
        let finished = false;
        try {
          const res = await open_chat_stream(token, text, session_ref.current, ctrl.signal);
          if (res.status === 429) return fail({ code: 'rate_limited' });
          if (res.status === 401) return fail({ code: 'unknown', message: 'Your demo session expired. Choose a demo student again.' });
          if (!res.ok) return fail({ code: 'unknown' });
          for await (const { event, data } of read_sse(res)) {
            if (gen !== generation.current) return;
            if (event === 'session') {
              const sid = (data as { session_id: string }).session_id;
              upsert_conversation(student_id, { session_id: sid, title: text.slice(0, 80), updated_at: new Date().toISOString(), has_checklist: false });
              if (session_ref.current !== sid) {
                session_ref.current = sid;
                set_session_id(sid);
                navigate('/c/' + sid);
              }
            } else if (event === 'status') {
              const s = data as status_event;
              const step: activity_step = { node: s.node, state: s.state, label: s.label, elapsed_ms: s.elapsed_ms };
              update_assistant(asst_id, (m) => {
                const exists = m.steps.some((x) => x.node === step.node);
                return { ...m, steps: exists ? m.steps.map((x) => (x.node === step.node ? step : x)) : [...m.steps, step] };
              });
            } else if (event === 'answer_delta') {
              const t = (data as { text: string }).text;
              update_assistant(asst_id, (m) => ({ ...m, delta_text: m.delta_text + t }));
            } else if (event === 'final') {
              const final = data as final_response;
              finished = true;
              update_assistant(asst_id, (m) => ({ ...m, phase: 'done', final, duration_ms: elapsed() }));
              set_selected_id(asst_id);
              if (session_ref.current) {
                upsert_conversation(student_id, {
                  session_id: session_ref.current, title: text.slice(0, 80), updated_at: new Date().toISOString(),
                  has_checklist: final.cards.some((c) => c.type === 'checklist'),
                });
              }
            } else if (event === 'clarification') {
              finished = true;
              const clarification = data as clarification_event;
              update_assistant(asst_id, (m) => ({ ...m, phase: 'done', clarification, duration_ms: elapsed() }));
            } else if (event === 'error') {
              finished = true;
              const e = data as { code?: string; message?: string };
              const code = server_errors.includes(e.code as error_code) ? (e.code as error_code) : 'unknown';
              fail({ code, message: e.message });
            }
          }
          if (!finished && gen === generation.current) fail({ code: 'network' });
        } catch {
          if (gen !== generation.current) return;
          if (ctrl.signal.aborted) update_assistant(asst_id, (m) => ({ ...m, phase: 'cancelled', duration_ms: elapsed() }));
          else fail({ code: 'network' });
        } finally {
          if (abort_ref.current === ctrl) {
            abort_ref.current = null;
            set_streaming(false);
          }
        }
      })();
    },
    [token, student_id, navigate, update_assistant],
  );

  const send = useCallback(
    (text: string) => {
      const message = text.trim();
      if (!message) return false;
      if (!token || !student) {
        set_login_open(true);
        return false;
      }
      if (abort_ref.current) return false;
      run(message, messages_ref.current);
      return true;
    },
    [token, student, set_login_open, run],
  );

  const stop = useCallback(() => abort_ref.current?.abort(), []);

  const regenerate = useCallback(() => {
    if (abort_ref.current) return;
    const list = messages_ref.current;
    let i = list.length - 1;
    while (i >= 0 && list[i].role !== 'user') i--;
    if (i < 0) return;
    const last = list[i];
    if (last.role === 'user') run(last.content, list.slice(0, i));
  }, [run]);

  const new_chat = useCallback(() => {
    clear();
    navigate('/');
  }, [clear, navigate]);

  const open_session = useCallback(
    (id: string) => {
      if (!token || session_ref.current === id) return;
      generation.current++;
      abort_ref.current?.abort();
      session_ref.current = id;
      const gen = generation.current;
      set_session_id(id);
      set_messages([]);
      set_selected_id(null);
      set_load_error(null);
      set_loading_session(true);
      fetch_session(token, id)
        .then((s) => {
          if (gen !== generation.current) return;
          const list = s.messages.map(from_history);
          set_messages(list);
          set_selected_id(last_answer_id(list));
        })
        .catch((e: unknown) => {
          if (gen !== generation.current) return;
          session_ref.current = null; // allow "Try again"
          set_load_error(e instanceof api_error && e.status === 404 ? "We couldn't find this conversation." : "The server didn't respond.");
        })
        .finally(() => {
          if (gen === generation.current) set_loading_session(false);
        });
    },
    [token],
  );

  const set_feedback = useCallback((id: string, value: 'up' | 'down' | null) => update_assistant(id, (m) => ({ ...m, feedback: value })), [update_assistant]);
  const select_message = useCallback((id: string) => set_selected_id(id), []);
  const focus_citation = useCallback((message_id: string, citation_id: number) => {
    set_selected_id(message_id);
    set_focus({ message_id, citation_id, nonce: Date.now() });
  }, []);

  const value = useMemo<chat_ctx>(
    () => ({
      messages, session_id, streaming, loading_session, load_error, selected_id, focus,
      send, stop, regenerate, new_chat, open_session, set_feedback, select_message, focus_citation,
    }),
    [messages, session_id, streaming, loading_session, load_error, selected_id, focus, send, stop, regenerate, new_chat, open_session, set_feedback, select_message, focus_citation],
  );
  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function use_chat(): chat_ctx {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('use_chat must be used inside ChatProvider');
  return ctx;
}
