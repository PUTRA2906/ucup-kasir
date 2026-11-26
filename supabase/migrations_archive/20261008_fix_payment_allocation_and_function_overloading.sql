-- ============================================================
-- Migration: Fix Payment Allocation & Function Overloading (PGRST203)
-- Tanggal: 2026-10-08
-- Masalah:
-- 1. PGRST203: Terdapat function overloading ganda pada add_transaction_payment
--    (versi 4 argumen vs versi 5 argumen dengan default) dan create_transaction
--    (versi 7 argumen vs versi 9 argumen).
-- 2. add_transaction_payment dan create_transaction di migrasi terbaru
--    belum memanggil allocate_payment_to_items (FIFO alokasi per item).
-- 3. allocate_payment_to_items gagal jika dijalankan dari konteks tanpa auth.uid().
--
-- Solusi:
-- 1. DROP fungsi-fungsi lama yang ambigu.
-- 2. Update allocate_payment_to_items agar fallback ke user_id dari transactions.
-- 3. Satukan add_transaction_payment ke 1 fungsi kanonik (5 parameter)
--    yang otomatis memanggil allocate_payment_to_items.
-- 4. Satukan create_transaction ke 1 fungsi kanonik (9 parameter)
--    yang lengkap (limit kredit, auto-jurnal Kas/Bank, dan FIFO alokasi).
-- 5. Backfill alokasi FIFO untuk seluruh pembayaran yang belum dialokasikan.
-- ============================================================

