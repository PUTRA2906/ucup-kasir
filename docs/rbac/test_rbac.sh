#!/usr/bin/env bash
# Uji fungsional RBAC terhadap cluster lokal yang sudah diisi
# 0001_baseline.sql + 0002_rbac.sql (+0003 bila ada).
#
#   RBAC_KEEP=1 bash docs/rbac/verify_sql.sh supabase/migrations/0001_baseline.sql \
#     supabase/migrations/0002_rbac.sql
#   bash docs/rbac/test_rbac.sh
set -euo pipefail

# Default: cluster harness (verify_sql.sh). Untuk menguji stack lokal asli:
#   RBAC_TEST_HOST=127.0.0.1 RBAC_TEST_PORT=54322 RBAC_TEST_DB=postgres \
#     RBAC_TEST_USER=postgres bash docs/rbac/test_rbac.sh
HOST=${RBAC_TEST_HOST:-/tmp}
PORT=${RBAC_TEST_PORT:-55432}
DB=${RBAC_TEST_DB:-rbac_test}
DBUSER=${RBAC_TEST_USER:-postgres}

# `psql` sering tidak ada di PATH (binary PG17 milik stack Supabase dipakai
# oleh verify_sql.sh). Cari dengan urutan yang sama.
if ! command -v psql >/dev/null 2>&1; then
  for d in "$HOME"/.supabase/cache/stack/slim-services/postgres/17.*/*/*/bin; do
    [ -x "$d/psql" ] && { PATH="$d:$PATH"; break; }
  done
fi
command -v psql >/dev/null 2>&1 || { echo "ERROR: psql tidak ditemukan" >&2; exit 1; }

PSQL="psql -h $HOST -p $PORT -U $DBUSER -d $DB -v ON_ERROR_STOP=1 -q -At"

fail=0
check() { # check <label> <expected> <actual>
  if [ "$2" = "$3" ]; then
    printf '  ok   %s\n' "$1"
  else
    printf '  FAIL %s (expected [%s] got [%s])\n' "$1" "$2" "$3"
    fail=1
  fi
}

# ---------- helper: jalankan query sebagai user tertentu (RLS berlaku).
# tail -1 membuang output set_config, menyisakan hasil query terakhir.
as_user() { # as_user <uuid> <sql>
  local uid="$1"; shift
  $PSQL -c "begin;
    set local role authenticated;
    select set_config('request.jwt.claim.sub', '$uid', true);
    select set_config('request.jwt.claim.role', 'authenticated', true);
    $1
    rollback;" 2>&1 | grep -v '^$' | tail -1
}

# as_user_commit <uuid> <sql> -> seperti as_user, tetapi COMMIT (bukan rollback).
# Dipakai bila efek sampingnya perlu diperiksa pada langkah berikutnya.
as_user_commit() {
  local uid="$1"; shift
  $PSQL -c "begin;
    set local role authenticated;
    select set_config('request.jwt.claim.sub', '$uid', true);
    select set_config('request.jwt.claim.role', 'authenticated', true);
    $1
    commit;" 2>&1 | grep -v '^$' | tail -1
}

# denied <uuid> <sql> -> "denied" bila error berisi 'Akses ditolak'.
# (Tidak bisa pakai as_user: pesan error ada di stderr, sedangkan baris
#  terakhir stdout adalah ROLLBACK.)
denied() {
  local uid="$1"; shift
  local out
  out=$($PSQL -c "begin;
    set local role authenticated;
    select set_config('request.jwt.claim.sub', '$uid', true);
    select set_config('request.jwt.claim.role', 'authenticated', true);
    $1
    rollback;" 2>&1)
  case "$out" in
    *"Akses ditolak"*) echo "denied" ;;
    *) echo "ALLOWED: $(echo "$out" | grep -v '^$' | tail -1)" ;;
  esac
}

