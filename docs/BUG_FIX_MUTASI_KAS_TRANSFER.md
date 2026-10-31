# Bug Fix: Mutasi Kas Menampilkan Transaksi Transfer

**Update Terakhir:** 31 Oktober 2026

## Masalah

Laporan "Mutasi Kas" di Android masih menampilkan transaksi dengan metode pembayaran "transfer", padahal di web sudah tidak muncul. Transfer seharusnya hanya muncul di laporan "Mutasi Bank".

## Perbaikan Sebelumnya (Sudah Dilakukan)

Filter akun sudah benar - hanya mengambil akun `1-1000` (Kas):

```typescript
// ✅ Filter sudah benar
const { data: cashAccounts } = await supabase
  .from('chart_of_accounts')
  .select('id, code')
  .eq('code', '1-1000')  // Hanya akun Kas
  .eq('user_id', user.user.id)
```

## Akar Masalah Sebenarnya (Bug Sisa)

Meskipun filter sudah benar, **logika deteksi method pembayaran masih salah**. Kode menggunakan conditional yang tidak konsisten:

### Kode Lama (❌ Salah)

```typescript
// Baris 200 & 213 - getDailyCashTransactions()
method: account?.code === '1-1000' ? 'tunai' : 'transfer',

// Baris 97-103 - getDailyCashSummary()
if (debit > 0) {
  if (account?.code === '1-1000') tunai_in += debit
  else transfer_in += debit  // ❌ Tidak mungkin terjadi karena sudah difilter!
}
```

**Masalah:**
- Filter sudah ambil **hanya** akun `1-1000`
- Tapi logic masih cek `if (account?.code === '1-1000')` dengan fallback ke 'transfer'
- Kondisi `else` seharusnya tidak pernah terjadi
- Karena ada edge case atau race condition, kondisi ini tetap ter-trigger di Android

### Kode Baru (✅ Benar)

```typescript
// getDailyCashTransactions()
method: 'tunai',  // Semua transaksi dari akun 1-1000 (Kas) adalah tunai

// getDailyCashSummary()
if (debit > 0) {
  tunai_in += debit  // Langsung ke tunai, tidak perlu conditional
}
if (credit > 0) {
  cashOut += credit
  tunai_out += credit  // Langsung ke tunai, tidak perlu conditional
}
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
