# ALUR PEMBELIAN (PURCHASING FLOW)

## Ringkasan
Modul Purchasing di Ucup Kasir mengatur proses pembelian barang dari supplier dengan alur lengkap mulai dari pesanan hingga pembayaran hutang, termasuk penerimaan barang dan retur.

---

## 📊 DIAGRAM ALUR PURCHASING

```
┌─────────────────────────────────────────────────────────────────┐
│                     ALUR PEMBELIAN LENGKAP                      │
└─────────────────────────────────────────────────────────────────┘

1. MASTER DATA
   ┌──────────────┐
   │   SUPPLIER   │  ← Tambah/Edit data supplier
   └──────────────┘
          │
          ▼

2. PURCHASE ORDER (PO)
   ┌──────────────────────────────────┐
   │  Buat PO (Draft)                 │
   │  - Pilih supplier                │
   │  - Pilih produk & qty            │
   │  - Set harga & diskon            │
   └──────────────────────────────────┘
          │
          ├─→ Submit PO → Confirmed
          │
          ▼

3. GOODS RECEIPT NOTE (GRN)
   ┌──────────────────────────────────┐
   │  Terima Barang                   │
   │  - Reference PO (opsional)       │
   │  - Qty diterima vs ditolak       │
   │  - Auto update stok produk ✓     │
   │  - Auto jurnal Stok/Hutang ✓     │
   └──────────────────────────────────┘
          │
          ▼

4. PURCHASE INVOICE (PI)
   ┌──────────────────────────────────┐
   │  Invoice dari Supplier           │
   │  - Reference GRN (opsional)      │
   │  - Total tagihan                 │
   │  - Due date                      │
   │  - Auto jurnal Hutang ✓          │
   └──────────────────────────────────┘
          │
          ├─→ Cicilan/Pelunasan
          │
          ▼

5. PI PAYMENTS
   ┌──────────────────────────────────┐
   │  Bayar Hutang ke Supplier        │
   │  - Jumlah pembayaran             │
   │  - Metode pembayaran             │
   │  - Auto jurnal bayar hutang ✓    │
   └──────────────────────────────────┘
          │
          ▼
      LUNAS ✓

6. PURCHASE RETURN (Opsional)
   ┌──────────────────────────────────┐
   │  Retur Barang ke Supplier        │
   │  - Produk & qty retur            │
   │  - Auto kurangi stok ✓           │
   │  - Auto jurnal reversal ✓        │
   └──────────────────────────────────┘
```

---

## 🗂️ ENTITAS DATABASE

### 1. **Suppliers** (Master Pemasok)
Tabel master untuk menyimpan data supplier/pemasok.

**Field Penting:**
- `name` - Nama supplier
- `contact_person` - Nama kontak
- `phone`, `email`, `address`
- `supplier_type` - Tipe: langsung, distributor, grosir, importir
- `payment_term` - Termin: tunai, 7 hari, 14 hari, 30 hari
- `credit_limit` - Limit kredit
- `is_active` - Status aktif/nonaktif

**Halaman:**
- `SupplierList.vue` - Daftar supplier
- `AddSupplier.vue` - Tambah supplier baru
- `EditSupplier.vue` - Edit supplier

---

### 2. **Purchase Orders (PO)** - Header Pesanan
Dokumen pesanan pembelian yang dibuat sebelum barang diterima.

**Field Penting:**
- `po_number` - Nomor PO (auto-generated: PO-YYYYMMDD-XXXX)
- `supplier_id` - ID supplier
- `supplier_name` - Nama supplier
- `po_date` - Tanggal PO
- `expected_date` - Tanggal diharapkan tiba
- `status` - Status PO:
  - `draft` - Baru dibuat, belum final
  - `submitted` - Sudah dikirim ke supplier
  - `confirmed` - Supplier konfirmasi
  - `partial` - Sebagian barang sudah diterima
  - `completed` - Semua barang sudah diterima
  - `cancelled` - Dibatalkan
- `subtotal`, `discount`, `tax`, `shipping_cost`, `total`
- `notes` - Catatan

**Items:**
- `po_items` - Item yang dipesan
  - `product_id`, `product_name`
  - `quantity` - Qty dipesan
  - `price` - Harga beli
  - `discount`, `subtotal`
  - `received_quantity` - Qty yang sudah diterima (terupdate dari GRN)

