#!/usr/bin/env python3
"""Generate supabase/migrations/0003_functions.sql (Fase 2 RBAC).

Input : docs/rbac/introspection/functions/*.sql  (snapshot live, versi lama)
Output: supabase/migrations/0003_functions.sql

Konversi
--------
1. Kolom TENANT `user_id` -> `store_id`; variabel `v_user_id` -> `v_store_id`.
2. `auth.uid()` -> `public.current_store_id()` untuk filter tenant.
3. Permission guard pada 28 RPC write (`errcode 42501`).
4. `SET search_path = public, pg_temp` di SEMUA fungsi (tanpa menduplikasi
   `SECURITY DEFINER` — bug generator lama).
5. `v_products` (masking HPP) + fix view S1.
6. COA init dikonsolidasi: satu daftar 18 akun.
7. 11 trigger `prevent_closed_period_*` ikut dikonversi.

Bug fungsional yang ikut diperbaiki (ditemukan saat audit Fase 2)
------------------------------------------------------------------
* `create_transaction` masih membaca tabel `store_settings` (di-drop di 0002).
* `create_stock_adjustment` memakai akun mati `3-1000` DAN mencatat
  `stock_movements` dua kali (trigger + manual).
* `delete_payroll` menghapus `journal_lines.journal_entry_id` (kolom tidak ada;
  yang benar `journal_id`).
* `transaction_items_payment_summary` masih memilih `ti.user_id` (sudah
  di-rename di 0002) -> view INVALID, dan tanpa `security_invoker` -> bocor (S1).
* `init_default_coa_for_store` hanya 16 akun + early-return -> `close_period`
  & `post_payroll_journal` gagal di toko baru.

Kolom yang berarti ORANG tidak boleh ikut di-rename. Audit menemukan dua:
`closing_periods.closed_by` (close_period) dan `stock_opnames.created_by`
(create_stock_opname). Keduanya dipatch eksplisit dan di-assert.
"""
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
FDIR = os.path.join(ROOT, "docs", "rbac", "introspection", "functions")
OUT = os.path.join(ROOT, "supabase", "migrations", "0003_functions.sql")

# ---------------------------------------------------------------------------
# Permission guard per RPC write. Nilai = tuple permission (semantik OR).
#
# CATATAN DEVIASI dari RBAC_PLAN §5 (didokumentasikan di RBAC_PLAN):
#   Fungsi pembayaran memakai `transaction.write` ATAU `invoice.payment.write`,
#   karena §4 memberi role `keuangan` hak `invoice.payment.write` (tanpa
#   transaction.write), dan policy RLS `transaction_item_payments_write` di
#   0002 sudah memakai OR yang sama. Kalau hanya transaction.write, halaman
#   Invoice untuk keuangan akan mati.
#
# `record_stock_movement` TIDAK di-guard: ia trigger yang jalan setiap
# products.stock berubah (termasuk saat kasir menjual). Guard di sana akan
# mematahkan penjualan.
# ---------------------------------------------------------------------------
GUARDS = {
    # transaction.write (8)
    "create_transaction": ("transaction.write",),
    "add_transaction_payment": ("transaction.write", "invoice.payment.write"),
    "delete_transaction_payment": ("transaction.write", "invoice.payment.write"),
    "allocate_payment_to_items": ("transaction.write", "invoice.payment.write"),
    "reallocate_payment": ("transaction.write", "invoice.payment.write"),
    "deallocate_payment": ("transaction.write", "invoice.payment.write"),
    "create_return": ("transaction.write",),
    "delete_return": ("transaction.write",),
    # transaction.void (2)
    "void_transaction": ("transaction.void",),
    "delete_transaction": ("transaction.void",),
    # stock.write (2)
    "create_stock_adjustment": ("stock.write",),
    "create_stock_opname": ("stock.write",),
    # finance.write (6)
    "post_journal": ("finance.write",),
    "post_adjusting_journal": ("finance.write",),
    "void_journal": ("finance.write",),
    "close_period": ("finance.write",),
    "reopen_period": ("finance.write",),
    "delete_closing_period": ("finance.write",),
    # purchasing.write (5)
    "create_purchase_order": ("purchasing.write",),
    "create_goods_receipt": ("purchasing.write",),
    "create_purchase_invoice": ("purchasing.write",),
    "add_pi_payment": ("purchasing.write",),
    "create_purchase_return": ("purchasing.write",),
    # hr.write (3)
    "generate_payroll_for_employee": ("hr.write",),
    "delete_payroll": ("hr.write",),
    "post_payroll_journal": ("hr.write",),
    # shipping.write (2)
    "generate_delivery_number": ("shipping.write",),
    "generate_trip_number": ("shipping.write",),
}

