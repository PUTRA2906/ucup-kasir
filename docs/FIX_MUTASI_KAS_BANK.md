# Fix: Mutasi Kas dan Bank Tidak Berfungsi di Android

## Masalah

Saat menambahkan pembayaran cicilan di aplikasi Android, saldo kas/bank tidak terupdate dan riwayat mutasi tidak menampilkan transaksi pembayaran tersebut.

## Root Cause

1. **Kolom `payment_date` tidak ada di tabel `transaction_payments`**
   - Trigger `auto_journal_payment` mencoba mengakses `NEW.payment_date` (baris 68 di migrasi `20260925_auto_journal_payment.sql`)
   - Karena kolom tidak ada, trigger gagal secara silent dan jurnal tidak dibuat
   - Tanpa jurnal, mutasi kas/bank tidak tercatat

2. **Fungsi `init_default_coa_for_user` menggunakan bahasa Inggris**
   - Fungsi menggunakan nilai `'asset'`, `'revenue'`, `'expense'` (Inggris)
   - Constraint check pada tabel `chart_of_accounts` hanya menerima `'aset'`, `'pendapatan'`, `'beban'` (Indonesia)
   - Beberapa user baru tidak memiliki COA, sehingga trigger auto-jurnal skip

## Solusi

### 1. Tambah Kolom `payment_date` (Migrasi: `20261007_fix_payment_date_column.sql`)

- Tambahkan kolom `payment_date DATE NOT NULL DEFAULT CURRENT_DATE` ke tabel `transaction_payments`
- Update existing records dengan `payment_date = DATE(created_at)`
- Tambahkan index untuk performa query
- Update fungsi `add_transaction_payment` untuk menerima parameter `p_payment_date` (default: `CURRENT_DATE`)
- Perbaiki trigger `auto_journal_payment` untuk handle NULL dengan fallback: `COALESCE(NEW.payment_date, DATE(NEW.created_at))`

### 2. Perbaiki Fungsi Inisialisasi COA (Migrasi: `20261007_fix_init_default_coa_language.sql`)

- Update fungsi `init_default_coa_for_user` untuk menggunakan bahasa Indonesia:
  - `'asset'` → `'aset'`
  - `'revenue'` → `'pendapatan'`
  - `'expense'` → `'beban'`
  - `'credit'` → `'kredit'`
- Inisialisasi COA untuk semua user yang belum memiliki COA

## Files Changed

1. `supabase/migrations/20261007_fix_payment_date_column.sql` - Tambah kolom payment_date dan perbaiki trigger
2. `supabase/migrations/20261007_fix_init_default_coa_language.sql` - Perbaiki fungsi init COA

## Testing

Setelah migrasi diterapkan:

1. ✅ Kolom `payment_date` berhasil ditambahkan dengan default `CURRENT_DATE`
2. ✅ Fungsi `add_transaction_payment` diupdate dengan parameter `p_payment_date`
3. ✅ Trigger `auto_journal_payment` diperbaiki untuk handle NULL payment_date
4. ✅ Fungsi `init_default_coa_for_user` diperbaiki menggunakan bahasa Indonesia
5. ✅ Semua user sudah memiliki COA minimal (6 akun)
6. ✅ Pembayaran existing sudah memiliki jurnal yang dibuat

## Backward Compatibility

- Frontend tidak perlu diubah karena parameter `p_payment_date` memiliki default value `CURRENT_DATE`
- Service `transactionsService.addPayment()` tetap kompatibel (tidak mengirim `p_payment_date`, akan menggunakan default)
- Existing data tidak terpengaruh

## Cara Testing di Android

1. Buat transaksi kredit (belum lunas)
2. Tambahkan pembayaran cicilan melalui halaman detail transaksi
3. Buka halaman **Mutasi Kas** atau **Mutasi Bank** (sesuai metode pembayaran)
4. Verifikasi bahwa pembayaran tercatat di riwayat mutasi
5. Verifikasi bahwa saldo terupdate dengan benar

## Related Issues

- Trigger `auto_journal_payment` sebelumnya gagal silent karena kolom `payment_date` tidak ada
- Service `dailyCashService` dan `dailyBankService` sudah benar, masalahnya ada di database trigger
- COA harus sudah diinisialisasi agar trigger auto-jurnal berfungsi

## Author

Fixed by: Claude
Date: 2026-10-07
