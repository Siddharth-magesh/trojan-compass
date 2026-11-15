// Records the real Trojan Compass app (frontend + backend must be running) answering the exact demo prompts.
// Usage: node scripts/record_app.mjs [scene ...]   e.g. node scripts/record_app.mjs s04_academics s06_onboarding
// Output: public/recordings/<scene>_take1.mp4 (H.264, 30 fps). Answers come from the backend's LLM cache.
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, renameSync, rmSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const ROOT = path.resolve(import.meta.dirname, '..');
const APP = process.env.APP_URL ?? 'http://127.0.0.1:5173';
const OUT = path.join(ROOT, 'public', 'recordings');
const TMP = path.join(ROOT, '.recording_tmp');
const prompts = JSON.parse(readFileSync(path.join(ROOT, '..', 'demo', 'demo_prompts.json'), 'utf8')).prompts;
const prompt_for = (scene) => prompts.find((p) => p.scene === scene);

const DESKTOP = { width: 1920, height: 1080 };
const PHONE = { width: 430, height: 932 };

async function login(student_id) {
  const res = await fetch(`${APP}/api/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ student_id }),
  });
  if (!res.ok) throw new Error(`login failed for ${student_id}: ${res.status}`);
  return (await res.json()).access_token;
}

const pause = (page, ms) => page.waitForTimeout(ms);

async function smooth_scroll(page, total_px, steps = 30, step_ms = 60) {
  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, total_px / steps);
    await pause(page, step_ms);
  }
}

async function ask(page, text) {
  const box = page.getByTestId('input-composer');
  await box.click();
  await box.pressSequentially(text, { delay: 22 });
  await pause(page, 400);
  await page.getByTestId('button-send').click();
  // Streaming is over once the stop button is gone; blocked requests may never show it, so poll instead of waiting for it.
  await pause(page, 1200);
  for (let waited = 0; waited < 240_000 && (await page.getByTestId('button-stop').count()) > 0; waited += 300) {
    await pause(page, 300);
  }
  await pause(page, 1200);
}

// Scene scripts: what to do after the answer arrives. Every clip starts with 2 s of pre-roll.
const scenes = {
  s03_home: { student: 'synthetic_student_001', viewport: DESKTOP, run: async (page) => {
    await pause(page, 6000);
  } },
  s04_academics: { student: '04_academics', viewport: DESKTOP, run: async (page) => {
    await ask(page, prompt_for('04_academics').prompt);
    await smooth_scroll(page, 700);
    await pause(page, 1500);
    const toggles = page.locator('[data-testid^="button-sections-"]');
    for (let i = 0; i < Math.min(await toggles.count(), 2); i++) {
      await toggles.nth(i).click();
      await pause(page, 900);
      await page.locator('[data-testid^="radio-section-"]').last().click();
      await pause(page, 900);
    }
    await smooth_scroll(page, 900);
    await pause(page, 3500);
  } },
  s05_career: { student: '05_career', viewport: DESKTOP, run: async (page) => {
    await ask(page, prompt_for('05_career').prompt);
    await smooth_scroll(page, 900, 40);
    await pause(page, 3000);
    await smooth_scroll(page, 900, 40);
    await pause(page, 3000);
  } },
  s06_onboarding: { student: '06_onboarding', viewport: DESKTOP, run: async (page) => {
    await ask(page, prompt_for('06_onboarding').prompt);
    await smooth_scroll(page, 800, 35);
    await pause(page, 1500);
    const items = page.locator('[data-testid^="checkbox-item-"]');
    for (let i = 0; i < Math.min(await items.count(), 3); i++) {
      await items.nth(i).click();
      await pause(page, 1100);
    }
    await pause(page, 3000);
  } },
  s07_trojan_compass: { student: '07_comparison', viewport: DESKTOP, run: async (page) => {
    await ask(page, prompt_for('07_comparison').prompt);
    await smooth_scroll(page, 1400, 50, 80);
    await pause(page, 3000);
  } },
  s08_injection: { student: '08_security_injection', viewport: DESKTOP, run: async (page) => {
    await ask(page, prompt_for('08_security_injection').prompt);
    await pause(page, 4000);
  } },
  s10_mobile: { student: '10_mobile', viewport: PHONE, run: async (page) => {
    await ask(page, prompt_for('10_mobile').prompt);
    await smooth_scroll(page, 600, 30, 80);
    await pause(page, 3000);
  } },
};

async function record(name) {
  const scene = scenes[name];
  if (!scene) throw new Error(`unknown scene ${name}; choose from ${Object.keys(scenes).join(', ')}`);
  const student = scene.student.startsWith('synthetic_') ? scene.student : prompt_for(scene.student).student_id;
  const token = await login(student);
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: scene.viewport, deviceScaleFactor: 1, colorScheme: 'dark',
    recordVideo: { dir: TMP, size: scene.viewport },
  });
  // Synthetic demo login + dark theme, set before the app boots (no secrets: a short-lived demo token).
  await context.addInitScript(([t]) => {
    sessionStorage.setItem('trojan_compass.access_token', t);
    localStorage.setItem('trojan_compass.theme', 'dark');
  }, [token]);
  const page = await context.newPage();
  await page.goto(APP, { waitUntil: 'networkidle' });
  await page.getByTestId('input-composer').waitFor({ timeout: 30_000 });
  await pause(page, 2000);
  await scene.run(page);
  await pause(page, 2000);
  const video = page.video();
  await context.close();
  await browser.close();
  const webm = await video.path();
  const mp4 = path.join(OUT, `${name}_take1.mp4`);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', webm, '-r', '30', '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
    '-crf', '18', '-an', mp4]);
  rmSync(webm);
  console.log(`recorded ${mp4}`);
}

mkdirSync(OUT, { recursive: true });
mkdirSync(TMP, { recursive: true });
const wanted = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(scenes);
for (const name of wanted) await record(name);
rmSync(TMP, { recursive: true, force: true });
