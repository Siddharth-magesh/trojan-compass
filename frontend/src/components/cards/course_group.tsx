// Course cards plus the shared schedule grid fed by each course's selected section.
import { useState } from 'react';
import type { course_card } from '@/lib/api_types';
import type { card_ctx } from '@/components/cards/card_context';
import { CardGrid } from '@/components/cards/card_parts';
import { CourseCard } from '@/components/cards/course_card';
import { ScheduleGrid } from '@/components/cards/schedule_grid';
import type { placed_section } from '@/components/cards/schedule_math';

export function CourseGroup({ cards, ctx }: { cards: course_card[]; ctx: card_ctx }) {
  const [picks, set_picks] = useState<Record<string, string>>(() =>
    Object.fromEntries(cards.filter((c) => c.sections?.length).map((c) => [c.course_id, c.sections?.[0]?.section_id ?? ''])),
  );
  const placed: placed_section[] = cards.flatMap((c, i) => {
    const s = c.sections?.find((x) => x.section_id === picks[c.course_id]);
    return s ? [{ key: c.course_id + ':' + s.section_id, course_id: c.course_id, title: c.title, section: s, tone: i }] : [];
  });

  return (
    <div>
      <CardGrid>
        {cards.map((c) => (
          <CourseCard key={c.course_id} card={c} ctx={ctx} selected_section={picks[c.course_id] ?? null} on_select={(id) => set_picks((p) => ({ ...p, [c.course_id]: id }))} />
        ))}
      </CardGrid>
      {placed.length > 0 && <ScheduleGrid items={placed} />}
    </div>
  );
}