# rejected <uuid> <sql> -> "denied" bila query gagal karena alasan APAPUN
# (dipakai untuk uji RLS, yang pesannya bukan 'Akses ditolak').
rejected() {
  local uid="$1"; shift
  local out
  out=$($PSQL -c "begin;
    set local role authenticated;
    select set_config('request.jwt.claim.sub', '$uid', true);
    select set_config('request.jwt.claim.role', 'authenticated', true);
    $1
    rollback;" 2>&1)
  case "$out" in
    *"ERROR:"*) echo "denied" ;;
    *) echo "ALLOWED: $(echo "$out" | grep -v '^$' | tail -1)" ;;
  esac
}

echo "== 1. trigger on_auth_user_created"
OWNER=$($PSQL -c "insert into auth.users (id, email) values (gen_random_uuid(), 'owner@test') returning id")
check "owner punya store" "1" "$($PSQL -c "select count(*) from public.stores where owner_id = '$OWNER'")"
check "owner jadi member role owner" "owner" "$($PSQL -c "select role from public.store_members where user_id = '$OWNER'")"
check "COA default ter-seed (18 akun)" "18" "$($PSQL -c "select count(*) from public.chart_of_accounts where store_id = (select id from public.stores where owner_id='$OWNER')")"
check "COA punya 2-2100 Hutang Gaji" "1" "$($PSQL -c "select count(*) from public.chart_of_accounts where store_id = (select id from public.stores where owner_id='$OWNER') and code='2-2100' and name='Hutang Gaji'")"
check "COA punya 3-3200 Laba Direalisasi" "1" "$($PSQL -c "select count(*) from public.chart_of_accounts where store_id = (select id from public.stores where owner_id='$OWNER') and code='3-3200'")"
check "COA 3-3100 bernama Laba Piutang" "Laba Piutang" "$($PSQL -c "select name from public.chart_of_accounts where store_id = (select id from public.stores where owner_id='$OWNER') and code='3-3100'")"

STORE=$($PSQL -c "select id from public.stores where owner_id = '$OWNER'")
echo "   store=$STORE"

echo "== 2. user kedua (kasir) di toko yang sama"
KASIR=$($PSQL -c "insert into auth.users (id, email) values (gen_random_uuid(), 'kasir@test') returning id")
$PSQL -c "insert into public.store_members (store_id, user_id, role) values ('$STORE', '$KASIR', 'kasir')" >/dev/null
# kasir ini juga otomatis dapat toko sendiri dari trigger; nonaktifkan supaya current_store_id() = toko owner
$PSQL -c "update public.store_members set is_active = false
          where user_id = '$KASIR' and store_id <> '$STORE'" >/dev/null

echo "== 3. user ketiga (kasir) di toko LAIN"
OTHER=$($PSQL -c "insert into auth.users (id, email) values (gen_random_uuid(), 'other@test') returning id")
OTHER_STORE=$($PSQL -c "select id from public.stores where owner_id = '$OTHER'")

echo "== 4. data uji"
$PSQL -c "insert into public.products (store_id, name, price_buy, price_sell, stock)
          values ('$STORE', 'Produk Toko A', 1000, 2000, 10),
                 ('$OTHER_STORE', 'Produk Toko B', 5000, 9000, 5)" >/dev/null
$PSQL -c "insert into public.customers (store_id, name) values ('$STORE', 'Pelanggan A')" >/dev/null

echo "== 5. isolasi tenant (S2: policy 'true' sudah hilang)"
check "owner hanya lihat 1 produk" "1" "$(as_user "$OWNER" "select count(*) from public.products;")"
check "kasir hanya lihat 1 produk" "1" "$(as_user "$KASIR" "select count(*) from public.products;")"
check "user toko B hanya lihat produknya" "1" "$(as_user "$OTHER" "select count(*) from public.products;")"
check "kasir TIDAK bisa update produk toko B" "0" \
  "$(as_user "$KASIR" "with u as (update public.products set name='hacked' where name='Produk Toko B' returning 1) select count(*) from u;")"
