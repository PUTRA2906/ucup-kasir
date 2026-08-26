import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { sqliteStoreSettingsService } from '@/services/sqlite/storeSettings'
import type { StoreSettings, StoreSettingsUpdate } from '@/types/database'

// Default values agar aplikasi tetap berjalan meski database belum siap
const DEFAULT_SETTINGS: StoreSettings = {
  id: '',
  store_name: 'Ucup Kasir',
  store_subtitle: 'Toko Berkat Jaya Makmur',
  store_address: '',
  store_phone: '',
  store_email: '',
  tax_enabled: false,
  tax_rate: 0,
  currency: 'IDR',
  receipt_footer: 'Terima kasih atas kunjungan Anda',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

export const useStoreSettingsStore = defineStore('storeSettings', () => {
  const settings = ref<StoreSettings>({ ...DEFAULT_SETTINGS })
  const loading = ref(false)
  const error = ref<string | null>(null)
  const loaded = ref(false)

  // Computed helpers
  const storeName = computed(() => settings.value.store_name || 'Ucup Kasir')
  const storeSubtitle = computed(() => settings.value.store_subtitle || 'Toko Berkat Jaya Makmur')
  const storeAddress = computed(() => settings.value.store_address || '')
  const storePhone = computed(() => settings.value.store_phone || '')
  const storeEmail = computed(() => settings.value.store_email || '')
  const taxEnabled = computed(() => settings.value.tax_enabled || false)
  const taxRate = computed(() => settings.value.tax_rate || 0)
  const receiptFooter = computed(() => settings.value.receipt_footer || 'Terima kasih atas kunjungan Anda')

  async function fetchSettings() {
    loading.value = true
    error.value = null
    try {
      settings.value = await sqliteStoreSettingsService.getSettings()
      loaded.value = true
    } catch (e: any) {
      error.value = e.message
      // Tetap pakai default values agar aplikasi berjalan
      settings.value = { ...DEFAULT_SETTINGS }
      loaded.value = true
    } finally {
      loading.value = false
    }
  }

  async function updateSettings(updates: StoreSettingsUpdate) {
    loading.value = true
    error.value = null
    try {
      settings.value = await sqliteStoreSettingsService.updateSettings(updates)
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  return {
    settings,
    loading,
    error,
    loaded,
    storeName,
    storeSubtitle,
    storeAddress,
    storePhone,
    storeEmail,
    taxEnabled,
    taxRate,
    receiptFooter,
    fetchSettings,
    updateSettings,
  }
})