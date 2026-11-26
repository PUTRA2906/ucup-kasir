# Rencana: Role-Based Access Control (RBAC) + Rebaseline Skema

Status: **Fase 0–2 selesai & live; Fase 3A–3F selesai, terverifikasi, dan sudah diterapkan ke live** · Tanggal: 2026-11-26

## 1. Keputusan yang sudah disepakati

| Aspek | Keputusan |
|---|---|
| Strategi | **Greenfield in-place** — drop & recreate database di project Supabase yang sama |
| Migrasi | **Squash** 74 file migrasi → 1 baseline bersih |
| Toko | 1 pemilik = 1 toko (skema tetap mendukung multi-store) |
| Role | `owner`, `admin`, `kasir`, `gudang`, `keuangan` |
| Akun karyawan | Dibuat lewat **Edge Function** dengan `service_role` + **undangan token** (`store_invites`) — lihat §6.5 |
| HPP & laba | **Disembunyikan** dari kasir (`hpp.read`); input HPP oleh `gudang` lewat RPC server-side — lihat §6.4 |
| Masking HPP | View dimiliki `postgres` + filter tenant eksplisit + cabut hak kolom `price_buy`/`price_modal` — lihat §6.1 |

## 2. Hasil audit database live

Dilakukan 2026-11-26 terhadap project `xkfvukkpjrjqqqroujqs`.

### 2.1 Lubang keamanan yang ditemukan (saat audit; S1 & S2 sudah diperbaiki)

| # | Temuan | Dampak |
|---|---|---|
| S1 | View `transaction_items_payment_summary` tidak memakai `security_invoker` → berjalan sebagai owner, **melewati RLS** | User mana pun bisa membaca item transaksi & pembayaran **semua toko** |
| S2 | Policy `"Enable insert/update/delete access for all users"` dengan ekspresi `true` pada `products` dan `categories` | Policy permissive digabung dengan OR → policy `*_own` kalah. User mana pun bisa mengubah/menghapus produk toko lain |
| S3 | 54 dari 71 fungsi adalah `SECURITY DEFINER` dan 33 di antaranya memakai `auth.uid()` | RLS tidak berlaku di dalam fungsi; tanpa cek permission eksplisit, RPC bisa dipanggil lintas role |

Keduanya (S1, S2) **hilang otomatis** saat greenfield rebuild karena baseline ditulis ulang — terverifikasi di uji grup 5 & 10 setelah migrasi live.

**Sisa yang dulu terbuka (kini sudah ditutup):** `authenticated` sempat punya `SELECT` penuh pada `public.products`, sehingga kasir bisa membaca `price_buy` lewat tabel dasar. **Ditutup di Fase 3E** (`0004_hpp_masking.sql`): hak kolom `price_buy`/`price_modal` dicabut dan akses lewat view masking. Terverifikasi di live & harness (uji grup 10b–10d). Lihat §6.1.

### 2.2 Drift migrasi — bukti skema tidak reproducible

| Fungsi ada di **live**, tidak ada di file migrasi | Fungsi ada di **file**, tidak ada di live |
|---|---|
| `create_transaction_notification` | `generate_payroll` |
| `create_payment_notification` | `get_realised_profit_for_period` |
| `create_return_notification` | `reclassify_retained_earnings` |
| `create_stock_opname` | `set_notification_read_at` |
| `init_default_coa_for_current_user` | `trigger_reclassify_on_payment` |
| `revert_loan_payments_on_payroll_delete` | |
| `update_updated_at_column` | |

**Konsekuensi:** baseline WAJIB diambil dari database live (introspect / `supabase db pull`), **bukan** dengan menggabungkan 74 file migrasi.

### 2.3 Skala

| Metrik | Nilai |
|---|---|
| Tabel | 49, semua RLS aktif |
| Policy | 183 (4 gaya penamaan berbeda, ada duplikat) |
| Fungsi | 71 (54 `SECURITY DEFINER`) |
| Fungsi memakai `auth.uid()` | 33 |
| Tabel dengan `user_id` | 49 / 49 |
| Tabel dengan `created_by` | 5 |
| Akun auth | 16 (data testing) |
| View | 1 (`transaction_items_payment_summary`, tanpa `security_invoker`) |

### 2.4 Cutover live — sudah dilakukan (greenfield)

Database live `xkfvukkpjrjqqqroujqs` **sudah di-reset** dengan strategi greenfield in-place. Ini bukan rencana lagi, sudah dieksekusi:

| Langkah | Hasil |
|---|---|
| `drop schema public cascade` + recreate `public` + grant/default-privilege manual | selesai (perlu manual karena `pg_database_owner` tidak punya anggota di project ini) |
| `0001_baseline` + `0002_rbac` + `0003_functions` ditempel lewat SQL Editor (bundle `docs/rbac/migrate_live.sql`, 419.741 byte) | selesai, exit 0 |
| `supabase_migrations.schema_migrations` dicatat manual (`docs/rbac/mark_migrations_applied.sql`) | `0001`–`0007` tercatat |
| Verifikasi objek (setelah 3E + 3F) | **51 tabel, 4 view, 79 fungsi, 34 trigger, 98 policy** (1 policy `true` = `role_permissions`, 4 policy storage), 50 RLS aktif |
| `npm run db:test-rbac:local` terhadap stack lokal yang disiapkan identik | 14/14 grup lulus |
| 16 akun `auth.users` lama dihapus | **0 user, 0 store, 0 member** — database benar-benar kosong |
| Simulasi signup pasca-hapus (insert + rollback) | 1 toko + 1 membership `owner` + **18 akun COA** terbuat otomatis |
| **3F diterapkan** (`apply_migration` 0005 + 0006 + 0007, `deploy_edge_function` `admin-create-user`) | live: `test@test.id` owner "Ucup Kasir", 18 COA, 1 anggota; uji Edge Function end-to-end lulus; data uji dibersihkan |

**Yang perlu diketahui untuk Fase 3:**

1. ~~Database live kosong; akun pertama harus dibuat lewat `/signup`~~ → **sudah usang**: `/signup` ditutup, pemilik pertama dibuat lewat Dashboard, dan akun karyawan dibuat lewat `Settings/Users` (undangan token + Edge Function) — lihat §6.5.
2. **Satu file avatar yatim** tersisa di `storage.objects` (`avatars/fac55289-.../1791546464323.jpg`) milik akun yang dihapus. Tidak berbahaya, tidak terlihat user mana pun; objek storage tidak ikut ter-cascade FK. Bisa dibersihkan kapan saja.
3. **Bundle `migrate_live.sql` idempoten terhadap `storage`** (4 `drop policy if exists avatars_*` ditambahkan di `0001`), karena `drop schema public cascade` **tidak** menghapus schema `storage` — sudah dibuktikan dengan mensimulasikan kondisi live di stack lokal sebelum menempel.

## 3. Skema target

### 3.1 Tenancy

```sql
create table stores (
  id uuid primary key default gen_random_uuid(),   -- UUID baru, TIDAK diikat ke auth.users
  owner_id uuid references auth.users(id),
  name text not null,
  address text, phone text, email text,
  tax_enabled boolean default false,
  tax_rate numeric(5,2) default 0,
  currency text default 'IDR',
  receipt_footer text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table store_members (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','admin','kasir','gudang','keuangan')),
  is_active boolean not null default true,
  created_at timestamptz default now(),
  unique (store_id, user_id)
);
create index store_members_user_active on store_members (user_id) where is_active;
create unique index one_owner_per_store on store_members (store_id) where role = 'owner';

create table role_permissions (
  role text not null,
  permission text not null,
  primary key (role, permission)
);
```

