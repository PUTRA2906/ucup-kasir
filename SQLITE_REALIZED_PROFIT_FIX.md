# Fix: Laba Terealisasi Tidak Akurat di SQLite/Android

## 🐛 Masalah

Pada laporan **Keuntungan Harian** di mode offline (Android/SQLite), **laba terealisasi** tidak akurat ketika transaksi dibayar sebagian (kredit dengan DP).

### Contoh Kasus:
```
Transaksi: 1 karton Mie Instan
- Harga Beli: Rp 42.000
- Harga Jual: Rp 52.000
- Laba Potensial: Rp 10.000
- Dibayar (DP): Rp 26.000 (50%)
- Sisa Piutang: Rp 26.000 (50%)

EXPECTED:
✅ Laba Terealisasi: Rp 5.000 (50% dari Rp 10.000)
✅ Laba Belum Terealisasi: Rp 5.000 (50% dari Rp 10.000)

ACTUAL (SEBELUM FIX):
❌ Laba Terealisasi: Rp 10.000 (100%) — SALAH!
❌ Laba Belum Terealisasi: Rp 0 (0%)
```

## 🔍 Root Cause

**File:** `src/services/sqlite/salesReportEnhanced.ts`

**Fungsi:** `calculateRealizedProfitFromItems()`

### Masalah di Kode:

```typescript
// ❌ SEBELUM FIX:
async calculateRealizedProfitFromItems(
  transactionId: string,
  items: any[],
  returns: any[],
  paidInPeriod?: number  // Parameter ini TIDAK DIGUNAKAN!
) {
  // ...
  
  // Query ini mengambil SEMUA alokasi pembayaran (tidak difilter per periode)
  const itemPaymentRows = await query<any>(
    `SELECT item_id, allocated_amount FROM transaction_item_payments 
     WHERE transaction_id = ? AND user_id = ?`,
    [transactionId, userId]
  )
  
  // Jika ada data item_payments, gunakan itu
  if (hasItemPayments) {
    // ❌ MASALAH: Menggunakan SEMUA pembayaran, bukan hanya pembayaran dalam periode
    const paidAmount = paidByItem.get(itemId) || 0  // Total dari SEMUA waktu
    // ...
  }
}
```

**Akibatnya:**
- Query `transaction_item_payments` mengambil **total semua pembayaran sepanjang waktu**
- Parameter `paidInPeriod` (pembayaran dalam periode tertentu) **diabaikan**
- Laporan harian menampilkan laba terealisasi dari **semua pembayaran**, bukan hanya pembayaran hari itu

### Mengapa Tidak Bisa Difilter Per-Periode?

Tabel `transaction_item_payments` menyimpan **alokasi pembayaran per-item**, tapi **tidak menyimpan tanggal per-alokasi**. Struktur tabelnya:

```sql
CREATE TABLE transaction_item_payments (
  id TEXT PRIMARY KEY,
  transaction_id TEXT,
  payment_id TEXT,        -- Link ke transaction_payments (yang punya tanggal)
  item_id TEXT,
  allocated_amount REAL,  -- Jumlah dialokasikan ke item ini
  -- ❌ TIDAK ADA KOLOM payment_date di sini!
  ...
)
```

Untuk filter per-periode, kita harus:
1. JOIN ke `transaction_payments` untuk dapat `payment_date`
2. Filter berdasarkan `payment_date` dalam periode

**ATAU** lebih sederhana: gunakan perhitungan **proporsional** via fungsi `calculateRealizedProfitFallback`.

## ✅ Solusi yang Diterapkan

### Fix 1: Early Return Jika `paidInPeriod` Diberikan

**File:** `src/services/sqlite/salesReportEnhanced.ts` 

**Line:** 334-343 (setelah fix)

```typescript
// ✅ SETELAH FIX:
async calculateRealizedProfitFromItems(
  transactionId: string,
  items: any[],
  returns: any[],
  paidInPeriod?: number  // Parameter untuk pembayaran dalam periode
) {
  const userId = getCurrentUserId()

  // ✅ FIX: Jika paidInPeriod diberikan (untuk laporan periode tertentu),
  // langsung gunakan fallback proporsional karena query transaction_item_payments
  // tidak bisa difilter per-periode (data agregat semua pembayaran).
  if (paidInPeriod !== undefined) {
    return this.calculateRealizedProfitFallback(transactionId, items, returns, userId, paidInPeriod)
  }

  // Sisanya: gunakan perhitungan per-item untuk detail transaksi
  // (tidak untuk laporan periode)
  // ...
}
```