check "kasir TIDAK bisa delete produk toko B" "0" \
  "$(as_user "$KASIR" "with d as (delete from public.products where name='Produk Toko B' returning 1) select count(*) from d;")"
check "produk toko B utuh" "Produk Toko B" "$($PSQL -c "select name from public.products where store_id='$OTHER_STORE'")"

echo "== 6. gerbang permission"
check "kasir bisa insert transaksi (transaction.write)" "1" \
  "$(as_user "$KASIR" "with i as (insert into public.transactions (store_id, total) values ('$STORE', 100) returning 1) select count(*) from i;")"
check "kasir TIDAK bisa baca journal_entries (finance.read)" "0" \
  "$(as_user "$KASIR" "select count(*) from public.journal_entries;")"
check "owner bisa baca journal_entries" "0" \
  "$(as_user "$OWNER" "select count(*) from public.journal_entries;")"
check "kasir TIDAK bisa insert jurnal (RLS menolak)" "denied" \
  "$(rejected "$KASIR" "with i as (insert into public.journal_entries (store_id, description) values ('$STORE','x') returning 1) select count(*) from i;")"
check "kasir TIDAK bisa lihat employees (hr.read)" "0" \
  "$(as_user "$KASIR" "select count(*) from public.employees;")"
check "kasir TIDAK bisa ubah stores (settings.write)" "0" \
  "$(as_user "$KASIR" "with u as (update public.stores set name='hacked' returning 1) select count(*) from u;")"
check "owner bisa ubah stores" "1" \
  "$(as_user "$OWNER" "with u as (update public.stores set subtitle='sub' where id='$STORE' returning 1) select count(*) from u;")"

echo "== 7. helper functions"
check "has_permission kasir transaction.write" "t" "$(as_user "$KASIR" "select public.has_permission('transaction.write');")"
check "has_permission kasir finance.write" "f" "$(as_user "$KASIR" "select public.has_permission('finance.write');")"
check "current_store_id kasir" "$STORE" "$(as_user "$KASIR" "select public.current_store_id();")"
check "current_store_role kasir" "kasir" "$(as_user "$KASIR" "select public.current_store_role();")"

echo "== 8. RPC write: guard permission + jalur normal"
PROD_A=$($PSQL -c "select id from public.products where store_id='$STORE' and name='Produk Toko A'")
check "kasir bisa create_transaction (transaction.write)" "ok" \
  "$(as_user "$KASIR" "select case when public.create_transaction(null, 'Eceran', 'tunai', 2000, 0, null,
      '[{\"product_id\":\"$PROD_A\",\"quantity\":1,\"price\":2000}]'::jsonb) is not null then 'ok' end;")"
# (as_user selalu rollback, jadi transaksi uji di atas tidak meninggalkan data.)
check "kasir DITOLAK void_transaction (transaction.void)" "denied" \
  "$(denied "$KASIR" "select public.void_transaction(gen_random_uuid());")"
check "kasir DITOLAK delete_transaction (transaction.void)" "denied" \
  "$(denied "$KASIR" "select public.delete_transaction(gen_random_uuid());")"
check "kasir DITOLAK post_journal (finance.write)" "denied" \
  "$(denied "$KASIR" "select public.post_journal(current_date, 'x', '[]'::jsonb);")"
check "kasir DITOLAK create_stock_adjustment (stock.write)" "denied" \
  "$(denied "$KASIR" "select public.create_stock_adjustment(gen_random_uuid(),'add',0,1,1,'x');")"
check "kasir DITOLAK generate_payroll_for_employee (hr.write)" "denied" \
  "$(denied "$KASIR" "select public.generate_payroll_for_employee(gen_random_uuid(), current_date, current_date);")"
check "kasir DITOLAK create_purchase_order (purchasing.write)" "denied" \
  "$(denied "$KASIR" "select public.create_purchase_order(null, null, now(), null, null, '[]'::jsonb);")"