Catatan: `store_settings` dilebur ke `stores` (1:1 dengan toko).

### 3.2 Helper functions

```sql
create or replace function current_store_id() returns uuid
language sql stable security definer set search_path = public as $$
  select store_id from store_members
  where user_id = auth.uid() and is_active
  limit 1
$$;

create or replace function has_permission(p text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from store_members m
    join role_permissions rp on rp.role = m.role
    where m.user_id = auth.uid() and m.is_active and rp.permission = p
  )
$$;
```

Alasan lookup DB (bukan JWT `app_metadata`): role di JWT basi sampai token di-refresh. Untuk toko, pencabutan akses harus langsung berlaku.

### 3.3 Pola seragam setiap tabel bisnis

```sql
create table products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  created_by uuid default auth.uid(),
  -- ...kolom bisnis...
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index products_store_idx on products (store_id);

alter table products enable row level security;

create policy products_tenant on products for all
  using (store_id = current_store_id())
  with check (store_id = current_store_id());
```

Tabel sensitif menambah gerbang permission:

```sql
create policy journal_entries_guarded on journal_entries for all
  using (store_id = current_store_id() and has_permission('finance.write'))
  with check (store_id = current_store_id() and has_permission('finance.write'));
```

### 3.4 Konvensi penamaan (mencegah masalah terulang)

| Kolom | Arti | Ada di |
|---|---|---|
| `store_id` | Tenant. **Wajib** di setiap tabel bisnis | Semua tabel bisnis |
| `user_id` | Orang | `store_members`, `notifications` |
| `created_by` | Audit: siapa yang input | Tabel transaksional |

Aturan: **`user_id` selalu berarti orang, `store_id` selalu berarti toko.**

## 4. Matriks permission

| Permission | owner | admin | kasir | gudang | keuangan |
|---|:-:|:-:|:-:|:-:|:-:|
| `dashboard.read` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `product.read` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `product.write` | ✅ | ✅ | ❌ | ✅ | ❌ |
| `stock.read` | ✅ | ✅ | ❌ | ✅ | ❌ |
| `stock.write` | ✅ | ✅ | ❌ | ✅ | ❌ |
| `transaction.read` | ✅ | ✅ | ✅ | ❌ | ✅ |
| `transaction.write` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `transaction.void` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `customer.read` | ✅ | ✅ | ✅ | ❌ | ✅ |
| `customer.write` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `invoice.payment.write` | ✅ | ✅ | ✅ | ❌ | ✅ |
| `price.read` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `price.write` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `report.sales.read` | ✅ | ✅ | ❌ | ❌ | ✅ |
| `hpp.read` | ✅ | ✅ | ❌ | ❌ | ✅ |
| `finance.read` | ✅ | ✅ | ❌ | ❌ | ✅ |
| `finance.write` | ✅ | ✅ | ❌ | ❌ | ✅ |
| `purchasing.read` | ✅ | ✅ | ❌ | ✅ | ✅ |
| `purchasing.write` | ✅ | ✅ | ❌ | ✅ | ❌ |
| `hr.read` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `hr.write` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `shipping.read` | ✅ | ✅ | ✅ | ✅ | ❌ |
| `shipping.write` | ✅ | ✅ | ❌ | ✅ | ❌ |
| `settings.read` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `settings.write` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `user.manage` | ✅ | ❌ | ❌ | ❌ | ❌ |

Seed `role_permissions` dibuat dari matriks di atas.

## 5. Aturan konversi fungsi SQL

Untuk 33 fungsi yang memakai `auth.uid()`:

1. Ganti `auth.uid()` → `current_store_id()` untuk kolom `user_id`/`store_id`.
2. Tambah `created_by = auth.uid()` pada insert tabel transaksional.
3. Untuk fungsi **write**, tambah guard di awal:

```sql
if not has_permission('<permission>') then
  raise exception 'Akses ditolak' using errcode = '42501';
end if;
```

Pemetaan permission per RPC:

| Fungsi | Permission |
|---|---|
| `create_transaction`, `add_transaction_payment`, `delete_transaction_payment`, `allocate_payment_to_items`, `reallocate_payment`, `deallocate_payment` | `transaction.write` |
| `void_transaction`, `delete_transaction` | `transaction.void` |
| `create_return`, `delete_return` | `transaction.write` |
| `create_stock_adjustment`, `create_stock_opname`, `record_stock_movement` | `stock.write` |
| `post_journal`, `post_adjusting_journal`, `void_journal`, `close_period`, `reopen_period`, `delete_closing_period` | `finance.write` |
| `create_purchase_order`, `create_goods_receipt`, `create_purchase_invoice`, `add_pi_payment`, `create_purchase_return` | `purchasing.write` |
| `generate_payroll_for_employee`, `delete_payroll`, `post_payroll_journal` | `hr.write` |
| `generate_delivery_number`, `generate_trip_number` | `shipping.write` |

## 6. Masking HPP

RLS tidak bisa menyembunyikan kolom. Solusi: view dengan masking `CASE`. **Namun view saja tidak menutup kebocoran** — user masih bisa `select price_buy from products` lewat tabel dasar. Penutupnya adalah **mencabut hak kolom** `price_buy`/`price_modal` dari `authenticated`.

### 6.1 Hasil uji desain (stack lokal, 2026-11-26)

Tiga kombinasi diuji empiris. Hanya kombinasi C yang lolos semua syarat:

| Desain | Hasil |
|---|---|
| **A.** `security_invoker = true` + cabut hak kolom | ❌ **Gagal total.** View berjalan sebagai invoker, jadi butuh `SELECT` pada `price_buy` → **`permission denied for table products`**. View tidak bisa mask kolom yang haknya dicabut dari invoker. |
| **B.** `security_invoker = false` + owner view = role non-`bypassrls` | ❌ RLS tabel dasar dievaluasi sebagai owner view yang tidak punya toko → **0 baris untuk semua user**, termasuk owner. |
| **C.** View dimiliki `postgres` (bypassrls) + **filter tenant eksplisit di dalam view** | ✅ Benar. Kasir: 1 baris, `price_buy` **NULL**. Owner: **777**. Kasir baca `price_buy` dari tabel dasar: **ditolak**. Kasir baca kolom biasa dari tabel: **boleh**. User tanpa toko: 0 baris. |

**Konsekuensi penting:** desain C memindahkan tanggung jawab isolasi tenant dari RLS ke klausa `where` di view. Karena itu view **wajib** memuat `where store_id = current_store_id()` — kalau lupa, seluruh toko bocor. Ini harus jadi aturan tetap untuk setiap view masking baru.

### 6.2 Skema yang dipakai Fase 3

