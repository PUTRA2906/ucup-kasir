#!/usr/bin/env python3
"""Generate supabase/migrations/0001_baseline.sql from live-DB introspection.

Input : docs/rbac/introspection/{columns,schema_objects}.json
        docs/rbac/introspection/functions/*.sql
Output: supabase/migrations/0001_baseline.sql

The output reproduces the CURRENT live schema 1:1 (old naming, old policies),
so that `supabase db reset` can be diffed against production before the RBAC
migration is layered on top.
"""
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def quote_ident(name):
    """Quote a PostgreSQL identifier only when it needs it."""
    if re.fullmatch(r"[a-z_][a-z0-9_]*", name):
        return name
    return '"%s"' % name.replace('"', '""')
INTRO = os.path.join(ROOT, "docs", "rbac", "introspection")
OUT = os.path.join(ROOT, "supabase", "migrations", "0001_baseline.sql")

columns = json.load(open(os.path.join(INTRO, "columns.json")))
objects = json.load(open(os.path.join(INTRO, "schema_objects.json")))

tables = {}
for row in columns:
    tables.setdefault(row["tbl"], []).append(row)
for t in tables:
    tables[t].sort(key=lambda r: r["attnum"])

# constraint name -> table, so we can skip the indexes those constraints create
con_names = {(c["tbl"], c["name"]) for c in objects["constraints"]}

out = []
w = out.append

w("-- ============================================================================")
w("-- 0001_baseline.sql")
w("--")
w("-- Reproduksi 1:1 skema LIVE project xkfvukkpjrjqqqroujqs")
w("-- (diambil 2026-11-26 via introspecti pg_catalog, bukan dari 74 file migrasi lama")
w("--  yang sudah drift).")
w("--")
w("-- Tabel: %d | constraint: %d | index: %d | fungsi: %d | trigger: %d | policy: %d | view: %d"
  % (len(tables), len(objects["constraints"]), len(objects["indexes"]),
     len(os.listdir(os.path.join(INTRO, "functions"))), len(objects["triggers"]),
     len(objects["policies"]), len(objects["views"])))
w("--")
w("-- CATATAN KEAMANAN: baseline ini sengaja mempertahankan kondisi live apa adanya,")
w("-- termasuk 3 lubang yang ditemukan saat audit (S1 view tanpa security_invoker,")
w("-- S2 policy `true` pada products/categories, S3 54 fungsi SECURITY DEFINER).")
w("-- Ketiganya diperbaiki di 0002/0003, bukan di sini, supaya diff-nya bisa direview.")
w("-- ============================================================================")
w("")
w("set check_function_bodies = off;")
w("")
w("create extension if not exists pgcrypto with schema extensions;")
w("")
w("")

# ---------------------------------------------------------------- tables
w("-- ============================================================================")
w("-- TABEL")
w("-- ============================================================================")
w("")
for tbl in sorted(tables):
    w("create table public.%s (" % tbl)
    lines = []
    for c in tables[tbl]:
        parts = ["  %s %s" % (quote_ident(c["col"]), c["typ"])]
        if c["def"] is not None:
            parts.append("default %s" % c["def"])
        if c["notnull"]:
            parts.append("not null")
        lines.append(" ".join(parts))
    w(",\n".join(lines))
    w(");")
    w("")

# ---------------------------------------------------------------- constraints
w("-- ============================================================================")
w("-- CONSTRAINT (PK / UNIQUE / CHECK / FK), ditambahkan setelah semua tabel ada")
w("-- ============================================================================")
w("")
order = {"p": 0, "u": 1, "c": 2, "f": 3}
for con in sorted(objects["constraints"], key=lambda c: (order.get(c["contype"], 9), c["tbl"], c["name"])):
    w("alter table public.%s add constraint %s %s;"
      % (con["tbl"], quote_ident(con["name"]), con["def"]))
w("")

# ---------------------------------------------------------------- indexes
w("-- ============================================================================")
w("-- INDEX (index milik constraint PK/UNIQUE dilewati, sudah dibuat di atas)")
w("-- ============================================================================")
w("")
for idx in objects["indexes"]:
    if (idx["tablename"], idx["indexname"]) in con_names:
        continue
    w("%s;" % idx["indexdef"])
w("")

# ---------------------------------------------------------------- functions
w("-- ============================================================================")
w("-- FUNGSI (71 buah, urut alfabetis; isi body identik dengan live)")
w("-- ============================================================================")
w("")
fdir = os.path.join(INTRO, "functions")
for name in sorted(os.listdir(fdir)):
    if not name.endswith(".sql"):
        continue
    body = open(os.path.join(fdir, name)).read().strip()
    # normalise the SET clause form emitted by pg_get_functiondef
    body = body.replace("SET search_path TO 'public'", "set search_path = public")
    w("-- >>> %s" % name[:-4])
    w(body)
    w("")

# ---------------------------------------------------------------- triggers
w("-- ============================================================================")
w("-- TRIGGER")
w("-- ============================================================================")
w("")
for trg in objects["triggers"]:
    w("%s;" % trg["def"])
w("")

# ---------------------------------------------------------------- RLS + policies
w("-- ============================================================================")
w("-- ROW LEVEL SECURITY + POLICY (183 policy, apa adanya dari live)")
w("-- ============================================================================")
w("")
by_table = {}
for p in objects["policies"]:
    by_table.setdefault(p["tablename"], []).append(p)

