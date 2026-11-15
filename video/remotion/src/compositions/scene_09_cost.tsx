// Scene 09 (Cost and caching): every number is read from cost_run.json (real provider usage, measured by script).
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { clamp, fade, rise } from '../animations/motion';
import { Caption } from '../components/headline';
import { SceneShell } from '../components/scene_shell';
import cost from '../data/cost_run.json';
import { colors, fonts, type } from '../styles/theme';

type run = { latency_ms: number; live_llm_calls: number; input_tokens: number; output_tokens: number; estimated_cost_usd: number };
const n = (v: number) => v.toLocaleString('en-US');
const usd = (v: number) => (v === 0 ? '$0' : `$${v.toFixed(6)}`);

const RunCard = ({ title, r, from, tone }: { title: string; r: run; from: number; tone: string }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const stat = (label: string, value: string) => (
    <div><div style={{ fontFamily: fonts.sans, fontSize: 24, color: colors.faint, letterSpacing: 2 }}>{label}</div>
      <div style={{ fontFamily: fonts.sans, fontWeight: 700, fontSize: 64, color: colors.text }}>{value}</div></div>
  );
  return (
    <div style={{ flex: 1, padding: 48, borderRadius: 24, backgroundColor: colors.surface, border: `2px solid ${tone}`,
      opacity: fade(frame, from), translate: `0px ${interpolate(rise(frame, fps, from), [0, 1], [30, 0])}px` }}>
      <div style={{ fontFamily: fonts.sans, fontWeight: 700, fontSize: type.body, color: tone, marginBottom: 22 }}>{title}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22 }}>
        {stat('LIVE LLM CALLS', String(r.live_llm_calls))}
        {stat('LATENCY', `${(r.latency_ms / 1000).toFixed(1)} s`)}
        {stat('TOKENS IN / OUT', `${n(r.input_tokens)} / ${n(r.output_tokens)}`)}
        {stat('EST. COST', usd(r.estimated_cost_usd))}
      </div>
    </div>
  );
};

const BARS: { label: string; note: string; r: run; tone: string }[] = [
  { label: 'Trojan Compass, cache miss', note: 'grounded in USC data', r: cost.run1_cache_miss, tone: colors.cardinal },
  { label: 'Trojan Compass, cache hit', note: 'grounded, zero live calls', r: cost.run2_cache_hit, tone: colors.sage },
  { label: 'Same model + source documents pasted', note: 'grounded by hand', r: cost.baseline_b_documents_pasted, tone: '#2c5d8a' },
  { label: 'Same model, no USC data', note: 'ungrounded', r: cost.baseline_a_no_usc_data, tone: colors.faint },
];

const Bars = ({ from }: { from: number }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const max = Math.max(...BARS.map((b) => b.r.estimated_cost_usd));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22, opacity: fade(frame, from) }}>
      {BARS.map((b, i) => {
        const p = rise(frame, fps, from + 6 + i * 6);
        return (
          <div key={b.label} style={{ display: 'grid', gridTemplateColumns: '640px 1fr', alignItems: 'center', gap: 24 }}>
            <div style={{ fontFamily: fonts.sans, fontSize: 32, color: colors.text }}>{b.label}
              <span style={{ color: colors.faint, fontSize: 26 }}> · {b.note}</span></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
              <div style={{ height: 44, width: Math.max(6, (b.r.estimated_cost_usd / max) * 520 * p), borderRadius: 10, backgroundColor: b.tone }} />
              <div style={{ fontFamily: fonts.mono, fontSize: 30, color: colors.text, opacity: p, whiteSpace: "nowrap" }}>
                {usd(b.r.estimated_cost_usd)} · {n(b.r.input_tokens + b.r.output_tokens)} tokens</div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const Scene09Cost = () => {
  const frame = useCurrentFrame();
  const cards_out = interpolate(frame, [250, 270], [1, 0], clamp);
  return (
    <SceneShell kicker={`Measured ${cost.measured} · ${cost.price.model}`}>
      <div style={{ position: 'absolute', left: 96, right: 96, top: 200, fontFamily: fonts.serif, fontSize: 60, color: colors.muted, opacity: fade(frame, 0) * cards_out }}>
        “{cost.question}” — asked twice
      </div>
      <div style={{ position: 'absolute', left: 96, right: 96, top: 360, display: 'flex', gap: 40, opacity: cards_out }}>
        <RunCard title="Run 1 · cache miss" r={cost.run1_cache_miss} from={10} tone={colors.cardinal} />
        <RunCard title="Run 2 · same question, cache hit" r={cost.run2_cache_hit} from={90} tone={colors.sage} />
      </div>
      <div style={{ position: 'absolute', left: 96, right: 96, top: 230, opacity: interpolate(frame, [262, 280], [0, 1], clamp) }}>
        <div style={{ fontFamily: fonts.sans, fontWeight: 700, fontSize: type.label, letterSpacing: 4, color: colors.gold, marginBottom: 30 }}>ESTIMATED COST PER QUERY</div>
        <Bars from={270} />
      </div>
      <div style={{ position: 'absolute', left: 96, right: 96, bottom: 170, fontFamily: fonts.sans, fontSize: 24, color: colors.faint, opacity: fade(frame, 300) }}>
        Price: ${cost.price.input_per_million_usd}/M input, ${cost.price.output_per_million_usd}/M output tokens · {cost.price.source} (checked {cost.price.checked}) · development cache; production caching must be scoped per student
      </div>
      <Caption text="Less repeated computation. Every number measured." from={420} />
    </SceneShell>
  );
};
