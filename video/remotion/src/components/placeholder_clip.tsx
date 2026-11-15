// Visible stand-in for a missing asset: shows the asset id, what to record and the expected duration.
import { AbsoluteFill } from 'remotion';
import { colors, fonts, type } from '../styles/theme';

export const PlaceholderClip = ({ asset_id, what, seconds }: { asset_id: string; what: string; seconds: number }) => (
  <AbsoluteFill style={{
    backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', padding: 80,
    backgroundImage: `repeating-linear-gradient(135deg, ${colors.surface} 0 28px, ${colors.surface_raised} 28px 56px)`,
    border: `4px dashed ${colors.warning}`,
  }}>
    <div style={{ fontFamily: fonts.mono, fontSize: type.label, color: colors.warning, letterSpacing: 4 }}>
      PLACEHOLDER · {asset_id} · {seconds.toFixed(0)} s
    </div>
    <div style={{ fontFamily: fonts.sans, fontSize: type.body, color: colors.text, marginTop: 24, textAlign: 'center', maxWidth: 1200, lineHeight: 1.35 }}>
      {what}
    </div>
  </AbsoluteFill>
);
