# Panduan Testing Manual - Ucup Kasir

Panduan ini berisi skenario testing lengkap untuk mencari bug di aplikasi Ucup Kasir. Test setiap modul secara sistematis untuk memastikan tidak ada error kritis.

## Persiapan Testing

### Environment Setup
1. Jalankan aplikasi: `npm run dev`
2. Buka browser: http://localhost:5173
3. Buka Browser DevTools (F12) untuk melihat console errors
4. Siapkan data test (user, produk, customer, dll)

### Tools Monitoring
- **Console Browser**: Untuk JavaScript errors
- **Network Tab**: Untuk API errors (status 4xx/5xx)
- **Event Log**: `/settings/event-log` untuk error Supabase
- **Database**: Supabase Dashboard untuk cek data integrity

---

## 1. MODUL AUTHENTICATION

### Test Case 1.1: Sign Up User Baru
**Langkah:**
1. Buka `/signup`
2. Isi form:
   - Email: `test@example.com`
   - Password: `password123`
   - Confirm Password: `password123`
3. Klik "Daftar"

**Expected Result:**
- ✅ User berhasil terdaftar
- ✅ Redirect ke dashboard
- ✅ Session tersimpan di localStorage

**Bug yang Mungkin Ditemukan:**
- Email validation tidak bekerja
- Password tidak match tidak terdeteksi
- Error 500 saat insert user_id di tabel lain (RLS issue)

### Test Case 1.2: Sign In User Existing
**Langkah:**
1. Logout dahulu
2. Buka `/signin`
3. Isi email & password yang sudah terdaftar
4. Klik "Masuk"

**Expected Result:**
- ✅ Login berhasil
- ✅ Redirect ke dashboard
- ✅ Navbar menampilkan nama user

**Bug yang Mungkin Ditemukan:**
- Password salah tidak ada feedback
- Session tidak tersimpan (logout otomatis)

### Test Case 1.3: Auth Guard
**Langkah:**
1. Logout
2. Coba akses langsung ke `/products` via URL bar

**Expected Result:**
- ✅ Redirect ke `/signin`

**Bug yang Mungkin Ditemukan:**
- Bisa akses halaman tanpa login (auth guard tidak jalan)

---

## 2. MODUL PRODUK

### Test Case 2.1: Create Produk Normal
**Langkah:**
1. Buka `/products`
2. Klik "Tambah Produk"
3. Isi form:
   - Nama: "Indomie Goreng"
   - SKU: "INDOMIE001"
   - Kategori: Pilih/buat kategori
   - Harga Beli: 2500
   - Harga Jual: 3000
   - Stok: 100
   - Stok Minimum: 10
4. Klik "Simpan"

**Expected Result:**
- ✅ Produk muncul di list
- ✅ Toast success
- ✅ Data masuk tabel `products`

**Bug yang Mungkin Ditemukan:**
- Harga beli > harga jual tidak ada validasi
- Stok negatif bisa disimpan
- SKU duplikat tidak terdeteksi

### Test Case 2.2: Create Produk dengan Data Invalid
**Langkah:**
1. Klik "Tambah Produk"
2. Isi form:
   - Nama: (kosong)
   - Harga Beli: -1000
   - Stok: -50
3. Klik "Simpan"

**Expected Result:**
- ❌ Error validation muncul
- ❌ Produk tidak tersimpan

**Bug yang Mungkin Ditemukan:**
- Bisa simpan dengan nama kosong
- Bisa simpan harga/stok negatif
- Tidak ada validasi di frontend maupun database

### Test Case 2.3: Edit Produk
**Langkah:**
1. Di list produk, klik tombol edit
2. Ubah nama menjadi "Indomie Goreng Original"
3. Ubah stok menjadi 50
4. Klik "Simpan"

**Expected Result:**
- ✅ Data produk terupdate
- ✅ List refresh dengan data baru

**Bug yang Mungkin Ditemukan:**
- Data tidak terupdate
- Stok berubah tanpa tercatat di `stock_movements`

### Test Case 2.4: Delete Produk
**Langkah:**
1. Pilih produk yang belum pernah dipakai di transaksi
2. Klik tombol delete
3. Konfirmasi delete

**Expected Result:**
- ✅ Produk terhapus
- ✅ Hilang dari list

**Bug yang Mungkin Ditemukan:**
- Bisa hapus produk yang sudah ada di transaksi (foreign key constraint error)
- Tidak ada confirm dialog

### Test Case 2.5: Search & Filter Produk
**Langkah:**
1. Ketik "Indomie" di search box
2. Pilih kategori tertentu di filter
3. Coba filter stok menipis

