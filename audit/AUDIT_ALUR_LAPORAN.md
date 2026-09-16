# AUDIT ALUR LAPORAN - UCUP KASIR (RE-AUDIT)
**Tanggal Audit:** 16 September 2026 (re-audit dari audit 13 September 2026)  
**Versi Aplikasi:** v1.0 (commit: 50d0cbd, perubahan laporan terakhir: 6f41422)  
**Auditor:** Claude Code

---

## RINGKASAN EKSEKUTIF

Re-audit ini memeriksa ulang **10 temuan audit sebelumnya** terhadap modul laporan dan memverifikasi status perbaikannya di kode terkini (`salesReportEnhanced.ts` kini 731 baris, sebelumnya 581).

**Hasil utama:**
- ✅ **2 temuan kritis lama sudah diperbaiki** — laba terealisasi kini dihitung akurat per-item via tabel `transaction_item_payments` (migrasi `20260915_transaction_item_payments.sql` + alokasi FIFO di `20260915_update_transaction_functions_with_item_allocation.sql`). Masalah "margin berbeda per item" di bagian 3.1 audit lama juga ikut teratasi.
- ❌ **7 temuan lama belum ditindaklanjuti** (HPP NULL, validasi tanggal, optimasi query, caching, laba bersih, filter top produk, export, audit trail).
- 🆕 **5 temuan baru ditemukan**, termasuk **2 bug perhitungan serius** yang diperkenalkan oleh kode perbaikan terbaru.

### Status Temuan Audit Sebelumnya

| # | Temuan | Prioritas Lama | Status |
|---|--------|----------------|--------|
| 1 | Laba terealisasi salah saat retur | 🔴 Kritis | ✅ **PERBAIKAN BARU** — akurat per-item via `transaction_item_payments` (lihat catatan N1/N5) |
| 2 | HPP (`price_buy`) NULL → laba over-reported | 🔴 Kritis | ❌ **BELUM DIFIX** — masih `price_buy \|\| 0` di 10 lokasi |
| 3 | Query tidak optimal / timeout | ⚠️ Sedang | ❌ **BELUM DIFIX, MALAH MEMBURUK** — N+1 baru per transaksi (lihat N2) |
| 4 | Tidak ada validasi range tanggal | ⚠️ Sedang | ❌ **BELUM DIFIX** — `applyFilters()` tetap tanpa validasi |
| 5 | Filter bisa di-bypass client | ⚠️ Sedang | ✅ **TETAP AMAN** — RLS `auth.uid() = user_id` di semua tabel, terverifikasi |
| 6 | Tidak ada caching laporan | 🟡 Rendah | ❌ **BELUM DIFIX** |
| 7 | Laba bersih tidak konsisten (beban = 0) | 🟡 Rendah | ❌ **BELUM DIFIX** — `netProfit = gross_profit - totalExpenses` tanpa warning |
| 8 | Top produk rentan retur abuse | 🟡 Rendah | ❌ **BELUM DIFIX** — sorting masih murni revenue, tanpa filter return rate |
| 9 | Tidak ada export Excel/PDF | 🟡 Rendah | ❌ **BELUM DIFIX** — tidak ada tombol export di `src/views/Reports/` |
| 10 | Tidak ada audit trail laporan | 🟡 Rendah | ❌ **BELUM DIFIX** |

### Temuan Baru (Re-Audit Ini)

| # | Temuan | Prioritas |
|---|--------|-----------|
| N1 | Fallback laba terealisasi **selalu** asumsi 50% — silent wrong number | 🔴 Kritis |
| N2 | N+1 query: `transaction_item_payments` di-fetch **per transaksi** | 🔴 Kritis |
| N3 | Distribusi diskon per-item di detail laba transaksi **salah total** (race akumulasi) | 🔴 Kritis |
| N4 | Retur di-group per `product_id` → double-count jika 1 transaksi punya 2 baris produk sama | ⚠️ Sedang |
| N5 | `total_cash_received` tetap over-reported saat retur refund tunai | ⚠️ Sedang |

---

## 1. YANG SUDAH DIPERBAIKI (VERIFIKASI)

### 1.1 ✅ Laba Terealisasi Akurat Per-Item (menyelesaikan KRITIS #1 & kelemahan 3.1)

Implementasi baru `calculateRealizedProfitFromItems()` (line 403-483):

```typescript
// Map: item_id -> total_paid (dari transaction_item_payments)
const realizationRatio = netSubtotal > 0 ? Math.min(paidAmount / netSubtotal, 1) : 0
const itemRealizedProfit = itemProfit * realizationRatio
```

