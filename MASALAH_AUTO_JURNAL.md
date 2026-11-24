# MASALAH AUTO-JURNAL: Investigasi Lengkap

**Tanggal:** 2026-11-05  
**Status:** ❌ KRITIS - Auto-jurnal tidak berjalan untuk stok awal dan pembayaran

## Ringkasan Masalah

User melaporkan bahwa auto-posting jurnal **TIDAK BERJALAN** untuk:
1. ❌ Input stok awal (adjustment)
2. ✅ Buat transaksi penjualan (SEHARUSNYA JALAN)
3. ❌ Tambah pembayaran cicilan (SEHARUSNYA JALAN tapi ADA MASALAH)

## Temuan Investigasi

### 1. ✅ Auto-jurnal Transaksi Penjualan (create_transaction)

**Status:** SUDAH ADA dan LENGKAP  
**File:** `supabase/migrations/20261103_auto_allocate_payment_in_create_transaction.sql`  
**Baris:** 184-216

**Jurnal yang dibuat:**
- Debit: Kas (1-1000) - sebesar yang dibayar
- Debit: Piutang (1-1100) - sisa yang belum dibayar
- Kredit: Pendapatan Penjualan (4-4000) - total penjualan
- Debit: HPP (5-5000) - harga pokok
- Kredit: Persediaan (1-1200) - harga pokok

**Kondisi:** Hanya jalan jika user sudah punya COA dengan code:
- 1-1000 (Kas)
- 1-1100 (Piutang Usaha)
- 4-4000 (Pendapatan Penjualan)
- 5-5000 (HPP)
- 1-1200 (Persediaan Barang)

### 2. ✅ Auto-jurnal Pembayaran Cicilan (add_transaction_payment)

**Status:** TRIGGER SUDAH ADA tapi KEMUNGKINAN ADA BUG  
**File Trigger:** `supabase/migrations/20261104_fix_auto_journal_payment_trigger.sql`  
**File Fungsi:** `supabase/migrations/20260901_finance_module.sql` (baris 574-596)

**Trigger:**
```sql
CREATE TRIGGER trigger_auto_journal_payment
  AFTER INSERT ON transaction_payments
  FOR EACH ROW
  EXECUTE FUNCTION auto_journal_payment();
```

**Jurnal yang dibuat:**
- Debit: Kas (1-1000) atau Bank (1-1010) - sesuai payment_method
- Kredit: Piutang Usaha (1-1100)

**KEMUNGKINAN MASALAH:**
- Fungsi `auto_journal_payment()` di file terbaru (20261104) berbeda dengan fungsi `add_transaction_payment()` di file lama (20260901)
- Ada 2 versi fungsi yang berbeda untuk hal yang sama
- Trigger memanggil `auto_journal_payment()` (dari 20261104)
- Tapi frontend memanggil `add_transaction_payment()` (dari 20260901)

### 3. ❌ Auto-jurnal Stok Awal (TIDAK ADA)

**Status:** TIDAK ADA SAMA SEKALI  
**Fungsi yang dipanggil frontend:** `create_stock_adjustment`  
**File yang memanggil:** `src/services/stock.ts` baris 159

**MASALAH UTAMA:**
```typescript
// Frontend memanggil ini:
const { data, error } = await supabase.rpc('create_stock_adjustment', {
  p_product_id: adjustment.product_id,
  p_adjustment_type: adjustment.adjustment_type,
  p_quantity_before: adjustment.quantity_before,
  p_quantity_after: adjustment.quantity_after,
  p_quantity_change: adjustment.quantity_change,
  p_reason: adjustment.reason,
  p_notes: adjustment.notes || null,
})
```

**TAPI fungsi `create_stock_adjustment` TIDAK ADA di database!**

Hasil grep: TIDAK DITEMUKAN di semua file migration.

## Root Cause Analysis

### Masalah 1: Fungsi create_stock_adjustment TIDAK ADA

- Frontend sudah siap memanggil fungsi ini
- Database tidak punya fungsi ini
- Stok adjustment langsung insert ke tabel tanpa validasi dan tanpa auto-jurnal
- **DAMPAK:** Stok awal tidak tercatat di jurnal akuntansi

