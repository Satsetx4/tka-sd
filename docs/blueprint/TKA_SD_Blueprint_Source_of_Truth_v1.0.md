# TKA SD Web App
## Technical & Product Blueprint — Source of Truth V1.0

**Status:** Approved Baseline  
**Tanggal:** 1 Oktober 2026  
**Tahap:** Pre-development  
**Target:** MVP / V1  
**Platform:** Mobile-first Web App / PWA

---

# 1. Tujuan Dokumen

Dokumen ini adalah **Source of Truth** untuk pengembangan produk persiapan TKA SD.

Semua keputusan mengenai:

- scope produk;
- fitur;
- user flow;
- arsitektur teknis;
- database;
- bank soal;
- materi;
- latihan;
- tryout;
- dashboard;
- akun siswa/orang tua;
- freemium;
- admin;
- keamanan;
- analytics;
- dan milestone development

harus merujuk pada dokumen ini.

Jika terdapat konflik antara implementasi dan dokumen ini, implementasi dianggap perlu diperiksa kembali kecuali sudah ada keputusan perubahan resmi.

---

# 2. Product Vision

Produk adalah:

> **Web app persiapan TKA SD yang membantu siswa belajar materi, mengerjakan latihan soal dengan pembahasan, mengikuti simulasi tryout, memahami kelemahan mereka, dan meningkatkan kesiapan menghadapi TKA.**

Orang tua berperan sebagai:

> **pemilik akun, pembeli layanan, dan pemantau perkembangan belajar anak.**

Produk **bukan**:

- LMS sekolah;
- marketplace;
- aplikasi guru;
- platform video course;
- jejaring sosial;
- AI tutor;
- aplikasi sekolah;
- aplikasi native Android/iOS.

Hal-hal tersebut berada di luar scope V1.

---

# 3. Keputusan Produk yang Sudah Dikunci

## 3.1 Customer

**Pembeli utama: orang tua.**

Anak adalah pengguna utama proses belajar.

Model:

```text
ORANG TUA
   │
   │ membeli akses
   ▼
AKUN
   │
   ▼
PROFIL ANAK
   │
   ▼
BELAJAR TKA
```

## 3.2 Monetisasi

Model:

**Freemium.**

User dapat mencoba produk sebelum membeli Premium.

## 3.3 Premium

Premium menggunakan model:

**akses per musim TKA.**

Bukan subscription bulanan.

Contoh konseptual:

```text
TKA Season 2027
├── mulai
├── periode belajar
├── periode TKA
└── berakhir
```

Tanggal season dikelola dari database/configuration dan tidak di-hardcode ke aplikasi.

## 3.4 Platform

Produk dibangun sebagai:

**Mobile-first responsive web application + PWA.**

Prioritas pengalaman:

```text
Smartphone  ★★★★★
Tablet      ★★★★★
Desktop     ★★★★☆
```

Tidak membuat aplikasi Android/iOS native pada V1.

---

# 4. North Star User Journey

Keseluruhan produk harus mendukung siklus:

```text
MATERI
   │
   ▼
LATIHAN
   │
   ▼
PEMBAHASAN
   │
   ▼
TRYOUT
   │
   ▼
ANALISIS HASIL
   │
   ▼
REKOMENDASI
   │
   └──────────────► kembali ke MATERI / LATIHAN
```

Jika fitur baru tidak membantu siklus tersebut, fitur tidak masuk V1 tanpa review scope.

---

# 5. User Roles

V1 hanya mengenal tiga role konseptual.

## Parent

Dapat:

- mendaftar;
- login;
- membuat profil anak;
- membeli Premium;
- mengatur akun;
- masuk ke mode siswa;
- melihat laporan anak;
- mengelola PIN orang tua.

## Student / Child Profile

Bukan akun authentication independen.

Child Profile digunakan untuk:

- belajar;
- latihan;
- tryout;
- melihat dashboard;
- melihat riwayat;
- menyimpan progress.

## Admin

Digunakan internal untuk:

- taxonomy;
- materi;
- soal;
- gambar/media;
- paket latihan;
- tryout;
- publishing;
- user support;
- quality assurance.

Tidak ada Guru dan Sekolah pada V1.

---

# 6. Authentication & Account Model

## 6.1 Parent Authentication

Metode awal:

- Google Sign-In;
- email + password.

Email anak tidak diwajibkan.

## 6.2 Child Profile

Setelah login:

```text
Parent Account
      │
      └── Child Profile
              │
              ├── nama
              ├── kelas
              ├── avatar
              └── learning data
```

Database sejak awal mendukung multiple child profiles meskipun UI V1 dapat membatasi aktivasi paket tertentu pada satu anak.

Hal ini mencegah redesign ketika multi-anak diperkenalkan kemudian.

## 6.3 Parent Mode Protection

Area orang tua dilindungi dengan:

- parent re-authentication; atau
- PIN orang tua.

PIN harus disimpan dalam bentuk hash.

Anak tidak boleh dapat:

- melihat billing;
- mengubah email;
- membeli paket;
- melihat pengaturan keamanan;
- menghapus account.

---

# 7. Sitemap

## Public

```text
/
├── tentang
├── fitur
├── harga
├── FAQ
├── login
└── daftar
```

Landing page tetap ringan pada V1.

## Student App

```text
/app
│
├── dashboard
├── belajar
│   ├── matematika
│   └── bahasa-indonesia
│
├── latihan
│   ├── matematika
│   └── bahasa-indonesia
│
├── tryout
│   ├── daftar
│   ├── pengerjaan
│   └── hasil
│
├── riwayat
└── profil
```

Menu utama maksimal:

```text
Dashboard
Belajar
Latihan
Tryout
Riwayat
```

## Parent

```text
/parent
│
├── dashboard
├── laporan-anak
├── akun
├── premium
└── pembayaran
```

## Admin

```text
/admin
│
├── dashboard
├── taxonomy
├── materi
├── soal
├── media
├── tryout
├── import
├── users
└── settings
```

---

# 8. Student Dashboard

Dashboard siswa bukan dashboard analitik kompleks.

Dashboard harus menjawab:

1. apa yang sudah saya lakukan?
2. bagaimana perkembangan saya?
3. apa yang masih lemah?
4. apa yang harus saya lakukan sekarang?

Komponen utama:

```text
Halo, Budi 👋

Progress persiapan
████████░░ 68%

LANJUTKAN BELAJAR
Pecahan
[ Lanjutkan ]

PERLU DITINGKATKAN
• Interpretasi Data
• Geometri
• Pemahaman Inferensial

TRYOUT TERAKHIR
Skor 76
↑ 8 poin

[ Lihat Hasil ]

REKOMENDASI BERIKUTNYA
Latihan Interpretasi Data
[ Mulai ]
```

Tidak menggunakan terlalu banyak grafik.

CTA berikutnya harus selalu jelas.

---

# 9. Learning Content

## 9.1 Prinsip

Materi bukan ebook.

Satu materi dirancang untuk sekitar:

**5–10 menit pembelajaran fokus.**

## 9.2 Struktur Materi

Setiap lesson minimal dapat memiliki:

```text
Judul

Tujuan belajar

Penjelasan konsep

Contoh

Visual jika diperlukan

Tips

Contoh soal

Pembahasan

CTA:
Mulai Latihan
```

Materi dapat mengandung:

- text;
- callout;
- gambar;
- tabel;
- diagram;
- formula;
- contoh soal.

---

# 10. Taxonomy

Seluruh sistem menggunakan satu taxonomy.

Struktur utama:

```text
SUBJECT
   │
   ▼
DOMAIN
   │
   ▼
TOPIC / SUBMATERI
   │
   ▼
COMPETENCY
   │
   ▼
INDICATOR
```

Contoh:

```text
Matematika
   │
   └── Bilangan
        │
        └── Pecahan
             │
             └── Pemecahan Masalah
                  │
                  └── Menggunakan operasi
                      pecahan dalam konteks
                      sehari-hari
```

Taxonomy digunakan oleh:

- materi;
- questions;
- latihan;
- tryout;
- scoring;
- recommendation;
- dashboard;
- parent report.

Taxonomy tidak boleh dibuat terpisah untuk setiap modul.

---

# 11. Question Bank

Question Bank adalah salah satu aset utama produk.

Target V1:

**600–800 soal berkualitas.**

Distribusi awal:

```text
Matematika
±300–400 soal

Bahasa Indonesia
±300–400 soal
```

Angka bukan target mutlak.

Kualitas lebih penting daripada kuantitas.

---

# 12. Question Types

Engine harus mendukung minimal:

- pilihan ganda;
- pilihan ganda kompleks / multiple selection.

Schema tidak boleh berasumsi bahwa:

```text
1 question = 4 pilihan
```

