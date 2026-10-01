# TKA SD Web App
## Implementation Specification V1.0

**Status:** Proposed Implementation Baseline  
**Parent document:** Technical & Product Blueprint — Source of Truth V1.0  
**Tanggal:** 1 Oktober 2026  
**Target:** MVP / V1  
**Platform:** Mobile-first Web App / PWA

---

# 1. Purpose

Dokumen ini menerjemahkan Product Blueprint menjadi spesifikasi yang dapat langsung digunakan untuk:

- database design;
- repository bootstrap;
- backend implementation;
- frontend implementation;
- admin CMS;
- content ingestion;
- QA;
- delegation ke Codex/developer.

Dokumen Blueprint tetap menjadi authority untuk scope produk.

Implementation Specification menentukan **bagaimana scope tersebut dibangun**.

---

# 2. Architecture Decision Summary

Stack V1 dikunci sebagai:

```text
Language
TypeScript

Framework
Next.js App Router

UI
React
Tailwind CSS

Hosting
Vercel

Database
Neon PostgreSQL

ORM / Schema
Drizzle ORM

Validation
Zod

Authentication
Neon Managed Auth

Object Storage
Neon Object Storage

Testing
Vitest
Playwright

Package Manager
pnpm
```

Prinsip utama:

```text
Browser
   │
   ▼
Next.js
   │
   ├── Server Components
   ├── Server Actions
   ├── Route Handlers
   └── Domain Services
          │
          ▼
      PostgreSQL
```

Browser tidak memiliki akses langsung ke database.

---

# 3. Application Architecture

Aplikasi menggunakan **modular monolith**.

Tidak menggunakan microservices pada V1.

```text
                    WEB / PWA
                        │
                        ▼
                    NEXT.JS
                        │
       ┌────────────────┼────────────────┐
       │                │                │
       ▼                ▼                ▼
     AUTH            APPLICATION       ROUTES
                       SERVICES
                          │
          ┌───────────────┼───────────────┐
          │               │               │
          ▼               ▼               ▼
       CONTENT         LEARNING       ASSESSMENT
          │               │               │
          └───────────────┼───────────────┘
                          ▼
                     DATA ACCESS
                          │
                          ▼
                       NEON
                PostgreSQL + Storage
```

Keuntungan:

- sederhana;
- mudah di-deploy;
- mudah diuji;
- murah;
- tetap memiliki batas domain yang jelas;
- dapat dipecah nanti jika skala memerlukan.

---

# 4. Repository Structure

Baseline:

```text
/
├── src/
│   ├── app/
│   │   ├── (marketing)/
│   │   ├── (auth)/
│   │   ├── app/
│   │   ├── parent/
│   │   ├── admin/
│   │   └── api/
│   │
│   ├── components/
│   │   ├── ui/
│   │   ├── learning/
│   │   ├── questions/
│   │   ├── tryout/
│   │   ├── dashboard/
│   │   └── admin/
│   │
│   ├── domains/
│   │   ├── identity/
│   │   ├── taxonomy/
│   │   ├── content/
│   │   ├── practice/
│   │   ├── assessment/
│   │   ├── analytics/
│   │   ├── entitlement/
│   │   └── commerce/
│   │
│   ├── db/
│   │   ├── schema/
│   │   ├── migrations/
│   │   ├── queries/
│   │   └── index.ts
│   │
│   ├── lib/
│   │   ├── auth/
│   │   ├── validation/
│   │   ├── security/
│   │   ├── storage/
│   │   └── utils/
│   │
│   └── config/
│
├── scripts/
│   ├── seed/
│   ├── import/
│   └── maintenance/
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── docs/
│   ├── blueprint/
│   ├── implementation/
│   └── adr/
│
└── drizzle/
```

Business logic tidak ditempatkan langsung di React components.

---

# 5. Environment Model

Tiga environment:

```text
LOCAL / DEVELOPMENT
PREVIEW / STAGING
PRODUCTION
```

Setiap environment memiliki:

- database connection sendiri;
- auth configuration sendiri;
- storage namespace sendiri;
- environment variables sendiri.

