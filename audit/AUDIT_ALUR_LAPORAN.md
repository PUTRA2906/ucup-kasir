# AUDIT ALUR LAPORAN - UCUP KASIR (RE-AUDIT, REVISI 2)
**Tanggal Audit:** 16 September 2026 — revisi 2 (memperbarui re-audit pagi hari yang sama; baseline audit asal: 13 September 2026)  
**Versi Aplikasi:** working tree di atas commit `50d0cbd` (perubahan laporan terakhir: kommit `acce656` "hybrid sql" + diff belum di-commit)  
**Auditor:** Claude Code

> **Koreksi struktural dari revisi 1:** seluruh logika perhitungan laporan berada di **service** `src/services/salesReportEnhanced.ts` (731 baris), BUKAN di store. Store `src/stores/salesReportEnhanced.ts` kini hanya wrapper tipis (151 baris: state, filter, persist periode). Referensi baris di dokumen ini sudah diverifikasi ulang terhadap service.

---

## RINGKASAN EKSEKUTIF

Revisi ini memverifikasi ulang status seluruh temuan re-audit terhadap kode terkini, plus memeriksa **paritas formula web vs Android (SQLite)** yang sebelumnya masih berstatus "belum terverifikasi".

**Hasil utama:**
- ❌ **N1–N6 (temuan re-audit) semuanya MASIH TERBUKA** — tidak ada satu pun perubahan kode pada formula perhitungan sejak re-audit pagi.
- 🆕 **N7 — KRITIS BARU, terkonfirmasi dari verifikasi paritas:** pipeline sinkronisasi tabel `transaction_item_payments` **rusak total di mode offline** — alokasi pembayaran yang dibuat di Android tidak pernah naik ke Supabase, alokasi dari server tidak pernah turun ke Android, dan **formula laba terealisasi SQLite ≠ formula web**. Angka laporan Android dan web bisa berbeda untuk transaksi cicilan yang sama.
- ✅ **3 perbaikan baru di working tree** (tidak terkait langsung temuan lama, tapi relevan dengan akurasi laporan):
  1. **Bug zona waktu tanggal** — semua filter periode memakai `toISOString().split('T')[0]` (UTC) → sebelum jam 07:00 WIB "hari ini" = kemarin → laporan hari ini tampak kosong. Kini memakai helper baru `src/utils/date.ts` (`localTodayStr` / `localDateStr` / `localDateOffsetStr`). **Menutup bug keandalan yang bahkan tidak tercatat di audit lama.**
  2. `PaymentAllocationModal.vue` — watch `modelValue` diberi `{ immediate: true }` (data alokasi tidak termuat saat modal sudah terbuka saat mount).
  3. `syncEngine.ts` + `auth.ts` — **wipe database lokal saat logout** (`clearLocalDatabase()`), dipanggil hanya setelah `sync_queue` bersih. Positif untuk isolasi multi-user di perangkat bersama.

### Status Temuan Audit 13 Sep (tetap dari revisi 1, diverifikasi ulang)

| # | Temuan | Prioritas | Status |
|---|--------|-----------|--------|
| 1 | Laba terealisasi salah saat retur | 🔴 | ✅ Fixed per-item (lihat catatan N1/N5) |
| 2 | HPP (`price_buy`) NULL → laba over-reported | 🔴 | ❌ Masih terbuka — `price_buy \|\| 0` di **12 lokasi** service enhanced |
| 3 | Query tidak optimal | ⚠️ | ❌ Masih terbuka, memburuk oleh N2 |
| 4 | Validasi range tanggal | ⚠️ | ❌ `applyFilters()` (ProfitLossReport.vue:668) tetap tanpa validasi |
| 5 | Filter bypass client | ⚠️ | ✅ RLS terverifikasi |
| 6 | Caching laporan | 🟡 | ❌ Masih terbuka |
| 7 | Laba bersih tanpa beban | 🟡 | ❌ Masih terbuka (`netProfit = gross_profit − totalExpenses`) |
| 8 | Top produk tanpa filter retur | 🟡 | ❌ Masih terbuka |
| 9 | Export Excel/PDF | 🟡 | ❌ Masih terbuka — nihil export di `src/views/Reports/` |
| 10 | Audit trail laporan | 🟡 | ❌ Masih terbuka |