check "kasir DITOLAK close_period (finance.write)" "denied" \
  "$(denied "$KASIR" "select public.close_period(current_date - 30, current_date);")"
check "kasir DITOLAK get_profit_summary (report.sales.read)" "denied" \
  "$(denied "$KASIR" "select * from public.get_profit_summary('$STORE');")"
# Guard tidak boleh menolak role yang berhak: owner punya semua permission,
# jadi RPC-nya harus sampai ke validasi bisnis (bukan 'Akses ditolak').
OWNER_PAYROLL=$(denied "$OWNER" "select public.generate_payroll_for_employee(gen_random_uuid(), current_date, current_date);")
case "$OWNER_PAYROLL" in
  denied) printf '  FAIL owner ditolak padahal punya hr.write\n'; fail=1 ;;
  *) printf '  ok   owner lolos guard hr.write (gagal di validasi bisnis, wajar)\n' ;;
esac
check "kasir bisa baca check_period_closed (tanpa guard)" "f" \
  "$(as_user "$KASIR" "select public.check_period_closed(current_date, '$STORE');")"

echo "== 9. masking HPP via v_products"
check "kasir: price_buy NULL (tanpa hpp.read)" "NULL" \
  "$(as_user "$KASIR" "select coalesce(price_buy::text, 'NULL') from public.v_products where name='Produk Toko A';")"
check "kasir: price_modal NULL (tanpa hpp.read)" "NULL" \
  "$(as_user "$KASIR" "select coalesce(price_modal::text, 'NULL') from public.v_products where name='Produk Toko A';")"
check "owner: price_buy terlihat (hpp.read)" "1000.00" \
  "$(as_user "$OWNER" "select price_buy::text from public.v_products where name='Produk Toko A';")"
check "kasir: v_products hanya tokonya (1 baris)" "1" \
  "$(as_user "$KASIR" "select count(*) from public.v_products;")"

echo "== 10. fix S1: view transaction_items_payment_summary tunduk RLS"
$PSQL -c "insert into public.transactions (id, store_id, total) values
            (gen_random_uuid(), '$STORE', 100), (gen_random_uuid(), '$OTHER_STORE', 100)" >/dev/null
$PSQL -c "insert into public.transaction_items (store_id, transaction_id, product_id, product_name, price, quantity, subtotal)
          select store_id, id, null, 'Item uji', 100, 1, 100 from public.transactions
          where store_id in ('$STORE','$OTHER_STORE') and total = 100" >/dev/null
check "kasir: view tidak bocorkan item toko B" "0" \
  "$(as_user "$KASIR" "select count(*) from public.transaction_items_payment_summary where store_id='$OTHER_STORE';")"
check "user toko B: view lihat itemnya sendiri" "1" \
  "$(as_user "$OTHER" "select count(*) from public.transaction_items_payment_summary where store_id='$OTHER_STORE';")"

echo "== 10b. 3E: kebocoran HPP lewat tabel dasar ditutup"
check "kasir: baca price_buy dari tabel products DITOLAK" "denied" \
  "$(rejected "$KASIR" "select price_buy from public.products limit 1;")"
check "kasir: baca price_modal dari tabel products DITOLAK" "denied" \
  "$(rejected "$KASIR" "select price_modal from public.products limit 1;")"
check "kasir: select * dari tabel products DITOLAK" "denied" \
  "$(rejected "$KASIR" "select * from public.products limit 1;")"
check "kasir: kolom biasa tetap boleh" "1" \
  "$(as_user "$KASIR" "select count(*) from (select id, name, price_sell, stock from public.products) s;")"
check "owner: update stock tanpa returning berhasil" "1" \
  "$(as_user "$OWNER" "with u as (update public.products set stock = stock where name='Produk Toko A' returning 1) select count(*) from u;")"
check "kasir: update stock tidak mengenai baris (RLS product.write)" "0" \
  "$(as_user "$KASIR" "with u as (update public.products set stock = stock where name='Produk Toko A' returning 1) select count(*) from u;")"
