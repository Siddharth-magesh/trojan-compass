// Runtime guards that confirm a card matches its declared type before a typed renderer is used.
import type { card, checklist_card, course_card, housing_card, job_card, service_card } from '@/lib/api_types';

const is_str = (v: unknown): v is string => typeof v === 'string';

export const is_course = (c: card): c is course_card => c.type === 'course' && is_str(c.course_id) && is_str(c.title);
export const is_housing = (c: card): c is housing_card => c.type === 'housing' && is_str(c.listing_id) && is_str(c.name);
export const is_job = (c: card): c is job_card => c.type === 'job' && is_str(c.job_id) && is_str(c.title);
export const is_service = (c: card): c is service_card => c.type === 'service' && is_str(c.service_id) && is_str(c.name);
export const is_checklist = (c: card): c is checklist_card =>
  c.type === 'checklist' && is_str(c.title) && Array.isArray(c.groups) &&
  c.groups.every((g) => g !== null && typeof g === 'object' && is_str(g.title) &&
    Array.isArray(g.items) && g.items.every((item: unknown) => item !== null &&
      typeof item === 'object' && 'id' in item && 'label' in item && is_str(item.id) && is_str(item.label)));
