// Authority badge for a citation: official, third party or synthetic.
import type { authority } from '@/lib/api_types';
import { cn } from '@/lib/utils';

const styles: Record<authority, { label: string; cls: string }> = {
  official: { label: 'Official', cls: 'bg-sage-soft text-sage' },
  third_party: { label: 'Third party', cls: 'bg-gold-soft text-amber-ink' },
  synthetic: { label: 'Synthetic', cls: 'border border-dashed border-input text-muted-foreground' },
};

export function AuthorityBadge({ authority }: { authority?: authority }) {
  if (!authority) return <span className="text-[10px] text-muted-foreground">Authority not listed</span>;
  const s = styles[authority];
  return <span className={cn('rounded-[4px] px-1.5 py-[2px] text-[9.5px] font-semibold uppercase tracking-[0.08em]', s.cls)}>{s.label}</span>;
}
