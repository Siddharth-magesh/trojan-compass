// API contract between the chat app and the FastAPI backend (mirrored by backend/app/api/presenter.py).

export type agent_node =
  | 'input_guard'
  | 'supervisor'
  | 'academic_agent'
  | 'housing_agent'
  | 'career_agent'
  | 'student_services_agent'
  | 'verifier'
  | 'synthesizer'
  | 'output_guard';

export type status_state = 'started' | 'done' | 'failed';

export type status_event = { node: agent_node; state: status_state; label: string; elapsed_ms?: number };

export type authority = 'official' | 'third_party' | 'synthetic';

export type citation = {
  id: number;
  source_name: string;
  title?: string;
  url: string;
  verified_date?: string;
  authority?: authority;
};

export type eligibility = 'yes' | 'no' | 'unverified';

export type prerequisite = { course_id: string; known: boolean; status?: string };

export type section = {
  section_id: string;
  days: string[];
  start_time?: string;
  end_time?: string;
  instructor?: string;
  modality?: string;
  location?: string;
};

export type course_card = {
  type: 'course';
  course_id: string;
  title: string;
  units?: number;
  level?: string;
  description?: string;
  prerequisites?: prerequisite[];
  terms_offered?: string[];
  sections?: section[];
  citation_ids?: number[];
};

export type housing_card = {
  type: 'housing';
  listing_id: string;
  name: string;
  housing_type?: string;
  address?: string;
  neighborhood?: string;
  campus?: string;
  monthly_rent_usd?: number;
  bedrooms?: number;
  distance_to_campus_miles?: number;
  amenities?: string[];
  furnished?: boolean;
  available_from?: string;
  citation_ids?: number[];
};

export type job_card = {
  type: 'job';
  job_id: string;
  title: string;
  employer?: string;
  job_type?: string;
  location?: string;
  hourly_pay_usd?: number;
  hours_per_week?: number;
  required_skills?: string[];
  deadline?: string;
  apply_url?: string;
  international_eligibility: eligibility;
  citation_ids?: number[];
};

export type service_card = {
  type: 'service';
  service_id: string;
  name: string;
  purpose?: string;
  official_url?: string;
  login_required?: boolean;
  common_tasks?: string[];
  citation_ids?: number[];
};

export type checklist_item = { id: string; label: string; link?: string; due_date?: string };

export type checklist_group = { title: string; items: checklist_item[] };

export type checklist_card = { type: 'checklist'; title: string; groups: checklist_group[] };

export type card = course_card | housing_card | job_card | service_card | checklist_card;

export type partial_status = { status: 'complete' | 'partial' | 'unverified'; missing: string[] };

export type final_response = {
  answer: string;
  cards: card[];
  citations: citation[];
  freshness_notes: string[];
  partial_status: partial_status;
  follow_ups?: string[];
};

export type clarification_event = { question: string; options?: string[] };

export type error_code = 'rate_limited' | 'upstream_failed' | 'guard_blocked' | 'unknown';

export type error_event = { code: error_code; message?: string };

export type student_profile = {
  student_id: string;
  display_name: string;
  program?: string;
  level?: string;
  international?: boolean;
  interests?: string[];
  housing_budget_usd?: number;
  job_interests?: string[];
};

export type login_response = { access_token: string; token_type?: string; student: student_profile };

export type session_message = { role: 'user' | 'assistant'; content: string; final?: final_response | null };

export type session_response = { session_id: string; messages: session_message[] };
