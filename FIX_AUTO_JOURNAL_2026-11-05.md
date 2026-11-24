# Fix Auto-Jurnal Tidak Berfungsi

**Tanggal:** 2026-11-05  
**Status:** ✅ Fixed

## 🔴 Masalah

User melaporkan auto-jurnal **tidak berfungsi** di:

1. ❌ **Input stok awal** (adjustment) → tidak ada jurnal
2. ❌ **Buat transaksi baru** → tidak ada jurnal
3. ⚠️ **Hanya berfungsi di akun lama**, tidak di akun baru

## 🔍 Root Cause

Setelah investigasi, ditemukan **3 masalah utama**:

### 1. Inkonsistensi Kode Akun COA (Masalah Utama)

**File bermasalah:** `supabase/migrations/20260925_fix_auto_journal_payment.sql`

Fungsi `init_default_coa_for_user()` membuat akun dengan **kode BARU**:

```sql
-- Kode yang SALAH dibuat untuk user baru:
'1-1030' = Piutang Usaha                    ❌ (harusnya 1-1100)
'4-1000' = Pendapatan Penjualan             ❌ (harusnya 4-4000)
'5-1000' = Beban Pokok Penjualan            ❌ (harusnya 5-5000)
'1-1020' = Persediaan Barang Dagangan       ❌ (harusnya 1-1200)
```

Sedangkan fungsi `create_transaction()` mencari akun dengan **kode LAMA**:

```sql
SELECT id INTO v_account_piutang FROM chart_of_accounts WHERE code = '1-1100'; -- ✅
SELECT id INTO v_account_pendapatan FROM chart_of_accounts WHERE code = '4-4000'; -- ✅
SELECT id INTO v_account_hpp FROM chart_of_accounts WHERE code = '5-5000'; -- ✅
SELECT id INTO v_account_persediaan FROM chart_of_accounts WHERE code = '1-1200'; -- ✅
```

**Akibat:**

- User **LAMA** (yang setup COA manual dengan kode lama) → auto-jurnal berfungsi ✅
- User **BARU** (yang auto-init COA dengan kode baru) → akun tidak ketemu → jurnal tidak di-post ❌

Ini adalah **silent failure** karena fungsi tidak throw error, hanya skip jurnal jika akun NULL.

### 2. Fungsi `create_stock_adjustment` Tidak Ada

**File:** `src/services/stock.ts` line 159

Kode frontend memanggil:

```typescript
const { data, error } = await supabase.rpc('create_stock_adjustment', {
  p_product_id: adjustment.product_id,
  // ...
})
```

Tapi fungsi ini **tidak ada di database**! Jadi adjustment stok **pasti error**.

### 3. Tidak Ada Auto-Jurnal untuk Stock Adjustment

Bahkan jika fungsi ada, tidak ada logika untuk auto-post jurnal saat adjustment stok:

- Adjustment stok **NAIK** (tambah barang) → seharusnya: **Debit** Persediaan, **Credit** Modal
- Adjustment stok **TURUN** (kurang barang) → seharusnya: **Debit** Modal, **Credit** Persediaan

Tanpa ini, adjustment stok tidak tercatat di akuntansi.

### 4. Akun Modal (3-1000) Tidak Ada

User existing tidak punya akun Modal yang diperlukan untuk adjustment stok.

## ✅ Solusi

Dibuat 1 file migrasi: `supabase/migrations/20261105_fix_auto_journal_use_old_codes.sql`

### 1. Fix `init_default_coa_for_user()` Gunakan Kode LAMA

Update fungsi init COA untuk menggunakan kode **LAMA** yang konsisten dengan `create_transaction()`:

```sql
-- FIXED: Gunakan kode LAMA
INSERT INTO chart_of_accounts (user_id, code, name, type, normal_balance, is_active, is_system)
VALUES
  (p_user_id, '1-1000', 'Kas', 'asset', 'debit', true, true),
  (p_user_id, '1-1100', 'Piutang Usaha', 'asset', 'debit', true, true),         -- ✅ 1-1100
  (p_user_id, '1-1200', 'Persediaan Barang Dagangan', 'asset', 'debit', true, true), -- ✅ 1-1200
  (p_user_id, '3-1000', 'Modal', 'equity', 'kredit', true, true),
  (p_user_id, '4-4000', 'Pendapatan Penjualan', 'revenue', 'kredit', true, true),    -- ✅ 4-4000
  (p_user_id, '5-5000', 'Harga Pokok Penjualan (HPP)', 'expense', 'debit', true, true); -- ✅ 5-5000
```

### 2. Buat Fungsi `create_stock_adjustment()` dengan Auto-Jurnal

Fungsi baru yang:

