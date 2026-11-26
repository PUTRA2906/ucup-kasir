import { supabase } from '@/lib/supabase'

// ============================================================
// Service: kelola pengguna toko (Fase 3F)
//
// Semua operasi lewat RPC SECURITY DEFINER yang dijaga `user.manage`
// (lihat supabase/migrations/0005_invites.sql). Tabel `store_invites`
// sengaja tidak punya policy, jadi tidak bisa diakses langsung dari klien.
//
// Pembuatan AKUN (baris auth.users) tidak bisa lewat RPC — butuh service_role.
// Itu tugas Edge Function `admin-create-user`, yang memverifikasi ulang
// permission pemanggil di server.
//
// Kenapa masih ada token undangan: trigger `handle_new_user` (0005) memakai
// token sebagai SATU-SATUNYA sumber role, karena metadata klien tidak boleh
// dipercaya. `createMemberAccount()` membuat token itu di belakang layar dan
// langsung memakainya — admin cukup mengisi nama, email, kata sandi, dan role.
// Token tidak pernah ditampilkan ke UI dan dihapus lagi bila pembuatan akun
// gagal, supaya tidak ada undangan menggantung.
//
// Service ini sengaja TIDAK didaftarkan di services/index.ts (tidak ada
// padanan SQLite): kelola akun hanya masuk akal saat online.
// ============================================================

export interface StoreMember {
  member_id: string
  user_id: string
  email: string | null
  display_name: string | null
  role: string
  is_active: boolean
  created_at: string
}

export interface StoreInvite {
  token: string
  email: string | null
  role: string
  expires_at: string
  created_at: string
}

export interface CreatedUser {
  ok: true
  user_id: string
  email: string
  role: string
}

/** Pesan error dari Edge Function bila respons bukan 2xx. */
async function extractFunctionError(error: unknown, fallback: string): Promise<string> {
  const err = error as { message?: string; context?: Response }
  const ctx = err?.context
  if (ctx && typeof ctx.json === 'function') {
    try {
      const body = await ctx.clone().json()
      if (body && typeof body.error === 'string') return body.error
    } catch {
      // body bukan JSON — pakai pesan bawaan
    }
  }
  return err?.message || fallback
}

export const storeUsersService = {
  async listMembers(): Promise<StoreMember[]> {
    const { data, error } = await supabase.rpc('list_store_members')
    if (error) throw error
    return (data ?? []) as StoreMember[]
  },

  async listInvites(): Promise<StoreInvite[]> {
    const { data, error } = await supabase.rpc('list_store_invites')
    if (error) throw error
    return (data ?? []) as StoreInvite[]
  },

  async createInvite(
    role: string,
    email?: string | null,
    expiresInDays = 7,
  ): Promise<{ token: string; expires_at: string }> {
    const { data, error } = await supabase.rpc('create_invite', {
      p_role: role,
      p_email: email?.trim() || null,
      p_expires_in_days: expiresInDays,
    })
    if (error) throw error
    const row = Array.isArray(data) ? data[0] : data
    if (!row?.token) throw new Error('Undangan gagal dibuat')
    return { token: row.token, expires_at: row.expires_at }
  },

  async revokeInvite(token: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('revoke_invite', { p_token: token })
    if (error) throw error
    return data === true
  },

  async updateMember(
    memberId: string,
    changes: { role?: string; isActive?: boolean },
  ): Promise<void> {
    const { error } = await supabase.rpc('update_store_member', {
      p_member_id: memberId,
      p_role: changes.role ?? null,
      p_is_active: changes.isActive ?? null,
    })
    if (error) throw error
  },

  /**
   * Buat akun login untuk pemegang undangan. Role & keanggotaan ditentukan
   * trigger `handle_new_user` dari baris undangan — bukan dari parameter ini.
   *
   * Tidak dipakai UI secara langsung; gunakan `createMemberAccount()`.
   */
  async createAccount(input: {
    token: string
    email: string
    password: string
    fullName?: string
  }): Promise<CreatedUser> {
    const { data, error } = await supabase.functions.invoke('admin-create-user', {
      body: {
        token: input.token,
        email: input.email,
        password: input.password,
        full_name: input.fullName?.trim() || undefined,
      },
    })

    if (error) {
      throw new Error(await extractFunctionError(error, 'Gagal membuat akun'))
    }
    if (!data || data.ok !== true) {
      throw new Error((data && data.error) || 'Gagal membuat akun')
    }
    return data as CreatedUser
  },

  /**
   * Alur satu langkah untuk UI: buat akun karyawan tanpa pernah menampilkan
   * token undangan.
   *
   *   1. `create_invite(role, email)` → token rahasia (server menentukan role)
   *   2. `admin-create-user` → akun dibuat, trigger memakai token untuk role
   *   3. bila langkah 2 gagal → token di-revoke supaya tidak menggantung
   */
  async createMemberAccount(input: {
    role: string
    email: string
    password: string
    fullName?: string
  }): Promise<CreatedUser> {
    const email = input.email.trim()
    const invite = await this.createInvite(input.role, email)

    try {
      return await this.createAccount({
        token: invite.token,
        email,
        password: input.password,
        fullName: input.fullName,
      })
    } catch (err) {
      // Bersihkan undangan agar daftar undangan tidak penuh sisa percobaan.
      try {
        await this.revokeInvite(invite.token)
      } catch {
        // Abaikan: token tetap kedaluwarsa sendiri (default 7 hari).
      }
      throw err
    }
  },
}
