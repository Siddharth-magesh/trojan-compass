// Default reply when no scenario keyword matches: a short orientation with suggestions.
import { days_ago, sample_note, type scenario } from '../scenario_types';

export function fallback_scenario(): scenario {
  return {
    agents: ['student_services_agent'],
    final: {
      answer: [
        "I can help with that once I know which part of USC life it touches. Right now I'm strongest at **courses**, **housing**, **campus jobs** and **getting set up as a new student** [1].",
        '',
        'Try one of the suggestions below, or tell me a bit more about what you need.',
      ].join('\n'),
      cards: [],
      citations: [{ id: 1, source_name: 'myUSC', title: 'Student portal', url: 'https://my.usc.edu/', verified_date: days_ago(7), authority: 'official' }],
      freshness_notes: [sample_note],
      partial_status: { status: 'complete', missing: [] },
      follow_ups: ['Help me pick two courses for next semester', 'Find a part-time technical job on campus', 'Give me a pre-semester checklist'],
    },
  };
}
