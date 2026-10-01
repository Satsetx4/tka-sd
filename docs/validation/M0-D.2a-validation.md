# M0-D.2a Validation — Question Schema

- **Verified:** 2026-10-02 00:04 (Asia/Bangkok)
- **Repository:** `Satsetx4/tka-sd` (`D:\!AGY\tka-sd`)
- **Origin:** `https://github.com/Satsetx4/tka-sd.git`
- **Base SHA:** `781d8bbf31656c38fbbc48ecebef15328026ae8d`
- **Feature branch:** `feat/m0-d2a-questions-schema`
- **Runtime:** Microsoft Windows 10 Pro `10.0.19045`; Node.js `v24.19.0`; pnpm `11.19.0`
- **Neon target:** project `tka-sd`, branch `development` (`br-young-salad-az1y9mni`), database `neondb`
- **Scope verdict:** PASS for the schema-only M0-D.2a checkpoint. No question engine, evaluator, API, CMS, practice, tryout, or later migration was added.

## Safe repository sync

The checkout root and remote were verified as `D:\!AGY\tka-sd` and `https://github.com/Satsetx4/tka-sd.git`. Before changes, `git status` showed no tracked edits and these pre-existing untracked paths: `.m0a-validation/`, `CLAUDE.md`, and `docs/adr/`. They were preserved and excluded from this checkpoint.

After `git fetch --all --prune`, local `main` and `origin/main` both resolved to `781d8bbf31656c38fbbc48ecebef15328026ae8d`; no fast-forward was needed. The feature branch was created from that base. No reset, destructive checkout/cleanup, force push, or unrelated repository operation was used.

## Authority, scope, and documentation debt

Reviewed `docs/README.md`, the Blueprint, Implementation Specification, ERD/schema, migration plan, M0 foundation backlog, M0-C.3c validation, and M0-D.1 validation. The Blueprint remains the product authority; the Implementation Specification and ERD provide the engineering baseline. Existing enum values and taxonomy references were reused.

The repository `AGENTS.md` still contains an M0-A-only checkpoint boundary. This explicit M0-D.2a request authorizes this checkpoint. The stale wording is non-blocking documentation debt and was not changed.

Exactly six new public tables are in `0004_questions`: `questions`, `question_options`, `category_statements`, `category_choices`, `category_answers`, and `question_tags`. Existing `tags` is referenced as-is. No tag seed was added.

## Columns and reconciliation decisions

All primary keys use caller-supplied UUIDs, matching the established migrations; no UUID default was added. Explicit nullable fields remain nullable. Question `version` is required, has no default, and has no positivity CHECK. Required fields with no source-defined default remain without one. `created_at` and `updated_at` are `timestamptz NOT NULL DEFAULT now()` following the database baseline.

`!` means `NOT NULL`; `?` means nullable. PostgreSQL column catalog inspection confirmed these definitions:

| Table | Columns |
|---|---|
| `questions` | `id uuid!`, `code text!`, `subject_id uuid!`, `domain_id uuid!`, `topic_id uuid!`, `primary_competency_id uuid!`, `primary_indicator_id uuid?`, `stimulus_id uuid?`, `question_type question_type!`, `cognitive_level cognitive_level!`, `difficulty difficulty!`, `usage_type usage_type!`, `question_body_json jsonb!`, `explanation_body_json jsonb!`, `status content_status!`, `version integer!`, `source_type source_type!`, `source_reference text?`, `created_by uuid!`, `reviewed_by uuid?`, `verified_by uuid?`, `created_at timestamptz! DEFAULT now()`, `updated_at timestamptz! DEFAULT now()`, `published_at timestamptz?`, `archived_at timestamptz?` |
| `question_options` | `id uuid!`, `question_id uuid!`, `option_key text!`, `body_json jsonb!`, `is_correct boolean!`, `sort_order integer!` |
| `category_statements` | `id uuid!`, `question_id uuid!`, `statement_body_json jsonb!`, `sort_order integer!` |
| `category_choices` | `id uuid!`, `question_id uuid!`, `code text!`, `label text!`, `sort_order integer!` |
| `category_answers` | `statement_id uuid!`, `category_choice_id uuid!` |
| `question_tags` | `question_id uuid!`, `tag_id uuid!` |

### Keys, foreign keys, and indexes

