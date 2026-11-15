// Contextual right panel content: sources and freshness for the selected answer, plus checklist progress.
import { useEffect, useState } from 'react';
import { independence_note } from '@/lib/app_config';
import { use_chat } from '@/lib/chat_provider';
import type { panel_data } from '@/lib/use_panel_data';
import { SourceCard } from '@/components/chat/source_card';
import { ChecklistProgress } from '@/components/cards/checklist_progress';

export function RightPanel({ data }: { data: panel_data }) {
  const { focus } = use_chat();
  const [flash, set_flash] = useState<{ id: number; nonce: number } | null>(null);

  useEffect(() => {
    if (!focus || focus.message_id !== data.message_id) return;
    set_flash({ id: focus.citation_id, nonce: focus.nonce });
    document.getElementById('panel-src-' + focus.citation_id)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [focus, data.message_id]);

  return (
    <div className="flex flex-col gap-7 px-5 py-7">
      {data.checklist && <ChecklistProgress checklist={data.checklist} />}
      {data.citations.length > 0 && (
        <section aria-labelledby="panel-sources">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 id="panel-sources" className="text-[13px] font-medium">Sources and freshness</h2>
            <span className="text-[10.5px] text-muted-foreground">For the selected answer</span>
          </div>
          <div className="grid gap-2">
            {data.citations.map((c) => (
              <SourceCard
                key={c.id + '-' + (flash?.id === c.id ? flash.nonce : 0)}
                source={c}
                wide
                dom_id={'panel-src-' + c.id}
                highlighted={flash?.id === c.id}
              />
            ))}
          </div>
          {data.freshness_notes.length > 0 && (
            <ul className="mt-4 grid gap-1.5 border-t pt-3">
              {data.freshness_notes.map((n) => (
                <li key={n} className="text-[11px] leading-relaxed text-muted-foreground">{n}</li>
              ))}
            </ul>
          )}
        </section>
      )}
      <p className="text-[10.5px] leading-relaxed text-faint">{independence_note}</p>
    </div>
  );
}
