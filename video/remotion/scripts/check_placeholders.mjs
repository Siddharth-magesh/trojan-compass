// Final-render guard: fails while any asset the full video needs is missing (it would render as a placeholder).
// Re-syncs available_assets.json first. Usage: node scripts/check_placeholders.mjs
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
execFileSync('node', [path.join(ROOT, 'scripts', 'sync_assets.mjs')], { stdio: 'ignore' });
const available = JSON.parse(readFileSync(path.join(ROOT, 'src', 'config', 'available_assets.json'), 'utf8'));
const registry = readFileSync(path.join(ROOT, 'src', 'config', 'asset_registry.ts'), 'utf8');
const required = [...registry.match(/REQUIRED_FOR_FINAL[^=]*=\s*\[([^\]]*)\]/)[1].matchAll(/'(A\d+M?)'/g)].map((m) => m[1]);
// Every asset a scene plays must exist too, not just the ones we supply.
const used = ['A03', 'A04', 'A05', 'A06', 'A08', 'A09', 'A12', ...required];
const missing = used.filter((id) => !available[id]);
if (missing.length) {
  console.error(`Placeholders remain for: ${missing.join(', ')}. See video/missing_assets.md.`);
  process.exit(1);
}
console.log('No placeholders: every asset used by the full video is present.');
