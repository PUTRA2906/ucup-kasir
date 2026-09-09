# Issues — Modul Pembelian (Purchasing)

Hasil audit logika fitur pembelian tanggal 2026-09-09.
Cakupan: PO → GRN → PI → Pembayaran → Retur, baik jalur Supabase (RPC di
`supabase/migrations/20260901_purchasing_module.sql`) maupun mirror offline
(`src/services/sqlite/purchasing.ts`).

Status kolom: `OPEN` = belum diperbaiki. Perbarui menjadi `FIXED` + nomor commit setelah dikerjakan.

---

## P1 — Retur pembelian tidak mengurangi sisa tagihan PI

**Status:** OPEN · **Dampak:** uang/hutang salah di laporan · **Skenario:** S14

`create_purchase_return` (SQL ~baris 728–820) membuat jurnal reversal
(Debit Utang Usaha / Kredit Persediaan) tetapi **tidak pernah mengupdate**
`remaining_amount`, `paid_amount`, atau `payment_status` di
`purchase_invoices`, meskipun retur menyimpan `p_pi_id`.

**Reproduksi:**
1. Buat PO 10 pcs × Rp10.000 → GRN 10/10 → PI (total Rp100.000).
2. Retur 3 pcs cacat → jurnal bilang utang turun Rp30.000.
3. Buka detail PI → `remaining_amount` tetap Rp100.000.

**Aktual:** layar PI tetap menagih penuh; saldo buku besar ≠ sisa tagihan.
**Expected:** `remaining_amount -= total_refund` (untuk retur yang menaut PI),
`payment_status` dihitung ulang; jika PI sudah lunas, retur membuat posisi jadi
"piutang ke supplier" — putuskan kebijakan (auto-refund atau flag).

**Catatan perbaikan:** cerminin juga di `src/services/sqlite/purchasing.ts`
(jalur offline dibuat + saat push sync).

---

## P2 — Retur fiktif: qty retur tidak divalidasi terhadap qty diterima

**Status:** OPEN · **Dampak:** bisa disalahgunakan untuk menghapus hutang · **Skenario:** S15

Tidak ada validasi `quantity retur ≤ quantity_received` di GRN/PI terkait.
Stok di-clamp `GREATEST(stock - v_qty, 0)` (SQL ~baris 789), jadi retur berlebih
tidak menimbulkan error stok — hanya jurnal utang yang turun penuh.

**Reproduksi:**
1. Beli 10 pcs, buat PI Rp100.000.
2. Retur manual 100 pcs → lolos.
3. `total_refund` = Rp1.000.000; jurnal Debit Utang Rp1.000.000; stok diam-diam
   di-clamp ke 0 (kehilangan stok nyata tanpa jejak).

**Expected:** RPC menolak retur dengan qty > jumlah diterima pada GRN referensi
(validasi via `p_grn_id` / `grn_items`, atau vs `pi_items` bila menaut PI);
form `PurchaseReturnForm.vue` membatasi input qty per baris.

---

## P3 — Barang rejected menambah nilai persediaan di jurnal tapi tidak di stok

**Status:** OPEN · **Dampak:** neraca overstatement · **Skenario:** S7

`create_goods_receipt`: stok naik hanya `v_qty_received` (SQL ~502–507), tapi
`grn_items.subtotal` dan jurnal Debit Persediaan = `(received + rejected) × price`
(SQL ~487, 553). Barang rusak menambah aset persediaan di pembukuan padahal
secara fisik tidak ada.

**Expected:** putuskan perlakuan rejected:
- opsi A: jangan diakui sebagai persediaan (jurnal = received × price; subtotal
  GRN memisahkan nilai reject), atau
- opsi B: rejected masuk "stok reject" terpisah + jurnal beda (mis. Rugi Barang
  Rusak).
Konsistenkan formula GRN subtotal ↔ jurnal ↔ stok.

---

## P4 — create_goods_receipt tidak membuat jurnal hutang

**Status:** OPEN · **Dampak:** buku besar tidak mencatat utang pembelian · **Skenario:** S8