- Pembayaran dilacak **per item** (bukan rata-rata transaksi), sehingga kasus "item A margin 10%, item B margin 50%" kini terhitung benar.
- Retur diperhitungkan per item (`netSubtotal = subtotal - returnData.value`), sehingga clamp `effectiveCash` tidak lagi menghasilkan rasio 100% palsu.
- Ada clamping dua arah: `clampedRealized` dijepit ke `[0, totalProfit]` (termasuk profit negatif), dan `realized + unrealized == totalProfit` selalu konsisten — **tidak ada laba yang hilang**.
- Sumber kebenaran tunggal untuk `total_returns` / `returned_cogs` (line 276-287) — double-counting antar loop dihindari.
- Backfill alokasi untuk data lama sudah termasuk di migrasi (dikonfirmasi di `TESTING_ITEM_PAYMENTS.md`).
- RLS tabel baru benar (`auth.uid() = user_id` untuk SELECT/INSERT/UPDATE/DELETE).

**Skor akurasi naik signifikan.** Tapi lihat N1-N5 di bawah — perbaikan ini membawa risiko baru.

### 1.2 ✅ Keamanan Data (temuan #5)

Tetap terverifikasi: semua tabel laporan (termasuk `transaction_item_payments`) punya policy RLS per user. Filter client-side hanya mempersempit tampilan, bukan kontrol akses.

---

## 2. TEMUAN BARU — KRITIS

### 🔴 KRITIS N1: Fallback Laba Terealisasi Selalu Pakai Rasio 50%

**Lokasi:** `salesReportEnhanced.ts` line 489-523 (`calculateRealizedProfitFallback`)

```typescript
// Asumsi proporsional (tidak akurat, tapi fallback)
const realizationRatio = 0.5 // Assume 50% paid if data not available
```

**Masalah:**
1. Fallback hanya terpicu saat **query error** — padahal kegagalan yang lebih mungkin adalah **tabel ada tapi baris kosong**:
   - Migrasi `transaction_item_payments` belum dijalankan di project user tertentu → query error → fallback jalan → **semua laba terealisasi dilaporkan 50%**, angka terlihat "masuk akal" sehingga tidak terdeteksi.
   - Transaksi lama yang backfill-nya gagal/terlewat → query sukses, `paidByItem` kosong → `paidAmount = 0` → realized = 0 untuk item itu → **under-reported**, tanpa indikator apa pun.
2. Tidak ada flag di UI bahwa angka berasal dari fallback. Laporan tetap tampil "normal".

**Dampak:** Angka laba terealisasi bisa salah besar (over/under) secara senyap — justru pada data yang paling rawan (transaksi lama).

**Rekomendasi:**
```typescript
// 1. Fallback: pakai rasio aktual dari header, bukan 0.5 teoretis
const netRevenue = txRevenue - returnValue
const paid = transactions.find(...)?.paid_amount ?? 0
const realizationRatio = netRevenue > 0 ? Math.min(paid / netRevenue, 1) : 0

// 2. Deteksi "tabel kosong" secara eksplisit
if ((itemPayments || []).length === 0 && paidAmount > 0) {
  // flag: data alokasi tidak lengkap → tampilkan badge peringatan di UI
}

// 3. Tampilkan indikator di ProfitLossReport saat sebagian transaksi memakai fallback
```
Atau lebih baik: **jamin migrasi selalu dijalankan** (tambahkan checklist bootstrapping) dan ganti fallback dengan rasio aktual + peringatan eventLog.

---

### 🔴 KRITIS N2: N+1 Query Baru — `transaction_item_payments` Difetch Per Transaksi

**Lokasi:** `salesReportEnhanced.ts` line 254 & 372 (dipanggil dalam loop `for (const t of transactions)`)

```typescript
for (const t of transactions) {
  ...
  const { realizedProfit, unrealizedProfit } = await this.calculateRealizedProfitFromItems(
    t.id, t.items || [], txReturns
  )  // ← tiap panggilan = 1 round-trip Supabase, await serial
```

**Masalah:**
- Untuk laporan 1 bulan dengan 1.000 transaksi: **1.000 query serial** ke `transaction_item_payments` (belum termasuk fetch transaksi + retur) — latency total bisa menit, bukan detik.
- Memperburuk temuan #3 lama yang belum difix (fetch transaksi tanpa LIMIT + semua kalkulasi di client).
- `calculateTransactionDetails()` memanggil fungsi yang sama **untuk transaksi yang sama sekali lagi** → total 2× N query per fetch laporan (summary + details).

