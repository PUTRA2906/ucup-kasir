CREATE OR REPLACE FUNCTION public.create_stock_adjustment(p_product_id uuid, p_adjustment_type text, p_quantity_before integer, p_quantity_after integer, p_quantity_change integer, p_reason text, p_notes text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;
