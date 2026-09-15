# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Tentang Proyek

**Ucup Kasir** adalah aplikasi Point of Sale (POS) berbasis web dan Android untuk mengelola penjualan, stok, pelanggan, dan piutang toko kelontong. Aplikasi ini dibangun dengan Vue 3 + TypeScript + Tailwind CSS, menggunakan Supabase sebagai backend, dan dikemas sebagai aplikasi Android native melalui Capacitor.

**Target pengguna:** Toko kelontong skala kecil-menengah di wilayah Kabupaten Banyuwangi (dengan fitur pengelompokan pelanggan per kecamatan).

## Tech Stack

- **Frontend:** Vue 3 (Composition API), TypeScript, Tailwind CSS 4
- **State Management:** Pinia
- **Routing:** Vue Router 4 (dengan auth guard)
- **Backend:** Supabase (PostgreSQL + Auth + RLS + Realtime)
- **Mobile:** Capacitor (Android native wrapper)
- **Visualisasi:** ApexCharts
- **PDF:** jsPDF
- **Build Tool:** Vite

## Perintah Development

```bash
# Development server (port 5173)
npm run dev

# Type check (dengan vue-tsc)
npm run type-check

# Build produksi (dengan type-check)
npm run build

# Build tanpa type-check
npm run build-only

# Preview hasil build
npm run preview

# Lint dan auto-fix
npm run lint

# Format kode
npm run format
```

## Build Android

```bash
# 1. Build web assets
npm run build

# 2. Sync ke project Android
npx cap sync

# 3. Build APK release
cd android && ./gradlew assembleRelease

# 4. APK hasil ada di:
# android/app/build/outputs/apk/release/app-release.apk
```

### Keystore Management

Aplikasi Android menggunakan keystore untuk signing. File keystore dan `keystore.properties` **tidak boleh** di-commit ke git.

```bash
# Generate keystore (pertama kali)
bash generate-keystore.sh

# Ambil base64 untuk GitHub Actions Secret
bash get-keystore-base64.sh
```

## Struktur Arsitektur

### Direktori Utama

```
src/
├── components/       # Komponen UI reusable (89 komponen)
│   ├── common/       # Komponen umum (buttons, modals, cards)
│   ├── forms/        # Form components (DateField, SelectField)
│   ├── layout/       # Layout components (Header, Sidebar)
│   ├── tables/       # Table components
│   └── ui/           # UI primitives
├── composables/      # Vue composables
│   ├── useConfirm.ts           # Dialog konfirmasi (bukan native)
│   ├── useToast.ts             # Toast notifications
│   ├── usePdfExport.ts         # Export PDF
│   ├── useCsv.ts               # Export CSV
│   ├── useDataTable.ts         # Data table utilities
│   ├── usePriceMatrix.ts       # Harga bertingkat
│   └── useNavigationStack.ts   # Navigasi history
├── lib/              # Core libraries
│   ├── supabase.ts   # Supabase client + error logging
│   ├── sqlite.ts     # SQLite (offline mode)
│   ├── eventLog.ts   # Event logging system
│   └── platform.ts   # Platform detection
├── router/           # Vue Router + auth guard
├── services/         # Data access layer (17 services)
│   ├── products.ts
│   ├── transactions.ts
│   ├── customers.ts
│   ├── stock.ts
│   ├── finance.ts
│   ├── purchasing.ts
│   ├── hr.ts         # Karyawan & payroll
│   ├── shipping.ts   # Surat jalan
│   └── ...
├── stores/           # Pinia stores
│   ├── auth.ts       # Authentication state
│   └── ...
├── types/            # TypeScript type definitions
│   ├── database.ts   # Database types
│   └── ...
├── views/            # Halaman aplikasi
│   ├── Auth/         # Signin & Signup
│   ├── Products/     # CRUD produk
│   ├── Transactions/ # Transaksi & invoice
│   ├── Customers/    # CRUD pelanggan
│   ├── Stock/        # Manajemen stok
│   ├── Invoices/     # Invoice per pelanggan (grouped by kecamatan)
│   ├── Reports/      # Laporan penjualan & laba rugi
│   ├── Finance/      # Modul akuntansi
│   ├── Purchasing/   # Purchase order & goods receipt
│   ├── Hr/           # Karyawan, kasbon, payroll
│   └── Shipping/     # Surat jalan & kendaraan
└── constants/        # Konstanta (daftar kecamatan Banyuwangi)
```

