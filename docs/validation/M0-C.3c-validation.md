# M0-C.3c Validation — Taxonomy Semantic Validation

- **Verified:** 2026-10-01 22:51 (Asia/Bangkok)
- **Repository:** Satsetx4/tka-sd
- **Branch:** chore/m0-c3c-taxonomy-semantic-validation
- **Base SHA:** f83f6bdb4935bbe83348df5dd619544b6bec76fb
- **Neon project:** tka-sd (raspy-hall-60772153)
- **Neon branch:** development (br-young-salad-az1y9mni), database neondb
- **Runtime:** Windows 10 Pro 10.0.19045; Node.js v24.19.0; pnpm 11.19.0
- **Verdict:** PASS, with documented variations and a granular Matematika limitation; no blocker found.

## Safe repository sync

The checkout was verified as D:\!AGY\tka-sd with origin https://github.com/Satsetx4/tka-sd.git. After git fetch --prune origin, local main and origin/main both resolved to the base SHA above (0 ahead, 0 behind), with no tracked local changes. The checkpoint branch was created from that synchronized main. The pre-existing untracked paths .m0a-validation/, CLAUDE.md, and docs/adr/ were preserved and excluded.

## Scope and authority reviewed

This checkpoint compared:

- docs/README.md
- docs/blueprint/TKA_SD_Blueprint_Source_of_Truth_v1.0.md
- docs/implementation/00_Implementation_Specification_V1.0.md
- docs/implementation/01_TKA_Taxonomy_Seed_V1.0.md
- docs/implementation/01_taxonomy_seed_v1.json
- docs/implementation/02_Database_ERD_and_Schema_V1.0.md
- docs/implementation/03_Database_Migration_Plan_V1.0.md
- docs/implementation/04_M0_Foundation_Backlog_V1.0.md
- docs/validation/M0-C.3a-validation.md
- docs/validation/M0-C.3b-validation.md
- src/db/schema/enums.ts, src/db/schema/taxonomy.ts, scripts/seed/taxonomy-input.ts, scripts/seed/taxonomy.ts, and drizzle/0000_extensions_and_primitives.sql

The authority order in docs/README.md puts the approved Blueprint above the Implementation Specification; supporting taxonomy documents, migrations, and code cannot silently override them. The Blueprint and Implementation Specification agree on the two subjects, Matematika's three broad elements, and Bahasa Indonesia's reading/text and competency framing.

## A. Markdown-to-JSON comparison

All coded subject, domain, topic, competency, and indicator identities in the Markdown specification also occur in the JSON. Counts are 2 subjects, 4 domains, 25 topics, 8 competencies, and 10 indicators. Their listed subject, domain, topic, competency, and indicator order agrees between the two sources. Every coded topic has the same parent in both sources; there are no topic-parent or domain-group differences.

- Subjects: MAT / Matematika / matematika and BIN / Bahasa Indonesia / bahasa-indonesia match exactly. Markdown lists MAT before BIN; JSON does the same and supplies sort_order 10 and 20.
- Domains: codes, names, and listed order match. The Markdown explicitly gives Matematika sort values 10, 20, and 30 for Bilangan, Geometri dan Pengukuran, and Data; JSON matches them. BIN_READ / Membaca is the sole Bahasa Indonesia domain. JSON supplies its sort value as 10.
- Topics: all 25 codes, source-list order, and parent relationships match. JSON supplies topic slugs and numeric sort_order values; the Markdown does not specify topic slugs or numeric topic sort values. These are JSON implementation fields, not conflicting source values.
- Competencies: all 8 codes, names, and list order match.
- Indicators: all 10 codes, competency groupings, and list order match. Description wording differs only for BIN_IN_MAIN, recorded below.
- Enums: the Markdown and JSON seed list the same values in the same order for all 8 represented categories; JSON-to-0000 and live database results are listed in section F.
- Slugs: the Markdown explicitly specifies only the two subject slugs. It has no domain/topic slug values to compare. The JSON slugs are checked against the database below.
- Indicator numeric order: neither source assigns indicator sort_order. The JSON array supplies the order used by the implementation; the derived database order is documented in section C.

The exact display-label and description differences are:

