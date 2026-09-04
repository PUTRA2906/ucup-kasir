-- ============================================================
-- Migrasi: Modul Pembelian Barang — Purchasing / Procurement
-- Project: Ucup Kasir
--
-- 1. Suppliers (Master Pemasok)
-- 2. Purchase Orders (PO)
-- 3. PO Items
-- 4. Goods Receipts (GRN)
-- 5. GRN Items
-- 6. Purchase Invoices (PI)
-- 7. PI Items
-- 8. PI Payments
-- 9. Purchase Returns (Retur Pembelian)
-- 10. Purchase Return Items
-- 11. RLS untuk semua tabel
-- 12. Fungsi: generate nomor dokumen
-- 13. Fungsi: create_purchase_order
-- 14. Fungsi: create_goods_receipt (auto-stok + auto-jurnal)
-- 15. Fungsi: create_purchase_invoice (auto-jurnal hutang)
-- 16. Fungsi: add_pi_payment (auto-jurnal bayar hutang)
-- 17. Fungsi: create_purchase_return (auto-jurnal reversal)
-- ============================================================

-- ============================================================
-- 1. SUPPLIERS (Master Pemasok)
-- ============================================================
CREATE TABLE IF NOT EXISTS suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  supplier_type TEXT NOT NULL DEFAULT 'langsung' CHECK (supplier_type IN ('langsung', 'distributor', 'grosir', 'importir')),
  payment_term TEXT NOT NULL DEFAULT 'tunai' CHECK (payment_term IN ('tunai', '7', '14', '30')),
  credit_limit numeric(14,2) NOT NULL DEFAULT 0,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_suppliers_user_name ON suppliers(user_id, name);