### Layer Pattern

**Service Layer** (`src/services/`) adalah lapisan akses data yang memanggil Supabase. Setiap service mengekspos fungsi async untuk operasi CRUD.

**Store Layer** (`src/stores/`) menggunakan Pinia untuk state management global. Store `auth.ts` mengelola session dan user.

**Composables** (`src/composables/`) adalah reusable logic untuk UI (toast, confirm dialog, PDF export, CSV export).

## Database & Backend

### Supabase Setup

Proyek menggunakan Supabase dengan PostgreSQL sebagai database. Konfigurasi ada di `.env`:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Migrasi Database

Migrasi ada di `supabase/migrations/`. Jalankan berurutan melalui Supabase Dashboard → SQL Editor.

**Tabel utama:**
- `products` — Produk (nama, SKU, harga beli/jual, stok, kategori)
- `categories` — Kategori produk
- `customers` — Pelanggan (nama, alamat, kecamatan)
- `transactions` — Transaksi penjualan (tunai/kredit)
- `transaction_items` — Item per transaksi
- `transaction_payments` — Pembayaran cicilan
- `returns` — Retur produk
- `return_items` — Item retur
- `stock_movements` — Mutasi stok
- `store_settings` — Pengaturan toko
- `notifications` — Notifikasi (stok menipis, dll)
- `finance_*` — Modul akuntansi (COA, jurnal, ledger)
- `purchasing_*` — Purchase order, goods receipt, purchase invoice
- `hr_employees` — Karyawan
- `hr_employee_loans` — Kasbon karyawan
- `hr_payroll_slips` — Slip gaji
- `shipping_*` — Surat jalan & kendaraan
- `price_*` — Matriks harga bertingkat

### Row Level Security (RLS)

Semua tabel menerapkan RLS — setiap user hanya bisa akses data miliknya sendiri:

```sql
CREATE POLICY "Users can only access their own data"
ON table_name FOR ALL
USING (auth.uid() = user_id);
```

### Fungsi SQL

Operasi transaksi menggunakan **fungsi SQL** (`SECURITY DEFINER`) untuk atomicity:

- `create_transaction()` — Buat transaksi + kurangi stok + catat mutasi
- `add_transaction_payment()` — Tambah pembayaran cicilan
- `void_transaction()` — Batalkan transaksi + kembalikan stok
- `create_return()` — Buat retur + kembalikan stok + hitung refund

**Penting:** Transaksi HARUS melalui fungsi SQL, bukan insert langsung ke tabel `transactions`.

## Fitur Utama

### 1. Manajemen Produk & Stok

- CRUD produk dengan kategori, SKU/barcode, harga beli/jual, stok minimum
- Stok gudang dengan mutasi otomatis saat transaksi/retur
- Stock opname dan adjustment manual
- Notifikasi stok menipis

### 2. Transaksi Penjualan

- Penjualan tunai & kredit dengan validasi stok otomatis
- Pembayaran DP dan cicilan (tracking piutang per customer)
- Potongan harga & biaya kirim
- Cetak invoice PDF dengan logo toko
- Custom tanggal transaksi (untuk backfill data lama)

### 3. Invoice Per Pelanggan (Grouped by Kecamatan)

Fitur khas untuk toko kelontong di Banyuwangi:

- Pelanggan dikelompokkan per **kecamatan** (24 kecamatan di Kabupaten Banyuwangi)
- Flow: Pilih kecamatan → Pilih customer → Lihat daftar invoice
- Invoice menampilkan total piutang, status lunas/belum lunas, riwayat pembayaran
- Cetak invoice dengan detail per transaksi

Konstanta kecamatan ada di `src/constants/kecamatan.ts`.

### 4. Retur & Refund

- Retur produk dengan pengembalian stok otomatis
- Refund bisa dikembalikan ke pelanggan atau dipotong dari piutang
- Retur mengurangi `return_amount` di transaksi asli

### 5. Laporan

- **Laporan Penjualan** — Total penjualan, transaksi, item terjual (per periode)
- **Laporan Laba Rugi** — Rekap laba/rugi per periode
- **Laba Per Transaksi** — Detail laba per transaksi (harga jual - harga beli)

### 6. Modul Finance (Akuntansi)