**Expected Result:**
- ✅ List filter sesuai keyword
- ✅ Filter kategori bekerja
- ✅ Filter stok menipis hanya tampilkan produk dengan stok <= stok_minimum

**Bug yang Mungkin Ditemukan:**
- Search case-sensitive
- Filter tidak bekerja
- Kombinasi filter crash

---

## 3. MODUL CUSTOMER

### Test Case 3.1: Create Customer
**Langkah:**
1. Buka `/customers`
2. Klik "Tambah Pelanggan"
3. Isi form:
   - Nama: "Toko Sumber Rejeki"
   - Alamat: "Jl. Melati No. 10"
   - Kecamatan: "Banyuwangi"
   - Telepon: "081234567890"
   - Limit Kredit: 5000000
4. Klik "Simpan"

**Expected Result:**
- ✅ Customer muncul di list
- ✅ Kecamatan tersimpan dengan benar

**Bug yang Mungkin Ditemukan:**
- Telepon bisa diisi huruf
- Limit kredit negatif bisa disimpan
- Kecamatan tidak ter-filter di dropdown (bukan 24 kecamatan Banyuwangi)

### Test Case 3.2: Filter Customer by Kecamatan
**Langkah:**
1. Di halaman `/customers`, pilih kecamatan "Banyuwangi" di filter
2. Cek list customer yang muncul

**Expected Result:**
- ✅ Hanya tampilkan customer dengan kecamatan "Banyuwangi"

**Bug yang Mungkin Ditemukan:**
- Filter tidak bekerja
- Kecamatan typo tidak cocok (case-sensitive)

---

## 4. MODUL TRANSAKSI PENJUALAN

### Test Case 4.1: Transaksi Tunai Normal
**Langkah:**
1. Buka `/transactions/new`
2. Pilih customer (opsional untuk tunai)
3. Tambah produk:
   - Cari "Indomie Goreng"
   - Qty: 10
   - Harga otomatis muncul
4. Cek total
5. Pilih metode "Tunai"
6. Klik "Simpan Transaksi"

**Expected Result:**
- ✅ Transaksi tersimpan
- ✅ Stok produk berkurang 10
- ✅ `stock_movements` tercatat dengan tipe "sale"
- ✅ Redirect ke halaman invoice atau list transaksi

**Bug yang Mungkin Ditemukan:**
- Stok tidak berkurang
- Stok movements tidak tercatat
- Qty bisa 0 atau negatif
- Total salah hitung

### Test Case 4.2: Transaksi Tunai dengan Stok Tidak Cukup
**Langkah:**
1. Buka produk, cek stok (misal: stok = 5)
2. Buat transaksi baru dengan qty = 10 (lebih dari stok)
3. Klik "Simpan Transaksi"

**Expected Result:**
- ❌ Error: "Stok tidak cukup"
- ❌ Transaksi tidak tersimpan

**Bug yang Mungkin Ditemukan:**
- Transaksi berhasil walaupun stok minus
- Stok jadi negatif
- Tidak ada validasi stok

### Test Case 4.3: Transaksi Kredit dengan DP
**Langkah:**
1. Buat transaksi baru
2. Pilih customer
3. Tambah produk (total misal: Rp 100.000)
4. Pilih metode "Kredit"
5. Isi DP: Rp 50.000
6. Klik "Simpan Transaksi"

**Expected Result:**
- ✅ Transaksi tersimpan dengan status "partial"
- ✅ `paid_amount` = 50000
- ✅ `remaining_amount` = 50000
- ✅ Ada entry di `transaction_payments` dengan jumlah 50000

**Bug yang Mungkin Ditemukan:**
- DP tidak tercatat di `transaction_payments`
- Status tidak berubah ke "partial"
- Remaining amount salah hitung

### Test Case 4.4: Transaksi Kredit Tanpa DP
**Langkah:**
1. Buat transaksi kredit
2. Kosongkan DP (0)
3. Simpan

**Expected Result:**
- ✅ Status = "pending"
- ✅ `paid_amount` = 0
- ✅ `remaining_amount` = total

**Bug yang Mungkin Ditemukan:**
- Tidak bisa simpan tanpa DP
- Status salah

### Test Case 4.5: Transaksi dengan Diskon & Ongkir
**Langkah:**
1. Buat transaksi
2. Tambah produk (total: Rp 100.000)
3. Isi diskon: Rp 10.000
4. Isi ongkir: Rp 5.000
5. Simpan

**Expected Result:**
- ✅ Total akhir = 100.000 - 10.000 + 5.000 = 95.000
- ✅ `discount_amount` dan `shipping_cost` tersimpan