**Halaman:**
- `PurchaseOrderList.vue` - Daftar PO
- `PurchaseOrderForm.vue` - Buat/Edit PO
- `PurchaseOrderDetail.vue` - Detail PO

**Fungsi SQL:**
- `create_purchase_order()` - Buat PO baru atomik (header + items)

---

### 3. **Goods Receipt Notes (GRN)** - Penerimaan Barang
Dokumen penerimaan barang dari supplier. **Ini adalah titik krusial dimana stok produk bertambah.**

**Field Penting:**
- `grn_number` - Nomor GRN (auto-generated: GRN-YYYYMMDD-XXXX)
- `po_id` - Reference PO (opsional, bisa tanpa PO)
- `supplier_id`, `supplier_name`
- `receipt_date` - Tanggal terima barang
- `status`:
  - `draft` - Belum final
  - `completed` - Sudah final (stok sudah bertambah)
  - `cancelled` - Dibatalkan
- `total` - Total nilai barang diterima
- `notes`

**Items:**
- `grn_items` - Item yang diterima
  - `po_item_id` - Reference PO item (jika ada)
  - `product_id`, `product_name`
  - `quantity_received` - Qty diterima (OK)
  - `quantity_rejected` - Qty ditolak (rusak/cacat)
  - `price`, `subtotal`

**Halaman:**
- `GoodsReceiptList.vue` - Daftar GRN
- `GoodsReceiptForm.vue` - Buat GRN
- `GoodsReceiptDetail.vue` - Detail GRN

**Fungsi SQL:**
- `create_goods_receipt()` - Buat GRN atomik:
  - Simpan header + items
  - **Update stok produk** (tambah qty_received)
  - **Catat mutasi stok** (tipe: 'pembelian')
  - **Auto jurnal**: Debit Persediaan, Kredit Hutang Usaha
  - Update `received_quantity` di PO items (jika ada reference PO)

**⚠️ PENTING:**
- GRN adalah satu-satunya cara menambah stok dari pembelian
- Stok bertambah hanya dari `quantity_received` (bukan `quantity_rejected`)
- Auto-jurnal membuat entry Hutang Usaha

---

### 4. **Purchase Invoices (PI)** - Invoice Supplier
Dokumen tagihan dari supplier. Mencatat hutang yang harus dibayar.

**Field Penting:**
- `pi_number` - Nomor invoice (auto-generated: PI-YYYYMMDD-XXXX)
- `grn_id` - Reference GRN (opsional)
- `po_id` - Reference PO (opsional)
- `supplier_id`, `supplier_name`
- `invoice_date` - Tanggal invoice
- `due_date` - Jatuh tempo
- `subtotal`, `discount`, `tax`, `shipping_cost`, `total`
- `paid_amount` - Sudah dibayar berapa
- `remaining_amount` - Sisa hutang
- `payment_status`:
  - `belum_lunas` - Belum dibayar sama sekali
  - `sebagian` - Sudah dibayar sebagian (cicilan)
  - `lunas` - Sudah lunas

**Items:**
- `pi_items` - Item dalam invoice
  - `grn_item_id` - Reference GRN item (jika ada)
  - `product_id`, `product_name`
  - `quantity`, `price`, `subtotal`

**Halaman:**
- `PurchaseInvoiceList.vue` - Daftar PI
- `PurchaseInvoiceForm.vue` - Buat PI
- `PurchaseInvoiceDetail.vue` - Detail PI + Riwayat pembayaran

**Fungsi SQL:**
- `create_purchase_invoice()` - Buat PI atomik:
  - Simpan header + items
  - **Auto jurnal**: Debit Beban/Aset, Kredit Hutang Usaha

---

### 5. **PI Payments** - Pembayaran Hutang
Cicilan/pelunasan hutang ke supplier.

**Field Penting:**
- `pi_id` - ID invoice yang dibayar
- `amount` - Jumlah dibayar
- `payment_method` - Metode: tunai, transfer, dll
- `notes` - Catatan
- `created_at` - Tanggal pembayaran

**Halaman:**
- Terintegrasi di `PurchaseInvoiceDetail.vue` (modal pembayaran)

**Fungsi SQL:**
- `add_pi_payment()` - Catat pembayaran atomik:
  - Simpan payment record
  - Update `paid_amount` dan `remaining_amount` di PI
  - Update `payment_status` (belum_lunas/sebagian/lunas)
  - **Auto jurnal**: Debit Hutang Usaha, Kredit Kas/Bank

