-- ============================================================================
-- 0007_deterministic_current_store.sql — current_store_id() harus deterministik
--
-- Temuan saat verifikasi 3F di live: seorang user bisa punya >1 keanggotaan
-- (mis. owner di toko sendiri + karyawan yang diundang ke toko lain).
-- `current_store_id()` memilih `order by created_at limit 1`; bila dua baris
-- `store_members` dibuat dalam transaksi yang sama, `created_at`-nya IDENTIK
-- dan PostgreSQL bebas memilih salah satu. Padahal fungsi ini adalah batas
-- tenant untuk RLS dan semua guard `has_permission()` — hasil yang berubah-ubah
-- berarti user bisa "berpindah toko" tanpa sadar, tergantung plan eksekusi.
--
-- Perbaikan: tambahkan tiebreak deterministik `id`. Tidak mengubah perilaku
-- saat tidak ada seri (kasus normal: satu keanggotaan).
-- ============================================================================

create or replace function public.current_store_id()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select store_id
  from public.store_members
  where user_id = auth.uid() and is_active
  order by created_at, id
  limit 1
$$;

comment on function public.current_store_id() is
  'Toko aktif user = keanggotaan aktif paling awal (created_at, lalu id sebagai tiebreak deterministik).';

revoke all on function public.current_store_id() from public, anon;
grant execute on function public.current_store_id() to authenticated, service_role;
