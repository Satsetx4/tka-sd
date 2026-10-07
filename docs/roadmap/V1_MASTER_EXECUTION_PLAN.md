# TKA SD — V1 Master Execution Plan

## Purpose

This plan starts from the repository state recorded below and guides execution to full V1 end-to-end product readiness. It is operational guidance subordinate to the authority hierarchy and does not override the Blueprint or Implementation Specification. Agents must reverify live repository and environment state before acting; the baseline is a starting reference, not a substitute for verification.

## Current verified baseline

Repository: Satsetx4/tka-sd.

At the planning audit, main was e7d63a8bddaa5306c6616973b88057561ad3d2c6. Agents must always fetch and treat the current origin/main as authority before starting work.

Completed at that audit:

- 0000 primitives/enums
- 0001 identity
- 0002 taxonomy and seed
- 0003 media/stimuli/lessons schema
- 0004 questions schema
- question domain/evaluator
- 0005 practice persistence
- practice domain/service, ownership, concurrency/idempotency, and CATEGORY safe code adapter
- multi-agent repository guardrails

Not completed at that audit:

- 0006 tryout
- 0007 analytics
- 0008 commerce
- 0009 app_settings
- 0010 indexes/integrity review
- authentication integration, user sync, and route guards
- child CRUD and active child context
- application shells
- admin CMS
- Practice UI
- Tryout product
- analytics/recommendation
- parent experience
- freemium/payment
- production launch hardening

The last verified Development Neon migration state was 0000–0005 only. Production application schema had not been deployed at the last reported project audit. The M0-D.3b validation record is the latest repository evidence for the Practice checkpoint. Every agent must recheck current migration and deployment state before work that depends on it.

## Authority hierarchy

Follow this order:

1. Blueprint
2. Implementation Specification
3. Reviewed ADR
4. Committed migrations
5. Application code

Read these mandatory documents before implementation:

- docs/README.md
- docs/blueprint/TKA_SD_Blueprint_Source_of_Truth_v1.0.md
- docs/implementation/00_Implementation_Specification_V1.0.md
- docs/implementation/01_TKA_Taxonomy_Seed_V1.0.md
- docs/implementation/01_taxonomy_seed_v1.json
- docs/implementation/02_Database_ERD_and_Schema_V1.0.md
- docs/implementation/03_Database_Migration_Plan_V1.0.md
- docs/implementation/04_M0_Foundation_Backlog_V1.0.md
- AGENTS.md
- docs/development/agent-workflow.md

If authoritative sources conflict materially, stop the affected work. Do not invent product behavior or silently resolve a conflict in a lower-authority document or in code.

## Agent execution model

- Do not use Antigravity CLI or agy.
- Use native Codex sub-agents only for bounded tasks.
- The lead agent is the sole integrator, Git owner, and runner of final gates.
- Break work into small bounded subtasks with non-overlapping file ownership.
- Use this pattern: read-only contract audit → isolated implementation → isolated tests → read-only adversarial review → lead integration.
- Run heavy Node, build, and test tasks serially on Windows. Parallel execution has previously exhausted available memory.
- Review all delegated output against the source documents and checkpoint contract before integration.

## Autonomous operation policy

Continue to the next checkpoint only when all gates pass, scope is clear, and the work requires no destructive action, production change, or external architectural decision.

Stop the affected work for any of these conditions:

- source-of-truth conflict
- destructive database change
- production mutation
- payment provider decision
- authentication or storage replacement
- scoring architecture change
- major new dependency or architecture change
- secrets or credentials are required
- migration divergence or data corruption risk

Record the blocker and evidence in the checkpoint validation report. Resume only after the blocking decision or authorization is resolved.

## Final V1 user goal

The production architecture must support this complete flow:

Parent Register/Login → Create Child → Select Child → Open Lesson → Complete Lesson → Start Practice → Answer → Feedback/Explanation → Start Mini Tryout → Autosave → Refresh/Resume → Submit → Score/Analysis → Weak Topic → Recommendation → Parent Summary → Freemium/Premium Access.

The flow must run on the production architecture, not on a mock-only architecture.

## PHASE 0 — Rebaseline and execution tracker

### Checkpoint G0 — Project Rebaseline

- Verify the repository and origin identity.
- Fetch and fast-forward local main only when safe.
- Verify the worktree and preserve all existing changes.
- Verify Development Neon target and migration ledger.
- Verify Production remains untouched; use read-only verification only.
- Inspect the latest relevant validation documents.
- Maintain docs/roadmap/V1_EXECUTION_STATUS.md.
- Use only these status values: NOT_STARTED, IN_PROGRESS, BLOCKED, PASS, PASS_WITH_WARNING, FAILED.