check "kasir: update ... returning price_buy DITOLAK" "denied" \
  "$(rejected "$KASIR" "update public.products set stock = stock where name='Produk Toko A' returning price_buy;")"
check "owner: price_buy dari v_products = 1000" "1000.00" \
  "$(as_user "$OWNER" "select price_buy::text from public.v_products where name='Produk Toko A';")"
check "kasir: price_buy dari v_products tetap NULL" "NULL" \
  "$(as_user "$KASIR" "select coalesce(price_buy::text,'NULL') from public.v_products where name='Produk Toko A';")"

echo "== 10b2. 3E: view masking tidak boleh jadi jalur TULIS"
# Regresi temuan live: `alter default privileges in schema public grant all on
# tables to authenticated` (bawaan Supabase) membuat view masking dimiliki
# postgres/bypassrls bisa di-UPDATE oleh role mana pun. Harness PG polos tidak
# punya default ACL itu, jadi uji ini eksplisit memeriksa ACL view.
check "kasir: update lewat v_products DITOLAK" "denied" \
  "$(rejected "$KASIR" "update public.v_products set price_sell = 1 where name='Produk Toko A';")"
check "kasir: update lewat v_return_items DITOLAK" "denied" \
  "$(rejected "$KASIR" "update public.v_return_items set price = 1;")"
check "authenticated: v_products hanya SELECT" "r" \
  "$($PSQL -c "select string_agg(distinct substring(a::text from 'authenticated=([^/]*)'), '') from (select unnest(relacl) a from pg_class where oid='public.v_products'::regclass) s where a::text like 'authenticated=%';")"
check "anon: v_products tanpa hak" "0" \
  "$($PSQL -c "select count(*) from (select unnest(relacl) a from pg_class where oid='public.v_products'::regclass) s where a::text like 'anon=%';")"

echo "== 10c. 3E: masking return_items & purchase_return_items"
$PSQL -c "insert into public.returns (id, store_id, transaction_id, total_refund)
          select gen_random_uuid(), store_id, id, 100 from public.transactions
          where store_id = '$STORE' and total = 100 limit 1" >/dev/null
$PSQL -c "insert into public.return_items (store_id, return_id, product_id, product_name, price, price_buy, quantity, subtotal)
          select r.store_id, r.id, null, 'Item retur', 100, 700, 1, 100
          from public.returns r where r.store_id='$STORE'" >/dev/null
check "kasir: price_buy return_items langsung DITOLAK" "denied" \
  "$(rejected "$KASIR" "select price_buy from public.return_items limit 1;")"
check "kasir: v_return_items price_buy NULL" "NULL" \
  "$(as_user "$KASIR" "select coalesce(price_buy::text,'NULL') from public.v_return_items limit 1;")"
check "owner: v_return_items price_buy = 700" "700.00" \
  "$(as_user "$OWNER" "select price_buy::text from public.v_return_items limit 1;")"
check "kasir: price_buy purchase_return_items langsung DITOLAK" "denied" \
  "$(rejected "$KASIR" "select price_buy from public.purchase_return_items limit 1;")"

echo "== 10d. 3E: RPC create_product (jurnal stok awal atomik)"
GUDANG=$($PSQL -c "insert into auth.users (id, email) values (gen_random_uuid(), 'gudang@test') returning id")
$PSQL -c "insert into public.store_members (store_id, user_id, role) values ('$STORE', '$GUDANG', 'gudang')" >/dev/null
$PSQL -c "update public.store_members set is_active = false where user_id = '$GUDANG' and store_id <> '$STORE'" >/dev/null
check "gudang: product.write=t stock.write=t finance.write=f hpp.read=f" "true|true|false|false" \
  "$(as_user "$GUDANG" "select public.has_permission('product.write')||'|'||public.has_permission('stock.write')||'|'||public.has_permission('finance.write')||'|'||public.has_permission('hpp.read');")"
