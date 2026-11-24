# Stok Awal Produk & Jurnal Akuntansi

## Deskripsi

Ketika produk dibuat dengan **stok awal > 0**, sistem akan **otomatis membuat jurnal akuntansi** untuk mencatat nilai persediaan barang ke dalam buku besar.

## Jurnal Otomatis

Setiap kali produk baru dibuat dengan stok awal, sistem membuat jurnal:

```
Debit:  Persediaan Barang (1-1200)  = stok × harga beli
Kredit: Modal Pemilik (3-3000)      = stok × harga beli
```

**Contoh:**
- Produk: Minyak Goreng
- Stok awal: 100 unit
- Harga beli: Rp 15.000

Jurnal yang dibuat:
```
Debit:  Persediaan Barang   Rp 1.500.000
Kredit: Modal Pemilik       Rp 1.500.000

Deskripsi: Stok awal produk: Minyak Goreng (100 unit @ Rp 15.000)
```

## Logika Bisnis

1. **Stok awal adalah modal usaha** — Barang yang sudah ada di toko saat aplikasi pertama kali digunakan dianggap sebagai modal pemilik
2. **Nilai persediaan** — Total nilai persediaan dihitung dari `jumlah stok × harga beli`
3. **Otomatis tercatat** — Tidak perlu input jurnal manual, sistem otomatis mencatat ke buku besar

## Kapan Jurnal Dibuat?

✅ **DIBUAT** jika:
- Produk baru dibuat (bukan edit)
- Stok awal > 0
- Harga beli sudah diisi
- Akun "Persediaan Barang" (1-1200) dan "Modal Pemilik" (3-3000) sudah ada (dari seed COA)

❌ **TIDAK DIBUAT** jika:
- Stok awal = 0 atau kosong (produk dibuat tanpa stok)
- Harga beli = 0 atau kosong
- Akun COA belum di-seed

## Update Stok Setelah Produk Dibuat

Setelah produk dibuat, stok **hanya bisa diupdate** melalui:

1. **Pembelian Barang** (Purchasing → Goods Receipt)
   - Menambah stok + mencatat jurnal:
     - Debit: Persediaan Barang
     - Kredit: Utang Usaha (jika belum bayar) atau Kas (jika bayar tunai)

2. **Stock Opname** (Stock → Stock Opname)
   - Adjustment stok (tambah/kurang) + mencatat selisih ke jurnal

3. **Transaksi Penjualan**
   - Mengurangi stok otomatis + mencatat HPP

4. **Retur**
   - Mengembalikan stok + reversal jurnal

## Implementasi Teknis

### File yang Diubah

1. `src/services/finance.ts`
   - Tambah fungsi `postInitialStockJournal()`
   - Tambah helper `getAccountIdByCode()`

2. `src/services/products.ts`
   - Update `create()` untuk memanggil `postInitialStockJournal()` setelah produk dibuat

3. `src/services/sqlite/finance.ts`
   - Mirror fungsi `postInitialStockJournal()` untuk offline mode

4. `src/services/sqlite/products.ts`
   - Update `create()` untuk offline mode

5. `src/views/Products/AddProduct.vue`
   - Input stok awal sekarang **opsional** (bukan required)
   - Helper text: "Opsional. Stok dapat diupdate melalui Pembelian atau Stock Opname"

### Flow Chart

```
[User buat produk baru]
         |
         v
[Input nama, harga beli, harga jual, stok awal (opsional)]
         |
         v
[Submit form] → productsService.create()
         |
         v
[Insert ke tabel products]
         |
         v
[Cek: stok > 0?] ──No──> [Selesai]
         |
        Yes
         |
         v
[financeService.postInitialStockJournal()]
         |
         v
[Cari akun 1-1200 & 3-3000]
         |
         v
[Buat jurnal via post_journal RPC]
         |
         v
[Jurnal tercatat di journal_entries & journal_lines]
         |
         v
[Selesai - Produk & jurnal sudah tercatat]
```

## Testing

### Manual Test

1. **Seed COA** (jika belum):
   - Buka Finance → Chart of Accounts
   - Klik "Seed Default Accounts" (jika belum ada akun)

2. **Tambah Produk dengan Stok Awal**:
   - Buka Products → Tambah Produk
   - Isi: Nama = "Test Product", Harga Beli = 10000, Harga Jual = 15000, Stok Awal = 50
   - Submit

3. **Cek Jurnal**:
   - Buka Finance → Jurnal Umum
   - Cari jurnal dengan deskripsi "Stok awal produk: Test Product..."
   - Pastikan:
     - Debit: Persediaan Barang (1-1200) = 500.000
     - Kredit: Modal Pemilik (3-3000) = 500.000

4. **Cek Buku Besar**:
   - Buka Finance → Buku Besar
   - Pilih akun "Persediaan Barang"
   - Pastikan saldo bertambah 500.000

### Edge Cases

1. **Produk tanpa stok awal** → Jurnal TIDAK dibuat ✅
2. **COA belum di-seed** → Warning di console, jurnal tidak dibuat (graceful degradation) ✅
3. **Offline mode** → Jurnal tetap dibuat di SQLite, nanti di-sync ke Supabase ✅

## Catatan Penting

- **Tidak ada jurnal untuk edit produk** — Jurnal stok awal hanya dibuat saat produk PERTAMA KALI dibuat
- **Stok di edit produk adalah read-only** — User tidak bisa edit stok langsung, harus lewat Stock Opname/Pembelian
- **Sinkronisasi offline** — Jurnal dibuat di SQLite juga (untuk offline mode), akan di-sync ke Supabase saat online

## Referensi

- Standar akuntansi: Persediaan adalah aset lancar yang dicatat di neraca
- Akun standar Indonesia: Kode akun 1-1200 (Persediaan Barang), 3-3000 (Modal Pemilik)
