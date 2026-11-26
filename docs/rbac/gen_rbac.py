#!/usr/bin/env python3
"""Generate supabase/migrations/0002_rbac.sql (Fase 1: skema RBAC).

Input : docs/rbac/introspection/{columns,schema_objects}.json
Output: supabase/migrations/0002_rbac.sql

Dijalankan SETELAH 0001_baseline.sql. Asumsi: database greenfield (tabel kosong),
sesuai keputusan "greenfield in-place" di docs/RBAC_PLAN.md.
"""
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
INTRO = os.path.join(ROOT, "docs", "rbac", "introspection")
OUT = os.path.join(ROOT, "supabase", "migrations", "0002_rbac.sql")

columns = json.load(open(os.path.join(INTRO, "columns.json")))
objects = json.load(open(os.path.join(INTRO, "schema_objects.json")))

tables = {}
for row in columns:
    tables.setdefault(row["tbl"], []).append(row)

constraint_names = {(c["tbl"], c["name"]) for c in objects["constraints"]}
constraint_def = {(c["tbl"], c["name"]): c["def"] for c in objects["constraints"]}

# ---------------------------------------------------------------- permission matrix
ROLES = ["owner", "admin", "kasir", "gudang", "keuangan"]

MATRIX = {
    "dashboard.read":         ["owner", "admin", "kasir", "gudang", "keuangan"],
    "product.read":           ["owner", "admin", "kasir", "gudang", "keuangan"],
    "product.write":          ["owner", "admin", "gudang"],
    "stock.read":             ["owner", "admin", "gudang"],
    "stock.write":            ["owner", "admin", "gudang"],
    "transaction.read":       ["owner", "admin", "kasir", "keuangan"],
    "transaction.write":      ["owner", "admin", "kasir"],
    "transaction.void":       ["owner", "admin"],
    "customer.read":          ["owner", "admin", "kasir", "keuangan"],
    "customer.write":         ["owner", "admin", "kasir"],
    "invoice.payment.write":  ["owner", "admin", "kasir", "keuangan"],
    "price.read":             ["owner", "admin"],
    "price.write":            ["owner", "admin"],
    "report.sales.read":      ["owner", "admin", "keuangan"],
    "hpp.read":               ["owner", "admin", "keuangan"],
    "finance.read":           ["owner", "admin", "keuangan"],
    "finance.write":          ["owner", "admin", "keuangan"],
    "purchasing.read":        ["owner", "admin", "gudang", "keuangan"],
    "purchasing.write":       ["owner", "admin", "gudang"],
    "hr.read":                ["owner"],
    "hr.write":               ["owner"],
    "shipping.read":          ["owner", "admin", "kasir", "gudang"],
    "shipping.write":         ["owner", "admin", "gudang"],
    "settings.read":          ["owner", "admin"],
    "settings.write":         ["owner", "admin"],
    "user.manage":            ["owner"],
}

