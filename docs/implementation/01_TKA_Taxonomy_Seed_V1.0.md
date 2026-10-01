# TKA SD — Taxonomy Seed Specification V1.0

**Status:** Engineering Seed Baseline  
**Tanggal verifikasi:** 1 Oktober 2026  
**Authority:** Pusmendik/Kemendikdasmen untuk kerangka asesmen; struktur aplikasi menambahkan layer internal agar konten mudah dikelola.

## 1. Tujuan

Taxonomy adalah vocabulary bersama untuk materi, question bank, latihan, tryout, analytics, dan rekomendasi. Tidak boleh ada taxonomy terpisah per fitur.

Hierarchy:

```text
Subject
└── Domain / Elemen
    └── Topic / Submateri
        └── Competency
            └── Indicator
```

`Indicator` adalah unit tagging paling granular. Seed V1 sengaja memisahkan **taxonomy resmi yang telah terverifikasi** dari **product topics internal** yang boleh disempurnakan saat content mapping.

## 2. Subjects

| Code | Name | Slug |
|---|---|---|
| MAT | Matematika | matematika |
| BIN | Bahasa Indonesia | bahasa-indonesia |

## 3. Matematika — Domain Resmi

| Code | Name | Sort |
|---|---|---:|
| MAT_BIL | Bilangan | 10 |
| MAT_GEO | Geometri dan Pengukuran | 20 |
| MAT_DATA | Data | 30 |

## 4. Matematika — Product Topics Seed

### Bilangan

- `MAT_BIL_RAS` — Bilangan Rasional
  - `MAT_BIL_RAS_EQ` — Pecahan senilai
  - `MAT_BIL_RAS_CMP` — Membandingkan dan mengurutkan pecahan
  - `MAT_BIL_RAS_FORM` — Relasi pecahan, desimal, dan persen
  - `MAT_BIL_OP_CACAH` — Operasi bilangan cacah
  - `MAT_BIL_OP_PECAHAN` — Operasi pecahan
  - `MAT_BIL_KPK_FPB` — Kelipatan, faktor, KPK, dan FPB

### Geometri dan Pengukuran

- `MAT_GEO_OBJ` — Objek Geometri
  - `MAT_GEO_FLAT` — Bangun datar
  - `MAT_GEO_SPATIAL` — Konstruksi bangun ruang dan visualisasi spasial
- `MAT_GEO_MEASURE` — Pengukuran
  - `MAT_MEASURE_LENGTH` — Panjang
  - `MAT_MEASURE_WEIGHT` — Berat
  - `MAT_MEASURE_AREA` — Luas
  - `MAT_MEASURE_VOLUME` — Volume
  - `MAT_MEASURE_ESTIMATE` — Penaksiran ukuran

> Catatan: subtopik pengukuran dibuat sebagai layer produk untuk tagging dan latihan granular. Mapping final setiap indikator harus diperiksa terhadap matriks resmi sebelum content scale.

### Data

- `MAT_DATA_PRESENT` — Penyajian Data
  - gambar
  - piktogram
  - diagram batang
  - tabel frekuensi
- `MAT_DATA_USE` — Pengambilan, Analisis, dan Interpretasi Data

## 5. Matematika — Competency Seed

Karena kerangka resmi menyebut proses memahami, mengaplikasikan, dan bernalar dalam penyelesaian masalah serta kemampuan seperti representasi/penalaran/pemecahan masalah/koneksi, V1 menyimpan dua dimensi:

### Cognitive Level

- `UNDERSTAND` — Memahami
- `APPLY` — Mengaplikasikan
- `REASON` — Bernalar

### Mathematical Competency

- `MAT_KNOW` — Pengetahuan/Pemahaman Matematika
- `MAT_REP` — Representasi Matematis
- `MAT_REASON` — Penalaran
- `MAT_PROBLEM` — Pemecahan Masalah Matematis
- `MAT_CONNECT` — Koneksi Matematis

Satu question memiliki `cognitive_level` wajib dan satu `primary_competency_id`; kompetensi sekunder bisa ditambahkan di versi berikut jika data editorial membutuhkannya.

## 6. Bahasa Indonesia — Domain Internal

Pusmendik memfokuskan TKA Bahasa Indonesia SD pada keterampilan **membaca** menggunakan **teks informasi** dan **teks fiksi**.

Domain aplikasi:

| Code | Name |
|---|---|
| BIN_READ | Membaca |

`text_type` disimpan di stimulus:

- `INFORMATION`
- `FICTION`

Ini sengaja tidak dibuat sebagai domain terpisah agar kompetensi dapat digunakan lintas jenis teks.

## 7. Bahasa Indonesia — Kompetensi Resmi

| Code | Kompetensi |
|---|---|
| BIN_TEXTUAL | Pemahaman Tekstual |
| BIN_INFER | Pemahaman Inferensial |
| BIN_EVAL | Evaluasi dan Apresiasi |