**Bug yang Mungkin Ditemukan:**
- Total salah hitung
- Diskon bisa lebih dari total (total jadi negatif)
- Ongkir tidak masuk ke total

### Test Case 4.6: Transaksi dengan Custom Tanggal
**Langkah:**
1. Buat transaksi baru
2. Ubah tanggal transaksi menjadi 1 minggu lalu (untuk backfill data)
3. Simpan

**Expected Result:**
- ✅ Transaksi tersimpan dengan `transaction_date` sesuai input

**Bug yang Mungkin Ditemukan:**
- Tanggal tidak bisa diubah (selalu pakai hari ini)
- DateField tidak bekerja
- Tanggal bisa di masa depan (tidak ada validasi)

---

## 5. MODUL PEMBAYARAN PIUTANG

### Test Case 5.1: Bayar Cicilan Piutang
**Langkah:**
1. Buka `/invoices`
2. Pilih kecamatan
3. Pilih customer yang punya piutang
4. Klik transaksi dengan status "pending" atau "partial"
5. Klik "Bayar"
6. Isi jumlah pembayaran: Rp 50.000
7. Simpan

**Expected Result:**
- ✅ `paid_amount` bertambah 50.000
- ✅ `remaining_amount` berkurang 50.000
- ✅ Status berubah ke "partial" (jika belum lunas) atau "paid" (jika lunas)
- ✅ Ada entry baru di `transaction_payments`

**Bug yang Mungkin Ditemukan:**
- Paid amount tidak terupdate
- Bisa bayar lebih dari remaining_amount
- Status tidak berubah
- Payment tidak tercatat

### Test Case 5.2: Bayar Lunas
**Langkah:**
1. Buat transaksi kredit dengan total Rp 100.000
2. Bayar cicilan Rp 100.000 (lunas sekaligus)

**Expected Result:**
- ✅ Status = "paid"
- ✅ `remaining_amount` = 0

**Bug yang Mungkin Ditemukan:**
- Status tidak berubah ke "paid"
- Remaining amount tidak 0

### Test Case 5.3: Bayar dengan Jumlah Invalid
**Langkah:**
1. Coba bayar dengan jumlah negatif
2. Coba bayar dengan jumlah 0
3. Coba bayar lebih dari remaining_amount

**Expected Result:**
- ❌ Semua harus di-reject dengan error validasi

**Bug yang Mungkin Ditemukan:**
- Bisa bayar negatif (paid_amount berkurang)
- Bisa bayar 0
- Bisa bayar over remaining

---

## 6. MODUL RETUR

### Test Case 6.1: Retur Penuh dengan Refund
**Langkah:**
1. Buat transaksi tunai dengan 1 produk (qty: 10)
2. Buka menu retur
3. Pilih transaksi tersebut
4. Pilih produk, qty retur: 10 (semua)
5. Pilih refund: "Dikembalikan ke customer"
6. Simpan

**Expected Result:**
- ✅ Retur tersimpan
- ✅ Stok produk bertambah 10
- ✅ `return_amount` di transaksi bertambah sesuai total retur
- ✅ Status transaksi tidak berubah (tetap "paid")

**Bug yang Mungkin Ditemukan:**
- Stok tidak bertambah
- Return amount tidak terupdate
- Refund amount salah hitung

### Test Case 6.2: Retur Sebagian dengan Potong Piutang
**Langkah:**
1. Buat transaksi kredit dengan 1 produk (qty: 10, total: Rp 100.000)
2. Retur qty: 5
3. Pilih refund: "Dikurangi dari piutang"
4. Simpan

**Expected Result:**
- ✅ Stok bertambah 5
- ✅ `return_amount` bertambah 50.000
- ✅ `remaining_amount` transaksi berkurang 50.000

**Bug yang Mungkin Ditemukan:**
- Piutang tidak berkurang
- Stok tidak update
- Bisa retur lebih dari qty transaksi

### Test Case 6.3: Retur dengan Qty Invalid
**Langkah:**
1. Buat transaksi dengan qty 10
2. Coba retur qty 15 (lebih dari qty transaksi)

**Expected Result:**
- ❌ Error: "Qty retur melebihi qty transaksi"

**Bug yang Mungkin Ditemukan:**
- Bisa retur lebih dari qty transaksi
- Qty retur negatif bisa disimpan

---

## 7. MODUL STOK

### Test Case 7.1: Stock Opname
**Langkah:**
1. Buka `/stock/opname`
2. Pilih produk
3. Isi stok fisik (misal: stok system = 100, fisik = 95)
4. Isi catatan: "Rusak 5 pcs"
5. Simpan

