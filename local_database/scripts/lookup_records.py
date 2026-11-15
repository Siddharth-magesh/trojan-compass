"""Read exact public career facts from source JSON using the generated record index."""

import argparse
import json
from datetime import date

from pydantic import BaseModel, ConfigDict, JsonValue

from dataset_io import database_root, load_records, read_json


class LookupRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    record_id: str
    as_of: date


def lookup(request: LookupRequest) -> dict[str, JsonValue]:
    index = read_json(database_root / "processed/records_index.json")
    entry = index.get(request.record_id.lower().replace(" ", "_"))
    if entry is None:
        return {"found": False}
    path = (database_root.parent / entry["file"]).resolve()
    if not path.is_relative_to(database_root / "data"):
        raise ValueError("Record index points outside the data directory")
    payload = load_records(path)
    if payload.meta.access_level != "public" or payload.meta.status != "verified":
        return {"found": False}
    record = payload.records[entry["position"]]
    if record[entry["id_field"]].lower().replace(" ", "_") != request.record_id.lower().replace(" ", "_"):
        raise ValueError("Stale record index; rebuild before lookup")
    expired = any(record.get(field) and date.fromisoformat(record[field]) < request.as_of
                  for field in ("deadline", "end_date"))
    return {"found": True, "record": record, "meta": payload.meta.model_dump(mode="json", exclude_none=True),
            "expired": expired, "verification_age_days": (request.as_of - payload.meta.last_verified_date).days,
            "effective_recruitment_status": "closed" if expired else record["recruitment_status"]}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("record_id")
    parser.add_argument("--as-of", type=date.fromisoformat, required=True)
    arguments = parser.parse_args()
    request = LookupRequest(record_id=arguments.record_id, as_of=arguments.as_of)
    print(json.dumps(lookup(request), indent=2, ensure_ascii=False))
