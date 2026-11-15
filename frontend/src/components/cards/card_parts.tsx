// Shared card building blocks: frame, labelled field with "Not listed" fallback, citation pills, card grid.
import { Children, type ReactNode } from 'react';
import type { citation } from '@/lib/api_types';
import { cn } from '@/lib/utils';
import { CitationPill } from '@/components/chat/citation_pill';

export function CardFrame({ children, className, id }: { children: ReactNode; className?: string; id?: string }) {
  return <div id={id} className={cn('flex h-full flex-col rounded-xl border bg-card p-4 transition-[border-color] duration-200 hover:border-input sm:p-5', className)}>{children}</div>;
}

export function Field({ label, value }: { label: string; value: ReactNode | null | undefined }) {
  const empty = value === null || value === undefined || value === '';
  return (
    <div className="min-w-0">
      <dt className="text-[10.5px] uppercase tracking-[0.1em] text-faint">{label}</dt>
      <dd className={cn('mt-0.5 truncate text-[13px]', empty && 'text-muted-foreground/80 italic')}>{empty ? 'Not listed' : value}</dd>
    </div>
  );
}

export function CardCitations({ ids, citations, message_id }: { ids?: number[]; citations: citation[]; message_id: string }) {
  if (!ids || ids.length === 0) return null;
  return (
    <div className="mt-auto flex items-center gap-1 pt-3 text-[10.5px] text-faint">
      Sources
      {ids.map((id) => <CitationPill key={id} id={id} source={citations.find((c) => c.id === id)} message_id={message_id} />)}
    </div>
  );
}

/** One card renders full width; several become a grid on desktop and a snap scroller on mobile. */
export function CardGrid({ children }: { children: ReactNode }) {
  const count = Children.count(children);
  if (count <= 1) return <div>{children}</div>;
  return (
    <div className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2 scrollbar-thin md:mx-0 md:grid md:grid-cols-[repeat(2,minmax(0,1fr))] md:overflow-visible md:px-0 md:pb-0">
      {Children.map(children, (child) => <div className="w-[84%] min-w-0 shrink-0 snap-start md:w-auto">{child}</div>)}
    </div>
  );
}
