-- ============================================================
-- Migrasi: Payroll Berbasis Insentif (Tanpa Gaji Pokok)
--
-- Sistem payroll diubah untuk karyawan yang HANYA menerima insentif
-- berdasarkan pekerjaan (muat/bongkar), tanpa gaji pokok.
--
-- Perubahan:
-- 1. Generate payroll HANYA untuk karyawan yang punya insentif
-- 2. Skip karyawan tanpa insentif di periode tersebut
-- 3. Base salary bisa 0 atau NULL
-- 4. Slip gaji hanya dibuat jika ada insentif
-- ============================================================

DROP FUNCTION IF EXISTS generate_payroll(uuid);
CREATE OR REPLACE FUNCTION generate_payroll(
  p_period_id uuid
) RETURNS SETOF payrolls
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_period payroll_periods%ROWTYPE;
  v_settings store_settings%ROWTYPE;
  v_employee RECORD;
  v_payroll_id uuid;
  v_allowance numeric;
  v_deduction numeric;
  v_gross numeric;
  v_net numeric;
  v_component RECORD;
  v_comp_amount numeric;
  -- insentif bongkar muat
  v_insentif numeric;
  v_trip RECORD;
  v_karung numeric;
  v_orang numeric;
  v_has_income boolean;
BEGIN
  v_user_id := auth.uid();

  -- Validasi period
  SELECT * INTO v_period
  FROM payroll_periods
  WHERE id = p_period_id AND user_id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Periode payroll tidak ditemukan';
  END IF;

  IF v_period.status = 'paid' THEN
    RAISE EXCEPTION 'Periode payroll sudah dibayar, tidak bisa digenerate ulang';
  END IF;

  -- Rate global (fallback bila trip tidak override)
  SELECT * INTO v_settings
  FROM store_settings
  WHERE user_id = v_user_id;

  -- Hapus payroll lama untuk periode ini (jika regenerate)
  DELETE FROM payroll_items WHERE payroll_id IN (SELECT id FROM payrolls WHERE period_id = p_period_id AND user_id = v_user_id);
  DELETE FROM payrolls WHERE period_id = p_period_id AND user_id = v_user_id;

  -- Loop semua karyawan aktif
  FOR v_employee IN
    SELECT e.*, p.base_salary as position_salary
    FROM employees e
    LEFT JOIN positions p ON p.id = e.position_id
    WHERE e.user_id = v_user_id AND e.is_active = true AND e.status = 'aktif'
  LOOP
    -- Reset untuk setiap karyawan
    v_payroll_id := gen_random_uuid();
    v_allowance := 0;
    v_deduction := 0;
    v_has_income := false;

    -- Gaji pokok (bisa 0 untuk karyawan loader/supir)
    v_gross := COALESCE(NULLIF(v_employee.base_salary, 0), COALESCE(v_employee.position_salary, 0), 0);

    -- ============================================================
    -- HITUNG INSENTIF BONGKAR MUAT TERLEBIH DAHULU
    -- Untuk menentukan apakah karyawan ini punya penghasilan
    -- ============================================================
    v_insentif := 0;

    -- Peran MUAT
    FOR v_trip IN
      SELECT t.id AS trip_id,
             COALESCE(t.muat_rate, COALESCE(v_settings.loading_rate_per_sack, 0)) AS rate
      FROM trips t
      WHERE t.user_id = v_user_id
        AND t.status = 'selesai'
        AND t.trip_date BETWEEN v_period.start_date AND v_period.end_date
        AND EXISTS (
          SELECT 1 FROM trip_loaders l
          WHERE l.trip_id = t.id AND l.employee_id = v_employee.id AND l.role = 'muat'
        )
    LOOP
      SELECT COALESCE(SUM(di.quantity), 0) INTO v_karung
      FROM delivery_orders dor
      JOIN delivery_items di ON di.delivery_order_id = dor.id
      WHERE dor.trip_id = v_trip.trip_id;

      SELECT COUNT(*) INTO v_orang
      FROM trip_loaders WHERE trip_id = v_trip.trip_id AND role = 'muat';

      IF v_orang > 0 AND v_karung > 0 THEN
        v_insentif := v_insentif + CEIL(v_karung * v_trip.rate / v_orang);
      END IF;
    END LOOP;

    -- Peran BONGKAR
    FOR v_trip IN
      SELECT t.id AS trip_id,
             COALESCE(t.bongkar_rate, COALESCE(v_settings.unloading_rate_per_sack, 0)) AS rate
      FROM trips t
      WHERE t.user_id = v_user_id
        AND t.status = 'selesai'
        AND t.trip_date BETWEEN v_period.start_date AND v_period.end_date
        AND EXISTS (
          SELECT 1 FROM trip_loaders l
          WHERE l.trip_id = t.id AND l.employee_id = v_employee.id AND l.role = 'bongkar'
        )
    LOOP
      SELECT COALESCE(SUM(di.quantity), 0) INTO v_karung
      FROM delivery_orders dor
      JOIN delivery_items di ON di.delivery_order_id = dor.id
      WHERE dor.trip_id = v_trip.trip_id;

      SELECT COUNT(*) INTO v_orang
      FROM trip_loaders WHERE trip_id = v_trip.trip_id AND role = 'bongkar';

      IF v_orang > 0 AND v_karung > 0 THEN
        v_insentif := v_insentif + CEIL(v_karung * v_trip.rate / v_orang);
      END IF;
    END LOOP;

    -- Cek apakah karyawan punya penghasilan (gaji pokok atau insentif)
    IF v_gross > 0 OR v_insentif > 0 THEN
      v_has_income := true;
    END IF;

    -- SKIP karyawan yang tidak punya penghasilan sama sekali di periode ini
    IF NOT v_has_income THEN
      CONTINUE;
    END IF;

    -- Insert baris payroll (karyawan punya penghasilan)
    INSERT INTO payrolls (id, user_id, period_id, employee_id, base_salary, total_allowance, total_deduction, total_gross, total_net, status)
    VALUES (v_payroll_id, v_user_id, p_period_id, v_employee.id, v_gross, 0, 0, v_gross, v_gross, 'draft');

    -- Hitung komponen payroll (tunjangan/potongan lain)
    FOR v_component IN
      SELECT * FROM payroll_components
      WHERE user_id = v_user_id AND is_active = true
        AND (
          apply_to = 'semua'
          OR (apply_to = 'per_jabatan' AND position_id = v_employee.position_id)
          OR (apply_to = 'per_karyawan' AND employee_id = v_employee.id)
        )
    LOOP
      IF v_component.is_percentage THEN
        -- Persentase dari (gaji pokok + insentif)
        v_comp_amount := ROUND((v_gross + v_insentif) * v_component.amount / 100, 2);
      ELSE
        v_comp_amount := v_component.amount;
      END IF;

      INSERT INTO payroll_items (id, user_id, payroll_id, component_id, component_name, component_type, amount)
      VALUES (gen_random_uuid(), v_user_id, v_payroll_id, v_component.id, v_component.name, v_component.type, v_comp_amount);

      IF v_component.type = 'tunjangan' THEN
        v_allowance := v_allowance + v_comp_amount;
      ELSE
        v_deduction := v_deduction + v_comp_amount;
      END IF;
    END LOOP;

    -- Tambahkan insentif sebagai item payroll
    IF v_insentif > 0 THEN
      INSERT INTO payroll_items (id, user_id, payroll_id, component_id, component_name, component_type, amount)
      VALUES (gen_random_uuid(), v_user_id, v_payroll_id, NULL, 'Insentif Bongkar Muat', 'tunjangan', v_insentif);
      v_allowance := v_allowance + v_insentif;
    END IF;

    -- Hitung total
    v_net := v_gross + v_allowance - v_deduction;

    -- Update payroll dengan total akhir
    UPDATE payrolls
    SET total_allowance = v_allowance,
        total_deduction = v_deduction,
        total_gross = v_gross + v_allowance,
        total_net = v_net
    WHERE id = v_payroll_id;
  END LOOP;

  -- Update summary periode
  UPDATE payroll_periods
  SET status = 'generated',
      total_employee = (SELECT COUNT(*) FROM payrolls WHERE period_id = p_period_id AND user_id = v_user_id),
      total_gross = (SELECT COALESCE(SUM(total_gross), 0) FROM payrolls WHERE period_id = p_period_id AND user_id = v_user_id),
      total_deduction = (SELECT COALESCE(SUM(total_deduction), 0) FROM payrolls WHERE period_id = p_period_id AND user_id = v_user_id),
      total_net = (SELECT COALESCE(SUM(total_net), 0) FROM payrolls WHERE period_id = p_period_id AND user_id = v_user_id)
  WHERE id = p_period_id;

  RETURN QUERY
  SELECT * FROM payrolls WHERE period_id = p_period_id AND user_id = v_user_id ORDER BY created_at;
END;
$$;
