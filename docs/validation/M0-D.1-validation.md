# M0-D.1 Validation — Content Foundation Schema

- **Verified:** 2026-10-01 23:30 (Asia/Bangkok)
- **Repository:** `Satsetx4/tka-sd` (`D:\!AGY\tka-sd`)
- **Origin:** `https://github.com/Satsetx4/tka-sd.git`
- **Base SHA:** `f2ffe40cdd15a82ff0fe9ffd29c012efbd745c3b`
- **Feature branch:** `feat/m0-d1-media-stimuli-lessons`
- **Runtime:** Windows 10 Pro 10.0.19045; Node.js `v24.19.0`; pnpm `11.19.0`
- **Neon target:** project `tka-sd` (`raspy-hall-60772153`), branch `development` (`br-young-salad-az1y9mni`), database `neondb`
- **Verdict:** PASS for M0-D.1 schema, migration, development integrity, and repository gates. A full empty-database replay was not run; see below.

## Safe repository sync

The checkout root and remote were verified as `D:\!AGY\tka-sd` and `Satsetx4/tka-sd`. The active branch was `main`; `git status` showed no tracked changes and three pre-existing untracked paths: `.m0a-validation/`, `CLAUDE.md`, and `docs/adr/`. They were preserved and excluded. After `git fetch --all --prune`, `git merge --ff-only origin/main` reported up to date; local `main` and `origin/main` both equaled the base SHA above. The feature branch was created from that synchronized commit. No reset, force checkout, force push, or cleanup was used.

## Authority and scope

Reviewed `docs/README.md`, the Blueprint, Implementation Specification, ERD, migration plan, M0 backlog, and M0-C.3a/b/c validation records. The Blueprint remains the product authority; the Implementation Specification and ERD define the engineering baseline. The M0-C records confirm the existing enum, identity, taxonomy, and migration conventions.

The repository `AGENTS.md` still contains an earlier M0-A-only checkpoint boundary. This explicit M0-D.1 request authorizes the current checkpoint; its scope and safety boundaries were followed.

The generated `drizzle/0003_media_stimuli_lessons.sql` creates exactly:

- `media_assets`
- `stimuli`
- `lessons`
- `lesson_blocks`
- `lesson_progress`

No `questions`, `0004` migration, practice, tryout, analytics, commerce, application service, UI, or storage integration was added. JSONB stores structured values; no JSON shape CHECK was added. Media file bytes are not stored in the database.

## Columns and reconciliation decisions

All primary keys are caller-supplied UUIDs, matching migrations `0001` and `0002`. Timestamps use `timestamptz`. `created_at` and `updated_at` use `NOT NULL DEFAULT now()` where present, following the established database baseline. Explicit nullable fields remain nullable.

| Table | Columns (`!` = NOT NULL; `?` = nullable; `default` shown where present) |
|---|---|
| `media_assets` | `id uuid! PK`; `storage_key text! UNIQUE`; `mime_type text!`; `asset_type asset_type!`; `width integer?`; `height integer?`; `file_size bigint!`; `alt_text text!`; `caption text?`; `source_type source_type!`; `source_reference text?`; `created_by uuid!`; `created_at timestamptz! default now()` |
| `stimuli` | `id uuid! PK`; `subject_id uuid!`; `title text?`; `stimulus_type stimulus_type!`; `body_json jsonb!`; `text_type text_type?`; `source_type source_type!`; `source_reference text?`; `status content_status!`; `version integer! default 1`; `created_at timestamptz! default now()`; `updated_at timestamptz! default now()` |
| `lessons` | `id uuid! PK`; `code text! UNIQUE`; `subject_id uuid!`; `domain_id uuid!`; `topic_id uuid!`; `title text!`; `slug text!`; `summary text!`; `estimated_minutes smallint!`; `status content_status!`; `version integer!`; `is_free boolean! default false`; `created_by uuid!`; `reviewed_by uuid?`; `published_at timestamptz?`; `created_at timestamptz! default now()`; `updated_at timestamptz! default now()` |
| `lesson_blocks` | `id uuid! PK`; `lesson_id uuid!`; `block_type lesson_block_type!`; `content_json jsonb!`; `sort_order integer!` |
| `lesson_progress` | `id uuid! PK`; `child_profile_id uuid!`; `lesson_id uuid!`; `status lesson_progress_status!`; `started_at timestamptz!`; `completed_at timestamptz?`; `last_block_index integer!`; `updated_at timestamptz! default now()` |

Reconciliation for terse source definitions:

- Fields not marked nullable are required. For lessons this keeps taxonomy references and core editorial fields usable without implicit nullable holes. `reviewed_by`, `published_at`, and the media/stimulus fields explicitly marked nullable remain nullable.
- `media_assets.created_by` is required: the source field lists do not mark it nullable, while nullable fields are called out explicitly. The same source rule applies to lesson `created_by`.
- Lesson `status` and `version` are required but have no default; the sources define no defaults for them. No `version > 0` check was added for lessons because only stimuli documents that check.
- Progress `status`, `started_at`, and `last_block_index` are required with no default. The sources define no initial status, start-time, or block-index default. `last_block_index` is stored as an integer; no transition rule or nonnegative check was invented.
- `completed_at` is nullable. `updated_at` follows the baseline timestamp default. No semantic cross-taxonomy trigger or delete cascade was added; PostgreSQL's default `NO ACTION` applies to the new foreign keys.

## Constraints, foreign keys, and indexes

