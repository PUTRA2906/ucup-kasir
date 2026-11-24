# Panduan Setup Fitur Tutup Buku

## Masalah yang Terjadi
Fitur tutup buku tidak bisa submit baik di web maupun mobile Android.

## Penyebab
Migrasi database untuk tabel `closing_periods` dan fungsi RPC `close_period()` belum dijalankan di Supabase.

## Solusi

### 1. Jalankan Migrasi di Supabase Dashboard

1. Buka Supabase Dashboard → SQL Editor
2. Buka file `supabase/migrations/20260916_closing_periods.sql`
3. Copy semua isi file tersebut
4. Paste ke SQL Editor di Supabase Dashboard
5. Klik "Run" untuk menjalankan migrasi

**Atau** menggunakan Supabase CLI:

```bash
# Pastikan sudah login
supabase login

# Link project
supabase link --project-ref YOUR_PROJECT_REF

# Push migrasi
supabase db push
```

### 2. Verifikasi Migrasi Berhasil

Jalankan query berikut di SQL Editor untuk memastikan tabel dan fungsi sudah ada:

```sql
-- Cek tabel closing_periods
SELECT * FROM closing_periods LIMIT 1;

-- Cek fungsi close_period
SELECT proname FROM pg_proc WHERE proname = 'close_period';

-- Cek fungsi reopen_period  
SELECT proname FROM pg_proc WHERE proname = 'reopen_period';

-- Cek fungsi check_period_closed
SELECT proname FROM pg_proc WHERE proname = 'check_period_closed';
```

### 3. Test Fitur Tutup Buku

Setelah migrasi berhasil:

**Web:**
1. Login ke aplikasi
2. Buka menu Finance → Tutup Buku
3. Klik "Tutup Periode Baru"
4. Pilih tanggal mulai dan akhir periode
5. Klik "Tutup Periode"

**Mobile Android:**
1. Build dan sync: `npm run build && npx cap sync`
2. Jalankan di emulator/device
3. Login ke aplikasi
4. Buka menu Finance → Tutup Buku
5. Klik tombol FAB (+) di kanan bawah
6. Pilih tanggal mulai dan akhir periode
7. Klik "Tutup Periode"

### 4. Troubleshooting

Jika masih error, cek:

1. **Console Browser/Logcat** untuk melihat error message lengkap
2. **Supabase Logs** di Dashboard → Logs → Database
3. **RLS Policy** sudah aktif dan benar
4. **User sudah login** dan memiliki `user_id`

## Perubahan yang Sudah Dilakukan

1. ✅ Tabel `closing_periods` ditambahkan ke schema SQLite
2. ✅ Fungsi `closePeriod()`, `reopenPeriod()`, `checkPeriodClosed()` di SQLite service
3. ✅ Integrasi dengan service adapter (auto-detect platform)
4. ✅ Sync engine support untuk download/upload closing_periods
5. ✅ UI components menggunakan adapter

## Catatan Penting

- Fitur ini **memerlukan migrasi database** untuk berjalan
- Tanpa migrasi, fungsi RPC `close_period()` tidak akan ditemukan
- SQLite (mobile) akan berfungsi setelah sync pertama kali dari Supabase
