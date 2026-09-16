# Perbaikan Logika Laba Per Transaksi dengan Pembayaran Per Item

**Tanggal:** 2026-09-16  
**Status:** ✅ Selesai

## Masalah yang Diperbaiki

Sebelumnya, perhitungan **laba terealisasi (realized profit)** pada laporan **Laba Per Transaksi** menggunakan formula proporsional sederhana:

```typescript
// ❌ Formula lama (tidak akurat)
const realizationRatio = netRevenue > 0 ? cashReceived / netRevenue : 0
const realizedProfit = profit * realizationRatio
```

Formula ini **tidak akurat** untuk transaksi dengan:
- Item dengan margin berbeda-beda (misal: item A margin 20%, item B margin 50%)
- Pembayaran cicilan yang dialokasikan ke item tertentu terlebih dahulu
- Retur pada item spesifik

### Contoh Kasus Tidak Akurat:

**Transaksi:**
- Item A: Harga Rp100.000, Modal Rp80.000, **Laba Rp20.000** (margin 20%)
- Item B: Harga Rp100.000, Modal Rp50.000, **Laba Rp50.000** (margin 50%)
- **Total:** Rp200.000, Laba Rp70.000

**Pembayaran:**
- Cicilan pertama Rp100.000 → dialokasikan ke **Item A** (lunas)

**Hasil dengan formula lama:**
```
Laba riil = Rp70.000 × (100.000 / 200.000) = Rp35.000 ❌ SALAH
```

**Hasil dengan formula baru (per-item allocation):**
```
Item A: 100% lunas → laba riil Rp20.000
Item B: 0% lunas → laba riil Rp0
Total laba riil = Rp20.000 ✅ BENAR
```

---

## Solusi: Pembayaran Per Item (Item-Level Payment Allocation)

Sistem sekarang menggunakan tabel `transaction_item_payments` yang mencatat **alokasi pembayaran ke setiap item transaksi** secara FIFO (First In First Out).

### Formula Baru (Akurat):

```typescript
// ✅ Formula baru (akurat per-item)
for each item:
  itemProfit = (itemSubtotal - itemDiscount - itemReturn) - itemCogs
  paidAmount = sum(allocations to this item)
  realizationRatio = paidAmount / itemSubtotal
  itemRealizedProfit = itemProfit × realizationRatio
  
totalRealizedProfit = sum(itemRealizedProfit for all items)
```

---

## File yang Diubah

### 1. **`src/services/sqlite/salesReportEnhanced.ts`**

#### Perubahan pada `calculateTransactionDetails`:

**Sebelum:**
```typescript
// Laba terealisasi berdasarkan proporsi kas (clamp: realized + unrealized == profit)
const realizationRatio = netRevenue > 0 ? cashReceived / netRevenue : 0
const realizedProfit = profit >= 0
  ? Math.min(Math.max(0, profit * realizationRatio), profit)
  : Math.max(Math.min(0, profit * realizationRatio), profit)
const unrealizedProfit = profit - realizedProfit
```

**Sesudah:**
```typescript
// ✅ Gunakan perhitungan per-item untuk realized profit (sama seperti di summary & detail)
const { realizedProfit, unrealizedProfit } = await this.calculateRealizedProfitFromItems(
  t.id,
  t.items || [],
  relatedReturns
)
```

#### Signature berubah:
- `calculateTransactionDetails()` sekarang **async** (menggunakan `await`)
- Mengembalikan `Promise<TransactionDetail[]>` (sebelumnya `TransactionDetail[]`)

---

## Fungsi Pendukung

### `calculateRealizedProfitFromItems()`

Fungsi ini membaca data dari `transaction_item_payments` dan menghitung laba terealisasi secara akurat:

1. **Ambil alokasi pembayaran per item** dari tabel `transaction_item_payments`
2. **Hitung laba per item** setelah dikurangi diskon proporsional dan retur
3. **Hitung laba terealisasi per item** = `itemProfit × (paidAmount / itemSubtotal)`
4. **Jumlahkan** semua laba terealisasi per item