Production database **tidak digunakan** oleh local development.

Preview deployment tidak boleh menggunakan write access ke production database.

---

# 6. ID & Time Conventions

Primary key:

```text
UUID
```

Digunakan untuk seluruh entity utama.

Public URL boleh menggunakan:

```text
slug
```

Contoh:

```text
/questions UUID internal

/belajar/pecahan-dasar
```

Semua timestamp:

```text
TIMESTAMPTZ
```

dan disimpan dalam UTC.

Display dikonversi ke timezone user.

---

# 7. Database Naming Convention

Table:

```text
snake_case
plural
```

Column:

```text
snake_case
```

Foreign key:

```text
<entity>_id
```

---

# 8. Official TKA Taxonomy Baseline

Taxonomy aplikasi harus mengikuti struktur asesmen resmi, tetapi tidak menyalin struktur dokumen pemerintah secara kaku jika hal itu membuat sistem sulit digunakan.

Untuk SD, mata pelajaran wajib:

```text
Bahasa Indonesia
Matematika
```

Matematika SD menggunakan elemen:

```text
Bilangan
Geometri dan Pengukuran
Data
```

Bahasa Indonesia SD berfokus pada membaca dengan:

```text
Teks Informasi
Teks Fiksi
```

dan kompetensi:

```text
Pemahaman Tekstual
Pemahaman Inferensial
Evaluasi dan Apresiasi
```

---

# 9. Taxonomy Data Model

## subjects

```text
id
code
name
slug
sort_order
is_active
created_at
updated_at
```

## domains

```text
id
subject_id
code
name
slug
description
sort_order
is_active
```

## topics

```text
id
domain_id
parent_topic_id nullable
code
name
slug
description
sort_order
is_active
```

Topic boleh hierarchical.

## competencies

```text
id
subject_id
code
name
description
sort_order
is_active
```

## indicators

```text
id
subject_id
topic_id nullable
competency_id
code
description
official_reference nullable
sort_order
is_active
```

Indicator adalah unit tagging terkecil untuk soal dan materi.

---

# 10. Cognitive Level

Enum:

```text
UNDERSTAND
APPLY
REASON
```

Display:

```text
Memahami
Mengaplikasikan
Bernalar
```

---

# 11. Difficulty

Enum editorial:

```text
EASY
MEDIUM
HARD
```

Difficulty V1 ditentukan oleh editor.

Di masa depan dapat ditambahkan:

```text
empirical_difficulty
discrimination
sample_size
```

tanpa mengganti editorial difficulty.

---

# 12. Stimulus Architecture

Stimulus dipisahkan dari question.

Alasannya:

- Bahasa Indonesia dapat memiliki beberapa soal dengan stimulus yang sama;
- gambar/tabel bisa dipakai beberapa soal;
- menghindari duplikasi konten;
- memudahkan versioning.

## stimuli

```text
id
subject_id
title nullable
stimulus_type
body_json
text_type nullable
source_type
status
version
created_at
updated_at
```

`stimulus_type`:

```text
TEXT
IMAGE
TABLE
GRAPH
MIXED
```

`text_type`:

```text
INFORMATION
FICTION
NULL
```

---

# 13. Structured Content Blocks

Stimulus, lesson, dan explanation tidak disimpan sebagai HTML mentah.

Gunakan block JSON terkontrol.

```json
[
  {"type": "paragraph", "text": "..."},
  {"type": "image", "assetId": "..."},
  {"type": "table", "columns": [], "rows": []}
]
```

Allowed blocks V1:

```text
paragraph
heading
callout
image
table
formula
list
```

---

# 14. Question Types

Engine mendukung:

```text
SINGLE_CHOICE
MULTI_SELECT
CATEGORY
```

- `SINGLE_CHOICE`: satu jawaban benar.
- `MULTI_SELECT`: lebih dari satu pilihan benar.
- `CATEGORY`: setiap pernyataan dipetakan ke salah satu kategori, misalnya Benar/Salah.

---

# 15. questions Table

