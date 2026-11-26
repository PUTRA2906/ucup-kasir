-- ============================================================================
-- 0005_invites.sql — Fase 3F: undangan karyawan berbasis token
--
-- Latar: RBAC_PLAN §6.5.
--   * `handle_new_user` (0002) membuat toko BARU untuk SETIAP baris auth.users.
--     Akibatnya karyawan yang diundang malah jadi pemilik toko sendiri.
--   * `raw_user_meta_data` dapat diisi sendiri oleh pendaftar, jadi penanda
--     `employee_of`/`role` di metadata TIDAK BOLEH dipakai untuk otorisasi
--     (sudah dibuktikan: penyerang bisa jadi kasir toko korban & membaca datanya).
--
-- Desain: tabel `store_invites` + token rahasia 32 byte. Trigger hanya
-- mempercayai token yang ADA di tabel dan belum dipakai/kedaluwarsa. Role
-- selalu diambil dari baris undangan, tidak pernah dari metadata klien.
--
-- Isi:
--   1. Tabel store_invites (tanpa policy: hanya lewat fungsi SECURITY DEFINER)
--   2. handle_new_user baru: jalur undangan + jalur pendaftaran normal
--   3. RPC create_invite / revoke_invite / list_store_invites
--   4. RPC list_store_members / update_store_member (guard user.manage)
--   5. GRANT / REVOKE
-- ============================================================================

set check_function_bodies = off;

-- ============================================================================
-- 1. TABEL store_invites
--
-- Token = 64 karakter hex dari 32 byte acak (pgcrypto). Token adalah
-- kredensial: siapa pun yang memegangnya bisa mendaftar ke toko tersebut,
-- jadi tabel ini TIDAK diberi policy untuk `authenticated`. Satu-satunya
-- jalan membacanya adalah RPC SECURITY DEFINER yang dijaga `user.manage`.
-- ============================================================================
create table if not exists public.store_invites (
  token       text primary key
              default encode(extensions.gen_random_bytes(32), 'hex'),
  store_id    uuid not null references public.stores(id) on delete cascade,
  email       text,
  role        text not null default 'kasir'
              check (role in ('admin','kasir','gudang','keuangan')),
  expires_at  timestamptz not null default now() + interval '7 days',
  used_at     timestamptz,
  created_by  uuid default auth.uid(),
  created_at  timestamptz not null default now()
);

comment on table public.store_invites is
  'Undangan karyawan berbasis token. Token = kredensial rahasia; role diambil dari sini, bukan metadata klien.';
comment on column public.store_invites.role is
  'Role yang diberikan saat token dipakai. Tidak boleh owner (unique index one_owner_per_store).';

create index if not exists store_invites_store_idx on public.store_invites (store_id);
create index if not exists store_invites_pending_idx
  on public.store_invites (store_id) where used_at is null;

alter table public.store_invites enable row level security;

-- Tidak ada policy untuk anon/authenticated: akses hanya lewat RPC di bawah.
-- (Grant default Supabase bisa memberi SELECT otomatis — cabut eksplisit.)
revoke all on public.store_invites from anon, authenticated;
grant all on public.store_invites to service_role;

-- ============================================================================
-- 2. TRIGGER handle_new_user — jalur undangan + pendaftaran normal
--
-- Urutan pemeriksaan penting:
--   1. `for update` mengunci baris undangan → token tidak bisa dipakai 2x
--      walau dua pendaftaran berjalan bersamaan.
--   2. Token harus ada, belum dipakai, dan belum kedaluwarsa.
--   3. Bila undangan menyebut email, email pendaftar harus cocok.
--   4. Role diambil dari baris undangan — metadata klien diabaikan total.
-- Bila gagal di langkah mana pun, INSERT auth.users ikut gagal (tidak ada
-- user setengah jadi).
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_invite     public.store_invites%rowtype;
  v_token      text;
  v_store_id   uuid;
  v_store_name text;
