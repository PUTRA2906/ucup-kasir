-- ============================================================
-- Migrasi: Tabel transaction_item_payments
-- Project: Ucup Kasir
--
-- Tabel untuk tracking pembayaran per-item agar perhitungan
-- laba terealisasi akurat (tidak menggunakan formula proporsional).
--
-- Konsep:
-- - Setiap transaksi punya N items dan M payments
-- - Setiap payment dialokasikan ke item(s) tertentu
-- - Laba terealisasi = sum(item profit * allocated payment ratio)
--
-- Aman dijalankan ulang (idempotent).
-- Jalankan di Supabase Dashboard -> SQL Editor.
-- ============================================================

-- 1) Tabel alokasi pembayaran per item
CREATE TABLE IF NOT EXISTS transaction_item_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  transaction_id uuid NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES transaction_items(id) ON DELETE CASCADE,
  payment_id uuid NOT NULL REFERENCES transaction_payments(id) ON DELETE CASCADE,
  allocated_amount numeric(12,2) NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  
  -- Constraint: allocated_amount harus positif
  CONSTRAINT positive_allocated_amount CHECK (allocated_amount > 0)
);

-- Indexes untuk performa query
CREATE INDEX IF NOT EXISTS idx_item_payments_transaction 
  ON transaction_item_payments (transaction_id);
CREATE INDEX IF NOT EXISTS idx_item_payments_item 
  ON transaction_item_payments (item_id);
CREATE INDEX IF NOT EXISTS idx_item_payments_payment 
  ON transaction_item_payments (payment_id);
CREATE INDEX IF NOT EXISTS idx_item_payments_user_created 
  ON transaction_item_payments (user_id, created_at DESC);

-- 2) Enable Row Level Security
ALTER TABLE transaction_item_payments ENABLE ROW LEVEL SECURITY;

-- 3) Drop existing policies (idempotent)
DROP POLICY IF EXISTS "item_payments_select_own" ON transaction_item_payments;
DROP POLICY IF EXISTS "item_payments_insert_own" ON transaction_item_payments;
DROP POLICY IF EXISTS "item_payments_update_own" ON transaction_item_payments;
DROP POLICY IF EXISTS "item_payments_delete_own" ON transaction_item_payments;

-- 4) RLS Policies - hanya pemilik yang bisa akses
CREATE POLICY "item_payments_select_own" ON transaction_item_payments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "item_payments_insert_own" ON transaction_item_payments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "item_payments_update_own" ON transaction_item_payments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "item_payments_delete_own" ON transaction_item_payments
  FOR DELETE USING (auth.uid() = user_id);

-- 5) View untuk summary pembayaran per item
-- Menampilkan berapa yang sudah dibayar dan sisa untuk tiap item
DROP VIEW IF EXISTS transaction_items_payment_summary;
CREATE OR REPLACE VIEW transaction_items_payment_summary AS
SELECT 
  ti.id as item_id,
  ti.transaction_id,
  ti.user_id,
  ti.product_id,
  ti.product_name,
  ti.subtotal as item_total,
  COALESCE(SUM(tip.allocated_amount), 0) as paid_amount,
  ti.subtotal - COALESCE(SUM(tip.allocated_amount), 0) as remaining_amount,
  CASE 
    WHEN COALESCE(SUM(tip.allocated_amount), 0) >= ti.subtotal THEN 'lunas'
    WHEN COALESCE(SUM(tip.allocated_amount), 0) > 0 THEN 'sebagian'
    ELSE 'belum_bayar'
  END as payment_status
FROM transaction_items ti
LEFT JOIN transaction_item_payments tip ON tip.item_id = ti.id
GROUP BY ti.id, ti.transaction_id, ti.user_id, ti.product_id, ti.product_name, ti.subtotal;

-- Grant access to view
GRANT SELECT ON transaction_items_payment_summary TO authenticated;

-- 6) Function: Validate alokasi pembayaran
-- Memastikan total alokasi tidak melebihi:
-- a) Amount payment yang dialokasikan
-- b) Subtotal item yang dialokasikan
DROP FUNCTION IF EXISTS validate_item_payment_allocation;
CREATE OR REPLACE FUNCTION validate_item_payment_allocation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_payment_amount numeric;
  v_payment_allocated numeric;
  v_item_subtotal numeric;
  v_item_allocated numeric;
BEGIN
  -- Check: total alokasi ke payment_id tidak boleh > payment amount
  SELECT tp.amount INTO v_payment_amount
  FROM transaction_payments tp
  WHERE tp.id = NEW.payment_id AND tp.user_id = NEW.user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment tidak ditemukan';
  END IF;
  
  SELECT COALESCE(SUM(allocated_amount), 0) INTO v_payment_allocated
  FROM transaction_item_payments
  WHERE payment_id = NEW.payment_id 
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);
  
  IF (v_payment_allocated + NEW.allocated_amount) > v_payment_amount THEN
    RAISE EXCEPTION 'Total alokasi (%) melebihi jumlah payment (%) untuk payment_id=%', 
      v_payment_allocated + NEW.allocated_amount, v_payment_amount, NEW.payment_id;
  END IF;
  
  -- Check: total alokasi ke item_id tidak boleh > item subtotal
  SELECT ti.subtotal INTO v_item_subtotal
  FROM transaction_items ti
  WHERE ti.id = NEW.item_id AND ti.user_id = NEW.user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Item tidak ditemukan';
  END IF;
  
  SELECT COALESCE(SUM(allocated_amount), 0) INTO v_item_allocated
  FROM transaction_item_payments
  WHERE item_id = NEW.item_id 
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);
  
  IF (v_item_allocated + NEW.allocated_amount) > v_item_subtotal THEN
    RAISE EXCEPTION 'Total alokasi (%) melebihi subtotal item (%) untuk item_id=%', 
      v_item_allocated + NEW.allocated_amount, v_item_subtotal, NEW.item_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger untuk validasi saat insert/update
