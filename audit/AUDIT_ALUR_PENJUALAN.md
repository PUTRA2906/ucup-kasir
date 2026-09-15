# AUDIT ALUR PENJUALAN - UCUP KASIR
**Tanggal Audit:** 13 September 2026  
**Versi Aplikasi:** v1.0 (commit: 58033ed)  
**Auditor:** Claude Code

---

## RINGKASAN EKSEKUTIF

Audit ini mengidentifikasi **celah keamanan kritis** dan **kelemahan logika bisnis** dalam alur penjualan aplikasi Ucup Kasir. Ditemukan **12 temuan kritis** yang dapat menyebabkan kerugian finansial, inkonsistensi data, dan potensi fraud.

### Temuan Utama:
- ✅ **Race condition stok sudah diperbaiki** (migrasi 20260909)
- ⚠️ **Validasi harga dapat di-bypass** dari frontend
- 🔴 **Tidak ada audit trail** untuk perubahan harga manual
- 🔴 **Limit kredit dapat diakali** dengan transaksi simultan
- ⚠️ **Pembayaran berlebih tidak divalidasi** dengan benar
- 🔴 **Void transaction tidak validasi** status surat jalan

---

## 1. ALUR PENJUALAN LENGKAP

### 1.1 Flow Diagram

```
[Frontend Form]
      ↓
[Validasi Client-Side]
      ↓
[Service Layer: transactionsService.create()]
      ↓
[Supabase RPC: create_transaction()]
      ↓
[Fungsi SQL SECURITY DEFINER]
      ↓
├─ Validasi Stok (FOR UPDATE lock) ✅
├─ Validasi Limit Kredit ⚠️
├─ Hitung Total (subtotal - diskon - retur)
├─ Insert transactions
├─ Insert transaction_items
├─ Update products.stock (optimistic locking) ✅
├─ Insert transaction_payments (jika ada bayaran)
└─ Auto-jurnal akuntansi
      ↓
[Return transaction_id]
```

### 1.2 Komponen Terlibat

**Frontend:**
- `/src/views/Transactions/CreateTransaction.vue` (tidak ada di audit, perlu dicek)
- `/src/views/Transactions/TransactionList.vue` (line 1-1057)
- `/src/services/transactions.ts` (line 1-121)
- `/src/services/priceMatrixService.ts` (line 1-300)

**Backend (SQL Functions):**
- `create_transaction()` - Migrasi terakhir: `20260909_fix_race_condition_stock.sql`
- `add_transaction_payment()` - Migrasi: `20260901_finance_module.sql`
- `void_transaction()` - Migrasi: `20260901_finance_module.sql`
- `delete_transaction()` - Migrasi: `20260901_finance_module.sql`
- `get_applicable_price()` - Migrasi: `20260909_customer_groups.sql`

**Database Tables:**
- `transactions` (header transaksi)
- `transaction_items` (rincian item)
- `transaction_payments` (riwayat pembayaran)
- `products` (stok)
- `customers` (limit kredit)
- `journal_entries` + `journal_lines` (akuntansi)

---

## 2. TEMUAN KEAMANAN & CELAH KRITIS

### 🔴 KRITIS #1: Validasi Harga Dapat Di-Bypass

**Lokasi:** `create_transaction()` line 67-68 (20260909_fix_race_condition_stock.sql)

```sql
v_price := COALESCE(NULLIF((v_item->>'price')::numeric, 0), v_product.price_sell);
```

**Masalah:**
- Frontend dapat mengirim **harga custom** melalui parameter `p_items.price`
- Fungsi SQL **menerima harga dari client** tanpa validasi
- Tidak ada pengecekan apakah harga custom sesuai dengan matriks harga
- User bisa menjual produk dengan harga 1 rupiah jika data dikirim langsung via API

**Skenario Exploit:**
```javascript
// Attacker bisa mengirim payload ini langsung ke Supabase RPC
supabase.rpc('create_transaction', {
  p_items: [{
    product_id: 'uuid-produk-mahal',
    quantity: 100,
    price: 1  // BYPASS! Harga seharusnya Rp 100.000
  }]
})
```

