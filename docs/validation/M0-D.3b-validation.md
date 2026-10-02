# M0-D.3b Validation — Practice Domain & Service Rules

**Status:** PASS — M0-D.3b complete; stop before `0006_tryout` pending independent ChatGPT audit.

## Environment and repository baseline

- Date/time: 2026-10-02 12:01:47, Asia/Jakarta (UTC+07:00).
- OS: Windows 10.0.19045.
- Node.js: v24.18.0.
- pnpm: 11.19.0.
- Repository: `D:\!AGY\tka-sd`; origin `https://github.com/Satsetx4/tka-sd.git`.
- Safe sync: initial worktree was clean on `main`; `git fetch --all --prune` completed; local `main` was already at `origin/main`; no reset, stash, destructive checkout, rebase, or history rewrite was used.
- Base SHA: `8b00e10524eafdb407d9449ded6e139a05aa6e1d` (same as `origin/main` when the feature branch was created).
- Working branch: `feat/m0-d3b-practice-services`.
- Final commit and push/integration state: pending final gates and delivery.

## Changed files

- `package.json` — added `test:practice:domain` and `test:practice:integration` scripts; no dependency changes.
- `src/server/practice/domain.ts` — Practice service contracts, structured results, request/eligibility/response validation, deterministic selection, snapshot positions, retry comparison, and navigation helper.
- `src/server/practice/repository.ts` — server-only Neon transaction and persistence primitives, owner/status checks, candidate exposure query, question aggregate loading, session/snapshot/answer operations, and counters.
- `src/server/practice/service.ts` — atomic session start, safe fetch, answer submission, Practice feedback, lifecycle, ownership, and input validation.
- `scripts/practice/practice-domain.test.ts` — pure deterministic domain tests.
- `scripts/practice/practice-integration.test.ts` — development-only Neon fixture and service integration matrix with cleanup assertions.
- `docs/validation/M0-D.3b-validation.md` — this report.

No Blueprint, Implementation Specification, taxonomy source, migration, snapshot, journal, or `src/db/schema/*` file changed.

## Architecture and contracts

### Domain / repository / service

- `domain.ts` is server-only and has no database imports. It defines structured `PracticeResult` errors, actor/start/answer contracts, validation, candidate eligibility, stable seeded ordering, normalized responses, and snapshot navigation.
- `repository.ts` is server-only. It uses the existing `@neondatabase/serverless` `Pool` and `drizzle-orm/neon-serverless` transaction support. The repository’s HTTP Neon driver does not support transactions, so Practice uses the same pooled transactional driver pattern already present in the taxonomy seed tooling. No dependency was added.
- `service.ts` composes the pure rules and repository primitives. It is the only Practice layer that evaluates answers or forms student-safe and post-answer projections.
- All three modules are protected by `server-only`; no route, server action, React UI, or browser database access was added.
- Service ID inputs are checked against PostgreSQL UUID syntax before queries. `responseTimeMs` accepts non-negative integers through the current PostgreSQL `integer` maximum (`2,147,483,647`) so a valid service input cannot overflow the persisted column.

### Start, ownership, and question selection

- Start requires a non-empty child and subject ID, optional topic ID, and a positive integer `questionTarget`. No product maximum or grade filter was introduced.
- The requested child must belong to the explicit `PracticeActor.parentUserId` and have `child_profiles.status = ACTIVE`. Topic coherence is checked through topic → domain → subject.
- Session reads and mutations resolve `practice_sessions.child_profile_id → child_profiles.parent_user_id` against the actor and require the child profile to remain ACTIVE. Cross-family lookups return `NOT_FOUND_OR_FORBIDDEN` without session details.
- Every candidate must have `status = PUBLISHED`, `usage_type IN (PRACTICE, BOTH)`, the requested subject, and the requested topic when scoped. The SQL filters these rows before aggregate loading.
- Complete question aggregates are batch-loaded with options, CATEGORY statements/choices/answer mappings, taxonomy relations, and optional stimulus metadata. Each candidate must also pass `projectQuestionForStudent()` publish-readiness validation before selection.
- Exposure is the count of persisted `practice_answers` for this child/question across historical practice sessions. A grouped subquery avoids multiplying each candidate by every historical session. Lower exposure sorts first.
- Equal-exposure candidates are ordered by SHA-256 of `sessionUUID + NUL + questionId`, then question ID as a deterministic collision fallback. The session UUID is generated before selection and is the seed. This is an internal convention, not a product rule.
- Insufficient ready candidates fail before inserts. A successful start inserts one ACTIVE session and exactly `questionTarget` ordered snapshot items in one transaction. Snapshot positions are 1-based.

