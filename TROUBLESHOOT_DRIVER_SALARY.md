# Troubleshooting: Gaji Supir Tetap 0

**Masalah:** Gaji supir masih 0 meski sudah isi Rp100.000 di kolom driver_fee surat jalan.

---

## Checklist Debugging

### 1. ✅ Verifikasi Data Surat Jalan

Jalankan query ini di SQLite console atau via script:

```sql
-- Ganti dengan ID karyawan supir yang bermasalah
SELECT 
  do_number,
  do_date,
  substr(do_date, 1, 10) as tanggal,
  status,
  driver_id,
  driver_fee,
  typeof(driver_fee) as tipe_data
FROM delivery_orders
WHERE driver_id = 'PASTE_EMPLOYEE_ID_HERE'
ORDER BY do_date DESC
LIMIT 10;
```

**Yang perlu dicek:**
- [ ] `driver_fee` tidak NULL → harus ada angka (misal: 100000)
- [ ] `driver_fee` tidak 0 → harus > 0
- [ ] `status` = `'selesai'` → bukan 'draft' atau 'disiapkan'
- [ ] `do_date` dalam format yang benar → 'YYYY-MM-DD...'

---

### 2. ✅ Verifikasi Status Surat Jalan

**PENTING:** Gaji supir hanya dihitung dari surat jalan dengan **status = 'selesai'**

Cek status surat jalan Anda:

```sql
SELECT 
  do_number,
  status,
  driver_fee,
  CASE status
    WHEN 'draft' THEN '❌ TIDAK DIHITUNG (masih draft)'
    WHEN 'disiapkan' THEN '❌ TIDAK DIHITUNG (belum selesai)'
    WHEN 'dalam_pengiriman' THEN '❌ TIDAK DIHITUNG (belum selesai)'
    WHEN 'selesai' THEN '✅ DIHITUNG'
    ELSE '❌ Status tidak dikenali'
  END as keterangan
FROM delivery_orders
WHERE driver_id = 'PASTE_EMPLOYEE_ID_HERE'
ORDER BY do_date DESC;
```

**Jika status bukan 'selesai', ubah statusnya:**

```sql
UPDATE delivery_orders 
SET status = 'selesai' 
WHERE id = 'PASTE_DELIVERY_ORDER_ID_HERE';
```

---

### 3. ✅ Verifikasi Periode Payroll

Pastikan tanggal surat jalan **dalam periode** yang dipilih saat generate payroll:

```sql
-- Contoh: periode 1-31 Januari 2024
SELECT 
  do_number,
  substr(do_date, 1, 10) as tanggal,
  driver_fee,
  CASE 
    WHEN substr(do_date, 1, 10) >= '2024-01-01' 
     AND substr(do_date, 1, 10) <= '2024-01-31' 
    THEN '✅ MASUK periode'
    ELSE '❌ TIDAK MASUK periode'
  END as status_periode
FROM delivery_orders
WHERE driver_id = 'PASTE_EMPLOYEE_ID_HERE'
  AND status = 'selesai'
ORDER BY do_date DESC;
```

**Tips:** Pastikan format tanggal konsisten YYYY-MM-DD

---

### 4. ✅ Simulasi Query Perhitungan

Jalankan query yang sama seperti di code untuk melihat hasil:

```sql
-- Query EXACT seperti di generatePayroll
SELECT 
  COALESCE(SUM(driver_fee), 0) as total_driver_fee,
  COUNT(*) as jumlah_surat_jalan
FROM delivery_orders
WHERE user_id = 'PASTE_USER_ID_HERE'
  AND driver_id = 'PASTE_EMPLOYEE_ID_HERE' 
  AND status = 'selesai'
  AND substr(do_date, 1, 10) >= '2024-01-01'  -- ganti dengan period_start Anda
  AND substr(do_date, 1, 10) <= '2024-01-31'; -- ganti dengan period_end Anda
```

**Hasil yang diharapkan:**
- `total_driver_fee` = jumlah yang Anda input (misal: 100000)
- `jumlah_surat_jalan` = jumlah surat jalan selesai dalam periode

**Jika hasilnya 0:**
- Cek `user_id` → harus sama dengan user yang login
- Cek `driver_id` → harus ID karyawan yang benar
- Cek `status` → harus 'selesai'
- Cek tanggal → harus dalam periode

---

### 5. ✅ Cek Tipe Data driver_fee

Pastikan `driver_fee` disimpan sebagai angka, bukan string:

```sql
SELECT 
  do_number,
  driver_fee,
  typeof(driver_fee) as tipe_data,
  CAST(driver_fee AS REAL) as driver_fee_numeric
FROM delivery_orders
WHERE driver_id = 'PASTE_EMPLOYEE_ID_HERE'
LIMIT 5;
```

**Tipe data yang benar:**
- `integer` atau `real` → ✅ OK
- `text` → ⚠️ Bisa jadi masalah

**Jika tipe data TEXT, convert manual:**

```sql
UPDATE delivery_orders 
SET driver_fee = CAST(driver_fee AS REAL)
WHERE typeof(driver_fee) = 'text';
```

---

### 6. ✅ Verifikasi Karyawan adalah Supir

Cek apakah karyawan memang terdaftar sebagai supir di tabel `delivery_orders`:

```sql
SELECT 
  'Karyawan ini adalah supir' as info,
  COUNT(*) as total_surat_jalan_sebagai_supir
FROM delivery_orders
WHERE driver_id = 'PASTE_EMPLOYEE_ID_HERE';
```

