-- ============================================================
-- Migrasi: Refactor Payroll Per Employee
-- Tanggal: 2026-09-12
--
-- Perubahan:
-- 1. Hapus tabel payroll_periods (tidak perlu periode untuk semua karyawan)
-- 2. Hapus tabel payroll_components (tidak perlu komponen otomatis)
-- 3. Hapus tabel payroll_items (tidak perlu detail komponen)
-- 4. Update tabel payrolls:
--    - Hapus period_id (tidak perlu foreign key ke periode)
--    - Tambah period_code (kode slip gaji auto-generate)
--    - Tambah period_start & period_end (range tanggal per slip)
--    - Tambah incentive_amount (insentif bongkar muat dari surat jalan)
--    - Tambah kasbon_deduction (potongan kasbon manual input)
--    - Simplify kolom: base_salary, incentive, kasbon_deduction, total_net
--    - Tambah journal_entry_id (link ke jurnal akuntansi)
-- 5. Buat fungsi generate_payroll_for_employee (generate per karyawan)
-- 6. Buat fungsi post_payroll_journal (post jurnal per slip)
-- ============================================================

-- ============================================================
-- 1. BACKUP DATA (opsional, untuk jaga-jaga)
-- ============================================================
-- Jika ada data penting di payroll_periods/payrolls lama, backup dulu
-- atau skip langkah ini jika development mode

-- ============================================================
-- 2. DROP TABEL LAMA
-- ============================================================
DROP TABLE IF EXISTS payroll_items CASCADE;
DROP TABLE IF EXISTS payrolls CASCADE;
DROP TABLE IF EXISTS payroll_components CASCADE;
DROP TABLE IF EXISTS payroll_periods CASCADE;

-- ============================================================
-- 3. BUAT ULANG TABEL PAYROLLS (STRUKTUR BARU)
-- ============================================================
CREATE TABLE payrolls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  
  -- Identifikasi slip gaji
  period_code TEXT NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  
  -- Komponen gaji
  base_salary numeric(14,2) NOT NULL DEFAULT 0,
  incentive_amount numeric(14,2) NOT NULL DEFAULT 0,
  kasbon_deduction numeric(14,2) NOT NULL DEFAULT 0,
  total_net numeric(14,2) NOT NULL DEFAULT 0,
  
  -- Status & jurnal
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'paid')),
  journal_entry_id uuid REFERENCES journal_entries(id) ON DELETE SET NULL,
  paid_at timestamptz,
  
  notes TEXT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE(user_id, period_code)
);

CREATE INDEX idx_payrolls_user_employee ON payrolls(user_id, employee_id);
CREATE INDEX idx_payrolls_period_dates ON payrolls(period_start, period_end);
CREATE INDEX idx_payrolls_status ON payrolls(status);
CREATE INDEX idx_payrolls_journal ON payrolls(journal_entry_id);

-- RLS
ALTER TABLE payrolls ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payrolls_select_own" ON payrolls;
DROP POLICY IF EXISTS "payrolls_insert_own" ON payrolls;
DROP POLICY IF EXISTS "payrolls_update_own" ON payrolls;
DROP POLICY IF EXISTS "payrolls_delete_own" ON payrolls;

CREATE POLICY "payrolls_select_own" ON payrolls FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "payrolls_insert_own" ON payrolls FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "payrolls_update_own" ON payrolls FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "payrolls_delete_own" ON payrolls FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- 4. FUNGSI: GENERATE KODE SLIP GAJI
-- ============================================================
DROP FUNCTION IF EXISTS generate_payroll_code;
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

-- ============================================================
-- 5. FUNGSI: GENERATE PAYROLL PER KARYAWAN
-- ============================================================
DROP FUNCTION IF EXISTS generate_payroll_for_employee;
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
  SELECT e.*, p.base_salary as position_salary
  INTO v_employee
  FROM employees e
  LEFT JOIN positions p ON p.id = e.position_id
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
  v_base_salary := COALESCE(NULLIF(v_employee.base_salary, 0), COALESCE(v_employee.position_salary, 0), 0);
  
  -- ============================================================
  -- Hitung insentif dari surat jalan
  -- 1. Untuk LOADER: insentif bongkar muat (bagi rata nilai muatan)
  -- 2. Untuk SUPIR: gaji supir dari driver_fee
  -- ============================================================
  v_incentive := 0;
  
  -- Cek apakah karyawan adalah loader
  IF EXISTS (
    SELECT 1 FROM delivery_loaders l WHERE l.employee_id = p_employee_id
  ) THEN
    -- Loop semua surat jalan selesai dalam periode untuk loader
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
      -- Bagi rata per orang, dibulatkan ke atas
      IF v_do.jumlah_loader > 0 AND v_do.nilai_muatan > 0 THEN
        v_incentive := v_incentive + CEIL(v_do.nilai_muatan / v_do.jumlah_loader);
      END IF;
    END LOOP;
  END IF;
  
  -- Cek apakah karyawan adalah supir (driver)
  -- Tambahkan driver_fee dari semua surat jalan yang dia kendarai
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

-- ============================================================
-- 6. FUNGSI: POST JURNAL AKUNTANSI PER SLIP GAJI
-- ============================================================
DROP FUNCTION IF EXISTS post_payroll_journal;
CREATE OR REPLACE FUNCTION post_payroll_journal(
  p_payroll_id uuid
) RETURNS payrolls
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_payroll RECORD;
  v_employee RECORD;
  v_journal_id uuid;
  v_journal_number TEXT;
  v_expense_account uuid;
  v_liability_account uuid;
  v_result payrolls;
