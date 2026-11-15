// Scenario 5: pre-semester checklist with four groups and due dates.
import { days_ago, days_ahead, sample_note, type scenario } from '../scenario_types';

export function checklist_scenario(): scenario {
  return {
    agents: ['student_services_agent', 'academic_agent'],
    final: {
      answer: 'Here is a pre-semester checklist in four groups. Tick items as you go; your progress is saved for this conversation and shown in the side panel [1][2].',
      cards: [
        {
          type: 'checklist',
          title: 'Before your first semester',
          groups: [
            { title: 'Accounts and ID', items: [
              { id: 'netid', label: 'Activate your USC NetID and two-factor authentication', due_date: days_ahead(5), link: 'https://itservices.usc.edu/' },
              { id: 'photo', label: 'Upload a photo for your USCard', due_date: days_ahead(12), link: 'https://uscard.usc.edu/' },
              { id: 'email', label: 'Set up your student email on your phone' },
            ] },
            { title: 'Health and insurance', items: [
              { id: 'immun', label: 'Submit immunization records', due_date: days_ahead(14), link: 'https://studenthealth.usc.edu/' },
              { id: 'insur', label: 'Review the student health insurance plan', link: 'https://studenthealth.usc.edu/' },
            ] },
            { title: 'Academics and registration', items: [
              { id: 'advisor', label: 'Book a meeting with your academic advisor', due_date: days_ahead(7) },
              { id: 'dclear', label: 'Request D-clearance for restricted courses', link: 'https://classes.usc.edu/' },
              { id: 'register', label: 'Register for classes', due_date: days_ahead(20) },
            ] },
            { title: 'Arrival and settling in', items: [
              { id: 'checkin', label: 'Complete international check-in (if applicable)', link: 'https://ois.usc.edu/' },
              { id: 'lease', label: 'Confirm housing move-in date' },
              { id: 'transit', label: 'Plan your commute and transit pass', link: 'https://transnet.usc.edu/' },
            ] },
          ],
        },
      ],
      citations: [
        { id: 1, source_name: 'USC New Student Programs', title: 'Getting started', url: 'https://orientation.usc.edu/', verified_date: days_ago(9), authority: 'official' },
        { id: 2, source_name: 'Schedule of Classes', title: 'Registration calendar', url: 'https://classes.usc.edu/', verified_date: days_ago(5), authority: 'official' },
      ],
      freshness_notes: [sample_note, 'Due dates are illustrative and relative to today.'],
      partial_status: { status: 'complete', missing: [] },
      follow_ups: ['What is D-clearance?', 'Prepare for my advisor meeting'],
    },
  };
}
