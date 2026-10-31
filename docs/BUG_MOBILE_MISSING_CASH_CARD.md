# 🐛 Deskripsi Bug

Tampilan mobile Android di halaman home hanya menampilkan 2 card carousel (Saldo Kas dan Saldo Bank), padahal seharusnya ada 3 card yaitu Saldo Cash (tunai), Saldo Kas, dan Saldo Bank. User tidak bisa melihat berapa cash/uang tunai yang mereka miliki karena card "Saldo Cash" tidak ada.

## Lingkungan / Lingkup Sistem (Environment)
- Platform: [x] Web [x] Android [ ] iOS
- Lingkungan: [x] Production [x] Staging [x] Development
- Browser/Versi: Mobile Android (WebView via Capacitor)
- OS: Android (semua versi)
- Versi Aplikasi: Current (commit terakhir sebelum fix)

## Langkah untuk Mereplikasi (Steps to Reproduce)
1. Login ke aplikasi di perangkat Android atau browser mobile view
2. Buka halaman Home/Dashboard (route `/`)
3. Perhatikan section "Account Balance Carousel" di bagian atas
4. Scroll/swipe carousel saldo akun
5. Observasi: Hanya ada 2 card yang muncul (Saldo Kas biru, Saldo Bank ungu)
6. Observasi: Indicator dots di bawah carousel hanya menampilkan 2 titik

## Perilaku yang Diharapkan (Expected Behavior)

Seharusnya ada **3 card** dalam carousel saldo dengan urutan:

1. **Saldo Cash (Kas Tunai)** - Gradient hijau, untuk uang tunai di tangan
2. **Saldo Kas** - Gradient biru, untuk kas toko (sudah ada)
3. **Saldo Bank** - Gradient ungu, untuk rekening bank (sudah ada)

Indicator dots harus menampilkan **3 titik** untuk 3 halaman carousel.

## Perilaku Aktual / Terjadi (Actual Behavior)

- Hanya ada 2 card: Saldo Kas (biru) dan Saldo Bank (ungu)
- Tidak ada card "Saldo Cash" untuk menampilkan uang tunai di tangan
- Indicator dots hanya menampilkan 2 titik
- User tidak bisa melihat berapa cash/uang tunai mereka dari dashboard mobile
- Carousel hanya bisa swipe 1 kali (2 posisi), bukan 2 kali (3 posisi)

## Tangkapan Layar / Video (Screenshots/Videos)

*(Perlu screenshot dari device Android untuk dokumentasi)*

**Current State:**
```
┌─────────────────────────┐
│  [Saldo Kas] (biru)     │ ◄── Card 1
│   Rp 10.000.000         │
└─────────────────────────┘
┌─────────────────────────┐
│  [Saldo Bank] (ungu)    │ ◄── Card 2
│   Rp 25.000.000         │
└─────────────────────────┘
      • •                     ◄── Only 2 dots
```

**Expected State:**
```
┌─────────────────────────┐
│  [Saldo Cash] (hijau)   │ ◄── Card 1 (NEW!)
│   Rp 5.000.000          │
└─────────────────────────┘
┌─────────────────────────┐
│  [Saldo Kas] (biru)     │ ◄── Card 2
│   Rp 10.000.000         │
└─────────────────────────┘
┌─────────────────────────┐
│  [Saldo Bank] (ungu)    │ ◄── Card 3
│   Rp 25.000.000         │
└─────────────────────────┘
      • • •                   ◄── 3 dots
```

## Pesan Kesalahan (Error Messages)

Tidak ada error message. Ini adalah **missing feature** bukan runtime error.

## Tingkat Dampak (Impact)

**Pengguna Terdampak:** Semua user yang menggunakan aplikasi di Android dan perlu tracking cash/uang tunai terpisah dari kas toko

**Frekuensi Kejadian:** 100% - selalu terjadi di semua instalasi

**Solusi Sementara (Workaround):** 
- User harus membuka menu "Laporan > Mutasi Kas" untuk melihat detail kas
- Atau mengakses halaman Finance > Chart of Accounts untuk melihat semua akun
- Tidak praktis untuk quick view di dashboard mobile

---

## Analisis Akar Masalah (Root Cause Analysis)

**Akar Masalah (Root Cause):**

1. **Komponen `MobileAccountBalance.vue` hanya render 2 card**
   - File: `src/components/dashboard/MobileAccountBalance.vue` (line 12-148)
   - Hanya ada 2 div untuk card: Kas (biru) dan Bank (ungu)
   - Tidak ada card ketiga untuk Cash in Hand

2. **Data `cashBalance` tidak digunakan untuk card terpisah**
   - File: `src/views/Ecommerce.vue` (line 231-235)
   - Variable `cashBalance` digunakan untuk card "Saldo Kas" (biru), bukan card "Cash" terpisah
   ```typescript
   const cashAccount = balances.find(
     b => b.account_code === '1-1000' || b.account_name.toLowerCase().includes('kas')
   )
   ```

