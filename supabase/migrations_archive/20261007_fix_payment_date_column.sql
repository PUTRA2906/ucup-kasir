-- ============================================================
-- Migration: Fix Payment Date Column
-- Masalah: Trigger auto_journal_payment menggunakan NEW.payment_date
--          tetapi kolom payment_date tidak ada di transaction_payments
-- Solusi: Tambahkan kolom payment_date dengan default CURRENT_DATE
-- ============================================================

-- 1. Tambahkan kolom payment_date ke transaction_payments
ALTER TABLE transaction_payments
ADD COLUMN IF NOT EXISTS payment_date DATE NOT NULL DEFAULT CURRENT_DATE;

-- 2. Update existing records dengan payment_date dari created_at
UPDATE transaction_payments
SET payment_date = DATE(created_at)
WHERE payment_date IS NULL;

-- 3. Tambahkan index untuk performa query berdasarkan payment_date
CREATE INDEX IF NOT EXISTS idx_transaction_payments_payment_date
ON transaction_payments(payment_date);

-- 4. Drop fungsi lama dan buat ulang dengan parameter payment_date
DROP FUNCTION IF EXISTS add_transaction_payment(uuid, numeric, text, text);

CREATE OR REPLACE FUNCTION add_transaction_payment(
  p_transaction_id uuid,
  p_amount numeric,
  p_payment_method text,
  p_notes text DEFAULT NULL,
  p_payment_date date DEFAULT CURRENT_DATE
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment_id uuid;
  v_transaction transactions%ROWTYPE;
  v_new_paid numeric;
  v_new_remaining numeric;
  v_new_status text;
BEGIN
  -- Ambil transaksi
  SELECT * INTO v_transaction
  FROM transactions
  WHERE id = p_transaction_id AND user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaksi tidak ditemukan';
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Jumlah pembayaran tidak valid';
  END IF;

  IF p_amount > v_transaction.remaining_amount THEN
    RAISE EXCEPTION 'Pembayaran melebihi sisa cicilan';
  END IF;

  -- Catat pembayaran dengan payment_date
  INSERT INTO transaction_payments (user_id, transaction_id, amount, payment_method, notes, payment_date)
  VALUES (auth.uid(), p_transaction_id, p_amount, COALESCE(p_payment_method, 'tunai'), p_notes, COALESCE(p_payment_date, CURRENT_DATE))
  RETURNING id INTO v_payment_id;

  -- Update transaksi
  v_new_paid := v_transaction.paid_amount + p_amount;
  v_new_remaining := v_transaction.remaining_amount - p_amount;
  v_new_status := CASE WHEN v_new_remaining <= 0 THEN 'lunas' ELSE 'belum_lunas' END;

  UPDATE transactions
  SET paid_amount = v_new_paid,
      remaining_amount = v_new_remaining,
      payment_status = v_new_status,
      updated_at = now()
  WHERE id = p_transaction_id AND user_id = auth.uid();

  -- Auto-jurnal ditangani oleh trigger auto_journal_payment

  RETURN v_payment_id;
END;
$$;

COMMENT ON FUNCTION add_transaction_payment IS
'Catat pembayaran cicilan untuk transaksi kredit.
Auto-jurnal ditangani oleh trigger auto_journal_payment.
Parameter p_payment_date digunakan untuk custom tanggal pembayaran (default: hari ini).';

-- 5. Perbaiki trigger auto_journal_payment untuk handle NULL payment_date
CREATE OR REPLACE FUNCTION auto_journal_payment()
RETURNS TRIGGER AS $$
DECLARE
  v_transaction transactions%ROWTYPE;
  v_cash_account_id uuid;
  v_receivables_account_id uuid;
  v_journal_id uuid;
  v_journal_number text;
  v_entry_date date;
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

  -- Gunakan payment_date jika ada, fallback ke created_at
  v_entry_date := COALESCE(NEW.payment_date, DATE(NEW.created_at));

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
    v_entry_date,
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

COMMENT ON FUNCTION auto_journal_payment() IS
'Auto-create jurnal akuntansi saat cicilan pembayaran dicatat.
Debit: Kas (1-1000) atau Bank (1-1010) berdasarkan payment_method.
Kredit: Piutang Usaha (1-1030).
Jurnal ditandai dengan reference_type=payment dan reference_id=transaction_id.
Menggunakan payment_date atau fallback ke DATE(created_at).';

-- 6. Dokumentasi
COMMENT ON COLUMN transaction_payments.payment_date IS
'Tanggal pembayaran dicatat. Default ke CURRENT_DATE, bisa di-override untuk custom date.';
