// Housing results with up-to-three selection driving the comparison table.
import { useState } from 'react';
import type { housing_card } from '@/lib/api_types';
import type { card_ctx } from '@/components/cards/card_context';
import { CardGrid } from '@/components/cards/card_parts';
import { HousingCard } from '@/components/cards/housing_card';
import { HousingCompare } from '@/components/cards/housing_compare';

const max_compare = 3;

export function HousingGroup({ cards, ctx }: { cards: housing_card[]; ctx: card_ctx }) {
  const [selected, set_selected] = useState<string[]>([]);
  const toggle = (id: string) =>
    set_selected((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length >= max_compare ? s : [...s, id]));
  const chosen = cards.filter((c) => selected.includes(c.listing_id));

  return (
    <div>
      <CardGrid>
        {cards.map((c) => (
          <HousingCard key={c.listing_id} card={c} ctx={ctx} selected={selected.includes(c.listing_id)} disabled={selected.length >= max_compare} on_toggle={() => toggle(c.listing_id)} />
        ))}
      </CardGrid>
      {cards.length > 1 && chosen.length < 2 && (
        <p className="mt-3 text-[12px] text-muted-foreground" role="status">
          {chosen.length === 0 ? 'Tick up to three listings to compare them side by side.' : 'Select one more listing to compare.'}
        </p>
      )}
      {chosen.length >= 2 && <HousingCompare cards={chosen} on_remove={toggle} />}
    </div>
  );
}
