-- ============================================================================
-- 0001_baseline.sql
--
-- Reproduksi 1:1 skema LIVE project xkfvukkpjrjqqqroujqs
-- (diambil 2026-11-26 via introspecti pg_catalog, bukan dari 74 file migrasi lama
--  yang sudah drift).
--
-- Tabel: 48 | constraint: 182 | index: 162 | fungsi: 71 | trigger: 34 | policy: 183 | view: 1
--
-- CATATAN KEAMANAN: baseline ini sengaja mempertahankan kondisi live apa adanya,
-- termasuk 3 lubang yang ditemukan saat audit (S1 view tanpa security_invoker,
-- S2 policy `true` pada products/categories, S3 54 fungsi SECURITY DEFINER).
-- Ketiganya diperbaiki di 0002/0003, bukan di sini, supaya diff-nya bisa direview.
-- ============================================================================

set check_function_bodies = off;

create extension if not exists pgcrypto with schema extensions;

-- ============================================================================
-- TABEL
-- ============================================================================

create table public.attendance (
  id uuid default gen_random_uuid() not null,
  user_id uuid default auth.uid() not null,
  employee_id uuid not null,
  attendance_date date not null,
  check_in timestamp with time zone,
  check_out timestamp with time zone,
  status text default 'hadir'::text not null,
  overtime_minutes integer default 0,
  notes text,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table public.categories (
  id uuid default gen_random_uuid() not null,
  name character varying(255) not null,
  description text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  user_id uuid default auth.uid() not null
);

create table public.chart_of_accounts (
  id uuid default gen_random_uuid() not null,
  user_id uuid default auth.uid() not null,
  code text not null,
  name text not null,
  type text not null,
  normal_balance text default 'debit'::text not null,
  is_active boolean default true not null,
  is_system boolean default false not null,
  parent_id uuid,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table public.closing_periods (
  id uuid default gen_random_uuid() not null,
  user_id uuid default auth.uid() not null,
  period_start date not null,
  period_end date not null,
  closed_at timestamp with time zone default now() not null,
  closed_by uuid default auth.uid() not null,
  notes text,
  status text default 'closed'::text not null,
  snapshot_balances jsonb,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table public.customer_group_members (
  id uuid default gen_random_uuid() not null,
  user_id uuid default auth.uid() not null,
  group_id uuid not null,
  customer_id uuid not null,
  created_at timestamp with time zone default now()
);

create table public.customer_groups (
  id uuid default gen_random_uuid() not null,
  user_id uuid default auth.uid() not null,
  name text not null,
  notes text,
  is_active boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table public.customer_price_matrix (
  id uuid default gen_random_uuid() not null,
  user_id uuid default auth.uid() not null,
  customer_id uuid,
  product_id uuid not null,
  custom_price numeric not null,
  min_quantity integer default 1,
  is_active boolean default true,
  start_date date,
  end_date date,
  notes text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  group_id uuid
);

create table public.customers (
  id uuid default gen_random_uuid() not null,
  user_id uuid default auth.uid() not null,
  name text not null,
  phone text,
  address text,
  notes text,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  kecamatan text,
  store_name text,
  credit_limit real default 0 not null
);

create table public.delivery_items (
  id uuid default gen_random_uuid() not null,
  user_id uuid default auth.uid() not null,
  delivery_order_id uuid not null,
  product_id uuid,
  product_name text not null,
  quantity numeric(12,2) default 0 not null,
  created_at timestamp with time zone default now() not null
);

create table public.delivery_load_items (
  id uuid default gen_random_uuid() not null,
  user_id uuid default auth.uid() not null,
  delivery_order_id uuid not null,
  product_name text not null,
  quantity numeric default 0 not null,
  unit_price numeric default 0 not null,
  created_at timestamp with time zone default now() not null
);

create table public.delivery_loaders (
  id uuid default gen_random_uuid() not null,
  user_id uuid default auth.uid() not null,
  delivery_order_id uuid not null,
  employee_id uuid not null,
  employee_name text,
  created_at timestamp with time zone default now() not null
);

create table public.delivery_order_transactions (
  id uuid default gen_random_uuid() not null,
  user_id uuid default auth.uid() not null,
  delivery_order_id uuid not null,
  transaction_id uuid not null,
  created_at timestamp with time zone default now() not null
);

create table public.delivery_orders (
  id uuid default gen_random_uuid() not null,
  user_id uuid default auth.uid() not null,
  do_number text not null,
  do_date date not null,
  customer_id uuid,
  customer_name text,
  customer_address text,
  vehicle_id uuid,
  driver_id uuid,
  driver_name text,
  notes text,
  status text default 'draft'::text not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  trip_id uuid,
  driver_fee numeric(12,2) default 0
);

create table public.delivery_tracking (
  id uuid default gen_random_uuid() not null,
  user_id uuid default auth.uid() not null,
  delivery_order_id uuid not null,
  status text default 'draft'::text not null,
  note text,
  created_at timestamp with time zone default now() not null
);

create table public.employee_loan_payments (
  id uuid default gen_random_uuid() not null,
  user_id uuid default auth.uid() not null,
  loan_id uuid not null,
  payroll_id uuid,
  payment_date date default CURRENT_DATE not null,
  amount numeric(15,2) not null,
  notes text,
  created_at timestamp with time zone default now(),
  created_by uuid
);

create table public.employee_loans (
  id uuid default gen_random_uuid() not null,
  user_id uuid default auth.uid() not null,
  employee_id uuid not null,
  loan_date date default CURRENT_DATE not null,
  amount numeric(15,2) not null,
  remaining_amount numeric(15,2) not null,
  description text,
  status character varying(20) default 'active'::character varying not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  created_by uuid,
  updated_by uuid
);

create table public.employees (
  id uuid default gen_random_uuid() not null,
  user_id uuid default auth.uid() not null,
  employee_code text not null,
  name text not null,
  gender text,
  birth_place text,
  birth_date date,
  phone text,
  email text,
  address text,
  identity_type text,
  identity_number text,
  join_date date,
  resign_date date,
  status text default 'aktif'::text not null,
  salary_type text default 'bulanan'::text not null,
  base_salary numeric(14,2) default 0 not null,
  bank_name text,
  bank_account_number text,
  bank_account_name text,
  npwp text,
  notes text,
  is_active boolean default true not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  position text
);

create table public.goods_receipts (
  id uuid default gen_random_uuid() not null,
  user_id uuid default auth.uid() not null,
  grn_number text not null,
  po_id uuid,
  supplier_id uuid,
  supplier_name text,
  receipt_date timestamp with time zone default now() not null,
  status text default 'draft'::text not null,
  total numeric(14,2) default 0 not null,
  notes text,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table public.grn_items (
  id uuid default gen_random_uuid() not null,
  user_id uuid default auth.uid() not null,
  grn_id uuid not null,
  po_item_id uuid,
  product_id uuid,
  product_name text not null,
  quantity_received numeric(14,2) default 0 not null,
  quantity_rejected numeric(14,2) default 0 not null,
  price numeric(14,2) default 0 not null,
  subtotal numeric(14,2) default 0 not null,
  created_at timestamp with time zone default now() not null
);

create table public.journal_entries (
  id uuid default gen_random_uuid() not null,
  user_id uuid default auth.uid() not null,
  journal_number text default ((('JRN-'::text || to_char(now(), 'YYYYMMDD'::text)) || '-'::text) || upper(substr(md5((random())::text), 1, 6))) not null,
  entry_date timestamp with time zone default now() not null,
  description text not null,
  reference_type text,
  reference_id uuid,
  status text default 'posted'::text not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table public.journal_lines (
  id uuid default gen_random_uuid() not null,
  user_id uuid default auth.uid() not null,
  journal_id uuid not null,
  account_id uuid not null,
  account_code text not null,
  account_name text not null,
  debit numeric(14,2) default 0 not null,
  credit numeric(14,2) default 0 not null,
  created_at timestamp with time zone default now() not null
);

create table public.notifications (
  id uuid default gen_random_uuid() not null,
  user_id uuid default auth.uid() not null,
  type text not null,
  title text not null,
  message text not null,
  data jsonb,
  is_read boolean default false,
  created_at timestamp with time zone default now() not null,
  read_at timestamp with time zone
);

create table public.payrolls (
  id uuid default gen_random_uuid() not null,
  user_id uuid default auth.uid() not null,
  employee_id uuid not null,
  period_code text not null,
  period_start date not null,
  period_end date not null,
  base_salary numeric(14,2) default 0 not null,
  incentive_amount numeric(14,2) default 0 not null,
  kasbon_deduction numeric(14,2) default 0 not null,
  total_net numeric(14,2) default 0 not null,
  status text default 'draft'::text not null,
  journal_entry_id uuid,
  paid_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  incentive_details jsonb
);

create table public.pi_items (
  id uuid default gen_random_uuid() not null,
  user_id uuid default auth.uid() not null,
  pi_id uuid not null,
  grn_item_id uuid,
  product_id uuid,
  product_name text not null,
  quantity numeric(14,2) default 0 not null,
  price numeric(14,2) default 0 not null,
  subtotal numeric(14,2) default 0 not null,
  created_at timestamp with time zone default now() not null
);

create table public.pi_payments (
  id uuid default gen_random_uuid() not null,
  user_id uuid default auth.uid() not null,
  pi_id uuid not null,
  amount numeric(14,2) default 0 not null,
  payment_method text default 'tunai'::text not null,
  notes text,
  created_at timestamp with time zone default now() not null
);

create table public.po_items (
  id uuid default gen_random_uuid() not null,
  user_id uuid default auth.uid() not null,
  po_id uuid not null,
  product_id uuid,
  product_name text not null,
  quantity numeric(14,2) default 0 not null,
  price numeric(14,2) default 0 not null,
  discount numeric(14,2) default 0 not null,
  subtotal numeric(14,2) default 0 not null,
  received_quantity numeric(14,2) default 0 not null,
  created_at timestamp with time zone default now() not null
);

create table public.price_tiers (
  id uuid default gen_random_uuid() not null,
  user_id uuid default auth.uid() not null,
  product_id uuid not null,
  min_quantity integer not null,
  max_quantity integer,
  tier_price numeric not null,
  tier_name text,
  is_active boolean default true,
  start_date date,
  end_date date,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table public.products (
  id uuid default gen_random_uuid() not null,
  name character varying(255) not null,
  description text,
  category_id uuid,
  price_buy numeric(10,2) default 0 not null,
  stock integer default 0 not null,
  sku character varying(100),
  barcode character varying(100),
  image_url text,
  is_active boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  price_modal numeric(10,2) default 0,
  price_sell numeric(10,2) default 0 not null,
  user_id uuid default auth.uid() not null,
  minimum_stock integer default 10 not null
);

create table public.purchase_invoices (
  id uuid default gen_random_uuid() not null,
  user_id uuid default auth.uid() not null,
  pi_number text not null,
  grn_id uuid,
  po_id uuid,
  supplier_id uuid,
  supplier_name text,
  invoice_date timestamp with time zone default now() not null,
  due_date timestamp with time zone,
  subtotal numeric(14,2) default 0 not null,
  discount numeric(14,2) default 0 not null,
  tax numeric(14,2) default 0 not null,
  shipping_cost numeric(14,2) default 0 not null,
  total numeric(14,2) default 0 not null,
  paid_amount numeric(14,2) default 0 not null,
  remaining_amount numeric(14,2) default 0 not null,
  payment_status text default 'belum_lunas'::text not null,
  notes text,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table public.purchase_orders (
  id uuid default gen_random_uuid() not null,
  user_id uuid default auth.uid() not null,
  po_number text not null,
  supplier_id uuid,
  supplier_name text,
  po_date timestamp with time zone default now() not null,
  expected_date timestamp with time zone,
  status text default 'draft'::text not null,
  subtotal numeric(14,2) default 0 not null,
  discount numeric(14,2) default 0 not null,
  tax numeric(14,2) default 0 not null,
  shipping_cost numeric(14,2) default 0 not null,
  total numeric(14,2) default 0 not null,
  notes text,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table public.purchase_return_items (
  id uuid default gen_random_uuid() not null,
  user_id uuid default auth.uid() not null,
  pr_id uuid not null,
  product_id uuid,
  product_name text not null,
  quantity numeric(14,2) default 0 not null,
  price numeric(14,2) default 0 not null,
  price_buy numeric(14,2) default 0 not null,
  subtotal numeric(14,2) default 0 not null,
  created_at timestamp with time zone default now() not null
);

create table public.purchase_returns (
  id uuid default gen_random_uuid() not null,
  user_id uuid default auth.uid() not null,
  pr_number text not null,
  grn_id uuid,
  pi_id uuid,
  supplier_id uuid,
  supplier_name text,
  return_date timestamp with time zone default now() not null,
  total_refund numeric(14,2) default 0 not null,
  reason text default 'cacat'::text not null,
  notes text,
  status text default 'completed'::text not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table public.return_items (
  id uuid default gen_random_uuid() not null,
  user_id uuid default auth.uid() not null,
  return_id uuid not null,
  product_id uuid,
  product_name text not null,
  price numeric(12,2) default 0 not null,
  quantity integer default 1 not null,
  subtotal numeric(12,2) default 0 not null,
  created_at timestamp with time zone default now() not null,
  price_buy numeric(12,2) default 0 not null
);

create table public.returns (
  id uuid default gen_random_uuid() not null,
  user_id uuid default auth.uid() not null,
  transaction_id uuid not null,
  return_number text default ((('RTR-'::text || to_char(now(), 'YYYYMMDD'::text)) || '-'::text) || upper(substr(md5((random())::text), 1, 6))) not null,
  total_refund numeric(12,2) default 0 not null,
  notes text,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table public.stock_adjustments (
  id uuid default gen_random_uuid() not null,
  user_id uuid default auth.uid() not null,
  product_id uuid not null,
  adjustment_type text not null,
  quantity_before integer not null,
  quantity_after integer not null,
  quantity_change integer not null,
  reason text not null,
  notes text,
  created_at timestamp with time zone default now() not null,
  created_by uuid default auth.uid()
);

create table public.stock_alerts (
  id uuid default gen_random_uuid() not null,
  user_id uuid default auth.uid() not null,
  product_id uuid not null,
  minimum_stock integer default 10 not null,
  alert_enabled boolean default true,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table public.stock_movements (
  id uuid default gen_random_uuid() not null,
  user_id uuid default auth.uid() not null,
  product_id uuid not null,
  movement_type text not null,
  quantity integer not null,
  quantity_before integer default 0 not null,
  quantity_after integer default 0 not null,
  reference_type text,
  reference_id uuid,
  notes text,
  created_at timestamp with time zone default now() not null,
  created_by uuid default auth.uid()
);

create table public.stock_opname_items (
  id uuid default gen_random_uuid() not null,
  user_id uuid default auth.uid() not null,
  opname_id uuid not null,
  product_id uuid not null,
  system_quantity integer not null,
  actual_quantity integer not null,
  difference integer not null,
  notes text,
  created_at timestamp with time zone default now() not null
);

create table public.stock_opnames (
  id uuid default gen_random_uuid() not null,
  user_id uuid default auth.uid() not null,
  opname_number text default ((('OPN-'::text || to_char(now(), 'YYYYMMDD'::text)) || '-'::text) || upper(substr(md5((random())::text), 1, 6))) not null,
  opname_date date default CURRENT_DATE not null,
  status text default 'draft'::text not null,
  notes text,
  created_at timestamp with time zone default now() not null,
  completed_at timestamp with time zone,
  created_by uuid default auth.uid()
);

create table public.store_settings (
  id uuid default gen_random_uuid() not null,
  user_id uuid default auth.uid() not null,
  store_name text default 'Ucup Kasir'::text not null,
  store_subtitle text default 'Toko Berkat Jaya Makmur'::text,
  store_address text default ''::text,
  store_phone text default ''::text,
  store_email text default ''::text,
  tax_enabled boolean default false,
  tax_rate numeric(5,2) default 0,
  currency text default 'IDR'::text,
  receipt_footer text default 'Terima kasih atas kunjungan Anda'::text,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  default_credit_limit real default 0 not null,
  loading_rate_per_sack numeric(14,2) default 0 not null,
  unloading_rate_per_sack numeric(14,2) default 0 not null
);

create table public.suppliers (
  id uuid default gen_random_uuid() not null,
  user_id uuid default auth.uid() not null,
  name text not null,
  contact_person text,
  phone text,
  email text,
  address text,
  supplier_type text default 'langsung'::text not null,
  payment_term text default 'tunai'::text not null,
  credit_limit numeric(14,2) default 0 not null,
  notes text,
  is_active boolean default true not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table public.transaction_item_payments (
  id uuid default gen_random_uuid() not null,
  user_id uuid default auth.uid() not null,
  transaction_id uuid not null,
  item_id uuid not null,
  payment_id uuid not null,
  allocated_amount numeric(12,2) default 0 not null,
  notes text,
  created_at timestamp with time zone default now() not null
);

create table public.transaction_items (
  id uuid default gen_random_uuid() not null,
  user_id uuid default auth.uid() not null,
  transaction_id uuid not null,
  product_id uuid,
  product_name text not null,
  price numeric(12,2) default 0 not null,
  quantity integer default 1 not null,
  subtotal numeric(12,2) default 0 not null,
  created_at timestamp with time zone default now() not null
);

create table public.transaction_payments (
  id uuid default gen_random_uuid() not null,
  user_id uuid default auth.uid() not null,
  transaction_id uuid not null,
  amount numeric(12,2) default 0 not null,
  payment_method text default 'tunai'::text not null,
  notes text,
  created_at timestamp with time zone default now() not null,
  payment_date date default CURRENT_DATE not null
);

create table public.transactions (
  id uuid default gen_random_uuid() not null,
  user_id uuid default auth.uid() not null,
  transaction_number text default ((('TRX-'::text || to_char(now(), 'YYYYMMDD'::text)) || '-'::text) || upper(substr(md5((random())::text), 1, 6))) not null,
  customer_id uuid,
  customer_name text,
  subtotal numeric(12,2) default 0 not null,
  discount numeric(12,2) default 0 not null,
  total numeric(12,2) default 0 not null,
  payment_method text default 'tunai'::text not null,
  paid_amount numeric(12,2) default 0 not null,
  change_amount numeric(12,2) default 0 not null,
  status text default 'selesai'::text not null,
  notes text,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  remaining_amount numeric(12,2) default 0 not null,
  payment_status text default 'belum_lunas'::text not null,
  shipping_cost numeric(12,2) default 0 not null,
  return_amount numeric(12,2) default 0 not null,
  transaction_status text default 'disiapkan'::text not null
);

create table public.trip_loaders (
  id uuid default gen_random_uuid() not null,
  user_id uuid default auth.uid() not null,
  trip_id uuid not null,
  employee_id uuid not null,
  employee_name text,
  role text not null,
  created_at timestamp with time zone default now() not null
);

create table public.trips (
  id uuid default gen_random_uuid() not null,
  user_id uuid default auth.uid() not null,
  trip_number text not null,
  trip_date date not null,
  vehicle_id uuid,
  driver_id uuid,
  driver_name text,
  notes text,
  status text default 'draft'::text not null,
  muat_rate numeric(14,2),
  bongkar_rate numeric(14,2),
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table public.vehicles (
  id uuid default gen_random_uuid() not null,
  user_id uuid default auth.uid() not null,
  plate_number text not null,
  vehicle_type text not null,
  brand text,
  capacity_kg numeric(12,2) default 0 not null,
  status text default 'tersedia'::text not null,
  is_active boolean default true not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

-- ============================================================================
-- CONSTRAINT (PK / UNIQUE / CHECK / FK), ditambahkan setelah semua tabel ada
-- ============================================================================

alter table public.attendance add constraint attendance_pkey PRIMARY KEY (id);
alter table public.categories add constraint categories_pkey PRIMARY KEY (id);
alter table public.chart_of_accounts add constraint chart_of_accounts_pkey PRIMARY KEY (id);
alter table public.closing_periods add constraint closing_periods_pkey PRIMARY KEY (id);
alter table public.customer_group_members add constraint customer_group_members_pkey PRIMARY KEY (id);
alter table public.customer_groups add constraint customer_groups_pkey PRIMARY KEY (id);
alter table public.customer_price_matrix add constraint customer_price_matrix_pkey PRIMARY KEY (id);
alter table public.customers add constraint customers_pkey PRIMARY KEY (id);
alter table public.delivery_items add constraint delivery_items_pkey PRIMARY KEY (id);
alter table public.delivery_load_items add constraint delivery_load_items_pkey PRIMARY KEY (id);
alter table public.delivery_loaders add constraint delivery_loaders_pkey PRIMARY KEY (id);
alter table public.delivery_order_transactions add constraint delivery_order_transactions_pkey PRIMARY KEY (id);
alter table public.delivery_orders add constraint delivery_orders_pkey PRIMARY KEY (id);
alter table public.delivery_tracking add constraint delivery_tracking_pkey PRIMARY KEY (id);
alter table public.employee_loan_payments add constraint employee_loan_payments_pkey PRIMARY KEY (id);
alter table public.employee_loans add constraint employee_loans_pkey PRIMARY KEY (id);
alter table public.employees add constraint employees_pkey PRIMARY KEY (id);
alter table public.goods_receipts add constraint goods_receipts_pkey PRIMARY KEY (id);
alter table public.grn_items add constraint grn_items_pkey PRIMARY KEY (id);
alter table public.journal_entries add constraint journal_entries_pkey PRIMARY KEY (id);
alter table public.journal_lines add constraint journal_lines_pkey PRIMARY KEY (id);
alter table public.notifications add constraint notifications_pkey PRIMARY KEY (id);
alter table public.payrolls add constraint payrolls_pkey PRIMARY KEY (id);
alter table public.pi_items add constraint pi_items_pkey PRIMARY KEY (id);
alter table public.pi_payments add constraint pi_payments_pkey PRIMARY KEY (id);
alter table public.po_items add constraint po_items_pkey PRIMARY KEY (id);
alter table public.price_tiers add constraint price_tiers_pkey PRIMARY KEY (id);
alter table public.products add constraint products_pkey PRIMARY KEY (id);
alter table public.purchase_invoices add constraint purchase_invoices_pkey PRIMARY KEY (id);
alter table public.purchase_orders add constraint purchase_orders_pkey PRIMARY KEY (id);
alter table public.purchase_return_items add constraint purchase_return_items_pkey PRIMARY KEY (id);
alter table public.purchase_returns add constraint purchase_returns_pkey PRIMARY KEY (id);
alter table public.return_items add constraint return_items_pkey PRIMARY KEY (id);
alter table public.returns add constraint returns_pkey PRIMARY KEY (id);
alter table public.stock_adjustments add constraint stock_adjustments_pkey PRIMARY KEY (id);
alter table public.stock_alerts add constraint stock_alerts_pkey PRIMARY KEY (id);
alter table public.stock_movements add constraint stock_movements_pkey PRIMARY KEY (id);
alter table public.stock_opname_items add constraint stock_opname_items_pkey PRIMARY KEY (id);
alter table public.stock_opnames add constraint stock_opnames_pkey PRIMARY KEY (id);
alter table public.store_settings add constraint store_settings_pkey PRIMARY KEY (id);
alter table public.suppliers add constraint suppliers_pkey PRIMARY KEY (id);
alter table public.transaction_item_payments add constraint transaction_item_payments_pkey PRIMARY KEY (id);
alter table public.transaction_items add constraint transaction_items_pkey PRIMARY KEY (id);
alter table public.transaction_payments add constraint transaction_payments_pkey PRIMARY KEY (id);
alter table public.transactions add constraint transactions_pkey PRIMARY KEY (id);
alter table public.trip_loaders add constraint trip_loaders_pkey PRIMARY KEY (id);
alter table public.trips add constraint trips_pkey PRIMARY KEY (id);
alter table public.vehicles add constraint vehicles_pkey PRIMARY KEY (id);
alter table public.attendance add constraint attendance_employee_id_attendance_date_key UNIQUE (employee_id, attendance_date);
alter table public.chart_of_accounts add constraint chart_of_accounts_user_id_code_key UNIQUE (user_id, code);
alter table public.closing_periods add constraint unique_period UNIQUE (user_id, period_start, period_end);
alter table public.customer_group_members add constraint customer_group_members_unique UNIQUE (group_id, customer_id);
alter table public.customer_price_matrix add constraint customer_price_matrix_unique UNIQUE (user_id, customer_id, product_id, start_date);
alter table public.delivery_loaders add constraint delivery_loaders_delivery_order_id_employee_id_key UNIQUE (delivery_order_id, employee_id);
alter table public.delivery_order_transactions add constraint delivery_order_transactions_delivery_order_id_transaction_i_key UNIQUE (delivery_order_id, transaction_id);
alter table public.delivery_orders add constraint delivery_orders_user_id_do_number_key UNIQUE (user_id, do_number);
alter table public.payrolls add constraint payrolls_user_id_period_code_key UNIQUE (user_id, period_code);
alter table public.price_tiers add constraint price_tiers_unique_range UNIQUE (user_id, product_id, min_quantity, start_date);
alter table public.products add constraint products_sku_key UNIQUE (sku);
alter table public.stock_alerts add constraint stock_alerts_user_id_product_id_key UNIQUE (user_id, product_id);
alter table public.stock_opnames add constraint stock_opnames_opname_number_key UNIQUE (opname_number);
alter table public.store_settings add constraint store_settings_user_id_key UNIQUE (user_id);
alter table public.trip_loaders add constraint trip_loaders_trip_id_employee_id_role_key UNIQUE (trip_id, employee_id, role);
alter table public.attendance add constraint attendance_status_check CHECK ((status = ANY (ARRAY['hadir'::text, 'izin'::text, 'sakit'::text, 'cuti'::text, 'alpa'::text])));
alter table public.chart_of_accounts add constraint chart_of_accounts_normal_balance_check CHECK ((normal_balance = ANY (ARRAY['debit'::text, 'kredit'::text])));
alter table public.chart_of_accounts add constraint chart_of_accounts_type_check CHECK ((type = ANY (ARRAY['aset'::text, 'kewajiban'::text, 'ekuitas'::text, 'pendapatan'::text, 'beban'::text])));
alter table public.closing_periods add constraint closing_periods_status_check CHECK ((status = ANY (ARRAY['closed'::text, 'reopened'::text])));
alter table public.closing_periods add constraint valid_period CHECK ((period_end >= period_start));
alter table public.customer_price_matrix add constraint customer_price_matrix_custom_price_check CHECK ((custom_price >= (0)::numeric));
alter table public.customer_price_matrix add constraint customer_price_matrix_date_check CHECK (((end_date IS NULL) OR (end_date >= start_date)));
alter table public.customer_price_matrix add constraint customer_price_matrix_min_quantity_check CHECK ((min_quantity > 0));
alter table public.customer_price_matrix add constraint customer_price_matrix_target_check CHECK ((((customer_id IS NOT NULL) AND (group_id IS NULL)) OR ((customer_id IS NULL) AND (group_id IS NOT NULL))));
alter table public.delivery_orders add constraint delivery_orders_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'disiapkan'::text, 'dikirim'::text, 'selesai'::text, 'batal'::text])));
alter table public.delivery_tracking add constraint delivery_tracking_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'disiapkan'::text, 'dikirim'::text, 'selesai'::text, 'batal'::text])));
alter table public.employee_loan_payments add constraint employee_loan_payments_amount_check CHECK ((amount > (0)::numeric));
alter table public.employee_loans add constraint employee_loans_amount_check CHECK ((amount > (0)::numeric));
alter table public.employee_loans add constraint employee_loans_remaining_amount_check CHECK ((remaining_amount >= (0)::numeric));
alter table public.employee_loans add constraint employee_loans_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'paid'::character varying, 'cancelled'::character varying])::text[])));
alter table public.employees add constraint employees_gender_check CHECK ((gender = ANY (ARRAY['laki_laki'::text, 'perempuan'::text])));
alter table public.employees add constraint employees_position_check CHECK (("position" = ANY (ARRAY['supir'::text, 'loader'::text])));
alter table public.employees add constraint employees_salary_type_check CHECK ((salary_type = ANY (ARRAY['bulanan'::text, 'harian'::text, 'mingguan'::text])));
alter table public.employees add constraint employees_status_check CHECK ((status = ANY (ARRAY['aktif'::text, 'cuti'::text, 'nonaktif'::text, 'keluar'::text])));
alter table public.goods_receipts add constraint goods_receipts_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'completed'::text, 'cancelled'::text])));
alter table public.journal_entries add constraint journal_entries_reference_type_check CHECK ((reference_type = ANY (ARRAY['manual'::text, 'transaction'::text, 'return'::text, 'payment'::text, 'void'::text, 'purchase'::text, 'purchase_payment'::text, 'purchase_return'::text, 'payroll'::text, 'closing'::text, 'reclassify'::text, 'stock_adjustment'::text, 'adjusting'::text])));
alter table public.journal_entries add constraint journal_entries_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'posted'::text, 'void'::text])));
alter table public.notifications add constraint notifications_type_check CHECK ((type = ANY (ARRAY['stock_alert'::text, 'transaction'::text, 'return'::text, 'system'::text, 'payment'::text])));
alter table public.payrolls add constraint payrolls_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'paid'::text])));
alter table public.price_tiers add constraint price_tiers_check CHECK (((max_quantity IS NULL) OR (max_quantity >= min_quantity)));
alter table public.price_tiers add constraint price_tiers_date_check CHECK (((end_date IS NULL) OR (end_date >= start_date)));
alter table public.price_tiers add constraint price_tiers_min_quantity_check CHECK ((min_quantity > 0));
alter table public.price_tiers add constraint price_tiers_tier_price_check CHECK ((tier_price >= (0)::numeric));
alter table public.purchase_invoices add constraint purchase_invoices_payment_status_check CHECK ((payment_status = ANY (ARRAY['belum_lunas'::text, 'sebagian'::text, 'lunas'::text])));
alter table public.purchase_orders add constraint purchase_orders_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'submitted'::text, 'confirmed'::text, 'partial'::text, 'completed'::text, 'cancelled'::text])));
alter table public.purchase_returns add constraint purchase_returns_reason_check CHECK ((reason = ANY (ARRAY['cacat'::text, 'salah_produk'::text, 'kadaluarsa'::text, 'rusak_kirim'::text, 'lainnya'::text])));
alter table public.purchase_returns add constraint purchase_returns_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'completed'::text, 'cancelled'::text])));
alter table public.stock_adjustments add constraint stock_adjustments_adjustment_type_check CHECK ((adjustment_type = ANY (ARRAY['add'::text, 'subtract'::text, 'correction'::text])));
alter table public.stock_movements add constraint stock_movements_movement_type_check CHECK ((movement_type = ANY (ARRAY['in'::text, 'out'::text, 'adjustment'::text, 'opname'::text, 'return'::text])));
alter table public.stock_opnames add constraint stock_opnames_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'completed'::text, 'cancelled'::text])));
alter table public.suppliers add constraint suppliers_payment_term_check CHECK ((payment_term = ANY (ARRAY['tunai'::text, '7'::text, '14'::text, '30'::text])));
alter table public.suppliers add constraint suppliers_supplier_type_check CHECK ((supplier_type = ANY (ARRAY['langsung'::text, 'distributor'::text, 'grosir'::text, 'importir'::text])));
alter table public.transaction_item_payments add constraint positive_allocated_amount CHECK ((allocated_amount > (0)::numeric));
alter table public.trip_loaders add constraint trip_loaders_role_check CHECK ((role = ANY (ARRAY['muat'::text, 'bongkar'::text])));
alter table public.trips add constraint trips_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'berjalan'::text, 'selesai'::text])));
alter table public.vehicles add constraint vehicles_status_check CHECK ((status = ANY (ARRAY['tersedia'::text, 'dipakai'::text, 'service'::text])));
alter table public.attendance add constraint attendance_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE;
alter table public.chart_of_accounts add constraint chart_of_accounts_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES chart_of_accounts(id) ON DELETE SET NULL;
alter table public.customer_group_members add constraint customer_group_members_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE;
alter table public.customer_group_members add constraint customer_group_members_group_id_fkey FOREIGN KEY (group_id) REFERENCES customer_groups(id) ON DELETE CASCADE;
alter table public.customer_group_members add constraint customer_group_members_user_fk FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.customer_groups add constraint customer_groups_user_fk FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.customer_price_matrix add constraint customer_price_matrix_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE;
alter table public.customer_price_matrix add constraint customer_price_matrix_group_id_fkey FOREIGN KEY (group_id) REFERENCES customer_groups(id) ON DELETE CASCADE;
alter table public.customer_price_matrix add constraint customer_price_matrix_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;
alter table public.customer_price_matrix add constraint customer_price_matrix_user_fk FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.delivery_items add constraint delivery_items_delivery_order_id_fkey FOREIGN KEY (delivery_order_id) REFERENCES delivery_orders(id) ON DELETE CASCADE;
alter table public.delivery_items add constraint delivery_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL;
alter table public.delivery_load_items add constraint delivery_load_items_delivery_order_id_fkey FOREIGN KEY (delivery_order_id) REFERENCES delivery_orders(id) ON DELETE CASCADE;
alter table public.delivery_load_items add constraint delivery_load_items_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.delivery_loaders add constraint delivery_loaders_delivery_order_id_fkey FOREIGN KEY (delivery_order_id) REFERENCES delivery_orders(id) ON DELETE CASCADE;
alter table public.delivery_loaders add constraint delivery_loaders_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE;
alter table public.delivery_loaders add constraint delivery_loaders_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.delivery_order_transactions add constraint delivery_order_transactions_delivery_order_id_fkey FOREIGN KEY (delivery_order_id) REFERENCES delivery_orders(id) ON DELETE CASCADE;
alter table public.delivery_order_transactions add constraint delivery_order_transactions_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE;
alter table public.delivery_order_transactions add constraint delivery_order_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.delivery_orders add constraint delivery_orders_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL;
alter table public.delivery_orders add constraint delivery_orders_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES employees(id) ON DELETE SET NULL;
alter table public.delivery_orders add constraint delivery_orders_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE SET NULL;
alter table public.delivery_orders add constraint delivery_orders_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL;
alter table public.delivery_tracking add constraint delivery_tracking_delivery_order_id_fkey FOREIGN KEY (delivery_order_id) REFERENCES delivery_orders(id) ON DELETE CASCADE;
alter table public.employee_loan_payments add constraint employee_loan_payments_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
alter table public.employee_loan_payments add constraint employee_loan_payments_loan_id_fkey FOREIGN KEY (loan_id) REFERENCES employee_loans(id) ON DELETE CASCADE;
alter table public.employee_loan_payments add constraint employee_loan_payments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.employee_loans add constraint employee_loans_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
alter table public.employee_loans add constraint employee_loans_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE;
alter table public.employee_loans add constraint employee_loans_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);
alter table public.employee_loans add constraint employee_loans_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.goods_receipts add constraint goods_receipts_po_id_fkey FOREIGN KEY (po_id) REFERENCES purchase_orders(id) ON DELETE SET NULL;
alter table public.goods_receipts add constraint goods_receipts_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL;
alter table public.grn_items add constraint grn_items_grn_id_fkey FOREIGN KEY (grn_id) REFERENCES goods_receipts(id) ON DELETE CASCADE;
alter table public.grn_items add constraint grn_items_po_item_id_fkey FOREIGN KEY (po_item_id) REFERENCES po_items(id) ON DELETE SET NULL;
alter table public.grn_items add constraint grn_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL;
alter table public.journal_lines add constraint journal_lines_account_id_fkey FOREIGN KEY (account_id) REFERENCES chart_of_accounts(id);
alter table public.journal_lines add constraint journal_lines_journal_id_fkey FOREIGN KEY (journal_id) REFERENCES journal_entries(id) ON DELETE CASCADE;
alter table public.payrolls add constraint payrolls_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE;
alter table public.payrolls add constraint payrolls_journal_entry_id_fkey FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id) ON DELETE SET NULL;
alter table public.pi_items add constraint pi_items_grn_item_id_fkey FOREIGN KEY (grn_item_id) REFERENCES grn_items(id) ON DELETE SET NULL;
alter table public.pi_items add constraint pi_items_pi_id_fkey FOREIGN KEY (pi_id) REFERENCES purchase_invoices(id) ON DELETE CASCADE;
alter table public.pi_items add constraint pi_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL;
alter table public.pi_payments add constraint pi_payments_pi_id_fkey FOREIGN KEY (pi_id) REFERENCES purchase_invoices(id) ON DELETE CASCADE;
alter table public.po_items add constraint po_items_po_id_fkey FOREIGN KEY (po_id) REFERENCES purchase_orders(id) ON DELETE CASCADE;
alter table public.po_items add constraint po_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL;
alter table public.price_tiers add constraint price_tiers_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;
alter table public.price_tiers add constraint price_tiers_user_fk FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.products add constraint products_category_id_fkey FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL;
alter table public.purchase_invoices add constraint purchase_invoices_grn_id_fkey FOREIGN KEY (grn_id) REFERENCES goods_receipts(id) ON DELETE SET NULL;
alter table public.purchase_invoices add constraint purchase_invoices_po_id_fkey FOREIGN KEY (po_id) REFERENCES purchase_orders(id) ON DELETE SET NULL;
alter table public.purchase_invoices add constraint purchase_invoices_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL;
alter table public.purchase_orders add constraint purchase_orders_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL;
alter table public.purchase_return_items add constraint purchase_return_items_pr_id_fkey FOREIGN KEY (pr_id) REFERENCES purchase_returns(id) ON DELETE CASCADE;
alter table public.purchase_return_items add constraint purchase_return_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL;
alter table public.purchase_returns add constraint purchase_returns_grn_id_fkey FOREIGN KEY (grn_id) REFERENCES goods_receipts(id) ON DELETE SET NULL;
alter table public.purchase_returns add constraint purchase_returns_pi_id_fkey FOREIGN KEY (pi_id) REFERENCES purchase_invoices(id) ON DELETE SET NULL;
alter table public.purchase_returns add constraint purchase_returns_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL;
alter table public.return_items add constraint return_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL;
alter table public.return_items add constraint return_items_return_id_fkey FOREIGN KEY (return_id) REFERENCES returns(id) ON DELETE CASCADE;
alter table public.returns add constraint returns_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE;
alter table public.stock_adjustments add constraint stock_adjustments_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;
alter table public.stock_alerts add constraint stock_alerts_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;
alter table public.stock_movements add constraint stock_movements_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;
alter table public.stock_opname_items add constraint stock_opname_items_opname_id_fkey FOREIGN KEY (opname_id) REFERENCES stock_opnames(id) ON DELETE CASCADE;
alter table public.stock_opname_items add constraint stock_opname_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;
alter table public.transaction_item_payments add constraint transaction_item_payments_item_id_fkey FOREIGN KEY (item_id) REFERENCES transaction_items(id) ON DELETE CASCADE;
alter table public.transaction_item_payments add constraint transaction_item_payments_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES transaction_payments(id) ON DELETE CASCADE;
alter table public.transaction_item_payments add constraint transaction_item_payments_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE;
alter table public.transaction_items add constraint transaction_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL;
alter table public.transaction_items add constraint transaction_items_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE;
alter table public.transaction_payments add constraint transaction_payments_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE;
alter table public.transactions add constraint transactions_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL;
alter table public.trip_loaders add constraint trip_loaders_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE;
alter table public.trip_loaders add constraint trip_loaders_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE;
alter table public.trips add constraint trips_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES employees(id) ON DELETE SET NULL;
alter table public.trips add constraint trips_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE SET NULL;