---

### 6. **Purchase Returns** - Retur Pembelian
Retur barang ke supplier (barang rusak, tidak sesuai, dll).

**Field Penting:**
- `return_number` - Nomor retur (auto-generated: PR-YYYYMMDD-XXXX)
- `grn_id` - Reference GRN (opsional)
- `supplier_id`, `supplier_name`
- `return_date` - Tanggal retur
- `return_type` - Tipe: 'refund' (uang kembali) atau 'exchange' (tukar barang)
- `total` - Total nilai retur
- `refund_amount` - Jumlah refund (jika tipe refund)
- `status`:
  - `pending` - Belum diproses
  - `approved` - Disetujui supplier
  - `rejected` - Ditolak supplier

**Items:**
- `purchase_return_items` - Item yang diretur
  - `grn_item_id` - Reference GRN item
  - `product_id`, `product_name`
  - `quantity` - Qty retur
  - `price`, `subtotal`

**Halaman:**
- `PurchaseReturnList.vue` - Daftar retur
- `PurchaseReturnForm.vue` - Buat retur
- `PurchaseReturnDetail.vue` - Detail retur

**Fungsi SQL:**
- `create_purchase_return()` - Buat retur atomik:
  - Simpan header + items
  - **Kurangi stok produk** (qty retur)
  - **Catat mutasi stok** (tipe: 'retur_pembelian')
  - **Auto jurnal reversal**: Debit Hutang Usaha, Kredit Persediaan

---

## 🔄 ALUR LENGKAP STEP-BY-STEP

### Skenario 1: Pembelian dengan PO (Flow Normal)

**Step 1: Buat Purchase Order**
```
Halaman: /purchasing/po/add

1. Pilih supplier dari dropdown
2. Tambah produk ke PO:
   - Pilih produk
   - Masukkan qty
   - Masukkan harga beli
   - Diskon (opsional)
3. Set expected date
4. Tambah catatan (opsional)
5. Status: Draft

Submit → Status: Submitted/Confirmed
```

**Step 2: Terima Barang (GRN)**
```
Halaman: /purchasing/grn/add

1. Pilih PO sebagai reference (atau skip jika tanpa PO)
2. Supplier terisi otomatis dari PO
3. Items terisi otomatis dari PO
4. Edit qty received per item:
   - Quantity Received: qty yang OK
   - Quantity Rejected: qty rusak/cacat
5. Set receipt date
6. Submit GRN

Result:
✓ Stok produk bertambah (sesuai qty_received)
✓ Stock movement tercatat
✓ Auto jurnal: Debit Persediaan, Kredit Hutang Usaha
✓ PO status update (partial/completed)
```

**Step 3: Buat Purchase Invoice**
```
Halaman: /purchasing/invoice/add

1. Pilih GRN sebagai reference (atau manual)
2. Supplier dan items terisi otomatis dari GRN
3. Set invoice date & due date
4. Tambah discount/tax/shipping (opsional)
5. Submit PI

Result:
✓ Hutang tercatat
✓ Auto jurnal: Debit Beban, Kredit Hutang Usaha
✓ Payment status: Belum Lunas
```

**Step 4: Bayar Hutang (Cicilan/Lunas)**
```
Halaman: /purchasing/invoice/:id (detail)

1. Klik "Tambah Pembayaran"
2. Input jumlah dibayar
3. Pilih metode pembayaran
4. Submit

Result:
✓ Paid amount bertambah
✓ Remaining amount berkurang
✓ Payment status update (sebagian/lunas)
✓ Auto jurnal: Debit Hutang Usaha, Kredit Kas/Bank

Ulangi step 4 jika cicilan, sampai lunas.
```

**Step 5: Retur (Jika Ada Barang Rusak)**
```
Halaman: /purchasing/returns/add

1. Pilih GRN sebagai reference
2. Pilih item yang mau diretur
3. Input qty retur
4. Pilih return type: refund/exchange
5. Submit

Result:
✓ Stok produk berkurang
✓ Stock movement tercatat (tipe: retur_pembelian)
✓ Auto jurnal reversal: Debit Hutang, Kredit Persediaan
```

---

### Skenario 2: Pembelian Tanpa PO (Langsung GRN)

