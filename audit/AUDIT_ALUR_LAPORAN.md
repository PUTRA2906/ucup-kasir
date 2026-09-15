# AUDIT ALUR LAPORAN - UCUP KASIR
**Tanggal Audit:** 13 September 2026  
**Versi Aplikasi:** v1.0 (commit: 58033ed)  
**Auditor:** Claude Code

---

## RINGKASAN EKSEKUTIF

Audit ini mengidentifikasi **celah keamanan dan kelemahan logika bisnis** dalam modul laporan aplikasi Ucup Kasir. Ditemukan **10 temuan** yang dapat menyebabkan data tidak akurat, inkonsistensi laporan, dan potensi manipulasi data.

### Temuan Utama:
- 🔴 **Perhitungan laba terealisasi salah** ketika ada retur
- ⚠️ **Tidak ada validasi range tanggal** untuk laporan
- ⚠️ **Query laporan tidak optimal** - bisa timeout dengan data besar
- 🔴 **Filter dapat di-bypass** dari client side
- 🟡 **Tidak ada caching** untuk laporan yang sama
- 🔴 **HPP (price_buy) bisa NULL** - menyebabkan laba salah

---

## 1. ALUR LAPORAN LENGKAP

### 1.1 Jenis Laporan

**1. Laporan Penjualan (SalesReport)**
- Total penjualan, transaksi, item terjual
- Breakdown per metode pembayaran
- Top 5 produk terlaris

**2. Laporan Laba Rugi (ProfitLossReport / SalesReportEnhanced)**
- Omzet bersih (gross sales - diskon - retur)
- Kas masuk vs piutang
- Laba kotor vs laba bersih (setelah beban operasional)
- Laba terealisasi vs tertahan
- Top 5 produk terlaris & top 5 paling sering diretur

**3. Laporan Laba Per Transaksi (TransactionProfitReport)**
- Detail laba per transaksi
- Breakdown per item dengan margin
- Laba riil vs tertahan per transaksi

**4. Laporan Finance (dari modul akuntansi)**
- Buku besar (ledger)
- Neraca saldo (trial balance)
- Arus kas (cash flow)

### 1.2 Flow Diagram

```
[Frontend View]
      ↓
[Filter: dateRange, paymentStatus, customer]
      ↓
[Store: fetchReport()]
      ↓
[Service Layer: getEnhancedSalesReport()]
      ↓
[Supabase Query: transactions + transaction_items + returns]
      ↓
[Client-Side Calculation]
      ↓
├─ calculateEnhancedSummary() - Hitung total & laba
├─ calculateTransactionDetails() - Hitung per transaksi
└─ calculateProductPerformance() - Top produk
      ↓
[Display ke UI]
```

### 1.3 Komponen Terlibat

**Frontend:**
- `/src/views/Reports/ProfitLossReport.vue` (719 baris)
- `/src/views/Reports/SalesReport.vue` (358 baris)
- `/src/views/Reports/TransactionProfitReport.vue` (377 baris)

**Service Layer:**
- `/src/services/salesReportEnhanced.ts` (581 baris) - **SEMUA LOGIKA DI CLIENT**
- `/src/services/finance.ts` (323 baris)

**Store:**
- `/src/stores/salesReportEnhanced.ts` (154 baris)

**Database:**
- `transactions` (header transaksi)
- `transaction_items` (rincian item + HPP)
- `transaction_payments` (riwayat pembayaran)
- `returns` + `return_items` (data retur)
- `products` (price_buy untuk HPP)

---

## 2. TEMUAN KEAMANAN & CELAH KRITIS

### 🔴 KRITIS #1: Perhitungan Laba Terealisasi Salah Saat Ada Retur

**Lokasi:** `salesReportEnhanced.ts` line 249-257

```typescript
// Kas efektif: dibatasi agar tidak melebihi nilai bersih transaksi
const effectiveCash = Math.max(0, Math.min(paidAmount, txNetSales))
total_cash_received += effectiveCash
total_receivables += remainingAmount

// Laba riil & tertahan per transaksi (rasio otomatis 0..1)
const txRatio = txNetSales > 0 ? effectiveCash / txNetSales : 0
realized_profit += txProfit * txRatio
unrealized_profit += txProfit * (1 - txRatio)
```

