# Analisis Logika Buku Besar (General Ledger)

**Tanggal:** 2026-09-16  
**Status:** 🔍 Review

---

## 1. Logika Jurnal Penjualan (Sales Transaction)

### Implementasi Saat Ini:

Ketika transaksi penjualan dibuat, sistem membuat jurnal otomatis:

```
[Jurnal Penjualan]
Debit:  Kas/Bank         = paid_amount (tergantung payment_method)
Debit:  Piutang Usaha    = remaining_amount
Kredit: Pendapatan       = total (total penjualan)

[Jurnal HPP]
Debit:  HPP              = total_cogs (modal barang)
Kredit: Persediaan       = total_cogs
```

### ❌ MASALAH DITEMUKAN: Tidak Akurat untuk Pembayaran Cicilan

**Skenario masalah:**

Transaksi dengan **2 item margin berbeda**, dibayar **sebagian**:

```
Item A: Harga Rp100.000, Modal Rp80.000, Laba Rp20.000 (margin 20%)
Item B: Harga Rp100.000, Modal Rp50.000, Laba Rp50.000 (margin 50%)
Total: Rp200.000, Modal Rp130.000

Pembayaran pertama: Rp100.000
→ Dialokasikan ke Item A (lunas 100%)
```

**Jurnal yang dicatat saat ini:**

```
[Transaksi Awal]
Dr. Kas             100.000
Dr. Piutang         100.000
    Cr. Pendapatan          200.000

Dr. HPP             130.000  
    Cr. Persediaan          130.000
```

**Masalahnya:**
- Jurnal mencatat **HPP Rp130.000** (seluruh modal) sejak awal
- Padahal yang dibayar baru Item A (modal Rp80.000)
- **HPP untuk Item B (Rp50.000) sudah dicatat, tapi barangnya belum dibayar customer**

---

## 2. Logika Jurnal Pembayaran Cicilan

### Implementasi Saat Ini:

Ketika ada pembayaran cicilan:

```
[Jurnal Pembayaran]
Debit:  Kas/Bank         = payment_amount
Kredit: Piutang Usaha    = payment_amount
```

### ✅ Logika Ini SUDAH BENAR

Pencatatan pembayaran cicilan sudah akurat:
- Kas/Bank bertambah
- Piutang berkurang

**NAMUN**, masalah muncul karena:
- HPP sudah dicatat di jurnal awal (transaksi)
- Tidak ada korelasi antara pembayaran cicilan dengan HPP per item yang sudah dibayar

---

## 3. Perbedaan Laba Akuntansi vs Laba Riil

### Laba Menurut Buku Besar (Akuntansi Akrual):

```
Laba = Pendapatan - HPP
     = Rp200.000 - Rp130.000
     = Rp70.000
```

Laba ini **sudah dicatat sejak transaksi dibuat**, meskipun baru dibayar sebagian.

### Laba Riil (Cash Basis):

Menggunakan perhitungan per-item yang baru kita perbaiki:

```
Item A: 100% lunas → Laba riil = Rp20.000
Item B: 0% lunas → Laba riil = Rp0
Total laba riil = Rp20.000
```

### ⚠️ KESENJANGAN: Rp70.000 (akuntansi) vs Rp20.000 (riil)

**Ini NORMAL dan SEHARUSNYA terjadi!**

- **Akuntansi Akrual** mencatat laba saat transaksi terjadi (terlepas dari pembayaran)
- **Laba Riil (Cash Basis)** hanya menghitung laba dari yang sudah dibayar

---

## 4. Apakah Logika Buku Besar Sudah Benar?

### ✅ BENAR untuk Akuntansi Standar (Accrual Basis)

Logika buku besar saat ini **sudah benar** jika menggunakan **basis akrual**:

1. **Pendapatan dicatat saat transaksi** (bukan saat pembayaran)
2. **HPP dicatat saat transaksi** (matching principle)
3. **Piutang dicatat untuk bagian yang belum dibayar**
4. **Kas bertambah saat pembayaran masuk**

Ini sesuai dengan **standar akuntansi** (SAK ETAP/PSAK).

### ❌ TIDAK COCOK untuk Laporan Laba Riil (Cash Basis)

Jika tujuannya adalah **melihat laba yang benar-benar sudah masuk kas**, maka:

- Buku besar **TIDAK bisa digunakan langsung**
- Harus menggunakan **laporan laba per transaksi** yang baru kita perbaiki
- Laporan itu menggunakan `transaction_item_payments` untuk tracking pembayaran per item

---

## 5. Rekomendasi

### Opsi 1: ✅ PERTAHANKAN (Rekomendasi)

**Pertahankan logika buku besar seperti sekarang** karena:

1. ✅ Sudah sesuai standar akuntansi (basis akrual)
2. ✅ Cocok untuk laporan keuangan formal (neraca, laba rugi)
3. ✅ Mudah diaudit dan dipahami akuntan
4. ✅ Konsisten dengan prinsip matching (revenue vs expense)

**Untuk kebutuhan laba riil:**
- Gunakan **Laporan Laba Per Transaksi** (`/reports/transaction-profit`)
- Laporan ini sudah menggunakan pembayaran per item yang akurat

### Opsi 2: ❌ UBAH KE CASH BASIS (Tidak Disarankan)

Mengubah buku besar ke **cash basis** (HPP dicatat saat pembayaran):

**Keuntungan:**
- Laba di buku besar = laba riil

**Kerugian:**
- ❌ Tidak sesuai standar akuntansi
- ❌ Neraca jadi salah (HPP tertunda, nilai persediaan overstated)
- ❌ Sulit audit
- ❌ Kompleks untuk implementasi (HPP proporsional per cicilan)
- ❌ Matching principle dilanggar