Question engine harus fleksibel.

---

# 13. Multimodal Question Support

Bank soal wajib mendukung:

```text
Text only

Text + image

Text + table

Text + diagram

Text + graph

Long passage

Shared stimulus
   │
   ├── Question A
   ├── Question B
   └── Question C
```

Gambar tidak disimpan sebagai binary di PostgreSQL.

File disimpan pada object storage.

Database hanya menyimpan metadata dan storage reference.

---

# 14. Question Data Model

Minimum data sebuah question:

```text
id

subject
domain
topic

competency
indicator

difficulty
cognitive_level

question_type

stimulus
question_text

answer_options

answer_rule

explanation

media

tags

usage_type

content_status

source_type

version

created_at
updated_at
```

---

# 15. Difficulty

V1 menggunakan editorial difficulty:

```text
EASY
MEDIUM
HARD
```

Difficulty belum dianggap sebagai nilai psychometric resmi.

Data siswa di masa depan dapat digunakan untuk menghitung empirical item difficulty.

---

# 16. Usage Type

Question harus dibedakan berdasarkan tujuan.

Minimal:

```text
PRACTICE
ASSESSMENT
BOTH
```

Prinsip:

- Practice digunakan untuk belajar.
- Assessment diprioritaskan untuk tryout.
- Soal tertentu boleh digunakan untuk keduanya bila diperlukan.

Tujuannya mengurangi kemungkinan siswa menemui seluruh soal tryout sebelumnya dalam latihan.

---

# 17. Question Editorial Workflow

Semua question mengikuti:

```text
DRAFT
   ↓
REVIEW
   ↓
VERIFIED
   ↓
PUBLISHED
```

Question tidak dapat digunakan siswa jika belum:

**PUBLISHED.**

Minimal sebelum published:

- pertanyaan diperiksa;
- opsi diperiksa;
- jawaban diperiksa;
- pembahasan diperiksa;
- taxonomy diperiksa;
- media diperiksa.

---

# 18. Explanation Requirement

**Semua question yang dipublikasikan wajib memiliki pembahasan.**

Tidak ada:

```text
Published Question
without
Explanation
```

Pembahasan harus:

- menggunakan bahasa yang sesuai siswa SD;
- menjelaskan proses;
- tidak hanya menyebut jawaban;
- menggunakan visual jika membantu;
- merujuk konsep terkait bila relevan.

---

# 19. Practice Mode

Tujuan Practice:

**belajar melalui soal.**

Flow:

```text
Pilih Materi
     │
     ▼
Mulai Latihan
     │
     ▼
Question
     │
     ▼
Submit Answer
     │
     ▼
Correct / Incorrect
     │
     ▼
Explanation
     │
     ▼
Next Question
```

Siswa menerima feedback setelah setiap soal.

---

# 20. Practice Session

Contoh:

```text
Pecahan

Soal 4 / 10

[stimulus]

[question]

A
B
C
D

[ Jawab ]
```

Setelah submit:

```text
Jawaban kamu: B

Jawaban benar: C

Pembahasan
...

Konsep:
Operasi Pecahan

[ Pelajari Materi ]
[ Berikutnya ]
```

---

# 21. Tryout Mode

Tryout adalah assessment.

Selama tryout siswa **tidak mendapatkan**:

- benar/salah;
- jawaban;
- pembahasan.

Flow:

```text
Tryout List
     │
     ▼
Instructions
     │
     ▼
Start
     │
     ▼
Timed Assessment
     │
     ▼
Review Answers
     │
     ▼
Submit
     │
     ▼
Score
     │
     ▼
Analysis
     │
     ▼
Review + Explanation
```

---

# 22. Tryout Interface

Harus mendukung:

```text
Timer

Question number

Answered

Unanswered

Marked / Ragu-ragu

Previous

Next

Review

Submit
```

Jawaban harus autosave.

Reload browser tidak boleh menghilangkan attempt.

---

# 23. Tryout Versioning

Tryout yang sudah pernah digunakan tidak boleh berubah diam-diam.

Model:

```text
Tryout
   │
   ├── Version 1
   └── Version 2
```

Attempt menyimpan:

```text
tryout_version_id
```

Dengan demikian histori siswa tetap reproducible.

---

# 24. Scoring V1

V1 **tidak menggunakan IRT**.

Gunakan scoring transparan dan mudah dipahami.

Minimal:

```text
correct_answers
total_questions
accuracy
score_0_100
```