```sql
-- 1. View dimiliki postgres (bypassrls) + filter tenant eksplisit.
create or replace view public.v_products as
select p.id, p.store_id, p.name, p.description, p.category_id, p.sku, p.barcode,
       p.image_url, p.is_active, p.price_sell, p.stock, p.minimum_stock,
       p.created_by, p.created_at, p.updated_at,
       case when (select public.has_permission('hpp.read')) then p.price_buy end as price_buy,
       case when (select public.has_permission('hpp.read')) then p.price_modal end as price_modal
from public.products p
where p.store_id = (select public.current_store_id());

-- 2. Cabut SELECT tabel penuh, beri hak per kolom (tanpa price_buy/price_modal).
revoke all on public.products from authenticated;
grant select (id, store_id, name, description, category_id, sku, barcode, image_url,
              is_active, price_sell, stock, minimum_stock, created_by, created_at, updated_at)
  on public.products to authenticated;
grant insert, update, delete on public.products to authenticated;

-- 3. View tetap boleh dibaca.
grant select on public.v_products to authenticated;
```

**Catatan:** `v_products` saat ini (0003) memakai `security_invoker = true` dan **belum** menutup kebocoran. Fase 3 menggantinya ke desain C.

### 6.3 Wajib diperiksa saat mengerjakan 3E

1. **`select('*')` akan patah.** `products.ts` punya 5 query `select('*')` / `select(\`*, category:categories(*)\`)` yang kini akan gagal (`permission denied`) karena `*` menyertakan kolom yang haknya dicabut. Harus diganti daftar kolom eksplisit.
2. **PostgREST embedding.** `category:categories(*)` lewat view butuh FK yang terdeteksi PostgREST; sudah pernah diverifikasi bekerja, tetapi harus diuji ulang setelah grant dicabut.
3. **`price_buy` dipakai saat create produk.** ~~form input produk untuk gudang perlu ditinjau~~ → **SUDAH DIPUTUSKAN**, lihat §6.4.
4. **Kolom HPP di tabel lain.** `return_items.price_buy` & `purchase_return_items.price_buy` juga menyimpan harga beli. Policy-nya menuntut `transaction.read`/`purchasing.read` — role `gudang` punya `purchasing.read`, jadi perlu diputuskan apakah kolom itu ikut dimasker. **Status: belum diputuskan** (lihat §6.4 catatan).
5. **`transaction_items` tidak menyimpan harga beli** (hanya `price`), jadi tidak perlu masking — cukup `transaction_items_payment_summary` yang sudah diperbaiki di 0003.

### 6.4 KEPUTUSAN #1 — HPP saat input produk oleh role `gudang`

**Masalah:** `products.create()` di frontend membuat jurnal stok awal dengan `price_buy`, padahal `post_journal` dijaga `finance.write` — role `gudang` punya `product.write` tetapi **tidak** punya `finance.write` maupun `hpp.read`. Akibatnya jurnal stok awal **gagal**, dan kegagalannya **ditelan diam-diam** (`catch` → `return null`, hanya `console.error`). Gudang bisa input stok 10 unit tanpa jejak akuntansi apa pun.

**Keputusan: jurnal stok awal dipindah ke server.** Tambah RPC `create_product(...)` yang melakukan insert produk + memanggil `create_stock_adjustment()` — fungsi yang **sudah ada** dan sudah membuat jurnal Dr `1-1200 Persediaan` / Cr `3-3000 Modal Pemilik` dengan guard `stock.write` saja. Dengan begitu:

- `gudang` boleh mengisi harga beli (dia memang yang tahu harga dari supplier), tanpa perlu `hpp.read` atau `finance.write`.
- Jurnal stok awal **atomik** — tidak bisa lagi hilang diam-diam.
- Pola konsisten: `create_stock_adjustment` sudah melakukan hal yang sama untuk penyesuaian stok.

**Diuji di stack lokal (2026-11-26):**

| Uji | Hasil |
|---|---|
| gudang: `product.write=t`, `stock.write=t`, `finance.write=f`, `hpp.read=f` | ✅ sesuai matriks |
| gudang panggil `create_product('Produk Gudang', 5000, 10, 3000)` | ✅ produk dibuat, stok **10**, `price_buy` **3000** |
| jurnal stok awal | ✅ 1 jurnal, 1 stock_movement, total debit **30.000** (10 × 3000) |
| kasir panggil `create_product` | ✅ **ditolak** (`Akses ditolak: butuh permission product.write`) |

**Yang harus dikerjakan di 3B/3E:**

- [ ] RPC `create_product(...)` (guard `product.write`; delegasi jurnal ke `create_stock_adjustment`)
- [ ] `products.ts create()` → `supabase.rpc('create_product', ...)`, hapus `postInitialStockJournal` dari jalur frontend
- [ ] `products.createMany()` (dipakai import CSV di `stores/products.ts:104`) — putuskan: loop RPC, atau tanpa jurnal (didokumentasikan)
- [ ] **Jangan** beri `gudang` hak `hpp.read` — gudang hanya boleh **menulis** HPP, tidak membaca HPP produk lain. Ini konsisten dengan pemisahan tulis/baca di matriks §4.
- [ ] **Belum diputuskan:** masking `return_items.price_buy` & `purchase_return_items.price_buy` (§6.3 butir 4). Butuh keputusan terpisah.

### 6.5 KEPUTUSAN #2 — Trigger `handle_new_user` vs akun karyawan

**Masalah:** `handle_new_user` membuat **toko baru untuk setiap** `INSERT` di `auth.users`. Kalau Edge Function mengundang karyawan, karyawan itu jadi pemilik toko sendiri — bukan anggota toko yang mengundang.

**Temuan tambahan yang mengubah prioritas:** halaman `/signup` **sudah ditutup** (`src/views/Auth/Signup.vue`: "Pendaftaran Ditutup — akun hanya dapat dibuat oleh admin toko"). Dan `supabase/functions/` **masih kosong** (belum ada Edge Function). Artinya saat ini **tidak ada jalan membuat akun sama sekali** — dengan 0 user di live (§2.4), aplikasi tidak bisa dimasuki. Ini menjadikan 3F **blocking untuk go-live**, bukan sekadar fitur tambahan.

**Keputusan: undangan berbasis token, bukan penanda `employee_of`.**

Pendekatan pertama yang saya uji — `raw_user_meta_data->>'employee_of'` — **ditolak karena lubang keamanan**. `raw_user_meta_data` **dapat diisi sendiri oleh pendaftar**. Hasil uji:

| Serangan | Hasil |
|---|---|
| Penyerang kirim `employee_of` = toko korban | ❌ **BERHASIL** — jadi `kasir` toko korban dan **membaca produk korban** (1 baris) |
| Penyerang kirim `employee_of` + `role: 'admin'` | ⚠️ berhasil jadi `admin` (eskalasi) |
| Penyerang kirim `employee_of` + `role: 'owner'` | ✅ tertahan, tapi hanya **kebetulan** oleh `one_owner_per_store` — bukan kontrol yang disengaja |

**Desain yang dipakai: tabel `store_invites` + token rahasia.**

```sql
create table public.store_invites (
  token      text primary key default encode(gen_random_bytes(32),'hex'),
  store_id   uuid not null references public.stores(id) on delete cascade,
  email      text,
  role       text not null default 'kasir'
             check (role in ('admin','kasir','gudang','keuangan')),
  expires_at timestamptz not null default now() + interval '7 days',
  used_at    timestamptz,
  created_at timestamptz not null default now()
);
alter table public.store_invites enable row level security;
-- TIDAK ada policy untuk authenticated: hanya bisa dibaca lewat fungsi SECURITY DEFINER.
```

