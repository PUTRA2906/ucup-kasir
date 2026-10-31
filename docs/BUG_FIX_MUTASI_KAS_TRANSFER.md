# Bug Fix: Mutasi Kas Menampilkan Transaksi Transfer

## Masalah

Laporan "Mutasi Kas" menampilkan transaksi dengan metode pembayaran "transfer", padahal seharusnya hanya menampilkan transaksi "tunai" saja. Transfer seharusnya hanya muncul di laporan "Mutasi Bank".

## Akar Masalah

Service `dailyCashService` di `src/services/dailyCash.ts` mengambil data dari 2 akun sekaligus:
- `1-1000` (Kas/Tunai)
- `1-1010` (Bank/Transfer)

Ini menyebabkan transaksi transfer yang seharusnya tercatat di akun Bank ikut masuk ke laporan Mutasi Kas.

### Kode Lama (Salah)

```typescript
// ❌ SALAH: Mengambil data dari KAS dan BANK
const { data: cashAccounts } = await supabase
  .from('chart_of_accounts')
  .select('id, code')
  .in('code', ['1-1000', '1-1010'])  // ❌ Ambil kedua akun
  .eq('user_id', user.user.id)
```

### Kode Baru (Benar)

```typescript
// ✅ BENAR: Hanya mengambil data dari KAS
const { data: cashAccounts } = await supabase
  .from('chart_of_accounts')
  .select('id, code')
  .eq('code', '1-1000')  // ✅ Hanya akun Kas
  .eq('user_id', user.user.id)
```

## Perbedaan Akun

| Kode Akun | Nama Akun | Metode Pembayaran | Laporan Terkait |
|-----------|-----------|-------------------|-----------------|
| `1-1000`  | Kas       | Tunai             | Mutasi Kas      |
| `1-1010`  | Bank      | Transfer          | Mutasi Bank     |

## Perbaikan yang Dilakukan

1. **File diubah**: `src/services/dailyCash.ts`
   - Fungsi `getDailyCashSummary()`: Mengganti `.in('code', ['1-1000', '1-1010'])` → `.eq('code', '1-1000')`
   - Fungsi `getDailyCashTransactions()`: Mengganti `.in('code', ['1-1000', '1-1010'])` → `.eq('code', '1-1000')`

2. **Dampak**:
   - ✅ Laporan Mutasi Kas sekarang hanya menampilkan transaksi tunai
   - ✅ Transaksi transfer hanya muncul di Mutasi Bank (jika ada)
   - ✅ Logika method detection (`account?.code === '1-1000' ? 'tunai' : 'transfer'`) tetap berfungsi dengan benar

## Testing Checklist

- [x] Type check berhasil
- [ ] Laporan Mutasi Kas hanya menampilkan transaksi tunai
- [ ] Transaksi transfer tidak muncul di Mutasi Kas
- [ ] Summary (tunai_in, tunai_out) akurat tanpa transfer
- [ ] Tidak ada regresi di fitur lain

## File Terkait

- Service: `src/services/dailyCash.ts`
- View: `src/views/Reports/DailyCashReport.vue`
- Chart of Accounts: `1-1000` (Kas), `1-1010` (Bank)

## Catatan

Jika di masa depan perlu laporan yang menggabungkan Kas dan Bank, buat service/report terpisah dengan nama yang jelas seperti "Mutasi Kas & Bank" atau "Arus Kas Gabungan" agar tidak membingungkan user.

## Tanggal Perbaikan

31 Oktober 2026
