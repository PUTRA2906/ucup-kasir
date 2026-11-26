-- ============================================================================
-- 0006_store_scoped_permission.sql — permission HARUS mengikuti toko aktif
--
-- Temuan saat uji 3F: `has_permission()` (0002) memeriksa permission di
-- **toko mana pun** tempat user aktif, sedangkan `current_store_id()` memilih
-- SATU toko (keanggotaan paling awal). Bila seorang user punya dua keanggotaan
-- dengan role berbeda, guard RPC dan policy RLS bisa memakai permission dari
-- toko A sementara datanya dari toko B.
--
-- Contoh nyata (terbukti di harness): user ber-role `owner` di toko sendiri
-- dan `kasir` di toko lain. `current_store_id()` menunjuk toko kasir, tetapi
-- `has_permission('user.manage')` bernilai true karena toko miliknya sendiri
-- memberi permission itu → ia bisa mengundang/mengubah anggota toko tempat ia
-- hanya kasir.
--
-- Perbaikan: permission selalu dievaluasi pada `current_store_id()` — toko
-- yang sama dengan yang dipakai RLS dan `current_store_role()`.
-- ============================================================================

create or replace function public.has_permission(p text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.store_members m
    join public.role_permissions rp on rp.role = m.role
    where m.user_id = auth.uid()
      and m.is_active
      and m.store_id = public.current_store_id()
      and rp.permission = p
  )
$$;

comment on function public.has_permission(text) is
  'True bila user punya permission tsb DI TOKO AKTIF (current_store_id()). Tidak lintas toko.';

-- GRANT tidak berubah (CREATE OR REPLACE mempertahankan ACL), tetapi ditulis
-- eksplisit supaya konsisten bila fungsi suatu saat di-drop.
revoke all on function public.has_permission(text) from public, anon;
grant execute on function public.has_permission(text) to authenticated, service_role;
