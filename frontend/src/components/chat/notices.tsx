// Partial-status banner (calm amber) and muted freshness notes. Never invents values.
import { CircleAlert } from 'lucide-react';
import type { partial_status } from '@/lib/api_types';

const headings: Record<Exclude<partial_status['status'], 'complete'>, string> = {
  partial: 'Some information is missing',
  unverified: 'Parts of this answer are unverified',
};

export function PartialBanner({ status }: { status: partial_status }) {
  if (status.status === 'complete') return null;
  return (
    <div role="note" className="mb-4 flex gap-3 rounded-[10px] border border-gold/30 bg-amber-soft px-4 py-3 text-amber-ink">
      <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0 text-[13px] leading-relaxed">
        <p className="font-medium">{headings[status.status]}</p>
        {status.missing.length > 0 ? (
          <ul className="mt-1 list-disc pl-4 opacity-90">
            {status.missing.map((m) => <li key={m}>{m}</li>)}
          </ul>
        ) : (
          <p className="opacity-90">Treat the details below with care.</p>
        )}
      </div>
    </div>
  );
}

export function FreshnessNotes({ notes }: { notes: string[] }) {
  if (notes.length === 0) return null;
  return (
    <ul className="mt-4 grid gap-1">
      {notes.map((n) => (
        <li key={n} className="text-[11.5px] leading-relaxed text-muted-foreground">{n}</li>
      ))}
    </ul>
  );
}
