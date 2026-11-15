// Scenario 1: services overview for a new international student.
import { days_ago, sample_note, type scenario } from '../scenario_types';

export function services_scenario(): scenario {
  return {
    agents: ['student_services_agent'],
    stream_deltas: true,
    final: {
      answer: [
        '## Your first few weeks, simplified',
        'Arriving as a new international student means a handful of offices matter more than the rest. Start with these, roughly in this order:',
        '1. **Office of International Services (OIS)** handles your immigration check-in and document questions. Complete check-in soon after you arrive [1].',
        '2. **Student Health** covers the insurance requirement and any immunization records you still need to submit [2].',
        '3. **USCard Services** issues your student ID, which you will need for buildings, libraries and transit discounts [3].',
        '4. **Information Technology Services** helps you activate your USC NetID and set up two-factor authentication [4].',
        '',
        'If anything about your visa status feels uncertain, book time with an OIS advisor rather than relying on a summary like this one.',
      ].join('\n'),
      cards: [
        { type: 'service', service_id: 'ois', name: 'Office of International Services', purpose: 'Immigration check-in, document guidance and advising for F-1 and J-1 students.', official_url: 'https://ois.usc.edu/', login_required: true },
        { type: 'service', service_id: 'health', name: 'USC Student Health', purpose: 'Insurance requirements, immunization records and appointments.', official_url: 'https://studenthealth.usc.edu/', login_required: true },
        { type: 'service', service_id: 'uscard', name: 'USCard Services', purpose: 'Student ID cards, photo submission and card replacement.', official_url: 'https://uscard.usc.edu/', login_required: false },
        { type: 'service', service_id: 'its', name: 'Information Technology Services', purpose: 'NetID activation, Wi-Fi and two-factor authentication setup.', official_url: 'https://itservices.usc.edu/' },
      ],
      citations: [
        { id: 1, source_name: 'Office of International Services', title: 'New student check-in', url: 'https://ois.usc.edu/', verified_date: days_ago(6), authority: 'official' },
        { id: 2, source_name: 'USC Student Health', title: 'Insurance and immunizations', url: 'https://studenthealth.usc.edu/', verified_date: days_ago(11), authority: 'official' },
        { id: 3, source_name: 'USCard Services', title: 'Getting your USCard', url: 'https://uscard.usc.edu/', verified_date: days_ago(19), authority: 'official' },
        { id: 4, source_name: 'ITS Help', title: 'Activating your NetID', url: 'https://itservices.usc.edu/', verified_date: days_ago(24), authority: 'official' },
      ],
      freshness_notes: [sample_note, 'Office hours change between semesters.'],
      partial_status: { status: 'complete', missing: [] },
      follow_ups: ['Give me a pre-semester checklist', 'How does student health insurance work?', 'Find housing under $1,200 a month'],
    },
  };
}
