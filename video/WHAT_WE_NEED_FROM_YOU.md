<!-- Team to-do before the final silent compile: assets to supply, decisions to make, and known gaps found while building. -->
# What we need from you

Eleven silent scene segments are rendered in `video/renders/segments/` (01_hook.mp4 … 11_closing.mp4). A one-frame-per-scene overview is at `video/renders/contact_sheet.png`. Eight scenes are complete. Three still show **marked placeholders** and wait for the items below. Once they are in place, we run `npm run render:final` (from `video/remotion/`) to compile the full silent video (about 171 s). That command refuses to run while any placeholder or pending claim remains.

## Required before the final compile

| # | What | Scene | Where to put it | Details |
|---|---|---|---|---|
| 1 | **ChatGPT recording (A07)** | S07 | `video/remotion/public/chatbot_comparison/chatgpt_take1.mp4` | Record by hand; it must never be automated. Paste the exact comparison prompt from `video/demo/demo_prompts.json` (scene 07). Show the product, model, mode (search on/off) and date. Don't edit the answer. Steps: [recording_checklist.md](recording_checklist.md). |
| 2 | **ChatGPT label (A07M)** | S07 | `video/remotion/src/data/chatgpt_recording.json` | `{"label": "ChatGPT · <model> · search <on/off> · recorded <YYYY-MM-DD>"}`, matching what the recording shows. |
| 3 | **USC resource-directory screenshot (A02)** | S02 | `video/remotion/public/usc_screenshots/usc_resource_directory.png` | Public page only, no logged-in names. If the services visible on it number something other than **23**, tell us the real count. The S02 line must match the screenshot. |
| 4 | **Feasibility facts (A16)** | S11 | `video/remotion/src/data/feasibility.json` | `{"who_runs_it": "...", "data_it_needs": "...", "monthly_cost": "...", "next_semester": "..."}`. Each value is one or two short sentences. "Measured cost" already shows our measured per-question cost; `monthly_cost` adds your hosting tier and expected monthly total. Suggested wording for data: "Public USC resources now; authorized integrations later, with privacy review." |

After adding files, run `npm run sync && npm run check` in `video/remotion/`. Then tell us, and we compile.

## Optional (only if you want them)
- **A13**, a measured manual run (sites, clicks, minutes to plan one semester by hand): `src/data/manual_baseline.json`. It adds the S02 counter; otherwise that counter is left out.
- **A15**, a source-cited statistic (for example the USC international student count, with its URL): `src/data/impact_stat.json`. It is shown as a small cited line in S02.
- **A11**, a personalization clip (same question, different answers for the two synthetic students): `public/recordings/s10_personalization_take1.mp4`.
- **A17 / A18**, voiceover and licensed music. This cut is silent. The narration is ready in [voiceover_script.md](voiceover_script.md).

## Decisions and fixes on your side
The full details for each item below, plus the app changes, are in [DEMO_NOTES.md](DEMO_NOTES.md).

1. **Gemini fallback returns 402 Payment Required** for every Gemini model, so when Groq rate-limits there is no fallback. Enable billing on the Gemini key, or accept Groq-only (the demo uses cached answers, so the recordings are unaffected).
2. **Set `JWT_SECRET` in `.env`** (32+ characters) before any shared or deployed run. When it is empty, the backend generates a random secret per process, so every backend restart logs everyone out.
3. **Session ownership returns 404, not 403** (the brief said 403). The video shows the real 404 "session not found". Tell us if you would rather the API return 403.
4. **Cost Run 3 (after a data update) is dropped.** The cache key does include the retrieved facts, and Run 3 made a fresh writer call. But the demo data copy broke guide search, so the answer was not a fair before/after. To add it back, the ingestion helpers need to accept a data root outside `local_database/`; then we can re-run `measure_cost.py` (up to 6 live calls).
5. **Baseline A (same model, no USC data) cost more than Trojan Compass** ($0.001092 vs $0.000829), because the model wrote 1,800 tokens. The video shows it as measured and says "ungrounded", not "cheaper".
6. **Missing features, kept out of the video:** professor outreach email (S05 shows the how-to-apply guidance instead) and housing data (empty). Chinese and Hindi support, voice input and proactive alerts appear only as **ROADMAP** badges.
7. **Review the segments:** check the wording on screen, the 23-platform line and the captions. Durations can be retuned in `video/remotion/src/config/timeline.ts`.

## Small app changes made for the demo (on this branch)
- **Academics:** `search_courses` can return sections and conflict checks (`with_sections`). It ranks courses offered in the term and at the student's level first.
- **Career:** new **lab card** (research labs with recruitment status, levels and how to apply).
- **Frontend:** card grids no longer overflow under the sources panel (grid tracks pinned to `minmax(0,1fr)`).
- **LLM gateway:** one bounded wait-and-retry on a Groq rate limit.

Nothing in the answers is hard-coded. The recordings replay real model responses from the backend LLM cache.