Trigger `handle_new_user` menjadi:

```sql
if nullif(new.raw_user_meta_data->>'invite_token','') is not null then
  select * into v_invite from public.store_invites
  where token = new.raw_user_meta_data->>'invite_token'
    and used_at is null and expires_at > now()
  for update;                                  -- kunci baris: token tidak bisa dipakai 2x
  if not found then
    raise exception 'Undangan tidak valid atau kedaluwarsa';
  end if;
  insert into public.store_members (store_id, user_id, role)
  values (v_invite.store_id, new.id, v_invite.role);
  update public.store_invites set used_at = now() where token = v_invite.token;
  return new;
end if;
-- selain itu: pendaftaran normal -> owner toko sendiri (perilaku sekarang)
```

**Diuji di stack lokal (2026-11-26):**

| Uji | Hasil |
|---|---|
| Serangan: `employee_of` tanpa token | ✅ **tidak berpengaruh** — jadi owner toko sendiri, **0** anggota toko korban |
| Serangan: token palsu (`deadbeef`) | ✅ **gagal** (`Undangan tidak valid atau kedaluwarsa`) |
| Undangan sah: token benar | ✅ jadi anggota dengan role dari undangan (`gudang`), token ditandai terpakai |
| Token dipakai 2x | ✅ **gagal** |
| Pendaftaran normal (tanpa token) | ✅ tetap owner toko sendiri + 18 COA |

**Catatan penting:** role **tidak pernah** diambil dari metadata klien — selalu dari baris `store_invites`. Ini menutup eskalasi hak sepenuhnya.

**Yang dikerjakan di 3F (SELESAI, 2026-11-26):**

- [x] Migrasi **`0005_invites.sql`** (bukan `0004` — nomor itu sudah dipakai 3E) — tabel `store_invites` + trigger `handle_new_user` baru + RPC `create_invite`/`revoke_invite`/`list_store_invites`/`list_store_members`/`update_store_member` (semua guard `user.manage`)
- [x] Edge Function `supabase/functions/admin-create-user/index.ts` — verifikasi JWT pemanggil ke GoTrue, cek keanggotaan **di toko pemilik undangan** + `user.manage`, buat user via `service_role` dengan `invite_token` di metadata. Role tidak pernah dikirim. Deployed ke live (`verify_jwt = true`; function tetap memverifikasi sendiri).
- [x] **Bootstrap:** pemilik pertama dibuat lewat Supabase Dashboard (Authentication → Add user) — trigger membuat toko + 18 COA. Live: `test@test.id` = owner "Ucup Kasir", 18 akun COA.
- [x] `src/views/Settings/Users.vue` — daftar anggota, undang karyawan (token ditampilkan + tombol Salin), buat akun, ubah role, nonaktifkan/aktifkan. Tidak ada tombol "jadikan owner".
- [x] Rute `/settings/users` dengan `meta.permission = 'user.manage'`; menu sidebar + pintasan di `Settings/StoreSettings.vue` memakai `v-can="'user.manage'"`.
- [x] Grup uji **14** di `test_rbac.sh` (24 assertion): token palsu, token dipakai 2x, eskalasi role, email binding, owner tak bisa diubah, nonaktifkan, akses langsung ke `store_invites` ditolak.

**Temuan saat 3F (tiga bug nyata, semuanya sudah diperbaiki):**

1. **`has_permission()` bocor lintas toko → `0006_store_scoped_permission.sql`.** Versi 0002 memeriksa permission di **toko mana pun** tempat user aktif, sedangkan `current_store_id()` hanya memilih satu toko. User yang `owner` di toko sendiri + `kasir` di toko lain bisa mengundang/mengubah anggota toko tempat ia hanya kasir. Kini permission dievaluasi pada `current_store_id()` saja. Terverifikasi di live: user dengan konteks toko kasir → `user.manage=false`, `transaction.read=true`.
2. **`list_store_members()` gagal di stack asli.** `auth.users.email` bertipe `varchar(255)`, kolom hasil fungsi bertipe `text` → `RETURN QUERY` gagal "structure of query does not match function result type". Harness tidak menangkapnya karena membuat `auth.users.email` sebagai `text`. Diperbaiki dengan `u.email::text`, dan `verify_sql.sh` kini meniru `varchar(255)` agar perbedaan ini tidak tersembunyi lagi.
3. **`current_store_id()` tidak deterministik → `0007_deterministic_current_store.sql`.** Fungsi ini memilih `order by created_at limit 1`. Bila user punya dua keanggotaan yang dibuat dalam transaksi sama (mis. owner toko sendiri + karyawan yang diundang), `created_at` identik dan PostgreSQL bebas memilih salah satu — artinya batas tenant untuk RLS dan semua guard bisa berubah-ubah. Ditemukan saat menguji live: user `verify3f-kasir` adalah owner di toko sendiri sekaligus kasir di toko uji, sehingga `create_invite` dari akun itu **berhasil** (dieksekusi dengan konteks toko miliknya). Ditambahkan tiebreak `id` agar pilihan deterministik. Perilaku normal (satu keanggotaan) tidak berubah.

   **Catatan desain yang tersisa (bukan bug, tapi perlu diketahui):** karena `current_store_id()` hanya memilih **satu** toko (yang paling awal), user dengan dua keanggotaan selalu bekerja pada toko yang lebih awal. Skema mendukung multi-store, tetapi **belum ada UI pemilih toko** — untuk sekarang ini berarti akun karyawan sebaiknya hanya punya satu keanggotaan (sesuai model "1 pemilik = 1 toko").

**Verifikasi 3F (lulus):**

- `npm run db:test-rbac` (harness) & `npm run db:test-rbac:local` (stack asli): **SEMUA TES LULUS**, 14 grup.
- Live (MCP `apply_migration` untuk 0005/0006/0007, `deploy_edge_function` untuk `admin-create-user`): create_invite 64-hex; role owner ditolak; anon ditolak; `list_store_members` mengembalikan email; Edge Function — happy path 200, email mismatch 400, password pendek 400, token palsu 404, token dipakai 2x 409, pemanggil non-manager 403, body non-JSON 400, tanpa sesi 401. User hasil undangan: login OK, role dari undangan, **tidak** punya toko sendiri, `store_invites` tak terbaca langsung, `user.manage` ditolak.
- Data uji live sudah dibersihkan: 1 toko ("Ucup Kasir", 18 COA), 1 anggota (owner).
- `npm run type-check` + `npm run build` lulus; UI diuji di browser (1440px & 390px) tanpa error konsol.

**Advisory Supabase yang SENGAJA diterima (jangan "diperbaiki" tanpa paham):**

| Advisory | Kenapa dibiarkan |
|---|---|
| `rls_enabled_no_policy` pada `store_invites` | Justru intinya: tabel token **tidak boleh** punya policy. Akses hanya lewat RPC `SECURITY DEFINER` ber-guard `user.manage`. Menambah policy = membuka token ke semua anggota. |
| `security_definer_view` pada `v_products`, `v_return_items`, `v_purchase_return_items` | Desain C (§6.1): view dimiliki `postgres` supaya bisa membaca `price_buy` lalu memaskernya. Isolasi tenant datang dari filter `store_id = current_store_id()` **di dalam** view, bukan RLS. |
| `authenticated_security_definer_function_executable` (60 fungsi) | Semua RPC memang dipanggil dari frontend. Pengamannya ada di dalam fungsi: guard `has_permission()` (28 fungsi write) + `current_store_id()` untuk isolasi tenant. |
| `auth_leaked_password_protection` | Perlu keputusan pemilik produk (mengaktifkan cek HaveIBeenPwned menambah dependensi jaringan saat signup). **Belum diaktifkan.** |