# Fungsi yang dibuang. Signature lengkap: DROP tanpa argumen TIDAK mengenai
# fungsi berparameter — itu bug yang mudah terlewat.
DROP = [
    "init_default_coa_for_current_user()",
    "init_default_coa_for_user(uuid)",
    "create_default_store_settings()",
]

# Fungsi yang nama parameter input-nya berubah. CREATE OR REPLACE tidak boleh
# mengubah nama parameter -> harus DROP dulu.
SIGNATURE_CHANGES = [
    "check_period_closed(date, uuid)",
    "get_profit_summary(uuid, date, date)",
]

# Fungsi yang ditulis ulang penuh.
MANUAL = {
    "check_period_closed",
    "get_profit_summary",
    "create_low_stock_notification",
    "create_transaction_notification",
    "create_payment_notification",
    "create_return_notification",
    "record_stock_movement",
    "trigger_init_coa_on_first_transaction",
    "create_stock_adjustment",
    "seed_default_accounts",
}

# Patch SEBELUM rename mekanis (teks asli masih user_id / auth.uid()).
PRE_FIXES = {
    # Tabel store_settings sudah dilebur ke stores di 0002.
    "create_transaction": [
        (
            "FROM store_settings\n      WHERE user_id = auth.uid()",
            "FROM public.stores\n      WHERE id = public.current_store_id()",
        ),
    ],
}

# Patch SESUDAH rename mekanis.
POST_FIXES = {
    # closed_by = ORANG, bukan toko.
    "close_period": [
        (
            "p_period_end, v_store_id, p_notes, v_balances, 'closed'",
            "p_period_end, auth.uid(), p_notes, v_balances, 'closed'",
        ),
    ],
    # created_by = ORANG, bukan toko.
    "create_stock_opname": [
        (
            "now(), public.current_store_id()\n  )",
            "now(), auth.uid()\n  )",
        ),
    ],
    # journal_lines tidak punya kolom journal_entry_id (bug live).
    "delete_payroll": [
        (
            "DELETE FROM journal_lines WHERE journal_entry_id = v_journal_id;",
            "DELETE FROM journal_lines WHERE journal_id = v_journal_id;",
        ),
    ],
}


def read(name):
    return open(os.path.join(FDIR, name + ".sql")).read()


def guard_sql(perms):
    if len(perms) == 1:
        cond = "public.has_permission('%s')" % perms[0]
        label = perms[0]
    else:
        cond = "(%s)" % " or ".join("public.has_permission('%s')" % p for p in perms)
        label = " atau ".join(perms)
    return (
        "\n  if not %s then\n"
        "    raise exception 'Akses ditolak: butuh permission %s' using errcode = '42501';\n"
        "  end if;\n" % (cond, label)
    )


def insert_guard(s, perms):
    i = s.find("AS $function$")
    if i < 0:
        sys.exit("FATAL: marker AS $function$ tidak ditemukan")
    j = s.find("\nBEGIN\n", i)
    if j < 0:
        sys.exit("FATAL: BEGIN badan fungsi tidak ditemukan")
    return s[:j] + "\nBEGIN" + guard_sql(perms) + s[j + len("\nBEGIN"):]


def transform(name):
    s = read(name)

    for old, new in PRE_FIXES.get(name, []):
        if old not in s:
            sys.exit("FATAL: %s: pre-fix tidak cocok -> %r" % (name, old[:60]))
        s = s.replace(old, new, 1)

    # (a) variabel tenant. \buser_id\b TIDAK menyentuh v_user_id (underscore
    #     adalah karakter word), jadi rename variabel harus eksplisit.
    s = re.sub(r"\bv_user_id\b", "v_store_id", s)

    # (b) kolom / pseudo-record tenant.
    s = re.sub(r"\bNEW\.user_id\b", "NEW.store_id", s)
    s = re.sub(r"\bOLD\.user_id\b", "OLD.store_id", s)
    s = re.sub(r"\bv_tx\.user_id\b", "v_tx.store_id", s)
    s = re.sub(r"\buser_id\b", "store_id", s)

    # (c) identitas tenant.
    s = s.replace("auth.uid()", "public.current_store_id()")

    # (d) search_path: normalisasi, atau tambah bila belum ada.
    #     JANGAN menambah SECURITY DEFINER (bug #1: dulu jadi dobel).
    s = s.replace("SET search_path TO 'public'", "SET search_path = public, pg_temp")
    if "SET search_path" not in s:
        if "SECURITY DEFINER\n" in s:
            s = s.replace(
                "SECURITY DEFINER\n",
                "SECURITY DEFINER\n SET search_path = public, pg_temp\n",
                1,
            )
        else:
            s = s.replace(
                " LANGUAGE plpgsql\n",
                " LANGUAGE plpgsql\n SET search_path = public, pg_temp\n",
                1,
            )
    assert "SET search_path" in s, name

    # (e) guard.
    if name in GUARDS:
        s = insert_guard(s, GUARDS[name])

    # (f) patch kolom orang / bug fungsional.
    for old, new in POST_FIXES.get(name, []):
        if old not in s:
            sys.exit("FATAL: %s: post-fix tidak cocok -> %r" % (name, old[:60]))
        s = s.replace(old, new, 1)

    return s


