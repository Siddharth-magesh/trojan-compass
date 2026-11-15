<!-- Detailed notes for the team: where the demo differs from the brief, open issues, and the app changes made for the demo. -->
# Demo notes: differences from the brief, open issues and app changes

Read this alongside [WHAT_WE_NEED_FROM_YOU.md](WHAT_WE_NEED_FROM_YOU.md). Each item below says what the brief expected, what actually happened, what the video shows, and what you can do about it. Every on-screen claim has a matching entry in [claims.json](claims.json); the claim IDs are given in brackets.

---

## Part 1: Differences from the brief

### 1. Cross-student session access returns 404, not 403 [C10]
- **Brief expected:** student 2 requests student 1's session and gets a **403 Forbidden**.
- **What the API does:** it returns **404 `{"detail": "session not found"}`** (`backend/app/api/routes.py:102`). The owner gets 200 for the same session.
- **Why this is fine, arguably better:** a 403 confirms that the session exists and belongs to someone else. A 404 tells the attacker nothing. Many APIs (GitHub, for example) use this pattern for resources you don't own.
- **What the video shows:** the real 404, captured by `video/remotion/scripts/security_capture.py` in Scene 08, card 2.
- **Your options:**
  - **Keep 404 (recommended).** You could mention in the voiceover that the API doesn't reveal whether the session exists.
  - **Switch to 403.** Change the status code in `routes.py`, re-run `security_capture.py`, and update claim C10 in `claims.json`.

### 2. Cost scene Run 3 (after a data update) is dropped [C17]
- **Brief expected:** Run 3 edits one record in a demo copy of the data, re-asks the same question, and shows a cache miss whose answer reflects the update.
- **What we checked first:** the brief requires the cache key to include the retrieved evidence. It does: the answer writer's cache key is built from the model, messages and tools, and the messages contain the retrieved facts. So a changed record means a new key and a fresh call.
- **What happened:**
  1. `measure_cost.py` copied `local_database/` into `video/demo/data/demo_copy/local_database/` and edited the `usc_epay` record.
  2. It then pointed the backend at the copy with `DATA_ROOT`.
  3. The structured records loaded from the copy. But guide search (the Markdown guides) looks for its files relative to the original repo layout, so it found nothing.
  4. The cache did refresh: one live writer call, while the planner and agents hit the cache. But the answer lost most of its facts, and the "Demo edit" text did not appear in it.
- **Why it's dropped:** the brief says to drop Run 3 rather than fake it. A broken answer is not a fair before/after.
- **What the video shows:** Run 1 (cache miss) and Run 2 (cache hit) only. Run 3's numbers stay in `cost_run.json` with `show_in_video: false` and the reason.
- **To bring it back:**
  - Make the ingestion helpers accept a data root outside `local_database/`. Today they find `.env` and the repo root relative to the scripts folder.
  - Then re-run `.venv/bin/python video/remotion/scripts/measure_cost.py` (up to 6 live LLM calls) and re-add Run 3 to Scene 09.

### 3. The "no USC data" baseline cost more than Trojan Compass [C14-C16]
- **Brief expected:** baseline A (the same model with no USC data) would be cheaper but ungrounded. The video should show it and say so.
- **Measured on 2026-11-15** with `openai/gpt-oss-120b` at $0.15 per 1M input and $0.60 per 1M output tokens:

| Run | Live calls | Tokens in / out | Est. cost | Latency |
|---|---|---|---|---|
| Trojan Compass, cache miss | 3 | 1,882 / 912 | $0.000829 | 4.4 s |
| Trojan Compass, cache hit | 0 | 0 / 0 | $0 | 1.0 s |
| Same model, source documents pasted | 1 | 2,476 / 280 | $0.000539 | 1.0 s |
| Same model, no USC data | 1 | 79 / 1,800 | $0.001092 | 4.1 s |

- **Why baseline A cost more:** with nothing to ground on, the model wrote a long generic answer of 1,800 output tokens. Output tokens cost 4x input tokens.
- **What the video shows:** the numbers exactly as measured. Baseline A is labelled **"ungrounded"**, not "cheaper". No percentages are invented.
- **Note for narration:**
  - Pasting the documents is cheaper per query than our cache miss. But someone has to find and paste the right documents by hand each time, and that cost isn't counted.
  - Our advantage is the cache hit (zero calls) and the grounding, not the cost of the first answer.
  - Narration should not claim Trojan Compass is the cheapest option overall.

### 4. Features in the brief that don't exist, kept out of the video
| Brief item | Status | What the video does instead |
|---|---|---|
| Professor outreach email (Scene 05) | Not built | Shows each lab's "how to apply" guidance and sources |
| Housing results | No housing data collected (the namespace is empty) | Housing is not shown anywhere |
| Chinese and Hindi support | Not built | **ROADMAP** badge in Scene 10 [C20] |
| Voice input | Not built | **ROADMAP** badge in Scene 10 |
| Proactive deadline alerts | Not built | **ROADMAP** badge in Scene 10 |
| Opportunities / resource cards (Scene 05) | The career agent returns them only for some questions | The recorded answer shows research labs with sources; nothing is added by hand |

If any of these gets built before submission, record a real clip (A11) and change the claim status from `roadmap` to `verified`.

