<!-- Scene-by-scene storyboard of the demo video as built in video/remotion/src/compositions. Frames at 30 fps. -->
# Storyboard

Scene lengths come only from `remotion/src/config/timeline.ts`. FullVideo joins the scenes with 12-frame fades, so the full cut is 5250 - 10 x 12 = **5130 frames (171 s)**. The hard cap is 180 s.

| # | Scene | Frames | What is on screen | Data / assets | Status |
|---|---|---|---|---|---|
| 01 | Hook | 300 | Original vector skyline and a student with a suitcase. "Starting university should be exciting. / Navigating it shouldn't be overwhelming." Five task chips collapse into a tab stack that counts to 23. | `src/data/platforms.json` (count) | Ready |
| 02 | Fragmented USC | 300 | USC resource-directory screenshot, then 23 platform windows pop out and scatter. Caption "23 platforms. Different workflows. Answers scattered across all of them." plus a source line. | A02 (we provide), platforms.json | **A02 placeholder** |
| 03 | Reveal | 240 | Windows merge into the real home screen (A03), then the logo, "Meet Trojan Compass." and "Your USC experience, one conversation away." | A01, A03 | Ready |
| 04 | Academics | 720 | Real app answering the exact academics prompt: activity timeline, course cards CSCI 559 / 567 / 617, sections picked, weekly schedule. The frame then shrinks and a prerequisite panel appears from catalogue data. Caption "Course planning with sources, not guesses." | A04, prereq_graph.json | Ready |
| 05 | Career | 660 | Real app answering the career prompt: INK, JAUNTS and Deshmukh lab cards with recruitment status as published, how to apply, sources. Badge "Recruitment status as published". Caption "Discover opportunities beyond the job boards." | A05 | Ready |
| 06 | Onboarding | 540 | Real app answering the onboarding prompt: checklist card, three items ticked, progress ring updates. Caption "From arrival to first semester, one clear path." | A06 | Ready |
| 07 | Comparison | 540 | The same prompt on top, ChatGPT recording on the left, Trojan Compass on the right. Tags "General-purpose knowledge" / "USC-specific, source-grounded information". | A07 + A07M (we record), A08 | **A07 placeholder** |
| 08 | Security | 540 | Real injection block (A09), then four terminal cards with real captured output: verbatim guard reply, session ownership 404, output-guard redaction, request log line. Then the architecture strip (every part is built). Caption "Intelligent agents. Controlled access. Protected student information." | A09, security_capture.json | Ready |
| 09 | Cost | 540 | Run 1 (miss) and Run 2 (hit) cards, then cost-per-query bars for the miss, the hit, documents pasted, and no USC data. Price source and date; a development-cache note. Caption "Less repeated computation. Every number measured." | cost_run.json | Ready (Run 3 dropped) |
| 10 | Mobile | 300 | Phone-frame recording of the real UI, the synthetic profile card, and ROADMAP badges (Chinese and Hindi, voice input, proactive alerts). Caption "Adapts to the student. Built to grow." | A12, profiles.json | Ready |
| 11 | Closing | 570 | Flow: USC public resources → structured knowledge → retrieval → agents → verified answer. Four feasibility cards ("Measured cost" is already filled from cost_run.json), then the logo, "One university. One intelligent companion.", tagline and disclaimer. | A16 (we provide), cost_run.json | **A16 placeholders** |

Changes from the brief, and why:
- **S02 count:** comes from our verified dataset (23) until the A02 screenshot arrives. The on-screen source line says so.
- **S04:** the prerequisite overlay shows "No enforced course prerequisites" for all three courses because that is what the catalogue data says. It also shows what the synthetic student's completed CSCI 570 unlocks. Professor names appear only where the data lists them.
- **S05:** the real answer has research labs. Opportunities and resource cards appear only if the agent returns them. There is no professor-email feature, so none is shown.
- **S08:** the cross-student request returns **404 "session not found"**, not 403. It is shown as returned (claim C10).
- **S09:** Run 3 is dropped (claim C17). Baseline A (no USC data) turned out *more* expensive than Trojan Compass, because the model wrote 1,800 tokens. That is shown as measured.
- **S10:** the profile card is drawn from the synthetic profile data rather than recorded from the popover.