**Masalah:**
Komentar di line 248 mengatakan: *"saat retur, paid_amount di DB tidak dikurangi padahal sebagian sudah direfund"*

Ini berarti:
1. Transaksi A: Total Rp 1.000.000, bayar lunas Rp 1.000.000
2. Retur Rp 300.000 (refund ke customer)
3. Database masih mencatat `paid_amount = 1.000.000` (tidak berubah)
4. Net sales = Rp 700.000 (sudah dikurangi retur)
5. effectiveCash = min(1.000.000, 700.000) = Rp 700.000
6. txRatio = 700.000 / 700.000 = 100%
7. **Laba terealisasi = 100%** (SALAH! Seharusnya hanya 70% karena Rp 300.000 sudah direfund)

**Dampak:**
- Laporan laba terealisasi **over-reported**
- Kas aktual tidak match dengan laporan
- Owner salah estimasi cash flow

**Rekomendasi:**
```typescript
// FIX: Hitung kas efektif dengan memperhitungkan refund
const totalRefunded = txReturns.reduce((sum, r) => sum + parseFloat(r.total_refund || 0), 0)
const actualCashReceived = Math.max(0, paidAmount - totalRefunded)
const effectiveCash = Math.max(0, Math.min(actualCashReceived, txNetSales))
```

---

### 🔴 KRITIS #2: HPP (price_buy) Bisa NULL - Menyebabkan Laba Salah

**Lokasi:** `salesReportEnhanced.ts` line 216-221

```typescript
t.items?.forEach((item: any) => {
  const itemSubtotal = item.subtotal || 0
  const priceBuy = item.product?.price_buy || 0  // DEFAULT 0 jika NULL!
  const qty = item.quantity || 0

  txGrossSales += itemSubtotal
  txCogs += priceBuy * qty  // COGS jadi 0 jika price_buy NULL
```

**Masalah:**
- Field `price_buy` di tabel `products` bisa NULL (tidak ada constraint NOT NULL)
- Jika produk belum diisi harga beli, `price_buy = NULL`
- Service default ke `0` → HPP = 0 → **Laba = 100%** (SALAH!)
- Tidak ada warning atau error jika price_buy NULL

**Skenario:**
```
1. Buat produk baru, harga jual Rp 10.000, harga beli kosong (NULL)
2. Jual 10 pcs → Omzet Rp 100.000
3. HPP = 0 (karena price_buy NULL)
4. Laba = Rp 100.000 (SALAH! Seharusnya ada modal)
```

**Dampak:**
- Laba **over-reported** jika banyak produk price_buy NULL
- Margin profit salah total
- Owner salah estimasi keuntungan

**Rekomendasi:**
```typescript
// FIX 1: Validasi di service
const priceBuy = item.product?.price_buy
if (priceBuy === null || priceBuy === undefined) {
  console.warn(`Produk ${item.product_name} tidak punya harga beli, skip dari laporan laba`)
  continue  // Skip item ini dari perhitungan
}

// FIX 2: Tambah constraint di database
ALTER TABLE products
ADD CONSTRAINT products_price_buy_not_null 
CHECK (price_buy IS NOT NULL AND price_buy >= 0);

// FIX 3: Validasi di create_transaction
IF v_product.price_buy IS NULL THEN
  RAISE EXCEPTION 'Produk % belum ada harga beli, tidak bisa dihitung HPP', v_product.name;
END IF;
```

---

### ⚠️ SEDANG #3: Query Laporan Tidak Optimal - Bisa Timeout

**Lokasi:** `salesReportEnhanced.ts` line 112-125

```typescript
let query = supabase
  .from('transactions')
  .select(`
    *,
    items:transaction_items(
      *,
      product:products(id, name, category_id, price_buy, price_sell)
    ),
    payments:transaction_payments(*)
  `)
  .eq('status', 'selesai')
  .gte('created_at', startDate)
  .lte('created_at', endDate + 'T23:59:59')
  .order('created_at', { ascending: false })
```

