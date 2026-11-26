CREATE OR REPLACE FUNCTION public.create_goods_receipt(p_po_id uuid, p_supplier_id uuid, p_supplier_name text, p_receipt_date timestamp with time zone, p_notes text, p_items jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_grn_id uuid;
  v_item jsonb;
  v_subtotal numeric := 0;
  v_grn_subtotal numeric := 0;
  v_po_item po_items%ROWTYPE;
  v_qty_received numeric;
  v_qty_rejected numeric;
  v_total_received numeric;
  v_total_ordered numeric;
  v_account_persediaan uuid;
  v_account_utang uuid;
  v_journal_id uuid;
BEGIN
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'GRN harus memiliki minimal 1 item';
  END IF;

  v_grn_id := gen_random_uuid();
  p_receipt_date := COALESCE(p_receipt_date, now());

  INSERT INTO goods_receipts (id, user_id, grn_number, po_id, supplier_id, supplier_name,
                               receipt_date, notes, status)
  VALUES (v_grn_id, auth.uid(),
          'GRN-' || to_char(p_receipt_date, 'YYYYMMDD') || '-' || upper(substr(md5(random()::text), 1, 6)),
          p_po_id, p_supplier_id, p_supplier_name, p_receipt_date, p_notes, 'completed');

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_qty_received := COALESCE((v_item->>'quantity_received')::numeric, 0);
    v_qty_rejected := COALESCE((v_item->>'quantity_rejected')::numeric, 0);
    v_subtotal := (v_qty_received + v_qty_rejected) * COALESCE((v_item->>'price')::numeric, 0);
    v_grn_subtotal := v_grn_subtotal + v_subtotal;

    INSERT INTO grn_items (user_id, grn_id, po_item_id, product_id, product_name,
                           quantity_received, quantity_rejected, price, subtotal)
    VALUES (auth.uid(), v_grn_id,
            (v_item->>'po_item_id')::uuid,
            (v_item->>'product_id')::uuid,
            (v_item->>'product_name')::text,
            v_qty_received, v_qty_rejected,
            COALESCE((v_item->>'price')::numeric, 0),
            v_subtotal);

    IF v_qty_received > 0 THEN
      UPDATE products
      SET stock = stock + v_qty_received,
          updated_at = now()
      WHERE id = (v_item->>'product_id')::uuid AND user_id = auth.uid();
    END IF;

    IF (v_item->>'po_item_id') IS NOT NULL THEN
      SELECT * INTO v_po_item FROM po_items WHERE id = (v_item->>'po_item_id')::uuid;
      IF FOUND THEN
        v_total_received := COALESCE(v_po_item.received_quantity, 0) + v_qty_received + v_qty_rejected;
        UPDATE po_items
        SET received_quantity = v_total_received
        WHERE id = v_po_item.id;
      END IF;
    END IF;
  END LOOP;

  UPDATE goods_receipts SET total = v_grn_subtotal WHERE id = v_grn_id;

  IF p_po_id IS NOT NULL THEN
    SELECT COALESCE(SUM(quantity), 0), COALESCE(SUM(received_quantity), 0)
      INTO v_total_ordered, v_total_received
    FROM po_items WHERE po_id = p_po_id;

    IF v_total_received >= v_total_ordered THEN
      UPDATE purchase_orders SET status = 'completed', updated_at = now() WHERE id = p_po_id;
    ELSE
      UPDATE purchase_orders SET status = 'partial', updated_at = now() WHERE id = p_po_id;
    END IF;
  END IF;

  -- AUTO-JURNAL: Persediaan (Debit) → Utang Usaha (Kredit)
  SELECT id INTO v_account_persediaan
  FROM chart_of_accounts WHERE user_id = auth.uid() AND code = '1-1200';
  SELECT id INTO v_account_utang
  FROM chart_of_accounts WHERE user_id = auth.uid() AND code = '2-2000';

  IF v_account_persediaan IS NOT NULL AND v_account_utang IS NOT NULL THEN
    INSERT INTO journal_entries (user_id, entry_date, description, reference_type, reference_id)
    VALUES (auth.uid(), p_receipt_date, 'Penerimaan barang ' || COALESCE(p_supplier_name, ''),
            'purchase', v_grn_id)
    RETURNING id INTO v_journal_id;

    INSERT INTO journal_lines (user_id, journal_id, account_id, account_code, account_name, debit, credit)
    SELECT auth.uid(), v_journal_id, v_account_persediaan, '1-1200', 'Persediaan Barang', v_grn_subtotal, 0;

    INSERT INTO journal_lines (user_id, journal_id, account_id, account_code, account_name, debit, credit)
    SELECT auth.uid(), v_journal_id, v_account_utang, '2-2000', 'Utang Usaha', 0, v_grn_subtotal;
  END IF;

  RETURN v_grn_id;
END;
$function$;
