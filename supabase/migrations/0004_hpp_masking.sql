-- ============================================================================
-- 0004_hpp_masking.sql — Fase 3E: tutup kebocoran HPP
--
-- Latar: RBAC_PLAN §6. `authenticated` masih memegang SELECT penuh pada
-- `public.products`, sehingga role tanpa `hpp.read` (kasir, gudang) bisa
-- membaca `price_buy`/`price_modal` lewat tabel dasar. View saja tidak cukup.
--
-- Desain yang dipakai (teruji empiris, §6.1):
--   C. View dimiliki `postgres` (bypassrls) + filter tenant EKSPLISIT di dalam
--      view + cabut hak kolom `price_buy`/`price_modal` dari `authenticated`.
--
-- ATURAN TETAP: setiap view masking baru WAJIB memuat
--   where <tabel>.store_id = (select public.current_store_id())
-- karena isolasi tenant tidak lagi datang dari RLS (view berjalan sebagai
-- owner yang bypassrls).
--
-- Perubahan:
--   1. v_products        -> desain C (sebelumnya security_invoker = true)
--   2. products          -> cabut SELECT penuh, grant per kolom tanpa HPP
--   3. v_return_items    -> BARU: masking return_items.price_buy
--   4. v_purchase_return_items -> BARU: masking purchase_return_items.price_buy
--   5. return_items / purchase_return_items -> grant per kolom tanpa price_buy
--   6. transaction_items_payment_summary -> kolom `user_id` -> `store_id`
--   7. create_product()  -> RPC insert produk + jurnal stok awal atomik (§6.4)
-- ============================================================================

-- ============================================================================
-- 1. v_products — desain C
--
-- create or replace view tidak menghapus reloption lama, jadi
-- security_invoker di-reset eksplisit setelahnya.
-- ============================================================================
create or replace view public.v_products as
select
  p.id,
  p.store_id,
  p.name,
  p.description,
  p.category_id,
  p.sku,
  p.barcode,
  p.image_url,
  p.is_active,
  p.price_sell,
  p.stock,
  p.minimum_stock,
  p.created_by,
  p.created_at,
  p.updated_at,
  case when (select public.has_permission('hpp.read')) then p.price_buy end as price_buy,
  case when (select public.has_permission('hpp.read')) then p.price_modal end as price_modal
from public.products p
where p.store_id = (select public.current_store_id())
  -- RLS tabel dasar tidak lagi berlaku (view berjalan sebagai postgres),
  -- jadi gerbang `product.read` harus ditegakkan di sini.
  and (select public.has_permission('product.read'));

alter view public.v_products reset (security_invoker);
alter view public.v_products owner to postgres;

comment on view public.v_products is
  'Produk dengan masking HPP. Dimiliki postgres (bypassrls) sehingga WAJIB memfilter '
  'store_id secara eksplisit; price_buy/price_modal hanya terisi bila user punya hpp.read.';

-- ============================================================================
-- 2. products — hak per kolom (tanpa price_buy / price_modal)
--
-- SELECT tabel penuh dicabut supaya `select *` / `select price_buy` ditolak.
-- INSERT/UPDATE/DELETE tetap tabel-level: role boleh MENULIS harga beli
-- (gudang memang yang tahu harga supplier) tetapi tidak bisa membacanya
-- kembali. `update ... returning price_buy` juga ditolak karena butuh SELECT.
-- ============================================================================
revoke all on public.products from authenticated;
revoke all on public.products from anon;

grant select (
  id, store_id, name, description, category_id, sku, barcode, image_url,
  is_active, price_sell, stock, minimum_stock, created_by, created_at, updated_at
) on public.products to authenticated;

grant insert, update, delete on public.products to authenticated;
grant all on public.products to service_role;

-- ============================================================================
-- 3. v_return_items — masking HPP pada item retur
--
-- Keputusan §6.3 butir 4: DIMASKER. `return_items.price_buy` adalah snapshot
-- harga beli yang dipakai laporan laba; role `kasir` punya transaction.read
-- tetapi tidak punya hpp.read, jadi tanpa masking ini kebocoran yang sama
-- tetap terbuka lewat tabel lain.
-- ============================================================================
create or replace view public.v_return_items as
select
  ri.id,
  ri.store_id,
  ri.return_id,
  ri.product_id,
  ri.product_name,
  ri.price,
  ri.quantity,
  ri.subtotal,
  ri.created_at,
  case when (select public.has_permission('hpp.read')) then ri.price_buy end as price_buy
from public.return_items ri
where ri.store_id = (select public.current_store_id());

alter view public.v_return_items owner to postgres;

