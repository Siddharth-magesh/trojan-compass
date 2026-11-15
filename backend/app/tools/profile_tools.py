"""Synthetic student profiles: loaded and schema-checked from local_database/student_profiles; a student only sees their own."""

import json
from functools import lru_cache
from typing import Any

from pydantic import BaseModel, ConfigDict

from backend.app.config.settings import settings
from backend.app.data_store import loader  # noqa: F401  (adds local_database/scripts to sys.path)
from backend.app.tools.tool_registry import ToolContext, ToolOutput, tool
from source_data import validate_schema  # noqa: E402


class NoInput(BaseModel):
    model_config = ConfigDict(extra="forbid")


@lru_cache(maxsize=1)
def load_profiles() -> dict[str, dict[str, Any]]:
    profiles = {}
    for path in sorted((settings.data_root / "student_profiles").glob("*.json")):
        data = json.loads(path.read_text(encoding="utf-8"))
        if data["meta"].get("data_origin") != "synthetic":
            continue  # never load anything that is not explicitly synthetic
        for record in data["records"]:
            validate_schema(record, "student_profiles", path.name)
            profiles[record["student_id"]] = record
    return profiles


def get_profile(student_id: str) -> dict[str, Any]:
    """Authorization is by identity match in code: callers pass the JWT subject, never an LLM-chosen id."""
    return load_profiles().get(student_id, {})


def profile_summary(profile: dict[str, Any]) -> dict[str, Any]:
    keys = ["program", "level", "country", "interests", "completed_courses", "housing_budget_usd", "job_interests"]
    return {k: profile[k] for k in keys if k in profile}


@tool("get_my_profile", "The logged-in student's program, completed courses, budget and interests.", NoInput)
def get_my_profile(args: NoInput, ctx: ToolContext) -> ToolOutput:
    if not ctx.profile:
        return ToolOutput(tool="get_my_profile", status="no_data", unknowns=["No profile is available for this student."])
    return ToolOutput(tool="get_my_profile", facts=[f"Student profile: {json.dumps(profile_summary(ctx.profile))}"])