### Status Temuan Re-Audit Revisi 1 (N1–N6)

| # | Temuan | Prioritas | Status (revisi 2) |
|---|--------|-----------|-------------------|
| N1 | Fallback laba terealisasi 50% senyap | 🔴 | ❌ **Tidak berubah** — service baris 489–523, `realizationRatio = 0.5` masih ada |
| N2 | N+1 query `transaction_item_payments` per transaksi | 🔴 | ❌ **Tidak berubah** — baris 254, 372, 707; helper (baris 409) fetch sendiri per `transaction_id`. **Catatan: pola batch yang benar SUDAH ADA di `salesReport.ts` baris 126–129** (`in('transaction_id', txIds)`) — fix tinggal porting |
| N3 | Distribusi diskon per-item salah total (race akumulasi) | 🔴 | ❌ **Tidak berubah** — `getTransactionProfitDetail()` baris 672: `discountRatio = itemSubtotal / (txRevenue \|\| 1)` dihitung SEBELUM `txRevenue += itemSubtotal` (baris 682). Item pertama tetap menghasilkan diskon = `discount × subtotal` |
| N4 | Retur di-group per `product_id` → double-count multi-line | ⚠️ | ❌ Tidak berubah — baris 427–438 |
| N5 | `total_cash_received` over-reported (DP + retur refund) | ⚠️ | ❌ Tidak berubah — clamp baris 248 & 368 |
| N6 | Retur lintas periode menyimpangkan angka | ⚠️ | ❌ Tidak berubah — semantik periode masih campur aduk tanpa label |

### Temuan Baru Revisi 2

| # | Temuan | Prioritas |
|---|--------|-----------|
| N7 | `transaction_item_payments` tidak tersinkron dua arah + formula SQLite ≠ web → angka laporan Android ≠ web | 🔴 Kritis |

---

## 1. PERBAIKAN BARU SEJAK RE-AUDIT (WORKING TREE, BELUM DI-COMMIT)

### 1.1 ✅ Bug zona waktu filter periode (fixed, belum tercatat di audit lama)

**Sebelum:** `new Date().toISOString().split('T')[0]` di store, `ProfitLossReport.vue`, `TransactionProfitReport.vue` — menghasilkan tanggal UTC; pada WIB (UTC+7), sebelum jam 07:00 pagi tanggal "hari ini" masih kemarin → default periode dan quick-range (`today/7days/30days/thisMonth/lastMonth`) salah, laporan hari ini tampak kosong.

**Sesudah:** helper `src/utils/date.ts` (`localDateStr`, `localTodayStr`, `localDateOffsetStr`, `localDateFromIso`) dipakai konsisten. Komentarnya mendokumentasikan jebakan UTC secara eksplisit. 

**Verifikasi:** diff `git diff HEAD` pada ketiga file menunjukkan semua 14 pemanggilan `toISOString().split` di jalur filter diganti. Jalur penyimpanan timestamp (`created_at` untuk query) tidak berubah — memang seharusnya tetap ISO.

**Rekomendasi lanjutan:** tambahkan lint rule / konvensi CLAUDE.md — `toISOString()` untuk tanggal lokal dilarang di UI; selalu lewat `@/utils/date`.

### 1.2 ✅ Wipe DB lokal saat logout (`clearLocalDatabase()`)

Semua tabel lokal dihapus (kecuali `sync_queue`, `sync_metadata`, `app_event_log`), hanya dipanggil setelah queue upload bersih. Positif bagi isolasi data antar-user di perangkat bersama. **Catatan interaksi dengan N7:** wipe juga mengosongkan `transaction_item_payments` lokal — dan karena baris alokasi offline tidak pernah masuk queue (lihat N7), alokasi yang belum sempat naik **hilang permanen** saat logout. Wipe ini justru memperjelas kebocoran N7.

### 1.3 ✅ `PaymentAllocationModal` immediate watch

Perbaikan UX kecil; tidak memengaruhi formula.

---

## 2. 🔴 KRITIS N7: PIPELINE `transaction_item_payments` RUSAK DI MODE OFFLINE + PARITAS FORMULA TIDAK TERPENUHI