### Alokasi Pembayaran (FIFO)

Setiap kali ada pembayaran baru (via `add_transaction_payment`), sistem memanggil `allocatePaymentToItems()` yang:

1. Mengambil semua item dalam transaksi (urut berdasarkan `created_at`)
2. Mengalokasikan pembayaran ke item pertama sampai lunas
3. Sisanya dialokasikan ke item kedua, dst.
4. Menyimpan alokasi di tabel `transaction_item_payments`

---

## Konsistensi Perhitungan

Sekarang **semua titik perhitungan** menggunakan logika yang sama:

| Fungsi | Lokasi | Status |
|--------|--------|--------|
| `calculateEnhancedSummary()` | Summary laporan | ✅ Menggunakan per-item |
| `calculateTransactionDetails()` | List transaksi | ✅ **DIPERBAIKI** menggunakan per-item |
| `getTransactionProfitDetail()` | Detail transaksi | ✅ Sudah menggunakan per-item |

---

## Migrasi Data Lama

Sistem sudah mendukung **backfill** untuk transaksi lama yang belum punya alokasi:

```sql
-- Di migration 20260915_transaction_item_payments.sql
-- Alokasi pembayaran untuk transaksi yang sudah ada
DO $$
DECLARE
  v_payment RECORD;
BEGIN
  FOR v_payment IN
    SELECT tp.id, tp.transaction_id, tp.amount
    FROM transaction_payments tp
    WHERE NOT EXISTS (
      SELECT 1 FROM transaction_item_payments tip 
      WHERE tip.payment_id = tp.id
    )
    ORDER BY tp.created_at ASC
  LOOP
    PERFORM allocate_payment_to_items(
      v_payment.transaction_id,
      v_payment.id,
      v_payment.amount
    );
  END LOOP;
END $$;
```

---

## Testing & Verifikasi

### Type Check
```bash
npm run type-check
```
✅ **Passed** - Tidak ada error TypeScript

### Manual Testing Checklist

- [ ] Buka halaman **Laba Per Transaksi** (`/reports/transaction-profit`)
- [ ] Pilih periode dengan transaksi cicilan
- [ ] Verifikasi **Laba Riil** dan **Laba Tertahan** akurat
- [ ] Klik detail transaksi → verifikasi breakdown per item
- [ ] Bandingkan dengan perhitungan manual

### Skenario Test

1. **Transaksi dengan 2 item margin berbeda, bayar sebagian:**
   - Item A: Rp100k (margin 20%, laba Rp20k)
   - Item B: Rp100k (margin 50%, laba Rp50k)
   - Bayar Rp150k → Item A lunas + Item B Rp50k
   - **Expected:** Laba riil = Rp20k + (Rp50k × 50%) = Rp45k

2. **Transaksi dengan retur:**
   - Item A: 10 pcs × Rp10k = Rp100k (laba Rp20k)
   - Retur: 3 pcs Item A
   - Bayar Rp70k (100%)
   - **Expected:** Laba riil = (Rp100k - Rp30k) × 28.57% = Rp20k

---

## Benefit

✅ **Akurasi:** Perhitungan laba riil sesuai dengan pembayaran aktual per item  
✅ **Konsistensi:** Semua laporan (summary, list, detail) menggunakan logika yang sama  
✅ **Audit Trail:** Data alokasi tersimpan di `transaction_item_payments` untuk tracking  
✅ **Fleksibilitas:** Mendukung realokasi manual pembayaran jika diperlukan  

---

## Referensi

- Migration: `supabase/migrations/20260915_transaction_item_payments.sql`
- SQLite Migration: `src/services/sqlite/migrations/transaction_item_payments.sql`
- Service: `src/services/sqlite/salesReportEnhanced.ts`
- UI: `src/views/Reports/TransactionProfitReport.vue`
- Detail: `src/views/Reports/TransactionProfitDetail.vue`
