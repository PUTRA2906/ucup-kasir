-- ============================================================
-- Migrasi: Modul Pengiriman / Shipping — Surat Jalan
-- Project: Ucup Kasir
--
-- 1. Vehicles (Master Kendaraan / Armada)
-- 2. Delivery Orders (Surat Jalan header)
-- 3. Delivery Items (Barang yang dikirim)
-- 4. Delivery Tracking (Timeline status)
-- 5. RLS untuk semua tabel
-- 6. Fungsi: generate_delivery_number (auto-nomor surat jalan)
-- 7. Trigger: auto-set do_number saat insert
-- ============================================================

-- ============================================================
-- 1. VEHICLES (Master Kendaraan)
-- ============================================================
CREATE TABLE IF NOT EXISTS vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  plate_number TEXT NOT NULL,
  vehicle_type TEXT NOT NULL,
  brand TEXT,
  capacity_kg numeric(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'tersedia' CHECK (status IN ('tersedia', 'dipakai', 'service')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vehicles_user_plate ON vehicles(user_id, plate_number);

-- ============================================================
-- 2. DELIVERY ORDERS (Surat Jalan header)
-- ============================================================
CREATE TABLE IF NOT EXISTS delivery_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  do_number TEXT NOT NULL,
  do_date date NOT NULL,
  transaction_id uuid REFERENCES transactions(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  customer_name TEXT,
  customer_address TEXT,
  vehicle_id uuid REFERENCES vehicles(id) ON DELETE SET NULL,
  driver_id uuid REFERENCES employees(id) ON DELETE SET NULL,
  driver_name TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'disiapkan', 'dikirim', 'selesai', 'batal')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, do_number)
);

CREATE INDEX IF NOT EXISTS idx_delivery_orders_user_date ON delivery_orders(user_id, do_date DESC);
CREATE INDEX IF NOT EXISTS idx_delivery_orders_transaction ON delivery_orders(transaction_id);
CREATE INDEX IF NOT EXISTS idx_delivery_orders_status ON delivery_orders(status);

-- ============================================================
-- 3. DELIVERY ITEMS (Barang yang dikirim)
-- ============================================================
CREATE TABLE IF NOT EXISTS delivery_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  delivery_order_id uuid NOT NULL REFERENCES delivery_orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  quantity numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_delivery_items_do ON delivery_items(delivery_order_id);

-- ============================================================
-- 4. DELIVERY TRACKING (Timeline status pengiriman)
-- ============================================================
CREATE TABLE IF NOT EXISTS delivery_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  delivery_order_id uuid NOT NULL REFERENCES delivery_orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'disiapkan', 'dikirim', 'selesai', 'batal')),
  note TEXT,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_delivery_tracking_do ON delivery_tracking(delivery_order_id, created_at DESC);

-- ============================================================
-- 5. ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_tracking ENABLE ROW LEVEL SECURITY;

-- Vehicles
DROP POLICY IF EXISTS "vehicles_select_own" ON vehicles;
DROP POLICY IF EXISTS "vehicles_insert_own" ON vehicles;
DROP POLICY IF EXISTS "vehicles_update_own" ON vehicles;
DROP POLICY IF EXISTS "vehicles_delete_own" ON vehicles;
CREATE POLICY "vehicles_select_own" ON vehicles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "vehicles_insert_own" ON vehicles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "vehicles_update_own" ON vehicles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "vehicles_delete_own" ON vehicles FOR DELETE USING (auth.uid() = user_id);

-- Delivery Orders
DROP POLICY IF EXISTS "delivery_orders_select_own" ON delivery_orders;
DROP POLICY IF EXISTS "delivery_orders_insert_own" ON delivery_orders;
DROP POLICY IF EXISTS "delivery_orders_update_own" ON delivery_orders;
DROP POLICY IF EXISTS "delivery_orders_delete_own" ON delivery_orders;
CREATE POLICY "delivery_orders_select_own" ON delivery_orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "delivery_orders_insert_own" ON delivery_orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delivery_orders_update_own" ON delivery_orders FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "delivery_orders_delete_own" ON delivery_orders FOR DELETE USING (auth.uid() = user_id);

-- Delivery Items
DROP POLICY IF EXISTS "delivery_items_select_own" ON delivery_items;
DROP POLICY IF EXISTS "delivery_items_insert_own" ON delivery_items;
DROP POLICY IF EXISTS "delivery_items_update_own" ON delivery_items;
DROP POLICY IF EXISTS "delivery_items_delete_own" ON delivery_items;
CREATE POLICY "delivery_items_select_own" ON delivery_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "delivery_items_insert_own" ON delivery_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delivery_items_update_own" ON delivery_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "delivery_items_delete_own" ON delivery_items FOR DELETE USING (auth.uid() = user_id);

-- Delivery Tracking
DROP POLICY IF EXISTS "delivery_tracking_select_own" ON delivery_tracking;
DROP POLICY IF EXISTS "delivery_tracking_insert_own" ON delivery_tracking;
DROP POLICY IF EXISTS "delivery_tracking_delete_own" ON delivery_tracking;
CREATE POLICY "delivery_tracking_select_own" ON delivery_tracking FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "delivery_tracking_insert_own" ON delivery_tracking FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delivery_tracking_delete_own" ON delivery_tracking FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- 6. FUNGSI: GENERATE NOMOR SURAT JALAN
-- ============================================================
DROP FUNCTION IF EXISTS generate_delivery_number;
CREATE OR REPLACE FUNCTION generate_delivery_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year TEXT;
  v_count INTEGER;
  v_number TEXT;
BEGIN
  v_year := to_char(now(), 'YYYY');
  SELECT COUNT(*) INTO v_count
  FROM delivery_orders
  WHERE user_id = auth.uid();

  v_number := 'SJ-' || v_year || '-' || LPAD(COALESCE(v_count + 1, 1)::TEXT, 4, '0');
  RETURN v_number;
END;
$$;

-- ============================================================
-- 7. TRIGGER: Auto-set do_number saat insert
-- ============================================================
DROP FUNCTION IF EXISTS trg_delivery_orders_set_number;
CREATE OR REPLACE FUNCTION trg_delivery_orders_set_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.do_number IS NULL OR NEW.do_number = '' THEN
    NEW.do_number := generate_delivery_number();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_delivery_orders_set_number ON delivery_orders;
CREATE TRIGGER trg_delivery_orders_set_number
  BEFORE INSERT ON delivery_orders
  FOR EACH ROW
  EXECUTE FUNCTION trg_delivery_orders_set_number();