```text
id
code
subject_id
domain_id
topic_id
primary_competency_id
primary_indicator_id nullable
stimulus_id nullable

question_type
cognitive_level
difficulty
usage_type

question_body_json
explanation_body_json

status
version

source_type
source_reference nullable

created_by
reviewed_by nullable
verified_by nullable

created_at
updated_at
published_at nullable
archived_at nullable
```

---

# 16. Question Usage Type

Enum:

```text
PRACTICE
ASSESSMENT
BOTH
```

Tryout generator default:

```text
ASSESSMENT + BOTH
```

Practice generator default:

```text
PRACTICE + BOTH
```

---

# 17. Question Status

Enum:

```text
DRAFT
IN_REVIEW
VERIFIED
PUBLISHED
ARCHIVED
```

Allowed transitions:

```text
DRAFT
  ↓
IN_REVIEW
  ↓
VERIFIED
  ↓
PUBLISHED
  ↓
ARCHIVED
```

Jika published question perlu perubahan substantif: **buat version baru**.

---

# 18. question_options

Untuk SINGLE_CHOICE dan MULTI_SELECT:

```text
id
question_id
option_key
body_json
is_correct
sort_order
```

Jumlah opsi fleksibel.

---

# 19. category_statements

```text
id
question_id
statement_body_json
sort_order
```

# 20. category_choices

```text
id
question_id
code
label
sort_order
```

# 21. category_answers

```text
statement_id
category_choice_id
```

---

# 22. Question Tags

```text
tags
id
name
slug
```

```text
question_tags
question_id
tag_id
```

Tags digunakan untuk discovery/editing, bukan taxonomy utama.

---

# 23. Media Assets

```text
media_assets

id
storage_key
mime_type
asset_type
width nullable
height nullable
file_size
alt_text
caption nullable
source_type
source_reference nullable
created_by
created_at
```

`asset_type`:

```text
IMAGE
ILLUSTRATION
DIAGRAM
GRAPH
```

Database tidak menyimpan file binary.

---

# 24. Lesson Model

## lessons

```text
id
code
subject_id
domain_id
topic_id
title
slug
summary
estimated_minutes
status
version
is_free
created_by
reviewed_by nullable
published_at nullable
created_at
updated_at
```

## lesson_blocks

```text
id
lesson_id
block_type
content_json
sort_order
```

Allowed:

```text
INTRO
OBJECTIVE
CONTENT
EXAMPLE
TIP
CHECKPOINT
SUMMARY
CTA
```

---

# 25. Lesson Progress

```text
lesson_progress

id
child_profile_id
lesson_id
status
started_at
completed_at nullable
last_block_index
updated_at
```

Status:

```text
NOT_STARTED
IN_PROGRESS
COMPLETED
```

Unique:

```text
(child_profile_id, lesson_id)
```

---

# 26. Identity Model

Authentication entity dan profile entity dipisahkan.

## users

```text
id
auth_provider_user_id
email
display_name
role
created_at
updated_at
last_login_at
```

Role:

```text
PARENT
ADMIN
```

Tidak ada STUDENT login role V1.

---

# 27. Child Profiles

```text
child_profiles

id
parent_user_id
display_name
grade
avatar_key nullable
status
created_at
updated_at
```

Grade V1 mendukung 4, 5, 6.

---

# 28. Active Child Context

Browser menyimpan active child context dalam secure session/cookie.

Server wajib memvalidasi ownership child profile pada setiap request.

---

# 29. Parent PIN

```text
parent_pins

user_id
pin_hash
failed_attempts
locked_until nullable
updated_at
```

PIN tidak pernah disimpan plaintext.

---

# 30. Practice Architecture

## practice_sessions

```text
id
child_profile_id
subject_id
topic_id nullable
status
question_target
questions_answered
correct_count
started_at
completed_at nullable
last_activity_at
```

Status:

```text
ACTIVE
COMPLETED
ABANDONED
```

## practice_session_items

```text
practice_session_id
question_id
position
```

Session menyimpan snapshot question IDs agar reproducible.

## practice_answers

```text
id
practice_session_id
question_id
response_json
is_correct
score_fraction
answered_at
response_time_ms nullable
```