# tabel -> (permission baca, permission tulis)
TABLE_PERMS = {
    "products":                   ("product.read", "product.write"),
    "categories":                 ("product.read", "product.write"),
    "stock_movements":            ("stock.read", "stock.write"),
    "stock_adjustments":          ("stock.read", "stock.write"),
    "stock_alerts":               ("stock.read", "stock.write"),
    "stock_opnames":              ("stock.read", "stock.write"),
    "stock_opname_items":         ("stock.read", "stock.write"),
    "transactions":               ("transaction.read", "transaction.write"),
    "transaction_items":          ("transaction.read", "transaction.write"),
    # kasir mencatat pembayaran cicilan (invoice.payment.write) tanpa boleh void/edit transaksi
    "transaction_payments":       ("transaction.read", "transaction.write|invoice.payment.write"),
    "transaction_item_payments":  ("transaction.read", "transaction.write|invoice.payment.write"),
    "returns":                    ("transaction.read", "transaction.write"),
    "return_items":               ("transaction.read", "transaction.write"),
    "customers":                  ("customer.read", "customer.write"),
    "customer_groups":            ("customer.read", "price.write"),
    "customer_group_members":     ("customer.read", "price.write"),
    "customer_price_matrix":      ("price.read", "price.write"),
    "price_tiers":                ("price.read", "price.write"),
    "chart_of_accounts":          ("finance.read", "finance.write"),
    "journal_entries":            ("finance.read", "finance.write"),
    "journal_lines":              ("finance.read", "finance.write"),
    "closing_periods":            ("finance.read", "finance.write"),
    "suppliers":                  ("purchasing.read", "purchasing.write"),
    "purchase_orders":            ("purchasing.read", "purchasing.write"),
    "po_items":                   ("purchasing.read", "purchasing.write"),
    "goods_receipts":             ("purchasing.read", "purchasing.write"),
    "grn_items":                  ("purchasing.read", "purchasing.write"),
    "purchase_invoices":          ("purchasing.read", "purchasing.write"),
    "pi_items":                   ("purchasing.read", "purchasing.write"),
    "pi_payments":                ("purchasing.read", "purchasing.write"),
    "purchase_returns":           ("purchasing.read", "purchasing.write"),
    "purchase_return_items":      ("purchasing.read", "purchasing.write"),
    "employees":                  ("hr.read", "hr.write"),
    "attendance":                 ("hr.read", "hr.write"),
    "employee_loans":             ("hr.read", "hr.write"),
    "employee_loan_payments":     ("hr.read", "hr.write"),
    "payrolls":                   ("hr.read", "hr.write"),
    "delivery_orders":            ("shipping.read", "shipping.write"),
    "delivery_items":             ("shipping.read", "shipping.write"),
    "delivery_load_items":        ("shipping.read", "shipping.write"),
    "delivery_loaders":           ("shipping.read", "shipping.write"),
    "delivery_order_transactions": ("shipping.read", "shipping.write"),
    "delivery_tracking":          ("shipping.read", "shipping.write"),
    "trips":                      ("shipping.read", "shipping.write"),
    "trip_loaders":               ("shipping.read", "shipping.write"),
    "vehicles":                   ("shipping.read", "shipping.write"),
}

# tabel yang dapat kolom created_by (audit: siapa yang input).
# stock_movements/stock_adjustments/stock_opnames/employee_loans/employee_loan_payments
# sudah punya created_by sejak baseline.
CREATED_BY_TABLES = [
    "products", "categories", "customers", "suppliers", "employees",
    "transactions", "transaction_payments", "returns",
    "purchase_orders", "goods_receipts", "purchase_invoices", "purchase_returns",
    "journal_entries", "closing_periods",
    "delivery_orders", "trips", "vehicles",
    "payrolls", "price_tiers", "customer_groups", "customer_price_matrix",
]

# notifications tetap memakai user_id (notifikasi milik ORANG, bukan toko).
# store_settings dilebur ke stores -> tidak ikut di-rename.
TENANT_TABLES = sorted(t for t in tables if t not in ("notifications", "store_settings"))

# Tabel yang DROP di migrasi ini. Policy-nya tidak boleh di-drop satu per satu:
# `drop policy if exists ... on <tabel>` tetap ERROR bila TABEL-nya sudah tidak ada
# (IF EXISTS hanya melindungi policy, bukan tabelnya) -> gagal saat `supabase db reset`.
DROPPED_TABLES = {"store_settings"}

out = []
w = out.append


def q(name):
    if re.fullmatch(r"[a-z_][a-z0-9_]*", name):
        return name
    return '"%s"' % name.replace('"', '""')


def perm_expr(spec):
    """'a.b|c.d' -> "(select has_permission('a.b') or has_permission('c.d'))" """
    parts = spec.split("|")
    inner = " or ".join("has_permission('%s')" % p for p in parts)
    return "(select %s)" % inner


TENANT = "(store_id = (select current_store_id()))"

