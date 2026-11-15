# Trojan Compass

**One conversation for everything a new USC student needs to figure out.**

Trojan Compass is an AI companion for incoming USC students, especially international students. Ask it one question about courses, jobs, campus services or getting set up before the semester. A team of specialist assistants then works on it together, and you get one clear answer. Every fact links back to the official USC source it came from.

> An independent student project built for the AI USC Hackathon. Not an official USC service.

---

## Why we built it

Starting at USC means juggling a dozen disconnected websites: the course catalogue, the schedule of classes, the career center, health and insurance portals, international student services, and more. General-purpose chatbots don't help much here. They don't know USC's current rules, they invent details, and they know nothing about you. International students feel this most, because a wrong answer about work hours or insurance can have real consequences.

Trojan Compass answers from **verified USC information**, knows **who is asking**, and is **honest about what it doesn't know**.

## What you can ask

- *"Can I take CSCI 104 and EE 250 next spring? Do the lectures clash?"*
- *"I'm on an F-1 visa. How many hours a week can I work on campus?"*
- *"Find me a part-time technical job on campus."*
- *"How do I pay my tuition from India?"*
- *"Which immunizations do I need before I arrive?"*
- *"Give me a pre-semester checklist."*
- Or all of it at once: *"I'm a new international student. Check two courses for spring, find a campus job, and give me a checklist."*

## What you get back

- **A short, readable answer** with numbered citations you can click through to the USC page.
- **Cards** for courses (prerequisites you have and haven't completed, plus a weekly schedule view), jobs (pay, hours and work eligibility for international students), USC services, and an interactive **checklist** that remembers what you've ticked.
- **A live view of the work.** You watch the planner and each specialist (courses, housing, jobs, student services) run in parallel.
- **Honesty built in.** If something isn't in our verified data, such as current housing listings or a parking permit price, it says so instead of guessing, and it points you to the right office.

## How it works

1. **Understand.** A planner reads your message and decides which specialists are needed, or asks a quick follow-up question if your request is unclear.
2. **Research in parallel.** Each specialist looks up facts with precise tools (course records, class schedules, job listings, USC guides) instead of relying on the AI's memory.
3. **Check.** Every number, card and link is checked against the source data before anything is shown. Stale or unverifiable information is flagged.
4. **Answer.** A writer turns the verified facts into a short answer with citations and suggested next questions.
5. **Guard.** Safety checks run on the way in (prompt-injection attempts are blocked) and on the way out (personal data is redacted, and only trusted links are shown).

## What's inside

| | |
|---|---|
| **211 courses, 803 class sections** | USC Computer Science and Electrical and Computer Engineering, Fall 2026 and Spring 2027 |
| **Jobs and research** | on-campus openings, 19 research labs and 38 career resources |
| **28 official guides** | international student rules (F-1 work, CPT, OPT, SSN), payments, health insurance, immunizations, USCard |
| **65 registered sources** | every fact keeps its source link and the date it was last verified |
| **2 demo students** | synthetic profiles (not real people) so answers can be personalized |

## Run it on your computer

**You'll need:** Python 3.11+, Node.js 22+ with pnpm, and API keys for Groq (the AI model) and Pinecone (guide search). With `LLM_MODE=mock` the app runs without any keys, using sample AI output.

```bash
# 1. Settings: copy the template and add your keys
cp .env.example .env

# 2. Backend (the AI system), at http://localhost:8000
python -m venv .venv
.venv/bin/pip install -r backend/requirements.txt
.venv/bin/uvicorn backend.main:app --port 8000

# 3. Frontend (the chat app), at http://127.0.0.1:5173, in a second terminal
cd frontend
pnpm install
pnpm dev
```

Open **http://127.0.0.1:5173**, choose a demo student (Aarav or Bianca) and start asking.

**One-time setup for guide search:** build the local search files with `cd local_database/scripts && python push_to_pinecone.py --verify-only`. This only reads from Pinecone, never changes it. Until then, everything else works and the app tells you guide search is unavailable.

## Built with

| Part | Technology |
|---|---|
| Chat app | React, TypeScript, Vite, Tailwind CSS, streaming updates |
| AI system | Python, FastAPI, LangGraph (a planner plus specialist agents working in parallel) |
| AI models | Groq `gpt-oss-120b`, with Google Gemini as a fallback |
| Guide search | Pinecone vector search with BGE embeddings, plus exact lookups in local data |
| Data | Hand-collected public USC information stored as JSON and Markdown, each fact with its source |
| Safety | Demo login (JWT), rate limiting, prompt-injection and personal-data guards |

## Project layout

```text
frontend/          the chat app students use
backend/           the AI system: planner, specialist agents, tools, checks and the API
local_database/    the collected USC data, its sources and the search-index scripts
evaluation/        79 test questions and the search-quality evaluation
docs/              team guides: architecture details, data format, contribution rules, task list
```

Developers can start with [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md), then [docs/PROJECT_DETAILS.md](docs/PROJECT_DETAILS.md) and [docs/DATA_GUIDE.md](docs/DATA_GUIDE.md).

## Where it stands

**Working today:** the full journey for courses, jobs, research, USC services, international-student rules and checklists, with live streaming, citations and conversation history.

**Not yet:** housing listings and the academic calendar haven't been collected, so the app says so honestly. Scaling the system beyond a demo is planned in the [task list](docs/TASKS.md).

## Team

| | GitHub |
|---|---|
| Siddharth Magesh | [@Siddharth-magesh](https://github.com/Siddharth-magesh) |
| Harsh Sharma | [@Harsh-31](https://github.com/Harsh-31) |
| Hamsashree Srivenkateswaran | [@hamsa224](https://github.com/hamsa224) |
| pkathire-ai | [@pkathire-ai](https://github.com/pkathire-ai) |

## License

Apache License 2.0. See [LICENSE](LICENSE). Course, policy and service information belongs to the University of Southern California and is used here for a student demo only.