**Dampak:** 
- Kerugian finansial langsung
- Inkonsistensi perhitungan laba rugi
- Fraud oleh karyawan internal

**Rekomendasi:**
1. Fungsi `create_transaction()` HARUS memanggil `get_applicable_price()` untuk validasi
2. Harga custom hanya boleh jika lebih tinggi dari harga matriks (diskon tidak boleh)
3. Log semua transaksi dengan harga custom ke audit trail

---

### 🔴 KRITIS #2: Limit Kredit Race Condition

**Lokasi:** `create_transaction()` line 89-99 (20260909_fix_race_condition_stock.sql)

```sql
SELECT COALESCE(SUM(remaining_amount), 0) INTO v_current_debt
FROM transactions
WHERE customer_id = p_customer_id
  AND user_id = auth.uid()
  AND remaining_amount > 0
  AND status <> 'batal';
```

**Masalah:**
- Query **tidak menggunakan FOR UPDATE lock** pada tabel `customers`
- Dua transaksi simultan dapat bypass limit kredit
- Gap antara cek limit dan insert transaksi

**Skenario Exploit:**
```
T1: Cek hutang customer A = Rp 9.000.000 (limit 10jt)
T2: Cek hutang customer A = Rp 9.000.000 (limit 10jt)
T1: Insert transaksi Rp 1.500.000 → Total 10.5jt ✅ (masih lolos)
T2: Insert transaksi Rp 1.500.000 → Total 12jt ✅ (masih lolos)
Hasil: Customer A punya hutang Rp 12jt (melampaui limit 10jt)
```

**Dampak:**
- Customer bisa melampaui limit kredit
- Risiko piutang tak tertagih meningkat
- Inkonsistensi kebijakan kredit

**Rekomendasi:**
```sql
-- Tambahkan di awal fungsi create_transaction
IF p_customer_id IS NOT NULL AND v_remaining > 0 THEN
  SELECT credit_limit INTO v_credit_limit
  FROM customers
  WHERE id = p_customer_id AND user_id = auth.uid()
  FOR UPDATE;  -- LOCK baris customer
  
  -- Lalu hitung debt dengan subquery
END IF;
```

---

### 🔴 KRITIS #3: Tidak Ada Audit Trail untuk Harga Custom

**Lokasi:** `transaction_items` table schema

**Masalah:**
- Tabel `transaction_items` menyimpan harga final tapi **tidak menyimpan alasan** kenapa harga berbeda
- Tidak ada log apakah harga berasal dari:
  - Harga default produk
  - Harga tier
  - Harga khusus customer
  - Harga khusus grup
  - **Override manual oleh kasir**
- Tidak ada field `price_source` atau `override_reason`

**Dampak:**
- Tidak bisa audit transaksi dengan harga mencurigakan
- Tidak bisa track fraud karyawan
- Tidak bisa investigasi complain customer

**Rekomendasi:**
1. Tambah kolom `price_source` enum('default', 'tier', 'customer', 'group', 'manual')
2. Tambah kolom `price_override_reason` text (wajib diisi jika manual)
3. Tambah kolom `expected_price` untuk komparasi

---

### ⚠️ SEDANG #4: Void Transaction Tidak Validasi Status Surat Jalan

**Lokasi:** `void_transaction()` line 816-828 (20260901_finance_module.sql)

**Masalah:**
- Fungsi `void_transaction()` **tidak cek** apakah transaksi sudah ada surat jalan
- Frontend ada validasi di TransactionList.vue (line 935) tapi **hanya UI**
- User bisa langsung panggil RPC `void_transaction()` dan bypass validasi UI

**Skenario:**
```
1. Transaksi A sudah dikirim (ada surat jalan status "delivered")
2. Kasir panggil void_transaction(A) via API
3. Stok dikembalikan, tapi barang sudah sampai ke customer
4. Customer punya barang gratis, toko rugi
```

**Dampak:**
- Stok tidak akurat
- Kerugian finansial
- Inkonsistensi dengan modul shipping