1. Simpan record `stock_adjustments`
2. Update stok produk
3. Catat `stock_movements`
4. **Auto-post jurnal dengan kode LAMA:**
   - **Stok NAIK (+):** Debit Persediaan (1-1200), Credit Modal (3-1000)
   - **Stok TURUN (-):** Debit Modal (3-1000), Credit Persediaan (1-1200)

### 3. Migrasi User Baru yang Dapat Kode Salah

Script otomatis mengubah kode akun user baru dari kode baru → kode lama:

```sql
-- Migrasi otomatis:
1-1030 → 1-1100 (Piutang)
4-1000 → 4-4000 (Pendapatan)
5-1000 → 5-5000 (HPP)
1-1020 → 1-1200 (Persediaan)
```

### 4. Update Journal Lines yang Sudah Pakai Kode Baru

Script otomatis mengubah `account_code` di tabel `journal_lines` yang sudah pakai kode baru.

### 5. Tambahkan Akun Modal untuk User Existing

Script otomatis menambahkan akun Modal (3-1000) untuk user yang belum punya.

## 📋 Cara Apply

### Apply ke Supabase (2 File Migrasi)

**Via Supabase Dashboard (Recommended):**

**File 1:** `supabase/migrations/20261105_fix_auto_journal_use_old_codes.sql`
1. Buka **Supabase Dashboard → SQL Editor**
2. Copy-paste isi file pertama
3. Run
4. Perhatikan NOTICE log untuk melihat berapa user yang dimigrasi

**File 2:** `supabase/migrations/20261105_auto_init_coa_on_signup.sql`
1. Tetap di **SQL Editor**
2. Copy-paste isi file kedua
3. Run

**Via Supabase CLI:**

```bash
# Login ke Supabase (jika belum)
npx supabase login

# Link ke project (jika belum)
npx supabase link --project-ref your-project-ref

# Push semua migrasi ke remote
npx supabase db push
```

## ✅ Verifikasi

Setelah apply, test:

### Test 1: Buat Transaksi Baru

1. Login dengan user **BARU** (yang belum pernah buat transaksi)
2. Buat transaksi penjualan
3. Cek di **Finance → Buku Besar**
4. ✅ Harus ada jurnal otomatis dengan akun:
   - Debit: Kas (1-1000) / Piutang (1-1100)
   - Credit: Pendapatan (4-4000)
   - Debit: HPP (5-5000)
   - Credit: Persediaan (1-1200)

### Test 2: Adjustment Stok

1. Buka **Stok → Adjustment**
2. Tambah stok produk (misal +10 unit)
3. Cek di **Finance → Buku Besar**
4. ✅ Harus ada jurnal otomatis:
   - Debit: Persediaan (1-1200) = 10 × harga beli
   - Credit: Modal (3-1000) = 10 × harga beli

### Test 3: User Lama

1. Login dengan user lama
2. Buat transaksi
3. ✅ Auto-jurnal tetap berfungsi (kode tidak berubah)

## 📊 Mapping Kode Akun Final

Setelah migrasi, semua user menggunakan kode akun yang SAMA:

| Akun | Kode | Normal Balance |
|------|------|----------------|
| Kas | 1-1000 | Debit |
| Bank | 1-1010 | Debit |
| Piutang Usaha | **1-1100** | Debit |
| Persediaan Barang | **1-1200** | Debit |
| Modal | 3-1000 | Kredit |
| Pendapatan Penjualan | **4-4000** | Kredit |
| Harga Pokok Penjualan (HPP) | **5-5000** | Debit |

**Catatan Penting:** 
- ✅ Kode LAMA (`1-1100`, `1-1200`, `4-4000`, `5-5000`) adalah yang BENAR dan digunakan
- ❌ Kode BARU (`1-1030`, `1-1020`, `4-1000`, `5-1000`) adalah SALAH dan sudah dimigrasi

## 🎯 Summary

| Masalah | Penyebab | Solusi |
|---------|----------|--------|
| Transaksi tidak ada jurnal | `init_default_coa` pakai kode baru, `create_transaction` cari kode lama | Fix `init_default_coa` pakai kode LAMA |
| Adjustment stok error | Fungsi tidak ada | Buat fungsi `create_stock_adjustment()` |
| Adjustment tidak ada jurnal | Tidak ada logika auto-jurnal | Tambahkan auto-jurnal di fungsi adjustment |
| Akun Modal tidak ada | Tidak di-init untuk user lama | Auto-create Modal (3-1000) untuk semua user |
| User baru dapat kode salah | `init_default_coa` salah | Migrasi otomatis kode baru → kode lama |

---

**Setelah apply migrasi ini:**

✅ User baru → dapat COA dengan kode LAMA yang benar  
✅ User lama → tidak terpengaruh, tetap berfungsi  
✅ Adjustment stok → ada fungsi dan jurnal otomatis  
✅ Konsistensi kode akun di semua fungsi