| Code | Markdown | JSON | Classification |
|---|---|---|---|
| MAT_BIL_RAS_EQ | Pecahan senilai | Pecahan Senilai | DOCUMENTED VARIATION — capitalization |
| MAT_BIL_RAS_CMP | Membandingkan dan mengurutkan pecahan | Membandingkan dan Mengurutkan Pecahan | DOCUMENTED VARIATION — capitalization |
| MAT_BIL_RAS_FORM | Relasi pecahan, desimal, dan persen | Pecahan, Desimal, dan Persen | DOCUMENTED VARIATION; LIMITATION before content scaling — JSON omits “Relasi”; granular topic emphasis is not officially matrix-verified |
| MAT_BIL_OP_CACAH | Operasi bilangan cacah | Operasi Bilangan Cacah | DOCUMENTED VARIATION — capitalization |
| MAT_BIL_OP_PECAHAN | Operasi pecahan | Operasi Pecahan | DOCUMENTED VARIATION — capitalization |
| MAT_BIL_KPK_FPB | Kelipatan, faktor, KPK, dan FPB | Kelipatan, Faktor, KPK, dan FPB | DOCUMENTED VARIATION — capitalization |
| MAT_GEO_FLAT | Bangun datar | Bangun Datar | DOCUMENTED VARIATION — capitalization |
| MAT_GEO_SPATIAL | Konstruksi bangun ruang dan visualisasi spasial | Bangun Ruang dan Visualisasi Spasial | DOCUMENTED VARIATION; LIMITATION before content scaling — JSON omits “Konstruksi”; granular topic emphasis is not officially matrix-verified |
| MAT_MEASURE_ESTIMATE | Penaksiran ukuran | Penaksiran Ukuran | DOCUMENTED VARIATION — capitalization |
| BIN_IN_MAIN | Menyimpulkan ide pokok, gagasan pendukung, amanat, tokoh, peristiwa, dan/atau nilai dalam teks. | Menyimpulkan ide pokok, gagasan pendukung, amanat, tokoh, peristiwa, dan/atau nilai-nilai dalam teks. | DOCUMENTED VARIATION — generic singular versus plural; no competency or mapping change |

The taxonomy seed specification says codes are stable and display names may be corrected without changing a code; it also identifies the granular Matematika topics as internal product topics. Those rules support treating the label differences as recorded variations for this foundation checkpoint, not as a claim that every fine-grained learning objective is equivalent. No wording was silently changed. The JSON wording remains the database seed input.

The Markdown lists four un-coded items below MAT_DATA_PRESENT: gambar, piktogram, diagram batang, and tabel frekuensi. JSON contains only the coded MAT_DATA_PRESENT topic at that point. Because those four items have no stable code, slug, or explicit sort value in the source, this checkpoint treats them as descriptors beneath that topic rather than separate logical taxonomy rows. This is a DOCUMENTED VARIATION; whether any should become separately coded topics belongs to future content mapping. No records were invented or added.

The M0-C.3b report's broad statement that Markdown and JSON names agree is qualified by this direct comparison: codes, hierarchy, and order agree, but the exact label differences above are present. This report records them without editing either source or the earlier validation record.

## B. Matematika structure

The Implementation Specification's official high-level structure is preserved exactly:

| Domain code | Name | JSON order |
|---|---|---:|
| MAT_BIL | Bilangan | 10 |
| MAT_GEO | Geometri dan Pengukuran | 20 |
| MAT_DATA | Data | 30 |

All 18 coded Matematika topics map to the domain and parents in the seed hierarchy:

| Domain | Root topic(s) | Child topics |
|---|---|---|
| MAT_BIL | MAT_BIL_RAS | MAT_BIL_RAS_EQ, MAT_BIL_RAS_CMP, MAT_BIL_RAS_FORM, MAT_BIL_OP_CACAH, MAT_BIL_OP_PECAHAN, MAT_BIL_KPK_FPB |
| MAT_GEO | MAT_GEO_OBJ | MAT_GEO_FLAT, MAT_GEO_SPATIAL |
| MAT_GEO | MAT_GEO_MEASURE | MAT_MEASURE_LENGTH, MAT_MEASURE_WEIGHT, MAT_MEASURE_AREA, MAT_MEASURE_VOLUME, MAT_MEASURE_ESTIMATE |
| MAT_DATA | MAT_DATA_PRESENT, MAT_DATA_USE | none |

Mechanical comparison found no parent mismatch, no wrong-domain topic, and no cross-domain parent. Codes, slugs, and JSON ordering are internally consistent. The four un-coded Data descriptors and the two phrase variations are recorded in section A.

The project sources explicitly limit the claim for granular Matematika mapping: topic-level and per-indicator mapping must still be checked against the official assessment matrix before content is scaled. This checkpoint validates the seed's internal grouping and the approved high-level domains; it does not claim that every granular Matematika topic is officially verified. This is a LIMITATION, not a blocker for the taxonomy foundation.

## C. Bahasa Indonesia structure

Bahasa Indonesia uses one BIN_READ / Membaca domain. The JSON represents Teks Informasi and Teks Fiksi as internal learning topics, while text_type INFORMATION and FICTION remain stimulus attributes. The three official competency labels remain separate from those UX topics, as required by the seed specification.

All 10 indicator mappings agree with the Markdown competency groups and JSON competency_code:

| Competency | Indicator codes | Count |
|---|---|---:|
| BIN_TEXTUAL — Pemahaman Tekstual | BIN_TX_VOCAB, BIN_TX_OBJECT, BIN_TX_RESTRUCTURE, BIN_TX_EXPLICIT | 4 |
| BIN_INFER — Pemahaman Inferensial | BIN_IN_MAIN, BIN_IN_CHANGE, BIN_IN_EXPRESSION | 3 |
| BIN_EVAL — Evaluasi dan Apresiasi | BIN_EV_RELEVANCE, BIN_EV_CONSISTENCY, BIN_EV_EMOTION | 3 |

