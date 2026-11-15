// Sticky auto-growing composer: Enter sends, Shift+Enter adds a newline, Stop while streaming.
import { useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { ArrowUp, Square } from 'lucide-react';
import { app_name } from '@/lib/app_config';
import { use_chat } from '@/lib/chat_provider';
import { cn } from '@/lib/utils';
import { ContextPopover } from '@/components/chat/context_popover';

export function Composer({ inline = false }: { inline?: boolean }) {
  const { send, stop, streaming } = use_chat();
  const [value, set_value] = useState('');
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
  }, [value]);

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    if (send(value)) set_value('');
  };

  const on_key = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  };

  const empty = value.trim().length === 0;
  return (
    <div className={inline ? 'pb-3 pt-2' : 'sticky bottom-0 z-10 bg-gradient-to-b from-transparent via-background/95 to-background pb-3 pt-6'}>
      <form onSubmit={submit} className="rounded-[14px] border bg-card px-4 pb-2.5 pt-3.5 shadow-soft transition-[border-color] duration-200 focus-within:border-input">
        <label htmlFor="composer-input" className="sr-only">Message {app_name}</label>
        <textarea
          id="composer-input"
          ref={ref}
          rows={1}
          value={value}
          onChange={(e) => set_value(e.target.value)}
          onKeyDown={on_key}
          placeholder="Ask anything about your USC journey..."
          data-testid="input-composer"
          className="block max-h-[200px] min-h-[28px] w-full resize-none bg-transparent text-[14.5px] leading-relaxed text-foreground outline-none placeholder:text-faint focus-visible:outline-none"
        />
        <div className="mt-2 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <ContextPopover />
            <span className="hidden text-[11px] text-faint sm:inline">Shift + Enter for a new line</span>
          </div>
          {streaming ? (
            <button
              type="button"
              onClick={stop}
              aria-label="Stop generating"
              data-testid="button-stop"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-[12px] font-medium transition-colors hover:bg-accent"
            >
              <Square className="h-3 w-3 fill-current" /> Stop
            </button>
          ) : (
            <button
              type="submit"
              disabled={empty}
              aria-label="Send message"
              data-testid="button-send"
              className={cn('grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground transition-all duration-200 hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-35')}
            >
              <ArrowUp className="h-4 w-4" />
            </button>
          )}
        </div>
      </form>
      <p className="mt-2.5 text-center text-[10.5px] leading-relaxed text-faint">
        A little guidance, grounded in USC sources. <span className="text-muted-foreground">Always confirm important decisions with the official office.</span>
        <span className="mt-1 block text-muted-foreground">An independent student project. Not an official USC service.</span>
      </p>
    </div>
  );
}