begin
  v_token := nullif(btrim(coalesce(new.raw_user_meta_data->>'invite_token', '')), '');

  if v_token is not null then
    select * into v_invite
    from public.store_invites
    where token = v_token
      and used_at is null
      and expires_at > now()
    for update;

    if not found then
      raise exception 'Undangan tidak valid atau kedaluwarsa' using errcode = 'P0001';
    end if;

    -- Undangan yang menyebut email hanya boleh dipakai email itu.
    if v_invite.email is not null
       and lower(btrim(v_invite.email)) <> lower(btrim(coalesce(new.email, ''))) then
      raise exception 'Undangan tidak valid untuk email ini' using errcode = 'P0001';
    end if;

    insert into public.store_members (store_id, user_id, role)
    values (v_invite.store_id, new.id, v_invite.role);

    update public.store_invites
       set used_at = now()
     where token = v_invite.token;

    return new;
  end if;

  -- Pendaftaran normal (bootstrap pemilik pertama): buat toko + owner + COA.
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
  'Trigger auth.users: dengan invite_token valid -> anggota toko (role dari undangan); tanpa token -> owner toko baru + COA default.';

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- 3. RPC undangan
-- ============================================================================

/**
 * Buat undangan untuk toko milik pemanggil.
 * Hanya `user.manage` (owner) yang boleh. Role `owner` sengaja ditolak:
 * satu toko hanya punya satu owner (unique index one_owner_per_store).
 */
create or replace function public.create_invite(
  p_role text,
  p_email text default null,
  p_expires_in_days integer default 7
)
returns table (token text, expires_at timestamptz)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_store_id uuid := public.current_store_id();
  v_days     integer := least(greatest(coalesce(p_expires_in_days, 7), 1), 30);
  v_invite   public.store_invites%rowtype;
begin
  if not public.has_permission('user.manage') then
    raise exception 'Akses ditolak: butuh permission user.manage' using errcode = '42501';
  end if;

  if v_store_id is null then
    raise exception 'Akses ditolak: pengguna tidak terhubung ke toko mana pun' using errcode = '42501';
  end if;

  if p_role is null or p_role not in ('admin','kasir','gudang','keuangan') then
    raise exception 'Role tidak valid: %', coalesce(p_role, '(kosong)');
  end if;

  insert into public.store_invites (store_id, email, role, expires_at, created_by)
  values (
    v_store_id,
    nullif(btrim(coalesce(p_email, '')), ''),
    p_role,
    now() + make_interval(days => v_days),
    auth.uid()
  )
  returning * into v_invite;

  return query select v_invite.token, v_invite.expires_at;
end;
$$;

comment on function public.create_invite(text, text, integer) is
  'Buat token undangan untuk toko aktif. Guard: user.manage. Role owner tidak diizinkan.';

/**
 * Batalkan undangan yang belum dipakai. Hanya undangan toko sendiri.
 * Return true bila ada baris yang dihapus.
 */
create or replace function public.revoke_invite(p_token text)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_store_id uuid := public.current_store_id();
  v_deleted  integer;
begin
  if not public.has_permission('user.manage') then
    raise exception 'Akses ditolak: butuh permission user.manage' using errcode = '42501';
  end if;

  if v_store_id is null then
    raise exception 'Akses ditolak: pengguna tidak terhubung ke toko mana pun' using errcode = '42501';
  end if;

  delete from public.store_invites
   where token = p_token
     and store_id = v_store_id
     and used_at is null;

  get diagnostics v_deleted = row_count;
  return v_deleted > 0;
end;
$$;

comment on function public.revoke_invite(text) is
  'Hapus undangan yang belum dipakai di toko sendiri. Guard: user.manage.';

/**
 * Daftar undangan yang masih berlaku (belum dipakai & belum kedaluwarsa).
 * Token ikut dikembalikan supaya owner bisa menyalinnya.
 */
