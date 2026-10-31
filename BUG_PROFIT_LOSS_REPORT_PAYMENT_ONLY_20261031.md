# 🐛 Laporan Laba Rugi Tidak Menampilkan Data Saat Hanya Ada Transaksi Pembayaran

## Lingkungan / Lingkup Sistem (Environment)
- Platform: mobile (Android)
- Lingkungan: production
- Browser/Versi: N/A (Capacitor native)
- OS: Android
- Versi Aplikasi: 1.3

## Langkah untuk Mereplikasi (Steps to Reproduce)
1. Buka aplikasi di Android
2. Navigasi ke menu **Laporan > Laporan Laba Rugi**
3. Pilih periode tanggal (misalnya: hari ini)
4. Pastikan dalam periode tersebut **HANYA ada transaksi pembayaran** (cicilan/pelunasan piutang), **TIDAK ada faktur/transaksi penjualan baru**
5. Aplikasi akan menampilkan semua card dengan nilai Rp 0

## Perilaku yang Diharapkan (Expected Behavior)
Laporan Laba Rugi seharusnya menampilkan:
- **Kas Masuk** dari pembayaran yang terjadi dalam periode (meskipun transaksi aslinya dibuat di luar periode)
- **Laba Terealisasi** yang bertambah sesuai dengan pembayaran yang masuk
- Summary statistik yang akurat mencerminkan pembayaran dalam periode

Contoh:
- Transaksi #123 dibuat tanggal 20 Oktober (Rp 1.000.000, belum lunas)
- Customer membayar cicilan Rp 500.000 pada 31 Oktober
- Laporan periode 31 Oktober seharusnya menampilkan:
  - Kas Masuk: Rp 500.000
  - Laba Terealisasi: (sesuai proporsi pembayaran)

## Perilaku Aktual / Terjadi (Actual Behavior)
Laporan Laba Rugi menampilkan **semua nilai Rp 0** pada semua card:
- Omzet Bersih: Rp 0
- Kas Masuk: Rp 0 (padahal ada pembayaran masuk)
- Piutang: Rp 0
- Laba Terealisasi: Rp 0 (padahal ada laba dari pembayaran)

Hal ini karena query hanya mengambil **transaksi yang dibuat dalam periode**, tidak memperhitungkan **pembayaran yang terjadi dalam periode**.

## Tangkapan Layar / Video (Screenshots/Videos)
*(Akan ditambahkan jika diperlukan)*

## Pesan Kesalahan (Error Messages)
Tidak ada error message. Aplikasi berjalan normal tapi data tidak akurat.

## Tingkat Dampak (Impact)
**Pengguna Terdampak:** Semua pengguna yang menggunakan laporan laba rugi pada periode dengan hanya pembayaran (tanpa transaksi baru)

**Frekuensi Kejadian:** Sering terjadi, terutama pada:
- Hari-hari di mana hanya ada pelunasan piutang
- Awal bulan ketika customer melakukan pembayaran cicilan
- Periode lambat penjualan tapi ada pembayaran rutin

**Solusi Sementara (Workaround):** 
- Lihat laporan periode yang lebih luas (misalnya: bulan penuh) untuk melihat gambaran keseluruhan
- Cek langsung di halaman Invoice per Customer untuk melihat pembayaran
- Gunakan laporan "Penjualan" untuk track kas masuk (tapi tidak akurat untuk laba terealisasi)

---

## Analisis Akar Masalah (Root Cause Analysis)

**Akar Masalah (Root Cause):**

Query utama di service `salesReportEnhanced.ts` hanya mengambil transaksi berdasarkan **tanggal pembuatan transaksi** (`created_at`), tidak memperhitungkan **tanggal pembayaran** yang tercatat di tabel `transaction_payments`.

```typescript
// src/services/salesReportEnhanced.ts:112-129
let query = supabase
  .from('transactions')
  .select(`...`)
  .eq('status', 'selesai')
  .order('created_at', { ascending: false })

if (startDate) {
  query = query.gte('created_at', startDate)  // ❌ MASALAH: Filter hanya dari created_at
}
if (endDate) {
  query = query.lte('created_at', endDate + 'T23:59:59')
}
```

