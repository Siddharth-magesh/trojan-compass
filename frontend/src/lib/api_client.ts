// HTTP client for the backend /api routes; switches to the in-browser mock backend when *_USE_MOCK=true.
import type { login_response, session_response, student_profile } from '@/lib/api_types';

const env = import.meta.env;
const base_url = (env.VITE_API_BASE_URL ?? env.NEXT_PUBLIC_API_BASE_URL ?? '/api').replace(/\/$/, '');

export const is_mock_mode = (env.VITE_USE_MOCK ?? env.NEXT_PUBLIC_USE_MOCK) === 'true';

export class api_error extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function api_fetch(path: string, init: RequestInit = {}, token?: string | null): Promise<Response> {
  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', 'Bearer ' + token);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const request = { ...init, headers };
  if (is_mock_mode) {
    const { mock_fetch } = await import('@/mock_api');
    return mock_fetch(path, request);
  }
  return fetch(base_url + path, request);
}

async function json_or_throw<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = (await res.json()) as { detail?: unknown };
      if (typeof body.detail === 'string') detail = body.detail;
    } catch {
      /* non-JSON error body */
    }
    throw new api_error(res.status, detail);
  }
  return (await res.json()) as T;
}

export async function login(student_id: string): Promise<login_response> {
  return json_or_throw(await api_fetch('/login', { method: 'POST', body: JSON.stringify({ student_id }) }));
}

export async function fetch_profile(token: string): Promise<student_profile> {
  return json_or_throw(await api_fetch('/student_profile', {}, token));
}

export async function fetch_session(token: string, session_id: string): Promise<session_response> {
  return json_or_throw(await api_fetch('/session/' + encodeURIComponent(session_id), {}, token));
}

export async function open_chat_stream(token: string, message: string, session_id: string | null, signal: AbortSignal): Promise<Response> {
  const body: Record<string, string> = { message };
  if (session_id) body.session_id = session_id;
  return api_fetch('/chat_stream', { method: 'POST', body: JSON.stringify(body), signal }, token);
}

// Parses a text/event-stream body into (event, data) pairs as they arrive.
export async function* read_sse(res: Response): AsyncGenerator<{ event: string; data: unknown }> {
  if (!res.body) return;
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let split = buffer.indexOf('\n\n');
    while (split >= 0) {
      const block = buffer.slice(0, split);
      buffer = buffer.slice(split + 2);
      let event = 'message';
      const data: string[] = [];
      for (const line of block.split('\n')) {
        if (line.startsWith('event:')) event = line.slice(6).trim();
        else if (line.startsWith('data:')) data.push(line.slice(5).trimStart());
      }
      if (data.length) {
        try {
          yield { event, data: JSON.parse(data.join('\n')) as unknown };
        } catch {
          /* skip malformed event */
        }
      }
      split = buffer.indexOf('\n\n');
    }
  }
}
