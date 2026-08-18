# Fitur Stok Gudang

Fitur manajemen stok gudang yang lengkap untuk memantau dan mengelola persediaan produk.

## Fitur yang Tersedia

### 1. Halaman Stok Gudang (`/stock`)
- **Statistik Cards**: Menampilkan total produk, total stok, stok menipis, dan stok habis
- **Tabel Stok Produk**: Daftar lengkap produk dengan informasi stok saat ini dan stok minimum
- **Filter**: Filter berdasarkan kategori dan status stok
- **Aksi per Produk**:
  - Penyesuaian stok (tambah/kurangi/koreksi)
  - Lihat riwayat mutasi
  - Atur stok minimum

### 2. Penyesuaian Stok
Modal untuk melakukan penyesuaian stok dengan 3 tipe:
- **Tambah Stok**: Menambah jumlah stok (pembelian, restok)
- **Kurangi Stok**: Mengurangi jumlah stok (rusak, hilang, sample)
- **Koreksi**: Mengubah stok langsung ke jumlah tertentu

Fitur:
- Pilih produk dari daftar
- Preview perubahan stok sebelum disimpan
- Pilih alasan dari dropdown (Pembelian, Produk Rusak, Koreksi, dll)
- Tambahkan catatan optional
- Validasi untuk mencegah stok negatif

### 3. Stock Opname
Modal untuk melakukan perhitungan stok fisik:
- Tambah semua produk sekaligus
- Input stok fisik untuk setiap produk
- Sistem otomatis menghitung selisih
- Tampilan summary: produk dengan selisih lebih dan kurang
- Filter dan pencarian produk
- Catatan untuk setiap item

### 4. Riwayat Mutasi Stok (`/stock/movements`)
Halaman untuk melihat semua pergerakan stok:
- Filter berdasarkan produk, tipe mutasi, dan tanggal
- Tipe mutasi: Masuk, Keluar, Penyesuaian, Opname, Retur
- Detail perubahan stok (sebelum → sesudah)
- Link ke referensi (transaksi, retur, dll)
- Modal detail untuk setiap mutasi

### 5. Setting Stok Minimum
- Atur batas minimum stok per produk
- Notifikasi visual saat stok menipis
- Badge warning saat stok di bawah minimum

## Database Schema

### Tabel yang Dibuat:

1. **stock_movements**: Mencatat semua pergerakan stok
   - Tipe: in, out, adjustment, opname, return
   - Quantity before/after
   - Reference ke transaksi/retur/adjustment

2. **stock_adjustments**: Penyesuaian stok manual
   - Tipe: add, subtract, correction
   - Alasan dan catatan
   - Quantity change

3. **stock_opnames**: Header stock opname
   - Nomor opname (auto-generated)
   - Status: draft, completed, cancelled
   - Tanggal dan catatan

4. **stock_opname_items**: Detail item stock opname
   - System quantity vs actual quantity
   - Difference (selisih)
   - Catatan per item

5. **stock_alerts**: Setting minimum stok
   - Minimum stock per produk
   - Alert enabled/disabled

### Trigger & Function:
- `record_stock_movement()`: Trigger otomatis mencatat perubahan stok di tabel products
- Auto-update stok produk saat ada penyesuaian/opname

## File yang Dibuat

### Views:
- `/src/views/Stock/StockManagement.vue` - Halaman utama stok gudang
- `/src/views/Stock/StockAdjustmentModal.vue` - Modal penyesuaian stok
- `/src/views/Stock/StockOpnameModal.vue` - Modal stock opname
- `/src/views/Stock/StockMovements.vue` - Halaman riwayat mutasi

### Store:
- `/src/stores/stock.ts` - Pinia store untuk state management stok
  - `fetchMovements()` - Ambil riwayat mutasi
  - `fetchAdjustments()` - Ambil penyesuaian
  - `fetchOpnames()` - Ambil stock opname
  - `fetchStockAlerts()` - Ambil alert stok minimum
  - `createAdjustment()` - Buat penyesuaian stok
  - `createOpname()` - Buat stock opname
  - `setMinimumStock()` - Set stok minimum
  - `recordStockMovement()` - Catat mutasi stok

### Migration:
- `/supabase/migrations/20260818_stock_management.sql` - Database schema

### Router:
- `/stock` - Halaman stok gudang
- `/stock/movements` - Halaman riwayat mutasi

### Menu:
- Ditambahkan di sidebar menu Products → "Stok Gudang"

## Komponen yang Diupdate

- **ProductPickerModal**: Ditambahkan mode `single-select` untuk memilih satu produk
- **AppSidebar**: Menambahkan menu "Stok Gudang"
- **Router**: Menambahkan routes untuk stok

## Cara Menggunakan

1. **Melihat Stok**: Klik menu "Products" → "Stok Gudang"
2. **Penyesuaian Stok**: 
   - Klik tombol "Penyesuaian Stok" atau icon edit di baris produk
   - Pilih tipe penyesuaian (Tambah/Kurangi/Koreksi)
   - Input jumlah dan alasan
   - Simpan
3. **Stock Opname**:
   - Klik tombol "Stock Opname"
   - Klik "Tambah Semua Produk"
   - Input stok fisik untuk setiap produk
   - Sistem otomatis hitung selisih
   - Simpan
4. **Riwayat Mutasi**: Klik tombol "Riwayat Mutasi" untuk melihat semua pergerakan stok
5. **Set Stok Minimum**: Klik icon gear di baris produk untuk mengatur batas minimum

## Integrasi dengan Fitur Lain

- **Transaksi**: Otomatis catat mutasi stok keluar saat transaksi
- **Retur**: Otomatis catat mutasi stok masuk saat retur
- **Dashboard**: Statistik stok menipis/habis

## Security

- Row Level Security (RLS) enabled untuk semua tabel
- User hanya bisa lihat/edit data mereka sendiri
- Validasi di backend untuk mencegah stok negatif

## Performance

- Index pada kolom yang sering di-query (product_id, created_at, user_id)
- Pagination di frontend untuk data besar
- Filter dan search untuk performa optimal
