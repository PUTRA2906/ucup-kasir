# AUDIT LOGIKA SINKRONISASI SQLite ↔ SUPABASE - UCUP KASIR
**Tanggal Audit:** 15 September 2026
**Versi Aplikasi:** v1.0 (commit: 58033ed)
**Auditor:** Claude Code
**Cakupan:** `src/services/sync/syncEngine.ts`, `src/lib/sqlite.ts`, `src/lib/network.ts`, `src/services/sqlite/*.ts` (write-path), `src/services/index.ts` (routing), `src/stores/sync.ts`, `src/views/Auth/Signin.vue`, `src/views/Sync/DownloadScreen.vue`, `src/views/Settings/StoreSettings.vue`

---

## RINGKASAN EKSEKUTIF

Audit ini mengidentifikasi **celah logika pada fitur sinkronisasi offline-first** yang dapat menyebabkan **kehilangan data stok secara silent**, **data loss saat login ulang**, **race condition upload×download**, dan **inkonsistensi angka antara web dan Android**.

Ditemukan **8 isu utama** (4 merah/kritis, 3 oranye, 1 kuning) + sejumlah isu minor. Temuan #1–#4 **belum disadari** oleh `SYNC_AUDIT_REPORT.md` / `SYNC_SUMMARY.md` yang menyimpulkan sistem "siap diuji" — dokumen itu hanya mencatat isu atomicity dan asumsi last-write-wins.

### Temuan Utama:
- 🔴 **Stok & `stock_movements` tidak pernah di-upload** dari jalur transaksi/retur/adjustment/opname → cloud tidak tahu ada penjualan offline, ledger stok server bolong
- 🔴 **Login ulang men-truncate data lokal + clear queue TANPA upload-dahulu** → perubahan offline yang belum terkirim hilang diam-diam
- 🟠 **Tidak ada mutex** antara auto-upload startup, tombol full-sync, dan manual backup → race dengan download
- 🟠 **Download 43 tabel tidak atomic** → error di tengah meninggalkan DB terpotong separuh
- 🟠 **Logika web ≠ SQLite** pada operasi yang sama (contoh `void()`: web tidak kembalikan stok + status salah `'void'` vs `'batal'`)
- 🟡 Deteksi online rapuh (`navigator.onLine` saja) + tidak ada auto-upload saat koneksi pulih
- 🟡 Inkonsistensi write-path antar modul (induk-anak dua gaya, `shipping.ts` enqueue di dalam transaksi, payload parsial)
- 🟡 Asumsi "1 device, last-write-wins" bertentangan dengan realitas multi-perangkat RLS

---

## 0. ARSITEKTUR SYNC SAAT INI (base pemahaman)

### 0.1 Pemilihan backend — per-platform, bukan per-status-online

```
src/services/index.ts:44-58
  isNativeApp() ? sqliteXxxService : xxxService   // dievaluasi SEKALI saat module-load
```

- **Android SELALU SQLite** (offline-first), bahkan saat online — tidak pernah baca Supabase langsung; data segar hanya masuk lewat `downloadAllFromSupabase`.
- **Web SELALU Supabase** — SQLite tak pernah di-init (`main.ts:39-43`).
- `isOnlineNow()` **tidak** dipakai untuk memilih adapter — hanya di sync engine & store.

### 0.2 Dua alur sync (`syncEngine.ts`)

| Alur | Fungsi | Kapan |
|---|---|---|
| Download | `downloadAllFromSupabase()` | Login (native) + tombol full-sync. **Truncate total → isi dari Supabase.** |
| Upload perubahan | `uploadChangesToSupabase()` | Cold start (`main.ts:68`) + tombol manual. **Proses `sync_queue` → Supabase.** |
| Upload penuh | `uploadAllToSupabase()` | Tombol "Backup Sekarang" (`BackupStatus.vue`). **Full-table upsert snapshot lokal.** |

### 0.3 Write-path SQLite (mayoritas modul)

```
transaction(async (tx) => { ...tulis lokal, sync_status='pending'... })
  .then(async () => { addToSyncQueue(OPERASI, tabel, id, payload) })   // enqueue DI LUAR transaksi
```

### 0.4 Mekanisme upload

`genericUpsert` (`syncEngine.ts:940-965`): INSERT→`upsert(onConflict:'id')`, UPDATE→`update().eq('id')`, DELETE→`delete().eq('id')`. **Last-write-wins pada nilai absolut, TANPA memanggil RPC server, TANPA delta.**

