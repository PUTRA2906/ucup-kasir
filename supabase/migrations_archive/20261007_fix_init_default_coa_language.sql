-- ============================================================
-- Migration: Fix init_default_coa_for_user - Gunakan Bahasa Indonesia
-- Masalah: Fungsi menggunakan 'asset', 'revenue', 'expense' (Inggris)
--          tetapi constraint check hanya menerima 'aset', 'pendapatan', 'beban' (Indonesia)
-- Solusi: Update fungsi untuk menggunakan nilai dalam Bahasa Indonesia
-- ============================================================

CREATE OR REPLACE FUNCTION init_default_coa_for_user(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Cek apakah user sudah punya COA
  IF EXISTS (SELECT 1 FROM chart_of_accounts WHERE user_id = p_user_id LIMIT 1) THEN
    RETURN; -- Sudah ada COA, skip
  END IF;

  -- Insert COA default (minimal untuk auto-jurnal transaksi & payment)
  INSERT INTO chart_of_accounts (user_id, code, name, type, normal_balance, is_active, is_system)
  VALUES
    -- ASET LANCAR
    (p_user_id, '1-1000', 'Kas', 'aset', 'debit', true, true),
    (p_user_id, '1-1010', 'Bank', 'aset', 'debit', true, true),
    (p_user_id, '1-1020', 'Persediaan Barang Dagangan', 'aset', 'debit', true, true),
    (p_user_id, '1-1030', 'Piutang Usaha', 'aset', 'debit', true, true),

    -- PENDAPATAN
    (p_user_id, '4-1000', 'Pendapatan Penjualan', 'pendapatan', 'kredit', true, true),

    -- BEBAN POKOK PENJUALAN
    (p_user_id, '5-1000', 'Beban Pokok Penjualan', 'beban', 'debit', true, true);
END;
$$;

COMMENT ON FUNCTION init_default_coa_for_user(uuid) IS
'Inisialisasi Chart of Accounts default untuk user baru.
Dipanggil otomatis saat signup atau bisa dipanggil manual.
Idempotent: tidak akan duplikat jika sudah ada COA.
Menggunakan nilai Bahasa Indonesia sesuai constraint tabel.';

-- Inisialisasi COA untuk semua user yang belum punya
DO $$
DECLARE
  v_user_id uuid;
  v_count integer := 0;
BEGIN
  FOR v_user_id IN
    SELECT u.id
    FROM auth.users u
    LEFT JOIN chart_of_accounts c ON c.user_id = u.id
    GROUP BY u.id
    HAVING COUNT(c.id) = 0
  LOOP
    PERFORM init_default_coa_for_user(v_user_id);
    v_count := v_count + 1;
    RAISE NOTICE 'COA initialized for user: %', v_user_id;
  END LOOP;

  RAISE NOTICE 'Total users initialized: %', v_count;
END;
$$;