- Primary keys: `questions(id)`; `question_options(id)`; `category_statements(id)`; `category_choices(id)`; `category_answers(statement_id, category_choice_id)`; `question_tags(question_id, tag_id)`.
- Unique constraints: `questions(code)`; `question_options(question_id, option_key)` and `(question_id, sort_order)`; `category_statements(question_id, sort_order)`; `category_choices(question_id, code)`.
- Foreign keys: `questions.subject_id → subjects.id`; `domain_id → domains.id`; `topic_id → topics.id`; `primary_competency_id → competencies.id`; nullable `primary_indicator_id → indicators.id`; nullable `stimulus_id → stimuli.id`; `created_by`, nullable `reviewed_by`, and nullable `verified_by → users.id`. Each child table has its `question_id → questions.id` FK. `category_answers.statement_id → category_statements.id`, `category_choice_id → category_choices.id`; `question_tags.tag_id → tags.id`.
- FKs use PostgreSQL's default `NO ACTION`; no cascade or cross-taxonomy trigger was added.
- Required question indexes: `questions_subject_id_topic_id_status_idx(subject_id, topic_id, status)`; `questions_status_usage_type_idx(status, usage_type)`; `questions_primary_competency_id_status_idx(primary_competency_id, status)`; `questions_stimulus_id_idx(stimulus_id)`.
- Catalog inspection found 15 indexes across these tables: the six PK indexes, five unique-constraint indexes, and exactly these four question indexes. No additional or redundant index was added; no extra category-choice sort-order uniqueness exists.

## Three question-type representations

| Type | Neon development representation | Result / boundary |
|---|---|---|
| `SINGLE_CHOICE` | One question with multiple options and one `is_correct = true` | PASS; this schema does not enforce exactly one correct option. |
| `MULTI_SELECT` | One question with two correct options | PASS; this schema does not enforce a minimum number of correct options. |
| `CATEGORY` | Statements, choices, and answer pairs | PASS; only the declared FKs and composite pair PK are enforced. |

## Neon migration and catalog verification

Before migration, the development database contained the M0-D.1 tables and no question tables. The migration ledger had exactly the ordered `0000`–`0003` entries. Baseline row counts were: identity `users/child_profiles/parent_pins = 0/0/0`; taxonomy `subjects/domains/topics/competencies/indicators/tags = 2/4/25/8/10/0`; M0-D.1 `media_assets/stimuli/lessons/lesson_blocks/lesson_progress = 0/0/0/0/0`.

The local `.env.local` host matched the live compute for the named `development` branch and `neondb`. The stored URL used the pooled host, so each `pnpm db:migrate` invocation received a process-local direct-host URL for that same verified compute. `.env.local` was not changed, and no connection string or credential was printed or committed.

| Check | Result |
|---|---|
| Pre-state target check | PASS — project `tka-sd`, branch `development`, database `neondb`; question tables absent; `0000`–`0003` ledger present. |
| `pnpm db:generate --name=questions` | PASS — generated only `0004_questions.sql`, appended the journal entry, and created `0004_snapshot.json`. |
| Manual SQL review | PASS — exactly six new tables, declared keys/FKs/unique constraints, and four required indexes; no trigger, function, or check added. |
| First `pnpm db:migrate` | PASS — migration applied on development. |
| Second `pnpm db:migrate` | PASS — invocation succeeded; catalog and ledger after the repeat still contain one ordered `0000`–`0004` sequence. |
| Ledger | PASS — `0004` hash `4715177f8a7185081125d5b2157e251dcda55e6957354c7e43f770da58c62c34`; earlier four entries retained their existing hashes. |
| Read-only catalog review | PASS — all six tables' columns, types, nullability, defaults, keys, FKs, and indexes match this record. |
| Post-migration scope | PASS — no `0005` or later migration; no practice, tryout, analytics, or commerce application tables. Neon-managed `neon_auth` objects were not changed. |

The repeated `db:generate` invocation reported `No schema changes, nothing to migrate`. The repeat `db:migrate` left one `0004` ledger row and the expected catalog unchanged.

## Acceptance and integrity matrix

The main acceptance fixtures were created and removed in one Neon development transaction. That transaction asserted each expected rejection; any unexpectedly accepted invalid row would have failed it. A small follow-up transaction also inserted and removed a fully aligned BIN subject/domain/topic/competency/indicator/stimulus fixture.

