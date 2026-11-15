"""Housing agent: listings under a budget and per-person cost maths (listings are not collected yet)."""

import re
from typing import Any

from backend.app.agents.base_agent import AgentSpec, PlannedCall, define_agent


def heuristic(sub_query: str, student_ctx: dict[str, Any]) -> list[PlannedCall]:
    match = re.search(r"\$\s?(\d[\d,]{2,6})|(\d[\d,]{2,6})\s?(?:usd|dollars|/month|a month)", sub_query.lower())
    budget = match.group(1) or match.group(2) if match else student_ctx.get("housing_budget_usd")
    args = {"max_rent_usd": float(str(budget).replace(",", ""))} if budget else {}
    return [("search_housing", args)]


SPEC = define_agent(AgentSpec(name="housing", categories=["listings", "housing_guides"], heuristic=heuristic))