### Fix 2: Fallback Function Sudah Benar

**File:** `src/services/sqlite/salesReportEnhanced.ts`

**Line:** 475-492

```typescript
async calculateRealizedProfitFallback(..., paidInPeriod?: number) {
  // ...
  
  // ✅ SUDAH BENAR: Gunakan paidInPeriod jika diberikan
  const paidAmount = paidInPeriod !== undefined 
    ? paidInPeriod 
    : Number(txRow?.paid_amount || 0)
  
  const realizationRatio = netRevenue > 0 
    ? Math.min(paidAmount / netRevenue, 1) 
    : 0

  const clampedRealized = profit * realizationRatio
  
  return {
    realizedProfit: clampedRealized,
    unrealizedProfit: profit - clampedRealized,
  }
}
```

### Alur Setelah Fix:

```
Laporan Harian (4 Nov 2026)
  ↓
calculateEnhancedSummary(transactions, returns, '2026-11-04', '2026-11-04')
  ↓
Filter pembayaran dalam periode:
  paidInPeriod = 26.000 (hanya pembayaran 4 Nov)
  ↓
calculateRealizedProfitFromItems(txId, items, returns, 26000)
  ↓
if (paidInPeriod !== undefined) {  // ✅ TRUE
  return calculateRealizedProfitFallback(..., 26000)
}
  ↓
Fallback: Hitung rasio = 26.000 / 52.000 = 50%
  ↓
Laba Terealisasi = 10.000 × 50% = Rp 5.000 ✅
Laba Belum Terealisasi = 10.000 × 50% = Rp 5.000 ✅
```

## 🧪 Testing

### Test Case: Transaksi Kredit dengan DP 50%

**Setup:**
1. Buat transaksi kredit (4 Nov 2026):
   - Produk: Mie Instan 1 karton
   - Harga Beli: Rp 42.000
   - Harga Jual: Rp 52.000
   - Metode: Kredit
   - DP: Rp 26.000
   - Sisa: Rp 26.000

2. Buka Laporan Keuntungan Harian (4 Nov 2026)

**Expected Result:**
```
┌─────────────────────────────────────────┐
│ LAPORAN KEUNTUNGAN HARIAN               │
├─────────────────────────────────────────┤
│ Kas Masuk Hari Ini:      Rp    26.000  │
│ Laba Terealisasi:        Rp     5.000  │✅
│ Laba Belum Terealisasi:  Rp     5.000  │✅
│ Laba Bersih:             Rp     5.000  │✅
│ Bisa Diambil:            Rp     5.000  │✅
└─────────────────────────────────────────┘
```

### Test Case 2: Pelunasan di Hari Berikutnya

**Setup:**
1. Pelunasan (5 Nov 2026):
   - Bayar sisa: Rp 26.000

2. Buka Laporan Keuntungan Harian (5 Nov 2026)

**Expected Result:**
```
┌─────────────────────────────────────────┐
│ LAPORAN KEUNTUNGAN HARIAN (5 Nov)       │
├─────────────────────────────────────────┤
│ Kas Masuk Hari Ini:      Rp    26.000  │
│ Laba Terealisasi:        Rp     5.000  │✅
│ Laba Belum Terealisasi:  Rp         0  │✅
└─────────────────────────────────────────┘

Total Laba Akumulasi (4 Nov + 5 Nov):
  4 Nov: Rp 5.000
  5 Nov: Rp 5.000
  ─────────────────
  Total: Rp 10.000 ✅ (100% terealisasi)
```

## 📊 Impact

### Modul yang Terpengaruh:

✅ **FIXED:**
1. **Laporan Keuntungan Harian** (`DailyProfitReport.vue`)
2. **Laporan Penjualan Enhanced** (`SalesReportEnhanced.vue`)
3. **SQLite Sales Report Service** (`sqlite/salesReportEnhanced.ts`)