### 5. Scene 02 platform count comes from our dataset, not yet from the screenshot [C01]
- **Brief expected:** "[N] platforms" where N is counted from the USC resource-directory screenshot (A02).
- **Now:** N = **23**. That is every site and tool referenced in our verified records: Schedule of Classes, Catalogue, USCe.pay, MySHR, LinkedIn Jobs, Indeed, Viterbi career services and so on (see `src/data/platforms.json`). The screen says "Count: sites and tools referenced in our verified dataset (23)".
- **When you send A02:** if it shows a different number, tell us. We'll either keep the dataset wording or switch to the screenshot count, so the number always matches its stated source.

---

## Part 2: Open issues on your side

### 6. Gemini fallback returns 402 Payment Required
- **What happens:** the gateway tries Groq first, then Gemini. Every Gemini model we tried (`gemini-3.8-flash`, `gemini-flash-latest`, `gemini-3-flash-preview`) returned **402 Payment Required**, which means billing isn't enabled on that key.
- **Effect:** when Groq's free tier rate-limits (after about 10 quick calls), there is no backup, and the request falls back to "unanswered".
- **Effect on the demo:** none. The recordings replay cached answers, so they make no live calls.
- **To fix:** enable billing on the Gemini key in Google AI Studio (Gemini API, then billing), or move to a paid Groq tier. You don't need to change any code.

### 7. Set `JWT_SECRET` in `.env`
- **Today:** if `JWT_SECRET` is empty or shorter than 32 characters, the backend creates a **random secret each time it starts** (`backend/app/config/settings.py`, `_strong_secret`).
- **Effect:** every backend restart invalidates all login tokens, so everyone gets logged out. For a shared or deployed demo, that looks like a bug.
- **To fix:** generate one with `python -c "import secrets; print(secrets.token_urlsafe(48))"` and put it in `.env` as `JWT_SECRET=...`. Never commit it.

---

## Part 3: App changes made for the demo (commit `0d98a0c`)

All of these are small, general improvements. None of them is demo-only logic, and no answer is hard-coded.

### 8. Course search can return sections with conflict checks
- **Problem:** the academics prompt asks to "check which sections fit together". The academic agent gets one tool round, so it could search for courses but not also fetch sections. The answer came back without sections.
- **Change:**
  - `backend/app/tools/academic_tools.py`: `search_courses` takes `with_sections` and `term`. When `with_sections` is true, it runs the existing `check_schedule_conflicts` on the top 3 results in the same call.
  - Ranking ties now prefer courses with lectures in the requested term, then courses at the student's own level. Result for the demo prompt: CSCI 559, 567 and 617.
  - `backend/app/agents/academic_agent.py`: the fallback heuristic sets `with_sections` when the question mentions sections, schedule, time, conflict or "fit together".
  - `backend/app/agents/prompts/academic.md`: tells the model when to set `with_sections`.

### 9. New research-lab card
- **Problem:** lab results came back as plain text, with no card showing recruitment status or how to apply.
- **Change:**
  - `backend/app/schemas/response.py`: new `LabCard` with the lab, PI, research areas, recruitment status, invited levels, funding, how to apply, URL and source.
  - `backend/app/tools/career_tools.py`: `search_research_labs` emits lab cards.
  - The aggregator, verifier and presenter recognise the new card type, so it is de-duplicated and checked against the data like the other card types.
  - `frontend/src/components/cards/lab_card.tsx`, plus a guard and registry entry: renders the card. Recruitment status is shown **as published** (for example "Interest only", "No opening verified"), never as an open position.
  - `backend/app/agents/prompts/career.md`: broad career questions call labs, opportunities and resources together.

### 10. Cards no longer slide under the sources panel
- **Problem:** in some answers (the Scene 07 prompt especially), course and lab cards overflowed to about 1,600 px wide and were hidden behind the right "Sources and freshness" panel.
- **Cause:** two CSS grids (the message list and the cards section) had auto-sized columns, which grow to fit their widest content.
- **Change:** pinned the grid columns to `minmax(0,1fr)` in:
  - `frontend/src/components/chat/message_list.tsx`
  - `frontend/src/components/cards/cards_section.tsx`
  - `frontend/src/components/cards/card_parts.tsx`

  Cards now sit two per row inside the 680 px chat column. Verified by measuring in the browser and re-recording.

### 11. The backend retries once when Groq rate-limits
- **Problem:** a Groq 429 failed the call straight away and moved to Gemini, which also failed (item 6).
- **Change:** `backend/app/llm_gateway/gateway.py`. On a `RateLimitError` on the first attempt, it waits for the provider's `Retry-After` time, at most **10 s**, then retries once. It never loops, so a request can't stall for long.

---

## Part 4: Final compile and open questions

- **Final compile:** once A02, A07, A07M and A16 are in place, run this from `video/remotion/`:
  ```bash
  npm run sync && npm run check
  npm run render:final        # -> video/renders/final/trojan_compass_demo.mp4 (silent, ~171 s)
  ```
  `render:final` refuses to run while any claim is pending or any placeholder remains.
- **Branch:** everything is committed on `feat/demo_video_production` (`0d98a0c`). It has **not** been pushed, opened as a PR or merged. Tell us when to push and open the PR. Per the brief, we won't merge it ourselves.
- **Brief file:** `trojan_compass_demo_video_prompt.md` at the repo root is untracked and not in the commit. Tell us whether to commit it, for example to `video/brief.md`, or leave it out.