-- ============================================================
-- 2. PURCHASE ORDERS (header pesanan pembelian)
-- ============================================================
CREATE TABLE IF NOT EXISTS purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  po_number TEXT NOT NULL,
  supplier_id uuid,
  supplier_name TEXT,
  po_date timestamptz NOT NULL DEFAULT now(),
  expected_date timestamptz,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'confirmed', 'partial', 'completed', 'cancelled')),
  subtotal numeric(14,2) NOT NULL DEFAULT 0,
  discount numeric(14,2) NOT NULL DEFAULT 0,
  tax numeric(14,2) NOT NULL DEFAULT 0,
  shipping_cost numeric(14,2) NOT NULL DEFAULT 0,
  total numeric(14,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_po_user_date ON purchase_orders(user_id, po_date DESC);
CREATE INDEX IF NOT EXISTS idx_po_supplier ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_po_status ON purchase_orders(status);

-- ============================================================
-- 3. PO ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS po_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  po_id uuid NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  quantity numeric(14,2) NOT NULL DEFAULT 0,
  price numeric(14,2) NOT NULL DEFAULT 0,
  discount numeric(14,2) NOT NULL DEFAULT 0,
  subtotal numeric(14,2) NOT NULL DEFAULT 0,
  received_quantity numeric(14,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_po_items_po ON po_items(po_id);

-- ============================================================
-- 4. GOODS RECEIPTS (GRN)
-- ============================================================
CREATE TABLE IF NOT EXISTS goods_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  grn_number TEXT NOT NULL,
  po_id uuid REFERENCES purchase_orders(id) ON DELETE SET NULL,
  supplier_id uuid REFERENCES suppliers(id) ON DELETE SET NULL,
  supplier_name TEXT,
  receipt_date timestamptz NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'completed', 'cancelled')),
  total numeric(14,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_grn_user_date ON goods_receipts(user_id, receipt_date DESC);
CREATE INDEX IF NOT EXISTS idx_grn_po ON goods_receipts(po_id);

-- ============================================================
-- 5. GRN ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS grn_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  grn_id uuid NOT NULL REFERENCES goods_receipts(id) ON DELETE CASCADE,
  po_item_id uuid REFERENCES po_items(id) ON DELETE SET NULL,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  quantity_received numeric(14,2) NOT NULL DEFAULT 0,
  quantity_rejected numeric(14,2) NOT NULL DEFAULT 0,
  price numeric(14,2) NOT NULL DEFAULT 0,
  subtotal numeric(14,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_grn_items_grn ON grn_items(grn_id);

-- ============================================================
-- 6. PURCHASE INVOICES (PI)
-- ============================================================
CREATE TABLE IF NOT EXISTS purchase_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  pi_number TEXT NOT NULL,
  grn_id uuid REFERENCES goods_receipts(id) ON DELETE SET NULL,
  po_id uuid REFERENCES purchase_orders(id) ON DELETE SET NULL,
  supplier_id uuid REFERENCES suppliers(id) ON DELETE SET NULL,
  supplier_name TEXT,
  invoice_date timestamptz NOT NULL DEFAULT now(),
  due_date timestamptz,
  subtotal numeric(14,2) NOT NULL DEFAULT 0,
  discount numeric(14,2) NOT NULL DEFAULT 0,
  tax numeric(14,2) NOT NULL DEFAULT 0,
  shipping_cost numeric(14,2) NOT NULL DEFAULT 0,
  total numeric(14,2) NOT NULL DEFAULT 0,
  paid_amount numeric(14,2) NOT NULL DEFAULT 0,
  remaining_amount numeric(14,2) NOT NULL DEFAULT 0,
  payment_status TEXT NOT NULL DEFAULT 'belum_lunas' CHECK (payment_status IN ('belum_lunas', 'sebagian', 'lunas')),
  notes TEXT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pi_user_date ON purchase_invoices(user_id, invoice_date DESC);
CREATE INDEX IF NOT EXISTS idx_pi_supplier ON purchase_invoices(supplier_id);
CREATE INDEX IF NOT EXISTS idx_pi_payment_status ON purchase_invoices(payment_status);

-- ============================================================
-- 7. PI ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS pi_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  pi_id uuid NOT NULL REFERENCES purchase_invoices(id) ON DELETE CASCADE,
  grn_item_id uuid REFERENCES grn_items(id) ON DELETE SET NULL,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  quantity numeric(14,2) NOT NULL DEFAULT 0,
  price numeric(14,2) NOT NULL DEFAULT 0,
  subtotal numeric(14,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pi_items_pi ON pi_items(pi_id);

-- ============================================================
-- 8. PI PAYMENTS (pembayaran ke supplier)
-- ============================================================
CREATE TABLE IF NOT EXISTS pi_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  pi_id uuid NOT NULL REFERENCES purchase_invoices(id) ON DELETE CASCADE,
  amount numeric(14,2) NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'tunai',
  notes TEXT,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pi_payments_pi ON pi_payments(pi_id, created_at DESC);

-- ============================================================
-- 9. PURCHASE RETURNS
-- ============================================================
CREATE TABLE IF NOT EXISTS purchase_returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  pr_number TEXT NOT NULL,
  grn_id uuid REFERENCES goods_receipts(id) ON DELETE SET NULL,
  pi_id uuid REFERENCES purchase_invoices(id) ON DELETE SET NULL,
  supplier_id uuid REFERENCES suppliers(id) ON DELETE SET NULL,
  supplier_name TEXT,
  return_date timestamptz NOT NULL DEFAULT now(),
  total_refund numeric(14,2) NOT NULL DEFAULT 0,
  reason TEXT NOT NULL DEFAULT 'cacat' CHECK (reason IN ('cacat', 'salah_produk', 'kadaluarsa', 'rusak_kirim', 'lainnya')),
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('draft', 'completed', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pr_user_date ON purchase_returns(user_id, return_date DESC);

-- ============================================================
-- 10. PURCHASE RETURN ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS purchase_return_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  pr_id uuid NOT NULL REFERENCES purchase_returns(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  quantity numeric(14,2) NOT NULL DEFAULT 0,
  price numeric(14,2) NOT NULL DEFAULT 0,
  price_buy numeric(14,2) NOT NULL DEFAULT 0,
  subtotal numeric(14,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pr_items_pr ON purchase_return_items(pr_id);

-- ============================================================
-- 11. ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE po_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE goods_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE grn_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE pi_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE pi_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_return_items ENABLE ROW LEVEL SECURITY;

-- Suppliers
DROP POLICY IF EXISTS "suppliers_select_own" ON suppliers;
DROP POLICY IF EXISTS "suppliers_insert_own" ON suppliers;
DROP POLICY IF EXISTS "suppliers_update_own" ON suppliers;
DROP POLICY IF EXISTS "suppliers_delete_own" ON suppliers;

CREATE POLICY "suppliers_select_own" ON suppliers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "suppliers_insert_own" ON suppliers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "suppliers_update_own" ON suppliers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "suppliers_delete_own" ON suppliers FOR DELETE USING (auth.uid() = user_id);

-- Purchase Orders
DROP POLICY IF EXISTS "po_select_own" ON purchase_orders;
DROP POLICY IF EXISTS "po_insert_own" ON purchase_orders;
DROP POLICY IF EXISTS "po_update_own" ON purchase_orders;
DROP POLICY IF EXISTS "po_delete_own" ON purchase_orders;

CREATE POLICY "po_select_own" ON purchase_orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "po_insert_own" ON purchase_orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "po_update_own" ON purchase_orders FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "po_delete_own" ON purchase_orders FOR DELETE USING (auth.uid() = user_id);

-- PO Items
DROP POLICY IF EXISTS "po_items_select_own" ON po_items;
DROP POLICY IF EXISTS "po_items_insert_own" ON po_items;
DROP POLICY IF EXISTS "po_items_update_own" ON po_items;
DROP POLICY IF EXISTS "po_items_delete_own" ON po_items;

CREATE POLICY "po_items_select_own" ON po_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "po_items_insert_own" ON po_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "po_items_update_own" ON po_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "po_items_delete_own" ON po_items FOR DELETE USING (auth.uid() = user_id);

-- Goods Receipts
DROP POLICY IF EXISTS "grn_select_own" ON goods_receipts;
DROP POLICY IF EXISTS "grn_insert_own" ON goods_receipts;
DROP POLICY IF EXISTS "grn_update_own" ON goods_receipts;
DROP POLICY IF EXISTS "grn_delete_own" ON goods_receipts;

CREATE POLICY "grn_select_own" ON goods_receipts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "grn_insert_own" ON goods_receipts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "grn_update_own" ON goods_receipts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "grn_delete_own" ON goods_receipts FOR DELETE USING (auth.uid() = user_id);

-- GRN Items
DROP POLICY IF EXISTS "grn_items_select_own" ON grn_items;
DROP POLICY IF EXISTS "grn_items_insert_own" ON grn_items;
DROP POLICY IF EXISTS "grn_items_update_own" ON grn_items;
DROP POLICY IF EXISTS "grn_items_delete_own" ON grn_items;

CREATE POLICY "grn_items_select_own" ON grn_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "grn_items_insert_own" ON grn_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "grn_items_update_own" ON grn_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "grn_items_delete_own" ON grn_items FOR DELETE USING (auth.uid() = user_id);

-- Purchase Invoices
DROP POLICY IF EXISTS "pi_select_own" ON purchase_invoices;
DROP POLICY IF EXISTS "pi_insert_own" ON purchase_invoices;
DROP POLICY IF EXISTS "pi_update_own" ON purchase_invoices;
DROP POLICY IF EXISTS "pi_delete_own" ON purchase_invoices;

CREATE POLICY "pi_select_own" ON purchase_invoices FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "pi_insert_own" ON purchase_invoices FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "pi_update_own" ON purchase_invoices FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "pi_delete_own" ON purchase_invoices FOR DELETE USING (auth.uid() = user_id);

-- PI Items
DROP POLICY IF EXISTS "pi_items_select_own" ON pi_items;
DROP POLICY IF EXISTS "pi_items_insert_own" ON pi_items;
DROP POLICY IF EXISTS "pi_items_update_own" ON pi_items;
DROP POLICY IF EXISTS "pi_items_delete_own" ON pi_items;

CREATE POLICY "pi_items_select_own" ON pi_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "pi_items_insert_own" ON pi_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "pi_items_update_own" ON pi_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "pi_items_delete_own" ON pi_items FOR DELETE USING (auth.uid() = user_id);

-- PI Payments
DROP POLICY IF EXISTS "pi_payments_select_own" ON pi_payments;
DROP POLICY IF EXISTS "pi_payments_insert_own" ON pi_payments;
DROP POLICY IF EXISTS "pi_payments_update_own" ON pi_payments;
DROP POLICY IF EXISTS "pi_payments_delete_own" ON pi_payments;

CREATE POLICY "pi_payments_select_own" ON pi_payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "pi_payments_insert_own" ON pi_payments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "pi_payments_update_own" ON pi_payments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "pi_payments_delete_own" ON pi_payments FOR DELETE USING (auth.uid() = user_id);

-- Purchase Returns
DROP POLICY IF EXISTS "pr_select_own" ON purchase_returns;
DROP POLICY IF EXISTS "pr_insert_own" ON purchase_returns;
DROP POLICY IF EXISTS "pr_update_own" ON purchase_returns;
DROP POLICY IF EXISTS "pr_delete_own" ON purchase_returns;

CREATE POLICY "pr_select_own" ON purchase_returns FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "pr_insert_own" ON purchase_returns FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "pr_update_own" ON purchase_returns FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "pr_delete_own" ON purchase_returns FOR DELETE USING (auth.uid() = user_id);

-- Purchase Return Items
DROP POLICY IF EXISTS "pr_items_select_own" ON purchase_return_items;
DROP POLICY IF EXISTS "pr_items_insert_own" ON purchase_return_items;
DROP POLICY IF EXISTS "pr_items_update_own" ON purchase_return_items;
DROP POLICY IF EXISTS "pr_items_delete_own" ON purchase_return_items;

CREATE POLICY "pr_items_select_own" ON purchase_return_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "pr_items_insert_own" ON purchase_return_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "pr_items_update_own" ON purchase_return_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "pr_items_delete_own" ON purchase_return_items FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- 12. UPDATE: reference_type journal_entries
-- ============================================================
ALTER TABLE journal_entries DROP CONSTRAINT IF EXISTS journal_entries_reference_type_check;

-- ============================================================
-- 13. FUNGSI: CREATE PURCHASE ORDER
-- ============================================================
DROP FUNCTION IF EXISTS create_purchase_order;
CREATE OR REPLACE FUNCTION create_purchase_order(
  p_supplier_id uuid,
  p_supplier_name text,
  p_po_date timestamptz,
  p_expected_date timestamptz,
  p_notes text,
  p_items jsonb  -- [{product_id, product_name, quantity, price, discount}]
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_po_id uuid;
  v_item jsonb;
  v_product products%ROWTYPE;
  v_subtotal numeric := 0;
  v_discount numeric := 0;
  v_subtotal_item numeric;
  v_total numeric;
  v_po_date timestamptz;
BEGIN
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'PO harus memiliki minimal 1 item';
  END IF;

  v_po_id := gen_random_uuid();
  v_po_date := COALESCE(p_po_date, now());

  -- Simpan header
  INSERT INTO purchase_orders (id, user_id, po_number, supplier_id, supplier_name,
                                po_date, expected_date, notes, status)
  VALUES (v_po_id, auth.uid(),
          'PO-' || to_char(v_po_date, 'YYYYMMDD') || '-' || upper(substr(md5(random()::text), 1, 6)),
          p_supplier_id, p_supplier_name, v_po_date, p_expected_date, p_notes, 'draft');

  -- Simpan items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    -- Ambil produk
    SELECT * INTO v_product
    FROM products
    WHERE id = (v_item->>'product_id')::uuid AND user_id = auth.uid();

    v_subtotal_item := COALESCE((v_item->>'quantity')::numeric, 0) * COALESCE((v_item->>'price')::numeric, 0);
    v_discount := COALESCE((v_item->>'discount')::numeric, 0);
    v_subtotal := v_subtotal + v_subtotal_item;

    INSERT INTO po_items (user_id, po_id, product_id, product_name,
                          quantity, price, discount, subtotal)
    VALUES (auth.uid(), v_po_id, (v_item->>'product_id')::uuid,
            COALESCE(v_product.name, (v_item->>'product_name')::text),
            COALESCE((v_item->>'quantity')::numeric, 0),
            COALESCE((v_item->>'price')::numeric, 0),
            v_discount,
            v_subtotal_item - v_discount);
  END LOOP;

  -- Update total header
  v_total := v_subtotal;
  UPDATE purchase_orders
  SET subtotal = v_subtotal, total = v_total
  WHERE id = v_po_id;

  RETURN v_po_id;
END;
$$;

-- ============================================================
-- 14. FUNGSI: CREATE GOODS RECEIPT (auto-stok + auto-jurnal)
-- ============================================================
DROP FUNCTION IF EXISTS create_goods_receipt;
CREATE OR REPLACE FUNCTION create_goods_receipt(
  p_po_id uuid,
  p_supplier_id uuid,
  p_supplier_name text,
  p_receipt_date timestamptz,
  p_notes text,
  p_items jsonb  -- [{po_item_id, product_id, product_name, quantity_received, quantity_rejected, price}]
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_grn_id uuid;
  v_item jsonb;
  v_subtotal numeric := 0;
  v_grn_subtotal numeric := 0;
  v_po_item po_items%ROWTYPE;
  v_product products%ROWTYPE;
  v_qty_received numeric;
  v_qty_rejected numeric;
  v_total_received numeric;
  v_total_ordered numeric;
  -- Auto-jurnal
  v_account_persediaan uuid;
  v_account_utang uuid;
  v_journal_id uuid;
BEGIN
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'GRN harus memiliki minimal 1 item';
  END IF;

  v_grn_id := gen_random_uuid();
  p_receipt_date := COALESCE(p_receipt_date, now());

  -- Simpan header GRN
  INSERT INTO goods_receipts (id, user_id, grn_number, po_id, supplier_id, supplier_name,
                               receipt_date, notes, status)
  VALUES (v_grn_id, auth.uid(),
          'GRN-' || to_char(p_receipt_date, 'YYYYMMDD') || '-' || upper(substr(md5(random()::text), 1, 6)),
          p_po_id, p_supplier_id, p_supplier_name, p_receipt_date, p_notes, 'completed');

  -- Simpan items GRN + update stok + update PO received_quantity
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_qty_received := COALESCE((v_item->>'quantity_received')::numeric, 0);
    v_qty_rejected := COALESCE((v_item->>'quantity_rejected')::numeric, 0);
    v_subtotal := (v_qty_received + v_qty_rejected) * COALESCE((v_item->>'price')::numeric, 0);
    v_grn_subtotal := v_grn_subtotal + v_subtotal;

    -- Simpan item GRN
    INSERT INTO grn_items (user_id, grn_id, po_item_id, product_id, product_name,
                           quantity_received, quantity_rejected, price, subtotal)
    VALUES (auth.uid(), v_grn_id,
            (v_item->>'po_item_id')::uuid,
            (v_item->>'product_id')::uuid,
            (v_item->>'product_name')::text,
            v_qty_received, v_qty_rejected,
            COALESCE((v_item->>'price')::numeric, 0),
            v_subtotal);

    -- Update stok produk (hanya qty diterima baik)
    IF v_qty_received > 0 THEN
      UPDATE products
      SET stock = stock + v_qty_received,
          updated_at = now()
      WHERE id = (v_item->>'product_id')::uuid AND user_id = auth.uid();
    END IF;

    -- Update PO item received_quantity
    IF (v_item->>'po_item_id') IS NOT NULL THEN
      SELECT * INTO v_po_item FROM po_items WHERE id = (v_item->>'po_item_id')::uuid;
      IF FOUND THEN
        v_total_received := COALESCE(v_po_item.received_quantity, 0) + v_qty_received + v_qty_rejected;
        UPDATE po_items
        SET received_quantity = v_total_received
        WHERE id = v_po_item.id;
      END IF;
    END IF;
  END LOOP;

  -- Update total header GRN
  UPDATE goods_receipts SET total = v_grn_subtotal WHERE id = v_grn_id;

  -- Update status PO: partial atau completed
  IF p_po_id IS NOT NULL THEN
    SELECT COALESCE(SUM(quantity), 0), COALESCE(SUM(received_quantity), 0)
      INTO v_total_ordered, v_total_received
    FROM po_items WHERE po_id = p_po_id;

    IF v_total_received >= v_total_ordered THEN
      UPDATE purchase_orders SET status = 'completed', updated_at = now() WHERE id = p_po_id;
    ELSE
      UPDATE purchase_orders SET status = 'partial', updated_at = now() WHERE id = p_po_id;
    END IF;
  END IF;

  -- ============================================================
  -- AUTO-JURNAL: Persediaan (Debit) → Utang Usaha (Kredit)
  -- ============================================================
  SELECT id INTO v_account_persediaan
  FROM chart_of_accounts WHERE user_id = auth.uid() AND code = '1-1200';
  SELECT id INTO v_account_utang
  FROM chart_of_accounts WHERE user_id = auth.uid() AND code = '2-2000';

  IF v_account_persediaan IS NOT NULL AND v_account_utang IS NOT NULL THEN
    INSERT INTO journal_entries (user_id, entry_date, description, reference_type, reference_id)
    VALUES (auth.uid(), p_receipt_date, 'Penerimaan barang ' || COALESCE(p_supplier_name, ''),
            'purchase', v_grn_id)
    RETURNING id INTO v_journal_id;

    -- Debit Persediaan
    INSERT INTO journal_lines (user_id, journal_id, account_id, account_code, account_name, debit, credit)
    SELECT auth.uid(), v_journal_id, v_account_persediaan, '1-1200', 'Persediaan Barang', v_grn_subtotal, 0;

    -- Kredit Utang Usaha
    INSERT INTO journal_lines (user_id, journal_id, account_id, account_code, account_name, debit, credit)
    SELECT auth.uid(), v_journal_id, v_account_utang, '2-2000', 'Utang Usaha', 0, v_grn_subtotal;
  END IF;

  RETURN v_grn_id;
END;
$$;

-- ============================================================
-- 15. FUNGSI: CREATE PURCHASE INVOICE (auto-jurnal hutang)
-- ============================================================
DROP FUNCTION IF EXISTS create_purchase_invoice;
CREATE OR REPLACE FUNCTION create_purchase_invoice(
  p_grn_id uuid,
  p_supplier_id uuid,
  p_supplier_name text,
  p_invoice_date timestamptz,
  p_due_date timestamptz,
  p_discount numeric,
  p_tax numeric,
  p_shipping_cost numeric,
  p_notes text,
  p_items jsonb  -- [{grn_item_id, product_id, product_name, quantity, price}]
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pi_id uuid;
  v_item jsonb;
  v_subtotal numeric := 0;
  v_total numeric;
  v_po_id uuid;
BEGIN
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'PI harus memiliki minimal 1 item';
  END IF;

  v_pi_id := gen_random_uuid();
  p_invoice_date := COALESCE(p_invoice_date, now());

  -- Ambil po_id dari GRN
  SELECT po_id INTO v_po_id FROM goods_receipts WHERE id = p_grn_id;

  -- Simpan header PI
  INSERT INTO purchase_invoices (id, user_id, pi_number, grn_id, po_id, supplier_id, supplier_name,
                                  invoice_date, due_date, discount, tax, shipping_cost, notes)
  VALUES (v_pi_id, auth.uid(),
          'PI-' || to_char(p_invoice_date, 'YYYYMMDD') || '-' || upper(substr(md5(random()::text), 1, 6)),
          p_grn_id, v_po_id, p_supplier_id, p_supplier_name,
          p_invoice_date, p_due_date,
          COALESCE(p_discount, 0), COALESCE(p_tax, 0), COALESCE(p_shipping_cost, 0),
          p_notes);

  -- Simpan items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_subtotal := v_subtotal + COALESCE((v_item->>'quantity')::numeric, 0) * COALESCE((v_item->>'price')::numeric, 0);

    INSERT INTO pi_items (user_id, pi_id, grn_item_id, product_id, product_name, quantity, price, subtotal)
    VALUES (auth.uid(), v_pi_id,
            (v_item->>'grn_item_id')::uuid,
            (v_item->>'product_id')::uuid,
            (v_item->>'product_name')::text,
            COALESCE((v_item->>'quantity')::numeric, 0),
            COALESCE((v_item->>'price')::numeric, 0),
            COALESCE((v_item->>'quantity')::numeric, 0) * COALESCE((v_item->>'price')::numeric, 0));
  END LOOP;

  -- Hitung total
  v_total := v_subtotal - COALESCE(p_discount, 0) + COALESCE(p_tax, 0) + COALESCE(p_shipping_cost, 0);

  UPDATE purchase_invoices
  SET subtotal = v_subtotal, total = v_total,
      remaining_amount = v_total
  WHERE id = v_pi_id;

  RETURN v_pi_id;
END;
$$;

-- ============================================================
-- 16. FUNGSI: ADD PI PAYMENT (auto-jurnal bayar hutang)
-- ============================================================
DROP FUNCTION IF EXISTS add_pi_payment;
CREATE OR REPLACE FUNCTION add_pi_payment(
  p_pi_id uuid,
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
  v_paid numeric;
  v_remaining numeric;
  v_total numeric;
  v_pi_number text;
  v_account_kas uuid;
  v_account_utang uuid;
  v_journal_id uuid;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Jumlah pembayaran tidak valid';
  END IF;

  SELECT total, paid_amount, remaining_amount, pi_number
    INTO v_total, v_paid, v_remaining, v_pi_number
  FROM purchase_invoices
  WHERE id = p_pi_id AND user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invoice tidak ditemukan';
  END IF;

  IF p_amount > v_remaining THEN
    RAISE EXCEPTION 'Pembayaran melebihi sisa tagihan (sisa %)', v_remaining;
  END IF;

  -- Catat pembayaran
  INSERT INTO pi_payments (user_id, pi_id, amount, payment_method, notes)
  VALUES (auth.uid(), p_pi_id, p_amount, COALESCE(p_payment_method, 'tunai'), p_notes)
  RETURNING id INTO v_payment_id;

  -- Update status PI
  v_paid := v_paid + p_amount;
  v_remaining := v_remaining - p_amount;

  UPDATE purchase_invoices
  SET paid_amount = v_paid,
      remaining_amount = v_remaining,
      payment_status = CASE
        WHEN v_remaining <= 0 THEN 'lunas'
        WHEN v_paid > 0 THEN 'sebagian'
        ELSE 'belum_lunas'
      END,
      updated_at = now()
  WHERE id = p_pi_id AND user_id = auth.uid();

  -- ============================================================
  -- AUTO-JURNAL: Utang Usaha (Debit) → Kas (Kredit)
  -- ============================================================
  SELECT id INTO v_account_kas
  FROM chart_of_accounts WHERE user_id = auth.uid() AND code = '1-1000';
  SELECT id INTO v_account_utang
  FROM chart_of_accounts WHERE user_id = auth.uid() AND code = '2-2000';

  IF v_account_kas IS NOT NULL AND v_account_utang IS NOT NULL THEN
    INSERT INTO journal_entries (user_id, entry_date, description, reference_type, reference_id)
    VALUES (auth.uid(), now(), 'Pembayaran ' || v_pi_number, 'purchase_payment', p_pi_id)
    RETURNING id INTO v_journal_id;

    -- Debit Utang Usaha
    INSERT INTO journal_lines (user_id, journal_id, account_id, account_code, account_name, debit, credit)
    SELECT auth.uid(), v_journal_id, v_account_utang, '2-2000', 'Utang Usaha', p_amount, 0;

    -- Kredit Kas
    INSERT INTO journal_lines (user_id, journal_id, account_id, account_code, account_name, debit, credit)
    SELECT auth.uid(), v_journal_id, v_account_kas, '1-1000', 'Kas', 0, p_amount;
  END IF;

  RETURN v_payment_id;
END;
$$;

-- ============================================================
-- 17. FUNGSI: CREATE PURCHASE RETURN (auto-jurnal reversal)
-- ============================================================
DROP FUNCTION IF EXISTS create_purchase_return;
CREATE OR REPLACE FUNCTION create_purchase_return(
  p_grn_id uuid,
  p_pi_id uuid,
  p_supplier_id uuid,
  p_supplier_name text,
  p_return_date timestamptz,
  p_reason text,
  p_notes text,
  p_items jsonb  -- [{product_id, product_name, quantity, price, price_buy}]
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pr_id uuid;
  v_item jsonb;
  v_product products%ROWTYPE;
  v_total_refund numeric := 0;
  v_prod_id uuid;
  v_qty numeric;
  v_price numeric;
  v_price_buy numeric;
  -- Auto-jurnal reversal
  v_account_persediaan uuid;
  v_account_utang uuid;
  v_journal_id uuid;
BEGIN
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Retur harus memiliki minimal 1 item';
  END IF;

  v_pr_id := gen_random_uuid();
  p_return_date := COALESCE(p_return_date, now());

  -- Simpan header retur
  INSERT INTO purchase_returns (id, user_id, pr_number, grn_id, pi_id, supplier_id, supplier_name,
                                return_date, reason, notes, status)
  VALUES (v_pr_id, auth.uid(),
          'PR-' || to_char(p_return_date, 'YYYYMMDD') || '-' || upper(substr(md5(random()::text), 1, 6)),
          p_grn_id, p_pi_id, p_supplier_id, p_supplier_name,
          p_return_date, p_reason, p_notes, 'completed');

  -- Simpan items + kurangi stok
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_prod_id := (v_item->>'product_id')::uuid;
    v_qty := COALESCE((v_item->>'quantity')::numeric, 0);
    v_price := COALESCE((v_item->>'price')::numeric, 0);
    v_price_buy := COALESCE((v_item->>'price_buy')::numeric, 0);
    v_total_refund := v_total_refund + (v_qty * v_price);

    INSERT INTO purchase_return_items (user_id, pr_id, product_id, product_name,
                                        quantity, price, price_buy, subtotal)
    VALUES (auth.uid(), v_pr_id, v_prod_id,
            COALESCE((SELECT name FROM products WHERE id = v_prod_id), (v_item->>'product_name')::text),
            v_qty, v_price, v_price_buy, v_qty * v_price);

    -- Kurangi stok
    UPDATE products
    SET stock = GREATEST(stock - v_qty, 0), updated_at = now()
    WHERE id = v_prod_id AND user_id = auth.uid();
  END LOOP;

  -- Update total retur
  UPDATE purchase_returns SET total_refund = v_total_refund WHERE id = v_pr_id;

  -- ============================================================
  -- AUTO-JURNAL: Utang Usaha (Debit) → Persediaan (Kredit)
  -- ============================================================
  SELECT id INTO v_account_persediaan
  FROM chart_of_accounts WHERE user_id = auth.uid() AND code = '1-1200';
  SELECT id INTO v_account_utang
  FROM chart_of_accounts WHERE user_id = auth.uid() AND code = '2-2000';

  IF v_account_persediaan IS NOT NULL AND v_account_utang IS NOT NULL THEN
    INSERT INTO journal_entries (user_id, entry_date, description, reference_type, reference_id)
    VALUES (auth.uid(), p_return_date, 'Retur pembelian ke ' || COALESCE(p_supplier_name, ''),
            'purchase_return', v_pr_id)
    RETURNING id INTO v_journal_id;

    -- Debit Utang Usaha
    INSERT INTO journal_lines (user_id, journal_id, account_id, account_code, account_name, debit, credit)
    SELECT auth.uid(), v_journal_id, v_account_utang, '2-2000', 'Utang Usaha', v_total_refund, 0;

    -- Kredit Persediaan
    INSERT INTO journal_lines (user_id, journal_id, account_id, account_code, account_name, debit, credit)
    SELECT auth.uid(), v_journal_id, v_account_persediaan, '1-1200', 'Persediaan Barang', 0, v_total_refund;
  END IF;

  RETURN v_pr_id;
END;
$$;