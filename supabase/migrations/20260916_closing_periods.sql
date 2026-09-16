-- ============================================================
-- Migrasi: Sistem Tutup Buku (Closing Period)
-- Project: Ucup Kasir
-- Date: 2026-09-16
--
-- Fitur:
-- 1. Tabel closing_periods untuk menyimpan periode tertutup
-- 2. Fungsi check_period_closed() untuk validasi
-- 3. Fungsi close_period() untuk tutup periode + snapshot saldo
-- 4. Fungsi reopen_period() untuk buka kembali periode
-- 5. Trigger untuk blokir transaksi di periode tertutup (10 tabel)
-- ============================================================

-- ============================================================
-- 1. TABEL: closing_periods
-- ============================================================

CREATE TABLE IF NOT EXISTS closing_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),

  -- Periode waktu
  period_start date NOT NULL,
  period_end date NOT NULL,

  -- Metadata penutupan
  closed_at timestamptz NOT NULL DEFAULT now(),
  closed_by uuid NOT NULL DEFAULT auth.uid(),
  notes text,
  status text NOT NULL DEFAULT 'closed' CHECK (status IN ('closed', 'reopened')),

  -- Snapshot saldo akun saat ditutup (untuk performa)
  snapshot_balances jsonb,

  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT unique_period UNIQUE(user_id, period_start, period_end),
  CONSTRAINT valid_period CHECK (period_end >= period_start)
);

CREATE INDEX IF NOT EXISTS idx_closing_periods_user ON closing_periods(user_id, period_end DESC);
CREATE INDEX IF NOT EXISTS idx_closing_periods_status ON closing_periods(status);

COMMENT ON TABLE closing_periods IS 'Daftar periode akuntansi yang sudah ditutup';
COMMENT ON COLUMN closing_periods.snapshot_balances IS 'JSONB berisi array saldo semua akun per akhir periode';
COMMENT ON COLUMN closing_periods.status IS 'closed = periode terkunci, reopened = dibuka kembali';

-- ============================================================
-- 2. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE closing_periods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "closing_periods_select_own" ON closing_periods;
DROP POLICY IF EXISTS "closing_periods_insert_own" ON closing_periods;
DROP POLICY IF EXISTS "closing_periods_update_own" ON closing_periods;
DROP POLICY IF EXISTS "closing_periods_delete_own" ON closing_periods;

CREATE POLICY "closing_periods_select_own" ON closing_periods
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "closing_periods_insert_own" ON closing_periods
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "closing_periods_update_own" ON closing_periods
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "closing_periods_delete_own" ON closing_periods
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- 3. FUNGSI: check_period_closed()
-- ============================================================

CREATE OR REPLACE FUNCTION check_period_closed(p_date date, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_closed boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM closing_periods
    WHERE user_id = p_user_id
      AND status = 'closed'
      AND p_date >= period_start
      AND p_date <= period_end
  ) INTO v_closed;

  RETURN v_closed;
END;
$$;

COMMENT ON FUNCTION check_period_closed IS 'Cek apakah tanggal masuk dalam periode yang sudah ditutup';

-- ============================================================
-- 4. FUNGSI: close_period()
-- ============================================================

