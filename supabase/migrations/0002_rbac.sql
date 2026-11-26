-- ============================================================================
-- 0002_rbac.sql — Fase 1: skema multi-tenant + RBAC
--
-- Dijalankan setelah 0001_baseline.sql. Mengasumsikan database greenfield
-- (tabel kosong) sesuai keputusan 'greenfield in-place' di docs/RBAC_PLAN.md.
--
-- Isi:
--   1. Tabel tenancy: stores, store_members, role_permissions (+ seed matriks)
--   2. Helper: current_store_id(), has_permission()
--   3. Rename user_id -> store_id pada 46 tabel bisnis (+ default current_store_id())
--   4. Ganti FK store_id: auth.users -> stores (on delete cascade)
--   5. Tambah created_by (audit) pada tabel transaksional
--   6. Hapus 183 policy lama, tulis ulang dengan pola seragam per tenant + permission
--   7. Persempit GRANT (anon dicabut)
--   8. Trigger on_auth_user_created: buat stores + membership owner + COA default
-- ============================================================================

set check_function_bodies = off;

-- ============================================================================
-- 1. TABEL TENANCY
-- ============================================================================

create table public.stores (
  id                        uuid primary key default gen_random_uuid(),
  owner_id                  uuid references auth.users(id) on delete set null,
  name                      text not null default 'Ucup Kasir',
  subtitle                  text,
  address                   text default '',
  phone                     text default '',
  email                     text default '',
  tax_enabled               boolean default false,
  tax_rate                  numeric(5,2) default 0,
  currency                  text default 'IDR',
  receipt_footer            text default 'Terima kasih atas kunjungan Anda',
  default_credit_limit      real not null default 0,
  loading_rate_per_sack     numeric(14,2) not null default 0,
  unloading_rate_per_sack   numeric(14,2) not null default 0,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

comment on table public.stores is 'Toko (tenant). 1 pemilik = 1 toko; skema mendukung multi-store.';
comment on column public.stores.owner_id is 'Pemilik toko. Satu-satunya anggota ber-role owner.';
comment on column public.stores.loading_rate_per_sack is 'Tarif global upah bongkar muat per karung (Rp).';
comment on column public.stores.default_credit_limit is 'Limit kredit default customer (0 = tanpa batas).';

create table public.store_members (
  id          uuid primary key default gen_random_uuid(),
  store_id    uuid not null references public.stores(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        text not null check (role in ('owner','admin','kasir','gudang','keuangan')),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  unique (store_id, user_id)
);

comment on table public.store_members is 'Keanggotaan user pada sebuah toko + role-nya.';
comment on column public.store_members.user_id is 'Orang (auth.users). Di sini user_id memang berarti orang, bukan toko.';

create index store_members_user_active on public.store_members (user_id) where is_active;
create unique index one_owner_per_store on public.store_members (store_id) where role = 'owner';
create index store_members_store_idx on public.store_members (store_id);

create table public.role_permissions (
  role        text not null check (role in ('owner','admin','kasir','gudang','keuangan')),
  permission  text not null,
  primary key (role, permission)
);

comment on table public.role_permissions is 'Matriks permission per role. Sumber kebenaran untuk has_permission().';

insert into public.role_permissions (role, permission) values
  ('owner', 'customer.read'),
  ('admin', 'customer.read'),
  ('kasir', 'customer.read'),
  ('keuangan', 'customer.read'),
  ('owner', 'customer.write'),
  ('admin', 'customer.write'),
  ('kasir', 'customer.write'),
  ('owner', 'dashboard.read'),
  ('admin', 'dashboard.read'),
  ('kasir', 'dashboard.read'),
  ('gudang', 'dashboard.read'),
  ('keuangan', 'dashboard.read'),
  ('owner', 'finance.read'),
  ('admin', 'finance.read'),
  ('keuangan', 'finance.read'),
  ('owner', 'finance.write'),
  ('admin', 'finance.write'),
  ('keuangan', 'finance.write'),
  ('owner', 'hpp.read'),
  ('admin', 'hpp.read'),
  ('keuangan', 'hpp.read'),
  ('owner', 'hr.read'),
  ('owner', 'hr.write'),
  ('owner', 'invoice.payment.write'),
  ('admin', 'invoice.payment.write'),
  ('kasir', 'invoice.payment.write'),
  ('keuangan', 'invoice.payment.write'),
  ('owner', 'price.read'),
  ('admin', 'price.read'),
  ('owner', 'price.write'),
  ('admin', 'price.write'),
  ('owner', 'product.read'),
  ('admin', 'product.read'),
  ('kasir', 'product.read'),
  ('gudang', 'product.read'),
  ('keuangan', 'product.read'),
  ('owner', 'product.write'),
  ('admin', 'product.write'),
  ('gudang', 'product.write'),
  ('owner', 'purchasing.read'),
  ('admin', 'purchasing.read'),
  ('gudang', 'purchasing.read'),
  ('keuangan', 'purchasing.read'),
  ('owner', 'purchasing.write'),
  ('admin', 'purchasing.write'),
  ('gudang', 'purchasing.write'),
  ('owner', 'report.sales.read'),
  ('admin', 'report.sales.read'),
  ('keuangan', 'report.sales.read'),
  ('owner', 'settings.read'),
  ('admin', 'settings.read'),
  ('owner', 'settings.write'),
  ('admin', 'settings.write'),
  ('owner', 'shipping.read'),
  ('admin', 'shipping.read'),
  ('kasir', 'shipping.read'),
  ('gudang', 'shipping.read'),
  ('owner', 'shipping.write'),
  ('admin', 'shipping.write'),
  ('gudang', 'shipping.write'),
  ('owner', 'stock.read'),
  ('admin', 'stock.read'),
  ('gudang', 'stock.read'),
  ('owner', 'stock.write'),
  ('admin', 'stock.write'),
  ('gudang', 'stock.write'),
  ('owner', 'transaction.read'),
  ('admin', 'transaction.read'),
  ('kasir', 'transaction.read'),
  ('keuangan', 'transaction.read'),
  ('owner', 'transaction.void'),
  ('admin', 'transaction.void'),
  ('owner', 'transaction.write'),
  ('admin', 'transaction.write'),
  ('kasir', 'transaction.write'),
  ('owner', 'user.manage');

-- ============================================================================
-- 2. HELPER FUNCTIONS
--
-- SECURITY DEFINER supaya bisa membaca store_members tanpa rekursi RLS.
-- search_path dikunci (public, pg_temp) — mitigasi serangan search_path.
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
  order by created_at
  limit 1
$$;

comment on function public.current_store_id() is
  'Toko aktif milik user yang login. NULL bila belum jadi anggota toko mana pun.';

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
      and rp.permission = p
  )
$$;

comment on function public.has_permission(text) is
  'True bila user yang login punya permission tsb di toko mana pun tempat ia aktif.';

create or replace function public.current_store_role()
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select role
  from public.store_members
  where user_id = auth.uid() and is_active
  order by created_at
  limit 1
$$;

comment on function public.current_store_role() is 'Role user yang login pada toko aktifnya.';

-- ============================================================================
-- 3. RENAME user_id -> store_id pada 46 tabel bisnis
--    (notifications sengaja TETAP user_id: notifikasi milik orang, bukan toko)
-- ============================================================================

alter table public.attendance rename column user_id to store_id;
alter table public.categories rename column user_id to store_id;
alter table public.chart_of_accounts rename column user_id to store_id;
alter table public.closing_periods rename column user_id to store_id;
alter table public.customer_group_members rename column user_id to store_id;
alter table public.customer_groups rename column user_id to store_id;
alter table public.customer_price_matrix rename column user_id to store_id;
alter table public.customers rename column user_id to store_id;
alter table public.delivery_items rename column user_id to store_id;
alter table public.delivery_load_items rename column user_id to store_id;
alter table public.delivery_loaders rename column user_id to store_id;
alter table public.delivery_order_transactions rename column user_id to store_id;
alter table public.delivery_orders rename column user_id to store_id;
alter table public.delivery_tracking rename column user_id to store_id;
alter table public.employee_loan_payments rename column user_id to store_id;
alter table public.employee_loans rename column user_id to store_id;
alter table public.employees rename column user_id to store_id;
alter table public.goods_receipts rename column user_id to store_id;
alter table public.grn_items rename column user_id to store_id;
alter table public.journal_entries rename column user_id to store_id;
alter table public.journal_lines rename column user_id to store_id;
alter table public.payrolls rename column user_id to store_id;
alter table public.pi_items rename column user_id to store_id;
alter table public.pi_payments rename column user_id to store_id;
alter table public.po_items rename column user_id to store_id;
alter table public.price_tiers rename column user_id to store_id;
alter table public.products rename column user_id to store_id;
alter table public.purchase_invoices rename column user_id to store_id;
alter table public.purchase_orders rename column user_id to store_id;
alter table public.purchase_return_items rename column user_id to store_id;
alter table public.purchase_returns rename column user_id to store_id;
alter table public.return_items rename column user_id to store_id;
alter table public.returns rename column user_id to store_id;
alter table public.stock_adjustments rename column user_id to store_id;
alter table public.stock_alerts rename column user_id to store_id;
alter table public.stock_movements rename column user_id to store_id;
alter table public.stock_opname_items rename column user_id to store_id;
alter table public.stock_opnames rename column user_id to store_id;
alter table public.suppliers rename column user_id to store_id;
alter table public.transaction_item_payments rename column user_id to store_id;
alter table public.transaction_items rename column user_id to store_id;
alter table public.transaction_payments rename column user_id to store_id;
alter table public.transactions rename column user_id to store_id;
alter table public.trip_loaders rename column user_id to store_id;
alter table public.trips rename column user_id to store_id;
alter table public.vehicles rename column user_id to store_id;

-- Default kolom store_id kini mengikuti toko aktif, bukan user yang login
alter table public.attendance alter column store_id set default public.current_store_id();
alter table public.categories alter column store_id set default public.current_store_id();
alter table public.chart_of_accounts alter column store_id set default public.current_store_id();
alter table public.closing_periods alter column store_id set default public.current_store_id();
alter table public.customer_group_members alter column store_id set default public.current_store_id();
alter table public.customer_groups alter column store_id set default public.current_store_id();
alter table public.customer_price_matrix alter column store_id set default public.current_store_id();
alter table public.customers alter column store_id set default public.current_store_id();
alter table public.delivery_items alter column store_id set default public.current_store_id();
alter table public.delivery_load_items alter column store_id set default public.current_store_id();
alter table public.delivery_loaders alter column store_id set default public.current_store_id();
alter table public.delivery_order_transactions alter column store_id set default public.current_store_id();
alter table public.delivery_orders alter column store_id set default public.current_store_id();
alter table public.delivery_tracking alter column store_id set default public.current_store_id();
alter table public.employee_loan_payments alter column store_id set default public.current_store_id();
alter table public.employee_loans alter column store_id set default public.current_store_id();
alter table public.employees alter column store_id set default public.current_store_id();
alter table public.goods_receipts alter column store_id set default public.current_store_id();
alter table public.grn_items alter column store_id set default public.current_store_id();
alter table public.journal_entries alter column store_id set default public.current_store_id();
alter table public.journal_lines alter column store_id set default public.current_store_id();
alter table public.payrolls alter column store_id set default public.current_store_id();
alter table public.pi_items alter column store_id set default public.current_store_id();
alter table public.pi_payments alter column store_id set default public.current_store_id();
alter table public.po_items alter column store_id set default public.current_store_id();
alter table public.price_tiers alter column store_id set default public.current_store_id();
alter table public.products alter column store_id set default public.current_store_id();
alter table public.purchase_invoices alter column store_id set default public.current_store_id();
alter table public.purchase_orders alter column store_id set default public.current_store_id();
alter table public.purchase_return_items alter column store_id set default public.current_store_id();
alter table public.purchase_returns alter column store_id set default public.current_store_id();
alter table public.return_items alter column store_id set default public.current_store_id();
alter table public.returns alter column store_id set default public.current_store_id();
alter table public.stock_adjustments alter column store_id set default public.current_store_id();
alter table public.stock_alerts alter column store_id set default public.current_store_id();
alter table public.stock_movements alter column store_id set default public.current_store_id();
alter table public.stock_opname_items alter column store_id set default public.current_store_id();
alter table public.stock_opnames alter column store_id set default public.current_store_id();
alter table public.suppliers alter column store_id set default public.current_store_id();
alter table public.transaction_item_payments alter column store_id set default public.current_store_id();
alter table public.transaction_items alter column store_id set default public.current_store_id();
alter table public.transaction_payments alter column store_id set default public.current_store_id();
alter table public.transactions alter column store_id set default public.current_store_id();
alter table public.trip_loaders alter column store_id set default public.current_store_id();
alter table public.trips alter column store_id set default public.current_store_id();
alter table public.vehicles alter column store_id set default public.current_store_id();

-- ============================================================================
-- 4. FK store_id: auth.users -> stores (on delete cascade)
-- ============================================================================

alter table public.customer_group_members drop constraint customer_group_members_user_fk;
alter table public.customer_group_members add constraint customer_group_members_store_id_fkey foreign key (store_id) references public.stores(id) on delete cascade;
alter table public.customer_groups drop constraint customer_groups_user_fk;
alter table public.customer_groups add constraint customer_groups_store_id_fkey foreign key (store_id) references public.stores(id) on delete cascade;
alter table public.customer_price_matrix drop constraint customer_price_matrix_user_fk;
alter table public.customer_price_matrix add constraint customer_price_matrix_store_id_fkey foreign key (store_id) references public.stores(id) on delete cascade;
alter table public.delivery_load_items drop constraint delivery_load_items_user_id_fkey;
alter table public.delivery_load_items add constraint delivery_load_items_store_id_fkey foreign key (store_id) references public.stores(id) on delete cascade;
alter table public.delivery_loaders drop constraint delivery_loaders_user_id_fkey;
alter table public.delivery_loaders add constraint delivery_loaders_store_id_fkey foreign key (store_id) references public.stores(id) on delete cascade;
alter table public.delivery_order_transactions drop constraint delivery_order_transactions_user_id_fkey;
alter table public.delivery_order_transactions add constraint delivery_order_transactions_store_id_fkey foreign key (store_id) references public.stores(id) on delete cascade;
alter table public.employee_loan_payments drop constraint employee_loan_payments_user_id_fkey;
alter table public.employee_loan_payments add constraint employee_loan_payments_store_id_fkey foreign key (store_id) references public.stores(id) on delete cascade;
alter table public.employee_loans drop constraint employee_loans_user_id_fkey;
alter table public.employee_loans add constraint employee_loans_store_id_fkey foreign key (store_id) references public.stores(id) on delete cascade;
alter table public.price_tiers drop constraint price_tiers_user_fk;
alter table public.price_tiers add constraint price_tiers_store_id_fkey foreign key (store_id) references public.stores(id) on delete cascade;

-- ============================================================================
-- 5. Rename index/constraint yang namanya masih menyebut user_id
-- ============================================================================

alter table public.chart_of_accounts rename constraint chart_of_accounts_user_id_code_key to chart_of_accounts_store_id_code_key;
alter table public.delivery_orders rename constraint delivery_orders_user_id_do_number_key to delivery_orders_store_id_do_number_key;
alter index public.idx_employee_loan_payments_user_id rename to idx_employee_loan_payments_store_id;
alter index public.idx_employee_loans_user_id rename to idx_employee_loans_store_id;
alter index public.idx_notifications_user_id rename to idx_notifications_store_id;
alter table public.payrolls rename constraint payrolls_user_id_period_code_key to payrolls_store_id_period_code_key;
alter index public.idx_stock_adjustments_user_id rename to idx_stock_adjustments_store_id;
alter index public.idx_stock_alerts_user_id rename to idx_stock_alerts_store_id;
alter table public.stock_alerts rename constraint stock_alerts_user_id_product_id_key to stock_alerts_store_id_product_id_key;
alter index public.idx_stock_movements_user_id rename to idx_stock_movements_store_id;
alter index public.idx_stock_opnames_user_id rename to idx_stock_opnames_store_id;

-- ============================================================================
-- 6. Tambah created_by (audit: siapa yang input)
-- ============================================================================

alter table public.products add column created_by uuid default auth.uid() references auth.users(id) on delete set null;
alter table public.categories add column created_by uuid default auth.uid() references auth.users(id) on delete set null;
alter table public.customers add column created_by uuid default auth.uid() references auth.users(id) on delete set null;
alter table public.suppliers add column created_by uuid default auth.uid() references auth.users(id) on delete set null;
alter table public.employees add column created_by uuid default auth.uid() references auth.users(id) on delete set null;
alter table public.transactions add column created_by uuid default auth.uid() references auth.users(id) on delete set null;
alter table public.transaction_payments add column created_by uuid default auth.uid() references auth.users(id) on delete set null;
alter table public.returns add column created_by uuid default auth.uid() references auth.users(id) on delete set null;
alter table public.purchase_orders add column created_by uuid default auth.uid() references auth.users(id) on delete set null;
alter table public.goods_receipts add column created_by uuid default auth.uid() references auth.users(id) on delete set null;
alter table public.purchase_invoices add column created_by uuid default auth.uid() references auth.users(id) on delete set null;
alter table public.purchase_returns add column created_by uuid default auth.uid() references auth.users(id) on delete set null;
alter table public.journal_entries add column created_by uuid default auth.uid() references auth.users(id) on delete set null;
alter table public.closing_periods add column created_by uuid default auth.uid() references auth.users(id) on delete set null;
alter table public.delivery_orders add column created_by uuid default auth.uid() references auth.users(id) on delete set null;
alter table public.trips add column created_by uuid default auth.uid() references auth.users(id) on delete set null;
alter table public.vehicles add column created_by uuid default auth.uid() references auth.users(id) on delete set null;
alter table public.payrolls add column created_by uuid default auth.uid() references auth.users(id) on delete set null;
alter table public.price_tiers add column created_by uuid default auth.uid() references auth.users(id) on delete set null;
alter table public.customer_groups add column created_by uuid default auth.uid() references auth.users(id) on delete set null;
alter table public.customer_price_matrix add column created_by uuid default auth.uid() references auth.users(id) on delete set null;

-- stock_movements/stock_adjustments/stock_opnames/employee_loans/employee_loan_payments
-- sudah punya created_by sejak baseline; FK-nya tetap ke auth.users (itu orang).

-- ============================================================================
-- 7. store_settings dilebur ke stores (1:1 dengan toko)
-- ============================================================================

drop table public.store_settings;

-- fungsi trigger lama yang menulis ke store_settings sudah tidak dipakai
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.create_default_store_settings();

-- COA default kini per TOKO (bukan per user). Satu implementasi untuk semua
-- pemanggil; init_default_coa_for_current_user / _for_user / seed_default_accounts
-- / trigger_init_coa_on_first_transaction dihapus di 0003.
create or replace function public.init_default_coa_for_store(p_store_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if exists (select 1 from public.chart_of_accounts where store_id = p_store_id limit 1) then
    return;
  end if;

  insert into public.chart_of_accounts (store_id, code, name, type, normal_balance, is_system)
  values
    (p_store_id, '1-1000', 'Kas',                        'aset',       'debit',  true),
    (p_store_id, '1-1010', 'Bank',                       'aset',       'debit',  true),
    (p_store_id, '1-1100', 'Piutang Usaha',              'aset',       'debit',  true),
    (p_store_id, '1-1200', 'Persediaan Barang',          'aset',       'debit',  true),
    (p_store_id, '2-2000', 'Utang Usaha',                'kewajiban',  'kredit', true),
    (p_store_id, '3-3000', 'Modal Pemilik',              'ekuitas',    'kredit', true),
    (p_store_id, '3-3100', 'Laba Ditahan',               'ekuitas',    'kredit', true),
    (p_store_id, '4-4000', 'Pendapatan Penjualan',       'pendapatan', 'kredit', true),
    (p_store_id, '4-4100', 'Pendapatan Lainnya',         'pendapatan', 'kredit', true),
    (p_store_id, '5-5000', 'Harga Pokok Penjualan (HPP)', 'beban',     'debit',  true),
    (p_store_id, '5-5100', 'Beban Operasional',          'beban',      'debit',  true),
    (p_store_id, '5-5200', 'Beban Gaji',                 'beban',      'debit',  true),
    (p_store_id, '5-5300', 'Beban Sewa',                 'beban',      'debit',  true),
    (p_store_id, '5-5400', 'Beban Utilitas',             'beban',      'debit',  true),
    (p_store_id, '5-5500', 'Beban Transportasi',         'beban',      'debit',  true),
    (p_store_id, '5-5600', 'Beban Lainnya',              'beban',      'debit',  true)
  on conflict (store_id, code) do nothing;
end;
$$;

comment on function public.init_default_coa_for_store(uuid) is
  'Seed Chart of Accounts default untuk sebuah toko (idempoten).';

-- ============================================================================
-- 8. Index store_id untuk tabel yang belum punya index berawalan store_id
-- ============================================================================

create index attendance_store_idx on public.attendance (store_id);
create index categories_store_idx on public.categories (store_id);
create index customers_store_idx on public.customers (store_id);
create index delivery_items_store_idx on public.delivery_items (store_id);
create index delivery_load_items_store_idx on public.delivery_load_items (store_id);
create index delivery_loaders_store_idx on public.delivery_loaders (store_id);
create index delivery_order_transactions_store_idx on public.delivery_order_transactions (store_id);
create index delivery_tracking_store_idx on public.delivery_tracking (store_id);
create index grn_items_store_idx on public.grn_items (store_id);
create index journal_lines_store_idx on public.journal_lines (store_id);
create index pi_items_store_idx on public.pi_items (store_id);
create index pi_payments_store_idx on public.pi_payments (store_id);
create index po_items_store_idx on public.po_items (store_id);
create index products_store_idx on public.products (store_id);
create index purchase_return_items_store_idx on public.purchase_return_items (store_id);
create index return_items_store_idx on public.return_items (store_id);
create index returns_store_idx on public.returns (store_id);
create index stock_opname_items_store_idx on public.stock_opname_items (store_id);
create index transaction_items_store_idx on public.transaction_items (store_id);
create index transaction_payments_store_idx on public.transaction_payments (store_id);
create index trip_loaders_store_idx on public.trip_loaders (store_id);

-- ============================================================================
-- 9. RLS + POLICY
--
-- Semua 183 policy lama dihapus dan diganti pola seragam:
--   <tabel>_select : for select  to authenticated  using (tenant AND has_permission(read))
--   <tabel>_write  : for all     to authenticated  using (tenant AND has_permission(write))
--                                  with check (...)
--
-- (select current_store_id()) / (select has_permission(...)) dibungkus subquery
-- supaya Postgres mengevaluasinya SEKALI per query (InitPlan), bukan per baris.
-- anon tidak mendapat policy sama sekali -> ditolak.
-- ============================================================================

-- hapus seluruh policy lama
drop policy if exists "users can delete own attendance" on public.attendance;
drop policy if exists "users can insert own attendance" on public.attendance;
drop policy if exists "users can update own attendance" on public.attendance;
drop policy if exists "users can view own attendance" on public.attendance;
drop policy if exists "Enable delete access for all users" on public.categories;
drop policy if exists "Enable insert access for all users" on public.categories;
drop policy if exists "Enable update access for all users" on public.categories;
drop policy if exists categories_delete_own on public.categories;
drop policy if exists categories_insert_own on public.categories;
drop policy if exists categories_select_own on public.categories;
drop policy if exists categories_update_own on public.categories;
drop policy if exists coa_delete_own on public.chart_of_accounts;
drop policy if exists coa_insert_own on public.chart_of_accounts;
drop policy if exists coa_select_own on public.chart_of_accounts;
drop policy if exists coa_update_own on public.chart_of_accounts;
drop policy if exists closing_periods_delete_own on public.closing_periods;
drop policy if exists closing_periods_insert_own on public.closing_periods;
drop policy if exists closing_periods_select_own on public.closing_periods;
drop policy if exists closing_periods_update_own on public.closing_periods;
drop policy if exists "Users dapat delete customer_group_members mereka sendiri" on public.customer_group_members;
drop policy if exists "Users dapat insert customer_group_members mereka sendiri" on public.customer_group_members;
drop policy if exists "Users dapat melihat customer_group_members mereka sendiri" on public.customer_group_members;
drop policy if exists "Users dapat update customer_group_members mereka sendiri" on public.customer_group_members;
drop policy if exists "Users dapat delete customer_groups mereka sendiri" on public.customer_groups;
drop policy if exists "Users dapat insert customer_groups mereka sendiri" on public.customer_groups;
drop policy if exists "Users dapat melihat customer_groups mereka sendiri" on public.customer_groups;
drop policy if exists "Users dapat update customer_groups mereka sendiri" on public.customer_groups;
drop policy if exists "Users dapat delete customer_price_matrix mereka sendiri" on public.customer_price_matrix;
drop policy if exists "Users dapat insert customer_price_matrix mereka sendiri" on public.customer_price_matrix;
drop policy if exists "Users dapat melihat customer_price_matrix mereka sendiri" on public.customer_price_matrix;
drop policy if exists "Users dapat update customer_price_matrix mereka sendiri" on public.customer_price_matrix;
drop policy if exists customers_delete_own on public.customers;
drop policy if exists customers_insert_own on public.customers;
drop policy if exists customers_select_own on public.customers;
drop policy if exists customers_update_own on public.customers;
drop policy if exists delivery_items_delete_own on public.delivery_items;
drop policy if exists delivery_items_insert_own on public.delivery_items;
drop policy if exists delivery_items_select_own on public.delivery_items;
drop policy if exists delivery_items_update_own on public.delivery_items;
drop policy if exists delivery_load_items_user_is on public.delivery_load_items;
drop policy if exists delivery_loaders_user_is on public.delivery_loaders;
drop policy if exists delivery_order_transactions_user_is on public.delivery_order_transactions;
drop policy if exists delivery_orders_delete_own on public.delivery_orders;
drop policy if exists delivery_orders_insert_own on public.delivery_orders;
drop policy if exists delivery_orders_select_own on public.delivery_orders;
drop policy if exists delivery_orders_update_own on public.delivery_orders;
drop policy if exists delivery_tracking_delete_own on public.delivery_tracking;
drop policy if exists delivery_tracking_insert_own on public.delivery_tracking;
drop policy if exists delivery_tracking_select_own on public.delivery_tracking;
drop policy if exists employee_loan_payments_delete_own on public.employee_loan_payments;
drop policy if exists employee_loan_payments_insert_own on public.employee_loan_payments;
drop policy if exists employee_loan_payments_select_own on public.employee_loan_payments;
drop policy if exists employee_loan_payments_update_own on public.employee_loan_payments;
drop policy if exists employee_loans_delete_own on public.employee_loans;
drop policy if exists employee_loans_insert_own on public.employee_loans;
drop policy if exists employee_loans_select_own on public.employee_loans;
drop policy if exists employee_loans_update_own on public.employee_loans;
drop policy if exists "users can delete own employees" on public.employees;
drop policy if exists "users can insert own employees" on public.employees;
drop policy if exists "users can update own employees" on public.employees;
drop policy if exists "users can view own employees" on public.employees;
drop policy if exists grn_delete_own on public.goods_receipts;
drop policy if exists grn_insert_own on public.goods_receipts;
drop policy if exists grn_select_own on public.goods_receipts;
drop policy if exists grn_update_own on public.goods_receipts;
drop policy if exists grn_items_delete_own on public.grn_items;
drop policy if exists grn_items_insert_own on public.grn_items;
drop policy if exists grn_items_select_own on public.grn_items;
drop policy if exists grn_items_update_own on public.grn_items;
drop policy if exists journal_entries_delete_own on public.journal_entries;
drop policy if exists journal_entries_insert_own on public.journal_entries;
drop policy if exists journal_entries_select_own on public.journal_entries;
drop policy if exists journal_entries_update_own on public.journal_entries;
drop policy if exists journal_lines_delete_own on public.journal_lines;
drop policy if exists journal_lines_insert_own on public.journal_lines;
drop policy if exists journal_lines_select_own on public.journal_lines;
drop policy if exists journal_lines_update_own on public.journal_lines;
drop policy if exists "Users can create notifications" on public.notifications;
drop policy if exists "Users can delete their own notifications" on public.notifications;
drop policy if exists "Users can update their own notifications" on public.notifications;
drop policy if exists "Users can view their own notifications" on public.notifications;
drop policy if exists payrolls_delete_own on public.payrolls;
drop policy if exists payrolls_insert_own on public.payrolls;
drop policy if exists payrolls_select_own on public.payrolls;
drop policy if exists payrolls_update_own on public.payrolls;
drop policy if exists pi_items_delete_own on public.pi_items;
drop policy if exists pi_items_insert_own on public.pi_items;
drop policy if exists pi_items_select_own on public.pi_items;
drop policy if exists pi_items_update_own on public.pi_items;
drop policy if exists pi_payments_delete_own on public.pi_payments;
drop policy if exists pi_payments_insert_own on public.pi_payments;
drop policy if exists pi_payments_select_own on public.pi_payments;
drop policy if exists pi_payments_update_own on public.pi_payments;
drop policy if exists po_items_delete_own on public.po_items;
drop policy if exists po_items_insert_own on public.po_items;
drop policy if exists po_items_select_own on public.po_items;
drop policy if exists po_items_update_own on public.po_items;
drop policy if exists "Users dapat delete price_tiers mereka sendiri" on public.price_tiers;
drop policy if exists "Users dapat insert price_tiers mereka sendiri" on public.price_tiers;
drop policy if exists "Users dapat melihat price_tiers mereka sendiri" on public.price_tiers;
drop policy if exists "Users dapat update price_tiers mereka sendiri" on public.price_tiers;
drop policy if exists "Enable delete access for all users" on public.products;
drop policy if exists "Enable insert access for all users" on public.products;
drop policy if exists "Enable update access for all users" on public.products;
drop policy if exists products_delete_own on public.products;
drop policy if exists products_insert_own on public.products;
drop policy if exists products_select_own on public.products;
drop policy if exists products_update_own on public.products;
drop policy if exists pi_delete_own on public.purchase_invoices;
drop policy if exists pi_insert_own on public.purchase_invoices;
drop policy if exists pi_select_own on public.purchase_invoices;
drop policy if exists pi_update_own on public.purchase_invoices;
drop policy if exists po_delete_own on public.purchase_orders;
drop policy if exists po_insert_own on public.purchase_orders;
drop policy if exists po_select_own on public.purchase_orders;
drop policy if exists po_update_own on public.purchase_orders;
drop policy if exists pr_items_delete_own on public.purchase_return_items;
drop policy if exists pr_items_insert_own on public.purchase_return_items;
drop policy if exists pr_items_select_own on public.purchase_return_items;
drop policy if exists pr_items_update_own on public.purchase_return_items;
drop policy if exists pr_delete_own on public.purchase_returns;
drop policy if exists pr_insert_own on public.purchase_returns;
drop policy if exists pr_select_own on public.purchase_returns;
drop policy if exists pr_update_own on public.purchase_returns;
drop policy if exists return_items_delete_own on public.return_items;
drop policy if exists return_items_insert_own on public.return_items;
drop policy if exists return_items_select_own on public.return_items;
drop policy if exists return_items_update_own on public.return_items;
drop policy if exists returns_delete_own on public.returns;
drop policy if exists returns_insert_own on public.returns;
drop policy if exists returns_select_own on public.returns;
drop policy if exists returns_update_own on public.returns;
drop policy if exists "Users can create stock adjustments" on public.stock_adjustments;
drop policy if exists "Users can view their own stock adjustments" on public.stock_adjustments;
drop policy if exists "Users can create stock alerts" on public.stock_alerts;
drop policy if exists "Users can delete their own stock alerts" on public.stock_alerts;
drop policy if exists "Users can update their own stock alerts" on public.stock_alerts;
drop policy if exists "Users can view their own stock alerts" on public.stock_alerts;
drop policy if exists "Users can create stock movements" on public.stock_movements;
drop policy if exists "Users can view their own stock movements" on public.stock_movements;
drop policy if exists "Users can create stock opname items" on public.stock_opname_items;
drop policy if exists "Users can delete their own stock opname items" on public.stock_opname_items;
drop policy if exists "Users can update their own stock opname items" on public.stock_opname_items;
drop policy if exists "Users can view their own stock opname items" on public.stock_opname_items;
drop policy if exists "Users can create stock opnames" on public.stock_opnames;
drop policy if exists "Users can update their own stock opnames" on public.stock_opnames;
drop policy if exists "Users can view their own stock opnames" on public.stock_opnames;
drop policy if exists suppliers_delete_own on public.suppliers;
drop policy if exists suppliers_insert_own on public.suppliers;
drop policy if exists suppliers_select_own on public.suppliers;
drop policy if exists suppliers_update_own on public.suppliers;
drop policy if exists item_payments_delete_own on public.transaction_item_payments;
drop policy if exists item_payments_insert_own on public.transaction_item_payments;
drop policy if exists item_payments_select_own on public.transaction_item_payments;
drop policy if exists item_payments_update_own on public.transaction_item_payments;
drop policy if exists transaction_items_delete_own on public.transaction_items;
drop policy if exists transaction_items_insert_own on public.transaction_items;
drop policy if exists transaction_items_select_own on public.transaction_items;
drop policy if exists transaction_items_update_own on public.transaction_items;
drop policy if exists transaction_payments_delete_own on public.transaction_payments;
drop policy if exists transaction_payments_insert_own on public.transaction_payments;
drop policy if exists transaction_payments_select_own on public.transaction_payments;
drop policy if exists transaction_payments_update_own on public.transaction_payments;
drop policy if exists transactions_delete_own on public.transactions;
drop policy if exists transactions_insert_own on public.transactions;
drop policy if exists transactions_select_own on public.transactions;
drop policy if exists transactions_update_own on public.transactions;
drop policy if exists trip_loaders_delete_own on public.trip_loaders;
drop policy if exists trip_loaders_insert_own on public.trip_loaders;
drop policy if exists trip_loaders_select_own on public.trip_loaders;
drop policy if exists trip_loaders_update_own on public.trip_loaders;
drop policy if exists trips_delete_own on public.trips;
drop policy if exists trips_insert_own on public.trips;
drop policy if exists trips_select_own on public.trips;
drop policy if exists trips_update_own on public.trips;
drop policy if exists vehicles_delete_own on public.vehicles;
drop policy if exists vehicles_insert_own on public.vehicles;
drop policy if exists vehicles_select_own on public.vehicles;
drop policy if exists vehicles_update_own on public.vehicles;

-- stores: anggota boleh lihat tokonya; hanya settings.write yang boleh ubah
alter table public.stores enable row level security;

create policy stores_select on public.stores
  for select to authenticated
  using (id = (select public.current_store_id()));

create policy stores_update on public.stores
  for update to authenticated
  using (id = (select public.current_store_id()) and (select public.has_permission('settings.write')))
  with check (id = (select public.current_store_id()) and (select public.has_permission('settings.write')));

-- store_members: anggota boleh lihat daftar anggota; kelola hanya dengan user.manage
alter table public.store_members enable row level security;

create policy store_members_select on public.store_members
  for select to authenticated
  using (store_id = (select public.current_store_id()));

create policy store_members_write on public.store_members
  for all to authenticated
  using (store_id = (select public.current_store_id()) and (select public.has_permission('user.manage')))
  with check (store_id = (select public.current_store_id()) and (select public.has_permission('user.manage')));

-- role_permissions: matriks global, boleh dibaca semua user login, tidak bisa ditulis via API
alter table public.role_permissions enable row level security;

create policy role_permissions_select on public.role_permissions
  for select to authenticated
  using (true);

-- attendance
alter table public.attendance enable row level security;

create policy attendance_select on public.attendance
  for select to authenticated
  using ((store_id = (select current_store_id())) and (select has_permission('hr.read')));

create policy attendance_write on public.attendance
  for all to authenticated
  using ((store_id = (select current_store_id())) and (select has_permission('hr.write')))
  with check ((store_id = (select current_store_id())) and (select has_permission('hr.write')));

-- categories
alter table public.categories enable row level security;

create policy categories_select on public.categories
  for select to authenticated
  using ((store_id = (select current_store_id())) and (select has_permission('product.read')));

create policy categories_write on public.categories
  for all to authenticated
  using ((store_id = (select current_store_id())) and (select has_permission('product.write')))
  with check ((store_id = (select current_store_id())) and (select has_permission('product.write')));

-- chart_of_accounts
alter table public.chart_of_accounts enable row level security;

create policy chart_of_accounts_select on public.chart_of_accounts
  for select to authenticated
  using ((store_id = (select current_store_id())) and (select has_permission('finance.read')));

create policy chart_of_accounts_write on public.chart_of_accounts
  for all to authenticated
  using ((store_id = (select current_store_id())) and (select has_permission('finance.write')))
  with check ((store_id = (select current_store_id())) and (select has_permission('finance.write')));

-- closing_periods
alter table public.closing_periods enable row level security;

create policy closing_periods_select on public.closing_periods
  for select to authenticated
  using ((store_id = (select current_store_id())) and (select has_permission('finance.read')));

create policy closing_periods_write on public.closing_periods
  for all to authenticated
  using ((store_id = (select current_store_id())) and (select has_permission('finance.write')))
  with check ((store_id = (select current_store_id())) and (select has_permission('finance.write')));

-- customer_group_members
alter table public.customer_group_members enable row level security;

create policy customer_group_members_select on public.customer_group_members
  for select to authenticated
  using ((store_id = (select current_store_id())) and (select has_permission('customer.read')));

create policy customer_group_members_write on public.customer_group_members
  for all to authenticated
  using ((store_id = (select current_store_id())) and (select has_permission('price.write')))
  with check ((store_id = (select current_store_id())) and (select has_permission('price.write')));

-- customer_groups
alter table public.customer_groups enable row level security;

create policy customer_groups_select on public.customer_groups
  for select to authenticated
  using ((store_id = (select current_store_id())) and (select has_permission('customer.read')));

create policy customer_groups_write on public.customer_groups
  for all to authenticated
  using ((store_id = (select current_store_id())) and (select has_permission('price.write')))
  with check ((store_id = (select current_store_id())) and (select has_permission('price.write')));

-- customer_price_matrix
alter table public.customer_price_matrix enable row level security;

create policy customer_price_matrix_select on public.customer_price_matrix
  for select to authenticated
  using ((store_id = (select current_store_id())) and (select has_permission('price.read')));

create policy customer_price_matrix_write on public.customer_price_matrix
  for all to authenticated
  using ((store_id = (select current_store_id())) and (select has_permission('price.write')))
  with check ((store_id = (select current_store_id())) and (select has_permission('price.write')));

-- customers
alter table public.customers enable row level security;

create policy customers_select on public.customers
  for select to authenticated
  using ((store_id = (select current_store_id())) and (select has_permission('customer.read')));

create policy customers_write on public.customers
  for all to authenticated
  using ((store_id = (select current_store_id())) and (select has_permission('customer.write')))
  with check ((store_id = (select current_store_id())) and (select has_permission('customer.write')));

-- delivery_items
alter table public.delivery_items enable row level security;

create policy delivery_items_select on public.delivery_items
  for select to authenticated
  using ((store_id = (select current_store_id())) and (select has_permission('shipping.read')));

create policy delivery_items_write on public.delivery_items
  for all to authenticated
  using ((store_id = (select current_store_id())) and (select has_permission('shipping.write')))
  with check ((store_id = (select current_store_id())) and (select has_permission('shipping.write')));

-- delivery_load_items
alter table public.delivery_load_items enable row level security;

create policy delivery_load_items_select on public.delivery_load_items
  for select to authenticated
  using ((store_id = (select current_store_id())) and (select has_permission('shipping.read')));

create policy delivery_load_items_write on public.delivery_load_items
  for all to authenticated
  using ((store_id = (select current_store_id())) and (select has_permission('shipping.write')))
  with check ((store_id = (select current_store_id())) and (select has_permission('shipping.write')));

-- delivery_loaders
alter table public.delivery_loaders enable row level security;

create policy delivery_loaders_select on public.delivery_loaders
  for select to authenticated
  using ((store_id = (select current_store_id())) and (select has_permission('shipping.read')));

create policy delivery_loaders_write on public.delivery_loaders
  for all to authenticated
  using ((store_id = (select current_store_id())) and (select has_permission('shipping.write')))
  with check ((store_id = (select current_store_id())) and (select has_permission('shipping.write')));

-- delivery_order_transactions
alter table public.delivery_order_transactions enable row level security;

create policy delivery_order_transactions_select on public.delivery_order_transactions
  for select to authenticated
  using ((store_id = (select current_store_id())) and (select has_permission('shipping.read')));

create policy delivery_order_transactions_write on public.delivery_order_transactions
  for all to authenticated
  using ((store_id = (select current_store_id())) and (select has_permission('shipping.write')))
  with check ((store_id = (select current_store_id())) and (select has_permission('shipping.write')));

-- delivery_orders
alter table public.delivery_orders enable row level security;

create policy delivery_orders_select on public.delivery_orders
  for select to authenticated
  using ((store_id = (select current_store_id())) and (select has_permission('shipping.read')));

create policy delivery_orders_write on public.delivery_orders
  for all to authenticated
  using ((store_id = (select current_store_id())) and (select has_permission('shipping.write')))
  with check ((store_id = (select current_store_id())) and (select has_permission('shipping.write')));

-- delivery_tracking
alter table public.delivery_tracking enable row level security;

create policy delivery_tracking_select on public.delivery_tracking
  for select to authenticated
  using ((store_id = (select current_store_id())) and (select has_permission('shipping.read')));

create policy delivery_tracking_write on public.delivery_tracking
  for all to authenticated
  using ((store_id = (select current_store_id())) and (select has_permission('shipping.write')))
  with check ((store_id = (select current_store_id())) and (select has_permission('shipping.write')));

-- employee_loan_payments
alter table public.employee_loan_payments enable row level security;

create policy employee_loan_payments_select on public.employee_loan_payments
  for select to authenticated
  using ((store_id = (select current_store_id())) and (select has_permission('hr.read')));

create policy employee_loan_payments_write on public.employee_loan_payments
  for all to authenticated
  using ((store_id = (select current_store_id())) and (select has_permission('hr.write')))
  with check ((store_id = (select current_store_id())) and (select has_permission('hr.write')));

-- employee_loans
alter table public.employee_loans enable row level security;

create policy employee_loans_select on public.employee_loans
  for select to authenticated
  using ((store_id = (select current_store_id())) and (select has_permission('hr.read')));

create policy employee_loans_write on public.employee_loans
  for all to authenticated
  using ((store_id = (select current_store_id())) and (select has_permission('hr.write')))
  with check ((store_id = (select current_store_id())) and (select has_permission('hr.write')));

-- employees
alter table public.employees enable row level security;

create policy employees_select on public.employees
  for select to authenticated
  using ((store_id = (select current_store_id())) and (select has_permission('hr.read')));

create policy employees_write on public.employees
  for all to authenticated
  using ((store_id = (select current_store_id())) and (select has_permission('hr.write')))
  with check ((store_id = (select current_store_id())) and (select has_permission('hr.write')));

-- goods_receipts
alter table public.goods_receipts enable row level security;

create policy goods_receipts_select on public.goods_receipts
  for select to authenticated
  using ((store_id = (select current_store_id())) and (select has_permission('purchasing.read')));

create policy goods_receipts_write on public.goods_receipts
  for all to authenticated
  using ((store_id = (select current_store_id())) and (select has_permission('purchasing.write')))
  with check ((store_id = (select current_store_id())) and (select has_permission('purchasing.write')));

-- grn_items
alter table public.grn_items enable row level security;

create policy grn_items_select on public.grn_items
  for select to authenticated
  using ((store_id = (select current_store_id())) and (select has_permission('purchasing.read')));

create policy grn_items_write on public.grn_items
  for all to authenticated
  using ((store_id = (select current_store_id())) and (select has_permission('purchasing.write')))
  with check ((store_id = (select current_store_id())) and (select has_permission('purchasing.write')));

-- journal_entries
alter table public.journal_entries enable row level security;

create policy journal_entries_select on public.journal_entries
  for select to authenticated
  using ((store_id = (select current_store_id())) and (select has_permission('finance.read')));

create policy journal_entries_write on public.journal_entries
  for all to authenticated
  using ((store_id = (select current_store_id())) and (select has_permission('finance.write')))
  with check ((store_id = (select current_store_id())) and (select has_permission('finance.write')));

-- journal_lines
alter table public.journal_lines enable row level security;

create policy journal_lines_select on public.journal_lines
  for select to authenticated
  using ((store_id = (select current_store_id())) and (select has_permission('finance.read')));

create policy journal_lines_write on public.journal_lines
  for all to authenticated
  using ((store_id = (select current_store_id())) and (select has_permission('finance.write')))
  with check ((store_id = (select current_store_id())) and (select has_permission('finance.write')));

-- payrolls
alter table public.payrolls enable row level security;

create policy payrolls_select on public.payrolls
  for select to authenticated
  using ((store_id = (select current_store_id())) and (select has_permission('hr.read')));

create policy payrolls_write on public.payrolls
  for all to authenticated
  using ((store_id = (select current_store_id())) and (select has_permission('hr.write')))
  with check ((store_id = (select current_store_id())) and (select has_permission('hr.write')));

-- pi_items
alter table public.pi_items enable row level security;

create policy pi_items_select on public.pi_items
  for select to authenticated
  using ((store_id = (select current_store_id())) and (select has_permission('purchasing.read')));

create policy pi_items_write on public.pi_items
  for all to authenticated
  using ((store_id = (select current_store_id())) and (select has_permission('purchasing.write')))
  with check ((store_id = (select current_store_id())) and (select has_permission('purchasing.write')));

-- pi_payments
alter table public.pi_payments enable row level security;

create policy pi_payments_select on public.pi_payments
  for select to authenticated
  using ((store_id = (select current_store_id())) and (select has_permission('purchasing.read')));

create policy pi_payments_write on public.pi_payments
  for all to authenticated
  using ((store_id = (select current_store_id())) and (select has_permission('purchasing.write')))
  with check ((store_id = (select current_store_id())) and (select has_permission('purchasing.write')));

-- po_items
alter table public.po_items enable row level security;

create policy po_items_select on public.po_items
  for select to authenticated
  using ((store_id = (select current_store_id())) and (select has_permission('purchasing.read')));

create policy po_items_write on public.po_items
  for all to authenticated
  using ((store_id = (select current_store_id())) and (select has_permission('purchasing.write')))
  with check ((store_id = (select current_store_id())) and (select has_permission('purchasing.write')));

-- price_tiers
alter table public.price_tiers enable row level security;

create policy price_tiers_select on public.price_tiers
  for select to authenticated
  using ((store_id = (select current_store_id())) and (select has_permission('price.read')));

create policy price_tiers_write on public.price_tiers
  for all to authenticated
  using ((store_id = (select current_store_id())) and (select has_permission('price.write')))
  with check ((store_id = (select current_store_id())) and (select has_permission('price.write')));

-- products
alter table public.products enable row level security;

create policy products_select on public.products
  for select to authenticated
  using ((store_id = (select current_store_id())) and (select has_permission('product.read')));

create policy products_write on public.products
  for all to authenticated
  using ((store_id = (select current_store_id())) and (select has_permission('product.write')))
  with check ((store_id = (select current_store_id())) and (select has_permission('product.write')));

-- purchase_invoices
alter table public.purchase_invoices enable row level security;

create policy purchase_invoices_select on public.purchase_invoices
  for select to authenticated
  using ((store_id = (select current_store_id())) and (select has_permission('purchasing.read')));

create policy purchase_invoices_write on public.purchase_invoices
  for all to authenticated
  using ((store_id = (select current_store_id())) and (select has_permission('purchasing.write')))
  with check ((store_id = (select current_store_id())) and (select has_permission('purchasing.write')));

-- purchase_orders
alter table public.purchase_orders enable row level security;

create policy purchase_orders_select on public.purchase_orders
  for select to authenticated
  using ((store_id = (select current_store_id())) and (select has_permission('purchasing.read')));

create policy purchase_orders_write on public.purchase_orders
  for all to authenticated
  using ((store_id = (select current_store_id())) and (select has_permission('purchasing.write')))
  with check ((store_id = (select current_store_id())) and (select has_permission('purchasing.write')));

-- purchase_return_items
alter table public.purchase_return_items enable row level security;

create policy purchase_return_items_select on public.purchase_return_items
  for select to authenticated
  using ((store_id = (select current_store_id())) and (select has_permission('purchasing.read')));

create policy purchase_return_items_write on public.purchase_return_items
  for all to authenticated
  using ((store_id = (select current_store_id())) and (select has_permission('purchasing.write')))
  with check ((store_id = (select current_store_id())) and (select has_permission('purchasing.write')));

-- purchase_returns
alter table public.purchase_returns enable row level security;

create policy purchase_returns_select on public.purchase_returns
  for select to authenticated
  using ((store_id = (select current_store_id())) and (select has_permission('purchasing.read')));

create policy purchase_returns_write on public.purchase_returns
  for all to authenticated
  using ((store_id = (select current_store_id())) and (select has_permission('purchasing.write')))
  with check ((store_id = (select current_store_id())) and (select has_permission('purchasing.write')));

-- return_items
alter table public.return_items enable row level security;

create policy return_items_select on public.return_items
  for select to authenticated
  using ((store_id = (select current_store_id())) and (select has_permission('transaction.read')));

create policy return_items_write on public.return_items
  for all to authenticated
  using ((store_id = (select current_store_id())) and (select has_permission('transaction.write')))
  with check ((store_id = (select current_store_id())) and (select has_permission('transaction.write')));

-- returns
alter table public.returns enable row level security;

create policy returns_select on public.returns
  for select to authenticated
  using ((store_id = (select current_store_id())) and (select has_permission('transaction.read')));

create policy returns_write on public.returns
  for all to authenticated
  using ((store_id = (select current_store_id())) and (select has_permission('transaction.write')))
  with check ((store_id = (select current_store_id())) and (select has_permission('transaction.write')));

-- stock_adjustments
alter table public.stock_adjustments enable row level security;

create policy stock_adjustments_select on public.stock_adjustments
  for select to authenticated
  using ((store_id = (select current_store_id())) and (select has_permission('stock.read')));

create policy stock_adjustments_write on public.stock_adjustments
  for all to authenticated
  using ((store_id = (select current_store_id())) and (select has_permission('stock.write')))
  with check ((store_id = (select current_store_id())) and (select has_permission('stock.write')));

-- stock_alerts
alter table public.stock_alerts enable row level security;

create policy stock_alerts_select on public.stock_alerts
  for select to authenticated
  using ((store_id = (select current_store_id())) and (select has_permission('stock.read')));

create policy stock_alerts_write on public.stock_alerts
  for all to authenticated
  using ((store_id = (select current_store_id())) and (select has_permission('stock.write')))
  with check ((store_id = (select current_store_id())) and (select has_permission('stock.write')));

-- stock_movements
alter table public.stock_movements enable row level security;

create policy stock_movements_select on public.stock_movements
  for select to authenticated
  using ((store_id = (select current_store_id())) and (select has_permission('stock.read')));

create policy stock_movements_write on public.stock_movements
  for all to authenticated
  using ((store_id = (select current_store_id())) and (select has_permission('stock.write')))
  with check ((store_id = (select current_store_id())) and (select has_permission('stock.write')));

-- stock_opname_items
alter table public.stock_opname_items enable row level security;

create policy stock_opname_items_select on public.stock_opname_items
  for select to authenticated
  using ((store_id = (select current_store_id())) and (select has_permission('stock.read')));

create policy stock_opname_items_write on public.stock_opname_items
  for all to authenticated
  using ((store_id = (select current_store_id())) and (select has_permission('stock.write')))
  with check ((store_id = (select current_store_id())) and (select has_permission('stock.write')));

-- stock_opnames
alter table public.stock_opnames enable row level security;

create policy stock_opnames_select on public.stock_opnames
  for select to authenticated
  using ((store_id = (select current_store_id())) and (select has_permission('stock.read')));

create policy stock_opnames_write on public.stock_opnames
  for all to authenticated
  using ((store_id = (select current_store_id())) and (select has_permission('stock.write')))
  with check ((store_id = (select current_store_id())) and (select has_permission('stock.write')));

-- suppliers
alter table public.suppliers enable row level security;

create policy suppliers_select on public.suppliers
  for select to authenticated
  using ((store_id = (select current_store_id())) and (select has_permission('purchasing.read')));

create policy suppliers_write on public.suppliers
  for all to authenticated
  using ((store_id = (select current_store_id())) and (select has_permission('purchasing.write')))
  with check ((store_id = (select current_store_id())) and (select has_permission('purchasing.write')));

-- transaction_item_payments
alter table public.transaction_item_payments enable row level security;

create policy transaction_item_payments_select on public.transaction_item_payments
  for select to authenticated
  using ((store_id = (select current_store_id())) and (select has_permission('transaction.read')));

create policy transaction_item_payments_write on public.transaction_item_payments
  for all to authenticated
  using ((store_id = (select current_store_id())) and (select has_permission('transaction.write') or has_permission('invoice.payment.write')))
  with check ((store_id = (select current_store_id())) and (select has_permission('transaction.write') or has_permission('invoice.payment.write')));

-- transaction_items
alter table public.transaction_items enable row level security;

create policy transaction_items_select on public.transaction_items
  for select to authenticated
  using ((store_id = (select current_store_id())) and (select has_permission('transaction.read')));

create policy transaction_items_write on public.transaction_items
  for all to authenticated
  using ((store_id = (select current_store_id())) and (select has_permission('transaction.write')))
  with check ((store_id = (select current_store_id())) and (select has_permission('transaction.write')));

-- transaction_payments
alter table public.transaction_payments enable row level security;

create policy transaction_payments_select on public.transaction_payments
  for select to authenticated
  using ((store_id = (select current_store_id())) and (select has_permission('transaction.read')));

create policy transaction_payments_write on public.transaction_payments
  for all to authenticated
  using ((store_id = (select current_store_id())) and (select has_permission('transaction.write') or has_permission('invoice.payment.write')))
  with check ((store_id = (select current_store_id())) and (select has_permission('transaction.write') or has_permission('invoice.payment.write')));

-- transactions
alter table public.transactions enable row level security;

create policy transactions_select on public.transactions
  for select to authenticated
  using ((store_id = (select current_store_id())) and (select has_permission('transaction.read')));

create policy transactions_write on public.transactions
  for all to authenticated
  using ((store_id = (select current_store_id())) and (select has_permission('transaction.write')))
  with check ((store_id = (select current_store_id())) and (select has_permission('transaction.write')));

-- trip_loaders
alter table public.trip_loaders enable row level security;

create policy trip_loaders_select on public.trip_loaders
  for select to authenticated
  using ((store_id = (select current_store_id())) and (select has_permission('shipping.read')));

create policy trip_loaders_write on public.trip_loaders
  for all to authenticated
  using ((store_id = (select current_store_id())) and (select has_permission('shipping.write')))
  with check ((store_id = (select current_store_id())) and (select has_permission('shipping.write')));

-- trips
alter table public.trips enable row level security;

create policy trips_select on public.trips
  for select to authenticated
  using ((store_id = (select current_store_id())) and (select has_permission('shipping.read')));

create policy trips_write on public.trips
  for all to authenticated
  using ((store_id = (select current_store_id())) and (select has_permission('shipping.write')))
  with check ((store_id = (select current_store_id())) and (select has_permission('shipping.write')));

-- vehicles
alter table public.vehicles enable row level security;

create policy vehicles_select on public.vehicles
  for select to authenticated
  using ((store_id = (select current_store_id())) and (select has_permission('shipping.read')));

create policy vehicles_write on public.vehicles
  for all to authenticated
  using ((store_id = (select current_store_id())) and (select has_permission('shipping.write')))
  with check ((store_id = (select current_store_id())) and (select has_permission('shipping.write')));

-- notifications: milik ORANG (user_id), bukan toko
alter table public.notifications enable row level security;

create policy notifications_own on public.notifications
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ============================================================================
-- 10. GRANT — anon dicabut total; authenticated dibatasi ke DML (RLS tetap berlaku)
-- ============================================================================

-- PENTING: EXECUTE pada fungsi baru di-grant ke PUBLIC secara default oleh Postgres.
-- Revoke dari PUBLIC dulu, baru beri ke role yang berhak — kalau hanya revoke dari
-- anon, anon tetap bisa memanggil lewat warisan PUBLIC.
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke all on all functions in schema public from public;
revoke all on all functions in schema public from anon;

-- PENTING: baseline (0001) memberi `authenticated` DELETE, INSERT, REFERENCES,
-- SELECT, TRIGGER, TRUNCATE, UPDATE pada SEMUA tabel. TRUNCATE dan REFERENCES/
-- TRIGGER TIDAK tunduk pada RLS — kasir bisa `truncate public.notifications` dan
-- menghapus data SEMUA toko. Jadi cabut SEMUA dulu, baru beri DML saja.
-- (GRANT saja tidak cukup: hak lama tetap menempel.)
revoke all on all tables in schema public from authenticated;
revoke all on all sequences in schema public from authenticated;

grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant execute on all functions in schema public to authenticated;

grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

-- anon tidak mendapat akses tabel/fungsi apa pun di schema public.
-- Halaman signin/signup memakai Supabase Auth (schema auth), bukan public.

-- ============================================================================
-- 11. TRIGGER on_auth_user_created
--
-- User baru -> buat toko + membership owner + COA default untuk toko itu.
-- Menggantikan create_default_store_settings() (tabel store_settings sudah dihapus).
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_store_id uuid;
  v_store_name text;
begin
  v_store_name := coalesce(nullif(new.raw_user_meta_data->>'store_name', ''), 'Ucup Kasir');

  insert into public.stores (owner_id, name)
  values (new.id, v_store_name)
  returning id into v_store_id;

  insert into public.store_members (store_id, user_id, role)
  values (v_store_id, new.id, 'owner');

  perform public.init_default_coa_for_store(v_store_id);

  return new;
end;
$$;

comment on function public.handle_new_user() is
  'Trigger auth.users: setiap user baru otomatis jadi owner sebuah toko baru + COA default.';

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