**Expected Result:**
- ✅ Stok produk jadi 95
- ✅ Ada entry di `stock_movements` dengan tipe "adjustment" dan qty -5
- ✅ Catatan tersimpan di `stock_movements.notes`

**Bug yang Mungkin Ditemukan:**
- Stok tidak update
- Stock movement tidak tercatat
- Bisa isi stok fisik negatif

### Test Case 7.2: Lihat Riwayat Mutasi Stok
**Langkah:**
1. Buka `/stock/movements`
2. Pilih produk
3. Cek list mutasi

**Expected Result:**
- ✅ Tampilkan semua mutasi (sale, purchase, return, adjustment)
- ✅ Qty dan tanggal benar

**Bug yang Mungkin Ditemukan:**
- Data tidak muncul (RLS issue)
- Reference transaction_id tidak bisa diklik

---

## 8. MODUL LAPORAN

### Test Case 8.1: Laporan Penjualan
**Langkah:**
1. Buka `/reports/sales`
2. Pilih periode (misal: bulan ini)
3. Klik "Tampilkan Laporan"

**Expected Result:**
- ✅ Tampilkan total penjualan, total transaksi, total item terjual
- ✅ Chart penjualan per hari muncul (ApexCharts)
- ✅ Bisa export PDF

**Bug yang Mungkin Ditemukan:**
- Data tidak muncul (query error)
- Chart tidak render
- Export PDF crash

### Test Case 8.2: Laporan Laba Rugi
**Langkah:**
1. Buka `/reports/profit-loss`
2. Pilih periode
3. Klik "Tampilkan Laporan"

**Expected Result:**
- ✅ Tampilkan total penjualan, total HPP, laba kotor, laba bersih
- ✅ HPP dihitung dari harga beli produk di transaksi

**Bug yang Mungkin Ditemukan:**
- HPP salah hitung (tidak sesuai harga beli saat transaksi)
- Laba bersih negatif tidak ditandai (seharusnya rugi)
- Data tidak muncul

### Test Case 8.3: Laporan Laba Per Transaksi
**Langkah:**
1. Buka laporan laba per transaksi
2. Filter periode
3. Cek detail laba per item

**Expected Result:**
- ✅ Setiap transaksi menampilkan laba = (harga jual - harga beli) × qty
- ✅ Total laba akurat

**Bug yang Mungkin Ditemukan:**
- Laba salah hitung
- Harga beli tidak tersimpan di transaction_items (pakai harga beli current)

---

## 9. MODUL FINANCE (AKUNTANSI)

### Test Case 9.1: Create Chart of Account (COA)
**Langkah:**
1. Buka `/finance/coa`
2. Tambah akun baru:
   - Kode: "1-1001"
   - Nama: "Kas"
   - Tipe: "Asset"
   - Parent: (kosong atau pilih parent)
3. Simpan

**Expected Result:**
- ✅ COA muncul di list
- ✅ Bisa dipakai di jurnal

**Bug yang Mungkin Ditemukan:**
- Kode duplikat bisa disimpan
- Tipe akun tidak valid (bukan Asset/Liability/Equity/Revenue/Expense)

### Test Case 9.2: Create Jurnal Umum
**Langkah:**
1. Buka `/finance/journal`
2. Tambah entry:
   - Tanggal: hari ini
   - Deskripsi: "Modal awal"
   - Debit: Kas (1-1001), Rp 10.000.000
   - Kredit: Modal Pemilik (3-0001), Rp 10.000.000
3. Simpan

**Expected Result:**
- ✅ Jurnal tersimpan
- ✅ Total debit = total kredit
- ✅ Ledger terupdate

**Bug yang Mungkin Ditemukan:**
- Bisa simpan dengan debit ≠ kredit (tidak balanced)
- Ledger tidak terupdate
- Tanggal tidak bisa diubah

### Test Case 9.3: Lihat Buku Besar (General Ledger)
**Langkah:**
1. Buka `/finance/ledger`
2. Pilih akun "Kas"
3. Pilih periode

**Expected Result:**
- ✅ Tampilkan semua transaksi jurnal yang ada entry Kas
- ✅ Running balance benar

**Bug yang Mungkin Ditemukan:**
- Data tidak muncul
- Balance salah hitung

### Test Case 9.4: Neraca Saldo (Trial Balance)
**Langkah:**
1. Buka `/finance/trial-balance`
2. Pilih periode (misal: bulan ini)
3. Klik "Tampilkan"

**Expected Result:**
- ✅ Tampilkan semua akun dengan saldo debit/kredit
- ✅ Total debit = total kredit

