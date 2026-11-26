-- ============================================================
-- Migrasi: Tabel customers (data per-user)
-- Project: Ucup Kasir
--
-- Membuat tabel customers dengan RLS sehingga setiap user
-- hanya melihat/mengelola customer miliknya sendiri.
-- Aman dijalankan ulang (idempotent).
-- Jalankan di Supabase Dashboard -> SQL Editor.
-- ============================================================

-- 1) Buat tabel (jika belum ada)
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL,
  store_name text,
  phone text,
  kecamatan text NOT NULL,
  address text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2) Tambah kolom tambahan jika belum ada (untuk tabel yang sudah dibuat sebelumnya)
ALTER TABLE customers ADD COLUMN IF NOT EXISTS store_name text;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS kecamatan text;

-- 3) Jadikan kolom kecamatan wajib (hanya jika tidak ada data lama yang kosong)
-- Jika ada customer lama tanpa kecamatan, isi dulu atau hapus data tsb sebelum menjalankan baris ini.
-- ALTER TABLE customers ALTER COLUMN kecamatan SET NOT NULL;

-- 4) Aktifkan Row Level Security
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- 4) Hapus policies lama (hindari duplikat/konflik)
DROP POLICY IF EXISTS "customers_select_own" ON customers;
DROP POLICY IF EXISTS "customers_insert_own" ON customers;
DROP POLICY IF EXISTS "customers_update_own" ON customers;
DROP POLICY IF EXISTS "customers_delete_own" ON customers;

-- 5) Policies - hanya pemilik yang bisa akses
CREATE POLICY "customers_select_own" ON customers
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "customers_insert_own" ON customers
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "customers_update_own" ON customers
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "customers_delete_own" ON customers
  FOR DELETE USING (auth.uid() = user_id);