# ===========================================================================
# Bagian manual
# ===========================================================================

def manual_coa_init():
    return """-- ============================================================================
-- init_default_coa_for_store: SATU daftar 18 akun untuk semua jalur.
--
-- 0002 hanya men-seed 16 akun (tanpa 2-2100 Hutang Gaji dan 3-3200 Laba
-- Direalisasi) dan punya early-return, sehingga akun yang kurang tidak pernah
-- dilengkapi. Akibatnya close_period() dan post_payroll_journal() gagal di
-- toko baru. Versi ini idempotent (ON CONFLICT DO NOTHING) tanpa early-return.
-- ============================================================================
create or replace function public.init_default_coa_for_store(p_store_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_store_id is null then
    return;
  end if;

  insert into public.chart_of_accounts
    (store_id, code, name, type, normal_balance, is_active, is_system)
  values
    -- ASET
    (p_store_id, '1-1000', 'Kas',                         'aset',       'debit',  true, true),
    (p_store_id, '1-1010', 'Bank',                        'aset',       'debit',  true, true),
    (p_store_id, '1-1100', 'Piutang Usaha',               'aset',       'debit',  true, true),
    (p_store_id, '1-1200', 'Persediaan Barang Dagangan',  'aset',       'debit',  true, true),
    -- KEWAJIBAN
    (p_store_id, '2-2000', 'Utang Usaha',                 'kewajiban',  'kredit', true, true),
    (p_store_id, '2-2100', 'Hutang Gaji',                 'kewajiban',  'kredit', true, true),
    -- EKUITAS
    (p_store_id, '3-3000', 'Modal Pemilik',               'ekuitas',    'kredit', true, true),
    (p_store_id, '3-3100', 'Laba Piutang',                'ekuitas',    'kredit', true, true),
    (p_store_id, '3-3200', 'Laba Direalisasi',            'ekuitas',    'kredit', true, true),
    -- PENDAPATAN
    (p_store_id, '4-4000', 'Pendapatan Penjualan',        'pendapatan', 'kredit', true, true),
    (p_store_id, '4-4100', 'Pendapatan Lainnya',          'pendapatan', 'kredit', true, true),
    -- BEBAN
    (p_store_id, '5-5000', 'Harga Pokok Penjualan (HPP)', 'beban',      'debit',  true, true),
    (p_store_id, '5-5100', 'Beban Operasional',           'beban',      'debit',  true, true),
    (p_store_id, '5-5200', 'Beban Gaji',                  'beban',      'debit',  true, true),
    (p_store_id, '5-5300', 'Beban Sewa',                  'beban',      'debit',  true, true),
    (p_store_id, '5-5400', 'Beban Utilitas',              'beban',      'debit',  true, true),
    (p_store_id, '5-5500', 'Beban Transportasi',          'beban',      'debit',  true, true),
    (p_store_id, '5-5600', 'Beban Lainnya',               'beban',      'debit',  true, true)
  on conflict (store_id, code) do nothing;
end;
$$;

comment on function public.init_default_coa_for_store(uuid) is
  'Seed/melengkapi 18 akun COA default untuk sebuah toko (idempotent).';

-- ============================================================================
-- seed_default_accounts: DIPERTAHANKAN sebagai pembungkus tipis.
--
-- RBAC_PLAN menyebutnya di daftar DROP, tetapi frontend masih memanggilnya
-- (src/services/finance.ts:38). Menghapusnya di Fase 2 = halaman Finance mati.
-- Satu implementasi (init_default_coa_for_store); fungsi ini hanya delegasi.
-- Nama bisa dihapus di Fase 3 setelah frontend berhenti memanggilnya.
-- ============================================================================
create or replace function public.seed_default_accounts()
returns setof public.chart_of_accounts
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_store_id uuid := public.current_store_id();
begin
  if v_store_id is null then
    raise exception 'Tidak ada sesi pengguna' using errcode = '42501';
  end if;

  if not public.has_permission('finance.write') then
    raise exception 'Akses ditolak: butuh permission finance.write' using errcode = '42501';
  end if;

  perform public.init_default_coa_for_store(v_store_id);

  return query
    select * from public.chart_of_accounts
    where store_id = v_store_id
    order by code;
end;
$$;

comment on function public.seed_default_accounts() is
  'Seed akun default untuk toko aktif. Delegasi ke init_default_coa_for_store().';
"""