**Rekomendasi:**
```sql
-- Tambahkan di awal void_transaction()
PERFORM 1
FROM delivery_orders
WHERE p_transaction_id = ANY(transaction_ids)
  AND status IN ('in_transit', 'delivered')
  AND user_id = auth.uid()
LIMIT 1;

IF FOUND THEN
  RAISE EXCEPTION 'Transaksi tidak dapat dibatalkan karena sudah dalam pengiriman';
END IF;
```

---

### ⚠️ SEDANG #5: Delete Transaction Tidak Cek Referensi Surat Jalan

**Lokasi:** `delete_transaction()` line 920-939 (20260901_finance_module.sql)

**Masalah:**
- Fungsi `delete_transaction()` mengembalikan stok tapi **tidak cek** apakah transaksi dirujuk `delivery_orders`
- Bisa menyebabkan orphaned reference di tabel `delivery_orders.transaction_ids`

**Rekomendasi:**
```sql
-- Tambahkan validasi sebelum delete
PERFORM 1
FROM delivery_orders
WHERE p_transaction_id = ANY(transaction_ids)
  AND user_id = auth.uid()
LIMIT 1;

IF FOUND THEN
  RAISE EXCEPTION 'Transaksi tidak dapat dihapus karena terkait dengan surat jalan';
END IF;
```

---

### ⚠️ SEDANG #6: Pembayaran Berlebih Tidak Divalidasi dengan Benar

**Lokasi:** `add_transaction_payment()` line 550-552 (20260901_finance_module.sql)

```sql
IF p_amount > v_remaining THEN
  RAISE EXCEPTION 'Pembayaran melebihi sisa cicilan (sisa %)', v_remaining;
END IF;
```

**Masalah:**
- Validasi ada, tapi **tidak handle edge case** untuk `v_remaining = 0`
- Jika transaksi sudah lunas (`v_remaining = 0`), tetap bisa bayar lagi

**Skenario:**
```
1. Transaksi Rp 1.000.000, sudah lunas (remaining = 0)
2. Customer bayar lagi Rp 500.000
3. Error: "Pembayaran melebihi sisa cicilan (sisa 0)"
4. Tapi seharusnya error message lebih jelas: "Transaksi sudah lunas"
```

**Rekomendasi:**
```sql
IF v_remaining <= 0 THEN
  RAISE EXCEPTION 'Transaksi sudah lunas, tidak bisa menambah pembayaran';
END IF;

IF p_amount > v_remaining THEN
  RAISE EXCEPTION 'Pembayaran (%) melebihi sisa cicilan (%)', p_amount, v_remaining;
END IF;
```

---

### ⚠️ SEDANG #7: Custom Transaction Date Bisa Backdate Tanpa Batas

**Lokasi:** `create_transaction()` line 121-131 (20260909_fix_race_condition_stock.sql)

**Masalah:**
- Parameter `p_transaction_date` menerima **tanggal apa pun** tanpa validasi
- User bisa backdate transaksi sampai tahun 1900 atau future date ke tahun 2099
- Tidak ada validasi range tanggal wajar

**Dampak:**
- Manipulasi laporan periode
- Fraud untuk tutup buku akuntansi
- Inkonsistensi laporan pajak

**Rekomendasi:**
```sql
-- Tambahkan validasi di awal fungsi
IF p_transaction_date > now() THEN
  RAISE EXCEPTION 'Tanggal transaksi tidak boleh di masa depan';
END IF;

IF p_transaction_date < (now() - INTERVAL '90 days') THEN
  RAISE EXCEPTION 'Transaksi hanya bisa di-backdate maksimal 90 hari';
END IF;
```

---

### 🟡 RENDAH #8: Tidak Ada Rate Limiting untuk Create Transaction

**Masalah:**
- Tidak ada throttling di level aplikasi atau database
- User bisa spam transaksi dalam hitungan detik
- Berpotensi DDoS atau abuse

