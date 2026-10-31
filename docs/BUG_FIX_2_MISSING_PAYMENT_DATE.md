# 🐛 Bug Fix #2: Missing `payment_date` Field di SQLite Service

**Tanggal:** 31 Oktober 2026, 07:01 UTC  
**Severity:** CRITICAL  
**Status:** ✅ FIXED  

---

## 🔍 Bug yang Ditemukan

Setelah implementasi fix pertama, **kas masuk masih menampilkan 0** karena:

**Field `payment_date` TIDAK di-load dari database SQLite!**

### Root Cause

Di method `fetchTransactionDetail()` line ~894-906, mapping payments **tidak include `payment_date`**:

```typescript
// ❌ BEFORE (MISSING payment_date):
txn.payments = paymentRows.map((r: any) => ({
  id: r.id,
  user_id: r.user_id,
  transaction_id: r.transaction_id,
  amount: r.amount,
  payment_method: r.payment_method,
  notes: r.notes ?? undefined,
  created_at: r.created_at,
  // ❌ payment_date TIDAK ADA!
}))
```

### Impact

Filter pembayaran dalam periode **TIDAK BERFUNGSI** karena:

```typescript
// Filter ini selalu return false karena payment_date === undefined
paymentsInPeriod = (t.payments || []).filter((p: any) => {
  const paymentDate = p.payment_date  // ❌ undefined!
  if (!paymentDate) return false      // ❌ selalu false!
  ...
})

// Hasil: paidInPeriod selalu = 0
const paidInPeriod = paymentsInPeriod.reduce(...) // = 0
```

---

## ✅ Fix

Tambahkan `payment_date` ke mapping:

```typescript
// ✅ AFTER (WITH payment_date):
txn.payments = paymentRows.map((r: any) => ({
  id: r.id,
  user_id: r.user_id,
  transaction_id: r.transaction_id,
  amount: r.amount,
  payment_method: r.payment_method,
  payment_date: r.payment_date,  // ✅ ADDED
  notes: r.notes ?? undefined,
  created_at: r.created_at,
}))
```

---

## 📊 Perubahan

| File | Line | Change |
|------|------|--------|
| `src/services/sqlite/salesReportEnhanced.ts` | ~900 | Tambah `payment_date: r.payment_date` |

**Total:** 1 line added

---

## 🧪 Verification

- [ ] Type check pass
- [ ] Build pass
- [ ] Manual test: kas masuk tidak lagi 0

---

## 💡 Lesson Learned

### Kenapa Bug Ini Terjadi?

1. **Asumsi field auto-loaded:** Asumsi bahwa semua fields dari database otomatis ter-map
2. **Tidak cek mapping existing:** Tidak verifikasi apakah `payment_date` sudah ada di mapping
3. **Testing tidak complete:** Seharusnya test dulu sebelum declare "fixed"

### Pencegahan

1. **Selalu cek existing mapping** sebelum pakai field di filter
2. **Console.log intermediate values** untuk debug:
   ```typescript
   console.log('payments:', t.payments)
   console.log('paymentsInPeriod:', paymentsInPeriod)
   console.log('paidInPeriod:', paidInPeriod)
   ```
3. **Unit test untuk mapping** - verify semua fields yang dibutuhkan ada

---

**Status:** FIXED ✅  
**Next:** Type-check dan build verification  
**Impact:** HIGH - Without this fix, the first fix was useless
