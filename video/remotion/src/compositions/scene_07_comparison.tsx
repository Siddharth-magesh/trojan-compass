// Scene 07 (Comparison): our manual ChatGPT recording (A07) beside the real Trojan Compass answer (A08), same prompt.
import { useCurrentFrame } from 'remotion';
import { fade } from '../animations/motion';
import { AssetVideo } from '../components/asset_video';
import { BrowserFrame } from '../components/browser_frame';
import { resolve_asset } from '../config/asset_registry';
import { frames_of } from '../config/timeline';
import { SceneShell } from '../components/scene_shell';
import prompts from '../../../demo/demo_prompts.json';
import { colors, fonts, type } from '../styles/theme';

const PROMPT = prompts.prompts.find((p) => p.scene === '07_comparison')!.prompt;
const W = 860;
const H = Math.round((W * 9) / 16);

const Side = ({ title, sub, tag, children, from }: { title: string; sub: string; tag: string; children: React.ReactNode; from: number }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: W }}>
      <div style={{ fontFamily: fonts.sans, fontWeight: 700, fontSize: type.body, color: colors.text }}>{title}</div>
      <div style={{ fontFamily: fonts.sans, fontSize: 24, color: colors.faint, marginTop: -10 }}>{sub}</div>
      <BrowserFrame width={W} height={H + 56} label={title}>{children}</BrowserFrame>
      <div style={{ alignSelf: 'center', opacity: fade(frame, from), padding: '12px 26px', borderRadius: 999,
        border: `2px solid ${colors.border}`, backgroundColor: colors.surface_raised, fontFamily: fonts.sans, fontSize: 30, color: colors.text }}>{tag}</div>
    </div>
  );
};

export const Scene07Comparison = () => {
  const frame = useCurrentFrame();
  const total = frames_of('s07_comparison');
  const label = (resolve_asset('A07M')?.data as { label?: string } | undefined)?.label ?? 'ChatGPT · model, mode and date: pending (A07M)';
  return (
    <SceneShell kicker="Same prompt, two assistants">
      <div style={{ position: 'absolute', left: 96, right: 96, top: 92, opacity: fade(frame, 4), fontFamily: fonts.serif,
        fontSize: 36, lineHeight: 1.3, color: colors.muted }}>“{PROMPT}”</div>
      <div style={{ position: 'absolute', left: 96, right: 96, top: 250, display: 'flex', justifyContent: 'space-between' }}>
        <Side title="General-purpose AI" sub={label} tag="General-purpose knowledge" from={470}>
          <AssetVideo id="A07" what="Our manual ChatGPT recording of the identical prompt (model, mode, date visible)" window_frames={total} trim_before_s={0} />
        </Side>
        <Side title="Trojan Compass" sub="Real app · synthetic student · citations and verification dates" tag="USC-specific, source-grounded information" from={480}>
          <AssetVideo id="A08" what="Real Trojan Compass answer to the same prompt" window_frames={total} trim_before_s={1.5} />
        </Side>
      </div>
    </SceneShell>
  );
};
