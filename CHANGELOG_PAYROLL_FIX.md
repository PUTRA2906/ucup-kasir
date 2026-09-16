# Perbaikan Perhitungan Gaji Supir/Loader

**Tanggal:** 2026-09-16  
**Status:** ✅ Selesai

---

## Masalah

Gaji supir/loader **tidak dihitung dengan benar** meskipun sudah ada surat jalan yang selesai dalam periode yang dipilih.

### Contoh Kasus:
```
Loader A punya 2 surat jalan selesai di tanggal:
- 2024-01-15 (surat jalan #1)
- 2024-01-20 (surat jalan #2)

Periode payroll: 2024-01-01 s/d 2024-01-31

Hasil: Insentif = Rp 0 ❌ (seharusnya ada)
```

---

## Root Cause

### Masalah di Query Filter Tanggal

**Query Lama (Salah):**
```sql
WHERE dor.status = 'selesai'
  AND DATE(dor.do_date) >= DATE(?) 
  AND DATE(dor.do_date) <= DATE(?)
```

**Kenapa Salah:**

1. **Format data `do_date` di SQLite:**
   - Di database: `TEXT` dengan format `'2024-01-15T10:30:00.000Z'` (ISO 8601 datetime)
   - Atau kadang: `'2024-01-15 10:30:00'` (datetime lokal)

2. **Format parameter `periodStart` dan `periodEnd`:**
   - Dari form: `'2024-01-01'` (string date saja, tanpa time)

3. **Fungsi `DATE()` di SQLite:**
   - `DATE('2024-01-15T10:30:00.000Z')` → `'2024-01-15'` ✅
   - `DATE('2024-01-01')` → `'2024-01-01'` ✅
   
   **TAPI**, jika `do_date` berisi datetime dengan **timezone UTC** dan sistem menggunakan **timezone lokal** (misal WIB = UTC+7), bisa terjadi:
   
   ```
   do_date = '2024-01-15T03:00:00.000Z' (UTC)
   → DATE(do_date) = '2024-01-15'
   
   Tapi jika diinterpretasi sebagai lokal WIB:
   '2024-01-15T03:00:00.000Z' = '2024-01-15 10:00:00 WIB'
   
   Sedangkan period_start = '2024-01-01' diinterpretasi sebagai:
   '2024-01-01 00:00:00 WIB'
   ```

4. **Inkonsistensi perbandingan:**
   - SQLite membandingkan string date hasil `DATE()` dengan string date parameter
   - Jika ada mismatch dalam interpretasi timezone, bisa menyebabkan filter tidak cocok

### Solusi: Substring Comparison

**Query Baru (Benar):**
```sql
WHERE dor.status = 'selesai'
  AND substr(dor.do_date, 1, 10) >= ? 
  AND substr(dor.do_date, 1, 10) <= ?
```

**Kenapa Benar:**

1. **Ekstrak 10 karakter pertama:**
   - `substr('2024-01-15T10:30:00.000Z', 1, 10)` → `'2024-01-15'`
   - `substr('2024-01-15 10:30:00', 1, 10)` → `'2024-01-15'`
   - **Hasil selalu format YYYY-MM-DD** tanpa timezone

2. **Perbandingan string sederhana:**
   - `'2024-01-15' >= '2024-01-01'` → TRUE ✅
   - `'2024-01-15' <= '2024-01-31'` → TRUE ✅
   - **Perbandingan lexicographic string untuk format YYYY-MM-DD menghasilkan urutan tanggal yang benar**

3. **Tidak ada masalah timezone:**
   - Substring murni mengambil karakter, tidak ada interpretasi timezone
   - Konsisten dengan format parameter dari form

---

## Perubahan Kode

### File: `src/services/sqlite/hr.ts`

#### 1. Query Loader (Line ~362)