## 7. Dampak frontend & offline

Angka di bawah hasil audit ulang 2026-11-26 (`grep` atas `src/`), bukan perkiraan.

### 7.1 Kerusakan yang pasti (blocking) — harus beres sebelum aplikasi bisa dipakai

| # | Kerusakan | Bukti / lokasi | Perbaikan |
|---|---|---|---|
| K1 | **`store_settings` sudah tidak ada**, 19 file masih memakainya | `src/services/storeSettings.ts` (query `.from('store_settings')`), `src/stores/storeSettings.ts`, 17 view via `useStoreSettings` | Baca/tulis ke `stores` — pemetaan kolom di §7.4. Ubah `StoreSettings` type |
| K2 | **Filter `.eq('user_id', ...)` ke kolom yang sudah tidak ada** — 13 titik di 4 service | `dailyCash.ts` (5), `dailyBank.ts` (5), `agingReceivables.ts` (1), `storeSettings.ts` (2) | `.eq('store_id', storeId)` — atau **hapus filternya sama sekali**, karena RLS sudah memfilter tenant. Lebih aman dihapus. |
| K3 | **2 RPC kirim parameter yang tidak ada** | `finance.ts:573` `get_profit_summary` kirim `p_user_id`; `finance.ts:949` `check_period_closed` kirim `p_user_id` | Kirim `p_store_id` (ambil dari auth store). Diff 28 RPC lain bersih — hanya 2 ini. |
| K4 | **Interface `user_id` di 36 tempat** di `src/types/database.ts` | Setiap interface tabel bisnis | Ganti ke `store_id`; `notifications` & `store_members` **tetap** `user_id` (memang orang) |
| K5 | `stock.ts` memetakan `r.user_id` dari `stock_movements` | `src/services/stock.ts` 11 tempat | Kolomnya kini `store_id`; ganti nama field interface ke `store_id` |
| K6 | `itemPaymentService.ts` interface `user_id` | `transaction_item_payments` kini `store_id`; view `transaction_items_payment_summary` masih meng-*alias* `store_id as user_id` | Samakan ke `store_id` (dan ubah alias di view saat 3E) |
| K7 | `types/priceMatrix.ts` 4 interface pakai `user_id` | tabel `price_tiers`, `customer_price_matrix`, `customer_groups` | Ganti ke `store_id` |
| K8 | `utils/fixPaymentAllocation.ts` | 4 titik; sebagian kode SQL SQLite mentah (`WHERE ti.user_id = ?`) | Hanya bagian Supabase yang rusak; bagian SQLite ikut Fase 4 |

### 7.2 Fitur baru

| Area | Dampak |
|---|---|
| `src/stores/auth.ts` | Saat ini hanya punya `user`/`session`/`loading`/`initialized`. Tambah `role`, `permissions: Set<string>`, `storeId`; muat dari `store_members` + `role_permissions`; cache di localStorage untuk offline |
| `src/router/index.ts` | 108 rute, 105 punya `meta`, **0** punya `meta.permission`. Tambah `meta: { permission }` + guard kedua + halaman `/403` |
| `AppSidebar.vue`, `BottomNavigation.vue` | Menu hardcoded (11 grup sidebar; bottom nav 4 item). Filter per permission |
| `composables/usePermission.ts` + `v-can` | Belum ada sama sekali (hanya 3 kemunculan kata "permission" di `src/`) |
| `Settings/Users.vue` + Edge Function | Belum ada (`supabase/functions/` kosong). **Desain sudah diputuskan** (§6.5): undangan berbasis token `store_invites`, bukan penanda metadata. **Blocking go-live** karena `/signup` ditutup dan live punya 0 user |

### 7.3 Offline (Fase 4)

| Area | Dampak |
|---|---|
| `src/services/sqlite/*` + `sync/*` + `src/lib/sqlite.ts` | **724 kemunculan** `user_id`; total `src/` = 802 |
| `currentUserId` → `currentStoreId` | 5 titik |
| `src/services/sync/syncEngine.ts` | `.eq('user_id', userId)` → `.eq('store_id', storeId)` |
| `signOut()` | Jangan wipe SQLite bila `store_id` sama (ganti user di device yang sama) |

### 7.4 Pemetaan kolom `store_settings` → `stores` (untuk K1)

Terverifikasi dari `0001_baseline.sql:560` vs `0002_rbac.sql:24`. **Nama kolom berubah** — tidak bisa sekadar mengganti nama tabel.

| `store_settings` (lama) | `stores` (baru) |
|---|---|
| `store_name` | `name` |
| `store_subtitle` | `subtitle` |
| `store_address` | `address` |
| `store_phone` | `phone` |
| `store_email` | `email` |
| `tax_enabled`, `tax_rate`, `currency`, `receipt_footer` | nama sama |
| `default_credit_limit`, `loading_rate_per_sack` | nama sama |
| `unloading_rate_per_sack` | nama sama |
| `user_id` | **tidak ada** — akses lewat `id = current_store_id()` |

Karena itu service `storeSettings.ts` harus melakukan translasi nama kolom dua arah (baca & tulis), atau `src/stores/storeSettings.ts` dipetakan ulang agar seluruh 17 view tidak perlu diubah. **Rekomendasi: translasi di service**, biarkan `StoreSettings` type tetap memakai nama lama agar 17 view tidak tersentuh.

## 8. Fase eksekusi

### Fase 0 — Baseline reproducible
- [x] `npm i -D supabase` + `supabase init` — CLI v3.4.0; config `supabase/config.jsonc` (bukan `.toml`), PG major 17, port 54321–54324
- [x] ~~`supabase link` ke project~~ → **tidak diperlukan lagi.** Migrasi live ditempel lewat SQL Editor sebagai bundle (`docs/rbac/migrate_live.sql`) dan versinya dicatat manual (`mark_migrations_applied.sql`). `supabase link` hanya relevan bila nanti memakai `supabase db push`.
- [x] Ambil skema asli dari live: introspect via MCP → `docs/rbac/introspection/*` (bukan `db pull`, karena belum link)
- [x] Tulis `supabase/migrations/0001_baseline.sql` — **1:1 identik dengan live** (bukan penamaan baru). Terverifikasi: 524 kolom, 183 policy, 34 trigger, 162 index, 182 constraint, 71 fungsi, 1 view, 196 grant — semua cocok dengan snapshot live (`docs/rbac/compare_schema.sh`). Penamaan baru (`user_id`→`store_id`) sengaja di **0002**, agar diff baseline bisa direview.
- [x] `supabase db reset` di **dev branch** → verifikasi app jalan. `db reset` LULUS pada stack native (tanpa Docker). `npm run type-check` + `npm run build` LULUS.
- [x] Arsipkan 74 migrasi lama ke `supabase/migrations_archive/` (74 file terverifikasi)

