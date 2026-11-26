-- ============================================================
-- Migrasi: Insentif Bongkar Muat per Karung (Modul Trip + Payroll)
--
-- Upah loader dihitung dari jumlah karung yang dimuat/dibongkar per
-- perjalanan (trip). Satu trip bisa memuat beberapa surat jalan.
-- Aturan (dikonfirmasi user):
--   - Total karung = SUM(delivery_items.quantity) semua DO di trip
--   - Upah/orang = CEIL(karung * rate / jumlah loader) — bagi rata, bulat ke atas
--   - Dua peran: muat & bongkar (satu orang boleh ikut keduanya → dua upah)
--   - Rate global di store_settings, bisa di-override per trip
--   - Upah matang saat trip status='selesai'
--   - Masuk slip sebagai SATU baris "Insentif Bongkar Muat" (tunjangan)
--
-- generate_payroll versi baru (v2) menyisipkan blok insentif setelah
-- loop komponen, sebelum hitung v_net. Urutan insert tetap: baris
-- payrolls dulu → items → UPDATE total (hindari bug FK-ordering).
-- ============================================================

-- ============================================================
-- 1. TABEL: trips (perjalanan)
-- ============================================================
CREATE TABLE IF NOT EXISTS trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  trip_number TEXT NOT NULL,
  trip_date date NOT NULL,
  vehicle_id uuid REFERENCES vehicles(id) ON DELETE SET NULL,
  driver_id uuid REFERENCES employees(id) ON DELETE SET NULL,
  driver_name TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'berjalan', 'selesai')),
  muat_rate numeric(14,2),      -- override; NULL = pakai global loading_rate_per_sack
  bongkar_rate numeric(14,2),   -- override; NULL = pakai global unloading_rate_per_sack
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trips_user_date ON trips(user_id, trip_date DESC);
CREATE INDEX IF NOT EXISTS idx_trips_status ON trips(user_id, status);

-- ============================================================
-- 2. TABEL: trip_loaders (karyawan yang ikut muat/bongkar per trip)
-- ============================================================
CREATE TABLE IF NOT EXISTS trip_loaders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  employee_name TEXT,
  role TEXT NOT NULL CHECK (role IN ('muat', 'bongkar')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(trip_id, employee_id, role)
);

CREATE INDEX IF NOT EXISTS idx_trip_loaders_trip ON trip_loaders(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_loaders_employee ON trip_loaders(employee_id);

-- ============================================================
-- 3. KOLOM BARU: delivery_orders.trip_id + store_settings rate
-- ============================================================
ALTER TABLE delivery_orders ADD COLUMN IF NOT EXISTS trip_id uuid REFERENCES trips(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_delivery_orders_trip ON delivery_orders(trip_id);

ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS loading_rate_per_sack numeric(14,2) NOT NULL DEFAULT 0;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS unloading_rate_per_sack numeric(14,2) NOT NULL DEFAULT 0;

-- ============================================================
-- 4. ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_loaders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "trips_select_own" ON trips;
DROP POLICY IF EXISTS "trips_insert_own" ON trips;
DROP POLICY IF EXISTS "trips_update_own" ON trips;
DROP POLICY IF EXISTS "trips_delete_own" ON trips;
CREATE POLICY "trips_select_own" ON trips FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "trips_insert_own" ON trips FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "trips_update_own" ON trips FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "trips_delete_own" ON trips FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "trip_loaders_select_own" ON trip_loaders;
DROP POLICY IF EXISTS "trip_loaders_insert_own" ON trip_loaders;
DROP POLICY IF EXISTS "trip_loaders_update_own" ON trip_loaders;
DROP POLICY IF EXISTS "trip_loaders_delete_own" ON trip_loaders;
CREATE POLICY "trip_loaders_select_own" ON trip_loaders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "trip_loaders_insert_own" ON trip_loaders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "trip_loaders_update_own" ON trip_loaders FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "trip_loaders_delete_own" ON trip_loaders FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- 5. FUNGSI: GENERATE PAYROLL v2 (+ insentif bongkar muat)
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
    v_payroll_id := gen_random_uuid();
    v_allowance := 0;
    v_deduction := 0;

    -- Gaji pokok: prioritize employee.base_salary, fallback ke position_salary
    v_gross := COALESCE(NULLIF(v_employee.base_salary, 0), COALESCE(v_employee.position_salary, 0));

    -- Insert baris payroll TERLEBIH DAHULU (payroll_items FK ke payrolls),
    -- total akan di-update setelah item terkumpul
    INSERT INTO payrolls (id, user_id, period_id, employee_id, base_salary, total_allowance, total_deduction, total_gross, total_net, status)
    VALUES (v_payroll_id, v_user_id, p_period_id, v_employee.id, v_gross, 0, 0, v_gross, v_gross, 'draft');

    -- Hitung komponen payroll
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
        v_comp_amount := ROUND(v_gross * v_component.amount / 100, 2);
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

    -- ============================================================
    -- INSENTIF BONGKAR MUAT (per karung, trip status='selesai')
    -- Satu baris gabungan: muat + bongkar dijumlah.
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
