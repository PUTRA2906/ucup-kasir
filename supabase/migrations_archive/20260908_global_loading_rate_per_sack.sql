-- ============================================================
-- Migrasi: tarif GLOBAL upah bongkar muat per karung
--
-- Perubahan kebijakan: migrasi 20260906_incentive_moves_to_delivery_orders.sql
-- dulu MENGHAPUS store_settings.loading_rate_per_sack karena insentif dihitung
-- murni dari daftar barang di surat jalan. Kini user meminta kembali tarif
-- global per karung — perannya berubah menjadi DEFAULT harga per unit pada
-- item muatan surat jalan (masih bisa diubah manual per item), sehingga
-- perhitungan payroll tetap satu sumber: Σ(jumlah × harga) ÷ jumlah tim muat.
--
-- Kolom mungkin sudah ada di beberapa environment (sisa lama) — IF NOT EXISTS.
-- unloading_rate_per_sack TIDAK dihidupkan lagi: tidak dipakai di rumus mana pun.
-- ============================================================

ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS loading_rate_per_sack numeric(14,2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.store_settings.loading_rate_per_sack IS
  'Tarif global upah bongkar muat per karung (Rp). Jadi default harga/unit item muatan surat jalan; upah payroll tetap dihitung dari nilai muatan riil.';
