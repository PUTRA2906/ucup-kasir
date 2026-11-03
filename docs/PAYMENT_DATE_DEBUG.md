# DEBUG: Payment Date Not Saving Correctly

## 🔍 INVESTIGASI

### Temuan 1: Fungsi Database Sudah Ada
File migrasi `20261008_fix_payment_allocation_and_function_overloading.sql` **SUDAH** memiliki parameter `p_payment_date` dengan default `CURRENT_DATE`.

```sql
-- Line 100-105
CREATE OR REPLACE FUNCTION add_transaction_payment(
  p_transaction_id uuid,
  p_amount numeric,
  p_payment_method text,
  p_notes text DEFAULT NULL,
  p_payment_date date DEFAULT CURRENT_DATE  -- ✅ SUDAH ADA
) RETURNS uuid
```

**Kesimpulan:** Migrasi `20261103_add_payment_date_param.sql` sebenarnya **TIDAK DIPERLUKAN** karena fungsi sudah update sejak Oktober.

### Temuan 2: Frontend Sudah Kirim Parameter
Service `transactions.ts` sudah mengirim `p_payment_date` ke RPC.

**Pertanyaan:** Apakah nilai yang dikirim benar?

---

## 🧪 CARA DEBUG

### Step 1: Cek Console Browser
Sekarang ada `console.log` di `src/services/transactions.ts` yang akan menampilkan:

```javascript
addPayment called with: {
  transactionId: "...",
  amount: 50000,
  paymentMethod: "tunai",
  notes: undefined,
  paymentDate: "2026-11-01",  // ← CEK INI
  p_payment_date: "2026-11-01" // ← CEK INI
}
```

**Cara cek:**
1. Buka browser DevTools (F12)
2. Tab **Console**
3. Klik "Tambah Pembayaran"
4. Pilih tanggal kemarin
5. Submit
6. **Lihat log di console**

**Yang harus dicek:**
- ✅ `paymentDate` harus berisi tanggal yang dipilih (misal: "2026-11-01")
- ✅ `p_payment_date` harus sama dengan `paymentDate`
- ❌ Jika `paymentDate` = `undefined` → masalah di PaymentModal
- ❌ Jika `paymentDate` = `""` (empty string) → masalah di DateField

### Step 2: Cek Network Request
1. Buka browser DevTools (F12)
2. Tab **Network**
3. Filter: `add_transaction_payment`
4. Submit pembayaran
5. Klik request → Tab **Payload**

**Yang harus terlihat:**
```json
{
  "p_transaction_id": "uuid...",
  "p_amount": 50000,
  "p_payment_method": "tunai",
  "p_notes": null,
  "p_payment_date": "2026-11-01"  // ← CEK INI
}
```

**Jika `p_payment_date` = `null` atau tidak ada:**
→ Masalah di frontend (PaymentModal tidak emit dengan benar)

**Jika `p_payment_date` benar tapi database tetap hari ini:**
→ Masalah di fungsi SQL atau trigger

### Step 3: Cek Database Langsung
```sql
-- Cek struktur tabel
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'transaction_payments'
  AND column_name = 'payment_date';

-- Expected:
-- payment_date | date | CURRENT_DATE

-- Cek data terakhir
SELECT 
  id,
  transaction_id,
  amount,
  payment_date,  -- ← CEK INI
  created_at,
  payment_method
FROM transaction_payments
ORDER BY created_at DESC
LIMIT 5;
```

### Step 4: Test Manual di SQL Editor
```sql
-- Test langsung fungsi SQL
SELECT add_transaction_payment(
  'transaction-id-yang-valid'::uuid,
  10000,
  'tunai',
  'test manual',
  '2026-11-01'::date  -- ← Tanggal custom
);

-- Cek hasilnya
SELECT payment_date
FROM transaction_payments
WHERE id = (SELECT id FROM transaction_payments ORDER BY created_at DESC LIMIT 1);

-- Expected: '2026-11-01'
-- Jika result: '2026-11-03' (hari ini) → masalah di fungsi SQL
```

