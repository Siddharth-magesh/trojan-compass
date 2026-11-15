// Right-panel data for the selected answer (or the latest one): its sources, freshness notes and checklist.
import { useMemo } from 'react';
import type { checklist_card, citation } from '@/lib/api_types';
import { use_chat } from '@/lib/chat_provider';

export type panel_data = {
  message_id: string | null;
  citations: citation[];
  freshness_notes: string[];
  checklist: checklist_card | null;
};

export function panel_has_content(p: panel_data): boolean {
  return p.citations.length > 0 || p.checklist !== null;
}

export function use_panel_data(): panel_data {
  const { messages, selected_id } = use_chat();
  return useMemo(() => {
    const answers = messages.filter((m) => m.role === 'assistant' && m.final);
    const chosen = answers.find((m) => m.id === selected_id) ?? answers[answers.length - 1];
    const final = chosen?.role === 'assistant' ? chosen.final : undefined;
    // The checklist stays in the panel even when a later answer without one is selected.
    let checklist: checklist_card | null = null;
    for (const m of answers) {
      if (m.role !== 'assistant' || !m.final) continue;
      const found = m.final.cards.find((c): c is checklist_card => c.type === 'checklist');
      if (found) checklist = found;
    }
    return {
      message_id: chosen?.id ?? null,
      citations: final?.citations ?? [],
      freshness_notes: final?.freshness_notes ?? [],
      checklist,
    };
  }, [messages, selected_id]);
}
