<a id="readme-top"></a>

<!-- PROJECT SHIELDS -->
[![Contributors][contributors-shield]][contributors-url]
[![Forks][forks-shield]][forks-url]
[![Stargazers][stars-shield]][stars-url]
[![Issues][issues-shield]][issues-url]
[![Apache License][license-shield]][license-url]

<!-- PROJECT LOGO -->
<br />
<div align="center">
  <a href="https://github.com/Siddharth-magesh/trojan-compass">
    <img src="frontend/public/favicon.svg" alt="Trojan Compass logo" width="80" height="80">
  </a>

<h3 align="center">Trojan Compass</h3>

  <p align="center">
    One conversation for everything a new USC student needs to figure out.
    <br />
    <a href="docs/PROJECT_DETAILS.md"><strong>Explore the docs »</strong></a>
    <br />
    <br />
    <a href="docs/demo/trojan_compass_demo.mp4"><strong>Watch the demo video</strong></a>
    &middot;
    <a href="#usage">See what you can ask</a>
    &middot;
    <a href="https://github.com/Siddharth-magesh/trojan-compass/issues/new?labels=bug">Report Bug</a>
    &middot;
    <a href="https://github.com/Siddharth-magesh/trojan-compass/issues/new?labels=enhancement">Request Feature</a>
  </p>
</div>

<!-- TABLE OF CONTENTS -->
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#about-the-project">About The Project</a>
      <ul>
        <li><a href="#demo-video">Demo Video</a></li>
        <li><a href="#how-it-works">How It Works</a></li>
        <li><a href="#system-architecture">System Architecture</a></li>
        <li><a href="#whats-inside">What's Inside</a></li>
        <li><a href="#built-with">Built With</a></li>
      </ul>
    </li>
    <li>
      <a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#prerequisites">Prerequisites</a></li>
        <li><a href="#installation">Installation</a></li>
      </ul>
    </li>
    <li><a href="#usage">Usage</a></li>
    <li><a href="#project-structure">Project Structure</a></li>
    <li><a href="#roadmap">Roadmap</a></li>
    <li><a href="#contributing">Contributing</a></li>
    <li><a href="#license">License</a></li>
    <li><a href="#contact">Contact</a></li>
    <li><a href="#acknowledgments">Acknowledgments</a></li>
  </ol>
</details>

<!-- ABOUT THE PROJECT -->
## About The Project

Starting at USC means juggling a dozen disconnected websites: the course catalogue, the schedule of classes, the career center, health and insurance portals, international student services and more. General-purpose chatbots don't fix this. They don't know USC's current rules, they invent details, and they know nothing about the student asking. International students feel this most, because a wrong answer about work hours or insurance has real consequences.

**Trojan Compass** is an AI companion for incoming USC students. You ask one question about courses, jobs, campus services or pre-semester setup. A team of specialist assistants works on it together and returns one clear answer, with every fact linked to the official USC source it came from.

Why it's different:
* **Verified USC information.** Answers come from hand-collected, source-linked USC data, not the model's memory.
* **Personal.** It knows who's asking: completed courses, program, budget and interests.
* **Honest.** If something isn't in the verified data, it says so and points you to the right office instead of guessing.
* **Transparent.** You watch the planner and each specialist work in real time, and every claim carries a clickable citation.

> An independent student project built for the AI USC Hackathon. Not an official USC service.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

### Demo Video

[**Watch the 3-minute demo**](docs/demo/trojan_compass_demo.mp4) (MP4, 1080p, 2:51, narrated). It shows the real app answering course, research, onboarding and visa questions for synthetic students. It also covers a side-by-side with a general-purpose assistant, live security checks and measured cost. The video is built with Remotion from real recordings; see [video/](video/).

<p align="right">(<a href="#readme-top">back to top</a>)</p>

### How It Works

1. **Understand.** A planner reads the message and decides which specialists are needed: courses, housing, jobs or student services. If the request is unclear, it asks one quick question with answer chips.
2. **Research in parallel.** Each specialist uses precise tools (course records, class schedules, job listings, a search over official USC guides) instead of relying on the AI's memory.
3. **Check.** Every number, card and link is checked against the source data before it's shown. Stale or unverifiable information is flagged.
4. **Answer.** A writer turns the verified facts into a short answer with numbered citations and suggested next questions.
5. **Guard.** Safety checks run on the way in (prompt-injection attempts are blocked) and on the way out (personal data is redacted, and only trusted links are shown).

<p align="right">(<a href="#readme-top">back to top</a>)</p>

### System Architecture

Every request is planned, verified and guarded before delivery. The diagram covers:
- the request flow (user interface, LangGraph orchestration, controlled tools and the LLM gateway);
- the knowledge-retrieval service;
- ingestion and storage;
- cross-cutting security, scalability and operations.

