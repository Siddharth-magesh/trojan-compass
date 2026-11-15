// One assistant message: label, activity timeline, then streaming text, final answer, clarification or error.
import { CircleSlash } from 'lucide-react';
import { app_name } from '@/lib/app_config';
import type { assistant_message } from '@/lib/chat_types';
import { use_chat } from '@/lib/chat_provider';
import { cn } from '@/lib/utils';
import { BrandMark } from '@/components/layout/brand_mark';
import { ActivityTimeline } from '@/components/chat/activity_timeline';
import { AnswerBody } from '@/components/chat/answer_body';
import { AnswerMarkdown } from '@/components/chat/answer_markdown';
import { ErrorNotice } from '@/components/chat/error_notice';
import { MessageActions } from '@/components/chat/message_actions';
import { SuggestionChips } from '@/components/chat/suggestion_chips';

function TypingSkeleton() {
  return (
    <div className="grid gap-2.5 py-1" aria-hidden="true">
      {['w-[92%]', 'w-[78%]', 'w-[55%]'].map((w) => (
        <div key={w} className={cn('h-3 animate-pulse rounded-full bg-muted', w)} />
      ))}
    </div>
  );
}

export function AssistantTurn({ message, is_last }: { message: assistant_message; is_last: boolean }) {
  const { selected_id, select_message } = use_chat();
  const streaming = message.phase === 'streaming';
  const streamed = message.delta_text.length > 0;
  const selected = selected_id === message.id && !!message.final;

  return (
    <article
      className="group/turn relative"
      aria-label={'Answer from ' + app_name}
      onClick={() => message.final && select_message(message.id)}
      data-testid={'message-assistant-' + message.id}
    >
      <div className="mb-3 flex items-center gap-2">
        <BrandMark className="h-[19px] w-[18px]" />
        <span className="font-serif text-[15px] text-primary">{app_name}</span>
        {selected && <span className="hidden rounded bg-sage-soft px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider text-sage xl:inline">Sources shown</span>}
      </div>

      <ActivityTimeline message={message} />

      {streaming && !streamed && <TypingSkeleton />}
      {streaming && streamed && (
        <div aria-live="polite" aria-busy="true" className="caret-blink">
          <AnswerMarkdown text={message.delta_text} citations={[]} message_id={message.id} />
        </div>
      )}

      {message.final && <AnswerBody final={message.final} message_id={message.id} animate={!message.from_history && !streamed} />}

      {message.clarification && (
        <div>
          <p className="font-serif text-[19px] leading-snug">{message.clarification.question}</p>
          <SuggestionChips items={message.clarification.options ?? []} label="Quick replies" variant="clarify" />
          {is_last && <p className="mt-3 text-[12px] text-muted-foreground">Or type your own answer below.</p>}
        </div>
      )}

      {message.phase === 'error' && message.error && (
        <>
          {streamed && <AnswerMarkdown text={message.delta_text} citations={[]} message_id={message.id} />}
          <ErrorNotice error={message.error} is_last={is_last} />
        </>
      )}

      {message.phase === 'cancelled' && (
        <>
          {streamed && <AnswerMarkdown text={message.delta_text} citations={[]} message_id={message.id} />}
          <p className="flex items-center gap-2 text-[12.5px] text-muted-foreground">
            <CircleSlash className="h-3.5 w-3.5" /> You stopped this response.
          </p>
        </>
      )}

      {!streaming && (message.final || message.phase === 'cancelled') && (
        <MessageActions message={message} is_last={is_last} copy_text={message.final?.answer ?? message.delta_text} />
      )}
    </article>
  );
}
