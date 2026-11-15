// Quick-reply chips used for clarification options and follow-up suggestions.
import { ArrowUpRight } from 'lucide-react';
import { use_chat } from '@/lib/chat_provider';
import { cn } from '@/lib/utils';

export function SuggestionChips({ items, label, variant = 'follow_up' }: { items: string[]; label: string; variant?: 'follow_up' | 'clarify' }) {
  const { send, streaming } = use_chat();
  if (items.length === 0) return null;
  return (
    <div className="mt-5">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-faint">{label}</p>
      <div className="flex flex-wrap gap-2">
        {items.map((item, i) => (
          <button
            key={item}
            type="button"
            disabled={streaming}
            onClick={() => send(item)}
            data-testid={'button-chip-' + variant + '-' + i}
            className={cn(
              'group inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[12.5px] transition-all duration-200 hover:-translate-y-px disabled:pointer-events-none disabled:opacity-50',
              variant === 'clarify' ? 'border-primary/25 bg-cardinal-soft/60 text-primary hover:border-primary/50' : 'bg-surface text-muted-foreground hover:border-input hover:text-foreground',
            )}
          >
            {item}
            <ArrowUpRight className="h-3 w-3 opacity-50 transition-opacity group-hover:opacity-100" />
          </button>
        ))}
      </div>
    </div>
  );
}
