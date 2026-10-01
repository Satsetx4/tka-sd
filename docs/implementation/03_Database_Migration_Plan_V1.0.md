# TKA SD — Database Migration Plan V1.0

**Goal:** membangun schema secara kecil, reviewable, dan reversible sebelum vertical slice.

## Principles

- Semua perubahan schema melalui committed migration.
- Tidak ada manual DDL pada production.
- Migration bersifat forward-only pada production; rollback dilakukan lewat corrective migration kecuali deployment belum menyentuh production data.
- Seed taxonomy dipisah dari schema migration.
- Preview/Staging wajib menerima migration sebelum Production.
- Satu migration memiliki satu tema jelas.

## Sequence

### 0000_extensions_and_primitives

Tujuan:
- enable extension yang diperlukan seperti `citext` bila digunakan;
- create shared enums/primitives.

Tidak membuat domain table besar.

Acceptance:
- clean database bisa menjalankan migration;
- second run melalui migration framework no-op.

### 0001_identity

Create:
- `users`
- `child_profiles`
- `parent_pins`

Tambahkan FK, unique, check grade, indexes.

Acceptance:
- parent + child dummy dapat dibuat;
- child milik parent lain tidak berubah ownership secara tidak sengaja.

### 0002_taxonomy

Create:
- `subjects`
- `domains`
- `topics`
- `competencies`
- `indicators`
- `tags`

Acceptance:
- `taxonomy.seed.json` dapat di-import idempotently berdasarkan stable code;
- duplicate code gagal.

### 0003_media_stimuli_lessons

Create:
- `media_assets`
- `stimuli`
- `lessons`
- `lesson_blocks`
- `lesson_progress`

Acceptance:
- structured JSON content tersimpan;
- lesson progress unique per child/lesson.

### 0004_questions

Create:
- `questions`
- `question_options`
- `category_statements`
- `category_choices`
- `category_answers`
- `question_tags`

Acceptance:
- ketiga question types dapat direpresentasikan;
- duplicate option key / order gagal;
- taxonomy FK valid.

### 0005_practice

Create:
- `practice_sessions`
- `practice_session_items`
- `practice_answers`

Acceptance:
- one answer per question/session;
- session order deterministic.

### 0006_tryout

Create:
- `tryouts`
- `tryout_versions`
- `tryout_items`
- `tryout_attempts`
- `tryout_answers`
- `tryout_results`

Acceptance:
- version uniqueness;
- no duplicate item position;
- autosave upsert target unique;
- one result per attempt.

### 0007_analytics

Create:
- `student_topic_stats`
- `student_competency_stats`

Acceptance:
- aggregates upsertable;
- raw answer remains independent.

### 0008_commerce

Create:
- `seasons`
- `plans`
- `entitlements`
- `purchases`

Acceptance:
- price uses integer IDR;
- provider reference unique where applicable;
- entitlement query performant.

### 0009_app_settings

Create:
- `app_settings`

Seed non-secret defaults:
- performance thresholds;
- minimum evidence;
- default free limits;
- active season may remain null.

### 0010_indexes_and_integrity_review

Add only indexes/checks proven necessary from vertical slice query plan.

Review:
- FK actions;
- enum coverage;
- unique constraints;
- index duplication;
- nullable columns.

## Seed Strategy

Run separately:

```text
pnpm db:migrate
pnpm db:seed:taxonomy
pnpm db:seed:dev
```

`db:seed:taxonomy`:
- safe for staging/production;
- upsert only by immutable code;
- never deletes unknown production taxonomy automatically.

`db:seed:dev`:
- local/dev only;
- creates sample parent/child/admin and sample content.

## Deployment Workflow

```text
feature branch
↓
schema edit
↓
generate migration
↓
review generated SQL
↓
local clean-db test
↓
integration test
↓
preview/staging migrate
↓
E2E smoke
↓
merge
↓
production migrate
↓
production health check
```

## Safety Rules

- Never run `push`/schema sync directly against production as substitute for migrations.
- Never edit old migration that has shipped.
- Any destructive migration requires explicit data migration plan.
- Renames use staged migration: add new → backfill → switch code → remove old later.
- New NOT NULL columns on populated table: nullable/default first, backfill, then enforce.
- Enum removal/rename requires dedicated plan; avoid unless necessary.

## Backup/Recovery

Before first paid/public production phase:
- confirm Neon recovery/PITR capability appropriate to plan;
- define restore runbook;
- test restore into non-production branch/project;
- document RPO/RTO assumptions.

## Migration Definition of Done

A migration is done only when:
- SQL reviewed;
- clean install passes;
- upgrade from prior schema passes;
- test seed passes;
- TypeScript compiles;
- integration tests pass;
- no production-only manual step is undocumented.