NEW_PROD=$(as_user_commit "$GUDANG" "select public.create_product('Produk Gudang', 5000, 3000, 10, 'GDG-1');")
case "$NEW_PROD" in
  *"Akses ditolak"*|"") printf '  FAIL gudang gagal create_product: %s\n' "$NEW_PROD"; fail=1 ;;
  *) printf '  ok   gudang bisa create_product\n' ;;
esac
check "gudang: produk baru stok 10" "10" \
  "$(as_user "$GUDANG" "select stock from public.v_products where sku='GDG-1';")"
check "gudang: price_buy produk baru NULL (tanpa hpp.read)" "NULL" \
  "$(as_user "$GUDANG" "select coalesce(price_buy::text,'NULL') from public.v_products where sku='GDG-1';")"
check "kasir: DITOLAK create_product" "denied" \
  "$(denied "$KASIR" "select public.create_product('Produk Kasir', 1000, 500, 1, 'KSR-1');")"

echo "== 11. anon ditolak"
# `|| true`: penolakan anon MEMBUAT psql keluar non-zero (ON_ERROR_STOP), dan
# dengan `set -e` itu akan mematikan skrip — padahal penolakan itulah hasil
# yang diharapkan.
ANON=$($PSQL -c "begin; set local role anon; select count(*) from public.products; rollback;" 2>&1 || true)
echo "   anon -> $(printf '%s\n' "$ANON" | grep -v '^$' | head -1)"
# Pesan bisa "permission denied for table ..." (harness) atau hanya
# "HINT: Grant the required privileges ..." (stack lokal, detail disembunyikan
# oleh psql) — jadi periksa SELURUH output, bukan baris terakhir saja.
case "$ANON" in
  *"permission denied"*|*"ERROR:"*|*"must be owner"*) printf '  ok   anon ditolak\n' ;;
  *) printf '  FAIL anon tidak ditolak\n'; fail=1 ;;
esac

echo "== 12. cabut akses langsung berlaku"
# Scope ke toko uji: trigger juga membuatkan toko pribadi untuk kasir (role
# owner) yang sudah dinonaktifkan di grup 2. Mengaktifkannya lagi akan
# mengubah `current_store_id()` kasir — bukan yang ingin diuji di sini.
$PSQL -c "update public.store_members set is_active = false
          where user_id='$KASIR' and store_id='$STORE'" >/dev/null
check "setelah dinonaktifkan, kasir lihat 0 produk" "0" "$(as_user "$KASIR" "select count(*) from public.products;")"
check "setelah dinonaktifkan, has_permission false" "f" "$(as_user "$KASIR" "select public.has_permission('transaction.write');")"
$PSQL -c "update public.store_members set is_active = true
          where user_id='$KASIR' and store_id='$STORE'" >/dev/null
check "kasir aktif kembali di toko uji" "$STORE" "$(as_user "$KASIR" "select public.current_store_id();")"

echo "== 13. cascade hapus toko"
$PSQL -c "delete from public.stores where id='$OTHER_STORE'" >/dev/null
check "produk toko terhapus ikut cascade" "0" "$($PSQL -c "select count(*) from public.products where store_id='$OTHER_STORE'")"

# ============================================================================
# 14. Fase 3F — undangan karyawan (store_invites)
#
# Yang dibuktikan:
#   * token palsu ditolak; token dipakai 2x ditolak; email harus cocok
#   * role SELALU dari baris undangan, metadata klien diabaikan (anti-eskalasi)
#   * karyawan yang diundang TIDAK mendapat toko sendiri
#   * hanya user.manage yang bisa membuat/mencabut undangan & mengubah anggota
#   * anggota tidak bisa membaca tabel store_invites langsung
# ============================================================================
echo "== 14. undangan karyawan (3F)"