### Snapshot navigation, safe projection, and CATEGORY adapter

- Any unanswered question in an ACTIVE session snapshot may be answered; there is no lockstep current-position requirement. Default-next chooses the lowest-position unanswered item.
- Fetch requires actor ownership, ACTIVE child/session, and snapshot membership. It projects through `projectQuestionForStudent()` and never returns correctness flags, answer mappings, explanation, editorial/provenance fields, or CATEGORY choice database IDs.
- SINGLE_CHOICE uses `optionKey`; MULTI_SELECT uses sorted unique `optionKeys`.
- CATEGORY service input uses `{ statementId, categoryChoiceCode }`. The adapter resolves the code inside that question’s aggregate, rejects unknown/ambiguous codes and invalid aggregates, then passes only `{ statementId, categoryChoiceId }` to the existing evaluator. Persisted `response_json` uses the evaluator’s canonical internal ID representation. Feedback maps choices back to codes; CATEGORY choice UUIDs are not returned.
- Practice feedback is question-scoped and may disclose correctness, score fraction, the normalized selected response, safe correct-answer identifiers/codes, and explanation after submission. It does not expose provenance/editorial internals.

### Answer transaction, retries, counters, and lifecycle

- Answer submission locks the owned ACTIVE child with a shared row lock and locks the owned `practice_sessions` row `FOR UPDATE`; separate sessions for the same child are not serialized by an exclusive child lock.
- Inside one transaction it re-reads session/snapshot/answer rows, checks ownership, ACTIVE state for a new answer, snapshot membership, publish-readiness, response validity, and existing counter invariants before writing.
- The first valid persisted answer wins. A same normalized retry returns the existing result/feedback without another write or counter change; a different normalized answer returns `ANSWER_CONFLICT`. MULTI_SELECT ordering is semantically irrelevant; CATEGORY normalization follows statement order and retry equality is order-independent.
- A read-only retry of an already persisted answer is allowed after the same submission completed the session. ABANDONED rejects all answer submissions, including retries; new answers and other mutations on terminal sessions are rejected. This preserves retry behavior for a lost completion response while keeping abandonment terminal.
- Feedback is validated before writes. The transaction inserts exactly one canonical answer, increments `questions_answered` once and `correct_count` only for `isCorrect = true`, updates `last_activity_at`, and marks COMPLETED with `completed_at` when the target is reached. If any database write fails, the transaction rolls back both answer and counters.
- Before each new answer, persisted answer totals and correctness totals must equal the session counters and snapshot-answer join; otherwise the operation returns `SESSION_STATE_INCONSISTENT` without mutation.
- ACTIVE → COMPLETED occurs after all target items have answers. ACTIVE → ABANDONED is explicit and leaves `completed_at = NULL`. COMPLETED and ABANDONED are terminal; repeated abandon returns `SESSION_NOT_ACTIVE`.
- Preserved invariants: `questions_answered = persisted answer count`; `correct_count = persisted correct answer count`; `0 <= correct_count <= questions_answered <= question_target`; new snapshot length equals target.

## Multi-agent execution and dispositions

Codex was lead/integrator and sole Git owner. Antigravity did not commit, push, merge, modify configuration, or access a database. Every invocation omitted `skipPermissions` / `--dangerously-skip-permissions`.