> Model ini mengasumsikan implisit: *satu perangkat, cloud = kebenaran, dan setiap perubahan lokal naik utuh ke cloud sebelum perangkat lain menyentuh cloud.* Celah di bawah muncul karena asumsi ini dilanggar.

---

## 1. 🔴 ISSUE #1 — Stok & Mutasi Stok TIDAK Pernah Naik ke Supabase (kehilangan data silent)

### Fakta kode
Saat `transactions.create()` offline (`src/services/sqlite/transactions.ts`):
- `products.stock` **di-update lokal** (`:249-253`)
- `stock_movements` **di-insert lokal** (`:256-274`)
- tapi fase `.then()` (`:320-334`) **hanya meng-enqueue header `transactions` + jurnal** — baris `products` dan `stock_movements` **tidak pernah masuk `sync_queue`**.

Pola identik:
| Modul | Update stok lokal | Di-enqueue |
|---|---|---|
| Transaksi (`:249-274`) | ✅ `products.stock` | ❌ `transactions`+jurnal saja |
| Retur (`returns.ts`) | ✅ | ❌ `returns`+`transactions` saja |
| Adjustment (`stock.ts:169-216`) | ✅ | ❌ `stock_adjustments` saja |
| Opname (`stock.ts:297-323`) | ✅ | ❌ `stock_opnames` saja |
| GRN (`purchasing.ts:406-424`) | ✅ | ❌ `goods_receipts` saja |

Satu-satunya pemanggil `addToSyncQueue('...','products',...)` adalah CRUD produk itu sendiri (`products.ts:136,196,250,259,274`).

### Konsekuensi berantai
1. Penjualan offline mengurangi stok lokal, stok Supabase tetap lama. **RPC `create_transaction` (yang mengurus stok server) tidak pernah dipanggil** karena upload pakai INSERT header biasa.
2. `stock_movements` lokal **hilang saat login berikutnya** — `replaceAllMovements` = `DELETE FROM stock_movements` lalu isi dari server (`stock.ts:411`), dan ledger stok server bolong.
3. **Bahkan kalau baris `products` ikut di-upload**, `genericUpsert` UPDATE menimpa dengan angka stok lokal mentah (`syncEngine.ts:963`) — last-write-wins pada *nilai absolut*, bukan *delta*. Dua penjualan di dua waktu saling menimpa stok, bukan terakumulasi.

### Dampak
Angka stok adalah inti aplikasi kasir. Penyimpangan ini tak terlihat user sampai laporan/stok opname janggal.

### Rekomendasi
Queue baris `products` (atau lebih baik **delta pengurangan**) + `stock_movements` setiap transaksi/retur/adjustment/opname; atau routing upload memakai RPC increments alih-alih overwrite absolut. **Blocker data-integrity.**

---

## 2. 🔴 ISSUE #2 — Data Loss Saat Login Ulang dengan Queue Pending

### Fakta kode
Jalur login (terverifikasi):
```
Signin.vue:226-229  → router.push('/sync/download')   (tanpa upload-dahulu)
  → DownloadScreen.vue  onMounted → startDownload() → syncStore.downloadAll()
    → downloadAllFromSupabase()
       → truncate semua tabel + clearSyncQueue() (syncEngine.ts:331)
```
Komentar `syncEngine.ts:327-331` mengklaim queue aman dihapus "karena semua item sudah ada di Supabase" — **hanya benar jika upload jalan duluan.** Tombol "sinkronisasi penuh" memang upload→download (`StoreSettings.vue:1184→1195`), tapi **jalur login tidak**, dan **tanpa konfirmasi** apa pun.

### Skenario nyata
User rekap transaksi dalam keadaan offline → tutup app (queue belum ter-upload; auto-upload hanya cold-start + butuh online) → buka lagi, login (masih/sudah online) → download snapshot lama **menimpa** lokal + `clearSyncQueue()` **menghapus bukti perubahan**. **Transaksi hilang diam-diam, tanpa jejak.**

