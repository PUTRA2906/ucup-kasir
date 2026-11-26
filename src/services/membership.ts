/**
 * Memuat keanggotaan (role) & permission user yang login.
 *
 * Sumber kebenaran tetap database: RLS + `has_permission()` di dalam RPC.
 * Hasil di sini hanya dipakai UI untuk menyembunyikan menu/tombol.
 *
 * Kenapa ada cache: aplikasi ini offline-first. Saat offline, `store_members`
 * tidak bisa dibaca, dan tanpa cache seluruh menu akan hilang. Cache disimpan
 * per user id + versi, sehingga tidak bocor antar-akun di perangkat yang sama.
 */
import { supabase } from '@/lib/supabase'
import {
  MEMBERSHIP_CACHE_VERSION,
  isPermission,
  isRole,
  type Permission,
  type Role,
} from '@/constants/permissions'

export interface Membership {
  storeId: string | null
  role: Role | null
  permissions: Permission[]
}

/** Fail-closed: tidak ada keanggotaan → tidak ada hak apa pun. */
export const EMPTY_MEMBERSHIP: Membership = {
  storeId: null,
  role: null,
  permissions: [],
}

function cacheKey(userId: string): string {
  return `ucup:membership:v${MEMBERSHIP_CACHE_VERSION}:${userId}`
}

interface CachedMembership extends Membership {
  cachedAt: number
}

export function readCachedMembership(userId: string): Membership | null {
  try {
    const raw = localStorage.getItem(cacheKey(userId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<CachedMembership>
    if (parsed?.cachedAt == null) return null
    const permissions = Array.isArray(parsed.permissions)
      ? parsed.permissions.filter(isPermission)
      : []
    return {
      storeId: typeof parsed.storeId === 'string' ? parsed.storeId : null,
      role: isRole(parsed.role) ? parsed.role : null,
      permissions,
    }
  } catch {
    return null
  }
}

export function writeCachedMembership(userId: string, membership: Membership): void {
  try {
    const payload: CachedMembership = { ...membership, cachedAt: Date.now() }
    localStorage.setItem(cacheKey(userId), JSON.stringify(payload))
  } catch {
    // localStorage penuh / tidak tersedia — cache hanya optimasi.
  }
}

export function clearCachedMembership(userId: string): void {
  try {
    localStorage.removeItem(cacheKey(userId))
  } catch {
    // abaikan
  }
}

/**
 * Ambil keanggotaan aktif dari server.
 *
 * `current_store_id()` di database memilih keanggotaan aktif paling awal
 * (`order by created_at limit 1`); query ini meniru aturan yang sama supaya
 * UI dan RLS tidak pernah menunjuk toko berbeda.
 *
 * Return `null` bila query gagal (jaringan/RLS) — pemanggil yang memutuskan
 * mau memakai cache atau fail-closed.
 */
export async function fetchMembership(userId: string): Promise<Membership | null> {
  const { data: members, error: memberError } = await supabase
    .from('store_members')
    .select('store_id, role')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .limit(1)

  if (memberError) return null

  const member = members?.[0]
  if (!member) {
    // Login berhasil tapi belum jadi anggota toko mana pun → fail-closed.
    return EMPTY_MEMBERSHIP
  }
  if (!isRole(member.role)) return EMPTY_MEMBERSHIP

  const { data: rows, error: permError } = await supabase
    .from('role_permissions')
    .select('permission')
    .eq('role', member.role)

  if (permError) return null

  const permissions = (rows ?? [])
    .map((r: { permission?: unknown }) => r.permission)
    .filter(isPermission)

  return {
    storeId: typeof member.store_id === 'string' ? member.store_id : null,
    role: member.role,
    permissions,
  }
}
