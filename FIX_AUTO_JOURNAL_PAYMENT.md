# Fix: Auto Journal Payment Tidak Jalan di Web

## Masalah

Ketika user melakukan pembayaran cicilan melalui web, **jurnal akuntansi tidak otomatis dibuat**. Padahal di SQLite (offline mode) sudah ada fungsi `postPaymentJournal()` yang bekerja dengan baik.

## Root Cause

Ada **bug di trigger `auto_journal_payment()`** di database Supabase (file migrasi `20260925_auto_journal_payment.sql`):

### Bug 1: Nama Kolom Salah
```sql
INSERT INTO journal_lines (
  journal_entry_id,  -- ❌ SALAH! Kolom ini tidak ada
  account_id,
  debit,
  credit,
  ...
```

**Seharusnya:**
```sql
INSERT INTO journal_lines (
  journal_id,  -- ✅ BENAR
  user_id,     -- ✅ Perlu ditambahkan
  account_id,
  account_code,   -- ✅ Perlu ditambahkan
  account_name,   -- ✅ Perlu ditambahkan
  debit,
  credit,
  ...
```

### Bug 2: Kode Akun Piutang Tidak Konsisten

Trigger menggunakan kode `1-1030` untuk Piutang, padahal sistem lain menggunakan `1-1100`.

### Bug 3: Tidak Support Transfer/QRIS

Trigger hanya cek `tunai` vs selain tunai, tidak handle `transfer` dan `qris` secara eksplisit.

## Solusi

Dibuat migrasi baru: `20261104_fix_auto_journal_payment_trigger.sql`

### Perubahan:

1. ✅ **Fix nama kolom**: `journal_id` (bukan `journal_entry_id`)
2. ✅ **Tambahkan kolom wajib**: `user_id`, `account_code`, `account_name`
3. ✅ **Unifikasi kode akun**: Gunakan `1-1100` untuk Piutang (konsisten dengan sistem lain)
4. ✅ **Support transfer/QRIS**: Payment method `transfer` atau `qris` → Bank (`1-1010`)
5. ✅ **Graceful error**: Jika COA tidak ditemukan, beri NOTICE (tidak error, hanya skip)
6. ✅ **Gunakan payment_date**: Jurnal entry_date pakai `NEW.payment_date` (bukan always NOW)

## Flow Setelah Fix

```
[User bayar cicilan via web]
         |
         v
[transactionsService.addPayment()]
         |
         v
[RPC: add_transaction_payment()]
         |
         v
[INSERT ke transaction_payments]
         |
         v
[TRIGGER: auto_journal_payment()] ← DIPERBAIKI DI SINI
         |
         v
[Auto-create jurnal:
 Debit: Kas/Bank
 Kredit: Piutang Usaha]
         |
         v
[Jurnal tercatat di journal_entries & journal_lines]
```

## Cara Apply Fix

1. **Jalankan migrasi** di Supabase Dashboard:
   ```bash
   # Copy isi file 20261104_fix_auto_journal_payment_trigger.sql
   # Paste ke SQL Editor di Supabase Dashboard
   # Execute
   ```

2. **Test**:
   - Buat transaksi kredit (belum lunas)
   - Bayar cicilan via web
   - Cek Finance → Jurnal Umum
   - Pastikan jurnal pembayaran muncul dengan:
     - Debit: Kas (1-1000) atau Bank (1-1010)
     - Kredit: Piutang Usaha (1-1100)
     - Deskripsi: "Pembayaran cicilan [NOMOR-TRANSAKSI] - [NAMA-CUSTOMER]"

## Verifikasi

### Sebelum Fix:
- ❌ Bayar cicilan → Jurnal TIDAK muncul
- ❌ Error silent (tidak ada pesan error, tapi jurnal tidak tercatat)

### Setelah Fix:
- ✅ Bayar cicilan → Jurnal OTOMATIS muncul
- ✅ Jurnal tercatat dengan kolom lengkap (user_id, account_code, account_name)
- ✅ Support payment_method: tunai, transfer, qris
- ✅ Jika COA belum di-seed, muncul NOTICE di log (graceful)

## Catatan Penting

- **Trigger berjalan otomatis** setelah migrasi dijalankan
- **Tidak perlu ubah kode frontend/backend** - trigger jalan di level database
- **Backward compatible** - Migrasi ini hanya fix fungsi, tidak ubah struktur tabel
- **Data lama tidak terpengaruh** - Trigger hanya jalan untuk pembayaran baru setelah migrasi

## File Terkait

- `supabase/migrations/20261104_fix_auto_journal_payment_trigger.sql` - Fix trigger
- `supabase/migrations/20260925_auto_journal_payment.sql` - Trigger lama (bug)
- `src/services/sqlite/finance.ts` - Referensi implementasi yang benar (offline mode)
