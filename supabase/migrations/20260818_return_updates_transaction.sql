-- ============================================================
-- Migrasi: Retur memperbarui total invoice
-- Project: Ucup Kasir
--
-- Saat retur dibuat, total tagihan transaksi otomatis dikurangi
-- sebesar nilai barang yang diretur (subtotal & total dikurangi,
-- sisa cicilan & status pembayaran disesuaikan). Saat retur
-- dibatalkan (undo), total dikembalikan seperti semula.
-- Aman dijalankan ulang (idempotent).
-- Jalankan di Supabase Dashboard -> SQL Editor.
-- ============================================================

-- 1) Perbarui create_return: kurangi subtotal & total transaksi
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
  v_subtotal numeric;
  v_total_refund numeric := 0;
  v_bought integer;
  v_returned integer;
  v_status text;
BEGIN
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Tidak ada item yang diretur';
  END IF;

  SELECT status INTO v_status
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

  -- Simpan item retur + kembalikan stok
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'product_id')::uuid;
    v_qty := (v_item->>'quantity')::int;

    SELECT product_name, price INTO v_product_name, v_price
    FROM transaction_items
    WHERE transaction_id = p_transaction_id AND product_id = v_product_id;

    v_subtotal := v_price * v_qty;
    v_total_refund := v_total_refund + v_subtotal;

    INSERT INTO return_items (user_id, return_id, product_id, product_name, price, quantity, subtotal)
    VALUES (auth.uid(), v_return_id, v_product_id, v_product_name, v_price, v_qty, v_subtotal);

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

  RETURN v_return_id;
END;
$$;

-- 2) Perbarui delete_return: pulihkan subtotal & total transaksi (undo)
DROP FUNCTION IF EXISTS delete_return;
CREATE OR REPLACE FUNCTION delete_return(p_return_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item RECORD;
  v_return_total numeric;
  v_transaction_id uuid;
BEGIN
  SELECT r.total_refund, r.transaction_id INTO v_return_total, v_transaction_id
  FROM returns r
  WHERE r.id = p_return_id AND r.user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Retur tidak ditemukan';
  END IF;

  -- Kurangi kembali stok (sebelumnya sudah ditambah saat retur)
  FOR v_item IN
    SELECT ri.product_id, ri.quantity
    FROM return_items ri
    WHERE ri.return_id = p_return_id
      AND ri.user_id = auth.uid()
  LOOP
    IF v_item.product_id IS NOT NULL THEN
      UPDATE products
      SET stock = stock - v_item.quantity,
          updated_at = now()
      WHERE id = v_item.product_id AND user_id = auth.uid();
    END IF;
  END LOOP;

  -- Pulihkan total tagihan transaksi seperti sebelum retur
  UPDATE transactions
  SET subtotal = subtotal + v_return_total,
      total = total + v_return_total,
      remaining_amount = GREATEST(total + v_return_total - paid_amount, 0),
      payment_status = CASE WHEN paid_amount >= total + v_return_total
                            THEN 'lunas' ELSE 'belum_lunas' END,
      updated_at = now()
  WHERE id = v_transaction_id AND user_id = auth.uid();

  DELETE FROM returns
  WHERE id = p_return_id AND user_id = auth.uid();
END;
$$;

-- 3) Backfill: transaksi yang sudah punya retur sebelum migrasi ini
--    totalnya disesuaikan sekali jalan saat migrasi diterapkan.
UPDATE transactions t
SET subtotal = GREATEST(t.subtotal - r.total_refund, 0),
    total = GREATEST(t.total - r.total_refund, 0),
    remaining_amount = GREATEST(GREATEST(t.total - r.total_refund, 0) - t.paid_amount, 0),
    payment_status = CASE WHEN t.paid_amount >= GREATEST(t.total - r.total_refund, 0)
                          THEN 'lunas' ELSE 'belum_lunas' END,
    updated_at = now()
FROM (
  SELECT transaction_id, SUM(total_refund) AS total_refund
  FROM returns
  GROUP BY transaction_id
) r
WHERE r.transaction_id = t.id
  AND r.total_refund > 0;
