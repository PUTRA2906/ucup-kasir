# Integrasi SQLite untuk Daily Cash & Bank Report

## Overview

Implementasi SQLite untuk laporan kas dan bank harian telah ditambahkan untuk mendukung mode offline pada aplikasi Android.

## File Baru

### 1. `src/services/sqlite/dailyCash.ts`

Service SQLite untuk laporan kas harian dengan fungsi:

- `getDailyCashSummary(date: string)` - Ringkasan kas harian
  - Total masuk/keluar (tunai + transfer)
  - Breakdown per metode pembayaran
  - Jumlah transaksi dan cicilan
  
- `getDailyCashTransactions(date: string)` - Detail transaksi kas
  - Penjualan (sales)
  - Pembayaran cicilan (payments)
  - Pengeluaran dari jurnal (journal)

### 2. `src/services/sqlite/dailyBank.ts`

Service SQLite untuk laporan bank harian dengan fungsi:

- `getDailyBankSummary(date: string)` - Ringkasan bank harian
  - Total masuk/keluar (transfer only)
  - Jumlah transaksi dan cicilan
  
- `getDailyBankTransactions(date: string)` - Detail transaksi bank
  - Penjualan dengan metode transfer
  - Pembayaran cicilan dengan metode transfer
  - Pengeluaran dari jurnal (bank accounts)

## Implementasi

### Data Source

**Daily Cash:**
- Akun kas: `1-1000` (Kas), `1-1010` (Bank)
- Transaksi masuk: penjualan + cicilan (tunai & transfer)
- Transaksi keluar: jurnal dengan credit di akun kas/bank

**Daily Bank:**
- Akun bank: `1-1002` (Bank), `1-1010` (Bank)
- Transaksi masuk: penjualan + cicilan (transfer only)
- Transaksi keluar: jurnal dengan credit di akun bank

### Query Pattern

Semua query menggunakan:
- `DATE(created_at) = DATE(?)` untuk filter tanggal
- `user_id = ?` untuk isolasi multi-user
- `status NOT IN ('void', 'batal')` untuk exclude transaksi void
- `ORDER BY created_at DESC` untuk sorting

### Konsistensi dengan Supabase

Implementasi SQLite ini adalah **mirror** dari service Supabase (`src/services/dailyCash.ts` dan `dailyBank.ts`) dengan perubahan:

1. Query disesuaikan dengan sintaks SQLite
2. Tidak ada `.select()` chain, menggunakan raw SQL
3. Join manual untuk relasi (transaction_payments → transactions)
4. User authentication manual via `getCurrentUserId()`

## Penggunaan

```typescript
import { sqliteDailyCashService } from '@/services/sqlite/dailyCash'
import { sqliteDailyBankService } from '@/services/sqlite/dailyBank'

// Ringkasan kas hari ini
const cashSummary = await sqliteDailyCashService.getDailyCashSummary('2026-10-05')

// Detail transaksi kas
const cashTxs = await sqliteDailyCashService.getDailyCashTransactions('2026-10-05')

// Ringkasan bank hari ini
const bankSummary = await sqliteDailyBankService.getDailyBankSummary('2026-10-05')

// Detail transaksi bank
const bankTxs = await sqliteDailyBankService.getDailyBankTransactions('2026-10-05')
```

## Testing

Untuk test offline mode:

1. Build aplikasi: `npm run build`
2. Sync ke Android: `npx cap sync`
3. Test di emulator/device dengan mode offline
4. Verifikasi laporan kas dan bank dapat diakses tanpa koneksi internet

## Catatan

- Semua transaksi void/batal otomatis di-exclude
- Tanggal menggunakan format ISO `YYYY-MM-DD`
- Amount dalam satuan Rupiah (tanpa desimal)
- Method pembayaran: `tunai` atau `transfer`
- Sync service akan menangani sinkronisasi data offline-online (lihat `src/services/sync/`)

## Related Files

- `src/services/dailyCash.ts` - Service Supabase (online mode)
- `src/services/dailyBank.ts` - Service Supabase (online mode)
- `src/services/sqlite/db.ts` - SQLite helper utilities
- `src/views/Reports/DailyCashReport.vue` - UI untuk laporan kas
- `src/views/Reports/DailyBankReport.vue` - UI untuk laporan bank

## TODO

- [ ] Update halaman laporan untuk menggunakan SQLite service saat offline
- [ ] Tambahkan integrasi dengan sync service
- [ ] Test end-to-end di aplikasi Android
- [ ] Dokumentasi sync strategy untuk daily cash/bank data