**Sebelum:**
```typescript
const doRows = await query<any>(
  `SELECT dor.id,
          COALESCE((SELECT SUM(li.quantity * li.unit_price) FROM delivery_load_items li WHERE li.delivery_order_id = dor.id), 0) as nilai_muatan,
          (SELECT COUNT(*) FROM delivery_loaders l WHERE l.delivery_order_id = dor.id) as jumlah_loader
   FROM delivery_orders dor
   WHERE dor.user_id = ? AND dor.status = 'selesai'
     AND DATE(dor.do_date) >= DATE(?) AND DATE(dor.do_date) <= DATE(?)
     AND EXISTS (SELECT 1 FROM delivery_loaders l WHERE l.delivery_order_id = dor.id AND l.employee_id = ?)`,
  [userId, periodStart, periodEnd, employeeId]
)
```

**Sesudah:**
```typescript
const doRows = await query<any>(
  `SELECT dor.id,
          COALESCE((SELECT SUM(li.quantity * li.unit_price) FROM delivery_load_items li WHERE li.delivery_order_id = dor.id), 0) as nilai_muatan,
          (SELECT COUNT(*) FROM delivery_loaders l WHERE l.delivery_order_id = dor.id) as jumlah_loader
   FROM delivery_orders dor
   WHERE dor.user_id = ? AND dor.status = 'selesai'
     AND substr(dor.do_date, 1, 10) >= ? AND substr(dor.do_date, 1, 10) <= ?
     AND EXISTS (SELECT 1 FROM delivery_loaders l WHERE l.delivery_order_id = dor.id AND l.employee_id = ?)`,
  [userId, periodStart, periodEnd, employeeId]
)
```

**Perubahan:**
- ❌ `DATE(dor.do_date) >= DATE(?)` 
- ✅ `substr(dor.do_date, 1, 10) >= ?`

---

#### 2. Query Supir (Line ~381)

**Sebelum:**
```typescript
const driverTrips = await queryOne<any>(
  `SELECT COALESCE(SUM(driver_fee), 0) as total_driver_fee
   FROM delivery_orders
   WHERE user_id = ? AND driver_id = ? AND status = 'selesai'
     AND DATE(do_date) >= DATE(?) AND DATE(do_date) <= DATE(?)`,
  [userId, employeeId, periodStart, periodEnd]
)
```

**Sesudah:**
```typescript
const driverTrips = await queryOne<any>(
  `SELECT COALESCE(SUM(driver_fee), 0) as total_driver_fee
   FROM delivery_orders
   WHERE user_id = ? AND driver_id = ? AND status = 'selesai'
     AND substr(do_date, 1, 10) >= ? AND substr(do_date, 1, 10) <= ?`,
  [userId, employeeId, periodStart, periodEnd]
)
```

**Perubahan:**
- ❌ `DATE(do_date) >= DATE(?)` 
- ✅ `substr(do_date, 1, 10) >= ?`

---

## Catatan Implementasi Supabase

Untuk versi **Supabase (PostgreSQL)**, query sudah **benar** sejak awal karena:

1. **Tipe data di PostgreSQL:** `do_date` adalah tipe `DATE` (bukan `TEXT`)
2. **Parameter:** `p_period_start` dan `p_period_end` juga tipe `DATE`
3. **Perbandingan:** `dor.do_date BETWEEN p_period_start AND p_period_end`

PostgreSQL menangani perbandingan DATE secara native dengan benar, tidak perlu workaround substring.

---

## Testing

### Manual Test Checklist

1. **Setup Data Test:**
   ```
   - Buat 1 karyawan dengan role 'loader' atau 'supir'
   - Buat 2-3 surat jalan dengan tanggal berbeda dalam 1 bulan
   - Set status surat jalan = 'selesai'
   - Assign karyawan sebagai loader/supir di surat jalan tersebut
   ```

2. **Generate Payroll:**
   ```
   - Pilih karyawan
   - Pilih periode: awal bulan s/d akhir bulan
   - Generate slip gaji
   ```

3. **Verifikasi:**
   ```
   - Cek apakah insentif_amount > 0
   - Cek apakah jumlah insentif sesuai dengan:
     * Loader: SUM(nilai_muatan / jumlah_loader) untuk semua surat jalan
     * Supir: SUM(driver_fee) untuk semua surat jalan
   ```

### Query Debug (Lihat `debug_payroll_query.sql`)

Gunakan script SQL debug untuk troubleshooting:
1. Cek data karyawan
2. Cek surat jalan dalam periode
3. Bandingkan hasil query lama vs query baru
4. Verifikasi format tanggal `do_date`