# ---------------------------------------------------------------- header
w("-- ============================================================================")
w("-- 0002_rbac.sql — Fase 1: skema multi-tenant + RBAC")
w("--")
w("-- Dijalankan setelah 0001_baseline.sql. Mengasumsikan database greenfield")
w("-- (tabel kosong) sesuai keputusan 'greenfield in-place' di docs/RBAC_PLAN.md.")
w("--")
w("-- Isi:")
w("--   1. Tabel tenancy: stores, store_members, role_permissions (+ seed matriks)")
w("--   2. Helper: current_store_id(), has_permission()")
w("--   3. Rename user_id -> store_id pada %d tabel bisnis (+ default current_store_id())" % len(TENANT_TABLES))
w("--   4. Ganti FK store_id: auth.users -> stores (on delete cascade)")
w("--   5. Tambah created_by (audit) pada tabel transaksional")
w("--   6. Hapus 183 policy lama, tulis ulang dengan pola seragam per tenant + permission")
w("--   7. Persempit GRANT (anon dicabut)")
w("--   8. Trigger on_auth_user_created: buat stores + membership owner + COA default")
w("-- ============================================================================")
w("")
w("set check_function_bodies = off;")
w("")
w("")

# ---------------------------------------------------------------- tenancy
w("-- ============================================================================")
w("-- 1. TABEL TENANCY")
w("-- ============================================================================")
w("")
w("""create table public.stores (
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
""")
w("")

# seed
w("insert into public.role_permissions (role, permission) values")
rows = []
for perm in sorted(MATRIX):
    for role in MATRIX[perm]:
        rows.append("  ('%s', '%s')" % (role, perm))
w(",\n".join(rows) + ";")
w("")

# ---------------------------------------------------------------- helpers
w("-- ============================================================================")
w("-- 2. HELPER FUNCTIONS")
w("--")
w("-- SECURITY DEFINER supaya bisa membaca store_members tanpa rekursi RLS.")
w("-- search_path dikunci (public, pg_temp) — mitigasi serangan search_path.")
w("-- ============================================================================")
w("")
w("""create or replace function public.current_store_id()
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
""")
w("")

# ---------------------------------------------------------------- rename
w("-- ============================================================================")
w("-- 3. RENAME user_id -> store_id pada %d tabel bisnis" % len(TENANT_TABLES))
w("--    (notifications sengaja TETAP user_id: notifikasi milik orang, bukan toko)")
w("-- ============================================================================")
w("")
for tbl in TENANT_TABLES:
    w("alter table public.%s rename column user_id to store_id;" % tbl)
w("")
w("-- Default kolom store_id kini mengikuti toko aktif, bukan user yang login")
for tbl in TENANT_TABLES:
    w("alter table public.%s alter column store_id set default public.current_store_id();" % tbl)
w("")

# ---------------------------------------------------------------- FK swap
w("-- ============================================================================")
w("-- 4. FK store_id: auth.users -> stores (on delete cascade)")
w("-- ============================================================================")
w("")
for c in objects["constraints"]:
    if c["contype"] != "f":
        continue
    d = c["def"] or ""
    if "FOREIGN KEY (user_id)" in d and "auth.users" in d:
        tbl = c["tbl"]
        if tbl == "notifications":
            continue
        w("alter table public.%s drop constraint %s;" % (tbl, q(c["name"])))
        w("alter table public.%s add constraint %s_store_id_fkey "
          "foreign key (store_id) references public.stores(id) on delete cascade;"
          % (tbl, tbl))
w("")

# ---------------------------------------------------------------- index renames
w("-- ============================================================================")
w("-- 5. Rename index/constraint yang namanya masih menyebut user_id")
w("-- ============================================================================")
w("")
for idx in objects["indexes"]:
    if "user_id" not in idx["indexdef"]:
        continue
    tbl, name = idx["tablename"], idx["indexname"]
    if tbl == "store_settings":
        continue  # tabel di-drop di bawah
    new = name.replace("user_id", "store_id")
    if new == name:
        continue
    if (tbl, name) in constraint_names:
        w("alter table public.%s rename constraint %s to %s;" % (tbl, q(name), q(new)))
    else:
        w("alter index public.%s rename to %s;" % (q(name), q(new)))
w("")

