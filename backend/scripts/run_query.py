"""CLI to run one query through the full graph, e.g. `python -m backend.scripts.run_query --mode mock "Find CSCI 570 sections"`."""

import argparse
import json
import os
import sys
import uuid


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("message")
    parser.add_argument("--mode", choices=["mock", "cache", "live"], default=None, help="overrides LLM_MODE")
    parser.add_argument("--student", default="synthetic_student_001")
    args = parser.parse_args()
    if args.mode:
        os.environ["LLM_MODE"] = args.mode  # must be set before settings are imported

    from backend.app.data_store.loader import get_store
    from backend.app.llm_gateway.budget import RequestBudget
    from backend.app.orchestration.graph import build_graph
    from backend.app.tools.profile_tools import get_profile, profile_summary

    store = get_store()
    profile = get_profile(args.student)
    budget = RequestBudget()
    state = {"request_id": uuid.uuid4().hex, "session_id": "cli", "student_id": args.student,
             "student_ctx": profile_summary(profile), "message": args.message, "history": []}
    final = build_graph().invoke(state, config={"configurable": {"budget": budget, "store": store, "profile": profile}})
    print(json.dumps(final["response"].model_dump(), indent=2, ensure_ascii=False))
    for event in final.get("events", []):
        print("event:", json.dumps(event), file=sys.stderr)
    print(f"llm calls: {budget.calls} | usage: {budget.usage}", file=sys.stderr)


if __name__ == "__main__":
    main()