def manual_period():
    return """-- ============================================================================
-- check_period_closed: parameter p_user_id -> p_store_id (tenant).
-- Signature (date, uuid) tetap; hanya nama parameter berubah -> DROP dulu.
-- ============================================================================
create or replace function public.check_period_closed(p_date date, p_store_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_closed boolean;
begin
  select exists (
    select 1 from public.closing_periods
    where store_id = p_store_id
      and status = 'closed'
      and p_date >= period_start
      and p_date <= period_end
  ) into v_closed;

  return v_closed;
end;
$$;

comment on function public.check_period_closed(date, uuid) is
  'True bila tanggal berada di periode yang sudah ditutup untuk toko tsb.';

-- ============================================================================
-- get_profit_summary: p_user_id -> p_store_id, dynamic SQL dibuang,
-- guard report.sales.read (fungsi ini membuka HPP/laba).
-- ============================================================================
create or replace function public.get_profit_summary(
  p_store_id uuid,
  p_start_date date default null,
  p_end_date date default null
)
returns table (
  total_revenue numeric,
  total_cogs numeric,
  total_profit numeric,
  realized_revenue numeric,
  realized_cogs numeric,
  realized_profit numeric
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_total_revenue numeric := 0;
  v_total_cogs numeric := 0;
  v_realized_revenue numeric := 0;
begin
  if not public.has_permission('report.sales.read') then
    raise exception 'Akses ditolak: butuh permission report.sales.read' using errcode = '42501';
  end if;

  select
    coalesce(sum(t.total), 0),
    coalesce(sum((
      select sum(ti.quantity * coalesce(p.price_buy, 0))
      from public.transaction_items ti
      left join public.products p on p.id = ti.product_id
      where ti.transaction_id = t.id
    )), 0),
    coalesce(sum(t.paid_amount), 0)
  into v_total_revenue, v_total_cogs, v_realized_revenue
  from public.transactions t
  where t.store_id = p_store_id
    and t.status not in ('batal', 'void')
    and (p_start_date is null or t.created_at::date >= p_start_date)
    and (p_end_date is null or t.created_at::date <= p_end_date);

  return query
  select
    v_total_revenue,
    v_total_cogs,
    v_total_revenue - v_total_cogs,
    v_realized_revenue,
    case when v_total_revenue > 0
         then (v_realized_revenue / v_total_revenue) * v_total_cogs else 0 end,
    case when v_total_revenue > 0
         then v_realized_revenue - ((v_realized_revenue / v_total_revenue) * v_total_cogs)
         else 0 end;
end;
$$;
"""


