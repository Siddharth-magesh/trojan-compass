// Scene 11 (Feasibility and close): data flow, four feasibility cards (verified facts; A16 overrides when supplied), logo, close.
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { clamp, fade, rise } from '../animations/motion';
import { Headline } from '../components/headline';
import { SceneShell } from '../components/scene_shell';
import { resolve_asset } from '../config/asset_registry';
import cost from '../data/cost_run.json';
import { colors, fonts, type } from '../styles/theme';

const FLOW = ['USC public resources', 'Structured knowledge', 'Retrieval', 'Agents', 'Verified answer'];
type feasibility = { who_runs_it?: string; data_it_needs?: string; monthly_cost?: string; next_semester?: string };
const facts = (resolve_asset('A16')?.data ?? {}) as feasibility;

const FeasCard = ({ title, body, from }: { title: string; body: string; from: number }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div style={{ flex: 1, padding: 32, borderRadius: 22, backgroundColor: colors.surface, opacity: fade(frame, from),
      border: `2px solid ${colors.border}`, translate: `0px ${interpolate(rise(frame, fps, from), [0, 1], [30, 0])}px` }}>
      <div style={{ fontFamily: fonts.sans, fontWeight: 700, fontSize: type.label, letterSpacing: 3, color: colors.gold }}>{title.toUpperCase()}</div>
      <div style={{ marginTop: 16, fontFamily: fonts.sans, fontSize: 32, lineHeight: 1.3, color: colors.text }}>{body}</div>
    </div>
  );
};

export const Scene11Closing = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const flow_out = interpolate(frame, [170, 185], [1, 0], clamp);
  const cards_out = interpolate(frame, [405, 420], [1, 0], clamp);
  const measured = `$${cost.run1_cache_miss.estimated_cost_usd.toFixed(6)} per uncached question, $0 on a cache hit (measured ${cost.measured})`;
  return (
    <SceneShell>
      <AbsoluteFill style={{ opacity: flow_out, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 16 }}>
        {FLOW.map((f, i) => (
          <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 16, opacity: fade(frame, 6 + i * 16), scale: String(rise(frame, fps, 6 + i * 16)) }}>
            <div style={{ padding: '30px 30px', borderRadius: 20, fontFamily: fonts.sans, fontWeight: 600, fontSize: 34, color: colors.text, whiteSpace: 'nowrap',
              backgroundColor: i === FLOW.length - 1 ? colors.cardinal : colors.surface_raised, border: `2px solid ${colors.border}` }}>{f}</div>
            {i < FLOW.length - 1 && <div style={{ fontSize: 40, color: colors.gold }}>→</div>}
          </div>
        ))}
      </AbsoluteFill>
      <div style={{ position: 'absolute', left: 96, right: 96, top: 200, opacity: interpolate(frame, [180, 195], [0, 1], clamp) * cards_out }}>
        <Headline text="Feasible to run" from={182} size={type.headline} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28, marginTop: 50 }}>
          <FeasCard title={facts.who_runs_it ? 'Who runs it' : 'Data today'} from={196}
            body={facts.who_runs_it ?? 'Public USC sources only, each record with its source link and verification date'} />
          <FeasCard title="Measured cost" body={facts.monthly_cost ? `${measured}. ${facts.monthly_cost}` : measured} from={206} />
          <FeasCard title={facts.data_it_needs ? 'Data it needs' : 'Built-in safety'} from={216}
            body={facts.data_it_needs ?? 'Input and output guards, per-student session ownership, no message text in logs'} />
          <FeasCard title={facts.next_semester ? 'Next semester' : 'Next'} from={226}
            body={facts.next_semester ?? 'Roadmap: more languages, voice input and proactive deadline alerts'} />
        </div>
      </div>
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', opacity: fade(frame, 418) }}>
        <Img src={staticFile('brand/logo.svg')} style={{ width: 140, height: 140, scale: String(rise(frame, fps, 418)) }} />
        <div style={{ height: 36 }} />
        <Headline text="One university. One intelligent companion." from={424} size={type.headline} />
        <div style={{ height: 18 }} />
        <Headline text="Trojan Compass · Your USC experience, one conversation away." from={436} size={type.supporting} serif={false} color={colors.gold} />
        <div style={{ position: 'absolute', bottom: 80, fontFamily: fonts.sans, fontSize: 30, color: colors.muted, opacity: fade(frame, 446) }}>
          An independent student project. Not an official USC service.
        </div>
      </AbsoluteFill>
    </SceneShell>
  );
};
