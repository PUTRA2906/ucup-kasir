# Konsep 2 Akun Laba: Direalisasi & Piutang

Sistem akuntansi Ucup Kasir menggunakan **2 akun laba** untuk membedakan laba berdasarkan status pembayaran:

## 1. Laba Direalisasi (3-3100)

**Definisi:** Laba yang berasal dari **alokasi pembayaran** per item transaksi (yang sudah dibayar).

**Karakteristik:**
- Dicatat di **jurnal penutup** saat tutup buku
- Dihitung berdasarkan **alokasi pembayaran per item transaksi**
- Laba ini **sudah terima kas**, bisa diambil owner
- Ini adalah laba **cash basis** (hanya yang sudah dibayar)

**Rumus:**
```
Laba Direalisasi = SUM(
  (Harga Jual - HPP) × Qty × (Alokasi Pembayaran / Subtotal Item)
)
```

**Contoh:**
- Item A: Subtotal Rp 100.000, HPP Rp 60.000, Laba = Rp 40.000
- Sudah dibayar Rp 50.000 (50% dari subtotal)
- **Laba Direalisasi = Rp 40.000 × 50% = Rp 20.000**
- Laba Rp 20.000 ini **sudah terima kas**, bisa diambil owner

---

## 2. Laba Piutang (3-3200)

**Definisi:** Laba yang **belum dibayar** (masih dalam bentuk piutang). Ini adalah **sisanya** dari total laba.

**Karakteristik:**
- Dicatat di **jurnal penutup** saat tutup buku
- Dihitung dari: `Total Laba - Laba Direalisasi`
- Laba ini **belum terima kas**, belum bisa diambil owner
- Akan berkurang setiap kali ada pembayaran cicilan (direklasifikasi ke Direalisasi)

**Rumus:**
```
Laba Piutang = (Total Pendapatan - Total Beban) - Laba Direalisasi
```

**Contoh (lanjutan dari atas):**
- Total laba item = Rp 40.000
- Laba direalisasi = Rp 20.000
- **Laba Piutang = Rp 40.000 - Rp 20.000 = Rp 20.000**
- Laba Rp 20.000 ini masih **terikat di piutang**, belum bisa diambil owner

---

## Hubungan Kedua Akun

```
Total Laba = Laba Direalisasi + Laba Piutang
```

**Skenario:**
1. **Transaksi Kredit Baru** (belum bayar)
   - Laba Direalisasi = Rp 0 (belum ada pembayaran)
   - Laba Piutang = Rp 200.000 (semua laba masih piutang)
   - Total = Rp 200.000

2. **Setelah Cicilan 50%**
   - Laba Direalisasi = Rp 100.000 (dari alokasi pembayaran)
   - Laba Piutang = Rp 100.000 (sisa yang belum dibayar)
   - Total = Rp 200.000

3. **Setelah Lunas**
   - Laba Direalisasi = Rp 200.000 (semua sudah dibayar)
   - Laba Piutang = Rp 0 (tidak ada piutang lagi)
   - Total = Rp 200.000

---

## Implementasi di Database

### Chart of Accounts
```sql
-- 3-3100: Laba Piutang
INSERT INTO chart_of_accounts (code, name, type, normal_balance)
VALUES ('3-3100', 'Laba Piutang', 'ekuitas', 'credit');

-- 3-3200: Laba Direalisasi
INSERT INTO chart_of_accounts (code, name, type, normal_balance)
VALUES ('3-3200', 'Laba Direalisasi', 'ekuitas', 'credit');
```

### Fungsi `close_period()`
```sql
-- Hitung laba piutang dari jurnal
v_laba_piutang := v_total_pendapatan - v_total_beban;

-- Hitung laba direalisasi dari payment allocation
SELECT * INTO v_profit FROM get_profit_summary(v_user_id, p_period_start, p_period_end);
v_laba_direalisasi := v_profit.realized_profit;

-- HANYA Laba Piutang yang dicatat di jurnal penutup
INSERT INTO journal_lines (account_id, debit, credit)
VALUES (v_laba_piutang_id, 0, v_laba_piutang);

-- Laba Direalisasi TIDAK dicatat di jurnal (hanya tracking)
```

### Fungsi `get_profit_summary()`
```sql
-- Menghitung laba direalisasi berdasarkan alokasi pembayaran per item
CREATE FUNCTION get_profit_summary(p_user_id uuid, p_start_date date, p_end_date date)
RETURNS TABLE (
  total_revenue numeric,
  total_cogs numeric,
  total_profit numeric,
  realized_revenue numeric,
  realized_cogs numeric,
  realized_profit numeric
);
```

---

## UI Display

### Preview Tutup Buku (`ClosePeriodModal.vue`)
```typescript
// Simulasi preview: hitung laba piutang dan direalisasi
const realisedProfit = await financeService.getRealisedProfit(start, end)

// Laba Piutang = laba yang belum dibayar
const labaPiutang = realisedProfit.totalProfit - realisedProfit.realisedProfit
labaPiutangAccount.balance += labaPiutang

// Laba Direalisasi = laba yang sudah terima kas
labaDirealisasiAccount.balance += realisedProfit.realisedProfit
```

### Detail Tutup Buku (`ClosingPeriodDetail.vue`)
```vue
<!-- Tooltip untuk Laba Piutang -->
<p v-if="bal.account_code === '3-3100'">
  Laba dari piutang yang belum dibayar (belum terima kas)
</p>

<!-- Tooltip untuk Laba Direalisasi -->
<p v-if="bal.account_code === '3-3200'">
  Laba yang sudah terima kas (tersedia untuk diambil owner)
</p>
```

---

## Manfaat Sistem 2 Akun Laba

1. **Transparansi Kas**
   - Owner tahu persis berapa laba yang **bisa diambil** (Laba Direalisasi)
   - Owner tahu berapa laba yang **masih di piutang** (Laba Piutang)

2. **Manajemen Arus Kas**
   - Mencegah owner mengambil laba yang belum terima kas
   - Membantu perencanaan keuangan yang lebih baik

3. **Akuntansi yang Akurat**
   - Menggunakan **alokasi pembayaran per item** untuk menghitung laba direalisasi
   - Bukan metode proporsional sederhana yang kurang akurat

4. **Audit Trail**
   - Laba Piutang dicatat di jurnal penutup (audit trail jelas)
   - Laba Direalisasi dihitung dari transaksi riil (verifiable)

---

## Catatan Penting

⚠️ **Laba Direalisasi TIDAK dicatat di jurnal penutup**
- Laba Direalisasi adalah **memo account** atau **informasi tambahan**
- Hanya ditampilkan di UI untuk informasi owner
- Jika dicatat di jurnal, akan menyebabkan **buku tidak balance**

✅ **Hanya Laba Piutang yang dicatat di jurnal penutup**
- Laba Piutang adalah hasil penutupan akun Pendapatan dan Beban
- Dicatat dengan: Debit Pendapatan → Credit Beban → Credit Laba Piutang
- Ini menjaga persamaan akuntansi: Aset = Kewajiban + Ekuitas

---

## Migration Applied

File: `supabase/migrations/20261104_two_profit_accounts.sql`

Status: ✅ Applied ke Supabase

Perubahan terakhir: Rename "Laba Aktual" → "Laba Piutang" (2026-11-04)