[![Trojan Compass system architecture](docs/images/system_architecture.png)](docs/images/system_architecture.png)

<p align="right">(<a href="#readme-top">back to top</a>)</p>

### What's Inside

* **211 courses and 803 class sections** across Computer Science and Electrical and Computer Engineering, for Fall 2026 and Spring 2027
* **Jobs and research:** on-campus openings, 19 research labs and 38 career resources
* **28 official guides:** F-1 work rules, CPT, OPT, SSN, tuition payments, health insurance, immunizations and the USCard
* **65 registered sources:** every fact keeps its source link and the date it was last verified
* **2 demo students:** synthetic profiles (not real people) so answers can be personalized

<p align="right">(<a href="#readme-top">back to top</a>)</p>

### Built With

* [![React][React.js]][React-url]
* [![TypeScript][TypeScript]][TypeScript-url]
* [![Vite][Vite]][Vite-url]
* [![Tailwind CSS][Tailwind]][Tailwind-url]
* [![Python][Python]][Python-url]
* [![FastAPI][FastAPI]][FastAPI-url]
* [![LangGraph][LangGraph]][LangGraph-url]
* [![Pydantic][Pydantic]][Pydantic-url]
* [![Groq][Groq]][Groq-url]
* [![Google Gemini][Gemini]][Gemini-url]
* [![Pinecone][Pinecone]][Pinecone-url]

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- GETTING STARTED -->
## Getting Started

Run the AI backend and the chat app on your own computer in a few minutes.

### Prerequisites

* Python 3.11 or newer
* Node.js 22 or newer, plus pnpm
  ```sh
  npm install -g pnpm
  ```
