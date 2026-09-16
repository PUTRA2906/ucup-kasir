# AUDIT ALUR MODUL FINANCE - UCUP KASIR
**Tanggal Audit:** 16 September 2026 (audit pertama modul finance)
**Cakupan:** COA, jurnal manual & otomatis, RPC akuntansi, laporan (Buku Besar, Neraca Saldo, Neraca, Arus Kas), paritas web vs Android (SQLite), pipeline sync
**Auditor:** Claude Code

> **Metode:** audit statis kode + **verifikasi langsung terhadap database Supabase live** (`pg_proc`, data transaksi/jurnal aktual). Semua temuan F1–F3 di bawah **bukan hipotesis** — sudah dikonfirmasi dari isi fungsi yang terpasang dan data produksi.

---

## RINGKASAN EKSEKUTIF

Modul finance dirancang dengan baik di atas kertas: double-entry divalidasi server (`post_journal`), RLS di semua tabel, auto-journal saat transaksi/pembayaran/retur/void, paritas offline cukup lengkap (mirror JS `postSalesJournal` dst. dengan routing Bank + pembulatan + validasi).

**Tapi rangkaian migrasi 15 September (20260915_*) merusak jantung sistemnya**, dan kerusakannya **sedang terjadi di data produksi sekarang**:

1. 🔴 **F1 — Pembayaran cicilan tidak lagi membuat jurnal.** `add_transaction_payment` versi 0915 **menggantikan** (identitas argumen sama) versi 0912 yang memiliki blok jurnal Kas↔Piutang. Terkonfirmasi live: fungsi terpasang `has_journal=false`, dan **ketiga pembayaran tanggal 16 Sep tidak punya jurnal** (yang 5 pembayaran s/d 15 Sep masih punya — migrasi dieksekusi malam 15 Sep).
2. 🔴 **F2 — Dua overload `create_transaction` hidup bersamaan.** Web memanggil versi 9-param (0912: ada jurnal + routing Bank, **tanpa alokasi item**); versi 7-param (0915: ada `allocate_payment_to_items`, **tanpa jurnal**) hanya terpanggil dari Android. Akibatnya **tabel `transaction_item_payments` nyaris kosong di produksi (5 baris total untuk seluruh riwayat)** — fitur FIFO yang jadi dasar laporan laba per-item (audit laporan, N1/N7) praktis mati di web.
3. 🔴 **F3 — Jurnal jadi yatim (orphan) saat transaksi dihapus.** `delete_transaction` versi 0915 menghapus bersih blok pembersihan jurnal; `journal_entries.reference_id` tanpa FK. Sudah terjadi: **2 jurnal orphan** di produksi (`JRN-20260915-7ZNXKY`, `JRN-20260915-TAYNGV`).
4. ⚠️ **Buku besar tidak bisa direkonsiliasi dengan operasional:** saldo Piutang (1-1100) di jurnal posted = **Rp 3.019.000**, sedangkan `remaining_amount` aktual = **Rp 25.618.000** — selisih **Rp 22,6 juta**. Sebagian historis (transaksi pra modul 0901), tapi F1 memperlebarnya setiap hari.

**Skor Integritas Akuntansi: 4/10** — arsitektur benar, tetapi pipeline produksi saat ini **membukukan lebih sedikit uang dari yang sebenarnya berputar**, dan tidak ada satu pun mekanisme rekonsiliasi yang menyadarinya.

---

## TABEL TEMUAN

