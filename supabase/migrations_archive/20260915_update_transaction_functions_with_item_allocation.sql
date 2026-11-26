-- ============================================================
-- Migrasi: Update Fungsi create_transaction & add_transaction_payment
-- Project: Ucup Kasir
--
-- Update fungsi agar otomatis mengalokasikan pembayaran ke items
-- menggunakan strategi FIFO (First In First Out).
--
-- Requires: 20260915_transaction_item_payments.sql
-- Aman dijalankan ulang (idempotent).
-- Jalankan di Supabase Dashboard -> SQL Editor.
-- ============================================================

-- ============================================================
-- 1) UPDATE: create_transaction
-- ============================================================
-- Tambahkan alokasi pembayaran ke items setelah pembayaran awal tercatat
DROP FUNCTION IF EXISTS create_transaction(uuid, text, text, numeric, numeric, text, jsonb);
CREATE OR REPLACE FUNCTION create_transaction(
  p_customer_id uuid,
  p_customer_name text,
  p_payment_method text,
  p_paid_amount numeric,
  p_discount numeric,
  p_notes text,
  p_items jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transaction_id uuid;
  v_payment_id uuid;
  v_total numeric := 0;
  v_paid numeric;
  v_remaining numeric;
  v_payment_status text;
  v_item jsonb;
  v_product products%ROWTYPE;
  v_price numeric;
  v_subtotal numeric;
  v_quantity integer;
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

    -- Harga custom jika dikirim dari form, jika tidak pakai harga jual produk
    v_price := COALESCE(NULLIF((v_item->>'price')::numeric, 0), v_product.price_sell);
    v_subtotal := v_price * v_quantity;
    v_total := v_total + v_subtotal;
  END LOOP;

  v_total := GREATEST(v_total - COALESCE(p_discount, 0), 0);
  v_paid := COALESCE(p_paid_amount, 0);
  v_remaining := GREATEST(v_total - v_paid, 0);
  v_payment_status := CASE WHEN v_paid >= v_total THEN 'lunas' ELSE 'belum_lunas' END;

  -- Simpan header transaksi
  INSERT INTO transactions (
    user_id, customer_id, customer_name, subtotal, discount, total,
    payment_method, paid_amount, change_amount, remaining_amount, payment_status, notes
  ) VALUES (
    auth.uid(), p_customer_id, p_customer_name, v_total + COALESCE(p_discount, 0),
    COALESCE(p_discount, 0), v_total,
    COALESCE(p_payment_method, 'tunai'), v_paid,
    GREATEST(v_paid - v_total, 0),
    v_remaining, v_payment_status,
    p_notes
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
      user_id, transaction_id, product_id, product_name, price, quantity, subtotal
    ) VALUES (
      auth.uid(), v_transaction_id, v_product.id, v_product.name,
      v_price, v_quantity, v_subtotal
    );

    UPDATE products
    SET stock = stock - v_quantity,
        updated_at = now()
    WHERE id = v_product.id AND user_id = auth.uid();
  END LOOP;

  -- Catat pembayaran awal ke riwayat pembayaran (jika ada bayaran)
  IF v_paid > 0 THEN
    INSERT INTO transaction_payments (
      user_id, transaction_id, amount, payment_method, notes
    ) VALUES (
      auth.uid(), v_transaction_id, v_paid,
      COALESCE(p_payment_method, 'tunai'), 'Pembayaran awal'
    )
    RETURNING id INTO v_payment_id;
    
    -- ✅ NEW: Alokasikan pembayaran ini ke items (FIFO)
    PERFORM allocate_payment_to_items(v_transaction_id, v_payment_id, v_paid);
  END IF;

  RETURN v_transaction_id;
END;
$$;

-- ============================================================
-- 2) UPDATE: add_transaction_payment
-- ============================================================
-- Tambahkan alokasi pembayaran ke items setelah pembayaran cicilan tercatat
DROP FUNCTION IF EXISTS add_transaction_payment(uuid, numeric, text, text);
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
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Jumlah pembayaran tidak valid';
  END IF;

  SELECT total, paid_amount, remaining_amount
    INTO v_total, v_paid, v_remaining
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

  -- ✅ NEW: Alokasikan pembayaran ini ke items (FIFO)
  PERFORM allocate_payment_to_items(p_transaction_id, v_payment_id, p_amount);

  -- Update status transaksi
  v_paid := v_paid + p_amount;
  v_remaining := v_remaining - p_amount;

  UPDATE transactions
  SET paid_amount = v_paid,
      remaining_amount = v_remaining,
      payment_status = CASE WHEN v_remaining <= 0 THEN 'lunas' ELSE 'belum_lunas' END,
      updated_at = now()
  WHERE id = p_transaction_id AND user_id = auth.uid();

  RETURN v_payment_id;
END;
$$;

-- ============================================================
-- 3) UPDATE: delete_transaction
-- ============================================================
-- Item payments akan auto-delete karena ON DELETE CASCADE,
-- tapi kita pastikan dengan explicit delete untuk clarity
DROP FUNCTION IF EXISTS delete_transaction(uuid);
CREATE OR REPLACE FUNCTION delete_transaction(p_transaction_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item RECORD;
BEGIN
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

  -- Hapus alokasi pembayaran (optional karena CASCADE, tapi explicit lebih clear)
  DELETE FROM transaction_item_payments
  WHERE transaction_id = p_transaction_id AND user_id = auth.uid();

  -- Hapus transaksi (items & payments ikut terhapus via ON DELETE CASCADE)
  DELETE FROM transactions
  WHERE id = p_transaction_id AND user_id = auth.uid();
END;
$$;

-- ============================================================
-- 4) NEW FUNCTION: delete_transaction_payment
-- ============================================================
-- Function untuk menghapus pembayaran (beserta alokasinya)
-- Berguna jika admin salah input pembayaran
DROP FUNCTION IF EXISTS delete_transaction_payment(uuid);
CREATE OR REPLACE FUNCTION delete_transaction_payment(p_payment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment RECORD;
BEGIN
  -- Get payment info
  SELECT tp.id, tp.transaction_id, tp.amount
    INTO v_payment
  FROM transaction_payments tp
  WHERE tp.id = p_payment_id AND tp.user_id = auth.uid();
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pembayaran tidak ditemukan';
  END IF;
  
  -- Deallocate payment dari items
  PERFORM deallocate_payment(p_payment_id);
  
  -- Delete payment record
  DELETE FROM transaction_payments
  WHERE id = p_payment_id AND user_id = auth.uid();
  
  -- Update transaction totals
  UPDATE transactions t
  SET 
    paid_amount = (
      SELECT COALESCE(SUM(amount), 0)
      FROM transaction_payments
      WHERE transaction_id = t.id
    ),
    remaining_amount = t.total - (
      SELECT COALESCE(SUM(amount), 0)
      FROM transaction_payments
      WHERE transaction_id = t.id
    ),
    payment_status = CASE
      WHEN t.total <= (
        SELECT COALESCE(SUM(amount), 0)
        FROM transaction_payments
        WHERE transaction_id = t.id
      ) THEN 'lunas'
      ELSE 'belum_lunas'
    END,
    updated_at = now()
  WHERE id = v_payment.transaction_id AND user_id = auth.uid();
END;
$$;

-- ============================================================
-- Selesai! Fungsi sudah terintegrasi dengan item payment allocation.
-- ============================================================
