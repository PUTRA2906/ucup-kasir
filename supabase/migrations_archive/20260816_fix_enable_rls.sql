-- ============================================================
-- PERBAIKAN: Aktifkan RLS + Policies per-user
-- Project: Ucup Kasir
--
-- Script ini AMAN dijalankan ulang (idempotent) dan TIDAK
-- menghapus data. Jalankan di Supabase Dashboard -> SQL Editor.
-- ============================================================

-- 1) Aktifkan Row Level Security (jika sudah aktif, tidak apa-apa)
ALTER TABLE products  ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- 2) Hapus policies lama (hindari duplikat/konflik), termasuk
--    policy bawaan "Enable read access for all users" bila ada
DROP POLICY IF EXISTS "Enable read access for all users" ON products;
DROP POLICY IF EXISTS "Enable read access for all users" ON categories;
DROP POLICY IF EXISTS "products_select_own"  ON products;
DROP POLICY IF EXISTS "products_insert_own"  ON products;
DROP POLICY IF EXISTS "products_update_own"  ON products;
DROP POLICY IF EXISTS "products_delete_own"  ON products;
DROP POLICY IF EXISTS "categories_select_own"  ON categories;
DROP POLICY IF EXISTS "categories_insert_own"  ON categories;
DROP POLICY IF EXISTS "categories_update_own"  ON categories;
DROP POLICY IF EXISTS "categories_delete_own"  ON categories;

-- 3) Policies - products (hanya pemilik yang bisa akses)
CREATE POLICY "products_select_own" ON products
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "products_insert_own" ON products
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "products_update_own" ON products
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "products_delete_own" ON products
  FOR DELETE USING (auth.uid() = user_id);

-- 4) Policies - categories (hanya pemilik yang bisa akses)
CREATE POLICY "categories_select_own" ON categories
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "categories_insert_own" ON categories
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "categories_update_own" ON categories
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "categories_delete_own" ON categories
  FOR DELETE USING (auth.uid() = user_id);
