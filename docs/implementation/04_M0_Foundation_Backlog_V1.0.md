# TKA SD — M0 Foundation Execution Backlog V1.0

**Milestone:** M0 — Foundation  
**Outcome:** repository dan infrastructure siap agar M1 dapat fokus pada content engine tanpa membongkar fondasi.

## Exit Criteria

M0 selesai ketika:

```text
pnpm install
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
pnpm db:migrate
```

berjalan pada fresh checkout dengan dokumentasi environment yang jelas; Preview deployment berhasil; auth skeleton berfungsi; database migration reproducible; tidak ada production secret di repository.

## Epic 0 — Repository Bootstrap

### M0-001 Initialize Next.js
Priority: P0

- Next.js App Router
- TypeScript strict
- `src/`
- pnpm
- ESLint
- Tailwind
- import alias

Acceptance:
- home page renders;
- build success;
- strict TS enabled.

### M0-002 Repository Conventions
P0

Add:
- README
- CONTRIBUTING
- `.editorconfig`
- `.env.example`
- docs folders
- ADR template

Acceptance:
- new developer can identify source-of-truth docs.

## Epic 1 — Environment & Configuration

### M0-010 Environment Validation
P0

Create typed server/client env validation.

Rules:
- secrets server-only;
- app refuses startup when mandatory env is absent;
- no `NEXT_PUBLIC_` for DB secrets.

### M0-011 Environment Separation
P0

Define:
- local
- preview/staging
- production

Acceptance:
- preview cannot accidentally target production DB by default.

## Epic 2 — Database Foundation

### M0-020 Neon Connection
P0

- establish server-side connection;
- basic health query;
- no browser DB client.

### M0-021 Drizzle Setup
P0

- `drizzle.config`
- schema modules
- migration folder
- scripts:
  - `db:generate`
  - `db:migrate`
  - `db:seed:taxonomy`
  - `db:seed:dev`

### M0-022 Migration 0000–0002
P0

Implement:
- primitives/enums
- identity
- taxonomy

Acceptance:
- works on empty DB;
- works in Preview;
- taxonomy seed idempotent.

## Epic 3 — Authentication Skeleton

### M0-030 Neon Auth Integration
P0

Support:
- email/password
- Google sign-in when credentials available

Acceptance:
- login/logout;
- server can resolve current authenticated user.

### M0-031 Application User Sync
P0

On first auth:
- create/update `users` row;
- default role PARENT.

### M0-032 Route Guards
P0

Guard:
- `/app`
- `/parent`
- `/admin`

Acceptance:
- unauthenticated redirected/rejected;
- non-admin cannot access admin even by direct URL.

## Epic 4 — Child Profile Foundation

### M0-040 Child Profile CRUD Minimal
P0

Server actions/services:
- create child;
- list owned children;
- select active child.

### M0-041 Active Child Context
P0

Secure cookie/session reference; ownership revalidated server-side.

Acceptance:
- changing child ID manually cannot access another account's child.

## Epic 5 — App Shell & Design Primitives

### M0-050 Student Shell
P1

Responsive shell with placeholders:
- Dashboard
- Belajar
- Latihan
- Tryout
- Riwayat

Mobile-first bottom navigation may be used.

### M0-051 Parent Shell
P1

Routes/layout for parent.

### M0-052 Admin Shell
P1

Routes/layout for admin.

### M0-053 UI Primitives
P1

Minimum:
- Button
- Input
- Card
- Badge
- Dialog
- Tabs
- Progress
- Alert
- Skeleton
- EmptyState

Avoid building design system beyond immediate need.

## Epic 6 — Testing

### M0-060 Vitest Setup
P0

Unit test smoke.

### M0-061 DB Integration Harness
P0

Tests operate against non-production DB/environment.

### M0-062 Playwright Setup
P1

Smoke:
- public page loads;
- unauthorized app redirect;
- authenticated skeleton where test auth is practical.

## Epic 7 — CI & Deployment

### M0-070 CI
P0

On PR:
- install
- lint
- typecheck
- unit tests
- build

Migration integration may use dedicated test DB.

### M0-071 Vercel Preview
P0

Preview deploy per PR/branch.

### M0-072 Production Skeleton
P1

Deploy minimal production shell only after env separation verified.

## Epic 8 — Security Baseline

### M0-080 Security Headers
P1

Reasonable baseline headers; CSP can begin report-friendly/simple and tighten as dependencies stabilize.

### M0-081 Input Validation Pattern
P0

Zod + consistent domain error mapping.

### M0-082 Logging Hygiene
P0

No passwords, tokens, PIN, DB credentials in logs.

## Epic 9 — Documentation

### M0-090 Local Setup Guide
P0

From zero to running app.

### M0-091 Database Workflow
P0

How to:
- generate migration;
- migrate;
- seed;
- reset local only.

### M0-092 ADR-001 Stack Baseline
P1

Record:
- Next.js
- Neon
- Drizzle
- modular monolith
- server-authoritative assessment.

## Suggested Execution Order

```text
M0-001
→ M0-002
→ M0-010/011
→ M0-020/021
→ M0-022
→ M0-030/031/032
→ M0-040/041
→ M0-050/051/052/053
→ M0-060/061/062
→ M0-070/071
→ M0-080/081/082
→ M0-090/091/092
```

Parallelizable:
- UI shell after repo bootstrap;
- docs and CI after scripts stabilize;
- auth and DB foundation can partially overlap after env contract is fixed.

## Not in M0

Do **not** implement yet:
- full question CMS;
- practice engine;
- tryout;
- analytics;
- payment;
- parent report;
- large content import;
- AI;
- teacher/school.

## M0 Review Checklist

```text
[ ] Source-of-truth docs committed
[ ] Strict TS
[ ] Environment validated
[ ] No secret leaked to client
[ ] Neon connection server-only
[ ] Drizzle migrations reproducible
[ ] Taxonomy seed idempotent
[ ] Parent auth works
[ ] Child profile ownership enforced
[ ] Route guards server-side
[ ] Preview deployment works
[ ] Lint/typecheck/test/build green
[ ] Local setup documented
```

## Recommended Codex Delegation

Delegation should be split into small PR-sized tasks rather than “build M0” in one shot:

1. Repository + tooling
2. Environment + DB + Drizzle
3. Identity schema + migrations
4. Taxonomy schema + seed
5. Auth integration + user sync
6. Child profile + active context
7. Route guards + app shells
8. Tests + CI + deployment verification

Each task must be audited before the next architecture-sensitive task is merged.
