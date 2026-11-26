CREATE OR REPLACE FUNCTION public.post_payroll_journal(p_payroll_id uuid)
 RETURNS payrolls
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
  v_payroll RECORD;
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

  -- Cari akun biaya gaji (beban)
  SELECT id INTO v_expense_account
  FROM chart_of_accounts
  WHERE user_id = v_user_id
    AND type = 'beban'
    AND (LOWER(name) LIKE '%gaji%' OR LOWER(name) LIKE '%salary%')
  ORDER BY created_at
  LIMIT 1;

  IF v_expense_account IS NULL THEN
    RAISE EXCEPTION 'Akun biaya gaji tidak ditemukan. Buat dulu akun dengan tipe Beban dan nama mengandung "Gaji"';
  END IF;

  -- Cari akun hutang gaji (kewajiban)
  SELECT id INTO v_liability_account
  FROM chart_of_accounts
  WHERE user_id = v_user_id
    AND type = 'kewajiban'
    AND (LOWER(name) LIKE '%hutang%' AND LOWER(name) LIKE '%gaji%')
  ORDER BY created_at
  LIMIT 1;

  IF v_liability_account IS NULL THEN
    RAISE EXCEPTION 'Akun hutang gaji tidak ditemukan. Buat dulu akun dengan tipe Kewajiban dan nama mengandung "Hutang Gaji"';
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
  -- Debit: Biaya Gaji (TANPA field description)
  INSERT INTO journal_lines (
    id, user_id, journal_id, account_id, 
    account_code, account_name,
    debit, credit, created_at
  ) 
  SELECT
    gen_random_uuid(), v_user_id, v_journal_id, v_expense_account,
    coa.code, coa.name,
    v_payroll.total_net, 0, now()
  FROM chart_of_accounts coa
  WHERE coa.id = v_expense_account;

  -- Credit: Hutang Gaji (TANPA field description)
  INSERT INTO journal_lines (
    id, user_id, journal_id, account_id,
    account_code, account_name,
    debit, credit, created_at
  )
  SELECT
    gen_random_uuid(), v_user_id, v_journal_id, v_liability_account,
    coa.code, coa.name,
    0, v_payroll.total_net, now()
  FROM chart_of_accounts coa
  WHERE coa.id = v_liability_account;

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
$function$;