comment on view public.v_return_items is
  'Item retur dengan masking HPP (price_buy hanya untuk hpp.read). Wajib filter tenant eksplisit.';

-- ============================================================================
-- 4. v_purchase_return_items — masking HPP pada item retur pembelian
--
-- Role `gudang` punya purchasing.read tetapi tidak punya hpp.read.
-- ============================================================================
create or replace view public.v_purchase_return_items as
select
  pri.id,
  pri.store_id,
  pri.pr_id,
  pri.product_id,
  pri.product_name,
  pri.quantity,
  pri.price,
  pri.subtotal,
  pri.created_at,
  case when (select public.has_permission('hpp.read')) then pri.price_buy end as price_buy
from public.purchase_return_items pri
where pri.store_id = (select public.current_store_id());

alter view public.v_purchase_return_items owner to postgres;

comment on view public.v_purchase_return_items is
  'Item retur pembelian dengan masking HPP. Wajib filter tenant eksplisit.';

-- ============================================================================
-- 5. return_items / purchase_return_items — hak per kolom
--
-- Kolom price_buy dicabut dari SELECT; INSERT/UPDATE/DELETE tetap agar
-- sync/offline (Fase 4) tidak bertambah rusak. RPC create_return /
-- create_purchase_return berjalan SECURITY DEFINER sehingga tidak butuh grant.
-- ============================================================================
revoke all on public.return_items from authenticated;
revoke all on public.return_items from anon;

grant select (
  id, store_id, return_id, product_id, product_name, price, quantity, subtotal, created_at
) on public.return_items to authenticated;

grant insert, update, delete on public.return_items to authenticated;
grant all on public.return_items to service_role;

revoke all on public.purchase_return_items from authenticated;
revoke all on public.purchase_return_items from anon;

grant select (
  id, store_id, pr_id, product_id, product_name, quantity, price, subtotal, created_at
) on public.purchase_return_items to authenticated;

grant insert, update, delete on public.purchase_return_items to authenticated;
grant all on public.purchase_return_items to service_role;

-- ============================================================================
-- 6. View masking: hak baca
--
-- PENTING (temuan live, 2026-11-26): Supabase menyiapkan
--   alter default privileges in schema public grant all on tables to authenticated
-- sehingga SETIAP relasi baru — termasuk view — otomatis mendapat
-- `arwdDxtm` untuk `authenticated`. View ini dimiliki `postgres` (bypassrls)
-- dan sederhana (auto-updatable), jadi tanpa `revoke ... from authenticated`
-- role mana pun bisa MENULIS lewat view, melewati RLS + permission:
--   kasir (tanpa product.write): update public.v_products set price_sell=1  -> BERHASIL
-- Karena itu `authenticated` WAJIB ikut dicabut, bukan hanya `public, anon`.
-- ============================================================================
revoke all on public.v_products from public, anon, authenticated;
revoke all on public.v_return_items from public, anon, authenticated;
revoke all on public.v_purchase_return_items from public, anon, authenticated;

grant select on public.v_products to authenticated, service_role;
grant select on public.v_return_items to authenticated, service_role;
grant select on public.v_purchase_return_items to authenticated, service_role;

-- ============================================================================
-- 6b. Default privileges: jangan beri `authenticated` hak TULIS otomatis
--
-- Akar masalah di atas: `alter default privileges in schema public grant all
-- on tables to authenticated` (bawaan Supabase) membuat setiap relasi baru —
-- termasuk view masking yang dimiliki postgres/bypassrls — bisa ditulisi.
-- Perbaikan permanen: untuk relasi BARU, `authenticated` hanya otomatis
-- mendapat SELECT (bukan ALL). Tabel bisnis yang butuh INSERT/UPDATE/DELETE
-- tetap diberi grant eksplisit di migrasi masing-masing.
--
-- Dampak ke depan: migrasi baru yang membuat tabel dan mengandalkan grant
-- otomatis untuk menulis HARUS menulis `grant insert, update, delete ...`.
-- ============================================================================
alter default privileges in schema public
  revoke all on tables from authenticated;
alter default privileges in schema public
  revoke all on tables from anon;
alter default privileges in schema public
  grant select on tables to authenticated;

-- ============================================================================
-- 7. transaction_items_payment_summary — alias user_id -> store_id
--
-- Fase 3 selesai me-rename interface frontend ke store_id. View ini tetap
-- security_invoker = true (S1 sudah ditutup di 0003).
-- ============================================================================
-- CREATE OR REPLACE tidak bisa mengganti NAMA kolom, jadi drop dulu.
-- View tidak punya dependensi lain (dibaca langsung oleh PostgREST).
drop view if exists public.transaction_items_payment_summary;

