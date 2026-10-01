# M0-B.1 Validation Record

- **Verified:** 2026-10-01 11:59 Asia/Bangkok
- **Git branch:** `chore/m0-b-foundation`
- **Base:** `main` was one commit behind this branch at the start of the checkpoint.
- **Node.js:** `v24.19.0`
- **pnpm:** `11.19.0`
- **Neon project:** `tka-sd`
- **Neon non-production branch:** `development`

## Environment startup enforcement

| Check | Result | Evidence |
|---|---|---|
| Start without `DATABASE_URL` | PASS | `pnpm start` exited with code 1 during `next.config.ts` loading. The message was `DATABASE_URL is missing or invalid for this server environment.` |
| Refuses requests when unset | PASS | Port 3000 had no listening process after the failed start. |
| Credential-safe error | PASS | The error was generic and contained no environment value. |
| Build without `DATABASE_URL` | PASS | `pnpm build` completed with no database credential configured. |

`DATABASE_URL` remains server-only. Application code does not configure or read `NEXT_PUBLIC_DATABASE_URL`, and there is no fallback to another environment.

## Application-level database health

| Check | Result | Evidence |
|---|---|---|
| `checkDatabaseHealth()` through the running app | PASS | Started the built app with the local ignored `.env.local` pointed to the `development` branch; `GET /api/health/database` returned HTTP 200 and `{"status":"ok"}`. |
| Query effect | PASS | The helper executed only `select 1`; no schema, table, or business data was changed. |

The development branch was created from the project's production branch because no non-production branch existed. The parent had Neon-managed `neon_auth` objects and a provider configuration row; no application business tables were present. Branch creation copied that baseline and did not run SQL against production.

## Repository validation

| Command | Result | Notes |
|---|---|---|
| `pnpm install` | PASS | Lockfile was already up to date. |
| `pnpm lint` | PASS | ESLint exited 0. |
| `pnpm typecheck` | PASS | `tsc --noEmit` exited 0. |
| `pnpm build` | PASS | Passed both without `DATABASE_URL` and with the ignored local development setting. One earlier invocation hit a transient Node heap allocation failure; a subsequent normal retry passed. |

## Scope and secrets

- No business migration, schema, seed, auth feature, or product table was added or run.
- `.env.local` is ignored by Git and contains only the non-production branch setting; it was not staged or committed.
- No credential or connection string is included in this report.
- No blockers remain for M0-B.1.