Dashboard juga menghitung performa berdasarkan:

- subject;
- domain;
- topic;
- competency.

Skor platform tidak boleh diklaim sebagai:

**nilai resmi TKA pemerintah.**

---

# 25. Student Performance Bands

Default internal:

```text
< 50%
Perlu Fokus

50–69%
Berkembang

70–84%
Baik

>= 85%
Dikuasai
```

Label dapat diperbaiki melalui UX testing.

---

# 26. Recommendation Engine V1

Tidak menggunakan AI.

Engine menggunakan rule-based recommendation.

Input:

```text
accuracy

recent mistakes

question count

topic coverage

difficulty

recency
```

Contoh:

```text
Data Interpretation

Answered: 12
Correct: 5
Accuracy: 41.7%

→ Priority Recommendation
```

Jika sample terlalu kecil, sistem tidak boleh membuat klaim kuat.

Contoh:

```text
baru 1 soal dikerjakan
```

tidak cukup untuk mengatakan:

> “Kamu lemah pada topik ini.”

---

# 27. Parent Dashboard

Tujuan Parent Dashboard:

> Memberikan informasi sederhana dan actionable mengenai perkembangan anak.

Bukan analytics console.

---

# 28. Parent Dashboard Content

Minimum:

```text
Belajar minggu ini

Jumlah latihan

Jumlah soal

Accuracy

Tryout terakhir

Perubahan dari tryout sebelumnya

Materi terkuat

Materi yang perlu ditingkatkan

Saran belajar selanjutnya
```

Contoh:

```text
Perkembangan Budi

7 hari terakhir

Belajar
4 hari

Latihan
83 soal

Akurasi
72%

Tryout
76
↑ sebelumnya 68

Kuat
✓ Bilangan
✓ Pemahaman Tekstual

Perlu Ditingkatkan
• Interpretasi Data
• Geometri

Saran
Latihan Interpretasi Data
```

---

# 29. History

Siswa memiliki halaman Riwayat.

Minimal:

```text
LATIHAN

Pecahan
8/10
Kemarin


TRYOUT

Tryout #3
76

Tryout #2
68

Tryout #1
64
```

Riwayat dapat dibuka untuk melihat detail.

---

# 30. Freemium Model

Entitlement tidak boleh di-hardcode tersebar di UI.

Gunakan configuration / entitlement layer.

## Free

Target awal:

- beberapa materi;
- sekitar 30–50 soal;
- satu mini tryout;
- hasil dasar;
- dashboard dasar.

## Premium

Premium mendapatkan:

- seluruh materi;
- seluruh latihan;
- seluruh pembahasan;
- seluruh tryout;
- analisis lengkap;
- rekomendasi belajar;
- Parent Summary lengkap;
- akses sampai akhir season.

Batas final konten gratis dapat diubah tanpa deployment.

---

# 31. Paywall Philosophy

User gratis harus bisa memahami kualitas produk.

Jangan melakukan:

```text
Daftar
↓
langsung paywall
```

Lebih baik:

```text
Daftar
↓
Materi Gratis
↓
Latihan Gratis
↓
Mini Tryout
↓
Melihat manfaat
↓
Upgrade Premium
```

---

# 32. Admin CMS

Admin CMS adalah bagian wajib V1.

Konten tidak boleh bergantung pada developer untuk update sehari-hari.

---

# 33. Admin Question Management

Admin dapat:

```text
Create
Edit
Preview
Review
Verify
Publish
Unpublish
Archive
```

Filter:

- mapel;
- domain;
- topic;
- competency;
- difficulty;
- type;
- status;
- usage type.

---

# 34. Bulk Import

Wajib mendukung:

- CSV; dan/atau
- JSON.

Flow:

```text
Upload
   ↓
Parse
   ↓
Validate
   ↓
Preview Errors
   ↓
Import Draft
   ↓
Editorial Review
   ↓
Publish
```

Bulk import tidak boleh langsung publish.

---

# 35. Media Management

Media memiliki:

```text
id
type
storage_key
mime_type
width
height
alt_text
source_type
created_at
```

Supported:

- image;
- diagram;
- graph;
- illustration.

Media harus memiliki alt text jika relevan.

---

# 36. Technical Stack

Baseline:

```text
Frontend
Next.js

Hosting
Vercel

Backend
Next.js server layer

Database
Neon PostgreSQL

Authentication
Neon Auth

Object Storage
Neon Object Storage

Application Type
Responsive PWA
```