### Masalah 2: Kemungkinan Konflik Fungsi Pembayaran

Ada 2 versi berbeda:
1. **add_transaction_payment()** (20260901) - fungsi RPC yang dipanggil frontend, punya auto-jurnal
2. **auto_journal_payment()** (20261104) - fungsi trigger yang berjalan AFTER INSERT

**Kemungkinan skenario:**
- Frontend memanggil `add_transaction_payment()`
- Fungsi ini INSERT ke `transaction_payments`
- INSERT trigger `trigger_auto_journal_payment` yang memanggil `auto_journal_payment()`
- **HASIL:** Jurnal dibuat 2 kali (DUPLIKAT) ATAU salah satu fungsi override yang lain

### Masalah 3: Kondisi COA Tidak Terpenuhi

Semua auto-jurnal punya kondisi:
```sql
IF v_account_kas IS NOT NULL AND v_account_pendapatan IS NOT NULL THEN
  -- buat jurnal
END IF;
```

**DAMPAK:** Jika user belum seed COA atau akun tidak aktif, jurnal TIDAK dibuat tapi TIDAK ADA ERROR.

## Solusi yang Diperlukan

### 1. Buat Fungsi create_stock_adjustment

Fungsi ini harus:
- Validasi input (quantity, product_id)
- Insert ke `stock_adjustments`
- Update stok di `products`
- Catat movement di `stock_movements`
- **AUTO-JURNAL:** Debit/Kredit Persediaan vs Modal (tergantung tipe adjustment)

### 2. Perbaiki Duplikasi Fungsi Pembayaran

**Opsi A:** Hapus auto-jurnal dari `add_transaction_payment()`, biarkan trigger handle semua
**Opsi B:** Hapus trigger, biarkan fungsi RPC handle semua (lebih konsisten dengan create_transaction)

**Rekomendasi:** Opsi B - konsisten dengan pola yang sudah ada di `create_transaction`

### 3. Tambahkan Error Handling untuk COA

Ubah dari:
```sql
IF v_account_kas IS NOT NULL THEN
  -- buat jurnal
END IF;
```

Menjadi:
```sql
IF v_account_kas IS NULL THEN
  RAISE NOTICE 'Akun Kas tidak ditemukan. Auto-jurnal tidak dibuat.';
END IF;
```

Atau lebih baik lagi:
```sql
IF v_account_kas IS NULL THEN
  RAISE EXCEPTION 'Setup COA terlebih dahulu sebelum melakukan transaksi';
END IF;
```

### 4. Verifikasi Trigger Payment Tidak Duplikat

Cek apakah `add_transaction_payment()` masih punya auto-jurnal:
- Jika ya → hapus auto-jurnal dari fungsi RPC
- Jika tidak → trigger sudah benar

## Testing Plan

Setelah fix:
1. ✅ Seed COA untuk user test
2. ✅ Buat transaksi baru → cek jurnal otomatis
3. ✅ Tambah pembayaran → cek jurnal otomatis (TIDAK DUPLIKAT)
4. ✅ Input stok awal → cek jurnal otomatis
5. ✅ Buat retur → cek jurnal reversal
6. ✅ Void transaksi → cek jurnal void

## File yang Perlu Diubah/Dibuat

1. **BARU:** `supabase/migrations/20261105_create_stock_adjustment_function.sql`
2. **UPDATE:** Verifikasi `add_transaction_payment()` tidak duplikasi dengan trigger
3. **UPDATE:** Tambah error handling untuk COA di semua fungsi auto-jurnal

## Kesimpulan

**Root cause utama:**
1. ❌ Fungsi `create_stock_adjustment` TIDAK ADA → stok awal tidak ke jurnal
2. ⚠️ Kemungkinan duplikasi fungsi pembayaran → pembayaran mungkin tidak ke jurnal atau duplikat
3. ⚠️ Kondisi silent fail jika COA belum setup → jurnal tidak dibuat tanpa error

**Prioritas fix:**
1. HIGH: Buat fungsi `create_stock_adjustment` dengan auto-jurnal
2. HIGH: Perbaiki duplikasi fungsi pembayaran
3. MEDIUM: Tambah error handling untuk COA
4. LOW: Dokumentasi cara seed COA untuk user baru