**Bug yang Mungkin Ditemukan:**
- Total tidak balanced
- Ada akun tidak muncul

### Test Case 9.5: Neraca (Balance Sheet)
**Langkah:**
1. Buka `/finance/balance-sheet`
2. Pilih tanggal (misal: akhir bulan ini)

**Expected Result:**
- ✅ Tampilkan Asset, Liability, Equity
- ✅ Total Asset = Total Liability + Equity

**Bug yang Mungkin Ditemukan:**
- Total tidak balanced
- Akun salah kategori (Asset tampil di Liability)

---

## 10. MODUL PURCHASING (PEMBELIAN)

### Test Case 10.1: Create Supplier
**Langkah:**
1. Buka `/purchasing/suppliers`
2. Tambah supplier:
   - Nama: "PT Sumber Makmur"
   - Alamat: "Surabaya"
   - Telepon: "031-1234567"
3. Simpan

**Expected Result:**
- ✅ Supplier muncul di list

### Test Case 10.2: Create Purchase Order (PO)
**Langkah:**
1. Buka `/purchasing/orders/new`
2. Pilih supplier
3. Tambah item:
   - Produk: "Indomie Goreng"
   - Qty: 100
   - Harga beli: 2500
4. Simpan

**Expected Result:**
- ✅ PO tersimpan dengan status "pending"
- ✅ Total harga benar (qty × harga)

**Bug yang Mungkin Ditemukan:**
- Qty negatif bisa disimpan
- Total salah hitung

### Test Case 10.3: Goods Receipt Note (GRN) dari PO
**Langkah:**
1. Buka PO yang sudah dibuat
2. Klik "Terima Barang"
3. Konfirmasi qty received = qty PO
4. Simpan GRN

**Expected Result:**
- ✅ GRN tersimpan
- ✅ Stok produk bertambah sesuai qty received
- ✅ `stock_movements` tercatat dengan tipe "purchase"
- ✅ Status PO berubah jadi "received"

**Bug yang Mungkin Ditemukan:**
- Stok tidak bertambah
- Status PO tidak update
- Bisa terima qty lebih dari PO

### Test Case 10.4: Purchase Invoice (PI)
**Langkah:**
1. Buat PI dari GRN
2. Isi tanggal jatuh tempo
3. Simpan

**Expected Result:**
- ✅ PI tersimpan dengan status "pending"

**Bug yang Mungkin Ditemukan:**
- Tanggal jatuh tempo tidak bisa diisi
- Status tidak update

### Test Case 10.5: Purchase Return
**Langkah:**
1. Buat retur pembelian dari GRN
2. Pilih item, qty retur: 10
3. Simpan

**Expected Result:**
- ✅ Retur tersimpan
- ✅ Stok berkurang 10

**Bug yang Mungkin Ditemukan:**
- Stok tidak berkurang
- Bisa retur lebih dari qty GRN

---

## 11. MODUL HR & PAYROLL

### Test Case 11.1: Create Employee
**Langkah:**
1. Buka `/hr/employees`
2. Tambah karyawan:
   - Nama: "Budi Santoso"
   - Posisi: "Kasir"
   - Gaji Pokok: 3000000
   - Tunjangan: 500000
3. Simpan

**Expected Result:**
- ✅ Karyawan muncul di list

### Test Case 11.2: Create Kasbon
**Langkah:**
1. Buka `/hr/loans`
2. Tambah kasbon:
   - Karyawan: "Budi Santoso"
   - Jumlah: 1000000
   - Tanggal: hari ini
3. Simpan

**Expected Result:**
- ✅ Kasbon tersimpan dengan status "active"
- ✅ `remaining_amount` = jumlah

**Bug yang Mungkin Ditemukan:**
- Jumlah negatif bisa disimpan
- Status salah

### Test Case 11.3: Generate Payroll Slip
**Langkah:**
1. Buka `/hr/payroll`
2. Pilih karyawan "Budi Santoso"
3. Pilih periode (misal: Januari 2026)
4. Cek perhitungan:
   - Gaji Pokok: 3000000
   - Tunjangan: 500000
   - Potongan Kasbon: 100000 (otomatis dari kasbon aktif)
   - Total: 3400000
5. Simpan

**Expected Result:**
- ✅ Slip gaji tersimpan
- ✅ Kasbon `remaining_amount` berkurang 100000
- ✅ Jika kasbon lunas, status jadi "paid"

**Bug yang Mungkin Ditemukan:**
- Potongan kasbon tidak otomatis
- Remaining kasbon tidak berkurang
- Bisa buat slip gaji duplikat untuk periode sama

