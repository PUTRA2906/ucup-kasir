-- DEBUG SCRIPT: Troubleshoot Gaji Supir
-- Ganti parameter berikut dengan data riil Anda:

-- STEP 1: Cari ID karyawan supir
SELECT 
  id,
  name,
  employee_code,
  role,
  position,
  base_salary
FROM employees
WHERE role LIKE '%supir%' OR position LIKE '%supir%' OR role LIKE '%driver%';

-- Copy ID karyawan yang bermasalah, lalu set di bawah:
-- SET @employee_id = 'paste-employee-id-here';
-- SET @period_start = '2024-01-01';
-- SET @period_end = '2024-01-31';

-- STEP 2: Cek semua surat jalan untuk supir ini
SELECT 
  id,
  do_number,
  do_date,
  substr(do_date, 1, 10) as tanggal_saja,
  status,
  driver_id,
  driver_fee,
  typeof(driver_fee) as tipe_driver_fee,
  CASE 
    WHEN driver_fee IS NULL THEN 'NULL'
    WHEN driver_fee = 0 THEN 'ZERO'
    WHEN driver_fee > 0 THEN 'ADA NILAI'
    ELSE 'UNKNOWN'
  END as status_driver_fee
FROM delivery_orders
WHERE driver_id = @employee_id
ORDER BY do_date DESC;

-- STEP 3: Cek surat jalan dalam periode tertentu
SELECT 
  id,
  do_number,
  do_date,
  substr(do_date, 1, 10) as tanggal,
  status,
  driver_fee,
  -- Cek apakah masuk filter periode
  CASE 
    WHEN substr(do_date, 1, 10) >= @period_start THEN 'OK: >= period_start'
    ELSE 'GAGAL: < period_start'
  END as cek_start,
  CASE 
    WHEN substr(do_date, 1, 10) <= @period_end THEN 'OK: <= period_end'
    ELSE 'GAGAL: > period_end'
  END as cek_end,
  CASE 
    WHEN status = 'selesai' THEN 'OK: status selesai'
    ELSE 'GAGAL: status = ' || status
  END as cek_status
FROM delivery_orders
WHERE driver_id = @employee_id
  AND substr(do_date, 1, 10) >= @period_start
  AND substr(do_date, 1, 10) <= @period_end
ORDER BY do_date;

-- STEP 4: Simulasi query yang digunakan di generatePayroll
SELECT 
  'Total driver_fee dalam periode' as info,
  COALESCE(SUM(driver_fee), 0) as total_driver_fee,
  COUNT(*) as jumlah_surat_jalan
FROM delivery_orders
WHERE driver_id = @employee_id 
  AND status = 'selesai'
  AND substr(do_date, 1, 10) >= @period_start 
  AND substr(do_date, 1, 10) <= @period_end;

-- STEP 5: Cek detail per surat jalan
SELECT 
  do_number,
  do_date,
  status,
  driver_fee,
  CAST(driver_fee AS REAL) as driver_fee_numeric,
  driver_fee + 0 as driver_fee_math_test
FROM delivery_orders
WHERE driver_id = @employee_id 
  AND status = 'selesai'
  AND substr(do_date, 1, 10) >= @period_start 
  AND substr(do_date, 1, 10) <= @period_end;

-- STEP 6: Cek apakah ada kondisi NULL atau 0
SELECT 
  'Kondisi driver_fee' as analisis,
  COUNT(*) as total_surat_jalan,
  COUNT(CASE WHEN driver_fee IS NULL THEN 1 END) as jumlah_null,
  COUNT(CASE WHEN driver_fee = 0 THEN 1 END) as jumlah_zero,
  COUNT(CASE WHEN driver_fee > 0 THEN 1 END) as jumlah_ada_nilai,
  COALESCE(SUM(driver_fee), 0) as total_fee
FROM delivery_orders
WHERE driver_id = @employee_id 
  AND status = 'selesai'
  AND substr(do_date, 1, 10) >= @period_start 
  AND substr(do_date, 1, 10) <= @period_end;

-- STEP 7: Cek tipe data kolom driver_fee
PRAGMA table_info(delivery_orders);

-- STEP 8: Test dengan berbagai kondisi filter
-- A. Tanpa filter tanggal
SELECT 'Tanpa filter tanggal' as test, COALESCE(SUM(driver_fee), 0) as total
FROM delivery_orders
WHERE driver_id = @employee_id AND status = 'selesai';

-- B. Hanya filter status
SELECT 'Hanya filter status' as test, COALESCE(SUM(driver_fee), 0) as total
FROM delivery_orders
WHERE driver_id = @employee_id AND status = 'selesai';

-- C. Filter lengkap (seperti di code)
SELECT 'Filter lengkap' as test, COALESCE(SUM(driver_fee), 0) as total
FROM delivery_orders
WHERE driver_id = @employee_id 
  AND status = 'selesai'
  AND substr(do_date, 1, 10) >= @period_start 
  AND substr(do_date, 1, 10) <= @period_end;

-- KEMUNGKINAN MASALAH:
-- 1. driver_fee = NULL (bukan 0, tapi benar-benar NULL)
-- 2. Status surat jalan bukan 'selesai' (misal: 'disiapkan', 'dalam_pengiriman')
-- 3. Tanggal do_date tidak dalam periode
-- 4. driver_id tidak cocok (typo atau ID salah)
-- 5. Tipe data driver_fee adalah TEXT, bukan REAL/INTEGER

-- SOLUSI SEMENTARA: Update manual driver_fee
-- UPDATE delivery_orders 
-- SET driver_fee = 100000 
-- WHERE id = 'paste-delivery-order-id-here';