---

# 31. Practice Item Selection

Server:

1. memilih hanya question `PUBLISHED`;
2. usage `PRACTICE` atau `BOTH`;
3. sesuai subject/topic;
4. memprioritaskan soal yang belum sering dilihat;
5. randomisasi terkontrol;
6. menyimpan snapshot question IDs.

---

# 32. Practice Answer Flow

```text
GET question
→ tidak mengandung answer key

POST answer
→ validate
→ evaluate
→ save
→ update aggregates
→ return result + explanation
```

---

# 33. Assessment / Tryout Structure

## tryouts

```text
id
code
title
description
season_id
status
is_free
created_at
updated_at
```

## tryout_versions

```text
id
tryout_id
version_number
duration_seconds
instructions_json
published_at
created_at
```

Versi yang sudah digunakan siswa bersifat immutable.

## tryout_items

```text
id
tryout_version_id
question_id
position
section_code nullable
```

## tryout_attempts

```text
id
tryout_version_id
child_profile_id
status
started_at
expires_at
submitted_at nullable
score nullable
accuracy nullable
correct_count nullable
answered_count
last_activity_at
```

Status:

```text
IN_PROGRESS
SUBMITTED
EXPIRED
INVALIDATED
```

---

# 34. Timer Authority

Timer authoritative berada di server.

```text
remaining_time = expires_at - server_time
```

Browser clock tidak boleh menentukan deadline.

---

# 35. Autosave

## tryout_answers

```text
id
tryout_attempt_id
question_id
response_json
is_marked
saved_at
evaluated_at nullable
is_correct nullable
score_fraction nullable
```

Autosave harus idempotent.

---

# 36. Submit Tryout

Submit dilakukan melalui transaction:

```text
verify attempt state
↓
lock attempt
↓
evaluate all answers
↓
calculate score
↓
write aggregate stats
↓
set SUBMITTED
↓
commit
```

Submit kedua mengembalikan existing result.

---

# 37. Scoring

V1:

- SINGLE_CHOICE: benar 1, salah 0.
- MULTI_SELECT: exact match 1, selain itu 0.
- CATEGORY: jumlah statement benar / total statement.

Final score:

```text
total earned fraction
/
total available fraction
× 100
```

Jika kebijakan resmi berubah, scoring policy harus versioned.

---

# 38. Result Snapshot

```text
tryout_results

attempt_id
score
accuracy
subject_breakdown_json
domain_breakdown_json
topic_breakdown_json
competency_breakdown_json
generated_at
scoring_version
```

---

# 39. Analytics Aggregates

## student_topic_stats

```text
child_profile_id
topic_id
attempted_count
correct_equivalent
accuracy
last_attempt_at
updated_at
```

## student_competency_stats

```text
child_profile_id
competency_id
attempted_count
correct_equivalent
accuracy
last_attempt_at
updated_at
```

Raw answers tetap disimpan.

---

# 40. Recommendation Engine

Rule-based V1.

Minimum evidence:

```text
attempted_count >= 5
```

Default bands:

```text
< 50      NEEDS_FOCUS
50–69.99  DEVELOPING
70–84.99  GOOD
>= 85     MASTERED
```

Jika beberapa topik sama, prioritaskan accuracy terendah, evidence terbesar, lalu activity terbaru.

---

# 41. Student Dashboard Service

```text
getStudentDashboard(childProfileId)
```

Output:

```text
overall_progress
continue_learning
weak_topics[]
latest_tryout
recommendation
recent_activity
```

---

# 42. Parent Summary Service

```text
getParentSummary(parentUserId, childProfileId)
```

Output:

```text
activity_days_7d
questions_answered_7d
practice_sessions_7d
accuracy_7d
latest_tryout
previous_tryout
strong_topics[]
weak_topics[]
recommended_actions[]
```

---

# 43. Season

```text
seasons

id
code
name
starts_at
ends_at
premium_access_ends_at
status
created_at
updated_at
```

Status:

```text
UPCOMING
ACTIVE
ENDED
```

