# M0-C.2 Validation Record — Identity Schema

- **Verified:** 2026-10-01 20:11 Asia/Jakarta (2026-10-01 13:11 UTC)
- **Git branch:** `feat/m0-c2-identity`
- **Base SHA:** `origin/main` at `707d33c49e55907df14d252341c4f7602cea812b`
- **OS:** Windows 10 Pro, 10.0.19045, 64-bit
- **Node.js:** `v24.18.0`
- **pnpm:** `11.19.0`
- **Next.js:** `16.3.7`
- **Neon project:** `tka-sd`
- **Neon branch:** `development`

## Schema decision

The Blueprint identifies a child's grade but does not specify numeric database values. The Implementation Specification explicitly says V1 supports grades 4, 5, and 6. The lower-authority ERD says `grade between 1 and 6`. Following the documented authority order, the migration enforces `grade IN (4, 5, 6)`, matching the V1 scope without adding values that the Implementation Specification does not support.

The identity schema uses the existing `user_role`, `profile_status`, and `citext` primitives from `0000_extensions_and_primitives`. UUID columns have no database default; callers supply IDs because the baseline does not define a database-side UUID generator. `parent_pins.failed_attempts >= 0` is an additional integrity check consistent with the counter's non-negative intent; the source documents do not specify that check explicitly.

## Objects created by `0001_identity`

The reviewed migration creates exactly these three tables, with no new enum, extension, auth/session table, or business table:

### `users`

- `id uuid PRIMARY KEY NOT NULL`
- `auth_provider_user_id text NOT NULL UNIQUE`
- `email citext NOT NULL UNIQUE`
- `display_name text NOT NULL`
- `role user_role NOT NULL DEFAULT 'PARENT'`
- `created_at timestamptz NOT NULL DEFAULT now()`
- `updated_at timestamptz NOT NULL DEFAULT now()`
- `last_login_at timestamptz NULL`

The unique constraints provide the effective indexes for `auth_provider_user_id` and `email`; no duplicate indexes were added.

### `child_profiles`

- `id uuid PRIMARY KEY NOT NULL`
- `parent_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT`
- `display_name text NOT NULL`
- `grade smallint NOT NULL CHECK (grade IN (4, 5, 6))`
- `avatar_key text NULL`
- `status profile_status NOT NULL DEFAULT 'ACTIVE'`
- `created_at timestamptz NOT NULL DEFAULT now()`
- `updated_at timestamptz NOT NULL DEFAULT now()`
- Index: `(parent_user_id, status)`

### `parent_pins`

- `user_id uuid PRIMARY KEY NOT NULL REFERENCES users(id)`; PostgreSQL's default delete action is `NO ACTION`
- `pin_hash text NOT NULL`
- `failed_attempts integer NOT NULL DEFAULT 0 CHECK (failed_attempts >= 0)`
- `locked_until timestamptz NULL`
- `updated_at timestamptz NOT NULL`, with no database default

The primary keys supply their unique indexes. The only additional indexes are the two unique `users` indexes and `child_profiles_parent_user_id_status_idx`.

## Migration and Neon validation

| Check | Result | Evidence |
|---|---|---|
| `pnpm db:generate --name=identity` | PASS | Drizzle generated `0001_identity.sql` and its snapshot; output reported 3 tables, 1 child index, and the two foreign keys on the user-linked tables. |
| SQL review | PASS | The file contains only the three identity tables, their primary/unique/check/FK constraints, and the required child index. `0000` is unchanged. |
| Target | PASS | Neon project/branch were resolved by name; the local ignored `.env.local` was configured for `development` only. |
| First `pnpm db:migrate` | PASS | `0001_identity` applied successfully to `development`. |
| Second `pnpm db:migrate` | PASS / no-op | The command succeeded; read-only ledger inspection still showed exactly two ordered rows, corresponding to `0000_extensions_and_primitives` and `0001_identity`. |
| Database objects | PASS | Read-only catalog inspection showed only `users`, `child_profiles`, and `parent_pins` in `public`; defaults, `citext`, constraints, foreign keys, and indexes matched the migration. No taxonomy or other application tables were created. |
| Test-data cleanup | PASS | Acceptance data was removed before transaction commit; a follow-up query found zero `m0c2` test users. |
| Production | PASS | No production database connection or write command was used. |

### Clean application-schema reproduction

Before the first M0-C.2 migration run, `development` had the `0000` migration ledger and provider-managed `neon_auth` objects, but no public application tables. The M0-C.1 validation record documents `0000` applied against an application-clean state; this checkpoint applied `0001` against that same clean application state after `0000`. A separate disposable branch or empty physical PostgreSQL instance was not created, so a complete fresh-instance replay was not repeated here.

## Database integrity acceptance matrix

Tests ran against `development` in one PostgreSQL transaction with savepoints. Each expected constraint error was caught, and all temporary rows were deleted before commit.

| Check | Result |
|---|---|
| Create valid parent user | PASS |
| Duplicate `auth_provider_user_id` | FAIL as expected (`23505` unique violation) |
| Duplicate email with different letter case | FAIL as expected (`23505` unique violation on `citext`) |
| Create child with valid parent | PASS |
| Create child with nonexistent parent | FAIL as expected (`23503` foreign-key violation) |
| Delete parent while child exists | FAIL as expected (`23001` restrict violation) |
| Create child with grade `3` | FAIL as expected (`23514` check violation) |
| Insert and update `parent_pins` with synthetic salted scrypt hashes | PASS |
| Set `failed_attempts` to `-1` | FAIL as expected (`23514` check violation) |
| Temporary test rows remaining | `0` |

## Repository validation

| Command | Result | Notes |
|---|---|---|
| `pnpm install` | PASS | Lockfile already up to date. |
| `pnpm lint` | PASS | ESLint exited with code 0. |
| `pnpm typecheck` | PASS | `tsc --noEmit` exited with code 0. |
| `pnpm build` | PASS | Next.js 16.3.7 compiled, completed TypeScript, generated static pages, and finalized routes. |
| `git diff --check` | PASS | No whitespace errors. |

## Scope and secrets

- Changed only the identity Drizzle schema/export, migration SQL and metadata, and this validation record.
- `drizzle/0000_extensions_and_primitives.sql` retains its baseline SHA-256 `D8F4C4A17A7BD5AE25934EE54A0AE5AD73AE3965D640A64BB798F0FEE0ACEFF9`.
- No `0002_taxonomy`, taxonomy/content tables or seed, auth integration, repository/service logic, or product feature was added.
- `.env.local` contains the local `development` connection only and is ignored by Git. No connection string or credential was written to tracked files or validation output.
- No manual DDL or migration was run against production.
