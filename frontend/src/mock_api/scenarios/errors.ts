// Scenario 9: "/error" cycles through every error code, plus a dropped connection.
import type { scenario } from '../scenario_types';

const sequence: NonNullable<scenario['error']>[] = [
  { code: 'rate_limited', message: 'You have sent several messages in a short time.' },
  { code: 'upstream_failed', message: 'The academic data service did not respond.' },
  { code: 'guard_blocked', message: 'This request falls outside what Trojan Compass can help with.' },
  { code: 'unknown', message: 'Something unexpected happened.' },
  { code: 'network', message: 'Connection dropped.' },
];
const counter_key = 'trojan_compass.mock.error_index';

export function next_error_scenario(): scenario {
  const index = Number(sessionStorage.getItem(counter_key) ?? '0') % sequence.length;
  sessionStorage.setItem(counter_key, String(index + 1));
  return { agents: [], error: sequence[index] };
}
