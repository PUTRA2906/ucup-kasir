CREATE OR REPLACE FUNCTION public.auto_journal_payment()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_transaction transactions%ROWTYPE;
  v_cash_account chart_of_accounts%ROWTYPE;
  v_receivables_account chart_of_accounts%ROWTYPE;
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

  -- Ambil account untuk Kas atau Bank (berdasarkan payment_method)
  SELECT * INTO v_cash_account
  FROM chart_of_accounts
  WHERE code = CASE
    WHEN NEW.payment_method IN ('transfer', 'qris') THEN '1-1010'  -- Bank
    ELSE '1-1000'  -- Kas (tunai)
  END
  AND user_id = NEW.user_id
  AND is_active = true
  LIMIT 1;

  -- Ambil account untuk Piutang Usaha
  SELECT * INTO v_receivables_account
  FROM chart_of_accounts
  WHERE code = '1-1100'  -- Piutang Usaha
  AND user_id = NEW.user_id
  AND is_active = true
  LIMIT 1;

  -- Skip jika akun tidak ditemukan (user belum setup COA)
  IF v_cash_account IS NULL OR v_receivables_account IS NULL THEN
    RAISE NOTICE 'Akun Kas/Bank atau Piutang tidak ditemukan untuk user %. Auto-jurnal pembayaran tidak dibuat.', NEW.user_id;
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
    COALESCE(NEW.payment_date, CURRENT_DATE),
    'Pembayaran cicilan ' || v_transaction.transaction_number ||
    CASE WHEN v_transaction.customer_name IS NOT NULL
         THEN ' - ' || v_transaction.customer_name
         ELSE ''
    END,
    'payment',
    NEW.transaction_id,
    'posted',
    NOW(),
    NOW()
  ) RETURNING id INTO v_journal_id;

  -- Jurnal lines: Debit Kas/Bank, Kredit Piutang
  INSERT INTO journal_lines (
    user_id,
    journal_id,
    account_id,
    account_code,
    account_name,
    debit,
    credit,
    created_at
  ) VALUES
    -- Debit Kas/Bank (uang masuk)
    (
      NEW.user_id,
      v_journal_id,
      v_cash_account.id,
      v_cash_account.code,
      v_cash_account.name,
      NEW.amount,
      0,
      NOW()
    ),
    -- Kredit Piutang (mengurangi piutang)
    (
      NEW.user_id,
      v_journal_id,
      v_receivables_account.id,
      v_receivables_account.code,
      v_receivables_account.name,
      0,
      NEW.amount,
      NOW()
    );

  RETURN NEW;
END;
$function$;
