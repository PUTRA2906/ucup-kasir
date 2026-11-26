#!/usr/bin/env bash
# Verify a migration file against a throw-away local PostgreSQL cluster.
#
#   bash docs/rbac/verify_sql.sh supabase/migrations/0001_baseline.sql [more.sql ...]
#
# Emulates the bits of a Supabase database that our migrations depend on:
#   roles anon / authenticated / service_role / supabase_admin,
#   schemas auth + storage + extensions,
#   auth.users, auth.uid(), storage.buckets, storage.objects,
#   DAN ekstensi `supautils` yang di-preload oleh stack Supabase asli.
#
# KENAPA supautils WAJIB ditiru (temuan penting):
#   Di PostgreSQL vanilla, `drop policy if exists ... on <tabel yang sudah di-drop>`
#   hanya menghasilkan NOTICE — bahkan di dalam transaksi dan sebagai non-superuser.
#   Tetapi stack Supabase mem-preload `supautils` dengan `supautils.policy_grants`,
#   yang meng-hook DDL policy dan me-resolve tabel lebih dulu. Akibatnya statement
#   yang sama menjadi ERROR "relation ... does not exist" (SQLSTATE 42P01).
#   Harness tanpa supautils akan LULUS padahal `supabase db reset` GAGAL — persis
#   bug 0002 (drop table store_settings lalu drop policy-nya) yang pernah lolos.
#   Karena itu harness ini mem-preload supautils dengan policy_grants yang sama.
#
# Catatan: `supabase db reset` pada stack native tetap menjadi gerbang otoritatif;
# harness ini adalah pemeriksaan cepat tanpa perlu menyalakan seluruh stack.
set -euo pipefail

PGDATA=/tmp/rbac-pgdata
PORT=55432

# PENTING: pakai PostgreSQL 17, SAMA dengan project live (17.11) dan local stack.
# Binary PG17 milik Supabase juga membawa `supautils.so`, yang kita preload agar
# semantik DDL policy identik dengan stack asli. Urutan pencarian: $RBAC_PG_BIN,
# lalu binary PG17 milik local stack Supabase, lalu `pg_config`/PATH bila 17.
find_pg_bin() {
  if [ -n "${RBAC_PG_BIN:-}" ]; then echo "$RBAC_PG_BIN"; return; fi
  for d in "$HOME"/.supabase/cache/stack/slim-services/postgres/17.*/*/*/bin; do
    [ -x "$d/initdb" ] && { echo "$d"; return; }
  done
  local v; v="$(pg_config --version 2>/dev/null || true)"
  if [[ "$v" == "PostgreSQL 17"* ]]; then dirname "$(command -v pg_ctl)"; return; fi
  return 1
}

if ! PGBIN="$(find_pg_bin)"; then
  echo "ERROR: PostgreSQL 17 tidak ditemukan." >&2
  echo "  Jalankan 'supabase start' sekali (mengunduh binary PG17), atau set RBAC_PG_BIN=/path/ke/pg17/bin" >&2
  exit 1
fi
echo "==> using PostgreSQL: $("$PGBIN/postgres" --version) ($PGBIN)"

# Mirror peran project Supabase: `supabase_admin` = SUPERUSER (hanya untuk
# bootstrap), `postgres` = NON-SUPERUSER yang menjalankan migrasi.
BOOTSTRAP="$PGBIN/psql -h /tmp -p $PORT -U supabase_admin -v ON_ERROR_STOP=1 -q"
PSQL="$PGBIN/psql -h /tmp -p $PORT -U postgres -v ON_ERROR_STOP=1 -q"

# Selalu mulai dari kondisi bersih: hentikan postmaster yang mungkin masih hidup
# untuk datadir ini (mis. sisa run RBAC_KEEP=1). Kalau tidak, `pg_ctl start` gagal
# diam-diam dan psql menyambung ke proses lama yang datanya sudah dihapus
# ("could not open file global/pg_filenode.map").
"$PGBIN/pg_ctl" -D "$PGDATA" stop -m immediate >/dev/null 2>&1 || true
ps -ef | grep "[r]bac-pgdata" | awk '{print $2}' | xargs -r kill -9 2>/dev/null || true
if [ ! -d "$PGDATA" ] || ! "$PGBIN/pg_controldata" "$PGDATA" >/dev/null 2>&1; then
  rm -rf "$PGDATA"
  "$PGBIN/initdb" -D "$PGDATA" -U supabase_admin --auth=trust >/dev/null
fi

# Preload supautils persis seperti stack Supabase (lihat catatan di header).
# Bila binary ini tidak membawa supautils, gagal keras: harness tanpa supautils
# memberi false-positive untuk bug DDL policy, jadi lebih baik berhenti.
if [ ! -f "$PGBIN/../lib/supautils.so" ] && [ ! -f "$PGBIN/../lib/postgresql/supautils.so" ]; then
  echo "ERROR: supautils.so tidak ada di $PGBIN/../lib — harness tidak bisa meniru" >&2
  echo "       semantik DDL policy Supabase. Jalankan 'supabase start' agar binary PG17 terunduh." >&2
  exit 1
fi
# Tulis sekali (idempoten) ke postgresql.conf — server hanya membaca file ini.
if ! grep -q '^# rbac-harness supautils' "$PGDATA/postgresql.conf"; then
  cat >> "$PGDATA/postgresql.conf" <<'CONF'

# rbac-harness supautils: tiru stack Supabase agar DDL policy berperilaku identik.
session_preload_libraries = 'supautils'
supautils.policy_grants = '{"postgres":["auth.users","storage.buckets","storage.objects"]}'
supautils.drop_trigger_grants = '{"postgres":["auth.users","storage.buckets","storage.objects"]}'
CONF
fi

