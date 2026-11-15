// Shape of a mock scenario: which agents run and what the stream finally returns.
import type { agent_node, clarification_event, error_code, final_response } from '@/lib/api_types';

export type scenario = {
  agents: agent_node[];
  stream_deltas?: boolean;
  failed_agent?: agent_node;
  final?: final_response;
  clarification?: clarification_event;
  pending?: string;
  error?: { code: error_code | 'network'; message: string };
};

export function days_ago(n: number): string {
  const d = new Date(Date.now() - n * 86_400_000);
  return d.toISOString().slice(0, 10);
}

export function days_ahead(n: number): string {
  return days_ago(-n);
}

export const sample_note = 'Sample data for this demo. Confirm with the linked office before acting.';
