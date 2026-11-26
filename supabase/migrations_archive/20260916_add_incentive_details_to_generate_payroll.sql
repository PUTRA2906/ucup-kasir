-- Migration: Update generate_payroll_for_employee RPC untuk menyimpan detail breakdown insentif
-- Date: 2026-09-16
-- Description: Menambahkan logic untuk collect detail insentif dari setiap surat jalan dan menyimpannya di incentive_details

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
  v_incentive_details jsonb;
  v_detail jsonb;
  v_item RECORD;
  v_item_desc text;
  v_bagian_loader numeric;
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

  -- Gaji pokok
  v_base_salary := COALESCE(NULLIF(v_employee.base_salary, 0), 0);

  v_incentive := 0;
  v_incentive_details := '[]'::jsonb;

  -- ============================================================
  -- Insentif LOADER: bagi rata nilai muatan per orang
  -- ============================================================
  IF EXISTS (
    SELECT 1 FROM delivery_loaders l WHERE l.employee_id = p_employee_id
  ) THEN
    FOR v_do IN
      SELECT dor.id,
             dor.do_number,
             dor.do_date,
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
        v_bagian_loader := CEIL(v_do.nilai_muatan / v_do.jumlah_loader);
        v_incentive := v_incentive + v_bagian_loader;
        
        -- Buat deskripsi dari items
        v_item_desc := '';
        FOR v_item IN
          SELECT product_name, quantity, unit_price
          FROM delivery_load_items
          WHERE delivery_order_id = v_do.id
        LOOP
          IF v_item_desc != '' THEN
            v_item_desc := v_item_desc || ', ';
          END IF;
          v_item_desc := v_item_desc || v_item.product_name || ' (' || 
                         v_item.quantity || ' x ' || 
                         to_char(v_item.unit_price, 'FM999G999G999G999') || ')';
        END LOOP;
        
        -- Tambahkan detail ke array
        v_detail := jsonb_build_object(
          'type', 'loader',
          'date', v_do.do_date,
          'do_number', COALESCE(v_do.do_number, substring(v_do.id::text, 1, 8)),
          'description', 'Bongkar muat: ' || v_item_desc || ' — Dibagi ' || v_do.jumlah_loader || ' orang',
          'amount', v_bagian_loader
        );
        v_incentive_details := v_incentive_details || v_detail;
      END IF;
    END LOOP;
  END IF;

  -- ============================================================
  -- Insentif DRIVER: total driver_fee
  -- ============================================================
  FOR v_do IN
    SELECT dor.id,
           dor.do_number,
           dor.do_date,
           dor.driver_fee
    FROM delivery_orders dor
    WHERE dor.user_id = v_user_id
      AND dor.status = 'selesai'
      AND dor.do_date BETWEEN p_period_start AND p_period_end
      AND dor.driver_id = p_employee_id
      AND dor.driver_fee IS NOT NULL
      AND dor.driver_fee > 0
  LOOP
    v_incentive := v_incentive + v_do.driver_fee;
    
    -- Tambahkan detail ke array
    v_detail := jsonb_build_object(
      'type', 'driver',
      'date', v_do.do_date,
      'do_number', COALESCE(v_do.do_number, substring(v_do.id::text, 1, 8)),
      'description', 'Ongkos supir',
      'amount', v_do.driver_fee
    );
    v_incentive_details := v_incentive_details || v_detail;
  END LOOP;

  -- Hitung gaji bersih
  v_net := v_base_salary + v_incentive - COALESCE(p_kasbon_deduction, 0);

  -- Insert slip gaji dengan detail insentif
  INSERT INTO payrolls (
    id, user_id, employee_id,
    period_code, period_start, period_end,
    base_salary, incentive_amount, kasbon_deduction, total_net,
    incentive_details,
    status, created_at, updated_at
  ) VALUES (
    v_payroll_id, v_user_id, p_employee_id,
    v_period_code, p_period_start, p_period_end,
    v_base_salary, v_incentive, COALESCE(p_kasbon_deduction, 0), v_net,
    v_incentive_details,
    'draft', now(), now()
  )
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION generate_payroll_for_employee IS
  'Buat slip gaji per karyawan untuk periode tertentu. Insentif: bagi rata nilai muatan untuk loader + total driver_fee untuk supir. Menyimpan detail breakdown di incentive_details (JSONB).';