DROP TRIGGER IF EXISTS trigger_validate_item_payment ON transaction_item_payments;
CREATE TRIGGER trigger_validate_item_payment
  BEFORE INSERT OR UPDATE ON transaction_item_payments
  FOR EACH ROW
  EXECUTE FUNCTION validate_item_payment_allocation();

-- 7) Function: Auto-allocate payment to items (FIFO strategy)
-- Alokasi pembayaran ke item secara berurutan (item pertama dulu)
-- Digunakan oleh create_transaction dan add_transaction_payment
DROP FUNCTION IF EXISTS allocate_payment_to_items;
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
BEGIN
  -- Loop items dalam transaksi (FIFO: by created_at)
  FOR v_item IN
    SELECT 
      ti.id as item_id,
      ti.subtotal,
      COALESCE(SUM(tip.allocated_amount), 0) as already_paid
    FROM transaction_items ti
    LEFT JOIN transaction_item_payments tip ON tip.item_id = ti.id
    WHERE ti.transaction_id = p_transaction_id
      AND ti.user_id = auth.uid()
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
    
    -- Insert alokasi
    INSERT INTO transaction_item_payments (
      user_id, transaction_id, item_id, payment_id, allocated_amount
    ) VALUES (
      auth.uid(), p_transaction_id, v_item.item_id, p_payment_id, v_allocated
    );
    
    -- Kurangi sisa pembayaran
    v_remaining_payment := v_remaining_payment - v_allocated;
    
    -- Berhenti jika pembayaran habis
    EXIT WHEN v_remaining_payment <= 0;
  END LOOP;
  
  -- Validasi: pastikan semua payment teralokasi
  IF v_remaining_payment > 0.01 THEN
    RAISE WARNING 'Sisa pembayaran % tidak teralokasi untuk transaction %', 
      v_remaining_payment, p_transaction_id;
  END IF;
END;
$$;

-- 8) Function: Deallocate payment (untuk delete payment atau reallocate)
DROP FUNCTION IF EXISTS deallocate_payment;
CREATE OR REPLACE FUNCTION deallocate_payment(p_payment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM transaction_item_payments
  WHERE payment_id = p_payment_id AND user_id = auth.uid();
END;
$$;

-- 9) Function: Reallocate payment (hapus lalu alokasi ulang)
-- Berguna untuk UI manual reallocation
DROP FUNCTION IF EXISTS reallocate_payment;
CREATE OR REPLACE FUNCTION reallocate_payment(
  p_payment_id uuid,
  p_allocations jsonb  -- [{"item_id": "...", "amount": 100}, ...]
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment RECORD;
  v_alloc jsonb;
  v_total_allocated numeric := 0;
  v_transaction_id uuid;
BEGIN
  -- Get payment info
  SELECT tp.id, tp.amount, tp.transaction_id 
    INTO v_payment
  FROM transaction_payments tp
  WHERE tp.id = p_payment_id AND tp.user_id = auth.uid();
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment tidak ditemukan';
  END IF;
  
  v_transaction_id := v_payment.transaction_id;
  
  -- Validate total allocation
  FOR v_alloc IN SELECT * FROM jsonb_array_elements(p_allocations)
  LOOP
    v_total_allocated := v_total_allocated + (v_alloc->>'amount')::numeric;
  END LOOP;
  
  IF v_total_allocated > v_payment.amount THEN
    RAISE EXCEPTION 'Total alokasi (%) melebihi amount payment (%)', 
      v_total_allocated, v_payment.amount;
  END IF;
  
  -- Delete existing allocations
  PERFORM deallocate_payment(p_payment_id);
  
  -- Insert new allocations
  FOR v_alloc IN SELECT * FROM jsonb_array_elements(p_allocations)
  LOOP
    INSERT INTO transaction_item_payments (
      user_id, transaction_id, item_id, payment_id, allocated_amount
    ) VALUES (
      auth.uid(), 
      v_transaction_id, 
      (v_alloc->>'item_id')::uuid, 
      p_payment_id, 
      (v_alloc->>'amount')::numeric
    );
  END LOOP;
END;
$$;

-- 10) Backfill: Alokasi pembayaran untuk transaksi yang sudah ada
-- Ambil semua payment yang belum punya alokasi, lalu alokasi secara FIFO
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
    -- Alokasi payment ini ke items
    PERFORM allocate_payment_to_items(
      v_payment.transaction_id,
      v_payment.id,
      v_payment.amount
    );
  END LOOP;
END $$;

-- ============================================================
-- Selesai! Tabel transaction_item_payments siap digunakan.
-- ============================================================
