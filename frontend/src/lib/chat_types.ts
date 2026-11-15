// Client-side chat state: user turns, assistant turns built from the SSE stream, and UI errors.
import type { agent_node, clarification_event, error_code, final_response, status_state } from '@/lib/api_types';

export type activity_step = { node: agent_node; state: status_state; label: string; elapsed_ms?: number };

export type ui_error = { code: error_code | 'network'; message?: string };

export type user_message = { id: string; role: 'user'; content: string };

export type assistant_phase = 'streaming' | 'done' | 'error' | 'cancelled';

export type assistant_message = {
  id: string;
  role: 'assistant';
  phase: assistant_phase;
  steps: activity_step[];
  delta_text: string;
  final?: final_response;
  clarification?: clarification_event;
  error?: ui_error;
  duration_ms?: number;
  from_history?: boolean;
  feedback?: 'up' | 'down' | null;
};

export type chat_message = user_message | assistant_message;
