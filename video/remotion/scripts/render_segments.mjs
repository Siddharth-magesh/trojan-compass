// Renders each scene to video/renders/segments/NN_name.mp4 (silent H.264) and a one-frame-per-scene contact sheet.
// Usage: node scripts/render_segments.mjs [S04-Academics ...]   (no args = all eleven scenes)
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, '..', 'renders');
const timeline = readFileSync(path.join(ROOT, 'src', 'config', 'timeline.ts'), 'utf8');
const scenes = [...timeline.matchAll(/id: 's(\d\d)_(\w+)', composition: '([\w-]+)'.*?frames: (\d+)/g)]
  .map(([, nn, name, composition, frames]) => ({ file: `${nn}_${name}`, composition, frames: Number(frames) }));
const wanted = process.argv.slice(2);
const run = (cmd, args) => execFileSync(cmd, args, { cwd: ROOT, stdio: 'inherit' });

mkdirSync(path.join(OUT, 'segments'), { recursive: true });
mkdirSync(path.join(OUT, 'previews'), { recursive: true });
run('node', ['scripts/sync_assets.mjs']);
const bundle = path.join(ROOT, 'build');
run('npx', ['remotion', 'bundle', '--out-dir', bundle]);
for (const s of scenes.filter((x) => !wanted.length || wanted.includes(x.composition))) {
  run('npx', ['remotion', 'render', bundle, s.composition, path.join(OUT, 'segments', `${s.file}.mp4`), '--muted', '--codec=h264', '--crf=18']);
  run('npx', ['remotion', 'still', bundle, s.composition, path.join(OUT, 'previews', `${s.file}.png`), `--frame=${Math.round(s.frames * 0.6)}`, '--scale=0.5']);
}
const stills = scenes.map((s) => path.join(OUT, 'previews', `${s.file}.png`));
const inputs = stills.flatMap((f) => ['-i', f]);
const tiles = stills.map((_, i) => `[${i}]scale=640:360[v${i}];`).join('') + stills.map((_, i) => `[v${i}]`).join('') +
  `xstack=inputs=${stills.length}:layout=` + stills.map((_, i) => `${(i % 4) * 640}_${Math.floor(i / 4) * 360}`).join('|') + ':fill=black';
run('ffmpeg', ['-y', '-loglevel', 'error', ...inputs, '-filter_complex', tiles, path.join(OUT, 'contact_sheet.png')]);
console.log(`Segments in ${path.join(OUT, 'segments')}; contact sheet at ${path.join(OUT, 'contact_sheet.png')}`);
