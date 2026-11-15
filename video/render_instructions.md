<!-- How to preview, check and render the demo video (segments now, full silent video once assets arrive). -->
# Render instructions

All commands run from `video/remotion/`. They need Node 20 or later and ffmpeg. Run `npm install` once.

| Step | Command | Result |
|---|---|---|
| Sync assets | `npm run sync` | Writes `src/config/available_assets.json` and regenerates `../missing_assets.md` |
| Preview | `npm run dev` | Remotion Studio: one composition per scene, plus FullVideo |
| Check claims | `npm run check` | Verifies every claim in `../claims.json` against its evidence |
| Render segments | `npm run render:segments` | `../renders/segments/01_hook.mp4 … 11_closing.mp4` (silent), `../renders/previews/*.png`, `../renders/contact_sheet.png` |
| One segment | `node scripts/render_segments.mjs S04-Academics` | Re-renders a single scene |
| Final video | `npm run render:final` | `../renders/final/trojan_compass_demo.mp4` (silent). **Refuses to run** while a claim is pending or any placeholder remains |

Rebuilding the data the scenes read (backend on :8000 for security capture, repo root as the working directory):
```bash
.venv/bin/python video/remotion/scripts/build_data.py         # platforms, prerequisites, profiles (no LLM calls)
.venv/bin/python video/remotion/scripts/security_capture.py   # real guard and session responses (no LLM calls)
.venv/bin/python video/remotion/scripts/measure_cost.py       # cost run: up to 6 live LLM calls, uses the Groq key from .env
```
After a re-measure, update the expected values in `claims.json` (C14-C18) to match. The check fails until you do, by design.

Durations live only in `src/config/timeline.ts`. The build throws if the total passes 5400 frames (180 s).
