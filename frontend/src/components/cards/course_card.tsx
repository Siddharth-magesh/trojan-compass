// Course card: title, units, level, prerequisites (unknown shown explicitly), terms and expandable sections.
import { useState } from 'react';
import { BookOpen, Check, ChevronDown, CircleHelp } from 'lucide-react';
import type { course_card, section } from '@/lib/api_types';
import { cn } from '@/lib/utils';
import type { card_ctx } from '@/components/cards/card_context';
import { CardCitations, CardFrame, Field } from '@/components/cards/card_parts';
import { has_time } from '@/components/cards/schedule_math';

function section_time(s: section): string {
  if (!has_time(s)) return 'Time not announced';
  return (s.days ?? []).join(', ') + ' ' + s.start_time + ' to ' + s.end_time;
}

export function CourseCard({ card, ctx, selected_section, on_select }: {
  card: course_card;
  ctx: card_ctx;
  selected_section: string | null;
  on_select: (section_id: string) => void;
}) {
  const [open, set_open] = useState(false);
  const sections = card.sections ?? [];
  return (
    <CardFrame>
      <div className="flex items-start justify-between gap-3">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-gold-soft text-amber-ink"><BookOpen className="h-4 w-4" strokeWidth={1.8} /></span>
        <span className="rounded-[5px] border px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">{card.course_id}</span>
      </div>
      <h3 className="mt-3 font-serif text-[19px] leading-snug">{card.title}</h3>
      <dl className="mt-3 grid grid-cols-3 gap-3">
        <Field label="Units" value={card.units} />
        <Field label="Level" value={card.level} />
        <Field label="Terms" value={card.terms_offered?.join(', ')} />
      </dl>
      <div className="mt-4">
        <p className="text-[10.5px] uppercase tracking-[0.1em] text-faint">Prerequisites</p>
        {card.prerequisites === undefined ? (
          <p className="mt-1 text-[13px] italic text-muted-foreground/80">Not listed</p>
        ) : card.prerequisites.length === 0 ? (
          <p className="mt-1 text-[13px]">None</p>
        ) : (
          <ul className="mt-1.5 flex flex-wrap gap-1.5">
            {card.prerequisites.map((p) => (
              <li key={p.course_id} className={cn('inline-flex items-center gap-1 rounded-[5px] px-1.5 py-0.5 text-[11.5px]', !p.known ? 'border border-dashed border-gold/60 bg-amber-soft text-amber-ink' : p.status === 'missing' ? 'bg-cardinal-soft text-primary ring-1 ring-primary/20' : 'bg-surface ring-1 ring-border')}>
                {p.course_id}
                {!p.known && <><CircleHelp className="h-3 w-3" /> unknown</>}
                {p.known && p.status === 'missing' && <span>not completed</span>}
                {p.known && p.status === 'met' && <Check className="h-3 w-3 text-sage" aria-label="completed" />}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="mt-4 border-t pt-3">
        <button type="button" onClick={() => set_open(!open)} aria-expanded={open} data-testid={'button-sections-' + card.course_id} className="flex w-full items-center justify-between text-[12.5px] font-medium">
          {sections.length ? sections.length + ' section' + (sections.length === 1 ? '' : 's') : 'Sections not listed'}
          {sections.length > 0 && <ChevronDown className={cn('h-4 w-4 text-faint transition-transform duration-200', open && 'rotate-180')} />}
        </button>
        {open && (
          <ul className="mt-2 grid gap-1.5 animate-in fade-in duration-200" role="radiogroup" aria-label={'Sections for ' + card.course_id}>
            {sections.map((s) => {
              const active = selected_section === s.section_id;
              return (
                <li key={s.section_id}>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => on_select(s.section_id)}
                    data-testid={'radio-section-' + s.section_id}
                    className={cn('flex w-full items-start gap-2.5 rounded-lg border px-3 py-2 text-left text-[12px] transition-colors', active ? 'border-sage/50 bg-sage-soft/50' : 'hover:bg-surface')}
                  >
                    <span className={cn('mt-0.5 h-3.5 w-3.5 shrink-0 rounded-full border', active && 'border-[4px] border-sage')} />
                    <span className="min-w-0">
                      <span className="block font-medium">Section {s.section_id} <span className="font-normal text-muted-foreground">{section_time(s)}</span></span>
                      <span className="block text-muted-foreground">{[s.instructor ?? 'Instructor not listed', s.modality].filter(Boolean).join(' \u00b7 ')}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <CardCitations ids={card.citation_ids} citations={ctx.citations} message_id={ctx.message_id} />
    </CardFrame>
  );
}
