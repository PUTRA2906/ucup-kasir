# Peta Akuntansi: Chart of Accounts & Trigger per Modul

> **Tanggal analisis:** 24 November 2026
> **Sumber:** migrasi di `supabase/migrations/`, service di `src/services/`, dan kondisi live database Supabase.
> **Status:** dokumen investigasi + usulan perbaikan. File migrasi
> `20261124_unify_default_coa.sql` **sudah dibuat** tetapi **belum dijalankan** di live DB.

---

## Daftar Isi

1. [Ringkasan](#1-ringkasan)
2. [Dua Mekanisme Posting](#2-dua-mekanisme-posting)
3. [Daftar Akun (COA) & Siapa yang Memposting](#3-daftar-akun-coa--siapa-yang-memposting)
4. [Pemicu per Modul](#4-pemicu-per-modul)
5. [Alur End-to-End](#5-alur-end-to-end)
6. [Temuan dari Data Live](#6-temuan-dari-data-live)
7. [Prioritas Perbaikan](#7-prioritas-perbaikan)
8. [Lampiran](#8-lampiran)
9. [Default Akun Saat Akun Baru Dibuat](#9-default-akun-saat-akun-baru-dibuat)
10. [Mengapa COA Baru Dibuat Saat Modul Finance Dibuka](#10-mengapa-coa-baru-dibuat-saat-modul-finance-dibuka)

---

## 1. Ringkasan

Aplikasi mencatat jurnal otomatis ke `journal_entries` + `journal_lines` dari hampir semua modul
(penjualan, retur, pembelian, payroll, tutup buku). Setiap jurnal ditautkan ke dokumen sumber
melalui pasangan kolom `reference_type` + `reference_id`.

Namun ada beberapa masalah struktural yang membuat laporan keuangan **tidak bisa dipercaya apa adanya**:

- 38 dari 482 jurnal penjualan **tidak balance** (net +Rp 410.000)
- 2 dari 11 jurnal retur tidak balance (net −Rp 475.000)
- 1 jurnal penutup tidak balance (−Rp 640.000)
- Adjustment stok, stock opname, kasbon, dan surat jalan **tidak pernah dijurnal**
- Payroll hanya mencatat akrual (Cr Hutang Gaji), tidak pernah mencatat kas keluar
- Banyak user hanya punya 7 akun sehingga jurnal modul lain **hilang tanpa error**

Detail lengkap ada di [bagian 6](#6-temuan-dari-data-live).

---

## 2. Dua Mekanisme Posting

Penting untuk membedakan dua cara jurnal terbentuk, karena perilaku dan risiko bug-nya berbeda:

| Mekanisme | Contoh | Sifat |
|---|---|---|
| **RPC `SECURITY DEFINER`** dipanggil service frontend | `create_transaction`, `create_return`, `create_goods_receipt`, `post_payroll_journal`, `close_period`, `post_journal` | Jurnal dibuat **di dalam fungsi yang sama** dengan dokumennya → atomik |
| **DB Trigger `AFTER INSERT`** | `trigger_auto_journal_payment` pada `transaction_payments`, `trg_auto_update_realized_profit` | Jurnal muncul otomatis saat baris pembayaran masuk, **termasuk saat DP dibuat di dalam `create_transaction`** |

### Nilai `reference_type` yang diizinkan (CHECK constraint live)

```
manual, transaction, return, payment, void, purchase,
purchase_payment, purchase_return, payroll, closing, reclassify
```

> ⚠️ `stock_adjustment` **tidak ada** dalam daftar ini — lihat temuan 6.e.

### Trigger aktif pada tabel terkait (live DB)

| Tabel | Trigger | Fungsi |
|---|---|---|
| `transaction_payments` | `trigger_auto_journal_payment` | Buat jurnal Dr Kas/Bank / Cr Piutang |
| `transaction_payments` | `trg_auto_update_realized_profit` | Cr Laba Direalisasi (satu sisi) |
| `transaction_payments` | `trigger_auto_void_journal_payment` | Void jurnal saat pembayaran dihapus |
| `transaction_payments` | `trg_prevent_closed_period_payment` | Blokir jika periode sudah ditutup |
| `transactions` | `ensure_coa_exists` | Auto-init COA saat transaksi pertama |
| `transactions` | `trg_prevent_closed_period_transaction` | Blokir jika periode sudah ditutup |
| `journal_entries` | `trg_prevent_closed_period_journal` | Blokir jika periode sudah ditutup |

---

## 3. Daftar Akun (COA) & Siapa yang Memposting

Kondisi live (per 2026-11-24): **206 baris COA, 14 user, 21 kode unik.** Beberapa kode punya
nama berbeda antarbaris (drift penamaan hasil migrasi yang tidak seragam).

| Kode | Nama (varian di DB) | Tipe | Saldo normal | Diposting oleh |
|---|---|---|---|---|
| **1-1000** | Kas | aset | debit | Penjualan tunai (`create_transaction`), cicilan tunai (trigger pembayaran), retur (refund kas), void, pembayaran PI, jurnal manual |
| 1-1005 | Kas Tunai | aset | debit | Custom 1 user — **tidak dipakai RPC mana pun** |
| **1-1010** | Bank | aset | debit | Trigger pembayaran bila `payment_method` = `transfer`/`qris`; jurnal manual. ⚠️ `create_transaction` **tidak pernah** memakai akun ini |
| **1-1100** | Piutang Usaha | aset | debit | Penjualan kredit (sisa), pelunasan cicilan (kredit), retur (kredit), void |
| **1-1200** | Persediaan Barang / Persediaan Barang Dagangan | aset | debit | Penjualan (kredit HPP), retur (debit), void (debit), GRN (debit), retur pembelian (kredit), adjustment stok, jurnal stok awal |
| **2-2000** | Utang Usaha | kewajiban | kredit | GRN (kredit), pembayaran PI (debit), retur pembelian (debit) |
| **2-2100** | Hutang Gaji | kewajiban | kredit | Payroll (kredit) |
| 5-5700 | Hutang Gaji (custom 1 user) | kewajiban | **debit** ⚠️ | Payroll (kredit) — terpilih karena fungsi mencari **nama**, bukan kode |
| **3-1000** | Modal | ekuitas | kredit | Adjustment stok naik/turun |
| **3-3000** | Modal Pemilik | ekuitas | kredit | Jurnal stok awal produk (dari frontend, via `post_journal`) |
| **3-3100** | Laba Ditahan / Laba Piutang / Laba Aktual | ekuitas | kredit | Jurnal penutup (`close_period`) |
| **3-3200** | Laba Direalisasi | ekuitas | kredit | Jurnal penutup (data lama) + `trg_auto_update_realized_profit` |
| **4-4000** | Pendapatan Penjualan | pendapatan | kredit | Penjualan (kredit), retur (debit), void (debit), jurnal penutup (debit) |
| 4-4100 | Pendapatan Lainnya | pendapatan | kredit | Manual saja |
| **5-5000** | HPP / Beban Pokok Penjualan | beban | debit | Penjualan (debit), retur (kredit), void (kredit), jurnal penutup (kredit) |
| **5-5200** | Beban Gaji | beban | debit | Payroll (debit) |
| 5-5100 | Beban Operasional | beban | debit | Manual saja |
| 5-5300 | Beban Sewa | beban | debit | Manual saja |
| 5-5400 | Beban Utilitas | beban | debit | Manual saja |
| 5-5500 | Beban Transportasi | beban | debit | Manual saja |
| 5-5600 | Beban Lainnya | beban | debit | Manual saja |

### Jumlah user yang memiliki tiap akun (live)

| Kode | Jumlah user | Catatan |
|---|---|---|
| 1-1000, 1-1010, 1-1100, 4-4000 | 13 | Lengkap |
| 1-1200 | 13 (8 + 5 varian nama) | Lengkap, nama berbeda |
| 2-2000 | 8 | **5 user tidak punya** → GRN tidak dijurnal |
| 2-2100 | 4 | **9 user tidak punya** → payroll gagal/skip |
| 3-3000 | 8 | **5 user tidak punya** → jurnal stok awal hilang |
| 3-3100 | 12 (2 + 10 varian nama) | Ada |
| 3-3200 | 10 | **3 user tidak punya** → penutupan buku gagal |
| 5-5000 | 13 (8 + 5 varian nama) | Lengkap, nama berbeda |
| 5-5200 | 8 | **5 user tidak punya** → payroll gagal |

---

## 4. Pemicu per Modul

| Modul | Fungsi / Trigger | `reference_type` | Jurnal yang dibuat |
|---|---|---|---|
| **Penjualan** | RPC `create_transaction` | `transaction` | Dr Kas `v_paid` · Dr Piutang `v_remaining` · Cr Pendapatan `v_total` · Dr HPP / Cr Persediaan `v_total_cogs` |
| **Cicilan / pelunasan** | Trigger `trigger_auto_journal_payment` (AFTER INSERT `transaction_payments`) | `payment` | Dr Kas **atau** Bank (tergantung metode) / Cr Piutang, sebesar `amount` |
| **Realisasi laba** | Trigger `trg_auto_update_realized_profit` (AFTER INSERT `transaction_payments`) | `payment` | **Hanya** Cr Laba Direalisasi (3-3200) — tanpa debit pasangan |
| **Retur penjualan** | RPC `create_return` | `return` | Dr Pendapatan `refund` · Cr Kas `LEAST(refund, paid)` · Cr Piutang `LEAST(refund, remaining)` · Dr Persediaan / Cr HPP |
| **Void transaksi** | RPC `void_transaction` | `void` | Kebalikan jurnal penjualan + set jurnal asli `status='void'` |
| **Adjustment stok** | RPC `create_stock_adjustment` | `stock_adjustment` ⚠️ | Dr Persediaan / Cr Modal (atau kebalikannya) |
| **Stock opname** | RPC `create_stock_opname` | — | **Tidak ada jurnal sama sekali** |
| **Purchase Order** | RPC `create_purchase_order` | — | Tidak ada (memang belum ada transaksi) |
| **Penerimaan barang (GRN)** | RPC `create_goods_receipt` | `purchase` | Dr Persediaan / Cr Utang Usaha sebesar total GRN |
| **Purchase Invoice** | RPC `create_purchase_invoice` | — | **Tidak ada jurnal** (diskon/pajak/ongkir tidak masuk ledger) |
| **Pembayaran PI** | RPC `add_pi_payment` | `purchase_payment` | Dr Utang Usaha / Cr Kas |
| **Retur pembelian** | RPC `create_purchase_return` | `purchase_return` | Dr Utang Usaha / Cr Persediaan |
| **Payroll** | RPC `post_payroll_journal` | `payroll` | Dr Beban Gaji / **Cr Hutang Gaji** (bukan Kas) |
| **Jurnal manual** | RPC `post_journal` | `manual` | Sesuai input, divalidasi debit = kredit |
| **Stok awal produk** | `financeService.postInitialStockJournal` → `post_journal` | `manual` | Dr Persediaan / Cr Modal Pemilik |
| **Tutup buku** | RPC `close_period` | `closing` | Debit semua akun pendapatan, kredit semua beban, Cr Laba (3-3100) |
| **Void jurnal** | RPC `void_journal` | — | Set `status='void'` (tidak membuat jurnal pembalik) |

### Penjaga periode tertutup

10 trigger `trg_prevent_closed_period_*` memblokir insert/update ke:
transaksi, pembayaran, retur, GRN, PO, purchase invoice, payroll, jurnal, stock movement,
dan delivery order — jika tanggalnya jatuh dalam periode yang sudah ditutup.

---

## 5. Alur End-to-End

### A. Penjualan tunai Rp 100.000, HPP Rp 70.000

1. `create_transaction` insert header + item, kurangi stok, insert `transaction_payments`
   (memicu trigger pembayaran), lalu posting jurnal `transaction`:
   - Dr Kas 100.000 / Cr Pendapatan 100.000
   - Dr HPP 70.000 / Cr Persediaan 70.000
2. Trigger pembayaran ikut jalan → **Dr Kas 100.000 / Cr Piutang 100.000**.
   Piutang jadi minus.

> ⚠️ Inilah risiko **dobel-pencatatan Kas** secara struktural. Lihat temuan 6.l.

### B. Penjualan kredit Rp 100.000, DP Rp 40.000

1. Jurnal `transaction`: Dr Kas 40.000 + Dr Piutang 60.000 / Cr Pendapatan 100.000.
2. Saat cicilan Rp 60.000 dibayar: `add_transaction_payment` hanya insert baris pembayaran
   → trigger membuat Dr Kas 60.000 / Cr Piutang 60.000. Piutang kembali 0. ✔

### C. Retur penjualan

`create_return` mengembalikan stok, mengurangi `total` transaksi, lalu:
- Dr Pendapatan (nilai retur)
- Cr Kas / Piutang (refund)
- Dr Persediaan / Cr HPP (nilai HPP barang yang kembali)

### D. Siklus pembelian

```
PO (tanpa jurnal)
  └─> GRN: Dr Persediaan / Cr Utang Usaha
        └─> PI (tanpa jurnal)
              ├─> Bayar PI: Dr Utang Usaha / Cr Kas
              └─> Retur ke supplier: Dr Utang Usaha / Cr Persediaan
```

### E. Payroll

`post_payroll_journal`: Dr Beban Gaji / Cr Hutang Gaji, status slip jadi `paid`.
**Tidak ada jurnal saat uang benar-benar keluar dari kas.**

### F. Tutup buku

`close_period` menjumlah saldo pendapatan & beban periode itu, membuat jurnal penutup
yang menol-kan keduanya, selisihnya masuk laba (3-3100), lalu menyimpan snapshot saldo
di `closing_periods.snapshot_balances`.

---

## 6. Temuan dari Data Live

Ringkasan kondisi jurnal per `reference_type` (hanya status `posted`):

| `reference_type` | Total jurnal | Tidak balance | Selisih (Dr − Cr) |
|---|---:|---:|---:|
| `transaction` | 482 | **38** | +410.000,00 |
| `payment` | 83 | **1** | −3.823,53 |
| `return` | 11 | **2** | −475.000,00 |
| `closing` | 1 | **1** | −640.000,00 |
| `manual` | 14 | 0 | 0 |
| `purchase` | 1 | 0 | 0 |
| `purchase_return` | 1 | 0 | 0 |
| `payroll` | 5 | 0 | 0 |

Kelengkapan jurnal vs dokumen sumber:

| Dokumen | Jumlah | Punya jurnal | Catatan |
|---|---:|---:|---|
| Transaksi | 521 (519 aktif) | 482 | Sisa tanpa jurnal karena COA tidak lengkap |
| Pembayaran | 607 | 37 transaksi | Trigger baru dipasang 25 Sep 2026 |
| Retur | 26 | 12 | 14 retur tanpa jurnal |
| Adjustment stok | 2 | **0** | `reference_type` melanggar CHECK |
| Stock opname | 0 | — | Fitur tidak menjurnal |
| GRN | 2 | 2 | ✔ |
| Pembayaran PI | 1 | 1 | ✔ |
| Retur pembelian | 3 | 3 | ✔ |
| Payroll paid | 5 | 5 | ✔ (tapi akrual saja) |
| Closing period | 1 | 1 | Tidak balance |

### a. Jurnal penjualan tidak balance — 38 dari 482 (net +Rp 410.000)

**Penyebab:** debit Kas memakai `v_paid` (termasuk uang kembalian) sedangkan kredit
Pendapatan memakai `v_total` (setelah diskon).

Contoh `TRX-20260917-90BA62`: total 800.000, dibayar 825.000, kembalian 25.000
→ **Dr Kas 825.000 / Cr Pendapatan 800.000**.

```sql
-- Potongan create_transaction (20260901_finance_module.sql)
IF v_paid > 0 THEN
  INSERT INTO journal_lines (... '1-1000', 'Kas', v_paid, 0);   -- ← termasuk kembalian
END IF;
INSERT INTO journal_lines (... '4-4000', 'Pendapatan Penjualan', 0, v_total);
```

### b. Jurnal retur tidak balance — 2 dari 11 (net −Rp 475.000)

`create_return` mengkredit Kas dan Piutang **masing-masing** `LEAST(refund, paid/remaining)`
tanpa saling mengurangi, sehingga total kredit bisa melebihi debit.

Contoh `JRN-20260912-8CA30C`: Dr Pendapatan 350.000 + Dr Persediaan 336.000
vs Cr HPP 336.000 + Cr Kas 350.000 + Cr Piutang 265.000 → kredit lebih 265.000.

> Repo sudah punya perbaikan (`20260915_fix_return_journal_split.sql`), **tapi live DB
> masih versi lama** — migrasi itu belum dijalankan.

### c. Jurnal penutup lama tidak balance (−Rp 640.000)

Jurnal `CLOSING-20261104-4e12338f` mengkredit **3-3100 sebesar 1.420.000 dan 3-3200
sebesar 640.000** — laba direalisasi dihitung dua kali.

| Akun | Debit | Kredit |
|---|---:|---:|
| 4-4000 Pendapatan Penjualan | 3.720.000 | 0 |
| 5-5000 HPP | 0 | 2.300.000 |
| 3-3100 Laba Aktual | 0 | 1.420.000 |
| 3-3200 Laba Direalisasi | 0 | 640.000 |

Fungsi `close_period` yang aktif sekarang sudah hanya mengkredit 3-3100, jadi penutupan
baru akan balance — tapi **data lama tetap salah**.

### d. Realisasi laba = jurnal satu sisi

`REALIZE-20261105-095534-3eb4ee` hanya Cr Laba Direalisasi Rp 3.823,53 tanpa debit.
Selain itu `reference_id`-nya berisi `payment.id`, sedangkan trigger pembayaran lain
memakai `transaction_id` — jadi sulit ditelusuri.

### e. Adjustment stok tidak pernah dijurnal

`stock_adjustment` **tidak ada** di CHECK constraint `reference_type`. 2 adjustment
tercatat, **0 jurnal**. Selama constraint belum diperbaiki, adjustment bernilai > 0
akan gagal (atau ter-skip jika akun tidak ada).

```sql
-- Constraint live saat ini
CHECK (reference_type = ANY (ARRAY[
  'manual','transaction','return','payment','void',
  'purchase','purchase_payment','purchase_return',
  'payroll','closing','reclassify'
]))
```

### f. Opname, kasbon, dan surat jalan tidak menyentuh ledger

- `create_stock_opname` hanya update stok + `stock_movements`
- Kasbon karyawan (`hr_employee_loans`) hanya mempengaruhi slip gaji
- Surat jalan / biaya driver tidak punya jurnal

### g. Payroll hanya akrual, tidak pernah kas keluar

5 slip `paid` → 5 jurnal, semuanya Cr Hutang Gaji. Saldo 2-2100 akan terus membengkak.

Lebih parah: fungsi mencari akun kewajiban lewat
`LOWER(name) LIKE '%hutang%' AND LOWER(name) LIKE '%gaji%'`, **bukan kode**.
Di satu user ia memilih akun custom **5-5700 "Hutang Gaji" yang tipenya kewajiban
tapi normal_balance debit**, sehingga tampil terbalik di neraca.

### h. Banyak user tidak punya akun lengkap → jurnal hilang tanpa error

`init_default_coa_for_user` hanya membuat **7 akun**:

```
1-1000 Kas · 1-1010 Bank · 1-1100 Piutang Usaha · 1-1200 Persediaan
3-1000 Modal · 4-4000 Pendapatan Penjualan · 5-5000 HPP
```

Akibatnya `2-2000`, `2-2100`, `5-5200`, `3-3100`, `3-3200` tidak ada untuk sebagian user
(mis. 2-2000 hanya di 9 dari 14 user saat diukur ulang 2026-11-24). Semua fungsi memakai pola
`IF akun IS NOT NULL` → **dokumen tersimpan, jurnal tidak dibuat, tidak ada pesan error**.

Selain itu jurnal stok awal mencari `3-3000` yang tidak dibuat oleh seed 7-akun
→ stok awal user baru tidak pernah terjurnal.

### i. Kas vs Bank tidak konsisten

`create_transaction` selalu mendebit **1-1000 Kas** walau metode `transfer`/`qris`;
hanya trigger pembayaran yang membedakan Kas/Bank. Saldo Bank jadi understated.

### j. Void tidak membalik jurnal cicilan

`void_transaction` hanya meng-void jurnal `reference_type='transaction'`;
jurnal `payment` dari cicilan tetap `posted`. Belum ada data void untuk diuji
(0 transaksi batal).

### k. Hapus satu pembayaran bisa meng-void jurnal yang salah

`auto_void_journal_payment` mencari jurnal dengan
`reference_id = OLD.transaction_id LIMIT 1` — tidak bisa membedakan pembayaran mana,
jadi bisa mem-void jurnal cicilan lain di transaksi yang sama.

### l. 607 pembayaran, hanya 37 transaksi punya jurnal pembayaran

Mayoritas karena trigger baru dipasang 25 Sep 2026; data lama tidak di-backfill.
Risiko dobel-Kas struktural (DP dicatat dua kali: di jurnal transaksi dan jurnal
pembayaran) baru terwujud di **1 transaksi** saat ini.

### m. Drift repo vs live vs SQLite

| Hal | Repo | Live DB | SQLite mirror |
|---|---|---|---|
| Split retur | Sudah diperbaiki (20260915) | **Belum** | — |
| `close_period` | Cr 3-3100 saja | Cr 3-3100 saja | Split 3-3100 + 3-3200 |
| Seed COA | 7 akun (init) / 20 akun (seed) | Campuran | 20 akun |
| Jurnal payroll | Akrual | Akrual | Akrual |

---

## 7. Prioritas Perbaikan

1. **Backfill/perbaiki jurnal tidak balance** (penjualan, retur, closing) — ini yang
   merusak neraca & laba rugi.
2. **Jalankan `20260915_fix_return_journal_split.sql`** di live DB.
3. **Tambah `stock_adjustment` ke CHECK constraint** + buat jurnal untuk stock opname.
4. **Perbaiki seed COA** agar 20 akun lengkap, dan samakan `3-3000` vs `3-1000`.
5. **Payroll**: tambah jurnal pembayaran gaji (Dr Hutang Gaji / Cr Kas),
   cari akun berdasarkan **kode** bukan nama.
6. **Hentikan dobel-pencatatan DP**: `create_transaction` jangan posting Kas untuk
   bagian yang sudah dijurnal oleh trigger, atau trigger jangan jalan untuk pembayaran awal.
7. **Hilangkan silent-skip**: lempar error (atau minimal notifikasi) bila akun tidak ditemukan.

---

## 8. Lampiran

### 8.1 Referensi fungsi (live DB)

| Fungsi | Argumen | Posting |
|---|---|---|
| `create_transaction` | `(uuid, text, text, numeric, numeric, text, jsonb, numeric, timestamptz)` | Penjualan + HPP |
| `create_return` | `(uuid, jsonb, text)` | Retur penjualan |
| `void_transaction` | `(uuid)` | Pembalikan penjualan |
| `add_transaction_payment` | `(uuid, numeric, text, text, date)` | Hanya insert pembayaran (jurnal via trigger) |
| `auto_journal_payment` | trigger | Dr Kas/Bank / Cr Piutang |
| `auto_update_realized_profit` | trigger | Cr Laba Direalisasi (satu sisi) |
| `create_stock_adjustment` | `(uuid, text, int, int, int, text, text)` | Dr/Cr Persediaan vs Modal |
| `create_stock_opname` | `(text, date, text, jsonb)` | **Tidak ada jurnal** |
| `create_goods_receipt` | `(uuid, uuid, text, timestamptz, text, jsonb)` | Dr Persediaan / Cr Utang |
| `create_purchase_invoice` | `(uuid, uuid, text, timestamptz, timestamptz, numeric, numeric, numeric, text, jsonb)` | **Tidak ada jurnal** |
| `add_pi_payment` | `(uuid, numeric, text, text)` | Dr Utang / Cr Kas |
| `create_purchase_return` | `(uuid, uuid, uuid, text, timestamptz, text, text, jsonb)` | Dr Utang / Cr Persediaan |
| `post_payroll_journal` | `(uuid)` | Dr Beban Gaji / Cr Hutang Gaji |
| `post_journal` | `(date, text, jsonb)` | Manual (validasi balance) |
| `void_journal` | `(uuid)` | Set `status='void'` |
| `close_period` | `(date, date, text)` | Jurnal penutup |
| `reopen_period` | `(uuid)` | Buka periode |
| `delete_closing_period` | `(uuid)` | Hapus periode |
| `get_profit_summary` | `(uuid, date, date)` | Laba aktual & direalisasi |

### 8.2 File migrasi terkait

| File | Isi |
|---|---|
| `20260901_finance_module.sql` | Schema COA, `seed_default_accounts`, `post_journal`, auto-jurnal penjualan/retur/void |
| `20260901_purchasing_module.sql` | GRN, PI, pembayaran PI, retur pembelian |
| `20260912_payment_method_to_bank_account.sql` | Mapping Kas/Bank (superseded) |
| `20260915_fix_return_journal_split.sql` | Perbaikan split retur (**belum di live**) |
| `20260916_closing_periods.sql` | Tabel `closing_periods` + 10 guard trigger |
| `20260925_auto_journal_payment.sql` | Trigger jurnal pembayaran |
| `20260925_fix_auto_journal_payment.sql` | Perbaikan trigger + `init_default_coa_for_user` |
| `20261103_add_payment_date_param.sql` | `p_payment_date` pada `add_transaction_payment` |
| `20261104_two_profit_accounts.sql` | `close_period` 2 akun laba (tidak balance) |
| `20261104_split_retained_earnings.sql` | Alternatif split laba |
| `20261104_fix_auto_journal_payment_trigger.sql` | Trigger final |
| `20261105_fix_auto_journal_use_old_codes.sql` | `init_default_coa_for_user` 7 akun + `create_stock_adjustment` |
| `20261105_auto_init_coa_on_signup.sql` | Auto-init COA saat signup |
| `20260902_hr_payroll_module.sql` | Payroll awal |
| `20260911_payroll_per_employee.sql` | Payroll per karyawan |
| `20260912_add_hutang_gaji_account.sql` | Akun 2-2100 |
| `20260916_fix_post_payroll_journal_field_name.sql` | Fix field `account_type` → `type` |
| `20261124_unify_default_coa.sql` | **Baru (belum dijalankan).** Satukan COA default jadi 18 akun idempotent, seed saat signup, backfill user lama, `3-1000`→`3-3000`, `stock_adjustment` di CHECK, hapus stock movement ganda, payroll lookup per kode |

### 8.3 File frontend terkait

| File | Peran |
|---|---|
| `src/services/finance.ts` | RPC map (`post_journal`, `close_period`, dll.) + `postInitialStockJournal` |
| `src/services/hr.ts` | `postPayrollJournal` → `supabase.rpc('post_payroll_journal')` |
| `src/services/stock.ts` | `create_stock_adjustment`, `create_stock_opname` |
| `src/services/purchasing.ts` | Semua RPC purchasing |
| `src/services/dailyCash.ts` | Laporan mutasi Kas (baca 1-1000, exclude `transaction`/`payment`) |
| `src/services/dailyBank.ts` | Laporan mutasi Bank (baca 1-1010) |
| `src/services/sqlite/finance.ts` | Mirror offline (seed 20 akun, split closing) |
| `src/views/Finance/JournalForm.vue` | Form jurnal manual |
| `src/views/Hr/PayrollListNew.vue` | Tombol "Bayar & Jurnal" |

### 8.4 Cara verifikasi ulang (lihat juga bagian 9)

```sql
-- Cek jurnal tidak balance
WITH je AS (
  SELECT je.id, je.reference_type, SUM(jl.debit) d, SUM(jl.credit) c
  FROM journal_entries je
  JOIN journal_lines jl ON jl.journal_id = je.id
  WHERE je.status = 'posted'
  GROUP BY je.id, je.reference_type
)
SELECT reference_type, COUNT(*) total,
       COUNT(*) FILTER (WHERE ROUND(d,2) <> ROUND(c,2)) tidak_balance,
       ROUND(SUM(d - c), 2) selisih
FROM je GROUP BY reference_type ORDER BY reference_type;

-- Cek kelengkapan COA per user
SELECT code, COUNT(DISTINCT user_id) jumlah_user
FROM chart_of_accounts GROUP BY code ORDER BY code;
```

---

## 9. Default Akun Saat Akun Baru Dibuat

### 9.1 Ada tiga jalur seeding yang berbeda

Saat ini **tidak ada satu pun jalur yang membuat COA lengkap**. Tergantung user baru melewati
jalur mana, jumlah akunnya bisa 7, 16, atau 20.

| # | Jalur | Kapan jalan | Fungsi | Jumlah akun |
|---|---|---|---|---|
| 1 | **Signup** (`AFTER INSERT auth.users`) | Saat user dibuat | `create_default_store_settings()` → `init_default_coa_for_user()` | **7** |
| 2 | **Transaksi pertama** (`BEFORE INSERT transactions`) | Saat insert transaksi pertama | `trigger_init_coa_on_first_transaction()` → `init_default_coa_for_user()` | **7** (skip jika sudah ada) |
| 3 | **Buka modul Finance** | `fetchAccounts()`/`seedAccounts()` di store | RPC `seed_default_accounts()` | **16** (menambah yang belum ada) |

> ⚠️ **Migrasi `20261105_auto_init_coa_on_signup.sql` TIDAK ada di live DB.**
> Fungsi `create_default_store_settings()` di live hanya insert `store_settings` —
> tanpa memanggil `init_default_coa_for_user()`. Jadi user baru **tidak langsung punya COA**
> saat signup; COA baru muncul saat transaksi pertama atau saat membuka modul Finance.
> Selain itu, `Signup.vue` saat ini menampilkan "Pendaftaran Ditutup" — akun dibuat oleh admin.

### 9.2 Jalur 1 & 2 — `init_default_coa_for_user()` (7 akun)

```sql
1-1000  Kas                          aset        debit
1-1010  Bank                         aset        debit
1-1100  Piutang Usaha                aset        debit
1-1200  Persediaan Barang Dagangan   aset        debit
3-1000  Modal                        ekuitas     kredit
4-4000  Pendapatan Penjualan         pendapatan  kredit
5-5000  Harga Pokok Penjualan (HPP)  beban       debit
```

Fungsi ini **langsung `RETURN` jika user sudah punya akun apa pun** — jadi tidak pernah
melengkapi akun yang kurang.

**Yang hilang dari daftar ini dan akibatnya:**

| Akun hilang | Modul yang terpengaruh | Akibat |
|---|---|---|
| `2-2000` Utang Usaha | Purchasing (GRN, bayar PI, retur pembelian) | `IF v_account_utang IS NOT NULL` → **jurnal tidak dibuat, tanpa error** |
| `2-2100` Hutang Gaji | Payroll | `RAISE EXCEPTION 'Akun hutang gaji tidak ditemukan'` → **payroll gagal total** |
| `5-5200` Beban Gaji | Payroll | Exception yang sama → **payroll gagal total** |
| `3-3000` Modal Pemilik | Stok awal produk | `postInitialStockJournal` hanya `console.warn` → **jurnal stok awal hilang** |
| `3-3100` Laba Ditahan | Tutup buku | `close_period` `RAISE EXCEPTION` → **tutup buku gagal** |
| `3-3200` Laba Direalisasi | Tutup buku | `close_period` `RAISE EXCEPTION` → **tutup buku gagal** |
| `4-4100`, `5-5100`–`5-5600` | Jurnal manual | User harus buat akun sendiri |

### 9.3 Jalur 3 — `seed_default_accounts()` (16 akun)

Dipanggil saat modul Finance dibuka dan `accounts.length === 0`, atau lewat tombol
**"Seed Akun Default"** di halaman Chart of Accounts (`ChartOfAccounts.vue`).
Fungsi ini idempoten (`ON CONFLICT (user_id, code) DO NOTHING`) sehingga **menambah**
akun yang belum ada tanpa menimpa yang sudah ada.

```sql
-- ASET (4)
1-1000  Kas                          aset        debit
1-1010  Bank                         aset        debit
1-1100  Piutang Usaha                aset        debit
1-1200  Persediaan Barang            aset        debit

-- KEWAJIBAN (1)
2-2000  Utang Usaha                  kewajiban   kredit

-- EKUITAS (2)
3-3000  Modal Pemilik                ekuitas     kredit
3-3100  Laba Ditahan                 ekuitas     kredit

-- PENDAPATAN (2)
4-4000  Pendapatan Penjualan         pendapatan  kredit
4-4100  Pendapatan Lainnya           pendapatan  kredit

-- BEBAN (7)
5-5000  Harga Pokok Penjualan (HPP)  beban       debit
5-5100  Beban Operasional            beban       debit
5-5200  Beban Gaji                   beban       debit
5-5300  Beban Sewa                   beban       debit
5-5400  Beban Utilitas               beban       debit
5-5500  Beban Transportasi           beban       debit
5-5600  Beban Lainnya                beban       debit
```

**Tetap tidak ada di daftar ini:**

| Akun hilang | Akibat |
|---|---|
| `2-2100` Hutang Gaji | Payroll tetap gagal (exception) |
| `3-3200` Laba Direalisasi | Tutup buku tetap gagal (exception) — hanya 3-3100 yang ada |

### 9.4 Perbandingan tiga sumber daftar

| Sumber | Jumlah | 2-2000 | 2-2100 | 3-3000 | 3-3100 | 3-3200 | 5-5200 |
|---|---|:---:|:---:|:---:|:---:|:---:|:---:|
| `init_default_coa_for_user()` (live, 7 akun) | 7 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `seed_default_accounts()` (live, 16 akun) | 16 | ✅ | ❌ | ✅ | ✅ | ❌ | ✅ |
| `DEFAULT_ACCOUNTS` di `src/services/sqlite/finance.ts` | 18 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Seed asli `20260901_finance_module.sql` (20 akun) | 20 | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |

> SQLite mirror sudah paling lengkap (18 akun, termasuk 2-2100 & 3-3200) —
> jadi **perilaku web dan offline berbeda**: di web payroll/tutup buku bisa gagal,
> di Android (offline) berhasil.

### 9.5 Kondisi nyata per user (live, snapshot 13 user)

> Diukur ulang 2026-11-24: **14 user, 206 baris COA**. Dari 14 user itu hanya **1** yang
> punya 18 akun kanonik; sisanya 7–19 akun (12 user punya akun tambahan/custom).
> Rincian di bawah adalah snapshot awal saat analisis pertama.

| Jumlah akun | Jumlah user | Keterangan |
|---:|---:|---|
| 7 | 1 | Hanya dari `init_default_coa_for_user` |
| 9 | 3 | Seed lama (1-1000…3-3200 tanpa 2-2000/2-2100) |
| 10 | 1 | Termasuk akun custom `1-1005 Kas Tunai` |
| 16 | 1 | Hasil `seed_default_accounts` |
| 17 | 1 | 16 + `3-1000` |
| 18 | 1 | 16 + `3-3200` |
| 19 | 5 | Daftar lengkap + `3-1000` |

Akibatnya: **5 dari 13 user tidak punya `2-2000`**, **9 dari 13 tidak punya `2-2100`**,
**3 dari 13 tidak punya `3-3200`** — itulah sebabnya banyak dokumen tidak punya jurnal
(temuan 6.h).

### 9.6 Rekomendasi

1. **Satukan daftar akun** ke satu sumber: 20 akun lengkap (tambahkan `2-2100` Hutang Gaji
   dan `3-3200` Laba Direalisasi ke `seed_default_accounts`, dan lengkapi
   `init_default_coa_for_user`).
2. **Hapus `IF EXISTS ... RETURN`** di `init_default_coa_for_user` — ganti dengan
   `INSERT ... ON CONFLICT (user_id, code) DO NOTHING` agar bisa melengkapi akun yang kurang.
3. **Jalankan `20261105_auto_init_coa_on_signup.sql`** di live (atau buat versi baru yang
   memanggil fungsi seed lengkap).
4. **Ganti silent-skip** `IF akun IS NOT NULL` dengan error/notifikasi yang terlihat user.
5. **Selaraskan `3-3000` vs `3-1000`** — dua kode modal yang berbeda antar jalur seeding
   (`init_default_coa_for_user` pakai `3-1000`, `seed_default_accounts` pakai `3-3000`,
   sedangkan `postInitialStockJournal` mencari `3-3000`).

### 9.7 Query verifikasi (bagian 9)

```sql
-- Daftar akun user tertentu
SELECT code, name, type, normal_balance, is_active
FROM chart_of_accounts
WHERE user_id = '<uuid-user>'
ORDER BY code;

-- Bandingkan akun yang hilang vs daftar standar
WITH standar(code) AS (
  VALUES ('1-1000'),('1-1010'),('1-1100'),('1-1200'),
         ('2-2000'),('2-2100'),('3-3000'),('3-3100'),('3-3200'),
         ('4-4000'),('4-4100'),
         ('5-5000'),('5-5100'),('5-5200'),('5-5300'),
         ('5-5400'),('5-5500'),('5-5600')
)
SELECT s.code AS akun_hilang
FROM standar s
WHERE NOT EXISTS (
  SELECT 1 FROM chart_of_accounts c
  WHERE c.user_id = '<uuid-user>' AND c.code = s.code
);
```

---

## 10. Mengapa COA Baru Dibuat Saat Modul Finance Dibuka

Ini pertanyaan desain, bukan bug kebetulan. Jawabannya: **karena pembuatan akun default
sengaja dititipkan di frontend (store Finance), bukan di database.** Tapi ada 4 sebab teknis
yang membuatnya jadi begitu.

### 10.1 Sebab 1 — Trigger signup hanya membuat `store_settings`

Di live DB, satu-satunya trigger pada `auth.users` adalah:

```
on_auth_user_created  AFTER INSERT ON auth.users
  → create_default_store_settings()
```

Dan isi fungsi live-nya cuma:

```sql
INSERT INTO store_settings (user_id, store_name, store_subtitle)
VALUES (NEW.id, 'Ucup Kasir', 'Toko Berkat Jaya Makmur')
ON CONFLICT (user_id) DO NOTHING;
RETURN NEW;
```

Versi yang **seharusnya** menambahkan `PERFORM init_default_coa_for_user(NEW.id)` ada di
file `20261105_auto_init_coa_on_signup.sql`, tetapi **file itu tidak ada di
`supabase_migrations.schema_migrations`** — artinya belum pernah dijalankan ke live.
Jadi COA tidak pernah dibuat saat signup.

### 10.2 Sebab 2 — RPC seed memakai `auth.uid()`, bukan parameter user

```sql
CREATE FUNCTION seed_default_accounts()   -- tanpa argumen
...
v_user_id := auth.uid();
```

Fungsi ini **tidak bisa** dipanggil dari trigger signup, karena pada saat `AFTER INSERT
auth.users` belum ada JWT/session — `auth.uid()` bernilai `NULL`, sehingga insert ke
`chart_of_accounts` akan gagal (NOT NULL) atau masuk ke user yang salah.

Itu sebabnya dipakai fungsi lain (`init_default_coa_for_user(p_user_id uuid)`) untuk konteks
signup — dan itulah dua fungsi berbeda yang isinya tidak sama (7 akun vs 16 akun).

### 10.3 Sebab 3 — `seed_default_accounts()` butuh sesi login

`seed_default_accounts` juga tidak punya `GRANT EXECUTE` eksplisit di migrasi; ia jalan
karena default privilege Postgres (`PUBLIC`). Yang penting: RPC ini dipanggil lewat
`supabase.rpc()` dari browser, jadi **hanya bisa dieksekusi setelah user login**.

Store Finance memanggilnya di dua titik:

```ts
// src/stores/finance.ts — fetchAccounts()
const result = await financeServiceAdapter.getAccounts()
if (result.length === 0) {
  accounts.value = await financeServiceAdapter.seedDefaultAccounts()  // ← hanya jika kosong
}
```

```ts
// src/stores/finance.ts — seedAccounts()  → dipanggil tombol "Seed Akun Default"
accounts.value = await financeServiceAdapter.seedDefaultAccounts()
```

Dan `fetchAccounts()` hanya dipanggil dari 5 tempat, **semuanya halaman Finance/Report**:
`ChartOfAccounts.vue`, `JournalForm.vue`, `GeneralLedger.vue`, `ProfitLossReport.vue`,
`DailyProfitReport.vue`. Tidak ada pemanggilan di `App.vue`, router guard, atau setelah login.

### 10.4 Sebab 4 — Logika "hanya seed jika kosong" membuatnya tidak pernah melengkapi

`fetchAccounts()` hanya seed kalau `result.length === 0`. Begitu user punya 7 akun
(dari `ensure_coa_exists` saat transaksi pertama), `length` bukan 0 → **seed 16 akun tidak
pernah jalan otomatis**. User harus menekan tombol **"Seed Akun Default"** secara manual
di halaman Chart of Accounts.

### 10.5 Kenapa desain ini berbahaya

COA dibutuhkan **jauh sebelum** user membuka modul Finance:

| Kejadian | Butuh akun | Tanpa COA |
|---|---|---|
| Insert transaksi pertama | `1-1000`, `1-1100`, `4-4000`, `5-5000`, `1-1200` | `ensure_coa_exists` membuat 7 akun — **lalu jurnal transaksi dibuat** |
| Insert `transaction_payments` (DP) | `1-1000`/`1-1010`, `1-1100` | Trigger `auto_journal_payment` skip diam-diam |
| Buat produk dengan stok awal | `1-1200`, `3-3000` | `console.warn` saja, jurnal hilang |
| GRN / bayar PI | `1-1200`, `2-2000` | Jurnal hilang tanpa error |
| Payroll | `5-5200`, `2-2100` | **Exception** — payroll gagal |
| Tutup buku | `3-3100`, `3-3200` | **Exception** — tutup buku gagal |

Artinya: **jurnal penjualan sudah terbentuk sebelum modul Finance pernah dibuka**, tetapi
akun-akun untuk pembelian, payroll, dan tutup buku belum ada. User baru menyadari
akuntansinya "tidak lengkap" saat mencoba modul tersebut — bukan saat daftar.

Bukti live: user `0ddd9c2f…` (daftar 5 Nov 2026) punya **1 transaksi dengan 2 item,
2 pembayaran, dan 0 jurnal** — transaksi masuk, tapi jurnal tidak terbentuk karena
COA baru dibuat belakangan / tidak lengkap. User lain `50634669…` punya **67 transaksi
tapi hanya 34 yang punya jurnal**.

### 10.6 Kenapa tidak langsung saja?

Secara teknis **bisa**, dan seharusnya begitu. Tiga opsi, dari yang paling benar:

**Opsi A — Perbaiki trigger signup (paling tepat)**

Jalankan migrasi yang menyatukan semuanya:

```sql
-- 1. Satu daftar akun, idempotent, bisa dipanggil dengan user_id eksplisit
CREATE OR REPLACE FUNCTION init_default_coa_for_user(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO chart_of_accounts
    (user_id, code, name, type, normal_balance, is_active, is_system)
  VALUES
    (p_user_id, '1-1000', 'Kas',                          'aset',       'debit',  true, true),
    (p_user_id, '1-1010', 'Bank',                         'aset',       'debit',  true, true),
    (p_user_id, '1-1100', 'Piutang Usaha',                'aset',       'debit',  true, true),
    (p_user_id, '1-1200', 'Persediaan Barang Dagangan',   'aset',       'debit',  true, true),
    (p_user_id, '2-2000', 'Utang Usaha',                  'kewajiban',  'kredit', true, true),
    (p_user_id, '2-2100', 'Hutang Gaji',                  'kewajiban',  'kredit', true, true),
    (p_user_id, '3-3000', 'Modal Pemilik',                'ekuitas',    'kredit', true, true),
    (p_user_id, '3-3100', 'Laba Ditahan',                 'ekuitas',    'kredit', true, true),
    (p_user_id, '3-3200', 'Laba Direalisasi',             'ekuitas',    'kredit', true, true),
    (p_user_id, '4-4000', 'Pendapatan Penjualan',         'pendapatan', 'kredit', true, true),
    (p_user_id, '4-4100', 'Pendapatan Lainnya',           'pendapatan', 'kredit', true, true),
    (p_user_id, '5-5000', 'Harga Pokok Penjualan (HPP)',  'beban',      'debit',  true, true),
    (p_user_id, '5-5100', 'Beban Operasional',            'beban',      'debit',  true, true),
    (p_user_id, '5-5200', 'Beban Gaji',                   'beban',      'debit',  true, true),
    (p_user_id, '5-5300', 'Beban Sewa',                   'beban',      'debit',  true, true),
    (p_user_id, '5-5400', 'Beban Utilitas',               'beban',      'debit',  true, true),
    (p_user_id, '5-5500', 'Beban Transportasi',           'beban',      'debit',  true, true),
    (p_user_id, '5-5600', 'Beban Lainnya',                'beban',      'debit',  true, true)
  ON CONFLICT (user_id, code) DO NOTHING;
END;
$$;

-- 2. Panggil dari trigger signup
CREATE OR REPLACE FUNCTION create_default_store_settings()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO store_settings (user_id, store_name, store_subtitle)
  VALUES (NEW.id, 'Ucup Kasir', 'Toko Berkat Jaya Makmur')
  ON CONFLICT (user_id) DO NOTHING;

  PERFORM init_default_coa_for_user(NEW.id);   -- ← ini yang hilang
  RETURN NEW;
END;
$$;
```

Perubahan kunci dibanding versi sekarang:

| Sekarang | Seharusnya |
|---|---|
| `IF EXISTS (...) THEN RETURN` | `INSERT ... ON CONFLICT DO NOTHING` → bisa **melengkapi** akun kurang |
| 7 akun | 18 akun (termasuk `2-2000`, `2-2100`, `3-3200`) |
| Tidak dipanggil saat signup | Dipanggil di `create_default_store_settings()` |
| `3-1000` Modal | `3-3000` Modal Pemilik (samakan dengan `postInitialStockJournal`) |

**Opsi B — Seed di sisi frontend setelah login**

Di `App.vue` atau setelah `auth` store mendeteksi session baru, panggil
`financeStore.fetchAccounts()` sekali. Lebih mudah, tapi tetap bergantung pada client —
kalau user memakai Android offline atau langsung insert via API, COA tetap tidak ada.

**Opsi C — Seed saat transaksi pertama (sudah ada, tapi kurang)**

Trigger `ensure_coa_exists` sudah memanggil `init_default_coa_for_user`. Kalau fungsi itu
diperbaiki jadi 18 akun + idempotent, maka **transaksi pertama** akan langsung membuat COA
lengkap — tanpa perlu membuka modul Finance. Ini perbaikan minimum yang paling murah.

### 10.7 Kesimpulan

> Modul Finance harus dibuka dulu **bukan karena kebutuhan teknis**, melainkan karena
> seed COA hanya dipasang di store frontend dan belum dipasang di trigger signup.
> Ini warisan dari migrasi `20261105_auto_init_coa_on_signup.sql` yang belum dijalankan.

Perbaikannya cukup satu migrasi (Opsi A), dan efeknya: setiap user baru langsung punya
18 akun lengkap, jurnal transaksi/pembelian/payroll/tutup buku bisa terbentuk sejak awal,
dan tombol "Seed Akun Default" hanya menjadi alat perbaikan untuk user lama.

---

## 11. Implementasi Perbaikan (2026-11-24)

File: `supabase/migrations/20261124_unify_default_coa.sql` — **belum dijalankan**.
Idempotent, aman dijalankan ulang. Isi:

| # | Perubahan | Menyelesaikan |
|---|---|---|
| 1 | `3-1000` → `3-3000` (pindah jurnal, hapus duplikat, rename) | temuan 6.f |
| 2 | `init_default_coa_for_user()`: 18 akun + `ON CONFLICT DO NOTHING`, tanpa early-return | temuan 6.h, 9.x |
| 3 | `seed_default_accounts()` delegasi ke fungsi di atas | daftar akun ganda |
| 4 | `create_default_store_settings()` memanggil init saat signup | bagian 10 |
| 5 | `record_stock_movement()` baca `app.stock_ref_type` / `app.stock_ref_id` | 775 movement tanpa referensi (baru dipakai adjustment; penjualan/GRN belum) |
| 6 | `create_stock_adjustment()`: tidak insert movement manual, pakai `3-3000` | movement ganda + kode mati |
| 7 | CHECK `reference_type` + `stock_adjustment` | temuan 6.e |
| 8 | `post_payroll_journal()` cari akun per kode `5-5200`/`2-2100`, fallback nama | payroll salah akun |
| 9 | Backfill COA untuk seluruh user `auth.users` | user lama kurang akun |
| 10 | `REVOKE` execute `init_default_coa_for_user` dari anon/authenticated | hardening |
| 11 | `DROP FUNCTION init_default_coa_for_current_user()` | fungsi mati, tipe akun `'asset'`/`'revenue'` melanggar CHECK |

### Hasil validasi (dijalankan dalam transaksi `ROLLBACK`, bukan apply)

| Uji | Hasil |
|---|---|
| User `0ddd9c2f…` (7 akun) setelah init | **18 akun** (`1-1000, 1-1010, 1-1100, 1-1200, 2-2000, 2-2100, 3-3000, 3-3100, 3-3200, 4-4000, 4-4100, 5-5000, 5-5100, 5-5200, 5-5300, 5-5400, 5-5500, 5-5600`) |
| Panggil init 2× | tetap 18 (idempotent); re-run backfill mengubah **0 user** |
| Migrasi 3-1000 (bagian 1 + backfill) | `sisa_31000 = 0`, `punya_33000 = 14/14 user` |
| Backfill seluruh 14 user | **0 user kurang akun kanonik** (12 user tetap punya akun custom tambahan — tidak dihapus) |
| Simulasi signup (`INSERT auth.users`) | `store_settings` = 1, COA = **18 akun** otomatis |
| Simulasi adjustment stok (panggil RPC) | `stock_movements` = **1 baris** (sebelumnya 2), `reference_type='adjustment'` |
| Jurnal adjustment | debit = credit = 234.000 (balance) |
| Insert jurnal `stock_adjustment` tanpa fix CHECK | **gagal** (23514) → membuktikan temuan 6.e |
| `post_payroll_journal` user `50634669` (punya akun custom `5-5700`) | memilih **5-5200 / 2-2100** yang benar; Dr 50.000 / Cr 50.000 |
| Grant setelah fix | `authenticated`/`anon` tidak bisa `init_default_coa_for_user`; `authenticated` bisa `seed_default_accounts` |
| **Dry run seluruh isi file** (11 bagian sekaligus, `ROLLBACK`) | `sisa_3_1000=0`, `fungsi_mati=0`, `user_kurang_18=0`, `check_ok=true`, `anon_bisa_init=false`, `auth_bisa_seed=true`, `jumlah_jurnal=622` (tidak berubah) |

### Cara apply

Supabase CLI belum terpasang di mesin ini (`supabase: command not found`), jadi ada 3 pilihan:

```bash
# 1. Via Supabase CLI (perlu install + login dulu)
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase db push

# 2. Via SQL Editor dashboard: copy-paste isi file apa adanya
#    (file TIDAK memakai BEGIN/COMMIT, jadi aman ditempel utuh)

# 3. Via MCP supabase apply_migration
```

Karena migrasi ini menghapus baris `3-1000`, menulis ulang CHECK constraint, dan
mengisi COA 14 user, sebaiknya **backup dulu** (`pg_dump` tabel `chart_of_accounts`,
`journal_entries`, `journal_lines`) sebelum apply.

Setelah apply, verifikasi:

```sql
-- 1. semua user punya 18 akun KANONIK
--    (akun custom milik user tidak dihitung, jadi boleh > 18)
WITH kanonik(code) AS (VALUES
  ('1-1000'),('1-1010'),('1-1100'),('1-1200'),('2-2000'),('2-2100'),
  ('3-3000'),('3-3100'),('3-3200'),('4-4000'),('4-4100'),('5-5000'),
  ('5-5100'),('5-5200'),('5-5300'),('5-5400'),('5-5500'),('5-5600'))
SELECT u.id, count(c.code) AS akun_kanonik
FROM auth.users u
LEFT JOIN chart_of_accounts c
       ON c.user_id = u.id AND c.code IN (SELECT code FROM kanonik)
GROUP BY u.id
HAVING count(c.code) <> 18;   -- harus 0 baris

-- 2. tidak ada lagi 3-1000
SELECT count(*) FROM chart_of_accounts WHERE code = '3-1000';

-- 3. constraint sudah memuat stock_adjustment
SELECT pg_get_constraintdef(oid) FROM pg_constraint
WHERE conname = 'journal_entries_reference_type_check';

-- 4. movement baru punya referensi
SELECT reference_type, count(*) FROM stock_movements
WHERE created_at > now() - interval '1 day' GROUP BY 1;
```

### Yang belum tercakup (perlu migrasi terpisah)

Ini perbaikan **seed & konsistensi COA**, bukan koreksi jurnal historis:

- Jurnal penjualan/retur/closing yang sudah terlanjur tidak balance (prioritas 1–2
  di [bagian 7](#7-prioritas-perbaikan)) — perlu script koreksi terpisah dengan
  persetujuan pemilik data.
- Stock opname, kasbon, dan surat jalan masih belum dijurnal.
- DP double-posting: `create_transaction` tetap membuat jurnal Kas sendiri dan juga
  memicu `trigger_auto_journal_payment` lewat insert `transaction_payments`.
- **Pemetaan akun laba di mode offline (SQLite) terbalik** dibanding web:
  `src/services/sqlite/finance.ts` mengkredit `3-3100` dengan laba **terealisasi** dan
  `3-3200` dengan laba **belum terealisasi**, sedangkan backend Postgres memakai
  `3-3100` = Laba Piutang (akrual, ditulis `close_period`) dan `3-3200` = Laba
  Direalisasi (ditulis `auto_update_realized_profit`). Akibatnya saldo kedua akun
  bisa berbeda antara data yang lahir di Android dan data yang lahir di web.
  Perlu migrasi/normalisasi data + perbaikan mirror, bukan bagian migrasi seed ini.
