# M0-C.3b Validation — Taxonomy Seed Infrastructure

- **Verified:** 2026-10-01 21:55 (Asia/Bangkok)
- **Repository:** `Satsetx4/tka-sd`
- **Branch:** `feat/m0-c3b-taxonomy-seed`
- **Base SHA:** `9cef3e069633c1fd9361ff3464bd9c6db292e618`
- **Neon project:** `tka-sd`
- **Neon branch:** `development`
- **Runtime:** Windows 10 Pro, build 19045; Node.js `v24.19.0`; pnpm `11.19.0`

## Authority and source review

Reviewed the requested authority documents:

- `docs/README.md`
- `docs/blueprint/TKA_SD_Blueprint_Source_of_Truth_v1.0.md`
- `docs/implementation/00_Implementation_Specification_V1.0.md`
- `docs/implementation/01_TKA_Taxonomy_Seed_V1.0.md`
- `docs/implementation/01_taxonomy_seed_v1.json`
- `docs/implementation/02_Database_ERD_and_Schema_V1.0.md`
- `docs/implementation/03_Database_Migration_Plan_V1.0.md`
- `docs/implementation/04_M0_Foundation_Backlog_V1.0.md`
- `docs/validation/M0-C.3a-validation.md`

The machine-readable seed is the input for import. Its records agree with the
Markdown seed on codes, hierarchy, names, and slugs. One description differs
slightly: `BIN_IN_MAIN` ends with “nilai dalam teks” in Markdown and “nilai-nilai
dalam teks” in JSON. This is a wording variation without a code, hierarchy, or
schema difference; the seeder preserves the exact JSON description.

The seed contains no tag records. The top-level `enums` values are not tag
records and are not imported into `tags`.

## Seeder architecture and safety

`scripts/seed/taxonomy-input.ts` validates the complete version 1.0 JSON shape
with strict Zod schemas before a database connection is opened. It rejects
unknown fields, malformed records, duplicate codes/slugs, unresolved topic
parents, cycles, and indicator references to absent same-subject competencies.
The mapping is deterministic and is covered by focused Node tests.

`scripts/seed/taxonomy.ts` is a server-only maintenance script. It uses the
existing `parseServerEnv` validator and taxonomy table definitions. It loads the
existing ignored `.env.local` without changing it, then fails closed unless the
database URL matches the endpoint verified for Neon project `tka-sd`, branch
`development`, and database `neondb`. This endpoint guard prevents the script
from writing to the production endpoint.

The script uses `@neondatabase/serverless` with Drizzle's PostgreSQL pool
driver, because the application's Neon HTTP driver does not support
transactions. Upserts, read-back checks, foreign-key checks, duplicate checks,
table-count checks, and non-taxonomy checks run inside one database transaction.
An error before commit rolls back the seed changes.

Stable identity is each table's unique `code`: subject, domain, topic,
competency, and indicator rows upsert on that code. Parent IDs are resolved
from source parent codes. Newly inserted rows receive application-generated
UUIDs; conflict updates never replace IDs. Mutable values supplied by the seed
are synchronized, while absent descriptive fields are left alone on existing
rows. There are no delete, truncate, or reset operations.

Explicit mappings for fields absent from the source:

- New rows use `is_active = true`, reflecting inclusion in the approved seed;
  existing `is_active` values are preserved because the JSON does not provide
  that field.
- Indicator `sort_order` is derived from the JSON array order in increments of
  ten (`10` through `100`), preserving the ordered list because the database
  column is required and the seed omits a numeric value.
- Nullable descriptions, indicator `topic_id`, and `official_reference` are
  `NULL` for new rows when absent. Existing values are preserved on upsert when
  the source does not provide the field.

## Expected source counts

Derived directly from `docs/implementation/01_taxonomy_seed_v1.json`:

