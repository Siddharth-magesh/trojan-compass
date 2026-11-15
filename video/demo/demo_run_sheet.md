<!-- Step-by-step run sheet to reproduce the product recordings (servers, cache warm-up, recording commands). -->
# Demo run sheet

The recordings show the real app. Answers come from the backend's LLM response cache (`LLM_MODE=cache`), which holds responses the live model produced while warming. Nothing is hard-coded in the UI or in the answers.

1. **Backend** (repo root): `LLM_MODE=cache .venv/bin/uvicorn backend.main:app --port 8000`
   - A cache miss makes a live call (Groq) and stores it. A cache hit makes no call.
   - Warm-up note: on the free Groq tier, space prompts about 60 s apart. The Gemini fallback currently returns 402 (billing), so it cannot cover rate limits.
2. **Frontend**: `cd frontend && pnpm dev` (http://127.0.0.1:5173).
3. **Warm the cache** once per prompt: ask each prompt in `demo_prompts.json` as its student in the UI, and check that the answer looks like the storyboard. Re-asking is then deterministic.
4. **Record**: `cd video/remotion && node scripts/record_app.mjs` (all) or name scenes: `s03_home s04_academics s05_career s06_onboarding s07_trojan_compass s08_injection s10_mobile`.
5. **Sync**: `npm run sync`, then preview in `npm run dev`.

Expected answers (2026-11-15 takes):

| Clip | Student | What must be visible |
|---|---|---|
| s04_academics | synthetic_student_001 | Course cards CSCI 559, 567, 617 with sections; two sections picked; "Your week" grid |
| s05_career | synthetic_student_001 | INK, JAUNTS and Deshmukh lab cards with recruitment status and how to apply; sources |
| s06_onboarding | synthetic_student_001 | Pre-semester checklist card; three items ticked |
| s07_trojan_compass | synthetic_student_001 | Courses, labs (JAUNTS, MELADY, INK) and application procedures with citations |
| s08_injection | synthetic_student_002 | Guard reply: "I can't help with that request…" |
| s10_mobile | synthetic_student_001 | F-1 on-campus work-hours answer with a citation, at phone size |

If an answer changes after a data or prompt edit, its cache key changes and the next ask is a live call. Re-warm, check the answer, then re-record.