Prinsip:

**minimalkan jumlah vendor pada V1.**

---

# 37. Application Architecture

```text
                     Browser / PWA
                           │
                           ▼
                       Next.js
                           │
            ┌──────────────┼──────────────┐
            │              │              │
            ▼              ▼              ▼
       Application       Auth          API Layer
          Layer
            │
            └──────────────┬──────────────┘
                           ▼
                         Neon
              ┌────────────┼────────────┐
              │            │            │
              ▼            ▼            ▼
          PostgreSQL      Auth        Storage
```

Database credentials tidak pernah dikirim ke browser.

---

# 38. Environment Strategy

Minimal tiga environment:

```text
Development

Preview / Staging

Production
```

Development tidak menggunakan production data secara langsung.

Preview deployment tidak boleh merusak production database.

---

# 39. Core Database Domains

```text
IDENTITY

CONTENT

ASSESSMENT

LEARNING

COMMERCE

ANALYTICS
```

---

# 40. Core Tables

## Identity

```text
users

child_profiles

parent_pins
```

## Product

```text
seasons

plans

entitlements

purchases
```

## Taxonomy

```text
subjects

domains

topics

competencies

indicators
```

## Content

```text
lessons

lesson_blocks

media_assets

questions

question_options

question_media

question_tags
```

## Practice

```text
practice_sessions

practice_answers
```

## Tryout

```text
tryouts

tryout_versions

tryout_items

tryout_attempts

tryout_answers
```

## Learning

```text
lesson_progress

student_topic_stats

student_competency_stats
```

---

# 41. Key Entity Relationship

Conceptual ERD:

```text
User
 │
 └── ChildProfile
       │
       ├── LessonProgress
       │
       ├── PracticeSession
       │      └── PracticeAnswer
       │              │
       │              └── Question
       │
       ├── TryoutAttempt
       │      └── TryoutAnswer
       │              │
       │              └── Question
       │
       └── TopicStats


Question
 │
 ├── Subject
 ├── Domain
 ├── Topic
 ├── Competency
 ├── Indicator
 ├── QuestionOptions
 └── Media


User
 │
 └── Entitlement
        │
        └── Season
```

---

# 42. Question Schema Principle

Correct answer tidak boleh dikirim ke browser sebelum dibutuhkan.

Practice:

```text
GET question
→ no correct answer

POST answer
→ server evaluates

RETURN
correct / incorrect
+ explanation
```

Tryout:

```text
GET question
→ no answer

POST answer
→ save only

SUBMIT TRYOUT
→ server evaluates all
```

---

# 43. Attempt Persistence

Setiap answer disimpan segera.

Jika:

- browser refresh;
- connection terputus;
- PWA ditutup;

attempt tetap bisa dilanjutkan jika session masih valid.

---

# 44. PWA Policy

PWA memberikan:

- installable web app;
- home-screen icon;
- application shell caching;
- faster repeat visits.

Namun:

**seluruh Question Bank tidak boleh disimpan offline.**

Tujuan:

- keamanan;
- mengurangi scraping;
- mencegah answer leakage.

Offline full tryout bukan scope V1.

---

# 45. Security Principles

Minimum:

- HTTPS;
- server-side authorization;
- hashed passwords;
- hashed Parent PIN;
- secure cookies;
- CSRF protection sesuai architecture;
- rate limiting pada endpoint penting;
- database credentials server-only;
- role checking;
- input validation;
- upload validation;
- no correct-answer leakage;
- audit timestamps.

---

# 46. Child Privacy Principle

Karena produk digunakan anak:

**data minimization wajib.**

Untuk Child Profile, V1 cukup:

```text
display_name
grade
avatar
learning_data
```

Tidak meminta tanpa kebutuhan:

- alamat;
- nomor telepon anak;
- NISN;
- sekolah;
- tanggal lahir lengkap;
- lokasi presisi.

Orang tua adalah account holder.

---

# 47. Analytics Policy

Analytics produk boleh mengukur:

- page usage;
- learning events;
- completion;
- question performance;
- conversion.

Namun desain tidak bergantung pada invasive tracking.

Learning analytics utama berasal dari first-party application events.

---

# 48. Application Events

Contoh event internal:

```text
lesson_started
lesson_completed

practice_started
practice_answered
practice_completed

tryout_started
tryout_answer_saved
tryout_completed

recommendation_clicked

premium_viewed
purchase_started
purchase_completed
```