def manual_notifications():
    return """-- ============================================================================
-- NOTIFIKASI: satu baris per anggota aktif toko.
-- `notifications.user_id` memang berarti ORANG -> tetap user_id.
-- ============================================================================
create or replace function public.create_transaction_notification()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_member record;
begin
  for v_member in
    select user_id from public.store_members
    where store_id = new.store_id and is_active
  loop
    insert into public.notifications (user_id, type, title, message, data)
    values (
      v_member.user_id,
      'transaction',
      'Transaksi Baru',
      'Transaksi ' || new.transaction_number || ' berhasil dibuat dengan total ' || new.total,
      jsonb_build_object(
        'transaction_id', new.id,
        'transaction_number', new.transaction_number,
        'total', new.total,
        'customer_name', new.customer_name
      )
    );
  end loop;

  return new;
end;
$$;

create or replace function public.create_payment_notification()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_member record;
  v_transaction_number text;
begin
  select transaction_number into v_transaction_number
  from public.transactions
  where id = new.transaction_id;

  for v_member in
    select user_id from public.store_members
    where store_id = new.store_id and is_active
  loop
    insert into public.notifications (user_id, type, title, message, data)
    values (
      v_member.user_id,
      'payment',
      'Pembayaran Diterima',
      'Pembayaran ' || new.amount || ' untuk transaksi ' || coalesce(v_transaction_number, '-') || ' berhasil dicatat',
      jsonb_build_object(
        'payment_id', new.id,
        'transaction_id', new.transaction_id,
        'amount', new.amount,
        'payment_method', new.payment_method
      )
    );
  end loop;

  return new;
end;
$$;

create or replace function public.create_return_notification()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_member record;
  v_transaction_number text;
begin
  select transaction_number into v_transaction_number
  from public.transactions
  where id = new.transaction_id;

  for v_member in
    select user_id from public.store_members
    where store_id = new.store_id and is_active
  loop
    insert into public.notifications (user_id, type, title, message, data)
    values (
      v_member.user_id,
      'return',
      'Retur Produk',
      'Retur ' || new.return_number || ' untuk transaksi ' || coalesce(v_transaction_number, '-') || ' berhasil diproses',
      jsonb_build_object(
        'return_id', new.id,
        'return_number', new.return_number,
        'transaction_id', new.transaction_id,
        'total_refund', new.total_refund
      )
    );
  end loop;

  return new;
end;
$$;

create or replace function public.create_low_stock_notification()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_minimum_stock integer;
  v_member record;
begin
  select minimum_stock into v_minimum_stock
  from public.stock_alerts
  where product_id = new.id and store_id = new.store_id and alert_enabled = true;

  if v_minimum_stock is null then
    v_minimum_stock := new.minimum_stock;
  end if;

  if v_minimum_stock is null then
    v_minimum_stock := 10;
  end if;

  if new.stock <= v_minimum_stock and (old.stock is null or old.stock > v_minimum_stock) then
    for v_member in
      select user_id from public.store_members
      where store_id = new.store_id and is_active
    loop
      insert into public.notifications (user_id, type, title, message, data)
      values (
        v_member.user_id,
        'stock_alert',
        'Stok Produk Menipis',
        'Produk "' || new.name || '" memiliki stok ' || new.stock
          || ' (minimum: ' || v_minimum_stock || ')',
        jsonb_build_object(
          'product_id', new.id,
          'product_name', new.name,
          'current_stock', new.stock,
          'minimum_stock', v_minimum_stock
        )
      );
    end loop;
  end if;

  return new;
end;
$$;
"""


