// Scene 10 (Mobile, personalization, roadmap): real phone-size UI (A12), the synthetic profile it uses, and ROADMAP items.
import { useCurrentFrame } from 'remotion';
import { fade } from '../animations/motion';
import { AssetVideo } from '../components/asset_video';
import { Badge } from '../components/badge';
import { Caption } from '../components/headline';
import { PhoneFrame } from '../components/phone_frame';
import { SceneShell } from '../components/scene_shell';
import { frames_of } from '../config/timeline';
import profiles from '../data/profiles.json';
import { colors, fonts, type } from '../styles/theme';

const ROADMAP = ['Chinese and Hindi support', 'Voice input', 'Proactive deadline alerts'];
const p = profiles.profiles[0];

export const Scene10Mobile = () => {
  const frame = useCurrentFrame();
  const row = (k: string, v: string) => (
    <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 16, fontFamily: fonts.sans, fontSize: 30 }}>
      <div style={{ color: colors.faint }}>{k}</div><div style={{ color: colors.text }}>{v}</div>
    </div>
  );
  return (
    <SceneShell>
      <div style={{ position: 'absolute', left: 150, top: 60 }}>
        <PhoneFrame height={880}>
          <AssetVideo id="A12" what="Real responsive UI at phone size" window_frames={frames_of('s10_mobile')} trim_before_s={1.5} />
        </PhoneFrame>
      </div>
      <div style={{ position: 'absolute', left: 700, right: 96, top: 110, opacity: fade(frame, 90), padding: 40, borderRadius: 24,
        backgroundColor: colors.surface, border: `2px solid ${colors.border}`, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontFamily: fonts.serif, fontSize: type.supporting, color: colors.text }}>What Trojan Compass knows about you</div>
          <Badge label="SYNTHETIC" tone="synthetic" />
        </div>
        {row('Name', p.name)}
        {row('Program', p.program)}
        {row('Completed', p.completed_courses.join(', '))}
        {row('Interests', p.interests.join(', '))}
      </div>
      <div style={{ position: 'absolute', left: 700, right: 96, top: 560, display: 'flex', flexDirection: 'column', gap: 18 }}>
        {ROADMAP.map((r, i) => (
          <div key={r} style={{ display: 'flex', alignItems: 'center', gap: 20, opacity: fade(frame, 170 + i * 8) }}>
            <Badge label="ROADMAP" tone="roadmap" />
            <div style={{ fontFamily: fonts.sans, fontSize: type.body, color: colors.text }}>{r}</div>
          </div>
        ))}
      </div>
      <Caption text="Adapts to the student. Built to grow." from={230} />
    </SceneShell>
  );
};
