# TKA SD — V1 Execution Status

This is the live checkpoint tracker for [V1 Master Execution Plan](V1_MASTER_EXECUTION_PLAN.md). Update it at the start and end of each checkpoint.

## Verified baseline

- Last verified GitHub baseline before this roadmap publication: origin/main at e7d63a8bddaa5306c6616973b88057561ad3d2c6, fetched on 2026-10-07.
- Last verified product checkpoint before the roadmap: M0-D.3b PASS, supported by docs/validation/M0-D.3b-validation.md.
- Current next checkpoint: M0-D.4a / 0006_tryout.
- Development Neon ledger at the last verified audit: 0000–0005 only. Recheck before database work.
- Production database: application schema was reported as not deployed at the last project audit. It was not queried during this documentation checkpoint; verify read-only before any dependent production planning.

Allowed status values: NOT_STARTED, IN_PROGRESS, BLOCKED, PASS, PASS_WITH_WARNING, FAILED.

Only mark work PASS when repository validation evidence supports it. Planned work remains NOT_STARTED until completed and validated.

## Checkpoint status

| Phase / checkpoint | Scope | Status | Evidence |
|---|---|---|---|
| Prior checkpoint M0-D.3b | Practice domain and service rules | PASS | docs/validation/M0-D.3b-validation.md |
| Phase 0 / G0 | Project rebaseline | NOT_STARTED | |
| Phase 1 / M0-D.4a | Tryout persistence / 0006_tryout | NOT_STARTED | |
| Phase 2 / M0-E1 | Authentication foundation | NOT_STARTED | |
| Phase 2 / M0-E2 | Application user sync | NOT_STARTED | |
| Phase 2 / M0-E3 | Route authorization | NOT_STARTED | |
| Phase 2 / M0-F1 | Child profile CRUD | NOT_STARTED | |
| Phase 2 / M0-F2 | Active child context | NOT_STARTED | |
| Phase 2 / M0-G1 | Student shell | NOT_STARTED | |
| Phase 2 / M0-G2 | Parent shell | NOT_STARTED | |
| Phase 2 / M0-G3 | Admin shell | NOT_STARTED | |
| Phase 2 / M0-G4 | Minimal UI primitives | NOT_STARTED | |
| Phase 2 / M0-H1 | Testing foundation | NOT_STARTED | |
| Phase 2 / M0-H2 | Continuous integration | NOT_STARTED | |
| Phase 2 / M0-H3 | Vercel Preview | NOT_STARTED | |
| Phase 2 / M0-H4 | Security baseline | NOT_STARTED | |
| Phase 2 / M0-H5 | Documentation | NOT_STARTED | |
| Phase 2 / M0 exit | M0 foundation acceptance | NOT_STARTED | |
| Phase 3 / M0-D.5a | 0007_analytics | NOT_STARTED | |
| Phase 3 / M0-D.6a | 0008_commerce | NOT_STARTED | |
| Phase 3 / M0-D.7a | 0009_app_settings | NOT_STARTED | |
| Phase 4 / M1-A | Question versioning ADR | NOT_STARTED | |
| Phase 4 / M1-B | Content repositories and services | NOT_STARTED | |
| Phase 4 / M1-C | Question editorial workflow | NOT_STARTED | |
| Phase 4 / M1-D | Lesson, stimulus, and media management | NOT_STARTED | |
| Phase 4 / M1-E | Import pipeline | NOT_STARTED | |
| Phase 4 / M1-F | Admin CMS | NOT_STARTED | |
| Phase 4 / M1-G | Initial development content | NOT_STARTED | |
| Phase 5 / M2-A | Lesson service | NOT_STARTED | |
| Phase 5 / M2-B | Lesson renderer | NOT_STARTED | |
| Phase 5 / M2-C | Mobile-first learning routes | NOT_STARTED | |
| Phase 5 / M2-D | Lesson progress resume | NOT_STARTED | |
| Phase 6 / M3-A | Public Practice server boundary | NOT_STARTED | |
| Phase 6 / M3-B | Practice question renderers | NOT_STARTED | |
| Phase 6 / M3-C | Practice flow | NOT_STARTED | |
| Phase 6 / M3-D | Practice refresh/resume | NOT_STARTED | |
| Phase 6 / M3-E | Practice history | NOT_STARTED | |
| Phase 6 / M3-F | Practice end-to-end test | NOT_STARTED | |
| Phase 7 / M4-A | Tryout domain and lifecycle | NOT_STARTED | |
| Phase 7 / M4-B | startTryout | NOT_STARTED | |
| Phase 7 / M4-C | Safe pre-submit projection | NOT_STARTED | |
| Phase 7 / M4-D | Idempotent answer and mark operations | NOT_STARTED | |
| Phase 7 / M4-E | Tryout navigation and resume | NOT_STARTED | |
| Phase 7 / M4-F | Transactional submit | NOT_STARTED | |
| Phase 7 / M4-G | Tryout result | NOT_STARTED | |
| Phase 7 / M4-H | Tryout end-to-end test | NOT_STARTED | |
| Phase 8 / M5-A | Rebuildable analytics aggregates | NOT_STARTED | |
| Phase 8 / M5-B | Performance bands | NOT_STARTED | |
| Phase 8 / M5-C | Rule-based recommendation | NOT_STARTED | |
| Phase 8 / M5-D | Student dashboard | NOT_STARTED | |
| Phase 9 / M6-A | Parent PIN | NOT_STARTED | |
| Phase 9 / M6-B | Parent summary service | NOT_STARTED | |
| Phase 9 / M6-C | Parent interface | NOT_STARTED | |
| Phase 10 / M7-A | Central access rules | NOT_STARTED | |
| Phase 10 / M7-B | Season and entitlement rules | NOT_STARTED | |
| Phase 10 / M7-C | Free value flow | NOT_STARTED | |
| Phase 10 / M7-D | Payment provider architecture gate | NOT_STARTED | |
| Phase 11 / 0010 | Index and integrity review | NOT_STARTED | |
| Phase 12 / M8-A | Progressive Web App | NOT_STARTED | |
| Phase 12 / M8-B | Security audit | NOT_STARTED | |
| Phase 12 / M8-C | Accessibility | NOT_STARTED | |
| Phase 12 / M8-D | Mobile and device QA | NOT_STARTED | |
| Phase 12 / M8-E | Performance | NOT_STARTED | |
| Phase 13 / Content-40 | First scaling stage | NOT_STARTED | |
| Phase 13 / Content-100 | Second scaling stage | NOT_STARTED | |
| Phase 13 / Content-300 | Third scaling stage | NOT_STARTED | |
| Phase 13 / Content-600+ | Fourth scaling stage | NOT_STARTED | |
| Phase 14 / Vertical slice | Final V1 user-flow certification | NOT_STARTED | |
| Phase 15 / Production readiness | Release and recovery readiness | NOT_STARTED | |

