CREATE OR REPLACE FUNCTION public.add_pi_payment(p_pi_id uuid, p_amount numeric, p_payment_method text, p_notes text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_payment_id uuid;
  v_paid numeric;
  v_remaining numeric;
  v_total numeric;
  v_pi_number text;
  v_account_kas uuid;
  v_account_utang uuid;
  v_journal_id uuid;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Jumlah pembayaran tidak valid';
  END IF;

  SELECT total, paid_amount, remaining_amount, pi_number
    INTO v_total, v_paid, v_remaining, v_pi_number
  FROM purchase_invoices
  WHERE id = p_pi_id AND user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invoice tidak ditemukan';
  END IF;

  IF p_amount > v_remaining THEN
    RAISE EXCEPTION 'Pembayaran melebihi sisa tagihan (sisa %)', v_remaining;
  END IF;

  INSERT INTO pi_payments (user_id, pi_id, amount, payment_method, notes)
  VALUES (auth.uid(), p_pi_id, p_amount, COALESCE(p_payment_method, 'tunai'), p_notes)
  RETURNING id INTO v_payment_id;

  v_paid := v_paid + p_amount;
  v_remaining := v_remaining - p_amount;

  UPDATE purchase_invoices
  SET paid_amount = v_paid,
      remaining_amount = v_remaining,
      payment_status = CASE
        WHEN v_remaining <= 0 THEN 'lunas'
        WHEN v_paid > 0 THEN 'sebagian'
        ELSE 'belum_lunas'
      END,
      updated_at = now()
  WHERE id = p_pi_id AND user_id = auth.uid();

  -- AUTO-JURNAL: Utang Usaha (Debit) → Kas (Kredit)
  SELECT id INTO v_account_kas
  FROM chart_of_accounts WHERE user_id = auth.uid() AND code = '1-1000';
  SELECT id INTO v_account_utang
  FROM chart_of_accounts WHERE user_id = auth.uid() AND code = '2-2000';

  IF v_account_kas IS NOT NULL AND v_account_utang IS NOT NULL THEN
    INSERT INTO journal_entries (user_id, entry_date, description, reference_type, reference_id)
    VALUES (auth.uid(), now(), 'Pembayaran ' || v_pi_number, 'purchase_payment', p_pi_id)
    RETURNING id INTO v_journal_id;

    INSERT INTO journal_lines (user_id, journal_id, account_id, account_code, account_name, debit, credit)
    SELECT auth.uid(), v_journal_id, v_account_utang, '2-2000', 'Utang Usaha', p_amount, 0;

    INSERT INTO journal_lines (user_id, journal_id, account_id, account_code, account_name, debit, credit)
    SELECT auth.uid(), v_journal_id, v_account_kas, '1-1000', 'Kas', 0, p_amount;
  END IF;

  RETURN v_payment_id;
END;
$function$;
