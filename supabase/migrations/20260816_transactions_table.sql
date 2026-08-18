-- ============================================================
-- Migrasi: Tabel transactions + transaction_items (data per-user)
-- Project: Ucup Kasir
--
-- Membuat 2 tabel transaksi dengan RLS sehingga setiap user
-- hanya melihat/mengelola transaksi miliknya sendiri.
-- Termasuk fungsi create_transaction (atomik: simpan transaksi,
-- rincian item, dan kurangi stok produk sekaligus).
-- Aman dijalankan ulang (idempotent).
-- Jalankan di Supabase Dashboard -> SQL Editor.
-- ============================================================

-- 1) Buat tabel transaksi (jika belum ada)
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  transaction_number text NOT NULL DEFAULT 'TRX-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(md5(random()::text), 1, 6)),
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  customer_name text,
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  discount numeric(12,2) NOT NULL DEFAULT 0,
  total numeric(12,2) NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'tunai',
  paid_amount numeric(12,2) NOT NULL DEFAULT 0,
  change_amount numeric(12,2) NOT NULL DEFAULT 0,
  remaining_amount numeric(12,2) NOT NULL DEFAULT 0,
  payment_status text NOT NULL DEFAULT 'belum_lunas',
  status text NOT NULL DEFAULT 'selesai',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2) Buat tabel rincian transaksi (jika belum ada)
CREATE TABLE IF NOT EXISTS transaction_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  transaction_id uuid NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  price numeric(12,2) NOT NULL DEFAULT 0,
  quantity integer NOT NULL DEFAULT 1,
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_created ON transactions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transaction_items_transaction ON transaction_items (transaction_id);

-- 2b) Tambah kolom pembayaran jika belum ada (untuk tabel yang sudah dibuat sebelumnya)
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS remaining_amount numeric(12,2) NOT NULL DEFAULT 0;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'belum_lunas';

-- Isi ulang data lama agar konsisten
UPDATE transactions
SET remaining_amount = GREATEST(total - paid_amount, 0),
    payment_status = CASE WHEN paid_amount >= total THEN 'lunas' ELSE 'belum_lunas' END
WHERE remaining_amount = 0 OR payment_status IS NULL;

-- 3) Aktifkan Row Level Security
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_items ENABLE ROW LEVEL SECURITY;

-- 4) Hapus policies lama (hindari duplikat/konflik)
DROP POLICY IF EXISTS "transactions_select_own" ON transactions;
DROP POLICY IF EXISTS "transactions_insert_own" ON transactions;
DROP POLICY IF EXISTS "transactions_update_own" ON transactions;
DROP POLICY IF EXISTS "transactions_delete_own" ON transactions;
DROP POLICY IF EXISTS "transaction_items_select_own" ON transaction_items;
DROP POLICY IF EXISTS "transaction_items_insert_own" ON transaction_items;
DROP POLICY IF EXISTS "transaction_items_update_own" ON transaction_items;
DROP POLICY IF EXISTS "transaction_items_delete_own" ON transaction_items;

-- 5) Policies - transactions (hanya pemilik yang bisa akses)
CREATE POLICY "transactions_select_own" ON transactions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "transactions_insert_own" ON transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "transactions_update_own" ON transactions
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "transactions_delete_own" ON transactions
  FOR DELETE USING (auth.uid() = user_id);

-- 6) Policies - transaction_items (hanya pemilik yang bisa akses)
CREATE POLICY "transaction_items_select_own" ON transaction_items
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "transaction_items_insert_own" ON transaction_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "transaction_items_update_own" ON transaction_items
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "transaction_items_delete_own" ON transaction_items
  FOR DELETE USING (auth.uid() = user_id);

-- 7) Fungsi: buat transaksi secara atomik
--    - Validasi stok produk
--    - Hitung subtotal & total
--    - Simpan transaksi + rincian item
--    - Kurangi stok produk
--    Jalankan lewat supabase.rpc('create_transaction', {...})
DROP FUNCTION IF EXISTS create_transaction;
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
      COALESCE(p_payment_method, 'tunai'), NULL
    );
  END IF;

  RETURN v_transaction_id;
END;
$$;

-- 8) Tabel riwayat pembayaran cicilan (jika belum ada)
CREATE TABLE IF NOT EXISTS transaction_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  transaction_id uuid NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'tunai',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transaction_payments_transaction ON transaction_payments (transaction_id, created_at DESC);

ALTER TABLE transaction_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "transaction_payments_select_own" ON transaction_payments;
DROP POLICY IF EXISTS "transaction_payments_insert_own" ON transaction_payments;
DROP POLICY IF EXISTS "transaction_payments_update_own" ON transaction_payments;
DROP POLICY IF EXISTS "transaction_payments_delete_own" ON transaction_payments;

CREATE POLICY "transaction_payments_select_own" ON transaction_payments
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "transaction_payments_insert_own" ON transaction_payments
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "transaction_payments_update_own" ON transaction_payments
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "transaction_payments_delete_own" ON transaction_payments
  FOR DELETE USING (auth.uid() = user_id);

-- 9) Fungsi: tambah pembayaran cicilan (atomik: catat pembayaran +
--    update paid_amount, remaining_amount, payment_status pada transaksi)
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

-- 10) Fungsi: hapus transaksi (kembalikan stok produk)
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

-- 11) Backfill: catat pembayaran awal untuk transaksi lama
--    Transaksi yang dibuat SEBELUM fungsi create_transaction mencatat
--    pembayaran awal ke riwayat tidak punya record di transaction_payments,
--    padahal sudah membayar (paid_amount > 0).
--    Query ini aman dijalankan ulang (idempotent) — hanya mengisi transaksi
--    yang belum punya riwayat pembayaran sama sekali.
INSERT INTO transaction_payments (user_id, transaction_id, amount, payment_method, notes)
SELECT t.user_id, t.id, t.paid_amount, t.payment_method, NULL
FROM transactions t
WHERE t.paid_amount > 0
  AND NOT EXISTS (
    SELECT 1 FROM transaction_payments tp WHERE tp.transaction_id = t.id
  );