---

# 44. Plans & Entitlements

## plans

```text
id
code
name
season_id nullable
price_idr
status
created_at
```

## entitlements

```text
id
child_profile_id
plan_id
season_id nullable
status
starts_at
ends_at nullable
source
created_at
```

Access check selalu server-side.

---

# 45. Purchases

```text
purchases

id
user_id
child_profile_id
plan_id
season_id nullable
provider
provider_reference nullable
amount_idr
status
created_at
paid_at nullable
updated_at
```

Status:

```text
PENDING
PAID
FAILED
REFUNDED
```

Payment provider belum dikunci.

---

# 46. Routes

## Student

```text
/app
/app/belajar
/app/belajar/[subject]
/app/belajar/[subject]/[lessonSlug]
/app/latihan
/app/latihan/[topicSlug]
/app/latihan/session/[sessionId]
/app/tryout
/app/tryout/[tryoutId]
/app/tryout/[tryoutId]/attempt/[attemptId]
/app/tryout/[tryoutId]/result/[attemptId]
/app/riwayat
/app/profil
```

## Parent

```text
/parent
/parent/laporan
/parent/premium
/parent/account
/parent/security
```

## Admin

```text
/admin
/admin/taxonomy
/admin/lessons
/admin/questions
/admin/stimuli
/admin/media
/admin/tryouts
/admin/import
/admin/users
/admin/settings
```

## Auth

```text
/login
/register
/onboarding
/select-profile
```

---

# 47. Route Authorization

```text
/app/*
authenticated parent + owned active child

/parent/*
authenticated parent + parent verification where sensitive

/admin/*
ADMIN
```

Authorization wajib server-side.

---

# 48. Core Service Contracts

Identity:

```text
createChildProfile()
setActiveChild()
verifyParentPin()
```

Learning:

```text
getLesson()
startLesson()
updateLessonProgress()
completeLesson()
```

Practice:

```text
createPracticeSession()
getPracticeQuestion()
submitPracticeAnswer()
completePracticeSession()
```

Assessment:

```text
startTryout()
getTryoutAttempt()
saveTryoutAnswer()
toggleQuestionMark()
submitTryout()
getTryoutResult()
```

Analytics:

```text
getStudentDashboard()
getParentSummary()
getTopicPerformance()
```

Entitlement:

```text
canAccessLesson()
canAccessPractice()
canAccessTryout()
```

---

# 49. Validation & Errors

Semua external input menggunakan Zod.

Stable error codes:

```text
AUTH_REQUIRED
FORBIDDEN
NOT_FOUND
INVALID_INPUT
ENTITLEMENT_REQUIRED
ATTEMPT_EXPIRED
ATTEMPT_ALREADY_SUBMITTED
CONTENT_NOT_PUBLISHED
RATE_LIMITED
INTERNAL_ERROR
```

---

# 50. Database Integrity

Gunakan transaction + unique constraints + idempotency pada critical flows.

Minimum indexes:

```text
child_profiles(parent_user_id)
questions(subject_id, topic_id, status)
questions(status, usage_type)
practice_sessions(child_profile_id, started_at)
practice_answers(practice_session_id)
tryout_attempts(child_profile_id, started_at)
tryout_answers(tryout_attempt_id)
student_topic_stats(child_profile_id)
entitlements(child_profile_id, status)
purchases(provider_reference)
```

Historis tidak di-hard-delete; gunakan archive/revoke/invalidate.

---

# 51. Content Import

Format utama: JSON.

CSV untuk question sederhana.

Flow:

```text
upload
↓
schema validate
↓
taxonomy resolve
↓
duplicate check
↓
preview
↓
import as DRAFT
```

Tidak ada auto-publish.

Minimum duplicate detection: normalized question text hash.

---

# 52. Source Provenance

```text
OFFICIAL_REFERENCE
THIRD_PARTY_REFERENCE
ORIGINAL
REGENERATED
```

Konten scraped adalah bahan referensi, bukan otomatis publishable.

---

# 53. PWA, Security & Accessibility

PWA V1:

```text
manifest
icons
installable shell
basic cache
offline fallback
```

Tidak menyimpan seluruh question bank atau full tryout secara offline.

Server mengontrol ownership, roles, answer key, score, entitlement, timer, publishing, dan payments.

Accessibility minimum:

- semantic HTML;
- keyboard navigation;
- visible focus;
- alt text;
- adequate contrast;
- form labels;
- status tidak hanya mengandalkan warna.

---

# 54. Testing

Unit:

```text
scoring
recommendation
entitlement
validation
```

Integration:

```text
database services
practice submission
tryout submission
publishing
```

E2E:

```text
parent registration
child onboarding
lesson
practice
tryout
result
parent summary
admin publish
```

Critical smoke flow:

```text
Create Parent
↓
Create Child
↓
Open Lesson
↓
Complete Lesson
↓
Start Practice
↓
Answer
↓
See Explanation
↓
Start Tryout
↓
Refresh
↓
Resume
↓
Submit
↓
See Result
↓
Weak Topic
↓
Recommendation
↓
Parent Report
```

---

# 55. Seed Data

Development seed:

```text
2 subjects
minimum taxonomy
2 Math lessons
2 Indonesian lessons
20 Math questions
20 Indonesian questions
all supported question types
1 mini tryout
1 admin
1 parent
1 child
```

---

# 56. Milestones

## M0 Foundation
Next.js, TypeScript strict, Tailwind, Drizzle, Neon, Auth, env validation, migrations, layouts, guards, tests.

## M1 Content Engine
Taxonomy, stimuli, lessons, media, questions, admin CRUD, publishing, import.

## M2 Student Learning
Child profile, dashboard shell, lessons, progress.

## M3 Practice
Session, selection, renderer, answer evaluation, explanation, history.

## M4 Tryout
Versioning, timer, navigation, marks, autosave, resume, submit, score, results.

## M5 Analytics
Aggregates, performance bands, recommendations, dashboard data.

## M6 Parent
Parent mode, PIN, summary, trends, weak topics, recommendations.

## M7 Freemium
Season, plan, entitlement, free flags, paywall, purchase abstraction.

## M8 QA
Security, content correctness, mobile, accessibility, performance, recovery, data integrity.

---

# 57. Definition of Ready for Content Scaling

Jangan impor ratusan soal sampai:

```text
question schema stable
all question types render
admin import works
preview works
editorial workflow works
media works
practice evaluation works
```

Scale secara bertahap:

```text
40 → 100 → 300 → 600+
```

---

# 58. Architecture Guardrails

Tanpa ADR, developer/Codex tidak boleh:

- mengganti PostgreSQL;
- mengganti account model;
- membuat child login independen;
- membuat microservices;
- menambahkan global state library tanpa kebutuhan;
- membuat browser → database direct access;
- mengubah scoring;
- mengubah freemium architecture;
- menambahkan AI;
- menambahkan teacher/school feature.

ADR wajib jika memilih payment provider, mengganti auth/storage, mengubah scoring, menambahkan sekolah/guru, AI, atau native app.

---

# 59. First Vertical Slice

```text
1 parent
↓
1 child
↓
1 Math lesson
↓
10 practice questions
↓
1 Bahasa Indonesia lesson
↓
10 practice questions
↓
1 mini tryout
↓
result
↓
weakness
↓
recommendation
↓
parent summary
```

Vertical slice menggunakan production architecture, bukan mock-only architecture.

---

# 60. Source-of-Truth Relationship

```text
Product Blueprint V1
        │
        ▼
Implementation Specification V1
        │
        ▼
ADR
        │
        ▼
Database Migrations
        │
        ▼
Code
```

---

# 61. Implementation Priority

```text
1. Data correctness
2. Content correctness
3. Assessment integrity
4. Security
5. Mobile usability
6. Performance
7. Visual polish
8. Nice-to-have
```

---

## IMPLEMENTATION SPECIFICATION V1.0 — BASELINE

Dokumen ini siap dijadikan dasar M0 Foundation, migrations, repository architecture, content schema, Codex delegation, implementation audit, dan QA.