**Penyebab Terjadinya:**

1. **Desain query yang incomplete:** Query hanya memfilter berdasarkan `transactions.created_at`, padahal pembayaran cicilan/pelunasan dicatat terpisah di tabel `transaction_payments` dengan timestamp sendiri.

2. **Missing payment tracking:** Sistem tidak mengambil pembayaran yang terjadi dalam periode untuk transaksi yang dibuat di luar periode.

3. **Data model mismatch:** 
   - Transaksi kredit dibuat sekali dengan `created_at` = tanggal faktur
   - Pembayaran bisa terjadi berkali-kali dengan `payment_date` berbeda-beda
   - Laporan hanya track `created_at`, mengabaikan `payment_date`

**File/Komponen Terdampak:**
- `src/services/salesReportEnhanced.ts:105-182` - Method `getEnhancedSalesReport()` - query utama
- `src/services/salesReportEnhanced.ts:189-334` - Method `calculateEnhancedSummary()` - perhitungan summary
- `src/stores/salesReportEnhanced.ts:91-113` - Method `fetchReport()` - orchestration
- `src/views/Reports/ProfitLossReport.vue:39-290` - UI rendering summary cards

## Implementasi Perbaikan (Fix Implementation)

**Status:** ✅ FIXED (2026-10-31)

**Perubahan Kode/Sistem:**

### ✅ IMPLEMENTED: Opsi 1 - Include Payments in Date Range

1. **Modifikasi query untuk include transaksi dengan pembayaran dalam periode:**
   - Ambil transaksi yang `created_at` dalam periode (existing logic)
   - **TAMBAH:** Ambil transaksi yang punya pembayaran (`transaction_payments.payment_date`) dalam periode
   - Union kedua hasil query
   - Deduplikasi berdasarkan `transaction_id`

2. **Update perhitungan kas masuk:**
   - Filter pembayaran hanya yang `payment_date` dalam periode
   - Hitung `total_cash_received` dari pembayaran dalam periode saja
   - Update `realized_profit` berdasarkan pembayaran dalam periode

3. **File yang perlu diubah:**
   ```
   src/services/salesReportEnhanced.ts:
     - Line 105-140: Modifikasi getEnhancedSalesReport()
     - Line 189-334: Update calculateEnhancedSummary() untuk filter payment_date
     - Line 415-495: Update calculateRealizedProfitFromItems() untuk filter payment_date
   ```

### Opsi 2: Separate Payment-Based Report (Alternative)

Buat method terpisah `getPaymentBasedReport()` yang fokus pada periode pembayaran, bukan periode transaksi.

**Memerlukan Migrasi:** [ ] Ya [X] Tidak

**Memerlukan Update Data:** [ ] Ya [X] Tidak

## Implementasi Detail (Solusi Opsi 1)

```typescript
// Pseudo-code untuk perbaikan di getEnhancedSalesReport()

async getEnhancedSalesReport(startDate, endDate, ...) {
  // 1. Ambil transaksi yang created_at dalam periode (existing)
  const txnsInPeriod = await supabase
    .from('transactions')
    .gte('created_at', startDate)
    .lte('created_at', endDate)
    ...

  // 2. Ambil transaksi yang punya pembayaran dalam periode (NEW)
  const txnIdsWithPayments = await supabase
    .from('transaction_payments')
    .select('transaction_id')
    .gte('payment_date', startDate)
    .lte('payment_date', endDate)

  const txnsWithPayments = await supabase
    .from('transactions')
    .in('id', txnIdsWithPayments.map(p => p.transaction_id))
    ...

  // 3. Merge dan deduplikasi
  const allTxns = mergeDedupe(txnsInPeriod, txnsWithPayments)

  // 4. Untuk setiap transaksi, filter pembayaran hanya yang dalam periode
  const paymentsInPeriod = await supabase
    .from('transaction_payments')
    .in('transaction_id', allTxns.map(t => t.id))
    .gte('payment_date', startDate)
    .lte('payment_date', endDate)

  // 5. Hitung summary dengan pembayaran yang difilter
  const summary = calculateEnhancedSummary(allTxns, paymentsInPeriod, ...)
  
  ...
}
```