Re-audit revisi 1 meminta: *"verifikasi paritas SQLite vs Supabase untuk formula laporan baru (item_payments)"*. Verifikasi dikerjakan — hasilnya **gagal di kedua sisi**.

### 2.1 Formula tidak identik

| Aspek | Web (`services/salesReportEnhanced.ts`) | Android (`services/sqlite/salesReportEnhanced.ts`) |
|---|---|---|
| Laba terealisasi | **Per-item** via `transaction_item_payments` (`calculateRealizedProfitFromItems`, baris 403) | **Proporsional per transaksi**: `realizationRatio = cashReceived / netRevenue` (baris 245, 467) — tabel item_payments TIDAK PERNAH dibaca |
| Fallback | 50% teoretis saat query error (N1) | Tidak ada fallback (tidak perlu — tidak pernah pakai item_payments) |
| Clamp profit | `realized + unrealized == totalProfit` dua arah | Clamp dua arah serupa ✅ (bagian ini setara) |

**Dampak:** untuk transaksi cicilan dengan margin antarmitem berbeda (kasus yang justru memotivasi migrasi 15 Sep), **angka "Laba Terealisasi" di aplikasi Android ≠ angka web** untuk transaksi yang sama. User melihat dua angka berbeda di dua perangkat, tanpa indikator.

### 2.2 Alokasi tidak pernah tersinkron dua arah

Ditemukan di `syncEngine.ts` — `transaction_item_payments` **absen di keempat jalur**:

1. **`DOWNLOAD_TABLES` (baris 50–90):** tidak ada → alokasi yang dihitung oleh RPC `add_transaction_payment()`/`create_transaction()` di server tidak pernah turun ke SQLite.
2. **`processQueueItem()` (switch baris 871–1005):** tidak ada case → bila baris di-queue (mis. `itemPaymentService.ts` baris 161 & 173 melakukan `addToSyncQueue('UPDATE'/'DELETE', 'transaction_item_payments', …)`), upload melempar `Tabel tidak dikenal: transaction_item_payments` → item gagal, retry, akhirnya berdarah di queue.
3. **`allocatePaymentToItems()` (sqlite/transactions.ts baris 717–766):** INSERT alokasi lokal dilakukan di dalam transaksi **tanpa `addToSyncQueue`** → alokasi hasil pembayaran offline **tidak pernah naik ke Supabase** (server tidak tahu item mana yang dianggap lunas).
4. **`uploadAllToSupabase()` (baris 1083):** daftar tabel backup full juga tidak mencantumkan `transaction_item_payments`.

**Perparah:** upload `transaction_payments` memakai **`genericUpsert` (upsert baris mentah), bukan RPC** — sehingga trigger alokasi FIFO di server (`allocate_payment_to_items`, migrasi 15 Sep) **tidak ikut terpanggil** saat pembayaran offline naik. Meskipun alokasi lokal ikut diupload, jalur pembayaran pun sudah tidak menghasilkan alokasi server.

**Skenario konkret kegagalan:**
```
Android (offline): bayar cicilan Rp 300rb → alokasi FIFO tertulis lokal, TIDAK di-queue
→ sync → header transaksi & transaction_payments naik via upsert; alokasi tidak
→ Supabase: paid_amount benar, transaction_item_payments KOSONG
→ buka laporan di WEB: helper tidak error, paidByItem kosong → realized = 0 (bukan fallback,
   karena query sukses!) → "Laba terealisasi" web under-report total untuk transaksi itu
→ logout di Android: clearLocalDatabase wipe baris alokasi lokal → hilang permanen
```

**Catatan positif:** laporan dasar `salesReport.ts` (web) dan `sqlite/salesReport.ts` sudah memakai batch query item_payments dengan benar — pola perbaikannya sudah tersedia di repo.

