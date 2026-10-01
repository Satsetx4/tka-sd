# M0-D.3a Validation — Practice Schema & Persistence

- **Verified:** 2026-10-02 01:49 (Asia/Bangkok)
- **Repository:** `Satsetx4/tka-sd` (`D:\!AGY\tka-sd`)
- **Origin:** `https://github.com/Satsetx4/tka-sd.git`
- **Base SHA:** `de41c8bd38e6796375f09f82ac7db433fea00dcc`
- **Branch:** `feat/m0-d3a-practice-schema`
- **Runtime:** Microsoft Windows 10 Pro `10.0.19045`; Node.js `v24.19.0`; pnpm `11.19.0`
- **Neon target:** project `tka-sd` (`raspy-hall-60772153`), branch `development` (`br-young-salad-az1y9mni`), database `neondb`
- **Scope verdict:** PASS for schema/persistence-only M0-D.3a. No Practice service, selection, answer submission, analytics, API, UI, tryout, or later migration was added.

## Safe repository sync and preserved work

The checkout root and `origin` were verified as `D:\!AGY\tka-sd` and `https://github.com/Satsetx4/tka-sd.git`. The initial tracked working tree was clean. Existing untracked paths `.m0a-validation/`, `CLAUDE.md`, and `docs/adr/` were preserved and excluded from this checkpoint.

After `git fetch --all --prune`, `main` and `origin/main` both resolved to `de41c8bd38e6796375f09f82ac7db433fea00dcc`; the left/right commit count was `0/0`. `git merge --ff-only origin/main` reported `Already up to date`. The feature branch was created from this base. No reset, destructive checkout/cleanup, force operation, or unrelated repository operation was used.

## Authority and decisions

Reviewed `docs/README.md`, the Blueprint, Implementation Specification, ERD/schema, migration plan, M0-D.2a and M0-D.2b validation records, and `src/server/questions/domain.ts`. The Blueprint remains highest authority, followed by the Implementation Specification, ERD/schema, migration plan, committed migrations, and code. Existing `practice_session_status`, identity, taxonomy, and question schema were reused.

The sources identify required columns and nullability for the optional fields, but do not define defaults or checks for the session counters. This migration therefore adds no default or check for `question_target`, `questions_answered`, or `correct_count`; each remains a required `integer`. IDs, status, and timestamps also have no invented defaults. `practice_sessions` has no `updated_at`.

`response_time_ms` is nullable `integer` (PostgreSQL `int4`). The project already uses `integer` for counts and positions; its millisecond range is ample for practice response durations. No default or range check was added.

All foreign keys use PostgreSQL `NO ACTION` for delete and update. `score_fraction` is `numeric(5,4) NOT NULL` with the ERD-specified inclusive `0..1` check. `response_json` remains generic `jsonb`; no browser/API response shape or question-type-specific JSON check is defined here.

## Migration and schema

Added exactly `0005_practice` with exactly these three new tables:

| Table | Columns |
|---|---|
| `practice_sessions` | `id uuid PK`, `child_profile_id uuid NOT NULL`, `subject_id uuid NOT NULL`, `topic_id uuid NULL`, `status practice_session_status NOT NULL`, `question_target integer NOT NULL`, `questions_answered integer NOT NULL`, `correct_count integer NOT NULL`, `started_at timestamptz NOT NULL`, `completed_at timestamptz NULL`, `last_activity_at timestamptz NOT NULL` |
| `practice_session_items` | `practice_session_id uuid NOT NULL`, `question_id uuid NOT NULL`, `position integer NOT NULL` |
| `practice_answers` | `id uuid PK`, `practice_session_id uuid NOT NULL`, `question_id uuid NOT NULL`, `response_json jsonb NOT NULL`, `is_correct boolean NOT NULL`, `score_fraction numeric(5,4) NOT NULL`, `answered_at timestamptz NOT NULL`, `response_time_ms integer NULL` |

Keys, constraints, and indexes:

- `practice_sessions`: FKs to `child_profiles`, `subjects`, and nullable `topics`; required index `(child_profile_id, started_at DESC)`.
- `practice_session_items`: FKs to `practice_sessions` and `questions`; composite primary key `(practice_session_id, question_id)`; unique `(practice_session_id, position)`.
- `practice_answers`: FKs to `practice_sessions` and `questions`; unique `(practice_session_id, question_id)`; check `score_fraction >= 0 AND score_fraction <= 1`.
- Reuses enum values `ACTIVE`, `COMPLETED`, and `ABANDONED` without adding a status value.
- Catalog review confirmed all seven FKs have delete action `NO ACTION`, counters have no defaults/checks, and the required index sorts `started_at DESC`.
- Manual SQL review found exactly three `CREATE TABLE` statements, seven FKs, the declared primary/unique/check constraints, and the single required session index. There is no trigger, function, view, materialized view, cascade, lifecycle rule, additional active-session constraint, taxonomy-coherence trigger, question status/usage enforcement, question-version snapshot, or later-scope table.

## Generation and Neon migration

The local `.env.local` endpoint host matched the `development` endpoint in the `tka-sd` project; the target database resolved to `neondb`. The production branch is a different branch ID and was not used for SQL or migration commands.

Before migration, the development ledger contained exactly:

