"""Measures scene 09's numbers from real runs and writes src/data/cost_run.json.
Run 1 cache miss, Run 2 cache hit, Run 3 after editing one record in a demo copy of the data (cache key includes facts),
baseline A (same model, no USC data) and baseline B (same model, source documents pasted). At most 6 live calls.
Run from the repo root: .venv/bin/python video/remotion/scripts/measure_cost.py
"""

import json
import os
import shutil
import subprocess
import sys
import time
from datetime import date
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO))

from openai import OpenAI  # noqa: E402

from backend.app.config.settings import settings  # noqa: E402

OUT = REPO / "video" / "remotion" / "src" / "data" / "cost_run.json"
# The ingestion helpers locate data by the folder name "local_database", so the copy keeps that name.
DEMO_COPY = REPO / "video" / "demo" / "data" / "demo_copy" / "local_database"
QUESTION = "What is USCe.pay used for?"
STUDENT = "synthetic_student_002"
PRICE = {"model": settings.primary_model, "input_per_million_usd": 0.15, "output_per_million_usd": 0.60,
         "cached_input_per_million_usd": 0.075, "source": "https://console.groq.com/docs/model/openai/gpt-oss-120b",
         "checked": date.today().isoformat()}
SERVICE_FILE = Path("data/student_services/service_directory/usc_experience__finance_and_health__2026_2027.json")
DEMO_EDIT = " (Demo edit in a copy of the data: record updated to show the cache refreshing.)"


def cost(inp: int, out: int) -> float:
    return round(inp / 1e6 * PRICE["input_per_million_usd"] + out / 1e6 * PRICE["output_per_million_usd"], 6)


def probe(env_extra: dict[str, str] | None = None) -> dict:
    env = {**os.environ, "LLM_MODE": "cache", **(env_extra or {})}
    res = subprocess.run([sys.executable, str(Path(__file__).with_name("cost_probe.py")), STUDENT, QUESTION],
                         capture_output=True, text=True, env=env, cwd=REPO, check=True)
    run = json.loads(res.stdout.strip().splitlines()[-1])
    run["estimated_cost_usd"] = cost(run["input_tokens"], run["output_tokens"])
    return run


def make_demo_copy() -> None:
    """Copy of local_database with one service record edited; processed/ is linked, not copied (read-only)."""
    src = REPO / "local_database"
    if DEMO_COPY.exists():
        shutil.rmtree(DEMO_COPY)
    DEMO_COPY.parent.mkdir(parents=True, exist_ok=True)
    shutil.copytree(src, DEMO_COPY, ignore=shutil.ignore_patterns("processed"))
    (DEMO_COPY / "processed").symlink_to(src / "processed")
    path = DEMO_COPY / SERVICE_FILE
    doc = json.loads(path.read_text())
    for record in doc["records"]:
        if record["service_id"] == "usc_epay":
            record["purpose"] += DEMO_EDIT
    path.write_text(json.dumps(doc, indent=2, ensure_ascii=False))


def baseline(context: str | None) -> dict:
    client = OpenAI(api_key=settings.groq_api_key.get_secret_value(), base_url=settings.groq_base_url, timeout=60)
    content = QUESTION if context is None else f"Answer using these USC sources.\n\n{context}\n\nQuestion: {QUESTION}"
    start = time.perf_counter()
    resp = client.chat.completions.create(model=settings.primary_model, messages=[{"role": "user", "content": content}],
                                          max_tokens=settings.llm_synth_max_tokens, temperature=0.3)
    usage = resp.usage
    return {"latency_ms": round((time.perf_counter() - start) * 1000), "live_llm_calls": 1,
            "input_tokens": usage.prompt_tokens, "output_tokens": usage.completion_tokens,
            "estimated_cost_usd": cost(usage.prompt_tokens, usage.completion_tokens),
            "answer_preview": (resp.choices[0].message.content or "")[:300]}


def main() -> None:
    run1 = probe()
    run2 = probe()
    make_demo_copy()
    run3 = probe({"DATA_ROOT": str(DEMO_COPY)})
    sources = [(REPO / "local_database" / SERVICE_FILE).read_text(),
               (REPO / "local_database/data/student_services/international_students/usc_sfs__epay_myshr_onboarding_journey__2026_2027.md").read_text()]
    base_a, base_b = baseline(None), baseline("\n\n".join(sources))
    result = {
        "measured": date.today().isoformat(), "question": QUESTION, "student_id": STUDENT, "price": PRICE,
        "note": "Demo cache is a development cache keyed on model + messages + tools; production caching of personalized "
                "answers must be scoped per student.",
        "run1_cache_miss": run1, "run2_cache_hit": run2,
        "run3_after_data_update": {**run3, "edit": "usc_epay purpose text changed in a demo copy of the data",
                                   "answer_reflects_update": "Demo edit" in run3["answer"]},
        "baseline_a_no_usc_data": base_a, "baseline_b_documents_pasted": base_b,
        "live_calls_total": run1["live_llm_calls"] + run2["live_llm_calls"] + run3["live_llm_calls"] + 2,
    }
    OUT.write_text(json.dumps(result, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    for key in ("run1_cache_miss", "run2_cache_hit", "run3_after_data_update", "baseline_a_no_usc_data", "baseline_b_documents_pasted"):
        r = result[key]
        print(f"{key}: calls={r['live_llm_calls']} in={r['input_tokens']} out={r['output_tokens']} "
              f"cost=${r['estimated_cost_usd']} latency={r['latency_ms']}ms")
    print("run3 reflects update:", result["run3_after_data_update"]["answer_reflects_update"], "| live calls total:", result["live_calls_total"])


if __name__ == "__main__":
    main()