**Masalah:**
1. **N+1 Query Problem**: Fetch semua transaksi dengan nested relation
2. **Tidak ada LIMIT**: Jika ada 10.000 transaksi dalam 1 bulan, fetch semua
3. **Tidak ada pagination**: Frontend bisa crash jika data besar
4. **Client-side calculation**: Semua perhitungan di browser (581 baris logic)

**Dampak:**
- Query lambat untuk periode panjang (> 3 bulan)
- Browser bisa hang jika data > 1000 transaksi
- Bandwidth boros (transfer semua data ke client)

**Rekomendasi:**
```sql
-- FIX: Buat SQL VIEW atau FUNCTION untuk agregasi server-side
CREATE OR REPLACE FUNCTION get_sales_summary(
  p_start_date date,
  p_end_date date,
  p_payment_status text DEFAULT 'all'
) RETURNS TABLE (
  gross_sales numeric,
  total_discount numeric,
  net_sales numeric,
  total_cogs numeric,
  gross_profit numeric,
  ...
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(t.subtotal), 0) as gross_sales,
    COALESCE(SUM(t.discount), 0) as total_discount,
    COALESCE(SUM(t.total), 0) as net_sales,
    COALESCE(SUM(
      (SELECT SUM((ti.quantity * COALESCE(p.price_buy, 0)))
       FROM transaction_items ti
       JOIN products p ON p.id = ti.product_id
       WHERE ti.transaction_id = t.id)
    ), 0) as total_cogs,
    ...
  FROM transactions t
  WHERE t.user_id = auth.uid()
    AND t.status = 'selesai'
    AND t.created_at BETWEEN p_start_date AND p_end_date
    AND (p_payment_status = 'all' OR t.payment_status = p_payment_status);
END;
$$;
```

---

### ⚠️ SEDANG #4: Tidak Ada Validasi Range Tanggal

**Lokasi:** `ProfitLossReport.vue` line 674-680

```typescript
const applyFilters = () => {
  store.setDateRange(tempDateRange.value.start, tempDateRange.value.end)
  store.setPaymentStatusFilter(tempPaymentStatus.value)
  txStatusFilter.value = 'semua'
  store.fetchReport()
  loadExpenseBalances()
  showFilterModal.value = false
}
```

**Masalah:**
- Tidak ada validasi `startDate > endDate`
- Tidak ada validasi range terlalu panjang (> 1 tahun)
- Tidak ada validasi tanggal masa depan
- User bisa query laporan 10 tahun → timeout

**Rekomendasi:**
```typescript
const applyFilters = () => {
  const start = new Date(tempDateRange.value.start)
  const end = new Date(tempDateRange.value.end)
  const now = new Date()
  
  // Validasi 1: Start tidak boleh > End
  if (start > end) {
    toast.error('Tanggal mulai tidak boleh lebih besar dari tanggal selesai')
    return
  }
  
  // Validasi 2: Tidak boleh masa depan
  if (end > now) {
    toast.error('Tanggal laporan tidak boleh di masa depan')
    return
  }
  
  // Validasi 3: Max 1 tahun
  const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
  if (diffDays > 365) {
    toast.warning('Range terlalu panjang', 'Maksimal 1 tahun. Laporan akan lambat.')
  }
  
  store.setDateRange(tempDateRange.value.start, tempDateRange.value.end)
  ...
}
```

---

### ⚠️ SEDANG #5: Filter Dapat Di-Bypass dari Client

**Lokasi:** `salesReportEnhanced.ts` line 128-135

```typescript
// Filter status pembayaran
if (paymentStatusFilter && paymentStatusFilter !== 'all') {
  query = query.eq('payment_status', paymentStatusFilter)
}

// Filter customer
if (customerIds && customerIds.length > 0) {
  query = query.in('customer_id', customerIds)
}
```

