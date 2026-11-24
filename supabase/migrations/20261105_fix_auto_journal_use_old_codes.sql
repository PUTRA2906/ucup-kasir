-- ============================================================
-- Migration: Fix Auto Journal - Perbaiki init_default_coa ke Kode LAMA
-- Tanggal: 2026-11-05
-- Masalah:
--   1. init_default_coa_for_user() membuat kode BARU (1-1030, 4-1000)
--   2. Tapi create_transaction() dan fungsi lain pakai kode LAMA (1-1100, 4-4000)
--   3. User baru dapat COA kode baru → fungsi cari kode lama → akun tidak ketemu → jurnal gagal
-- Solusi:
--   1. Update init_default_coa_for_user() untuk pakai kode LAMA yang konsisten
--   2. Buat fungsi create_stock_adjustment() dengan kode LAMA
--   3. Migrasi user baru yang sudah dapat kode baru → ubah ke kode lama
-- ============================================================

-- ============================================================
-- 1. FIX: Update init_default_coa_for_user() pakai kode LAMA
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
$$;

COMMENT ON FUNCTION init_default_coa_for_user(uuid) IS
'Inisialisasi Chart of Accounts default untuk user baru.
FIXED (2026-11-05): Menggunakan kode LAMA yang konsisten dengan create_transaction():
  - 1-1000 = Kas
  - 1-1100 = Piutang Usaha
  - 1-1200 = Persediaan Barang Dagangan
  - 3-1000 = Modal
  - 4-4000 = Pendapatan Penjualan
  - 5-5000 = Harga Pokok Penjualan (HPP)';

