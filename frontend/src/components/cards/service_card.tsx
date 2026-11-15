// Service card: name, purpose, login-required badge and official link.
import { ArrowUpRight, Building2, Lock, LockOpen } from 'lucide-react';
import type { service_card } from '@/lib/api_types';
import { safe_url, url_domain } from '@/lib/safe_url';
import { CardFrame } from '@/components/cards/card_parts';

export function ServiceCard({ card }: { card: service_card }) {
  const href = safe_url(card.official_url);
  return (
    <CardFrame>
      <div className="flex items-start justify-between gap-3">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-sage-soft text-sage"><Building2 className="h-4 w-4" strokeWidth={1.8} /></span>
        {card.login_required === undefined ? (
          <span className="text-[10.5px] italic text-muted-foreground">Login requirement not listed</span>
        ) : card.login_required ? (
          <span className="inline-flex items-center gap-1 rounded-[5px] bg-gold-soft px-1.5 py-0.5 text-[10.5px] font-medium text-amber-ink"><Lock className="h-3 w-3" /> Login required</span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-[5px] bg-muted px-1.5 py-0.5 text-[10.5px] text-muted-foreground"><LockOpen className="h-3 w-3" /> Public</span>
        )}
      </div>
      <h3 className="mt-3 text-[14.5px] font-medium leading-snug">{card.name}</h3>
      <p className={card.purpose ? 'mt-1 text-[12.5px] leading-relaxed text-muted-foreground' : 'mt-1 text-[12.5px] italic text-muted-foreground/80'}>{card.purpose ?? 'Not listed'}</p>
      <div className="mt-auto pt-4">
        {href ? (
          <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[12.5px] font-medium text-primary hover:underline" data-testid={'link-service-' + card.service_id}>
            {url_domain(href)} <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        ) : (
          <span className="text-[12px] italic text-muted-foreground/80">Official link not listed</span>
        )}
      </div>
    </CardFrame>
  );
}
