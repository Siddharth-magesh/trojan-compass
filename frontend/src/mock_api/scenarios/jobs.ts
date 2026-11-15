// Scenario 4: part-time technical jobs with mixed international eligibility, including unverified.
import { days_ahead, days_ago, sample_note, type scenario } from '../scenario_types';

export function jobs_scenario(): scenario {
  return {
    agents: ['career_agent'],
    final: {
      answer: [
        'I found three sample part-time technical roles [1]. Eligibility for international students varies, so read the badges carefully:',
        '',
        '- **Student Web Developer** is an on-campus role marked eligible [2].',
        '- **Research Data Assistant** has eligibility that I could **not verify**. Ask the lab and OIS before applying.',
        '- **Robotics Startup Intern** is off campus and marked not eligible in this sample [3].',
        '',
        'Deadlines are approaching for two of them.',
      ].join('\n'),
      cards: [
        { type: 'job', job_id: 'j_webdev', title: 'Student Web Developer', employer: 'Viterbi IT', job_type: 'On-campus, part-time', hourly_pay_usd: 21.5, hours_per_week: 15, deadline: days_ahead(9), apply_url: 'https://careers.usc.edu/', international_eligibility: 'yes', citation_ids: [1, 2] },
        { type: 'job', job_id: 'j_research', title: 'Research Data Assistant', employer: 'Spatial Sciences Lab', job_type: 'Research, part-time', hourly_pay_usd: 19.75, hours_per_week: 10, deadline: days_ahead(16), apply_url: 'https://careers.usc.edu/', international_eligibility: 'unverified', citation_ids: [1] },
        { type: 'job', job_id: 'j_robotics', title: 'Robotics Startup Intern', employer: 'Arroyo Robotics', job_type: 'Off-campus internship', hourly_pay_usd: 26, apply_url: 'https://careers.usc.edu/', international_eligibility: 'no', citation_ids: [3] },
      ],
      citations: [
        { id: 1, source_name: 'USC Career Center', title: 'Student employment listings', url: 'https://careers.usc.edu/', verified_date: days_ago(2), authority: 'official' },
        { id: 2, source_name: 'Office of International Services', title: 'On-campus employment', url: 'https://ois.usc.edu/', verified_date: days_ago(8), authority: 'official' },
        { id: 3, source_name: 'Sample listing feed', title: 'Synthetic internship postings', url: 'https://careers.usc.edu/', verified_date: days_ago(1), authority: 'synthetic' },
      ],
      freshness_notes: [sample_note, 'Pay rates are illustrative.'],
      partial_status: { status: 'unverified', missing: ['International eligibility for the Research Data Assistant role'] },
      follow_ups: ['Help me tailor my resume for the web developer role', 'What counts as on-campus employment?'],
    },
  };
}
