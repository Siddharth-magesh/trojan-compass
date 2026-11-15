// Verifies every claim in video/claims.json against its evidence (JSON values, files, text). Exit 1 on any failure.
// Usage: node scripts/check_claims.mjs [--final]   --final also fails while any claim is still pending_asset.
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const REPO = path.resolve(import.meta.dirname, '..', '..', '..');
const final = process.argv.includes('--final');
const { claims } = JSON.parse(readFileSync(path.join(REPO, 'video', 'claims.json'), 'utf8'));
const get = (obj, dotted) => dotted.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
const read_json = (file) => JSON.parse(readFileSync(path.join(REPO, file), 'utf8'));

function run(check) {
  const full = path.join(REPO, check.file);
  if (!existsSync(full)) return `missing file ${check.file}`;
  if (check.type === 'file_exists') return null;
  if (check.type === 'file_contains') return readFileSync(full, 'utf8').includes(check.text) ? null : `"${check.text}" not in ${check.file}`;
  const value = get(read_json(check.file), check.path);
  if (check.type === 'json_equals') return value === check.equals ? null : `${check.path} is ${JSON.stringify(value)}, expected ${JSON.stringify(check.equals)}`;
  if (check.type === 'json_count') return Array.isArray(value) && value.length === check.equals ? null : `${check.path} has ${value?.length}, expected ${check.equals}`;
  return `unknown check type ${check.type}`;
}

let failed = 0;
for (const c of claims) {
  if (c.status === 'pending_asset') {
    const ready = c.checks.every((k) => run(k) === null);
    if (!ready && final) failed++;
    console.log(`${ready ? 'ok  ' : final ? 'FAIL' : 'wait'} ${c.id} ${c.scene} pending asset: ${c.shown}`);
    continue;
  }
  const errors = c.checks.map(run).filter(Boolean);
  if (errors.length) failed++;
  console.log(`${errors.length ? 'FAIL' : 'ok  '} ${c.id} ${c.scene} [${c.status}] ${c.shown}${errors.length ? '\n     ' + errors.join('\n     ') : ''}`);
}
console.log(failed ? `\n${failed} claim(s) failed.` : '\nAll claims check out.');
process.exit(failed ? 1 : 0);