| # | Temuan | Prioritas | Status verifikasi |
|---|--------|-----------|-------------------|
| F1 | `add_transaction_payment` live tanpa jurnal — pembayaran sejak 15 Sep buta pembukuan | 🔴 Kritis | **Terkonfirmasi live** (`prosrc` tanpa `journal`; 3/3 payment 16 Sep tanpa jurnal) |
| F2 | Dua overload `create_transaction` koeksisten; web pakai yang tanpa alokasi item → `transaction_item_payments` mati | 🔴 Kritis | **Terkonfirmasi live** (2 overload di `pg_proc`; 5 baris alokasi total) |
| F3 | `delete_transaction` live tidak membersihkan jurnal → orphan journals (tanpa FK) | 🔴 Kritis | **Terkonfirmasi live** (2 orphan nyata di data) |
| F4 | Selisih buku vs operasional: Piutang jurnal 3,0 jt vs aktual 25,6 jt | 🔴 (akibat F1+F3+historis) | Terkonfirmasi via agregasi SQL |
| F5 | Paritas: Android membukukan jurnal lokal (JS) tapi tak mengalokasi item; web sebaliknya — dua sisi rusak berbeda | ⚠️ Tinggi | Analisis kode + live |
| F6 | `create_return` live: `SELECT ... INTO` tanpa `LIMIT` baris 121 → harga produk baris pertama dipakai diam-diam untuk retur baris lain | ⚠️ Tinggi | **Terkonfirmasi live** (`has_limit=false`) |
| F7 | `voidJournal` tak terpakai: ada di service+RPC, tidak diekspos store, nol tombol di UI; satu-satunya koreksi = hard delete | ⚠️ Tinggi | grep `src/views/Finance/` = 0 void |
| F8 | Tanggal jurnal offline: `entry_date` disimpan UTC (`now.split('T')[0]`), filter periode SQLite bandingkan string lokal naive → geser 7 jam | ⚠️ | kode `sqlite/finance.ts` |
| F9 | COA hilang: web `IF ... IS NOT NULL` = skip jurnal **senyap**; Android **throw** — perilaku beda platform | 🟡 | `20260901:493` dst. vs `sqlite/finance.ts` |
| F10 | `getCashFlow` hardcode `.in('code', ['1-1000','1-1010'])` | 🟡 | `finance.ts` arus kas |
| F11 | `getAccountBalances` fetch SEMUA baris posted s/d endDate lalu loop client O(accounts×lines) | 🟡 | `finance.ts:135+` |
| F12 | 39 fungsi `SECURITY DEFINER` executable oleh role `anon` (incl. `post_journal`, `create_transaction`) + view definer (advisor Supabase) | 🟡 Keamanan | `get_advisors` live |

---

## 1. 🔴 F1+F2+F3: AKAR MASALAH — IDENTITAS OVERLOAD PADA RANTAI MIGRASI

### 1.1 Fakta terpasang di database live (ditarik langsung dari `pg_proc`)

```
add_transaction_payment (4-param)   : has_journal=FALSE, has_allocate=TRUE   ← versi 0915
create_transaction (7-param)        : has_journal=FALSE, has_allocate=TRUE   ← versi 0915
create_transaction (9-param)        : has_journal=TRUE,  has_allocate=FALSE  ← versi 0912, MASIH HIDUP
delete_transaction                  : has_journal_cleanup=FALSE              ← versi 0915
create_return                       : SELECT INTO tanpa LIMIT                ← versi 0915 (fix split)
```

`CREATE OR REPLACE FUNCTION` dengan daftar argumen berbeda **tidak menimpa** fungsi lama — ia **menambah overload baru**. Yang menimpa hanya yang identitas argumennya persis sama. Rantai 0901→0912→0915 tidak menyadari ini:

| Fungsi | 0912 (journal+Bank) | 0915 (alokasi item) | Yang terjadi |
|---|---|---|---|
| `add_transaction_payment(4)` | ✔ jurnal Kas/Bank↔Piutang | ✔ alokasi FIFO, ✘ jurnal | **0915 MENGGANTIKAN 0912** (identitas sama) → jurnal hilang |
| `create_transaction` | 9-param: jurnal, tanpa alokasi | 7-param: alokasi, tanpa jurnal | **KO-EKSISTEN** — client memilih via kelengkapan argumen |

`src/services/transactions.ts`:
- baris 39 → `rpc('add_transaction_payment', {p_transaction_id, p_amount, p_payment_method, p_notes})` → cocok 4-param **tanpa jurnal**
- baris 51–60 → kirim `p_return_amount` + `p_transaction_date` → resolve ke **9-param (ada jurnal, tanpa alokasi)**

