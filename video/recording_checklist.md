<!-- How every recording for the demo video must be captured (scripted product clips and the manual ChatGPT clip). -->
# Recording checklist

## Product recordings (scripted: A03, A04, A05, A06, A08, A09, A12)
`video/remotion/scripts/record_app.mjs` records the real app with Playwright, so takes are repeatable:
- 1920x1080 at 100% zoom, 30 fps H.264. The phone clip is 430x932.
- Dark theme. No bookmarks, extensions, notifications or dev tools (headless browser).
- Logged in as a **synthetic** student (Aarav Demo or Bianca Demo) through the demo login. No `.env`, keys or tokens on screen.
- The exact prompts come from `video/demo/demo_prompts.json`. Typing is natural (22 ms per key).
- Each clip has 2 s of pre-roll and post-roll. Files are named `<scene>_take1.mp4` in `video/remotion/public/recordings/`.

To re-record, follow [demo/demo_run_sheet.md](demo/demo_run_sheet.md), then run `node scripts/record_app.mjs s04_academics` (or no arguments for all).

## Manual ChatGPT recording (A07): we record, never automated
1. Use a clean browser profile at 1920x1080, 100-110% zoom, in dark mode if available. Hide bookmarks, extensions and notifications.
2. Show the **product, model and mode** (for example the model picker and whether search is on) and today's date somewhere in the clip, such as the first 2 s.
3. Paste or type exactly: "I'm an incoming USC MS Computer Science student. Find suitable AI-related courses, relevant research opportunities, and explain the university-specific application procedures."
4. Record until the answer finishes, with 2 s before and after. Do not edit, cut or retype the answer. Uniform speed-up is applied in Remotion.
5. Save it as `video/remotion/public/chatbot_comparison/chatgpt_take1.mp4` (screen-recorder MP4 is fine, 30 fps or higher).
6. Write `video/remotion/src/data/chatgpt_recording.json` (A07M): `{"label": "ChatGPT · <model> · search <on|off> · recorded <YYYY-MM-DD>"}`.

## USC resource-directory screenshot (A02)
- Use a full-page screenshot (PNG, at least 1920 px wide) of the public USC student resource or quick-links page, with no personal data or logged-in names.
- Save it as `video/remotion/public/usc_screenshots/usc_resource_directory.png`.
- If the services visible on it total a different number than 23, tell us. The S02 count line must match the screenshot.
