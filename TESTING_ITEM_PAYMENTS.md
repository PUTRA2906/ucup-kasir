# Testing: Track Pembayaran Per Item

Dokumen ini berisi skenario testing untuk validasi implementasi track pembayaran per item dan perhitungan laba terealisasi yang akurat.

## 🎯 Tujuan Testing

Memastikan bahwa:
1. Pembayaran dialokasikan dengan benar ke items (strategi FIFO)
2. Perhitungan laba terealisasi akurat per-item (bukan proporsional)
3. Retur tidak mengacaukan perhitungan laba
4. Cicilan pembayaran ter-track dengan benar
5. Delete transaction/payment membersihkan alokasi dengan benar

---

## 📋 Pre-requisites

1. Jalankan migrasi database:
   ```bash
   # Di Supabase Dashboard -> SQL Editor, jalankan berurutan:
   1. supabase/migrations/20260915_transaction_item_payments.sql
   2. supabase/migrations/20260915_update_transaction_functions_with_item_allocation.sql
   ```

2. Backfill data existing (sudah ada di migrasi):
   - Script akan auto-alokasi semua payment yang belum punya alokasi

---

## 🧪 Test Scenarios

### Skenario 1: Margin Berbeda Per Item (Kasus Utama)

**Problem yang dipecahkan:**
Formula proporsional salah karena tidak memperhitungkan margin per-item.

**Setup:**
```sql
-- Produk A: margin rendah (10%)
INSERT INTO products (name, price_buy, price_sell, stock) 
VALUES ('Produk A', 90000, 100000, 100);

-- Produk B: margin tinggi (50%)
INSERT INTO products (name, price_buy, price_sell, stock) 
VALUES ('Produk B', 50000, 100000, 100);
```

**Test Case:**
```sql
-- Transaksi dengan 2 item berbeda margin
SELECT create_transaction(
  p_customer_id := '<customer_uuid>',
  p_customer_name := 'Toko Test',
  p_payment_method := 'transfer',
  p_paid_amount := 100000, -- Bayar untuk Item A saja
  p_discount := 0,
  p_notes := 'Test margin berbeda',
  p_items := '[
    {"product_id": "<produk_a_uuid>", "quantity": 1},
    {"product_id": "<produk_b_uuid>", "quantity": 1}
  ]'::jsonb
);
```

**Expected Results:**
```sql
-- 1. Check alokasi pembayaran
SELECT 
  ti.product_name,
  ti.subtotal as item_total,
  COALESCE(SUM(tip.allocated_amount), 0) as paid_amount
FROM transaction_items ti
LEFT JOIN transaction_item_payments tip ON tip.item_id = ti.id
WHERE ti.transaction_id = '<transaction_id>'
GROUP BY ti.id, ti.product_name, ti.subtotal;

-- Expected output:
-- Produk A | 100000 | 100000 (fully paid - FIFO)
-- Produk B | 100000 |      0 (unpaid)

-- 2. Check laba terealisasi
-- Query laporan penjualan (via service)
```

**Expected Realized Profit:**
- Item A: Laba = 100K - 90K = **10K** (fully paid → realized)
- Item B: Laba = 100K - 50K = **50K** (unpaid → unrealized)
- **Laba Terealisasi = 10K** ✅
- **Laba Tertahan = 50K** ✅

**Old Formula (SALAH):**
- Total laba = 60K
- Proporsi bayar = 100K / 200K = 50%
- Laba terealisasi = 60K × 50% = **30K** ❌

---

### Skenario 2: Pembayaran Cicilan (Multiple Payments)

**Test Case:**
```sql
-- 1. Buat transaksi dengan DP 25%
SELECT create_transaction(
  p_customer_id := '<customer_uuid>',
  p_customer_name := 'Toko Cicilan',
  p_payment_method := 'tunai',
  p_paid_amount := 50000, -- DP 25% dari 200K
  p_discount := 0,
  p_notes := 'Test cicilan',
  p_items := '[
    {"product_id": "<produk_a_uuid>", "quantity": 1, "price": 100000},
    {"product_id": "<produk_b_uuid>", "quantity": 1, "price": 100000}
  ]'::jsonb
);

-- 2. Cicilan 1 (25%)
SELECT add_transaction_payment(
  p_transaction_id := '<transaction_id>',
  p_amount := 50000,
  p_payment_method := 'transfer',
  p_notes := 'Cicilan 1'
);

-- 3. Cicilan 2 (25%)
SELECT add_transaction_payment(
  p_transaction_id := '<transaction_id>',
  p_amount := 50000,
  p_payment_method := 'transfer',
  p_notes := 'Cicilan 2'
);

-- 4. Pelunasan (25%)
SELECT add_transaction_payment(
  p_transaction_id := '<transaction_id>',
  p_amount := 50000,
  p_payment_method := 'tunai',
  p_notes := 'Pelunasan'
);
```

