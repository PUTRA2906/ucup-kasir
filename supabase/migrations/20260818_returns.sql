-- ============================================================
-- Migrasi: Fitur Retur Barang
-- Project: Ucup Kasir
--
-- Membuat tabel returns + return_items (data per-user, RLS),
-- fungsi create_return (atomik: validasi jumlah, catat retur,
-- kembalikan stok produk) dan delete_return (undo retur).
-- Aman dijalankan ulang (idempotent).
-- Jalankan di Supabase Dashboard -> SQL Editor.
-- ============================================================

-- 1) Tabel retur (header)
CREATE TABLE IF NOT EXISTS returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  transaction_id uuid NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  return_number text NOT NULL DEFAULT 'RTR-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(md5(random()::text), 1, 6)),
  total_refund numeric(12,2) NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2) Tabel rincian retur
CREATE TABLE IF NOT EXISTS return_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  return_id uuid NOT NULL REFERENCES returns(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  price numeric(12,2) NOT NULL DEFAULT 0,
  quantity integer NOT NULL DEFAULT 1,
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_returns_transaction ON returns (transaction_id);
CREATE INDEX IF NOT EXISTS idx_return_items_return ON return_items (return_id);

-- 3) Aktifkan Row Level Security
ALTER TABLE returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE return_items ENABLE ROW LEVEL SECURITY;

-- 4) Hapus policies lama (hindari duplikat/konflik)
DROP POLICY IF EXISTS "returns_select_own" ON returns;
DROP POLICY IF EXISTS "returns_insert_own" ON returns;
DROP POLICY IF EXISTS "returns_update_own" ON returns;
DROP POLICY IF EXISTS "returns_delete_own" ON returns;
DROP POLICY IF EXISTS "return_items_select_own" ON return_items;
DROP POLICY IF EXISTS "return_items_insert_own" ON return_items;
DROP POLICY IF EXISTS "return_items_update_own" ON return_items;
DROP POLICY IF EXISTS "return_items_delete_own" ON return_items;

-- 5) Policies - returns (hanya pemilik)
CREATE POLICY "returns_select_own" ON returns
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "returns_insert_own" ON returns
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "returns_update_own" ON returns
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "returns_delete_own" ON returns
  FOR DELETE USING (auth.uid() = user_id);

-- 6) Policies - return_items (hanya pemilik)
CREATE POLICY "return_items_select_own" ON return_items
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "return_items_insert_own" ON return_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "return_items_update_own" ON return_items
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "return_items_delete_own" ON return_items
  FOR DELETE USING (auth.uid() = user_id);

-- 7) Fungsi: buat retur secara atomik
--    - Validasi transaksi milik user & status selesai
--    - Validasi jumlah retur tidak melebihi sisa yang bisa diretur
--    - Catat retur + rincian item
--    - Kembalikan stok produk
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

  RETURN v_return_id;
END;
$$;

-- 8) Fungsi: batalkan retur (undo)
--    - Kurangi kembali stok produk
--    - Hapus record retur (items ikut terhapus via cascade)
DROP FUNCTION IF EXISTS delete_return;
CREATE OR REPLACE FUNCTION delete_return(p_return_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item RECORD;
BEGIN
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

  DELETE FROM returns
  WHERE id = p_return_id AND user_id = auth.uid();
END;
$$;
