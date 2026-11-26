-- Tambah kolom credit_limit ke tabel customers
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS credit_limit REAL NOT NULL DEFAULT 0;

-- Tambah kolom default_credit_limit ke store_settings
-- (Catatan: loading_rate_per_sack/unloading_rate_per_sack sengaja TIDAK
--  ditambahkan lagi — insentif bongkar muat kini dihitung dari daftar barang
--  dimuat per surat jalan, bukan dari tarif global per karung.)
ALTER TABLE store_settings
ADD COLUMN IF NOT EXISTS default_credit_limit REAL NOT NULL DEFAULT 0;

-- Kommentar untuk dokumentasi
COMMENT ON COLUMN customers.credit_limit IS 'Limit kredit customer (0 = gunakan default dari settings)';
COMMENT ON COLUMN store_settings.default_credit_limit IS 'Limit kredit default untuk semua customer';
