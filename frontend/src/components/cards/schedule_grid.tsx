// Weekly Mon-Fri grid for selected sections: overlaps in red with an explanation, TBA sections listed apart.
import { CalendarX2, TriangleAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { find_conflicts, format_minutes, has_time, to_blocks, week_days, type placed_section } from '@/components/cards/schedule_math';

const hour_px = 44;
const tones = ['bg-sage-soft text-sage border-sage/30', 'bg-gold-soft text-amber-ink border-gold/40', 'bg-accent text-accent-foreground border-input'];

export function ScheduleGrid({ items }: { items: placed_section[] }) {
  const blocks = to_blocks(items);
  const conflicts = find_conflicts(blocks);
  const conflicted = new Set(conflicts.flatMap((c) => [c.a.key, c.b.key]));
  const untimed = items.filter((p) => !has_time(p.section));
  const first_hour = Math.min(8, ...blocks.map((b) => Math.floor(b.start / 60)));
  const last_hour = Math.max(18, ...blocks.map((b) => Math.ceil(b.end / 60)));
  const hours = Array.from({ length: last_hour - first_hour }, (_, i) => first_hour + i);

  return (
    <div className="mt-4 rounded-xl border bg-card">
      <div className="flex items-baseline justify-between gap-3 border-b px-4 py-3">
        <h3 className="font-serif text-[17px]">Your week</h3>
        <span className="text-[11px] text-muted-foreground">{blocks.length ? 'Selected sections' : 'No timed sections selected'}</span>
      </div>

      {conflicts.length > 0 && (
        <div role="alert" className="mx-4 mt-3 flex gap-2.5 rounded-lg border border-destructive/25 bg-cardinal-soft px-3 py-2.5 text-[12.5px] text-destructive">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <ul className="grid gap-0.5">
            {conflicts.map((c) => (
              <li key={c.a.key + c.b.key}>
                <strong className="font-medium">{c.a.course_id}</strong> ({c.a.section.section_id}) and <strong className="font-medium">{c.b.course_id}</strong> ({c.b.section.section_id}) overlap on {c.days.join(', ')}, {format_minutes(Math.max(c.a.start, c.b.start))} to {format_minutes(Math.min(c.a.end, c.b.end))}. Choose another section for one of them.
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="overflow-x-auto p-4">
        <div className="grid min-w-[520px] grid-cols-[44px_repeat(5,1fr)]">
          <div />
          {week_days.map((d) => <div key={d} className="pb-2 text-center text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{d}</div>)}
          <div className="relative" style={{ height: hours.length * hour_px }}>
            {hours.map((h, i) => <span key={h} className="absolute right-2 -translate-y-1/2 text-[10px] tabular-nums text-faint" style={{ top: i * hour_px }}>{format_minutes(h * 60)}</span>)}
          </div>
          {week_days.map((d) => (
            <div key={d} className="relative border-l" style={{ height: hours.length * hour_px }}>
              {hours.map((h, i) => <div key={h} className="absolute inset-x-0 border-t border-dashed border-border/70" style={{ top: i * hour_px }} />)}
              {blocks.filter((b) => b.day === d).map((b) => {
                const bad = conflicted.has(b.key);
                return (
                  <div
                    key={b.key + d}
                    className={cn('absolute inset-x-1 overflow-hidden rounded-md border px-1.5 py-1 text-[10.5px] leading-tight', bad ? 'border-destructive/50 bg-destructive/10 text-destructive' : tones[b.tone % tones.length])}
                    style={{ top: ((b.start - first_hour * 60) / 60) * hour_px, height: ((b.end - b.start) / 60) * hour_px - 2 }}
                    title={b.course_id + ' ' + b.section.section_id}
                  >
                    <span className="block font-semibold">{b.course_id}</span>
                    <span className="block opacity-80">{format_minutes(b.start)}</span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {untimed.length > 0 && (
        <div className="border-t px-4 py-3">
          <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground"><CalendarX2 className="h-3.5 w-3.5" /> Time not announced</p>
          <ul className="mt-1.5 grid gap-1">
            {untimed.map((p) => (
              <li key={p.key} className="text-[12.5px]">{p.course_id} <span className="text-muted-foreground">section {p.section.section_id}{p.section.modality ? ', ' + p.section.modality : ''}</span></li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
