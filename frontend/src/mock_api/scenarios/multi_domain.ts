// Scenario 6: one message that fans out to academic, housing and career agents in parallel.
import { days_ago, days_ahead, sample_note, type scenario } from '../scenario_types';

export function multi_domain_scenario(): scenario {
  return {
    agents: ['academic_agent', 'housing_agent', 'career_agent'],
    stream_deltas: true,
    final: {
      answer: [
        '## A calm first month',
        'I checked academics, housing and jobs at the same time. Here is one sample combination that fits together:',
        '',
        '### Courses',
        'Start with **CSCI 567 Machine Learning** on Tuesday and Thursday afternoons, which leaves your mornings free [1].',
        '',
        '### Housing',
        'The **Ellendale Place shared suite** is a short walk from class and stays under $1,100 a month [2].',
        '',
        '### Work',
        'The **Student Web Developer** role offers 15 flexible hours a week on campus [3].',
        '',
        'Together that is roughly 4 units, a 10-minute walk and about 15 working hours: ambitious, but leaves room to breathe.',
      ].join('\n'),
      cards: [
        { type: 'course', course_id: 'CSCI 567', title: 'Machine Learning', units: 4, level: 'Graduate', prerequisites: [{ course_id: 'CSCI 570', known: true }], terms_offered: ['Fall', 'Spring'], sections: [{ section_id: '30214', days: ['Tue', 'Thu'], start_time: '14:00', end_time: '15:50', instructor: 'Dr. A. Haddad', modality: 'In person' }], citation_ids: [1] },
        { type: 'housing', listing_id: 'h_ellendale', name: 'Ellendale Place Shared Suite', housing_type: 'Shared apartment', neighborhood: 'North University Park', monthly_rent_usd: 1085, bedrooms: 3, distance_to_campus_miles: 0.4, amenities: ['In-unit laundry', 'Utilities included'], furnished: true, citation_ids: [2] },
        { type: 'job', job_id: 'j_webdev', title: 'Student Web Developer', employer: 'Viterbi IT', hourly_pay_usd: 21.5, hours_per_week: 15, deadline: days_ahead(9), apply_url: 'https://careers.usc.edu/', international_eligibility: 'yes', citation_ids: [3] },
      ],
      citations: [
        { id: 1, source_name: 'Schedule of Classes', title: 'CSCI 567 sections', url: 'https://classes.usc.edu/', verified_date: days_ago(3), authority: 'official' },
        { id: 2, source_name: 'Sample listing feed', title: 'Synthetic listing', url: 'https://housing.usc.edu/', verified_date: days_ago(2), authority: 'synthetic' },
        { id: 3, source_name: 'USC Career Center', title: 'Student employment', url: 'https://careers.usc.edu/', verified_date: days_ago(2), authority: 'official' },
      ],
      freshness_notes: [sample_note],
      partial_status: { status: 'complete', missing: [] },
      follow_ups: ['Swap the course for something lighter', 'Show more housing options', 'Give me a pre-semester checklist'],
    },
  };
}
