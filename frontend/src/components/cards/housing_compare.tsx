// Side-by-side housing comparison with computed monthly and semester cost; best values highlighted.
import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import type { housing_card } from '@/lib/api_types';
import { format_usd } from '@/lib/format';
import { cn } from '@/lib/utils';
import { bedrooms_label } from '@/components/cards/housing_card';

export const semester_months = 4.5;

function min_of(values: (number | undefined)[]): number | null {
  const nums = values.filter((v): v is number => v !== undefined);
  return nums.length ? Math.min(...nums) : null;
}

const not_listed = <span className="italic text-muted-foreground/80">Not listed</span>;

export function HousingCompare({ cards, on_remove }: { cards: housing_card[]; on_remove: (id: string) => void }) {
  const low_rent = min_of(cards.map((c) => c.monthly_rent_usd));
  const short_dist = min_of(cards.map((c) => c.distance_to_campus_miles));
  const best = (on: boolean) => cn(on && 'bg-sage-soft/70 font-medium text-sage');

  const rows: { label: string; cell: (c: housing_card) => ReactNode; best?: (c: housing_card) => boolean }[] = [
    { label: 'Type', cell: (c) => c.housing_type ?? not_listed },
    { label: 'Neighborhood', cell: (c) => c.neighborhood ?? not_listed },
    { label: 'Monthly rent', cell: (c) => (c.monthly_rent_usd !== undefined ? format_usd(c.monthly_rent_usd) : not_listed), best: (c) => c.monthly_rent_usd === low_rent },
    { label: 'Semester cost', cell: (c) => (c.monthly_rent_usd !== undefined ? format_usd(c.monthly_rent_usd * semester_months) : not_listed), best: (c) => c.monthly_rent_usd === low_rent },
    { label: 'Rooms', cell: (c) => bedrooms_label(c.bedrooms) ?? not_listed },
    { label: 'To campus', cell: (c) => (c.distance_to_campus_miles !== undefined ? c.distance_to_campus_miles + ' mi' : not_listed), best: (c) => c.distance_to_campus_miles === short_dist },
    { label: 'Furnished', cell: (c) => (c.furnished === undefined ? not_listed : c.furnished ? 'Yes' : 'No') },
    { label: 'Amenities', cell: (c) => (c.amenities?.length ? c.amenities.join(', ') : not_listed) },
  ];

  return (
    <div className="mt-4 overflow-hidden rounded-xl border bg-card animate-in fade-in slide-in-from-bottom-1 duration-200">
      <div className="flex items-baseline justify-between gap-3 border-b px-4 py-3">
        <h3 className="font-serif text-[17px]">Side by side</h3>
        <span className="text-[11px] text-muted-foreground">Best value highlighted</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-[12.5px]">
          <thead>
            <tr className="border-b bg-surface">
              <th className="w-[120px] px-4 py-2.5 text-left font-normal text-muted-foreground"><span className="sr-only">Attribute</span></th>
              {cards.map((c) => (
                <th key={c.listing_id} className="px-4 py-2.5 text-left font-medium">
                  <span className="flex items-start justify-between gap-2">
                    {c.name}
                    <button type="button" onClick={() => on_remove(c.listing_id)} aria-label={'Remove ' + c.name + ' from comparison'} className="text-faint hover:text-foreground">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} className="border-b last:border-0">
                <th scope="row" className="px-4 py-2.5 text-left font-normal text-muted-foreground">{r.label}</th>
                {cards.map((c) => (
                  <td key={c.listing_id} className={cn('px-4 py-2.5 transition-colors', r.best && best(r.best(c)))}>{r.cell(c)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="border-t bg-surface px-4 py-2.5 text-[11px] leading-relaxed text-muted-foreground">
        Semester cost assumes {semester_months} months of rent and excludes utilities, deposits and fees unless the listing includes them.
      </p>
    </div>
  );
}