**Masalah:**
- Filter hanya di client side
- User bisa modifikasi request langsung ke Supabase
- Tidak ada RLS untuk filter spesifik
- Attacker bisa lihat semua transaksi user lain (jika bypass RLS)

**Skenario:**
```javascript
// Bypass: Panggil langsung Supabase tanpa filter
const { data } = await supabase
  .from('transactions')
  .select('*')
  .eq('status', 'selesai')
  // Tidak ada filter user_id = auth.uid() !
```

**Rekomendasi:**
- Filter WAJIB di RLS (Row Level Security) sudah ada ✅
- Tapi service layer harus **selalu** validasi filter sebelum kirim ke DB
- Jangan percaya parameter dari client

---

### 🟡 RENDAH #6: Tidak Ada Caching untuk Laporan yang Sama

**Masalah:**
- Setiap kali buka halaman laporan, fetch ulang dari database
- User sering lihat laporan yang sama (hari ini, bulan ini)
- Waste bandwidth & query

**Rekomendasi:**
```typescript
// Implementasi cache di localStorage dengan expiry
const CACHE_KEY = 'sales_report_cache'
const CACHE_EXPIRY = 5 * 60 * 1000 // 5 menit

async function fetchReport() {
  const cacheKey = `${dateRange.value.start}_${dateRange.value.end}_${paymentStatusFilter.value}`
  const cached = localStorage.getItem(`${CACHE_KEY}_${cacheKey}`)
  
  if (cached) {
    const { data, timestamp } = JSON.parse(cached)
    if (Date.now() - timestamp < CACHE_EXPIRY) {
      summary.value = data.summary
      transactions.value = data.transactions
      return
    }
  }
  
  // Fetch dari server
  const data = await salesReportEnhancedService.getEnhancedSalesReport(...)
  
  // Simpan ke cache
  localStorage.setItem(`${CACHE_KEY}_${cacheKey}`, JSON.stringify({
    data,
    timestamp: Date.now()
  }))
}
```

---

### 🟡 RENDAH #7: Perhitungan Laba Bersih Tidak Konsisten

**Lokasi:** `ProfitLossReport.vue` line 530-534

```typescript
const totalExpenses = computed(() => {
  return financeStore.accounts
    .filter((a) => a.type === 'beban' && a.code !== '5-5000')
    .reduce((sum, acc) => sum + (expenseBalanceByAccount.value[acc.id] || 0), 0)
})
const netProfit = computed(() => store.summary.gross_profit - totalExpenses.value)
```

**Masalah:**
- Laba bersih hitung: **Laba Kotor - Beban Operasional**
- Tapi beban operasional diambil dari **modul finance** (jurnal manual)
- Jika user tidak input jurnal beban → Laba bersih = Laba kotor (SALAH!)
- Tidak ada validasi apakah jurnal sudah lengkap

**Dampak:**
- Laba bersih tidak akurat jika jurnal beban belum di-input
- User bingung kenapa laba kotor = laba bersih

**Rekomendasi:**
```typescript
const netProfit = computed(() => {
  const profit = store.summary.gross_profit - totalExpenses.value
  
  // Warning jika beban = 0 (curiga belum input)
  if (totalExpenses.value === 0 && store.summary.gross_profit > 0) {
    console.warn('Beban operasional = 0. Pastikan jurnal beban sudah diinput di modul Finance.')
  }
  
  return profit
})
```

---

### 🟡 RENDAH #8: Top Produk Calculation Vulnerable to Retur Abuse

**Lokasi:** `salesReportEnhanced.ts` line 421-433

```typescript
// Hitung retur
returns.forEach((r: any) => {
  r.items?.forEach((item: any) => {
    const productId = item.product_id
    if (!productId) return

    const existing = productMap.get(productId)
    if (existing) {
      existing.returned += item.quantity || 0
      existing.revenue -= item.price * (item.quantity || 0)
      existing.cogs -= (item.price_buy || 0) * (item.quantity || 0)
    }
  })
})
```

