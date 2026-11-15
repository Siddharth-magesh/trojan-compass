// Draws the journey on a canvas (path, milestones, moving marker) and encodes it as an animated GIF in the browser.
import { applyPalette, GIFEncoder, quantize } from 'gifenc';
import type { journey_plan } from '@/lib/journey_plan';

export const gif_size = { w: 360, h: 150 };

export type journey_palette = { bg: string; fg: string; muted: string; line: string; primary: string; sage: string; gold: string };

const frames = 40;
const frame_delay_ms = 70;
const hold_delay_ms = 1800;

function css_color(root: CSSStyleDeclaration, name: string, fallback: string): string {
  const v = root.getPropertyValue(name).trim();
  return v ? 'hsl(' + v + ')' : fallback;
}

export function read_palette(): journey_palette {
  const root = getComputedStyle(document.documentElement);
  return {
    bg: css_color(root, '--card', '#fdfdf9'),
    fg: css_color(root, '--foreground', '#262b29'),
    muted: css_color(root, '--muted-foreground', '#666d63'),
    line: css_color(root, '--border', '#e3e4dc'),
    primary: css_color(root, '--primary', '#8c2633'),
    sage: css_color(root, '--sage', '#577058'),
    gold: css_color(root, '--gold', '#bf9c56'),
  };
}

// Small seeded generator so each visit gets its own gentle curve.
function rng(seed: number): () => number {
  let s = seed || 1;
  return () => {
    s = (Math.imul(s ^ (s >>> 15), 2246822519) + 0x9e3779b9) >>> 0;
    return (s % 10000) / 10000;
  };
}

function points(plan: journey_plan): [number, number][] {
  const r = rng(plan.seed);
  const n = plan.steps.length;
  const left = 28, right = gif_size.w - 28, mid = 74;
  return plan.steps.map((_, i) => [left + ((right - left) * i) / (n - 1), mid + (r() - 0.5) * 34]);
}

export function draw_frame(ctx: CanvasRenderingContext2D, plan: journey_plan, t: number, p: journey_palette): void {
  const { w, h } = gif_size;
  const pts = points(plan);
  const reached = t * (pts.length - 1);
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = p.muted;
  ctx.font = '600 11px system-ui, sans-serif';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(plan.title.toUpperCase(), 14, 22);

  ctx.lineCap = 'round';
  ctx.lineWidth = 3;
  ctx.strokeStyle = p.line;
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.stroke();

  // Travelled part of the path.
  ctx.strokeStyle = p.primary;
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) {
    if (i <= reached) ctx.lineTo(pts[i][0], pts[i][1]);
    else {
      const f = reached - (i - 1);
      if (f > 0) ctx.lineTo(pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * f, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * f);
      break;
    }
  }
  ctx.stroke();

  pts.forEach(([x, y], i) => {
    const done = i <= reached + 1e-6;
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fillStyle = done ? (i === pts.length - 1 ? p.gold : p.sage) : p.bg;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = done ? p.bg : p.line;
    ctx.stroke();
  });

  const i = Math.min(pts.length - 1, Math.floor(reached));
  const f = reached - i;
  const [x0, y0] = pts[i];
  const [x1, y1] = pts[Math.min(pts.length - 1, i + 1)];
  ctx.beginPath();
  ctx.arc(x0 + (x1 - x0) * f, y0 + (y1 - y0) * f, 8, 0, Math.PI * 2);
  ctx.fillStyle = p.primary;
  ctx.fill();

  const current = Math.min(pts.length - 1, Math.round(reached));
  ctx.fillStyle = p.fg;
  ctx.font = '600 14px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(plan.steps[current], w / 2, h - 30);
  ctx.fillStyle = p.muted;
  ctx.font = '11px system-ui, sans-serif';
  ctx.fillText('Step ' + (current + 1) + ' of ' + pts.length, w / 2, h - 13);
  ctx.textAlign = 'start';
}

export async function encode_journey_gif(plan: journey_plan, signal: { cancelled: boolean }): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = gif_size.w;
  canvas.height = gif_size.h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas is not available');
  const palette_colors = read_palette();
  draw_frame(ctx, plan, 1, palette_colors);
  const palette = quantize(ctx.getImageData(0, 0, gif_size.w, gif_size.h).data, 64);
  const gif = GIFEncoder();
  for (let k = 0; k <= frames; k++) {
    if (signal.cancelled) throw new Error('cancelled');
    const t = k / frames;
    draw_frame(ctx, plan, t, palette_colors);
    const index = applyPalette(ctx.getImageData(0, 0, gif_size.w, gif_size.h).data, palette);
    gif.writeFrame(index, gif_size.w, gif_size.h, { palette, delay: k === frames ? hold_delay_ms : frame_delay_ms });
    if (k % 6 === 0) await new Promise((r) => setTimeout(r, 0)); // keep the page responsive while encoding
  }
  gif.finish();
  return new Blob([gif.bytes()], { type: 'image/gif' });
}
