// Scene 04 (Academics): the real app answering the academics prompt (A04), then a prerequisite overlay built from catalogue data.
import { interpolate, useCurrentFrame } from 'remotion';
import { clamp, fade } from '../animations/motion';
import { Callouts } from '../components/callouts';
import { Caption } from '../components/headline';
import { RecordingStage } from '../components/recording_stage';
import { SceneShell } from '../components/scene_shell';
import { frames_of } from '../config/timeline';
import prereq from '../data/prereq_graph.json';
import { colors, fonts, type } from '../styles/theme';

const Node = ({ code, title, tone, dashed = false }: { code: string; title: string; tone: string; dashed?: boolean }) => (
  <div style={{ padding: '12px 18px', borderRadius: 14, border: `2px ${dashed ? 'dashed' : 'solid'} ${tone}`, backgroundColor: colors.surface }}>
    <div style={{ fontFamily: fonts.mono, fontSize: 28, color: tone }}>{code}</div>
    <div style={{ fontFamily: fonts.sans, fontSize: 24, color: colors.muted, lineHeight: 1.25 }}>{title}</div>
  </div>
);

const PrereqPanel = ({ from }: { from: number }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ position: 'absolute', right: 96, top: 150, width: 600, opacity: fade(frame, from), display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ fontFamily: fonts.sans, fontWeight: 700, fontSize: type.label, letterSpacing: 4, color: colors.gold }}>PREREQUISITES · CATALOGUE DATA</div>
      {prereq.courses.map((c, i) => (
        <div key={c.course_id} style={{ opacity: fade(frame, from + 8 + i * 8) }}>
          <Node code={c.course_id} title={`${c.title} · ${c.prerequisites.length ? c.prerequisites.length + ' prerequisites' : c.prerequisite_text}`} tone={colors.text} />
        </div>
      ))}
      <div style={{ marginTop: 10, fontFamily: fonts.sans, fontSize: 26, color: colors.muted, opacity: fade(frame, from + 40) }}>
        Completed {prereq.completed.join(', ')} (synthetic profile) unlocks:
      </div>
      <div style={{ display: 'flex', gap: 12, opacity: fade(frame, from + 50) }}>
        {prereq.completed_unlocks.map((c) => <Node key={c.course_id} code={c.course_id} title="" tone={colors.sage} />)}
      </div>
    </div>
  );
};

export const Scene04Academics = () => {
  const frame = useCurrentFrame();
  const total = frames_of('s04_academics');
  const shrink = interpolate(frame, [500, 540], [0, 1], clamp);
  return (
    <SceneShell>
      <RecordingStage id="A04" what="Real app answering the academics prompt" window_frames={total} label="Trojan Compass · synthetic student Aarav Demo"
        style={{ scale: String(1 - 0.36 * shrink), transformOrigin: 'left center', translate: `${-64 * shrink}px 0px` }} />
      <Callouts items={[
        { from: 10, to: 150, text: '1 · Ask in plain English, as a new MS CS student' },
        { from: 150, to: 300, text: '2 · Supervisor routes to the academic agent; facts are verified' },
        { from: 300, to: 420, text: '3 · Course cards: units, terms, prerequisites, sources' },
        { from: 420, to: 505, text: '4 · Pick sections and see your week' },
      ]} />
      <PrereqPanel from={530} />
      <Caption text="Course planning with sources, not guesses." from={620} />
    </SceneShell>
  );
};