**Bukti produksi:** 8 payment sejak 15 Sep → hanya 5 yang ter-jurnal, kelimanya terjadi SEBELUM migrasi dieksekusi malam itu; 3 payment tanggal 16 Sep semuanya `ada_jurnal=false`. `transaction_item_payments` = **5 baris untuk SELURUH basis data** — alokasi hampir tidak pernah terbentuk sejak fitur itu dibuat, persis tabel yang dilaporkan audit laporan (N1/N2/N7) baca sebagai "laba terealisasi per-item".

### 1.2 Dampak gabungan

- **Arus Kas** understated setiap cicilan yang dibayar (Kas tidak pernah di-debit di buku).
- **Neraca**: Piutang membeku di nilai saat penjualan — padahal customer sudah bayar. Selisih kini Rp 22,6 jt (F4).
- **Laporan laba per-item (web)**: `paidByItem` kosong → `realized = 0` **bukan** fallback 50% (query sukses!) → under-report total, memperparah N1/N7 audit laporan.
- **Jurnal orphan**: transaksi dihapus → jurnal `transaction`/`payment`/`void` tinggal; Neraca Saldo tetap balance tapi isinya fiktif (2 kasus nyata).

### 1.3 Rekomendasi perbaikan (satu migrasi konsolidasi)

```sql
-- 2026091x_consolidate_transaction_functions.sql
-- 1. DROP KEDUA overload create_transaction lama, CREATE ULANG SATU versi 9-param:
--    jurnal (0912 lengkap dengan routing Bank) + PERFORM allocate_payment_to_items (0915).
--    Hapus drop-then-recreate parsial; jangan pernah menyisakan overload.
-- 2. add_transaction_payment: kembalikan blok jurnal Kas/Bank↔Piutang (copy 0912 @288-298)
--    KE DALAM versi 0915 yang sudah ber-alokasi. Satu fungsi, dua kemampuan.
-- 3. delete_transaction: kembalikan penghapusan jurnal reference_type IN
--    ('transaction','payment','void') (copy 0901 @919-961) + cleanup transaction_item_payments.
-- 4. Backfill data:
--    a. Hapus/void 2 jurnal orphan yang ada.
--    b. Jalankan allocate_payment_to_items() ulang untuk semua payment historis tanpa alokasi.
--    c. Buat jurnal Kas↔Piutang untuk payment sejak migrasi 0915 yang belum ter-jurnal
--       (minimal 3 payment 16 Sep; audit manual sebelum insert).
```

**Verifikasi pasca-fix:** query `EXISTS(journal reference payment)` harus 100% untuk payment baru; `count(transaction_item_payments) ≈ count(paid items)`.

**Pencegahan:** tambahkan langkah CI/grep: sebelum menulis `CREATE OR REPLACE FUNCTION`, wajib `DROP FUNCTION IF EXISTS` SEMUA overload lama fungsi itu (`SELECT` dari `pg_proc` dulu), dan simpan daftarnya di header migrasi. Rantai 0901/0907/0909/0911/0912/0915 menumpuk overload di banyak fungsi — perlu audit `pg_proc` penuh sekali jalan (banyak proname, mis. trigger-notification helpers, bisa jadi duplikat juga).

---

## 2. ⚠️ F5: PARITAS WEB vs ANDROID RUSAK DI DUA SISI BERLAWANAN

| Aspek | WEB (Supabase) | ANDROID (SQLite offline) |
|---|---|---|
| Jurnal penjualan | ✔ via overload 9-param (+ routing Bank) | ✔ via `postSalesJournal` JS (throw jika COA kosong) |
| Jurnal pembayaran cicilan | ✘ **hilang sejak F1** | ✔ `postPaymentJournal` JS |
| Alokasi FIFO item | ✘ overload 9-param tak memanggilnya (F2) | ✘ `allocatePaymentToItems` lokal TIDAK di-queue (audit laporan N7) |
| Delete transaksi | ✘ jurnal ditinggal orphan (F3) | ✔ `DELETE journal_*` lokal (sqlite/transactions.ts:465-470) |