BEGIN
  v_user_id := auth.uid();
  
  -- Ambil data payroll
  SELECT p.*, e.name as employee_name
  INTO v_payroll
  FROM payrolls p
  JOIN employees e ON e.id = p.employee_id
  WHERE p.id = p_payroll_id AND p.user_id = v_user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Slip gaji tidak ditemukan';
  END IF;
  
  IF v_payroll.status = 'paid' THEN
    RAISE EXCEPTION 'Slip gaji sudah dibayar';
  END IF;
  
  IF v_payroll.total_net <= 0 THEN
    RAISE EXCEPTION 'Gaji bersih harus lebih dari 0';
  END IF;
  
  -- Cari akun biaya gaji (expense)
  SELECT id INTO v_expense_account
  FROM chart_of_accounts
  WHERE user_id = v_user_id 
    AND account_type = 'expense'
    AND (LOWER(name) LIKE '%gaji%' OR LOWER(name) LIKE '%salary%')
  ORDER BY created_at
  LIMIT 1;
  
  IF v_expense_account IS NULL THEN
    RAISE EXCEPTION 'Akun biaya gaji tidak ditemukan. Buat dulu akun dengan tipe Expense dan nama mengandung "Gaji"';
  END IF;
  
  -- Cari akun hutang gaji (liability)
  SELECT id INTO v_liability_account
  FROM chart_of_accounts
  WHERE user_id = v_user_id 
    AND account_type = 'liability'
    AND (LOWER(name) LIKE '%hutang%' AND LOWER(name) LIKE '%gaji%')
  ORDER BY created_at
  LIMIT 1;
  
  IF v_liability_account IS NULL THEN
    RAISE EXCEPTION 'Akun hutang gaji tidak ditemukan. Buat dulu akun dengan tipe Liability dan nama mengandung "Hutang Gaji"';
  END IF;
  
  -- Generate nomor jurnal
  v_journal_number := 'JV-' || to_char(now(), 'YYYYMMDD') || '-' || LPAD(
    (SELECT COUNT(*) + 1 FROM journal_entries WHERE user_id = v_user_id)::TEXT,
    4, '0'
  );
  
  v_journal_id := gen_random_uuid();
  
  -- Insert jurnal entry
  INSERT INTO journal_entries (
    id, user_id, journal_number, entry_date,
    description, reference_type, reference_id,
    created_at, updated_at
  ) VALUES (
    v_journal_id, v_user_id, v_journal_number, CURRENT_DATE,
    'Pembayaran gaji ' || v_payroll.employee_name || ' periode ' || 
      v_payroll.period_start || ' s/d ' || v_payroll.period_end,
    'payroll', p_payroll_id,
    now(), now()
  );
  
  -- Insert journal lines
  -- Debit: Biaya Gaji
  INSERT INTO journal_lines (
    id, journal_entry_id, account_id, description,
    debit, credit, created_at
  ) VALUES (
    gen_random_uuid(), v_journal_id, v_expense_account,
    'Biaya gaji ' || v_payroll.employee_name,
    v_payroll.total_net, 0, now()
  );
  
  -- Credit: Hutang Gaji
  INSERT INTO journal_lines (
    id, journal_entry_id, account_id, description,
    debit, credit, created_at
  ) VALUES (
    gen_random_uuid(), v_journal_id, v_liability_account,
    'Hutang gaji ' || v_payroll.employee_name,
    0, v_payroll.total_net, now()
  );
  
  -- Update payroll
  UPDATE payrolls
  SET status = 'paid',
      journal_entry_id = v_journal_id,
      paid_at = now(),
      updated_at = now()
  WHERE id = p_payroll_id
  RETURNING * INTO v_result;
  
  RETURN v_result;
END;
$$;

-- ============================================================
-- 7. FUNGSI: HAPUS PAYROLL (+ JURNAL JIKA ADA)
-- ============================================================
DROP FUNCTION IF EXISTS delete_payroll;
CREATE OR REPLACE FUNCTION delete_payroll(
  p_payroll_id uuid
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_journal_id uuid;
BEGIN
  v_user_id := auth.uid();
  
  -- Ambil journal_entry_id jika ada
  SELECT journal_entry_id INTO v_journal_id
  FROM payrolls
  WHERE id = p_payroll_id AND user_id = v_user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Slip gaji tidak ditemukan';
  END IF;
  
  -- Hapus jurnal jika ada
  IF v_journal_id IS NOT NULL THEN
    DELETE FROM journal_lines WHERE journal_entry_id = v_journal_id;
    DELETE FROM journal_entries WHERE id = v_journal_id;
  END IF;
  
  -- Hapus payroll
  DELETE FROM payrolls WHERE id = p_payroll_id AND user_id = v_user_id;
  
  RETURN true;
END;
$$;

-- ============================================================
-- 8. UPDATE CHECK CONSTRAINT di journal_entries (tambah 'payroll')
-- ============================================================

-- Cek dulu reference_type apa saja yang ada
DO $$
DECLARE
  existing_types text[];
BEGIN
  SELECT array_agg(DISTINCT reference_type) INTO existing_types
  FROM journal_entries
  WHERE reference_type IS NOT NULL;
  
  RAISE NOTICE 'Existing reference_types: %', existing_types;
END $$;

-- Drop constraint lama
ALTER TABLE journal_entries DROP CONSTRAINT IF EXISTS journal_entries_reference_type_check;

-- Buat constraint baru yang include semua kemungkinan
-- Tambahkan semua tipe yang mungkin ada di sistem
ALTER TABLE journal_entries ADD CONSTRAINT journal_entries_reference_type_check 
  CHECK (
    reference_type IS NULL OR
    reference_type IN (
      'transaction', 'retur', 'expense', 'payment', 'adjustment', 
      'payroll', 'opening_balance', 'closing', 'journal', 'other'
    )
  );