## Progress gates

| Gate | Acceptance | Status |
|---|---|---|
| 1 | 0006 complete | NOT_STARTED |
| 2 | M0 Foundation complete | NOT_STARTED |
| 3 | 0007–0009 complete | NOT_STARTED |
| 4 | Content Engine usable | NOT_STARTED |
| 5 | Lesson vertical slice usable | NOT_STARTED |
| 6 | Practice end-to-end usable | NOT_STARTED |
| 7 | Tryout end-to-end usable | NOT_STARTED |
| 8 | Analytics/recommendation usable | NOT_STARTED |
| 9 | Parent mode usable | NOT_STARTED |
| 10 | Freemium/entitlement usable | NOT_STARTED |
| 11 | PWA/security/QA PASS | NOT_STARTED |
| 12 | Production-ready V1 | NOT_STARTED |

## Known warnings/debts

1. Question and published-content historical versioning is unresolved and must be decided before CMS scaling.
2. Practice answer-to-snapshot membership is enforced by the service, but there is no database composite foreign key.
3. The Tryout season foreign key cannot exist until seasons is created in 0008.
4. The root README remains stale unless updated in a future documentation checkpoint.
5. Antigravity is explicitly disallowed for future work because of instability; use native Codex sub-agents only for bounded tasks.

## How to update this tracker

Update the tracker when a checkpoint starts and ends. Record the checkpoint's commit SHA and link its validation document before marking the status PASS or PASS_WITH_WARNING. If work is blocked or fails, record the reason and supporting evidence. Do not mark planned work as complete.
