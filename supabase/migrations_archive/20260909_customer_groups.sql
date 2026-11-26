-- ============================================================
-- Grup Pelanggan untuk Matriks Harga
-- Fitur: satu grup berisi banyak pelanggan; harga khusus bisa
--        ditujukan ke grup (semua anggota otomatis dapat harga).
-- Prioritas saat resolve harga: per-pelanggan → per-grup → tier → normal.
-- ============================================================

-- Tabel: customer_groups (Grup pelanggan)
CREATE TABLE IF NOT EXISTS customer_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL,
  notes text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT customer_groups_user_fk FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_customer_groups_user ON customer_groups(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_customer_groups_user_name ON customer_groups(user_id, lower(name));

-- Tabel: customer_group_members (anggota grup — banyak pelanggan per grup)
CREATE TABLE IF NOT EXISTS customer_group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  group_id uuid NOT NULL REFERENCES customer_groups(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT customer_group_members_user_fk FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT customer_group_members_unique UNIQUE (group_id, customer_id)
);

CREATE INDEX IF NOT EXISTS idx_cgm_group ON customer_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_cgm_customer ON customer_group_members(customer_id);
CREATE INDEX IF NOT EXISTS idx_cgm_user ON customer_group_members(user_id);

-- customer_price_matrix: izinkan baris milik grup
-- customer_id jadi nullable, group_id baru & nullable; wajib tepat salah satu.
ALTER TABLE customer_price_matrix
  ALTER COLUMN customer_id DROP NOT NULL;

ALTER TABLE customer_price_matrix
  ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES customer_groups(id) ON DELETE CASCADE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'customer_price_matrix_target_check'
  ) THEN
    ALTER TABLE customer_price_matrix
      ADD CONSTRAINT customer_price_matrix_target_check
      CHECK (
        (customer_id IS NOT NULL AND group_id IS NULL)
        OR (customer_id IS NULL AND group_id IS NOT NULL)
      );
  END IF;
END $$;

-- Constraint unique lama hanya mencakup customer_id. Untuk harga grup
-- (customer_id NULL) perlu unique tersendiri agar tidak dobel per grup.
CREATE UNIQUE INDEX IF NOT EXISTS uq_cpm_group_product_start
  ON customer_price_matrix(user_id, group_id, product_id, start_date)
  WHERE group_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cpm_group ON customer_price_matrix(group_id) WHERE group_id IS NOT NULL;

-- RLS
ALTER TABLE customer_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users dapat melihat customer_groups mereka sendiri"
  ON customer_groups FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users dapat insert customer_groups mereka sendiri"
  ON customer_groups FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users dapat update customer_groups mereka sendiri"
  ON customer_groups FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users dapat delete customer_groups mereka sendiri"
  ON customer_groups FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users dapat melihat customer_group_members mereka sendiri"
  ON customer_group_members FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users dapat insert customer_group_members mereka sendiri"
  ON customer_group_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users dapat update customer_group_members mereka sendiri"
  ON customer_group_members FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users dapat delete customer_group_members mereka sendiri"
  ON customer_group_members FOR DELETE USING (auth.uid() = user_id);

-- Trigger updated_at untuk customer_groups
CREATE OR REPLACE FUNCTION update_customer_groups_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_customer_groups_updated_at ON customer_groups;
CREATE TRIGGER trigger_update_customer_groups_updated_at
  BEFORE UPDATE ON customer_groups
  FOR EACH ROW EXECUTE FUNCTION update_customer_groups_updated_at();

-- ============================================================
-- get_applicable_price (diperbarui): tambah sumber harga per-grup
-- Prioritas: per-pelanggan → per-grup → tier → normal.
-- ============================================================
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
  SELECT price_sell INTO v_default_price
  FROM products
  WHERE id = p_product_id AND user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Produk tidak ditemukan';
  END IF;

  -- 1. Harga khusus per pelanggan (prioritas tertinggi)
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

    -- 2. Harga khusus per grup (pelanggan jadi anggota grup mana pun)
    --    Bila beberapa grup cocok, ambil yang termurah.
    SELECT MIN(cpm.custom_price) INTO v_price
    FROM customer_price_matrix cpm
    JOIN customer_group_members cgm ON cgm.group_id = cpm.group_id
    WHERE cpm.user_id = auth.uid()
      AND cgm.customer_id = p_customer_id
      AND cpm.product_id = p_product_id
      AND cpm.is_active = true
      AND p_quantity >= cpm.min_quantity
      AND (cpm.start_date IS NULL OR cpm.start_date <= p_date)
      AND (cpm.end_date IS NULL OR cpm.end_date >= p_date);

    IF v_price IS NOT NULL THEN
      RETURN v_price;
    END IF;
  END IF;

  -- 3. Harga tier berdasarkan kuantitas
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

  -- 4. Harga default
  RETURN v_default_price;
END;
$$;