**Jika hasilnya 0:**
- Karyawan ini **belum pernah** jadi supir
- Periksa apakah `driver_id` sudah diisi dengan benar saat buat surat jalan

---

## Solusi Paling Umum

### ⚠️ Masalah #1: Status Belum 'selesai'

**Gejala:** `driver_fee` sudah diisi, tapi status masih 'disiapkan' atau 'dalam_pengiriman'

**Solusi:**
1. Buka detail surat jalan
2. Ubah status menjadi **'Selesai'**
3. Generate ulang payroll

**Via SQL:**
```sql
UPDATE delivery_orders 
SET status = 'selesai' 
WHERE do_number = 'SJ-20240115-001';  -- ganti dengan nomor surat jalan
```

---

### ⚠️ Masalah #2: Tanggal di Luar Periode

**Gejala:** Surat jalan ada, status selesai, tapi tanggalnya tidak dalam periode payroll

**Contoh:**
- Surat jalan: 2024-01-15
- Periode payroll: 2024-02-01 s/d 2024-02-28
- Hasil: Tidak dihitung ❌

**Solusi:**
- Pilih periode yang benar saat generate payroll
- Atau ubah `do_date` jika memang salah input

---

### ⚠️ Masalah #3: driver_fee = NULL atau 0

**Gejala:** Field `driver_fee` kosong (NULL) atau 0

**Solusi:**
1. Edit surat jalan
2. Isi kolom "Gaji Sopir" dengan nominal yang benar
3. Save
4. Generate ulang payroll

**Via SQL:**
```sql
UPDATE delivery_orders 
SET driver_fee = 100000 
WHERE do_number = 'SJ-20240115-001';
```

---

### ⚠️ Masalah #4: driver_id Salah

**Gejala:** Surat jalan ada tapi `driver_id` tidak cocok dengan karyawan

**Solusi:**
```sql
-- Cek driver_id di surat jalan
SELECT do_number, driver_id, driver_name 
FROM delivery_orders 
WHERE do_number = 'SJ-20240115-001';

-- Cek ID karyawan yang benar
SELECT id, name FROM employees WHERE name LIKE '%nama_supir%';

-- Update jika salah
UPDATE delivery_orders 
SET driver_id = 'ID_KARYAWAN_YANG_BENAR'
WHERE do_number = 'SJ-20240115-001';
```

---

## Debugging Step-by-Step

### Langkah 1: Ambil Data Karyawan
```sql
SELECT id, name, role FROM employees 
WHERE name LIKE '%nama_supir%';
```

Copy `id` karyawan.

### Langkah 2: Cek Semua Surat Jalan Supir Ini
```sql
SELECT 
  do_number,
  do_date,
  status,
  driver_fee,
  CASE 
    WHEN status = 'selesai' AND driver_fee > 0 THEN '✅ OK'
    WHEN status != 'selesai' THEN '❌ Status: ' || status
    WHEN driver_fee IS NULL OR driver_fee = 0 THEN '❌ Driver fee: ' || COALESCE(driver_fee, 'NULL')
    ELSE '❌ Masalah lain'
  END as keterangan
FROM delivery_orders
WHERE driver_id = 'PASTE_ID_DARI_LANGKAH_1'
ORDER BY do_date DESC;
```

### Langkah 3: Perbaiki yang Bermasalah

Jika ada yang statusnya bukan 'selesai':
```sql
UPDATE delivery_orders 
SET status = 'selesai' 
WHERE id = 'PASTE_DELIVERY_ORDER_ID';
```

Jika driver_fee NULL atau 0:
```sql
UPDATE delivery_orders 
SET driver_fee = 100000  -- ganti dengan nominal yang benar
WHERE id = 'PASTE_DELIVERY_ORDER_ID';
```

### Langkah 4: Generate Ulang Payroll

1. Hapus slip gaji lama (jika ada)
2. Buka form Generate Payroll
3. Pilih karyawan
4. Pilih periode yang benar (cek tanggal surat jalan)
5. Generate
6. Cek apakah insentif sudah muncul

---

## Script Debug Lengkap

Gunakan file `debug_driver_salary.sql` yang sudah saya buat untuk debugging menyeluruh.

---

## Jika Masih Belum Berhasil

Kirimkan hasil query berikut:

```sql
-- 1. Data karyawan
SELECT id, name, role, employee_code FROM employees 
WHERE id = 'PASTE_EMPLOYEE_ID';

-- 2. Surat jalan karyawan
SELECT 
  do_number, do_date, status, driver_id, driver_fee, 
  typeof(driver_fee), user_id
FROM delivery_orders
WHERE driver_id = 'PASTE_EMPLOYEE_ID'
ORDER BY do_date DESC
LIMIT 5;

-- 3. Hasil query perhitungan
SELECT 
  COALESCE(SUM(driver_fee), 0) as total,
  COUNT(*) as jumlah
FROM delivery_orders
WHERE driver_id = 'PASTE_EMPLOYEE_ID' 
  AND status = 'selesai'
  AND substr(do_date, 1, 10) >= '2024-01-01'
  AND substr(do_date, 1, 10) <= '2024-01-31';
```

Sertakan:
- Periode payroll yang dipilih
- Screenshot form surat jalan (khususnya bagian status & gaji sopir)
- Screenshot hasil generate payroll
