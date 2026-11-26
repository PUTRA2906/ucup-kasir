-- ============================================================
-- Migrasi: Tambah kolom price_buy ke return_items
-- Project: Ucup Kasir
--
-- Menambahkan kolom price_buy (harga beli/modal) ke tabel return_items
-- agar perhitungan HPP (Modal) retur akurat dan historis.
-- Aman dijalankan ulang (idempotent).
-- ============================================================

-- 1) Tambah kolom price_buy ke return_items (default 0)
ALTER TABLE return_items
ADD COLUMN IF NOT EXISTS price_buy numeric(12,2) NOT NULL DEFAULT 0;

-- 2) Backfill: isi price_buy untuk return_items yang sudah ada
--    dengan mengambil price_buy dari products saat ini
UPDATE return_items ri
SET price_buy = COALESCE(p.price_buy, 0)
FROM products p
WHERE ri.product_id = p.id
  AND ri.price_buy = 0;

-- 3) Update fungsi create_return: simpan price_buy saat retur dibuat
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

  RETURN v_return_id;
END;
$$;
