-- ============================================================
-- Migration: Fix Auto Journal Payment - Buat COA Default & Unifikasi Kode Akun
-- Masalah: Auto-jurnal gagal silent karena user belum setup COA
-- Solusi:
--   1. Buat fungsi init COA default (dipanggil otomatis saat signup)
--   2. Unifikasi kode akun Piutang (pakai 1-1030, bukan 1-1100)
--   3. Update fungsi add_transaction_payment untuk konsisten dengan trigger
-- ============================================================

-- ============================================================
-- 1. Fungsi untuk inisialisasi COA default
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
    (p_user_id, '1-1000', 'Kas', 'asset', 'debit', true, true),
    (p_user_id, '1-1010', 'Bank', 'asset', 'debit', true, true),
    (p_user_id, '1-1020', 'Persediaan Barang Dagangan', 'asset', 'debit', true, true),
    (p_user_id, '1-1030', 'Piutang Usaha', 'asset', 'debit', true, true),

    -- PENDAPATAN
    (p_user_id, '4-1000', 'Pendapatan Penjualan', 'revenue', 'credit', true, true),

    -- BEBAN POKOK PENJUALAN
    (p_user_id, '5-1000', 'Beban Pokok Penjualan', 'expense', 'debit', true, true);
END;
$$;

COMMENT ON FUNCTION init_default_coa_for_user(uuid) IS
'Inisialisasi Chart of Accounts default untuk user baru.
Dipanggil otomatis saat signup atau bisa dipanggil manual.
Idempotent: tidak akan duplikat jika sudah ada COA.';

-- ============================================================
-- 2. Trigger untuk auto-init COA saat user pertama kali membuat transaksi
-- ============================================================
CREATE OR REPLACE FUNCTION trigger_init_coa_on_first_transaction()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-init COA jika belum ada
  PERFORM init_default_coa_for_user(NEW.user_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS ensure_coa_exists ON transactions;
CREATE TRIGGER ensure_coa_exists
  BEFORE INSERT ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_init_coa_on_first_transaction();

-- ============================================================
-- 3. UPDATE: add_transaction_payment - Unifikasi kode akun Piutang
-- ============================================================
-- Ganti kode Piutang dari 1-1100 ke 1-1030 (konsisten dengan trigger auto_journal_payment)
CREATE OR REPLACE FUNCTION add_transaction_payment(
  p_transaction_id uuid,
  p_amount numeric,
  p_payment_method text,
  p_notes text DEFAULT NULL
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
  v_account_kas uuid;
  v_account_bank uuid;
  v_account_piutang uuid;
  v_journal_id uuid;
  v_receiving_account uuid;
  v_receiving_code text;
  v_receiving_name text;
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

  -- Catat pembayaran
  INSERT INTO transaction_payments (user_id, transaction_id, amount, payment_method, notes)
  VALUES (auth.uid(), p_transaction_id, p_amount, COALESCE(p_payment_method, 'tunai'), p_notes)
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

  -- ✅ FIXED: Auto-jurnal dengan kode akun yang konsisten (1-1030 untuk Piutang)
  -- NOTE: Trigger auto_journal_payment JUGA akan jalan, tapi kita DISABLE fungsi ini
  -- karena sudah ada trigger yang lebih baik di 20260925_auto_journal_payment.sql

  -- Fungsi ini TIDAK LAGI membuat jurnal manual, diserahkan ke trigger

  RETURN v_payment_id;
END;
$$;

COMMENT ON FUNCTION add_transaction_payment IS
'Catat pembayaran cicilan untuk transaksi kredit.
Auto-jurnal ditangani oleh trigger auto_journal_payment.';

-- ============================================================
-- 4. Jalankan init COA untuk semua user existing yang belum punya COA
-- ============================================================
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Loop semua user yang pernah buat transaksi tapi belum punya COA
  FOR v_user_id IN
    SELECT DISTINCT user_id
    FROM transactions
    WHERE user_id NOT IN (SELECT DISTINCT user_id FROM chart_of_accounts)
  LOOP
    PERFORM init_default_coa_for_user(v_user_id);
  END LOOP;
END;
$$;

-- ============================================================
-- 5. Dokumentasi
-- ============================================================
COMMENT ON TRIGGER ensure_coa_exists ON transactions IS
'Auto-init COA default sebelum transaksi pertama dibuat.
Memastikan auto-jurnal tidak gagal karena akun tidak ditemukan.';
