// Compact source card: name, domain, verified date and authority badge. Used under answers and in the panel.
import { ArrowUpRight } from 'lucide-react';
import type { citation } from '@/lib/api_types';
import { format_date } from '@/lib/format';
import { safe_url, url_domain } from '@/lib/safe_url';
import { cn } from '@/lib/utils';
import { AuthorityBadge } from '@/components/chat/authority_badge';

export function SourceCard({ source, highlighted, dom_id, wide = false }: { source: citation; highlighted: boolean; dom_id: string; wide?: boolean }) {
  const href = safe_url(source.url);
  const verified = format_date(source.verified_date);
  const body = (
    <>
      <span className="flex items-start gap-2">
        <span className="mt-px grid h-[18px] min-w-[18px] place-items-center rounded-[5px] bg-cardinal-soft px-1 text-[10px] font-semibold tabular-nums text-primary">{source.id}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[12.5px] font-medium text-foreground">{source.source_name}</span>
          <span className="block truncate text-[11px] text-muted-foreground">{href ? url_domain(href) : 'Link unavailable'}</span>
        </span>
        {href && <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-faint transition-transform duration-200 group-hover:-translate-y-px group-hover:translate-x-px" />}
      </span>
      <span className="mt-2 flex flex-wrap items-center gap-1.5">
        <AuthorityBadge authority={source.authority} />
        <span className="text-[10.5px] text-muted-foreground">{verified ? 'Verified ' + verified : 'Verification date not listed'}</span>
      </span>
    </>
  );
  const cls = cn(
    'group block rounded-[10px] border bg-card px-3 py-2.5 text-left transition-[border-color,transform] duration-200 hover:-translate-y-px hover:border-input',
    wide ? 'w-full' : 'w-[220px] shrink-0',
    highlighted && 'flash-highlight border-primary/50',
  );
  return href ? (
    <a id={dom_id} href={href} target="_blank" rel="noopener noreferrer" className={cls} data-testid={'link-source-' + dom_id}>
      {body}
    </a>
  ) : (
    <div id={dom_id} className={cls}>{body}</div>
  );
}