**Expected Results:**
```sql
-- Check alokasi per payment
SELECT 
  tp.amount as payment_amount,
  tp.notes,
  ti.product_name,
  tip.allocated_amount
FROM transaction_payments tp
JOIN transaction_item_payments tip ON tip.payment_id = tp.id
JOIN transaction_items ti ON ti.id = tip.item_id
WHERE tp.transaction_id = '<transaction_id>'
ORDER BY tp.created_at, ti.created_at;

-- Expected allocation (FIFO):
-- Payment 1 (DP 50K)       → Produk A: 50K
-- Payment 2 (Cicilan 50K)  → Produk A: 50K (Item A lunas)
-- Payment 3 (Cicilan 50K)  → Produk B: 50K
-- Payment 4 (Lunas 50K)    → Produk B: 50K (Item B lunas)
```

**Expected Realized Profit Timeline:**
- Setelah DP: Laba terealisasi = 10K × 50% = **5K**
- Setelah Cicilan 1: Laba terealisasi = 10K × 100% = **10K** (Item A lunas)
- Setelah Cicilan 2: Laba terealisasi = 10K + (50K × 50%) = **35K**
- Setelah Lunas: Laba terealisasi = 10K + 50K = **60K** (semua lunas)

---

### Skenario 3: Retur Setelah Pembayaran

**Test Case:**
```sql
-- 1. Buat transaksi lunas
SELECT create_transaction(
  p_customer_id := '<customer_uuid>',
  p_customer_name := 'Toko Retur',
  p_payment_method := 'tunai',
  p_paid_amount := 200000, -- Lunas
  p_discount := 0,
  p_notes := 'Test retur',
  p_items := '[
    {"product_id": "<produk_a_uuid>", "quantity": 2, "price": 100000}
  ]'::jsonb
);

-- 2. Retur 1 item
SELECT create_return(
  p_transaction_id := '<transaction_id>',
  p_items := '[
    {"product_id": "<produk_a_uuid>", "quantity": 1}
  ]'::jsonb,
  p_notes := 'Barang rusak'
);
```

**Expected Results:**
```sql
-- Check item payments (tidak berubah setelah retur)
SELECT * FROM transaction_item_payments 
WHERE transaction_id = '<transaction_id>';

-- Item payments tetap ada (historical record)
-- Tapi laba dihitung dengan memperhitungkan retur

-- Check laba via calculateRealizedProfitFromItems:
-- Item subtotal: 200K
-- Paid amount: 200K
-- Return value: 100K
-- Return COGS: 90K
-- 
-- Net revenue: 200K - 100K = 100K
-- Net COGS: 180K - 90K = 90K
-- Net profit: 100K - 90K = 10K
-- 
-- Realization ratio: 200K / 200K = 100%
-- Realized profit: 10K × 100% = 10K ✅
```

---

### Skenario 4: Manual Reallocation

**Use Case:**
Admin ingin mengubah alokasi pembayaran (misal customer request agar pembayaran dialokasi ke item tertentu dulu).

**Test Case:**
```sql
-- Ambil payment_id dari transaksi
SELECT id, amount FROM transaction_payments 
WHERE transaction_id = '<transaction_id>' 
LIMIT 1;

-- Reallocate payment ke item spesifik
SELECT reallocate_payment(
  p_payment_id := '<payment_id>',
  p_allocations := '[
    {"item_id": "<item_b_uuid>", "amount": 50000},
    {"item_id": "<item_a_uuid>", "amount": 50000}
  ]'::jsonb
);
```

**Expected Results:**
- Alokasi lama di-delete
- Alokasi baru di-insert sesuai input
- Validation trigger mencegah over-allocation

---

### Skenario 5: Delete Transaction & Payment

**Test Case 5a: Delete Payment**
```sql
-- Delete salah satu payment
SELECT delete_transaction_payment(
  p_payment_id := '<payment_id>'
);
```

**Expected:**
- Item_payments untuk payment ini di-delete (deallocate)
- Transaction totals di-update (paid_amount, remaining_amount, payment_status)

**Test Case 5b: Delete Transaction**
```sql
SELECT delete_transaction(
  p_transaction_id := '<transaction_id>'
);
```

**Expected:**
- Transaction di-delete
- Transaction_items di-delete (CASCADE)
- Transaction_payments di-delete (CASCADE)
- Transaction_item_payments di-delete (CASCADE)
- Stok produk dikembalikan

---

## ✅ Validation Checklist

Untuk setiap skenario, pastikan:

- [ ] Alokasi pembayaran sesuai strategi FIFO
- [ ] Total allocated ≤ payment amount (trigger validation)
- [ ] Total allocated per item ≤ item subtotal (trigger validation)
- [ ] Laba terealisasi dihitung per-item (bukan proporsional)
- [ ] Retur mengurangi laba terealisasi dengan benar
- [ ] View `transaction_items_payment_summary` menampilkan data yang akurat
- [ ] Delete operations membersihkan alokasi dengan benar

