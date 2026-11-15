<!-- Maps the current repository and the collected source data. -->
# Contributing

Start with [local_database/data/](local_database/data/) for the collected knowledge and [DATA_GUIDE.md](DATA_GUIDE.md) for its format. [local_database/README.md](local_database/README.md) links directly to every populated category.

```text
local_database/
  README.md
  data/
    academic/
      courses/
      course_sections/
      degree_requirements/
      academic_calendar/          # reserved, uncollected
      bulletin/                   # reserved, uncollected
      registration_policies/      # reserved, uncollected
    housing/
      listings/                   # reserved, uncollected
      housing_guides/             # reserved, uncollected
    career/
      career_guides/
      research_labs/
      opportunities/
      career_resources/
      job_listings/               # reserved, uncollected
    student_services/
      service_directory/
      international_students/
      student_policies/
      event_listings/
      support_resources/
  registry/
    categories.json
    sources.json
    source_checks.json
  schemas/                        # metadata, record and source-check schemas
  student_profiles/               # synthetic only, currently empty; never embedded
```

Data filenames contain the registered source name and academic-year suffix. Keep historical years separate. Complete JSON records provide exact facts; Markdown contains source-linked guides. Draft and verified data share the category folders, with indexing eligibility determined by their metadata. Do not silently promote drafts or truncate nested details.

`evaluation/golden_queries.jsonl` contains 79 academic, career and student-service questions; `evaluation/README.md` describes their use. Root `AGENTS.md` contains contributor rules, and `PROJECT_DETAILS.md` contains intended stack/configuration values. The frontend, backend and ingestion pipeline are planned components, not implemented by the current data-only work.

The former source archives, inactive code, reports and generated audit manifests are recoverable from Git history at `89fadce`. They are intentionally absent from the current data tree. Future ingestion tooling and ignored `processed/` output should follow DATA_GUIDE when that implementation is requested.