**Masalah:**
- Retur mengurangi revenue & quantity
- Jika produk A: jual 100 pcs, retur 99 pcs → Net = 1 pcs
- Tapi tetap masuk top 5 karena sempat jual banyak
- Tidak ada filter produk dengan return rate tinggi

**Rekomendasi:**
```typescript
// Filter produk dengan return rate > 50%
const products = Array.from(productMap.entries())
  .map(([id, data]) => {
    const returnRate = data.sold > 0 ? (data.returned / data.sold) * 100 : 0
    return { ...data, product_id: id, return_rate: returnRate }
  })
  .filter(p => p.return_rate < 50) // Exclude produk sering diretur
  .sort((a, b) => b.revenue - a.revenue)
  .slice(0, 5)
```

---

### 🟡 RENDAH #9: Tidak Ada Export Laporan ke Excel/PDF

**Masalah:**
- Laporan hanya bisa dilihat di browser
- Owner ingin share laporan ke partner/investor → harus screenshot
- Tidak ada fitur export CSV/Excel/PDF

**Rekomendasi:**
- Tambahkan fitur export menggunakan library `xlsx` atau `jspdf`
- Export button di setiap halaman laporan

---

### 🟡 RENDAH #10: Laporan Tidak Ada Audit Trail

**Masalah:**
- Tidak ada log siapa yang lihat laporan kapan
- Tidak ada log perubahan data yang mempengaruhi laporan
- Sulit investigasi jika ada dispute angka laporan

**Rekomendasi:**
```sql
-- Buat tabel audit log untuk laporan
CREATE TABLE report_access_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  report_type text NOT NULL, -- 'sales', 'profit_loss', 'transaction_profit'
  date_range_start date NOT NULL,
  date_range_end date NOT NULL,
  filters jsonb,
  accessed_at timestamptz DEFAULT now()
);

-- Trigger auto-log setiap kali fetch report
```

---

## 3. KELEMAHAN LOGIKA BISNIS

### 3.1 Laba Terealisasi vs Tertahan: Konsep Tidak Konsisten

**Analisis:**
Service mencoba membedakan:
- **Laba Terealisasi** = Laba yang kasnya sudah masuk
- **Laba Tertahan** = Laba dari piutang (belum bayar)

**Masalah:**
1. Formula: `realized_profit = total_profit * (cash_received / net_sales)`
2. Ini **asumsi** laba proporsional dengan pembayaran
3. **Tidak akurat** jika:
   - Produk berbeda margin (item A margin 50%, item B margin 10%)
   - Customer bayar DP untuk item margin tinggi, tempo untuk item margin rendah
   - Formula hitung rata-rata, padahal seharusnya per-item

**Contoh Kasus:**
```
Transaksi A:
- Item 1: Jual Rp 100.000, HPP Rp 90.000, Laba Rp 10.000 (margin 10%)
- Item 2: Jual Rp 100.000, HPP Rp 50.000, Laba Rp 50.000 (margin 50%)
- Total: Jual Rp 200.000, Laba Rp 60.000

Customer bayar:
- DP Rp 100.000 (untuk Item 1) → Kas masuk Rp 100.000
- Tempo Rp 100.000 (untuk Item 2) → Piutang Rp 100.000

Sistem hitung:
- Laba terealisasi = Rp 60.000 * (100.000 / 200.000) = Rp 30.000
- Laba tertahan = Rp 30.000

SALAH! Seharusnya:
- Laba terealisasi = Rp 10.000 (dari Item 1 yang sudah dibayar)
- Laba tertahan = Rp 50.000 (dari Item 2 yang tempo)
```

**Rekomendasi:**
- Hapus konsep laba terealisasi vs tertahan (terlalu kompleks & tidak akurat)
- Atau, track pembayaran **per-item** (butuh schema baru)
- Atau, gunakan FIFO: pembayaran pertama untuk item pertama

---

### 3.2 Beban Operasional dari Modul Finance: Dependency Problem

**Masalah:**
- Laporan Laba Bersih depend on **modul finance** (jurnal manual)
- Jika user tidak pakai modul finance → laba bersih = laba kotor
- Inkonsisten dengan SOP akuntansi