# ---------------------------------------------------------------- created_by
w("-- ============================================================================")
w("-- 6. Tambah created_by (audit: siapa yang input)")
w("-- ============================================================================")
w("")
for tbl in CREATED_BY_TABLES:
    has = any(c["col"] == "created_by" for c in tables[tbl])
    if has:
        w("alter table public.%s alter column created_by set default auth.uid();" % tbl)
    else:
        w("alter table public.%s add column created_by uuid default auth.uid() "
          "references auth.users(id) on delete set null;" % tbl)
w("")
w("-- stock_movements/stock_adjustments/stock_opnames/employee_loans/employee_loan_payments")
w("-- sudah punya created_by sejak baseline; FK-nya tetap ke auth.users (itu orang).")
w("")

# ---------------------------------------------------------------- merge store_settings
w("-- ============================================================================")
w("-- 7. store_settings dilebur ke stores (1:1 dengan toko)")
w("-- ============================================================================")
w("")
w("drop table public.store_settings;")
w("")
w("-- fungsi trigger lama yang menulis ke store_settings sudah tidak dipakai")
w("drop trigger if exists on_auth_user_created on auth.users;")
w("drop function if exists public.create_default_store_settings();")
w("")
w("-- COA default kini per TOKO (bukan per user). Satu implementasi untuk semua")
w("-- pemanggil; init_default_coa_for_current_user / _for_user / seed_default_accounts")
w("-- / trigger_init_coa_on_first_transaction dihapus di 0003.")
w("""create or replace function public.init_default_coa_for_store(p_store_id uuid)
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
""")
w("")

# ---------------------------------------------------------------- per-table store index
w("-- ============================================================================")
w("-- 8. Index store_id untuk tabel yang belum punya index berawalan store_id")
w("-- ============================================================================")
w("")
for tbl in TENANT_TABLES:
    leading = False
    for idx in objects["indexes"]:
        if idx["tablename"] != tbl:
            continue
        m = re.search(r"USING \w+ \(([^)]*)\)", idx["indexdef"])
        if not m:
            continue
        first = m.group(1).split(",")[0].strip()
        if first == "user_id":
            leading = True
            break
    if not leading:
        w("create index %s_store_idx on public.%s (store_id);" % (tbl, tbl))
w("")

# ---------------------------------------------------------------- policies
w("-- ============================================================================")
w("-- 9. RLS + POLICY")
w("--")
w("-- Semua 183 policy lama dihapus dan diganti pola seragam:")
w("--   <tabel>_select : for select  to authenticated  using (tenant AND has_permission(read))")
w("--   <tabel>_write  : for all     to authenticated  using (tenant AND has_permission(write))")
w("--                                  with check (...)")
w("--")
w("-- (select current_store_id()) / (select has_permission(...)) dibungkus subquery")
w("-- supaya Postgres mengevaluasinya SEKALI per query (InitPlan), bukan per baris.")
w("-- anon tidak mendapat policy sama sekali -> ditolak.")
w("-- ============================================================================")
w("")
w("-- hapus seluruh policy lama")
for p in objects["policies"]:
    if p["tablename"] in DROPPED_TABLES:
        continue  # tabelnya sudah di-drop di langkah 7; policy ikut hilang
    w("drop policy if exists %s on public.%s;" % (q(p["policyname"]), p["tablename"]))
w("")

w("-- stores: anggota boleh lihat tokonya; hanya settings.write yang boleh ubah")
w("""alter table public.stores enable row level security;

create policy stores_select on public.stores
  for select to authenticated
  using (id = (select public.current_store_id()));

create policy stores_update on public.stores
  for update to authenticated
  using (id = (select public.current_store_id()) and (select public.has_permission('settings.write')))
  with check (id = (select public.current_store_id()) and (select public.has_permission('settings.write')));
""")
w("")