| Area | Check | Result |
|---|---|---|
| Base question | Valid required taxonomy/editor refs, optional indicator and stimulus refs, all three user refs, timestamp defaults | PASS |
| Taxonomy coherence | Follow-up BIN question joins subject, domain, topic, competency, indicator, and stimulus consistently | PASS — inserted and removed in a separate transaction. |
| Base question | `question_body_json` and `explanation_body_json` JSONB equality after read-back | PASS |
| Unique/FK | Duplicate `questions.code` rejected | PASS |
| Question FKs | Invalid subject, domain, topic, primary competency, provided indicator, provided stimulus, created_by, reviewed_by, and verified_by refs rejected | PASS — all 9 cases |
| `SINGLE_CHOICE` | Multiple options and one marked correct accepted; duplicate option key and duplicate order rejected | PASS |
| `MULTI_SELECT` | Multiple correct options accepted; duplicate option key and duplicate order rejected | PASS |
| Option JSONB | Representative `body_json` compared equal after read-back | PASS |
| Category statements | Multiple statements accepted; duplicate `(question_id, sort_order)` rejected; statement JSONB read-back equal | PASS |
| Category choices | Duplicate `(question_id, code)` rejected; repeated sort order accepted, confirming no unrequested order uniqueness | PASS |
| Category answers | Valid answer pairs accepted; duplicate pair rejected by PK; invalid statement and choice FKs rejected | PASS |
| Category limitation | One statement accepted with multiple choices; statement accepted with a choice belonging to another question | PASS — proves neither semantic rule is DB-enforced in this checkpoint. |
| Question tags | Temporary tag relation accepted; duplicate pair and invalid question/tag FKs rejected | PASS |

JSONB was exercised for question body, explanation body, option body, and statement body using representative structured values. Comparisons use PostgreSQL `jsonb` equality; object key order is normalized by `jsonb`.

## Deferred domain and application invariants

- Published-question requirements remain deferred to **M0-D.2b — Question Domain Validation / Service Rules**: non-empty explanation, valid answer definition by type, and any semantic validation beyond the structural `NOT NULL` topic and competency fields.
- `category_answers` follows the ERD composite PK exactly. It does not enforce one choice per statement or that a statement and choice belong to the same question. These rules remain deferred to M0-D.2b unless the higher-authority source is updated.
- No type-conditional correct-option count, editorial transition, published-version immutability/copy, or revision-history rule is implemented.
- Question JSON is stored as `jsonb`; no final JSON schema CHECK, raw HTML field, renderer, or editor was added.

## Cleanup, taxonomy, and regression

After the acceptance transaction, read-only counts were:

| Table group | Counts |
|---|---|
| `questions`, `question_options`, `category_statements`, `category_choices`, `category_answers`, `question_tags` | `0 / 0 / 0 / 0 / 0 / 0` |
| Temporary `users`, `child_profiles`, `parent_pins` | `0 / 0 / 0` |
| `media_assets`, `stimuli`, `lessons`, `lesson_blocks`, `lesson_progress` | `0 / 0 / 0 / 0 / 0` — unchanged from pre-test baseline |
| `subjects`, `domains`, `topics`, `competencies`, `indicators`, `tags` | `2 / 4 / 25 / 8 / 10 / 0` — unchanged |

The temporary editorial user, stimulus, tag, questions, options, statements, choices, answer pairs, and tag relation were removed. No sample question or tag was seeded.

## Clean replay and repository gates

A separate empty-database replay was not run. This host has no `psql`, Docker command, or local PostgreSQL service available. The persistent Neon development database was not reset or dropped. The development upgrade and repeated migration invocation passed; a fresh empty-database replay remains unverified.

| Gate | Result |
|---|---|
| `pnpm install` | PASS — already up to date; pnpm `11.19.0`. |
| Migration generation and repeated generation | PASS — second generate reported no schema changes. |
| First and second `pnpm db:migrate` on Neon development | PASS — `0004` applied and repeat retained the same five-entry ledger. |
| `pnpm lint` | PASS |
| `pnpm typecheck` | PASS |
| `pnpm build` | PASS — Next.js `16.3.7` production build completed. |
| `pnpm test:seed:taxonomy` | PASS — 4/4 tests. |
| `git diff --check` | PASS — no whitespace errors; Git emitted only its LF-to-CRLF notice for the journal file. |

## Migration immutability and environment boundaries

`drizzle/0000_extensions_and_primitives.sql` through `drizzle/0003_media_stimuli_lessons.sql`, their historical snapshots, and both taxonomy seed source files are unchanged from base SHA `781d8bbf31656c38fbbc48ecebef15328026ae8d`. The journal change appends only `0004_questions`; only `0004_snapshot.json` is new. Existing `tags` schema and seed data were not changed.

Only Neon project `tka-sd`, branch `development`, database `neondb` was used for migration and temporary acceptance data. The verified compute matched that branch. No production branch or production connection was used, and production schema/data were not written.

## Stop boundary

This validation closes only M0-D.2a. No `0005_practice`, application behavior, or M0-D.2b work was started. Stop for audit before continuing.