create or replace function public.list_store_invites()
returns table (
  token text,
  email text,
  role text,
  expires_at timestamptz,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_store_id uuid := public.current_store_id();
begin
  if not public.has_permission('user.manage') then
    raise exception 'Akses ditolak: butuh permission user.manage' using errcode = '42501';
  end if;

  if v_store_id is null then
    return;
  end if;

  return query
    select i.token, i.email, i.role, i.expires_at, i.created_at
    from public.store_invites i
    where i.store_id = v_store_id
      and i.used_at is null
      and i.expires_at > now()
    order by i.created_at desc;
end;
$$;

comment on function public.list_store_invites() is
  'Undangan aktif (belum dipakai/kedaluwarsa) untuk toko sendiri. Guard: user.manage.';

-- ============================================================================
-- 4. RPC kelola anggota
-- ============================================================================

/**
 * Daftar anggota toko + email & nama (dari auth.users).
 *
 * `store_members_select` membolehkan semua anggota melihat daftar, tetapi
 * email hanya ada di auth.users (tidak bisa dibaca klien). Karena halaman
 * kelola pengguna memang untuk owner, RPC ini dijaga `user.manage`.
 */
create or replace function public.list_store_members()
returns table (
  member_id uuid,
  user_id uuid,
  email text,
  display_name text,
  role text,
  is_active boolean,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_store_id uuid := public.current_store_id();
begin
  if not public.has_permission('user.manage') then
    raise exception 'Akses ditolak: butuh permission user.manage' using errcode = '42501';
  end if;

  if v_store_id is null then
    return;
  end if;

  -- `auth.users.email` bertipe varchar(255), sedangkan kolom hasil fungsi
  -- bertipe text → wajib di-cast. Tanpa cast, RETURN QUERY gagal dengan
  -- "structure of query does not match function result type" (bukan error
  -- yang terlihat di harness karena auth.users di sana dibuat berbeda).
  return query
    select m.id, m.user_id, u.email::text,
           nullif(btrim(coalesce(u.raw_user_meta_data->>'full_name', '')), ''),
           m.role, m.is_active, m.created_at
    from public.store_members m
    left join auth.users u on u.id = m.user_id
    where m.store_id = v_store_id
    order by
      case m.role when 'owner' then 0 else 1 end,
      m.created_at;
end;
$$;

comment on function public.list_store_members() is
  'Anggota toko + email/nama. Guard: user.manage.';

/**
 * Ubah role / status aktif anggota.
 *
 * Aturan yang ditegakkan:
 *   * Hanya `user.manage`.
 *   * Anggota ber-role owner TIDAK bisa diubah (termasuk oleh dirinya
 *     sendiri) — mencegah toko tanpa owner.
 *   * Role `owner` tidak bisa diberikan (unique index one_owner_per_store).
 *   * Hanya anggota toko pemanggil.
 */
create or replace function public.update_store_member(
  p_member_id uuid,
  p_role text default null,
  p_is_active boolean default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_store_id uuid := public.current_store_id();
  v_member   public.store_members%rowtype;
begin
  if not public.has_permission('user.manage') then
    raise exception 'Akses ditolak: butuh permission user.manage' using errcode = '42501';
  end if;

  if v_store_id is null then
    raise exception 'Akses ditolak: pengguna tidak terhubung ke toko mana pun' using errcode = '42501';
  end if;

  select * into v_member
  from public.store_members
  where id = p_member_id and store_id = v_store_id
  for update;

  if not found then
    raise exception 'Anggota tidak ditemukan di toko ini';
  end if;

  if v_member.role = 'owner' then
    raise exception 'Role owner tidak dapat diubah';
  end if;

  if p_role is not null then
    if p_role = 'owner' then
      raise exception 'Toko hanya boleh punya satu owner';
    end if;
    if p_role not in ('admin','kasir','gudang','keuangan') then
      raise exception 'Role tidak valid: %', p_role;
    end if;
  end if;

  update public.store_members
     set role = coalesce(p_role, role),
         is_active = coalesce(p_is_active, is_active)
   where id = v_member.id;
end;
$$;

comment on function public.update_store_member(uuid, text, boolean) is
  'Ubah role/status anggota toko. Guard: user.manage. Owner tidak bisa diubah; role owner ditolak.';

-- ============================================================================
-- 5. GRANT / REVOKE
--
-- Fungsi baru otomatis mendapat EXECUTE untuk PUBLIC. Cabut dulu, baru beri
-- ke authenticated (pola yang sama dengan 0003).
-- ============================================================================
revoke all on function public.create_invite(text, text, integer) from public, anon;
revoke all on function public.revoke_invite(text) from public, anon;
revoke all on function public.list_store_invites() from public, anon;
revoke all on function public.list_store_members() from public, anon;
revoke all on function public.update_store_member(uuid, text, boolean) from public, anon;

grant execute on function public.create_invite(text, text, integer) to authenticated, service_role;
grant execute on function public.revoke_invite(text) to authenticated, service_role;
grant execute on function public.list_store_invites() to authenticated, service_role;
grant execute on function public.list_store_members() to authenticated, service_role;
grant execute on function public.update_store_member(uuid, text, boolean) to authenticated, service_role;

-- Fungsi trigger: bukan RPC user.
revoke execute on function public.handle_new_user() from authenticated;
