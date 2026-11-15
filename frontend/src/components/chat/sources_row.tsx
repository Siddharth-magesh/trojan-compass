// "Sources" row under an answer: horizontally scrolling compact source cards with highlight on focus.
import { useEffect, useState } from 'react';
import type { citation } from '@/lib/api_types';
import { use_chat } from '@/lib/chat_provider';
import { SourceCard } from '@/components/chat/source_card';

export function SourcesRow({ citations, message_id }: { citations: citation[]; message_id: string }) {
  const { focus } = use_chat();
  const [flash, set_flash] = useState<{ id: number; nonce: number } | null>(null);

  useEffect(() => {
    if (focus?.message_id === message_id) set_flash({ id: focus.citation_id, nonce: focus.nonce });
  }, [focus, message_id]);

  if (citations.length === 0) return null;
  return (
    <section aria-label="Sources" className="mt-5">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-faint">Sources</p>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-thin">
        {citations.map((c) => (
          <SourceCard
            key={c.id + '-' + (flash?.id === c.id ? flash.nonce : 0)}
            source={c}
            dom_id={'src-' + message_id + '-' + c.id}
            highlighted={flash?.id === c.id}
          />
        ))}
      </div>
    </section>
  );
}
