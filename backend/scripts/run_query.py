"""CLI to run one query through the backend, e.g. `python -m backend.scripts.run_query --mode mock "Find me CSCI 570 sections"`."""

import argparse
import json
import os
import sys


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
    from backend.app.orchestration.supervisor import plan_request

    store = get_store()
    print(f"data: { {c: len(v) for c, v in store.by_id.items()} } | documents: {len(store.documents)} | skipped files: {len(store.skipped)}",
          file=sys.stderr)
    budget = RequestBudget()
    plan = plan_request(args.message, [], {}, budget)
    print(json.dumps(plan.model_dump(), indent=2))
    print(f"llm calls: {budget.calls} | usage: {budget.usage}", file=sys.stderr)


if __name__ == "__main__":
    main()
