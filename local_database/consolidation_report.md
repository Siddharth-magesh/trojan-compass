<!-- Records branch consolidation, lossless validation and remaining data readiness work. -->
# Consolidation report

The consolidated branch combines every inspected remote branch into one local source database. Original branch content is retained as immutable snapshots. Existing source verification dates and statuses were inherited; normalization was not a live verification pass. Root DATA_GUIDE remains unchanged and authoritative. TASKS.md was not read or edited for this work.

## Branch coverage

| Remote branch | Inspected commit |
|---|---|
| `origin/main` | `b16bcfd50d7c` |
| `origin/Harsh` | `cae1b05b161a` |
| `origin/feat/data_career_knowledge` | `a2ebf383c7e9` |
| `origin/feat/data_student_services_portals` | `1d954695cbe9` |
| `origin/docs/mvp-plan` | `37b12c014361` |

`Harsh` and the career branch were merged into the integration branch based on updated `main`. Student-services work and `docs/mvp-plan` were already contained in the relevant history. No branch's source content was chosen by blindly overwriting the other side of a conflict. Original configuration/code variants remain in the archive even where one canonical version was selected.

## Complete canonical coverage

| Collection | Files | Records / documents |
|---|---:|---:|
| Courses | 4 | 231 records (211 eligible; 20 draft) |
| Course sections | 4 | 803 records |
| Degree requirements | 6 | 6 draft records |
| Career laboratories | 19 | 19 records |
| Career opportunities | 7 | 7 records |
| Career resources | 40 | 40 records (38 eligible; 2 draft) |
| Career guides | 13 | 13 documents |
| Service directory | 1 | 8 records |
| International-student guides | 7 | 7 documents |
| Student policies | 8 | 8 documents |
| Student-life events | 1 | 215 draft records |
| Basic-needs topics | 1 | 10 draft records |
| **Total** | **111** | **1,339 records + 28 documents** |

No housing listings, strict job-listing batches, academic-calendar records or synthetic student profiles were present. Empty reserved categories remain available; no filler data was added.

## Normalization and preservation

- Moved both Student Life JSON files from `Docs/Student Life/` into student-services categories and registered their schemas and sources.
- Attached the user-supplied Engage calendar URL to all 215 events through batch metadata. The original collection note and proposed record schema are preserved as historical data. Public-page access did not succeed during consolidation, so the batch remains draft.
- Wrapped all ten basic-needs content subtrees as individually addressable records, preserving the complete nested structures, additional sources and original collection guidance. The batch remains draft.
- Renamed student-services files to their registered source identity and academic-year suffix; remapped all existing golden-query document IDs accordingly.
- Retained every course field, including prerequisites, instructors, sections, restrictions, clearance information and nested history. Partitioned only the 20 courses with unresolved prerequisite IDs into draft batches.
- Split the six degree records into actual catalogue-year files: 2018-2019, 2020-2021, 2022-2023 and 2025-2026. Original misleading 2026-2027 wrapper metadata remains archived. Mixed historical requirements and department-site notes need review before indexing.
- Found 80 original section IDs shared across CSCI and EE listings. Canonical IDs now use `{source_section_id}_{course_slug}`; all 803 original IDs remain in `source_section_id`, and `sis_section_id` is unchanged. No cross-listed record was dropped.
- Kept every old script variant as an inactive `.source` file and removed active scraping, embedding and upload scripts. Old generated retrieval outputs were isolated under ignored `processed/legacy_output/`.
- Added Git attributes to preserve archive bytes and canonical UTF-8/LF hashes across checkouts.

The audit verified **179 archive references** (153 data/configuration branch inputs plus 26 code versions), representing **105 distinct original data files**. It compared all original JSON records with canonical records, all original basic-needs subtrees, and all Markdown text. Section-ID normalization is reversed for comparison; only Git newline conversion is allowed for document text. Original source bytes are separately checked by SHA-256. All checks passed; no source content was truncated.

## Readiness and remaining issues

`registry/readiness_manifest.json` has **99 eligible input files / 1,086 records** and **12 held files / 253 records**. All files, including drafts, pass structural schema checks. Missing-reference findings are recorded and block the affected draft batches. `registry/data_quality.json` lists precise files, record IDs and issues.

1. **20 course records** reference **38 uncollected prerequisite IDs**. Collect those authoritative course records before promoting the draft batches. Do not remove prerequisites or invent placeholder descriptions.
2. **Six degree programs** need historical-source reconciliation. One EE PhD source explicitly lacks verified total-unit requirements; the field remains omitted rather than guessed.
3. **Two career resources** retain their original access/verification limitations (Handshake and ViterbiLink).
4. **215 events** have provenance now, but source status, transcription artifacts such as organizer `Today`, and time-zone labels on date-spanning events need review.
5. **Ten basic-needs topics** retain their original draft status pending content/source review.

All **803 sections** explicitly lack verified modality/location; **96** have `TBA` times and **359** have `not_listed` instructors. These are preserved warnings rather than fabricated values. Exact-answer and scheduling code must treat them as unknown. Collected seat values are dated snapshots, not live availability.

Missing prerequisite IDs:

`BME 210`, `BUAD 310`, `BUAD 312`, `CE 108`, `CHE 305`, `EE 441`, `ISE 150`, `ISE 225`, `ISE 529`, `ISE 530`, `ISE 533`, `ISE 630`, `ISE 631`, `ITP 115`, `ITP 165`, `ITP 168`, `ITP 216`, `ITP 265`, `ITP 365`, `MATH 126`, `MATH 129`, `MATH 225`, `MATH 235`, `MATH 245`, `MATH 407`, `MATH 410`, `MATH 425A`, `MATH 471`, `MATH 505A`, `MATH 532`, `PHYS 152`, `PHYS 162`, `TAC 115`, `TAC 165`, `TAC 168`, `TAC 216`, `TAC 265`, `TAC 365`

## Validation and Pinecone handoff

Ran `.venv\Scripts\python.exe local_database/scripts/audit_dataset.py` against the complete real merged corpus. Result: **zero structural/preservation errors**, registered categories and sources, unique canonical IDs, valid golden-query references, and complete preservation. The query corpus retains all 64 existing questions and adds 15 academic queries (79 total). Retrieval quality metrics have not been measured.

The audit generates `processed/preparation/records_index.json` for exact local lookup and refreshes checked-in readiness/quality manifests. `registry/ingestion_contract.json` records BGE-small (384 normalized dimensions), dotproduct, domain namespaces, BM25, 350/450-token limits and 50-token overlap for future implementation. Complete source content must remain local even when index text is shorter.

**No Pinecone upload was performed and no embedding vectors or BM25 parameters were generated.** The data handoff is ready for implementation of the compliant chunking/embedding/upload pipeline. The old code is intentionally inactive. An API key can be added later through `.env`; it is not needed for the current offline audit.