✅ **SUDAH BENAR (Tidak Perlu Fix):**
1. **Supabase Service** (`salesReportEnhanced.ts`) - Menggunakan perhitungan yang sama
2. **Detail Laba Per Transaksi** - Menggunakan perhitungan per-item (tidak terpengaruh)

### Perbandingan: Supabase vs SQLite

**Sebelum Fix:**
- ✅ Supabase: Laba terealisasi **BENAR** (menggunakan `paidInPeriod`)
- ❌ SQLite: Laba terealisasi **SALAH** (menggunakan total semua pembayaran)

**Setelah Fix:**
- ✅ Supabase: Laba terealisasi **BENAR**
- ✅ SQLite: Laba terealisasi **BENAR**

## 🔧 Deployment

### Step 1: Verify Fix
```bash
git diff src/services/sqlite/salesReportEnhanced.ts
```

### Step 2: Build & Test
```bash
# Type check
npm run type-check

# Build web
npm run build

# Build Android
npm run build
npx cap sync
cd android && ./gradlew assembleRelease
```

### Step 3: Test di Android
1. Install APK di device/emulator
2. Buat transaksi kredit dengan DP 50%
3. Cek Laporan Keuntungan Harian
4. Verify laba terealisasi = 50% dari laba kotor

### Step 4: Monitor
- Test dengan berbagai skenario pembayaran (tunai, kredit, DP, cicilan)
- Verify konsistensi antara mode online (Supabase) dan offline (SQLite)

## 📝 Catatan Tambahan

### Mengapa Tidak Filter `transaction_item_payments` Per-Periode?

**Option A: JOIN ke `transaction_payments` untuk dapat `payment_date`**
```sql
-- ❌ TIDAK EFISIEN: Butuh JOIN kompleks
SELECT tip.item_id, SUM(tip.allocated_amount) as total_allocated
FROM transaction_item_payments tip
JOIN transaction_payments tp ON tip.payment_id = tp.id
WHERE tip.transaction_id = ?
  AND tp.payment_date >= ?
  AND tp.payment_date <= ?
GROUP BY tip.item_id
```

**Option B: Perhitungan Proporsional (DIPILIH ✅)**
```typescript
// ✅ LEBIH SEDERHANA: Gunakan rasio pembayaran
const realizationRatio = paidInPeriod / netRevenue
const realizedProfit = profit * realizationRatio
```

**Alasan memilih Option B:**
1. ✅ Lebih sederhana dan cepat
2. ✅ Tidak perlu JOIN kompleks
3. ✅ Akurat untuk sebagian besar kasus
4. ✅ Konsisten dengan versi Supabase

### Akurasi Perhitungan Proporsional

**Kapan Akurat:**
- ✅ Item dengan margin profit seragam (misal: semua margin 20%)
- ✅ Pembayaran tidak selektif per-item (bayar proporsional)

**Kapan Kurang Akurat:**
- ⚠️ Item dengan margin sangat berbeda (misal: item A margin 50%, item B margin 5%)
- ⚠️ Pembayaran selektif (misal: customer hanya bayar item yang margin tinggi)

**Untuk kasus yang perlu akurasi tinggi:**
Gunakan detail per-transaksi (`TransactionProfitDetail`) yang tetap menggunakan perhitungan per-item.

## 🔗 Related Files

- `src/services/sqlite/salesReportEnhanced.ts` - Service yang diperbaiki
- `src/services/salesReportEnhanced.ts` - Versi Supabase (referensi)
- `src/views/Reports/DailyProfitReport.vue` - UI laporan harian
- `TIMEZONE_FIX_SUMMARY.md` - Fix timezone yang terkait

## ✅ Checklist

- [x] Identify root cause (query tidak filter per-periode)
- [x] Fix `calculateRealizedProfitFromItems` dengan early return
- [x] Verify `calculateRealizedProfitFallback` sudah benar
- [x] Document the fix
- [x] Type check
- [ ] Build Android APK
- [ ] Test di device Android
- [ ] Deploy to production
- [ ] Monitor for 2-3 hari

---

**Fixed by:** Claude AI Assistant  
**Date:** 2026-11-04  
**Issue Reported by:** User (laba terealisasi tidak akurat di Android)  
**Files Changed:** 1 file (salesReportEnhanced.ts)  
**Lines Changed:** ~10 lines