* API keys: [Groq](https://console.groq.com/keys) (AI model) and [Pinecone](https://app.pinecone.io) (guide search). A [Gemini](https://aistudio.google.com/apikey) key is optional, as a fallback.
  No keys yet? Set `LLM_MODE=mock` to run the whole app with sample AI output.

### Installation

1. Clone the repo
   ```sh
   git clone https://github.com/Siddharth-magesh/trojan-compass.git
   cd trojan-compass
   ```
2. Copy the settings template and add your keys
   ```sh
   cp .env.example .env
   ```
3. Install and start the backend (the AI system) at http://localhost:8000
   ```sh
   python -m venv .venv
   .venv/bin/pip install -r backend/requirements.txt
   .venv/bin/uvicorn backend.main:app --port 8000
   ```
4. In a second terminal, install and start the chat app at http://127.0.0.1:5173
   ```sh
   cd frontend
   pnpm install
   pnpm dev
   ```
5. Optional, one time: build the local files for guide search. This only reads from Pinecone, never changes it.
   ```sh
   cd local_database/scripts && python push_to_pinecone.py --verify-only
   ```

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- USAGE EXAMPLES -->
## Usage

Open **http://127.0.0.1:5173**, choose a demo student (**Aarav**, MS Computer Science, or **Bianca**, BS Electrical and Computer Engineering) and start asking:

* *"Can I take CSCI 104 and EE 250 next spring? Do the lectures clash?"*
* *"I'm on an F-1 visa. How many hours a week can I work on campus?"*
* *"Find me a part-time technical job on campus."*
* *"How do I pay my tuition from India?"*
* *"Which immunizations do I need before I arrive?"*
* *"Give me a pre-semester checklist."*
* All at once: *"I'm a new international student. Check two courses for spring, find a campus job, and give me a checklist."*

You get a short answer with clickable citations, cards for courses (prerequisites met or not, weekly schedule), jobs (pay, hours and work eligibility), USC services, and an interactive checklist that remembers your ticks. When something isn't in the verified data, such as housing listings or a parking permit price, it tells you so.

_For the full API contract and settings, see [docs/PROJECT_DETAILS.md](docs/PROJECT_DETAILS.md)._

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- PROJECT STRUCTURE -->
## Project Structure

```text
frontend/          the chat app students use (React + Vite)
backend/           the AI system: planner, specialist agents, tools, checks and the API (FastAPI + LangGraph)
local_database/    collected USC data, its sources and the search-index scripts
evaluation/        79 test questions and the search-quality evaluation
docs/              architecture details, data format, contribution rules, task list, demo video (docs/demo/) and architecture diagram (docs/images/)
video/             how the demo video is made: Remotion scenes, recording scripts, claims and production docs
```

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- ROADMAP -->
## Roadmap

- [x] Multi-agent system: planner, parallel specialists, verification and guards
- [x] Search over official USC guides, measured on 79 test questions
- [x] Chat app with live progress, citations, cards and conversation history
- [x] Courses, jobs, research, USC services and international-student rules
- [ ] Housing listings
- [ ] Academic calendar and registration deadlines
- [ ] More programs beyond Computer Science and Electrical and Computer Engineering
- [ ] Side-by-side comparison with a general-purpose chatbot
- [ ] Production-scale design (persistent storage, real sign-in)

See the [task list](docs/TASKS.md) and [open issues](https://github.com/Siddharth-magesh/trojan-compass/issues) for details.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- CONTRIBUTING -->
## Contributing

Contributions make this project better. Read [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) and the rules in [docs/AGENTS.md](docs/AGENTS.md) first, then:

1. Create a branch (`git checkout -b feat/your_feature`)
2. Commit your changes (`git commit -m 'feat: add your feature'`)
3. Push the branch (`git push -u origin feat/your_feature`)
4. Open a Pull Request

### Top contributors:

<a href="https://github.com/Siddharth-magesh/trojan-compass/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=Siddharth-magesh/trojan-compass" alt="contrib.rocks image" />
</a>

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- LICENSE -->
## License

Distributed under the Apache License 2.0. See [LICENSE](LICENSE) for more information. Course, policy and service information belongs to the University of Southern California and is used here for a student demo only.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- CONTACT -->
## Contact

* Siddharth Magesh: [@Siddharth-magesh](https://github.com/Siddharth-magesh)
* Harsh Sharma: [@Harsh-31](https://github.com/Harsh-31)
* Hamsashree Srivenkateswaran: [@hamsa224](https://github.com/hamsa224)
* [@pkathire-ai](https://github.com/pkathire-ai)

Project Link: [https://github.com/Siddharth-magesh/trojan-compass](https://github.com/Siddharth-magesh/trojan-compass)

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- ACKNOWLEDGMENTS -->
## Acknowledgments

* [USC Schedule of Classes](https://classes.usc.edu/) and [USC Catalogue](https://catalogue.usc.edu/), sources for course and program data
* [USC Office of International Services](https://ois.usc.edu/), [Student Financial Services](https://sfs.usc.edu/) and other public USC pages, sources for the guides
* [LangGraph](https://langchain-ai.github.io/langgraph/), the multi-agent orchestration
* [BAAI BGE](https://huggingface.co/BAAI/bge-small-en-v1.5), the embedding model
* [Replit](https://replit.com/), where the first version of the chat app was built
* [Best-README-Template](https://github.com/othneildrew/Best-README-Template), the template for this README
* [Shields.io](https://shields.io/) and [contrib.rocks](https://contrib.rocks/), the badges and contributor images

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- MARKDOWN LINKS & IMAGES -->
[contributors-shield]: https://img.shields.io/github/contributors/Siddharth-magesh/trojan-compass.svg?style=for-the-badge
[contributors-url]: https://github.com/Siddharth-magesh/trojan-compass/graphs/contributors
[forks-shield]: https://img.shields.io/github/forks/Siddharth-magesh/trojan-compass.svg?style=for-the-badge
[forks-url]: https://github.com/Siddharth-magesh/trojan-compass/network/members
[stars-shield]: https://img.shields.io/github/stars/Siddharth-magesh/trojan-compass.svg?style=for-the-badge
[stars-url]: https://github.com/Siddharth-magesh/trojan-compass/stargazers
[issues-shield]: https://img.shields.io/github/issues/Siddharth-magesh/trojan-compass.svg?style=for-the-badge
[issues-url]: https://github.com/Siddharth-magesh/trojan-compass/issues
[license-shield]: https://img.shields.io/github/license/Siddharth-magesh/trojan-compass.svg?style=for-the-badge
[license-url]: https://github.com/Siddharth-magesh/trojan-compass/blob/main/LICENSE
[React.js]: https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB
[React-url]: https://react.dev/
[TypeScript]: https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white
[TypeScript-url]: https://www.typescriptlang.org/
[Vite]: https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white
[Vite-url]: https://vite.dev/
[Tailwind]: https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white
[Tailwind-url]: https://tailwindcss.com/
[Python]: https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white
[Python-url]: https://www.python.org/
[FastAPI]: https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white
[FastAPI-url]: https://fastapi.tiangolo.com/
[LangGraph]: https://img.shields.io/badge/LangGraph-1C3C3C?style=for-the-badge&logo=langchain&logoColor=white
[LangGraph-url]: https://langchain-ai.github.io/langgraph/
[Pydantic]: https://img.shields.io/badge/Pydantic-E92063?style=for-the-badge&logo=pydantic&logoColor=white
[Pydantic-url]: https://docs.pydantic.dev/
[Groq]: https://img.shields.io/badge/Groq-F55036?style=for-the-badge&logoColor=white
[Groq-url]: https://groq.com/
[Gemini]: https://img.shields.io/badge/Google_Gemini-8E75B2?style=for-the-badge&logo=googlegemini&logoColor=white
[Gemini-url]: https://ai.google.dev/
[Pinecone]: https://img.shields.io/badge/Pinecone-000000?style=for-the-badge&logoColor=white
[Pinecone-url]: https://www.pinecone.io/
