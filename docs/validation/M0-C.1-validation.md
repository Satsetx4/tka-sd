# M0-C.1 Validation Record

- **Verified:** 2026-10-01 12:51 Asia/Bangkok (2026-10-01 05:51 UTC)
- **Git branch:** `chore/m0-c1-primitives`
- **Base:** `origin/main` at `7ed42dd3e71ecfc1deb4309afd288ce5765d7b18`
- **Node.js:** `v24.19.0`
- **pnpm:** `11.19.0`
- **Neon project:** `tka-sd`
- **Neon branch:** `development`
- **Migration:** `0000_extensions_and_primitives`

## Schema objects

The reviewed migration adds the required `citext` extension and these shared PostgreSQL enums:

| Enum | Values |
|---|---|
| `asset_type` | `IMAGE`, `ILLUSTRATION`, `DIAGRAM`, `GRAPH` |
| `cognitive_level` | `UNDERSTAND`, `APPLY`, `REASON` |
| `content_status` | `DRAFT`, `IN_REVIEW`, `VERIFIED`, `PUBLISHED`, `ARCHIVED` |
| `difficulty` | `EASY`, `MEDIUM`, `HARD` |
| `lesson_block_type` | `INTRO`, `OBJECTIVE`, `CONTENT`, `EXAMPLE`, `TIP`, `CHECKPOINT`, `SUMMARY`, `CTA` |
| `lesson_progress_status` | `NOT_STARTED`, `IN_PROGRESS`, `COMPLETED` |
| `practice_session_status` | `ACTIVE`, `COMPLETED`, `ABANDONED` |
| `profile_status` | `ACTIVE`, `ARCHIVED` |
| `purchase_status` | `PENDING`, `PAID`, `FAILED`, `REFUNDED` |
| `question_type` | `SINGLE_CHOICE`, `MULTI_SELECT`, `CATEGORY` |
| `season_status` | `UPCOMING`, `ACTIVE`, `ENDED` |
| `source_type` | `OFFICIAL_REFERENCE`, `THIRD_PARTY_REFERENCE`, `ORIGINAL`, `REGENERATED` |
| `stimulus_type` | `TEXT`, `IMAGE`, `TABLE`, `GRAPH`, `MIXED` |
| `text_type` | `INFORMATION`, `FICTION` |
| `tryout_attempt_status` | `IN_PROGRESS`, `SUBMITTED`, `EXPIRED`, `INVALIDATED` |
| `usage_type` | `PRACTICE`, `ASSESSMENT`, `BOTH` |
| `user_role` | `PARENT`, `ADMIN` |

`plpgsql` was present before this migration; it was not added. No enum was created for tryout, plan, or entitlement statuses because the source documents do not define their values. The Blueprint calls the review step `REVIEW`; the Implementation Specification and ERD specify `IN_REVIEW`. The schema follows the implementation naming and its documented archive action as `ARCHIVED`.

The migration framework added `drizzle.__drizzle_migrations`. The nine existing `neon_auth` tables were present before the migration. No application or business tables were created.

## Neon migration checks

| Check | Result | Evidence |
|---|---|---|
| Target branch | PASS | The local `.env.local` endpoint was matched to the Neon `development` branch compute before migration; no connection string was printed. |
| First migration run | PASS | `pnpm db:migrate` completed successfully on `development`. |
| Second run / no-op | PASS | A second `pnpm db:migrate` completed successfully. The migration ledger contains one record and all 17 enums remain single objects. |
| Resulting objects | PASS | Read-only Neon catalog queries show `citext`, the 17 expected enums, the framework migration ledger, and the pre-existing provider tables. No identity, taxonomy, content, learning, assessment, or commerce tables exist. |
| Clean application-schema baseline | PASS | Before the first run, read-only catalog inspection found no application tables or enums on `development`; only provider-managed `neon_auth` tables and `plpgsql` were present. This verifies the first migration against an application-clean state, not a separate disposable branch or entirely empty PostgreSQL instance; Docker and `psql` are unavailable in this environment. |
| Production untouched | PASS | All migration commands targeted `development`; no production migration or write was run. |

## Repository validation

| Command | Result | Notes |
|---|---|---|
| `pnpm install` | PASS | Lockfile was already up to date. |
| `pnpm db:generate --name=extensions_and_primitives` | PASS | Generated the 17 enum DDL statements and Drizzle metadata. The required `citext` extension statement is included in the same migration. |
| `pnpm lint` | PASS after retry | The first run hit a Node heap allocation failure. It passed on retry with process-local `NODE_OPTIONS=--max-old-space-size=512`. |
| `pnpm typecheck` | PASS | `tsc --noEmit` passed with process-local `NODE_OPTIONS=--max-old-space-size=512`. |
| `pnpm build` | FAIL | Two runs with process-local `NODE_OPTIONS=--max-old-space-size=512` reproducibly failed when a Next.js Turbopack/PostCSS subprocess closed while processing `src/app/globals.css` (`0xc0000409`). A direct PostCSS transform of the same CSS passed. The build gate remains unresolved. |

## Scope and secrets

- Only shared enum definitions, the `citext` extension, migration metadata, migration guidance, and this validation record were added or updated.
- No `0001_identity` or `0002_taxonomy`, domain tables, taxonomy seed, authentication feature, or product feature was created.
- The local ignored `.env.local` was used to connect to `development` and was not modified or staged.
- No credential or connection string appears in committed files or emitted migration logs; migration command output was sanitized before display.
- This checkpoint is not ready to merge while the build gate is failing.
