# TKA SD — Database ERD & Schema V1.0

**Status:** Implementation Baseline  
**Database:** PostgreSQL / Neon  
**ORM:** Drizzle ORM  
**ID strategy:** UUID  
**Time:** `timestamptz` UTC

## 1. Domain Groups

```text
IDENTITY
users
child_profiles
parent_pins

TAXONOMY
subjects
domains
topics
competencies
indicators
tags

CONTENT
media_assets
stimuli
lessons
lesson_blocks
questions
question_options
category_statements
category_choices
category_answers
question_tags

LEARNING
lesson_progress
practice_sessions
practice_session_items
practice_answers
student_topic_stats
student_competency_stats

ASSESSMENT
tryouts
tryout_versions
tryout_items
tryout_attempts
tryout_answers
tryout_results

COMMERCE
seasons
plans
entitlements
purchases

SYSTEM
app_settings
```

## 2. High-Level ERD

```text
users ──< child_profiles
  │
  └──── parent_pins

subjects ──< domains ──< topics
   │                       │
   └──< competencies       └──< indicators
                └──────────────^

stimuli ──< questions >── topics
                 │
                 ├──< question_options
                 ├──< category_statements ──< category_answers >── category_choices
                 ├──< question_tags >── tags
                 └── media via structured content references

lessons >── topics
   └──< lesson_blocks
child_profiles ──< lesson_progress >── lessons

child_profiles ──< practice_sessions
practice_sessions ──< practice_session_items >── questions
practice_sessions ──< practice_answers >── questions

tryouts ──< tryout_versions ──< tryout_items >── questions
child_profiles ──< tryout_attempts >── tryout_versions
tryout_attempts ──< tryout_answers >── questions
tryout_attempts ─── tryout_results

child_profiles ──< student_topic_stats >── topics
child_profiles ──< student_competency_stats >── competencies

seasons ──< plans
child_profiles ──< entitlements >── plans
users ──< purchases >── plans
```

## 3. Identity

### users

- `id uuid pk`
- `auth_provider_user_id text unique not null`
- `email citext unique not null`
- `display_name text not null`
- `role user_role not null default PARENT`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- `last_login_at timestamptz null`

Indexes: `email`, `auth_provider_user_id`.

### child_profiles

- `id uuid pk`
- `parent_user_id uuid fk users(id) on delete restrict`
- `display_name text not null`
- `grade smallint not null check grade between 1 and 6`
- `avatar_key text null`
- `status profile_status not null default ACTIVE`
- timestamps

Index: `(parent_user_id, status)`.

### parent_pins

- `user_id uuid pk fk users(id)`
- `pin_hash text not null`
- `failed_attempts integer not null default 0`
- `locked_until timestamptz null`
- `updated_at timestamptz not null`

## 4. Taxonomy

### subjects
`id`, `code unique`, `name`, `slug unique`, `sort_order`, `is_active`, timestamps.

### domains
`id`, `subject_id fk`, `code unique`, `name`, `slug`, `description`, `sort_order`, `is_active`.
Unique `(subject_id, slug)`.

### topics
`id`, `domain_id fk`, `parent_topic_id self-fk null`, `code unique`, `name`, `slug`, `description`, `sort_order`, `is_active`.
Unique `(domain_id, parent_topic_id, slug)` using appropriate null-safe strategy.

### competencies
`id`, `subject_id fk`, `code unique`, `name`, `description`, `sort_order`, `is_active`.

### indicators
`id`, `subject_id fk`, `topic_id fk null`, `competency_id fk`, `code unique`, `description`, `official_reference text null`, `sort_order`, `is_active`.

## 5. Media & Stimuli

### media_assets
- `id uuid pk`
- `storage_key text unique not null`
- `mime_type text not null`
- `asset_type asset_type not null`
- `width int null`
- `height int null`
- `file_size bigint not null check >= 0`
- `alt_text text not null`
- `caption text null`
- `source_type source_type not null`
- `source_reference text null`
- `created_by uuid fk users`
- `created_at`

### stimuli
- `id uuid pk`
- `subject_id uuid fk subjects`
- `title text null`
- `stimulus_type stimulus_type not null`
- `body_json jsonb not null`
- `text_type text_type null`
- `source_type source_type not null`
- `source_reference text null`
- `status content_status not null`
- `version integer not null default 1 check > 0`
- timestamps

Index `(subject_id, status)`.

## 6. Lessons

### lessons
- IDs/FKs: subject, domain, topic
- `code text unique`
- `title`, `slug`
- `summary`
- `estimated_minutes smallint check > 0`
- `status content_status`
- `version int`
- `is_free boolean default false`
- editorial user references
- timestamps

Unique `(subject_id, slug)`.

### lesson_blocks
- `id`
- `lesson_id fk`
- `block_type lesson_block_type`
- `content_json jsonb`
- `sort_order int`
Unique `(lesson_id, sort_order)`.

### lesson_progress
- `id`
- `child_profile_id fk`
- `lesson_id fk`
- `status lesson_progress_status`
- `started_at`
- `completed_at`
- `last_block_index`
- `updated_at`
Unique `(child_profile_id, lesson_id)`.

## 7. Questions

### questions
- `id uuid pk`
- `code text unique not null`
- taxonomy FKs
- `stimulus_id uuid null`
- `question_type`
- `cognitive_level`
- `difficulty`
- `usage_type`
- `question_body_json jsonb`
- `explanation_body_json jsonb`
- `status`
- `version`
- provenance
- editorial user references
- timestamps