**Rekomendasi (urutan):**
```typescript
// 1. DOWNLOAD_TABLES += 'transaction_item_payments'
// 2. processQueueItem: case 'transaction_item_payments' → genericUpsert
//    + CHILD_FK_RELS agar defers di belakang payment/transaksi induk
// 3. sqlite/transactions.ts: setiap INSERT alokasi di allocatePaymentToItems
//    ikut addToSyncQueue('INSERT', 'transaction_item_payments', id, row)
// 4. Tambah ke daftar tabel uploadAllToSupabase()
```
Jangka menengah: pertimbangkan upload pembayaran offline via `supabase.rpc('add_transaction_payment', …)` (bukan upsert mentah) supaya alokasi dihitung ulang kanonis di server — ini sekaligus menyelaraskan definisi "siapa yang benar" saat ada konflik dua device.
Dan: **samakan formula SQLite** dengan web (baca item_payments via batch query — polanya sudah ada di `sqlite/salesReport.ts` baris 207–226), atau tandai laporan Android dengan catatan "basis proporsional".

---

## 3. TEMUAN LAMA — RINCIAN SINGKAT (N1–N6, SEMUA MASIH TERBUKA)

Kode formula tidak berubah sejak revisi 1; ikhtisar tetap berlaku penuh:

- **🔴 N1 — fallback 50% senyap** (service:489–523). Hanya terpicu saat *query error*; kasus lebih sering "tabel ada tapi kosong" menghasilkan realized = 0 tanpa indikator. Fix: rasio aktual dari header `paid_amount` + badge UI + eventLog.
- **🔴 N2 — N+1** (service:254, 372, 707 → fetch per transaksi di helper baris 409). 1.000 transaksi = 1.000 query serial, dua kali (summary + details). **Fix kini trivial**: pola batch `in('transaction_id', txIds)` + Map sudah terbukti di `salesReport.ts:126` dan `sqlite/salesReport.ts:210`.
- **🔴 N3 — diskon per-item salah total** (service:672 vs 682). `txRevenue` dipakai sebagai denominator sebelum terakumulasi: item pertama → `itemDiscount = discount × subtotal` (bisa miliaran). Hanya `getTransactionProfitDetail()` yang kena; halaman TransactionProfitDetail jadi menyesatkan. Fix: hitung `totalSubtotal` dulu sebelum `map()`.
- **⚠️ N4 — retur di-group per product_id** (service:427–438): 2 baris item produk sama + 1 retur → retur dihitung 2×. Fix: alokasi proporsional per baris, atau `transaction_item_id` di `return_items`.
- **⚠️ N5 — `total_cash_received` over-report** (clamp :248/:368): `paid_amount` tidak dikurangi saat retur refund tunai; skenario DP + retur tetap salah. Fix di `create_return()` atau hitung kas aktual.
- **⚠️ N6 — retur lintas periode**: retur atas transaksi periode lalu masuk netting periode ini (agregat global :279–287), dan retur setelah endDate tak terhitung. Fix: tetapkan satu semantik + label UI.

**Temuan kritis lama #2 (HPP NULL)** tetap satu-satunya tanpa sentuhan: `price_buy || 0` di 12 lokasi service enhanced (baris 218, 283, 341, 357, 434, 447, 499, 508, 560, 576, 659, 667).

---

## 4. ALUR LAPORAN TERKINI (UPDATED)

```
[ProfitLossReport.vue / SalesReport.vue / TransactionProfitReport.vue]
   │  filter tanggal via @/utils/date (LOKAL)        ← PERBAIKAN revisi 2
   ↓
[Store tipis: useSalesReportEnhancedStore (151 baris) — state + persist periode]
   ↓
[Adapter services/index.ts:55 — isNativeApp() ? SQLite : Supabase]
   ├─ WEB:    services/salesReportEnhanced.ts (731 baris)
   │           ├─ transactions+items+payments (tanpa LIMIT — masih)
   │           ├─ returns+return_items (tanpa LIMIT — masih)
   │           └─ calculateRealizedProfitFromItems → 1 query item_payments PER TX (N+1, N2)
   │                └─ error → fallback 50% (N1)
   └─ ANDROID: services/sqlite/salesReportEnhanced.ts (679 baris)
                └─ proporsional per transaksi, TIDAK baca item_payments  ← DIVERGEN (N7)
   ↓
[Display]

SINKRONISASI (N7):
  server → device : transaction_item_payments TIDAK ada di DOWNLOAD_TABLES ❌
  device → server : tidak di-queue saat insert; di-queue (UPDATE/DELETE) → "Tabel tidak dikenal" ❌
  logout          : clearLocalDatabase wipe lokal (termasuk alokasi belum tersinkron) ❌⚠️
```

