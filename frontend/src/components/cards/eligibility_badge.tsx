// International eligibility badge. "unverified" is styled distinctly and never implies eligibility.
import { CircleCheck, CircleHelp, CircleMinus } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { eligibility } from '@/lib/api_types';

export function EligibilityBadge({ value }: { value?: eligibility }) {
  if (value === 'yes') {
    return <span className="inline-flex items-center gap-1 rounded-[5px] bg-sage-soft px-1.5 py-0.5 text-[10.5px] font-medium text-sage"><CircleCheck className="h-3 w-3" /> Open to international students</span>;
  }
  if (value === 'no') {
    return <span className="inline-flex items-center gap-1 rounded-[5px] bg-muted px-1.5 py-0.5 text-[10.5px] font-medium text-muted-foreground"><CircleMinus className="h-3 w-3" /> Not open to international students</span>;
  }
  if (value === 'unverified') {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span tabIndex={0} className="inline-flex cursor-help items-center gap-1 rounded-[5px] border border-dashed border-gold/60 bg-amber-soft px-1.5 py-0.5 text-[10.5px] font-medium text-amber-ink">
            <CircleHelp className="h-3 w-3" /> Eligibility unverified
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-[220px] rounded-lg border bg-popover px-3 py-2 text-[11.5px] text-popover-foreground">
          Not confirmed either way. Do not assume you are eligible; check with the employer and OIS.
        </TooltipContent>
      </Tooltip>
    );
  }
  return <span className="text-[10.5px] italic text-muted-foreground">International eligibility not listed</span>;
}
