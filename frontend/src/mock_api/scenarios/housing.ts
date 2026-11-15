// Scenarios 2, 7 and 8: housing results, a budget clarification and a partial-data case.
import type { housing_card } from '@/lib/api_types';
import { days_ago, sample_note, type scenario } from '../scenario_types';

const listings: housing_card[] = [
  { type: 'housing', listing_id: 'h_ellendale', name: 'Ellendale Place Shared Suite', housing_type: 'Shared apartment', neighborhood: 'North University Park', monthly_rent_usd: 1085, bedrooms: 3, distance_to_campus_miles: 0.4, campus: 'University Park', amenities: ['In-unit laundry', 'Utilities included', 'Bike storage'], furnished: true, citation_ids: [1] },
  { type: 'housing', listing_id: 'h_adams', name: 'West Adams Craftsman Room', housing_type: 'Private room in house', neighborhood: 'West Adams', monthly_rent_usd: 945, bedrooms: 4, distance_to_campus_miles: 1.3, campus: 'University Park', amenities: ['Backyard', 'Street parking', 'Quiet hours'], furnished: false, citation_ids: [2] },
  { type: 'housing', listing_id: 'h_figueroa', name: 'Figueroa Corridor Studio', housing_type: 'Studio', neighborhood: 'Exposition Park', monthly_rent_usd: 1190, bedrooms: 0, distance_to_campus_miles: 0.9, campus: 'University Park', amenities: ['Gym', 'Near Expo Line', 'Package lockers'], citation_ids: [2, 3] },
];

export function housing_scenario(): scenario {
  return {
    agents: ['housing_agent'],
    final: {
      answer: [
        'Here are three sample options under **$1,200 a month**, all within about a mile and a half of University Park [1][2].',
        '',
        '- **Lowest rent:** the West Adams room, though the commute is longer and it is unfurnished.',
        '- **Shortest walk:** Ellendale Place, with utilities included in the rent [1].',
        '- **Most privacy:** the Figueroa studio, close to the Expo Line [3].',
        '',
        'Tick up to three cards to compare them side by side, including an estimated semester cost.',
      ].join('\n'),
      cards: listings,
      citations: [
        { id: 1, source_name: 'USC Housing', title: 'Off-campus housing resources', url: 'https://housing.usc.edu/', verified_date: days_ago(4), authority: 'official' },
        { id: 2, source_name: 'Sample listing feed', title: 'Synthetic listings for the demo', url: 'https://housing.usc.edu/', verified_date: days_ago(2), authority: 'synthetic' },
        { id: 3, source_name: 'LA Metro', title: 'E Line (Expo) stations', url: 'https://www.metro.net/', verified_date: days_ago(30), authority: 'third_party' },
      ],
      freshness_notes: [sample_note, 'Listings are synthetic and do not reflect real availability.'],
      partial_status: { status: 'complete', missing: [] },
      follow_ups: ['Which of these is safest to walk home from at night?', 'What should I ask before signing a lease?'],
    },
  };
}

export function housing_clarify_scenario(): scenario {
  return {
    agents: ['housing_agent'],
    pending: 'housing',
    clarification: {
      question: 'Happy to help you find a place. What monthly budget should I work within?',
      options: ['Under $1,000', '$1,000 to $1,400', '$1,400 to $2,000', 'Not sure yet'],
    },
  };
}

export function housing_partial_scenario(): scenario {
  return {
    agents: ['housing_agent', 'student_services_agent'],
    failed_agent: 'housing_agent',
    final: {
      answer: [
        'I could not find verified listings near the **Health Sciences Campus** yet, so I am only sharing what is confirmed.',
        '',
        'The university housing office maintains resources for both campuses [1], and the intercampus shuttle connects Health Sciences with University Park [2], which widens your options if you are open to commuting.',
      ].join('\n'),
      cards: [],
      citations: [
        { id: 1, source_name: 'USC Housing', title: 'Housing resources', url: 'https://housing.usc.edu/', verified_date: days_ago(4), authority: 'official' },
        { id: 2, source_name: 'USC Transportation', title: 'Intercampus shuttle', url: 'https://transnet.usc.edu/', verified_date: days_ago(15), authority: 'official' },
      ],
      freshness_notes: [sample_note],
      partial_status: { status: 'partial', missing: ["Housing data hasn't been collected yet for the Health Sciences Campus area", 'Shuttle timetable could not be verified this week'] },
      follow_ups: ['Show housing near University Park instead', 'How long is the shuttle ride?'],
    },
  };
}