### Test Case 11.4: Cetak Slip Gaji PDF
**Langkah:**
1. Di list payroll, klik "Cetak"

**Expected Result:**
- ✅ PDF ter-generate dengan data slip gaji lengkap

**Bug yang Mungkin Ditemukan:**
- PDF error (jsPDF crash)
- Data tidak lengkap

---

## 12. MODUL SHIPPING (SURAT JALAN)

### Test Case 12.1: Create Kendaraan
**Langkah:**
1. Buka `/shipping/vehicles`
2. Tambah kendaraan:
   - Plat Nomor: "P 1234 AB"
   - Driver: "Agus"
   - Tipe: "Pickup"
3. Simpan

**Expected Result:**
- ✅ Kendaraan muncul di list

### Test Case 12.2: Create Surat Jalan
**Langkah:**
1. Buka `/shipping/delivery-orders/new`
2. Pilih transaksi (untuk referensi)
3. Pilih kendaraan
4. Tambah item (dari produk)
5. Simpan

**Expected Result:**
- ✅ Surat jalan tersimpan dengan status "pending"

**Bug yang Mungkin Ditemukan:**
- Qty lebih dari stok bisa disimpan
- Status tidak update

### Test Case 12.3: Update Status Surat Jalan
**Langkah:**
1. Buka surat jalan
2. Ubah status ke "in_transit"
3. Ubah lagi ke "delivered"

**Expected Result:**
- ✅ Status terupdate
- ✅ Timeline/log status tercatat

**Bug yang Mungkin Ditemukan:**
- Status bisa loncat (pending langsung delivered)
- Tidak ada validasi flow status

### Test Case 12.4: Cetak Surat Jalan PDF
**Langkah:**
1. Klik "Cetak Surat Jalan"

**Expected Result:**
- ✅ PDF ter-generate dengan data lengkap

**Bug yang Mungkin Ditemukan:**
- PDF error

---

## 13. MODUL MATRIKS HARGA

### Test Case 13.1: Harga Khusus Customer
**Langkah:**
1. Buka `/products/price-matrix`
2. Tambah harga khusus:
   - Customer: "Toko Sumber Rejeki"
   - Produk: "Indomie Goreng"
   - Harga: 2800 (lebih murah dari harga jual default 3000)
3. Simpan
4. Buat transaksi baru untuk customer ini dengan produk tersebut

**Expected Result:**
- ✅ Harga di transaksi otomatis jadi 2800 (bukan 3000)

**Bug yang Mungkin Ditemukan:**
- Harga tidak apply (tetap pakai harga default)
- Prioritas harga salah (harusnya harga customer > grup > tier > default)

### Test Case 13.2: Harga Grup
**Langkah:**
1. Buat customer group (misal: "Grosir")
2. Assign customer ke group
3. Tambah harga grup untuk produk tertentu
4. Buat transaksi dengan customer dalam group tersebut

**Expected Result:**
- ✅ Harga pakai harga grup

**Bug yang Mungkin Ditemukan:**
- Harga tidak apply
- Harga customer override harga grup (salah prioritas)

### Test Case 13.3: Harga Tier (Quantity Bracket)
**Langkah:**
1. Tambah harga tier untuk "Indomie Goreng":
   - 1-10 pcs: Rp 3000
   - 11-50 pcs: Rp 2900
   - 51+ pcs: Rp 2800
2. Buat transaksi dengan qty 15

**Expected Result:**
- ✅ Harga per pcs = Rp 2900

**Bug yang Mungkin Ditemukan:**
- Harga tidak berubah sesuai tier
- Tier overlap (misal: 10-20 dan 15-30) crash

---

## 14. MODUL NOTIFIKASI

### Test Case 14.1: Notifikasi Stok Menipis
**Langkah:**
1. Edit produk, set stok = 5, stok minimum = 10
2. Buka `/notifications`

**Expected Result:**
- ✅ Ada notifikasi "Stok Indomie Goreng menipis"

**Bug yang Mungkin Ditemukan:**
- Notifikasi tidak muncul (trigger database tidak jalan)
- Notifikasi duplikat

### Test Case 14.2: Mark Notifikasi as Read
**Langkah:**
1. Klik notifikasi
2. Status berubah jadi "read"

**Expected Result:**
- ✅ Status update
- ✅ Badge notifikasi berkurang

**Bug yang Mungkin Ditemukan:**
- Status tidak update
- Badge tidak berkurang

---

## 15. MODUL SETTINGS

