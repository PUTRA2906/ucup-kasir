-- ============================================================
-- FIX BUG #3: Race Condition pada Update Stok
-- Masalah: Gap antara validasi dan update stok memungkinkan
--          transaksi bersamaan membuat stok negatif
-- Solusi: Optimistic locking dengan validasi di WHERE clause
-- ============================================================

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
  v_rows_updated integer;  -- FIX: Track update success
  v_credit_limit numeric;
  v_current_debt numeric;
  v_account_kas uuid;
  v_account_piutang uuid;
  v_account_pendapatan uuid;
  v_account_hpp uuid;
  v_account_persediaan uuid;
  v_journal_id uuid;
BEGIN
  -- Validasi & hitung total
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

  -- Simpan transaksi
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

  -- FIX: Simpan items + kurangi stok ATOMIK
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

    -- FIX: Update stok dengan optimistic locking
    UPDATE products
    SET stock = stock - v_quantity, updated_at = now()
    WHERE id = v_product.id AND user_id = auth.uid() AND stock >= v_quantity;

    GET DIAGNOSTICS v_rows_updated = ROW_COUNT;

    IF v_rows_updated = 0 THEN
      RAISE EXCEPTION 'Stok % tidak mencukupi atau berubah. Silakan coba lagi.', v_product.name;
    END IF;
  END LOOP;

  -- Catat pembayaran
  IF v_paid > 0 THEN
    INSERT INTO transaction_payments (user_id, transaction_id, amount, payment_method, notes, created_at)
    VALUES (auth.uid(), v_transaction_id, v_paid, COALESCE(p_payment_method, 'tunai'), NULL, p_transaction_date);
  END IF;

  -- Auto-jurnal
  SELECT id INTO v_account_kas FROM chart_of_accounts WHERE user_id = auth.uid() AND code = '1-1000';
  SELECT id INTO v_account_piutang FROM chart_of_accounts WHERE user_id = auth.uid() AND code = '1-1100';
  SELECT id INTO v_account_pendapatan FROM chart_of_accounts WHERE user_id = auth.uid() AND code = '4-4000';
  SELECT id INTO v_account_hpp FROM chart_of_accounts WHERE user_id = auth.uid() AND code = '5-5000';
  SELECT id INTO v_account_persediaan FROM chart_of_accounts WHERE user_id = auth.uid() AND code = '1-1200';

  IF v_account_kas IS NOT NULL AND v_account_pendapatan IS NOT NULL THEN
    INSERT INTO journal_entries (user_id, entry_date, description, reference_type, reference_id)
    VALUES (auth.uid(), p_transaction_date, 'Penjualan ' || COALESCE(p_customer_name, 'eceran'), 'transaction', v_transaction_id)
    RETURNING id INTO v_journal_id;

    IF v_paid > 0 THEN
      INSERT INTO journal_lines (user_id, journal_id, account_id, account_code, account_name, debit, credit)
      SELECT auth.uid(), v_journal_id, v_account_kas, '1-1000', 'Kas', v_paid, 0;
    END IF;

    IF v_remaining > 0 THEN
      INSERT INTO journal_lines (user_id, journal_id, account_id, account_code, account_name, debit, credit)
      SELECT auth.uid(), v_journal_id, v_account_piutang, '1-1100', 'Piutang Usaha', v_remaining, 0;
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