---

## 🔍 Query Testing Helper

### 1. Check Allocation Status
```sql
-- Summary per item
SELECT * FROM transaction_items_payment_summary 
WHERE transaction_id = '<transaction_id>';

-- Detail allocations
SELECT 
  tp.created_at,
  tp.amount as payment_amount,
  tp.payment_method,
  ti.product_name,
  tip.allocated_amount
FROM transaction_item_payments tip
JOIN transaction_payments tp ON tp.id = tip.payment_id
JOIN transaction_items ti ON ti.id = tip.item_id
WHERE tip.transaction_id = '<transaction_id>'
ORDER BY tp.created_at, ti.created_at;
```

### 2. Check Payment Allocation Status
```sql
-- Apakah payment sudah fully allocated?
SELECT 
  tp.id,
  tp.amount as payment_amount,
  COALESCE(SUM(tip.allocated_amount), 0) as allocated,
  tp.amount - COALESCE(SUM(tip.allocated_amount), 0) as remaining
FROM transaction_payments tp
LEFT JOIN transaction_item_payments tip ON tip.payment_id = tp.id
WHERE tp.transaction_id = '<transaction_id>'
GROUP BY tp.id, tp.amount;
```

### 3. Check Realized Profit (Manual Calculation)
```sql
-- Per item realized profit calculation
SELECT 
  ti.product_name,
  ti.subtotal as item_revenue,
  (p.price_buy * ti.quantity) as item_cogs,
  ti.subtotal - (p.price_buy * ti.quantity) as item_profit,
  COALESCE(SUM(tip.allocated_amount), 0) as paid_amount,
  COALESCE(SUM(tip.allocated_amount), 0) / ti.subtotal as realization_ratio,
  (ti.subtotal - (p.price_buy * ti.quantity)) * 
    (COALESCE(SUM(tip.allocated_amount), 0) / ti.subtotal) as realized_profit
FROM transaction_items ti
JOIN products p ON p.id = ti.product_id
LEFT JOIN transaction_item_payments tip ON tip.item_id = ti.id
WHERE ti.transaction_id = '<transaction_id>'
GROUP BY ti.id, ti.product_name, ti.subtotal, ti.quantity, p.price_buy;
```

---

## 🐛 Known Issues & Limitations

### 1. Retur Tidak Deallocate Payments
**Behavior:** Saat retur, item_payments tidak di-deallocate.

**Reason:** 
- Simplicity (deallocate lalu reallocate ke item mana? kompleks)
- Perhitungan laba sudah akurat (retur dikurangi dari profit)
- User bisa manual reallocate jika perlu

**Workaround:** Gunakan `reallocate_payment()` untuk manual adjustment.

### 2. Diskon Tidak Didistribusi ke Item
**Current:** Diskon diperhitungkan di level transaksi, bukan per-item.

**Impact:** Minor - alokasi pembayaran tetap akurat karena pakai item subtotal.

**Future:** Bisa tambah kolom `discount_amount` di transaction_items jika perlu.

---

## 📊 Performance Considerations

### Query Performance
- Index pada `transaction_item_payments(transaction_id, item_id, payment_id)`
- View `transaction_items_payment_summary` menggunakan LEFT JOIN + GROUP BY
- Untuk laporan besar, consider caching atau materialized view

### Optimization Tips
- Batch query allocations untuk multiple transactions
- Use service layer (`itemPaymentService`) untuk avoid N+1 queries
- Consider adding `paid_amount` column cache di `transaction_items` jika performa jadi issue

---

## 🎓 Next Steps

1. **Jalankan semua skenario testing di Supabase SQL Editor**
2. **Verifikasi hasil via UI (Reports page)**
3. **Test edge cases:**
   - Transaksi dengan banyak items (>10)
   - Pembayaran melebihi total (seharusnya reject)
   - Concurrent payments (race condition?)
4. **Dokumentasi hasil testing**
5. **Deploy ke production setelah yakin semua works**

---

## 📝 Testing Log Template

```
Test Date: _______________
Tester: _______________

| Scenario | Status | Notes |
|----------|--------|-------|
| Skenario 1: Margin Berbeda | ⬜ Pass / ⬜ Fail | |
| Skenario 2: Pembayaran Cicilan | ⬜ Pass / ⬜ Fail | |
| Skenario 3: Retur Setelah Pembayaran | ⬜ Pass / ⬜ Fail | |
| Skenario 4: Manual Reallocation | ⬜ Pass / ⬜ Fail | |
| Skenario 5: Delete Transaction | ⬜ Pass / ⬜ Fail | |

Issues Found:
1. 
2. 

Recommendations:
1. 
2. 
```
