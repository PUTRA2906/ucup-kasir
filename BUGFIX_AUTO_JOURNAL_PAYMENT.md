# Bug Fix: Auto-Jurnal Pembayaran Cicilan Tidak Tercatat

## Masalah

Setiap kali pembayaran cicilan dicatat melalui `transaction_payments`, mutasi kas/bank TIDAK tercatat di jurnal akuntansi.

## Root Cause

Ada **2 sistem auto-jurnal yang bentrok** untuk pembayaran cicilan:

1. **Fungsi `add_transaction_payment`** (migrasi `20260912_payment_method_to_bank_account.sql`)
   - Sudah ada auto-jurnal built-in
   - Mencari akun Piutang dengan kode `1-1100`
   
2. **Trigger `auto_journal_payment`** (migrasi `20260925_auto_journal_payment.sql`)  
   - Menambahkan auto-jurnal LAGI dengan trigger
   - Mencari akun Piutang dengan kode `1-1030` ❌ (SALAH)

**Penyebab gagal:**
- User sudah punya COA dengan akun Piutang kode `1-1100` 
- Trigger mencari kode `1-1030` yang tidak ada
- Auto-jurnal gagal **silent** (tidak ada error, tapi jurnal tidak dibuat)

## Solusi yang Diterapkan

### 1. Update Trigger `auto_journal_payment`
Ganti kode akun Piutang dari `1-1030` ke `1-1100` (yang sudah ada di COA user).

File migrasi: `supabase/migrations/20260925_fix_auto_journal_use_1100.sql`

```sql
-- Ambil account ID untuk Piutang Usaha (kode 1-1100)
SELECT id INTO v_receivables_account_id
FROM chart_of_accounts
WHERE code = '1-1100'  -- FIXED: pakai 1-1100, bukan 1-1030
AND user_id = NEW.user_id
AND is_active = true
LIMIT 1;
```

### 2. Simplifikasi Fungsi `add_transaction_payment`
Hapus auto-jurnal manual di fungsi `add_transaction_payment`, serahkan sepenuhnya ke trigger.

File migrasi: `supabase/migrations/20260925_fix_auto_journal_payment_part2.sql`

**Sebelum:**
```sql
-- Fungsi membuat jurnal manual (duplikat dengan trigger)
IF v_receiving_account IS NOT NULL AND v_account_piutang IS NOT NULL THEN
  INSERT INTO journal_entries ...
  INSERT INTO journal_lines ...
END IF;
```

**Sesudah:**
```sql
-- Auto-jurnal ditangani oleh trigger auto_journal_payment
-- Fungsi ini tidak lagi membuat jurnal manual
RETURN v_payment_id;
```

### 3. Auto-Init COA untuk User Baru
Tambahkan fungsi dan trigger untuk auto-init COA default saat user pertama kali membuat transaksi.

File migrasi: `supabase/migrations/20260925_fix_auto_journal_payment.sql`

```sql
CREATE OR REPLACE FUNCTION init_default_coa_for_user(p_user_id uuid) ...

CREATE TRIGGER ensure_coa_exists
  BEFORE INSERT ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_init_coa_on_first_transaction();
```

## Hasil Setelah Perbaikan

✅ Trigger `auto_journal_payment` sekarang menggunakan kode akun yang benar (`1-1100`)  
✅ Trigger menggunakan nama kolom yang benar (`journal_id`, bukan `journal_entry_id`)
✅ Trigger menyertakan semua kolom wajib: `user_id`, `account_code`, `account_name`
✅ Setiap pembayaran cicilan otomatis mencatat jurnal:
   - **Debit** Kas (`1-1000`) atau Bank (`1-1010`)
   - **Kredit** Piutang Usaha (`1-1100`)  
✅ User baru otomatis dibuatkan COA default saat transaksi pertama  
✅ Tidak ada duplikasi jurnal

## Bug yang Ditemukan dan Diperbaiki

### Bug #1: Kode Akun Piutang Salah
- **Masalah**: Trigger mencari kode `1-1030`, tapi user pakai `1-1100`
- **Fix**: Update trigger untuk pakai kode `1-1100`

### Bug #2: Nama Kolom Salah
- **Masalah**: `column "journal_entry_id" of relation "journal_lines" does not exist`
- **Root cause**: Trigger pakai `journal_entry_id`, seharusnya `journal_id`
- **Fix**: Ganti semua `journal_entry_id` ke `journal_id` di INSERT statement

### Bug #3: Kolom Wajib Hilang
- **Masalah**: Trigger tidak insert kolom `user_id`, `account_code`, `account_name`
- **Fix**: Tambahkan kolom wajib tersebut di INSERT statement

## Testing

Untuk test apakah auto-jurnal sudah jalan:

1. Buat transaksi kredit (tempo)
2. Catat pembayaran cicilan
3. Cek tabel `journal_entries` apakah ada entry baru dengan `reference_type = 'payment'`
4. Cek tabel `journal_lines` apakah ada 2 lines (Debit Kas/Bank, Kredit Piutang)

```sql
-- Cek jurnal pembayaran terakhir
SELECT 
  je.journal_number,
  je.entry_date,
  je.description,
  jl.account_code,
  jl.account_name,
  jl.debit,
  jl.credit
FROM journal_entries je
JOIN journal_lines jl ON jl.journal_entry_id = je.id
WHERE je.reference_type = 'payment'
ORDER BY je.created_at DESC
LIMIT 10;
```

## Catatan Penting

- Kode akun standar untuk Piutang Usaha adalah `1-1100` (sesuai COA default sistem)
- Jangan buat akun duplikat dengan fungsi yang sama (`1-1030` vs `1-1100`)
- Auto-jurnal hanya jalan jika user sudah punya COA (akun Kas/Bank/Piutang harus ada dan aktif)

## File yang Terlibat

1. `supabase/migrations/20260925_auto_journal_payment.sql` - Trigger auto-jurnal (yang lama, pakai kode salah)
2. `supabase/migrations/20260925_fix_auto_journal_payment.sql` - Init COA default
3. `supabase/migrations/20260925_fix_auto_journal_payment_part2.sql` - Simplifikasi fungsi
4. `supabase/migrations/20260925_fix_auto_journal_use_1100.sql` - Fix trigger pakai kode benar ✅
5. `supabase/migrations/fix_journal_lines_column_name.sql` - Fix nama kolom journal_lines ✅

## Commit Message Template

```
fix: auto-jurnal pembayaran cicilan tidak tercatat

Root cause: Trigger mencari akun Piutang kode 1-1030 yang tidak ada,
seharusnya pakai 1-1100 (kode standar di COA user).

Changes:
- Update trigger auto_journal_payment pakai kode 1-1100
- Simplifikasi fungsi add_transaction_payment (hapus jurnal manual)
- Tambah auto-init COA untuk user baru

Tested: Pembayaran cicilan sekarang otomatis mencatat jurnal
Debit Kas/Bank + Kredit Piutang Usaha.
```
