-- ============================================================
-- Matriks Harga Khusus (Tiered & Custom Pricing)
-- Fitur: Harga bertingkat berdasarkan kuantitas dan harga khusus per pelanggan
-- ============================================================

-- Tabel: price_tiers (Harga Bertingkat)
-- Untuk menyimpan aturan harga berdasarkan range kuantitas
CREATE TABLE IF NOT EXISTS price_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  min_quantity integer NOT NULL CHECK (min_quantity > 0),
  max_quantity integer CHECK (max_quantity IS NULL OR max_quantity >= min_quantity),
  tier_price numeric NOT NULL CHECK (tier_price >= 0),
  tier_name text, -- misal: "Eceran", "Grosir", "Partai Besar"
  is_active boolean DEFAULT true,
  start_date date,
  end_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT price_tiers_user_fk FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT price_tiers_date_check CHECK (end_date IS NULL OR end_date >= start_date),
  CONSTRAINT price_tiers_unique_range UNIQUE (user_id, product_id, min_quantity, start_date)
);

-- Tabel: customer_price_matrix (Harga Khusus per Pelanggan)
-- Untuk menyimpan harga khusus yang diberikan ke pelanggan tertentu
CREATE TABLE IF NOT EXISTS customer_price_matrix (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  custom_price numeric NOT NULL CHECK (custom_price >= 0),
  min_quantity integer DEFAULT 1 CHECK (min_quantity > 0),
  is_active boolean DEFAULT true,
  start_date date,
  end_date date,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT customer_price_matrix_user_fk FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT customer_price_matrix_date_check CHECK (end_date IS NULL OR end_date >= start_date),
  CONSTRAINT customer_price_matrix_unique UNIQUE (user_id, customer_id, product_id, start_date)
);

-- Index untuk performa
CREATE INDEX IF NOT EXISTS idx_price_tiers_product ON price_tiers(product_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_price_tiers_user_product ON price_tiers(user_id, product_id, is_active);
CREATE INDEX IF NOT EXISTS idx_customer_price_matrix_customer ON customer_price_matrix(customer_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_customer_price_matrix_product ON customer_price_matrix(product_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_customer_price_matrix_user ON customer_price_matrix(user_id, customer_id, product_id, is_active);

-- RLS Policies
ALTER TABLE price_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_price_matrix ENABLE ROW LEVEL SECURITY;

-- Price Tiers Policies
CREATE POLICY "Users dapat melihat price_tiers mereka sendiri"
  ON price_tiers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users dapat insert price_tiers mereka sendiri"
  ON price_tiers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users dapat update price_tiers mereka sendiri"
  ON price_tiers FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users dapat delete price_tiers mereka sendiri"
  ON price_tiers FOR DELETE
  USING (auth.uid() = user_id);

-- Customer Price Matrix Policies
CREATE POLICY "Users dapat melihat customer_price_matrix mereka sendiri"
  ON customer_price_matrix FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users dapat insert customer_price_matrix mereka sendiri"
  ON customer_price_matrix FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users dapat update customer_price_matrix mereka sendiri"
  ON customer_price_matrix FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users dapat delete customer_price_matrix mereka sendiri"
  ON customer_price_matrix FOR DELETE
  USING (auth.uid() = user_id);

-- Function: get_applicable_price
-- Mengembalikan harga yang berlaku untuk produk berdasarkan customer, quantity, dan tanggal
CREATE OR REPLACE FUNCTION get_applicable_price(
  p_product_id uuid,
  p_customer_id uuid DEFAULT NULL,
  p_quantity integer DEFAULT 1,
  p_date date DEFAULT CURRENT_DATE
) RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_price numeric;
  v_default_price numeric;
BEGIN
  -- Ambil harga default produk
  SELECT price_sell INTO v_default_price
  FROM products
  WHERE id = p_product_id AND user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Produk tidak ditemukan';
  END IF;

  -- 1. Cek harga khusus pelanggan (prioritas tertinggi)
  IF p_customer_id IS NOT NULL THEN
    SELECT custom_price INTO v_price
    FROM customer_price_matrix
    WHERE user_id = auth.uid()
      AND customer_id = p_customer_id
      AND product_id = p_product_id
      AND is_active = true
      AND p_quantity >= min_quantity
      AND (start_date IS NULL OR start_date <= p_date)
      AND (end_date IS NULL OR end_date >= p_date)
    ORDER BY min_quantity DESC
    LIMIT 1;

    IF FOUND THEN
      RETURN v_price;
    END IF;
  END IF;

  -- 2. Cek harga tier berdasarkan kuantitas
  SELECT tier_price INTO v_price
  FROM price_tiers
  WHERE user_id = auth.uid()
    AND product_id = p_product_id
    AND is_active = true
    AND p_quantity >= min_quantity
    AND (max_quantity IS NULL OR p_quantity <= max_quantity)
    AND (start_date IS NULL OR start_date <= p_date)
    AND (end_date IS NULL OR end_date >= p_date)
  ORDER BY min_quantity DESC
  LIMIT 1;

  IF FOUND THEN
    RETURN v_price;
  END IF;

  -- 3. Return harga default
  RETURN v_default_price;
END;
$$;

-- Trigger: update_price_tiers_updated_at
CREATE OR REPLACE FUNCTION update_price_tiers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_price_tiers_updated_at
  BEFORE UPDATE ON price_tiers
  FOR EACH ROW
  EXECUTE FUNCTION update_price_tiers_updated_at();

-- Trigger: update_customer_price_matrix_updated_at
CREATE OR REPLACE FUNCTION update_customer_price_matrix_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_customer_price_matrix_updated_at
  BEFORE UPDATE ON customer_price_matrix
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_price_matrix_updated_at();

-- Function helper untuk validasi overlap range tier
CREATE OR REPLACE FUNCTION validate_price_tier_range()
RETURNS TRIGGER AS $$
DECLARE
  v_overlap_count integer;
BEGIN
  -- Cek apakah ada overlap range untuk produk yang sama di periode yang sama
  SELECT COUNT(*) INTO v_overlap_count
  FROM price_tiers
  WHERE user_id = NEW.user_id
    AND product_id = NEW.product_id
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    AND is_active = true
    AND (
      (NEW.min_quantity BETWEEN min_quantity AND COALESCE(max_quantity, 999999))
      OR (COALESCE(NEW.max_quantity, 999999) BETWEEN min_quantity AND COALESCE(max_quantity, 999999))
      OR (min_quantity BETWEEN NEW.min_quantity AND COALESCE(NEW.max_quantity, 999999))
    )
    AND (
      (NEW.start_date IS NULL AND start_date IS NULL)
      OR (NEW.start_date IS NOT NULL AND start_date IS NOT NULL AND
          (NEW.start_date, COALESCE(NEW.end_date, '9999-12-31'::date))
          OVERLAPS
          (start_date, COALESCE(end_date, '9999-12-31'::date)))
    );

  IF v_overlap_count > 0 THEN
    RAISE EXCEPTION 'Range kuantitas atau periode bertumpuk dengan tier harga lain untuk produk ini';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_price_tier_range
  BEFORE INSERT OR UPDATE ON price_tiers
  FOR EACH ROW
  EXECUTE FUNCTION validate_price_tier_range();
