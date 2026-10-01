# M0-D.2b Validation — Question Domain Rules

- **Verified:** 2026-10-02 00:54 (Asia/Bangkok)
- **Repository:** `Satsetx4/tka-sd` (`D:\!AGY\tka-sd`)
- **Origin:** `https://github.com/Satsetx4/tka-sd.git`
- **Synced base SHA:** `91f06ec2b99e897bbbe9500de6b3c768b12fbd34`
- **Branch:** `feat/m0-d2b-question-domain-rules`
- **Runtime:** Microsoft Windows 10 Pro `10.0.19045`; Node.js `v24.19.0`; pnpm `11.19.0`
- **Scope verdict:** PASS for pure server-side M0-D.2b question validation, workflow guards, scoring, and student-safe projection. No schema or application-flow work was added.

## Safe sync and preserved work

The checkout and `origin` were verified as `D:\!AGY\tka-sd` and `https://github.com/Satsetx4/tka-sd.git`. Before sync, `main` was at `91f06ec2b99e897bbbe9500de6b3c768b12fbd34`; tracked files were clean. The pre-existing untracked paths `.m0a-validation/`, `CLAUDE.md`, and `docs/adr/` were preserved.

After `git fetch --all --prune`, `origin/main` resolved to the same SHA. A fast-forward-only sync reported `Already up to date`; the feature branch was created from that base. No reset, destructive checkout/cleanup, or force operation was used.

## Authority and architecture

Reviewed `docs/README.md`, the Blueprint, Implementation Specification, ERD/schema, M0-D.2a validation, and `src/db/schema/questions.ts`. Authority remains Blueprint → Implementation Specification → ERD/schema → committed migrations → code. The Blueprint uses `REVIEW`; the engineering enum uses `IN_REVIEW`, which is the workflow value implemented here.

The domain boundary is `src/server/questions/domain.ts`. It imports the existing `server-only` marker and contains:

- a complete in-memory question row plus options, CATEGORY statements/choices/answer pairs, taxonomy relation metadata, and optional stimulus presentation metadata;
- pure aggregate, answer-definition, taxonomy/stimulus, publish-readiness, and status-transition validation;
- a pure evaluator and student-safe pre-answer projection.

There is no DB loader, API route, server action, or write service in this checkpoint. The aggregate contains answer definitions and must stay inside server-only code. The tests use Node's built-in test runner and existing `tsx`; no test framework or package dependency was added.

## Domain rules

### Answer definitions

| Type | Enforced publish definition |
|---|---|
| `SINGLE_CHOICE` | At least one option and exactly one `isCorrect` option. CATEGORY answer rows are rejected as its answer definition. Total option count has no extra minimum. |
| `MULTI_SELECT` | At least one option and more than one correct option. CATEGORY answer rows are rejected as its answer definition. |
| `CATEGORY` | At least one statement and choice; each statement has exactly one answer mapping; every pair resolves to statements and choices in this question aggregate; a mapped choice must belong to the same question. Option correctness rows are not used as CATEGORY answers. |

Rows with mismatched question IDs, duplicate option keys/orders, duplicate statement IDs/orders, duplicate choice IDs/codes, duplicate answer pairs, and unresolved answer references are rejected. The domain does not add uniqueness for category-choice `sortOrder`, which the schema does not declare.

### Taxonomy and stimulus coherence

Publish readiness verifies that the loaded subject matches the question, the domain belongs to that subject, the topic belongs to the question domain, and the primary competency belongs to the question subject. A present indicator must match the question's indicator ID, subject, and primary competency; a non-null indicator topic must match the question topic. Optional stimulus metadata must match the question's stimulus ID and subject. No cross-subject exception is applied.

### Required content and explanation semantics

Question body, option bodies, and CATEGORY statement bodies must contain meaningful content. The explanation uses the same conservative structured-JSON rule: a non-whitespace string anywhere in arrays/objects counts, except values under editor metadata keys `type`, `id`, `key`, `marks`, `attrs`, `style`, `className`, and `level`. `null`, empty/whitespace strings, empty arrays/objects, metadata-only blocks, numbers, and booleans do not count. A controlled block with text content passes. This is not a content schema, renderer, or pedagogical review.

### Status transition matrix

| Current | Next | Result |
|---|---|---|
| `DRAFT` | `IN_REVIEW` | Allowed |
| `IN_REVIEW` | `VERIFIED` | Allowed |
| `VERIFIED` | `PUBLISHED` | Allowed only when publish readiness passes |
| `PUBLISHED` | `ARCHIVED` | Allowed |
| Same status | Same status | Rejected as a no-op |
| Skipped or backward stage | Any non-sequential stage | Rejected |
| `ARCHIVED` | Any different status | Rejected; terminal |

The guard is pure and performs no persistence or mutation.

### Internal responses and scoring

The internal normalized TypeScript response types are:

- `SINGLE_CHOICE`: one `optionKey`;
- `MULTI_SELECT`: an `optionKeys` array;
- `CATEGORY`: statement/choice ID pairs (`statementId`, `categoryChoiceId`).

These evaluator types are server-only and **are not a frozen public HTTP or browser payload contract**. Malformed shapes, wrong response types, unknown option keys/statements/choices, duplicate multi-select keys, duplicate statement selections, and cross-question choices are rejected.

| Type | V1 evaluator rule |
|---|---|
| `SINGLE_CHOICE` | Correct option: `scoreFraction=1`, `isCorrect=true`; otherwise `0`/`false`. |
| `MULTI_SELECT` | Exact set equality with every correct option: `1`/`true`; missing or extra known choices: `0`/`false`. Selection order does not matter. |
| `CATEGORY` | Correct statement mappings divided by all defined statements. Missing statement selections count incorrect; partial scores remain fractional and `isCorrect=false`. Invalid answer definitions are rejected before division. |

