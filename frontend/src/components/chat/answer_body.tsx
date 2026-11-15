// Final answer body: partial banner, revealed markdown, cards, sources, freshness notes and follow-ups.
import { lazy, Suspense } from 'react';
import { useReducedMotion } from 'framer-motion';
import type { final_response } from '@/lib/api_types';
import { use_word_reveal } from '@/lib/use_word_reveal';
import { AnswerMarkdown } from '@/components/chat/answer_markdown';
import { FreshnessNotes, PartialBanner } from '@/components/chat/notices';
import { SourcesRow } from '@/components/chat/sources_row';
import { SuggestionChips } from '@/components/chat/suggestion_chips';

const CardsSection = lazy(() => import('@/components/cards/cards_section'));

export function AnswerBody({ final, message_id, animate }: { final: final_response; message_id: string; animate: boolean }) {
  const reduce = useReducedMotion();
  const { visible, revealing } = use_word_reveal(final.answer, animate && !reduce);
  return (
    <div>
      <PartialBanner status={final.partial_status} />
      <div aria-live="polite" aria-busy={revealing}>
        <AnswerMarkdown text={visible} citations={final.citations} message_id={message_id} />
      </div>
      {!revealing && (
        <div className="animate-in fade-in duration-300">
          {final.cards.length > 0 && (
            <Suspense fallback={<div className="mt-5 h-40 animate-pulse rounded-xl bg-muted" />}>
              <CardsSection cards={final.cards} citations={final.citations} message_id={message_id} />
            </Suspense>
          )}
          <SourcesRow citations={final.citations} message_id={message_id} />
          <FreshnessNotes notes={final.freshness_notes} />
          <SuggestionChips items={final.follow_ups ?? []} label="Keep exploring" />
        </div>
      )}
    </div>
  );
}
