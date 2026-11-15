"""Builds the JSON the video reads (platforms, prerequisite overlay, synthetic profiles) from verified repo data only.
Run from the repo root: .venv/bin/python video/remotion/scripts/build_data.py
"""

import json
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO))

from backend.app.data_store.loader import get_store  # noqa: E402
from backend.app.tools.academic_tools import prerequisite_courses  # noqa: E402
from backend.app.tools.profile_tools import get_profile  # noqa: E402

OUT = REPO / "video" / "remotion" / "src" / "data"
DEMO_COURSES = ["CSCI 559", "CSCI 567", "CSCI 617"]  # the courses the real academics answer shows (scene 04)
PLATFORM_KINDS = {"job_platform": "Job platform", "career_service": "Career service"}


def platforms(store) -> list[dict]:
    """Student-facing platforms referenced in verified data, each with its source URL (scene 01/02 count)."""
    out = [{"name": "Schedule of Classes", "kind": "Academics", "url": "https://classes.usc.edu/"},
           {"name": "USC Catalogue", "kind": "Academics", "url": "https://catalogue.usc.edu/"}]
    out += [{"name": r["name"].split(" (")[0], "kind": "Student services", "url": r["official_url"]}
            for r in store.records("service_directory")]
    out += [{"name": r["title"].split(" (")[0], "kind": PLATFORM_KINDS[r["resource_type"]], "url": r.get("official_url", "")}
            for r in store.records("career_resources") if r.get("resource_type") in PLATFORM_KINDS]
    return out


def prereq_overlay(store, student_id: str) -> dict:
    profile = get_profile(student_id)
    completed = set(profile.get("completed_courses", []))
    courses = []
    for cid in DEMO_COURSES:
        course = store.get("courses", cid)
        courses.append({"course_id": cid, "title": course["title"], "prerequisite_text": course.get("prerequisite_text", ""),
                        "prerequisites": prerequisite_courses(course, completed, store)})
    unlocked = [c for c in store.get("courses", "CSCI 570").get("leads_to", []) if store.get("courses", c)]
    return {"student_id": student_id, "completed": sorted(completed), "courses": courses,
            "completed_unlocks": [{"course_id": c, "title": store.get("courses", c)["title"]} for c in unlocked][:3]}


def profiles() -> list[dict]:
    keys = ["student_id", "name", "program", "level", "country", "interests", "completed_courses", "housing_budget_usd", "job_interests"]
    return [{k: get_profile(sid)[k] for k in keys} for sid in ("synthetic_student_001", "synthetic_student_002")]


def main() -> None:
    store = get_store()
    OUT.mkdir(parents=True, exist_ok=True)
    data = {"platforms.json": {"source": "verified records in local_database/data", "platforms": platforms(store)},
            "prereq_graph.json": prereq_overlay(store, "synthetic_student_001"),
            "profiles.json": {"note": "synthetic profiles, not real students", "profiles": profiles()}}
    for name, payload in data.items():
        (OUT / name).write_text(json.dumps(payload, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
        print(name, "written")
    print("platform count:", len(data["platforms.json"]["platforms"]))


if __name__ == "__main__":
    main()