Evaluation is allowed only for `PUBLISHED`, publish-ready questions. The evaluator returns correctness, score, and normalized selected-response details; it does not return correct option keys or explanation content. No results, answers, or analytics are persisted.

### Student-safe pre-answer projection and disclosure boundary

`projectQuestionForStudent` accepts only `PUBLISHED`, publish-ready aggregates. Its projection can include question identity/code/type/body, stimulus presentation content, option key/body/order, or CATEGORY statement identity/body/order and choice code/label/order. It omits `isCorrect`, category answer pairs, any separate derived correct-key collection, explanation body, and editorial/provenance fields.

Recursive serialized-payload tests check forbidden field names, private explanation sentinels, and category choice IDs/mappings. Option keys remain visible as required to render all choices; the projection does not expose which key is correct. The aggregate, evaluator, and projection module are all server-only.

This checkpoint adds no browser response or disclosure service. Future practice callers may explicitly reveal evaluation and explanation after submission; future tryout callers must withhold correctness, answer, and explanation until final submission. That caller behavior is deferred to those later checkpoints.

### Published-question versioning boundary

The source requires a new version for substantive edits to published questions. M0-D.2a has a unique `questions.code`, and the exact copy/code persistence strategy is not specified. This checkpoint adds no mutation service or clone/new-code strategy. The persistence and version-copy decision remains deferred before a full question CMS; it does not block pure evaluation of an existing published aggregate.

## Automated test matrix

`pnpm test:questions:domain` uses `node --conditions=react-server --import tsx --test`. Node reported **81 tests passed, 0 failed** (10 top-level groups and 71 nested cases):

| Coverage | Cases |
|---|---:|
| SINGLE_CHOICE answer definition | 6 |
| MULTI_SELECT answer definition | 5 |
| CATEGORY semantic answer definition | 9 |
| Taxonomy/stimulus and required structure | 11 |
| Explanation content rule | 7 |
| Status transitions and publish gate | 10 |
| SINGLE_CHOICE evaluation and malformed response | 4 |
| MULTI_SELECT exact-set evaluation | 6 |
| CATEGORY fractional evaluation and malformed response | 9 |
| Student-safe projection and non-published rejection | 4 |

## Optional database aggregate smoke

Not run. No DB loader/repository was added, so pure fixture tests cover the domain contract without creating temporary database rows. Neon was used only for read-only development ledger and row-count verification.

## Repository gates

| Gate | Result |
|---|---|
| `pnpm install` | PASS — already up to date; no dependency or lockfile change. |
| `pnpm lint` | PASS — rerun alone with process-local `NODE_OPTIONS=--max-old-space-size=512`. The first concurrent attempt exhausted the Node heap; no persistent environment setting was changed. |
| `pnpm typecheck` | PASS |
| `pnpm build` | PASS — Next.js 16.3.7 production build completed with Turbopack. |
| `pnpm test:seed:taxonomy` | PASS — 4/4. |
| `pnpm test:questions:domain` | PASS — 81/81. |
| `git diff --check` | PASS |
| `pnpm db:generate` | PASS — `No schema changes, nothing to migrate`; no migration artifact was created. |

## Migration immutability and Neon state

`git diff --exit-code 91f06ec2b99e897bbbe9500de6b3c768b12fbd34 -- drizzle src/db/schema docs/implementation/01_taxonomy_seed_v1.json docs/implementation/01_TKA_Taxonomy_Seed_V1.0.md` passed. Thus migrations `0000`–`0004`, all historical snapshots, the migration journal, DB schema source, and taxonomy JSON/Markdown remain identical to the synced base. Drizzle generation independently reported no schema changes.

Read-only Neon checks re-discovered project `tka-sd`, selected its `development` branch (`br-young-salad-az1y9mni`) and database `neondb`, then queried only that branch. The `drizzle.__drizzle_migrations` ledger contains exactly five ordered entries:

| Migration order | Ledger hash |
|---|---|
| `0000` | `495dc0ae6d459e370ac159b32153cc6b59f74ed15c951d010b8f798d86e77bb5` |
| `0001` | `e28f1769af45541e2f9e2414ec21cefb0751d581c58892243c4f8c63ad9744d5` |
| `0002` | `7d9b29f0d0990bffb0d75b14c1b1c62b3b693685d46f57063b67f1b61e5c3148` |
| `0003` | `26a8744b40cad70186e5f1c7d0743e29e564c99b45977f59fb24571055753f70` |
| `0004` | `4715177f8a7185081125d5b2157e251dcda55e6957354c7e43f770da58c62c34` |

Post-check counts match the M0-D.2a baseline: identity `users/child_profiles/parent_pins = 0/0/0`; taxonomy `subjects/domains/topics/competencies/indicators/tags = 2/4/25/8/10/0`; content `media_assets/stimuli/lessons/lesson_blocks/lesson_progress = 0/0/0/0/0`; question tables `questions/question_options/category_statements/category_choices/category_answers/question_tags = 0/0/0/0/0/0`. No temporary data was written. No production database query or write was made.

## Documentation debt and stop boundary

`AGENTS.md` still contains stale M0-A-only checkpoint wording. The explicit M0-D.2b task authorizes this scope; `AGENTS.md` was left unchanged as requested.

This validation closes only M0-D.2b. No `0005_practice`, practice/tryout service or route, question CRUD/CMS, auth guard, database loader, migration, or data mutation was started. Stop here for independent audit before any M0-D.2c / practice work.