for tbl in sorted(by_table):
    w("alter table public.%s enable row level security;" % tbl)
    for p in by_table[tbl]:
        stmt = "create policy %s on public.%s" % (quote_ident(p["policyname"]), tbl)
        if p["permissive"] and p["permissive"].upper() == "RESTRICTIVE":
            stmt += " as restrictive"
        stmt += " for %s" % p["cmd"].lower()
        if p["roles"] and p["roles"] != "{public}":
            roles = p["roles"].strip("{}").split(",")
            stmt += " to %s" % ", ".join(roles)
        if p["qual"] is not None:
            stmt += "\n  using (%s)" % p["qual"]
        if p["with_check"] is not None:
            stmt += "\n  with check (%s)" % p["with_check"]
        w(stmt + ";")
    w("")

# tables with RLS enabled but no policies (if any) — none expected, but be safe
for tbl in sorted(tables):
    if tbl not in by_table:
        w("alter table public.%s enable row level security;" % tbl)
        w("")

# ---------------------------------------------------------------- view
w("-- ============================================================================")
w("-- VIEW (S1: sengaja tanpa security_invoker, diperbaiki di 0003)")
w("-- ============================================================================")
w("")
for v in objects["views"]:
    opts = " with (security_invoker = true)" if v["options"] and "security_invoker=true" in v["options"].replace(" ", "") else ""
    w("create view public.%s%s as\n%s" % (v["name"], opts, v["def"].rstrip().rstrip(";") + ";"))
    w("")

# ---------------------------------------------------------------- storage
w("-- ============================================================================")
w("-- STORAGE: bucket avatars + 4 policy")
w("-- ============================================================================")
w("")
for b in objects["storage_buckets"] or []:
    mime = b["allowed_mime_types"]
    mime_sql = "array[%s]" % ", ".join("'%s'" % m for m in mime) if mime else "null"
    w("insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)")
    w("values ('%s', '%s', %s, %s, %s)"
      % (b["id"], b["name"], str(b["public"]).lower(),
         b["file_size_limit"] if b["file_size_limit"] is not None else "null", mime_sql))
    w("on conflict (id) do nothing;")
w("")
for p in objects["storage_policies"] or []:
    stmt = "create policy %s on storage.objects for %s" % (quote_ident(p["policyname"]), p["cmd"].lower())
    if p["qual"]:
        stmt += "\n  using (%s)" % p["qual"]
    if p["with_check"]:
        stmt += "\n  with check (%s)" % p["with_check"]
    w(stmt + ";")
w("")

# ---------------------------------------------------------------- grants
w("-- ============================================================================")
w("-- GRANT — persis seperti live (anon/authenticated dapat SEMUA privilege).")
w("-- Fase 1 mempersempit ini: TRUNCATE/REFERENCES/TRIGGER dicabut dari anon,")
w("-- dan EXECUTE pada SECURITY DEFINER dibatasi.")
w("-- ============================================================================")
w("")
w("grant usage on schema public to anon, authenticated, service_role;")
w("")
for tbl in sorted(tables):
    w("grant delete, insert, references, select, trigger, truncate, update on public.%s to anon, authenticated, service_role;" % tbl)
w("")
for v in objects["views"]:
    w("grant delete, insert, references, select, trigger, truncate, update on public.%s to anon, authenticated, service_role;" % v["name"])
w("")

# ---------------------------------------------------------------- comments
w("-- ============================================================================")
w("-- COMMENT")
w("-- ============================================================================")
w("")
COMMENTS = [
    ("customers", "credit_limit", "Limit kredit customer (0 = gunakan default dari settings)"),
    ("store_settings", "default_credit_limit", "Limit kredit default untuk semua customer"),
    ("store_settings", "loading_rate_per_sack",
     "Tarif global upah bongkar muat per karung (Rp). Dipakai sebagai default harga/unit item muatan di surat jalan; payroll tetap menghitung dari qty x harga unit per surat jalan."),
    ("delivery_orders", "driver_fee", "Tarif/upah supir untuk trip pengiriman ini (Rp). Digunakan untuk perhitungan payroll supir."),
    ("closing_periods", "snapshot_balances", "JSONB berisi array saldo semua akun per akhir periode"),
    ("closing_periods", "status", "closed = periode terkunci, reopened = dibuka kembali"),
    ("payrolls", "incentive_details", "Detail breakdown insentif per surat jalan (tanggal, DO number, deskripsi, amount)"),
    ("transaction_payments", "payment_date", "Tanggal pembayaran dicatat. Default ke CURRENT_DATE, bisa di-override untuk custom date."),
    ("chart_of_accounts", "code", "Kode akun: 3-3100 = Laba Terealisasi, 3-3200 = Laba Belum Terealisasi"),
]
for tbl, col, desc in COMMENTS:
    w("comment on column public.%s.%s is '%s';" % (tbl, col, desc.replace("'", "''")))
w("")
TCOMMENTS = [
    ("employee_loans", "Kasbon karyawan; sisa otomatis terpotong via apply_kasbon_deductions saat payroll"),
    ("employee_loan_payments", "Riwayat potongan kasbon dari payroll"),
    ("closing_periods", "Daftar periode akuntansi yang sudah ditutup"),
]
for tbl, desc in TCOMMENTS:
    w("comment on table public.%s is '%s';" % (tbl, desc.replace("'", "''")))
w("")

# ---------------------------------------------------------------- auth trigger
w("-- ============================================================================")
w("-- AUTH TRIGGER: setiap user baru otomatis dapat store_settings")
w("-- (Fase 1 mengganti isi fungsi ini menjadi: buat stores + membership owner)")
w("-- ============================================================================")
w("")
for t in objects["auth_triggers"] or []:
    w("create trigger %s %s;" % (t["tgname"], re.sub(r"^CREATE TRIGGER %s " % t["tgname"], "", t["def"])))
w("")

open(OUT, "w").write("\n".join(out).replace("\n\n\n", "\n\n"))
print("wrote", OUT, os.path.getsize(OUT), "bytes,", len(out), "lines")
