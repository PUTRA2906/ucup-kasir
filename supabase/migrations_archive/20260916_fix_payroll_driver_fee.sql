-- ============================================================
-- Migrasi: Perbaikan gaji supir — RPC generate_payroll_for_employee
--
-- Masalah: function payroll di production adalah versi lama yang TIDAK
-- memuat blok insentif supir (SUM driver_fee dari delivery_orders status
-- 'selesai'), sehingga gaji supir selalu 0 meski driver_fee sudah diisi
-- di surat jalan. Kolom driver_fee (migrasi 20260908/20260916) sudah ada
-- dan terisi, hanya perhitungannya yang hilang.
--
-- Perubahan: recreate generate_payroll_for_employee dengan:
--   1. Blok insentif SUPIR — ditambahkan.
--   2. Sumber gaji pokok — employees.base_salary saja (tabel `positions`
--      sudah dihapus; jabatan kini teks employees.position). File lama
--      20260912 me-LEFT JOIN positions dan tidak bisa diterapkan apa
--      adanya ke schema sekarang.
--   3. Blok insentif LOADER — dipertahankan (sudah ada di produksi).
--   generate_payroll_code() ikut di-assert agar identik dengan repo.
-- ============================================================

CREATE OR REPLACE FUNCTION generate_payroll_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
  v_code TEXT;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM payrolls
  WHERE user_id = auth.uid()
    AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM now())
    AND EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM now());

  v_code := 'PAY-' || to_char(now(), 'YYYYMM') || '-' || LPAD((v_count + 1)::TEXT, 4, '0');
  RETURN v_code;
END;
$$;

CREATE OR REPLACE FUNCTION generate_payroll_for_employee(
  p_employee_id uuid,
  p_period_start date,
  p_period_end date,
  p_kasbon_deduction numeric DEFAULT 0
) RETURNS payrolls
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_employee RECORD;
  v_payroll_id uuid;
  v_period_code TEXT;
  v_base_salary numeric;
  v_incentive numeric;
  v_net numeric;
  v_do RECORD;
  v_result payrolls;
BEGIN
  v_user_id := auth.uid();

  -- Validasi karyawan
  SELECT e.* INTO v_employee
  FROM employees e
  WHERE e.id = p_employee_id AND e.user_id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Karyawan tidak ditemukan';
  END IF;

  IF v_employee.status != 'aktif' OR v_employee.is_active = false THEN
    RAISE EXCEPTION 'Karyawan tidak aktif';
  END IF;

  -- Validasi tanggal
  IF p_period_start > p_period_end THEN
    RAISE EXCEPTION 'Tanggal mulai tidak boleh lebih besar dari tanggal selesai';
  END IF;

  -- Generate kode slip gaji
  v_period_code := generate_payroll_code();
  v_payroll_id := gen_random_uuid();

  -- Gaji pokok (satu-satunya sumber: base_salary karyawan)
  v_base_salary := COALESCE(NULLIF(v_employee.base_salary, 0), 0);

  v_incentive := 0;

  -- ============================================================
  -- Insentif dari surat jalan (status 'selesai', do_date dalam periode)
  -- 1. LOADER: bagi rata nilai muatan (CEIL), per orang.
  -- 2. SUPIR: total driver_fee dari surat jalan yang dia kendarai.
  -- ============================================================

  -- Insentif loader
  IF EXISTS (
    SELECT 1 FROM delivery_loaders l WHERE l.employee_id = p_employee_id
  ) THEN
    FOR v_do IN
      SELECT dor.id,
             COALESCE((
               SELECT SUM(li.quantity * li.unit_price)
               FROM delivery_load_items li
               WHERE li.delivery_order_id = dor.id
             ), 0) AS nilai_muatan,
             (
               SELECT COUNT(*)
               FROM delivery_loaders l
               WHERE l.delivery_order_id = dor.id
             ) AS jumlah_loader
      FROM delivery_orders dor
      WHERE dor.user_id = v_user_id
        AND dor.status = 'selesai'
        AND dor.do_date BETWEEN p_period_start AND p_period_end
        AND EXISTS (
          SELECT 1
          FROM delivery_loaders l
          WHERE l.delivery_order_id = dor.id
            AND l.employee_id = p_employee_id
        )
    LOOP
      IF v_do.jumlah_loader > 0 AND v_do.nilai_muatan > 0 THEN
        v_incentive := v_incentive + CEIL(v_do.nilai_muatan / v_do.jumlah_loader);
      END IF;
    END LOOP;
  END IF;

  -- Insentif supir (driver_fee) — BAGIAN YANG HILANG DI VERSI PRODUKSI LAMA
  v_incentive := v_incentive + COALESCE((
    SELECT SUM(dor.driver_fee)
    FROM delivery_orders dor
    WHERE dor.user_id = v_user_id
      AND dor.status = 'selesai'
      AND dor.do_date BETWEEN p_period_start AND p_period_end
      AND dor.driver_id = p_employee_id
      AND dor.driver_fee IS NOT NULL
      AND dor.driver_fee > 0
  ), 0);

  -- Hitung gaji bersih
  v_net := v_base_salary + v_incentive - COALESCE(p_kasbon_deduction, 0);

  -- Insert slip gaji
  INSERT INTO payrolls (
    id, user_id, employee_id,
    period_code, period_start, period_end,
    base_salary, incentive_amount, kasbon_deduction, total_net,
    status, created_at, updated_at
  ) VALUES (
    v_payroll_id, v_user_id, p_employee_id,
    v_period_code, p_period_start, p_period_end,
    v_base_salary, v_incentive, COALESCE(p_kasbon_deduction, 0), v_net,
    'draft', now(), now()
  )
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION generate_payroll_for_employee IS
  'Buat slip gaji per karyawan untuk periode tertentu. Insentif: bagi rata nilai muatan untuk loader + total driver_fee surat jalan selesai untuk supir. Potongan kasbon manual.';
