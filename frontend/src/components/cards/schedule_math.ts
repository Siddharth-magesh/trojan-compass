// Pure helpers for the weekly schedule: time parsing, day normalisation and overlap detection.
import type { section } from '@/lib/api_types';

export const week_days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] as const;
export type week_day = (typeof week_days)[number];

export type placed_section = { key: string; course_id: string; title: string; section: section; tone: number };
export type block = placed_section & { day: week_day; start: number; end: number };

const day_aliases: Record<string, week_day> = { mo: 'Mon', tu: 'Tue', we: 'Wed', th: 'Thu', fr: 'Fri', m: 'Mon', t: 'Tue', w: 'Wed', r: 'Thu', f: 'Fri' };

export function parse_minutes(raw?: string): number | null {
  if (!raw || raw.toUpperCase() === 'TBA') return null;
  const m = /^(\d{1,2}):(\d{2})\s*(am|pm)?$/i.exec(raw.trim());
  if (!m) return null;
  let h = Number(m[1]);
  const suffix = m[3]?.toLowerCase();
  if (suffix === 'pm' && h < 12) h += 12;
  if (suffix === 'am' && h === 12) h = 0;
  return h * 60 + Number(m[2]);
}

export function normalize_day(raw: string): week_day | null {
  const key = raw.trim().toLowerCase();
  return day_aliases[key.slice(0, 2)] ?? day_aliases[key] ?? null;
}

export function has_time(s: section): boolean {
  const start = parse_minutes(s.start_time);
  const end = parse_minutes(s.end_time);
  return start !== null && end !== null && end > start && (s.days ?? []).some((d) => normalize_day(d) !== null);
}

export function to_blocks(items: placed_section[]): block[] {
  return items.flatMap((p) => {
    if (!has_time(p.section)) return [];
    const start = parse_minutes(p.section.start_time) ?? 0;
    const end = parse_minutes(p.section.end_time) ?? 0;
    return (p.section.days ?? []).flatMap((d) => {
      const day = normalize_day(d);
      return day ? [{ ...p, day, start, end }] : [];
    });
  });
}

export type conflict = { a: block; b: block; days: week_day[] };

export function find_conflicts(blocks: block[]): conflict[] {
  const found = new Map<string, conflict>();
  blocks.forEach((a, i) =>
    blocks.slice(i + 1).forEach((b) => {
      if (a.key === b.key || a.day !== b.day || a.start >= b.end || b.start >= a.end) return;
      const id = [a.key, b.key].sort().join('|');
      const existing = found.get(id);
      if (existing) existing.days.push(a.day);
      else found.set(id, { a, b, days: [a.day] });
    }),
  );
  return [...found.values()];
}

export function format_minutes(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const suffix = h >= 12 ? 'pm' : 'am';
  return ((h + 11) % 12) + 1 + (m ? ':' + String(m).padStart(2, '0') : '') + suffix;
}
