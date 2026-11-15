// Keyword router that maps a message to one of the nine mock scenarios.
import type { scenario } from './scenario_types';
import { checklist_scenario } from './scenarios/checklist';
import { courses_scenario } from './scenarios/courses';
import { next_error_scenario } from './scenarios/errors';
import { fallback_scenario } from './scenarios/fallback';
import { housing_clarify_scenario, housing_partial_scenario, housing_scenario } from './scenarios/housing';
import { jobs_scenario } from './scenarios/jobs';
import { multi_domain_scenario } from './scenarios/multi_domain';
import { services_scenario } from './scenarios/services';

const has = (text: string, re: RegExp) => re.test(text);

export function pick_scenario(message: string, pending: string | null): scenario {
  const t = message.toLowerCase();
  if (t.trim() === '/error') return next_error_scenario();
  const domains = [/course|class|schedule|semester plan/, /housing|apartment|place to live|rent/, /job|work|career|internship/].filter((re) => has(t, re)).length;
  if (domains >= 2 || has(t, /first month|everything at once/)) return multi_domain_scenario();
  const is_housing = has(t, /housing|apartment|place to live|rent|room/) || pending === 'housing';
  if (is_housing && has(t, /health sciences|hsc|no data|not collected|partial/)) return housing_partial_scenario();
  if (is_housing && (has(t, /\$|\d{3,}|under|budget/) || pending === 'housing')) return housing_scenario();
  if (is_housing) return housing_clarify_scenario();
  if (has(t, /checklist|before (the )?semester|pre-semester|to-do/)) return checklist_scenario();
  if (has(t, /course|class|prereq|schedule|academic/)) return courses_scenario();
  if (has(t, /job|work|career|internship|research role/)) return jobs_scenario();
  if (has(t, /international|service|new student|onboard|arriv/)) return services_scenario();
  return fallback_scenario();
}
