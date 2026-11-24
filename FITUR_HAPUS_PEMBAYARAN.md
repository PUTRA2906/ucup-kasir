# Fitur Hapus Pembayaran di Detail Transaksi

## Deskripsi

Fitur untuk menghapus pembayaran cicilan yang sudah dicatat di transaksi. Berguna untuk mengoreksi kesalahan input pembayaran atau membatalkan pembayaran yang salah dicatat.

## Fitur Utama

### 1. **Tombol Hapus di Setiap Pembayaran**

Di halaman Detail Transaksi, setiap item pembayaran di timeline sekarang memiliki tombol **"Hapus"** berwarna merah di samping tombol "Lihat Alokasi per Item".

### 2. **Konfirmasi Sebelum Hapus**

Sebelum pembayaran dihapus, muncul dialog konfirmasi yang menampilkan:
- Jumlah pembayaran yang akan dihapus
- Peringatan bahwa sisa tagihan akan bertambah
- Peringatan bahwa jurnal akuntansi akan di-void
- Peringatan bahwa tindakan tidak dapat dibatalkan

### 3. **Otomatis Update Data**

Setelah pembayaran dihapus, sistem otomatis:
- ✅ **Menghapus alokasi** pembayaran ke items (`transaction_item_payments`)
- ✅ **Void jurnal akuntansi** yang terkait dengan pembayaran
- ✅ **Update transaksi**: 
  - `paid_amount` berkurang
  - `remaining_amount` bertambah
  - `payment_status` berubah menjadi `belum_lunas` (jika masih ada sisa tagihan)

## Flow Diagram

```
[User klik tombol Hapus di pembayaran]
         |
         v
[Dialog konfirmasi muncul]
         |
         v
[User konfirmasi "Ya, Hapus"]
         |
         v
[DELETE transaction_payments]
         |
         v
[TRIGGER 1: auto_delete_payment_allocations]
         ├─> Hapus semua transaction_item_payments
         |
[TRIGGER 2: auto_void_journal_payment]
         ├─> Void jurnal (status = 'void')
         |
[TRIGGER 3: auto_update_transaction_on_payment_delete]
         ├─> Update paid_amount (kurang)
         ├─> Update remaining_amount (tambah)
         └─> Update payment_status
         |
         v
[Refresh data transaksi]
         |
         v
[Toast: "Pembayaran berhasil dihapus"]
```

## File yang Diubah

### Frontend

1. **`src/views/Transactions/TransactionDetail.vue`**
   - Tambah tombol "Hapus" di setiap item pembayaran (timeline)
   - Tambah `showDeletePaymentDialog` dan `paymentToDelete` ref
   - Tambah `ConfirmDialog` untuk konfirmasi hapus
   - Tambah fungsi `confirmDeletePayment()` dan `confirmDeletePaymentAction()`

2. **`src/stores/transactions.ts`**
   - Tambah fungsi `deletePayment(paymentId, transactionId)`
   - Export fungsi di return statement

3. **`src/services/transactions.ts`**
   - Tambah fungsi `deletePayment(paymentId)` yang DELETE dari `transaction_payments`

4. **`src/services/sqlite/transactions.ts`**
   - Tambah fungsi `deletePayment(paymentId)` untuk offline mode
   - Implementasi lengkap: hapus alokasi, hapus payment, update transaksi, void jurnal

### Backend (Database)

5. **`supabase/migrations/20261104_auto_update_transaction_on_payment_delete.sql`**
   - **Trigger 1**: `auto_delete_payment_allocations()` - Hapus alokasi payment ke items (BEFORE DELETE)
   - **Trigger 2**: `auto_void_journal_payment()` - Void jurnal (sudah ada, BEFORE DELETE)
   - **Trigger 3**: `auto_update_transaction_on_payment_delete()` - Update transaksi (AFTER DELETE)

## Cara Kerja Trigger

### Order Eksekusi:

1. **BEFORE DELETE**:
   - `trigger_auto_delete_payment_allocations` → Hapus `transaction_item_payments`
   - `trigger_auto_void_journal_payment` → Void jurnal

2. **DELETE**: Row payment dihapus dari `transaction_payments`

3. **AFTER DELETE**:
   - `trigger_auto_update_transaction_on_payment_delete` → Update `transactions`

## Testing Checklist

### Persiapan:
- [ ] Apply migrasi `20261104_auto_update_transaction_on_payment_delete.sql` di Supabase Dashboard

