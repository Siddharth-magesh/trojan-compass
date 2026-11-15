// Compact "Illustrative journey": static canvas preview while a personalized GIF is encoded locally, with play/pause and refresh.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { Pause, Play, RefreshCw } from 'lucide-react';
import type { student_profile } from '@/lib/api_types';
import { build_journey } from '@/lib/journey_plan';
import { use_theme } from '@/lib/theme_provider';
import { draw_frame, encode_journey_gif, gif_size, read_palette } from '@/lib/journey_gif';

const new_nonce = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

export function JourneyGif({ student, visit_key }: { student: student_profile | null; visit_key: string }) {
  const reduce = useReducedMotion();
  const { resolved } = use_theme();
  const [nonce, set_nonce] = useState(new_nonce);
  const [gif_url, set_gif_url] = useState<string | null>(null);
  const [failed, set_failed] = useState(false);
  const [playing, set_playing] = useState(!reduce);
  const canvas_ref = useRef<HTMLCanvasElement>(null);
  const identity = student?.student_id ?? 'guest';

  useEffect(() => set_nonce(new_nonce()), [identity, visit_key]);
  useEffect(() => set_playing(!reduce), [reduce]);

  const plan = useMemo(() => build_journey(student, nonce), [student, nonce]);

  useEffect(() => {
    const signal = { cancelled: false };
    let url: string | null = null;
    set_gif_url(null);
    set_failed(false);
    const frame_id = requestAnimationFrame(() => {
      const ctx = canvas_ref.current?.getContext('2d');
      if (ctx) draw_frame(ctx, plan, 1, read_palette());
      void encode_journey_gif(plan, signal)
      .then((blob) => {
        if (signal.cancelled) return;
        url = URL.createObjectURL(blob);
        set_gif_url(url);
      })
      .catch(() => { if (!signal.cancelled) set_failed(true); });
    });
    return () => {
      signal.cancelled = true;
      cancelAnimationFrame(frame_id);
      if (url) URL.revokeObjectURL(url);
    };
  }, [plan, resolved]);

  const show_gif = Boolean(gif_url) && playing;
  const label = 'Illustrative journey, not actual progress. ' + plan.summary;
  return (
    <figure className="mx-auto w-full max-w-[360px]" data-testid="figure-journey">
      <div className="relative overflow-hidden rounded-xl border bg-card">
        <canvas ref={canvas_ref} width={gif_size.w} height={gif_size.h} role="img" aria-label={label} className={show_gif ? 'hidden' : 'block h-auto w-full'} data-testid="canvas-journey-still" />
        {show_gif && gif_url && <img src={gif_url} alt={label} width={gif_size.w} height={gif_size.h} className="block h-auto w-full" data-testid="img-journey-gif" />}
        {!gif_url && !failed && <span className="absolute right-2 top-2 h-1.5 w-1.5 animate-pulse rounded-full bg-gold" aria-hidden="true" />}
      </div>
      <figcaption className="mt-1.5 flex items-center justify-between gap-2 text-[10.5px] text-faint">
        <span role="status">{failed ? 'Illustrative journey (still image)' : gif_url ? 'Illustrative journey, unique to this visit' : 'Drawing your illustrative journey...'}</span>
        <span className="flex items-center gap-0.5">
          <button type="button" disabled={!gif_url} onClick={() => set_playing((p) => !p)} aria-label={playing ? 'Pause journey animation' : 'Play journey animation'} data-testid="button-journey-play" className="grid h-6 w-6 place-items-center rounded-md hover:bg-accent hover:text-foreground disabled:opacity-40">
            {playing ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
          </button>
          <button type="button" onClick={() => set_nonce(new_nonce())} aria-label="Refresh journey" data-testid="button-journey-refresh" className="grid h-6 w-6 place-items-center rounded-md hover:bg-accent hover:text-foreground">
            <RefreshCw className="h-3 w-3" />
          </button>
        </span>
      </figcaption>
    </figure>
  );
}