## PHASE 1 — M0-D.4a Tryout persistence / 0006_tryout

Create six tables:

- tryouts
- tryout_versions
- tryout_items
- tryout_attempts
- tryout_answers
- tryout_results

Required constraints:

- unique (tryout_id, version_number)
- unique (tryout_version_id, position)
- unique (tryout_version_id, question_id)
- unique (tryout_attempt_id, question_id)
- tryout_results attempt_id is the primary key and a foreign key
- indexes on (child_profile_id, started_at DESC) and (tryout_version_id, status)

Migration sequencing debt: tryouts.season_id exists in the source design, but seasons is created in 0008. Keep the season_id column in 0006 without a foreign key until 0008, and document this temporary referential gap.

Hard boundary: do not add Tryout service, timer, autosave, submit behavior, UI, or analytics in this checkpoint.

Exit criteria:

- Development ledger contains 0000–0006.
- Test fixtures are clean after validation.
- A second migration run is a no-op.

Suggested commit: feat(m0-d4a): add tryout schema migration.

## PHASE 2 — Complete M0 Foundation

### M0-E1 — Authentication Foundation

- Integrate Neon Managed Auth.
- Support email/password registration and login.
- Add Google login when credentials are available.
- Implement logout.
- Provide server-side getCurrentAuthUser() and requireAuth().
- If Google credentials are absent, mark Google as BLOCKED_EXTERNAL only; email/password must still pass.

### M0-E2 — Application User Sync

- Sync the authentication provider identity to a users row.
- Assign the default role PARENT.
- Make synchronization idempotent and prevent role escalation.

### M0-E3 — Route Authorization

