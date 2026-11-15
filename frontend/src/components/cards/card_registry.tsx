// Card registry: maps cards[].type to a group renderer. Unknown or malformed types use the generic card.
// Adding a new type = one component + one entry below.
import type { ReactNode } from 'react';
import type { card } from '@/lib/api_types';
import type { card_ctx } from '@/components/cards/card_context';
import { is_checklist, is_course, is_housing, is_job, is_lab, is_service } from '@/components/cards/card_guards';
import { LabCard } from '@/components/cards/lab_card';
import { CardGrid } from '@/components/cards/card_parts';
import { ChecklistCard } from '@/components/cards/checklist_card';
import { CourseGroup } from '@/components/cards/course_group';
import { GenericCard } from '@/components/cards/generic_card';
import { HousingGroup } from '@/components/cards/housing_group';
import { JobCard } from '@/components/cards/job_card';
import { ServiceCard } from '@/components/cards/service_card';

type group_renderer = (cards: card[], ctx: card_ctx) => ReactNode;

function entry<T extends card>(guard: (c: card) => c is T, render: (cards: T[], ctx: card_ctx) => ReactNode): group_renderer {
  return (cards, ctx) => {
    const typed = cards.filter(guard);
    const rest = cards.filter((c) => !guard(c));
    return (
      <>
        {typed.length > 0 && render(typed, ctx)}
        {rest.length > 0 && render_generic(rest, ctx)}
      </>
    );
  };
}

function render_generic(cards: card[], _ctx: card_ctx): ReactNode {
  return <CardGrid>{cards.map((c, i) => <GenericCard key={i} card={c} />)}</CardGrid>;
}

export const card_registry: Record<string, group_renderer> = {
  course: entry(is_course, (cards, ctx) => <CourseGroup cards={cards} ctx={ctx} />),
  housing: entry(is_housing, (cards, ctx) => <HousingGroup cards={cards} ctx={ctx} />),
  job: entry(is_job, (cards, ctx) => <CardGrid>{cards.map((c) => <JobCard key={c.job_id} card={c} ctx={ctx} />)}</CardGrid>),
  lab: entry(is_lab, (cards, ctx) => <CardGrid>{cards.map((c) => <LabCard key={c.lab_id} card={c} ctx={ctx} />)}</CardGrid>),
  service: entry(is_service, (cards) => <CardGrid>{cards.map((c) => <ServiceCard key={c.service_id} card={c} />)}</CardGrid>),
  checklist: entry(is_checklist, (cards) => <div className="grid gap-3">{cards.map((c) => <ChecklistCard key={c.title} card={c} />)}</div>),
};

export function render_card_group(type: string, cards: card[], ctx: card_ctx): ReactNode {
  const renderer = card_registry[type] ?? render_generic;
  return renderer(cards, ctx);
}