create view public.transaction_items_payment_summary
with (security_invoker = true) as
select
  ti.id as item_id,
  ti.transaction_id,
  ti.store_id,
  ti.product_id,
  ti.product_name,
  ti.subtotal as item_total,
  coalesce(sum(tip.allocated_amount), 0) as paid_amount,
  ti.subtotal - coalesce(sum(tip.allocated_amount), 0) as remaining_amount,
  case
    when coalesce(sum(tip.allocated_amount), 0) >= ti.subtotal then 'lunas'
    when coalesce(sum(tip.allocated_amount), 0) > 0 then 'sebagian'
    else 'belum_bayar'
  end as payment_status
from public.transaction_items ti
left join public.transaction_item_payments tip on tip.item_id = ti.id
group by ti.id, ti.transaction_id, ti.store_id, ti.product_id, ti.product_name, ti.subtotal;

alter view public.transaction_items_payment_summary set (security_invoker = true);

revoke all on public.transaction_items_payment_summary from public, anon, authenticated;
grant select on public.transaction_items_payment_summary to authenticated, service_role;

-- ============================================================================
-- 8. RPC create_product — insert produk + jurnal stok awal atomik (§6.4)
--
-- Sebelumnya frontend membuat jurnal stok awal dari klien lewat
-- postInitialStockJournal yang dijaga finance.write. Role gudang punya
-- product.write tetapi tidak finance.write, sehingga jurnalnya gagal dan
-- kegagalannya ditelan diam-diam (catch -> console.error).
--
-- Sekarang jurnal dibuat server-side dengan mendelegasikan ke
-- create_stock_adjustment(), yang sudah mencatat stock_movements + jurnal
-- Dr 1-1200 Persediaan / Cr 3-3000 Modal Pemilik.
-- ============================================================================
create or replace function public.create_product(
  p_name text,
  p_price_sell numeric,
  p_price_buy numeric default 0,
  p_stock integer default 0,
  p_sku text default null,
  p_barcode text default null,
  p_category_id uuid default null,
  p_minimum_stock integer default 10,
  p_description text default null,
  p_is_active boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_store_id uuid := public.current_store_id();
  v_product_id uuid;
  v_price_buy numeric := coalesce(p_price_buy, 0);
  v_stock integer := greatest(coalesce(p_stock, 0), 0);
begin
  if not public.has_permission('product.write') then
    raise exception 'Akses ditolak: butuh permission product.write' using errcode = '42501';
  end if;

  if v_store_id is null then
    raise exception 'Akses ditolak: pengguna tidak terhubung ke toko mana pun' using errcode = '42501';
  end if;

  if nullif(btrim(p_name), '') is null then
    raise exception 'Nama produk wajib diisi';
  end if;

  insert into public.products (
    store_id, name, description, category_id, sku, barcode,
    price_buy, price_sell, stock, minimum_stock, is_active, created_by
  ) values (
    v_store_id, btrim(p_name), p_description, p_category_id, p_sku, p_barcode,
    v_price_buy, coalesce(p_price_sell, 0), 0, coalesce(p_minimum_stock, 10),
    coalesce(p_is_active, true), auth.uid()
  )
  returning id into v_product_id;

  -- Stok awal dicatat sebagai adjustment supaya movement + jurnal ikut.
  -- create_stock_adjustment dijaga stock.write; semua role yang punya
  -- product.write juga punya stock.write pada matriks saat ini.
  if v_stock > 0 then
    perform public.create_stock_adjustment(
      v_product_id,
      'add',
      0,
      v_stock,
      v_stock,
      'Stok awal produk',
      'Stok awal saat produk dibuat'
    );
  end if;

  return v_product_id;
end;
$$;

comment on function public.create_product(text, numeric, numeric, integer, text, text, uuid, integer, text, boolean) is
  'Buat produk + jurnal stok awal atomik (Dr Persediaan / Cr Modal). Guard: product.write (+ stock.write bila stok awal > 0).';

revoke all on function public.create_product(text, numeric, numeric, integer, text, text, uuid, integer, text, boolean) from public, anon;
grant execute on function public.create_product(text, numeric, numeric, integer, text, text, uuid, integer, text, boolean) to authenticated, service_role;

-- ============================================================================
-- 9. Verifikasi cepat (dijalankan manual bila perlu)
--
--   -- sebagai kasir:
--   select price_buy from public.products limit 1;   -- harus permission denied
--   select price_buy from public.v_products limit 1; -- harus NULL
--   -- sebagai owner:
--   select price_buy from public.v_products limit 1; -- harus nilai asli
-- ============================================================================