CREATE OR REPLACE FUNCTION close_period(
  p_period_start date,
  p_period_end date,
  p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_closing_id uuid;
  v_balances jsonb;
BEGIN
  -- 1. Validasi: Periode tidak boleh overlap dengan periode tertutup lainnya
  IF EXISTS(
    SELECT 1 FROM closing_periods
    WHERE user_id = v_user_id
      AND status = 'closed'
      AND (
        (p_period_start >= period_start AND p_period_start <= period_end) OR
        (p_period_end >= period_start AND p_period_end <= period_end) OR
        (p_period_start <= period_start AND p_period_end >= period_end)
      )
  ) THEN
    RAISE EXCEPTION 'Periode ini overlap dengan periode yang sudah ditutup.';
  END IF;

  -- 2. Hitung saldo semua akun sampai akhir periode (snapshot)
  SELECT jsonb_agg(
    jsonb_build_object(
      'account_id', account_id,
      'account_code', account_code,
      'account_name', account_name,
      'account_type', account_type,
      'normal_balance', normal_balance,
      'balance', balance
    )
  )
  INTO v_balances
  FROM (
    SELECT
      coa.id as account_id,
      coa.code as account_code,
      coa.name as account_name,
      coa.type as account_type,
      coa.normal_balance as normal_balance,
      COALESCE(SUM(
        CASE
          WHEN coa.normal_balance = 'debit' THEN jl.debit - jl.credit
          ELSE jl.credit - jl.debit
        END
      ), 0) as balance
    FROM chart_of_accounts coa
    LEFT JOIN journal_lines jl ON jl.account_id = coa.id
    LEFT JOIN journal_entries je ON je.id = jl.journal_id
    WHERE coa.user_id = v_user_id
      AND coa.is_active = true
      AND (je.id IS NULL OR (
        je.status = 'posted'
        AND je.entry_date::date <= p_period_end
      ))
    GROUP BY coa.id, coa.code, coa.name, coa.type, coa.normal_balance
  ) balances;

  -- 3. Insert closing period
  INSERT INTO closing_periods (
    user_id,
    period_start,
    period_end,
    closed_by,
    notes,
    snapshot_balances,
    status
  ) VALUES (
    v_user_id,
    p_period_start,
    p_period_end,
    v_user_id,
    p_notes,
    v_balances,
    'closed'
  )
  RETURNING id INTO v_closing_id;

  RETURN v_closing_id;
END;
$$;

COMMENT ON FUNCTION close_period IS 'Tutup periode akuntansi dan buat snapshot saldo akun';

-- ============================================================
-- 5. FUNGSI: reopen_period()
-- ============================================================

CREATE OR REPLACE FUNCTION reopen_period(p_closing_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  -- Validasi: Hanya bisa reopen milik sendiri
  IF NOT EXISTS(
    SELECT 1 FROM closing_periods
    WHERE id = p_closing_id AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Periode tidak ditemukan atau bukan milik Anda.';
  END IF;

  -- Update status jadi reopened
  UPDATE closing_periods
  SET status = 'reopened',
      updated_at = now()
  WHERE id = p_closing_id;
END;
$$;

COMMENT ON FUNCTION reopen_period IS 'Buka kembali periode yang sudah ditutup';

-- ============================================================
-- 6. TRIGGER: Blokir Transaksi di Periode Tertutup
-- ============================================================

-- 6.1 Trigger untuk journal_entries
CREATE OR REPLACE FUNCTION prevent_closed_period_journal()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Skip untuk operasi void (status = 'void')
  IF TG_OP = 'UPDATE' AND NEW.status = 'void' THEN
    RETURN NEW;
  END IF;

  -- Cek periode tertutup
  IF check_period_closed(NEW.entry_date::date, NEW.user_id) THEN
    RAISE EXCEPTION 'Tidak dapat mengubah jurnal di periode yang sudah ditutup (%).',
      NEW.entry_date::date;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_closed_period_journal ON journal_entries;
CREATE TRIGGER trg_prevent_closed_period_journal
BEFORE INSERT OR UPDATE ON journal_entries
FOR EACH ROW EXECUTE FUNCTION prevent_closed_period_journal();

-- 6.2 Trigger untuk transactions
CREATE OR REPLACE FUNCTION prevent_closed_period_transaction()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Cek periode tertutup
  IF check_period_closed(NEW.created_at::date, NEW.user_id) THEN
    RAISE EXCEPTION 'Tidak dapat mengubah transaksi di periode yang sudah ditutup (%).',
      NEW.created_at::date;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_closed_period_transaction ON transactions;
CREATE TRIGGER trg_prevent_closed_period_transaction
BEFORE INSERT OR UPDATE ON transactions
FOR EACH ROW EXECUTE FUNCTION prevent_closed_period_transaction();

-- 6.3 Trigger untuk transaction_payments
CREATE OR REPLACE FUNCTION prevent_closed_period_payment()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Cek periode tertutup
  IF check_period_closed(NEW.created_at::date, NEW.user_id) THEN
    RAISE EXCEPTION 'Tidak dapat mengubah pembayaran di periode yang sudah ditutup (%).',
      NEW.created_at::date;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_closed_period_payment ON transaction_payments;
CREATE TRIGGER trg_prevent_closed_period_payment
BEFORE INSERT OR UPDATE ON transaction_payments
FOR EACH ROW EXECUTE FUNCTION prevent_closed_period_payment();

-- 6.4 Trigger untuk returns
CREATE OR REPLACE FUNCTION prevent_closed_period_return()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Cek periode tertutup
  IF check_period_closed(NEW.return_date::date, NEW.user_id) THEN
    RAISE EXCEPTION 'Tidak dapat mengubah retur di periode yang sudah ditutup (%).',
      NEW.return_date::date;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_closed_period_return ON returns;
CREATE TRIGGER trg_prevent_closed_period_return
BEFORE INSERT OR UPDATE ON returns
FOR EACH ROW EXECUTE FUNCTION prevent_closed_period_return();

-- 6.5 Trigger untuk stock_movements
CREATE OR REPLACE FUNCTION prevent_closed_period_stock_movement()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Cek periode tertutup
  IF check_period_closed(NEW.created_at::date, NEW.user_id) THEN
    RAISE EXCEPTION 'Tidak dapat mengubah mutasi stok di periode yang sudah ditutup (%).',
      NEW.created_at::date;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_closed_period_stock_movement ON stock_movements;
CREATE TRIGGER trg_prevent_closed_period_stock_movement
BEFORE INSERT OR UPDATE ON stock_movements
FOR EACH ROW EXECUTE FUNCTION prevent_closed_period_stock_movement();

-- 6.6 Trigger untuk purchasing_orders
CREATE OR REPLACE FUNCTION prevent_closed_period_po()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Cek periode tertutup
  IF check_period_closed(NEW.po_date::date, NEW.user_id) THEN
    RAISE EXCEPTION 'Tidak dapat mengubah purchase order di periode yang sudah ditutup (%).',
      NEW.po_date::date;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_closed_period_po ON purchasing_orders;
CREATE TRIGGER trg_prevent_closed_period_po
BEFORE INSERT OR UPDATE ON purchasing_orders
FOR EACH ROW EXECUTE FUNCTION prevent_closed_period_po();

-- 6.7 Trigger untuk goods_receipt_notes
CREATE OR REPLACE FUNCTION prevent_closed_period_grn()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Cek periode tertutup
  IF check_period_closed(NEW.receipt_date::date, NEW.user_id) THEN
    RAISE EXCEPTION 'Tidak dapat mengubah penerimaan barang di periode yang sudah ditutup (%).',
      NEW.receipt_date::date;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_closed_period_grn ON goods_receipt_notes;
CREATE TRIGGER trg_prevent_closed_period_grn
BEFORE INSERT OR UPDATE ON goods_receipt_notes
FOR EACH ROW EXECUTE FUNCTION prevent_closed_period_grn();

-- 6.8 Trigger untuk purchase_invoices
CREATE OR REPLACE FUNCTION prevent_closed_period_purchase_invoice()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Cek periode tertutup
  IF check_period_closed(NEW.invoice_date::date, NEW.user_id) THEN
    RAISE EXCEPTION 'Tidak dapat mengubah invoice pembelian di periode yang sudah ditutup (%).',
      NEW.invoice_date::date;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_closed_period_purchase_invoice ON purchase_invoices;
CREATE TRIGGER trg_prevent_closed_period_purchase_invoice
BEFORE INSERT OR UPDATE ON purchase_invoices
FOR EACH ROW EXECUTE FUNCTION prevent_closed_period_purchase_invoice();

-- 6.9 Trigger untuk hr_payroll_slips
CREATE OR REPLACE FUNCTION prevent_closed_period_payroll()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Cek periode tertutup (gunakan period_start sebagai tanggal referensi)
  IF check_period_closed(NEW.period_start::date, NEW.user_id) THEN
    RAISE EXCEPTION 'Tidak dapat mengubah slip gaji di periode yang sudah ditutup (%).',
      NEW.period_start::date;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_closed_period_payroll ON hr_payroll_slips;
CREATE TRIGGER trg_prevent_closed_period_payroll
BEFORE INSERT OR UPDATE ON hr_payroll_slips
FOR EACH ROW EXECUTE FUNCTION prevent_closed_period_payroll();

-- 6.10 Trigger untuk delivery_orders
CREATE OR REPLACE FUNCTION prevent_closed_period_delivery()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Cek periode tertutup
  IF check_period_closed(NEW.delivery_date::date, NEW.user_id) THEN
    RAISE EXCEPTION 'Tidak dapat mengubah surat jalan di periode yang sudah ditutup (%).',
      NEW.delivery_date::date;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_closed_period_delivery ON delivery_orders;
CREATE TRIGGER trg_prevent_closed_period_delivery
BEFORE INSERT OR UPDATE ON delivery_orders
FOR EACH ROW EXECUTE FUNCTION prevent_closed_period_delivery();

-- ============================================================
-- 7. GRANT PERMISSIONS
-- ============================================================

GRANT EXECUTE ON FUNCTION check_period_closed TO authenticated;
GRANT EXECUTE ON FUNCTION close_period TO authenticated;
GRANT EXECUTE ON FUNCTION reopen_period TO authenticated;
