# Roadmap tka-sd

## Fase 1 - Tutup fondasi M0
- [ ] Selesaikan 0006_tryout via migrasi reviewed (dilarang drizzle push)
- [ ] Verifikasi read-only skema production sebelum perencanaan dependen
- [ ] Implementasi auth foundation, user sync, route authorization
- [ ] Implementasi child profile CRUD + active child context (server-side)
- [ ] Bangun shell student/parent/admin + UI primitives minimal

## Fase 2 - Gate M0 exit
- [ ] CI: lint, typecheck, build hijau tiap checkpoint
- [ ] Vercel Preview + security baseline (kunci jawaban tidak bocor ke browser)
- [ ] Dokumentasi + exit acceptance, evidence di docs/validation
- [ ] Update V1_EXECUTION_STATUS tiap checkpoint

## Fase 3 - Ekstensi data
- [ ] 0007_analytics: event belajar tanpa PII di client
- [ ] 0008_commerce: skema freemium/payment sesuai Blueprint
- [ ] 0009_app_settings + 0010 indexes/integrity review
- [ ] Jaga otoritas: Blueprint > Spec > ADR > migrasi > kode

## Fase 4 - Konten dan produk
- [ ] Mulai M1 hanya setelah M0 exit PASS
- [ ] Lesson service/renderer + routes mobile-first + resume
- [ ] Practice flow + history + e2e
- [ ] Tryout lifecycle + analytics + parent experience + hardening
