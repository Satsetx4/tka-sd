# Database foundation

M0-B provides a server-only Neon connection factory, Zod validation for `DATABASE_URL` enforced at Node.js server startup, a Drizzle Kit configuration, migration scripts, and a minimal `select 1` helper in `src/db/health.ts`. The read-only `/api/health/database` endpoint calls that helper and returns only a generic health status.

The schema catalog is intentionally empty. No migration SQL or product tables are included. Do not run `db:migrate` against any environment until a reviewed migration is added at a later checkpoint. Keep local and preview database credentials separate from production; details are in [environment configuration](./environment.md).

The runtime uses Drizzle's Neon HTTP adapter. It supports serverless HTTP queries and non-interactive operations. Revisit the adapter if later product operations require interactive transactions or persistent sessions.

Available scripts:

- `pnpm db:generate` — create a migration from reviewed Drizzle schema changes.
- `pnpm db:migrate` — apply generated migrations to the `DATABASE_URL` supplied for the current environment.

References:

- [Drizzle: Get Started with Neon](https://orm.drizzle.team/docs/get-started/neon-new)
- [Drizzle: Migrations](https://orm.drizzle.team/docs/migrations)
