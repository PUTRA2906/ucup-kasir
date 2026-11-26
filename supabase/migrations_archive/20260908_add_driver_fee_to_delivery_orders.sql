-- ============================================================
-- Migrasi: Tambah kolom driver_fee (gaji sopir) ke delivery_orders
-- Gaji sopir per surat jalan, terpisah dari insentif tim muat
-- ============================================================

-- Tambah kolom driver_fee
ALTER TABLE delivery_orders
ADD COLUMN IF NOT EXISTS driver_fee numeric(12,2) DEFAULT 0;

COMMENT ON COLUMN delivery_orders.driver_fee IS 'Gaji sopir per surat jalan (terpisah dari insentif tim muat)';