- Chart of Accounts (COA)
- Jurnal umum (manual entry)
- Buku besar (general ledger)
- Neraca saldo (trial balance)
- Neraca (balance sheet)
- Arus kas (cash flow)

### 7. Modul Purchasing (Pembelian Barang)

- Supplier management
- Purchase Order (PO)
- Goods Receipt Note (GRN) — terima barang + update stok
- Purchase Invoice (PI)
- Purchase Return — retur ke supplier

### 8. Modul HR & Payroll

- Karyawan (nama, posisi, gaji pokok, tunjangan)
- Kasbon karyawan (pinjaman + cicilan)
- Slip gaji per karyawan (bukan periode global)
- Cetak slip gaji PDF

**Penting:** Sistem payroll berubah dari periode global ke **per-karyawan**. Setiap slip gaji dibuat untuk satu karyawan dengan periode tertentu.

### 9. Modul Shipping (Surat Jalan)

- Surat jalan (delivery order) untuk pengiriman barang
- Tracking status: pending, in_transit, delivered, cancelled
- Kendaraan (plat nomor, driver)
- Cetak surat jalan PDF

### 10. Matriks Harga Bertingkat

Sistem harga fleksibel dengan 4 level prioritas:

1. **Harga Khusus Customer** — Harga untuk customer spesifik + produk spesifik (prioritas tertinggi)
2. **Harga Grup** — Harga untuk grup customer + produk spesifik
3. **Harga Tier** — Harga berdasarkan quantity bracket (misal: 1-10 pcs = Rp 10.000, 11-50 pcs = Rp 9.500)
4. **Harga Default** — Harga jual di tabel `products` (prioritas terendah)

Service `priceMatrixService.ts` menghitung harga final dengan prioritas ini.

## Konvensi UI

### Custom Form Controls

**Jangan gunakan native `<input type="date">` atau `<select>`** di UI bisnis. Gunakan custom components:

- **DateField** (date-only, bukan datetime) untuk input tanggal
- **SelectField** untuk dropdown

Lihat memory: `~/.claude/projects/-home-putra-ucup-kasir/memory/custom_form_controls.md`

### Dialog & Toast

**Jangan gunakan `alert()` atau `confirm()` native**. Gunakan:

- `useConfirm()` + `ConfirmDialog` component untuk konfirmasi
- `useToast()` untuk notifikasi

Lihat memory: `~/.claude/projects/-home-putra-ucup-kasir/memory/no_native_dialogs.md`

### Statistik Cards

Dashboard menggunakan statistik cards dengan **garis warna di atas** card (bukan icon berwarna di dalam card).

Lihat memory: `~/.claude/projects/-home-putra-ucup-kasir/memory/ui_preferences.md`

### Responsive Design & Mobile Layout

Aplikasi dioptimalkan untuk tampilan mobile (Android) dengan konvensi berikut:

**Layout Mobile:**
- Gunakan **2 kolom** untuk grid cards di mobile (bukan 1 kolom penuh)
- Statistik cards harus responsif dengan breakpoint Tailwind (`sm:`, `md:`, `lg:`)
- Padding dan spacing disesuaikan untuk layar kecil

**Dropdown Filter Mobile:**
- Filter di halaman list (products, transactions, customers) menggunakan **dropdown/select** di mobile
- Desktop bisa gunakan tabs atau button group
- Implementasi: conditional rendering berdasarkan screen size atau gunakan Tailwind responsive classes

**Navigation:**
- Sidebar collapse menjadi hamburger menu di mobile
- Bottom navigation bar untuk quick access (opsional, tergantung halaman)
- Gunakan composable `useSidebar()` untuk toggle sidebar

**Form di Mobile:**
- Input field stack vertical (full width)
- Button action (simpan, batal) full width di mobile
- Spacing antar field lebih rapat di mobile

**Table di Mobile:**
- Table horizontal scroll dengan `overflow-x-auto`
- Atau gunakan card layout sebagai alternatif table di mobile
- Priority columns: tampilkan kolom penting saja di mobile, sisanya bisa expand/collapse

**Touch Target:**
- Button dan clickable element minimal 44x44px untuk touch-friendly
- Icon button dengan padding cukup besar
- List item dengan spacing antar item

**Platform Detection:**
- Gunakan `src/lib/platform.ts` untuk deteksi platform (jangan hardcode)
- Capacitor API untuk fitur native Android (share, filesystem, dll)

