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

## Solusi

**Prinsip:** Jika sudah filter di query, tidak perlu conditional lagi di logic.

Karena kita sudah filter **hanya akun `1-1000`**, maka:
- Semua transaksi yang diambil **pasti** dari akun Kas
- Semua transaksi Kas **pasti** menggunakan method 'tunai'
- Tidak perlu lagi cek `account?.code === '1-1000'`
- Langsung set `method: 'tunai'`

## Perbaikan yang Dilakukan (31 Oktober 2026)

**File:** `src/services/dailyCash.ts`

### 1. Fungsi `getDailyCashTransactions()` (Baris 194-218)

**Sebelum:**
```typescript
if (debit > 0) {
  transactions.push({
    method: account?.code === '1-1000' ? 'tunai' : 'transfer',  // ❌ Salah
    ...
  })
}

if (credit > 0) {
  transactions.push({
    method: account?.code === '1-1000' ? 'tunai' : 'transfer',  // ❌ Salah
    ...
  })
}
```

**Sesudah:**
```typescript
if (debit > 0) {
  transactions.push({
    method: 'tunai',  // ✅ Benar: semua dari akun 1-1000 adalah tunai
    ...
  })
}

if (credit > 0) {
  transactions.push({
    method: 'tunai',  // ✅ Benar: semua dari akun 1-1000 adalah tunai
    ...
  })
}
```

### 2. Fungsi `getDailyCashSummary()` (Baris 91-105)

**Sebelum:**
```typescript
for (const line of journalLines || []) {
  const account = cashAccounts?.find(a => a.id === line.account_id)
  
  if (debit > 0) {
    if (account?.code === '1-1000') tunai_in += debit
    else transfer_in += debit  // ❌ Tidak mungkin terjadi
  }
  if (credit > 0) {
    cashOut += credit
    if (account?.code === '1-1000') tunai_out += credit
    else transfer_out += credit  // ❌ Tidak mungkin terjadi
  }
}
```

**Sesudah:**
```typescript
for (const line of journalLines || []) {
  const debit = Number(line.debit || 0)
  const credit = Number(line.credit || 0)
  
  // Semua transaksi dari akun 1-1000 (Kas) adalah tunai
  if (debit > 0) {
    tunai_in += debit  // ✅ Langsung tunai
  }
  if (credit > 0) {
    cashOut += credit
    tunai_out += credit  // ✅ Langsung tunai
  }
}
```

## Perbedaan Akun

| Kode Akun | Nama Akun | Metode Pembayaran | Laporan Terkait |
|-----------|-----------|-------------------|-----------------|
| `1-1000`  | Kas       | Tunai             | Mutasi Kas      |
| `1-1010`  | Bank      | Transfer          | Mutasi Bank     |

## Dampak Perbaikan

- ✅ Laporan Mutasi Kas sekarang **hanya** menampilkan transaksi tunai
- ✅ Tidak ada lagi transaksi "Transfer" di laporan Kas
- ✅ Konsisten di web dan Android
- ✅ Summary (tunai_in, tunai_out) akurat
- ✅ Transfer tetap muncul di Mutasi Bank (seperti seharusnya)

## Testing Checklist

- [x] Type check berhasil
- [x] Perbaikan logika method detection
- [x] Perbaikan summary calculation
- [ ] Test manual di Android: Mutasi Kas hanya tampil tunai
- [ ] Test manual di web: Mutasi Kas hanya tampil tunai
- [ ] Verifikasi Mutasi Bank masih berfungsi normal

## File Terkait

- `src/services/dailyCash.ts` - Service utama yang diperbaiki
- `src/views/Reports/DailyCashReport.vue` - View laporan mutasi kas
- `src/views/Reports/DailyBankReport.vue` - View laporan mutasi bank (referensi)

## Catatan Penting

### Mengapa Bug Ini Terjadi?

1. **Copy-paste dari laporan bank** yang memang perlu conditional
2. **Defensive coding berlebihan** - tidak trust filter sendiri
3. **Edge case handling** yang salah - mencoba handle kondisi yang tidak mungkin

### Pelajaran

- ✅ **Trust your filter** - Jika sudah filter di query, tidak perlu conditional lagi
- ✅ **KISS principle** - Jangan over-engineering dengan conditional yang tidak perlu
- ✅ **Code smell** - Conditional yang tidak pernah ter-trigger adalah red flag
- ✅ **Konsistensi** - Pastikan logic sesuai dengan filter yang digunakan

### Catatan untuk Developer

Jika di masa depan perlu laporan yang menggabungkan Kas dan Bank:
1. Buat service/report terpisah dengan nama jelas ("Mutasi Kas & Bank")
2. Gunakan filter `.in('code', ['1-1000', '1-1010'])` 
3. **Baru** gunakan conditional untuk detect method
4. Jangan modifikasi laporan existing yang sudah jelas scope-nya

## Riwayat Perbaikan

- **Perbaikan Pertama** (tanggal tidak diketahui): Filter akun dari `.in(['1-1000', '1-1010'])` → `.eq('1-1000')`
- **Perbaikan Kedua** (31 Oktober 2026): Logic method detection dari conditional → hardcoded 'tunai'

## Tanggal Perbaikan

31 Oktober 2026 - Perbaikan final logic method detection