- Protect /app/*, /parent/*, and /admin/*.
- Enforce authorization on the server; directly entering a URL must not bypass it.

### M0-F1 — Child Profile CRUD

- Create, list, and archive children owned by the authenticated parent.

### M0-F2 — Active Child Context

- Use a secure, server-controlled session or cookie reference.
- Parent A must never be able to select Parent B's child.

### M0-G1, M0-G2, M0-G3 — Application shells

- Build student, parent, and admin routes from the Implementation Specification.

### M0-G4 — Minimal UI primitives

Provide Button, Input, Textarea, Select, Card, Badge, Dialog, Tabs, Progress, Alert, Skeleton, EmptyState, error, and loading primitives.

### M0-H1 — Testing foundation

- Add Vitest smoke coverage, a database integration harness, and Playwright.
- Preserve existing Node tests.

### M0-H2 — Continuous integration

Run install, lint, typecheck, tests, and build on each pull request.

### M0-H3 — Vercel Preview

- Configure Preview without allowing it to use the Production database accidentally.
- If required access is unavailable, mark the external dependency BLOCKED_EXTERNAL and document it.

### M0-H4 — Security baseline

Cover security headers/CSP, server-only secrets, logging hygiene, and stable input validation.

### M0-H5 — Documentation

Refresh the root README and add CONTRIBUTING, local setup, database workflow, test workflow, Preview documentation, and ADR-001 for the stack baseline.

### M0 exit criteria

A fresh checkout can install, run development, lint, typecheck, test, build, and run db:migrate. Authentication, child ownership, route guards, and Preview work, or any external Preview blocker is documented.

## PHASE 3 — Remaining core data model

### M0-D.5a — 0007_analytics

Add student_topic_stats and student_competency_stats. Raw answers remain the source data and aggregates must be rebuildable.

### M0-D.6a — 0008_commerce

Add seasons, plans, entitlements, and purchases. Review and add the tryouts.season_id → seasons foreign key. Do not select a payment provider.

### M0-D.7a — 0009_app_settings

Add non-secret application configuration only.

Defer 0010_indexes_and_integrity_review until real vertical-slice query patterns exist; revisit it in Phase 11.

## PHASE 4 — M1 Content Engine

### M1-A — Question versioning decision

Create and review an ADR before scaling the CMS. Historical attempts must remain reproducible. Choose the approved versioning strategy before published-content editing is productionized.

### M1-B — Content repositories and services

Implement taxonomy, media, stimuli, lessons, and questions repositories/services.

### M1-C — Question editorial workflow

Implement DRAFT → IN_REVIEW → VERIFIED → PUBLISHED → ARCHIVED with create, edit, preview, review, verify, publish, and archive actions.

### M1-D — Lesson, stimulus, and media management

Implement CRUD. Store media binaries outside PostgreSQL.

### M1-E — Import pipeline

Use JSON as the primary format; CSV is optional and should remain simple. The pipeline must parse → validate → resolve taxonomy → check duplicates → preview errors → import as DRAFT. Never auto-publish imported content.

### M1-F — Admin CMS

Build the CMS for taxonomy, lessons, questions, stimuli, media, tryouts, imports, users, and settings as appropriate.

### M1-G — Initial development content

Create two Math lessons, two Indonesian lessons, 20 Math questions, 20 Indonesian questions covering all question types, one mini tryout, and Development parent/child/admin accounts.

Do not scale to hundreds of questions yet.

## PHASE 5 — M2 Student Learning

### M2-A — Lesson service

Implement getLesson, startLesson, updateLessonProgress, and completeLesson.

### M2-B — Lesson renderer

Render INTRO, OBJECTIVE, CONTENT, EXAMPLE, TIP, CHECKPOINT, SUMMARY, and CTA blocks, including multimodal content.

### M2-C — Mobile-first learning routes

Implement the /app/belajar routes.

### M2-D — Resume lesson progress

Restore lesson progress after reload or navigation.

## PHASE 6 — M3 Practice Productization

Reuse the existing Practice backend; do not rewrite it without a demonstrated reason.

### M3-A — Public server boundary

Use Zod and stable public errors. Never expose an answer key before submission.

### M3-B — Question renderers

Render SINGLE_CHOICE, MULTI_SELECT, and CATEGORY.

### M3-C — Practice flow

Implement Start → Question → Answer → immediate feedback/explanation → Next → Complete.

### M3-D — Refresh and resume

Restore an active Practice session after refresh.

### M3-E — Practice history

Provide a history view.

### M3-F — Practice end-to-end test

Cover login, child selection, starting Practice with all three question types, refresh/resume, finish, and result.

## PHASE 7 — M4 Tryout Product

### M4-A — Pure Tryout domain

Define immutable versions once used or published, server-authoritative timing, attempt lifecycle IN_PROGRESS/SUBMITTED/EXPIRED/INVALIDATED, navigation, mark/unmark, and autosave semantics.

### M4-B — startTryout

Resolve ownership, access, and version, then set server timestamps and expires_at.

### M4-C — Safe pre-submit projection

Never return correctness, answer keys, or explanations before submission.

### M4-D — Idempotent answer and mark operations

Implement idempotent saveTryoutAnswer and toggleQuestionMark.

### M4-E — Navigation and resume

Support previous/next, answered/unanswered/marked/review states, and resume. Compute remaining time as expires_at minus server time.

### M4-F — Transactional submit

Verify and lock the attempt, evaluate, score, snapshot the result, update analytics aggregates, set SUBMITTED, and commit in one transaction. A second submit returns the existing result.

### M4-G — Tryout result

Show score, accuracy, correct count, subject/domain/topic/competency breakdowns, and explanations only after submit.

### M4-H — Tryout end-to-end test

Cover start, answer, mark, navigation, refresh/resume, timer, submit, double-submit, result, and explanation review.

## PHASE 8 — M5 Analytics and Recommendation

### M5-A — Rebuildable aggregates

Update or rebuild topic and competency aggregates from raw history.

### M5-B — Performance bands

Use these bands: below 50 Perlu Fokus; 50–69.99 Berkembang; 70–84.99 Baik; 85 and above Dikuasai.

### M5-C — Rule-based recommendation

Do not use AI in this checkpoint. Require attempted_count >= 5. Prioritize lower accuracy, then larger evidence, then recency. Do not make strong claims from tiny samples.

### M5-D — Student dashboard

Provide overall_progress, continue_learning, weak_topics, latest_tryout, recommendation, and recent_activity through the dashboard service and UI.

## PHASE 9 — M6 Parent Experience

### M6-A — Parent PIN

Hash the PIN and implement attempt limits/lockout. Never store it in plaintext.

### M6-B — Parent summary service

Implement getParentSummary with activity days, questions, Practice, accuracy, latest and previous Tryout, strong and weak topics, and recommended actions.

### M6-C — Parent interface

Build a simple, actionable parent UI, not an analytics console.

## PHASE 10 — M7 Freemium and Commerce

### M7-A — Central access rules

Centralize canAccessLesson, canAccessPractice, and canAccessTryout. Do not scatter premium checks through the application.

### M7-B — Season and entitlement rules

Implement active season, free/premium access, and expiry.

### M7-C — Free value flow

Provide free lesson → Practice → mini Tryout → basic result → upgrade. Do not make registration lead directly to a paywall.

### M7-D — Payment provider architecture gate

Stop, compare options, propose an ADR, and request approval. Do not choose a provider autonomously. After approval, implement sandbox payment, webhook, purchase, entitlement, idempotency, and refund handling.

## PHASE 11 — 0010_indexes_and_integrity_review

Run this review only after real query patterns exist. Review foreign-key actions, query plans, missing and duplicate indexes, nullability, enum coverage, referential gaps, and historical integrity.

Revisit these known debts:

- Practice answer → snapshot database constraint
- Tryout answer → Tryout version/item membership
- season foreign key
- historical published-content immutability

Add constraints only when justified.

## PHASE 12 — M8 Product Hardening

### M8-A — Progressive Web App

Add a manifest, icons, installability, basic cache, and offline fallback. Do not cache the full question bank or sensitive assessment data.

### M8-B — Security audit

Audit authentication, authorization, IDOR, answer leakage, CSRF, XSS, rate limiting, sessions, headers/CSP, secrets/logging, and payment webhooks.

### M8-C — Accessibility

Check semantic HTML, keyboard operation, focus, labels, alt text, contrast, and status communication that does not depend on color alone.

### M8-D — Mobile and device QA

Test representative small and large phones, tablet, and desktop.

### M8-E — Performance

Review Core Web Vitals, query counts, N+1 queries, payloads, images, fonts, bundles, and caching.

## PHASE 13 — Content Scaling

Scale only after the renderer, admin import/preview/editorial workflow, media, Practice, and Tryout are stable.

Scale in stages: 40 → 100 → 300 → 600+ questions.

At every stage, QA taxonomy, answer correctness, explanation quality, duplicate detection, difficulty distribution, and multimodal rendering.

## PHASE 14 — Final Vertical Slice Certification

Certify this real end-to-end flow:

Create Parent → Create Child → Math lesson → 10 Math Practice questions → Indonesian lesson → 10 Indonesian Practice questions → mini Tryout → refresh/resume → submit → score → weak topic → recommendation → parent summary.

Do not substitute mock-only services or data for the production architecture.

## PHASE 15 — Production Readiness

Before production:

- migrations replay reproducibly
- fresh database replay passes
- backup and recovery are documented
- Preview end-to-end tests pass
- CI passes
- security and content QA pass
- payment sandbox passes if payment is enabled
- no secrets are committed to Git

Production database migration or deployment requires explicit authorization.

Deployment sequence: recovery readiness → environment verification → migration → application deploy → health check → critical smoke test → monitoring.

## Mandatory validation per checkpoint

Create docs/validation/<checkpoint>-validation.md for architecture-sensitive checkpoints. Record base SHA, branch, files, sub-agent tasks and dispositions, tests, database target, migration state, cleanup, warnings, stop boundary, and final SHA.

The lead agent runs final gates. Baseline gates:

- pnpm install --frozen-lockfile
- pnpm lint
- pnpm typecheck
- pnpm build
- relevant tests
- git diff --check

Run heavy gates serially on Windows.

## Git safety

For each checkpoint: start from clean main → fetch/prune → fast-forward only → feature branch → small sub-agent tasks → integrate → test → commit → push → validation → safe merge/fast-forward.

Forbidden: reset --hard, clean, force push, silent stash, history rewrite, and editing old applied migrations.

## Progress gates

1. 0006 complete
2. M0 Foundation complete
3. 0007–0009 complete
4. Content Engine usable
5. Lesson vertical slice usable
6. Practice end-to-end usable
7. Tryout end-to-end usable
8. Analytics/recommendation usable
9. Parent mode usable
10. Freemium/entitlement usable
11. PWA/security/QA PASS
12. Production-ready V1

## V1 Definition of Done

All of the following must be true:

- parent can register and log in
- parent can create and select a child
- lessons work and progress persists
- all question types render
- Practice gives immediate feedback and can resume
- Tryout hides answers before submit, survives refresh, uses a server-authoritative timer, saves answers idempotently, and submits transactionally/idempotently
- results are reproducible
- analytics can be rebuilt from raw history
- recommendations respect the evidence threshold
- parent summary works
- free/premium access is enforced server-side
- admin content management/import workflow works
- PWA is installable
- mobile critical flows pass
- CI is green
- Preview works
- security audit passes
- fresh database replay passes
- production deployment and recovery procedure exists

Only then call TKA SD V1 complete.

Work checkpoint-by-checkpoint; do not build everything at once. Never use Antigravity. Never mutate Production without explicit authorization. Never invent unsupported product rules.