Dokumen migrasi menulis "GRN = auto-stok + **auto-jurnal**", dan fungsi
`create_purchase_invoice` memang **tidak membuat jurnal sama sekali**
(SQL ~567–636) — padahal di situlah `p_discount`, `p_tax`, `p_shipping_cost`
dibawa. Akibat:
- Utang usaha muncul dari sisi GRN (P3), tagihan muncul dari sisi PI → saat ada
  rejected, `PI.total < Utang Usaha` dan selisihnya tidak pernah lunas.
- Pajak, diskon, ongkos dari faktur supplier tidak pernah dijurnal.

**Expected:** pindahkan (atau tambahkan) jurnal pengakuan hutang ke
`create_purchase_invoice` dengan nilai `PI.total`; GRN idealnya jurnal mutasi
stok saja — pilih satu kebijakan akuntansi lalu dokumentasikan di header
migrasi.

---

## P5 — Diskon/pajak/ongkir PO hilang di jalur web (divergensi web ↔ offline)

**Status:** OPEN · **Dampak:** total PO beda antara Supabase dan SQLite · **Skenario:** S2, S19

- RPC `create_purchase_order` tidak punya parameter `p_discount/p_tax/p_shipping`
  dan selalu `total = subtotal` (SQL ~427).
- Mirror SQLite menghitung `total = subtotal − discount + tax + shipping`
  (`src/services/sqlite/purchasing.ts` ~baris 233).
- `PurchaseOrderInput` (`src/types/database.ts:339`) **mendeklarasikan**
  `discount/tax/shipping_cost`, jadi UI boleh mengisinya tapi web mengabaikannya.

**Expected:** tambahkan parameter ke RPC + mapping di `src/services/purchasing.ts`,
atau hapus field dari input & UI bila PO memang tidak mendukung biaya tambahan.
Yang mana pun, kedua jalur harus identik.

---

## P6 — Header `total` PO ≠ SUM(subtotal items) saat ada diskon item

**Status:** OPEN · **Dampak:** data tidak konsisten · **Skenario:** S3

Di loop item `create_purchase_order` (SQL ~405–424): `v_subtotal` header
diakumulasi dari `qty × price` **sebelum** diskon, tapi `po_items.subtotal`
disimpan **setelah** dikurangi diskon. Jika ada item berdiskon, header total
lebih besar daripada jumlah barisnya.

**Expected:** `v_subtotal += v_subtotal_item - v_discount` (akumulasi nilai
setelah diskon).

---

## P7 — Retur tidak mengubah `po_items.received_quantity`; rejected ikut dihitung "diterima"

**Status:** OPEN · **Dampak:** status PO salah, memblokir perbaikan P1/P2 · **Skenario:** S17

- `create_goods_receipt` menulis `received_quantity += received + rejected`
  (SQL ~513) — barang rusak dihitung sebagai selesai diterima.
- `create_purchase_return` tidak pernah mengurangi `received_quantity`, jadi PO
  tetap `completed`/over-received meski barangnya sudah diretur.

**Expected:** `received_quantity` hanya menambah `received`; retur mengurangi
`received_quantity` pada baris terkait (butuh tautan
`purchase_return_items → grn_item/po_item` — kemungkinan perlu migrasi kolom).

---

## P8 — Nomor dokumen tanpa constraint UNIQUE (rawan duplikat)

**Status:** OPEN · **Dampak:** integritas data · **Skenario:** S4

`PO-/GRN-/PI-/PR- + YYYYMMDD + substr(md5(random()),1,6)` — hanya 6 karakter
hex per hari, tanpa `UNIQUE` di `po_number/grn_number/pi_number/pr_number`.
Tabrakan mungkin terjadi dan tidak akan tertolak.

**Expected:** `UNIQUE (user_id, xxx_number)` + retry pada konflik, atau nomor
urut harian per user (seperti modul transaksi).

---

## P9 — Pembayaran PI tidak bisa retrospektif (tanpa tanggal pembayaran)

**Status:** OPEN · **Dampak:** usability pelaporan · **Skenario:** S12 terkait