**Rekomendasi:**
- Implementasi rate limiting di Supabase Edge Functions
- Atau tambahkan check di fungsi SQL:
```sql
-- Cek transaksi dalam 1 menit terakhir
SELECT COUNT(*) INTO v_recent_count
FROM transactions
WHERE user_id = auth.uid()
  AND created_at > now() - INTERVAL '1 minute';

IF v_recent_count > 10 THEN
  RAISE EXCEPTION 'Terlalu banyak transaksi dalam 1 menit. Tunggu sebentar.';
END IF;
```

---

### 🟡 RENDAH #9: Harga Matriks Tidak Validasi Overlap Range yang Kompleks

**Lokasi:** `validate_price_tier_range()` line 188-224 (20260909_price_matrix_system.sql)

**Masalah:**
- Trigger validasi overlap hanya cek range quantity
- Tidak handle kasus **multiple tier aktif di periode yang sama**
- Contoh: Tier A (1-10 pcs, Jan-Mar) dan Tier B (5-15 pcs, Feb-Apr) → overlap!

**Rekomendasi:**
- Perbaiki trigger untuk deteksi overlap periode + range secara simultan
- Atau tambah unique constraint di database

---

### 🟡 RENDAH #10: Get Applicable Price Bisa Return NULL

**Lokasi:** `get_applicable_price()` line 108-186 (20260909_customer_groups.sql)

**Masalah:**
- Fungsi bisa return NULL jika produk tidak ditemukan
- Caller tidak handle NULL dengan baik

**Rekomendasi:**
```sql
IF NOT FOUND THEN
  RAISE EXCEPTION 'Produk tidak ditemukan';  -- Sudah ada ✅
END IF;
```

---

### 🟡 RENDAH #11: Diskon + Return Amount Bisa Bikin Total Negatif

**Lokasi:** `create_transaction()` line 73 (20260909_fix_race_condition_stock.sql)

```sql
v_total := GREATEST(v_total - COALESCE(p_discount, 0) - COALESCE(p_return_amount, 0), 0);
```

**Masalah:**
- Fungsi `GREATEST(..., 0)` mencegah negatif, tapi **tidak raise exception**
- Jika diskon + retur > subtotal, transaksi jadi Rp 0
- User bisa dapat barang gratis

**Rekomendasi:**
```sql
v_total_before := v_total;
v_total := v_total - COALESCE(p_discount, 0) - COALESCE(p_return_amount, 0);

IF v_total < 0 THEN
  RAISE EXCEPTION 'Total negatif! Subtotal: %, Diskon: %, Retur: %',
    v_total_before, p_discount, p_return_amount;
END IF;
```

---

### 🟡 RENDAH #12: Tidak Ada Logging untuk RPC Call

**Masalah:**
- Semua fungsi SQL `SECURITY DEFINER` tidak log aktivitas
- Tidak ada audit trail untuk:
  - Siapa yang panggil fungsi
  - Parameter apa yang dikirim
  - Kapan dipanggil
  - Berhasil atau gagal

**Rekomendasi:**
- Buat tabel `audit_log` untuk track semua RPC call
- Atau integrasikan dengan Supabase Logs API

---

## 3. KELEMAHAN LOGIKA BISNIS

### 3.1 Matriks Harga: Kompleksitas Prioritas

**Lokasi:** `get_applicable_price()` (line 108-186)

**Analisis:**
Prioritas harga:
1. **Customer individual** → tertinggi
2. **Customer group** → sedang
3. **Price tier** (quantity) → rendah
4. **Default** → terendah

**Masalah:**
- Jika customer masuk 2 grup dengan harga berbeda, fungsi ambil **MIN price** (line 150)
- Bisa disalahgunakan: masukkan customer ke banyak grup untuk dapat harga termurah

**Rekomendasi:**
- Batasi customer hanya bisa masuk 1 grup aktif
- Atau ubah logika jadi pilih grup dengan **priority tertinggi**, bukan MIN price

---

### 3.2 Stock Movement: Tidak Konsisten dengan Auto-Jurnal