Skenario nyata: kasir cicil di Android → buku lokal benar, tapi saat sync jurnal naik via `genericUpsert` (tanpa validasi `post_journal`) dan alokasi tidak naik sama sekali; bayar cicilan di web → stok/piutang beres, buku tidak mencatat. **Tidak ada satu pun jalur yang benar kedua sisinya.**

**Catatan positif:** tabel finance (`chart_of_accounts`, `journal_entries`, `journal_lines`) SUDAH lengkap di `DOWNLOAD_TABLES` (syncEngine.ts:62-64), upload queue (921-928), `CHILD_EMBEDDED_KEYS: 'lines'` (850) + `CHILD_FK_RELS` (576) — pipeline sync jurnal-nya sehat; berbeda dengan N7 yang bolong total. Masalahnya murni di hulu (F1–F3) dan validasi upsert mentah: jurnal tak seimbang bisa lolos server bila bug di JS mirror — pertimbangkan validasi ulang saldo di sisi server saat menerima `journal_entries` status posted.

---

## 3. ⚠️ F6: `create_return` — harga salah diam-diam untuk retur multi-line

`20260915_fix_return_journal_split.sql:121` (versi terpasang live):

```sql
SELECT product_name, price INTO v_product_name, v_price
FROM transaction_items
WHERE transaction_id = p_transaction_id AND product_id = v_product_id;
```

PL/pgSQL `SELECT INTO` dengan >1 baris **tidak error — mengambil baris pertama dan membuang sisanya**. Jika produk yang sama dijual 2 baris dengan harga berbeda (tier/diskon baris), baris retur ke-2 dibukukan dengan harga baris pertama → jurnal retur (Pendapatan debit) nilainya salah, selisih tak terdeteksi karena split Kas/Piutang memakai `v_total_refund` yang benar. Fix: `ORDER BY price LIMIT 1`? Bukan — benar: `return_items` harus menyimpan `transaction_item_id` (sama seperti rekomendasi N4 audit laporan) lalu lookup by id.

Split itu sendiri (`v_portion_piutang := LEAST(v_total_refund, remaining)` di header fix) **sudah benar** dan identik dengan mirror JS offline (`refundFromAr = min(totalRefund, remainingAmount)`) — bagian ini lolos audit.

---

## 4. ⚠️ F7: VOID JURNAL ADA TAPI TAK BISA DIPAKAI

- RPC `void_journal` live ✔, service `finance.ts:voidJournal` ✔
- `src/stores/finance.ts` **tidak mengekspos** `voidJournal`
- `src/views/Finance/` **nol** pemanggil void; JournalDetail.vue:210-223 hanya punya **Hapus permanen** dengan confirm

Dampak: jurnal manual yang salah **harus di-hard-delete** (audit trail musnah — CLAUDE.md & praktik akuntansi menuntut void, bukan hapus), sementara jurnal otomatis hasil transaksi tidak punya proteksi sama sekali di UI (delete langsung ke baris posted). Rekomendasi:
1. Expose `voidJournal` di store + tombol "Batalkan" di JournalDetail (pakai `useConfirm`).
2. Batasi hard-delete ke status `draft`/`manual` saja; blokir delete jurnal `reference_type != 'manual'` (koreksi lewat void_transaction flow).
3. Kolom status `void` sudah ditangani laporan (filter `status='posted'` di service ✔, dan offline ✔).

---

## 5. ⚠️ F8: ZONA WAKTU TANGGAL JURNAL OFFLINE

