"""Runs one question through the real graph and prints usage as JSON (helper for measure_cost.py; honours LLM_MODE/DATA_ROOT)."""

import json
import sys
import time
import uuid
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from backend.app.data_store.loader import get_store  # noqa: E402
from backend.app.llm_gateway.budget import RequestBudget  # noqa: E402
from backend.app.orchestration.graph import build_graph  # noqa: E402
from backend.app.tools.profile_tools import get_profile, profile_summary  # noqa: E402


def main(student_id: str, question: str) -> None:
    store, profile, budget = get_store(), get_profile(student_id), RequestBudget()
    state = {"request_id": uuid.uuid4().hex, "session_id": "cost", "student_id": student_id,
             "student_ctx": profile_summary(profile), "message": question, "history": []}
    start = time.perf_counter()
    final = build_graph().invoke(state, config={"configurable": {"budget": budget, "store": store, "profile": profile}})
    latency_ms = round((time.perf_counter() - start) * 1000)
    live = [u for u in budget.usage if u.get("ok") and not u.get("cached") and u.get("model") != "mock"]
    print(json.dumps({
        "latency_ms": latency_ms, "live_llm_calls": len(live), "cached_llm_hits": sum(1 for u in budget.usage if u.get("cached")),
        "input_tokens": sum(u.get("prompt_tokens", 0) for u in live), "output_tokens": sum(u.get("completion_tokens", 0) for u in live),
        "answer": final["response"].answer,
    }))


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