**Rekomendasi:**
```typescript
// FIX: ONE batch query sebelum loop, kirim map-nya ke helper
const { data: allItemPayments } = await supabase
  .from('transaction_item_payments')
  .select('transaction_id, item_id, allocated_amount')
  .in('transaction_id', txns.map(t => t.id))   // atau .gte/.lte tanggal yang sama

const paymentsByTx = new Map<string, Map<string, number>>()
allItemPayments?.forEach(ip => { /* kelompokkan */ })

// Helper berubah jadi sinkron — tidak ada await dalam loop
```
Jangka panjang: pindahkan agregasi ke SQL function (rekomendasi #3 lama tetap berlaku).

---

### 🔴 KRITIS N3: Distribusi Diskon Per-Item Salah Total di Detail Laba Transaksi

**Lokasi:** `salesReportEnhanced.ts` line 664-697 (`getTransactionProfitDetail`)

```typescript
const items = (transaction.items || []).map((item: any) => {
  ...
  // txRevenue MASIH TERAKUMULASI SEBAGIAN — belum total!
  const discountRatio = itemSubtotal / (txRevenue || 1)      // line 672
  const itemDiscount = (transaction.discount || 0) * discountRatio
  ...
  txRevenue += itemSubtotal                                   // line 682 (baru nambah SETELAH dipakai)
```

**Masalah:** `txRevenue` baru diakumulasi **setelah** `discountRatio` dihitung, jadi denominator-nya adalah total subtotal item-item *sebelumnya*, bukan seluruh item:
- Item pertama: `txRevenue = 0` → `(0 || 1) = 1` → `discountRatio = itemSubtotal` (misal 100.000) → `itemDiscount = diskon × 100.000` — **bukan proporsi, tapi hasil kali**.
- Contoh konkret: 2 item @Rp 50.000, diskon Rp 10.000 → item 1 dapat `itemDiscount = 10.000 × 50.000 = Rp 500.000.000`. Item 2: `ratio = 50.000/50.000 = 1` → diskon utuh Rp 10.000 lagi.
- Laba per item di halaman **TransactionProfitDetail.vue** jadi kacau untuk transaksi berdiskon; hanya header summary (line 700) yang benar karena memakai `txRevenue` final.

**Dampak:** Detail laba per item menyesatkan — user bisa menyangka produk rugi miliaran. Ini bug arithmetic murni, bukan salah asumsi.

**Rekomendasi:**
```typescript
// FIX: hitung total dulu SEBELUM map
const totalSubtotal = (transaction.items || []).reduce((s, i) => s + (i.subtotal || 0), 0)

const items = (transaction.items || []).map((item: any) => {
  const discountRatio = totalSubtotal > 0 ? itemSubtotal / totalSubtotal : 0
  ...
})
```
Tambahkan unit test: 2 item + diskon → jumlah `itemDiscount` semua item == `transaction.discount`.

---

## 3. TEMUAN BARU — SEDANG

### ⚠️ N4: Retur Di-group per `product_id` → Double-Count Multi-Line

**Lokasi:** `calculateRealizedProfitFromItems()` line 427-438 & 444-458

```typescript
const returnData = returnsByProduct.get(productId) || { qty: 0, cogs: 0, value: 0 }
const netSubtotal = subtotal - returnData.value   // ← NILAI RETUR PRODUK SEPENUHNYA
```

**Masalah:** Jika satu transaksi menjual produk X di **2 baris item** (misal harga beda per tier) dan ada retur produk X, maka **setiap baris** mengurangkan **seluruh** nilai retur produk X → retur dihitung 2× → `netSubtotal` baris bisa negatif → laba tertahan over-reported.

**Rekomendasi:** Alokasikan retur per baris proporsional terhadap subtotal baris, atau (lebih baik) simpan `transaction_item_id` di `return_items` sejak pembuatan retur sehingga alokasi eksak.

Catatan terkait: `return_items` saat ini menyimpan `price_buy` snapshot (migrasi `20260819`), tapi tidak menyimpan referensi baris item asli — sumber ambiguitas ini.

---

### ⚠️ N5: `total_cash_received` Tetap Over-Reported Saat Retur Refund Tunai

**Lokasi:** `salesReportEnhanced.ts` line 248 & 368 (clamp `effectiveCash`)

```typescript
const effectiveCash = Math.max(0, Math.min(paidAmount, txNetSales))
```

**Masalah:** Migrasi retur (`20260818_return_updates_transaction.sql` line 118-119) mengoreksi `remaining_amount` dan `payment_status` saat retur, **tapi tidak pernah mengurangi `paid_amount`** saat refund tunai keluar. Clamp `min(paid_amount, netSales)` hanya menyembunyikan sebagian masalah:

```
Jual Rp 1.000.000 tunai (paid_amount = 1.000.000)
Retur Rp 300.000, refund tunai → kas fisik keluar, paid_amount TETAP 1.000.000
effectiveCash = min(1.000.000, 700.000) = 700.000 ✅ kebetulan benar di kasus lunas

TAPI: jual Rp 1.000.000, DP 600.000, retur 100.000 (refund dari DP)
kas fisik = 500.000, effectiveCash = min(600.000, 900.000) = 600.000 ❌ over-report 100.000
```

Konsepnya sudah dipindahkan dengan benar ke `realized_profit` (per-item), tapi statistik **arus kas** (`total_cash_received` / card "Kas Masuk") masih memakai clamp lama.

**Rekomendasi:** Kurangi `paid_amount` saat retur dengan refund tunai di fungsi `create_return()` (sesuaikan juga trigger payment journal), atau hitung `actualCash = paid_amount − SUM(refund tunai terkait)` di service.

---

### ⚠️ N6: Retur Lintas Periode Menyimpangkan Angka (masih ada, varian temuan #3 lama)

**Lokasi:** `getEnhancedSalesReport()` line 143-150 vs 279-290

- Transaksi dan retur sama-sama difilter `created_at` dalam range laporan, **tapi transaksi yang diretur adalah transaksi yang kebetulan juga berada dalam range**. Retur atas transaksi **periode lalu** tetap masuk agregat global `total_returns` (line 279-287) padahal gross sales-nya tidak ikut → `net_sales` periode ini terpotong nilai retur dari periode lain.
- Sebaliknya, transaksi periode ini yang diretur **setelah** endDate tidak terhitung returnya.
- Paralel: `calculateProductPerformance()` menerima `returns` global yang sama → revenue produk terkurangi retur dari transaksi di luar range.

**Rekomendasi:** Tentukan satu semantik yang jujur di UI: "berdasarkan **tanggal transaksi**" (join retur → transaksi, filter pakai tanggal transaksi asli) atau "berdasarkan **tanggal kejadian**" (tampilkan kolom retur terpisah, jangan di-netting). Saat ini campur aduk tanpa label.

---

## 4. TEMUAN LAMA YANG MASIH HIBUT (RINGKASAN — detail lihat audit 13 Sep)

Berlaku penuh, tidak ada perubahan kode:

1. **🔴 #2 — `price_buy` NULL default 0** → HPP = 0 → laba over-reported, tanpa warning. **Ini satu-satunya temuan kritis lama yang belum disentuh.** Fix minimal: kumpulkan daftar produk tanpa harga beli saat report dihitung → tampilkan banner "N item tanpa HPP, laba tidak akurat" di `ProfitLossReport.vue`; tambah `CHECK (price_buy IS NOT NULL AND price_buy >= 0)` via migrasi baru setelah data lama dibersihkan.
2. **⚠️ #4 — Validasi range tanggal** — `applyFilters()` (ProfitLossReport.vue line 674) tetap menerima start > end, tanggal masa depan, dan range 10 tahun.
3. **🟡 #6 — Caching** — `fetchReport()` tetap query penuh tiap mount; hanya periode filter yang di-persist ke localStorage.
4. **🟡 #7 — Laba bersih tanpa validasi beban** — `netProfit = gross_profit − totalExpenses` (line 535); beban = 0 jika jurnal finance kosong, tanpa warning.
5. **🟡 #8 — Top produk tanpa filter return rate**, sorting tetap murni revenue tanpa opsi profit/margin.
6. **🟡 #9 — Export** — belum ada tombol export CSV/PDF di halaman Reports (padahal `useCsv` / `usePdfExport` composable sudah tersedia).
7. **🟡 #10 — Audit trail laporan** — belum ada `report_access_log`.

---

## 5. ALUR LAPORAN TERKINI (UPDATE DOKUMENTASI)

```
[ProfitLossReport.vue / SalesReport.vue / TransactionProfitReport.vue]
        ↓
[Store: useSalesReportEnhancedStore.fetchReport()]
        ↓
[Adapter: src/services/index.ts — native ? SQLite : Supabase]   ← baru: jalur offline SQLite
        ↓
[Supabase: transactions + items + product + payments]           ← tanpa LIMIT (masih)
[Supabase: returns + return_items]                              ← tanpa LIMIT (masih)
[Supabase: transaction_item_payments × N transaksi]             ← BARU, N+1 (N2)
        ↓
[calculateEnhancedSummary / calculateTransactionDetails]
   ├─ laba terealisasi PER-ITEM via item_payments (akurat)      ← PERBAIKAN
   ├─ fallback 50% jika query error (senyap)                    ← BARU (N1)
   └─ clamping realized + unrealized == totalProfit             ← PERBAIKAN
        ↓
[Display]
```

Perubahan penting sejak audit lalu:
- Tabel `transaction_item_payments` + alokasi FIFO di `add_transaction_payment()` (migrasi 15 Sep).
- Store memakai adapter `salesReportEnhancedServiceAdapter` → di Android, laporan dibaca dari SQLite (`src/services/sqlite/salesReport.ts`) — **verifikasi formula SQLite identik dengan Supabase**, jika tidak, angka web ≠ angka Android.

---

## 6. REKOMENDASI PERBAIKAN — PRIORITAS RE-AUDIT

### Priority 1: SEGERA (< 1 Minggu)

1. **Fix N3 bug distribusi diskon** — bug arithmetic murni, efeknya palingvisible di TransactionProfitDetail. (Effort: 0,5 hari + test)
2. **Fix N2 N+1 item_payments** — batch query `in('transaction_id', [...])`, hilangkan await dalam loop, dan hilangkan duplikasi call summary/details. (Effort: 1 hari)
3. **Tangani N1 fallback 50%** — ganti dengan rasio aktual + flag/indikator UI + eventLog. (Effort: 1 hari)
4. **Fix #2 HPP NULL** (masih terbuka dari audit lalu) — warning UI + constraint DB. (Effort: 1 hari)

### Priority 2: MENENGAH (1-2 Minggu)

5. **N4 alokasi retur per baris item** — tambah `transaction_item_id` di `return_items` atau alokasi proporsional. (Effort: 2 hari)
6. **N5 paid_amount vs refund tunai** — koreksi di fungsi retur atau hitung kas aktual. (Effort: 2 hari)
7. **#4 validasi tanggal** + **N6 semantik periode retur** (label UI). (Effort: 1-2 hari)
8. **Verifikasi paritas SQLite vs Supabase** untuk formula laporan baru (item_payments). (Effort: 1-2 hari)

### Priority 3: RENDAH (> 2 Minggu)

9. Optimasi agregasi ke SQL function (#3 lama, digabung setelah N2 beres).
10. Caching (#6), warning beban (#7), filter top produk (#8), export (#9), audit trail (#10).

---

## 7. KESIMPULAN

### Positif (berubah sejak audit lalu):
✅ Laba terealisasi kini akurat per-item — masalah konseptual terbesar audit lalu terselesaikan  
✅ Clamping profit & sumber kebenaran tunggal retur — tidak ada angka yang "hilang" atau double-count antar loop  
✅ RLS lengkap termasuk tabel baru; migrasi idempotent + backfill  
✅ Skor akurasi perhitungan naik nyata

### Negatif:
🔴 Perbaikan membawa 2 bug baru yang serius: **N3 (diskon per-item)** dan **N2 (N+1)**, plus **N1 (fallback 50% senyap)**  
🔴 Temuan kritis lama #2 (HPP NULL) masih utuh belum disentuh  
⚠️ Arus kas (`total_cash_received`) masih over-reported pada skenario DP + retur refund  
⚠️ Paritas formula web vs SQLite (offline) belum terverifikasi untuk logika item_payments baru

### Skor Keamanan & Integritas Data: **6/10** (naik dari 5.5)

**Alasan:** Fondasi keamanan (RLS) tetap solid dan akurasi laba membaik drastis, tapi skor tertahan oleh bug arithmetic baru (N3), silent-failure fallback (N1), performa N+1 yang memburuk (N2), dan satu temuan kritis lama yang belum difix.

---

## 8. LANGKAH SELANJUTNYA

1. Perbaiki Priority 1 urutan N3 → N2 → N1 → #2 (N3 paling murah dan paling terlihat salahnya).
2. Buat unit test formula laporan (diskon proporsional, retur multi-line, fallback) — belum ada test sama sekali untuk service ini.
3. Setelah fix: jalankan skenario di `TESTING_ITEM_PAYMENTS.md` + bandingkan angka laporan web vs Android (mode offline).
4. Re-audit ulang setelah Priority 1 & 2 selesai.

---

**Dokumen ini bersifat CONFIDENTIAL dan hanya untuk internal tim development.**
