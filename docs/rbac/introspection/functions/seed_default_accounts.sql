CREATE OR REPLACE FUNCTION public.seed_default_accounts()
 RETURNS SETOF chart_of_accounts
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();

  INSERT INTO chart_of_accounts (user_id, code, name, type, normal_balance, is_system)
  VALUES (v_user_id, '1-1000', 'Kas', 'aset', 'debit', true) ON CONFLICT (user_id, code) DO NOTHING;
  INSERT INTO chart_of_accounts (user_id, code, name, type, normal_balance, is_system)
  VALUES (v_user_id, '1-1010', 'Bank', 'aset', 'debit', true) ON CONFLICT (user_id, code) DO NOTHING;
  INSERT INTO chart_of_accounts (user_id, code, name, type, normal_balance, is_system)
  VALUES (v_user_id, '1-1100', 'Piutang Usaha', 'aset', 'debit', true) ON CONFLICT (user_id, code) DO NOTHING;
  INSERT INTO chart_of_accounts (user_id, code, name, type, normal_balance, is_system)
  VALUES (v_user_id, '1-1200', 'Persediaan Barang', 'aset', 'debit', true) ON CONFLICT (user_id, code) DO NOTHING;

  INSERT INTO chart_of_accounts (user_id, code, name, type, normal_balance, is_system)
  VALUES (v_user_id, '2-2000', 'Utang Usaha', 'kewajiban', 'kredit', true) ON CONFLICT (user_id, code) DO NOTHING;

  INSERT INTO chart_of_accounts (user_id, code, name, type, normal_balance, is_system)
  VALUES (v_user_id, '3-3000', 'Modal Pemilik', 'ekuitas', 'kredit', true) ON CONFLICT (user_id, code) DO NOTHING;
  INSERT INTO chart_of_accounts (user_id, code, name, type, normal_balance, is_system)
  VALUES (v_user_id, '3-3100', 'Laba Ditahan', 'ekuitas', 'kredit', true) ON CONFLICT (user_id, code) DO NOTHING;

  INSERT INTO chart_of_accounts (user_id, code, name, type, normal_balance, is_system)
  VALUES (v_user_id, '4-4000', 'Pendapatan Penjualan', 'pendapatan', 'kredit', true) ON CONFLICT (user_id, code) DO NOTHING;
  INSERT INTO chart_of_accounts (user_id, code, name, type, normal_balance, is_system)
  VALUES (v_user_id, '4-4100', 'Pendapatan Lainnya', 'pendapatan', 'kredit', true) ON CONFLICT (user_id, code) DO NOTHING;

  INSERT INTO chart_of_accounts (user_id, code, name, type, normal_balance, is_system)
  VALUES (v_user_id, '5-5000', 'Harga Pokok Penjualan (HPP)', 'beban', 'debit', true) ON CONFLICT (user_id, code) DO NOTHING;
  INSERT INTO chart_of_accounts (user_id, code, name, type, normal_balance, is_system)
  VALUES (v_user_id, '5-5100', 'Beban Operasional', 'beban', 'debit', true) ON CONFLICT (user_id, code) DO NOTHING;
  INSERT INTO chart_of_accounts (user_id, code, name, type, normal_balance, is_system)
  VALUES (v_user_id, '5-5200', 'Beban Gaji', 'beban', 'debit', true) ON CONFLICT (user_id, code) DO NOTHING;
  INSERT INTO chart_of_accounts (user_id, code, name, type, normal_balance, is_system)
  VALUES (v_user_id, '5-5300', 'Beban Sewa', 'beban', 'debit', true) ON CONFLICT (user_id, code) DO NOTHING;
  INSERT INTO chart_of_accounts (user_id, code, name, type, normal_balance, is_system)
  VALUES (v_user_id, '5-5400', 'Beban Utilitas', 'beban', 'debit', true) ON CONFLICT (user_id, code) DO NOTHING;
  INSERT INTO chart_of_accounts (user_id, code, name, type, normal_balance, is_system)
  VALUES (v_user_id, '5-5500', 'Beban Transportasi', 'beban', 'debit', true) ON CONFLICT (user_id, code) DO NOTHING;
  INSERT INTO chart_of_accounts (user_id, code, name, type, normal_balance, is_system)
  VALUES (v_user_id, '5-5600', 'Beban Lainnya', 'beban', 'debit', true) ON CONFLICT (user_id, code) DO NOTHING;

  RETURN QUERY
  SELECT * FROM chart_of_accounts WHERE user_id = v_user_id ORDER BY code;
END;
$function$;
