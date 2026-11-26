-- ============================================================
-- Migrasi: generate_payroll v4 — Insentif Bongkar Muat dari SURAT JALAN
--
-- Masalah: migrasi 20260906_payroll_incentive_only.sql (diterapkan
-- terakhir) menimpa generate_payroll dengan versi berbasis trips/trip_loaders,
-- padahal modul trips sudah dihapus (20260906_incentive_moves_to_delivery_orders.sql).
-- Akibatnya di jalur web, insentif loader SELALU 0.
--
-- Fix: gabungan perilaku "incentive-only" (skip karyawan tanpa penghasilan,
-- komponen % dari gaji+insentif) dengan sumber insentif SURAT JALAN:
--   nilai muatan  = Σ(delivery_load_items.quantity × unit_price)
--   upah per orang per DO = CEIL(nilai ÷ jumlah tim muat)
--   hanya DO status 'selesai' dengan do_date dalam periode.
-- Identik dengan generatePayroll di src/services/sqlite/hr.ts.
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
  v_employee RECORD;
  v_payroll_id uuid;
  v_allowance numeric;
  v_deduction numeric;
  v_gross numeric;
  v_net numeric;
  v_component RECORD;
  v_comp_amount numeric;
  v_insentif numeric;
  v_do RECORD;
  v_has_income boolean;
BEGIN
  v_user_id := auth.uid();

  SELECT * INTO v_period
  FROM payroll_periods
  WHERE id = p_period_id AND user_id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Periode payroll tidak ditemukan';
  END IF;

  IF v_period.status = 'paid' THEN
    RAISE EXCEPTION 'Periode payroll sudah dibayar, tidak bisa digenerate ulang';
  END IF;

  DELETE FROM payroll_items WHERE payroll_id IN (SELECT id FROM payrolls WHERE period_id = p_period_id AND user_id = v_user_id);
  DELETE FROM payrolls WHERE period_id = p_period_id AND user_id = v_user_id;

  FOR v_employee IN
    SELECT e.*, p.base_salary as position_salary
    FROM employees e
    LEFT JOIN positions p ON p.id = e.position_id
    WHERE e.user_id = v_user_id AND e.is_active = true AND e.status = 'aktif'
  LOOP
    v_payroll_id := gen_random_uuid();
    v_allowance := 0;
    v_deduction := 0;
    v_has_income := false;

    v_gross := COALESCE(NULLIF(v_employee.base_salary, 0), COALESCE(v_employee.position_salary, 0), 0);

    -- ============================================================
    -- Insentif bongkar muat (per surat jalan selesai dalam periode)
    -- ============================================================
    v_insentif := 0;

    IF EXISTS (
      SELECT 1 FROM delivery_loaders l WHERE l.employee_id = v_employee.id
    ) THEN
      FOR v_do IN
        SELECT dor.id,
               COALESCE((SELECT SUM(li.quantity * li.unit_price) FROM delivery_load_items li WHERE li.delivery_order_id = dor.id), 0) AS nilai,
               (SELECT COUNT(*) FROM delivery_loaders l WHERE l.delivery_order_id = dor.id) AS orang
        FROM delivery_orders dor
        WHERE dor.user_id = v_user_id
          AND dor.status = 'selesai'
          AND dor.do_date BETWEEN v_period.start_date AND v_period.end_date
          AND EXISTS (SELECT 1 FROM delivery_loaders l WHERE l.delivery_order_id = dor.id AND l.employee_id = v_employee.id)
      LOOP
        IF v_do.orang > 0 AND v_do.nilai > 0 THEN
          v_insentif := v_insentif + CEIL(v_do.nilai / v_do.orang);
        END IF;
      END LOOP;
    END IF;

    IF v_gross > 0 OR v_insentif > 0 THEN
      v_has_income := true;
    END IF;

    -- SKIP karyawan tanpa penghasilan di periode ini
    IF NOT v_has_income THEN
      CONTINUE;
    END IF;

    INSERT INTO payrolls (id, user_id, period_id, employee_id, base_salary, total_allowance, total_deduction, total_gross, total_net, status)
    VALUES (v_payroll_id, v_user_id, p_period_id, v_employee.id, v_gross, 0, 0, v_gross, v_gross, 'draft');

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

    IF v_insentif > 0 THEN
      INSERT INTO payroll_items (id, user_id, payroll_id, component_id, component_name, component_type, amount)
      VALUES (gen_random_uuid(), v_user_id, v_payroll_id, NULL, 'Insentif Bongkar Muat', 'tunjangan', v_insentif);
      v_allowance := v_allowance + v_insentif;
    END IF;

    v_net := v_gross + v_allowance - v_deduction;

    UPDATE payrolls
    SET total_allowance = v_allowance,
        total_deduction = v_deduction,
        total_gross = v_gross + v_allowance,
        total_net = v_net
    WHERE id = v_payroll_id;
  END LOOP;

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