Bug yang sudah diberantas di laporan (revisi 2 audit) **masih hidup di finance SQLite**:
- `sqlite/finance.ts` & `sqlite/transactions.ts:484`: nomor/`entry_date` jurnal dibuat dari `new Date().toISOString()` → sebelum jam 07:00 WIB, jurnal "hari ini" tertanggal kemarin.
- Filter periode (`getJournals`, ledger, balance): string batas lokal (`startDate`/`endDate+'T23:59:59'`) dibandingkan dengan kolom TEXT yang menyimpan ISO ber-'Z' → perbandingan string antar-format = geser 7 jam di kedua ujung rentang.

Versi web sudah benar (entry_date dikirim sebagai instant `T00:00:00` lokal → kolom `timestamptz`; filter `endDate+'T23:59:59.999'` dikonversi lokal → live audit JournalForm.vue:256 ✔). Fix offline: pakai helper `@/utils/date` saat menyimpan & membandingkan (simpan `entry_date` sebagai `'YYYY-MM-DD' + waktu lokal` atau bandingkan via `date()` SQLite dengan offset).

---

## 6. TEMUAN RINGKAS LAINNYA

- **F9 (🟡) COA tidak ter-seed:** web = blok `IF v_account IS NOT NULL` → transaksi sukses, jurnal nihil **tanpa sinyal** (20260901:493,577,757); Android = `throw` → user tahu. Konsisten-kan: minimal tulis ke `eventLog`/notifikasi saat skip. Live saat ini aman (34 akun ter-seed).
- **F10 (🟡) `getCashFlow` hardcode kode `1-1000`/`1-1010`:** rename/pivot akun Kas memutus arus kas tanpa error. Simpan flag `is_cash_account` di COA atau baca dari store settings.
- **F11 (🟡) Skala:** `getAccountBalances` menarik semua baris posted s/d endDate (145+) — cukup utk 66 jurnal sekarang, O(n) tumbuh; hitung agregat via SQL function/RPC saat baris > ~10rb.
- **F12 (🟡) Permukaan RPC:** advisor Supabase menandai **39 fungsi SECURITY DEFINER callable oleh `anon`** (termasuk `post_journal`, `create_transaction`, `void_journal`) + view `transaction_items_payment_summary` definer. Kebanyakan gagal aman karena `auth.uid()` null → `user_id NOT NULL` menolak, tapi ini defense-by-accident. `REVOKE EXECUTE ... FROM anon` untuk yang tidak dipakai publik.
- **Payroll:** `post_payroll_journal` live (1 overload, ✔ ada `RAISE EXCEPTION` bila akun Hutang Gaji belum ada — lebih jujur dari F9) + mirror JS offline per slip ✔. `add_pi_payment` purchasing juga membuat jurnal ✔ (GRN: Persediaan debit ↔ Utang usaha credit, 20260901_purchasing:546-557). Tidak ada temuan baru di jalur ini selain F12.
- **Laporan UI:** TrialBalance.vue & BalanceSheet.vue solid — normal-balance per tipe akun, selisih kolom via `abs()`, toleransi pembulatan < 0.51, `localDateFromIso` untuk tampilan ✔. Jurnal posted dijamin seimbang oleh `post_journal` (round 2 desimal) → Neraca selalu balance selama F3 tidak menambah fiksi.

---

## 7. ALUR TERKINI (UPDATED — sesuai kondisi live)

```
TRANSAKSI (tunai/kredit)
  ├─ WEB  → rpc 9-param (0912)   : JURNAL ✔(+Bank)  | alokasi item ✘(F2)
  └─ ANDROID → sqlite/transactions → postSalesJournal JS → sync via genericUpsert
                                        (entry_date UTC — F8)
CICILAN
  ├─ WEB  → rpc 4-param (0915)   : alokasi ✔ | JURNAL ✘ (F1)   ← buku buta kas masuk
  └─ ANDROID → postPaymentJournal JS ✔ → queue → upsert ✔
RETUR
  └─ create_return (0915)        : split Kas/Piutang ✔ | harga multi-line ✘ (F6)
HAPUS TRANSAKSI
  ├─ WEB  → delete_transaction   : stok ✔, item-payments ✔, JURNAL TINGGAL (F3→orphan)
  └─ ANDROID → hapus jurnal lokal ✔ → DELETE header sync; cascade server ✔
LAPORAN (trial balance, neraca, arus kas, buku besar)
  └─ logika ✔ — tapi memvisualkan buku yang TIDAK lengkap (F1+F3+F4)
```

