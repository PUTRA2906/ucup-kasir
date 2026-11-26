-- ============================================================
-- Migrasi FIX: Rebuild skema HR & Payroll agar sesuai aplikasi
--
-- Masalah: database live masih memakai skema HR versi lama
-- (payroll_periods.name/period_start, payroll_components.
-- calculation_method, payrolls.payroll_period_id/gross_salary,
-- payroll_items.type) sedangkan kode aplikasi (src/services/hr.ts,
-- src/db/init.sql) memakai skema baru dari 20260902_hr_payroll_module.
-- Akibat: create periode/komponen gagal (column tidak ada),
-- RPC generate_payroll & post_payroll_journal versi lama tidak
-- cocok dengan parameter yang dikirim app, trigger employee_code
-- belum ada, dan CHECK reference_type journal_entries tidak
-- mengizinkan 'payroll'.
--
-- Semua tabel payroll lama TERBUKTI KOSONG (0 baris) saat migrasi
-- ini dibuat, sehingga rebuild aman.
-- ============================================================

-- ============================================================
-- 1. DROP fungsi & tabel payroll lama (kosong)
-- ============================================================
DROP FUNCTION IF EXISTS post_payroll_journal(uuid);
DROP FUNCTION IF EXISTS generate_payroll(uuid);

DROP TABLE IF EXISTS payroll_items CASCADE;
DROP TABLE IF EXISTS payrolls CASCADE;
DROP TABLE IF EXISTS payroll_periods CASCADE;
DROP TABLE IF EXISTS payroll_components CASCADE;

-- ============================================================
-- 2. PAYROLL COMPONENTS (Tunjangan / Potongan)
-- ============================================================
CREATE TABLE payroll_components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'tunjangan' CHECK (type IN ('tunjangan', 'potongan')),
  amount numeric(14,2) NOT NULL DEFAULT 0,
  is_percentage BOOLEAN NOT NULL DEFAULT false,
  apply_to TEXT NOT NULL DEFAULT 'semua' CHECK (apply_to IN ('semua', 'per_jabatan', 'per_karyawan')),
  position_id uuid REFERENCES positions(id) ON DELETE CASCADE,
  employee_id uuid REFERENCES employees(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_payroll_components_user ON payroll_components(user_id);
CREATE INDEX idx_payroll_components_position ON payroll_components(position_id);
CREATE INDEX idx_payroll_components_employee ON payroll_components(employee_id);

-- ============================================================
-- 3. PAYROLL PERIODS (Periode Penggajian)
-- ============================================================
CREATE TABLE payroll_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  period_code TEXT NOT NULL,
  period_month INTEGER NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  period_year INTEGER NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'generated', 'paid', 'cancelled')),
  total_employee INTEGER NOT NULL DEFAULT 0,
  total_gross numeric(14,2) NOT NULL DEFAULT 0,
  total_deduction numeric(14,2) NOT NULL DEFAULT 0,
  total_net numeric(14,2) NOT NULL DEFAULT 0,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, period_code)
);

CREATE INDEX idx_payroll_periods_user_date ON payroll_periods(user_id, period_year DESC, period_month DESC);

-- ============================================================
-- 4. PAYROLLS (Slip Gaji per Karyawan)
-- ============================================================
CREATE TABLE payrolls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  period_id uuid NOT NULL REFERENCES payroll_periods(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  base_salary numeric(14,2) NOT NULL DEFAULT 0,
  total_allowance numeric(14,2) NOT NULL DEFAULT 0,
  total_deduction numeric(14,2) NOT NULL DEFAULT 0,
  total_gross numeric(14,2) NOT NULL DEFAULT 0,
  total_net numeric(14,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'paid')),
  notes TEXT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_payrolls_period ON payrolls(period_id);
CREATE INDEX idx_payrolls_employee ON payrolls(employee_id);