| Table | Constraints and indexes |
|---|---|
| `media_assets` | PK `id`; UNIQUE `storage_key`; CHECK `file_size >= 0`; FK `created_by → users.id` |
| `stimuli` | PK `id`; CHECK `version > 0`; FK `subject_id → subjects.id`; index `(subject_id, status)` |
| `lessons` | PK `id`; UNIQUE `code`; UNIQUE `(subject_id, slug)`; CHECK `estimated_minutes > 0`; FKs `subject_id → subjects.id`, `domain_id → domains.id`, `topic_id → topics.id`, `created_by → users.id`, nullable `reviewed_by → users.id` |
| `lesson_blocks` | PK `id`; UNIQUE `(lesson_id, sort_order)`; FK `lesson_id → lessons.id` |
| `lesson_progress` | PK `id`; UNIQUE `(child_profile_id, lesson_id)`; FKs `child_profile_id → child_profiles.id`, `lesson_id → lessons.id` |

The existing `asset_type`, `source_type`, `stimulus_type`, `text_type`, `content_status`, `lesson_block_type`, and `lesson_progress_status` enums are reused. No enum was recreated or changed.

## Migration and Neon development verification

Before migration, the development ledger contained `0000_extensions_and_primitives`, `0001_identity`, and `0002_taxonomy`, in order. The five target tables were absent. Taxonomy counts were `subjects=2`, `domains=4`, `topics=25`, `competencies=8`, `indicators=10`, `tags=0`.

The local `.env.local` URL hostname matched the pooled endpoint for the live Neon `development` branch and database `neondb`. Both `pnpm db:migrate` invocations used a process-local `DATABASE_URL` with the pooler suffix removed to target that branch's direct endpoint; `.env.local` was not changed and no connection string or credential was printed. The production branch was not used.

| Check | Result |
|---|---|
| `pnpm db:generate --name=media_stimuli_lessons` | PASS; generated only `0003_media_stimuli_lessons` and its snapshot/journal append |
| Manual SQL review | PASS; only the five tables, their specified constraints/FKs, and required index |
| First `pnpm db:migrate` | PASS; applied `0003` on development |
| Read-only ledger after first run | PASS; four ordered entries `0000`, `0001`, `0002`, `0003`; `0003` hash `26a8744b40cad70186e5f1c7d0743e29e564c99b45977f59fb24571055753f70` |
| Second `pnpm db:migrate` | PASS / no-op; ledger stayed at four entries |
| Read-only catalog review | PASS; columns, types, nullability, defaults, constraints, and indexes match this record |
| Prohibited tables | PASS; no question, practice, tryout, analytics, or commerce tables appeared |

The public application table list after migration contains the previous nine identity/taxonomy tables plus these five tables. Neon-managed objects outside `public` were not changed.

## Integrity acceptance matrix

All temporary records were tested in one Neon development transaction. Each negative case was wrapped to require the expected PostgreSQL constraint error; otherwise the test raised an exception and the transaction would fail.

| Area | Check | Result |
|---|---|---|
| Media | Valid asset; duplicate `storage_key` rejected; negative `file_size` rejected; nonexistent `created_by` rejected | PASS |
| Stimulus | Valid `TEXT` with representative paragraph/table/image JSON; JSONB read-back equals inserted value; nullable `text_type` round-trips as NULL | PASS |
| Stimulus | Invalid subject FK; version `0`; version `-1` | PASS — rejected |
| Lesson | Valid subject/domain/topic/editor references; `is_free` defaults to false | PASS |
| Lesson | Duplicate `code`; duplicate `(subject_id, slug)`; estimated minutes `0` and `-1` | PASS — rejected |
| Lesson | Invalid subject, domain, topic, `created_by`, and `reviewed_by` FKs | PASS — rejected |
| Lesson blocks | Valid JSON blocks with `INTRO` and `CONTENT`; duplicate `(lesson_id, sort_order)` and invalid lesson FK | PASS; invalid cases rejected |
| Lesson progress | Valid child/lesson record; nullable `completed_at` round-trips as NULL | PASS |
| Lesson progress | Duplicate `(child_profile_id, lesson_id)`; invalid child FK; invalid lesson FK | PASS — rejected |
| Cleanup | Temporary media, stimulus, lesson, blocks, progress, test user, and child all removed | PASS; remaining test rows `0` |

After cleanup, development taxonomy counts remained `2/4/25/8/10/0`; identity test rows returned to zero. No persistent content seed was added.

## Clean replay limitation

The required development upgrade and second-run no-op passed. A separate empty-database replay was not run: this host has no Docker, `psql`, or local PostgreSQL service, and the task restricted database operations to the named development branch. The persistent development branch was not reset or dropped. A complete `0000`–`0003` replay on an empty database therefore remains unverified.

## Repository gates and integrity

| Gate | Result |
|---|---|
| `pnpm install` | PASS — up to date |
| Migration generation | PASS — repeat generation reported no schema changes |
| First `pnpm db:migrate` on development | PASS |
| Second `pnpm db:migrate` on development | PASS / no-op |
| `pnpm lint` | PASS — no warnings or errors |
| `pnpm typecheck` | PASS |
| `pnpm build` | PASS — Next.js production build completed |
| `pnpm test:seed:taxonomy` | PASS — 4/4 tests |
| `git diff --check` | PASS — exit 0; Git emitted only its LF-to-CRLF notice for the appended journal entry |

`drizzle/0000_extensions_and_primitives.sql`, `0001_identity.sql`, `0002_taxonomy.sql`, their three historical snapshots, and the taxonomy JSON/Markdown seed files match the synchronized base SHA. The journal change appends only the `0003_media_stimuli_lessons` entry; a new `0003_snapshot.json` was generated. No secret was printed, written to tracked files, or committed. Only Neon development was migrated or written; production was untouched.

## Stop boundary

This checkpoint ends at M0-D.1. Wait for audit before beginning questions, auth, UI, storage integration, or any later migration.