-- ============================================================================
-- INDEX (index milik constraint PK/UNIQUE dilewati, sudah dibuat di atas)
-- ============================================================================

CREATE INDEX idx_attendance_date ON public.attendance USING btree (attendance_date);
CREATE INDEX idx_attendance_employee ON public.attendance USING btree (employee_id);
CREATE INDEX idx_coa_parent ON public.chart_of_accounts USING btree (parent_id);
CREATE INDEX idx_coa_user_type ON public.chart_of_accounts USING btree (user_id, type);
CREATE INDEX idx_closing_periods_status ON public.closing_periods USING btree (status);
CREATE INDEX idx_closing_periods_user ON public.closing_periods USING btree (user_id, period_end DESC);
CREATE INDEX idx_cgm_customer ON public.customer_group_members USING btree (customer_id);
CREATE INDEX idx_cgm_group ON public.customer_group_members USING btree (group_id);
CREATE INDEX idx_cgm_user ON public.customer_group_members USING btree (user_id);
CREATE INDEX idx_customer_groups_user ON public.customer_groups USING btree (user_id);
CREATE UNIQUE INDEX uq_customer_groups_user_name ON public.customer_groups USING btree (user_id, lower(name));
CREATE INDEX idx_cpm_group ON public.customer_price_matrix USING btree (group_id) WHERE (group_id IS NOT NULL);
CREATE INDEX idx_customer_price_matrix_customer ON public.customer_price_matrix USING btree (customer_id, is_active) WHERE (is_active = true);
CREATE INDEX idx_customer_price_matrix_product ON public.customer_price_matrix USING btree (product_id, is_active) WHERE (is_active = true);
CREATE INDEX idx_customer_price_matrix_user ON public.customer_price_matrix USING btree (user_id, customer_id, product_id, is_active);
CREATE UNIQUE INDEX uq_cpm_group_product_start ON public.customer_price_matrix USING btree (user_id, group_id, product_id, start_date) WHERE (group_id IS NOT NULL);
CREATE INDEX idx_delivery_items_do ON public.delivery_items USING btree (delivery_order_id);
CREATE INDEX idx_delivery_load_items_do ON public.delivery_load_items USING btree (delivery_order_id);
CREATE INDEX idx_delivery_loaders_do ON public.delivery_loaders USING btree (delivery_order_id);
CREATE INDEX idx_do_transactions_do ON public.delivery_order_transactions USING btree (delivery_order_id);
CREATE INDEX idx_do_transactions_tx ON public.delivery_order_transactions USING btree (transaction_id);
CREATE INDEX idx_delivery_orders_status ON public.delivery_orders USING btree (status);
CREATE INDEX idx_delivery_orders_trip ON public.delivery_orders USING btree (trip_id);
CREATE INDEX idx_delivery_orders_user_date ON public.delivery_orders USING btree (user_id, do_date DESC);
CREATE INDEX idx_delivery_tracking_do ON public.delivery_tracking USING btree (delivery_order_id, created_at DESC);
CREATE INDEX idx_employee_loan_payments_loan_id ON public.employee_loan_payments USING btree (loan_id);
CREATE INDEX idx_employee_loan_payments_payroll_id ON public.employee_loan_payments USING btree (payroll_id);
CREATE INDEX idx_employee_loan_payments_user_id ON public.employee_loan_payments USING btree (user_id);
CREATE INDEX idx_employee_loans_employee_id ON public.employee_loans USING btree (employee_id);
CREATE INDEX idx_employee_loans_loan_date ON public.employee_loans USING btree (loan_date);
CREATE INDEX idx_employee_loans_status ON public.employee_loans USING btree (status);
CREATE INDEX idx_employee_loans_user_id ON public.employee_loans USING btree (user_id);
CREATE INDEX idx_employees_status ON public.employees USING btree (status);
CREATE INDEX idx_employees_user_name ON public.employees USING btree (user_id, name);
CREATE INDEX idx_grn_po ON public.goods_receipts USING btree (po_id);
CREATE INDEX idx_grn_user_date ON public.goods_receipts USING btree (user_id, receipt_date DESC);
CREATE INDEX idx_grn_items_grn ON public.grn_items USING btree (grn_id);
CREATE INDEX idx_journal_entries_reference ON public.journal_entries USING btree (reference_type, reference_id);
CREATE INDEX idx_journal_entries_user_date ON public.journal_entries USING btree (user_id, entry_date DESC);
CREATE INDEX idx_journal_lines_account ON public.journal_lines USING btree (account_id);
CREATE INDEX idx_journal_lines_journal ON public.journal_lines USING btree (journal_id);
CREATE INDEX idx_notifications_created_at ON public.notifications USING btree (created_at DESC);
CREATE INDEX idx_notifications_is_read ON public.notifications USING btree (is_read);
CREATE INDEX idx_notifications_type ON public.notifications USING btree (type);
CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id);
CREATE INDEX idx_payrolls_incentive_details ON public.payrolls USING gin (incentive_details);
CREATE INDEX idx_payrolls_journal ON public.payrolls USING btree (journal_entry_id);
CREATE INDEX idx_payrolls_period_dates ON public.payrolls USING btree (period_start, period_end);
CREATE INDEX idx_payrolls_status ON public.payrolls USING btree (status);
CREATE INDEX idx_payrolls_user_employee ON public.payrolls USING btree (user_id, employee_id);
CREATE INDEX idx_pi_items_pi ON public.pi_items USING btree (pi_id);
CREATE INDEX idx_pi_payments_pi ON public.pi_payments USING btree (pi_id, created_at DESC);
CREATE INDEX idx_po_items_po ON public.po_items USING btree (po_id);
CREATE INDEX idx_price_tiers_product ON public.price_tiers USING btree (product_id, is_active) WHERE (is_active = true);
CREATE INDEX idx_price_tiers_user_product ON public.price_tiers USING btree (user_id, product_id, is_active);
CREATE INDEX idx_products_barcode ON public.products USING btree (barcode);
CREATE INDEX idx_products_category_id ON public.products USING btree (category_id);
CREATE INDEX idx_products_is_active ON public.products USING btree (is_active);
CREATE INDEX idx_products_sku ON public.products USING btree (sku);
CREATE INDEX idx_pi_payment_status ON public.purchase_invoices USING btree (payment_status);
CREATE INDEX idx_pi_supplier ON public.purchase_invoices USING btree (supplier_id);
CREATE INDEX idx_pi_user_date ON public.purchase_invoices USING btree (user_id, invoice_date DESC);
CREATE INDEX idx_po_status ON public.purchase_orders USING btree (status);
CREATE INDEX idx_po_supplier ON public.purchase_orders USING btree (supplier_id);
CREATE INDEX idx_po_user_date ON public.purchase_orders USING btree (user_id, po_date DESC);
CREATE INDEX idx_pr_items_pr ON public.purchase_return_items USING btree (pr_id);
CREATE INDEX idx_pr_user_date ON public.purchase_returns USING btree (user_id, return_date DESC);
CREATE INDEX idx_return_items_return ON public.return_items USING btree (return_id);
CREATE INDEX idx_returns_transaction ON public.returns USING btree (transaction_id);
CREATE INDEX idx_stock_adjustments_created_at ON public.stock_adjustments USING btree (created_at DESC);
CREATE INDEX idx_stock_adjustments_product_id ON public.stock_adjustments USING btree (product_id);
CREATE INDEX idx_stock_adjustments_user_id ON public.stock_adjustments USING btree (user_id);
CREATE INDEX idx_stock_alerts_product_id ON public.stock_alerts USING btree (product_id);
CREATE INDEX idx_stock_alerts_user_id ON public.stock_alerts USING btree (user_id);
CREATE INDEX idx_stock_movements_created_at ON public.stock_movements USING btree (created_at DESC);
CREATE INDEX idx_stock_movements_product_id ON public.stock_movements USING btree (product_id);
CREATE INDEX idx_stock_movements_reference ON public.stock_movements USING btree (reference_type, reference_id);
CREATE INDEX idx_stock_movements_user_id ON public.stock_movements USING btree (user_id);
CREATE INDEX idx_stock_opname_items_opname_id ON public.stock_opname_items USING btree (opname_id);
CREATE INDEX idx_stock_opname_items_product_id ON public.stock_opname_items USING btree (product_id);
CREATE INDEX idx_stock_opnames_date ON public.stock_opnames USING btree (opname_date DESC);
CREATE INDEX idx_stock_opnames_status ON public.stock_opnames USING btree (status);
CREATE INDEX idx_stock_opnames_user_id ON public.stock_opnames USING btree (user_id);
CREATE INDEX idx_store_settings_user ON public.store_settings USING btree (user_id);
CREATE INDEX idx_suppliers_user_name ON public.suppliers USING btree (user_id, name);
CREATE INDEX idx_item_payments_item ON public.transaction_item_payments USING btree (item_id);
CREATE INDEX idx_item_payments_payment ON public.transaction_item_payments USING btree (payment_id);
CREATE INDEX idx_item_payments_transaction ON public.transaction_item_payments USING btree (transaction_id);
CREATE INDEX idx_item_payments_user_created ON public.transaction_item_payments USING btree (user_id, created_at DESC);
CREATE INDEX idx_transaction_items_transaction ON public.transaction_items USING btree (transaction_id);
CREATE INDEX idx_transaction_payments_payment_date ON public.transaction_payments USING btree (payment_date);
CREATE INDEX idx_transaction_payments_transaction ON public.transaction_payments USING btree (transaction_id, created_at DESC);
CREATE INDEX idx_transactions_transaction_status ON public.transactions USING btree (user_id, transaction_status);
CREATE INDEX idx_transactions_user_created ON public.transactions USING btree (user_id, created_at DESC);
CREATE INDEX idx_trip_loaders_employee ON public.trip_loaders USING btree (employee_id);
CREATE INDEX idx_trip_loaders_trip ON public.trip_loaders USING btree (trip_id);
CREATE INDEX idx_trips_status ON public.trips USING btree (user_id, status);
CREATE INDEX idx_trips_user_date ON public.trips USING btree (user_id, trip_date DESC);
CREATE INDEX idx_vehicles_user_plate ON public.vehicles USING btree (user_id, plate_number);

-- ============================================================================
-- FUNGSI (71 buah, urut alfabetis; isi body identik dengan live)
-- ============================================================================