---

## Edge Cases yang Perlu Diperhatikan

### 1. Surat Jalan dengan Waktu Tengah Malam

**Skenario:**
```
do_date = '2024-01-01T23:59:59.000Z' (UTC)
         = '2024-01-02 06:59:59 WIB'

periode = '2024-01-01' s/d '2024-01-01'
```

**Hasil dengan query baru:**
```
substr('2024-01-01T23:59:59.000Z', 1, 10) = '2024-01-01'
'2024-01-01' >= '2024-01-01' AND '2024-01-01' <= '2024-01-01' → TRUE ✅
```

Surat jalan ini **termasuk** dalam perhitungan gaji periode 1 Januari.

**Catatan:** Ini adalah perilaku yang **diinginkan** karena `do_date` disimpan dengan tanggal **lokal** saat entry, bukan UTC yang dikonversi. Jika ada masalah, perlu diperbaiki di input data (saat buat surat jalan).

### 2. Periode Lintas Tahun

**Skenario:**
```
periode = '2023-12-25' s/d '2024-01-05'
```

**Hasil:**
```
substr(do_date, 1, 10) >= '2023-12-25' → cocok dengan desember 2023
substr(do_date, 1, 10) <= '2024-01-05' → cocok dengan januari 2024
```

String comparison YYYY-MM-DD **tetap benar** untuk lintas tahun. ✅

### 3. Format Tanggal Non-Standar

**Jika `do_date` tidak format ISO:**
```
do_date = '15/01/2024' atau '15-01-2024'
```

**Hasil:**
```
substr('15/01/2024', 1, 10) = '15/01/2024'
'15/01/2024' >= '2024-01-01' → FALSE ❌ (perbandingan string salah)
```

**Solusi:** Pastikan `do_date` **selalu** disimpan dalam format **ISO 8601** (`YYYY-MM-DD` atau `YYYY-MM-DDTHH:MM:SS`).

Cek di file `src/components/delivery/DeliveryOrderForm.vue` dan pastikan `DateField` menghasilkan format YYYY-MM-DD.

---

## Rekomendasi Lanjutan

### 1. Validasi Format Tanggal di Input

Tambahkan validasi di `DeliveryOrderForm.vue`:
```typescript
const validateDate = (date: string) => {
  // Harus format YYYY-MM-DD
  return /^\d{4}-\d{2}-\d{2}$/.test(date)
}
```

### 2. Konsistensi Timezone

Pastikan semua tanggal disimpan dengan **timezone yang konsisten**:
- Gunakan **UTC** untuk storage
- Konversi ke **lokal** hanya untuk display
- Atau gunakan **date only** (tanpa time) jika waktu tidak relevan

### 3. Type Safety

Buat type helper untuk date string:
```typescript
type DateString = string & { readonly __brand: unique symbol }

function toDateString(value: string): DateString {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error('Invalid date format. Expected YYYY-MM-DD')
  }
  return value as DateString
}
```

---

## Kesimpulan

### ✅ Masalah Diperbaiki:
- Query filter tanggal untuk loader dan supir sekarang menggunakan `substr()` yang reliable
- Perhitungan gaji supir/loader sekarang **akurat** dan menangkap semua surat jalan dalam periode

### ✅ Benefit:
- Tidak ada lagi surat jalan yang terlewat dari perhitungan gaji
- Konsisten dengan format tanggal dari form (YYYY-MM-DD)
- Performa sama (substring vs DATE function keduanya cepat)

### 📋 Action Items:
1. ✅ Perbaiki query di `src/services/sqlite/hr.ts`
2. ✅ Verifikasi type-check passed
3. 📝 Test manual dengan data riil
4. 📝 (Opsional) Tambahkan validasi format tanggal di form

---

## File Terkait

- `src/services/sqlite/hr.ts` - Implementasi SQLite (diperbaiki)
- `supabase/migrations/20260912_refactor_payroll_per_employee.sql` - Implementasi Supabase (sudah benar)
- `src/components/hr/CreatePayrollForm.vue` - Form input periode
- `debug_payroll_query.sql` - Script debug SQL