Event membantu evaluasi produk tanpa menyimpan informasi yang tidak diperlukan.

---

# 49. Content Source Classification

Setiap content memiliki provenance.

Minimum:

```text
OFFICIAL_REFERENCE

THIRD_PARTY_REFERENCE

ORIGINAL

REGENERATED
```

Konten hasil riset/scraping tidak otomatis dianggap boleh dipublikasikan secara komersial.

Produk komersial diprioritaskan menggunakan:

**content original yang dibuat berdasarkan blueprint kompetensi resmi.**

---

# 50. Content Quality Policy

Sebelum soal published:

```text
question validated

answer validated

explanation validated

taxonomy validated

media validated
```

Content accuracy adalah prioritas produk.

---

# 51. Performance Target

Target UX V1:

- mobile first;
- halaman utama terasa cepat pada koneksi seluler;
- navigation tidak terasa berat;
- gambar dioptimalkan;
- lazy loading;
- tidak mengirim payload Question Bank besar;
- list menggunakan pagination/cursor jika diperlukan.

Dashboard tidak menghitung seluruh histori secara brute-force pada setiap request.

---

# 52. Aggregated Learning Stats

Raw answer tetap disimpan.

Namun untuk dashboard digunakan rollup seperti:

```text
student_topic_stats

child_profile_id
topic_id

attempted
correct

accuracy

last_activity_at

updated_at
```

Tujuan:

dashboard cepat tanpa menghitung ulang ribuan answer setiap render.

---

# 53. Payment Architecture

Payment provider belum dikunci.

Application harus memiliki abstraction:

```text
Purchase
   │
   ├── provider
   ├── external_reference
   ├── amount
   ├── status
   └── entitlement
```

Status minimal:

```text
PENDING
PAID
FAILED
REFUNDED
```

Provider payment tidak boleh menentukan bentuk database utama.

---

# 54. Season Architecture

Contoh:

```text
season

id
name
start_at
premium_access_end_at
status
```

Premium entitlement:

```text
child_profile_id
season_id
plan
starts_at
ends_at
status
```

Dengan demikian sistem siap untuk:

```text
TKA 2027
TKA 2028
TKA 2029
```

tanpa membuat aplikasi baru.

---

# 55. Admin Configuration

Beberapa nilai harus configurable:

- active season;
- jumlah soal gratis;
- materi gratis;
- jumlah tryout gratis;
- premium price;
- homepage notice;
- maintenance mode;
- recommendation thresholds.

Hindari hardcoding business rules ke banyak komponen UI.

---

# 56. Non-Goals V1

Tidak dibangun:

```text
Teacher Dashboard

School Dashboard

Classroom Management

AI Tutor

AI Chat

Native Mobile App

Video Course Platform

Live Class

Leaderboard

Social Features

Forum

Badge System kompleks

Referral Program

Affiliate Program

Marketplace

IRT Scoring

Adaptive Learning kompleks

School SSO

WhatsApp Automation
```

Fitur tersebut memerlukan keputusan scope baru.

---

# 57. Content Target V1

Baseline:

```text
±40 lesson modules

600–800 questions

100% published question
memiliki explanation

5 full/major tryout packages

Bahasa Indonesia

Matematika
```

Tidak perlu menunggu 5.000 soal untuk launch.

---

# 58. MVP Definition of Done

MVP dianggap usable jika flow berikut berhasil end-to-end:

```text
Parent membuka website
        │
        ▼
Register
        │
        ▼
Create Child Profile
        │
        ▼
Masuk Student Mode
        │
        ▼
Belajar Materi
        │
        ▼
Mengerjakan Latihan
        │
        ▼
Melihat Pembahasan
        │
        ▼
Mengikuti Tryout
        │
        ▼
Melihat Hasil
        │
        ▼
Melihat Area Lemah
        │
        ▼
Mendapat Rekomendasi
        │
        ▼
Parent melihat Progress
```

Jika flow di atas belum bekerja baik, MVP belum selesai.

---

# 59. Development Milestones

## M0 — Foundation

Deliverables:

- repository;
- application skeleton;
- database;
- auth;
- environments;
- design primitives;
- taxonomy schema;
- migration system.

Exit criteria:

- local/dev/production deployment bekerja;
- user bisa login;
- migrations reproducible.

## M1 — Content Engine

Deliverables:

- taxonomy;
- question schema;
- lesson schema;
- media;
- admin;
- bulk import;
- publishing workflow.

Exit criteria:

admin dapat memasukkan materi dan question tanpa developer.

## M2 — Student Learning

Deliverables:

- child profile;
- student dashboard;
- lesson catalogue;
- lesson reader;
- lesson progress.

Exit criteria:

anak dapat login melalui account parent dan menyelesaikan materi.

## M3 — Practice Engine

Deliverables:

- question renderer;
- answer submission;
- explanation;
- practice sessions;
- practice history.

Exit criteria:

anak dapat menyelesaikan satu latihan lengkap dan progress tersimpan.

## M4 — Tryout Engine

Deliverables:

- tryout catalogue;
- instructions;
- timer;
- answer navigation;
- autosave;
- marking;
- submit;
- score;
- review.

Exit criteria:

refresh tidak menghilangkan jawaban dan tryout dapat diselesaikan end-to-end.

## M5 — Analytics & Recommendation

Deliverables:

- topic stats;
- competency stats;
- weakness detection;
- recommendation;
- student result dashboard.

Exit criteria:

rekomendasi berasal dari real answer data.

## M6 — Parent Experience

Deliverables:

- Parent Summary;
- Parent PIN;
- progress;
- tryout trend;
- weakness;
- recommendation.

Exit criteria:

orang tua dapat memahami perkembangan anak tanpa membuka detail teknis.

## M7 — Freemium & Premium

Deliverables:

- entitlement;
- paywall;
- season;
- purchase abstraction;
- premium unlock.

Exit criteria:

akses free/premium konsisten dan tidak bergantung pada client-side checks.

## M8 — QA & Pilot

Audit:

- answer correctness;
- explanation;
- mobile responsive;
- accessibility;
- security;
- performance;
- lost-session recovery;
- payment;
- analytics;
- content quality.

Exit criteria:

siap private pilot.

---

# 60. Acceptance Criteria — Critical

## Authentication

- Parent dapat register/login/logout.
- Child tidak membutuhkan email.
- Parent area terlindungi.
- Session aman.

## Content

- Admin dapat membuat/edit/publish lesson.
- Admin dapat membuat/edit/publish question.
- Draft tidak terlihat siswa.

## Practice

- Answer dinilai server-side.
- Pembahasan tampil setelah jawab.
- Progress tersimpan.
- Refresh tidak merusak session.

## Tryout

- Timer bekerja.
- Answers autosave.
- Question navigation bekerja.
- Correct answers tidak bocor sebelum submit.
- Result reproducible.
- Explanation tersedia setelah selesai.

## Dashboard

- Progress menggunakan real user data.
- Weakness berdasarkan sample memadai.
- Recommendation mengarah ke lesson/practice nyata.

## Parent

- Parent melihat progress anak.
- Anak tidak dapat masuk billing tanpa Parent verification.

## Premium

- Free limits bekerja.
- Premium unlock berdasarkan entitlement server-side.
- Expiry mengikuti season.

---

# 61. Product Principles

Seluruh tim mengikuti prinsip berikut:

```text
Kualitas > Kuantitas

Sederhana > Banyak fitur

Belajar > Sekadar nilai

Pembahasan > Jumlah soal

Actionable > Grafik

Mobile First > Desktop First

Correctness > Kecepatan publish

Server Authority > Client Trust

Privacy > Data collection
```

---

# 62. Technical Principles

1. Jangan mengirim data yang tidak diperlukan ke client.
2. Correct answer tetap server-side sampai waktunya.
3. Schema database harus versioned melalui migration.
4. Published assessment bersifat immutable/versioned.
5. UI tidak boleh berisi business rule penting yang hanya berjalan client-side.
6. Analytics berasal dari real events.
7. Content dan application logic dipisahkan.
8. Taxonomy adalah shared system, bukan duplikasi.
9. Raw attempts disimpan.
10. Derived analytics dapat dihitung ulang.

---

# 63. Source of Truth Hierarchy

Jika ada konflik keputusan, urutan authority:

```text
1. Blueprint versi terbaru yang APPROVED

2. Decision Record / amendment resmi

3. Database schema & migration yang sesuai blueprint

4. Implementation

5. Design mockup

6. Diskusi informal / chat lama
```

Diskusi lama tidak mengalahkan keputusan baru yang sudah masuk Blueprint/ADR.

---

# 64. Change Control

Perubahan dikategorikan:

## Minor

