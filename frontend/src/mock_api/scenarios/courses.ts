// Scenario 3: two course cards with a known/unknown prerequisite and an overlapping section.
import { days_ago, sample_note, type scenario } from '../scenario_types';

export function courses_scenario(): scenario {
  return {
    agents: ['academic_agent'],
    final: {
      answer: [
        'Two courses fit an AI focus well next semester [1]:',
        '',
        '| Course | Units | Why it fits |',
        '| --- | --- | --- |',
        '| CSCI 567 Machine Learning | 4 | Core methods you will reuse everywhere |',
        '| CSCI 561 Foundations of AI | 4 | Search, planning and reasoning |',
        '',
        '**Heads up:** the default lecture sections overlap on Monday and Wednesday mornings [2]. Pick a different section for one of them in the schedule below.',
        '',
        'One prerequisite for CSCI 567 could not be confirmed, so it is marked *unknown*. Check with your department advisor before registering.',
      ].join('\n'),
      cards: [
        {
          type: 'course', course_id: 'CSCI 567', title: 'Machine Learning', units: 4, level: 'Graduate',
          prerequisites: [{ course_id: 'CSCI 570', known: true }, { course_id: 'MATH 407', known: false }],
          terms_offered: ['Fall', 'Spring'],
          sections: [
            { section_id: '30210', days: ['Mon', 'Wed'], start_time: '10:00', end_time: '11:50', instructor: 'Dr. L. Moreno', modality: 'In person' },
            { section_id: '30214', days: ['Tue', 'Thu'], start_time: '14:00', end_time: '15:50', instructor: 'Dr. A. Haddad', modality: 'In person' },
          ],
          citation_ids: [1, 2],
        },
        {
          type: 'course', course_id: 'CSCI 561', title: 'Foundations of Artificial Intelligence', units: 4, level: 'Graduate',
          prerequisites: [{ course_id: 'CSCI 570', known: true }],
          terms_offered: ['Fall', 'Spring', 'Summer'],
          sections: [
            { section_id: '30320', days: ['Mon', 'Wed'], start_time: '11:00', end_time: '12:20', instructor: 'Dr. K. Iyer', modality: 'In person' },
            { section_id: '30329', days: ['Fri'], start_time: 'TBA', instructor: 'Staff', modality: 'Online' },
          ],
          citation_ids: [1, 2],
        },
      ],
      citations: [
        { id: 1, source_name: 'USC Catalogue', title: 'Computer Science course descriptions', url: 'https://catalogue.usc.edu/', verified_date: days_ago(12), authority: 'official' },
        { id: 2, source_name: 'Schedule of Classes', title: 'Section times (sample term)', url: 'https://classes.usc.edu/', verified_date: days_ago(3), authority: 'official' },
      ],
      freshness_notes: [sample_note, 'Section times are published per term and can move before registration opens.'],
      partial_status: { status: 'complete', missing: [] },
      follow_ups: ['What can I take instead of CSCI 561?', 'Prepare for my advisor meeting'],
    },
  };
}
