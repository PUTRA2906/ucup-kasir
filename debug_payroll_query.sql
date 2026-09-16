-- Script Debug: Perhitungan Gaji Supir/Loader
-- Ganti parameter berikut dengan data aktual:
-- @employee_id = ID karyawan yang bermasalah
-- @period_start = '2024-01-01' (contoh)
-- @period_end = '2024-01-31' (contoh)

-- 1. Cek data karyawan
SELECT 
  id,
  name,
  role,
  base_salary,
  status,
  is_active
FROM employees 
WHERE id = @employee_id;

-- 2. Cek apakah karyawan pernah jadi loader
SELECT 
  'Karyawan adalah Loader' as info,
  COUNT(*) as jumlah_surat_jalan_sebagai_loader
FROM delivery_loaders 
WHERE employee_id = @employee_id;

-- 3. Cek apakah karyawan pernah jadi supir
SELECT 
  'Karyawan adalah Supir' as info,
  COUNT(*) as jumlah_surat_jalan_sebagai_supir
FROM delivery_orders 
WHERE driver_id = @employee_id;

-- 4. Query loader - SEBELUM PERBAIKAN (ada masalah DATE)
SELECT 
  dor.id,
  dor.do_number,
  dor.do_date,
  DATE(dor.do_date) as do_date_only,
  dor.status,
  COALESCE((SELECT SUM(li.quantity * li.unit_price) FROM delivery_load_items li WHERE li.delivery_order_id = dor.id), 0) as nilai_muatan,
  (SELECT COUNT(*) FROM delivery_loaders l WHERE l.delivery_order_id = dor.id) as jumlah_loader,
  -- Perhitungan per loader
  CASE 
    WHEN (SELECT COUNT(*) FROM delivery_loaders l WHERE l.delivery_order_id = dor.id) > 0 
    THEN CAST(COALESCE((SELECT SUM(li.quantity * li.unit_price) FROM delivery_load_items li WHERE li.delivery_order_id = dor.id), 0) / 
              (SELECT COUNT(*) FROM delivery_loaders l WHERE l.delivery_order_id = dor.id) AS INTEGER)
    ELSE 0
  END as insentif_per_loader
FROM delivery_orders dor
WHERE dor.status = 'selesai'
  AND DATE(dor.do_date) >= DATE(@period_start) 
  AND DATE(dor.do_date) <= DATE(@period_end)
  AND EXISTS (SELECT 1 FROM delivery_loaders l WHERE l.delivery_order_id = dor.id AND l.employee_id = @employee_id);

-- 5. Query supir - SEBELUM PERBAIKAN
SELECT 
  dor.id,
  dor.do_number,
  dor.do_date,
  DATE(dor.do_date) as do_date_only,
  dor.status,
  dor.driver_fee
FROM delivery_orders dor
WHERE dor.driver_id = @employee_id 
  AND dor.status = 'selesai'
  AND DATE(dor.do_date) >= DATE(@period_start) 
  AND DATE(dor.do_date) <= DATE(@period_end);

-- 6. Cek format tanggal do_date
SELECT 
  do_number,
  do_date,
  typeof(do_date) as tipe_data_do_date,
  -- Ekstrak komponen tanggal
  substr(do_date, 1, 10) as tanggal_saja,
  -- Bandingkan dengan periode
  CASE 
    WHEN DATE(do_date) >= DATE(@period_start) THEN 'Setelah/sama dengan period_start'
    ELSE 'Sebelum period_start'
  END as vs_start,
  CASE 
    WHEN DATE(do_date) <= DATE(@period_end) THEN 'Sebelum/sama dengan period_end'
    ELSE 'Setelah period_end'
  END as vs_end
FROM delivery_orders
WHERE status = 'selesai'
ORDER BY do_date DESC
LIMIT 20;

-- 7. MASALAH YANG MUNGKIN TERJADI:
-- a. do_date berformat datetime (YYYY-MM-DD HH:MM:SS) atau timestamp
-- b. period_start/period_end adalah string 'YYYY-MM-DD'
-- c. Perbandingan DATE(do_date) dengan DATE('YYYY-MM-DD') mungkin tidak cocok karena timezone

-- SOLUSI: Gunakan perbandingan string untuk tanggal saja
-- Query loader - SETELAH PERBAIKAN
SELECT 
  dor.id,
  dor.do_number,
  dor.do_date,
  substr(dor.do_date, 1, 10) as do_date_str,
  dor.status,
  COALESCE((SELECT SUM(li.quantity * li.unit_price) FROM delivery_load_items li WHERE li.delivery_order_id = dor.id), 0) as nilai_muatan,
  (SELECT COUNT(*) FROM delivery_loaders l WHERE l.delivery_order_id = dor.id) as jumlah_loader,
  CASE 
    WHEN (SELECT COUNT(*) FROM delivery_loaders l WHERE l.delivery_order_id = dor.id) > 0 
    THEN CAST(COALESCE((SELECT SUM(li.quantity * li.unit_price) FROM delivery_load_items li WHERE li.delivery_order_id = dor.id), 0) / 
              (SELECT COUNT(*) FROM delivery_loaders l WHERE l.delivery_order_id = dor.id) AS INTEGER)
    ELSE 0
  END as insentif_per_loader
FROM delivery_orders dor
WHERE dor.status = 'selesai'
  AND substr(dor.do_date, 1, 10) >= @period_start 
  AND substr(dor.do_date, 1, 10) <= @period_end
  AND EXISTS (SELECT 1 FROM delivery_loaders l WHERE l.delivery_order_id = dor.id AND l.employee_id = @employee_id);

-- Query supir - SETELAH PERBAIKAN
SELECT 
  dor.id,
  dor.do_number,
  dor.do_date,
  substr(dor.do_date, 1, 10) as do_date_str,
  dor.status,
  dor.driver_fee
FROM delivery_orders dor
WHERE dor.driver_id = @employee_id 
  AND dor.status = 'selesai'
  AND substr(dor.do_date, 1, 10) >= @period_start 
  AND substr(dor.do_date, 1, 10) <= @period_end;