### Test Case 1: Hapus Pembayaran Normal
1. [ ] Buat transaksi kredit Rp 1.000.000 (belum lunas)
2. [ ] Bayar cicilan Rp 300.000
3. [ ] Cek: `paid_amount` = 300.000, `remaining_amount` = 700.000
4. [ ] Hapus pembayaran Rp 300.000
5. [ ] Cek: `paid_amount` = 0, `remaining_amount` = 1.000.000, `payment_status` = belum_lunas
6. [ ] Cek jurnal: status = 'void' (di Finance → Jurnal Umum)

### Test Case 2: Hapus Salah Satu Pembayaran (Multiple Payments)
1. [ ] Buat transaksi kredit Rp 1.000.000
2. [ ] Bayar cicilan #1: Rp 300.000
3. [ ] Bayar cicilan #2: Rp 400.000
4. [ ] Cek: `paid_amount` = 700.000, `remaining_amount` = 300.000
5. [ ] Hapus pembayaran #1 (Rp 300.000)
6. [ ] Cek: `paid_amount` = 400.000, `remaining_amount` = 600.000
7. [ ] Cek: Pembayaran #2 masih ada

### Test Case 3: Hapus Pembayaran Terakhir (Lunas → Belum Lunas)
1. [ ] Buat transaksi kredit Rp 1.000.000
2. [ ] Bayar lunas Rp 1.000.000
3. [ ] Cek: `payment_status` = 'lunas', `remaining_amount` = 0
4. [ ] Hapus pembayaran Rp 1.000.000
5. [ ] Cek: `payment_status` = 'belum_lunas', `remaining_amount` = 1.000.000

### Test Case 4: Hapus Pembayaran dengan Alokasi ke Items
1. [ ] Buat transaksi dengan 3 items berbeda
2. [ ] Bayar cicilan sebagian (auto-allocate ke items dengan FIFO)
3. [ ] Cek tabel `transaction_item_payments` ada alokasi
4. [ ] Hapus pembayaran
5. [ ] Cek: Alokasi di `transaction_item_payments` ikut terhapus

### Test Case 5: Offline Mode (SQLite)
1. [ ] Matikan koneksi internet
2. [ ] Hapus pembayaran
3. [ ] Cek: Data lokal terupdate
4. [ ] Cek: Sync queue ada entry DELETE untuk payment
5. [ ] Nyalakan internet
6. [ ] Cek: Sync berhasil, data di Supabase terupdate

## Keamanan & Validasi

### Validasi:
- ✅ Hanya user pemilik pembayaran yang bisa hapus (RLS policy)
- ✅ Payment ID harus valid dan ada di database
- ✅ Transaction ID harus valid

### Error Handling:
- ❌ Payment tidak ditemukan → Error: "Pembayaran tidak ditemukan"
- ❌ Transaksi tidak ditemukan → Error: "Transaksi tidak ditemukan"
- ❌ User tidak punya akses → Error dari RLS (403)

### Side Effects:
- ✅ Jurnal di-void (tidak dihapus permanent, hanya status = 'void')
- ✅ Alokasi ke items dihapus
- ✅ Transaksi terupdate (paid_amount, remaining_amount, payment_status)
- ✅ Notifikasi tidak dihapus (history tetap ada)

## Cara Apply

### 1. Apply Migrasi Database

```bash
# 1. Buka Supabase Dashboard
# 2. SQL Editor
# 3. Copy isi file 20261104_auto_update_transaction_on_payment_delete.sql
# 4. Execute
```

### 2. Frontend sudah siap (tidak perlu deploy ulang)

Setelah migrasi dijalankan, fitur hapus pembayaran langsung bisa digunakan.

## Catatan Penting

### ⚠️ Hapus Pembayaran vs Void Transaksi

- **Hapus Pembayaran**: Menghapus 1 pembayaran cicilan, transaksi tetap ada
- **Void Transaksi**: Membatalkan seluruh transaksi, stok dikembalikan

### ⚠️ Jurnal Di-Void, Tidak Dihapus

Jurnal pembayaran yang dihapus **tidak dihapus permanent**, tapi **status di-void**. Ini penting untuk audit trail:
- Jurnal masih ada di database
- Status = 'void'
- Tidak muncul di laporan keuangan (filtered by status = 'posted')
- Bisa dilihat di history untuk audit

### ⚠️ Data Tidak Bisa Di-Restore

Setelah pembayaran dihapus, **tidak ada fitur restore/undo**. User harus input ulang pembayaran jika ternyata salah hapus.

## Referensi

- `src/views/Transactions/TransactionDetail.vue:164-187` - UI tombol hapus
- `src/stores/transactions.ts:128-144` - Store function
- `src/services/transactions.ts:200-206` - Service function
- `supabase/migrations/20261104_auto_update_transaction_on_payment_delete.sql` - Database triggers
