import { supabase } from '@/lib/supabase'
import type { StoreSettings, StoreSettingsUpdate } from '@/types/database'

// ============================================================
// Supabase Service: Store Settings
//
// Sejak RBAC (migrasi 0002), tabel `store_settings` sudah dilebur ke
// `stores` (1 toko = 1 baris). Nama kolom pun berubah (store_name -> name,
// dst). Service ini adalah SATU-SATUNYA tempat translasi itu terjadi, supaya
// `StoreSettings` type & 17 view pemakainya tidak perlu diubah.
//
// Akses baris: RLS `stores_select` hanya mengembalikan toko milik user
// (id = current_store_id()), jadi tidak perlu filter user_id lagi.
// ============================================================

const DEFAULT_SETTINGS: Omit<StoreSettings, 'id' | 'created_at' | 'updated_at'> = {
  store_name: 'Ucup Kasir',
  store_subtitle: 'Toko Berkat Jaya Makmur',
  store_address: '',
  store_phone: '',
  store_email: '',
  tax_enabled: false,
  tax_rate: 0,
  currency: 'IDR',
  receipt_footer: 'Terima kasih atas kunjungan Anda',
  default_credit_limit: 0,
  loading_rate_per_sack: 0,
}

/** Baris `stores` -> bentuk `StoreSettings` (nama kolom lama). */
function fromStoreRow(r: any): StoreSettings {
  return {
    id: r.id,
    store_name: r.name ?? DEFAULT_SETTINGS.store_name,
    store_subtitle: r.subtitle ?? undefined,
    store_address: r.address ?? undefined,
    store_phone: r.phone ?? undefined,
    store_email: r.email ?? undefined,
    tax_enabled: !!r.tax_enabled,
    tax_rate: Number(r.tax_rate ?? 0),
    default_credit_limit: Number(r.default_credit_limit ?? 0),
    loading_rate_per_sack: Number(r.loading_rate_per_sack ?? 0),
    currency: r.currency ?? 'IDR',
    receipt_footer: r.receipt_footer ?? undefined,
    created_at: r.created_at,
    updated_at: r.updated_at,
  }
}

/** Bentuk `StoreSettingsUpdate` -> kolom tabel `stores` (hanya field yang dikirim). */
function toStorePatch(updates: StoreSettingsUpdate): Record<string, unknown> {
  const patch: Record<string, unknown> = {}
  if (updates.store_name !== undefined) patch.name = updates.store_name
  if (updates.store_subtitle !== undefined) patch.subtitle = updates.store_subtitle
  if (updates.store_address !== undefined) patch.address = updates.store_address
  if (updates.store_phone !== undefined) patch.phone = updates.store_phone
  if (updates.store_email !== undefined) patch.email = updates.store_email
  if (updates.tax_enabled !== undefined) patch.tax_enabled = updates.tax_enabled
  if (updates.tax_rate !== undefined) patch.tax_rate = updates.tax_rate
  if (updates.default_credit_limit !== undefined) patch.default_credit_limit = updates.default_credit_limit
  if (updates.loading_rate_per_sack !== undefined) patch.loading_rate_per_sack = updates.loading_rate_per_sack
  if (updates.currency !== undefined) patch.currency = updates.currency
  if (updates.receipt_footer !== undefined) patch.receipt_footer = updates.receipt_footer
  return patch
}

export const storeSettingsService = {
  async getSettings(): Promise<StoreSettings> {
    // RLS membatasi ke toko milik user; ambil satu baris.
    const { data, error } = await supabase
      .from('stores')
      .select('*')
      .limit(1)
      .maybeSingle()

    if (error) throw error
    if (!data) {
      // Toko belum ada (mis. user belum punya membership). Kembalikan default
      // agar aplikasi tetap tampil; jangan mencoba INSERT karena `stores`
      // dibuat oleh trigger saat signup.
      return {
        id: '',
        ...DEFAULT_SETTINGS,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    }
    return fromStoreRow(data)
  },

  async updateSettings(updates: StoreSettingsUpdate): Promise<StoreSettings> {
    const patch = toStorePatch(updates)
    if (Object.keys(patch).length === 0) {
      return this.getSettings()
    }
    patch.updated_at = new Date().toISOString()

    // Update baris toko milik user. RLS `stores_update` menuntut settings.write.
    const { data: current, error: readError } = await supabase
      .from('stores')
      .select('id')
      .limit(1)
      .maybeSingle()

    if (readError) throw readError
    if (!current) throw new Error('Toko tidak ditemukan untuk akun ini')

    const { data, error } = await supabase
      .from('stores')
      .update(patch)
      .eq('id', current.id)
      .select('*')
      .single()

    if (error) throw error
    return fromStoreRow(data)
  },
}
