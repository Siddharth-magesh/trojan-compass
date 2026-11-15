// Conversation transcript: user bubbles and assistant turns with entrance motion and auto-scroll.
import { useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import type { chat_message } from '@/lib/chat_types';
import { AssistantTurn } from '@/components/chat/assistant_turn';

export function MessageList({ messages }: { messages: chat_message[] }) {
  const reduce = useReducedMotion();
  const end_ref = useRef<HTMLDivElement>(null);
  const count = messages.length;

  useEffect(() => {
    end_ref.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'end' });
  }, [count, reduce]);

  const last_assistant = [...messages].reverse().find((m) => m.role === 'assistant');
  return (
    <div className="grid gap-9 pb-6 pt-8">
      {messages.map((m) => (
        <motion.div
          key={m.id}
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
        >
          {m.role === 'user' ? (
            <div className="ml-auto max-w-[85%] whitespace-pre-wrap rounded-[14px] rounded-br-[4px] bg-accent px-4 py-3 text-[14.5px] leading-relaxed text-accent-foreground sm:max-w-[75%]" data-testid={'message-user-' + m.id}>
              {m.content}
            </div>
          ) : (
            <AssistantTurn message={m} is_last={m.id === last_assistant?.id} />
          )}
        </motion.div>
      ))}
      <div ref={end_ref} />
    </div>
  );
}
