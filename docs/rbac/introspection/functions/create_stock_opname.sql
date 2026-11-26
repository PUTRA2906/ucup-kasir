CREATE OR REPLACE FUNCTION public.create_stock_opname(p_opname_number text, p_opname_date date, p_notes text DEFAULT NULL::text, p_items jsonb DEFAULT '[]'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_opname_id uuid;
  v_opname_number text;
  v_item jsonb;
  v_product_id uuid;
  v_system_quantity integer;
  v_actual_quantity integer;
  v_difference integer;
  v_item_notes text;
  v_product products%ROWTYPE;
BEGIN
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Tidak ada item untuk opname';
  END IF;

  -- Nomor opname: pakai yang dikirim, atau generate bila kosong
  v_opname_number := COALESCE(NULLIF(p_opname_number, ''), 'OPN-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(md5(random()::text), 1, 6)));

  -- Validasi semua item dulu sebelum menulis apa pun
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'product_id')::uuid;
    v_actual_quantity := (v_item->>'actual_quantity')::int;

    SELECT * INTO v_product
    FROM products
    WHERE id = v_product_id AND user_id = auth.uid();

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Produk tidak ditemukan';
    END IF;

    IF v_actual_quantity < 0 THEN
      RAISE EXCEPTION 'Jumlah fisik tidak boleh negatif';
    END IF;
  END LOOP;

  -- Simpan header opname (status = 'completed')
  INSERT INTO stock_opnames (
    user_id, opname_number, opname_date, status, notes,
    completed_at, created_by
  ) VALUES (
    auth.uid(), v_opname_number, p_opname_date, 'completed', p_notes,
    now(), auth.uid()
  )
  RETURNING id INTO v_opname_id;

  -- Simpan items + update stok (trigger mencatat stock_movement)
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'product_id')::uuid;
    v_system_quantity := (v_item->>'system_quantity')::int;
    v_actual_quantity := (v_item->>'actual_quantity')::int;
    v_difference := (v_item->>'difference')::int;
    v_item_notes := v_item->>'notes';

    INSERT INTO stock_opname_items (
      user_id, opname_id, product_id, system_quantity,
      actual_quantity, difference, notes
    ) VALUES (
      auth.uid(), v_opname_id, v_product_id, v_system_quantity,
      v_actual_quantity, v_difference, NULLIF(v_item_notes, '')
    );

    IF v_difference <> 0 THEN
      UPDATE products
      SET stock = v_actual_quantity,
          updated_at = now()
      WHERE id = v_product_id AND user_id = auth.uid();
    END IF;
  END LOOP;

  RETURN v_opname_id;
END;
$function$;
