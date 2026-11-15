<!-- Collection evidence, validation outcome, access gaps, and remaining career work. -->
# Career collection and validation report

Collection checked November 14, 2026 (America/Los_Angeles); primary academic year 2026-2027. This is a point-in-time public-source collection, not a claim of live availability.

## Delivered

| Item | Count | Notes |
|---|---:|---|
| Research lab profiles | 19 | Required lab leads covered; ISI MS intake is a separate resource |
| Opportunities and events | 7 | Four unverified announcements, one closed internship cycle, one active employer requisition, one upcoming workshop |
| Resource/policy records | 40 | 38 verified, 2 draft; includes 5 exact numeric policy records |
| Career guides | 13 | Campus work, SSN, CPT/OPT, advising, preparation, networking, outreach |
| Dataset files | 79 | One ingestion unit per file |
| Source publishers/leads registered | 50 | Includes inaccessible investigation leads, not 50 verified sites |
| Source-access observations | 23 | Public limitations, failed endpoints, gated services |
| Golden queries | 28 | Semantic, exact, filter, and unsupported/private negatives |
| Indexed local records | 64 | Drafts excluded |
| Prepared retrieval entries | 119 | Records, heading passages, and outlines; not embedded vectors |

## Source findings and corrections

- TEPPIT's August 18 announcement states $22/hour for a student worker. ICAROS's August 3 announcement does not state pay. The reference report confused them; no ICAROS pay was imported. Both application forms were inaccessible, so neither announcement is marked currently open. [TEPPIT](https://www.cs.usc.edu/newsletter/ms-phd-open-gra-position-with-teppit-project/), [ICAROS](https://www.cs.usc.edu/newsletter/ug-ms-icaros-lab-research-assistant-positions/).
- Allegro, INK, JAUNTS, MELADY, RESL, and QED offer interest/intake routes. These do not prove funded MS jobs. DILL explicitly reports no recruitment; CAIS reports no center vacancies. iLab's old application guidance remains historical in its profile.
- Libraries now directs all student hiring to Handshake; older library-specific application advice was not reused. [USC Libraries](https://libraries.usc.edu/jobs/library-jobs-students).
- ICT's 2026 application is explicitly closed, and its January 12 deadline has passed despite an older contradictory sentence saying open. It is retained under academic year 2025-2026, not indexed as a current-cycle vacancy. [ICT](https://ict.usc.edu/careers/internships/).
- The original Amazon ML/automated-reasoning SDE internship requisition displayed Apply now. Annual source-stated pay by location is preserved as annual figures; no hourly conversion was invented. Sponsorship remains unverified. [Employer requisition](https://amazon.jobs/en/jobs/10593521/software-development-engineer-intern-machine-learning-automated-reasoning-summer-2027).
- OIS and Employee Gateway use different summer-work wording. The guide preserves the distinction and routes individual payroll/enrollment questions to USC. SSA does not require an SSN before authorized work starts, while USC's SSN page uses stricter start-work language; the guide flags that difference rather than treating SSN issuance as work authorization.

Both supplied PDFs were used only to discover leads. Their schema proposals, unverifiable claims, inferred pay, and personal application-status notes were not imported. No private alumni information, real student records, credentials, resumes, or portal exports were collected. Public recruitment contacts are included only when published for that purpose. No messages or applications were sent.

## Validation actually run

The repository initially contained only documentation, with no validator, schemas, registry, or chunk builder. This change adds a minimal offline implementation in the prescribed directories. It does not redesign the backend or implement remote indexing.

Ran schema export, full corpus validation, and `build_chunks.py --as-of 2026-11-14`. All 79 source files passed metadata/schema/provenance/date checks. IDs and record title/source pairs are unique; lab and golden-query references resolve. Maximum prepared text length was 178 BGE tokens, below the 450 cap. No duplicate chunk hashes were found. Two draft resource records were excluded.

Ran realistic exact lookups: `teppit_student_worker_fall_2026` returned source-stated hourly pay 22, semester hours 20, and availability `unverified`, with citation and verification date; `ict_summer_research_2026` returned `expired: true` and effective status `closed`. Expired opportunity checks prevent past-deadline or ended-event records from being treated as available. Generated files and the machine-readable validation report are in ignored `processed/`.

No unit tests, syntax-only checks, or CI workflows were added. No external embedding or retrieval-quality measurement was performed. TASKS.md was neither read nor edited, per the user request.

## Inaccessible and private resources

The full URL-by-URL list is [source_checks.json](registry/source_checks.json). Tool fetch failures are not labeled confirmed dead links; no HTTP failure was used to infer a vacancy's closure.

| Resource | What remains inaccessible | Safe next input/action |
|---|---|---|
| Handshake | Current listings, employer details, personalized filters; public overview rate-limited | Authorized, non-sensitive job descriptions or public requisition links; never credentials |
| Trojan Network | Alumni profiles, conversations, mentor availability | User describes the help topic; retain no private profile/contact export |
| Trojan International / Workday | Individual employment authorization, SSN requests, payroll | Student uses official systems; do not add personal records to this public corpus |
| TEPPIT / ICAROS / Allegro / JAUNTS forms | Response-acceptance state and current project availability | Recheck public form state or obtain non-sensitive confirmation from the lab |
| ISI MS pages | Both studentjobs and canonical MS endpoint timed out | Recheck public position list; current overview is retained |
| ViterbiLink | Legacy endpoint unavailable | Confirm current access with VCC; use verified Trojan Network guidance |
| HaRVI / Prasanna / Oded Stein | Join/project pages failed | Recheck originals before importing shortlist eligibility or prerequisites |
| ITS / Transportation / Athletics | Candidate job endpoints inaccessible; current student openings not verified | Discover fresh departmental links or inspect authorized Handshake postings |
| University Events | Linked page rendered only a shell | Career Center's Handshake route retained; vacancy details still missing |
| NSF GRIP | Current program/cycle not verified | Do not substitute GRFP as an internship; verify an original call |

## Remaining work and maintenance

No complete strict `job_listings` record was available with all required pay, hours, deadline, and application attributes. Partial announcements are in `opportunities`, and departmental hiring routes are resources. Faculty profiles without recruitment evidence say `no_opening_verified`; they do not imply the lab refuses inquiries. The collection does not establish every opening at USC, all platform functionality, all research-shortlist leads, or a live employer feed.

Collector recommendations: recheck vacancies/forms weekly and before recommending an application; recheck standing lab intake monthly; recheck policy pages before action and at least monthly; recheck service instructions each term. These intervals are recommendations, not automated jobs or USC rules. Preserve old-year files, bump same-year correction versions, record the actual recheck date, and rerun validation/chunk preparation. Immigration and payroll guidance remains subject to official case-specific confirmation.

Future shared pipeline work: automatic oversized-section splitting, incremental rebuild/cache, dense BGE embeddings, BM25 fitting, Pinecone publishing with durable deletion state, authenticated query routing, and measured recall@5/MRR. The current collection and exact-record index can be consumed locally now.