-- ============================================================
-- 2. NEW: Fungsi create_stock_adjustment dengan kode LAMA
-- ============================================================
CREATE OR REPLACE FUNCTION create_stock_adjustment(
  p_product_id uuid,
  p_adjustment_type text,
  p_quantity_before integer,
  p_quantity_after integer,
  p_quantity_change integer,
  p_reason text,
  p_notes text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_adjustment_id uuid;
  v_product products%ROWTYPE;
  v_account_persediaan uuid;
  v_account_modal uuid;
  v_journal_id uuid;
  v_amount numeric;
BEGIN
  -- Ambil produk
  SELECT * INTO v_product
  FROM products
  WHERE id = p_product_id AND user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Produk tidak ditemukan';
  END IF;

  -- Simpan adjustment
  INSERT INTO stock_adjustments (
    user_id, product_id, adjustment_type,
    quantity_before, quantity_after, quantity_change,
    reason, notes, created_at
  ) VALUES (
    auth.uid(), p_product_id, p_adjustment_type,
    p_quantity_before, p_quantity_after, p_quantity_change,
    p_reason, p_notes, now()
  )
  RETURNING id INTO v_adjustment_id;

  -- Update stok produk
  UPDATE products
  SET stock = p_quantity_after, updated_at = now()
  WHERE id = p_product_id AND user_id = auth.uid();

  -- Catat stock movement
  INSERT INTO stock_movements (
    user_id, product_id,
    movement_type,
    quantity,
    quantity_before,
    quantity_after,
    reference_type,
    reference_id,
    notes,
    created_at
  ) VALUES (
    auth.uid(), p_product_id,
    'adjustment',
    p_quantity_change,
    p_quantity_before,
    p_quantity_after,
    'stock_adjustment',
    v_adjustment_id,
    p_reason,
    now()
  );

  -- ✅ AUTO-JURNAL dengan KODE LAMA (1-1200, 3-1000)
  v_amount := ABS(p_quantity_change) * COALESCE(v_product.price_buy, 0);

  IF v_amount > 0 THEN
    SELECT id INTO v_account_persediaan FROM chart_of_accounts WHERE user_id = auth.uid() AND code = '1-1200';
    SELECT id INTO v_account_modal FROM chart_of_accounts WHERE user_id = auth.uid() AND code = '3-1000';

    IF v_account_persediaan IS NOT NULL AND v_account_modal IS NOT NULL THEN
      INSERT INTO journal_entries (user_id, entry_date, description, reference_type, reference_id)
      VALUES (
        auth.uid(),
        now(),
        'Adjustment Stok: ' || v_product.name || ' (' || p_reason || ')',
        'stock_adjustment',
        v_adjustment_id
      )
      RETURNING id INTO v_journal_id;

      -- Jika tambah stok (+): Debit Persediaan (1-1200), Credit Modal (3-1000)
      IF p_quantity_change > 0 THEN
        INSERT INTO journal_lines (user_id, journal_id, account_id, account_code, account_name, debit, credit)
        VALUES
          (auth.uid(), v_journal_id, v_account_persediaan, '1-1200', 'Persediaan Barang Dagangan', v_amount, 0),
          (auth.uid(), v_journal_id, v_account_modal, '3-1000', 'Modal', 0, v_amount);
      -- Jika kurangi stok (-): Debit Modal (3-1000), Credit Persediaan (1-1200)
      ELSE
        INSERT INTO journal_lines (user_id, journal_id, account_id, account_code, account_name, debit, credit)
        VALUES
          (auth.uid(), v_journal_id, v_account_modal, '3-1000', 'Modal', v_amount, 0),
          (auth.uid(), v_journal_id, v_account_persediaan, '1-1200', 'Persediaan Barang Dagangan', 0, v_amount);
      END IF;
    END IF;
  END IF;

  RETURN v_adjustment_id;
END;
$$;

COMMENT ON FUNCTION create_stock_adjustment IS
'Buat adjustment stok dengan auto-jurnal menggunakan kode LAMA (1-1200, 3-1000).';

-- ============================================================
-- 3. Migrasi: User baru yang dapat kode baru → ubah ke kode lama
-- ============================================================
DO $$
DECLARE
  v_user_id uuid;
  v_affected_users integer := 0;
BEGIN
  -- Loop user yang punya akun dengan kode BARU (1-1030, 4-1000, 5-1000, 1-1020)
  FOR v_user_id IN
    SELECT DISTINCT user_id
    FROM chart_of_accounts
    WHERE code IN ('1-1030', '4-1000', '5-1000', '1-1020')
  LOOP
    -- Update ke kode LAMA (jika tidak ada conflict)

    -- 1-1030 → 1-1100 (Piutang)
    UPDATE chart_of_accounts
    SET code = '1-1100', updated_at = now()
    WHERE user_id = v_user_id AND code = '1-1030'
      AND NOT EXISTS (
        SELECT 1 FROM chart_of_accounts
        WHERE user_id = v_user_id AND code = '1-1100'
      );

    -- 4-1000 → 4-4000 (Pendapatan)
    UPDATE chart_of_accounts
    SET code = '4-4000', updated_at = now()
    WHERE user_id = v_user_id AND code = '4-1000'
      AND NOT EXISTS (
        SELECT 1 FROM chart_of_accounts
        WHERE user_id = v_user_id AND code = '4-4000'
      );

    -- 5-1000 → 5-5000 (HPP)
    UPDATE chart_of_accounts
    SET code = '5-5000', updated_at = now()
    WHERE user_id = v_user_id AND code = '5-1000'
      AND NOT EXISTS (
        SELECT 1 FROM chart_of_accounts
        WHERE user_id = v_user_id AND code = '5-5000'
      );

    -- 1-1020 → 1-1200 (Persediaan)
    UPDATE chart_of_accounts
    SET code = '1-1200', updated_at = now()
    WHERE user_id = v_user_id AND code = '1-1020'
      AND NOT EXISTS (
        SELECT 1 FROM chart_of_accounts
        WHERE user_id = v_user_id AND code = '1-1200'
      );

    v_affected_users := v_affected_users + 1;
  END LOOP;

  RAISE NOTICE 'Migrasi selesai: % user diubah ke kode LAMA', v_affected_users;
END;
$$;

-- ============================================================
-- 4. Update journal_lines yang sudah pakai kode baru
-- ============================================================
DO $$
DECLARE
  v_updated_lines integer := 0;
BEGIN
  UPDATE journal_lines
  SET account_code = CASE
    WHEN account_code = '1-1030' THEN '1-1100'
    WHEN account_code = '4-1000' THEN '4-4000'
    WHEN account_code = '5-1000' THEN '5-5000'
    WHEN account_code = '1-1020' THEN '1-1200'
    ELSE account_code
  END
  WHERE account_code IN ('1-1030', '4-1000', '5-1000', '1-1020');

  GET DIAGNOSTICS v_updated_lines = ROW_COUNT;

  IF v_updated_lines > 0 THEN
    RAISE NOTICE 'Journal lines diupdate: % baris', v_updated_lines;
  END IF;
END;
$$;

-- ============================================================
-- 5. Tambahkan akun Modal (3-1000) untuk user existing
-- ============================================================
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  FOR v_user_id IN
    SELECT DISTINCT user_id
    FROM chart_of_accounts
    WHERE user_id NOT IN (
      SELECT user_id FROM chart_of_accounts WHERE code = '3-1000'
    )
  LOOP
    INSERT INTO chart_of_accounts (user_id, code, name, type, normal_balance, is_active, is_system)
    VALUES (v_user_id, '3-1000', 'Modal', 'ekuitas', 'kredit', true, true)
    ON CONFLICT DO NOTHING;
  END LOOP;
END;
$$;

-- ============================================================
-- 6. Dokumentasi
-- ============================================================
COMMENT ON FUNCTION init_default_coa_for_user IS
'Inisialisasi COA default dengan KODE LAMA (konsisten dengan create_transaction).
FIXED (2026-11-05): 1-1100, 1-1200, 4-4000, 5-5000 (bukan 1-1030, 1-1020, 4-1000, 5-1000).';