-- ------------------------------------------------------------
-- 1. UPDATE: allocate_payment_to_items (Lebih tangguh terhadap auth context)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION allocate_payment_to_items(
  p_transaction_id uuid,
  p_payment_id uuid,
  p_payment_amount numeric
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item RECORD;
  v_remaining_payment numeric := p_payment_amount;
  v_item_remaining numeric;
  v_allocated numeric;
  v_user_id uuid;
BEGIN
  -- Ambil user_id dari transaksi jika auth.uid() null
  SELECT user_id INTO v_user_id
  FROM transactions
  WHERE id = p_transaction_id;

  IF v_user_id IS NULL THEN
    v_user_id := auth.uid();
  END IF;

  -- Loop items dalam transaksi (FIFO: by created_at)
  FOR v_item IN
    SELECT 
      ti.id as item_id,
      ti.subtotal,
      COALESCE(SUM(tip.allocated_amount), 0) as already_paid
    FROM transaction_items ti
    LEFT JOIN transaction_item_payments tip ON tip.item_id = ti.id
    WHERE ti.transaction_id = p_transaction_id
      AND (ti.user_id = v_user_id OR v_user_id IS NULL)
    GROUP BY ti.id, ti.subtotal, ti.created_at
    ORDER BY ti.created_at ASC
  LOOP
    -- Skip item yang sudah lunas
    v_item_remaining := v_item.subtotal - v_item.already_paid;
    IF v_item_remaining <= 0 THEN
      CONTINUE;
    END IF;
    
    -- Hitung alokasi untuk item ini
    v_allocated := LEAST(v_remaining_payment, v_item_remaining);
    
    -- Insert alokasi ke transaction_item_payments
    INSERT INTO transaction_item_payments (
      user_id, transaction_id, item_id, payment_id, allocated_amount
    ) VALUES (
      COALESCE(v_user_id, auth.uid()), p_transaction_id, v_item.item_id, p_payment_id, v_allocated
    );
    
    -- Kurangi sisa pembayaran
    v_remaining_payment := v_remaining_payment - v_allocated;
    
    -- Berhenti jika pembayaran habis
    EXIT WHEN v_remaining_payment <= 0;
  END LOOP;
  
  IF v_remaining_payment > 0.01 THEN
    RAISE WARNING 'Sisa pembayaran % tidak teralokasi untuk transaction %', 
      v_remaining_payment, p_transaction_id;
  END IF;
END;
$$;

-- ------------------------------------------------------------
-- 2. FIX & UNIFY: add_transaction_payment
-- ------------------------------------------------------------
-- Hapus kedua overload lama agar tidak ambigu (PGRST203)
DROP FUNCTION IF EXISTS add_transaction_payment(uuid, numeric, text, text);
DROP FUNCTION IF EXISTS add_transaction_payment(uuid, numeric, text, text, date);

CREATE OR REPLACE FUNCTION add_transaction_payment(
  p_transaction_id uuid,
  p_amount numeric,
  p_payment_method text,
  p_notes text DEFAULT NULL,
  p_payment_date date DEFAULT CURRENT_DATE
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
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();

  -- Ambil transaksi
  SELECT * INTO v_transaction
  FROM transactions
  WHERE id = p_transaction_id
    AND (user_id = v_user_id OR v_user_id IS NULL);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaksi tidak ditemukan';
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Jumlah pembayaran tidak valid';
  END IF;

  IF p_amount > v_transaction.remaining_amount THEN
    RAISE EXCEPTION 'Pembayaran melebihi sisa cicilan (sisa %)', v_transaction.remaining_amount;
  END IF;

  -- 1. Catat pembayaran
  INSERT INTO transaction_payments (
    user_id, transaction_id, amount, payment_method, notes, payment_date
  ) VALUES (
    v_transaction.user_id,
    p_transaction_id,
    p_amount,
    COALESCE(p_payment_method, 'tunai'),
    p_notes,
    COALESCE(p_payment_date, CURRENT_DATE)
  )
  RETURNING id INTO v_payment_id;

  -- 2. Alokasikan pembayaran ini ke items secara otomatis (FIFO)
  PERFORM allocate_payment_to_items(p_transaction_id, v_payment_id, p_amount);

  -- 3. Update header transaksi
  v_new_paid := v_transaction.paid_amount + p_amount;
  v_new_remaining := v_transaction.remaining_amount - p_amount;
  v_new_status := CASE WHEN v_new_remaining <= 0 THEN 'lunas' ELSE 'belum_lunas' END;

  UPDATE transactions
  SET paid_amount = v_new_paid,
      remaining_amount = v_new_remaining,
      payment_status = v_new_status,
      updated_at = now()
  WHERE id = p_transaction_id;

  -- Auto-jurnal ditangani oleh trigger auto_journal_payment pada transaction_payments
  RETURN v_payment_id;
END;
$$;

COMMENT ON FUNCTION add_transaction_payment IS
'Catat pembayaran cicilan untuk transaksi kredit.
Otomatis mengalokasikan pembayaran ke items (FIFO) dan men-trigger auto_journal_payment.';

-- ------------------------------------------------------------
-- 3. FIX & UNIFY: create_transaction
-- ------------------------------------------------------------
-- Hapus overload lama agar tidak ambigu (PGRST203)
DROP FUNCTION IF EXISTS create_transaction(uuid, text, text, numeric, numeric, text, jsonb);
DROP FUNCTION IF EXISTS create_transaction(uuid, text, text, numeric, numeric, text, jsonb, numeric, timestamptz);

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
  v_payment_id uuid;
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
  v_rows_updated integer;
  v_credit_limit numeric;
  v_current_debt numeric;
  v_account_kas uuid;
  v_account_bank uuid;
  v_account_piutang uuid;
  v_account_pendapatan uuid;
  v_account_hpp uuid;
  v_account_persediaan uuid;
  v_journal_id uuid;
  v_receiving_account uuid;
  v_receiving_code text;
  v_receiving_name text;
BEGIN
  -- Validasi stok & hitung total
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    SELECT * INTO v_product
    FROM products
    WHERE id = (v_item->>'product_id')::uuid AND user_id = auth.uid();

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
    v_cogs := COALESCE(v_product.price_buy, 0) * v_quantity;
    v_total_cogs := v_total_cogs + v_cogs;
  END LOOP;

  v_total := GREATEST(v_total - COALESCE(p_discount, 0) - COALESCE(p_return_amount, 0), 0);
  v_paid := COALESCE(p_paid_amount, 0);
  v_remaining := GREATEST(v_total - v_paid, 0);
  v_payment_status := CASE WHEN v_paid >= v_total THEN 'lunas' ELSE 'belum_lunas' END;

  -- Penegakan limit kredit
  IF p_customer_id IS NOT NULL AND v_remaining > 0 THEN
    SELECT credit_limit INTO v_credit_limit
    FROM customers WHERE id = p_customer_id AND user_id = auth.uid();

    IF COALESCE(v_credit_limit, 0) = 0 THEN
      SELECT default_credit_limit INTO v_credit_limit
      FROM store_settings WHERE user_id = auth.uid() LIMIT 1;
    END IF;

    IF COALESCE(v_credit_limit, 0) > 0 THEN
      SELECT COALESCE(SUM(remaining_amount), 0) INTO v_current_debt
      FROM transactions
      WHERE customer_id = p_customer_id AND user_id = auth.uid()
        AND remaining_amount > 0 AND status <> 'batal';

      IF v_current_debt + v_remaining > v_credit_limit THEN
        RAISE EXCEPTION 'Limit kredit terlampaui. Limit: Rp %, Hutang: Rp %, Sisa: Rp %',
          replace(to_char(v_credit_limit, 'FM999G999G999G999'), ',', '.'),
          replace(to_char(v_current_debt, 'FM999G999G999G999'), ',', '.'),
          replace(to_char(v_remaining, 'FM999G999G999G999'), ',', '.');
      END IF;
    END IF;
  END IF;

  -- Simpan header transaksi
  INSERT INTO transactions (
    user_id, customer_id, customer_name, subtotal, discount, total,
    payment_method, paid_amount, change_amount, remaining_amount, payment_status, notes,
    created_at, updated_at
  ) VALUES (
    auth.uid(), p_customer_id, p_customer_name,
    v_total + COALESCE(p_discount, 0) + COALESCE(p_return_amount, 0),
    COALESCE(p_discount, 0) + COALESCE(p_return_amount, 0), v_total,
    COALESCE(p_payment_method, 'tunai'), v_paid, GREATEST(v_paid - v_total, 0),
    v_remaining, v_payment_status, p_notes, p_transaction_date, p_transaction_date
  )
  RETURNING id INTO v_transaction_id;

  -- Simpan items + kurangi stok secara atomik
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    SELECT * INTO v_product
    FROM products
    WHERE id = (v_item->>'product_id')::uuid AND user_id = auth.uid();

    v_quantity := (v_item->>'quantity')::integer;
    v_price := COALESCE(NULLIF((v_item->>'price')::numeric, 0), v_product.price_sell);
    v_subtotal := v_price * v_quantity;

    INSERT INTO transaction_items (
      user_id, transaction_id, product_id, product_name, price, quantity, subtotal, created_at
    ) VALUES (
      auth.uid(), v_transaction_id, v_product.id, v_product.name,
      v_price, v_quantity, v_subtotal, p_transaction_date
    );

    UPDATE products
    SET stock = stock - v_quantity, updated_at = now()
    WHERE id = v_product.id AND user_id = auth.uid() AND stock >= v_quantity;

    GET DIAGNOSTICS v_rows_updated = ROW_COUNT;

    IF v_rows_updated = 0 THEN
      RAISE EXCEPTION 'Stok % tidak mencukupi atau berubah. Silakan coba lagi.', v_product.name;
    END IF;
  END LOOP;

  -- Simpan pembayaran awal dan alokasikan FIFO ke item
  IF v_paid > 0 THEN
    INSERT INTO transaction_payments (
      user_id, transaction_id, amount, payment_method, notes, payment_date, created_at
    ) VALUES (
      auth.uid(), v_transaction_id, v_paid,
      COALESCE(p_payment_method, 'tunai'), 'Pembayaran awal',
      DATE(p_transaction_date), p_transaction_date
    )
    RETURNING id INTO v_payment_id;

    -- Alokasikan pembayaran awal ke item secara otomatis (FIFO)
    PERFORM allocate_payment_to_items(v_transaction_id, v_payment_id, v_paid);
  END IF;

  -- Auto-jurnal Akuntansi
  SELECT id INTO v_account_kas FROM chart_of_accounts WHERE user_id = auth.uid() AND code = '1-1000';
  SELECT id INTO v_account_bank FROM chart_of_accounts WHERE user_id = auth.uid() AND code = '1-1010';
  SELECT id INTO v_account_piutang FROM chart_of_accounts WHERE user_id = auth.uid() AND code = '1-1030';
  SELECT id INTO v_account_pendapatan FROM chart_of_accounts WHERE user_id = auth.uid() AND code = '4-4000';
  SELECT id INTO v_account_hpp FROM chart_of_accounts WHERE user_id = auth.uid() AND code = '5-5000';
  SELECT id INTO v_account_persediaan FROM chart_of_accounts WHERE user_id = auth.uid() AND code = '1-1200';

  IF COALESCE(p_payment_method, 'tunai') IN ('transfer', 'qris') THEN
    v_receiving_account := v_account_bank;
    v_receiving_code := '1-1010';
    v_receiving_name := 'Bank';
  ELSE
    v_receiving_account := v_account_kas;
    v_receiving_code := '1-1000';
    v_receiving_name := 'Kas';
  END IF;

  IF v_account_kas IS NOT NULL AND v_account_pendapatan IS NOT NULL THEN
    INSERT INTO journal_entries (user_id, entry_date, description, reference_type, reference_id)
    VALUES (auth.uid(), DATE(p_transaction_date), 'Penjualan ' || COALESCE(p_customer_name, 'eceran'), 'transaction', v_transaction_id)
    RETURNING id INTO v_journal_id;

    IF v_paid > 0 AND v_receiving_account IS NOT NULL THEN
      INSERT INTO journal_lines (user_id, journal_id, account_id, account_code, account_name, debit, credit)
      SELECT auth.uid(), v_journal_id, v_receiving_account, v_receiving_code, v_receiving_name, v_paid, 0;
    END IF;

    IF v_remaining > 0 AND v_account_piutang IS NOT NULL THEN
      INSERT INTO journal_lines (user_id, journal_id, account_id, account_code, account_name, debit, credit)
      SELECT auth.uid(), v_journal_id, v_account_piutang, '1-1030', 'Piutang Usaha', v_remaining, 0;
    END IF;

    INSERT INTO journal_lines (user_id, journal_id, account_id, account_code, account_name, debit, credit)
    SELECT auth.uid(), v_journal_id, v_account_pendapatan, '4-4000', 'Pendapatan Penjualan', 0, v_total;

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

-- ------------------------------------------------------------
-- 4. BACKFILL: Alokasikan semua pembayaran lama yang belum punya alokasi
-- ------------------------------------------------------------
DO $$
DECLARE
  v_payment RECORD;
BEGIN
  FOR v_payment IN
    SELECT tp.id, tp.transaction_id, tp.amount
    FROM transaction_payments tp
    WHERE NOT EXISTS (
      SELECT 1 FROM transaction_item_payments tip 
      WHERE tip.payment_id = tp.id
    )
    ORDER BY tp.created_at ASC
  LOOP
    PERFORM allocate_payment_to_items(
      v_payment.transaction_id,
      v_payment.id,
      v_payment.amount
    );
  END LOOP;
END $$;
