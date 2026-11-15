// Fallback renderer for unknown card types: a tidy key-value list of primitive fields.
import { Shapes } from 'lucide-react';
import type { card } from '@/lib/api_types';
import { safe_url } from '@/lib/safe_url';
import { CardFrame } from '@/components/cards/card_parts';

function display(value: unknown): { text: string; href: string | null } | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'string') return { text: value, href: /^https?:/i.test(value) ? safe_url(value) : null };
  if (typeof value === 'number' || typeof value === 'boolean') return { text: String(value), href: null };
  if (Array.isArray(value) && value.every((v) => typeof v !== 'object')) return { text: value.join(', '), href: null };
  return { text: 'Structured value', href: null };
}

const pretty = (key: string) => key.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());

export function GenericCard({ card }: { card: card }) {
  const record: Record<string, unknown> = { ...card };
  const title = typeof record.title === 'string' ? record.title : typeof record.name === 'string' ? record.name : pretty(card.type);
  const entries = Object.entries(record).filter(([k]) => !['type', 'title', 'name'].includes(k));
  return (
    <CardFrame>
      <div className="flex items-center gap-2">
        <Shapes className="h-4 w-4 text-faint" />
        <span className="rounded bg-muted px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider text-muted-foreground">{pretty(card.type)}</span>
      </div>
      <h3 className="mt-2 font-serif text-[18px] leading-snug">{title}</h3>
      <dl className="mt-3 grid gap-2">
        {entries.map(([k, v]) => {
          const d = display(v);
          return (
            <div key={k} className="grid grid-cols-[120px_1fr] gap-3 text-[12.5px]">
              <dt className="text-muted-foreground">{pretty(k)}</dt>
              <dd className={d ? '' : 'italic text-muted-foreground/80'}>
                {!d ? 'Not listed' : d.href ? <a href={d.href} target="_blank" rel="noopener noreferrer" className="text-primary underline-offset-2 hover:underline">{d.text}</a> : d.text}
              </dd>
            </div>
          );
        })}
      </dl>
    </CardFrame>
  );
}
