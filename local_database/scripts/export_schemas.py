"""Export reviewable JSON Schemas from the typed collection boundaries."""

from data_models import Meta, SourceChecks, record_models
from dataset_io import database_root, write_json


def export_schemas() -> None:
    for name, model in {"meta_common": Meta, "source_checks": SourceChecks, **record_models}.items():
        schema = model.model_json_schema()
        schema = {"$comment": "Schema for " + name + "; absent optional facts must be omitted in stored data.",
                  "$schema": "https://json-schema.org/draft/2020-12/schema", **schema}
        write_json(database_root / "schemas" / f"{name}.json", schema)


if __name__ == "__main__":
    export_schemas()