"$PGBIN/pg_ctl" -D "$PGDATA" -o "-p $PORT -k /tmp -c listen_addresses=''" -l /tmp/rbac-pg.log -w start >/dev/null 2>&1 || {
  echo "ERROR: gagal menyalakan cluster uji. Log terakhir:" >&2
  tail -15 /tmp/rbac-pg.log >&2
  exit 1
}
if [ "${RBAC_KEEP:-0}" != "1" ]; then
  trap '"$PGBIN/pg_ctl" -D "$PGDATA" stop -m fast >/dev/null 2>&1 || true' EXIT
fi

# Role `postgres` (non-superuser) harus ada SEBELUM database dibuat (owner).
$BOOTSTRAP -d postgres -c "do \$\$ begin
  if not exists (select 1 from pg_roles where rolname = 'postgres') then
    create role postgres login nosuperuser createrole createdb;
  end if;
end \$\$;" >/dev/null
$BOOTSTRAP -d postgres -c "drop database if exists rbac_test;" >/dev/null
# Database dimiliki `postgres` (non-superuser), seperti di project Supabase.
$BOOTSTRAP -d postgres -c "create database rbac_test owner postgres;" >/dev/null

# Bootstrap sebagai SUPERUSER (supabase_admin): buat role + schema + objek auth/storage.
$BOOTSTRAP -d rbac_test <<'SQL'
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'postgres') then
    create role postgres login nosuperuser createrole createdb;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;
create schema if not exists extensions;
create schema if not exists auth;
create schema if not exists storage;
grant usage on schema public, extensions, auth, storage to anon, authenticated, service_role;

-- Migrasi dijalankan oleh `postgres` (non-superuser). Beri dia hak owner seperti
-- di project Supabase: pemilik schema public + akses penuh ke auth/storage.
alter schema public owner to postgres;
grant all on schema public to postgres;
grant create, usage on schema auth, storage to postgres;

-- `postgres` harus bisa `set role authenticated` / `anon` (dipakai test_rbac.sh
-- dan juga cara Supabase menguji RLS lewat PostgREST). Di project asli role
-- `postgres` adalah anggota role-role ini; tanpa grant, uji fungsional gagal
-- dengan "permission denied to set role".
grant anon, authenticated, service_role to postgres;

-- Samakan tipe dengan Supabase asli: `auth.users.email` adalah varchar(255),
-- bukan text. Perbedaan ini pernah menyembunyikan bug nyata — fungsi yang
-- mengembalikan kolom email gagal di stack asli ("structure of query does not
-- match function result type") padahal lolos di harness.
create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email varchar(255),
  raw_user_meta_data jsonb default '{}'::jsonb,
  raw_app_meta_data jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create or replace function auth.uid() returns uuid
language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

create or replace function auth.role() returns text
language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), 'anon')
$$;

create table storage.buckets (
  id text primary key, name text not null, owner uuid, public boolean default false,
  file_size_limit bigint, allowed_mime_types text[], created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create table storage.objects (
  id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets(id),
  name text, owner uuid, created_at timestamptz default now(), updated_at timestamptz default now(),
  last_accessed_at timestamptz, metadata jsonb
);
alter table storage.objects enable row level security;

create or replace function storage.foldername(name text) returns text[]
language sql immutable as $$ select string_to_array(name, '/') $$;

-- Migrasi (dijalankan `postgres`) butuh hak OWNER, bukan sekadar GRANT, untuk
-- `alter table ... enable row level security` / `create trigger` / `create policy`
-- pada objek auth+storage. GRANT saja berujung "must be owner of table objects".
alter schema auth owner to postgres;
alter schema storage owner to postgres;
alter table auth.users owner to postgres;
alter table storage.buckets owner to postgres;
alter table storage.objects owner to postgres;
alter function auth.uid() owner to postgres;
alter function auth.role() owner to postgres;
alter function storage.foldername(text) owner to postgres;
SQL

# Setiap file dijalankan di dalam SATU transaksi, meniru cara `supabase db reset`
# menerapkan migrasi. Ini penting: beberapa statement berperilaku beda di dalam vs
# di luar transaksi. Contoh nyata: `drop policy if exists ... on <tabel hilang>`
# hanya NOTICE di luar transaksi, tetapi ERROR di dalam transaksi (PG17).
# Tanpa transaksi, harness bisa LULUS padahal `db reset` gagal.
for f in "$@"; do
  echo "==> applying $f (in transaction, like supabase db reset)"
  ( echo "begin;"; cat "$f"; echo; echo "commit;" ) | $PSQL -d rbac_test
done

echo "==> summary"
$BOOTSTRAP -d rbac_test -At <<'SQL'
select 'tables      ' || count(*) from pg_class where relnamespace='public'::regnamespace and relkind='r';
select 'views       ' || count(*) from pg_class where relnamespace='public'::regnamespace and relkind='v';
select 'functions   ' || count(*) from pg_proc where pronamespace='public'::regnamespace;
select 'triggers    ' || count(*) from pg_trigger where not tgisinternal and tgrelid in (select oid from pg_class where relnamespace='public'::regnamespace);
select 'policies    ' || count(*) from pg_policies where schemaname='public';
select 'indexes     ' || count(*) from pg_indexes where schemaname='public';
select 'constraints ' || count(*) from pg_constraint where connamespace='public'::regnamespace;
select 'rls_enabled ' || count(*) from pg_class where relnamespace='public'::regnamespace and relkind='r' and relrowsecurity;
SQL
