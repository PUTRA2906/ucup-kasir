-- ============================================================
-- Migrasi: Auth & data per-user
-- Project: Ucup Kasir
--
-- 1. Hapus data lama (mulai bersih)
-- 2. Tambah kolom user_id (otomatis diisi dari sesi login)
-- 3. Aktifkan Row Level Security
-- 4. Policies: setiap user hanya melihat datanya sendiri
--
-- Cara menjalankan: Supabase Dashboard -> SQL Editor -> New query
-- -> tempel seluruh isi file ini -> Run
-- ============================================================

-- 1) Hapus data lama (mulai bersih)
TRUNCATE TABLE products CASCADE;
TRUNCATE TABLE categories CASCADE;

-- 2) Tambah kolom user_id (diisi otomatis dari auth.uid())
ALTER TABLE products
  ADD COLUMN user_id uuid NOT NULL DEFAULT auth.uid();
ALTER TABLE categories
  ADD COLUMN user_id uuid NOT NULL DEFAULT auth.uid();

-- 3) Aktifkan Row Level Security
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- 4) Policies - products
CREATE POLICY "products_select_own" ON products
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "products_insert_own" ON products
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "products_update_own" ON products
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "products_delete_own" ON products
  FOR DELETE USING (auth.uid() = user_id);

-- 5) Policies - categories
CREATE POLICY "categories_select_own" ON categories
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "categories_insert_own" ON categories
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "categories_update_own" ON categories
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "categories_delete_own" ON categories
  FOR DELETE USING (auth.uid() = user_id);
