/**
 * Konteks toko aktif (tenant) untuk lapisan service.
 *
 * Sumber kebenaran tetap database (`current_store_id()` di RLS/RPC). Nilai di
 * sini hanya salinan untuk kenyamanan pemanggilan RPC yang butuh `p_store_id`,
 * dan diisi oleh `stores/auth.ts` saat keanggotaan dimuat.
 *
 * Jangan pernah memakai nilai ini sebagai kontrol keamanan — server tetap
 * memvalidasi tenant lewat RLS.
 */
import { supabase } from './supabase'

let cachedStoreId: string | null = null

export function setCurrentStoreId(id: string | null): void {
  cachedStoreId = id
}

export function getCurrentStoreId(): string | null {
  return cachedStoreId
}

/**
 * Ambil store id; bila cache kosong, tanyakan ke `store_members` (RLS
 * mengembalikan keanggotaan milik user yang login).
 */
export async function requireCurrentStoreId(): Promise<string | null> {
  if (cachedStoreId) return cachedStoreId
  try {
    const { data, error } = await supabase
      .from('store_members')
      .select('store_id')
      .eq('is_active', true)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()
    if (error) return null
    cachedStoreId = (data?.store_id as string) ?? null
    return cachedStoreId
  } catch {
    return null
  }
}
