/**
 * Edge Function: admin-create-user
 *
 * Membuat akun karyawan atas nama pemilik/admin toko (Fase 3F, RBAC_PLAN §6.5).
 *
 * Kenapa harus Edge Function: membuat baris `auth.users` butuh `service_role`,
 * yang tidak boleh ada di frontend. Function ini menjadi satu-satunya jalan
 * membuat akun (halaman /signup sudah ditutup).
 *
 * Alur:
 *   1. Frontend memanggil RPC `create_invite(role, email)` → dapat token.
 *   2. Frontend mengirim { token, email, password, full_name? } ke sini.
 *   3. Function memverifikasi JWT pemanggil, lalu memastikan pemanggil adalah
 *      anggota AKTIF toko pemilik undangan dengan permission `user.manage`.
 *   4. Akun dibuat lewat admin API dengan `invite_token` di metadata.
 *      Trigger `handle_new_user` (0005_invites.sql) yang menentukan role &
 *      keanggotaan — role TIDAK PERNAH dikirim dari sini.
 *
 * Token undangan adalah kredensial: function ini tidak pernah mengembalikan
 * token, dan menolak token yang sudah dipakai/kedaluwarsa/email-nya beda.
 */

import { createClient } from 'npm:@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_PASSWORD = 6

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }
  if (req.method !== 'POST') {
    return json({ error: 'Metode tidak didukung' }, 405)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !anonKey || !serviceKey) {
    return json({ error: 'Konfigurasi server tidak lengkap' }, 500)
  }

  // ------------------------------------------------------------------
  // 1. Identitas pemanggil — diverifikasi ke GoTrue, bukan sekadar decode JWT.
  // ------------------------------------------------------------------
  const authHeader = req.headers.get('Authorization') ?? ''
  const match = authHeader.match(/^Bearer\s+(.+)$/i)
  if (!match) {
    return json({ error: 'Butuh sesi login' }, 401)
  }
  const jwt = match[1]

  const callerClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: userData, error: userError } = await callerClient.auth.getUser(jwt)
  const caller = userData?.user
  if (userError || !caller) {
    return json({ error: 'Sesi tidak valid atau sudah kedaluwarsa' }, 401)
  }

  // ------------------------------------------------------------------
  // 2. Validasi input
  // ------------------------------------------------------------------
  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return json({ error: 'Body harus JSON' }, 400)
  }

  const token = typeof body.token === 'string' ? body.token.trim() : ''
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body.password === 'string' ? body.password : ''
  const fullName = typeof body.full_name === 'string' ? body.full_name.trim() : ''

  if (!token) return json({ error: 'Token undangan wajib diisi' }, 400)
  if (!EMAIL_RE.test(email)) return json({ error: 'Email tidak valid' }, 400)
  if (password.length < MIN_PASSWORD) {
    return json({ error: `Kata sandi minimal ${MIN_PASSWORD} karakter` }, 400)
  }
  if (fullName.length > 120) {
    return json({ error: 'Nama maksimal 120 karakter' }, 400)
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  // ------------------------------------------------------------------
  // 3. Undangan harus ada, masih berlaku, dan email-nya cocok
  // ------------------------------------------------------------------
  const { data: invite, error: inviteError } = await admin
    .from('store_invites')
    .select('token, store_id, email, role, expires_at, used_at')
    .eq('token', token)
    .maybeSingle()

  if (inviteError) {
    console.error('admin-create-user: gagal membaca undangan', inviteError)
    return json({ error: 'Gagal memeriksa undangan' }, 500)
  }
  if (!invite) {
    return json({ error: 'Undangan tidak ditemukan' }, 404)
  }
  if (invite.used_at) {
    return json({ error: 'Undangan sudah dipakai' }, 409)
  }
  if (new Date(invite.expires_at as string).getTime() <= Date.now()) {
    return json({ error: 'Undangan sudah kedaluwarsa' }, 410)
  }
  if (invite.email && String(invite.email).trim().toLowerCase() !== email) {
    return json({ error: 'Email tidak cocok dengan undangan' }, 400)
  }

  // ------------------------------------------------------------------
  // 4. Pemanggil wajib punya `user.manage` DI TOKO PEMILIK UNDANGAN.
  //
  // Sengaja memakai store_id undangan (bukan current_store_id()), supaya
  // tidak bergantung pada urutan keanggotaan dan tidak bisa dipakai untuk
  // mengelola toko lain.
  // ------------------------------------------------------------------
  const { data: membership, error: memberError } = await admin
    .from('store_members')
    .select('role')
    .eq('store_id', invite.store_id)
    .eq('user_id', caller.id)
    .eq('is_active', true)
    .maybeSingle()

  if (memberError) {
    console.error('admin-create-user: gagal membaca keanggotaan', memberError)
    return json({ error: 'Gagal memeriksa hak akses' }, 500)
  }
  if (!membership) {
    return json({ error: 'Akses ditolak: bukan anggota toko ini' }, 403)
  }

  const { data: perm, error: permError } = await admin
    .from('role_permissions')
    .select('permission')
    .eq('role', membership.role)
    .eq('permission', 'user.manage')
    .maybeSingle()

  if (permError) {
    console.error('admin-create-user: gagal membaca permission', permError)
    return json({ error: 'Gagal memeriksa hak akses' }, 500)
  }
  if (!perm) {
    return json({ error: 'Akses ditolak: butuh permission user.manage' }, 403)
  }

  // ------------------------------------------------------------------
  // 5. Buat akun. Role TIDAK dikirim — trigger mengambilnya dari undangan.
  // ------------------------------------------------------------------
  const userMetadata: Record<string, string> = { invite_token: token }
  if (fullName) userMetadata.full_name = fullName

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: userMetadata,
  })

  if (createError || !created?.user) {
    const message = createError?.message ?? 'tidak diketahui'
    if (/already|registered|exists|duplicate/i.test(message)) {
      return json({ error: 'Email sudah terdaftar' }, 409)
    }
    // Token bisa saja dipakai balapan oleh permintaan lain — trigger menolak
    // dengan pesan "Undangan tidak valid atau kedaluwarsa".
    if (/undangan/i.test(message)) {
      return json({ error: message }, 409)
    }
    console.error('admin-create-user: gagal membuat akun', createError)
    return json({ error: `Gagal membuat akun: ${message}` }, 400)
  }

  // ------------------------------------------------------------------
  // 6. Pastikan trigger benar-benar menautkan akun ke toko undangan.
  //    Bila tidak (mis. trigger dimatikan), hapus akun supaya tidak ada
  //    user "yatim" yang bisa login tanpa toko.
  // ------------------------------------------------------------------
  const { data: newMember } = await admin
    .from('store_members')
    .select('id, role')
    .eq('store_id', invite.store_id)
    .eq('user_id', created.user.id)
    .maybeSingle()

  if (!newMember) {
    await admin.auth.admin.deleteUser(created.user.id)
    console.error('admin-create-user: trigger tidak menautkan anggota', {
      userId: created.user.id,
      storeId: invite.store_id,
    })
    return json({ error: 'Gagal menautkan akun ke toko. Coba lagi.' }, 500)
  }

  return json({
    ok: true,
    user_id: created.user.id,
    email,
    role: newMember.role,
  })
})