### Opsi 3: 🔄 HYBRID (Kompleks)

Tambahkan **jurnal penyesuaian** untuk HPP yang belum terealisasi:

```
[Saat transaksi]
Dr. Kas/Piutang     200.000
    Cr. Pendapatan          200.000

Dr. HPP Tertunda    130.000
    Cr. Persediaan          130.000

[Saat pembayaran Item A]
Dr. HPP             80.000
    Cr. HPP Tertunda        80.000
```

**Keuntungan:**
- Laba di buku besar = laba riil
- Tetap sesuai standar akuntansi

**Kerugian:**
- ❌ Sangat kompleks
- ❌ Butuh akun tambahan (HPP Tertunda)
- ❌ Butuh refactor besar
- ❌ Overhead tinggi (jurnal penyesuaian setiap cicilan)

---

## 6. Kesimpulan

### Status Logika Buku Besar Saat Ini:

| Aspek | Status | Keterangan |
|-------|--------|------------|
| **Pencatatan Pendapatan** | ✅ Benar | Dicatat saat transaksi (accrual basis) |
| **Pencatatan HPP** | ✅ Benar | Dicatat saat transaksi (matching principle) |
| **Pencatatan Piutang** | ✅ Benar | Dicatat untuk bagian belum dibayar |
| **Pencatatan Kas/Bank** | ✅ Benar | Disesuaikan dengan payment_method |
| **Jurnal Pembayaran** | ✅ Benar | Piutang → Kas/Bank |
| **Jurnal Retur** | ✅ Benar | Reversal pendapatan & HPP |
| **Validasi Balance** | ✅ Benar | Debit = Kredit dicek |
| **Konsistensi Akuntansi** | ✅ Benar | Sesuai SAK ETAP |

### ⚠️ Yang Perlu Dipahami:

**Perbedaan Laba Akuntansi vs Laba Riil adalah NORMAL:**

```
Laba di Buku Besar (Akrual)     ≠     Laba Riil (Cash Basis)
Rp70.000 (contoh kasus)              Rp20.000 (yang sudah dibayar)
```

**Kedua angka ini BENAR**, tergantung tujuan:

- **Buku Besar (Akrual)** → untuk laporan keuangan formal, audit, pajak
- **Laba Riil (Cash Basis)** → untuk monitoring cashflow, keputusan operasional

---

## 7. Action Items

### ✅ Sudah Selesai:
1. Laporan Laba Per Transaksi sudah menggunakan pembayaran per item yang akurat

### 📋 Rekomendasi Tambahan:

1. **Tambahkan dokumentasi** di UI buku besar:
   ```
   ℹ️ Laba di buku besar menggunakan basis akrual (dicatat saat transaksi).
   Untuk melihat laba yang sudah masuk kas, gunakan Laporan Laba Per Transaksi.
   ```

2. **Tambahkan laporan rekonsiliasi** (opsional):
   - Menunjukkan perbedaan laba akrual vs laba riil
   - Breakdown per transaksi
   - Tracking piutang yang tertahan

3. **Validasi integrasi** antara:
   - Buku besar (akrual)
   - Laporan laba per transaksi (cash basis)
   - Pastikan total pendapatan di kedua laporan sama

---

## 8. Contoh Skenario Lengkap

### Transaksi:
```
2024-01-01: Jual 2 item (Rp200k), bayar Rp100k
2024-01-05: Cicilan Rp50k
2024-01-10: Cicilan Rp50k (lunas)
```

### Buku Besar (Akrual):
```
[01-01] Penjualan
Dr. Kas             100.000
Dr. Piutang         100.000
    Cr. Pendapatan          200.000

Dr. HPP             130.000
    Cr. Persediaan          130.000

[01-05] Pembayaran
Dr. Kas              50.000
    Cr. Piutang              50.000

[01-10] Pembayaran
Dr. Kas              50.000
    Cr. Piutang              50.000

Laba di Buku Besar = Rp200k - Rp130k = Rp70k (sejak 01-01)
```

### Laporan Laba Per Transaksi (Cash Basis):
```
[01-01] Kas masuk Rp100k → Item A lunas
        Laba riil = Rp20k

[01-05] Kas masuk Rp50k → Item B 50% lunas
        Laba riil bertambah = Rp20k + (Rp50k × 50%) = Rp45k

[01-10] Kas masuk Rp50k → Item B 100% lunas
        Laba riil total = Rp20k + Rp50k = Rp70k (sama dengan akrual)
```

**Pada akhirnya (saat lunas), kedua angka akan SAMA.**

---

## Kesimpulan Akhir

### ✅ LOGIKA BUKU BESAR SUDAH BENAR

Tidak ada yang perlu diperbaiki pada logika buku besar. Sistem sudah:
- Sesuai standar akuntansi (basis akrual)
- Balance debit = kredit
- Tracking piutang dengan benar
- Jurnal pembayaran akurat

### ✅ LAPORAN LABA RIIL SUDAH BENAR

Setelah perbaikan hari ini:
- Laba riil dihitung per-item berdasarkan pembayaran aktual
- Menggunakan tabel `transaction_item_payments`
- Akurat untuk transaksi dengan margin berbeda per item

### 🎯 Kedua Sistem Melayani Tujuan Berbeda

- **Buku Besar** → Laporan keuangan formal, audit, compliance
- **Laba Per Transaksi** → Monitoring cashflow riil, keputusan operasional

**Keduanya diperlukan dan saling melengkapi!**