**Rekomendasi:**
- Pisahkan laporan laba kotor (dari transaksi) dan laba bersih (dari finance)
- Jangan gabung di satu halaman jika user belum pakai finance
- Atau, auto-jurnal beban operasional (salary, rent, utilities) di create_transaction

---

### 3.3 Top Produk: Revenue vs Profit Ranking

**Masalah:**
- Top produk diurutkan berdasarkan **revenue** (omzet)
- Tidak ada ranking berdasarkan **profit** (laba)
- Produk omzet tinggi tapi margin rendah → tetap masuk top 5

**Rekomendasi:**
```typescript
// Tambah pilihan sorting
const sortMode = ref<'revenue' | 'profit' | 'margin'>('revenue')

const topProducts = computed(() => {
  return products
    .sort((a, b) => {
      switch (sortMode.value) {
        case 'profit': return b.profit - a.profit
        case 'margin': return b.profit_margin - a.profit_margin
        default: return b.revenue - a.revenue
      }
    })
    .slice(0, 5)
})
```

---

## 4. REKOMENDASI PERBAIKAN PRIORITAS

### Priority 1: SEGERA (< 1 Minggu)

1. **Fix perhitungan laba terealisasi saat retur** (#1)
   - Impact: 🔴 Kritis - laba over-reported
   - Effort: Medium (3 hari)

2. **Fix HPP NULL handling** (#2)
   - Impact: 🔴 Kritis - laba salah total
   - Effort: Low (1 hari)

3. **Validasi range tanggal** (#4)
   - Impact: ⚠️ Sedang - UX & performance
   - Effort: Low (1 hari)

### Priority 2: MENENGAH (1-2 Minggu)

4. **Optimasi query dengan SQL VIEW** (#3)
   - Impact: ⚠️ Sedang - performance
   - Effort: High (5 hari)

5. **Fix perhitungan laba bersih** (#7)
   - Impact: 🟡 Rendah - tapi penting untuk akurasi
   - Effort: Low (1 hari)

6. **Implementasi caching** (#6)
   - Impact: 🟡 Rendah - performance improvement
   - Effort: Medium (2 hari)

### Priority 3: RENDAH (> 2 Minggu)

7. Filter top produk dengan return rate (#8)
8. Export laporan ke Excel/PDF (#9)
9. Audit trail laporan (#10)

---

## 5. KESIMPULAN

### Poin Positif:
✅ Laporan cukup komprehensif (penjualan, laba rugi, per transaksi)  
✅ UI responsif dan mobile-friendly  
✅ Ada breakdown laba terealisasi vs tertahan (konsep bagus)  
✅ Ada top produk & top retur  

### Poin Negatif:
🔴 Perhitungan laba terealisasi **salah** ketika ada retur  
🔴 HPP bisa NULL → laba over-reported  
⚠️ Query tidak optimal → bisa timeout dengan data besar  
⚠️ Tidak ada validasi tanggal → user bisa query 10 tahun  
🟡 Semua logic di client side (581 baris) → seharusnya di server  

### Skor Keamanan: **5.5/10**

**Alasan:**
- RLS sudah ada (aman dari akses unauthorized)
- Tapi logika perhitungan banyak bug (laba salah)
- Tidak ada validasi input (tanggal, filter)
- Performance jelek untuk data besar

---

## 6. LANGKAH SELANJUTNYA

1. **Review dengan tim** untuk prioritas fixing
2. **Buat tiket** untuk setiap temuan di issue tracker
3. **Implementasi fix** sesuai prioritas:
   - Priority 1: Fix perhitungan laba (critical bug)
   - Priority 2: Optimasi query (performance)
   - Priority 3: Feature tambahan (export, audit trail)
4. **Testing** setiap fix:
   - Unit test untuk logic perhitungan
   - Integration test dengan data real
   - Performance test dengan 10.000+ transaksi
5. **Re-audit** setelah semua fix di-deploy

---

**Dokumen ini bersifat CONFIDENTIAL dan hanya untuk internal tim development.**
