-- ============================================================
-- Migrasi: Tambah kolom driver_fee ke delivery_orders
--
-- Perubahan: Menambahkan kolom untuk menyimpan tarif/upah supir per trip
-- pengiriman. Digunakan untuk perhitungan gaji/payroll supir.
--
-- Tarif supir diinput saat membuat surat jalan dan akan dijumlahkan
-- untuk menghitung insentif supir dalam periode payroll.
-- ============================================================

ALTER TABLE public.delivery_orders
  ADD COLUMN IF NOT EXISTS driver_fee numeric(14,2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.delivery_orders.driver_fee IS
  'Tarif/upah supir untuk trip pengiriman ini (Rp). Digunakan untuk perhitungan payroll supir.';