-- ============================================================
-- 5. PAYROLL ITEMS (Rincian Tunjangan/Potongan per Slip)
-- ============================================================
CREATE TABLE payroll_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  payroll_id uuid NOT NULL REFERENCES payrolls(id) ON DELETE CASCADE,
  component_id uuid REFERENCES payroll_components(id) ON DELETE SET NULL,
  component_name TEXT NOT NULL,
  component_type TEXT NOT NULL DEFAULT 'tunjangan' CHECK (component_type IN ('tunjangan', 'potongan')),
  amount numeric(14,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_payroll_items_payroll ON payroll_items(payroll_id);

-- ============================================================
-- 6. ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE payroll_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE payrolls ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payroll_components_select_own" ON payroll_components;
DROP POLICY IF EXISTS "payroll_components_insert_own" ON payroll_components;
DROP POLICY IF EXISTS "payroll_components_update_own" ON payroll_components;
DROP POLICY IF EXISTS "payroll_components_delete_own" ON payroll_components;
CREATE POLICY "payroll_components_select_own" ON payroll_components FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "payroll_components_insert_own" ON payroll_components FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "payroll_components_update_own" ON payroll_components FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "payroll_components_delete_own" ON payroll_components FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "payroll_periods_select_own" ON payroll_periods;
DROP POLICY IF EXISTS "payroll_periods_insert_own" ON payroll_periods;
DROP POLICY IF EXISTS "payroll_periods_update_own" ON payroll_periods;
DROP POLICY IF EXISTS "payroll_periods_delete_own" ON payroll_periods;
CREATE POLICY "payroll_periods_select_own" ON payroll_periods FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "payroll_periods_insert_own" ON payroll_periods FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "payroll_periods_update_own" ON payroll_periods FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "payroll_periods_delete_own" ON payroll_periods FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "payrolls_select_own" ON payrolls;
DROP POLICY IF EXISTS "payrolls_insert_own" ON payrolls;
DROP POLICY IF EXISTS "payrolls_update_own" ON payrolls;
DROP POLICY IF EXISTS "payrolls_delete_own" ON payrolls;
CREATE POLICY "payrolls_select_own" ON payrolls FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "payrolls_insert_own" ON payrolls FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "payrolls_update_own" ON payrolls FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "payrolls_delete_own" ON payrolls FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "payroll_items_select_own" ON payroll_items;
DROP POLICY IF EXISTS "payroll_items_insert_own" ON payroll_items;
DROP POLICY IF EXISTS "payroll_items_delete_own" ON payroll_items;
CREATE POLICY "payroll_items_select_own" ON payroll_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "payroll_items_insert_own" ON payroll_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "payroll_items_delete_own" ON payroll_items FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- 7. FUNGSI: GENERATE NOMOR KARYAWAN
-- ============================================================
DROP FUNCTION IF EXISTS generate_employee_code();
CREATE OR REPLACE FUNCTION generate_employee_code()
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
  FROM employees
  WHERE user_id = auth.uid();

  v_code := 'EMP-' || to_char(now(), 'YYYYMM') || '-' || LPAD(COALESCE(v_count + 1, 1)::TEXT, 4, '0');
  RETURN v_code;
END;
$$;

-- ============================================================
-- 8. TRIGGER: Auto employee_code (belum pernah ada di DB live)
-- ============================================================
DROP FUNCTION IF EXISTS trg_employees_set_code();
CREATE OR REPLACE FUNCTION trg_employees_set_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.employee_code IS NULL OR NEW.employee_code = '' THEN
    NEW.employee_code := generate_employee_code();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_employees_set_code ON employees;
CREATE TRIGGER trg_employees_set_code
  BEFORE INSERT ON employees
  FOR EACH ROW
  EXECUTE FUNCTION trg_employees_set_code();

-- ============================================================
-- 9. FUNGSI: GENERATE PAYROLL
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

-- ============================================================
-- 10. FUNGSI: POST PAYROLL JOURNAL (auto-jurnal ke Finance)
-- ============================================================
DROP FUNCTION IF EXISTS post_payroll_journal(uuid);
CREATE OR REPLACE FUNCTION post_payroll_journal(
  p_period_id uuid
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_journal_id uuid;
  v_user_id uuid;
  v_total_gross numeric;
  v_total_net numeric;
  v_period_code TEXT;
  v_account_beban_gaji uuid;
  v_account_utang_gaji uuid;
  v_period payroll_periods%ROWTYPE;
BEGIN
  v_user_id := auth.uid();

  SELECT * INTO v_period
  FROM payroll_periods
  WHERE id = p_period_id AND user_id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Periode payroll tidak ditemukan';
  END IF;

  IF v_period.status != 'generated' THEN
    RAISE EXCEPTION 'Periode payroll harus dalam status generated sebelum posting jurnal';
  END IF;

  -- Cari akun beban gaji & utang gaji
  SELECT id INTO v_account_beban_gaji
  FROM chart_of_accounts
  WHERE user_id = v_user_id AND code = '5-5200' AND is_active = true;

  IF v_account_beban_gaji IS NULL THEN
    RAISE EXCEPTION 'Akun Beban Gaji (5-5200) belum tersedia. Silakan seed Chart of Accounts terlebih dahulu.';
  END IF;

  v_total_gross := v_period.total_gross;
  v_total_net := v_period.total_net;
  v_period_code := v_period.period_code;

  -- Buat jurnal: Debit Beban Gaji = total_gross, Kredit Utang Gaji = total_net
  INSERT INTO journal_entries (user_id, entry_date, description, reference_type, reference_id)
  VALUES (v_user_id, now(), 'Beban Gaji ' || v_period_code, 'payroll', p_period_id)
  RETURNING id INTO v_journal_id;

  INSERT INTO journal_lines (user_id, journal_id, account_id, account_code, account_name, debit, credit)
  SELECT v_user_id, v_journal_id, v_account_beban_gaji, '5-5200', 'Beban Gaji', v_total_gross, 0;

  SELECT id INTO v_account_utang_gaji
  FROM chart_of_accounts
  WHERE user_id = v_user_id AND code = '2-2000' AND is_active = true;

  IF v_account_utang_gaji IS NOT NULL AND v_total_net > 0 THEN
    INSERT INTO journal_lines (user_id, journal_id, account_id, account_code, account_name, debit, credit)
    SELECT v_user_id, v_journal_id, v_account_utang_gaji, '2-2000', 'Utang Usaha', 0, v_total_net;
  END IF;

  -- Update status periode & seluruh slip di periode ini
  UPDATE payroll_periods
  SET status = 'paid', paid_at = now()
  WHERE id = p_period_id;

  UPDATE payrolls
  SET status = 'paid'
  WHERE period_id = p_period_id AND user_id = v_user_id;

  RETURN v_journal_id;
END;
$$;

-- ============================================================
-- 11. CHECK constraint reference_type journal_entries
--     (migration lama DROP tanpa recreate; 'payroll' belum ada)
-- ============================================================
ALTER TABLE journal_entries DROP CONSTRAINT IF EXISTS journal_entries_reference_type_check;
ALTER TABLE journal_entries ADD CONSTRAINT journal_entries_reference_type_check
  CHECK (reference_type IN ('manual', 'transaction', 'return', 'payment', 'void', 'purchase', 'purchase_payment', 'purchase_return', 'payroll'));