-- >>> add_pi_payment
CREATE OR REPLACE FUNCTION public.add_pi_payment(p_pi_id uuid, p_amount numeric, p_payment_method text, p_notes text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 set search_path = public
AS $function$
DECLARE
  v_payment_id uuid;
  v_paid numeric;
  v_remaining numeric;
  v_total numeric;
  v_pi_number text;
  v_account_kas uuid;
  v_account_utang uuid;
  v_journal_id uuid;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Jumlah pembayaran tidak valid';
  END IF;

  SELECT total, paid_amount, remaining_amount, pi_number
    INTO v_total, v_paid, v_remaining, v_pi_number
  FROM purchase_invoices
  WHERE id = p_pi_id AND user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invoice tidak ditemukan';
  END IF;

  IF p_amount > v_remaining THEN
    RAISE EXCEPTION 'Pembayaran melebihi sisa tagihan (sisa %)', v_remaining;
  END IF;

  INSERT INTO pi_payments (user_id, pi_id, amount, payment_method, notes)
  VALUES (auth.uid(), p_pi_id, p_amount, COALESCE(p_payment_method, 'tunai'), p_notes)
  RETURNING id INTO v_payment_id;

  v_paid := v_paid + p_amount;
  v_remaining := v_remaining - p_amount;

  UPDATE purchase_invoices
  SET paid_amount = v_paid,
      remaining_amount = v_remaining,
      payment_status = CASE
        WHEN v_remaining <= 0 THEN 'lunas'
        WHEN v_paid > 0 THEN 'sebagian'
        ELSE 'belum_lunas'
      END,
      updated_at = now()
  WHERE id = p_pi_id AND user_id = auth.uid();

  -- AUTO-JURNAL: Utang Usaha (Debit) → Kas (Kredit)
  SELECT id INTO v_account_kas
  FROM chart_of_accounts WHERE user_id = auth.uid() AND code = '1-1000';
  SELECT id INTO v_account_utang
  FROM chart_of_accounts WHERE user_id = auth.uid() AND code = '2-2000';

  IF v_account_kas IS NOT NULL AND v_account_utang IS NOT NULL THEN
    INSERT INTO journal_entries (user_id, entry_date, description, reference_type, reference_id)
    VALUES (auth.uid(), now(), 'Pembayaran ' || v_pi_number, 'purchase_payment', p_pi_id)
    RETURNING id INTO v_journal_id;

    INSERT INTO journal_lines (user_id, journal_id, account_id, account_code, account_name, debit, credit)
    SELECT auth.uid(), v_journal_id, v_account_utang, '2-2000', 'Utang Usaha', p_amount, 0;

    INSERT INTO journal_lines (user_id, journal_id, account_id, account_code, account_name, debit, credit)
    SELECT auth.uid(), v_journal_id, v_account_kas, '1-1000', 'Kas', 0, p_amount;
  END IF;

  RETURN v_payment_id;
END;
$function$;

-- >>> add_transaction_payment
CREATE OR REPLACE FUNCTION public.add_transaction_payment(p_transaction_id uuid, p_amount numeric, p_payment_method text, p_notes text, p_payment_date date DEFAULT CURRENT_DATE)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 set search_path = public
AS $function$
DECLARE
  v_payment_id uuid;
  v_total numeric;
  v_paid numeric;
  v_remaining numeric;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Jumlah pembayaran tidak valid';
  END IF;

  SELECT total, paid_amount, remaining_amount
    INTO v_total, v_paid, v_remaining
  FROM transactions
  WHERE id = p_transaction_id AND user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaksi tidak ditemukan';
  END IF;

  IF p_amount > v_remaining THEN
    RAISE EXCEPTION 'Pembayaran melebihi sisa cicilan (sisa %)', v_remaining;
  END IF;

  -- Catat pembayaran dengan tanggal kustom
  INSERT INTO transaction_payments (
    user_id, transaction_id, amount, payment_method, notes, payment_date
  ) VALUES (
    auth.uid(), p_transaction_id, p_amount,
    COALESCE(p_payment_method, 'tunai'), p_notes, p_payment_date
  )
  RETURNING id INTO v_payment_id;

  -- Update status transaksi
  v_paid := v_paid + p_amount;
  v_remaining := v_remaining - p_amount;

  UPDATE transactions
  SET paid_amount = v_paid,
      remaining_amount = v_remaining,
      payment_status = CASE WHEN v_remaining <= 0 THEN 'lunas' ELSE 'belum_lunas' END,
      updated_at = now()
  WHERE id = p_transaction_id;

  RETURN v_payment_id;
END;
$function$;

-- >>> allocate_payment_to_items
CREATE OR REPLACE FUNCTION public.allocate_payment_to_items(p_transaction_id uuid, p_payment_id uuid, p_payment_amount numeric)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 set search_path = public
AS $function$
DECLARE
  v_item RECORD;
  v_remaining_payment numeric := p_payment_amount;
  v_item_remaining numeric;
  v_allocated numeric;
BEGIN
  -- Loop items dalam transaksi (FIFO: by created_at)
  FOR v_item IN
    SELECT 
      ti.id as item_id,
      ti.subtotal,
      COALESCE(SUM(tip.allocated_amount), 0) as already_paid
    FROM transaction_items ti
    LEFT JOIN transaction_item_payments tip ON tip.item_id = ti.id
    WHERE ti.transaction_id = p_transaction_id
      AND ti.user_id = auth.uid()
    GROUP BY ti.id, ti.subtotal, ti.created_at
    ORDER BY ti.created_at ASC
  LOOP
    -- Skip item yang sudah lunas
    v_item_remaining := v_item.subtotal - v_item.already_paid;
    IF v_item_remaining <= 0 THEN
      CONTINUE;
    END IF;
    
    -- Hitung alokasi untuk item ini
    v_allocated := LEAST(v_remaining_payment, v_item_remaining);
    
    -- Insert alokasi
    INSERT INTO transaction_item_payments (
      user_id, transaction_id, item_id, payment_id, allocated_amount
    ) VALUES (
      auth.uid(), p_transaction_id, v_item.item_id, p_payment_id, v_allocated
    );
    
    -- Kurangi sisa pembayaran
    v_remaining_payment := v_remaining_payment - v_allocated;
    
    -- Berhenti jika pembayaran habis
    EXIT WHEN v_remaining_payment <= 0;
  END LOOP;
  
  -- Validasi: pastikan semua payment teralokasi
  IF v_remaining_payment > 0.01 THEN
    RAISE WARNING 'Sisa pembayaran % tidak teralokasi untuk transaction %', 
      v_remaining_payment, p_transaction_id;
  END IF;
END;
$function$;

-- >>> auto_delete_payment_allocations
CREATE OR REPLACE FUNCTION public.auto_delete_payment_allocations()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Hapus semua alokasi pembayaran ini ke items
  DELETE FROM transaction_item_payments
  WHERE payment_id = OLD.id;

  RETURN OLD;
END;
$function$;

-- >>> auto_journal_payment
CREATE OR REPLACE FUNCTION public.auto_journal_payment()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_transaction transactions%ROWTYPE;
  v_cash_account chart_of_accounts%ROWTYPE;
  v_receivables_account chart_of_accounts%ROWTYPE;
  v_journal_id uuid;
  v_journal_number text;
BEGIN
  -- Ambil data transaksi
  SELECT * INTO v_transaction
  FROM transactions
  WHERE id = NEW.transaction_id;

  -- Skip jika transaksi tidak ditemukan
  IF v_transaction IS NULL THEN
    RETURN NEW;
  END IF;

  -- Ambil account untuk Kas atau Bank (berdasarkan payment_method)
  SELECT * INTO v_cash_account
  FROM chart_of_accounts
  WHERE code = CASE
    WHEN NEW.payment_method IN ('transfer', 'qris') THEN '1-1010'  -- Bank
    ELSE '1-1000'  -- Kas (tunai)
  END
  AND user_id = NEW.user_id
  AND is_active = true
  LIMIT 1;

  -- Ambil account untuk Piutang Usaha
  SELECT * INTO v_receivables_account
  FROM chart_of_accounts
  WHERE code = '1-1100'  -- Piutang Usaha
  AND user_id = NEW.user_id
  AND is_active = true
  LIMIT 1;

  -- Skip jika akun tidak ditemukan (user belum setup COA)
  IF v_cash_account IS NULL OR v_receivables_account IS NULL THEN
    RAISE NOTICE 'Akun Kas/Bank atau Piutang tidak ditemukan untuk user %. Auto-jurnal pembayaran tidak dibuat.', NEW.user_id;
    RETURN NEW;
  END IF;

  -- Generate journal number
  v_journal_number := 'PAY-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || SUBSTRING(NEW.id::text, 1, 8);

  -- Buat jurnal otomatis
  INSERT INTO journal_entries (
    user_id,
    journal_number,
    entry_date,
    description,
    reference_type,
    reference_id,
    status,
    created_at,
    updated_at
  ) VALUES (
    NEW.user_id,
    v_journal_number,
    COALESCE(NEW.payment_date, CURRENT_DATE),
    'Pembayaran cicilan ' || v_transaction.transaction_number ||
    CASE WHEN v_transaction.customer_name IS NOT NULL
         THEN ' - ' || v_transaction.customer_name
         ELSE ''
    END,
    'payment',
    NEW.transaction_id,
    'posted',
    NOW(),
    NOW()
  ) RETURNING id INTO v_journal_id;

  -- Jurnal lines: Debit Kas/Bank, Kredit Piutang
  INSERT INTO journal_lines (
    user_id,
    journal_id,
    account_id,
    account_code,
    account_name,
    debit,
    credit,
    created_at
  ) VALUES
    -- Debit Kas/Bank (uang masuk)
    (
      NEW.user_id,
      v_journal_id,
      v_cash_account.id,
      v_cash_account.code,
      v_cash_account.name,
      NEW.amount,
      0,
      NOW()
    ),
    -- Kredit Piutang (mengurangi piutang)
    (
      NEW.user_id,
      v_journal_id,
      v_receivables_account.id,
      v_receivables_account.code,
      v_receivables_account.name,
      0,
      NEW.amount,
      NOW()
    );

  RETURN NEW;
END;
$function$;

-- >>> auto_update_realized_profit
CREATE OR REPLACE FUNCTION public.auto_update_realized_profit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 set search_path = public
AS $function$
DECLARE
  v_user_id uuid;
  v_journal_id uuid;
  v_journal_number text;
  v_laba_piutang_id uuid;
  v_laba_direalisasi_id uuid;
  v_payment_profit numeric := 0;
  v_available numeric := 0;
  v_tx record;
BEGIN
  SELECT user_id, total, created_at
  INTO v_tx
  FROM transactions
  WHERE id = NEW.transaction_id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  v_user_id := v_tx.user_id;

  IF NOT check_period_closed(v_tx.created_at::date, v_user_id) THEN
    RETURN NEW;
  END IF;

  SELECT id INTO v_laba_piutang_id
  FROM chart_of_accounts
  WHERE user_id = v_user_id AND code = '3-3100' AND is_active = true
  LIMIT 1;

  SELECT id INTO v_laba_direalisasi_id
  FROM chart_of_accounts
  WHERE user_id = v_user_id AND code = '3-3200' AND is_active = true
  LIMIT 1;

  IF v_laba_piutang_id IS NULL OR v_laba_direalisasi_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT
    (NEW.amount / NULLIF(v_tx.total, 0)) *
    (v_tx.total - COALESCE(SUM(ti.quantity * COALESCE(p.price_buy, 0)), 0))
  INTO v_payment_profit
  FROM transaction_items ti
  LEFT JOIN products p ON p.id = ti.product_id
  WHERE ti.transaction_id = NEW.transaction_id;

  v_payment_profit := COALESCE(v_payment_profit, 0);

  IF v_payment_profit <= 0.01 THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(SUM(jl.credit - jl.debit), 0)
  INTO v_available
  FROM journal_lines jl
  INNER JOIN journal_entries je ON je.id = jl.journal_id
  WHERE jl.user_id = v_user_id
    AND jl.account_id = v_laba_piutang_id
    AND je.status = 'posted';

  IF v_available <= 0.01 THEN
    RETURN NEW;
  END IF;

  IF v_payment_profit > v_available THEN
    v_payment_profit := v_available;
  END IF;

  v_journal_number := 'REALIZE-' || TO_CHAR(now(), 'YYYYMMDD-HH24MISS') || '-' || SUBSTRING(gen_random_uuid()::text, 1, 6);
  v_journal_id := gen_random_uuid();

  INSERT INTO journal_entries (
    id, user_id, journal_number, entry_date, description,
    reference_type, reference_id, status, created_at, updated_at
  ) VALUES (
    v_journal_id, v_user_id, v_journal_number, CURRENT_DATE,
    'Realisasi Laba: Pembayaran Piutang',
    'reclassify', NEW.id, 'posted', now(), now()
  );

  INSERT INTO journal_lines (id, user_id, journal_id, account_id, account_code, account_name, debit, credit, created_at)
  VALUES (gen_random_uuid(), v_user_id, v_journal_id, v_laba_piutang_id,
          '3-3100', 'Laba Piutang', v_payment_profit, 0, now());

  INSERT INTO journal_lines (id, user_id, journal_id, account_id, account_code, account_name, debit, credit, created_at)
  VALUES (gen_random_uuid(), v_user_id, v_journal_id, v_laba_direalisasi_id,
          '3-3200', 'Laba Direalisasi', 0, v_payment_profit, now());

  RETURN NEW;
END;
$function$;

-- >>> auto_update_transaction_on_payment_delete
CREATE OR REPLACE FUNCTION public.auto_update_transaction_on_payment_delete()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_transaction transactions%ROWTYPE;
  v_new_paid numeric;
  v_new_remaining numeric;
  v_new_status text;
BEGIN
  -- Ambil data transaksi
  SELECT * INTO v_transaction
  FROM transactions
  WHERE id = OLD.transaction_id;

  -- Skip jika transaksi tidak ditemukan
  IF v_transaction IS NULL THEN
    RETURN OLD;
  END IF;

  -- Hitung ulang paid_amount dan remaining_amount
  v_new_paid := GREATEST(0, v_transaction.paid_amount - OLD.amount);
  v_new_remaining := v_transaction.total - v_new_paid;
  v_new_status := CASE WHEN v_new_remaining > 0 THEN 'belum_lunas' ELSE 'lunas' END;

  -- Update transaksi
  UPDATE transactions
  SET paid_amount = v_new_paid,
      remaining_amount = v_new_remaining,
      payment_status = v_new_status,
      updated_at = NOW()
  WHERE id = OLD.transaction_id;

  RETURN OLD;
END;
$function$;

-- >>> auto_void_journal_payment
CREATE OR REPLACE FUNCTION public.auto_void_journal_payment()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_journal_id uuid;
BEGIN
  -- Cari jurnal yang reference ke payment ini
  SELECT id INTO v_journal_id
  FROM journal_entries
  WHERE reference_type = 'payment'
  AND reference_id = OLD.transaction_id
  AND user_id = OLD.user_id
  AND status = 'posted'
  LIMIT 1;

  -- Void jurnal jika ditemukan
  IF v_journal_id IS NOT NULL THEN
    UPDATE journal_entries
    SET status = 'void',
        updated_at = NOW()
    WHERE id = v_journal_id;
    
    RAISE NOTICE 'Journal voided: %', v_journal_id;
  END IF;

  RETURN OLD;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in auto_void_journal_payment: %', SQLERRM;
    RETURN OLD;
END;
$function$;

-- >>> check_period_closed
CREATE OR REPLACE FUNCTION public.check_period_closed(p_date date, p_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_closed boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM closing_periods
    WHERE user_id = p_user_id
      AND status = 'closed'
      AND p_date >= period_start
      AND p_date <= period_end
  ) INTO v_closed;

  RETURN v_closed;
END;
$function$;

-- >>> close_period
CREATE OR REPLACE FUNCTION public.close_period(p_period_start date, p_period_end date, p_notes text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 set search_path = public
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_closing_id uuid := gen_random_uuid();
  v_journal_id uuid := gen_random_uuid();
  v_journal_number text;
  v_balances jsonb;

  v_laba_piutang_id uuid;
  v_laba_direalisasi_id uuid;

  v_total_pendapatan numeric := 0;
  v_total_beban numeric := 0;
  v_plug numeric := 0;
  v_realised numeric := 0;
  v_total_profit numeric := 0;
  v_ratio numeric := 0;
  v_realised_part numeric := 0;
  v_unrealised_part numeric := 0;
  v_profit record;
  v_has_lines boolean := false;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Tidak ada sesi pengguna';
  END IF;

  IF p_period_end < p_period_start THEN
    RAISE EXCEPTION 'Tanggal akhir periode harus >= tanggal mulai.';
  END IF;

  IF EXISTS(
    SELECT 1 FROM closing_periods
    WHERE user_id = v_user_id
      AND status = 'closed'
      AND (
        (p_period_start >= period_start AND p_period_start <= period_end) OR
        (p_period_end >= period_start AND p_period_end <= period_end) OR
        (p_period_start <= period_start AND p_period_end >= period_end)
      )
  ) THEN
    RAISE EXCEPTION 'Periode ini overlap dengan periode yang sudah ditutup.';
  END IF;

  SELECT
    COALESCE(SUM(CASE WHEN coa.type = 'pendapatan' THEN jl.credit - jl.debit ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN coa.type = 'beban'      THEN jl.debit - jl.credit ELSE 0 END), 0)
  INTO v_total_pendapatan, v_total_beban
  FROM journal_lines jl
  INNER JOIN journal_entries je ON je.id = jl.journal_id
  INNER JOIN chart_of_accounts coa ON coa.id = jl.account_id
  WHERE je.user_id = v_user_id
    AND je.status = 'posted'
    AND COALESCE(je.reference_type, '') <> 'closing'
    AND je.entry_date::date >= p_period_start
    AND je.entry_date::date <= p_period_end
    AND coa.type IN ('pendapatan', 'beban');

  SELECT id INTO v_laba_piutang_id
  FROM chart_of_accounts
  WHERE user_id = v_user_id AND code = '3-3100' AND is_active = true
  LIMIT 1;

  SELECT id INTO v_laba_direalisasi_id
  FROM chart_of_accounts
  WHERE user_id = v_user_id AND code = '3-3200' AND is_active = true
  LIMIT 1;

  IF v_laba_piutang_id IS NULL OR v_laba_direalisasi_id IS NULL THEN
    RAISE EXCEPTION 'Akun Laba Piutang/Direalisasi tidak ditemukan. Seed COA terlebih dahulu.';
  END IF;

  IF ABS(v_total_pendapatan) > 0.01 OR ABS(v_total_beban) > 0.01 THEN
    v_journal_number := 'CLOSING-' || TO_CHAR(p_period_end, 'YYYYMMDD') || '-' || SUBSTRING(gen_random_uuid()::text, 1, 8);

    INSERT INTO journal_entries (
      id, user_id, journal_number, entry_date, description,
      reference_type, reference_id, status, created_at, updated_at
    ) VALUES (
      v_journal_id, v_user_id, v_journal_number, p_period_end,
      'Jurnal Penutup Periode ' || p_period_start || ' s/d ' || p_period_end,
      'closing', v_closing_id, 'posted', now(), now()
    );

    INSERT INTO journal_lines (id, user_id, journal_id, account_id, account_code, account_name, debit, credit, created_at)
    SELECT gen_random_uuid(), v_user_id, v_journal_id, coa.id, coa.code, coa.name,
           COALESCE(SUM(jl.credit - jl.debit), 0), 0, now()
    FROM chart_of_accounts coa
    LEFT JOIN journal_lines jl ON jl.account_id = coa.id
    LEFT JOIN journal_entries je ON je.id = jl.journal_id
    WHERE coa.user_id = v_user_id
      AND coa.type = 'pendapatan'
      AND coa.is_active = true
      AND je.status = 'posted'
      AND COALESCE(je.reference_type, '') <> 'closing'
      AND je.entry_date::date >= p_period_start
      AND je.entry_date::date <= p_period_end
    GROUP BY coa.id, coa.code, coa.name
    HAVING SUM(jl.credit - jl.debit) > 0;

    INSERT INTO journal_lines (id, user_id, journal_id, account_id, account_code, account_name, debit, credit, created_at)
    SELECT gen_random_uuid(), v_user_id, v_journal_id, coa.id, coa.code, coa.name,
           0, COALESCE(SUM(jl.debit - jl.credit), 0), now()
    FROM chart_of_accounts coa
    LEFT JOIN journal_lines jl ON jl.account_id = coa.id
    LEFT JOIN journal_entries je ON je.id = jl.journal_id
    WHERE coa.user_id = v_user_id
      AND coa.type = 'beban'
      AND coa.is_active = true
      AND je.status = 'posted'
      AND COALESCE(je.reference_type, '') <> 'closing'
      AND je.entry_date::date >= p_period_start
      AND je.entry_date::date <= p_period_end
    GROUP BY coa.id, coa.code, coa.name
    HAVING SUM(jl.debit - jl.credit) > 0;

    SELECT EXISTS (SELECT 1 FROM journal_lines WHERE journal_id = v_journal_id)
    INTO v_has_lines;

    SELECT COALESCE(SUM(debit) - SUM(credit), 0)
    INTO v_plug
    FROM journal_lines
    WHERE journal_id = v_journal_id;

    IF v_has_lines AND ABS(v_plug) > 0.01 THEN
      SELECT * INTO v_profit
      FROM get_profit_summary(v_user_id, p_period_start, p_period_end);

      v_realised := COALESCE(v_profit.realized_profit, 0);
      v_total_profit := COALESCE(v_profit.total_profit, 0);

      IF v_total_profit > 0.01 THEN
        v_ratio := v_realised / v_total_profit;
        IF v_ratio < 0 THEN v_ratio := 0; END IF;
        IF v_ratio > 1 THEN v_ratio := 1; END IF;
      ELSE
        v_ratio := 0;
      END IF;

      v_realised_part := ROUND(v_plug * v_ratio, 2);
      v_unrealised_part := v_plug - v_realised_part;

      IF v_plug >= 0 THEN
        IF ABS(v_realised_part) > 0.01 THEN
          INSERT INTO journal_lines (id, user_id, journal_id, account_id, account_code, account_name, debit, credit, created_at)
          VALUES (gen_random_uuid(), v_user_id, v_journal_id, v_laba_direalisasi_id,
                  '3-3200', 'Laba Direalisasi', 0, v_realised_part, now());
        END IF;
        IF ABS(v_unrealised_part) > 0.01 THEN
          INSERT INTO journal_lines (id, user_id, journal_id, account_id, account_code, account_name, debit, credit, created_at)
          VALUES (gen_random_uuid(), v_user_id, v_journal_id, v_laba_piutang_id,
                  '3-3100', 'Laba Piutang', 0, v_unrealised_part, now());
        END IF;
      ELSE
        INSERT INTO journal_lines (id, user_id, journal_id, account_id, account_code, account_name, debit, credit, created_at)
        VALUES (gen_random_uuid(), v_user_id, v_journal_id, v_laba_piutang_id,
                '3-3100', 'Laba Piutang', ABS(v_plug), 0, now());
      END IF;
    END IF;

    IF (
      SELECT ABS(COALESCE(SUM(jl.debit), 0) - COALESCE(SUM(jl.credit), 0))
      FROM journal_lines jl WHERE jl.journal_id = v_journal_id
    ) > 0.01 THEN
      RAISE EXCEPTION 'Jurnal penutup tidak balance — proses dibatalkan.';
    END IF;

    IF NOT v_has_lines THEN
      DELETE FROM journal_entries WHERE id = v_journal_id;
    END IF;
  END IF;

  SELECT jsonb_agg(
    jsonb_build_object(
      'account_id', account_id,
      'account_code', account_code,
      'account_name', account_name,
      'account_type', account_type,
      'normal_balance', normal_balance,
      'balance', balance
    )
  )
  INTO v_balances
  FROM (
    SELECT
      coa.id as account_id,
      coa.code as account_code,
      coa.name as account_name,
      coa.type as account_type,
      coa.normal_balance as normal_balance,
      COALESCE(SUM(
        CASE
          WHEN coa.normal_balance = 'debit' THEN jl.debit - jl.credit
          ELSE jl.credit - jl.debit
        END
      ), 0) as balance
    FROM chart_of_accounts coa
    LEFT JOIN journal_lines jl ON jl.account_id = coa.id
    LEFT JOIN journal_entries je ON je.id = jl.journal_id
    WHERE coa.user_id = v_user_id
      AND coa.is_active = true
      AND (je.id IS NULL OR (
        je.status = 'posted'
        AND je.entry_date::date <= p_period_end
      ))
    GROUP BY coa.id, coa.code, coa.name, coa.type, coa.normal_balance
  ) balances;

  DELETE FROM closing_periods
  WHERE user_id = v_user_id
    AND period_start = p_period_start
    AND period_end = p_period_end
    AND status = 'reopened';

  INSERT INTO closing_periods (
    id, user_id, period_start, period_end, closed_by, notes, snapshot_balances, status
  ) VALUES (
    v_closing_id, v_user_id, p_period_start, p_period_end, v_user_id, p_notes, v_balances, 'closed'
  );

  RETURN v_closing_id;
END;
$function$;

-- >>> create_default_store_settings
CREATE OR REPLACE FUNCTION public.create_default_store_settings()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 set search_path = public
AS $function$
BEGIN
  INSERT INTO store_settings (user_id, store_name, store_subtitle)
  VALUES (NEW.id, 'Ucup Kasir', 'Toko Berkat Jaya Makmur')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$function$;

-- >>> create_goods_receipt
CREATE OR REPLACE FUNCTION public.create_goods_receipt(p_po_id uuid, p_supplier_id uuid, p_supplier_name text, p_receipt_date timestamp with time zone, p_notes text, p_items jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 set search_path = public
AS $function$
DECLARE
  v_grn_id uuid;
  v_item jsonb;
  v_subtotal numeric := 0;
  v_grn_subtotal numeric := 0;
  v_po_item po_items%ROWTYPE;
  v_qty_received numeric;
  v_qty_rejected numeric;
  v_total_received numeric;
  v_total_ordered numeric;
  v_account_persediaan uuid;
  v_account_utang uuid;
  v_journal_id uuid;
BEGIN
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'GRN harus memiliki minimal 1 item';
  END IF;

  v_grn_id := gen_random_uuid();
  p_receipt_date := COALESCE(p_receipt_date, now());

  INSERT INTO goods_receipts (id, user_id, grn_number, po_id, supplier_id, supplier_name,
                               receipt_date, notes, status)
  VALUES (v_grn_id, auth.uid(),
          'GRN-' || to_char(p_receipt_date, 'YYYYMMDD') || '-' || upper(substr(md5(random()::text), 1, 6)),
          p_po_id, p_supplier_id, p_supplier_name, p_receipt_date, p_notes, 'completed');

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_qty_received := COALESCE((v_item->>'quantity_received')::numeric, 0);
    v_qty_rejected := COALESCE((v_item->>'quantity_rejected')::numeric, 0);
    v_subtotal := (v_qty_received + v_qty_rejected) * COALESCE((v_item->>'price')::numeric, 0);
    v_grn_subtotal := v_grn_subtotal + v_subtotal;

    INSERT INTO grn_items (user_id, grn_id, po_item_id, product_id, product_name,
                           quantity_received, quantity_rejected, price, subtotal)
    VALUES (auth.uid(), v_grn_id,
            (v_item->>'po_item_id')::uuid,
            (v_item->>'product_id')::uuid,
            (v_item->>'product_name')::text,
            v_qty_received, v_qty_rejected,
            COALESCE((v_item->>'price')::numeric, 0),
            v_subtotal);

    IF v_qty_received > 0 THEN
      UPDATE products
      SET stock = stock + v_qty_received,
          updated_at = now()
      WHERE id = (v_item->>'product_id')::uuid AND user_id = auth.uid();
    END IF;

    IF (v_item->>'po_item_id') IS NOT NULL THEN
      SELECT * INTO v_po_item FROM po_items WHERE id = (v_item->>'po_item_id')::uuid;
      IF FOUND THEN
        v_total_received := COALESCE(v_po_item.received_quantity, 0) + v_qty_received + v_qty_rejected;
        UPDATE po_items
        SET received_quantity = v_total_received
        WHERE id = v_po_item.id;
      END IF;
    END IF;
  END LOOP;

  UPDATE goods_receipts SET total = v_grn_subtotal WHERE id = v_grn_id;

  IF p_po_id IS NOT NULL THEN
    SELECT COALESCE(SUM(quantity), 0), COALESCE(SUM(received_quantity), 0)
      INTO v_total_ordered, v_total_received
    FROM po_items WHERE po_id = p_po_id;

    IF v_total_received >= v_total_ordered THEN
      UPDATE purchase_orders SET status = 'completed', updated_at = now() WHERE id = p_po_id;
    ELSE
      UPDATE purchase_orders SET status = 'partial', updated_at = now() WHERE id = p_po_id;
    END IF;
  END IF;

  -- AUTO-JURNAL: Persediaan (Debit) → Utang Usaha (Kredit)
  SELECT id INTO v_account_persediaan
  FROM chart_of_accounts WHERE user_id = auth.uid() AND code = '1-1200';
  SELECT id INTO v_account_utang
  FROM chart_of_accounts WHERE user_id = auth.uid() AND code = '2-2000';

  IF v_account_persediaan IS NOT NULL AND v_account_utang IS NOT NULL THEN
    INSERT INTO journal_entries (user_id, entry_date, description, reference_type, reference_id)
    VALUES (auth.uid(), p_receipt_date, 'Penerimaan barang ' || COALESCE(p_supplier_name, ''),
            'purchase', v_grn_id)
    RETURNING id INTO v_journal_id;

    INSERT INTO journal_lines (user_id, journal_id, account_id, account_code, account_name, debit, credit)
    SELECT auth.uid(), v_journal_id, v_account_persediaan, '1-1200', 'Persediaan Barang', v_grn_subtotal, 0;

    INSERT INTO journal_lines (user_id, journal_id, account_id, account_code, account_name, debit, credit)
    SELECT auth.uid(), v_journal_id, v_account_utang, '2-2000', 'Utang Usaha', 0, v_grn_subtotal;
  END IF;

  RETURN v_grn_id;
END;
$function$;

-- >>> create_low_stock_notification
CREATE OR REPLACE FUNCTION public.create_low_stock_notification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID;
  v_minimum_stock INTEGER;
BEGIN
  -- Ambil user_id dari produk
  v_user_id := NEW.user_id;

  -- Ambil minimum stock dari stock_alerts (nilai spesifik) bila ada
  SELECT minimum_stock INTO v_minimum_stock
  FROM stock_alerts
  WHERE product_id = NEW.id AND user_id = v_user_id AND alert_enabled = true;

  -- Fallback ke kolom minimum_stock pada products
  IF v_minimum_stock IS NULL THEN
    v_minimum_stock := NEW.minimum_stock;
  END IF;

  IF v_minimum_stock IS NULL THEN
    v_minimum_stock := 10;
  END IF;

  -- Jika stok mencapai atau di bawah minimum, buat notifikasi
  IF NEW.stock <= v_minimum_stock AND (OLD.stock IS NULL OR OLD.stock > v_minimum_stock) THEN
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      data
    ) VALUES (
      v_user_id,
      'stock_alert',
      'Stok Produk Menipis',
      'Produk "' || NEW.name || '" memiliki stok ' || NEW.stock || ' (minimum: ' || v_minimum_stock || ')',
      jsonb_build_object(
        'product_id', NEW.id,
        'product_name', NEW.name,
        'current_stock', NEW.stock,
        'minimum_stock', v_minimum_stock
      )
    );
  END IF;

  RETURN NEW;
END;
$function$;

-- >>> create_payment_notification
CREATE OR REPLACE FUNCTION public.create_payment_notification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_transaction_number TEXT;
BEGIN
  -- Ambil nomor transaksi
  SELECT transaction_number INTO v_transaction_number
  FROM transactions
  WHERE id = NEW.transaction_id;
  
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    data
  ) VALUES (
    NEW.user_id,
    'payment',
    'Pembayaran Diterima',
    'Pembayaran ' || NEW.amount || ' untuk transaksi ' || v_transaction_number || ' berhasil dicatat',
    jsonb_build_object(
      'payment_id', NEW.id,
      'transaction_id', NEW.transaction_id,
      'amount', NEW.amount,
      'payment_method', NEW.payment_method
    )
  );
  
  RETURN NEW;
END;
$function$;

-- >>> create_purchase_invoice
CREATE OR REPLACE FUNCTION public.create_purchase_invoice(p_grn_id uuid, p_supplier_id uuid, p_supplier_name text, p_invoice_date timestamp with time zone, p_due_date timestamp with time zone, p_discount numeric, p_tax numeric, p_shipping_cost numeric, p_notes text, p_items jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 set search_path = public
AS $function$
DECLARE
  v_pi_id uuid;
  v_item jsonb;
  v_subtotal numeric := 0;
  v_total numeric;
  v_po_id uuid;
BEGIN
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'PI harus memiliki minimal 1 item';
  END IF;

  v_pi_id := gen_random_uuid();
  p_invoice_date := COALESCE(p_invoice_date, now());

  SELECT po_id INTO v_po_id FROM goods_receipts WHERE id = p_grn_id;

  INSERT INTO purchase_invoices (id, user_id, pi_number, grn_id, po_id, supplier_id, supplier_name,
                                  invoice_date, due_date, discount, tax, shipping_cost, notes)
  VALUES (v_pi_id, auth.uid(),
          'PI-' || to_char(p_invoice_date, 'YYYYMMDD') || '-' || upper(substr(md5(random()::text), 1, 6)),
          p_grn_id, v_po_id, p_supplier_id, p_supplier_name,
          p_invoice_date, p_due_date,
          COALESCE(p_discount, 0), COALESCE(p_tax, 0), COALESCE(p_shipping_cost, 0),
          p_notes);

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO pi_items (user_id, pi_id, grn_item_id, product_id, product_name, quantity, price, subtotal)
    VALUES (auth.uid(), v_pi_id,
            (v_item->>'grn_item_id')::uuid,
            (v_item->>'product_id')::uuid,
            (v_item->>'product_name')::text,
            COALESCE((v_item->>'quantity')::numeric, 0),
            COALESCE((v_item->>'price')::numeric, 0),
            COALESCE((v_item->>'quantity')::numeric, 0) * COALESCE((v_item->>'price')::numeric, 0));
  END LOOP;

  SELECT COALESCE(SUM(subtotal), 0) INTO v_subtotal FROM pi_items WHERE pi_id = v_pi_id;
  v_total := v_subtotal - COALESCE(p_discount, 0) + COALESCE(p_tax, 0) + COALESCE(p_shipping_cost, 0);

  UPDATE purchase_invoices
  SET subtotal = v_subtotal, total = v_total,
      remaining_amount = v_total
  WHERE id = v_pi_id;

  RETURN v_pi_id;
END;
$function$;

-- >>> create_purchase_order
CREATE OR REPLACE FUNCTION public.create_purchase_order(p_supplier_id uuid, p_supplier_name text, p_po_date timestamp with time zone, p_expected_date timestamp with time zone, p_notes text, p_items jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 set search_path = public
AS $function$
DECLARE
  v_po_id uuid;
  v_item jsonb;
  v_product products%ROWTYPE;
  v_subtotal numeric := 0;
  v_discount numeric := 0;
  v_subtotal_item numeric;
  v_total numeric;
  v_po_date timestamptz;
BEGIN
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'PO harus memiliki minimal 1 item';
  END IF;

  v_po_id := gen_random_uuid();
  v_po_date := COALESCE(p_po_date, now());

  INSERT INTO purchase_orders (id, user_id, po_number, supplier_id, supplier_name,
                                po_date, expected_date, notes, status)
  VALUES (v_po_id, auth.uid(),
          'PO-' || to_char(v_po_date, 'YYYYMMDD') || '-' || upper(substr(md5(random()::text), 1, 6)),
          p_supplier_id, p_supplier_name, v_po_date, p_expected_date, p_notes, 'draft');

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    SELECT * INTO v_product
    FROM products
    WHERE id = (v_item->>'product_id')::uuid AND user_id = auth.uid();

    v_subtotal_item := COALESCE((v_item->>'quantity')::numeric, 0) * COALESCE((v_item->>'price')::numeric, 0);
    v_discount := COALESCE((v_item->>'discount')::numeric, 0);
    v_subtotal := v_subtotal + v_subtotal_item;

    INSERT INTO po_items (user_id, po_id, product_id, product_name,
                          quantity, price, discount, subtotal)
    VALUES (auth.uid(), v_po_id, (v_item->>'product_id')::uuid,
            COALESCE(v_product.name, (v_item->>'product_name')::text),
            COALESCE((v_item->>'quantity')::numeric, 0),
            COALESCE((v_item->>'price')::numeric, 0),
            v_discount,
            v_subtotal_item - v_discount);
  END LOOP;

  v_total := v_subtotal;
  UPDATE purchase_orders
  SET subtotal = v_subtotal, total = v_total
  WHERE id = v_po_id;

  RETURN v_po_id;
END;
$function$;

-- >>> create_purchase_return
CREATE OR REPLACE FUNCTION public.create_purchase_return(p_grn_id uuid, p_pi_id uuid, p_supplier_id uuid, p_supplier_name text, p_return_date timestamp with time zone, p_reason text, p_notes text, p_items jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 set search_path = public
AS $function$
DECLARE
  v_pr_id uuid;
  v_item jsonb;
  v_total_refund numeric := 0;
  v_prod_id uuid;
  v_qty numeric;
  v_price numeric;
  v_price_buy numeric;
  v_account_persediaan uuid;
  v_account_utang uuid;
  v_journal_id uuid;
BEGIN
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Retur harus memiliki minimal 1 item';
  END IF;

  v_pr_id := gen_random_uuid();
  p_return_date := COALESCE(p_return_date, now());

  INSERT INTO purchase_returns (id, user_id, pr_number, grn_id, pi_id, supplier_id, supplier_name,
                                return_date, reason, notes, status)
  VALUES (v_pr_id, auth.uid(),
          'PR-' || to_char(p_return_date, 'YYYYMMDD') || '-' || upper(substr(md5(random()::text), 1, 6)),
          p_grn_id, p_pi_id, p_supplier_id, p_supplier_name,
          p_return_date, p_reason, p_notes, 'completed');

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_prod_id := (v_item->>'product_id')::uuid;
    v_qty := COALESCE((v_item->>'quantity')::numeric, 0);
    v_price := COALESCE((v_item->>'price')::numeric, 0);
    v_price_buy := COALESCE((v_item->>'price_buy')::numeric, 0);
    v_total_refund := v_total_refund + (v_qty * v_price);

    INSERT INTO purchase_return_items (user_id, pr_id, product_id, product_name,
                                        quantity, price, price_buy, subtotal)
    VALUES (auth.uid(), v_pr_id, v_prod_id,
            COALESCE((SELECT name FROM products WHERE id = v_prod_id), (v_item->>'product_name')::text),
            v_qty, v_price, v_price_buy, v_qty * v_price);

    UPDATE products
    SET stock = GREATEST(stock - v_qty, 0), updated_at = now()
    WHERE id = v_prod_id AND user_id = auth.uid();
  END LOOP;

  UPDATE purchase_returns SET total_refund = v_total_refund WHERE id = v_pr_id;

  -- AUTO-JURNAL: Utang Usaha (Debit) → Persediaan (Kredit)
  SELECT id INTO v_account_persediaan
  FROM chart_of_accounts WHERE user_id = auth.uid() AND code = '1-1200';
  SELECT id INTO v_account_utang
  FROM chart_of_accounts WHERE user_id = auth.uid() AND code = '2-2000';

  IF v_account_persediaan IS NOT NULL AND v_account_utang IS NOT NULL THEN
    INSERT INTO journal_entries (user_id, entry_date, description, reference_type, reference_id)
    VALUES (auth.uid(), p_return_date, 'Retur pembelian ke ' || COALESCE(p_supplier_name, ''),
            'purchase_return', v_pr_id)
    RETURNING id INTO v_journal_id;

    INSERT INTO journal_lines (user_id, journal_id, account_id, account_code, account_name, debit, credit)
    SELECT auth.uid(), v_journal_id, v_account_utang, '2-2000', 'Utang Usaha', v_total_refund, 0;

    INSERT INTO journal_lines (user_id, journal_id, account_id, account_code, account_name, debit, credit)
    SELECT auth.uid(), v_journal_id, v_account_persediaan, '1-1200', 'Persediaan Barang', 0, v_total_refund;
  END IF;

  RETURN v_pr_id;
END;
$function$;

-- >>> create_return
CREATE OR REPLACE FUNCTION public.create_return(p_transaction_id uuid, p_items jsonb, p_notes text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 set search_path = public
AS $function$
DECLARE
  v_return_id uuid;
  v_item jsonb;
  v_product_id uuid;
  v_qty integer;
  v_product_name text;
  v_price numeric;
  v_price_buy numeric;
  v_subtotal numeric;
  v_total_refund numeric := 0;
  v_bought integer;
  v_returned integer;
  v_status text;
  v_transaction_number text;
  v_paid_amount numeric;
  v_remaining_amount numeric;
  v_account_kas uuid;
  v_account_piutang uuid;
  v_account_pendapatan uuid;
  v_account_hpp uuid;
  v_account_persediaan uuid;
  v_journal_id uuid;
  v_total_cogs_returned numeric := 0;
  v_cogs numeric;
BEGIN
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Tidak ada item yang diretur';
  END IF;

  SELECT status, transaction_number, paid_amount, remaining_amount
    INTO v_status, v_transaction_number, v_paid_amount, v_remaining_amount
  FROM transactions
  WHERE id = p_transaction_id AND user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaksi tidak ditemukan';
  END IF;

  IF v_status = 'batal' THEN
    RAISE EXCEPTION 'Transaksi batal tidak dapat diretur';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'product_id')::uuid;
    v_qty := (v_item->>'quantity')::int;

    IF v_qty IS NULL OR v_qty <= 0 THEN
      RAISE EXCEPTION 'Jumlah retur harus lebih dari 0';
    END IF;

    SELECT quantity INTO v_bought
    FROM transaction_items
    WHERE transaction_id = p_transaction_id AND product_id = v_product_id AND user_id = auth.uid();

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Produk tidak ada di transaksi ini';
    END IF;

    SELECT COALESCE(SUM(ri.quantity), 0) INTO v_returned
    FROM return_items ri
    JOIN returns r ON r.id = ri.return_id
    WHERE r.transaction_id = p_transaction_id AND ri.product_id = v_product_id AND r.user_id = auth.uid();

    IF v_qty > v_bought - v_returned THEN
      RAISE EXCEPTION 'Jumlah retur melebihi sisa produk (maks %)', v_bought - v_returned;
    END IF;
  END LOOP;

  INSERT INTO returns (user_id, transaction_id, notes, total_refund)
  VALUES (auth.uid(), p_transaction_id, p_notes, 0)
  RETURNING id INTO v_return_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'product_id')::uuid;
    v_qty := (v_item->>'quantity')::int;

    SELECT product_name, price INTO v_product_name, v_price
    FROM transaction_items
    WHERE transaction_id = p_transaction_id AND product_id = v_product_id;

    SELECT price_buy INTO v_price_buy
    FROM products
    WHERE id = v_product_id AND user_id = auth.uid();

    v_subtotal := v_price * v_qty;
    v_total_refund := v_total_refund + v_subtotal;

    v_cogs := COALESCE(v_price_buy, 0) * v_qty;
    v_total_cogs_returned := v_total_cogs_returned + v_cogs;

    INSERT INTO return_items (user_id, return_id, product_id, product_name, price, price_buy, quantity, subtotal)
    VALUES (auth.uid(), v_return_id, v_product_id, v_product_name, v_price, COALESCE(v_price_buy, 0), v_qty, v_subtotal);

    UPDATE products SET stock = stock + v_qty, updated_at = now()
    WHERE id = v_product_id AND user_id = auth.uid();
  END LOOP;

  UPDATE returns SET total_refund = v_total_refund WHERE id = v_return_id;

  UPDATE transactions
  SET subtotal = GREATEST(subtotal - v_total_refund, 0),
      total = GREATEST(total - v_total_refund, 0),
      remaining_amount = GREATEST(GREATEST(total - v_total_refund, 0) - paid_amount, 0),
      payment_status = CASE WHEN paid_amount >= GREATEST(total - v_total_refund, 0)
                            THEN 'lunas' ELSE 'belum_lunas' END,
      updated_at = now()
  WHERE id = p_transaction_id AND user_id = auth.uid();

  SELECT id INTO v_account_kas FROM chart_of_accounts WHERE user_id = auth.uid() AND code = '1-1000';
  SELECT id INTO v_account_piutang FROM chart_of_accounts WHERE user_id = auth.uid() AND code = '1-1100';
  SELECT id INTO v_account_pendapatan FROM chart_of_accounts WHERE user_id = auth.uid() AND code = '4-4000';
  SELECT id INTO v_account_hpp FROM chart_of_accounts WHERE user_id = auth.uid() AND code = '5-5000';
  SELECT id INTO v_account_persediaan FROM chart_of_accounts WHERE user_id = auth.uid() AND code = '1-1200';

  IF v_account_pendapatan IS NOT NULL THEN
    INSERT INTO journal_entries (user_id, entry_date, description, reference_type, reference_id)
    VALUES (auth.uid(), now(), 'Retur ' || v_transaction_number, 'return', v_return_id)
    RETURNING id INTO v_journal_id;

    INSERT INTO journal_lines (user_id, journal_id, account_id, account_code, account_name, debit, credit)
    SELECT auth.uid(), v_journal_id, v_account_pendapatan, '4-4000', 'Pendapatan Penjualan', v_total_refund, 0;

    IF v_paid_amount > 0 AND v_account_kas IS NOT NULL THEN
      INSERT INTO journal_lines (user_id, journal_id, account_id, account_code, account_name, debit, credit)
      SELECT auth.uid(), v_journal_id, v_account_kas, '1-1000', 'Kas', 0, LEAST(v_total_refund, v_paid_amount);
    END IF;

    IF v_remaining_amount > 0 AND v_account_piutang IS NOT NULL THEN
      INSERT INTO journal_lines (user_id, journal_id, account_id, account_code, account_name, debit, credit)
      SELECT auth.uid(), v_journal_id, v_account_piutang, '1-1100', 'Piutang Usaha', 0, LEAST(v_total_refund, v_remaining_amount);
    END IF;

    IF v_total_cogs_returned > 0 AND v_account_hpp IS NOT NULL AND v_account_persediaan IS NOT NULL THEN
      INSERT INTO journal_lines (user_id, journal_id, account_id, account_code, account_name, debit, credit)
      SELECT auth.uid(), v_journal_id, v_account_persediaan, '1-1200', 'Persediaan Barang', v_total_cogs_returned, 0;
      INSERT INTO journal_lines (user_id, journal_id, account_id, account_code, account_name, debit, credit)
      SELECT auth.uid(), v_journal_id, v_account_hpp, '5-5000', 'Harga Pokok Penjualan (HPP)', 0, v_total_cogs_returned;
    END IF;
  END IF;

  RETURN v_return_id;
END;
$function$;

-- >>> create_return_notification
CREATE OR REPLACE FUNCTION public.create_return_notification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_transaction_number TEXT;
BEGIN
  -- Ambil nomor transaksi
  SELECT transaction_number INTO v_transaction_number
  FROM transactions
  WHERE id = NEW.transaction_id;
  
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    data
  ) VALUES (
    NEW.user_id,
    'return',
    'Retur Produk',
    'Retur ' || NEW.return_number || ' untuk transaksi ' || v_transaction_number || ' berhasil diproses',
    jsonb_build_object(
      'return_id', NEW.id,
      'return_number', NEW.return_number,
      'transaction_id', NEW.transaction_id,
      'total_refund', NEW.total_refund
    )
  );
  
  RETURN NEW;
END;
$function$;

-- >>> create_stock_adjustment
CREATE OR REPLACE FUNCTION public.create_stock_adjustment(p_product_id uuid, p_adjustment_type text, p_quantity_before integer, p_quantity_after integer, p_quantity_change integer, p_reason text, p_notes text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 set search_path = public
AS $function$
DECLARE
  v_adjustment_id uuid;
  v_product products%ROWTYPE;
  v_account_persediaan uuid;
  v_account_modal uuid;
  v_journal_id uuid;
  v_amount numeric;
BEGIN
  -- Ambil produk
  SELECT * INTO v_product
  FROM products
  WHERE id = p_product_id AND user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Produk tidak ditemukan';
  END IF;

  -- Simpan adjustment
  INSERT INTO stock_adjustments (
    user_id, product_id, adjustment_type,
    quantity_before, quantity_after, quantity_change,
    reason, notes, created_at
  ) VALUES (
    auth.uid(), p_product_id, p_adjustment_type,
    p_quantity_before, p_quantity_after, p_quantity_change,
    p_reason, p_notes, now()
  )
  RETURNING id INTO v_adjustment_id;

  -- Update stok produk
  UPDATE products
  SET stock = p_quantity_after, updated_at = now()
  WHERE id = p_product_id AND user_id = auth.uid();

  -- Catat stock movement
  INSERT INTO stock_movements (
    user_id, product_id,
    movement_type,
    quantity,
    quantity_before,
    quantity_after,
    reference_type,
    reference_id,
    notes,
    created_at
  ) VALUES (
    auth.uid(), p_product_id,
    'adjustment',
    p_quantity_change,
    p_quantity_before,
    p_quantity_after,
    'stock_adjustment',
    v_adjustment_id,
    p_reason,
    now()
  );

  -- ✅ AUTO-JURNAL dengan KODE LAMA (1-1200, 3-1000)
  v_amount := ABS(p_quantity_change) * COALESCE(v_product.price_buy, 0);

  IF v_amount > 0 THEN
    SELECT id INTO v_account_persediaan FROM chart_of_accounts WHERE user_id = auth.uid() AND code = '1-1200';
    SELECT id INTO v_account_modal FROM chart_of_accounts WHERE user_id = auth.uid() AND code = '3-1000';

    IF v_account_persediaan IS NOT NULL AND v_account_modal IS NOT NULL THEN
      INSERT INTO journal_entries (user_id, entry_date, description, reference_type, reference_id)
      VALUES (
        auth.uid(),
        now(),
        'Adjustment Stok: ' || v_product.name || ' (' || p_reason || ')',
        'stock_adjustment',
        v_adjustment_id
      )
      RETURNING id INTO v_journal_id;

      -- Jika tambah stok (+): Debit Persediaan (1-1200), Credit Modal (3-1000)
      IF p_quantity_change > 0 THEN
        INSERT INTO journal_lines (user_id, journal_id, account_id, account_code, account_name, debit, credit)
        VALUES
          (auth.uid(), v_journal_id, v_account_persediaan, '1-1200', 'Persediaan Barang Dagangan', v_amount, 0),
          (auth.uid(), v_journal_id, v_account_modal, '3-1000', 'Modal', 0, v_amount);
      -- Jika kurangi stok (-): Debit Modal (3-1000), Credit Persediaan (1-1200)
      ELSE
        INSERT INTO journal_lines (user_id, journal_id, account_id, account_code, account_name, debit, credit)
        VALUES
          (auth.uid(), v_journal_id, v_account_modal, '3-1000', 'Modal', v_amount, 0),
          (auth.uid(), v_journal_id, v_account_persediaan, '1-1200', 'Persediaan Barang Dagangan', 0, v_amount);
      END IF;
    END IF;
  END IF;

  RETURN v_adjustment_id;
END;
$function$;

-- >>> create_stock_opname
CREATE OR REPLACE FUNCTION public.create_stock_opname(p_opname_number text, p_opname_date date, p_notes text DEFAULT NULL::text, p_items jsonb DEFAULT '[]'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 set search_path = public
AS $function$
DECLARE
  v_opname_id uuid;
  v_opname_number text;
  v_item jsonb;
  v_product_id uuid;
  v_system_quantity integer;
  v_actual_quantity integer;
  v_difference integer;
  v_item_notes text;
  v_product products%ROWTYPE;
BEGIN
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Tidak ada item untuk opname';
  END IF;

  -- Nomor opname: pakai yang dikirim, atau generate bila kosong
  v_opname_number := COALESCE(NULLIF(p_opname_number, ''), 'OPN-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(md5(random()::text), 1, 6)));

  -- Validasi semua item dulu sebelum menulis apa pun
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'product_id')::uuid;
    v_actual_quantity := (v_item->>'actual_quantity')::int;

    SELECT * INTO v_product
    FROM products
    WHERE id = v_product_id AND user_id = auth.uid();

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Produk tidak ditemukan';
    END IF;

    IF v_actual_quantity < 0 THEN
      RAISE EXCEPTION 'Jumlah fisik tidak boleh negatif';
    END IF;
  END LOOP;

  -- Simpan header opname (status = 'completed')
  INSERT INTO stock_opnames (
    user_id, opname_number, opname_date, status, notes,
    completed_at, created_by
  ) VALUES (
    auth.uid(), v_opname_number, p_opname_date, 'completed', p_notes,
    now(), auth.uid()
  )
  RETURNING id INTO v_opname_id;

  -- Simpan items + update stok (trigger mencatat stock_movement)
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'product_id')::uuid;
    v_system_quantity := (v_item->>'system_quantity')::int;
    v_actual_quantity := (v_item->>'actual_quantity')::int;
    v_difference := (v_item->>'difference')::int;
    v_item_notes := v_item->>'notes';

    INSERT INTO stock_opname_items (
      user_id, opname_id, product_id, system_quantity,
      actual_quantity, difference, notes
    ) VALUES (
      auth.uid(), v_opname_id, v_product_id, v_system_quantity,
      v_actual_quantity, v_difference, NULLIF(v_item_notes, '')
    );

    IF v_difference <> 0 THEN
      UPDATE products
      SET stock = v_actual_quantity,
          updated_at = now()
      WHERE id = v_product_id AND user_id = auth.uid();
    END IF;
  END LOOP;

  RETURN v_opname_id;
END;
$function$;

-- >>> create_transaction
CREATE OR REPLACE FUNCTION public.create_transaction(p_customer_id uuid, p_customer_name text, p_payment_method text, p_paid_amount numeric, p_discount numeric, p_notes text, p_items jsonb, p_return_amount numeric DEFAULT 0, p_transaction_date timestamp with time zone DEFAULT now())
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 set search_path = public
AS $function$
DECLARE
  v_transaction_id uuid;
  v_payment_id uuid;
  v_total numeric := 0;
  v_total_cogs numeric := 0;
  v_paid numeric;
  v_remaining numeric;
  v_payment_status text;
  v_item jsonb;
  v_product products%ROWTYPE;
  v_price numeric;
  v_subtotal numeric;
  v_quantity integer;
  v_cogs numeric;
  -- Penegakan limit kredit
  v_credit_limit numeric;
  v_current_debt numeric;
  -- Akun untuk auto-jurnal
  v_account_kas uuid;
  v_account_piutang uuid;
  v_account_pendapatan uuid;
  v_account_hpp uuid;
  v_account_persediaan uuid;
  v_journal_id uuid;
BEGIN
  -- Validasi & hitung total dari tiap item
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    SELECT * INTO v_product
    FROM products
    WHERE id = (v_item->>'product_id')::uuid
      AND user_id = auth.uid();

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Produk tidak ditemukan';
    END IF;

    v_quantity := (v_item->>'quantity')::integer;
    IF v_quantity <= 0 THEN
      RAISE EXCEPTION 'Jumlah tidak valid';
    END IF;

    IF v_product.stock < v_quantity THEN
      RAISE EXCEPTION 'Stok % tidak mencukupi (sisa %)', v_product.name, v_product.stock;
    END IF;

    v_price := COALESCE(NULLIF((v_item->>'price')::numeric, 0), v_product.price_sell);
    v_subtotal := v_price * v_quantity;
    v_total := v_total + v_subtotal;

    -- Hitung HPP (Harga Pokok Penjualan)
    v_cogs := COALESCE(v_product.price_buy, 0) * v_quantity;
    v_total_cogs := v_total_cogs + v_cogs;
  END LOOP;

  -- Hitung total setelah diskon dan retur
  v_total := GREATEST(v_total - COALESCE(p_discount, 0) - COALESCE(p_return_amount, 0), 0);
  v_paid := COALESCE(p_paid_amount, 0);
  v_remaining := GREATEST(v_total - v_paid, 0);
  v_payment_status := CASE WHEN v_paid >= v_total THEN 'lunas' ELSE 'belum_lunas' END;

  -- ============================================================
  -- PENEGAKAN LIMIT KREDIT (hard stop)
  -- ============================================================
  IF p_customer_id IS NOT NULL AND v_remaining > 0 THEN
    SELECT credit_limit INTO v_credit_limit
    FROM customers
    WHERE id = p_customer_id AND user_id = auth.uid();

    -- 0 / tidak ada → pakai default global
    IF COALESCE(v_credit_limit, 0) = 0 THEN
      SELECT default_credit_limit INTO v_credit_limit
      FROM store_settings
      WHERE user_id = auth.uid()
      LIMIT 1;
    END IF;

    -- 0 lagi → unlimited, tidak ada batasan
    IF COALESCE(v_credit_limit, 0) > 0 THEN
      SELECT COALESCE(SUM(remaining_amount), 0) INTO v_current_debt
      FROM transactions
      WHERE customer_id = p_customer_id
        AND user_id = auth.uid()
        AND remaining_amount > 0
        AND status <> 'batal';

      IF v_current_debt + v_remaining > v_credit_limit THEN
        RAISE EXCEPTION
          'Limit kredit terlampaui. Limit: Rp %, Hutang saat ini: Rp %, Sisa transaksi ini: Rp %',
          replace(to_char(v_credit_limit, 'FM999G999G999G999'), ',', '.'),
          replace(to_char(v_current_debt, 'FM999G999G999G999'), ',', '.'),
          replace(to_char(v_remaining, 'FM999G999G999G999'), ',', '.');
      END IF;
    END IF;
  END IF;

  -- Simpan header transaksi dengan custom date
  INSERT INTO transactions (
    user_id, customer_id, customer_name, subtotal, discount, total,
    payment_method, paid_amount, change_amount, remaining_amount, payment_status, notes,
    created_at, updated_at
  ) VALUES (
    auth.uid(), p_customer_id, p_customer_name,
    v_total + COALESCE(p_discount, 0) + COALESCE(p_return_amount, 0),
    COALESCE(p_discount, 0) + COALESCE(p_return_amount, 0), v_total,
    COALESCE(p_payment_method, 'tunai'), v_paid,
    GREATEST(v_paid - v_total, 0),
    v_remaining, v_payment_status,
    p_notes,
    p_transaction_date, p_transaction_date
  )
  RETURNING id INTO v_transaction_id;

  -- Simpan rincian item + kurangi stok
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    SELECT * INTO v_product
    FROM products
    WHERE id = (v_item->>'product_id')::uuid
      AND user_id = auth.uid();

    v_quantity := (v_item->>'quantity')::integer;
    v_price := COALESCE(NULLIF((v_item->>'price')::numeric, 0), v_product.price_sell);
    v_subtotal := v_price * v_quantity;

    INSERT INTO transaction_items (
      user_id, transaction_id, product_id, product_name, price, quantity, subtotal,
      created_at
    ) VALUES (
      auth.uid(), v_transaction_id, v_product.id, v_product.name,
      v_price, v_quantity, v_subtotal,
      p_transaction_date
    );

    UPDATE products
    SET stock = stock - v_quantity,
        updated_at = now()
    WHERE id = v_product.id AND user_id = auth.uid();
  END LOOP;

  -- Catat pembayaran awal ke riwayat pembayaran (jika ada bayaran)
  IF v_paid > 0 THEN
    INSERT INTO transaction_payments (
      user_id, transaction_id, amount, payment_method, notes,
      payment_date, created_at
    ) VALUES (
      auth.uid(), v_transaction_id, v_paid,
      COALESCE(p_payment_method, 'tunai'), NULL,
      DATE(p_transaction_date), p_transaction_date
    )
    RETURNING id INTO v_payment_id;

    -- ✅ AUTO-ALLOCATE: Alokasikan pembayaran ke items (FIFO)
    PERFORM allocate_payment_to_items(v_transaction_id, v_payment_id, v_paid);
  END IF;

  -- ============================================================
  -- AUTO-JURNAL
  -- ============================================================
  SELECT id INTO v_account_kas FROM chart_of_accounts WHERE user_id = auth.uid() AND code = '1-1000';
  SELECT id INTO v_account_piutang FROM chart_of_accounts WHERE user_id = auth.uid() AND code = '1-1100';
  SELECT id INTO v_account_pendapatan FROM chart_of_accounts WHERE user_id = auth.uid() AND code = '4-4000';
  SELECT id INTO v_account_hpp FROM chart_of_accounts WHERE user_id = auth.uid() AND code = '5-5000';
  SELECT id INTO v_account_persediaan FROM chart_of_accounts WHERE user_id = auth.uid() AND code = '1-1200';

  IF v_account_kas IS NOT NULL AND v_account_pendapatan IS NOT NULL THEN
    INSERT INTO journal_entries (user_id, entry_date, description, reference_type, reference_id)
    VALUES (auth.uid(), p_transaction_date, 'Penjualan ' || COALESCE(p_customer_name, 'eceran'), 'transaction', v_transaction_id)
    RETURNING id INTO v_journal_id;

    IF v_paid > 0 THEN
      INSERT INTO journal_lines (user_id, journal_id, account_id, account_code, account_name, debit, credit)
      SELECT auth.uid(), v_journal_id, v_account_kas, '1-1000', 'Kas', v_paid, 0;
    END IF;

    IF v_remaining > 0 THEN
      INSERT INTO journal_lines (user_id, journal_id, account_id, account_code, account_name, debit, credit)
      SELECT auth.uid(), v_journal_id, v_account_piutang, '1-1100', 'Piutang Usaha', v_remaining, 0;
    END IF;

    INSERT INTO journal_lines (user_id, journal_id, account_id, account_code, account_name, debit, credit)
    SELECT auth.uid(), v_journal_id, v_account_pendapatan, '4-4000', 'Pendapatan Penjualan', 0, v_total;

    IF v_total_cogs > 0 AND v_account_hpp IS NOT NULL AND v_account_persediaan IS NOT NULL THEN
      INSERT INTO journal_lines (user_id, journal_id, account_id, account_code, account_name, debit, credit)
      SELECT auth.uid(), v_journal_id, v_account_hpp, '5-5000', 'Harga Pokok Penjualan (HPP)', v_total_cogs, 0;
      INSERT INTO journal_lines (user_id, journal_id, account_id, account_code, account_name, debit, credit)
      SELECT auth.uid(), v_journal_id, v_account_persediaan, '1-1200', 'Persediaan Barang', 0, v_total_cogs;
    END IF;
  END IF;

  RETURN v_transaction_id;
END;
$function$;

-- >>> create_transaction_notification
CREATE OR REPLACE FUNCTION public.create_transaction_notification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    data
  ) VALUES (
    NEW.user_id,
    'transaction',
    'Transaksi Baru',
    'Transaksi ' || NEW.transaction_number || ' berhasil dibuat dengan total ' || NEW.total,
    jsonb_build_object(
      'transaction_id', NEW.id,
      'transaction_number', NEW.transaction_number,
      'total', NEW.total,
      'customer_name', NEW.customer_name
    )
  );
  
  RETURN NEW;
END;
$function$;

-- >>> deallocate_payment
CREATE OR REPLACE FUNCTION public.deallocate_payment(p_payment_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 set search_path = public
AS $function$
BEGIN
  DELETE FROM transaction_item_payments
  WHERE payment_id = p_payment_id AND user_id = auth.uid();
END;
$function$;

-- >>> delete_closing_period
CREATE OR REPLACE FUNCTION public.delete_closing_period(p_closing_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 set search_path = public
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_period_end date;
BEGIN
  SELECT period_end INTO v_period_end
  FROM closing_periods
  WHERE id = p_closing_id AND user_id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Periode tidak ditemukan atau bukan milik Anda.';
  END IF;

  UPDATE journal_entries
  SET status = 'void', updated_at = now()
  WHERE user_id = v_user_id
    AND reference_type = 'closing'
    AND status <> 'void'
    AND (
      reference_id = p_closing_id
      OR (reference_id IS NULL AND entry_date::date = v_period_end)
    );

  DELETE FROM closing_periods WHERE id = p_closing_id;
END;
$function$;

-- >>> delete_payroll
CREATE OR REPLACE FUNCTION public.delete_payroll(p_payroll_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 set search_path = public
AS $function$
DECLARE
  v_user_id uuid;
  v_journal_id uuid;
BEGIN
  v_user_id := auth.uid();

  SELECT journal_entry_id INTO v_journal_id
  FROM payrolls
  WHERE id = p_payroll_id AND user_id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Slip gaji tidak ditemukan';
  END IF;

  IF v_journal_id IS NOT NULL THEN
    DELETE FROM journal_lines WHERE journal_entry_id = v_journal_id;
    DELETE FROM journal_entries WHERE id = v_journal_id;
  END IF;

  DELETE FROM payrolls WHERE id = p_payroll_id AND user_id = v_user_id;

  RETURN true;
END;
$function$;

-- >>> delete_return
CREATE OR REPLACE FUNCTION public.delete_return(p_return_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 set search_path = public
AS $function$
DECLARE
  v_item RECORD;
BEGIN
  -- Hapus jurnal retur terkait (reversal) agar tidak orphan
  DELETE FROM journal_lines
  WHERE journal_id IN (
    SELECT id FROM journal_entries
    WHERE reference_type = 'return' AND reference_id = p_return_id AND user_id = auth.uid()
  );
  DELETE FROM journal_entries
  WHERE reference_type = 'return' AND reference_id = p_return_id AND user_id = auth.uid();

  -- Kurangi kembali stok produk
  FOR v_item IN
    SELECT ri.product_id, ri.quantity
    FROM return_items ri
    WHERE ri.return_id = p_return_id AND ri.user_id = auth.uid()
  LOOP
    IF v_item.product_id IS NOT NULL THEN
      UPDATE products
      SET stock = stock - v_item.quantity,
          updated_at = now()
      WHERE id = v_item.product_id AND user_id = auth.uid();
    END IF;
  END LOOP;

  DELETE FROM returns
  WHERE id = p_return_id AND user_id = auth.uid();
END;
$function$;

-- >>> delete_transaction
CREATE OR REPLACE FUNCTION public.delete_transaction(p_transaction_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 set search_path = public
AS $function$
DECLARE
  v_item RECORD;
BEGIN
  -- Kembalikan stok produk dari tiap item
  FOR v_item IN
    SELECT ti.product_id, ti.quantity
    FROM transaction_items ti
    WHERE ti.transaction_id = p_transaction_id
      AND ti.user_id = auth.uid()
  LOOP
    IF v_item.product_id IS NOT NULL THEN
      UPDATE products
      SET stock = stock + v_item.quantity,
          updated_at = now()
      WHERE id = v_item.product_id AND user_id = auth.uid();
    END IF;
  END LOOP;

  -- Hapus alokasi pembayaran (optional karena CASCADE, tapi explicit lebih clear)
  DELETE FROM transaction_item_payments
  WHERE transaction_id = p_transaction_id AND user_id = auth.uid();

  -- Hapus transaksi (items & payments ikut terhapus via ON DELETE CASCADE)
  DELETE FROM transactions
  WHERE id = p_transaction_id AND user_id = auth.uid();
END;
$function$;

-- >>> delete_transaction_payment
CREATE OR REPLACE FUNCTION public.delete_transaction_payment(p_payment_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 set search_path = public
AS $function$
DECLARE
  v_payment RECORD;
BEGIN
  -- Get payment info
  SELECT tp.id, tp.transaction_id, tp.amount
    INTO v_payment
  FROM transaction_payments tp
  WHERE tp.id = p_payment_id AND tp.user_id = auth.uid();
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pembayaran tidak ditemukan';
  END IF;
  
  -- Deallocate payment dari items
  PERFORM deallocate_payment(p_payment_id);
  
  -- Delete payment record
  DELETE FROM transaction_payments
  WHERE id = p_payment_id AND user_id = auth.uid();
  
  -- Update transaction totals
  UPDATE transactions t
  SET 
    paid_amount = (
      SELECT COALESCE(SUM(amount), 0)
      FROM transaction_payments
      WHERE transaction_id = t.id
    ),
    remaining_amount = t.total - (
      SELECT COALESCE(SUM(amount), 0)
      FROM transaction_payments
      WHERE transaction_id = t.id
    ),
    payment_status = CASE
      WHEN t.total <= (
        SELECT COALESCE(SUM(amount), 0)
        FROM transaction_payments
        WHERE transaction_id = t.id
      ) THEN 'lunas'
      ELSE 'belum_lunas'
    END,
    updated_at = now()
  WHERE id = v_payment.transaction_id AND user_id = auth.uid();
END;
$function$;

-- >>> generate_delivery_number
CREATE OR REPLACE FUNCTION public.generate_delivery_number()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 set search_path = public
AS $function$
DECLARE
  v_year TEXT;
  v_count INTEGER;
  v_number TEXT;
BEGIN
  v_year := to_char(now(), 'YYYY');
  SELECT COUNT(*) INTO v_count
  FROM delivery_orders
  WHERE user_id = auth.uid();

  v_number := 'SJ-' || v_year || '-' || LPAD(COALESCE(v_count + 1, 1)::TEXT, 4, '0');
  RETURN v_number;
END;
$function$;

-- >>> generate_employee_code
CREATE OR REPLACE FUNCTION public.generate_employee_code()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 set search_path = public
AS $function$
DECLARE
  v_count INTEGER;
  v_code TEXT;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM employees
  WHERE user_id = auth.uid();

  v_code := 'EMP-' || to_char(now(), 'YYYYMM') || '-' || LPAD(COALESCE(v_count + 1, 1)::TEXT, 4, '0');
  RETURN v_code;
END;
$function$;

-- >>> generate_payroll_code
CREATE OR REPLACE FUNCTION public.generate_payroll_code()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 set search_path = public
AS $function$
DECLARE
  v_count INTEGER;
  v_code TEXT;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM payrolls
  WHERE user_id = auth.uid()
    AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM now())
    AND EXTRACT(MONTH FROM created_at) = EXTRACT(MONTH FROM now());

  v_code := 'PAY-' || to_char(now(), 'YYYYMM') || '-' || LPAD((v_count + 1)::TEXT, 4, '0');
  RETURN v_code;
END;
$function$;

-- >>> generate_payroll_for_employee
CREATE OR REPLACE FUNCTION public.generate_payroll_for_employee(p_employee_id uuid, p_period_start date, p_period_end date, p_kasbon_deduction numeric DEFAULT 0)
 RETURNS payrolls
 LANGUAGE plpgsql
 SECURITY DEFINER
 set search_path = public
AS $function$
DECLARE
  v_user_id uuid;
  v_employee RECORD;
  v_payroll_id uuid;
  v_period_code TEXT;
  v_base_salary numeric;
  v_incentive numeric;
  v_net numeric;
  v_do RECORD;
  v_incentive_details jsonb;
  v_detail jsonb;
  v_item RECORD;
  v_item_desc text;
  v_bagian_loader numeric;
  v_result payrolls;
BEGIN
  v_user_id := auth.uid();

  -- Validasi karyawan
  SELECT e.* INTO v_employee
  FROM employees e
  WHERE e.id = p_employee_id AND e.user_id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Karyawan tidak ditemukan';
  END IF;

  IF v_employee.status != 'aktif' OR v_employee.is_active = false THEN
    RAISE EXCEPTION 'Karyawan tidak aktif';
  END IF;

  -- Validasi tanggal
  IF p_period_start > p_period_end THEN
    RAISE EXCEPTION 'Tanggal mulai tidak boleh lebih besar dari tanggal selesai';
  END IF;

  -- Generate kode slip gaji
  v_period_code := generate_payroll_code();
  v_payroll_id := gen_random_uuid();

  -- Gaji pokok
  v_base_salary := COALESCE(NULLIF(v_employee.base_salary, 0), 0);

  v_incentive := 0;
  v_incentive_details := '[]'::jsonb;

  -- ============================================================
  -- Insentif LOADER: bagi rata nilai muatan per orang
  -- ============================================================
  IF EXISTS (
    SELECT 1 FROM delivery_loaders l WHERE l.employee_id = p_employee_id
  ) THEN
    FOR v_do IN
      SELECT dor.id,
             dor.do_number,
             dor.do_date,
             COALESCE((
               SELECT SUM(li.quantity * li.unit_price)
               FROM delivery_load_items li
               WHERE li.delivery_order_id = dor.id
             ), 0) AS nilai_muatan,
             (
               SELECT COUNT(*)
               FROM delivery_loaders l
               WHERE l.delivery_order_id = dor.id
             ) AS jumlah_loader
      FROM delivery_orders dor
      WHERE dor.user_id = v_user_id
        AND dor.status = 'selesai'
        AND dor.do_date BETWEEN p_period_start AND p_period_end
        AND EXISTS (
          SELECT 1
          FROM delivery_loaders l
          WHERE l.delivery_order_id = dor.id
            AND l.employee_id = p_employee_id
        )
    LOOP
      IF v_do.jumlah_loader > 0 AND v_do.nilai_muatan > 0 THEN
        v_bagian_loader := CEIL(v_do.nilai_muatan / v_do.jumlah_loader);
        v_incentive := v_incentive + v_bagian_loader;
        
        -- Buat deskripsi dari items
        v_item_desc := '';
        FOR v_item IN
          SELECT product_name, quantity, unit_price
          FROM delivery_load_items
          WHERE delivery_order_id = v_do.id
        LOOP
          IF v_item_desc != '' THEN
            v_item_desc := v_item_desc || ', ';
          END IF;
          v_item_desc := v_item_desc || v_item.product_name || ' (' || 
                         v_item.quantity || ' x ' || 
                         to_char(v_item.unit_price, 'FM999G999G999G999') || ')';
        END LOOP;
        
        -- Tambahkan detail ke array
        v_detail := jsonb_build_object(
          'type', 'loader',
          'date', v_do.do_date,
          'do_number', COALESCE(v_do.do_number, substring(v_do.id::text, 1, 8)),
          'description', 'Bongkar muat: ' || v_item_desc || ' — Dibagi ' || v_do.jumlah_loader || ' orang',
          'amount', v_bagian_loader
        );
        v_incentive_details := v_incentive_details || v_detail;
      END IF;
    END LOOP;
  END IF;

  -- ============================================================
  -- Insentif DRIVER: total driver_fee
  -- ============================================================
  FOR v_do IN
    SELECT dor.id,
           dor.do_number,
           dor.do_date,
           dor.driver_fee
    FROM delivery_orders dor
    WHERE dor.user_id = v_user_id
      AND dor.status = 'selesai'
      AND dor.do_date BETWEEN p_period_start AND p_period_end
      AND dor.driver_id = p_employee_id
      AND dor.driver_fee IS NOT NULL
      AND dor.driver_fee > 0
  LOOP
    v_incentive := v_incentive + v_do.driver_fee;
    
    -- Tambahkan detail ke array
    v_detail := jsonb_build_object(
      'type', 'driver',
      'date', v_do.do_date,
      'do_number', COALESCE(v_do.do_number, substring(v_do.id::text, 1, 8)),
      'description', 'Ongkos supir',
      'amount', v_do.driver_fee
    );
    v_incentive_details := v_incentive_details || v_detail;
  END LOOP;

  -- Hitung gaji bersih
  v_net := v_base_salary + v_incentive - COALESCE(p_kasbon_deduction, 0);

  -- Insert slip gaji dengan detail insentif
  INSERT INTO payrolls (
    id, user_id, employee_id,
    period_code, period_start, period_end,
    base_salary, incentive_amount, kasbon_deduction, total_net,
    incentive_details,
    status, created_at, updated_at
  ) VALUES (
    v_payroll_id, v_user_id, p_employee_id,
    v_period_code, p_period_start, p_period_end,
    v_base_salary, v_incentive, COALESCE(p_kasbon_deduction, 0), v_net,
    v_incentive_details,
    'draft', now(), now()
  )
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$function$;

-- >>> generate_trip_number
CREATE OR REPLACE FUNCTION public.generate_trip_number()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 set search_path = public
AS $function$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM trips WHERE user_id = auth.uid();
  RETURN 'TRP-' || to_char(now(), 'YYYYMMDD') || '-' || LPAD(COALESCE(v_count + 1, 1)::TEXT, 4, '0');
END;
$function$;

-- >>> get_applicable_price
CREATE OR REPLACE FUNCTION public.get_applicable_price(p_product_id uuid, p_customer_id uuid DEFAULT NULL::uuid, p_quantity integer DEFAULT 1, p_date date DEFAULT CURRENT_DATE)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
 set search_path = public
AS $function$
DECLARE
  v_price numeric;
  v_default_price numeric;
BEGIN
  SELECT price_sell INTO v_default_price
  FROM products
  WHERE id = p_product_id AND user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Produk tidak ditemukan';
  END IF;

  -- 1. Harga khusus per pelanggan (prioritas tertinggi)
  IF p_customer_id IS NOT NULL THEN
    SELECT custom_price INTO v_price
    FROM customer_price_matrix
    WHERE user_id = auth.uid()
      AND customer_id = p_customer_id
      AND product_id = p_product_id
      AND is_active = true
      AND p_quantity >= min_quantity
      AND (start_date IS NULL OR start_date <= p_date)
      AND (end_date IS NULL OR end_date >= p_date)
    ORDER BY min_quantity DESC
    LIMIT 1;

    IF FOUND THEN
      RETURN v_price;
    END IF;

    -- 2. Harga khusus per grup (pelanggan jadi anggota grup mana pun)
    --    Bila beberapa grup cocok, ambil yang termurah.
    SELECT MIN(cpm.custom_price) INTO v_price
    FROM customer_price_matrix cpm
    JOIN customer_group_members cgm ON cgm.group_id = cpm.group_id
    WHERE cpm.user_id = auth.uid()
      AND cgm.customer_id = p_customer_id
      AND cpm.product_id = p_product_id
      AND cpm.is_active = true
      AND p_quantity >= cpm.min_quantity
      AND (cpm.start_date IS NULL OR cpm.start_date <= p_date)
      AND (cpm.end_date IS NULL OR cpm.end_date >= p_date);

    IF v_price IS NOT NULL THEN
      RETURN v_price;
    END IF;
  END IF;

  -- 3. Harga tier berdasarkan kuantitas
  SELECT tier_price INTO v_price
  FROM price_tiers
  WHERE user_id = auth.uid()
    AND product_id = p_product_id
    AND is_active = true
    AND p_quantity >= min_quantity
    AND (max_quantity IS NULL OR p_quantity <= max_quantity)
    AND (start_date IS NULL OR start_date <= p_date)
    AND (end_date IS NULL OR end_date >= p_date)
  ORDER BY min_quantity DESC
  LIMIT 1;

  IF FOUND THEN
    RETURN v_price;
  END IF;

  -- 4. Harga default
  RETURN v_default_price;
END;
$function$;

-- >>> get_profit_summary
CREATE OR REPLACE FUNCTION public.get_profit_summary(p_user_id uuid, p_start_date date DEFAULT NULL::date, p_end_date date DEFAULT NULL::date)
 RETURNS TABLE(total_revenue numeric, total_cogs numeric, total_profit numeric, realized_revenue numeric, realized_cogs numeric, realized_profit numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_total_revenue numeric := 0;
  v_total_cogs numeric := 0;
  v_realized_revenue numeric := 0;
  v_date_filter text := '';
BEGIN
  -- Build date filter
  IF p_start_date IS NOT NULL AND p_end_date IS NOT NULL THEN
    v_date_filter := format(' AND t.created_at::date >= %L AND t.created_at::date <= %L', p_start_date, p_end_date);
  END IF;

  -- Total revenue & COGS (semua transaksi yang tidak dibatalkan)
  EXECUTE format('
    SELECT
      COALESCE(SUM(t.total), 0),
      COALESCE(SUM(
        (SELECT SUM(ti.quantity * COALESCE(p.price_buy, 0))
         FROM transaction_items ti
         LEFT JOIN products p ON p.id = ti.product_id
         WHERE ti.transaction_id = t.id)
      ), 0)
    FROM transactions t
    WHERE t.user_id = $1
      AND t.status NOT IN (''batal'', ''void'')
      %s
  ', v_date_filter)
  INTO v_total_revenue, v_total_cogs
  USING p_user_id;

  -- Realized revenue (tunai + piutang terbayar)
  EXECUTE format('
    SELECT COALESCE(SUM(t.paid_amount), 0)
    FROM transactions t
    WHERE t.user_id = $1
      AND t.status NOT IN (''batal'', ''void'')
      %s
  ', v_date_filter)
  INTO v_realized_revenue
  USING p_user_id;

  -- Realized COGS = proportional COGS based on payment ratio
  RETURN QUERY
  SELECT
    v_total_revenue,
    v_total_cogs,
    (v_total_revenue - v_total_cogs) as total_profit,
    v_realized_revenue,
    CASE
      WHEN v_total_revenue > 0 THEN (v_realized_revenue / v_total_revenue) * v_total_cogs
      ELSE 0
    END as realized_cogs,
    CASE
      WHEN v_total_revenue > 0 THEN v_realized_revenue - ((v_realized_revenue / v_total_revenue) * v_total_cogs)
      ELSE 0
    END as realized_profit;
END;
$function$;

-- >>> init_default_coa_for_current_user
CREATE OR REPLACE FUNCTION public.init_default_coa_for_current_user()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 set search_path = public
AS $function$
DECLARE
  v_user_id uuid;
BEGIN
  -- Ambil user_id dari session
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User tidak terautentikasi';
  END IF;

  -- Cek apakah user sudah punya COA
  IF EXISTS (SELECT 1 FROM chart_of_accounts WHERE user_id = v_user_id LIMIT 1) THEN
    RETURN; -- Sudah ada COA, skip
  END IF;

  -- Insert COA default
  INSERT INTO chart_of_accounts (user_id, code, name, type, normal_balance, is_active, is_system)
  VALUES
    -- ASET LANCAR
    (v_user_id, '1-1000', 'Kas', 'asset', 'debit', true, true),
    (v_user_id, '1-1010', 'Bank', 'asset', 'debit', true, true),
    (v_user_id, '1-1020', 'Persediaan Barang Dagangan', 'asset', 'debit', true, true),
    (v_user_id, '1-1030', 'Piutang Usaha', 'asset', 'debit', true, true),
    -- PENDAPATAN
    (v_user_id, '4-1000', 'Pendapatan Penjualan', 'revenue', 'credit', true, true),
    -- BEBAN POKOK PENJUALAN
    (v_user_id, '5-1000', 'Beban Pokok Penjualan', 'expense', 'debit', true, true);
END;
$function$;

-- >>> init_default_coa_for_user
CREATE OR REPLACE FUNCTION public.init_default_coa_for_user(p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 set search_path = public
AS $function$
BEGIN
  -- Cek apakah user sudah punya COA
  IF EXISTS (SELECT 1 FROM chart_of_accounts WHERE user_id = p_user_id LIMIT 1) THEN
    RETURN; -- Sudah ada COA, skip
  END IF;

  -- Insert COA default dengan KODE LAMA (konsisten dengan create_transaction)
  INSERT INTO chart_of_accounts (user_id, code, name, type, normal_balance, is_active, is_system)
  VALUES
    -- ASET LANCAR
    (p_user_id, '1-1000', 'Kas', 'aset', 'debit', true, true),
    (p_user_id, '1-1010', 'Bank', 'aset', 'debit', true, true),
    (p_user_id, '1-1100', 'Piutang Usaha', 'aset', 'debit', true, true),
    (p_user_id, '1-1200', 'Persediaan Barang Dagangan', 'aset', 'debit', true, true),

    -- MODAL
    (p_user_id, '3-1000', 'Modal', 'ekuitas', 'kredit', true, true),

    -- PENDAPATAN
    (p_user_id, '4-4000', 'Pendapatan Penjualan', 'pendapatan', 'kredit', true, true),

    -- BEBAN POKOK PENJUALAN
    (p_user_id, '5-5000', 'Harga Pokok Penjualan (HPP)', 'beban', 'debit', true, true);
END;
$function$;

-- >>> post_adjusting_journal
CREATE OR REPLACE FUNCTION public.post_adjusting_journal(p_entry_date date, p_description text, p_lines jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 set search_path = public
AS $function$
DECLARE
  v_journal_id uuid;
  v_line jsonb;
  v_total_debit numeric := 0;
  v_total_credit numeric := 0;
  v_account chart_of_accounts%ROWTYPE;
  v_user_id uuid;
  v_entry_timestamp timestamptz;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Tidak ada sesi pengguna';
  END IF;

  IF check_period_closed(p_entry_date, v_user_id) THEN
    RAISE EXCEPTION 'Periode % sudah ditutup. Buka kembali periode tersebut sebelum mencatat jurnal penyesuaian.',
      p_entry_date;
  END IF;

  IF p_lines IS NULL OR jsonb_array_length(p_lines) = 0 THEN
    RAISE EXCEPTION 'Jurnal penyesuaian harus memiliki minimal 1 baris';
  END IF;

  IF p_description IS NULL OR trim(p_description) = '' THEN
    RAISE EXCEPTION 'Keterangan jurnal penyesuaian wajib diisi';
  END IF;

  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
  LOOP
    SELECT * INTO v_account
    FROM chart_of_accounts
    WHERE id = (v_line->>'account_id')::uuid
      AND user_id = v_user_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Akun tidak ditemukan';
    END IF;

    IF NOT v_account.is_active THEN
      RAISE EXCEPTION 'Akun % tidak aktif', v_account.name;
    END IF;

    v_total_debit := v_total_debit + COALESCE((v_line->>'debit')::numeric, 0);
    v_total_credit := v_total_credit + COALESCE((v_line->>'credit')::numeric, 0);
  END LOOP;

  IF v_total_debit <= 0 AND v_total_credit <= 0 THEN
    RAISE EXCEPTION 'Jurnal penyesuaian harus memiliki nilai debit atau kredit';
  END IF;

  IF round(v_total_debit, 2) <> round(v_total_credit, 2) THEN
    RAISE EXCEPTION 'Total debit (%) tidak sama dengan total kredit (%)',
      v_total_debit, v_total_credit;
  END IF;

  v_entry_timestamp := p_entry_date::date + CURRENT_TIME;

  INSERT INTO journal_entries (user_id, entry_date, description, reference_type)
  VALUES (v_user_id, v_entry_timestamp, p_description, 'adjusting')
  RETURNING id INTO v_journal_id;

  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
  LOOP
    SELECT * INTO v_account
    FROM chart_of_accounts
    WHERE id = (v_line->>'account_id')::uuid
      AND user_id = v_user_id;

    INSERT INTO journal_lines (user_id, journal_id, account_id, account_code, account_name,
                                debit, credit)
    VALUES (v_user_id, v_journal_id, v_account.id, v_account.code, v_account.name,
            COALESCE((v_line->>'debit')::numeric, 0),
            COALESCE((v_line->>'credit')::numeric, 0));
  END LOOP;

  RETURN v_journal_id;
END;
$function$;

-- >>> post_journal
CREATE OR REPLACE FUNCTION public.post_journal(p_entry_date date, p_description text, p_lines jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 set search_path = public
AS $function$
DECLARE
  v_journal_id uuid;
  v_line jsonb;
  v_total_debit numeric := 0;
  v_total_credit numeric := 0;
  v_account chart_of_accounts%ROWTYPE;
  v_user_id uuid;
  v_entry_timestamp timestamptz;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Tidak ada sesi pengguna';
  END IF;

  IF check_period_closed(p_entry_date, v_user_id) THEN
    RAISE EXCEPTION 'Periode % sudah ditutup. Buka kembali periode tersebut sebelum mencatat jurnal.',
      p_entry_date;
  END IF;

  IF p_lines IS NULL OR jsonb_array_length(p_lines) = 0 THEN
    RAISE EXCEPTION 'Jurnal harus memiliki minimal 1 baris';
  END IF;

  IF p_description IS NULL OR trim(p_description) = '' THEN
    RAISE EXCEPTION 'Deskripsi jurnal wajib diisi';
  END IF;

  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
  LOOP
    SELECT * INTO v_account
    FROM chart_of_accounts
    WHERE id = (v_line->>'account_id')::uuid
      AND user_id = v_user_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Akun tidak ditemukan';
    END IF;

    IF NOT v_account.is_active THEN
      RAISE EXCEPTION 'Akun % tidak aktif', v_account.name;
    END IF;

    v_total_debit := v_total_debit + COALESCE((v_line->>'debit')::numeric, 0);
    v_total_credit := v_total_credit + COALESCE((v_line->>'credit')::numeric, 0);
  END LOOP;

  IF v_total_debit <= 0 AND v_total_credit <= 0 THEN
    RAISE EXCEPTION 'Jurnal harus memiliki nilai debit atau kredit';
  END IF;

  IF round(v_total_debit, 2) <> round(v_total_credit, 2) THEN
    RAISE EXCEPTION 'Total debit (%) tidak sama dengan total kredit (%)',
      v_total_debit, v_total_credit;
  END IF;

  v_entry_timestamp := p_entry_date::date + CURRENT_TIME;

  INSERT INTO journal_entries (user_id, entry_date, description, reference_type)
  VALUES (v_user_id, v_entry_timestamp, p_description, 'manual')
  RETURNING id INTO v_journal_id;

  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
  LOOP
    SELECT * INTO v_account
    FROM chart_of_accounts
    WHERE id = (v_line->>'account_id')::uuid
      AND user_id = v_user_id;

    INSERT INTO journal_lines (user_id, journal_id, account_id, account_code, account_name,
                                debit, credit)
    VALUES (v_user_id, v_journal_id, v_account.id, v_account.code, v_account.name,
            COALESCE((v_line->>'debit')::numeric, 0),
            COALESCE((v_line->>'credit')::numeric, 0));
  END LOOP;

  RETURN v_journal_id;
END;
$function$;

-- >>> post_payroll_journal
CREATE OR REPLACE FUNCTION public.post_payroll_journal(p_payroll_id uuid)
 RETURNS payrolls
 LANGUAGE plpgsql
 SECURITY DEFINER
 set search_path = public
AS $function$
DECLARE
  v_user_id uuid;
  v_payroll RECORD;
  v_journal_id uuid;
  v_journal_number TEXT;
  v_expense_account uuid;
  v_liability_account uuid;
  v_result payrolls;
BEGIN
  v_user_id := auth.uid();

  -- Ambil data payroll
  SELECT p.*, e.name as employee_name
  INTO v_payroll
  FROM payrolls p
  JOIN employees e ON e.id = p.employee_id
  WHERE p.id = p_payroll_id AND p.user_id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Slip gaji tidak ditemukan';
  END IF;

  IF v_payroll.status = 'paid' THEN
    RAISE EXCEPTION 'Slip gaji sudah dibayar';
  END IF;

  IF v_payroll.total_net <= 0 THEN
    RAISE EXCEPTION 'Gaji bersih harus lebih dari 0';
  END IF;

  -- Cari akun biaya gaji (beban)
  SELECT id INTO v_expense_account
  FROM chart_of_accounts
  WHERE user_id = v_user_id
    AND type = 'beban'
    AND (LOWER(name) LIKE '%gaji%' OR LOWER(name) LIKE '%salary%')
  ORDER BY created_at
  LIMIT 1;

  IF v_expense_account IS NULL THEN
    RAISE EXCEPTION 'Akun biaya gaji tidak ditemukan. Buat dulu akun dengan tipe Beban dan nama mengandung "Gaji"';
  END IF;

  -- Cari akun hutang gaji (kewajiban)
  SELECT id INTO v_liability_account
  FROM chart_of_accounts
  WHERE user_id = v_user_id
    AND type = 'kewajiban'
    AND (LOWER(name) LIKE '%hutang%' AND LOWER(name) LIKE '%gaji%')
  ORDER BY created_at
  LIMIT 1;

  IF v_liability_account IS NULL THEN
    RAISE EXCEPTION 'Akun hutang gaji tidak ditemukan. Buat dulu akun dengan tipe Kewajiban dan nama mengandung "Hutang Gaji"';
  END IF;

  -- Generate nomor jurnal
  v_journal_number := 'JV-' || to_char(now(), 'YYYYMMDD') || '-' || LPAD(
    (SELECT COUNT(*) + 1 FROM journal_entries WHERE user_id = v_user_id)::TEXT,
    4, '0'
  );

  v_journal_id := gen_random_uuid();

  -- Insert jurnal entry
  INSERT INTO journal_entries (
    id, user_id, journal_number, entry_date,
    description, reference_type, reference_id,
    created_at, updated_at
  ) VALUES (
    v_journal_id, v_user_id, v_journal_number, CURRENT_DATE,
    'Pembayaran gaji ' || v_payroll.employee_name || ' periode ' ||
      v_payroll.period_start || ' s/d ' || v_payroll.period_end,
    'payroll', p_payroll_id,
    now(), now()
  );

  -- Insert journal lines
  -- Debit: Biaya Gaji (TANPA field description)
  INSERT INTO journal_lines (
    id, user_id, journal_id, account_id, 
    account_code, account_name,
    debit, credit, created_at
  ) 
  SELECT
    gen_random_uuid(), v_user_id, v_journal_id, v_expense_account,
    coa.code, coa.name,
    v_payroll.total_net, 0, now()
  FROM chart_of_accounts coa
  WHERE coa.id = v_expense_account;

  -- Credit: Hutang Gaji (TANPA field description)
  INSERT INTO journal_lines (
    id, user_id, journal_id, account_id,
    account_code, account_name,
    debit, credit, created_at
  )
  SELECT
    gen_random_uuid(), v_user_id, v_journal_id, v_liability_account,
    coa.code, coa.name,
    0, v_payroll.total_net, now()
  FROM chart_of_accounts coa
  WHERE coa.id = v_liability_account;

  -- Update payroll
  UPDATE payrolls
  SET status = 'paid',
      journal_entry_id = v_journal_id,
      paid_at = now(),
      updated_at = now()
  WHERE id = p_payroll_id
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$function$;

-- >>> prevent_closed_period_delivery
CREATE OR REPLACE FUNCTION public.prevent_closed_period_delivery()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  IF check_period_closed(NEW.do_date::date, NEW.user_id) THEN
    RAISE EXCEPTION 'Tidak dapat mengubah surat jalan di periode yang sudah ditutup (%).',
      NEW.do_date::date;
  END IF;
  RETURN NEW;
END;
$function$;

-- >>> prevent_closed_period_grn
CREATE OR REPLACE FUNCTION public.prevent_closed_period_grn()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF check_period_closed(NEW.receipt_date::date, NEW.user_id) THEN
    RAISE EXCEPTION 'Tidak dapat mengubah penerimaan barang di periode yang sudah ditutup (%).',
      NEW.receipt_date::date;
  END IF;
  RETURN NEW;
END;
$function$;

-- >>> prevent_closed_period_journal
CREATE OR REPLACE FUNCTION public.prevent_closed_period_journal()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Skip untuk operasi void (status = 'void')
  IF TG_OP = 'UPDATE' AND NEW.status = 'void' THEN
    RETURN NEW;
  END IF;

  -- Jurnal penutup bertanggal period_end — izinkan bila terhubung ke
  -- closing_periods milik user dan tanggalnya memang period_end periode itu.
  IF NEW.reference_type = 'closing' THEN
    IF NEW.reference_id IS NULL THEN
      RETURN NEW;
    END IF;
    IF EXISTS (
      SELECT 1 FROM closing_periods cp
      WHERE cp.id = NEW.reference_id
        AND cp.user_id = NEW.user_id
        AND cp.period_end = NEW.entry_date::date
    ) THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Cek periode tertutup
  IF check_period_closed(NEW.entry_date::date, NEW.user_id) THEN
    RAISE EXCEPTION 'Tidak dapat mengubah jurnal di periode yang sudah ditutup (%).',
      NEW.entry_date::date;
  END IF;

  RETURN NEW;
END;
$function$;

-- >>> prevent_closed_period_journal_delete
CREATE OR REPLACE FUNCTION public.prevent_closed_period_journal_delete()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 set search_path = public
AS $function$
BEGIN
  IF check_period_closed(OLD.entry_date::date, OLD.user_id) THEN
    RAISE EXCEPTION 'Tidak dapat menghapus jurnal di periode yang sudah ditutup (%).',
      OLD.entry_date::date;
  END IF;
  RETURN OLD;
END;
$function$;

-- >>> prevent_closed_period_payment
CREATE OR REPLACE FUNCTION public.prevent_closed_period_payment()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF check_period_closed(NEW.created_at::date, NEW.user_id) THEN
    RAISE EXCEPTION 'Tidak dapat mengubah pembayaran di periode yang sudah ditutup (%).',
      NEW.created_at::date;
  END IF;
  RETURN NEW;
END;
$function$;

-- >>> prevent_closed_period_payroll
CREATE OR REPLACE FUNCTION public.prevent_closed_period_payroll()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF check_period_closed(NEW.period_start::date, NEW.user_id) THEN
    RAISE EXCEPTION 'Tidak dapat mengubah slip gaji di periode yang sudah ditutup (%).',
      NEW.period_start::date;
  END IF;
  RETURN NEW;
END;
$function$;

-- >>> prevent_closed_period_po
CREATE OR REPLACE FUNCTION public.prevent_closed_period_po()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF check_period_closed(NEW.po_date::date, NEW.user_id) THEN
    RAISE EXCEPTION 'Tidak dapat mengubah purchase order di periode yang sudah ditutup (%).',
      NEW.po_date::date;
  END IF;
  RETURN NEW;
END;
$function$;

-- >>> prevent_closed_period_purchase_invoice
CREATE OR REPLACE FUNCTION public.prevent_closed_period_purchase_invoice()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF check_period_closed(NEW.invoice_date::date, NEW.user_id) THEN
    RAISE EXCEPTION 'Tidak dapat mengubah invoice pembelian di periode yang sudah ditutup (%).',
      NEW.invoice_date::date;
  END IF;
  RETURN NEW;
END;
$function$;

-- >>> prevent_closed_period_return
CREATE OR REPLACE FUNCTION public.prevent_closed_period_return()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF check_period_closed(NEW.created_at::date, NEW.user_id) THEN
    RAISE EXCEPTION 'Tidak dapat mengubah retur di periode yang sudah ditutup (%).',
      NEW.created_at::date;
  END IF;

  RETURN NEW;
END;
$function$;

-- >>> prevent_closed_period_stock_movement
CREATE OR REPLACE FUNCTION public.prevent_closed_period_stock_movement()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF check_period_closed(NEW.created_at::date, NEW.user_id) THEN
    RAISE EXCEPTION 'Tidak dapat mengubah mutasi stok di periode yang sudah ditutup (%).',
      NEW.created_at::date;
  END IF;
  RETURN NEW;
END;
$function$;

-- >>> prevent_closed_period_transaction
CREATE OR REPLACE FUNCTION public.prevent_closed_period_transaction()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF check_period_closed(NEW.created_at::date, NEW.user_id) THEN
    RAISE EXCEPTION 'Tidak dapat mengubah transaksi di periode yang sudah ditutup (%).',
      NEW.created_at::date;
  END IF;
  RETURN NEW;
END;
$function$;

-- >>> reallocate_payment
CREATE OR REPLACE FUNCTION public.reallocate_payment(p_payment_id uuid, p_allocations jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 set search_path = public
AS $function$
DECLARE
  v_payment RECORD;
  v_alloc jsonb;
  v_total_allocated numeric := 0;
  v_transaction_id uuid;
BEGIN
  -- Get payment info
  SELECT tp.id, tp.amount, tp.transaction_id 
    INTO v_payment
  FROM transaction_payments tp
  WHERE tp.id = p_payment_id AND tp.user_id = auth.uid();
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment tidak ditemukan';
  END IF;
  
  v_transaction_id := v_payment.transaction_id;
  
  -- Validate total allocation
  FOR v_alloc IN SELECT * FROM jsonb_array_elements(p_allocations)
  LOOP
    v_total_allocated := v_total_allocated + (v_alloc->>'amount')::numeric;
  END LOOP;
  
  IF v_total_allocated > v_payment.amount THEN
    RAISE EXCEPTION 'Total alokasi (%) melebihi amount payment (%)', 
      v_total_allocated, v_payment.amount;
  END IF;
  
  -- Delete existing allocations
  PERFORM deallocate_payment(p_payment_id);
  
  -- Insert new allocations
  FOR v_alloc IN SELECT * FROM jsonb_array_elements(p_allocations)
  LOOP
    INSERT INTO transaction_item_payments (
      user_id, transaction_id, item_id, payment_id, allocated_amount
    ) VALUES (
      auth.uid(), 
      v_transaction_id, 
      (v_alloc->>'item_id')::uuid, 
      p_payment_id, 
      (v_alloc->>'amount')::numeric
    );
  END LOOP;
END;
$function$;

-- >>> record_stock_movement
CREATE OR REPLACE FUNCTION public.record_stock_movement()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Hanya catat jika stok berubah
  IF NEW.stock != OLD.stock THEN
    INSERT INTO stock_movements (
      user_id,
      product_id,
      movement_type,
      quantity,
      quantity_before,
      quantity_after,
      notes
    ) VALUES (
      NEW.user_id,
      NEW.id,
      CASE 
        WHEN NEW.stock > OLD.stock THEN 'in'
        ELSE 'out'
      END,
      ABS(NEW.stock - OLD.stock),
      OLD.stock,
      NEW.stock,
      'Automatic stock movement'
    );
  END IF;
  RETURN NEW;
END;
$function$;

-- >>> reopen_period
CREATE OR REPLACE FUNCTION public.reopen_period(p_closing_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 set search_path = public
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_period_end date;
BEGIN
  SELECT period_end INTO v_period_end
  FROM closing_periods
  WHERE id = p_closing_id AND user_id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Periode tidak ditemukan atau bukan milik Anda.';
  END IF;

  UPDATE journal_entries
  SET status = 'void', updated_at = now()
  WHERE user_id = v_user_id
    AND reference_type = 'closing'
    AND status <> 'void'
    AND (
      reference_id = p_closing_id
      OR (reference_id IS NULL AND entry_date::date = v_period_end)
    );

  UPDATE closing_periods
  SET status = 'reopened',
      updated_at = now()
  WHERE id = p_closing_id;
END;
$function$;

-- >>> revert_loan_payments_on_payroll_delete
CREATE OR REPLACE FUNCTION public.revert_loan_payments_on_payroll_delete()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 set search_path = public
AS $function$
DECLARE
  v_payment RECORD;
BEGIN
  IF OLD.status = 'paid' THEN
    RAISE EXCEPTION 'Payroll sudah dibayar (jurnal terposting). Tidak bisa dihapus.';
  END IF;

  -- Kembalikan sisa tiap loan yang dipotong dari payroll ini
  FOR v_payment IN
    SELECT p.loan_id, SUM(p.amount) AS total
    FROM employee_loan_payments p
    WHERE p.payroll_id = OLD.id
    GROUP BY p.loan_id
  LOOP
    UPDATE employee_loans l
    SET remaining_amount = l.remaining_amount + v_payment.total,
        status = 'active'
    WHERE l.id = v_payment.loan_id;
  END LOOP;

  DELETE FROM employee_loan_payments WHERE payroll_id = OLD.id;
  RETURN OLD;
END;
$function$;

-- >>> seed_default_accounts
CREATE OR REPLACE FUNCTION public.seed_default_accounts()
 RETURNS SETOF chart_of_accounts
 LANGUAGE plpgsql
 SECURITY DEFINER
 set search_path = public
AS $function$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();

  INSERT INTO chart_of_accounts (user_id, code, name, type, normal_balance, is_system)
  VALUES (v_user_id, '1-1000', 'Kas', 'aset', 'debit', true) ON CONFLICT (user_id, code) DO NOTHING;
  INSERT INTO chart_of_accounts (user_id, code, name, type, normal_balance, is_system)
  VALUES (v_user_id, '1-1010', 'Bank', 'aset', 'debit', true) ON CONFLICT (user_id, code) DO NOTHING;
  INSERT INTO chart_of_accounts (user_id, code, name, type, normal_balance, is_system)
  VALUES (v_user_id, '1-1100', 'Piutang Usaha', 'aset', 'debit', true) ON CONFLICT (user_id, code) DO NOTHING;
  INSERT INTO chart_of_accounts (user_id, code, name, type, normal_balance, is_system)
  VALUES (v_user_id, '1-1200', 'Persediaan Barang', 'aset', 'debit', true) ON CONFLICT (user_id, code) DO NOTHING;

  INSERT INTO chart_of_accounts (user_id, code, name, type, normal_balance, is_system)
  VALUES (v_user_id, '2-2000', 'Utang Usaha', 'kewajiban', 'kredit', true) ON CONFLICT (user_id, code) DO NOTHING;

  INSERT INTO chart_of_accounts (user_id, code, name, type, normal_balance, is_system)
  VALUES (v_user_id, '3-3000', 'Modal Pemilik', 'ekuitas', 'kredit', true) ON CONFLICT (user_id, code) DO NOTHING;
  INSERT INTO chart_of_accounts (user_id, code, name, type, normal_balance, is_system)
  VALUES (v_user_id, '3-3100', 'Laba Ditahan', 'ekuitas', 'kredit', true) ON CONFLICT (user_id, code) DO NOTHING;

  INSERT INTO chart_of_accounts (user_id, code, name, type, normal_balance, is_system)
  VALUES (v_user_id, '4-4000', 'Pendapatan Penjualan', 'pendapatan', 'kredit', true) ON CONFLICT (user_id, code) DO NOTHING;
  INSERT INTO chart_of_accounts (user_id, code, name, type, normal_balance, is_system)
  VALUES (v_user_id, '4-4100', 'Pendapatan Lainnya', 'pendapatan', 'kredit', true) ON CONFLICT (user_id, code) DO NOTHING;

  INSERT INTO chart_of_accounts (user_id, code, name, type, normal_balance, is_system)
  VALUES (v_user_id, '5-5000', 'Harga Pokok Penjualan (HPP)', 'beban', 'debit', true) ON CONFLICT (user_id, code) DO NOTHING;
  INSERT INTO chart_of_accounts (user_id, code, name, type, normal_balance, is_system)
  VALUES (v_user_id, '5-5100', 'Beban Operasional', 'beban', 'debit', true) ON CONFLICT (user_id, code) DO NOTHING;
  INSERT INTO chart_of_accounts (user_id, code, name, type, normal_balance, is_system)
  VALUES (v_user_id, '5-5200', 'Beban Gaji', 'beban', 'debit', true) ON CONFLICT (user_id, code) DO NOTHING;
  INSERT INTO chart_of_accounts (user_id, code, name, type, normal_balance, is_system)
  VALUES (v_user_id, '5-5300', 'Beban Sewa', 'beban', 'debit', true) ON CONFLICT (user_id, code) DO NOTHING;
  INSERT INTO chart_of_accounts (user_id, code, name, type, normal_balance, is_system)
  VALUES (v_user_id, '5-5400', 'Beban Utilitas', 'beban', 'debit', true) ON CONFLICT (user_id, code) DO NOTHING;
  INSERT INTO chart_of_accounts (user_id, code, name, type, normal_balance, is_system)
  VALUES (v_user_id, '5-5500', 'Beban Transportasi', 'beban', 'debit', true) ON CONFLICT (user_id, code) DO NOTHING;
  INSERT INTO chart_of_accounts (user_id, code, name, type, normal_balance, is_system)
  VALUES (v_user_id, '5-5600', 'Beban Lainnya', 'beban', 'debit', true) ON CONFLICT (user_id, code) DO NOTHING;

  RETURN QUERY
  SELECT * FROM chart_of_accounts WHERE user_id = v_user_id ORDER BY code;
END;
$function$;

-- >>> trg_delivery_orders_set_number
CREATE OR REPLACE FUNCTION public.trg_delivery_orders_set_number()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 set search_path = public
AS $function$
BEGIN
  IF NEW.do_number IS NULL OR NEW.do_number = '' THEN
    NEW.do_number := generate_delivery_number();
  END IF;
  RETURN NEW;
END;
$function$;

-- >>> trg_employees_set_code
CREATE OR REPLACE FUNCTION public.trg_employees_set_code()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 set search_path = public
AS $function$
BEGIN
  IF NEW.employee_code IS NULL OR NEW.employee_code = '' THEN
    NEW.employee_code := generate_employee_code();
  END IF;
  RETURN NEW;
END;
$function$;

-- >>> trg_trips_set_number
CREATE OR REPLACE FUNCTION public.trg_trips_set_number()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 set search_path = public
AS $function$
BEGIN
  IF NEW.trip_number IS NULL OR NEW.trip_number = '' THEN
    NEW.trip_number := generate_trip_number();
  END IF;
  RETURN NEW;
END;
$function$;

-- >>> trigger_init_coa_on_first_transaction
CREATE OR REPLACE FUNCTION public.trigger_init_coa_on_first_transaction()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Auto-init COA jika belum ada
  PERFORM init_default_coa_for_user(NEW.user_id);
  RETURN NEW;
END;
$function$;

-- >>> update_customer_groups_updated_at
CREATE OR REPLACE FUNCTION public.update_customer_groups_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- >>> update_customer_price_matrix_updated_at
CREATE OR REPLACE FUNCTION public.update_customer_price_matrix_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- >>> update_employee_loans_updated_at
CREATE OR REPLACE FUNCTION public.update_employee_loans_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

-- >>> update_loan_after_payment
CREATE OR REPLACE FUNCTION public.update_loan_after_payment()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_new_remaining numeric;
BEGIN
  SELECT remaining_amount - NEW.amount INTO v_new_remaining
  FROM employee_loans WHERE id = NEW.loan_id FOR UPDATE;

  UPDATE employee_loans
  SET remaining_amount = GREATEST(v_new_remaining, 0),
      status = CASE WHEN v_new_remaining <= 0 THEN 'paid' ELSE 'active' END
  WHERE id = NEW.loan_id;

  RETURN NEW;
END;
$function$;

-- >>> update_price_tiers_updated_at
CREATE OR REPLACE FUNCTION public.update_price_tiers_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- >>> update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

-- >>> validate_item_payment_allocation
CREATE OR REPLACE FUNCTION public.validate_item_payment_allocation()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_payment_amount numeric;
  v_payment_allocated numeric;
  v_item_subtotal numeric;
  v_item_allocated numeric;
BEGIN
  -- Check: total alokasi ke payment_id tidak boleh > payment amount
  SELECT tp.amount INTO v_payment_amount
  FROM transaction_payments tp
  WHERE tp.id = NEW.payment_id AND tp.user_id = NEW.user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment tidak ditemukan';
  END IF;
  
  SELECT COALESCE(SUM(allocated_amount), 0) INTO v_payment_allocated
  FROM transaction_item_payments
  WHERE payment_id = NEW.payment_id 
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);
  
  IF (v_payment_allocated + NEW.allocated_amount) > v_payment_amount THEN
    RAISE EXCEPTION 'Total alokasi (%) melebihi jumlah payment (%) untuk payment_id=%', 
      v_payment_allocated + NEW.allocated_amount, v_payment_amount, NEW.payment_id;
  END IF;
  
  -- Check: total alokasi ke item_id tidak boleh > item subtotal
  SELECT ti.subtotal INTO v_item_subtotal
  FROM transaction_items ti
  WHERE ti.id = NEW.item_id AND ti.user_id = NEW.user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Item tidak ditemukan';
  END IF;
  
  SELECT COALESCE(SUM(allocated_amount), 0) INTO v_item_allocated
  FROM transaction_item_payments
  WHERE item_id = NEW.item_id 
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);
  
  IF (v_item_allocated + NEW.allocated_amount) > v_item_subtotal THEN
    RAISE EXCEPTION 'Total alokasi (%) melebihi subtotal item (%) untuk item_id=%', 
      v_item_allocated + NEW.allocated_amount, v_item_subtotal, NEW.item_id;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- >>> validate_price_tier_range
CREATE OR REPLACE FUNCTION public.validate_price_tier_range()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_overlap_count integer;
BEGIN
  -- Cek apakah ada overlap range untuk produk yang sama di periode yang sama
  SELECT COUNT(*) INTO v_overlap_count
  FROM price_tiers
  WHERE user_id = NEW.user_id
    AND product_id = NEW.product_id
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    AND is_active = true
    AND (
      (NEW.min_quantity BETWEEN min_quantity AND COALESCE(max_quantity, 999999))
      OR (COALESCE(NEW.max_quantity, 999999) BETWEEN min_quantity AND COALESCE(max_quantity, 999999))
      OR (min_quantity BETWEEN NEW.min_quantity AND COALESCE(NEW.max_quantity, 999999))
    )
    AND (
      (NEW.start_date IS NULL AND start_date IS NULL)
      OR (NEW.start_date IS NOT NULL AND start_date IS NOT NULL AND
          (NEW.start_date, COALESCE(NEW.end_date, '9999-12-31'::date))
          OVERLAPS
          (start_date, COALESCE(end_date, '9999-12-31'::date)))
    );

  IF v_overlap_count > 0 THEN
    RAISE EXCEPTION 'Range kuantitas atau periode bertumpuk dengan tier harga lain untuk produk ini';
  END IF;

  RETURN NEW;
END;
$function$;

-- >>> void_journal
CREATE OR REPLACE FUNCTION public.void_journal(p_journal_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 set search_path = public
AS $function$
DECLARE
  v_status text;
BEGIN
  SELECT status INTO v_status
  FROM journal_entries
  WHERE id = p_journal_id AND user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Jurnal tidak ditemukan';
  END IF;

  IF v_status = 'void' THEN
    RAISE EXCEPTION 'Jurnal sudah dibatalkan sebelumnya';
  END IF;

  UPDATE journal_entries
  SET status = 'void', updated_at = now()
  WHERE id = p_journal_id AND user_id = auth.uid();
END;
$function$;

-- >>> void_transaction
CREATE OR REPLACE FUNCTION public.void_transaction(p_transaction_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 set search_path = public
AS $function$
DECLARE
  v_item RECORD;
  v_status text;
  v_transaction_number text;
  v_total numeric;
  v_paid_amount numeric;
  v_remaining_amount numeric;
  v_total_cogs numeric := 0;
  v_account_kas uuid;
  v_account_piutang uuid;
  v_account_pendapatan uuid;
  v_account_hpp uuid;
  v_account_persediaan uuid;
  v_journal_id uuid;
BEGIN
  SELECT status, transaction_number, total, paid_amount, remaining_amount
    INTO v_status, v_transaction_number, v_total, v_paid_amount, v_remaining_amount
  FROM transactions
  WHERE id = p_transaction_id AND user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaksi tidak ditemukan';
  END IF;

  IF v_status = 'batal' THEN
    RAISE EXCEPTION 'Transaksi sudah dibatalkan sebelumnya';
  END IF;

  FOR v_item IN
    SELECT ti.product_id, ti.quantity, p.price_buy
    FROM transaction_items ti
    LEFT JOIN products p ON p.id = ti.product_id
    WHERE ti.transaction_id = p_transaction_id AND ti.user_id = auth.uid()
  LOOP
    v_total_cogs := v_total_cogs + (COALESCE(v_item.price_buy, 0) * v_item.quantity);
  END LOOP;

  FOR v_item IN
    SELECT ti.product_id, ti.quantity
    FROM transaction_items ti
    WHERE ti.transaction_id = p_transaction_id AND ti.user_id = auth.uid()
  LOOP
    IF v_item.product_id IS NOT NULL THEN
      UPDATE products SET stock = stock + v_item.quantity, updated_at = now()
      WHERE id = v_item.product_id AND user_id = auth.uid();
    END IF;
  END LOOP;

  UPDATE transactions SET status = 'batal', updated_at = now()
  WHERE id = p_transaction_id AND user_id = auth.uid();

  UPDATE journal_entries
  SET status = 'void', updated_at = now()
  WHERE reference_type = 'transaction' AND reference_id = p_transaction_id AND user_id = auth.uid();

  SELECT id INTO v_account_kas FROM chart_of_accounts WHERE user_id = auth.uid() AND code = '1-1000';
  SELECT id INTO v_account_piutang FROM chart_of_accounts WHERE user_id = auth.uid() AND code = '1-1100';
  SELECT id INTO v_account_pendapatan FROM chart_of_accounts WHERE user_id = auth.uid() AND code = '4-4000';
  SELECT id INTO v_account_hpp FROM chart_of_accounts WHERE user_id = auth.uid() AND code = '5-5000';
  SELECT id INTO v_account_persediaan FROM chart_of_accounts WHERE user_id = auth.uid() AND code = '1-1200';

  IF v_account_pendapatan IS NOT NULL THEN
    INSERT INTO journal_entries (user_id, entry_date, description, reference_type, reference_id)
    VALUES (auth.uid(), now(), 'Pembatalan ' || v_transaction_number, 'void', p_transaction_id)
    RETURNING id INTO v_journal_id;

    INSERT INTO journal_lines (user_id, journal_id, account_id, account_code, account_name, debit, credit)
    SELECT auth.uid(), v_journal_id, v_account_pendapatan, '4-4000', 'Pendapatan Penjualan', v_total, 0;

    IF v_paid_amount > 0 AND v_account_kas IS NOT NULL THEN
      INSERT INTO journal_lines (user_id, journal_id, account_id, account_code, account_name, debit, credit)
      SELECT auth.uid(), v_journal_id, v_account_kas, '1-1000', 'Kas', 0, v_paid_amount;
    END IF;

    IF v_remaining_amount > 0 AND v_account_piutang IS NOT NULL THEN
      INSERT INTO journal_lines (user_id, journal_id, account_id, account_code, account_name, debit, credit)
      SELECT auth.uid(), v_journal_id, v_account_piutang, '1-1100', 'Piutang Usaha', 0, v_remaining_amount;
    END IF;

    IF v_total_cogs > 0 AND v_account_hpp IS NOT NULL AND v_account_persediaan IS NOT NULL THEN
      INSERT INTO journal_lines (user_id, journal_id, account_id, account_code, account_name, debit, credit)
      SELECT auth.uid(), v_journal_id, v_account_persediaan, '1-1200', 'Persediaan Barang', v_total_cogs, 0;
      INSERT INTO journal_lines (user_id, journal_id, account_id, account_code, account_name, debit, credit)
      SELECT auth.uid(), v_journal_id, v_account_hpp, '5-5000', 'Harga Pokok Penjualan (HPP)', 0, v_total_cogs;
    END IF;
  END IF;
END;
$function$;

-- ============================================================================
-- TRIGGER
-- ============================================================================

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_update_customer_groups_updated_at BEFORE UPDATE ON public.customer_groups FOR EACH ROW EXECUTE FUNCTION update_customer_groups_updated_at();
CREATE TRIGGER trigger_update_customer_price_matrix_updated_at BEFORE UPDATE ON public.customer_price_matrix FOR EACH ROW EXECUTE FUNCTION update_customer_price_matrix_updated_at();
CREATE TRIGGER trg_delivery_orders_set_number BEFORE INSERT ON public.delivery_orders FOR EACH ROW EXECUTE FUNCTION trg_delivery_orders_set_number();
CREATE TRIGGER trg_prevent_closed_period_delivery BEFORE INSERT OR UPDATE ON public.delivery_orders FOR EACH ROW EXECUTE FUNCTION prevent_closed_period_delivery();
CREATE TRIGGER trigger_update_loan_after_payment AFTER INSERT ON public.employee_loan_payments FOR EACH ROW EXECUTE FUNCTION update_loan_after_payment();
CREATE TRIGGER trigger_update_employee_loans_updated_at BEFORE UPDATE ON public.employee_loans FOR EACH ROW EXECUTE FUNCTION update_employee_loans_updated_at();
CREATE TRIGGER trg_employees_set_code BEFORE INSERT ON public.employees FOR EACH ROW EXECUTE FUNCTION trg_employees_set_code();
CREATE TRIGGER trg_prevent_closed_period_grn BEFORE INSERT OR UPDATE ON public.goods_receipts FOR EACH ROW EXECUTE FUNCTION prevent_closed_period_grn();
CREATE TRIGGER trg_prevent_closed_period_journal BEFORE INSERT OR UPDATE ON public.journal_entries FOR EACH ROW EXECUTE FUNCTION prevent_closed_period_journal();
CREATE TRIGGER trg_prevent_closed_period_journal_delete BEFORE DELETE ON public.journal_entries FOR EACH ROW EXECUTE FUNCTION prevent_closed_period_journal_delete();
CREATE TRIGGER trg_prevent_closed_period_payroll BEFORE INSERT OR UPDATE ON public.payrolls FOR EACH ROW EXECUTE FUNCTION prevent_closed_period_payroll();
CREATE TRIGGER trigger_update_price_tiers_updated_at BEFORE UPDATE ON public.price_tiers FOR EACH ROW EXECUTE FUNCTION update_price_tiers_updated_at();
CREATE TRIGGER trigger_validate_price_tier_range BEFORE INSERT OR UPDATE ON public.price_tiers FOR EACH ROW EXECUTE FUNCTION validate_price_tier_range();
CREATE TRIGGER trigger_low_stock_notification AFTER INSERT OR UPDATE OF stock ON public.products FOR EACH ROW EXECUTE FUNCTION create_low_stock_notification();
CREATE TRIGGER trigger_record_stock_movement AFTER UPDATE ON public.products FOR EACH ROW WHEN ((new.stock IS DISTINCT FROM old.stock)) EXECUTE FUNCTION record_stock_movement();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_prevent_closed_period_purchase_invoice BEFORE INSERT OR UPDATE ON public.purchase_invoices FOR EACH ROW EXECUTE FUNCTION prevent_closed_period_purchase_invoice();
CREATE TRIGGER trg_prevent_closed_period_po BEFORE INSERT OR UPDATE ON public.purchase_orders FOR EACH ROW EXECUTE FUNCTION prevent_closed_period_po();
CREATE TRIGGER trg_prevent_closed_period_return BEFORE INSERT OR UPDATE ON public.returns FOR EACH ROW EXECUTE FUNCTION prevent_closed_period_return();
CREATE TRIGGER trigger_return_notification AFTER INSERT ON public.returns FOR EACH ROW EXECUTE FUNCTION create_return_notification();
CREATE TRIGGER trg_prevent_closed_period_stock_movement BEFORE INSERT OR UPDATE ON public.stock_movements FOR EACH ROW EXECUTE FUNCTION prevent_closed_period_stock_movement();
CREATE TRIGGER trigger_validate_item_payment BEFORE INSERT OR UPDATE ON public.transaction_item_payments FOR EACH ROW EXECUTE FUNCTION validate_item_payment_allocation();
CREATE TRIGGER trg_auto_update_realized_profit AFTER INSERT ON public.transaction_payments FOR EACH ROW EXECUTE FUNCTION auto_update_realized_profit();
CREATE TRIGGER trg_prevent_closed_period_payment BEFORE INSERT OR UPDATE ON public.transaction_payments FOR EACH ROW EXECUTE FUNCTION prevent_closed_period_payment();
CREATE TRIGGER trigger_auto_delete_payment_allocations BEFORE DELETE ON public.transaction_payments FOR EACH ROW EXECUTE FUNCTION auto_delete_payment_allocations();
CREATE TRIGGER trigger_auto_journal_payment AFTER INSERT ON public.transaction_payments FOR EACH ROW EXECUTE FUNCTION auto_journal_payment();
CREATE TRIGGER trigger_auto_update_transaction_on_payment_delete AFTER DELETE ON public.transaction_payments FOR EACH ROW EXECUTE FUNCTION auto_update_transaction_on_payment_delete();
CREATE TRIGGER trigger_auto_void_journal_payment BEFORE DELETE ON public.transaction_payments FOR EACH ROW EXECUTE FUNCTION auto_void_journal_payment();
CREATE TRIGGER trigger_payment_notification AFTER INSERT ON public.transaction_payments FOR EACH ROW EXECUTE FUNCTION create_payment_notification();
CREATE TRIGGER ensure_coa_exists BEFORE INSERT ON public.transactions FOR EACH ROW EXECUTE FUNCTION trigger_init_coa_on_first_transaction();
CREATE TRIGGER trg_prevent_closed_period_transaction BEFORE INSERT OR UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION prevent_closed_period_transaction();
CREATE TRIGGER trigger_transaction_notification AFTER INSERT ON public.transactions FOR EACH ROW EXECUTE FUNCTION create_transaction_notification();
CREATE TRIGGER trg_trips_set_number BEFORE INSERT ON public.trips FOR EACH ROW EXECUTE FUNCTION trg_trips_set_number();

-- ============================================================================
-- ROW LEVEL SECURITY + POLICY (183 policy, apa adanya dari live)
-- ============================================================================

alter table public.attendance enable row level security;
create policy "users can delete own attendance" on public.attendance for delete
  using ((auth.uid() = user_id));
create policy "users can insert own attendance" on public.attendance for insert
  with check ((auth.uid() = user_id));
create policy "users can update own attendance" on public.attendance for update
  using ((auth.uid() = user_id));
create policy "users can view own attendance" on public.attendance for select
  using ((auth.uid() = user_id));

alter table public.categories enable row level security;
create policy "Enable delete access for all users" on public.categories for delete
  using (true);
create policy "Enable insert access for all users" on public.categories for insert
  with check (true);
create policy "Enable update access for all users" on public.categories for update
  using (true);
create policy categories_delete_own on public.categories for delete
  using ((auth.uid() = user_id));
create policy categories_insert_own on public.categories for insert
  with check ((auth.uid() = user_id));
create policy categories_select_own on public.categories for select
  using ((auth.uid() = user_id));
create policy categories_update_own on public.categories for update
  using ((auth.uid() = user_id));

alter table public.chart_of_accounts enable row level security;
create policy coa_delete_own on public.chart_of_accounts for delete
  using ((auth.uid() = user_id));
create policy coa_insert_own on public.chart_of_accounts for insert
  with check ((auth.uid() = user_id));
create policy coa_select_own on public.chart_of_accounts for select
  using ((auth.uid() = user_id));
create policy coa_update_own on public.chart_of_accounts for update
  using ((auth.uid() = user_id));

alter table public.closing_periods enable row level security;
create policy closing_periods_delete_own on public.closing_periods for delete
  using ((auth.uid() = user_id));
create policy closing_periods_insert_own on public.closing_periods for insert
  with check ((auth.uid() = user_id));
create policy closing_periods_select_own on public.closing_periods for select
  using ((auth.uid() = user_id));
create policy closing_periods_update_own on public.closing_periods for update
  using ((auth.uid() = user_id));

alter table public.customer_group_members enable row level security;
create policy "Users dapat delete customer_group_members mereka sendiri" on public.customer_group_members for delete
  using ((auth.uid() = user_id));
create policy "Users dapat insert customer_group_members mereka sendiri" on public.customer_group_members for insert
  with check ((auth.uid() = user_id));
create policy "Users dapat melihat customer_group_members mereka sendiri" on public.customer_group_members for select
  using ((auth.uid() = user_id));
create policy "Users dapat update customer_group_members mereka sendiri" on public.customer_group_members for update
  using ((auth.uid() = user_id))
  with check ((auth.uid() = user_id));

alter table public.customer_groups enable row level security;
create policy "Users dapat delete customer_groups mereka sendiri" on public.customer_groups for delete
  using ((auth.uid() = user_id));
create policy "Users dapat insert customer_groups mereka sendiri" on public.customer_groups for insert
  with check ((auth.uid() = user_id));
create policy "Users dapat melihat customer_groups mereka sendiri" on public.customer_groups for select
  using ((auth.uid() = user_id));
create policy "Users dapat update customer_groups mereka sendiri" on public.customer_groups for update
  using ((auth.uid() = user_id))
  with check ((auth.uid() = user_id));

alter table public.customer_price_matrix enable row level security;
create policy "Users dapat delete customer_price_matrix mereka sendiri" on public.customer_price_matrix for delete
  using ((auth.uid() = user_id));
create policy "Users dapat insert customer_price_matrix mereka sendiri" on public.customer_price_matrix for insert
  with check ((auth.uid() = user_id));
create policy "Users dapat melihat customer_price_matrix mereka sendiri" on public.customer_price_matrix for select
  using ((auth.uid() = user_id));
create policy "Users dapat update customer_price_matrix mereka sendiri" on public.customer_price_matrix for update
  using ((auth.uid() = user_id))
  with check ((auth.uid() = user_id));

alter table public.customers enable row level security;
create policy customers_delete_own on public.customers for delete
  using ((auth.uid() = user_id));
create policy customers_insert_own on public.customers for insert
  with check ((auth.uid() = user_id));
create policy customers_select_own on public.customers for select
  using ((auth.uid() = user_id));
create policy customers_update_own on public.customers for update
  using ((auth.uid() = user_id));

alter table public.delivery_items enable row level security;
create policy delivery_items_delete_own on public.delivery_items for delete
  using ((auth.uid() = user_id));
create policy delivery_items_insert_own on public.delivery_items for insert
  with check ((auth.uid() = user_id));
create policy delivery_items_select_own on public.delivery_items for select
  using ((auth.uid() = user_id));
create policy delivery_items_update_own on public.delivery_items for update
  using ((auth.uid() = user_id));

alter table public.delivery_load_items enable row level security;
create policy delivery_load_items_user_is on public.delivery_load_items for all
  using ((auth.uid() = user_id))
  with check ((auth.uid() = user_id));

alter table public.delivery_loaders enable row level security;
create policy delivery_loaders_user_is on public.delivery_loaders for all
  using ((auth.uid() = user_id))
  with check ((auth.uid() = user_id));

alter table public.delivery_order_transactions enable row level security;
create policy delivery_order_transactions_user_is on public.delivery_order_transactions for all
  using ((auth.uid() = user_id))
  with check ((auth.uid() = user_id));

alter table public.delivery_orders enable row level security;
create policy delivery_orders_delete_own on public.delivery_orders for delete
  using ((auth.uid() = user_id));
create policy delivery_orders_insert_own on public.delivery_orders for insert
  with check ((auth.uid() = user_id));
create policy delivery_orders_select_own on public.delivery_orders for select
  using ((auth.uid() = user_id));
create policy delivery_orders_update_own on public.delivery_orders for update
  using ((auth.uid() = user_id));

alter table public.delivery_tracking enable row level security;
create policy delivery_tracking_delete_own on public.delivery_tracking for delete
  using ((auth.uid() = user_id));
create policy delivery_tracking_insert_own on public.delivery_tracking for insert
  with check ((auth.uid() = user_id));
create policy delivery_tracking_select_own on public.delivery_tracking for select
  using ((auth.uid() = user_id));

alter table public.employee_loan_payments enable row level security;
create policy employee_loan_payments_delete_own on public.employee_loan_payments for delete
  using ((auth.uid() = user_id));
create policy employee_loan_payments_insert_own on public.employee_loan_payments for insert
  with check ((auth.uid() = user_id));
create policy employee_loan_payments_select_own on public.employee_loan_payments for select
  using ((auth.uid() = user_id));
create policy employee_loan_payments_update_own on public.employee_loan_payments for update
  using ((auth.uid() = user_id));

alter table public.employee_loans enable row level security;
create policy employee_loans_delete_own on public.employee_loans for delete
  using ((auth.uid() = user_id));
create policy employee_loans_insert_own on public.employee_loans for insert
  with check ((auth.uid() = user_id));
create policy employee_loans_select_own on public.employee_loans for select
  using ((auth.uid() = user_id));
create policy employee_loans_update_own on public.employee_loans for update
  using ((auth.uid() = user_id));

alter table public.employees enable row level security;
create policy "users can delete own employees" on public.employees for delete
  using ((auth.uid() = user_id));
create policy "users can insert own employees" on public.employees for insert
  with check ((auth.uid() = user_id));
create policy "users can update own employees" on public.employees for update
  using ((auth.uid() = user_id));
create policy "users can view own employees" on public.employees for select
  using ((auth.uid() = user_id));

alter table public.goods_receipts enable row level security;
create policy grn_delete_own on public.goods_receipts for delete
  using ((auth.uid() = user_id));
create policy grn_insert_own on public.goods_receipts for insert
  with check ((auth.uid() = user_id));
create policy grn_select_own on public.goods_receipts for select
  using ((auth.uid() = user_id));
create policy grn_update_own on public.goods_receipts for update
  using ((auth.uid() = user_id));

alter table public.grn_items enable row level security;
create policy grn_items_delete_own on public.grn_items for delete
  using ((auth.uid() = user_id));
create policy grn_items_insert_own on public.grn_items for insert
  with check ((auth.uid() = user_id));
create policy grn_items_select_own on public.grn_items for select
  using ((auth.uid() = user_id));
create policy grn_items_update_own on public.grn_items for update
  using ((auth.uid() = user_id));

alter table public.journal_entries enable row level security;
create policy journal_entries_delete_own on public.journal_entries for delete
  using ((auth.uid() = user_id));
create policy journal_entries_insert_own on public.journal_entries for insert
  with check ((auth.uid() = user_id));
create policy journal_entries_select_own on public.journal_entries for select
  using ((auth.uid() = user_id));
create policy journal_entries_update_own on public.journal_entries for update
  using ((auth.uid() = user_id));

alter table public.journal_lines enable row level security;
create policy journal_lines_delete_own on public.journal_lines for delete
  using ((auth.uid() = user_id));
create policy journal_lines_insert_own on public.journal_lines for insert
  with check ((auth.uid() = user_id));
create policy journal_lines_select_own on public.journal_lines for select
  using ((auth.uid() = user_id));
create policy journal_lines_update_own on public.journal_lines for update
  using ((auth.uid() = user_id));

alter table public.notifications enable row level security;
create policy "Users can create notifications" on public.notifications for insert
  with check ((auth.uid() = user_id));
create policy "Users can delete their own notifications" on public.notifications for delete
  using ((auth.uid() = user_id));
create policy "Users can update their own notifications" on public.notifications for update
  using ((auth.uid() = user_id));
create policy "Users can view their own notifications" on public.notifications for select
  using ((auth.uid() = user_id));

alter table public.payrolls enable row level security;
create policy payrolls_delete_own on public.payrolls for delete
  using ((auth.uid() = user_id));
create policy payrolls_insert_own on public.payrolls for insert
  with check ((auth.uid() = user_id));
create policy payrolls_select_own on public.payrolls for select
  using ((auth.uid() = user_id));
create policy payrolls_update_own on public.payrolls for update
  using ((auth.uid() = user_id));

alter table public.pi_items enable row level security;
create policy pi_items_delete_own on public.pi_items for delete
  using ((auth.uid() = user_id));
create policy pi_items_insert_own on public.pi_items for insert
  with check ((auth.uid() = user_id));
create policy pi_items_select_own on public.pi_items for select
  using ((auth.uid() = user_id));
create policy pi_items_update_own on public.pi_items for update
  using ((auth.uid() = user_id));

alter table public.pi_payments enable row level security;
create policy pi_payments_delete_own on public.pi_payments for delete
  using ((auth.uid() = user_id));
create policy pi_payments_insert_own on public.pi_payments for insert
  with check ((auth.uid() = user_id));
create policy pi_payments_select_own on public.pi_payments for select
  using ((auth.uid() = user_id));
create policy pi_payments_update_own on public.pi_payments for update
  using ((auth.uid() = user_id));

alter table public.po_items enable row level security;
create policy po_items_delete_own on public.po_items for delete
  using ((auth.uid() = user_id));
create policy po_items_insert_own on public.po_items for insert
  with check ((auth.uid() = user_id));
create policy po_items_select_own on public.po_items for select
  using ((auth.uid() = user_id));
create policy po_items_update_own on public.po_items for update
  using ((auth.uid() = user_id));

alter table public.price_tiers enable row level security;
create policy "Users dapat delete price_tiers mereka sendiri" on public.price_tiers for delete
  using ((auth.uid() = user_id));
create policy "Users dapat insert price_tiers mereka sendiri" on public.price_tiers for insert
  with check ((auth.uid() = user_id));
create policy "Users dapat melihat price_tiers mereka sendiri" on public.price_tiers for select
  using ((auth.uid() = user_id));
create policy "Users dapat update price_tiers mereka sendiri" on public.price_tiers for update
  using ((auth.uid() = user_id))
  with check ((auth.uid() = user_id));

alter table public.products enable row level security;
create policy "Enable delete access for all users" on public.products for delete
  using (true);
create policy "Enable insert access for all users" on public.products for insert
  with check (true);
create policy "Enable update access for all users" on public.products for update
  using (true);
create policy products_delete_own on public.products for delete
  using ((auth.uid() = user_id));
create policy products_insert_own on public.products for insert
  with check ((auth.uid() = user_id));
create policy products_select_own on public.products for select
  using ((auth.uid() = user_id));
create policy products_update_own on public.products for update
  using ((auth.uid() = user_id));

alter table public.purchase_invoices enable row level security;
create policy pi_delete_own on public.purchase_invoices for delete
  using ((auth.uid() = user_id));
create policy pi_insert_own on public.purchase_invoices for insert
  with check ((auth.uid() = user_id));
create policy pi_select_own on public.purchase_invoices for select
  using ((auth.uid() = user_id));
create policy pi_update_own on public.purchase_invoices for update
  using ((auth.uid() = user_id));

alter table public.purchase_orders enable row level security;
create policy po_delete_own on public.purchase_orders for delete
  using ((auth.uid() = user_id));
create policy po_insert_own on public.purchase_orders for insert
  with check ((auth.uid() = user_id));
create policy po_select_own on public.purchase_orders for select
  using ((auth.uid() = user_id));
create policy po_update_own on public.purchase_orders for update
  using ((auth.uid() = user_id));

alter table public.purchase_return_items enable row level security;
create policy pr_items_delete_own on public.purchase_return_items for delete
  using ((auth.uid() = user_id));
create policy pr_items_insert_own on public.purchase_return_items for insert
  with check ((auth.uid() = user_id));
create policy pr_items_select_own on public.purchase_return_items for select
  using ((auth.uid() = user_id));
create policy pr_items_update_own on public.purchase_return_items for update
  using ((auth.uid() = user_id));

alter table public.purchase_returns enable row level security;
create policy pr_delete_own on public.purchase_returns for delete
  using ((auth.uid() = user_id));
create policy pr_insert_own on public.purchase_returns for insert
  with check ((auth.uid() = user_id));
create policy pr_select_own on public.purchase_returns for select
  using ((auth.uid() = user_id));
create policy pr_update_own on public.purchase_returns for update
  using ((auth.uid() = user_id));

alter table public.return_items enable row level security;
create policy return_items_delete_own on public.return_items for delete
  using ((auth.uid() = user_id));
create policy return_items_insert_own on public.return_items for insert
  with check ((auth.uid() = user_id));
create policy return_items_select_own on public.return_items for select
  using ((auth.uid() = user_id));
create policy return_items_update_own on public.return_items for update
  using ((auth.uid() = user_id));

alter table public.returns enable row level security;
create policy returns_delete_own on public.returns for delete
  using ((auth.uid() = user_id));
create policy returns_insert_own on public.returns for insert
  with check ((auth.uid() = user_id));
create policy returns_select_own on public.returns for select
  using ((auth.uid() = user_id));
create policy returns_update_own on public.returns for update
  using ((auth.uid() = user_id));

alter table public.stock_adjustments enable row level security;
create policy "Users can create stock adjustments" on public.stock_adjustments for insert
  with check ((auth.uid() = user_id));
create policy "Users can view their own stock adjustments" on public.stock_adjustments for select
  using ((auth.uid() = user_id));

alter table public.stock_alerts enable row level security;
create policy "Users can create stock alerts" on public.stock_alerts for insert
  with check ((auth.uid() = user_id));
create policy "Users can delete their own stock alerts" on public.stock_alerts for delete
  using ((auth.uid() = user_id));
create policy "Users can update their own stock alerts" on public.stock_alerts for update
  using ((auth.uid() = user_id));
create policy "Users can view their own stock alerts" on public.stock_alerts for select
  using ((auth.uid() = user_id));

alter table public.stock_movements enable row level security;
create policy "Users can create stock movements" on public.stock_movements for insert
  with check ((auth.uid() = user_id));
create policy "Users can view their own stock movements" on public.stock_movements for select
  using ((auth.uid() = user_id));

alter table public.stock_opname_items enable row level security;
create policy "Users can create stock opname items" on public.stock_opname_items for insert
  with check ((auth.uid() = user_id));
create policy "Users can delete their own stock opname items" on public.stock_opname_items for delete
  using ((auth.uid() = user_id));
create policy "Users can update their own stock opname items" on public.stock_opname_items for update
  using ((auth.uid() = user_id));
create policy "Users can view their own stock opname items" on public.stock_opname_items for select
  using ((auth.uid() = user_id));

alter table public.stock_opnames enable row level security;
create policy "Users can create stock opnames" on public.stock_opnames for insert
  with check ((auth.uid() = user_id));
create policy "Users can update their own stock opnames" on public.stock_opnames for update
  using ((auth.uid() = user_id));
create policy "Users can view their own stock opnames" on public.stock_opnames for select
  using ((auth.uid() = user_id));

alter table public.store_settings enable row level security;
create policy store_settings_delete_own on public.store_settings for delete
  using ((auth.uid() = user_id));
create policy store_settings_insert_own on public.store_settings for insert
  with check ((auth.uid() = user_id));
create policy store_settings_select_own on public.store_settings for select
  using ((auth.uid() = user_id));
create policy store_settings_update_own on public.store_settings for update
  using ((auth.uid() = user_id));

alter table public.suppliers enable row level security;
create policy suppliers_delete_own on public.suppliers for delete
  using ((auth.uid() = user_id));
create policy suppliers_insert_own on public.suppliers for insert
  with check ((auth.uid() = user_id));
create policy suppliers_select_own on public.suppliers for select
  using ((auth.uid() = user_id));
create policy suppliers_update_own on public.suppliers for update
  using ((auth.uid() = user_id));

alter table public.transaction_item_payments enable row level security;
create policy item_payments_delete_own on public.transaction_item_payments for delete
  using ((auth.uid() = user_id));
create policy item_payments_insert_own on public.transaction_item_payments for insert
  with check ((auth.uid() = user_id));
create policy item_payments_select_own on public.transaction_item_payments for select
  using ((auth.uid() = user_id));
create policy item_payments_update_own on public.transaction_item_payments for update
  using ((auth.uid() = user_id));

alter table public.transaction_items enable row level security;
create policy transaction_items_delete_own on public.transaction_items for delete
  using ((auth.uid() = user_id));
create policy transaction_items_insert_own on public.transaction_items for insert
  with check ((auth.uid() = user_id));
create policy transaction_items_select_own on public.transaction_items for select
  using ((auth.uid() = user_id));
create policy transaction_items_update_own on public.transaction_items for update
  using ((auth.uid() = user_id));

alter table public.transaction_payments enable row level security;
create policy transaction_payments_delete_own on public.transaction_payments for delete
  using ((auth.uid() = user_id));
create policy transaction_payments_insert_own on public.transaction_payments for insert
  with check ((auth.uid() = user_id));
create policy transaction_payments_select_own on public.transaction_payments for select
  using ((auth.uid() = user_id));
create policy transaction_payments_update_own on public.transaction_payments for update
  using ((auth.uid() = user_id));

alter table public.transactions enable row level security;
create policy transactions_delete_own on public.transactions for delete
  using ((auth.uid() = user_id));
create policy transactions_insert_own on public.transactions for insert
  with check ((auth.uid() = user_id));
create policy transactions_select_own on public.transactions for select
  using ((auth.uid() = user_id));
create policy transactions_update_own on public.transactions for update
  using ((auth.uid() = user_id));

alter table public.trip_loaders enable row level security;
create policy trip_loaders_delete_own on public.trip_loaders for delete
  using ((auth.uid() = user_id));
create policy trip_loaders_insert_own on public.trip_loaders for insert
  with check ((auth.uid() = user_id));
create policy trip_loaders_select_own on public.trip_loaders for select
  using ((auth.uid() = user_id));
create policy trip_loaders_update_own on public.trip_loaders for update
  using ((auth.uid() = user_id));

alter table public.trips enable row level security;
create policy trips_delete_own on public.trips for delete
  using ((auth.uid() = user_id));
create policy trips_insert_own on public.trips for insert
  with check ((auth.uid() = user_id));
create policy trips_select_own on public.trips for select
  using ((auth.uid() = user_id));
create policy trips_update_own on public.trips for update
  using ((auth.uid() = user_id));

alter table public.vehicles enable row level security;
create policy vehicles_delete_own on public.vehicles for delete
  using ((auth.uid() = user_id));
create policy vehicles_insert_own on public.vehicles for insert
  with check ((auth.uid() = user_id));
create policy vehicles_select_own on public.vehicles for select
  using ((auth.uid() = user_id));
create policy vehicles_update_own on public.vehicles for update
  using ((auth.uid() = user_id));

-- ============================================================================
-- VIEW (S1: sengaja tanpa security_invoker, diperbaiki di 0003)
-- ============================================================================

create view public.transaction_items_payment_summary as
 SELECT ti.id AS item_id,
    ti.transaction_id,
    ti.user_id,
    ti.product_id,
    ti.product_name,
    ti.subtotal AS item_total,
    COALESCE(sum(tip.allocated_amount), (0)::numeric) AS paid_amount,
    (ti.subtotal - COALESCE(sum(tip.allocated_amount), (0)::numeric)) AS remaining_amount,
        CASE
            WHEN (COALESCE(sum(tip.allocated_amount), (0)::numeric) >= ti.subtotal) THEN 'lunas'::text
            WHEN (COALESCE(sum(tip.allocated_amount), (0)::numeric) > (0)::numeric) THEN 'sebagian'::text
            ELSE 'belum_bayar'::text
        END AS payment_status
   FROM (transaction_items ti
     LEFT JOIN transaction_item_payments tip ON ((tip.item_id = ti.id)))
  GROUP BY ti.id, ti.transaction_id, ti.user_id, ti.product_id, ti.product_name, ti.subtotal;

-- ============================================================================
-- STORAGE: bucket avatars + 4 policy
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
on conflict (id) do nothing;

-- Idempoten: schema `storage` TIDAK ikut terhapus oleh `drop schema public cascade`,
-- jadi bucket + 4 policy ini sudah ada saat migrasi dijalankan di project live.
-- (Kalau tidak idempoten, `supabase db reset` di database kosong maupun re-run
--  di database yang sudah punya bucket akan gagal dengan "policy already exists".)
drop policy if exists avatars_delete_own on storage.objects;
drop policy if exists avatars_insert_own on storage.objects;
drop policy if exists avatars_select_own on storage.objects;
drop policy if exists avatars_update_own on storage.objects;

create policy avatars_delete_own on storage.objects for delete
  using (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));
create policy avatars_insert_own on storage.objects for insert
  with check (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));
create policy avatars_select_own on storage.objects for select
  using (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));
create policy avatars_update_own on storage.objects for update
  using (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)))
  with check (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));

-- ============================================================================
-- GRANT — persis seperti live (anon/authenticated dapat SEMUA privilege).
-- Fase 1 mempersempit ini: TRUNCATE/REFERENCES/TRIGGER dicabut dari anon,
-- dan EXECUTE pada SECURITY DEFINER dibatasi.
-- ============================================================================

grant usage on schema public to anon, authenticated, service_role;

grant delete, insert, references, select, trigger, truncate, update on public.attendance to anon, authenticated, service_role;
grant delete, insert, references, select, trigger, truncate, update on public.categories to anon, authenticated, service_role;
grant delete, insert, references, select, trigger, truncate, update on public.chart_of_accounts to anon, authenticated, service_role;
grant delete, insert, references, select, trigger, truncate, update on public.closing_periods to anon, authenticated, service_role;
grant delete, insert, references, select, trigger, truncate, update on public.customer_group_members to anon, authenticated, service_role;
grant delete, insert, references, select, trigger, truncate, update on public.customer_groups to anon, authenticated, service_role;
grant delete, insert, references, select, trigger, truncate, update on public.customer_price_matrix to anon, authenticated, service_role;
grant delete, insert, references, select, trigger, truncate, update on public.customers to anon, authenticated, service_role;
grant delete, insert, references, select, trigger, truncate, update on public.delivery_items to anon, authenticated, service_role;
grant delete, insert, references, select, trigger, truncate, update on public.delivery_load_items to anon, authenticated, service_role;
grant delete, insert, references, select, trigger, truncate, update on public.delivery_loaders to anon, authenticated, service_role;
grant delete, insert, references, select, trigger, truncate, update on public.delivery_order_transactions to anon, authenticated, service_role;
grant delete, insert, references, select, trigger, truncate, update on public.delivery_orders to anon, authenticated, service_role;
grant delete, insert, references, select, trigger, truncate, update on public.delivery_tracking to anon, authenticated, service_role;
grant delete, insert, references, select, trigger, truncate, update on public.employee_loan_payments to anon, authenticated, service_role;
grant delete, insert, references, select, trigger, truncate, update on public.employee_loans to anon, authenticated, service_role;
grant delete, insert, references, select, trigger, truncate, update on public.employees to anon, authenticated, service_role;
grant delete, insert, references, select, trigger, truncate, update on public.goods_receipts to anon, authenticated, service_role;
grant delete, insert, references, select, trigger, truncate, update on public.grn_items to anon, authenticated, service_role;
grant delete, insert, references, select, trigger, truncate, update on public.journal_entries to anon, authenticated, service_role;
grant delete, insert, references, select, trigger, truncate, update on public.journal_lines to anon, authenticated, service_role;
grant delete, insert, references, select, trigger, truncate, update on public.notifications to anon, authenticated, service_role;
grant delete, insert, references, select, trigger, truncate, update on public.payrolls to anon, authenticated, service_role;
grant delete, insert, references, select, trigger, truncate, update on public.pi_items to anon, authenticated, service_role;
grant delete, insert, references, select, trigger, truncate, update on public.pi_payments to anon, authenticated, service_role;
grant delete, insert, references, select, trigger, truncate, update on public.po_items to anon, authenticated, service_role;
grant delete, insert, references, select, trigger, truncate, update on public.price_tiers to anon, authenticated, service_role;
grant delete, insert, references, select, trigger, truncate, update on public.products to anon, authenticated, service_role;
grant delete, insert, references, select, trigger, truncate, update on public.purchase_invoices to anon, authenticated, service_role;
grant delete, insert, references, select, trigger, truncate, update on public.purchase_orders to anon, authenticated, service_role;
grant delete, insert, references, select, trigger, truncate, update on public.purchase_return_items to anon, authenticated, service_role;
grant delete, insert, references, select, trigger, truncate, update on public.purchase_returns to anon, authenticated, service_role;
grant delete, insert, references, select, trigger, truncate, update on public.return_items to anon, authenticated, service_role;
grant delete, insert, references, select, trigger, truncate, update on public.returns to anon, authenticated, service_role;
grant delete, insert, references, select, trigger, truncate, update on public.stock_adjustments to anon, authenticated, service_role;
grant delete, insert, references, select, trigger, truncate, update on public.stock_alerts to anon, authenticated, service_role;
grant delete, insert, references, select, trigger, truncate, update on public.stock_movements to anon, authenticated, service_role;
grant delete, insert, references, select, trigger, truncate, update on public.stock_opname_items to anon, authenticated, service_role;
grant delete, insert, references, select, trigger, truncate, update on public.stock_opnames to anon, authenticated, service_role;
grant delete, insert, references, select, trigger, truncate, update on public.store_settings to anon, authenticated, service_role;
grant delete, insert, references, select, trigger, truncate, update on public.suppliers to anon, authenticated, service_role;
grant delete, insert, references, select, trigger, truncate, update on public.transaction_item_payments to anon, authenticated, service_role;
grant delete, insert, references, select, trigger, truncate, update on public.transaction_items to anon, authenticated, service_role;
grant delete, insert, references, select, trigger, truncate, update on public.transaction_payments to anon, authenticated, service_role;
grant delete, insert, references, select, trigger, truncate, update on public.transactions to anon, authenticated, service_role;
grant delete, insert, references, select, trigger, truncate, update on public.trip_loaders to anon, authenticated, service_role;
grant delete, insert, references, select, trigger, truncate, update on public.trips to anon, authenticated, service_role;
grant delete, insert, references, select, trigger, truncate, update on public.vehicles to anon, authenticated, service_role;

grant delete, insert, references, select, trigger, truncate, update on public.transaction_items_payment_summary to anon, authenticated, service_role;

-- ============================================================================
-- COMMENT
-- ============================================================================

comment on column public.customers.credit_limit is 'Limit kredit customer (0 = gunakan default dari settings)';
comment on column public.store_settings.default_credit_limit is 'Limit kredit default untuk semua customer';
comment on column public.store_settings.loading_rate_per_sack is 'Tarif global upah bongkar muat per karung (Rp). Dipakai sebagai default harga/unit item muatan di surat jalan; payroll tetap menghitung dari qty x harga unit per surat jalan.';
comment on column public.delivery_orders.driver_fee is 'Tarif/upah supir untuk trip pengiriman ini (Rp). Digunakan untuk perhitungan payroll supir.';
comment on column public.closing_periods.snapshot_balances is 'JSONB berisi array saldo semua akun per akhir periode';
comment on column public.closing_periods.status is 'closed = periode terkunci, reopened = dibuka kembali';
comment on column public.payrolls.incentive_details is 'Detail breakdown insentif per surat jalan (tanggal, DO number, deskripsi, amount)';
comment on column public.transaction_payments.payment_date is 'Tanggal pembayaran dicatat. Default ke CURRENT_DATE, bisa di-override untuk custom date.';
comment on column public.chart_of_accounts.code is 'Kode akun: 3-3100 = Laba Terealisasi, 3-3200 = Laba Belum Terealisasi';

comment on table public.employee_loans is 'Kasbon karyawan; sisa otomatis terpotong via apply_kasbon_deductions saat payroll';
comment on table public.employee_loan_payments is 'Riwayat potongan kasbon dari payroll';
comment on table public.closing_periods is 'Daftar periode akuntansi yang sudah ditutup';

-- ============================================================================
-- AUTH TRIGGER: setiap user baru otomatis dapat store_settings
-- (Fase 1 mengganti isi fungsi ini menjadi: buat stores + membership owner)
-- ============================================================================

create trigger on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION create_default_store_settings();