## Pengujian (Testing)

**Status:** ✅ Build Pass | 🔄 Manual Testing Pending

- [X] Type check pass (`npm run type-check`)
- [X] Build pass (`npm run build`)
- [ ] Pengujian manual lulus (Task #4 - pending)
- [ ] Pengujian regresi lulus
- [ ] Test di mobile Android device

### Test Cases Status:
- [ ] Test Case 1: Transaksi + Pembayaran dalam periode
- [ ] Test Case 2: Transaksi luar periode + Pembayaran dalam periode (PRIMARY BUG FIX)
- [ ] Test Case 3: Transaksi dalam periode + Pembayaran luar periode
- [ ] Test Case 4: Multiple payments untuk satu transaksi
- [ ] Test Case 5: Mix transaksi baru + pembayaran lama

#### Test Case 1: Transaksi dalam periode + Pembayaran dalam periode
- [ ] Buat transaksi kredit hari ini
- [ ] Bayar sebagian hari ini
- [ ] Cek laporan periode hari ini → harus tampil kas masuk

#### Test Case 2: Transaksi luar periode + Pembayaran dalam periode
- [ ] Buat transaksi kredit minggu lalu
- [ ] Bayar hari ini
- [ ] Cek laporan periode hari ini → **harus tampil kas masuk** (ini yang sekarang bug)

#### Test Case 3: Transaksi dalam periode + Pembayaran luar periode
- [ ] Buat transaksi kredit hari ini
- [ ] Bayar besok
- [ ] Cek laporan periode hari ini → kas masuk = 0 (belum bayar)

#### Test Case 4: Multiple payments untuk satu transaksi
- [ ] Buat transaksi kredit
- [ ] Bayar DP dalam periode
- [ ] Bayar cicilan 1 dalam periode
- [ ] Bayar cicilan 2 luar periode
- [ ] Cek laporan → harus hitung DP + cicilan 1 saja

#### Test Case 5: Mix transaksi baru + pembayaran lama
- [ ] Ada transaksi baru lunas hari ini (Rp 1jt)
- [ ] Ada pembayaran cicilan hari ini (Rp 500rb)
- [ ] Cek laporan → kas masuk = Rp 1.5jt

### Checklist:
- [ ] Unit test ditambahkan untuk edge cases di atas
- [ ] Pengujian manual lulus untuk semua test cases
- [ ] Pengujian regresi lulus (laporan dengan transaksi normal tetap akurat)
- [ ] Test di mobile Android (tampilan 2 kolom grid cards)
- [ ] Test dengan data produksi (backup dulu)

## Terkait (Related)
- Bug terkait: -
- Fitur terkait: Laporan Laba Rugi, Invoice per Customer, Transaction Payments
- GitHub PR: (akan diisi setelah PR dibuat)
- Commit: (akan diisi setelah commit)
- **Changelog:** CHANGELOG_PROFIT_LOSS_PAYMENT_FIX.md

## Langkah Pencegahan (Prevention)

1. **Tambahkan unit test untuk payment-based reports:**
   - Test case untuk berbagai skenario periode pembayaran
   - Automated test yang run setiap ada perubahan di service report

2. **Update dokumentasi desain:**
   - Dokumentasikan bahwa laporan laba rugi harus track pembayaran dalam periode
   - Tambahkan diagram flow data pembayaran vs transaksi

3. **Code review checklist:**
   - Setiap perubahan di laporan harus consider date filtering untuk:
     - Transaction created_at
     - Payment payment_date
     - Return created_at
   
4. **Monitoring & alerting:**
   - Log warning jika laporan menampilkan semua nilai 0 (kemungkinan bug atau data kosong)
   - Add analytics untuk track berapa sering laporan diakses dengan hasil kosong

5. **User feedback loop:**
   - Tambahkan tombol "Laporkan Masalah" di halaman laporan
   - Survey periodik untuk validasi akurasi data laporan

---

**Status:** Fixed (Implementation Complete)
**Priority:** High
**Assignee:** Claude Code
**Created:** 2026-10-31
**Updated:** 2026-10-31
**Fixed:** 2026-10-31 06:11 UTC