### Test Case 15.1: Update Store Settings
**Langkah:**
1. Buka `/settings`
2. Edit:
   - Nama Toko: "Toko Berkah"
   - Alamat: "Banyuwangi"
   - Telepon: "0333-123456"
   - Logo: Upload gambar
3. Simpan

**Expected Result:**
- ✅ Settings terupdate
- ✅ Logo muncul di invoice PDF

**Bug yang Mungkin Ditemukan:**
- Logo tidak upload (Supabase Storage error)
- Settings tidak tersimpan

### Test Case 15.2: Event Log Viewer
**Langkah:**
1. Buka `/settings/event-log`
2. Cari error Supabase (misal: insert yang gagal)

**Expected Result:**
- ✅ Semua error tercatat dengan detail tabel, operasi, filter

**Bug yang Mungkin Ditemukan:**
- Log kosong (event logging tidak jalan)
- Log tidak bisa di-filter

---

## 16. EDGE CASES & STRESS TEST

### Test Case 16.1: Transaksi dengan Banyak Item (50+ produk)
**Langkah:**
1. Buat transaksi dengan 50+ item berbeda
2. Simpan

**Expected Result:**
- ✅ Transaksi berhasil
- ✅ Semua stok berkurang

**Bug yang Mungkin Ditemukan:**
- Timeout (database function terlalu lama)
- Sebagian item tidak tersimpan (partial insert)

### Test Case 16.2: Concurrent Transaction (2 User Bersamaan)
**Langkah:**
1. Buka 2 browser (atau incognito + normal)
2. Login sebagai user berbeda
3. Buat transaksi dengan produk yang sama secara bersamaan

**Expected Result:**
- ✅ Kedua transaksi berhasil (jika stok cukup)
- ✅ Stok berkurang sesuai total qty kedua transaksi

**Bug yang Mungkin Ditemukan:**
- Race condition: stok jadi minus (karena validasi stok di frontend, bukan database)
- Transaksi kedua gagal karena constraint

### Test Case 16.3: Delete Customer yang Punya Transaksi
**Langkah:**
1. Pilih customer yang sudah ada transaksi
2. Coba delete

**Expected Result:**
- ❌ Error: "Customer tidak bisa dihapus karena sudah ada transaksi"

**Bug yang Mungkin Ditemukan:**
- Customer terhapus (foreign key constraint tidak jalan)
- Transaksi orphan (customer_id jadi null)

### Test Case 16.4: Void Transaction
**Langkah:**
1. Buat transaksi
2. Klik "Batalkan Transaksi"
3. Konfirmasi

**Expected Result:**
- ✅ Status transaksi jadi "void"
- ✅ Stok dikembalikan

**Bug yang Mungkin Ditemukan:**
- Stok tidak dikembalikan
- Transaksi terhapus (harusnya hanya void)

---

## 17. MOBILE TESTING (ANDROID)

### Test Case 17.1: Build APK
**Langkah:**
1. `npm run build`
2. `npx cap sync`
3. `cd android && ./gradlew assembleRelease`

**Expected Result:**
- ✅ APK berhasil di-build tanpa error
- ✅ APK ada di `android/app/build/outputs/apk/release/`

**Bug yang Mungkin Ditemukan:**
- Gradle build error (dependency conflict)
- Keystore error (keystore.properties tidak ada)

### Test Case 17.2: Install & Run di Device/Emulator
**Langkah:**
1. Install APK ke device
2. Buka aplikasi
3. Test semua modul seperti di web

**Expected Result:**
- ✅ Aplikasi berjalan lancar
- ✅ UI responsif di mobile
- ✅ Semua fitur bekerja

**Bug yang Mungkin Ditemukan:**
- UI tidak responsif (teks terpotong, button terlalu kecil)
- Dropdown filter tidak bekerja di mobile
- Capacitor plugin error (camera, filesystem, dll)

### Test Case 17.3: Offline Mode (Jika Implementasi SQLite Aktif)
**Langkah:**
1. Buka aplikasi dalam kondisi online
2. Matikan internet
3. Coba buat transaksi
4. Nyalakan internet lagi, cek sinkronisasi

**Expected Result:**
- ✅ Transaksi tersimpan di SQLite lokal
- ✅ Setelah online, data sync ke Supabase

**Bug yang Mungkin Ditemukan:**
- Aplikasi crash saat offline
- Data tidak sync
- Conflict resolution gagal

---

## 18. SECURITY TESTING

### Test Case 18.1: RLS Bypass Test
**Langkah:**
1. Login sebagai User A
2. Buka DevTools → Network
3. Cek request Supabase, copy header & body
4. Coba ubah filter `user_id` menjadi user lain (misal: User B)
5. Kirim request manual via Postman/curl