**Catatan Fase 0 (penting):**
- `0001_baseline.sql` sengaja mempertahankan 3 lubang audit (S1 view tanpa `security_invoker`, S2 policy `true` pada products/categories, S3 54 fungsi SECURITY DEFINER). Diperbaiki di 0002/0003.
- Bug nyata ditemukan & diperbaiki: 0002 sempat `drop table store_settings` lalu `drop policy ... on store_settings` → `supabase db reset` gagal (`42P01`). Penyebab: stack Supabase mem-preload **`supautils`** (`supautils.policy_grants`) yang me-resolve tabel saat DDL policy, sehingga `drop policy if exists` pada tabel hilang menjadi ERROR (bukan NOTICE seperti PG vanilla). Harness `docs/rbac/verify_sql.sh` kini ikut mem-preload supautils agar tidak lagi memberi false-positive.
- Gerbang uji: `npm run db:reset` (otoritatif) + `npm run db:verify` (harness cepat, supautils-aware) + `npm run db:test-rbac` (uji fungsional). Saat Fase 2 selesai ada 13 grup; **kini 14 grup** setelah grup undangan 3F ditambahkan — semuanya lulus (lihat 3F).

### Fase 1 — Skema RBAC (`0002_rbac.sql`) — SELESAI & TERVERIFIKASI
- [x] `stores`, `store_members`, `role_permissions` + seed matriks — seed **identik** dengan matriks §4 (76/76, diverifikasi programatik)
- [x] `current_store_id()`, `has_permission()`, `current_store_role()`
- [x] Rename `user_id` → `store_id` di **46** tabel bisnis + tambah `created_by` (21 tabel). Catatan: plan menyebut 49, tapi dari 48 tabel ber-`user_id` di live, 2 sengaja tidak di-rename — `notifications` (milik ORANG, tetap `user_id`) dan `store_settings` (di-drop). 46 = 48 − 2.
- [x] Merge `store_settings` → `stores` (tabel di-drop, `init_default_coa_for_store()` menggantikan seed lama)
- [x] Tulis ulang 183 policy → 98 policy seragam (`store_id = current_store_id() AND has_permission(...)`), semua 50 tabel RLS aktif. Policy `true` hanya tersisa 1: `role_permissions` (matriks permission global, memang boleh dibaca semua user login — bukan data tenant).
- [x] Trigger `on_auth_user_created`: buat `stores` + membership owner + COA default per toko (saat Fase 1 = 16 akun COA; Fase 2 menaikkan ke **18 akun** lewat `init_default_coa_for_store()`, dan trigger `on_auth_user_created` ikut memakai fungsi itu). Terverifikasi pasca-cutover: signup baru → 18 akun COA.
- [x] **Fix bug ditemukan saat audit Fase 1:** baseline memberi `authenticated` hak `TRUNCATE/REFERENCES/TRIGGER` di 48 tabel; 0002 semula hanya menambah DML tanpa mencabut hak lama. **TRUNCATE tidak tunduk RLS** → kasir bisa `truncate public.notifications` dan menghapus data SEMUA toko (terbukti). Diperbaiki dengan `revoke all ... from authenticated` sebelum grant DML. Terverifikasi: `TRUNCATE=false`, `SELECT=true`, anon kosong — baik di harness maupun stack asli.

**Verifikasi Fase 1 (lulus):** isolasi tenant (owner/kasir/toko-lain hanya lihat produknya; kasir tak bisa update/delete produk toko lain), permission gate (`has_permission('transaction.write')=t`, `finance.write=f`; kasir baca `journal_entries`=0), `current_store_id()`/`current_store_role()` benar, anon ditolak total. (Saat itu `test_rbac.sh` berhenti di grup 4 karena fungsi trigger masih versi Fase 2; setelah Fase 2 seluruh 13 grup lulus, dan kini 14 grup setelah grup undangan 3F — lihat Fase 2 dan 3F.)

### Fase 2 — Fungsi SQL (`0003_functions.sql`) — SELESAI & TERVERIFIKASI

Generator: `docs/rbac/gen_functions.py` → output `supabase/migrations/0003_functions.sql` (137.884 byte). Jalankan ulang kapan saja dengan `npm run db:gen`.

**Pekerjaan (selesai):**
- [x] Konversi 33 fungsi `auth.uid()` → `current_store_id()` — 58 fungsi dikonversi mekanis, 10 manual (lihat bawah)
- [x] Permission guard pada **28** RPC write (`raise exception ... errcode '42501'`) — 27 jalur mekanis + 1 manual (`create_stock_adjustment`); total entri `GUARDS` = 28 (diverifikasi self-check)
- [x] `v_products` + masking HPP (`price_buy`, `price_modal` → `NULL` tanpa `hpp.read`)
- [x] Konsolidasi COA init 4 mekanisme → 1: `init_default_coa_for_store(uuid)`
- [x] Konversi **11** trigger `prevent_closed_period_*` (`NEW.user_id`/`OLD.user_id` → `NEW.store_id`/`OLD.store_id`)
- [x] Fix S1: `transaction_items_payment_summary` dibuat ulang **valid** + `security_invoker = true`
- [x] **Fix Fase 1 yang ditemukan di sini:** 37 tabel bisnis punya `store_id` tanpa FK ke `stores` → ditambahkan `... _store_id_fkey ... on delete cascade` (idempoten). Tanpa ini hapus toko tidak cascade (uji grup 13 gagal).

**🔴 3 bug generator (dari audit) — DIPERBAIKI:**
1. `SECURITY DEFINER` dobel → generator kini hanya menyisipkan `SET search_path`, tidak pernah `SECURITY DEFINER` kedua (self-check menolak duplikat).
2. `trigger_init_coa_on_first_transaction` di `MANUAL` **dan** `DROP` → dikeluarkan dari `DROP`, tetap dibuat ulang (trigger `ensure_coa_exists` tetap hidup).
3. Blind rename `user_id`→`store_id` → diganti pemetaan eksplisit + allowlist/denylist; `notifications.user_id` & `store_members.user_id` tetap berarti **orang**. Self-check gagal keras bila ada sisa `user_id` di luar konteks yang diizinkan.

**Bug fungsional tambahan yang ditemukan & diperbaiki saat audit Fase 2:**
- `create_transaction` membaca `store_settings` (tabel sudah di-drop Fase 1) → kini `stores.default_credit_limit`.
- `create_stock_adjustment` memakai akun `3-1000` yang tidak ada + insert `stock_movements` ganda (trigger sudah mencatat) → kini `3-3000` dan tanpa insert manual; pakai `app.stock_ref_type`/`app.stock_ref_id` untuk memberi konteks ke trigger.
- `delete_payroll` menghapus `journal_lines.journal_entry_id` (kolom tidak ada) → `journal_id`.
- `transaction_items_payment_summary` definisi lama tidak valid setelah rename → ditulis ulang.
- `init_default_coa_for_store` hanya 16 akun COA & punya early-return → kini **18 akun**, idempoten (`ON CONFLICT DO NOTHING`, tanpa early-return). Tambahan: `2-2100 Hutang Gaji`, `3-3100 Laba Piutang`, `3-3200 Laba Direalisasi`.