| Task | Safe invocation and result | Files/output and Codex disposition |
|---|---|---|
| AG-1, read-only rules/security audit | `agy --print-timeout 600s --sandbox --output-format json -p 'AG-1 READ-ONLY PRACTICE RULES AND SECURITY AUDIT. Inspect only the project authority documents, M0-D.2b/M0-D.3a validation, src/server/questions/domain.ts, and src/db/schema/practice.ts. Do not use command, shell, terminal, edit/write, config, database, or network tools. Return one JSON object with exact eligible question rules; ownership/session authorization boundary; snapshot membership invariant; lifecycle rules; idempotent retry and race risks; answer leakage risks; CATEGORY code-versus-ID adapter implications; unsupported or ambiguous behavior Codex must not invent. Cite file paths and relevant section/function names. Make no changes.'` | Read-only; no files changed. An earlier headless attempt returned no response and one retry was denied when it requested a shell command; no permission bypass was used. The file-read-only retry returned structured findings. Confirmed PUBLISHED + PRACTICE/BOTH, exact taxonomy scope, readiness and snapshot requirements, server ownership, active-child context, row-lock/idempotency risks, pre-answer projection, and CATEGORY code/ID mismatch. Codex followed the explicit user policy for deterministic seeded ordering, retry handling, and code-to-ID adaptation. |
| AG-2, pure domain implementation | Headless sandboxed `agy --print-timeout 300s` attempt for domain plus tests timed out at the Antigravity tool boundary; a narrowed `agy --print-timeout 240s --sandbox --output-format json` domain-only retry also timed out at 240 seconds. No permission bypass was used. | No files/output were returned and worktree stayed unchanged. Workflow fallback used; Codex implemented and reviewed `src/server/practice/domain.ts` and `scripts/practice/practice-domain.test.ts`. |
| AG-3, repository/persistence implementation | Headless sandboxed `agy --print-timeout 240s --sandbox --output-format json` repository-only attempt. | Antigravity returned “print timeout after 4m0s with turn in progress; returning partial output”; no files were returned and worktree stayed unchanged. Workflow fallback used; Codex implemented and reviewed `src/server/practice/repository.ts`. |
| AG-4, adversarial review | `agy --print-timeout 600s --sandbox --output-format json -p 'AG-4 READ-ONLY ADVERSARIAL REVIEW. Inspect the current checkpoint diff and relevant Practice domain, repository, service, and tests. Do not use command, shell, terminal, edit/write, config, database, or network tools. Return one JSON object with summary and a findings array. Each finding must include severity (blocker, warning, or nice-to-have), file/function, exploit or failure scenario, exact code evidence, and recommended fix. Attack: answer-key leakage before answer; answering outside the session snapshot; ownership bypass; ASSESSMENT-only or non-PUBLISHED selection; subject/topic mismatch; duplicate/racing submissions and double counters; inactive session answering; CATEGORY wrong-question/unknown-code mapping and UUID exposure; stale completion counters; transaction partial writes. Distinguish confirmed findings from limitations. Review only; make no changes.'` | `PASS_WITH_WARNINGS`, 0 blockers, 4 warnings, 3 nice-to-have findings. No files changed. See disposition table below. |

The AG-2/AG-3 command rows preserve the executed timeout/flag values and task scope; the Antigravity timeout responses did not return their original prompt text or generated files. Codex fallback is allowed by `docs/development/agent-workflow.md` for headless permission/timeouts and is not reported as successful delegation output.

### AG-4 finding disposition

