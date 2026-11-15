// Right panel summary of the conversation's checklist: ring plus per-group bars.
import type { checklist_card } from '@/lib/api_types';
import { use_auth } from '@/lib/auth_provider';
import { use_chat } from '@/lib/chat_provider';
import { checklist_scope, use_checked_items } from '@/lib/local_store';
import { ProgressRing } from '@/components/ui/progress_ring';

export function ChecklistProgress({ checklist }: { checklist: checklist_card }) {
  const { student } = use_auth();
  const { session_id } = use_chat();
  const checked = use_checked_items(checklist_scope(student?.student_id ?? null, session_id, checklist.title));
  const items = checklist.groups.flatMap((g) => g.items);
  const done = items.filter((i) => checked[i.id]).length;
  const scroll_to_card = () => document.getElementById('checklist-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <section aria-labelledby="panel-checklist" className="rounded-xl border bg-gradient-to-br from-sage-soft/70 to-card p-4">
      <p className="text-[9.5px] font-semibold uppercase tracking-[0.18em] text-sage">Checklist progress</p>
      <div className="mt-3 flex items-center gap-3">
        <ProgressRing value={items.length ? done / items.length : 0} size={50} />
        <div className="min-w-0">
          <h3 id="panel-checklist" className="truncate font-serif text-[18px] leading-tight">{checklist.title}</h3>
          <p className="text-[11.5px] text-muted-foreground">{done} of {items.length} done</p>
        </div>
      </div>
      <ul className="mt-4 grid gap-2.5">
        {checklist.groups.map((g) => {
          const g_done = g.items.filter((i) => checked[i.id]).length;
          return (
            <li key={g.title}>
              <div className="flex justify-between text-[11px]">
                <span className="truncate text-foreground/80">{g.title}</span>
                <span className="tabular-nums text-muted-foreground">{g_done}/{g.items.length}</span>
              </div>
              <div className="mt-1 h-1 overflow-hidden rounded-full bg-border">
                <div className="h-full origin-left rounded-full bg-sage transition-transform duration-300" style={{ transform: 'scaleX(' + (g.items.length ? g_done / g.items.length : 0) + ')' }} />
              </div>
            </li>
          );
        })}
      </ul>
      <button type="button" onClick={scroll_to_card} className="mt-4 text-[11.5px] font-medium text-sage hover:underline" data-testid="button-jump-checklist">
        Open checklist
      </button>
    </section>
  );
}
