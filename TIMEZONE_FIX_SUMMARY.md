# Fix: Timezone Issue - Pembayaran Tercatat Tanggal Kemarin

## 🐛 Masalah
Ketika user melakukan pembayaran hari ini (4 November 2026 pukul 01:52 WIB), pembayaran tercatat dengan `payment_date` kemarin (3 November 2026).

## 🔍 Root Cause
**Timezone Mismatch antara Client (WIB, UTC+7) dan Server (UTC)**

```
Waktu User (WIB):    2026-11-04 01:52 WIB (sudah tanggal 4)
Waktu Server (UTC):  2026-11-03 18:52 UTC (masih tanggal 3)
                     ↑ Selisih 7 jam
```

**Bug Pattern:**
```typescript
// ❌ SALAH - Menghasilkan UTC date, bukan local date
new Date().toISOString().split('T')[0]
// Output: "2026-11-03" (UTC) padahal di Indonesia sudah "2026-11-04"

// ✅ BENAR - Menghasilkan local date
new Date().toLocaleDateString('en-CA')
// Output: "2026-11-04" (timezone lokal user)
```

## ✅ File yang Sudah Diperbaiki

### 1. **PaymentModal.vue** (Komponen UI)
**File:** `src/components/common/PaymentModal.vue`

**Line 175:**
```typescript
// BEFORE:
const paymentDate = ref(new Date().toISOString().split('T')[0])

// AFTER:
const paymentDate = ref(new Date().toLocaleDateString('en-CA')) // Format YYYY-MM-DD di timezone lokal
```

**Line 225:**
```typescript
// BEFORE:
paymentDate.value = new Date().toISOString().split('T')[0]

// AFTER:
paymentDate.value = new Date().toLocaleDateString('en-CA') // Format YYYY-MM-DD di timezone lokal
```

### 2. **transactions.ts** (Supabase Service)
**File:** `src/services/transactions.ts`

**Line 174 (fungsi `create`):**
```typescript
// BEFORE:
: new Date().toISOString() // ISO string dengan timezone lokal ❌ KOMENTAR SALAH!

// AFTER:
: new Date().toLocaleDateString('en-CA') // Format YYYY-MM-DD di timezone lokal
```

**Line 146 (fungsi `addPayment`):**
```typescript
// Sudah benar dari awal:
: new Date().toLocaleDateString('en-CA') // Format YYYY-MM-DD di timezone lokal
```

### 3. **sqlite/transactions.ts** (SQLite Service untuk Offline Mode)
**File:** `src/services/sqlite/transactions.ts`

**Line 359 (fungsi `addPayment`):**
```typescript
// BEFORE:
const pDate = paymentDate || now.split('T')[0]  // ❌ now adalah UTC dari toISOString()

// AFTER:
// ✅ FIX: Gunakan tanggal lokal, bukan UTC
const pDate = paymentDate || new Date().toLocaleDateString('en-CA')
```

## 🧪 Testing

### Test Case: Pembayaran di Malam Hari (Edge Case)

**Waktu Test:** 2026-11-04 01:52 WIB (server UTC: 2026-11-03 18:52 UTC)

**Steps:**
1. Buka transaksi dengan sisa piutang
2. Klik "Tambah Pembayaran"
3. Lihat default tanggal yang muncul
4. Submit pembayaran tanpa mengubah tanggal
5. Cek `payment_date` di detail transaksi

**Expected Result:**
- Default tanggal di modal: **2026-11-04** ✅
- `payment_date` tersimpan: **2026-11-04** ✅
- Pembayaran muncul di laporan tanggal **2026-11-04** ✅

### Verifikasi Build

```bash
npm run type-check  # ✅ No errors
npm run build       # ✅ Success
```

## 📊 Impact

