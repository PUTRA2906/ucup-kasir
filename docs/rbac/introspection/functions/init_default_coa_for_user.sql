CREATE OR REPLACE FUNCTION public.init_default_coa_for_user(p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Cek apakah user sudah punya COA
  IF EXISTS (SELECT 1 FROM chart_of_accounts WHERE user_id = p_user_id LIMIT 1) THEN
    RETURN; -- Sudah ada COA, skip
  END IF;

  -- Insert COA default dengan KODE LAMA (konsisten dengan create_transaction)
  INSERT INTO chart_of_accounts (user_id, code, name, type, normal_balance, is_active, is_system)
  VALUES
    -- ASET LANCAR
    (p_user_id, '1-1000', 'Kas', 'aset', 'debit', true, true),
    (p_user_id, '1-1010', 'Bank', 'aset', 'debit', true, true),
    (p_user_id, '1-1100', 'Piutang Usaha', 'aset', 'debit', true, true),
    (p_user_id, '1-1200', 'Persediaan Barang Dagangan', 'aset', 'debit', true, true),

    -- MODAL
    (p_user_id, '3-1000', 'Modal', 'ekuitas', 'kredit', true, true),

    -- PENDAPATAN
    (p_user_id, '4-4000', 'Pendapatan Penjualan', 'pendapatan', 'kredit', true, true),

    -- BEBAN POKOK PENJUALAN
    (p_user_id, '5-5000', 'Harga Pokok Penjualan (HPP)', 'beban', 'debit', true, true);
END;
$function$;