**Step 1: Terima Barang (GRN)**
```
Halaman: /purchasing/grn/add

1. Tidak pilih PO (skip)
2. Pilih supplier manual
3. Tambah produk manual:
   - Pilih produk
   - Qty received
   - Harga
4. Submit GRN

Result: Sama seperti skenario 1 step 2
```

**Step 2-4: Sama seperti skenario 1 (PI → Payment → Return opsional)**

---

## 📈 DASHBOARD PURCHASING

**Halaman:** `/purchasing` (`PurchaseDashboard.vue`)

**Fitur:**
- Statistik overview:
  - Total PO bulan ini
  - Total pembelian (nilai)
  - Hutang belum lunas
  - Total supplier aktif
- Chart pembelian per bulan
- List PO pending/in-progress
- List invoice jatuh tempo
- Quick actions: Buat PO, GRN, PI

---

## 🔗 INTEGRASI MODUL

### Dengan Modul Finance (Akuntansi)
- **GRN Completed** → Auto jurnal:
  ```
  Debit: Persediaan Barang (Aset)
  Kredit: Hutang Usaha (Kewajiban)
  ```

- **PI Created** → Auto jurnal:
  ```
  Debit: Beban Pembelian / Aset
  Kredit: Hutang Usaha
  ```

- **PI Payment** → Auto jurnal:
  ```
  Debit: Hutang Usaha
  Kredit: Kas / Bank
  ```

- **Purchase Return** → Auto jurnal reversal:
  ```
  Debit: Hutang Usaha
  Kredit: Persediaan Barang
  ```

### Dengan Modul Stock
- **GRN Completed** → Stok produk bertambah
- **Purchase Return** → Stok produk berkurang
- Stock movements tercatat dengan tipe:
  - `pembelian` (dari GRN)
  - `retur_pembelian` (dari PR)

---

## ⚙️ FUNGSI SQL PENTING

### 1. `create_goods_receipt()`
**Parameter:**
- `p_po_id` - Reference PO (opsional)
- `p_supplier_id`, `p_supplier_name`
- `p_receipt_date`
- `p_items` - JSON array items
- `p_notes`

**Proses:**
1. Validasi stok cukup (jika ada)
2. Insert GRN header
3. Insert GRN items
4. **Update stok produk** (tambah)
5. **Insert stock movements**
6. **Auto jurnal** (Persediaan/Hutang)
7. Update PO status & received_quantity

**Return:** `grn_id`

### 2. `create_purchase_invoice()`
**Parameter:**
- `p_grn_id` - Reference GRN (opsional)
- `p_po_id` - Reference PO (opsional)
- `p_supplier_id`, `p_supplier_name`
- `p_invoice_date`, `p_due_date`
- `p_items` - JSON array items
- `p_subtotal`, `p_discount`, `p_tax`, `p_shipping_cost`

**Proses:**
1. Insert PI header (hitung total)
2. Insert PI items
3. **Auto jurnal** (Beban/Hutang)

**Return:** `pi_id`

### 3. `add_pi_payment()`
**Parameter:**
- `p_pi_id`
- `p_amount`
- `p_payment_method`
- `p_notes`

**Proses:**
1. Validasi amount <= remaining
2. Insert payment record
3. Update PI: paid_amount, remaining_amount, payment_status
4. **Auto jurnal** (Hutang/Kas)

**Return:** `payment_id`

### 4. `create_purchase_return()`
**Parameter:**
- `p_grn_id` - Reference GRN (opsional)
- `p_supplier_id`, `p_supplier_name`
- `p_return_date`
- `p_return_type` - 'refund' / 'exchange'
- `p_items` - JSON array items

**Proses:**
1. Validasi qty retur <= qty GRN
2. Insert return header
3. Insert return items
4. **Kurangi stok produk**
5. **Insert stock movements** (retur)
6. **Auto jurnal reversal** (Hutang/Persediaan)

**Return:** `return_id`

---

## 📱 HALAMAN & NAVIGASI

```
/purchasing
├── / (Dashboard)
├── /suppliers (Daftar Supplier)
│   ├── /add (Tambah Supplier)
│   └── /edit/:id (Edit Supplier)
├── /po (Daftar PO)
│   ├── /add (Buat PO)
│   ├── /edit/:id (Edit PO)
│   └── /:id (Detail PO)
├── /grn (Daftar GRN)
│   ├── /add (Buat GRN)
│   └── /:id (Detail GRN)
├── /invoice (Daftar PI)
│   ├── /add (Buat PI)
│   └── /:id (Detail PI + Payments)
└── /returns (Daftar Retur)
    ├── /add (Buat Retur)
    └── /:id (Detail Retur)
```

