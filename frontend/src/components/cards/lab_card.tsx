// Research lab card: lab, PI, research areas, recruitment and funding status as recorded, how to apply, lab link.
import { ArrowUpRight, FlaskConical } from 'lucide-react';
import type { card_ctx } from '@/components/cards/card_context';
import { CardCitations, CardFrame, Field } from '@/components/cards/card_parts';
import type { lab_card } from '@/lib/api_types';
import { safe_url, url_domain } from '@/lib/safe_url';

export function LabCard({ card, ctx }: { card: lab_card; ctx: card_ctx }) {
  const href = safe_url(card.official_url);
  return (
    <CardFrame>
      <div className="flex items-start justify-between gap-3">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-cardinal-soft text-primary"><FlaskConical className="h-4 w-4" strokeWidth={1.8} /></span>
        <span className="rounded-[5px] border border-dashed border-gold/60 bg-amber-soft px-1.5 py-0.5 text-[10.5px] font-medium text-amber-ink">
          Recruitment: {card.recruitment_status ?? 'not listed'}
        </span>
      </div>
      <h3 className="mt-3 text-[14.5px] font-medium leading-snug">{card.title}</h3>
      <p className="text-[12.5px] text-muted-foreground">{card.principal_investigator ? 'PI ' + card.principal_investigator : 'PI not listed'}</p>
      {card.research_areas && card.research_areas.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {card.research_areas.map((a) => <li key={a} className="rounded-[5px] bg-surface px-1.5 py-0.5 text-[11.5px] ring-1 ring-border">{a}</li>)}
        </ul>
      )}
      <dl className="mt-3 grid grid-cols-2 gap-3">
        <Field label="Funding" value={card.compensation_status} />
        <Field label="Levels" value={card.invited_levels?.join(', ')} />
      </dl>
      <p className="mt-3 text-[10.5px] uppercase tracking-[0.1em] text-faint">How to apply</p>
      <p className={card.application_instructions ? 'mt-1 text-[12.5px] leading-relaxed' : 'mt-1 text-[12.5px] italic text-muted-foreground/80'}>
        {card.application_instructions ?? 'Not listed'}
      </p>
      {href && (
        <a href={href} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-[12.5px] font-medium text-primary hover:underline" data-testid={'link-lab-' + card.lab_id}>
          {url_domain(href)} <ArrowUpRight className="h-3.5 w-3.5" />
        </a>
      )}
      <CardCitations ids={card.citation_ids} citations={ctx.citations} message_id={ctx.message_id} />
    </CardFrame>
  );
}
