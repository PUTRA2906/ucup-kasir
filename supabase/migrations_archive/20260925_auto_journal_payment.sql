-- ============================================================
-- Migration: Auto Journal untuk Pembayaran Cicilan
-- Setiap kali cicilan dicatat di transaction_payments,
-- otomatis buat jurnal: Debit Kas/Bank, Kredit Piutang
-- ============================================================

-- Fungsi untuk auto-create jurnal saat cicilan dicatat
CREATE OR REPLACE FUNCTION auto_journal_payment()
RETURNS TRIGGER AS $$
DECLARE
  v_transaction transactions%ROWTYPE;
  v_cash_account_id uuid;
  v_receivables_account_id uuid;
  v_journal_id uuid;
  v_journal_number text;
BEGIN
  -- Ambil data transaksi
  SELECT * INTO v_transaction
  FROM transactions
  WHERE id = NEW.transaction_id;

  -- Skip jika transaksi tidak ditemukan
  IF v_transaction IS NULL THEN
    RETURN NEW;
  END IF;

  -- Ambil account ID untuk Kas atau Bank (berdasarkan payment_method)
  SELECT id INTO v_cash_account_id
  FROM chart_of_accounts
  WHERE code = CASE
    WHEN NEW.payment_method = 'tunai' THEN '1-1000'  -- Kas
    ELSE '1-1010'  -- Bank
  END
  AND user_id = NEW.user_id
  AND is_active = true
  LIMIT 1;

  -- Ambil account ID untuk Piutang Usaha
  SELECT id INTO v_receivables_account_id
  FROM chart_of_accounts
  WHERE code = '1-1030'  -- Piutang Usaha
  AND user_id = NEW.user_id
  AND is_active = true
  LIMIT 1;

  -- Skip jika akun tidak ditemukan (user belum setup COA)
  IF v_cash_account_id IS NULL OR v_receivables_account_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Generate journal number
  v_journal_number := 'PAY-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || SUBSTRING(NEW.id::text, 1, 8);

  -- Buat jurnal otomatis
  INSERT INTO journal_entries (
    user_id,
    journal_number,
    entry_date,
    description,
    reference_type,
    reference_id,
    status,
    created_at,
    updated_at
  ) VALUES (
    NEW.user_id,
    v_journal_number,
    NEW.payment_date,
    'Pembayaran cicilan dari ' || COALESCE(v_transaction.customer_name, 'Customer') || ' - ' || v_transaction.transaction_number,
    'payment',
    NEW.transaction_id,
    'posted',
    NOW(),
    NOW()
  ) RETURNING id INTO v_journal_id;

  -- Jurnal lines: Debit Kas/Bank, Kredit Piutang
  INSERT INTO journal_lines (
    journal_entry_id,
    account_id,
    debit,
    credit,
    created_at,
    updated_at
  ) VALUES
    -- Debit Kas/Bank (uang masuk)
    (v_journal_id, v_cash_account_id, NEW.amount, 0, NOW(), NOW()),
    -- Kredit Piutang (mengurangi piutang)
    (v_journal_id, v_receivables_account_id, 0, NEW.amount, NOW(), NOW());

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Jalankan fungsi setelah INSERT payment
DROP TRIGGER IF EXISTS trigger_auto_journal_payment ON transaction_payments;

CREATE TRIGGER trigger_auto_journal_payment
  AFTER INSERT ON transaction_payments
  FOR EACH ROW
  EXECUTE FUNCTION auto_journal_payment();

-- ============================================================
-- Fungsi untuk void jurnal payment saat payment dihapus
-- ============================================================

CREATE OR REPLACE FUNCTION auto_void_journal_payment()
RETURNS TRIGGER AS $$
DECLARE
  v_journal_id uuid;
BEGIN
  -- Cari jurnal yang reference ke payment ini
  SELECT id INTO v_journal_id
  FROM journal_entries
  WHERE reference_type = 'payment'
  AND reference_id = OLD.transaction_id
  AND user_id = OLD.user_id
  AND status = 'posted'
  LIMIT 1;

  -- Void jurnal jika ditemukan
  IF v_journal_id IS NOT NULL THEN
    UPDATE journal_entries
    SET status = 'void',
        updated_at = NOW()
    WHERE id = v_journal_id;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Void jurnal saat payment dihapus
DROP TRIGGER IF EXISTS trigger_auto_void_journal_payment ON transaction_payments;

CREATE TRIGGER trigger_auto_void_journal_payment
  BEFORE DELETE ON transaction_payments
  FOR EACH ROW
  EXECUTE FUNCTION auto_void_journal_payment();

-- ============================================================
-- Komentar & Dokumentasi
-- ============================================================

COMMENT ON FUNCTION auto_journal_payment() IS
'Auto-create jurnal akuntansi saat cicilan pembayaran dicatat.
Debit: Kas (1-1000) atau Bank (1-1010) berdasarkan payment_method.
Kredit: Piutang Usaha (1-1030).
Jurnal ditandai dengan reference_type=payment dan reference_id=transaction_id.';

COMMENT ON FUNCTION auto_void_journal_payment() IS
'Auto-void jurnal akuntansi saat cicilan pembayaran dihapus.';