Indexes:
- `(subject_id, topic_id, status)`
- `(status, usage_type)`
- `(primary_competency_id, status)`
- `(stimulus_id)`

Published question invariant:
- status PUBLISHED implies explanation non-empty;
- topic and competency must be set;
- valid answer definition exists for its type.

### question_options
`id`, `question_id`, `option_key`, `body_json`, `is_correct`, `sort_order`.
Unique `(question_id, option_key)`, `(question_id, sort_order)`.

### category_statements
`id`, `question_id`, `statement_body_json`, `sort_order`.
Unique `(question_id, sort_order)`.

### category_choices
`id`, `question_id`, `code`, `label`, `sort_order`.
Unique `(question_id, code)`.

### category_answers
`statement_id fk`, `category_choice_id fk`, composite PK.

### tags
`id`, `name`, `slug unique`.

### question_tags
composite PK `(question_id, tag_id)`.

## 8. Practice

### practice_sessions
- `id`
- `child_profile_id`
- `subject_id`
- `topic_id null`
- `status`
- counters
- timestamps

Index `(child_profile_id, started_at desc)`.

### practice_session_items
- `practice_session_id`
- `question_id`
- `position`
Composite PK `(practice_session_id, question_id)`.
Unique `(practice_session_id, position)`.

### practice_answers
- `id`
- `practice_session_id`
- `question_id`
- `response_json`
- `is_correct`
- `score_fraction numeric(5,4)` check 0..1
- `answered_at`
- `response_time_ms`
Unique `(practice_session_id, question_id)`.

## 9. Tryout

### tryouts
`id`, `code unique`, `title`, `description`, `season_id`, `status`, `is_free`, timestamps.

### tryout_versions
`id`, `tryout_id`, `version_number`, `duration_seconds`, `instructions_json`, `published_at`, `created_at`.
Unique `(tryout_id, version_number)`.

### tryout_items
`id`, `tryout_version_id`, `question_id`, `position`, `section_code`.
Unique `(tryout_version_id, position)` and `(tryout_version_id, question_id)`.

### tryout_attempts
- `id`
- `tryout_version_id`
- `child_profile_id`
- `status`
- `started_at`
- `expires_at`
- `submitted_at`
- `score numeric(5,2) null`
- `accuracy numeric(5,2) null`
- counters
- `last_activity_at`

Indexes:
- `(child_profile_id, started_at desc)`
- `(tryout_version_id, status)`.

### tryout_answers
- `id`
- `tryout_attempt_id`
- `question_id`
- `response_json`
- `is_marked`
- `saved_at`
- evaluation fields
Unique `(tryout_attempt_id, question_id)`.

### tryout_results
- `attempt_id pk/fk`
- score/accuracy
- breakdown JSON snapshots
- `generated_at`
- `scoring_version`

## 10. Analytics

### student_topic_stats
Composite unique `(child_profile_id, topic_id)`; counters, accuracy, timestamps.

### student_competency_stats
Composite unique `(child_profile_id, competency_id)`; counters, accuracy, timestamps.

Derived stats are rebuildable from raw answers. Raw answers are source data.

## 11. Commerce

### seasons
code unique, name, dates, status.

### plans
code unique, optional season, `price_idr bigint`, status.

### entitlements
child, plan, season, status, start/end, source.
Index `(child_profile_id, status, ends_at)`.

### purchases
user, child, plan, season, provider, provider_reference, `amount_idr bigint`, status, timestamps.
Unique provider reference when non-null.

## 12. System

### app_settings
- `key text pk`
- `value_json jsonb not null`
- `updated_at`
- `updated_by`

No secrets.

## 13. Enums

Recommended PostgreSQL enums or Drizzle check-backed enums:

- user_role: `PARENT`, `ADMIN`
- profile_status: `ACTIVE`, `ARCHIVED`
- content_status: `DRAFT`, `IN_REVIEW`, `VERIFIED`, `PUBLISHED`, `ARCHIVED`
- question_type: `SINGLE_CHOICE`, `MULTI_SELECT`, `CATEGORY`
- cognitive_level: `UNDERSTAND`, `APPLY`, `REASON`
- difficulty: `EASY`, `MEDIUM`, `HARD`
- usage_type: `PRACTICE`, `ASSESSMENT`, `BOTH`
- source_type: `OFFICIAL_REFERENCE`, `THIRD_PARTY_REFERENCE`, `ORIGINAL`, `REGENERATED`
- stimulus_type: `TEXT`, `IMAGE`, `TABLE`, `GRAPH`, `MIXED`
- text_type: `INFORMATION`, `FICTION`
- attempt status enums
- entitlement/purchase/season status enums

## 14. Transaction Boundaries

Wajib transaction:
1. submit tryout;
2. content publish/version operation;
3. entitlement activation from confirmed payment;
4. aggregate update when coupled to answer persistence.

## 15. Data Retention & Deletion

- Draft yang belum direferensikan: hard delete diizinkan admin.
- Published content: archive/version.
- Attempts/answers/results: tidak hard-delete melalui UI biasa.
- Purchase/entitlement: preserve history.
- Account deletion flow harus dirancang terpisah sebelum public launch sesuai privacy/legal requirements.

## 16. Schema Guardrails

1. Jangan menyimpan image binary di Postgres.
2. Jangan memasukkan correct answer ke materialized student payload.
3. Jangan duplikasi question ke setiap tryout.
4. Jangan menghitung dashboard dari seluruh raw history setiap page load.
5. Jangan membuat `student` sebagai auth user V1.
6. Jangan menaruh payment-provider-specific columns sebagai core product model selain generic provider/reference.
