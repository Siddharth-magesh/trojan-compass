// Renders all cards of an answer, grouped by type in first-appearance order. Lazy-loaded.
import type { card, citation } from '@/lib/api_types';
import { render_card_group } from '@/components/cards/card_registry';

function group_by_type(cards: card[]): [string, card[]][] {
  const groups = new Map<string, card[]>();
  cards.forEach((c) => groups.set(c.type, [...(groups.get(c.type) ?? []), c]));
  return [...groups.entries()];
}

export default function CardsSection({ cards, citations, message_id }: { cards: card[]; citations: citation[]; message_id: string }) {
  return (
    <div className="mt-6 grid gap-6">
      {group_by_type(cards).map(([type, group]) => (
        <section key={type} aria-label={type + ' results'}>{render_card_group(type, group, { citations, message_id })}</section>
      ))}
    </div>
  );
}