**Expected Result:**
- ❌ Request di-reject oleh RLS (tidak dapat data user lain)

**Bug yang Mungkin Ditemukan:**
- Bisa akses data user lain (RLS tidak diterapkan di semua tabel)

### Test Case 18.2: SQL Injection (Jika Ada Raw Query)
**Langkah:**
1. Di search box produk, ketik: `'; DROP TABLE products; --`
2. Submit

**Expected Result:**
- ✅ Tidak ada error
- ✅ Tabel tidak terhapus (Supabase parameterized query)

**Bug yang Mungkin Ditemukan:**
- Tabel terhapus (raw SQL tidak di-escape)

### Test Case 18.3: XSS (Cross-Site Scripting)
**Langkah:**
1. Tambah produk dengan nama: `<script>alert('XSS')</script>`
2. Simpan
3. Buka list produk

**Expected Result:**
- ✅ Script tidak dieksekusi (Vue escape otomatis)

**Bug yang Mungkin Ditemukan:**
- Alert muncul (XSS vulnerability)

---

## 19. PERFORMANCE TESTING

### Test Case 19.1: Load 1000+ Produk
**Langkah:**
1. Insert 1000+ produk via SQL atau script
2. Buka `/products`
3. Cek loading time

**Expected Result:**
- ✅ List muncul dalam < 2 detik
- ✅ Pagination bekerja

**Bug yang Mungkin Ditemukan:**
- Loading sangat lambat (query tidak optimal)
- Browser hang (render 1000+ rows tanpa pagination)

### Test Case 19.2: Laporan dengan Data Besar (1 tahun transaksi)
**Langkah:**
1. Insert transaksi untuk 1 tahun terakhir (via script)
2. Buka laporan penjualan dengan periode 1 tahun

**Expected Result:**
- ✅ Laporan muncul dalam < 5 detik

**Bug yang Mungkin Ditemukan:**
- Query timeout
- Chart tidak render (terlalu banyak data points)

---

## 20. REGRESSION TESTING (SETELAH FIX BUG)

Setiap kali fix bug, **test ulang semua modul terkait** untuk memastikan fix tidak break fitur lain.

Contoh:
- Fix bug stok tidak berkurang → Test ulang:
  - Transaksi penjualan
  - Retur
  - GRN
  - Stock opname

---

## CHECKLIST TESTING HARIAN

Gunakan checklist ini untuk test cepat sebelum deploy:

- [ ] **Auth**: Login & logout bekerja
- [ ] **Produk**: CRUD produk bekerja
- [ ] **Customer**: CRUD customer bekerja
- [ ] **Transaksi**: Buat transaksi tunai & kredit bekerja
- [ ] **Pembayaran**: Bayar piutang bekerja
- [ ] **Retur**: Retur produk bekerja, stok kembali
- [ ] **Stok**: Stock opname bekerja
- [ ] **Laporan**: Laporan penjualan & laba rugi muncul
- [ ] **Finance**: Jurnal & neraca bekerja
- [ ] **Purchasing**: PO & GRN bekerja, stok bertambah
- [ ] **HR**: Payroll bekerja, kasbon otomatis terpotong
- [ ] **Shipping**: Surat jalan bisa dibuat & dicetak
- [ ] **Price Matrix**: Harga khusus customer bekerja
- [ ] **Notifikasi**: Notifikasi stok menipis muncul
- [ ] **Mobile**: Build APK berhasil, install & run lancar
- [ ] **Console**: Tidak ada error di Browser DevTools
- [ ] **Event Log**: Error tercatat di `/settings/event-log`

---

## TOOLS UNTUK DEBUGGING

1. **Browser DevTools Console**: Cek JavaScript errors
2. **Browser DevTools Network Tab**: Cek API response (status 4xx/5xx)
3. **Supabase Dashboard → Logs**: Cek database errors
4. **Event Log** (`/settings/event-log`): Cek error Supabase yang tercatat aplikasi
5. **Vue DevTools**: Cek state Pinia & component props
6. **Type Check**: `npm run type-check` untuk cek TypeScript errors

---

## CATATAN PENTING

- **Test di browser modern** (Chrome/Edge/Firefox latest version)
- **Test di mobile Android** (emulator atau device fisik)
- **Jangan skip edge cases** (data invalid, qty besar, concurrent access)
- **Catat semua bug** dengan screenshot & langkah reproduksi
- **Priority bug**: Data loss, security issue, payment error
- **Fix bug dengan test case** agar tidak regression

---

**Selamat Testing! 🚀**
