// Job card: title, employer, pay, hours, deadline, apply link and international eligibility.
import { ArrowUpRight, CalendarClock } from 'lucide-react';
import type { job_card } from '@/lib/api_types';
import { format_date, format_usd } from '@/lib/format';
import { safe_url } from '@/lib/safe_url';
import type { card_ctx } from '@/components/cards/card_context';
import { CardCitations, CardFrame, Field } from '@/components/cards/card_parts';
import { EligibilityBadge } from '@/components/cards/eligibility_badge';

function days_until(raw?: string): number | null {
  if (!raw) return null;
  const t = new Date(raw + 'T23:59:59').getTime();
  return Number.isNaN(t) ? null : Math.ceil((t - Date.now()) / 86_400_000);
}

export function JobCard({ card, ctx }: { card: job_card; ctx: card_ctx }) {
  const href = safe_url(card.apply_url);
  const days = days_until(card.deadline);
  return (
    <CardFrame>
      <EligibilityBadge value={card.international_eligibility} />
      <h3 className="mt-3 text-[14.5px] font-medium leading-snug">{card.title}</h3>
      <p className="text-[12.5px] text-muted-foreground">{[card.employer ?? 'Employer not listed', card.job_type].filter(Boolean).join(' \u00b7 ')}</p>
      <dl className="mt-4 grid grid-cols-2 gap-3">
        <Field label="Pay" value={card.hourly_pay_usd !== undefined ? format_usd(card.hourly_pay_usd, 2) + ' / hr' : null} />
        <Field label="Hours" value={card.hours_per_week !== undefined ? card.hours_per_week + ' / week' : null} />
      </dl>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t pt-3">
        <span className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground">
          <CalendarClock className="h-3.5 w-3.5" />
          {card.deadline ? (
            <>
              {format_date(card.deadline)}
              {days !== null && days >= 0 && days <= 14 && <span className="rounded bg-cardinal-soft px-1.5 text-[10.5px] font-medium text-primary">{days === 0 ? 'Today' : days + ' days left'}</span>}
            </>
          ) : (
            <span className="italic">Deadline not listed</span>
          )}
        </span>
        {href ? (
          <a href={href} target="_blank" rel="noopener noreferrer" data-testid={'link-apply-' + card.job_id} className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-[12px] font-medium text-primary-foreground transition-[filter] hover:brightness-110">
            Apply <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        ) : (
          <span className="text-[12px] italic text-muted-foreground/80">Apply link not listed</span>
        )}
      </div>
      <CardCitations ids={card.citation_ids} citations={ctx.citations} message_id={ctx.message_id} />
    </CardFrame>
  );
}