Lihat memory: `~/.claude/projects/-home-putra-ucup-kasir/memory/ui_preferences.md`

## Authentication & Security

### Auth Flow

- Signup/Signin melalui Supabase Auth (email + password)
- Session disimpan di `localStorage`
- Router guard (`router/index.ts`) redirect ke `/signin` jika belum login
- Auth state dikelola oleh `stores/auth.ts`

### Multi-user Isolation

Setiap user hanya melihat data miliknya sendiri melalui RLS. Kolom `user_id` di semua tabel diisi dengan `auth.uid()`.

### Data Sensitif

- Keystore dan `keystore.properties` tidak di-commit (ada di `.gitignore`)
- `.env` tidak di-commit (gunakan `.env.example` sebagai template)
- Credentials Supabase hanya di environment variables

## Event Logging

Aplikasi memiliki **event logging system** (`lib/eventLog.ts`) yang mencatat semua error Supabase dan operasi kritis.

- Error Supabase otomatis tercatat dengan detail tabel, operasi, dan filter
- Log bisa dilihat di `/settings/event-log`
- Berguna untuk debugging production issues

Client Supabase dibungkus dengan Proxy yang memeriksa `{ error }` pada setiap query dan mencatat ke event log.

## Testing & Verification

Sebelum melaporkan task selesai:

1. **Type check:** `npm run type-check`
2. **Build check:** `npm run build`
3. **Manual testing:** Jalankan `npm run dev` dan test fitur di browser
4. **Android test (jika perlu):** `npm run build && npx cap sync` lalu test di emulator/device

Untuk perubahan UI, **WAJIB** test di browser dengan:
- Golden path (happy flow)
- Edge cases (data kosong, error handling)
- Regresi fitur lain (pastikan tidak break existing features)

## Known Issues & Workarounds

### Payroll System

Sistem payroll **sudah diubah dari periode global ke per-karyawan**. Commit terakhir: `a10417e`.

- Setiap slip gaji dibuat untuk satu karyawan dengan periode tertentu
- Tidak ada lagi tabel `hr_payroll_periods` global
- Kasbon dipotong otomatis di slip gaji

### Sync & Offline Mode

Aplikasi memiliki fitur offline dengan SQLite (untuk Android). Ada folder `src/services/sqlite/` dan `src/services/sync/` untuk sinkronisasi data.

Status: Fitur ini masih dalam development. Lihat dokumentasi di `docs/` dan `SYNC_*.md` files.

## GitHub Actions

Ada CI/CD pipeline di `.github/workflows/` untuk:

- Android build release APK
- Type check & lint

Keystore base64 disimpan di GitHub Secrets dengan nama `KEYSTORE_BASE64` dan `KEYSTORE_PASSWORD`.

## Deployment

### Web Deployment

Build web bisa di-deploy ke static hosting (Vercel, Netlify, GitHub Pages):

```bash
npm run build
# Output di folder dist/
```

File `public/_redirects` sudah tersedia untuk SPA fallback di Netlify.

### Android Deployment

APK release ada di `android/app/build/outputs/apk/release/app-release.apk` setelah build.

**PENTING:** Jangan hilangkan keystore. Jika hilang, aplikasi yang sudah terinstall tidak bisa di-update.

## Catatan Penting

- **Alias `@`** di Vite config resolve ke `src/`
- **Import path** selalu gunakan `@/` untuk import dari `src/`
- **Supabase client** ada di `src/lib/supabase.ts` (sudah terinstrumentasi dengan error logging)
- **Database functions** untuk transaksi HARUS dipanggil via `supabase.rpc()`, bukan insert langsung
- **Kecamatan Banyuwangi** adalah 24 kecamatan di Kabupaten Banyuwangi, lihat `src/constants/kecamatan.ts`
- **Mobile platform detection** gunakan `src/lib/platform.ts` (jangan hardcode check)

## Dokumentasi Tambahan

Ada beberapa file dokumentasi di root project:

- `CLEANUP_SUMMARY.md` — Ringkasan cleanup kode
- `PAYROLL_BUGS_REPORT.md` — Laporan bug payroll (sudah fixed)
- `SYNC_TESTING_GUIDE.md` — Guide testing fitur sync
- `TESTING_SALES_MODULE.md` — Guide testing modul penjualan

Baca file-file ini untuk konteks lebih detail tentang fitur tertentu.