| Table | Expected rows |
|---|---:|
| subjects | 2 |
| domains | 4 |
| topics | 25 |
| competencies | 8 |
| indicators | 10 |
| tags | 0 |
| **Total** | **49** |

## Neon run results

The pre-seed development read showed all six taxonomy tables empty, identity
tables empty, and the nine M0-C.3a application tables present. The connection
host from `.env.local` matched the live `development` endpoint returned by
Neon's project inventory. No production database connection or write was used.

Each seed command read back row counts, every source code, provided fields,
relationships, table constraints, foreign keys, and identity/application table
state before committing.

| Check | Run 1 | Run 2 |
|---|---:|---:|
| Counts before (`subjects/domains/topics/competencies/indicators/tags`) | `0/0/0/0/0/0` | `2/4/25/8/10/0` |
| Counts after | `2/4/25/8/10/0` | `2/4/25/8/10/0` |
| Existing matching seed codes before run | `0` | `49` |
| Matching source-code rows after run | `49` | `49` |
| Stable code/ID pairs | `49` | `49` |
| Stable ID fingerprint (SHA-256) | `a4c506e89dab1f5c625adaa84b2778c05af2689695e250694001573f1e0a963f` | `a4c506e89dab1f5c625adaa84b2778c05af2689695e250694001573f1e0a963f` |
| Foreign-key and duplicate checks | PASS | PASS |
| Non-taxonomy table list and identity row counts | UNCHANGED | UNCHANGED |

Run 1 inserted exactly 49 rows. Run 2 inserted none and made no logical field or
count changes. The identical fingerprint confirms all 49 stable codes retained
the same IDs. A separate read-only Neon query after run 2 independently
confirmed counts `2/4/25/8/10/0`, identity counts `0/0/0`, the same nine public
application tables, and zero unresolved domain, topic/parent, competency, or
indicator foreign keys.

Coverage read-back confirmed exactly one database row for every seed code. It
compared names, slugs, hierarchy and supplied sort orders for subjects, domains,
topics, and competencies, plus indicator descriptions and competency links.
Indicator sort order matched the documented JSON-order mapping. The database
unique constraints and explicit duplicate checks reported zero duplicate code
or slug hierarchy groups. No non-taxonomy table or row was created.

## Repository validation

| Command | Result |
|---|---|
| `pnpm install` | PASS — already up to date |
| `pnpm lint` | PASS |
| `pnpm typecheck` | PASS |
| `pnpm build` | PASS — Next.js 16.3.7 production build completed |
| `pnpm test:seed:taxonomy` | PASS — 4 focused tests |
| `pnpm db:seed:taxonomy` run 1 | PASS — development only |
| `pnpm db:seed:taxonomy` run 2 | PASS — no duplicate or logical count changes |
| `git diff --check` | PASS — no whitespace errors |

## Migration, secrets, and scope integrity

`drizzle/0000_extensions_and_primitives.sql`,
`drizzle/0001_identity.sql`, and `drizzle/0002_taxonomy.sql` are unchanged from
the base commit. Their SHA-256 values are:

- `0000_extensions_and_primitives.sql`: `D8F4C4A17A7BD5AE25934EE54A0AE5AD73AE3965D640A64BB798F0FEE0ACEFF9`
- `0001_identity.sql`: `F5D2B70CBD884C769BED73611C0E440C1732F5D8AFDB26ED09238C402FF8C421`
- `0002_taxonomy.sql`: `4847184A77F15C7D3196254B3A33BC0CD2EC8AA051571F41DE623656883C28A0`

No migration was created or run. `.env.local` was not modified or staged, no
credential was printed or committed, and all database writes were limited to
the verified `development` branch. No seed rows absent from the JSON were
deleted. No `0003` or later migration, non-taxonomy table, semantic taxonomy
review, or M1 feature was added.

The three pre-existing untracked local paths `.m0a-validation/`, `CLAUDE.md`,
and `docs/adr/` were preserved and excluded from this checkpoint.