---

## 🔧 KEMUNGKINAN PENYEBAB

### Penyebab 1: DateField Tidak Emit Value dengan Benar
**Gejala:** `console.log` menunjukkan `paymentDate: undefined` atau `""`

**Solusi:** Cek apakah DateField mengupdate `paymentDate` dengan benar

**Test:**
```vue
<!-- Di PaymentModal.vue, tambah temporary debug -->
<p>Debug paymentDate: {{ paymentDate }}</p>
```

Jika tidak berubah saat pilih tanggal → masalah di DateField v-model

### Penyebab 2: Handler Tidak Menerima payment_date
**Gejala:** `console.log` di service tidak muncul atau `paymentDate: undefined`

**Solusi:** Cek handler di TransactionDetail.vue dan InvoiceDetail.vue

**Verifikasi:**
```typescript
// Di handleAddPayment, tambah log
console.log('Handler received payload:', payload)
// Harus ada: payload.payment_date
```

### Penyebab 3: Store Tidak Meneruskan Parameter
**Gejala:** `console.log` di service menunjukkan `paymentDate: undefined`

**Solusi:** Cek apakah store meneruskan parameter

**Verifikasi:**
```typescript
// Di stores/transactions.ts, tambah log di addPayment
console.log('Store addPayment params:', { transactionId, amount, paymentMethod, notes, paymentDate })
```

### Penyebab 4: Database Trigger Override
**Gejala:** Network request benar, tapi database tetap hari ini

**Solusi:** Cek apakah ada trigger `auto_journal_payment` yang override

**Test:**
```sql
-- Cek trigger yang ada
SELECT 
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'transaction_payments';
```

### Penyebab 5: Migrasi Tidak Terpakai
**Gejala:** Fungsi SQL masih versi lama tanpa parameter `p_payment_date`

**Test:**
```sql
-- Cek signature fungsi
SELECT 
  proname as function_name,
  pg_get_function_arguments(oid) as arguments
FROM pg_proc
WHERE proname = 'add_transaction_payment';

-- Expected arguments harus include: p_payment_date date DEFAULT CURRENT_DATE
```

---

## ✅ CHECKLIST DEBUGGING

Lakukan step by step:

- [ ] **Console Log:** Cek `paymentDate` value di console browser
- [ ] **Network Tab:** Cek payload `p_payment_date` di request
- [ ] **Database:** Cek `payment_date` di tabel setelah submit
- [ ] **SQL Function:** Test manual fungsi SQL dengan tanggal custom
- [ ] **Trigger:** Cek apakah ada trigger yang override

---

## 📝 HASIL EKSPEKTASI

### ✅ Jika Benar
```
Console: paymentDate: "2026-11-01"
Network: p_payment_date: "2026-11-01"
Database: payment_date: 2026-11-01
```

### ❌ Jika Salah (Skenario 1: Frontend)
```
Console: paymentDate: undefined
Network: p_payment_date: null
Database: payment_date: 2026-11-03 (hari ini)
```
**Fix:** Masalah di PaymentModal/DateField

### ❌ Jika Salah (Skenario 2: Backend)
```
Console: paymentDate: "2026-11-01"
Network: p_payment_date: "2026-11-01"
Database: payment_date: 2026-11-03 (hari ini)
```
**Fix:** Masalah di fungsi SQL atau trigger

---

## 🚀 NEXT STEPS

1. **Test di browser dengan console terbuka**
2. **Screenshot hasil console.log dan network payload**
3. **Share hasil ke developer**
4. Berdasarkan hasil, kita bisa tentukan fix yang tepat

---

## 📞 BANTUAN

Setelah test, berikan info:
1. Screenshot console.log
2. Screenshot network payload
3. Query hasil: `SELECT * FROM transaction_payments ORDER BY created_at DESC LIMIT 1;`

Dengan info ini kita bisa pinpoint masalahnya dengan akurat.

---

**Update:** 2026-11-03 17:42 WIB
**Status:** DEBUG MODE ENABLED