### Modul yang Terpengaruh (Sudah Fixed)
1. ✅ **Transaction Payments** - Pembayaran cicilan/DP
2. ✅ **PaymentModal Component** - Default tanggal saat buka modal
3. ✅ **Supabase Service** - Create transaction dengan custom date
4. ✅ **SQLite Service** - Offline mode payment date
5. ✅ **Daily Cash/Bank Report** - Laporan kas masuk per hari
6. ✅ **Sales Report** - Filter pembayaran per periode

### Data Lama
Data pembayaran yang sudah tercatat dengan tanggal salah **tidak otomatis diperbaiki**.

**Opsi:** Biarkan data lama, fix hanya berlaku untuk data baru ke depan.

## 🔧 Deployment

### Step 1: Verify Fix
```bash
git status
# M src/components/common/PaymentModal.vue
# M src/services/transactions.ts
# M src/services/sqlite/transactions.ts
```

### Step 2: Build & Test
```bash
npm run type-check  # Cek type errors
npm run build       # Build production
npm run dev         # Test di browser (timezone WIB)
```

### Step 3: Test Manual
1. ✅ Test pembayaran di malam hari (01:00 - 06:00 WIB)
2. ✅ Verify tanggal default di modal
3. ✅ Verify payment_date tersimpan benar
4. ✅ Verify laporan kas harian

### Step 4: Deploy
```bash
# Web
npm run build
# Deploy ke hosting

# Android
npm run build && npx cap sync
cd android && ./gradlew assembleRelease
```

## 📝 Catatan Penting

### Timezone Best Practices

**DO ✅:**
- Selalu gunakan `toLocaleDateString('en-CA')` untuk date-only (YYYY-MM-DD)
- Gunakan `toISOString()` hanya untuk timestamp dengan waktu
- Kirim tanggal eksplisit dari client, jangan andalkan server timezone
- Document timezone assumptions di kode

**DON'T ❌:**
- Jangan pakai `toISOString().split('T')[0]` untuk tanggal lokal (ini UTC!)
- Jangan andalkan `DEFAULT CURRENT_DATE` di server untuk tanggal user
- Jangan asumsikan server dan client punya timezone sama

### Why `toLocaleDateString('en-CA')`?

Format `'en-CA'` (Canadian English) menghasilkan **YYYY-MM-DD** yang sesuai dengan:
- Format `DATE` di PostgreSQL
- Format ISO 8601 date-only
- Timezone **LOKAL** user (bukan UTC)

```typescript
// Di Indonesia (WIB, UTC+7) pada 2026-11-04 01:52:
new Date().toLocaleDateString('en-CA')
// Output: "2026-11-04" ✅ BENAR (tanggal lokal)

new Date().toISOString().split('T')[0]
// Output: "2026-11-03" ❌ SALAH (tanggal UTC)
```

## 🔗 Related Files

- `TIMEZONE_FIX_PAYMENT_DATE.md` - Dokumentasi lengkap tentang timezone issue (sudah ada sebelumnya)
- `src/utils/date.ts` - Utility functions untuk date formatting (sudah ada warning)
- `src/services/dailyCash.ts` - Query payment_date untuk laporan kas
- `src/services/dailyBank.ts` - Query payment_date untuk laporan bank

## ✅ Checklist

- [x] Identify root cause (timezone mismatch)
- [x] Fix `PaymentModal.vue` (2 lokasi)
- [x] Fix `transactions.ts` (fungsi create)
- [x] Fix `sqlite/transactions.ts` (fungsi addPayment)
- [x] Document the fix
- [x] Type check passed
- [ ] Deploy to production
- [ ] Monitor for 2-3 hari
- [ ] Update `TIMEZONE_FIX_PAYMENT_DATE.md` dengan hasil deploy

---

**Fixed by:** Claude AI Assistant  
**Date:** 2026-11-04  
**Issue Reported by:** User (pembayaran tanggal 4 tercatat tanggal 3)  
**Files Changed:** 3 files  
**Lines Changed:** 5 lines
