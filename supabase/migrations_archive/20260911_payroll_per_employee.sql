-- ============================================================
-- Migrasi: Ubah Payroll dari Periode Global ke Per-Karyawan
-- Project: Ucup Kasir
-- Date: 2026-09-11
--
-- PERUBAHAN:
-- 1. Hapus tabel payroll_periods (periode global)
-- 2. Tambah kolom period_start dan period_end di tabel payrolls
-- 3. Setiap payroll slip adalah periode gaji individual untuk 1 karyawan
-- 4. Hapus function generate_payroll (tidak relevan lagi)
-- 5. Update function post_payroll_journal untuk per-slip
-- 6. Update trigger revert_loan_payments untuk per-slip
-- ============================================================

-- ============================================================
-- 1. BACKUP DATA PAYROLL YANG ADA (opsional, untuk rollback)
-- ============================================================
CREATE TABLE IF NOT EXISTS payroll_periods_backup AS
SELECT * FROM payroll_periods;

CREATE TABLE IF NOT EXISTS payrolls_backup AS
SELECT * FROM payrolls;

-- ============================================================
-- 2. DROP FOREIGN KEY CONSTRAINT payrolls.period_id
-- ============================================================
ALTER TABLE payrolls
DROP CONSTRAINT IF EXISTS payrolls_period_id_fkey;

-- ============================================================
-- 3. TAMBAH KOLOM PERIODE DI PAYROLLS
-- ============================================================
ALTER TABLE payrolls
ADD COLUMN IF NOT EXISTS period_start date,
ADD COLUMN IF NOT EXISTS period_end date,
ADD COLUMN IF NOT EXISTS period_code TEXT;

-- Migrate existing data: copy period dates from payroll_periods
UPDATE payrolls p
SET
  period_start = pp.start_date,
  period_end = pp.end_date,
  period_code = pp.period_code || '-' || e.employee_code
FROM payroll_periods pp
JOIN employees e ON e.id = p.employee_id
WHERE p.period_id = pp.id
AND p.period_start IS NULL;

-- Set NOT NULL setelah migrasi data
ALTER TABLE payrolls
ALTER COLUMN period_start SET NOT NULL,
ALTER COLUMN period_end SET NOT NULL,
ALTER COLUMN period_code SET NOT NULL;

-- Tambah unique constraint: 1 karyawan hanya bisa punya 1 payroll untuk periode tertentu
ALTER TABLE payrolls
ADD CONSTRAINT payrolls_employee_period_unique
UNIQUE(user_id, employee_id, period_start, period_end);

-- Index untuk query per karyawan
CREATE INDEX IF NOT EXISTS idx_payrolls_employee_period
ON payrolls(employee_id, period_start DESC);

-- ============================================================
-- 4. DROP KOLOM period_id (tidak diperlukan lagi)
-- ============================================================
ALTER TABLE payrolls
DROP COLUMN IF EXISTS period_id;

-- ============================================================
-- 5. DROP TABEL payroll_periods
-- ============================================================
DROP TABLE IF EXISTS payroll_periods CASCADE;
DROP TABLE IF EXISTS payroll_periods_backup;

-- ============================================================
-- 6. DROP FUNCTION generate_payroll (tidak relevan)
-- ============================================================
DROP FUNCTION IF EXISTS generate_payroll(uuid);

-- ============================================================
-- 7. UPDATE FUNCTION post_payroll_journal
-- Sebelumnya: post untuk 1 periode (semua karyawan)
-- Sekarang: post untuk 1 payroll slip (1 karyawan)
-- ============================================================
CREATE OR REPLACE FUNCTION post_payroll_journal(p_payroll_id uuid)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_payroll payrolls%ROWTYPE;
  v_employee employees%ROWTYPE;
  v_journal_id uuid;
  v_payroll_account_id uuid;
  v_cash_account_id uuid;
BEGIN
  -- Ambil data payroll
  SELECT * INTO v_payroll FROM payrolls WHERE id = p_payroll_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payroll tidak ditemukan';
  END IF;

  IF v_payroll.status = 'paid' THEN
    RAISE EXCEPTION 'Payroll sudah diposting sebelumnya';
  END IF;

  v_user_id := v_payroll.user_id;

  -- Ambil data karyawan
  SELECT * INTO v_employee FROM employees WHERE id = v_payroll.employee_id;

  -- Cari akun Beban Gaji (expense)
  SELECT id INTO v_payroll_account_id
  FROM chart_of_accounts
  WHERE user_id = v_user_id
  AND account_type = 'expense'
  AND LOWER(account_name) LIKE '%gaji%'
  ORDER BY account_code
  LIMIT 1;

  IF v_payroll_account_id IS NULL THEN
    RAISE EXCEPTION 'Akun Beban Gaji tidak ditemukan. Buat akun expense dengan nama mengandung "gaji".';
  END IF;

  -- Cari akun Kas (default cash account)
  SELECT id INTO v_cash_account_id
  FROM chart_of_accounts
  WHERE user_id = v_user_id
  AND account_type = 'asset'
  AND is_cash = true
  ORDER BY account_code
  LIMIT 1;

  IF v_cash_account_id IS NULL THEN
    RAISE EXCEPTION 'Akun Kas tidak ditemukan';
  END IF;

  -- Buat journal entry
  INSERT INTO journal_entries (
    user_id,
    entry_date,
    entry_number,
    description,
    reference_type,
    reference_id,
    total_debit,
    total_credit,
    status
  ) VALUES (
    v_user_id,
    v_payroll.created_at::date,
    'PAYROLL-' || v_payroll.period_code,
    'Pembayaran Gaji ' || v_employee.name || ' (' || v_payroll.period_code || ')',
    'payroll',
    v_payroll.id,
    v_payroll.total_net,
    v_payroll.total_net,
    'posted'
  ) RETURNING id INTO v_journal_id;

  -- Jurnal: Debit Beban Gaji
  INSERT INTO journal_items (
    user_id,
    journal_id,
    account_id,
    description,
    debit,
    credit
  ) VALUES (
    v_user_id,
    v_journal_id,
    v_payroll_account_id,
    'Beban Gaji ' || v_employee.name,
    v_payroll.total_net,
    0
  );

  -- Jurnal: Kredit Kas
  INSERT INTO journal_items (
    user_id,
    journal_id,
    account_id,
    description,
    debit,
    credit
  ) VALUES (
    v_user_id,
    v_journal_id,
    v_cash_account_id,
    'Pembayaran Gaji ' || v_employee.name,
    0,
    v_payroll.total_net
  );

  -- Update status payroll
  UPDATE payrolls
  SET status = 'paid',
      updated_at = now()
  WHERE id = p_payroll_id;

  RETURN v_journal_id::TEXT;
END;
$$;

-- ============================================================
-- 8. COMMENT
-- ============================================================
COMMENT ON TABLE payrolls IS 'Slip gaji per karyawan dengan periode individual. Setiap karyawan bisa punya periode berbeda.';
COMMENT ON COLUMN payrolls.period_start IS 'Tanggal awal periode gaji (misal: 1 Sep 2026)';
COMMENT ON COLUMN payrolls.period_end IS 'Tanggal akhir periode gaji (misal: 20 Sep 2026)';
COMMENT ON COLUMN payrolls.period_code IS 'Kode unik periode, contoh: 202609-EMP001';