## 8. Bahasa Indonesia — Subkompetensi/Indicator Seed

### Pemahaman Tekstual

- `BIN_TX_VOCAB` — Mengidentifikasi penggunaan kosakata umum dan khusus dalam berbagai bidang.
- `BIN_TX_OBJECT` — Mengidentifikasi objek berdasarkan kosakata yang digunakan dalam teks fiksi atau nonfiksi.
- `BIN_TX_RESTRUCTURE` — Menyusun kembali informasi dari teks dalam bentuk ikhtisar/bagan.
- `BIN_TX_EXPLICIT` — Mengidentifikasi informasi tersurat dalam teks.

### Pemahaman Inferensial

- `BIN_IN_MAIN` — Menyimpulkan ide pokok, gagasan pendukung, amanat, tokoh, peristiwa, dan/atau nilai dalam teks.
- `BIN_IN_CHANGE` — Menyimpulkan perubahan sederhana pada objek, karakter, dan/atau latar dalam teks fiksi atau nonfiksi.
- `BIN_IN_EXPRESSION` — Menjelaskan makna ungkapan yang digunakan dalam teks.

### Evaluasi dan Apresiasi

- `BIN_EV_RELEVANCE` — Menilai relevansi peristiwa dalam teks dengan kehidupan sehari-hari berdasarkan pengalaman atau pengetahuan pribadi.
- `BIN_EV_CONSISTENCY` — Menilai kesesuaian antarunsur dan/atau antarinformasi dalam teks.
- `BIN_EV_EMOTION` — Menyimpulkan respons emosional terhadap unsur teks fiksi.

## 9. Bahasa Indonesia — Topic Internal

Untuk UX belajar, topic tidak harus identik dengan kompetensi. Seed awal:

- `BIN_TOPIC_INFO` — Membaca Teks Informasi
- `BIN_TOPIC_FICTION` — Membaca Teks Fiksi
- `BIN_TOPIC_VOCAB` — Kosakata dan Makna
- `BIN_TOPIC_EXPLICIT` — Informasi Tersurat
- `BIN_TOPIC_INFERENCE` — Informasi Tersirat dan Simpulan
- `BIN_TOPIC_EVALUATION` — Evaluasi Isi Teks
- `BIN_TOPIC_APPRECIATION` — Apresiasi Teks Fiksi

Saat tagging question, **kompetensi resmi tetap authority**; topic digunakan untuk navigasi belajar siswa.

## 10. Question Type Seed

- `SINGLE_CHOICE` — Pilihan Ganda
- `MULTI_SELECT` — PGK dengan lebih dari satu jawaban benar
- `CATEGORY` — PGK kategori, misalnya Benar/Salah atau Sesuai/Tidak Sesuai

## 11. Stimulus Type Seed

- `TEXT`
- `IMAGE`
- `TABLE`
- `GRAPH`
- `MIXED`

## 12. Editorial Enums

Difficulty:

- `EASY`
- `MEDIUM`
- `HARD`

Usage:

- `PRACTICE`
- `ASSESSMENT`
- `BOTH`

Content status:

- `DRAFT`
- `IN_REVIEW`
- `VERIFIED`
- `PUBLISHED`
- `ARCHIVED`

Source type:

- `OFFICIAL_REFERENCE`
- `THIRD_PARTY_REFERENCE`
- `ORIGINAL`
- `REGENERATED`

## 13. Seed Rules

1. Code bersifat immutable setelah digunakan production.
2. Display name boleh diperbaiki tanpa mengganti code.
3. Taxonomy resmi dan topic internal tidak boleh dicampur tanpa field pembeda.
4. `indicator.official_reference` diisi saat mapping ke kerangka resmi telah diverifikasi.
5. Question published wajib memiliki subject, domain, competency, cognitive level, difficulty, dan source type.
6. `topic_id` boleh nullable hanya untuk kasus editorial sementara; published question harus memiliki topic.
7. Perubahan besar taxonomy setelah content production harus dibuat melalui migration + mapping plan.

## 14. Content Mapping Checklist

Sebelum question menjadi `PUBLISHED`:

```text
[ ] Subject benar
[ ] Domain benar
[ ] Topic benar
[ ] Competency resmi benar
[ ] Indicator/subkompetensi benar
[ ] Cognitive level masuk akal
[ ] Difficulty direview
[ ] Stimulus type benar
[ ] Source provenance terisi
```

## 15. Status

Top-level taxonomy dan subkompetensi Bahasa Indonesia di atas telah diverifikasi terhadap halaman resmi TKA SD Pusmendik pada 1 Oktober 2026. Detail topic internal Matematika yang lebih granular adalah struktur produk dan harus terus dicocokkan dengan matriks asesmen resmi saat pipeline konten berjalan.
