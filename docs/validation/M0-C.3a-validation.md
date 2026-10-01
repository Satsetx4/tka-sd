# M0-C.3a Validation — Taxonomy Schema

- **Verified:** 2026-10-01 (Asia/Bangkok)
- **Repository:** `Satsetx4/tka-sd`
- **Origin:** `https://github.com/Satsetx4/tka-sd.git`
- **Branch:** `feat/m0-c3a-taxonomy-schema`
- **Base SHA:** `4b32de8f6fd7a037dea4d7d740ff330a053b777e`
- **Neon project:** `tka-sd` (`raspy-hall-60772153`)
- **Neon branch:** `development` (`br-young-salad-az1y9mni`)

## Safe local sync

The local checkout was verified as `D:\!AGY\tka-sd` with `origin` pointing to `Satsetx4/tka-sd`. Before sync, the active branch was `chore/m0-c1-primitives`; there were no tracked modifications. Three untracked paths were present and preserved throughout the work: `.m0a-validation/`, `CLAUDE.md`, and `docs/adr/`.

`git fetch --all --prune` showed that actual `origin/main` was `4b32de8f6fd7a037dea4d7d740ff330a053b777e` (`feat(m0-c2): add identity schema migration`), two commits ahead of local `main`. Local `main` was fast-forwarded from `0492bb41ddc23c50e8626d5693a0928fc3a44302`; it then matched `origin/main`. The feature branch was created from that synced commit. No reset, force checkout, force push, or destructive local cleanup was used.

## Scope and schema

Generated migration: `pnpm db:generate --name=taxonomy` → `drizzle/0002_taxonomy.sql`.

The migration creates exactly these six public tables. UUID primary keys are caller-supplied, consistent with the existing migrations. Fields and nullability follow the Implementation Specification and ERD; only `subjects` has `created_at` and `updated_at`, because those are the only taxonomy timestamps listed in the source field definitions. Timestamp columns are `timestamptz NOT NULL DEFAULT now()`. Codes, names, slugs, sort orders, and active flags are `NOT NULL`; descriptions are nullable except `indicators.description`, which is `NOT NULL`.

| Table | Columns |
|---|---|
| `subjects` | `id uuid`; `code text`; `name text`; `slug text`; `sort_order integer`; `is_active boolean`; `created_at timestamptz NOT NULL DEFAULT now()`; `updated_at timestamptz NOT NULL DEFAULT now()` |
| `domains` | `id uuid`; `subject_id uuid`; `code text`; `name text`; `slug text`; `description text NULL`; `sort_order integer`; `is_active boolean` |
| `topics` | `id uuid`; `domain_id uuid`; `parent_topic_id uuid NULL`; `code text`; `name text`; `slug text`; `description text NULL`; `sort_order integer`; `is_active boolean` |
| `competencies` | `id uuid`; `subject_id uuid`; `code text`; `name text`; `description text NULL`; `sort_order integer`; `is_active boolean` |
| `indicators` | `id uuid`; `subject_id uuid`; `topic_id uuid NULL`; `competency_id uuid`; `code text`; `description text`; `official_reference text NULL`; `sort_order integer`; `is_active boolean` |
| `tags` | `id uuid`; `name text`; `slug text` |

| Table | Primary and unique constraints | Foreign keys |
|---|---|---|
| `subjects` | `id` PK; `code` unique; `slug` unique | — |
| `domains` | `id` PK; `code` unique; unique `(subject_id, slug)` | `subject_id → subjects.id` |
| `topics` | `id` PK; `code` unique; unique `(domain_id, parent_topic_id, slug)` with `NULLS NOT DISTINCT` | `domain_id → domains.id`; nullable `parent_topic_id → topics.id` |
| `competencies` | `id` PK; `code` unique | `subject_id → subjects.id` |
| `indicators` | `id` PK; `code` unique | `subject_id → subjects.id`; nullable `topic_id → topics.id`; `competency_id → competencies.id` |
| `tags` | `id` PK; `slug` unique | — |

Foreign keys use PostgreSQL's default `ON DELETE NO ACTION`; no cascade or cross-subject semantic constraint was added. The six primary keys and nine unique constraints create their own unique B-tree indexes (15 total). No separate non-unique or duplicate indexes were added.

### Root-topic slug uniqueness

The topic key is a single PostgreSQL unique constraint:

```sql
UNIQUE NULLS NOT DISTINCT (domain_id, parent_topic_id, slug)
```

