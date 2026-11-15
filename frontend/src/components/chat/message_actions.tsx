// Per-answer actions: copy, regenerate (latest only), local thumbs up/down and view sources.
import { useState, type ReactNode } from 'react';
import { Check, Copy, PanelRight, RotateCcw, ThumbsDown, ThumbsUp } from 'lucide-react';
import type { assistant_message } from '@/lib/chat_types';
import { use_chat } from '@/lib/chat_provider';
import { cn } from '@/lib/utils';
import { use_shell } from '@/components/layout/shell_context';

function ActionButton({ label, onClick, active, children, testid }: { label: string; onClick: () => void; active?: boolean; children: ReactNode; testid: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      onClick={onClick}
      data-testid={testid}
      className={cn('grid h-8 w-8 place-items-center rounded-md text-faint transition-colors duration-150 hover:bg-accent hover:text-foreground', active && 'text-primary')}
    >
      {children}
    </button>
  );
}

export function MessageActions({ message, is_last, copy_text }: { message: assistant_message; is_last: boolean; copy_text: string }) {
  const { regenerate, set_feedback, streaming, select_message } = use_chat();
  const { set_panel_open } = use_shell();
  const [copied, set_copied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(copy_text);
      set_copied(true);
      setTimeout(() => set_copied(false), 1600);
    } catch {
      set_copied(false);
    }
  };

  const has_sources = (message.final?.citations.length ?? 0) > 0;
  return (
    <div className="mt-4 flex items-center gap-0.5 text-faint">
      <ActionButton label={copied ? 'Copied' : 'Copy answer'} onClick={() => void copy()} testid={'button-copy-' + message.id}>
        {copied ? <Check className="h-3.5 w-3.5 text-sage" /> : <Copy className="h-3.5 w-3.5" />}
      </ActionButton>
      {is_last && !streaming && (
        <ActionButton label="Regenerate" onClick={regenerate} testid={'button-regenerate-' + message.id}>
          <RotateCcw className="h-3.5 w-3.5" />
        </ActionButton>
      )}
      <ActionButton label="Helpful" active={message.feedback === 'up'} onClick={() => set_feedback(message.id, message.feedback === 'up' ? null : 'up')} testid={'button-thumbs-up-' + message.id}>
        <ThumbsUp className="h-3.5 w-3.5" fill={message.feedback === 'up' ? 'currentColor' : 'none'} />
      </ActionButton>
      <ActionButton label="Not helpful" active={message.feedback === 'down'} onClick={() => set_feedback(message.id, message.feedback === 'down' ? null : 'down')} testid={'button-thumbs-down-' + message.id}>
        <ThumbsDown className="h-3.5 w-3.5" fill={message.feedback === 'down' ? 'currentColor' : 'none'} />
      </ActionButton>
      {has_sources && (
        <button
          type="button"
          onClick={() => {
            select_message(message.id);
            set_panel_open(true);
          }}
          data-testid={'button-view-sources-' + message.id}
          className="ml-1 inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-[11.5px] hover:bg-accent hover:text-foreground"
        >
          <PanelRight className="h-3.5 w-3.5" /> Sources
        </button>
      )}
      {message.feedback && <span className="ml-2 text-[11px] text-muted-foreground" role="status">Thanks, noted on this device.</span>}
    </div>
  );
}
