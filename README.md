# Ucup Kasir 🧾

Aplikasi kasir (point of sale) berbasis web dan Android untuk mengelola penjualan, stok, pelanggan, dan pembayaran hutang (kredit) toko kelontong. Dibangun dengan **Vue 3**, **TypeScript**, **Tailwind CSS**, dan **Supabase** sebagai backend, serta dikemas sebagai aplikasi Android native melalui **Capacitor**.

Aplikasi ini dirancang untuk kebutuhan toko kelontong skala kecil-menengah — mendukung penjualan tunai & kredit, pelacakan piutang per pelanggan per kecamatan, retur, mutasi stok, dan pencetakan invoice PDF.

## ✨ Fitur Utama

- **Dashboard** — ringkasan penjualan, grafik, dan statistik cepat.
- **Manajemen Produk** — CRUD produk, kategori, SKU/barcode, harga beli & jual, gambar, stok minimum, dan status aktif.
- **Manajemen Stok** — stok gudang, detail stok, riwayat mutasi stok, penyesuaian stok (adjustment), dan stock opname.
- **Transaksi Penjualan** — penjualan tunai/kredit dengan validasi stok otomatis, potongan harga, biaya kirim, pembayaran DP/cicilan (utang pelanggan), dan riwayat pembayaran.
- **Invoice & Piutang** — tagihan per pelanggan, dikelompokkan per **kecamatan** (khusus Kabupaten Banyuwangi), status lunas/belum lunas, dan cetak invoice.
- **Retur** — pengembalian produk beserta perhitungan refund dan pengembalian stok.
- **Pelanggan** — CRUD pelanggan dengan informasi toko, kontak, dan kecamatan.
- **Laporan** — laporan penjualan, laba rugi, dan laba per transaksi.
- **Laporan Laba Rugi** — rekap laba/rugi berdasarkan periode.
- **Notifikasi** — peringatan stok menipis dan aktivitas transaksi.
- **Pengaturan Toko** — nama toko, alamat, kontak, pajak, dan footer struk untuk invoice.
- **Multi-user** — setiap user hanya melihat datanya sendiri (berbasis autentikasi Supabase).

## 🛠️ Teknologi