`add_pi_payment` tidak menerima parameter tanggal; `pi_payments` tidak punya
kolom `paid_at`; jurnal selalu `entry_date = now()` (SQL ~709). Pembayaran bulan
lalu tidak bisa di-backdate — laporan keuangan per periode ikut salah.

**Expected:** tambah kolom `paid_at timestamptz` + parameter `p_paid_at`,
dipakai untuk `journal_entries.entry_date`.

---

## P10 — `deletePurchaseOrder` boleh pada PO non-draft, tanpa cek relasi

**Status:** OPEN · **Dampak:** jejak audit hilang · **Skenario:** S20 terkait

`src/services/purchasing.ts` `deletePurchaseOrder` (baris 181–187) menghapus
langsung tanpa cek status dan tanpa RPC. Menghapus PO yang sudah punya GRN
meninggalkan `goods_receipts.po_id NULL` (ON DELETE SET NULL) — dokumen anak
yatim tanpa jejak.

**Expected:** RPC `delete_purchase_order` yang menolak hapus bila sudah ada
GRN/PI, atau soft-cancel (`status = 'cancelled'`) sebagai satu-satunya jalur
untuk PO non-draft.

---

## Lampiran — Skenario uji audit (S1–S20)

**PO**
- S1 ✅ PO 1 item tanpa diskon → `total = subtotal`.
- S2 ⚠️ PO dengan discount/tax/shipping → total web vs hasil sync offline harus sama (P5).
- S3 ⚠️ PO dengan diskon per item → `total = SUM(items.subtotal)` (P6).
- S4 ⚠️ 50 PO berturut-turut → tidak ada `po_number` kembar (P8).

**GRN**
- S5 ✅ Terima penuh 10/10, rejected 0 → stok +10, PO `completed`.
- S6 ✅ Terima sebagian 6/10 → PO `partial`.
- S7 ⚠️ 10 diterima + 2 rejected → stok hanya +10; cek nilai jurnal persediaan (P3).
- S8 ⚠️ Lanjutan S7 → `PI.total` vs saldo Utang Usaha di jurnal (P3/P4).
- S9 ✅ GRN tanpa referensi PO → tetap buat stok + jurnal.

**PI & pembayaran**
- S10 ✅ PI dari GRN, bayar penuh → `lunas`, `remaining = 0`.
- S11 ✅ Bayar sebagian 2× → `sebagian`, akumulasi benar.
- S12 ✅ Overpay > sisa → ditolak RPC.
- S13 ✅ Bayar ke PI milik user lain → ditolak.

**Retur**
- S14 ⚠️ Retur 3 pcs dari PI berjalan → `remaining_amount` PI turun (P1).
- S15 ⚠️ Retur 100 pcs dari pembelian 10 → ditolak RPC (P2).
- S16 ✅ Retur 1 pcs cacat dari GRN 10 → stok −1, jurnal reversal 1×price.
- S17 ⚠️ Setelah S16 → `po_items.received_quantity` / status PO menyesuaikan (P7).

**Lintas-lapisan / keamanan**
- S18 ✅ Isolasi antar-user di semua tabel (RLS).
- S19 ⚠️ Semua skenario dijalankan di mode SQLite → hasil stok & jurnal identik dengan Supabase (P5, dan seluruh P1–P7).
- S20 ✅ RPC `SECURITY DEFINER` tidak bisa dipakai membuat dokumen untuk `user_id` lain lewat manipulasi payload.

---

## Checklist verifikasi setelah perbaikan

- [ ] S14: retur menurunkan `remaining_amount` PI (P1)
- [ ] S15: retur > qty diterima ditolak RPC (P2)
- [ ] S12: overpayment tetap ditolak (regresi)
- [ ] S2/S19: total PO identik web vs SQLite setelah sync (P5)
- [ ] S3: `po.total = SUM(items.subtotal)` (P6)
- [ ] S7/S8: stok fisik = nilai jurnal persediaan; utang = tagihan saat tidak ada rejected (P3/P4)
- [ ] Jalur offline SQLite menghasilkan angka identik untuk semua skenario di atas
