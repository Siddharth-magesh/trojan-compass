// The two synthetic demo students (same profiles as local_database/student_profiles), shown in the login dialog.
import type { student_profile } from '@/lib/api_types';

export type demo_student = student_profile & { blurb: string };

export const demo_students: demo_student[] = [
  {
    student_id: 'synthetic_student_001',
    display_name: 'Aarav Demo',
    program: 'MS Computer Science',
    level: 'Graduate',
    international: true,
    interests: ['machine learning', 'algorithms'],
    housing_budget_usd: 1200,
    job_interests: ['software', 'research', 'machine learning'],
    blurb: 'Arriving from India, into machine learning',
  },
  {
    student_id: 'synthetic_student_002',
    display_name: 'Bianca Demo',
    program: 'BS Electrical and Computer Engineering',
    level: 'Undergraduate',
    international: true,
    interests: ['embedded systems', 'internet of things'],
    housing_budget_usd: 950,
    job_interests: ['technical', 'engineering', 'student worker'],
    blurb: 'Arriving from Brazil, into embedded systems',
  },
];

export function find_demo_student(student_id: string): demo_student | undefined {
  return demo_students.find((s) => s.student_id === student_id);
}
