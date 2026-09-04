-- ============================================================
-- Migrasi: Modul Finance — Double-entry Accounting
-- Project: Ucup Kasir
--
-- 1. Chart of Accounts (COA)
-- 2. Jurnal Umum (journal_entries + journal_lines)
-- 3. RLS untuk semua tabel baru
-- 4. Fungsi seed akun default
-- 5. Fungsi post_journal (validasi balance)
-- 6. Auto-jurnal di create_transaction, create_return, add_transaction_payment, void_transaction
-- ============================================================

-- ============================================================
-- 1. CHART OF ACCOUNTS
-- ============================================================
CREATE TABLE IF NOT EXISTS chart_of_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('aset', 'kewajiban', 'ekuitas', 'pendapatan', 'beban')),
  normal_balance TEXT NOT NULL DEFAULT 'debit' CHECK (normal_balance IN ('debit', 'kredit')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_system BOOLEAN NOT NULL DEFAULT false,
  parent_id uuid REFERENCES chart_of_accounts(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, code)
);

CREATE INDEX IF NOT EXISTS idx_coa_user_type ON chart_of_accounts(user_id, type);
CREATE INDEX IF NOT EXISTS idx_coa_parent ON chart_of_accounts(parent_id);

-- ============================================================
-- 2. JURNAL UMUM (header)
-- ============================================================
CREATE TABLE IF NOT EXISTS journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  journal_number TEXT NOT NULL DEFAULT 'JRN-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(md5(random()::text), 1, 6)),
  entry_date timestamptz NOT NULL DEFAULT now(),
  description TEXT NOT NULL,
  reference_type TEXT CHECK (reference_type IN ('manual', 'transaction', 'return', 'payment', 'void')),
  reference_id uuid,
  status TEXT NOT NULL DEFAULT 'posted' CHECK (status IN ('draft', 'posted', 'void')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_journal_entries_user_date ON journal_entries(user_id, entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_journal_entries_reference ON journal_entries(reference_type, reference_id);

-- ============================================================
-- 3. BARIS JURNAL (detail debit/kredit)
-- ============================================================
CREATE TABLE IF NOT EXISTS journal_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  journal_id uuid NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES chart_of_accounts(id),
  account_code TEXT NOT NULL,
  account_name TEXT NOT NULL,
  debit numeric(14,2) NOT NULL DEFAULT 0,
  credit numeric(14,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_journal_lines_journal ON journal_lines(journal_id);
CREATE INDEX IF NOT EXISTS idx_journal_lines_account ON journal_lines(account_id);

-- ============================================================
-- 4. ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE chart_of_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_lines ENABLE ROW LEVEL SECURITY;

-- COA policies
DROP POLICY IF EXISTS "coa_select_own" ON chart_of_accounts;
DROP POLICY IF EXISTS "coa_insert_own" ON chart_of_accounts;
DROP POLICY IF EXISTS "coa_update_own" ON chart_of_accounts;
DROP POLICY IF EXISTS "coa_delete_own" ON chart_of_accounts;

CREATE POLICY "coa_select_own" ON chart_of_accounts
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "coa_insert_own" ON chart_of_accounts
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "coa_update_own" ON chart_of_accounts
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "coa_delete_own" ON chart_of_accounts
  FOR DELETE USING (auth.uid() = user_id);

-- Journal entries policies
DROP POLICY IF EXISTS "journal_entries_select_own" ON journal_entries;
DROP POLICY IF EXISTS "journal_entries_insert_own" ON journal_entries;
DROP POLICY IF EXISTS "journal_entries_update_own" ON journal_entries;
DROP POLICY IF EXISTS "journal_entries_delete_own" ON journal_entries;

CREATE POLICY "journal_entries_select_own" ON journal_entries
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "journal_entries_insert_own" ON journal_entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "journal_entries_update_own" ON journal_entries
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "journal_entries_delete_own" ON journal_entries
  FOR DELETE USING (auth.uid() = user_id);

-- Journal lines policies
DROP POLICY IF EXISTS "journal_lines_select_own" ON journal_lines;
DROP POLICY IF EXISTS "journal_lines_insert_own" ON journal_lines;
DROP POLICY IF EXISTS "journal_lines_update_own" ON journal_lines;
DROP POLICY IF EXISTS "journal_lines_delete_own" ON journal_lines;

CREATE POLICY "journal_lines_select_own" ON journal_lines
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "journal_lines_insert_own" ON journal_lines
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "journal_lines_update_own" ON journal_lines
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "journal_lines_delete_own" ON journal_lines
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- 5. FUNGSI: SEED AKUN DEFAULT
-- ============================================================
DROP FUNCTION IF EXISTS seed_default_accounts;
CREATE OR REPLACE FUNCTION seed_default_accounts()
RETURNS SETOF chart_of_accounts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();

  -- Aset
  INSERT INTO chart_of_accounts (user_id, code, name, type, normal_balance, is_system)
  VALUES (v_user_id, '1-1000', 'Kas', 'aset', 'debit', true)
  ON CONFLICT (user_id, code) DO NOTHING;
  INSERT INTO chart_of_accounts (user_id, code, name, type, normal_balance, is_system)
  VALUES (v_user_id, '1-1010', 'Bank', 'aset', 'debit', true)
  ON CONFLICT (user_id, code) DO NOTHING;
  INSERT INTO chart_of_accounts (user_id, code, name, type, normal_balance, is_system)
  VALUES (v_user_id, '1-1100', 'Piutang Usaha', 'aset', 'debit', true)
  ON CONFLICT (user_id, code) DO NOTHING;
  INSERT INTO chart_of_accounts (user_id, code, name, type, normal_balance, is_system)
  VALUES (v_user_id, '1-1200', 'Persediaan Barang', 'aset', 'debit', true)
  ON CONFLICT (user_id, code) DO NOTHING;

  -- Kewajiban
  INSERT INTO chart_of_accounts (user_id, code, name, type, normal_balance, is_system)
  VALUES (v_user_id, '2-2000', 'Utang Usaha', 'kewajiban', 'kredit', true)
  ON CONFLICT (user_id, code) DO NOTHING;

  -- Ekuitas
  INSERT INTO chart_of_accounts (user_id, code, name, type, normal_balance, is_system)
  VALUES (v_user_id, '3-3000', 'Modal Pemilik', 'ekuitas', 'kredit', true)
  ON CONFLICT (user_id, code) DO NOTHING;
  INSERT INTO chart_of_accounts (user_id, code, name, type, normal_balance, is_system)
  VALUES (v_user_id, '3-3100', 'Laba Ditahan', 'ekuitas', 'kredit', true)
  ON CONFLICT (user_id, code) DO NOTHING;

  -- Pendapatan
  INSERT INTO chart_of_accounts (user_id, code, name, type, normal_balance, is_system)
  VALUES (v_user_id, '4-4000', 'Pendapatan Penjualan', 'pendapatan', 'kredit', true)
  ON CONFLICT (user_id, code) DO NOTHING;
  INSERT INTO chart_of_accounts (user_id, code, name, type, normal_balance, is_system)
  VALUES (v_user_id, '4-4100', 'Pendapatan Lainnya', 'pendapatan', 'kredit', true)
  ON CONFLICT (user_id, code) DO NOTHING;

  -- Beban
  INSERT INTO chart_of_accounts (user_id, code, name, type, normal_balance, is_system)
  VALUES (v_user_id, '5-5000', 'Harga Pokok Penjualan (HPP)', 'beban', 'debit', true)
  ON CONFLICT (user_id, code) DO NOTHING;
  INSERT INTO chart_of_accounts (user_id, code, name, type, normal_balance, is_system)
  VALUES (v_user_id, '5-5100', 'Beban Operasional', 'beban', 'debit', true)
  ON CONFLICT (user_id, code) DO NOTHING;
  INSERT INTO chart_of_accounts (user_id, code, name, type, normal_balance, is_system)
  VALUES (v_user_id, '5-5200', 'Beban Gaji', 'beban', 'debit', true)
  ON CONFLICT (user_id, code) DO NOTHING;
  INSERT INTO chart_of_accounts (user_id, code, name, type, normal_balance, is_system)
  VALUES (v_user_id, '5-5300', 'Beban Sewa', 'beban', 'debit', true)
  ON CONFLICT (user_id, code) DO NOTHING;
  INSERT INTO chart_of_accounts (user_id, code, name, type, normal_balance, is_system)
  VALUES (v_user_id, '5-5400', 'Beban Utilitas', 'beban', 'debit', true)
  ON CONFLICT (user_id, code) DO NOTHING;
  INSERT INTO chart_of_accounts (user_id, code, name, type, normal_balance, is_system)
  VALUES (v_user_id, '5-5500', 'Beban Transportasi', 'beban', 'debit', true)
  ON CONFLICT (user_id, code) DO NOTHING;
  INSERT INTO chart_of_accounts (user_id, code, name, type, normal_balance, is_system)
  VALUES (v_user_id, '5-5600', 'Beban Lainnya', 'beban', 'debit', true)
  ON CONFLICT (user_id, code) DO NOTHING;

  RETURN QUERY
  SELECT * FROM chart_of_accounts
  WHERE user_id = v_user_id
  ORDER BY code;
END;
$$;

-- ============================================================
-- 6. FUNGSI: POST JURNAL MANUAL (validasi balance)
-- ============================================================
DROP FUNCTION IF EXISTS post_journal;
CREATE OR REPLACE FUNCTION post_journal(
  p_entry_date timestamptz,
  p_description TEXT,
  p_lines jsonb  -- [{account_id, debit, credit}]
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_journal_id uuid;
  v_line jsonb;
  v_total_debit numeric := 0;
  v_total_credit numeric := 0;
  v_account chart_of_accounts%ROWTYPE;
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();

  IF p_lines IS NULL OR jsonb_array_length(p_lines) = 0 THEN
    RAISE EXCEPTION 'Jurnal harus memiliki minimal 1 baris';
  END IF;

  IF p_description IS NULL OR trim(p_description) = '' THEN
    RAISE EXCEPTION 'Deskripsi jurnal wajib diisi';
  END IF;

  -- Validasi setiap baris
  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
  LOOP
    SELECT * INTO v_account
    FROM chart_of_accounts
    WHERE id = (v_line->>'account_id')::uuid
      AND user_id = v_user_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Akun tidak ditemukan';
    END IF;

    IF NOT v_account.is_active THEN
      RAISE EXCEPTION 'Akun % tidak aktif', v_account.name;
    END IF;

    v_total_debit := v_total_debit + COALESCE((v_line->>'debit')::numeric, 0);
    v_total_credit := v_total_credit + COALESCE((v_line->>'credit')::numeric, 0);
  END LOOP;

  -- Validasi balance
  IF v_total_debit <= 0 AND v_total_credit <= 0 THEN
    RAISE EXCEPTION 'Jurnal harus memiliki nilai debit atau kredit';
  END IF;

  IF round(v_total_debit, 2) <> round(v_total_credit, 2) THEN
    RAISE EXCEPTION 'Total debit (%) tidak sama dengan total kredit (%)',
      v_total_debit, v_total_credit;
  END IF;

  -- Simpan header jurnal
  INSERT INTO journal_entries (user_id, entry_date, description, reference_type)
  VALUES (v_user_id, p_entry_date, p_description, 'manual')
  RETURNING id INTO v_journal_id;

  -- Simpan baris jurnal
  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
  LOOP
    SELECT * INTO v_account
    FROM chart_of_accounts
    WHERE id = (v_line->>'account_id')::uuid
      AND user_id = v_user_id;

    INSERT INTO journal_lines (user_id, journal_id, account_id, account_code, account_name,
                                debit, credit)
    VALUES (v_user_id, v_journal_id, v_account.id, v_account.code, v_account.name,
            COALESCE((v_line->>'debit')::numeric, 0),
            COALESCE((v_line->>'credit')::numeric, 0));
  END LOOP;

  RETURN v_journal_id;
END;
$$;

-- ============================================================
-- 7. FUNGSI: VOID JURNAL (set status = 'void')
-- ============================================================
DROP FUNCTION IF EXISTS void_journal;
CREATE OR REPLACE FUNCTION void_journal(p_journal_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text;
BEGIN
  SELECT status INTO v_status
  FROM journal_entries
  WHERE id = p_journal_id AND user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Jurnal tidak ditemukan';
  END IF;

  IF v_status = 'void' THEN
    RAISE EXCEPTION 'Jurnal sudah dibatalkan sebelumnya';
  END IF;

  UPDATE journal_entries
  SET status = 'void', updated_at = now()
  WHERE id = p_journal_id AND user_id = auth.uid();
END;
$$;

-- ============================================================
-- 8. HELPER: Ambil account_id by code untuk user tertentu
-- ============================================================
-- (Digunakan inline di fungsi-fungsi di bawah)

-- ============================================================
-- 9. UPDATE: create_transaction — tambah auto-jurnal
-- ============================================================
DROP FUNCTION IF EXISTS create_transaction;
CREATE OR REPLACE FUNCTION create_transaction(
  p_customer_id uuid,
  p_customer_name text,
  p_payment_method text,
  p_paid_amount numeric,
  p_discount numeric,
  p_notes text,
  p_items jsonb,
  p_return_amount numeric DEFAULT 0,
  p_transaction_date timestamptz DEFAULT now()
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transaction_id uuid;
  v_total numeric := 0;
  v_total_cogs numeric := 0;
  v_paid numeric;
  v_remaining numeric;
  v_payment_status text;
  v_item jsonb;
  v_product products%ROWTYPE;
  v_price numeric;
  v_subtotal numeric;
  v_quantity integer;
  v_cogs numeric;
  -- Akun untuk auto-jurnal
  v_account_kas uuid;
  v_account_piutang uuid;
  v_account_pendapatan uuid;
  v_account_hpp uuid;
  v_account_persediaan uuid;
  v_journal_id uuid;
  v_journal_lines jsonb;
BEGIN
  -- Validasi & hitung total dari tiap item
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    SELECT * INTO v_product
    FROM products
    WHERE id = (v_item->>'product_id')::uuid
      AND user_id = auth.uid();

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Produk tidak ditemukan';
    END IF;

    v_quantity := (v_item->>'quantity')::integer;
    IF v_quantity <= 0 THEN
      RAISE EXCEPTION 'Jumlah tidak valid';
    END IF;

    IF v_product.stock < v_quantity THEN
      RAISE EXCEPTION 'Stok % tidak mencukupi (sisa %)', v_product.name, v_product.stock;
    END IF;

    v_price := COALESCE(NULLIF((v_item->>'price')::numeric, 0), v_product.price_sell);
    v_subtotal := v_price * v_quantity;
    v_total := v_total + v_subtotal;

    -- Hitung HPP (Harga Pokok Penjualan)
    v_cogs := COALESCE(v_product.price_buy, 0) * v_quantity;
    v_total_cogs := v_total_cogs + v_cogs;
  END LOOP;

  -- Hitung total setelah diskon dan retur
  v_total := GREATEST(v_total - COALESCE(p_discount, 0) - COALESCE(p_return_amount, 0), 0);
  v_paid := COALESCE(p_paid_amount, 0);
  v_remaining := GREATEST(v_total - v_paid, 0);
  v_payment_status := CASE WHEN v_paid >= v_total THEN 'lunas' ELSE 'belum_lunas' END;

  -- Simpan header transaksi dengan custom date
  INSERT INTO transactions (
    user_id, customer_id, customer_name, subtotal, discount, total,
    payment_method, paid_amount, change_amount, remaining_amount, payment_status, notes,
    created_at, updated_at
  ) VALUES (
    auth.uid(), p_customer_id, p_customer_name,
    v_total + COALESCE(p_discount, 0) + COALESCE(p_return_amount, 0),
    COALESCE(p_discount, 0) + COALESCE(p_return_amount, 0), v_total,
    COALESCE(p_payment_method, 'tunai'), v_paid,
    GREATEST(v_paid - v_total, 0),
    v_remaining, v_payment_status,
    p_notes,
    p_transaction_date, p_transaction_date
  )
  RETURNING id INTO v_transaction_id;

  -- Simpan rincian item + kurangi stok
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    SELECT * INTO v_product
    FROM products
    WHERE id = (v_item->>'product_id')::uuid
      AND user_id = auth.uid();

    v_quantity := (v_item->>'quantity')::integer;
    v_price := COALESCE(NULLIF((v_item->>'price')::numeric, 0), v_product.price_sell);
    v_subtotal := v_price * v_quantity;

    INSERT INTO transaction_items (
      user_id, transaction_id, product_id, product_name, price, quantity, subtotal,
      created_at
    ) VALUES (
      auth.uid(), v_transaction_id, v_product.id, v_product.name,
      v_price, v_quantity, v_subtotal,
      p_transaction_date
    );

    UPDATE products
    SET stock = stock - v_quantity,
        updated_at = now()
    WHERE id = v_product.id AND user_id = auth.uid();
  END LOOP;

  -- Catat pembayaran awal ke riwayat pembayaran (jika ada bayaran)
  IF v_paid > 0 THEN
    INSERT INTO transaction_payments (
      user_id, transaction_id, amount, payment_method, notes,
      created_at
    ) VALUES (
      auth.uid(), v_transaction_id, v_paid,
      COALESCE(p_payment_method, 'tunai'), NULL,
      p_transaction_date
    );
  END IF;

  -- ============================================================
  -- AUTO-JURNAL: catat transaksi ke pembukuan
  -- ============================================================
  -- Cari akun (menggunakan code yang sudah dikenal)
  SELECT id INTO v_account_kas
  FROM chart_of_accounts WHERE user_id = auth.uid() AND code = '1-1000';
  SELECT id INTO v_account_piutang
  FROM chart_of_accounts WHERE user_id = auth.uid() AND code = '1-1100';
  SELECT id INTO v_account_pendapatan
  FROM chart_of_accounts WHERE user_id = auth.uid() AND code = '4-4000';
  SELECT id INTO v_account_hpp
  FROM chart_of_accounts WHERE user_id = auth.uid() AND code = '5-5000';
  SELECT id INTO v_account_persediaan
  FROM chart_of_accounts WHERE user_id = auth.uid() AND code = '1-1200';

  -- Hanya buat jurnal jika akun-akun sudah ada (user sudah seed COA)
  IF v_account_kas IS NOT NULL AND v_account_pendapatan IS NOT NULL THEN
    -- Simpan header jurnal
    INSERT INTO journal_entries (user_id, entry_date, description, reference_type, reference_id)
    VALUES (auth.uid(), p_transaction_date, 'Penjualan ' || COALESCE(p_customer_name, 'eceran'),
            'transaction', v_transaction_id)
    RETURNING id INTO v_journal_id;

    -- Baris 1: Kas (debit) — sebesar yang dibayar tunai
    IF v_paid > 0 THEN
      INSERT INTO journal_lines (user_id, journal_id, account_id, account_code, account_name, debit, credit)
      SELECT auth.uid(), v_journal_id, v_account_kas, '1-1000', 'Kas', v_paid, 0;
    END IF;

    -- Baris 2: Piutang (debit) — jika ada sisa yang belum dibayar
    IF v_remaining > 0 THEN
      INSERT INTO journal_lines (user_id, journal_id, account_id, account_code, account_name, debit, credit)
      SELECT auth.uid(), v_journal_id, v_account_piutang, '1-1100', 'Piutang Usaha', v_remaining, 0;
    END IF;

    -- Baris 3: Pendapatan Penjualan (kredit)
    INSERT INTO journal_lines (user_id, journal_id, account_id, account_code, account_name, debit, credit)
    SELECT auth.uid(), v_journal_id, v_account_pendapatan, '4-4000', 'Pendapatan Penjualan', 0, v_total;

    -- Baris 4: HPP (debit) — jika ada HPP
    IF v_total_cogs > 0 AND v_account_hpp IS NOT NULL AND v_account_persediaan IS NOT NULL THEN
      INSERT INTO journal_lines (user_id, journal_id, account_id, account_code, account_name, debit, credit)
      SELECT auth.uid(), v_journal_id, v_account_hpp, '5-5000', 'Harga Pokok Penjualan (HPP)', v_total_cogs, 0;

      INSERT INTO journal_lines (user_id, journal_id, account_id, account_code, account_name, debit, credit)
      SELECT auth.uid(), v_journal_id, v_account_persediaan, '1-1200', 'Persediaan Barang', 0, v_total_cogs;
    END IF;
  END IF;

  RETURN v_transaction_id;
END;
$$;

-- ============================================================
-- 10. UPDATE: add_transaction_payment — tambah auto-jurnal
-- ============================================================
DROP FUNCTION IF EXISTS add_transaction_payment;
CREATE OR REPLACE FUNCTION add_transaction_payment(
  p_transaction_id uuid,
  p_amount numeric,
  p_payment_method text,
  p_notes text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment_id uuid;
  v_total numeric;
  v_paid numeric;
  v_remaining numeric;
  v_transaction_number text;
  v_account_kas uuid;
  v_account_piutang uuid;
  v_journal_id uuid;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Jumlah pembayaran tidak valid';
  END IF;

  SELECT total, paid_amount, remaining_amount, transaction_number
    INTO v_total, v_paid, v_remaining, v_transaction_number
  FROM transactions
  WHERE id = p_transaction_id AND user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaksi tidak ditemukan';
  END IF;

  IF p_amount > v_remaining THEN
    RAISE EXCEPTION 'Pembayaran melebihi sisa cicilan (sisa %)', v_remaining;
  END IF;

  -- Catat pembayaran
  INSERT INTO transaction_payments (
    user_id, transaction_id, amount, payment_method, notes
  ) VALUES (
    auth.uid(), p_transaction_id, p_amount,
    COALESCE(p_payment_method, 'tunai'), p_notes
  )
  RETURNING id INTO v_payment_id;

  -- Update status transaksi
  v_paid := v_paid + p_amount;
  v_remaining := v_remaining - p_amount;

  UPDATE transactions
  SET paid_amount = v_paid,
      remaining_amount = v_remaining,
      payment_status = CASE WHEN v_remaining <= 0 THEN 'lunas' ELSE 'belum_lunas' END,
      updated_at = now()
  WHERE id = p_transaction_id AND user_id = auth.uid();

  -- ============================================================
  -- AUTO-JURNAL: Pindahkan Piutang → Kas
  -- ============================================================
  SELECT id INTO v_account_kas
  FROM chart_of_accounts WHERE user_id = auth.uid() AND code = '1-1000';
  SELECT id INTO v_account_piutang
  FROM chart_of_accounts WHERE user_id = auth.uid() AND code = '1-1100';

  IF v_account_kas IS NOT NULL AND v_account_piutang IS NOT NULL THEN
    INSERT INTO journal_entries (user_id, entry_date, description, reference_type, reference_id)
    VALUES (auth.uid(), now(), 'Pembayaran cicilan ' || v_transaction_number,
            'payment', p_transaction_id)
    RETURNING id INTO v_journal_id;

    -- Debit Kas
    INSERT INTO journal_lines (user_id, journal_id, account_id, account_code, account_name, debit, credit)
    SELECT auth.uid(), v_journal_id, v_account_kas, '1-1000', 'Kas', p_amount, 0;

    -- Kredit Piutang
    INSERT INTO journal_lines (user_id, journal_id, account_id, account_code, account_name, debit, credit)
    SELECT auth.uid(), v_journal_id, v_account_piutang, '1-1100', 'Piutang Usaha', 0, p_amount;
  END IF;

  RETURN v_payment_id;
END;
$$;

-- ============================================================
-- 11. UPDATE: create_return — tambah auto-jurnal (reversal)
-- ============================================================
DROP FUNCTION IF EXISTS create_return;
CREATE OR REPLACE FUNCTION create_return(
  p_transaction_id uuid,
  p_items jsonb,
  p_notes text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_return_id uuid;
  v_item jsonb;
  v_product_id uuid;
  v_qty integer;
  v_product_name text;
  v_price numeric;
  v_price_buy numeric;
  v_subtotal numeric;
  v_total_refund numeric := 0;
  v_bought integer;
  v_returned integer;
  v_status text;
  v_transaction_number text;
  v_paid_amount numeric;
  v_remaining_amount numeric;
  v_total numeric;
  -- Akun untuk auto-jurnal reversal
  v_account_kas uuid;
  v_account_piutang uuid;
  v_account_pendapatan uuid;
  v_account_hpp uuid;
  v_account_persediaan uuid;
  v_journal_id uuid;
  v_total_cogs_returned numeric := 0;
  v_cogs numeric;
BEGIN
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Tidak ada item yang diretur';
  END IF;

  SELECT status, transaction_number, paid_amount, remaining_amount, total
    INTO v_status, v_transaction_number, v_paid_amount, v_remaining_amount, v_total
  FROM transactions
  WHERE id = p_transaction_id AND user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaksi tidak ditemukan';
  END IF;

  IF v_status = 'batal' THEN
    RAISE EXCEPTION 'Transaksi batal tidak dapat diretur';
  END IF;

  -- Validasi semua item dulu sebelum menulis apa pun
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'product_id')::uuid;
    v_qty := (v_item->>'quantity')::int;

    IF v_qty IS NULL OR v_qty <= 0 THEN
      RAISE EXCEPTION 'Jumlah retur harus lebih dari 0';
    END IF;

    SELECT quantity INTO v_bought
    FROM transaction_items
    WHERE transaction_id = p_transaction_id
      AND product_id = v_product_id
      AND user_id = auth.uid();

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Produk tidak ada di transaksi ini';
    END IF;

    SELECT COALESCE(SUM(ri.quantity), 0) INTO v_returned
    FROM return_items ri
    JOIN returns r ON r.id = ri.return_id
    WHERE r.transaction_id = p_transaction_id
      AND ri.product_id = v_product_id
      AND r.user_id = auth.uid();

    IF v_qty > v_bought - v_returned THEN
      RAISE EXCEPTION 'Jumlah retur melebihi sisa produk (maks %)', v_bought - v_returned;
    END IF;
  END LOOP;

  -- Simpan header retur
  INSERT INTO returns (user_id, transaction_id, notes, total_refund)
  VALUES (auth.uid(), p_transaction_id, p_notes, 0)
  RETURNING id INTO v_return_id;

  -- Simpan item retur + kembalikan stok + simpan price_buy untuk laporan
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'product_id')::uuid;
    v_qty := (v_item->>'quantity')::int;

    -- Ambil harga jual dari transaction_items (untuk refund)
    SELECT product_name, price INTO v_product_name, v_price
    FROM transaction_items
    WHERE transaction_id = p_transaction_id AND product_id = v_product_id;

    -- Ambil harga beli dari products (untuk perhitungan modal/HPP)
    SELECT price_buy INTO v_price_buy
    FROM products
    WHERE id = v_product_id AND user_id = auth.uid();

    v_subtotal := v_price * v_qty;
    v_total_refund := v_total_refund + v_subtotal;

    v_cogs := COALESCE(v_price_buy, 0) * v_qty;
    v_total_cogs_returned := v_total_cogs_returned + v_cogs;

    -- Simpan return_item dengan price_buy
    INSERT INTO return_items (user_id, return_id, product_id, product_name, price, price_buy, quantity, subtotal)
    VALUES (auth.uid(), v_return_id, v_product_id, v_product_name, v_price, COALESCE(v_price_buy, 0), v_qty, v_subtotal);

    UPDATE products
    SET stock = stock + v_qty,
        updated_at = now()
    WHERE id = v_product_id AND user_id = auth.uid();
  END LOOP;

  UPDATE returns SET total_refund = v_total_refund WHERE id = v_return_id;

  -- Kurangi total tagihan transaksi sesuai nilai barang yang diretur
  UPDATE transactions
  SET subtotal = GREATEST(subtotal - v_total_refund, 0),
      total = GREATEST(total - v_total_refund, 0),
      remaining_amount = GREATEST(GREATEST(total - v_total_refund, 0) - paid_amount, 0),
      payment_status = CASE WHEN paid_amount >= GREATEST(total - v_total_refund, 0)
                            THEN 'lunas' ELSE 'belum_lunas' END,
      updated_at = now()
  WHERE id = p_transaction_id AND user_id = auth.uid();

  -- ============================================================
  -- AUTO-JURNAL: Reversal — balikkan jurnal penjualan
  -- ============================================================
  SELECT id INTO v_account_kas
  FROM chart_of_accounts WHERE user_id = auth.uid() AND code = '1-1000';
  SELECT id INTO v_account_piutang
  FROM chart_of_accounts WHERE user_id = auth.uid() AND code = '1-1100';
  SELECT id INTO v_account_pendapatan
  FROM chart_of_accounts WHERE user_id = auth.uid() AND code = '4-4000';
  SELECT id INTO v_account_hpp
  FROM chart_of_accounts WHERE user_id = auth.uid() AND code = '5-5000';
  SELECT id INTO v_account_persediaan
  FROM chart_of_accounts WHERE user_id = auth.uid() AND code = '1-1200';

  IF v_account_pendapatan IS NOT NULL THEN
    INSERT INTO journal_entries (user_id, entry_date, description, reference_type, reference_id)
    VALUES (auth.uid(), now(), 'Retur ' || v_transaction_number,
            'return', v_return_id)
    RETURNING id INTO v_journal_id;

    -- Reversal Pendapatan (debit, karena normalnya kredit)
    INSERT INTO journal_lines (user_id, journal_id, account_id, account_code, account_name, debit, credit)
    SELECT auth.uid(), v_journal_id, v_account_pendapatan, '4-4000', 'Pendapatan Penjualan', v_total_refund, 0;

    -- Jika ada yang sudah dibayar, kredit Kas
    IF v_paid_amount > 0 AND v_account_kas IS NOT NULL THEN
      INSERT INTO journal_lines (user_id, journal_id, account_id, account_code, account_name, debit, credit)
      SELECT auth.uid(), v_journal_id, v_account_kas, '1-1000', 'Kas', 0, LEAST(v_total_refund, v_paid_amount);
    END IF;

    -- Jika ada piutang, kredit Piutang
    IF v_remaining_amount > 0 AND v_account_piutang IS NOT NULL THEN
      INSERT INTO journal_lines (user_id, journal_id, account_id, account_code, account_name, debit, credit)
      SELECT auth.uid(), v_journal_id, v_account_piutang, '1-1100', 'Piutang Usaha', 0, LEAST(v_total_refund, v_remaining_amount);
    END IF;

    -- Reversal HPP & Persediaan
    IF v_total_cogs_returned > 0 AND v_account_hpp IS NOT NULL AND v_account_persediaan IS NOT NULL THEN
      INSERT INTO journal_lines (user_id, journal_id, account_id, account_code, account_name, debit, credit)
      SELECT auth.uid(), v_journal_id, v_account_persediaan, '1-1200', 'Persediaan Barang', v_total_cogs_returned, 0;

      INSERT INTO journal_lines (user_id, journal_id, account_id, account_code, account_name, debit, credit)
      SELECT auth.uid(), v_journal_id, v_account_hpp, '5-5000', 'Harga Pokok Penjualan (HPP)', 0, v_total_cogs_returned;
    END IF;
  END IF;

  RETURN v_return_id;
END;
$$;

-- ============================================================
-- 12. UPDATE: void_transaction — tambah auto-jurnal void
-- ============================================================
DROP FUNCTION IF EXISTS void_transaction;
CREATE OR REPLACE FUNCTION void_transaction(p_transaction_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item RECORD;
  v_status text;
  v_transaction_number text;
  v_total numeric;
  v_paid_amount numeric;
  v_remaining_amount numeric;
  v_total_cogs numeric := 0;
  v_price_buy numeric;
  -- Akun untuk auto-jurnal
  v_account_kas uuid;
  v_account_piutang uuid;
  v_account_pendapatan uuid;
  v_account_hpp uuid;
  v_account_persediaan uuid;
  v_journal_id uuid;
BEGIN
  -- Ambil status transaksi (pastikan milik user yang login)
  SELECT status, transaction_number, total, paid_amount, remaining_amount
    INTO v_status, v_transaction_number, v_total, v_paid_amount, v_remaining_amount
  FROM transactions
  WHERE id = p_transaction_id AND user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaksi tidak ditemukan';
  END IF;

  IF v_status = 'batal' THEN
    RAISE EXCEPTION 'Transaksi sudah dibatalkan sebelumnya';
  END IF;

  -- Hitung total HPP
  FOR v_item IN
    SELECT ti.product_id, ti.quantity, p.price_buy
    FROM transaction_items ti
    LEFT JOIN products p ON p.id = ti.product_id
    WHERE ti.transaction_id = p_transaction_id
      AND ti.user_id = auth.uid()
  LOOP
    v_total_cogs := v_total_cogs + (COALESCE(v_item.price_buy, 0) * v_item.quantity);
  END LOOP;

  -- Kembalikan stok produk dari tiap item
  FOR v_item IN
    SELECT ti.product_id, ti.quantity
    FROM transaction_items ti
    WHERE ti.transaction_id = p_transaction_id
      AND ti.user_id = auth.uid()
  LOOP
    IF v_item.product_id IS NOT NULL THEN
      UPDATE products
      SET stock = stock + v_item.quantity,
          updated_at = now()
      WHERE id = v_item.product_id AND user_id = auth.uid();
    END IF;
  END LOOP;

  -- Tandai transaksi sebagai batal (data tetap tersimpan)
  UPDATE transactions
  SET status = 'batal',
      updated_at = now()
  WHERE id = p_transaction_id AND user_id = auth.uid();

  -- Void jurnal terkait (set status = 'void')
  UPDATE journal_entries
  SET status = 'void', updated_at = now()
  WHERE reference_type = 'transaction' AND reference_id = p_transaction_id
    AND user_id = auth.uid();

  -- ============================================================
  -- AUTO-JURNAL: Jurnal void transaksi
  -- ============================================================
  SELECT id INTO v_account_kas
  FROM chart_of_accounts WHERE user_id = auth.uid() AND code = '1-1000';
  SELECT id INTO v_account_piutang
  FROM chart_of_accounts WHERE user_id = auth.uid() AND code = '1-1100';
  SELECT id INTO v_account_pendapatan
  FROM chart_of_accounts WHERE user_id = auth.uid() AND code = '4-4000';
  SELECT id INTO v_account_hpp
  FROM chart_of_accounts WHERE user_id = auth.uid() AND code = '5-5000';
  SELECT id INTO v_account_persediaan
  FROM chart_of_accounts WHERE user_id = auth.uid() AND code = '1-1200';

  IF v_account_pendapatan IS NOT NULL THEN
    INSERT INTO journal_entries (user_id, entry_date, description, reference_type, reference_id)
    VALUES (auth.uid(), now(), 'Pembatalan ' || v_transaction_number,
            'void', p_transaction_id)
    RETURNING id INTO v_journal_id;

    -- Reversal Pendapatan (debit)
    INSERT INTO journal_lines (user_id, journal_id, account_id, account_code, account_name, debit, credit)
    SELECT auth.uid(), v_journal_id, v_account_pendapatan, '4-4000', 'Pendapatan Penjualan', v_total, 0;

    -- Kredit Kas (jika ada pembayaran)
    IF v_paid_amount > 0 AND v_account_kas IS NOT NULL THEN
      INSERT INTO journal_lines (user_id, journal_id, account_id, account_code, account_name, debit, credit)
      SELECT auth.uid(), v_journal_id, v_account_kas, '1-1000', 'Kas', 0, v_paid_amount;
    END IF;

    -- Kredit Piutang (jika ada)
    IF v_remaining_amount > 0 AND v_account_piutang IS NOT NULL THEN
      INSERT INTO journal_lines (user_id, journal_id, account_id, account_code, account_name, debit, credit)
      SELECT auth.uid(), v_journal_id, v_account_piutang, '1-1100', 'Piutang Usaha', 0, v_remaining_amount;
    END IF;

    -- Reversal HPP & Persediaan
    IF v_total_cogs > 0 AND v_account_hpp IS NOT NULL AND v_account_persediaan IS NOT NULL THEN
      INSERT INTO journal_lines (user_id, journal_id, account_id, account_code, account_name, debit, credit)
      SELECT auth.uid(), v_journal_id, v_account_persediaan, '1-1200', 'Persediaan Barang', v_total_cogs, 0;

      INSERT INTO journal_lines (user_id, journal_id, account_id, account_code, account_name, debit, credit)
      SELECT auth.uid(), v_journal_id, v_account_hpp, '5-5000', 'Harga Pokok Penjualan (HPP)', 0, v_total_cogs;
    END IF;
  END IF;
END;
$$;

-- ============================================================
-- 13. UPDATE: delete_transaction — hapus juga jurnal terkait
-- ============================================================
DROP FUNCTION IF EXISTS delete_transaction;
CREATE OR REPLACE FUNCTION delete_transaction(p_transaction_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item RECORD;
BEGIN
  -- Hapus dulu baris jurnal & jurnal terkait (agar tidak orphan)
  DELETE FROM journal_lines
  WHERE journal_id IN (
    SELECT id FROM journal_entries
    WHERE reference_type IN ('transaction', 'payment', 'void')
      AND reference_id = p_transaction_id
      AND user_id = auth.uid()
  );
  DELETE FROM journal_entries
  WHERE reference_type IN ('transaction', 'payment', 'void')
    AND reference_id = p_transaction_id
    AND user_id = auth.uid();

  -- Kembalikan stok produk dari tiap item
  FOR v_item IN
    SELECT ti.product_id, ti.quantity
    FROM transaction_items ti
    WHERE ti.transaction_id = p_transaction_id
      AND ti.user_id = auth.uid()
  LOOP
    IF v_item.product_id IS NOT NULL THEN
      UPDATE products
      SET stock = stock + v_item.quantity,
          updated_at = now()
      WHERE id = v_item.product_id AND user_id = auth.uid();
    END IF;
  END LOOP;

  -- Hapus transaksi (items ikut terhapus via ON DELETE CASCADE)
  DELETE FROM transactions
  WHERE id = p_transaction_id AND user_id = auth.uid();
END;
$$;