Contoh:

- copywriting;
- icon;
- spacing;
- warna;
- wording label.

Tidak perlu perubahan Blueprint mayor.

## Product Change

Contoh:

- tipe soal baru;
- perubahan freemium;
- struktur dashboard;
- parent flow.

Harus dicatat sebagai amendment.

## Architectural Change

Contoh:

- mengganti database;
- mengganti auth model;
- mengubah Parent → Child account architecture;
- menambah school multi-tenancy.

Harus dibuat:

**Architecture Decision Record (ADR).**

---

# 65. Status Keputusan

## LOCKED

- TKA SD dahulu.
- Dua mapel.
- Parent sebagai buyer.
- Child sebagai learner.
- Freemium.
- Premium per season.
- Mobile-first PWA.
- Materi.
- Latihan.
- Pembahasan.
- Tryout.
- Dashboard siswa.
- Parent Summary.
- Admin CMS.
- PostgreSQL.
- Vercel + Neon baseline.
- Rule-based recommendation V1.
- Tidak memakai IRT V1.
- Tidak memakai AI tutor V1.

## CONFIGURABLE

- jumlah soal gratis;
- materi gratis;
- jumlah tryout gratis;
- nilai threshold recommendation;
- active season;
- price.

## OPEN — tidak menghambat engineering awal

- nama brand final;
- harga Premium final;
- payment gateway final;
- tanggal season final;
- visual brand final;
- domain final.

---

# 66. Launch Strategy

V1 tidak langsung public besar.

Urutan:

```text
Internal QA
    ↓
Private Alpha
    ↓
20–50 siswa
    ↓
Content corrections
    ↓
Pilot
    ↓
100–300 siswa
    ↓
Measure retention & learning usage
    ↓
Public Launch
```

Fokus pilot:

- apakah anak memahami UI?
- apakah anak menyelesaikan latihan?
- apakah pembahasan dipahami?
- apakah parent memahami laporan?
- apakah siswa kembali belajar?
- apakah tryout stabil?
- apakah terdapat soal bermasalah?

---

# 67. Success Metrics Awal

Jangan mengejar vanity metrics.

Utamakan:

```text
Lesson completion

Practice completion

Questions answered

Explanation viewed

Repeat learning sessions

Tryout completion

Return after weak-topic recommendation

Parent report usage

Free → Premium conversion

Content error rate
```

Salah satu metric kualitas terpenting:

> **persentase soal published yang mendapat laporan kesalahan.**

Targetnya harus sangat rendah.

---

# 68. Future Capability Enabled by Current Architecture

Walaupun tidak dibuat pada V1, schema ini tidak menutup jalan menuju:

```text
adaptive learning

IRT

teacher dashboard

school dashboard

multi-child premium

AI explanation assistant

worksheet generator

question calibration

personalized practice

TKA SMP

TKA SMA
```

Tetapi seluruh fitur tersebut berada di luar V1 sampai ada keputusan resmi.

---

# 69. Golden Rule

Jika selama development muncul pertanyaan:

> “Apakah kita sekalian membuat fitur X?”

Gunakan tes berikut:

```text
Apakah fitur X diperlukan agar siswa:

belajar
↓
berlatih
↓
memahami kesalahan
↓
tryout
↓
melihat kelemahan
↓
belajar kembali?
```

Jika **tidak**, masukkan ke backlog.

Jangan tambahkan ke V1.

---

# 70. Final V1 Product Shape

Produk final V1 harus terasa sesederhana:

```text
                TKA SD

                   │
        ┌──────────┼──────────┐
        │          │          │
        ▼          ▼          ▼
     BELAJAR    LATIHAN    TRYOUT
        │          │          │
        └──────────┼──────────┘
                   ▼
               DASHBOARD
                   │
                   ▼
             REKOMENDASI
                   │
                   ▼
             BELAJAR LAGI


           Parent Summary
                 ↑
                 │
           Learning Data
```

Seluruh kompleksitas teknis di belakang sistem harus menghasilkan pengalaman siswa yang tetap sederhana.

---

## SOURCE OF TRUTH V1.0 — APPROVED BASELINE

Dokumen ini menjadi baseline untuk:

- PRD;
- UI/UX design;
- database design;
- implementation plan;
- repository architecture;
- Codex/developer delegation;
- QA;
- content production;
- future audit.

Perubahan scope besar harus melalui revisi blueprint atau ADR terlebih dahulu.