---

## 8. REKOMENDASI — PRIORITAS

### Priority 0: MINGGU INI (mencegah pembukuan makin bocor)
1. **Migrasi konsolidasi F1+F2+F3** (bagian 1.3 langkah 1–3) — jangan digabung dengan backfill dulu; uji di branch DB.
2. **Blokir hard-delete jurnal non-manual + expose voidJournal** (F7) — 0,5 hari, proteksi audit trail.

### Priority 1: MINGGU BERIKUTNYA
3. **Backfill F4**: jurnal payment yang hilang sejak 15 Sep, re-allocate item historis, bersihkan 2 orphan (langkah 1.3 no.4) + laporan rekonsiliasi Piutang (saldo 1-1100 vs Σ remaining_amount) sebagai query jalan.
4. **F6**: `transaction_item_id` di `return_items` (barengi N4 audit laporan — satu perubahan, dua audit).
5. **F8**: helper `@/utils/date` untuk seluruh jalur tanggal SQLite finance.

### Priority 2
6. F9 (flag/eventLog saat skip jurnal), F10 (flag kas di COA), F12 (`REVOKE FROM anon` + fix view definer), F11 (agregasi SQL).
7. **Kebijakan migrasi fungsi**: wajib enumerasi overload `pg_proc` sebelum replace + catatan "functions dropped" di header setiap migrasi; pertimbangkan konsolidasi penuh `create_transaction` ke SATU tanda tangan (semua pemanggil — web dan sync Android — wajib versi 9-param).

---

## 9. KESIMPULAN

### Positif
✅ Fondasi double-entry benar: validasi saldo di `post_journal`, ownership check, status posted/draft/void, RLS konsisten
✅ Pipeline sync tabel finance lengkap (embed lines + defer FK) — kontras dengan N7 di laporan
✅ Laporan UI (Neraca Saldo/Neraca) dihitung dengan hati-hati (toleransi, normal balance, tanggal lokal)
✅ Sisi purchasing & payroll tidak menemukan regresi serupa

### Negatif
🔴 Modul yang seharusnya menjadi *buku kebenaran* justru **sedang under-book kas & piutang di produksi** (F1, F4) — dan tidak ada rekonsiliasi yang membunyikan alarm
🔴 Rantai migrasi 0915 adalah pelajaran proses: overload koeksisten diam-diam; fix satu bug (split retur) melahirkan tiga regresi lebih besar
⚠️ Fitur unggulan (FIFO laba per-item) mati di sisi yang paling sering dipakai (web) — terhubung langsung dengan N7 audit laporan

### Skor Integritas Akuntansi: **4/10**
Arsitektur & validasi 8/10; kondisi data & pipeline produksi saat ini 2/10. Setelah Priority 0+1 selesai dan backfill tervalidasi, realistis naik ke 8/10.

---

## 10. LANGKAH SELANJUTNYA

1. Buat branch DB Supabase → terapkan migrasi konsolidasi → jalankan ulang skenario transaksi/cicilan/retur → bandingkan `pg_proc` + jumlah jurnal (script verifikasi sudah ada di bagian 1.3).
2. Sebelum merge ke produksi: putar query F4 rekonsiliasi sebagai gate ("selisih Piutang buku vs operasional harus < Rp 100rb setelah backfill").
3. Re-audit setelah Priority 1; sinkronkan temuan dengan AUDIT_ALUR_LAPORAN.md (N7/N1/N2 menunggu F2 diperbaiki — kalau tidak, fix laporan membaca tabel yang tetap kosong).

---

**Dokumen ini bersifat CONFIDENTIAL dan hanya untuk internal tim development.**