3. **Tidak ada props untuk "cash in hand" balance**
   - Props `MobileAccountBalance` hanya menerima: `cashBalance` dan `bankBalance`
   - Tidak ada `cashInHandBalance` untuk card terpisah

4. **Indicator dots hardcoded untuk 2 halaman**
   - Line 152-159 di `MobileAccountBalance.vue`: `v-for="idx in 2"` (hardcoded!)

**Penyebab Terjadinya:**

- Desain awal sistem hanya membedakan 2 jenis saldo: Kas dan Bank
- Tidak ada pemisahan antara "Cash in Hand" vs "Cash in Register/Store"
- Struktur COA (Chart of Accounts) mungkin tidak memiliki akun terpisah untuk "Cash in Hand"
- Mobile-first design tidak comprehensive untuk kebutuhan 3 jenis saldo

---

## Implementasi Perbaikan (Fix Implementation)

**Perubahan Kode/Sistem:**

1. **Verifikasi/Tambah akun "Cash in Hand" di Chart of Accounts**
   - Cari atau buat akun dengan code `1-1005` (Kas Tunai)
   - Jika belum ada, perlu migrasi SQL untuk insert akun baru

2. **Update `src/views/Ecommerce.vue`:**
   - Tambah state: `const cashInHandBalance = ref(0)`
   - Update method `loadAccountBalances()` untuk load 3 balance (cash in hand, kas, bank)
   - Update props `<MobileAccountBalance>` tambahkan `:cash-in-hand-balance="cashInHandBalance"`

3. **Update `src/components/dashboard/MobileAccountBalance.vue`:**
   - Update Props interface: tambahkan `cashInHandBalance: number`
   - Tambah card baru dengan gradient hijau (green) untuk "Saldo Cash"
   - Posisi: sebelum card "Saldo Kas" (biru)
   - Button link: router ke `/finance/ledger?account=1-1005`
   - Update indicator dots: `v-for="idx in 3"` (dari 2 ke 3)

4. **Color scheme:**
   - Card 1 (Cash): `from-green-500 to-green-600`
   - Card 2 (Kas): `from-blue-500 to-blue-600` (existing)
   - Card 3 (Bank): `from-purple-500 to-purple-600` (existing)

**Memerlukan Migrasi:** [x] Ya [ ] Tidak

Migrasi diperlukan jika akun "Cash in Hand" (code `1-1005`) belum ada di tabel `chart_of_accounts`.

```sql
-- Migration: add_cash_in_hand_account.sql
INSERT INTO chart_of_accounts (
  code,
  name,
  account_type,
  normal_balance,
  is_active,
  user_id
) VALUES (
  '1-1005',
  'Kas Tunai',
  'asset',
  'debit',
  true,
  auth.uid()
);
```

## Pengujian (Testing)

- [ ] Unit test ditambahkan (optional untuk component test)
- [ ] Pengujian manual lulus
  - [ ] Test di browser mobile view (Chrome DevTools)
  - [ ] Test di Android device/emulator
  - [ ] Verify 3 cards muncul dengan urutan benar
  - [ ] Verify swipe/scroll berfungsi untuk 3 posisi
  - [ ] Verify indicator dots menampilkan 3 titik dan active state berubah
  - [ ] Verify toggle visibility berfungsi untuk semua cards
  - [ ] Verify router link ke mutasi kas/bank/cash berfungsi
- [ ] Pengujian regresi lulus
  - [ ] Desktop view tidak terpengaruh (section mobile-only)
  - [ ] Load balances tidak error
  - [ ] Dark mode styling correct
  - [ ] Performance carousel tidak menurun

## Terkait (Related)

- Bug terkait: Tidak ada
- Fitur terkait: 
  - Finance Module - Chart of Accounts
  - Finance Module - Ledger
  - Dashboard Mobile - MobileAccountBalance component
- GitHub PR: *(akan diisi setelah PR dibuat)*

## Langkah Pencegahan (Prevention)

1. **Dokumentasi requirement lengkap** - dokumentasikan semua jenis akun yang perlu ditampilkan di mobile sebelum implementasi
2. **Design review process** - review UI/UX mobile dengan stakeholder, pastikan semua informasi penting tersedia
3. **Feature parity checklist** - buat checklist untuk memastikan feature parity antara desktop dan mobile
4. **User testing** - test dengan user actual sebelum release, collect feedback tentang informasi yang missing
5. **Code review guidelines** - flag hardcoded values seperti `v-for="idx in 2"`, ensure props dan state sync dengan requirement
6. **Testing strategy** - test di actual device bukan hanya browser, test dengan berbagai screen sizes
7. **Documentation** - update CLAUDE.md dengan informasi tentang account types dan mapping ke UI component

---

**Tanggal Laporan:** 31 Oktober 2026  
**Status:** Open  
**Prioritas:** Medium  
**File terkait:**
- `src/views/Ecommerce.vue`
- `src/components/dashboard/MobileAccountBalance.vue`
- `src/stores/finance.ts`
- `src/services/finance.ts`
