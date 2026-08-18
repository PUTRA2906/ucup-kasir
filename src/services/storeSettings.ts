import { supabase } from '@/lib/supabase'
import type { StoreSettings, StoreSettingsUpdate } from '@/types/database'

const DEFAULT_SETTINGS: Omit<StoreSettings, 'id' | 'user_id' | 'created_at' | 'updated_at'> = {
  store_name: 'Ucup Kasir',
  store_subtitle: 'Toko Berkat Jaya Makmur',
  store_address: '',
  store_phone: '',
  store_email: '',
  tax_enabled: false,
  tax_rate: 0,
  currency: 'IDR',
  receipt_footer: 'Terima kasih atas kunjungan Anda',
}

export const storeSettingsService = {
  async getSettings(): Promise<StoreSettings> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Tidak ada user yang login')

    const { data, error } = await supabase
      .from('store_settings')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error && error.code === 'PGRST116') {
      // Belum ada record, buat default
      const { data: created, error: insertError } = await supabase
        .from('store_settings')
        .insert({ user_id: user.id, ...DEFAULT_SETTINGS })
        .select()
        .single()

      if (insertError) throw insertError
      return created as StoreSettings
    }

    if (error) throw error
    return data as StoreSettings
  },

  async updateSettings(updates: StoreSettingsUpdate): Promise<StoreSettings> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Tidak ada user yang login')

    const { data, error } = await supabase
      .from('store_settings')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) throw error
    return data as StoreSettings
  },
}