| ID | Migration | Hash |
|---:|---|---|
| 1 | `0000_extensions_and_primitives` | `495dc0ae6d459e370ac159b32153cc6b59f74ed15c951d010b8f798d86e77bb5` |
| 2 | `0001_identity` | `e28f1769af45541e2f9e2414ec21cefb0751d581c58892243c4f8c63ad9744d5` |
| 3 | `0002_taxonomy` | `7d9b29f0d0990bffb0d75b14c1b1c62b3b693685d46f57063b67f1b61e5c3148` |
| 4 | `0003_media_stimuli_lessons` | `26a8744b40cad70186e5f1c7d0743e29e564c99b45977f59fb24571055753f70` |
| 5 | `0004_questions` | `4715177f8a7185081125d5b2157e251dcda55e6957354c7e43f770da58c62c34` |

All three practice tables were absent before migration. First `pnpm db:migrate`: **PASS**, migrations applied successfully. Second `pnpm db:migrate`: **PASS**; the command succeeded and read-only inspection showed the ledger still has exactly the ordered `0000`–`0005` sequence, with no additional row. The new `0005_practice` ledger hash is `4ce7060486f2599f9da7a506cde1ede89be54acca43b61816a6e342f1a9c95ef`.

Catalog inspection confirmed the column types, nullability, defaults, seven foreign keys, keys, check, and indexes listed above. It found exactly three practice tables, zero practice triggers/functions/views/materialized views, and no tryout/analytics/commerce table. The second generation run reported `No schema changes, nothing to migrate`.

## Integrity acceptance matrix

All 23 assertions ran in one Neon development transaction using temporary parent/child/question fixtures. Invalid writes were caught inside exception-safe subtransactions. The fixtures were deleted before transaction commit.

| Area | Result |
|---|---|
| Valid sessions, nullable and valid topic, all three enum statuses, required child/start index | PASS |
| Invalid child, subject, and provided topic FKs | Rejected as expected |
| Multiple session items, duplicate `(session, question)`, duplicate `(session, position)`, invalid session/question FKs | PASS; duplicates and invalid FKs rejected |
| Read-back ordered by `position` | PASS; returned the expected question ID sequence |
| Generic JSONB response round-trip | PASS |
| One answer per `(session, question)` | PASS; duplicate rejected |
| Invalid answer session/question FKs | Rejected as expected |
| `score_fraction` 0, 1, and 0.5 | Accepted |
| `score_fraction` below 0 and above 1 | Rejected by the check |
| Nullable and non-null `response_time_ms` | PASS (`NULL` and `850`) |
| Snapshot limitation | PASS; an answer for a valid question absent from that session's items was accepted by the database |
| Temporary fixture cleanup before commit | PASS |

Post-cleanup read-only counts: `practice_sessions/practice_session_items/practice_answers = 0/0/0`; `users/child_profiles/parent_pins = 0/0/0`; all six question tables `questions/question_options/category_statements/category_choices/category_answers/question_tags = 0/0/0/0/0/0`; content tables `media_assets/stimuli/lessons/lesson_blocks/lesson_progress = 0/0/0/0/0`. Taxonomy stayed `subjects/domains/topics/competencies/indicators/tags = 2/4/25/8/10/0`, identical to pre-test counts.

The database does **not** enforce that `practice_answers.question_id` belongs to the same session's `practice_session_items` snapshot. The ERD defines independent FKs, so this remains a service/domain invariant for M0-D.3b.

## Deferred contract warning and stop boundary

M0-D.2b has a CATEGORY representation asymmetry: the student-safe pre-answer projection exposes category choice `code/label/order`, while the internal evaluator response uses `categoryChoiceId`. This migration keeps `response_json` generic and chooses neither UUID nor code as the public browser/API contract. M0-D.3b must resolve that contract before implementing answer submission.

No question-domain code was changed. Taxonomy source files were unchanged. Historical `0000`–`0004` SQL files and snapshots are unchanged: `git diff --exit-code` against the base SHA passed for each; the journal only appends entry 5 and only `0005_snapshot.json` was added. `AGENTS.md` retains stale M0-A-only wording; it was left unchanged as directed documentation debt.

No production SQL or migration was run. A clean `0000`–`0005` replay on a disposable database was not performed: no disposable branch/database was provided for this checkpoint. Persistent development was not reset or dropped; required development upgrade and repeat migration passed.

This validation closes only M0-D.3a. Stop for independent audit before M0-D.3b.

## Repository gates

| Gate | Result |
|---|---|
| `pnpm install --frozen-lockfile` | PASS — already up to date |
| `pnpm lint` | PASS |
| `pnpm typecheck` | PASS |
| `pnpm build` | PASS — Next.js optimized build completed |
| `pnpm test:seed:taxonomy` | PASS — 4/4 |
| `pnpm test:questions:domain` | PASS — 81/81 |
| `pnpm db:generate --name=practice` | PASS — generated `0005_practice` |
| repeat `pnpm db:generate --name=practice` | PASS — no schema changes |
| first `pnpm db:migrate` | PASS — development migration applied |
| second `pnpm db:migrate` | PASS — successful; ledger remained `0000`–`0005` |
| `git diff --check` | PASS |
