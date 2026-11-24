-- ============================================================
-- Migration: Auto-Init COA Saat User Signup
-- Tanggal: 2026-11-05
-- Masalah:
--   Trigger on_auth_user_created hanya buat store_settings,
--   tidak init COA. User baru harus buat transaksi dulu
--   baru dapat COA (via trigger ensure_coa_exists).
-- Solusi:
--   Update fungsi create_default_store_settings() untuk
--   juga memanggil init_default_coa_for_user().
-- ============================================================

CREATE OR REPLACE FUNCTION create_default_store_settings()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 1. Buat store_settings default
  INSERT INTO store_settings (user_id, store_name, store_subtitle)
  VALUES (NEW.id, 'Ucup Kasir', 'Toko Berkat Jaya Makmur')
  ON CONFLICT (user_id) DO NOTHING;

  -- 2. Init COA default untuk user baru
  PERFORM init_default_coa_for_user(NEW.id);

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION create_default_store_settings IS
'Auto-create store_settings dan COA default saat user baru signup.
UPDATED (2026-11-05): Tambahkan init_default_coa_for_user().';
