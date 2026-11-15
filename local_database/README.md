<!-- Entry point to the collected data and its schemas. -->
# Local database

**The collected files are in [data/](data/).** All 111 source files are retained in full: 1,339 JSON records and 28 Markdown documents. Follow the root [DATA_GUIDE.md](../DATA_GUIDE.md) for formats and future Pinecone ingestion.

| Data | Folder | Contents |
|---|---|---|
| Academic courses | [courses](data/academic/courses/) | 231 records in 4 batches |
| Academic sections | [course_sections](data/academic/course_sections/) | 803 section records in 4 batches |
| Degree requirements | [degree_requirements](data/academic/degree_requirements/) | 6 historical program records |
| Research labs | [research_labs](data/career/research_labs/) | 19 records |
| Career opportunities | [opportunities](data/career/opportunities/) | 7 records |
| Career resources | [career_resources](data/career/career_resources/) | 40 records |
| Career guides | [career_guides](data/career/career_guides/) | 13 documents |
| USC services | [service_directory](data/student_services/service_directory/) | 8 portal records |
| International students | [international_students](data/student_services/international_students/) | 7 documents |
| Student policies | [student_policies](data/student_services/student_policies/) | 8 documents |
| Student-life events | [event_listings](data/student_services/event_listings/) | 215 records |
| Basic needs | [support_resources](data/student_services/support_resources/) | 10 complete topic records |

[registry/categories.json](registry/categories.json) defines the categories; [registry/sources.json](registry/sources.json) identifies their sources. [registry/source_checks.json](registry/source_checks.json) retains collection access observations. [schemas/](schemas/) contains their validation schemas. [student_profiles/](student_profiles/) is reserved for synthetic profiles and is currently empty. Housing and other reserved categories have no collected records yet.

Only public files with `meta.status: verified` may be indexed. There are 99 such files (1,086 records plus 28 documents). Twelve files remain draft: 20 courses referencing 38 absent prerequisite IDs, six historical degree programs, two career resources, 215 transcribed events and ten basic-needs topics. They remain in the same category folders with their full content and draft metadata.

All 803 section listings retain explicitly unknown modality/location; 96 have TBA times and 359 have no listed instructor. Treat these values as unknown. Canonical section IDs include the course code; `source_section_id` retains the original alias. Degree filenames use their actual historical catalogue years.

This folder contains source data and its schema/registry support only. Old code, duplicate archives, generated manifests and reports have been removed from the current layout; they remain recoverable in Git history at commit `89fadce`. No data file was changed or truncated by this cleanup. Pinecone chunking, embedding and upload remain future work under DATA_GUIDE; no upload has occurred.
