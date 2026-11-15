// Scene 08 (Security): real injection block (A09), then real captured responses: session ownership, output redaction, log line.
import { AbsoluteFill, interpolate, Sequence, useCurrentFrame, useVideoConfig } from 'remotion';
import { clamp, fade, rise } from '../animations/motion';
import { Callouts } from '../components/callouts';
import { Caption } from '../components/headline';
import { RecordingStage } from '../components/recording_stage';
import { SceneShell } from '../components/scene_shell';
import { TerminalCard } from '../components/terminal_card';
import sec from '../data/security_capture.json';
import { colors, fonts } from '../styles/theme';

const guard_message = sec.injection.events.find((e) => e.event === 'error')!.data as { code: string; message: string };
const LAYERS = ['Student', 'Input guard', 'Supervisor', 'Domain agents', 'Controlled tools', 'Verifier', 'Output guard'];

const ArchitectureStrip = ({ from }: { from: number }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div style={{ position: 'absolute', left: 96, right: 96, top: 380, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
      {LAYERS.map((l, i) => (
        <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: fade(frame, from + i * 6), scale: String(rise(frame, fps, from + i * 6)) }}>
          <div style={{ padding: '22px 20px', borderRadius: 16, backgroundColor: l.includes('guard') ? colors.cardinal_soft : colors.surface_raised,
            border: `2px solid ${l.includes('guard') ? colors.cardinal : colors.border}`, fontFamily: fonts.sans, fontWeight: 600, fontSize: 28, color: colors.text, whiteSpace: 'nowrap' }}>{l}</div>
          {i < LAYERS.length - 1 && <div style={{ color: colors.faint, fontSize: 32 }}>→</div>}
        </div>
      ))}
    </div>
  );
};

export const Scene08Security = () => {
  const frame = useCurrentFrame();
  const rec_out = interpolate(frame, [150, 165], [1, 0], clamp);
  const cards_out = interpolate(frame, [372, 386], [1, 0], clamp);
  const log = sec.log_line;
  return (
    <SceneShell kicker="Security · real responses, synthetic students">
      <AbsoluteFill style={{ opacity: rec_out }}>
        <RecordingStage id="A09" what="Real prompt-injection attempt blocked by the input guard" window_frames={165} label="Trojan Compass · synthetic student Bianca Demo" />
      </AbsoluteFill>
      <Callouts top={110} items={[{ from: 0, to: 148, text: 'A prompt-injection attempt, blocked before any model call' }]} />
      <Sequence from={150} durationInFrames={240} layout="none">
        <AbsoluteFill style={{ opacity: cards_out, padding: '96px 96px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <TerminalCard from={0} width={1728} title="1 · Injection attempt (input guard, verbatim reply)" lines={[
            { text: `> ${sec.injection.prompt}`, tone: 'cmd' },
            { text: `${guard_message.code}: ${guard_message.message}`, tone: 'bad' },
          ]} />
          <TerminalCard from={45} width={1728} title="2 · Student 2 requests student 1's session" lines={[
            { text: `GET /api/session/${sec.session_ownership.session_id_prefix}…  (token: synthetic_student_002)`, tone: 'cmd' },
            { text: `${sec.session_ownership.other_student_status} ${JSON.stringify(sec.session_ownership.other_student_body)}   · owner gets ${sec.session_ownership.owner_status}`, tone: 'ok' },
          ]} />
          <TerminalCard from={90} width={1728} title="3 · Output guard on a fake test string" lines={[
            { text: sec.output_guard.input, tone: 'dim' },
            { text: sec.output_guard.output, tone: 'ok' },
          ]} />
          <TerminalCard from={135} width={1728} title="4 · Structured request log (no message text, no personal data)" lines={[
            { text: JSON.stringify({ request_id: log.request_id.slice(0, 12) + '…', response_type: log.response_type, guard_events: log.guard_events, llm_calls: log.llm.calls }), tone: 'dim' },
          ]} />
        </AbsoluteFill>
      </Sequence>
      <div style={{ opacity: fade(frame, 384) }}>
        <ArchitectureStrip from={386} />
      </div>
      <Caption text="Intelligent agents. Controlled access. Protected student information." from={420} />
    </SceneShell>
  );
};
