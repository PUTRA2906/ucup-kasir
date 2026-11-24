# Fitur Hapus Tutup Buku

## Ringkasan

Fitur untuk menghapus periode tutup buku yang sudah dibuat.

## Perubahan

### 1. Database (SQL Migration)

File: `supabase/migrations/20261104_delete_closing_period.sql`

Fungsi baru:
- `delete_closing_period(p_closing_id uuid)` - Menghapus periode tertutup

### 2. Service Layer

File: `src/services/finance.ts`

Method baru:
- `deletePeriod(closingId: string)` - Memanggil fungsi SQL untuk hapus periode

### 3. UI Layer

File: `src/views/Finance/ClosingPeriods.vue`

- Tambah fungsi `handleDelete()` untuk konfirmasi dan hapus periode
- Tambah tombol "Hapus" di tabel desktop (warna merah)
- Tambah tombol "Hapus" di card mobile (warna merah)

## Cara Menjalankan

### 1. Jalankan Migrasi SQL di Supabase

Buka Supabase Dashboard → SQL Editor → New Query, lalu copy-paste isi file:
```
supabase/migrations/20261104_delete_closing_period.sql
```

Atau jalankan via Supabase CLI:
```bash
# Pastikan sudah login
supabase db push
```

### 2. Test Fitur

1. Buka halaman **Finance → Tutup Buku** (`/finance/closing-periods`)
2. Klik tombol **Hapus** pada periode yang ingin dihapus
3. Konfirmasi dialog peringatan
4. Periode akan terhapus dari database

## Peringatan

- Tindakan hapus **tidak dapat dibatalkan**
- Snapshot saldo dan semua data periode akan dihapus permanen
- Pastikan periode yang dihapus memang tidak diperlukan lagi

## Validasi Keamanan

- Fungsi SQL menggunakan `SECURITY DEFINER`
- Validasi user: hanya bisa hapus periode milik sendiri
- RLS policy tetap aktif di tabel `closing_periods`
- Dialog konfirmasi dengan peringatan jelas di UI