---

## 5. REKOMENDASI — PRIORITAS (REVISI 2)

### Priority 1: SEGERA (< 1 Minggu)

1. **Fix N3 diskon per-item** — tetap termurah & paling terlihat salah. (0,5 hari + test)
2. **Fix N2 N+1** — port pola batch dari `salesReport.ts`. (0,5 hari — turun dari 1 hari karena polanya sudah ada)
3. **Fix N7 sebagian: sinkronisasi item_payments** — 4 titik di `syncEngine.ts` + `allocatePaymentToItems` (bagian 2.2). Tanpa ini, hasil N1/N2 di web tetap salah untuk transaksi yang diservis via Android. (1–1,5 hari)
4. **N1 fallback** — rasio aktual + flag UI + eventLog. (1 hari)
5. **#2 HPP NULL** — banner "N item tanpa HPP" + constraint DB. (1 hari)

### Priority 2: MENENGAH (1–2 Minggu)

6. **N7 paritas formula**: SQLite enhanced baca item_payments (batch) — port dari `sqlite/salesReport.ts`. (1 hari)
7. **N4 alokasi retur per baris item**. (2 hari)
8. **N5 paid_amount vs refund tunai** di `create_return()`. (2 hari)
9. **#4 validasi tanggal** + **N6 label semantik periode retur**. (1–2 hari)
10. Evaluasi upload pembayaran offline via RPC vs upsert mentah (definisi kanonis alokasi di server). (1–2 hari)

### Priority 3: RENDAH (> 2 Minggu)

11. Optimasi agregasi ke SQL function (#3 lama).
12. Caching (#6), warning beban (#7), filter top produk (#8), export (#9 — `useCsv`/`usePdfExport` sudah tersedia), audit trail (#10).
13. Konvensi anti-UTC: larang `toISOString().split` untuk tanggal lokal (lint/grep CI).

---

## 6. KESIMPULAN

### Positif (sejak re-audit revisi 1):
✅ Bug tanggal UTC→lokal diperbaiki menyeluruh di jalur filter (dengan dokumentasi alasan di helper)  
✅ Wipe DB saat logout — isolasi perangkat bersama menguat  
✅ Pola batch query item_payments sudah terbukti benar di dua laporan lain (fix N2 murah)

### Negatif:
🔴 **N7**: sinkronisasi `transaction_item_payments` tidak berjalan dua arah — fitur akurasi unggulan (laba per-item) **hanya valid di web, dan hanya untuk transaksi yang pembayarannya juga lewat web**; angka Android vs web divergen oleh desain yang belum selesai  
🔴 N1, N2, N3 (kritis) **tidak mendapat satu baris pun perbaikan** sejak re-audit pagi  
🔴 #2 HPP NULL masih utuh  
⚠️ N4, N5, N6 masih terbuka

### Skor Keamanan & Integritas Data: **6/10** (tetap)

**Alasan:** perbaikan working tree (tanggal lokal, wipe logout) menaikkan keandalan & keamanan operasional, tapi temuan N7 membuktikan inti integritas laporan laba — konsistensi angka antar-platform — justru bolong: fitur per-item baru hanya berfungsi penuh di satu sisi pipeline. Skor tidak turun karena N7 adalah eksposur temuan (bukan regresi kode), dan tidak naik karena tiga bug kritis (N1–N3) masih hidup.

---

## 7. LANGKAH SELANJUTNYA

1. Commit dulu perbaikan working tree (tanggal lokal, modal, wipe logout) — jangan campur dengan fix formula.
2. Priority 1 urutan: **N3 → N2 → N7-sync → N1 → #2**.
3. Unit test formula (belum ada sama sekali): diskon proporsional per item, retur multi-line, rasio fallback, batch = hasil per-tx.
4. Uji end-to-end N7: bayar cicilan offline di Android → sync → buka laporan web → bandingkan `realized_profit` web vs Android dengan skenario di `TESTING_ITEM_PAYMENTS.md`.
5. Re-audit revisi 3 setelah Priority 1 & 2 selesai.

---

**Dokumen ini bersifat CONFIDENTIAL dan hanya untuk internal tim development.**