The BIN_IN_MAIN wording difference is non-material to its code, competency, and scope of the listed target; the JSON description is preserved exactly in Neon. The JSON does not assign indicators to internal topics, and the seeded indicator topic_id values are NULL. No topic mapping or recategorization was inferred.

## D. Derived implementation conventions

- is_active = true: the JSON has no is_active field, while the schema requires a value. The seeder sets true on insert for rows present in the approved V1 seed and preserves an existing row's value on conflict. All 49 current seed rows are true. This is accepted and recorded as the V1 convention: membership in the initial approved seed creates an active row. It is not represented as a JSON-specified property.
- Indicator sort_order: the JSON has no indicator sort_order. The seeder derives 10, 20, …, 100 from the JSON array index, preserving the approved list order. Neon read-back confirms these values. This is accepted and recorded as the V1 convention; the values express display order, not competency weight or official priority.
- No semantic validator command was added. The existing input parser and focused tests were reviewed; source comparison and database checks for this checkpoint used direct read-only inspection.

## E. Neon JSON-to-database read-back

The project and branch were resolved from live Neon inventory before querying. Every database operation in this checkpoint was a SELECT against project tka-sd, branch development, database neondb. No seed command or database write ran.

| Table | JSON expected | Neon rows | Result |
|---|---:|---:|---|
| subjects | 2 | 2 | PASS |
| domains | 4 | 4 | PASS |
| topics | 25 | 25 | PASS |
| competencies | 8 | 8 | PASS |
| indicators | 10 | 10 | PASS |
| tags | 0 | 0 | PASS |
| Total seeded logical records | 49 | 49 | PASS |

A code-keyed read-back compared all 49 records, with zero missing or extra rows. Values matched the JSON for code, name, supplied slug, supplied sort_order, parent/domain/subject relationships, competency mapping, and indicator descriptions. Indicator sort_order and is_active were checked against the derived conventions above. Every indicator's competency belongs to the same subject. Indicator topic_id is NULL where the source omits a topic assignment.

Read-only integrity checks reported zero for each condition:

- missing domain-to-subject, topic-to-domain, topic-parent, competency-to-subject, or indicator foreign keys;
- cross-domain topic parent;
- indicator subject/competency mismatch;
- duplicate logical codes;
- duplicate subject slugs, domain slugs within subject, topic hierarchy slugs, or tag slugs.

The public identity tables users, child_profiles, and parent_pins each remain at 0 rows. No taxonomy rows exist outside the intended coded seed set, and tags remain empty because the source defines no tag records.

## F. Enum consistency

All 8 JSON enum arrays match the values and order in drizzle/0000_extensions_and_primitives.sql, src/db/schema/enums.ts, and the live development database:

| Enum | Values |
|---|---|
| cognitive_level | UNDERSTAND, APPLY, REASON |
| difficulty | EASY, MEDIUM, HARD |
| question_type | SINGLE_CHOICE, MULTI_SELECT, CATEGORY |
| usage_type | PRACTICE, ASSESSMENT, BOTH |
| content_status | DRAFT, IN_REVIEW, VERIFIED, PUBLISHED, ARCHIVED |
| source_type | OFFICIAL_REFERENCE, THIRD_PARTY_REFERENCE, ORIGINAL, REGENERATED |
| stimulus_type | TEXT, IMAGE, TABLE, GRAPH, MIXED |
| text_type | INFORMATION, FICTION |

Result: PASS — exact matches for all enum categories represented in the JSON. No enum type was changed.

## G. Repository gates

| Gate | Result |
|---|---|
| pnpm install | PASS — already up to date |
| pnpm lint | PASS |
| pnpm typecheck | PASS |
| pnpm build | PASS — Next.js 16.3.7 production build |
| pnpm test:seed:taxonomy | PASS — 4/4 tests |
| git diff --check | PASS — clean; staged report also checked with git diff --cached --check |

## H. Scope and integrity

- Only this validation record is intended to change in the repository.
- drizzle/0000_extensions_and_primitives.sql, drizzle/0001_identity.sql, drizzle/0002_taxonomy.sql, the seed Markdown, and seed JSON are unchanged from base SHA f83f6bdb4935bbe83348df5dd619544b6bec76fb.
- Neon development rows were inspected read-only and were not changed. Production was not queried or touched.
- No migration, seed row, taxonomy source, content, or application feature was created or changed. No 0003 or later migration was started.
- The checkpoint stops at M0-C.3c pending user audit before any later phase.
- The pre-existing untracked local paths .m0a-validation/, CLAUDE.md, and docs/adr/ remain preserved and are not part of the commit.