---

## 💡 BEST PRACTICES

### 1. **Gunakan PO untuk Pembelian Terencana**
- PO membantu tracking pesanan
- Memudahkan cross-check saat barang datang
- History lebih lengkap

### 2. **GRN adalah Sumber Kebenaran Stok**
- Jangan manual update stok untuk pembelian
- Selalu buat GRN saat terima barang
- Pisahkan qty_received vs qty_rejected

### 3. **PI Terpisah dari GRN**
- Invoice bisa berbeda dari nilai GRN (ada biaya lain)
- Due date untuk tracking jatuh tempo
- Bisa partial payment (cicilan)

### 4. **Retur Sesegera Mungkin**
- Retur segera setelah ditemukan barang rusak
- Koordinasi dengan supplier untuk approval
- Catat dengan detail (foto, bukti)

### 5. **Monitor Hutang Supplier**
- Cek dashboard untuk hutang jatuh tempo
- Bayar tepat waktu untuk menjaga relasi
- Manfaatkan payment term jika ada

---

## 🔍 TRACKING & REPORTING

### Report yang Bisa Dihasilkan:
1. **Laporan Pembelian per Periode**
   - Total pembelian per supplier
   - Total qty per produk
   - Trend pembelian

2. **Laporan Hutang Supplier**
   - Aging hutang (< 30 hari, 30-60 hari, > 60 hari)
   - Hutang per supplier
   - Proyeksi cash flow

3. **Laporan Retur**
   - Qty retur per supplier
   - Nilai retur per produk
   - Analisis kualitas supplier

4. **Performance Supplier**
   - Lead time (PO date → Receipt date)
   - Rejection rate (qty_rejected / total)
   - On-time delivery rate

---

## ❓ FAQ

**Q: Apakah wajib buat PO sebelum GRN?**
A: Tidak wajib. Bisa langsung buat GRN tanpa PO untuk pembelian mendadak.

**Q: Bagaimana jika barang datang sebagian?**
A: Buat GRN untuk qty yang datang. PO status jadi 'partial'. Buat GRN lagi untuk sisanya nanti.

**Q: Apakah bisa edit GRN setelah completed?**
A: Tidak bisa edit karena sudah update stok dan jurnal. Jika salah, buat retur.

**Q: Bagaimana cara bayar cicilan?**
A: Di detail PI, klik "Tambah Pembayaran" untuk setiap cicilan. System auto hitung remaining.

**Q: Apakah retur mengurangi hutang?**
A: Ya. Retur approved otomatis kurangi hutang (via jurnal reversal).

**Q: Bagaimana handle diskon dari supplier?**
A: Ada field discount di PO, GRN, dan PI. Bisa set per item atau global.

---

## 📝 CATATAN TEKNIS

- Semua nomor dokumen auto-generated dengan format: `PREFIX-YYYYMMDD-XXXX`
- Semua operasi write menggunakan fungsi SQL (bukan direct insert) untuk atomicity
- RLS diterapkan di semua tabel (user_id = auth.uid())
- Auto-jurnal hanya jalan jika modul Finance aktif
- Support multi-currency (future: tambah field currency)
- Timestamp menggunakan `timestamptz` (timezone-aware)

---

## 🚀 FUTURE ENHANCEMENTS

1. **Persetujuan Bertingkat**
   - PO > limit tertentu perlu approval
   - Multi-level approval workflow

2. **Integrasi Supplier**
   - Supplier portal untuk cek PO
   - Supplier bisa konfirmasi PO online

3. **Barcode Scanning**
   - Scan barcode saat GRN untuk cepat
   - Reduce manual entry error

4. **Notifikasi**
   - Notif saat PO confirmed
   - Reminder jatuh tempo hutang
   - Alert late delivery

5. **Analytics**
   - Supplier scorecard
   - Price trend analysis
   - Forecast pembelian

---

**Dokumentasi ini adalah panduan lengkap alur pembelian di Ucup Kasir.**
Untuk pertanyaan lebih lanjut, lihat kode di `src/views/Purchasing/` dan `src/services/purchasing.ts`.
