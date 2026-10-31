# Bug Fix #2: Filter Payment Date Comparison

## Masalah Ditemukan

Setelah implementasi fix pertama, testing menunjukkan data masih menampilkan Rp 0. Setelah investigasi, ditemukan 2 bug:

### Bug 1: Filter payment_method yang salah
**Lokasi:** `src/services/salesReportEnhanced.ts:151`
**Masalah:** 
```typescript
.eq('payment_method', 'cash') // ❌ Hanya ambil payment_method = 'cash'
```
**Penyebab:** Filter ini mengecualikan payment method lain seperti 'tunai', 'bank', dll.

**Fix:**
```typescript
// ✅ Hapus filter payment_method, ambil semua pembayaran
let paymentsQuery = supabase
  .from('transaction_payments')
  .select('transaction_id')
```

### Bug 2: Format comparison payment_date vs endDate
**Lokasi:** `src/services/salesReportEnhanced.ts:305` (2 tempat)
**Masalah:**
```typescript
if (endDate && paymentDate > endDate + 'T23:59:59') return false
// ❌ Compare DATE dengan DATETIME string
```

**Penyebab:**
- `payment_date` adalah tipe `DATE` di database (format: 'YYYY-MM-DD')
- `endDate + 'T23:59:59'` adalah string DATETIME (format: 'YYYY-MM-DDTHH:MM:SS')
- Comparison tidak akurat karena format berbeda

**Fix:**
```typescript
// Compare date only (payment_date is DATE type)
if (startDate && paymentDate < startDate) return false
if (endDate && paymentDate > endDate) return false  // ✅ Compare DATE dengan DATE
```

## Perubahan File

### File: `src/services/salesReportEnhanced.ts`

**Line 148-151:** Remove filter payment_method
```diff
  let paymentsQuery = supabase
    .from('transaction_payments')
    .select('transaction_id')
-   .eq('payment_method', 'cash') // Hanya cash payments yang relevant
```

**Line 298-309 & Line 450-461:** Fix date comparison
```diff
  paymentsInPeriod = (t.payments || []).filter((p: any) => {
    const paymentDate = p.payment_date
    if (!paymentDate) return false

+   // Compare date only (payment_date is DATE type, startDate/endDate is string YYYY-MM-DD)
    if (startDate && paymentDate < startDate) return false
-   if (endDate && paymentDate > endDate + 'T23:59:59') return false
+   if (endDate && paymentDate > endDate) return false

    return true
  })
```

## Testing Status

- [X] Type check pass
- [X] Build pass
- [ ] Manual testing (perlu di-test ulang dengan fix ini)

## Impact

**Sebelum Fix #2:**
- ❌ Pembayaran dengan payment_method selain 'cash' tidak terdeteksi
- ❌ Filter date comparison tidak akurat (kemungkinan tidak match)
- ❌ Data masih menampilkan Rp 0

**Setelah Fix #2:**
- ✅ Semua payment method terdeteksi (tunai, bank, transfer, dll)
- ✅ Date comparison akurat (DATE vs DATE)
- ✅ Seharusnya data sudah muncul dengan benar

## Next Step

**PERLU TESTING ULANG** dengan fix ini:
1. Test di web browser
2. Test di Android app (setelah sync: `npm run build && npx cap sync`)
3. Verify Test Case 2: Transaksi lama + pembayaran hari ini

---

**Fixed:** 2026-10-31 06:23 UTC
**Build Status:** ✅ Pass
