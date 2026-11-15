# Trojan Compass: frontend

The student-facing chat app: React + TypeScript + Vite + Tailwind. It started as a Replit-generated app and is now integrated with the FastAPI backend in `../backend`.

## Run
```bash
pnpm install
pnpm dev            # http://127.0.0.1:5173 (start the backend on :8000 first)
pnpm typecheck
pnpm build          # outputs dist/
```
Optional settings are in `.env.example`. In development, Vite proxies `/api` to `BACKEND_URL` (default `http://localhost:8000`), so streaming and auth work same-origin. Set `VITE_USE_MOCK=true` to use the in-browser mock backend (`src/mock_api`) for offline demos.

## How it talks to the backend
- `src/lib/api_types.ts` is the whole contract: login, profile, sessions, SSE events (`session`, `status`, `answer_delta`, `clarification`, `final`, `error`) and the card types. The backend maps its results to this shape in `backend/app/api/presenter.py`.
- `src/lib/api_client.ts` is the only module that touches the network. It keeps the bearer token in sessionStorage, parses SSE defensively (malformed events are skipped), and on a 401 signs the user out and reopens the demo-student picker.
- `src/lib/chat_provider.tsx` turns stream events into messages (stop, regenerate, new chat, restore a session).
- `src/lib/demo_students.ts` lists the backend's two synthetic students (`synthetic_student_001`, `synthetic_student_002`).

## Layout
- `src/components/chat`: home view, composer, activity timeline, Markdown answers with citation pills, sources, notices, errors, follow-up chips.
- `src/components/cards`: `card_registry.tsx` maps `type` to a renderer, with guards, so unknown or malformed cards fall back to `GenericCard`. Course (prerequisites met / not completed / unknown, schedule grid), housing (compare up to three), job, service, checklist (ticks persist).
- `src/components/layout`: shell, sidebar, top bar, right panel, demo login dialog.
- `src/app`: pages: `/`, `/c/:session_id`, `/conversations`, `/checklists`, `/shortcuts`.

## Security
No `dangerouslySetInnerHTML`; Markdown skips raw HTML and images; every link goes through `safe_url` (http/https only) and opens with `rel="noopener noreferrer"`. Chat requests never include `student_id`; identity comes from the token.
