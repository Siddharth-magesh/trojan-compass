// Inline superscript citation marker with hover details; click focuses the matching source.
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { citation } from '@/lib/api_types';
import { use_chat } from '@/lib/chat_provider';
import { format_date } from '@/lib/format';

export function CitationPill({ id, source, message_id }: { id: number; source?: citation; message_id: string }) {
  const { focus_citation } = use_chat();
  const verified = format_date(source?.verified_date);
  const pill = (
    <button
      type="button"
      onClick={() => {
        focus_citation(message_id, id);
        document.getElementById('src-' + message_id + '-' + id)?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }}
      aria-label={'Source ' + id + (source ? ': ' + source.source_name : '')}
      data-testid={'button-citation-' + id}
      className="mx-[1px] inline-grid h-[16px] min-w-[16px] -translate-y-[5px] place-items-center rounded-[5px] bg-cardinal-soft px-[4px] align-baseline text-[9.5px] font-semibold not-italic leading-none tabular-nums text-primary transition-colors duration-150 hover:bg-primary hover:text-primary-foreground"
    >
      {id}
    </button>
  );
  if (!source) return pill;
  return (
    <Tooltip delayDuration={150}>
      <TooltipTrigger asChild>{pill}</TooltipTrigger>
      <TooltipContent side="top" className="max-w-[240px] rounded-lg border bg-popover px-3 py-2 text-popover-foreground shadow-soft">
        <p className="text-[12px] font-medium">{source.source_name}</p>
        {source.title && <p className="text-[11px] text-muted-foreground">{source.title}</p>}
        <p className="mt-1 text-[10.5px] text-muted-foreground">{verified ? 'Verified ' + verified : 'Verification date not listed'}</p>
      </TooltipContent>
    </Tooltip>
  );
}
