-- ============================================================
-- Tabel: employee_loans (Kasbon Karyawan)
-- Fitur kasbon yang otomatis terpotong saat generate payroll
-- ============================================================

CREATE TABLE IF NOT EXISTS employee_loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  loan_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  remaining_amount NUMERIC(15,2) NOT NULL CHECK (remaining_amount >= 0),
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paid', 'cancelled')),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Index untuk performa
CREATE INDEX idx_employee_loans_employee_id ON employee_loans(employee_id);
CREATE INDEX idx_employee_loans_status ON employee_loans(status);
CREATE INDEX idx_employee_loans_loan_date ON employee_loans(loan_date);

-- ============================================================
-- Tabel: employee_loan_payments (Riwayat Pembayaran Kasbon)
-- Mencatat setiap potongan kasbon dari payroll
-- ============================================================

CREATE TABLE IF NOT EXISTS employee_loan_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID NOT NULL REFERENCES employee_loans(id) ON DELETE CASCADE,
  payroll_id UUID REFERENCES payrolls(id) ON DELETE SET NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  notes TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Index untuk performa
CREATE INDEX idx_employee_loan_payments_loan_id ON employee_loan_payments(loan_id);
CREATE INDEX idx_employee_loan_payments_payroll_id ON employee_loan_payments(payroll_id);
CREATE INDEX idx_employee_loan_payments_payment_date ON employee_loan_payments(payment_date);

-- ============================================================
-- Trigger: Update updated_at otomatis
-- ============================================================

CREATE OR REPLACE FUNCTION update_employee_loans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_employee_loans_updated_at
  BEFORE UPDATE ON employee_loans
  FOR EACH ROW
  EXECUTE FUNCTION update_employee_loans_updated_at();

-- ============================================================
-- Trigger: Update remaining_amount dan status setelah payment
-- ============================================================

CREATE OR REPLACE FUNCTION update_loan_after_payment()
RETURNS TRIGGER AS $$
BEGIN
  -- Update remaining_amount di loan
  UPDATE employee_loans
  SET remaining_amount = remaining_amount - NEW.amount,
      status = CASE
        WHEN (remaining_amount - NEW.amount) <= 0 THEN 'paid'
        ELSE 'active'
      END
  WHERE id = NEW.loan_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_loan_after_payment
  AFTER INSERT ON employee_loan_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_loan_after_payment();

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================

ALTER TABLE employee_loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_loan_payments ENABLE ROW LEVEL SECURITY;

-- Policy: semua authenticated user bisa akses
CREATE POLICY employee_loans_policy ON employee_loans
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY employee_loan_payments_policy ON employee_loan_payments
  FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================
-- Komentar tabel
-- ============================================================

COMMENT ON TABLE employee_loans IS 'Tabel kasbon karyawan yang akan otomatis terpotong saat generate payroll';
COMMENT ON TABLE employee_loan_payments IS 'Riwayat pembayaran/potongan kasbon dari payroll';

COMMENT ON COLUMN employee_loans.amount IS 'Jumlah kasbon total';
COMMENT ON COLUMN employee_loans.remaining_amount IS 'Sisa kasbon yang belum dibayar';
COMMENT ON COLUMN employee_loans.status IS 'Status: active (masih ada sisa), paid (lunas), cancelled (dibatalkan)';
