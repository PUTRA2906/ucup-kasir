CREATE OR REPLACE FUNCTION public.init_default_coa_for_current_user()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
BEGIN
  -- Ambil user_id dari session
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User tidak terautentikasi';
  END IF;

  -- Cek apakah user sudah punya COA
  IF EXISTS (SELECT 1 FROM chart_of_accounts WHERE user_id = v_user_id LIMIT 1) THEN
    RETURN; -- Sudah ada COA, skip
  END IF;

  -- Insert COA default
  INSERT INTO chart_of_accounts (user_id, code, name, type, normal_balance, is_active, is_system)
  VALUES
    -- ASET LANCAR
    (v_user_id, '1-1000', 'Kas', 'asset', 'debit', true, true),
    (v_user_id, '1-1010', 'Bank', 'asset', 'debit', true, true),
    (v_user_id, '1-1020', 'Persediaan Barang Dagangan', 'asset', 'debit', true, true),
    (v_user_id, '1-1030', 'Piutang Usaha', 'asset', 'debit', true, true),
    -- PENDAPATAN
    (v_user_id, '4-1000', 'Pendapatan Penjualan', 'revenue', 'credit', true, true),
    -- BEBAN POKOK PENJUALAN
    (v_user_id, '5-1000', 'Beban Pokok Penjualan', 'expense', 'debit', true, true);
END;
$function$;