# Undangan sah dibuat owner (guard user.manage).
INVITE_LINE=$(as_user_commit "$OWNER" "select token from public.create_invite('gudang', null, 7);")
INVITE_TOKEN=$(printf '%s\n' "$INVITE_LINE" | cut -d'|' -f1)
case "$INVITE_TOKEN" in
  [0-9a-f][0-9a-f]*) check "owner bisa create_invite (token 64 hex)" "64" "${#INVITE_TOKEN}" ;;
  *) check "owner bisa create_invite (token 64 hex)" "token" "gagal: $INVITE_LINE" ;;
esac

check "kasir DITOLAK create_invite (user.manage)" "denied" \
  "$(denied "$KASIR" "select public.create_invite('kasir', null, 7);")"
check "kasir DITOLAK list_store_members (user.manage)" "denied" \
  "$(denied "$KASIR" "select * from public.list_store_members();")"
check "kasir DITOLAK update_store_member (user.manage)" "denied" \
  "$(denied "$KASIR" "select public.update_store_member(gen_random_uuid(), 'admin', null);")"

# Token palsu -> insert auth.users gagal, tidak ada user/member baru.
BEFORE_MEMBERS=$($PSQL -c "select count(*) from public.store_members")
FAKE_OUT=$($PSQL -c "insert into auth.users (id, email, raw_user_meta_data)
  values (gen_random_uuid(), 'fake@test', '{\"invite_token\":\"deadbeef\"}'::jsonb)" 2>&1 || true)
case "$FAKE_OUT" in
  *"Undangan tidak valid"*) printf '  ok   token palsu ditolak\n' ;;
  *) printf '  FAIL token palsu tidak ditolak: %s\n' "$FAKE_OUT"; fail=1 ;;
esac
check "token palsu tidak menambah anggota" "$BEFORE_MEMBERS" \
  "$($PSQL -c "select count(*) from public.store_members")"

# Undangan sah: jadi anggota role gudang, TIDAK punya toko sendiri.
INVITED=$($PSQL -c "insert into auth.users (id, email, raw_user_meta_data)
  values (gen_random_uuid(), 'undangan@test', '{\"invite_token\":\"$INVITE_TOKEN\"}'::jsonb) returning id")
check "undangan sah -> anggota toko pengundang" "$STORE" \
  "$($PSQL -c "select store_id from public.store_members where user_id='$INVITED'")"
check "undangan sah -> role dari undangan (gudang)" "gudang" \
  "$($PSQL -c "select role from public.store_members where user_id='$INVITED'")"
check "undangan sah -> TIDAK punya toko sendiri" "0" \
  "$($PSQL -c "select count(*) from public.stores where owner_id='$INVITED'")"
check "undangan sah -> token ditandai terpakai" "1" \
  "$($PSQL -c "select count(*) from public.store_invites where token='$INVITE_TOKEN' and used_at is not null")"

# Token dipakai 2x -> ditolak.
REUSE_OUT=$($PSQL -c "insert into auth.users (id, email, raw_user_meta_data)
  values (gen_random_uuid(), 'reuse@test', '{\"invite_token\":\"$INVITE_TOKEN\"}'::jsonb)" 2>&1 || true)
case "$REUSE_OUT" in
  *"Undangan tidak valid"*) printf '  ok   token dipakai 2x ditolak\n' ;;
  *) printf '  FAIL token bisa dipakai 2x: %s\n' "$REUSE_OUT"; fail=1 ;;
esac