def manual_stock():
    return """-- ============================================================================
-- record_stock_movement: catat mutasi stok + reference dari session setting.
-- Fungsi trigger -> TIDAK diberi guard permission.
-- ============================================================================
create or replace function public.record_stock_movement()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_ref_type text := nullif(current_setting('app.stock_ref_type', true), '');
  v_ref_id   uuid := nullif(current_setting('app.stock_ref_id', true), '')::uuid;
begin
  if new.stock is distinct from old.stock then
    insert into public.stock_movements (
      store_id, product_id, movement_type, quantity,
      quantity_before, quantity_after,
      reference_type, reference_id, notes
    ) values (
      new.store_id,
      new.id,
      case when new.stock > old.stock then 'in' else 'out' end,
      abs(new.stock - old.stock),
      old.stock,
      new.stock,
      v_ref_type,
      v_ref_id,
      case when v_ref_type is null then 'Automatic stock movement' else 'Stock adjustment' end
    );
  end if;
  return new;
end;
$$;

-- ============================================================================
-- create_stock_adjustment: 3-3000 (Modal Pemilik) + tanpa movement ganda.
-- Versi live memakai 3-1000 (tidak di-seed lagi) dan meng-insert
-- stock_movements manual padahal trigger record_stock_movement sudah mencatat.
-- ============================================================================
create or replace function public.create_stock_adjustment(
  p_product_id uuid,
  p_adjustment_type text,
  p_quantity_before integer,
  p_quantity_after integer,
  p_quantity_change integer,
  p_reason text,
  p_notes text default null::text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_adjustment_id uuid;
  v_product public.products%rowtype;
  v_account_persediaan uuid;
  v_account_modal uuid;
  v_journal_id uuid;
  v_amount numeric;
begin
  if not public.has_permission('stock.write') then
    raise exception 'Akses ditolak: butuh permission stock.write' using errcode = '42501';
  end if;

  select * into v_product
  from public.products
  where id = p_product_id and store_id = public.current_store_id();

  if not found then
    raise exception 'Produk tidak ditemukan';
  end if;

  insert into public.stock_adjustments (
    store_id, product_id, adjustment_type,
    quantity_before, quantity_after, quantity_change,
    reason, notes, created_at
  ) values (
    public.current_store_id(), p_product_id, p_adjustment_type,
    p_quantity_before, p_quantity_after, p_quantity_change,
    p_reason, p_notes, now()
  )
  returning id into v_adjustment_id;

  -- stock_movements dicatat oleh trigger (jangan insert manual -> dobel).
  perform set_config('app.stock_ref_type', 'adjustment', true);
  perform set_config('app.stock_ref_id', v_adjustment_id::text, true);

  update public.products
  set stock = p_quantity_after, updated_at = now()
  where id = p_product_id and store_id = public.current_store_id();

  perform set_config('app.stock_ref_type', '', true);
  perform set_config('app.stock_ref_id', '', true);

  v_amount := abs(p_quantity_change) * coalesce(v_product.price_buy, 0);

  if v_amount > 0 then
    select id into v_account_persediaan
    from public.chart_of_accounts
    where store_id = public.current_store_id() and code = '1-1200';

    select id into v_account_modal
    from public.chart_of_accounts
    where store_id = public.current_store_id() and code = '3-3000';

    if v_account_persediaan is not null and v_account_modal is not null then
      insert into public.journal_entries
        (store_id, entry_date, description, reference_type, reference_id)
      values (
        public.current_store_id(), now(),
        'Adjustment Stok: ' || v_product.name || ' (' || p_reason || ')',
        'stock_adjustment', v_adjustment_id
      )
      returning id into v_journal_id;

      if p_quantity_change > 0 then
        insert into public.journal_lines
          (store_id, journal_id, account_id, account_code, account_name, debit, credit)
        values
          (public.current_store_id(), v_journal_id, v_account_persediaan, '1-1200', 'Persediaan Barang Dagangan', v_amount, 0),
          (public.current_store_id(), v_journal_id, v_account_modal, '3-3000', 'Modal Pemilik', 0, v_amount);
      else
        insert into public.journal_lines
          (store_id, journal_id, account_id, account_code, account_name, debit, credit)
        values
          (public.current_store_id(), v_journal_id, v_account_modal, '3-3000', 'Modal Pemilik', v_amount, 0),
          (public.current_store_id(), v_journal_id, v_account_persediaan, '1-1200', 'Persediaan Barang Dagangan', 0, v_amount);
      end if;
    end if;
  end if;

  return v_adjustment_id;
end;
$$;

comment on function public.create_stock_adjustment(uuid, text, integer, integer, integer, text, text) is
  'Adjustment stok + auto-jurnal Dr/Cr Persediaan (1-1200) vs Modal Pemilik (3-3000).';

-- ============================================================================
-- trigger_init_coa_on_first_transaction: pastikan COA ada per toko.
-- (Trigger ensure_coa_exists di baseline tetap memakai fungsi ini.)
-- ============================================================================
create or replace function public.trigger_init_coa_on_first_transaction()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.init_default_coa_for_store(new.store_id);
  return new;
end;
$$;
"""


# Tabel bisnis yang punya store_id TANPA foreign key ke stores().
# Ditemukan saat verifikasi Fase 2: 0002 hanya menulis ulang FK yang memang
# sudah ada di baseline (5 tabel). Padahal plan §3.3 mewajibkan SETIAP tabel
# bisnis `store_id references stores(id) on delete cascade`. Tanpa FK ini,
# menghapus toko meninggalkan data yatim (uji grup 13 gagal).
MISSING_STORE_FKS = [
    "attendance", "categories", "chart_of_accounts", "closing_periods",
    "customers", "delivery_items", "delivery_orders", "delivery_tracking",
    "employees", "goods_receipts", "grn_items", "journal_entries",
    "journal_lines", "payrolls", "pi_items", "pi_payments", "po_items",
    "products", "purchase_invoices", "purchase_orders", "purchase_return_items",
    "purchase_returns", "return_items", "returns", "stock_adjustments",
    "stock_alerts", "stock_movements", "stock_opname_items", "stock_opnames",
    "suppliers", "transaction_item_payments", "transaction_items",
    "transaction_payments", "transactions", "trip_loaders", "trips", "vehicles",
]


def manual_store_fks():
    lines = [
        "-- ============================================================================",
        "-- E. FK store_id -> stores(id) ON DELETE CASCADE (celah Fase 1)",
        "--",
        "-- 0002 hanya menulis ulang FK yang sudah ada di baseline. 37 tabel bisnis",
        "-- tidak pernah punya FK ke auth.users, jadi setelah rename juga tidak punya",
        "-- FK ke stores. Akibatnya menghapus toko meninggalkan data yatim, padahal",
        "-- plan §3.3 mewajibkan cascade untuk setiap tabel bisnis.",
        "--",
        "-- Idempoten: hanya menambah bila belum ada constraint-nya.",
        "-- ============================================================================",
        "",
    ]
    for t in MISSING_STORE_FKS:
        lines.append(
            "do $$ begin\n"
            "  if not exists (\n"
            "    select 1 from pg_constraint\n"
            "    where conrelid = 'public.%s'::regclass\n"
            "      and conname = '%s_store_id_fkey'\n"
            "  ) then\n"
            "    alter table public.%s add constraint %s_store_id_fkey\n"
            "      foreign key (store_id) references public.stores(id) on delete cascade;\n"
            "  end if;\n"
            "end $$;" % (t, t, t, t)
        )
    return "\n".join(lines) + "\n"


