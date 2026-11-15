// Builds the illustrative "first weeks at USC" journey for the home screen, personalized by profile and varied per visit.
import type { student_profile } from '@/lib/api_types';

export type journey_plan = {
  title: string;
  steps: string[];
  summary: string;
  seed: number;
};

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function build_journey(student: student_profile | null, nonce: string): journey_plan {
  const first = student?.display_name.split(' ')[0];
  const steps = student?.international
    ? ['Arrive in LA', 'Activate NetID', 'Health clearances', 'Pay tuition', 'Register', 'First class']
    : ['Activate NetID', 'Health clearances', 'Pay tuition', 'Register', 'Find a job', 'First class'];
  const interest = student?.interests?.[0];
  if (interest) steps[steps.length - 1] = 'First ' + interest + ' class';
  const title = first ? first + "'s first weeks" : 'Your first weeks at USC';
  return { title, steps, summary: title + ': ' + steps.join(', then ') + '.', seed: hash((student?.student_id ?? 'guest') + nonce) };
}