# Anti-eskalasi: metadata role=owner diabaikan; role tetap dari undangan.
KASIR_INVITE=$(as_user_commit "$OWNER" "select token from public.create_invite('kasir', null, 7);" | cut -d'|' -f1)
ESCALATE=$($PSQL -c "insert into auth.users (id, email, raw_user_meta_data)
  values (gen_random_uuid(), 'escalate@test',
          jsonb_build_object('invite_token', '$KASIR_INVITE', 'role', 'owner', 'employee_of', '$STORE'))
  returning id")
check "role dari metadata diabaikan (tetap kasir)" "kasir" \
  "$($PSQL -c "select role from public.store_members where user_id='$ESCALATE'")"
check "eskalasi tidak menjadikan owner toko" "0" \
  "$($PSQL -c "select count(*) from public.stores where owner_id='$ESCALATE'")"
check "eskalasi tidak menambah owner kedua" "1" \
  "$($PSQL -c "select count(*) from public.store_members where store_id='$STORE' and role='owner'")"

# Undangan terikat email: hanya email itu yang bisa memakainya.
EMAIL_INVITE=$(as_user_commit "$OWNER" "select token from public.create_invite('keuangan', 'budi@test', 7);" | cut -d'|' -f1)
WRONG_EMAIL=$($PSQL -c "insert into auth.users (id, email, raw_user_meta_data)
  values (gen_random_uuid(), 'salah@test', '{\"invite_token\":\"$EMAIL_INVITE\"}'::jsonb)" 2>&1 || true)
case "$WRONG_EMAIL" in
  *"Undangan tidak valid untuk email ini"*) printf '  ok   email tidak cocok ditolak\n' ;;
  *) printf '  FAIL email tidak cocok lolos: %s\n' "$WRONG_EMAIL"; fail=1 ;;
esac
RIGHT_EMAIL=$($PSQL -c "insert into auth.users (id, email, raw_user_meta_data)
  values (gen_random_uuid(), 'budi@test', '{\"invite_token\":\"$EMAIL_INVITE\"}'::jsonb) returning id")
check "email cocok -> anggota role keuangan" "keuangan" \
  "$($PSQL -c "select role from public.store_members where user_id='$RIGHT_EMAIL'")"

# Anggota tidak boleh membaca tabel store_invites langsung.
check "anggota TIDAK bisa baca store_invites langsung" "denied" \
  "$(rejected "$INVITED" "select token from public.store_invites;")"

# Daftar undangan aktif hanya milik toko sendiri, dan tidak memuat yang terpakai.
check "list_store_invites tidak memuat token terpakai" "0" \
  "$(as_user "$OWNER" "select count(*) from public.list_store_invites() where token='$INVITE_TOKEN';")"

# revoke_invite: hanya undangan pending toko sendiri.
PENDING=$(as_user_commit "$OWNER" "select token from public.create_invite('admin', null, 7);" | cut -d'|' -f1)
check "revoke_invite mengembalikan true" "t" \
  "$(as_user_commit "$OWNER" "select public.revoke_invite('$PENDING');")"
check "setelah dicabut, token tidak berlaku" "0" \
  "$($PSQL -c "select count(*) from public.store_invites where token='$PENDING'")"

# update_store_member: owner boleh ubah role anggota; tidak boleh menyentuh owner.
INVITED_MEMBER=$($PSQL -c "select id from public.store_members where user_id='$INVITED'")
OWNER_MEMBER=$($PSQL -c "select id from public.store_members where user_id='$OWNER'")
as_user_commit "$OWNER" "select public.update_store_member('$INVITED_MEMBER', 'admin', null);" >/dev/null
check "owner bisa ubah role anggota -> admin" "admin" \
  "$($PSQL -c "select role from public.store_members where user_id='$INVITED'")"
check "role owner tidak bisa diberikan" "denied" \
  "$(rejected "$OWNER" "select public.update_store_member('$INVITED_MEMBER', 'owner', null);")"
check "anggota owner tidak bisa diubah" "denied" \
  "$(rejected "$OWNER" "select public.update_store_member('$OWNER_MEMBER', 'admin', null);")"
as_user_commit "$OWNER" "select public.update_store_member('$INVITED_MEMBER', null, false);" >/dev/null
check "owner bisa nonaktifkan anggota" "f" \
  "$($PSQL -c "select is_active from public.store_members where user_id='$INVITED'")"
as_user_commit "$OWNER" "select public.update_store_member('$INVITED_MEMBER', null, true);" >/dev/null

echo
if [ "$fail" = 0 ]; then echo "SEMUA TES LULUS"; else echo "ADA TES GAGAL"; exit 1; fi
