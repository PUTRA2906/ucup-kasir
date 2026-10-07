# Fix: Error "table transaction_payments has no column named payment_date"

## Masalah

Error terjadi saat menambah pembayaran di transaksi kredit:

```
Error adding payment: Run: table transaction_payments has no column named payment_date (code 1)
```

Database SQLite lokal di Android belum ter-migrasi. Kolom `payment_date` belum ditambahkan ke tabel `transaction_payments`.

## Solusi 1: Migration Fix via Developer Tools (RECOMMENDED)

Gunakan halaman Developer Tools yang sudah tersedia di aplikasi:

### Langkah-langkah:

1. **Buka aplikasi Android**
2. **Navigasi ke Developer Tools**
   - Akses via URL: `/dev-tools`
   - Atau tambahkan link di menu Settings
3. **Klik tombol "Fix payment_date Migration"**
4. **Tunggu proses selesai**
   - Utility akan cek apakah kolom sudah ada
   - Jika belum, akan menambahkan kolom via `ALTER TABLE`
   - Backfill existing records dengan `DATE(created_at)`
   - Menampilkan hasil verifikasi
5. **Coba tambah pembayaran lagi** untuk memastikan error sudah hilang

### File terkait:
- **Utility:** `src/utils/fixPaymentDateMigration.ts`
- **Component:** `src/components/dev/MigrationFixButton.vue`
- **View:** `src/views/DevTools.vue`
- **Route:** `/dev-tools` di `src/router/index.ts`

---

## Solusi 2: Reset Database (Destructive, jika Solusi 1 gagal)

Jika migration fix tidak berhasil, reset database lokal SQLite:

### Langkah-langkah:

1. **Buka Developer Tools** (`/dev-tools`)
2. **Klik tombol "Reset Database (DANGER)"**
3. **Konfirmasi** (akan menghapus SEMUA data lokal)
4. **Lakukan sync ulang** untuk download data dari cloud

**⚠️ Peringatan:** 
- Ini akan menghapus SEMUA data lokal SQLite
- Data di cloud (Supabase) tetap aman
- Gunakan hanya jika Solusi 1 tidak berhasil

### Alternatif: Uninstall aplikasi

Cara lain untuk reset database:

1. **Uninstall aplikasi** dari Android (menghapus database lokal)
2. **Build ulang dan install:**
   ```bash
   npm run build
   npx cap sync
   cd android && ./gradlew assembleRelease
   ```
3. **Install APK baru** — database akan dibuat ulang dengan schema terbaru

---

## Solusi 3: Manual via Chrome DevTools (untuk web/PWA)

Jika testing di browser (bukan native Android):

1. Buka DevTools (F12)
2. Buka tab Console
3. Jalankan:
```javascript
const { runMigrations } = await import('/src/lib/sqlite.ts')
await runMigrations()
location.reload()
```

---

## Verifikasi Migrasi Berhasil

Setelah migrasi, coba tambahkan pembayaran cicilan. Jika tidak ada error, berarti kolom `payment_date` sudah ditambahkan.

Untuk memastikan, Anda bisa cek di console:
```javascript
const { query } = await import('/src/lib/sqlite.ts')
const result = await query('PRAGMA table_info(transaction_payments)')
console.log(result)
// Harusnya ada kolom "payment_date" di hasil
```

---

## Catatan Penting

- Migrasi otomatis seharusnya berjalan saat app dibuka, tapi untuk database yang sudah ada sebelumnya, perlu force manual
- Setelah migrasi berhasil, semua pembayaran baru akan otomatis include kolom `payment_date`
- Data pembayaran lama akan di-backfill dengan `DATE(created_at)`