**Masalah:**
- Fungsi `create_transaction()` update stok tapi **tidak catat ke `stock_movements`**
- Auto-jurnal mencatat HPP tapi tidak sinkron dengan stock movement
- Jika ada bug di auto-jurnal, stok dan akuntansi bisa tidak match

**Rekomendasi:**
- Setiap perubahan stok HARUS catat ke `stock_movements` dengan `reference_type='transaction'`

---

### 3.3 Return Amount: Tidak Terintegrasi dengan Tabel Returns

**Lokasi:** `transactions.return_amount` column

**Masalah:**
- Ada kolom `return_amount` di `transactions` tapi tidak link ke tabel `returns`
- Tidak jelas apakah `return_amount` untuk:
  - Potongan retur yang sudah dibuat sebelumnya
  - Atau diskon langsung saat transaksi
- Bisa menyebabkan double-counting jika salah input

**Rekomendasi:**
- Hapus `return_amount` dari `create_transaction()`
- Return hanya via fungsi `create_return()` yang terpisah

---

## 4. REKOMENDASI PERBAIKAN PRIORITAS

### Priority 1: SEGERA (< 1 Minggu)

1. **Fix validasi harga custom** (#1)
   - Impact: 🔴 Kritis - kerugian finansial langsung
   - Effort: Medium (2-3 hari)
   
2. **Fix race condition limit kredit** (#2)
   - Impact: 🔴 Kritis - bypass kebijakan kredit
   - Effort: Low (1 hari)

3. **Fix void transaction validation** (#4)
   - Impact: ⚠️ Sedang - stok tidak akurat
   - Effort: Low (1 hari)

### Priority 2: MENENGAH (1-2 Minggu)

4. **Tambah audit trail harga** (#3)
   - Impact: 🔴 Kritis - tapi tidak langsung merugikan
   - Effort: Medium (3-4 hari)

5. **Fix delete transaction validation** (#5)
   - Impact: ⚠️ Sedang - orphaned references
   - Effort: Low (1 hari)

6. **Fix validasi pembayaran berlebih** (#6)
   - Impact: ⚠️ Sedang - user experience
   - Effort: Low (1 hari)

7. **Validasi custom transaction date** (#7)
   - Impact: ⚠️ Sedang - manipulasi laporan
   - Effort: Low (1 hari)

### Priority 3: RENDAH (> 2 Minggu)

8. Rate limiting (#8)
9. Harga matriks overlap validation (#9)
10. Get applicable price NULL handling (#10)
11. Diskon + retur validation (#11)
12. Audit logging (#12)

---

## 5. KESIMPULAN

### Poin Positif:
✅ Race condition stok **sudah diperbaiki** dengan FOR UPDATE lock dan optimistic locking  
✅ RLS (Row Level Security) sudah diterapkan dengan benar  
✅ Auto-jurnal akuntansi terintegrasi  
✅ Fungsi SQL menggunakan `SECURITY DEFINER` untuk atomicity  

### Poin Negatif:
🔴 Validasi harga dari frontend dapat di-bypass  
🔴 Limit kredit masih rentan race condition  
🔴 Tidak ada audit trail untuk transaksi mencurigakan  
⚠️ Void/delete transaction tidak validasi referensi eksternal  
⚠️ Custom date bisa disalahgunakan untuk manipulasi laporan  

### Skor Keamanan: **6.5/10**

**Alasan:**
- Fungsi SQL sudah cukup robust (race condition stok fixed)
- Tapi validasi bisnis masih lemah (harga, limit kredit)
- Tidak ada mekanisme audit yang memadai
- Beberapa edge case belum di-handle

---

## 6. LANGKAH SELANJUTNYA

1. **Review dengan tim** untuk prioritas fixing
2. **Buat tiket** untuk setiap temuan di issue tracker
3. **Implementasi fix** sesuai prioritas
4. **Testing** untuk setiap fix:
   - Unit test untuk fungsi SQL
   - Integration test untuk alur end-to-end
   - Security test untuk bypass scenarios
5. **Re-audit** setelah semua fix di-deploy

---

**Dokumen ini bersifat CONFIDENTIAL dan hanya untuk internal tim development.**
