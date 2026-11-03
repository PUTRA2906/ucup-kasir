# Fitur Custom Payment Date

## Ringkasan
Menambahkan kemampuan untuk mengatur tanggal pembayaran cicilan pada form pembayaran, baik di web maupun mobile.

## Perubahan yang Dibuat

### 1. Database Migration
**File:** `supabase/migrations/20261103_add_payment_date_param.sql`

Menambahkan parameter `p_payment_date` (opsional, default: CURRENT_DATE) pada fungsi SQL `add_transaction_payment()`.

### 2. UI Component
**File:** `src/components/common/PaymentModal.vue`

- Menambahkan field `DateField` untuk input tanggal pembayaran
- Field tanggal muncul di bagian atas form (sebelum input jumlah)
- Default value: tanggal hari ini
- Required field (tidak bisa kosong)

### 3. Service Layer
**File:** `src/services/transactions.ts`

Menambahkan parameter `paymentDate?: string` pada fungsi `addPayment()`.

**File:** `src/services/sqlite/transactions.ts`

Menambahkan parameter `paymentDate?: string` pada fungsi `addPayment()` untuk versi SQLite (Android).

### 4. Store Layer
**File:** `src/stores/transactions.ts`

Menambahkan parameter `paymentDate?: string` pada fungsi `addPayment()`.

### 5. View Components
**File:** `src/views/Transactions/TransactionDetail.vue`

Mengupdate handler `handleAddPayment` untuk menerima dan meneruskan `payment_date`.

**File:** `src/views/Invoices/InvoiceDetail.vue`

Mengupdate handler `handleAddPayment` untuk menerima dan meneruskan `payment_date`.

## Cara Penggunaan

1. Buka detail transaksi yang belum lunas
2. Klik tombol "Tambah Pembayaran"
3. **Pilih tanggal pembayaran** (default: hari ini)
4. Masukkan jumlah dibayar
5. Pilih metode pembayaran
6. Tambahkan catatan (opsional)
7. Klik "Simpan Pembayaran"

## Validasi

- Tanggal pembayaran: required
- Jumlah pembayaran: harus > 0 dan <= sisa cicilan
- Form tidak bisa disubmit jika tanggal kosong

## Kompatibilitas

✅ **Web**: Menggunakan `DateField` component (custom date picker)
✅ **Android**: SQLite service sudah diupdate dengan parameter `paymentDate`
✅ **Backward Compatible**: Parameter `paymentDate` opsional, default ke tanggal saat ini

## Testing

Setelah migrasi database dijalankan:

1. Buat transaksi kredit baru
2. Tambah pembayaran dengan tanggal custom (misal: 3 hari yang lalu)
3. Verifikasi tanggal tersimpan dengan benar di tabel `transaction_payments`
4. Cek di mobile (Android) untuk memastikan fitur juga bekerja di SQLite

## Migration Database

**PENTING:** Jalankan migrasi ini di Supabase Dashboard:

```sql
-- File: supabase/migrations/20261103_add_payment_date_param.sql
```

Atau via Supabase CLI:

```bash
supabase db push
```

## Catatan

- Field `payment_date` di tabel `transaction_payments` sudah ada sejak awal, jadi tidak perlu alter table
- Perubahan ini hanya menambahkan parameter ke fungsi SQL dan UI untuk input manual
- Tanggal pembayaran terpisah dari `created_at` (waktu pencatatan)
