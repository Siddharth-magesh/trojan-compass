// Housing card: listing details, amenity tags and a compare checkbox (max three).
import { Check, House } from 'lucide-react';
import type { housing_card } from '@/lib/api_types';
import { format_usd } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { card_ctx } from '@/components/cards/card_context';
import { CardCitations, CardFrame, Field } from '@/components/cards/card_parts';

export function bedrooms_label(n?: number): string | null {
  if (n === undefined) return null;
  return n === 0 ? 'Studio' : n + ' bedroom' + (n === 1 ? '' : 's');
}

export function HousingCard({ card, ctx, selected, disabled, on_toggle }: {
  card: housing_card;
  ctx: card_ctx;
  selected: boolean;
  disabled: boolean;
  on_toggle: () => void;
}) {
  return (
    <CardFrame className={cn(selected && 'border-sage/60 ring-1 ring-sage/30')}>
      <div className="flex items-start justify-between gap-3">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-cardinal-soft text-primary"><House className="h-4 w-4" strokeWidth={1.8} /></span>
        <button
          type="button"
          role="checkbox"
          aria-checked={selected}
          disabled={disabled && !selected}
          onClick={on_toggle}
          title={disabled && !selected ? 'You can compare up to three' : undefined}
          data-testid={'checkbox-compare-' + card.listing_id}
          className="inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11.5px] text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className={cn('grid h-3.5 w-3.5 place-items-center rounded-[4px] border transition-colors', selected && 'border-sage bg-sage text-background')}>
            {selected && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
          </span>
          Compare
        </button>
      </div>
      <h3 className="mt-3 text-[14.5px] font-medium leading-snug">{card.name}</h3>
      <p className="text-[12.5px] text-muted-foreground">{[card.housing_type ?? 'Type not listed', card.neighborhood].filter(Boolean).join(' \u00b7 ')}</p>
      <p className="mt-3 font-serif text-[24px] leading-none">
        {card.monthly_rent_usd !== undefined ? format_usd(card.monthly_rent_usd) : <span className="font-sans text-[13px] italic text-muted-foreground">Rent not listed</span>}
        {card.monthly_rent_usd !== undefined && <span className="ml-1 font-sans text-[12px] text-muted-foreground">/ month</span>}
      </p>
      <dl className="mt-4 grid grid-cols-3 gap-3">
        <Field label="Rooms" value={bedrooms_label(card.bedrooms)} />
        <Field label="To campus" value={card.distance_to_campus_miles !== undefined ? card.distance_to_campus_miles + ' mi' : null} />
        <Field label="Furnished" value={card.furnished === undefined ? null : card.furnished ? 'Yes' : 'No'} />
      </dl>
      {card.amenities && card.amenities.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-1.5">
          {card.amenities.map((a) => <li key={a} className="rounded-full bg-surface px-2 py-0.5 text-[11px] text-muted-foreground ring-1 ring-border">{a}</li>)}
        </ul>
      )}
      <CardCitations ids={card.citation_ids} citations={ctx.citations} message_id={ctx.message_id} />
    </CardFrame>
  );
}