PostgreSQL normally treats `NULL` values as distinct for uniqueness. `NULLS NOT DISTINCT` treats all `NULL` parent values as equal, so a domain cannot contain two root topics with the same slug. It also scopes child-topic slug uniqueness to the same domain and parent. This native strategy avoids a sentinel UUID, expression index, or extra reserved-ID invariant. The target Neon server reports PostgreSQL `18.6`; Drizzle emits the clause from the schema definition. [PostgreSQL 18 `CREATE TABLE` documentation](https://www.postgresql.org/docs/18/sql-createtable.html).

## Migration and database verification

The existing `.env.local` connection was verified against the Neon `development` branch. It contains a pooled URL; the migration invocation used the matching direct endpoint transiently in the process environment, without changing `.env.local`. Database reads and writes were scoped to project `tka-sd`, branch `development`, database `neondb`. The `production` branch is the Neon default/primary branch and was not used.

| Check | Result | Evidence |
|---|---|---|
| Pre-migration state | PASS | Ledger had `0000_extensions_and_primitives`, `0001_identity`; public app tables were only `users`, `child_profiles`, `parent_pins`. |
| SQL review | PASS | Migration contains six taxonomy tables, their primary/unique/FK constraints, and no unrelated DDL or seed statements. |
| First `pnpm db:migrate` | PASS | `0002_taxonomy` applied on `development`. |
| Second `pnpm db:migrate` | PASS / no-op | Command succeeded; read-only ledger remained exactly three ordered entries with the same hashes. |
| Migration ledger | PASS | Ordered entries: `0000_extensions_and_primitives`, `0001_identity`, `0002_taxonomy`; `0002` hash `7d9b29f0d0990bffb0d75b14c1b1c62b3b693685d46f57063b67f1b61e5c3148`. |
| Public application tables | PASS | Exactly the three identity and six taxonomy tables. No lesson, media, stimulus, question, practice, tryout, analytics, or commerce tables. Existing provider-managed `neon_auth` objects were not modified. |
| Taxonomy seed rows | PASS | All six taxonomy tables contain zero rows after acceptance testing. No taxonomy seed/import logic was added. |
| Production | PASS | No production connection or write was used. |

## Integrity acceptance tests

Temporary rows were inserted and removed inside a single development transaction. Expected unique/FK errors were caught and asserted; the transaction reported `PASS` for each case, including cleanup verification.

| Test | Result |
|---|---|
| Valid subject and domain | PASS |
| Duplicate subject code and slug rejected | PASS |
| Duplicate domain code rejected | PASS |
| Duplicate domain slug in one subject rejected; same slug in another subject allowed | PASS |
| Invalid domain subject FK rejected | PASS |
| Valid root topics; same root slug in another domain allowed | PASS |
| Duplicate root slug in the same domain rejected | PASS |
| Valid child topic; duplicate slug for the same parent rejected | PASS |
| Same child slug under a different parent allowed | PASS |
| Invalid topic domain and parent FKs rejected | PASS |
| Valid competency; duplicate code rejected | PASS |
| Invalid competency subject FK rejected | PASS |
| Indicator with `topic_id = NULL` accepted | PASS |
| Duplicate indicator code rejected | PASS |
| Invalid indicator subject, topic, and competency FKs rejected | PASS |
| Valid tag; duplicate tag slug rejected | PASS |
| Temporary test rows after cleanup | `0` |

## Clean-database reproducibility

A separate clean disposable Neon branch was not created. The persistent `development` branch was not reset or dropped. The prior M0-C.2 record documents the application-clean `0000`/`0001` baseline; this checkpoint verified the `0001` → `0002` upgrade and second-run no-op on `development`. A fresh `0000` → `0001` → `0002` replay remains unverified for this checkpoint.

## Repository validation

| Command | Result |
|---|---|
| `pnpm install` | PASS — already up to date |
| `pnpm db:generate --name=taxonomy` | PASS |
| First `pnpm db:migrate` on development | PASS |
| Second `pnpm db:migrate` on development | PASS / no-op |
| `pnpm lint` | PASS |
| `pnpm typecheck` | PASS |
| `pnpm build` | PASS — Next.js 16.3.7 production build completed |
| `git diff --check` | PASS — no whitespace errors |

## Baseline integrity, secrets, and scope

- `drizzle/0000_extensions_and_primitives.sql` SHA-256 remains `D8F4C4A17A7BD5AE25934EE54A0AE5AD73AE3965D640A64BB798F0FEE0ACEFF9`.
- `drizzle/0001_identity.sql` SHA-256 remains `F5D2B70CBD884C769BED73611C0E440C1732F5D8AFDB26ED09238C402FF8C421`.
- Both migration Git blob IDs match the synced base commit.
- Changed scope is limited to the taxonomy schema/export, generated `0002` migration and metadata, and this validation record. No source-of-truth document or seed JSON was edited.
- No credential was printed or added to tracked files. `.env.local` remains local/ignored; migration used only the verified development endpoint. No production write, manual production DDL, taxonomy seed, later migration, auth integration, UI, or application feature was added.
- Original untracked local paths `.m0a-validation/`, `CLAUDE.md`, and `docs/adr/` remain preserved and are not part of this checkpoint's changes.