**Keputusan yang diambil:**
- **`v_products` `security_invoker = true`** (sesuai §6, bukan `false` seperti draf generator). Alasan generator memilih `false` (CASE `hpp.read` butuh akses `products.price_buy`) diatasi dengan `has_permission()` yang `SECURITY DEFINER` — jadi invoker tetap aman. **Risiko sisa:** role `authenticated` masih punya `SELECT` langsung ke `public.products`, sehingga kasir bisa membaca `price_buy` lewat tabel dasar; ditutup di **Fase 3** (cabut `SELECT` kolom / akses lewat view saja).
- **`seed_default_accounts()` dipertahankan** sebagai wrapper tipis yang memanggil `init_default_coa_for_store(current_store_id())` — frontend `src/services/finance.ts` masih memanggilnya. Diberi guard `finance.write`.
- **Guard pembayaran pakai OR**: `add_transaction_payment`, `delete_transaction_payment`, `allocate_payment_to_items`, `reallocate_payment`, `deallocate_payment` = `transaction.write` **OR** `invoice.payment.write` — konsisten dengan policy RLS `transaction_item_payments_write` di 0002 dan matriks §4 (role `keuangan` punya `invoice.payment.write` tanpa `transaction.write`).
- **`created_by`**: mengandalkan `default auth.uid()` dari 0002; `auth.uid()` hanya muncul 2× di 0003 (parameter eksplisit `closed_by`/`created_by` di `close_period`/`create_stock_opname`).
- **Signature berubah** (tidak bisa `CREATE OR REPLACE` karena rename parameter): `check_period_closed(date, uuid)`, `get_profit_summary(uuid, date, date)` — fungsi lama di-`DROP` dulu.

**Verifikasi Fase 2 (lulus):**
- `npm run db:verify` (harness supautils-aware, transaksi tunggal): **50 tabel, 2 view, 73 fungsi, 34 trigger, 98 policy, 187 index, 247 constraint, 50 RLS aktif**.
- `npm run db:reset` (stack native, gerbang otoritatif): ketiga migrasi diterapkan bersih. **Catatan lingkungan:** stack di sini berjalan **native** (`SUPABASE_EXPERIMENTAL_STACK=1`), jadi script `db:start/stop/reset` di `package.json` kini menyetel variabel itu — tanpa itu CLI mencoba Docker dan gagal (`LocalDbRunningError`).
- `npm run db:test-rbac` (harness) **dan** `npm run db:test-rbac:local` (stack asli 54322): **SEMUA TES LULUS**, 13 grup saat itu (kini 14 grup setelah grup undangan 3F ditambahkan — lihat 3F) — termasuk isolasi tenant, gerbang permission, 8 RPC guard (kasir ditolak, owner lolos), masking HPP, fix S1, anon ditolak, cabut akses instan, cascade hapus toko.
- `npm run type-check`: lulus (perubahan hanya SQL + script; frontend belum disentuh di fase ini).

### Fase 3 — Frontend (SELESAI, sudah diterapkan ke live)

Prasyarat: Fase 0–2 selesai; live sudah greenfield dan kosong (§2.4). Urutan sub-fase disusun agar aplikasi **bisa login dan dipakai** sedini mungkin, lalu dikunci per permission.

**3A — Fondasi permission (tanpa UI) — SELESAI**

- [x] `src/constants/permissions.ts` — 26 permission (identik dengan seed `role_permissions`) + tipe union `Permission`
- [x] `src/stores/auth.ts` — `role`, `permissions: Set<Permission>`, `storeId`, `membershipLoaded`; muat `store_members` (role) lalu `role_permissions` (daftar permission); cache di localStorage; **fail-closed** bila membership tidak ada (permissions kosong, `storeId` null)

**3B — Perbaiki kerusakan skema (BLOCKING, §7.1) — SELESAI**

- [x] K1 `storeSettings` → `stores` dengan translasi nama kolom (§7.4)
- [x] K2 hapus/ubah filter `.eq('user_id', ...)` (RLS sudah memfilter tenant)
- [x] K3 `get_profit_summary` & `check_period_closed` → kirim `p_store_id`
- [x] K4–K7 `user_id` → `store_id` di `types/database.ts`, `stock.ts`, `itemPaymentService.ts`, `types/priceMatrix.ts`, `stores/stock.ts`, `stores/notifications.ts`
- [x] K8 bagian Supabase di `utils/fixPaymentAllocation.ts`
- [x] **Gerbang:** `npm run type-check` + login + golden path (produk, transaksi, pelanggan, invoice) jalan

**3C — Guard rute — SELESAI**

- [x] `meta: { permission }` pada 101 rute (pemetaan per modul: `/finance/*` → `finance.read`, `/hr/*` → `hr.read`, `/purchasing/*` → `purchasing.read`, `/shipping/*` → `shipping.read`, `/reports/*` → `report.sales.read`, `/settings/*` → `settings.read`, `/price-matrix/*` → `price.read`, `/stock/*` → `stock.read`, dst.)
- [x] Guard kedua di `router.beforeEach` (setelah guard auth yang sudah ada) — cek `authStore.permissions`, redirect ke `/403`
- [x] Halaman `/403` (`src/views/Pages/Forbidden.vue`)

**3D — Sembunyikan UI yang tidak boleh — SELESAI**

- [x] `composables/usePermission.ts` + directive `v-can` (`src/directives/can.ts`)
- [x] Filter `AppSidebar.vue` & `BottomNavigation.vue` per permission
- [x] Sembunyikan tombol aksi (tambah/edit/hapus) yang butuh `*.write` di halaman list (14 file memakai `v-can`)

**3E — Tutup kebocoran HPP (§6) — SELESAI (`0004_hpp_masking.sql`)**

- [x] Ganti `v_products` ke desain C (owner `postgres`, filter tenant eksplisit)
- [x] Cabut hak kolom `price_buy`/`price_modal` dari `authenticated`; grant per kolom
- [x] Ganti `select('*')` di `products.ts` → daftar kolom eksplisit lewat `v_products`
- [x] Uji ulang embedding `category:categories(*)` lewat view
- [x] RPC `create_product` + ubah `products.create()` memakainya (§6.4)
- [x] Masking `return_items.price_buy` & `purchase_return_items.price_buy` — diputuskan **ditutup**, lewat `v_return_items` & `v_purchase_return_items`
- [x] **Gerbang:** kasir baca `price_buy` langsung → ditolak; owner → nilai asli; semua halaman produk normal (uji grup 10b–10d)

**3F — Kelola pengguna (BLOCKING GO-LIVE) — SELESAI**

> Rancangan lengkap & hasil uji ada di **§6.5**. Signup ditutup, `supabase/functions/` kosong, live 0 user → tanpa 3F aplikasi tidak bisa dimasuki.

- [x] Migrasi `0005_invites.sql` — tabel `store_invites`, trigger `handle_new_user` baru, RPC `create_invite`/`revoke_invite` + `list_store_invites`/`list_store_members`/`update_store_member` (guard `user.manage`)
- [x] `0006_store_scoped_permission.sql` — fix `has_permission()` lintas toko (temuan 3F)
- [x] `0007_deterministic_current_store.sql` — tiebreak `id` pada `current_store_id()` (temuan 3F)
- [x] Edge Function `admin-create-user` (`service_role`, verifikasi pemanggil punya `user.manage`, kirim `invite_token`) — deployed ke live
- [x] Bootstrap pemilik pertama via Supabase Dashboard (Authentication → Add user)
- [x] `src/views/Settings/Users.vue` — daftar anggota, undang karyawan, ubah role, nonaktifkan
- [x] Rute `/settings/users` dengan `meta.permission = 'user.manage'` + menu sidebar & pintasan di halaman Pengaturan
- [x] Tambah grup uji **14** di `test_rbac.sh`: token palsu ditolak, token dipakai 2x ditolak, `role` dari metadata diabaikan, email binding, owner tak bisa diubah

