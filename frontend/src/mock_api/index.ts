// Temporary mock backend: dispatches /api requests in-browser and streams real SSE Responses.
// Delete this folder and set NEXT_PUBLIC_USE_MOCK=false to use the real backend.
import { find_demo_student } from '@/lib/demo_students';
import { append_message, create_session_id, read_session } from './mock_sessions';
import { pick_scenario } from './scenario_select';
import { sse_response } from './sse_stream';
import { plan_events } from './timeline_plan';

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

function student_from(init: RequestInit): string | null {
  const headers = new Headers(init.headers);
  const token = headers.get('Authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  const id = token.startsWith('mock.') ? token.slice(5) : '';
  return find_demo_student(id) ? id : null;
}

function read_body(init: RequestInit): Record<string, unknown> {
  try {
    return typeof init.body === 'string' ? (JSON.parse(init.body) as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export async function mock_fetch(path: string, init: RequestInit): Promise<Response> {
  await wait(180 + Math.random() * 220);
  if (path === '/health') return json({ status: 'ok' });
  if (path === '/login' && init.method === 'POST') return login(read_body(init));
  const student_id = student_from(init);
  if (!student_id) return json({ detail: 'Not authenticated' }, 401);
  if (path === '/student_profile') return profile(student_id);
  if (path.startsWith('/session/')) {
    const session = read_session(student_id, decodeURIComponent(path.slice(9)));
    return session ? json(session) : json({ detail: 'Not found' }, 404);
  }
  if (path === '/chat_stream' && init.method === 'POST') return chat(student_id, read_body(init), init.signal);
  return json({ detail: 'Not found' }, 404);
}

function login(body: Record<string, unknown>): Response {
  const student = typeof body.student_id === 'string' ? find_demo_student(body.student_id) : undefined;
  if (!student) return json({ detail: 'Unknown student' }, 404);
  const { blurb: _blurb, ...profile_data } = student;
  return json({ access_token: 'mock.' + student.student_id, student: profile_data });
}

function profile(student_id: string): Response {
  const student = find_demo_student(student_id);
  if (!student) return json({ detail: 'Not found' }, 404);
  const { blurb: _blurb, ...profile_data } = student;
  return json(profile_data);
}

function chat(student_id: string, body: Record<string, unknown>, signal: AbortSignal | null | undefined): Response {
  const message = typeof body.message === 'string' ? body.message : '';
  const session_id = typeof body.session_id === 'string' && body.session_id ? body.session_id : create_session_id();
  const prior = read_session(student_id, session_id);
  const scenario = pick_scenario(message, prior?.pending ?? null);
  append_message(student_id, session_id, { role: 'user', content: message }, null);
  const events = [{ delay: 60, event: 'session', data: { session_id } }, ...plan_events(scenario)];
  return sse_response(events, signal, (event) => {
    if (event === 'final' && scenario.final) {
      append_message(student_id, session_id, { role: 'assistant', content: scenario.final.answer, final: scenario.final }, null);
    }
    if (event === 'clarification' && scenario.clarification) {
      append_message(student_id, session_id, { role: 'assistant', content: scenario.clarification.question }, scenario.pending ?? null);
    }
  });
}