| Finding | Disposition |
|---|---|
| Archived child could start/access a session | **ACCEPTED/FIXED.** Ownership lookups now also require ACTIVE profile status for start, fetch, answer, and abandon; the integration suite checks archived-profile rejection. |
| Candidate query multiplied historical sessions by candidates and loaded ineligible aggregates | **ACCEPTED/FIXED.** Exposure is pre-aggregated per child/question; status/usage/subject/topic filters run before aggregate loading. |
| `responseTimeMs` could exceed PostgreSQL `integer` range | **ACCEPTED/FIXED.** Service validation rejects values above `2,147,483,647`; domain test covers the boundary. |
| CATEGORY answer ordering used locale-dependent `localeCompare` | **ACCEPTED/FIXED.** It now uses a stable codepoint comparator. |
| Malformed UUID inputs became generic database errors | **ACCEPTED/FIXED.** Service entry points reject malformed UUIDs with structured `INVALID_INPUT` before querying. |
| Session mutation lock also exclusively locked the child row | **ACCEPTED/FIXED.** The service takes a shared lock on the owned ACTIVE child and an update lock only on the target session. |
| Schema lacks a composite FK from answer `(session, question)` to snapshot item | **DEFERRED.** The service checks membership inside the serialized transaction. A database constraint requires a migration/schema change, which this checkpoint expressly prohibits; no schema files were changed. |

## Test matrix and database evidence

### Repository gates

- `pnpm install --frozen-lockfile` — PASS, already up to date.
- `pnpm lint` — PASS, no remaining warnings.
- `pnpm typecheck` — PASS.
- `pnpm build` — PASS; optimized Next.js production build compiled and generated routes.
- `pnpm test:seed:taxonomy` — PASS, 4/4.
- `pnpm test:questions:domain` — PASS, 81/81.
- `pnpm test:practice:domain` — PASS, 19/19.
- `pnpm test:practice:integration` — PASS, 8/8 grouped Neon development scenarios.
- `git diff --cached --check` — PASS on all seven staged files, including this report.
- `pnpm db:generate` — PASS, output: **“No schema changes, nothing to migrate.”** No migration was generated.

Two pure Node test commands were initially started alongside the build and one another. The Windows runner ran out of heap; both were rerun serially after the build and passed (taxonomy 4/4, questions 81/81). The Neon integration suite was run serially.

### Neon development integration

- Target was reverified as Neon project `tka-sd`, branch `development`, database `neondb`. The test refuses any URL other than the known development pooled endpoint/database and asserts `current_database()`.
- Baseline before and after cleanup: Practice sessions/items/answers `0/0/0`; temporary identity/question/content/tag rows all zero; taxonomy counts `2/4/25/8/10/0` (subjects/domains/topics/competencies/indicators/tags).
- Migration ledger before and after was identical with exactly IDs `1`–`6` (migrations `0000`–`0005`).
- Integration coverage includes both eligible usage types; exclusions for ASSESSMENT-only and every non-PUBLISHED status; subject/topic mismatch; readiness rejection; exposure order; insufficient/atomic creation; ownership and archived-child rejection; snapshot-only fetch/answer; recursive pre-answer secrecy; SINGLE/MULTI/CATEGORY evaluation and canonical persistence; CATEGORY code feedback without choice UUIDs; same/conflicting retries and simultaneous submissions; exact counters/completion; abandon and terminal behavior; malformed UUIDs; and cleanup.
- Temporary fixtures are deleted in `finally`; the suite asserts all baseline counts and ledger hashes are restored. The passing run confirms cleanup.
- Production was not queried or changed.

## Immutability, limitations, and stop boundary

- SQL migrations `0000`–`0005`, historical snapshots `0000`–`0005`, migration journal, `src/db/schema/*`, and taxonomy source JSON/Markdown are unchanged from the base SHA. No `0006` artifact exists.
- The DB schema does not enforce answer-to-snapshot membership for direct SQL writers. Practice services enforce it under the session mutation lock; a composite database constraint is deferred to a separately authorized schema checkpoint.
- Authentication and route guards are out of scope. Each service requires an explicit actor context and enforces actor → ACTIVE child → session ownership server-side.
- No Tryout, analytics, recommendation engine, adaptive difficulty, migration, schema, production database, UI, or public route work is included.
- **Stop boundary:** do not begin `0006_tryout` until the independent ChatGPT audit of M0-D.3b is complete.