**Estimasi (aktual):** seluruh 3A–3F selesai dalam satu sesi kerja. 3B (kerusakan skema) dan 3E (masking HPP) tetap yang paling berisiko; 3F memunculkan **tiga** bug nyata yang tidak tertangkap unit test (§6.5).

### Fase 4 — Offline
- [ ] Rename **724** referensi `user_id` di layer SQLite/sync/`lib/sqlite.ts` (total `src/` = 802)
- [ ] `currentUserId` → `currentStoreId` (5 titik)
- [ ] Bump schema version SQLite + migrasi lokal
- [ ] Perbaiki `signOut()` (jangan wipe bila store sama)

### Fase 5 — Verifikasi & rilis
- [ ] Regresi penuh (stack lokal + browser)
- [ ] Checklist uji (bagian 9)
- [ ] `npm run type-check` + `npm run build`
- [ ] Deploy web + build APK (`npm run build && npx cap sync && cd android && ./gradlew assembleRelease`)
- [ ] ~~Merge ke produksi~~ → sudah live (§2.4); Fase 5 = rilis frontend yang cocok dengan skema baru

**Estimasi sisa: Fase 3 ±6,5 hari + Fase 4 ±2 hari + Fase 5 ±1 hari ≈ 9–10 hari kerja.** (Fase 0–2 sudah selesai; estimasi total awal ±7–8 hari tidak lagi relevan karena pekerjaan frontend ternyata lebih luas — 8 jenis kerusakan skema + masking HPP + kelola user.)

## 9. Checklist pengujian

- [ ] **Regresi owner:** ~~data lama tampil sama seperti sebelum rebuild~~ → **diganti** menjadi: *akun baru signup → toko + COA 18 akun terbuat; semua modul bisa dibuka owner tanpa error*
- [ ] **Isolasi:** kasir login → hanya data tokonya; menu finance/HR/pengaturan hilang
- [x] **Bypass API:** dengan anon key, kasir query `journal_entries` & `v_products.price_buy` → ditolak/NULL (uji grup 6 & 9)
- [x] **Bypass view:** kasir query `transaction_items_payment_summary` → hanya baris tokonya (verifikasi fix S1 — uji grup 10)
- [x] **Policy `true`:** kasir update/delete produk toko lain → ditolak (verifikasi fix S2 — uji grup 5)
- [x] **RPC:** kasir panggil `void_transaction` langsung → ditolak; transaksi normal berhasil (uji grup 8)
- [x] **Bypass tabel dasar:** kasir `select price_buy from products` → **ditolak** (ditutup Fase 3E `0004_hpp_masking.sql`; uji grup 10b)
- [ ] **Audit:** `created_by` terisi kasir yang input
- [ ] **Gudang input produk:** gudang buat produk stok 10 @ HPP 3000 → jurnal Dr 1-1200 / Cr 3-3000 sebesar 30.000 **terbentuk**; gudang tetap tidak bisa melihat HPP produk lain (§6.4)
- [x] **Undangan karyawan:** undang via `Settings/Users` → karyawan jadi anggota toko dengan role yang dipilih, **tidak** punya toko sendiri; token dipakai 2x ditolak; `role` dari metadata klien diabaikan (§6.5) — diuji di live via Edge Function + RPC
- [ ] **Offline:** kasir buat transaksi offline → sinkron → muncul di laporan owner
- [x] **Cabut akses:** owner nonaktifkan kasir → akses langsung mati (uji grup 12 & 14)
- [ ] **Ganti user di device:** login kasir lalu owner di HP sama → tidak unduh ulang penuh

## 10. Rollback

> **Status: cutover SUDAH dilakukan** (§2.4). Backup database lama **tidak dibuat** — diputuskan sadar oleh pemilik proyek ("tidak usah di backup langsung hapus saja"), dan isinya memang hanya 16 akun testing tanpa data bisnis.
>
> Karena itu rencana rollback di bawah ini **tidak lagi bisa menyelamatkan data lama**. Yang tersisa adalah rollback *skema*, bukan *data*.

Untuk perubahan berikutnya (Fase 3 ke atas):
- [ ] Tag repo git sebelum migrasi destruktif apa pun
- [ ] Untuk perubahan `v_products` + cabut grant (3E): siapkan skrip balik (`grant select on public.products to authenticated;` + kembalikan view ke `security_invoker = true`) dan jalankan di stack lokal dulu
- [ ] Database live kosong: tidak ada data produksi berisiko sampai toko pertama benar-benar dipakai — **manfaatkan jendela ini** untuk menyelesaikan 3E sebelum ada data nyata

## 11. Risiko

| Risiko | Mitigasi |
|---|---|
| ~~Baseline tidak lengkap (ada objek terlewat)~~ | **Sudah terverifikasi**: 50 tabel / 2 view / 73 fungsi / 34 trigger / 98 policy di live cocok dengan harness |
| ~~Policy lama yang benar ikut hilang saat rewrite~~ | **Sudah terdokumentasi**: 183 → 98 policy, mapping di Fase 1 |
| ~~Data test hilang~~ | **Sudah terjadi** (keputusan: greenfield, §2.4) |
| Role basi saat offline | Cache permission terakhir; tampilkan info saat offline |
| **View masking lupa filter tenant** → seluruh toko bocor (desain C memindahkan isolasi dari RLS ke `where` di view) | Aturan tetap: setiap view masking wajib `where store_id = current_store_id()`; tambahkan uji di `test_rbac.sh` yang memastikan user toko lain melihat 0 baris |
| **`select('*')` patah setelah grant kolom dicabut** (3E) | Ganti ke daftar kolom eksplisit **sebelum** grant dicabut; uji semua halaman produk |
| **Trigger `handle_new_user` membuat toko untuk setiap user** → karyawan yang diundang malah jadi pemilik toko sendiri | **Sudah diputuskan** (§6.5): `store_invites` + token rahasia; role diambil dari DB, bukan metadata klien |
| **`raw_user_meta_data` dapat diisi pendaftar** → eskalasi hak bila dipakai sebagai penanda kepercayaan | **Sudah dibuktikan berbahaya** (penyerang jadi kasir toko korban & baca datanya). Jangan pernah percaya metadata klien untuk otorisasi |
| **Tidak ada jalan membuat akun** (signup ditutup + 0 user + Edge Function belum ada) | Bootstrap pemilik pertama via Dashboard; 3F jadi blocking go-live |
| **Jurnal stok awal gagal diam-diam** untuk role `gudang` (`post_journal` butuh `finance.write`) | **Sudah diputuskan** (§6.4): RPC `create_product` mendelegasikan ke `create_stock_adjustment` (guard `stock.write`) |
| `security_invoker=true` + cabut grant = **view error**, bukan NULL (sudah dibuktikan §6.1) | Jangan pernah gabungkan keduanya; pakai desain C |
