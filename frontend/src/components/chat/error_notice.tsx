// Friendly inline error states with retry (rate limit shows a countdown before retry is allowed).
import { useEffect, useState } from 'react';
import { CloudOff, Hourglass, RotateCcw, ShieldAlert, TriangleAlert } from 'lucide-react';
import type { ui_error } from '@/lib/chat_types';
import { use_chat } from '@/lib/chat_provider';

const copy: Record<ui_error['code'], { title: string; body: string; Icon: typeof CloudOff; retry: boolean }> = {
  rate_limited: { title: "You're moving quickly", body: 'Take a breath. You can try again in a moment.', Icon: Hourglass, retry: true },
  upstream_failed: { title: "A data source didn't respond", body: 'One of the services I rely on is having trouble. Trying again usually helps.', Icon: TriangleAlert, retry: true },
  guard_blocked: { title: "That's outside what I can help with", body: 'Try rephrasing, or ask about courses, housing, jobs or student services.', Icon: ShieldAlert, retry: false },
  network: { title: 'Connection lost', body: 'Check your connection, then try again.', Icon: CloudOff, retry: true },
  unknown: { title: 'Something went wrong', body: 'This one is on us. Please try again.', Icon: TriangleAlert, retry: true },
};

const rate_limit_seconds = 15;

export function ErrorNotice({ error, is_last }: { error: ui_error; is_last: boolean }) {
  const { regenerate, streaming } = use_chat();
  const [remaining, set_remaining] = useState(error.code === 'rate_limited' ? rate_limit_seconds : 0);
  const c = copy[error.code];

  useEffect(() => {
    if (remaining <= 0) return;
    const t = setTimeout(() => set_remaining((r) => r - 1), 1000);
    return () => clearTimeout(t);
  }, [remaining]);

  return (
    <div role="alert" className="flex gap-3 rounded-xl border bg-card px-4 py-3.5" data-testid={'status-error-' + error.code}>
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-cardinal-soft text-primary">
        <c.Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] font-medium">{c.title}</p>
        <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted-foreground">{error.message ? error.message + ' ' : ''}{c.body}</p>
        {c.retry && is_last && (
          <button
            type="button"
            disabled={remaining > 0 || streaming}
            onClick={regenerate}
            data-testid="button-retry"
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-medium transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {remaining > 0 ? 'Retry in ' + remaining + 's' : 'Try again'}
          </button>
        )}
      </div>
    </div>
  );
}