def manual_views():
    return """-- ============================================================================
-- FIX S1: transaction_items_payment_summary tanpa security_invoker.
--
-- View lama berjalan sebagai owner -> melewati RLS sehingga user mana pun bisa
-- membaca item & pembayaran SEMUA toko. Selain itu ia masih memilih
-- `ti.user_id` (kolom sudah di-rename menjadi store_id di 0002) sehingga view
-- INVALID. Dibuat ulang dengan security_invoker = true.
--
-- Kolom `user_id` dipertahankan sebagai alias store_id agar interface frontend
-- (ItemPaymentSummary.user_id) tidak pecah; Fase 3 me-rename-nya.
-- ============================================================================
create or replace view public.transaction_items_payment_summary
with (security_invoker = true) as
select
  ti.id as item_id,
  ti.transaction_id,
  ti.store_id as user_id,
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

-- CREATE OR REPLACE tidak selalu menimpa reloption view; pastikan eksplisit.
alter view public.transaction_items_payment_summary set (security_invoker = true);

comment on view public.transaction_items_payment_summary is
  'Ringkasan pembayaran per item. security_invoker=true -> RLS tabel dasar berlaku (fix S1).';

revoke all on public.transaction_items_payment_summary from anon;
grant select on public.transaction_items_payment_summary to authenticated;

-- ============================================================================
-- v_products: masking HPP (price_buy & price_modal) untuk role tanpa hpp.read.
--
-- Keputusan (RBAC_PLAN §6): security_invoker = true. RLS `products_select`
-- tetap berlaku (isolasi tenant); `has_permission()` SECURITY DEFINER sehingga
-- CASE masking tetap bisa dievaluasi walau invoker tidak punya akses khusus.
--
-- RESIDUAL RISK (dicatat, ditutup di Fase 3): `authenticated` masih memegang
-- SELECT penuh pada tabel `public.products`, jadi user bertoken kasir masih
-- bisa membaca price_buy lewat query langsung ke tabel. Penutupnya: service
-- layer membaca v_products DAN grant kolom price_buy/price_modal dicabut dari
-- authenticated (butuh perubahan semua `select('*')` frontend).
-- ============================================================================
create or replace view public.v_products
with (security_invoker = true) as
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
from public.products p;

alter view public.v_products set (security_invoker = true);

comment on view public.v_products is
  'Produk dengan masking HPP: price_buy/price_modal hanya terisi bila user punya hpp.read.';

revoke all on public.v_products from anon;
grant select on public.v_products to authenticated;
"""


# ===========================================================================
# Rakit output
# ===========================================================================
out = []
w = out.append

w("-- ============================================================================")
w("-- 0003_functions.sql — Fase 2: konversi fungsi SQL + masking HPP")
w("--")
w("--   * kolom TENANT user_id -> store_id, auth.uid() -> current_store_id()")
w("--   * permission guard pada 28 RPC write (errcode 42501)")
w("--   * search_path dikunci di SEMUA fungsi (public, pg_temp)")
w("--   * v_products: masking HPP (security_invoker = true)")
w("--   * fix S1: transaction_items_payment_summary security_invoker = true")
w("--   * COA: satu daftar 18 akun (init_default_coa_for_store)")
w("--   * notifikasi: 1 baris per anggota toko (notifications.user_id = ORANG)")
w("--")
w("-- Dihasilkan oleh docs/rbac/gen_functions.py — jangan edit manual.")
w("-- ============================================================================")
w("")
w("-- ============================================================================")
w("-- 0. DROP: fungsi mati + fungsi yang nama parameternya berubah")
w("-- ============================================================================")
w("")
for sig in DROP:
    w("drop function if exists public.%s;" % sig)
for sig in SIGNATURE_CHANGES:
    w("drop function if exists public.%s;" % sig)
w("")
w("-- ============================================================================")
w("-- A. FUNGSI YANG DITULIS ULANG (COA, periode, notifikasi, stok)")
w("-- ============================================================================")
w("")
w(manual_coa_init().rstrip())
w("")
w(manual_period().rstrip())
w("")
w(manual_notifications().rstrip())
w("")
w(manual_stock().rstrip())
w("")