Startup upload di `main.ts:68` hanya menolong bila app dibuka lagi dalam sesi yang sama sebelum login ulang — dan justru menciptakan race dengan download (Issue #3).

### Rekomendasi
Sebelum truncate: upload queue pending dulu, atau minimal deteksi queue tidak kosong → tampilkan konfirmasi (pakai `ConfirmDialog`, bukan native) dengan opsi "Sinkronkan dulu sebelum download".

---

## 3. 🟠 ISSUE #3 — Race Upload × Download (tidak ada mutex)

### Fakta kode
Tiga pemicu bisa tumpang tindih tanpa guard apa pun:
- auto-upload startup (`main.ts:68`, `setTimeout` 1500ms)
- tombol `handleFullSync` (upload→download, `StoreSettings.vue:1184→1195`)
- `manualBackup` = `uploadAllToSupabase()` (full-table upsert, `syncEngine.ts:1029`)

### Tabrakan konkret
`uploadAllToSupabase` meng-upsert **snapshot lokal lama** sementara download baru menarik data lebih baru dari server → upsert `onConflict:'id'` menimpa balik data server yang lebih segar. `markAllSynced` (`syncEngine.ts:1047-1055`) lalu menghapus **seluruh queue** di akhir, termasuk item yang baru masuk selama proses berjalan.

### Rekomendasi
Mutex global `isSyncing` — tolak/antrekan operasi upload/download yang datang bersamaan (cek di ketiga entry store `sync.ts`).

---

## 4. 🟠 ISSUE #4 — Download Tidak Atomic (DB terpotong separuh)

### Fakta kode
`downloadAllFromSupabase` menjalankan 43× `replaceAll`, masing-masing bertransaksi sendiri (`lib/sqlite.ts:465-500`), tapi **tidak ada satu transaksi pembungkus** seluruh fase tulis. Error di tabel ke-20 → DB tertinggal setengah-snapshot (sebagian tabel sudah truncate, sebagian belum). `clearSyncQueue` (`:331`) hanya jalan kalau semua sukses, jadi queue tetap utuh — namun state data lokal sudah tidak konsisten.

`SYNC_SUMMARY.md` sudah mengakui: "jika download gagal di tengah, data bisa inconsistent — tidak ada partial recovery atau rollback."

### Rekomendasi
Bungkus fase tulis dalam satu transaksi besar (snapshot-restore bila gagal), atau staged download ke tabel temp lalu rename atomik.

---

## 5. 🟠 ISSUE #5 — Logika Bisnis Web ≠ SQLite (operasi sama, hasil beda)

### Fakta kode — contoh `void()` transaksi
| | Web (`services/transactions.ts:75-82`) | SQLite (`sqlite/transactions.ts:511-587`) |
|---|---|---|
| Status ditulis | `'void'` ❌ | `'batal'` ✅ |
| Kembalikan stok | ❌ tidak | ✅ ya |
| RPC server | ❌ tidak panggil `void_transaction` | replikasi manual lengkap |
| Void jurnal + reversal | ❌ tidak | ✅ ya |

Karena filter piutang/laba memakai `status != 'batal'`, transaksi yang di-void **dari web jadi "hantu"**: tetap dihitung piutang dan tetap mengurangi stok di laporan.

Catatan: web memakai `.update()` langsung padahal CLAUDE.md menyatakan transaksi HARUS lewat RPC (`void_transaction` ada di `supabase/migrations/20260818_void_transaction.sql` dan sudah mengembalikan stok + set `'batal'`).

### Rekomendasi
Web `void()` harus panggil RPC `void_transaction` dan set `'batal'`. Audit operasi lintas-platform lain untuk paritas perilaku.

---

## 6. 🟡 ISSUE #6 — Deteksi Online Rapuh + Tidak Ada Auto-Upload Saat Pulih

### Fakta kode
- `isOnlineNow()` hanya membaca `navigator.onLine` (`network.ts:43-45`), tanpa probe ke server. WiFi nyala tapi tanpa internet (captive portal / Supabase down) tetap terbaca "online" → guard `syncEngine.ts:116/391/998` lolos, lalu gagal dengan error mentah.
- **Tidak ada auto-upload berkala**: hanya cold-start + tombol manual. `setInterval` di `BackupStatus.vue:79` cuma membaca panjang queue untuk badge UI, tidak memicu upload.
- Event `online` kembali tidak memicu upload (`network.ts:18-19` hanya update ref). Queue bisa menua berhari-hari antar cold-start.

### Rekomendasi
Probe ringan ke Supabase untuk status; picu `uploadChanges()` pada event `online`; upload berkala bila queue > 0.

---

## 7. 🟡 ISSUE #7 — Inkonsistensi Write-Path Antar-Modul (rawan bug laten)

### 7.1 Relasi induk-anak — dua gaya berbeda
- **Embedded** di payload induk: `transactions` (`items`/`payments`), `returns` (`items`), `journal_entries` (`lines`), `stock_opnames` (`items`)
- **Terpisah** (anak punya item queue sendiri): `purchasing` (`po_items:270`, `grn_items:471`, `pi_items:611`, `purchase_return_items:811`) dan `shipping`

Engine menampung keduanya lewat dua peta yang harus dijaga sinkron manual (`CHILD_EMBEDDED_KEYS` vs `CHILD_FK_RELS`) — mudah tertinggal saat tambah modul.

### 7.2 `shipping.ts` enqueue DI DALAM transaksi
`shipping.ts:273-277, 342-346, 401-405, 440-444, 480-484` men-INSERT langsung ke `sync_queue` (bukan via `addToSyncQueue`) **di dalam** `transaction(...)`. Semua file lain enqueue **di luar** transaksi. Jika transaksi rollback, item queue tetap tertinggal → upload operasi yang sebenarnya batal.

### 7.3 Payload parsial tidak konsisten
`products.updateStock` → `{id, stock}` (`:274`); `finance.voidJournal` → `{id, status}` (`:301`); `hr.createLoanPayment` → loan hanya `{id}` (`:701`); `transactions.addPayment` → duplikasi (payment parsial `:414` + transaksi lengkap `:417`). UPDATE payload parsial berisiko menimpa/meninggalkan kolom lain tak sesuai.

### Rekomendasi
Satu pola induk-anak; `shipping.ts` pindahkan enqueue ke luar transaksi; payload selalu lengkap dari getter.

---

## 8. 🟡 ISSUE #8 — Asumsi "1 Device, Last-Write-Wins" vs Realitas Multi-Perangkat

`syncEngine.ts:42` menyatakan conflict resolution tidak perlu karena 1 device. Tapi Supabase + RLS mengizinkan beberapa perangkat login user sama. Tanpa LWW berbasis waktu/versi, dua perangkat mengubah baris sama → saling menimpa tanpa deteksi. Issue #1 (stok absolut) memperparah.

### Rekomendasi
Minimal tambahkan pembandingan `updated_at` sebelum upsert; untuk stok pakai delta, bukan overwrite.

---

## 9. ⚪ ISU MINOR

- **Paginasi download**: `fetchAllFromTable` (`.order('created_at').range()`, `syncEngine.ts:350-371`) bisa kehilangan/overlap baris saat ada `created_at` identik di batas halaman → order `created_at, id` atau `id`.
- **`useNetwork()` di luar komponen**: `main.ts:58` — `onMounted/onUnmounted` tak ter-registrasi, listener tak pernah di-detach (bocor minor).
- **Penomoran transaksi**: format SQLite vs server mirip tapi sumber random berbeda, 6-karakter (rawan tabrakan), tak pernah dilaraskan saat upload (`db.ts:53-59, 89-91`).

---

## 10. PRIORITAS PERBAIKAN

| Rank | Issue | Arah perbaikan | Dampak |
|---|---|---|---|
| 1 | #1 stok tak sinkron | Queue `products` (delta) + `stock_movements`; atau RPC increments | Data-integrity blocker |
| 2 | #2 data loss login | Upload-dahulu / konfirmasi sebelum truncate | Mencegah kehilangan transaksi |
| 3 | #3 race | Mutex global `isSyncing` | Mencegah penimpaan balik |
| 4 | #4 atomicity | Satu transaksi pembungkus / staged+rename | DB tak terpotong separuh |
| 5 | #5 paritas | Web `void()` pakai RPC + `'batal'`; audit operasi lain | Laporan piutang/laba benar |
| 6 | #6 online | Probe + auto-upload saat pulih + berkala | Queue tidak menua |
| 7 | #7 standarisasi | Satu pola induk-anak; shipping enqueue di luar; payload lengkap | Kurangi bug laten |

---

## 11. CATATAN vs DOKUMEN AUDIT SEBELUMNYA

`SYNC_AUDIT_REPORT.md` (audit 7 Sep) menyimpulkan sistem "lengkap dan siap diuji" dan `SYNC_SUMMARY.md` baru mengakui isu **atomicity** dan **asumsi LWW**. Yang **belum tercatat** di keduanya dan ditambahkan audit ini: **Issue #1** (baris `products`/`stock_movements` tidak pernah di-queue oleh transaksi/adjustment/opname) dan **Issue #2** (hilangnya queue saat login tanpa upload-dahulu). Kedua isu ini yang paling berdampak pada kehilangan uang/barang di lapangan.
