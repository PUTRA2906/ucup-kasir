-- ============================================================
-- Migrasi: Pengaturan Toko (Store Settings)
-- Project: Ucup Kasir
--
-- Membuat tabel store_settings untuk menyimpan informasi toko
-- yang digunakan di invoice, cetak, dan tampilan aplikasi.
-- Satu baris per user (one-to-one dengan auth.uid()).
-- ============================================================

-- 1) Tabel store_settings
CREATE TABLE IF NOT EXISTS store_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() UNIQUE,
  store_name text NOT NULL DEFAULT 'Ucup Kasir',
  store_subtitle text DEFAULT 'Toko Berkat Jaya Makmur',
  store_address text DEFAULT '',
  store_phone text DEFAULT '',
  store_email text DEFAULT '',
  tax_enabled boolean DEFAULT false,
  tax_rate numeric(5,2) DEFAULT 0,
  currency text DEFAULT 'IDR',
  receipt_footer text DEFAULT 'Terima kasih atas kunjungan Anda',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_store_settings_user ON store_settings (user_id);

-- 2) Aktifkan Row Level Security
ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;

-- 3) Hapus policies lama
DROP POLICY IF EXISTS "store_settings_select_own" ON store_settings;
DROP POLICY IF EXISTS "store_settings_insert_own" ON store_settings;
DROP POLICY IF EXISTS "store_settings_update_own" ON store_settings;
DROP POLICY IF EXISTS "store_settings_delete_own" ON store_settings;

-- 4) Policies (hanya pemilik)
CREATE POLICY "store_settings_select_own" ON store_settings
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "store_settings_insert_own" ON store_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "store_settings_update_own" ON store_settings
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "store_settings_delete_own" ON store_settings
  FOR DELETE USING (auth.uid() = user_id);

-- 5) Auto-create default store_settings saat user baru daftar
CREATE OR REPLACE FUNCTION create_default_store_settings()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO store_settings (user_id, store_name, store_subtitle)
  VALUES (NEW.id, 'Ucup Kasir', 'Toko Berkat Jaya Makmur')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_store_settings();