w("-- ============================================================================")
w("-- B. KONVERSI MEKANIS: user_id -> store_id, auth.uid() -> current_store_id()")
w("-- ============================================================================")
w("")
skip = set(MANUAL)
for sig in DROP:
    skip.add(sig.split("(")[0])
names = sorted(f[:-4] for f in os.listdir(FDIR) if f.endswith(".sql"))
transformed = 0
guarded = 0
for name in names:
    if name in skip:
        continue
    body = transform(name)
    transformed += 1
    if name in GUARDS:
        guarded += 1
    w("-- >>> %s" % name)
    w(body.strip())
    w("")

w("-- ============================================================================")
w("-- C. VIEW: fix S1 + masking HPP")
w("-- ============================================================================")
w("")
w(manual_views().rstrip())
w("")

w("-- ============================================================================")
w("-- D. FK store_id -> stores(id) (cascade yang hilang di Fase 1)")
w("-- ============================================================================")
w("")
w(manual_store_fks().rstrip())
w("")

w("-- ============================================================================")
w("-- E. GRANT / REVOKE")
w("--")
w("-- PENTING: fungsi yang baru dibuat otomatis mendapat EXECUTE untuk PUBLIC.")
w("-- 0002 sudah mencabutnya; kalau tidak dicabut ulang di sini, anon bisa")
w("-- memanggil semua RPC.")
w("-- ============================================================================")
w("")
w("revoke all on all functions in schema public from public;")
w("revoke all on all functions in schema public from anon;")
w("grant execute on all functions in schema public to authenticated;")
w("grant execute on all functions in schema public to service_role;")
w("")
w("-- Fungsi internal: hanya dipakai trigger SECURITY DEFINER, bukan RPC user.")
w("revoke execute on function public.init_default_coa_for_store(uuid) from authenticated;")
w("revoke execute on function public.handle_new_user() from authenticated;")
w("")

open(OUT, "w").write("\n".join(out).replace("\n\n\n", "\n\n"))

# ---------------------------------------------------------------- self-check
sql = open(OUT).read()
problems = []

if "SECURITY DEFINER\n SECURITY DEFINER" in sql or "SECURITY DEFINER\nSECURITY DEFINER" in sql:
    problems.append("SECURITY DEFINER dobel")

# user_id hanya boleh muncul untuk notifications / store_members / alias view.
for i, line in enumerate(sql.splitlines(), 1):
    stripped = line.strip()
    if stripped.startswith("--"):
        continue
    if not re.search(r"\buser_id\b", stripped):
        continue
    low = stripped.lower()
    if (
        "notifications" in low
        or "store_members" in low
        or "v_member.user_id" in low
        or "as user_id" in low
    ):
        continue
    problems.append("user_id tersisa di baris %d: %s" % (i, stripped[:110]))

# Tidak boleh ada referensi ke tabel store_settings di kode (komentar boleh).
for i, line in enumerate(sql.splitlines(), 1):
    stripped = line.strip()
    if stripped.startswith("--"):
        continue
    if re.search(r"\bstore_settings\b", stripped):
        problems.append("store_settings tersisa di baris %d" % i)

# auth.uid() hanya sah untuk kolom ORANG (closed_by / created_by).
uid_lines = [
    (i, l.strip()) for i, l in enumerate(sql.splitlines(), 1)
    if "auth.uid()" in l and not l.strip().startswith("--")
]
for i, l in uid_lines:
    if (
        "created_by" in l
        or "closed_by" in l
        or "p_period_end, auth.uid()" in l
        or "now(), auth.uid()" in l
    ):
        continue
    problems.append("auth.uid() tak terduga di baris %d: %s" % (i, l[:110]))
if len(uid_lines) != 2:
    problems.append("jumlah auth.uid() = %d, diharapkan 2 (closed_by + created_by)" % len(uid_lines))

# Setiap fungsi hasil konversi harus punya search_path.
for name in names:
    if name in skip:
        continue
    if "SET search_path" not in transform(name):
        problems.append("%s tanpa SET search_path" % name)

if len(GUARDS) != 28:
    problems.append("GUARDS berisi %d entri, diharapkan 28" % len(GUARDS))

if problems:
    print("GAGAL self-check:", file=sys.stderr)
    for p in problems:
        print("  - " + p, file=sys.stderr)
    sys.exit(1)

print("wrote", OUT, os.path.getsize(OUT), "bytes")
print("fungsi dikonversi mekanis:", transformed, "| dengan guard:", guarded)
print("self-check: OK")
