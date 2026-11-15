// Interactive checklist: collapsible groups, due dates, progress ring; ticks persist per conversation.
import { useState } from 'react';
import { ArrowUpRight, Check, ChevronDown } from 'lucide-react';
import type { checklist_card, checklist_item } from '@/lib/api_types';
import { use_auth } from '@/lib/auth_provider';
import { use_chat } from '@/lib/chat_provider';
import { format_date } from '@/lib/format';
import { checklist_scope, toggle_checked_item, use_checked_items } from '@/lib/local_store';
import { safe_url } from '@/lib/safe_url';
import { cn } from '@/lib/utils';
import { ProgressRing } from '@/components/ui/progress_ring';

function ItemRow({ item, done, on_toggle }: { item: checklist_item; done: boolean; on_toggle: () => void }) {
  const href = safe_url(item.link);
  const due = format_date(item.due_date);
  const soon = item.due_date ? new Date(item.due_date + 'T23:59:59').getTime() - Date.now() < 7 * 86_400_000 : false;
  return (
    <li className="flex items-start gap-3 py-2">
      <button
        type="button"
        role="checkbox"
        aria-checked={done}
        aria-label={item.label}
        onClick={on_toggle}
        data-testid={'checkbox-item-' + item.id}
        className={cn('mt-0.5 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-[5px] border transition-all duration-200 active:scale-90', done ? 'border-sage bg-sage text-background' : 'border-input hover:border-sage')}
      >
        {done && <Check className="h-3 w-3" strokeWidth={3} />}
      </button>
      <div className="min-w-0 flex-1">
        <p className={cn('text-[13px] leading-snug transition-colors', done && 'text-muted-foreground line-through decoration-faint')}>{item.label}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px]">
          {due && <span className={cn('text-muted-foreground', soon && !done && 'font-medium text-amber-ink')}>Due {due}</span>}
          {href && (
            <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-primary hover:underline">
              Open <ArrowUpRight className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>
    </li>
  );
}

export function ChecklistCard({ card }: { card: checklist_card }) {
  const { student } = use_auth();
  const { session_id } = use_chat();
  const scope = checklist_scope(student?.student_id ?? null, session_id, card.title);
  const checked = use_checked_items(scope);
  const [closed, set_closed] = useState<Record<string, boolean>>({});
  const items = card.groups.flatMap((g) => g.items);
  const done = items.filter((i) => checked[i.id]).length;

  return (
    <div id="checklist-card" className="scroll-mt-6 rounded-xl border bg-card">
      <div className="flex items-center gap-4 border-b px-4 py-4 sm:px-5">
        <ProgressRing value={items.length ? done / items.length : 0} size={48} />
        <div className="min-w-0">
          <h3 className="font-serif text-[20px] leading-tight">{card.title}</h3>
          <p className="text-[12px] text-muted-foreground" aria-live="polite">{done} of {items.length} done{done === items.length && items.length > 0 ? '. Nicely done.' : ''}</p>
        </div>
      </div>
      <div className="divide-y">
        {card.groups.map((g) => {
          const g_done = g.items.filter((i) => checked[i.id]).length;
          const is_closed = closed[g.title] ?? false;
          return (
            <section key={g.title} className="px-4 sm:px-5">
              <button
                type="button"
                onClick={() => set_closed((c) => ({ ...c, [g.title]: !is_closed }))}
                aria-expanded={!is_closed}
                className="flex w-full items-center justify-between py-3 text-left"
              >
                <span className="text-[13px] font-medium">{g.title}</span>
                <span className="flex items-center gap-2 text-[11.5px] tabular-nums text-muted-foreground">
                  {g_done}/{g.items.length}
                  <ChevronDown className={cn('h-4 w-4 text-faint transition-transform duration-200', !is_closed && 'rotate-180')} />
                </span>
              </button>
              {!is_closed && (
                <ul className="-mt-1 pb-2 animate-in fade-in duration-200">
                  {g.items.map((item) => <ItemRow key={item.id} item={item} done={Boolean(checked[item.id])} on_toggle={() => toggle_checked_item(scope, item.id)} />)}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