| Teknologi | Fungsi |
|-----------|--------|
| [Vue 3](https://vuejs.org/) (Composition API) | Framework UI |
| [TypeScript](https://www.typescriptlang.org/) | Bahasa pengembangan |
| [Vite](https://vite.dev/) | Build tool & dev server |
| [Tailwind CSS 4](https://tailwindcss.com/) | Styling |
| [Pinia](https://pinia.vuejs.org/) | State management |
| [Vue Router 4](https://router.vuejs.org/) | Routing & auth guard |
| [Supabase](https://supabase.com/) | Backend: auth, database (PostgreSQL), RLS, realtime |
| [Capacitor](https://capacitorjs.com/) | Pembungkus aplikasi Android native |
| [ApexCharts](https://apexcharts.com/) | Visualisasi data / grafik |
| [jsPDF](https://github.com/parallax/jsPDF) | Ekspor & cetak PDF |
| [FullCalendar](https://fullcalendar.io/) | Kalender |
| [Flatpickr](https://flatpickr.js.org/) | Picker tanggal |
| [Swiper](https://swiperjs.com/) | Slider / carousel |

## 📁 Struktur Project

```
ucup-kasir/
├── android/                  # Project Android (Capacitor) — APK release
├── public/                   # Aset statis (favicon, gambar, _redirects)
├── src/
│   ├── assets/               # CSS global & aset
│   ├── components/           # Komponen UI (layout, charts, tables, dll)
│   ├── composables/          # useCsv, useDataTable, usePdfExport, useSidebar, useToast
│   ├── constants/            # Konstanta (mis. daftar kecamatan Banyuwangi)
│   ├── icons/                # Ikon (lucide-vue-next)
│   ├── lib/                  # Inisialisasi client Supabase
│   ├── router/               # Definisi route + guard autentikasi
│   ├── services/             # Lapisan akses data (products, transactions, dll)
│   ├── stores/               # Pinia stores (auth, products, transactions, dll)
│   ├── types/                # Tipe TypeScript (database.ts, dll)
│   └── views/                # Halaman aplikasi
│       ├── Auth/             # Signin & Signup
│       ├── Categories/       # Kelola kategori produk
│       ├── Customers/        # Kelola pelanggan
│       ├── Invoices/         # Invoice per pelanggan & cetak
│       ├── Products/         # Kelola produk
│       ├── Reports/          # Laporan penjualan & laba rugi
│       ├── Returns/          # Daftar retur
│       ├── Settings/         # Pengaturan toko
│       ├── Stock/            # Manajemen & mutasi stok
│       └── Transactions/     # Transaksi & invoice
├── supabase/
│   └── migrations/           # Migrasi database (tabel, RLS, fungsi SQL)
├── capacitor.config.ts       # Konfigurasi Capacitor
├── generate-keystore.sh      # Script pembuatan keystore Android
├── get-keystore-base64.sh    # Script untuk GitHub Secret
└── vite.config.ts            # Konfigurasi Vite (alias @)
```

## 🚀 Menjalankan di Lokal

### Prasyarat

- Node.js 18+ (disarankan 20+)
- Akun [Supabase](https://supabase.com/) (proyek database + auth)

### Langkah

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Konfigurasi environment**

   Salin `.env.example` menjadi `.env` lalu isi kredensial Supabase:

   ```bash
   cp .env.example .env
   ```

   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

3. **Jalankan migrasi database**

   Terapkan migrasi di folder [`supabase/migrations`](./supabase/migrations) melalui Supabase Dashboard → SQL Editor (jalankan berurutan). Migrasi ini membuat tabel produk, kategori, pelanggan, transaksi, retur, pengaturan toko, notifikasi, serta fungsi SQL (`create_transaction`, `add_transaction_payment`, dll.) dengan Row Level Security per-user.

4. **Jalankan development server**

   ```bash
   npm run dev
   ```

   Buka `http://localhost:5173`.

### Script NPM

| Perintah | Deskripsi |
|----------|-----------|
| `npm run dev` | Menjalankan dev server Vite |
| `npm run build` | Type-check lalu build produksi |
| `npm run build-only` | Build produksi (tanpa type-check) |
| `npm run preview` | Preview hasil build |
| `npm run type-check` | Cek tipe dengan vue-tsc |
| `npm run lint` | Lint & auto-fix dengan ESLint |
| `npm run format` | Format kode dengan Prettier |

## 📱 Build Aplikasi Android

Aplikasi dikemas sebagai Android native dengan Capacitor.

```bash
# 1. Build web assets
npm run build

# 2. Sinkronkan ke project Android
npx cap sync

# 3. Build APK release
cd android && ./gradlew assembleRelease
```

### Keystore & Signing

Sebelum build release, siapkan keystore untuk menandatangani APK:

```bash
# Generate keystore (pertama kali)
bash generate-keystore.sh

# Ambil base64 keystore (untuk GitHub Actions Secret)
bash get-keystore-base64.sh
```

> ⚠️ **PENTING:** Simpan file keystore dan password dengan aman. Jika keystore hilang, aplikasi yang sudah terpasang **tidak bisa di-update**. Jangan commit keystore dan `keystore.properties` ke git.

## 🔐 Keamanan & Multi-user

- Setiap user mendaftar/login melalui **Supabase Auth** (email & password).
- Semua tabel menerapkan **Row Level Security (RLS)** sehingga user hanya bisa mengakses data miliknya sendiri (`auth.uid() = user_id`).
- Operasi transaksi (buat transaksi, pembayaran cicilan, hapus transaksi, retur) dilakukan lewat **fungsi SQL** (`SECURITY DEFINER`) agar atomik dan aman.
- Data sensitif (keystore, kredensial) tidak di-commit ke git — lihat `.gitignore`.

## 📦 Deploy Web

Aplikasi web bisa di-deploy ke layanan static hosting (Vercel, Netlify, GitHub Pages, dll).

- Build: `npm run build` (output di folder `dist/`)
- File `public/_redirects` sudah tersedia untuk Netlify (SPA fallback).

## 🤝 Kontribusi

1. Fork repository
2. Buat branch fitur (`git checkout -b fitur-baru`)
3. Commit perubahan (`git commit -m 'feat: tambah fitur baru'`)
4. Push branch (`git push origin fitur-baru`)
5. Buka Pull Request

## 📄 Lisensi

Project ini dikembangkan khusus untuk **Ucup Kasir**. UI dasar bersumber dari template [TailAdmin Vue](https://github.com/TailAdmin/vue-tailwind-admin-dashboard).
