// Turns a scenario into timed status / answer / final events with realistic, overlapping agent timing.
import type { agent_node } from '@/lib/api_types';
import type { scenario } from './scenario_types';
import { network_drop, type timed_event } from './sse_stream';

const labels: Record<agent_node, string> = {
  input_guard: 'Checking your request',
  supervisor: 'Planning',
  academic_agent: 'Academic agent',
  housing_agent: 'Housing agent',
  career_agent: 'Career agent',
  student_services_agent: 'Student services agent',
  verifier: 'Verifying',
  synthesizer: 'Writing',
  output_guard: 'Final check',
};

const between = (min: number, max: number) => Math.round(min + Math.random() * (max - min));

function status(node: agent_node, state: 'started' | 'done' | 'failed', delay: number, elapsed?: number): timed_event {
  return { delay, event: 'status', data: { node, state, label: labels[node], elapsed_ms: elapsed } };
}

function chunk_words(text: string): string[] {
  const parts = text.match(/\S+\s*/g) ?? [];
  const chunks: string[] = [];
  for (let i = 0; i < parts.length; i += 4) chunks.push(parts.slice(i, i + 4).join(''));
  return chunks;
}

function opening(): timed_event[] {
  return [status('input_guard', 'started', 120), status('input_guard', 'done', between(300, 450), 380)];
}

function error_events(s: scenario): timed_event[] {
  const err = s.error;
  if (!err) return [];
  if (err.code === 'guard_blocked') {
    return [status('input_guard', 'started', 120), status('input_guard', 'failed', between(300, 500)), { delay: 200, event: 'error', data: err }];
  }
  const base = [...opening(), status('supervisor', 'started', between(300, 400))];
  if (err.code === 'network') return [...base, { delay: between(500, 800), event: network_drop, data: null }];
  if (err.code === 'upstream_failed') {
    return [...base, status('supervisor', 'done', 600, 640), status('academic_agent', 'started', 120), status('academic_agent', 'failed', between(600, 900)), { delay: 250, event: 'error', data: err }];
  }
  return [...base, { delay: between(300, 500), event: 'error', data: err }];
}

export function plan_events(s: scenario): timed_event[] {
  if (s.error) return error_events(s);
  const events = [...opening(), status('supervisor', 'started', between(300, 400))];
  events.push(status('supervisor', 'done', between(500, 800), between(520, 760)));
  s.agents.forEach((agent, i) => events.push(status(agent, 'started', i === 0 ? 220 : between(60, 140))));
  s.agents.forEach((agent) => {
    const failed = s.failed_agent === agent;
    events.push(status(agent, failed ? 'failed' : 'done', between(300, 900), between(700, 1600)));
  });
  if (s.clarification) {
    events.push({ delay: between(300, 500), event: 'clarification', data: s.clarification });
    return events;
  }
  events.push(status('verifier', 'started', between(300, 450)), status('verifier', 'done', between(400, 800), between(400, 800)));
  events.push(status('synthesizer', 'started', between(300, 400)));
  if (s.stream_deltas && s.final) {
    chunk_words(s.final.answer).forEach((text) => events.push({ delay: between(35, 80), event: 'answer_delta', data: { text } }));
  }
  events.push(status('synthesizer', 'done', between(300, 600), between(900, 1400)));
  events.push(status('output_guard', 'started', 120), status('output_guard', 'done', between(300, 400), 260));
  if (s.final) events.push({ delay: 120, event: 'final', data: s.final });
  return events;
}