w("-- store_members: anggota boleh lihat daftar anggota; kelola hanya dengan user.manage")
w("""alter table public.store_members enable row level security;

create policy store_members_select on public.store_members
  for select to authenticated
  using (store_id = (select public.current_store_id()));

create policy store_members_write on public.store_members
  for all to authenticated
  using (store_id = (select public.current_store_id()) and (select public.has_permission('user.manage')))
  with check (store_id = (select public.current_store_id()) and (select public.has_permission('user.manage')));
""")
w("")

w("-- role_permissions: matriks global, boleh dibaca semua user login, tidak bisa ditulis via API")
w("""alter table public.role_permissions enable row level security;

create policy role_permissions_select on public.role_permissions
  for select to authenticated
  using (true);
""")
w("")

for tbl in TENANT_TABLES:
    read_perm, write_perm = TABLE_PERMS[tbl]
    w("-- %s" % tbl)
    w("alter table public.%s enable row level security;" % tbl)
    w("")
    w("create policy %s_select on public.%s" % (tbl, tbl))
    w("  for select to authenticated")
    w("  using (%s and %s);" % (TENANT, perm_expr(read_perm)))
    w("")
    w("create policy %s_write on public.%s" % (tbl, tbl))
    w("  for all to authenticated")
    w("  using (%s and %s)" % (TENANT, perm_expr(write_perm)))
    w("  with check (%s and %s);" % (TENANT, perm_expr(write_perm)))
    w("")

w("-- notifications: milik ORANG (user_id), bukan toko")
w("""alter table public.notifications enable row level security;

create policy notifications_own on public.notifications
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
""")
w("")

# ---------------------------------------------------------------- grants
w("-- ============================================================================")
w("-- 10. GRANT — anon dicabut total; authenticated dibatasi ke DML (RLS tetap berlaku)")
w("-- ============================================================================")
w("")
w("-- PENTING: EXECUTE pada fungsi baru di-grant ke PUBLIC secara default oleh Postgres.")
w("-- Revoke dari PUBLIC dulu, baru beri ke role yang berhak — kalau hanya revoke dari")
w("-- anon, anon tetap bisa memanggil lewat warisan PUBLIC.")
w("revoke all on all tables in schema public from anon;")
w("revoke all on all sequences in schema public from anon;")
w("revoke all on all functions in schema public from public;")
w("revoke all on all functions in schema public from anon;")
w("")
w("-- PENTING: baseline (0001) memberi `authenticated` DELETE, INSERT, REFERENCES,")
w("-- SELECT, TRIGGER, TRUNCATE, UPDATE pada SEMUA tabel. TRUNCATE dan REFERENCES/")
w("-- TRIGGER TIDAK tunduk pada RLS — kasir bisa `truncate public.notifications` dan")
w("-- menghapus data SEMUA toko. Jadi cabut SEMUA dulu, baru beri DML saja.")
w("-- (GRANT saja tidak cukup: hak lama tetap menempel.)")
w("revoke all on all tables in schema public from authenticated;")
w("revoke all on all sequences in schema public from authenticated;")
w("")
w("grant select, insert, update, delete on all tables in schema public to authenticated;")
w("grant usage, select on all sequences in schema public to authenticated;")
w("grant execute on all functions in schema public to authenticated;")
w("")
w("grant all on all tables in schema public to service_role;")
w("grant all on all sequences in schema public to service_role;")
w("grant execute on all functions in schema public to service_role;")
w("")
w("-- anon tidak mendapat akses tabel/fungsi apa pun di schema public.")
w("-- Halaman signin/signup memakai Supabase Auth (schema auth), bukan public.")
w("")

# ---------------------------------------------------------------- trigger
w("-- ============================================================================")
w("-- 11. TRIGGER on_auth_user_created")
w("--")
w("-- User baru -> buat toko + membership owner + COA default untuk toko itu.")
w("-- Menggantikan create_default_store_settings() (tabel store_settings sudah dihapus).")
w("-- ============================================================================")
w("")
w("""create or replace function public.handle_new_user()
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
""")
w("")

open(OUT, "w").write("\n".join(out).replace("\n\n\n", "\n\n"))
print("wrote", OUT, os.path.getsize(OUT), "bytes,", len(out), "lines")
