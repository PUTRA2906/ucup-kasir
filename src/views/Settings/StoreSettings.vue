<template>
  <AdminLayout>
    <PageBreadcrumb pageTitle="Pengaturan Toko" class="hidden md:block" />

    <!-- Mobile Header -->
    <div class="mb-6 flex items-center gap-3 pl-2 pr-4 md:hidden">
      <h1 class="text-2xl font-semibold text-gray-900 dark:text-white">Pengaturan Toko</h1>
    </div>

    <div v-if="loading && !settingsStore.loaded" class="flex items-center justify-center py-12">
      <div class="text-center">
        <svg class="mx-auto h-12 w-12 animate-spin text-brand-500" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p class="mt-4 text-sm text-gray-600 dark:text-gray-400">Memuat pengaturan...</p>
      </div>
    </div>

    <div v-else class="mx-auto max-w-3xl space-y-6">
      <!-- Informasi Toko -->
      <div class="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div class="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Informasi Toko</h3>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Data ini ditampilkan di invoice dan cetak struk</p>
        </div>
        <div class="space-y-4 p-6">
          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
              Nama Aplikasi
            </label>
            <input
              v-model="formData.store_name"
              type="text"
              class="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              placeholder="Ucup Kasir"
            />
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
              Nama Toko
            </label>
            <input
              v-model="formData.store_subtitle"
              type="text"
              class="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              placeholder="Toko Berkat Jaya Makmur"
            />
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
              Alamat
            </label>
            <textarea
              v-model="formData.store_address"
              rows="2"
              class="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              placeholder="Alamat toko"
            ></textarea>
          </div>
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                Telepon
              </label>
              <input
                v-model="formData.store_phone"
                type="text"
                class="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                placeholder="08xxxxxxxxxx"
              />
            </div>
            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                Email
              </label>
              <input
                v-model="formData.store_email"
                type="email"
                class="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                placeholder="toko@email.com"
              />
            </div>
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
              Footer Struk
            </label>
            <input
              v-model="formData.receipt_footer"
              type="text"
              class="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              placeholder="Terima kasih atas kunjungan Anda"
            />
          </div>
        </div>
      </div>

      <!-- Pengaturan Pajak -->
      <div class="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div class="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Pengaturan Pajak</h3>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Konfigurasi pajak untuk transaksi</p>
        </div>
        <div class="space-y-4 p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-700 dark:text-gray-300">Aktifkan Pajak</p>
              <p class="text-xs text-gray-500 dark:text-gray-400">Pajak akan ditambahkan ke total transaksi</p>
            </div>
            <button
              @click="formData.tax_enabled = !formData.tax_enabled"
              :class="[
                'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2',
                formData.tax_enabled ? 'bg-brand-500' : 'bg-gray-200 dark:bg-gray-700',
              ]"
            >
              <span
                :class="[
                  'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                  formData.tax_enabled ? 'translate-x-5' : 'translate-x-0',
                ]"
              />
            </button>
          </div>
          <div v-if="formData.tax_enabled">
            <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
              Tarif Pajak (%)
            </label>
            <input
              v-model.number="formData.tax_rate"
              type="number"
              min="0"
              max="100"
              step="0.5"
              class="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              placeholder="11"
            />
          </div>
        </div>
      </div>

      <!-- Pengaturan Tampilan -->
      <div class="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div class="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Tampilan</h3>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Pengaturan tampilan aplikasi</p>
        </div>
        <div class="space-y-4 p-6">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-700 dark:text-gray-300">Mode Gelap (Dark Mode)</p>
              <p class="text-xs text-gray-500 dark:text-gray-400">Gunakan tampilan gelap untuk kenyamanan mata</p>
            </div>
            <button
              @click="toggleTheme"
              :class="[
                'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2',
                isDarkMode ? 'bg-brand-500' : 'bg-gray-200 dark:bg-gray-700',
              ]"
            >
              <span
                :class="[
                  'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                  isDarkMode ? 'translate-x-5' : 'translate-x-0',
                ]"
              />
            </button>
          </div>
        </div>
      </div>

      <!-- Tombol Simpan -->
      <div class="flex justify-end">
        <button
          @click="handleSave"
          :disabled="saving"
          class="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-6 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
        >
          <svg v-if="saving" class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {{ saving ? 'Menyimpan...' : 'Simpan Pengaturan' }}
        </button>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import { useStoreSettingsStore } from '@/stores/storeSettings'
import { useToast } from '@/composables/useToast'
import { useTheme } from '@/components/layout/ThemeProvider.vue'

const settingsStore = useStoreSettingsStore()
const toast = useToast()
const { isDarkMode, toggleTheme } = useTheme()

const loading = ref(false)
const saving = ref(false)

const formData = reactive({
  store_name: '',
  store_subtitle: '',
  store_address: '',
  store_phone: '',
  store_email: '',
  tax_enabled: false,
  tax_rate: 0,
  receipt_footer: '',
})

const handleSave = async () => {
  saving.value = true
  try {
    await settingsStore.updateSettings({
      store_name: formData.store_name.trim() || 'Ucup Kasir',
      store_subtitle: formData.store_subtitle.trim() || 'Toko Berkat Jaya Makmur',
      store_address: formData.store_address.trim(),
      store_phone: formData.store_phone.trim(),
      store_email: formData.store_email.trim(),
      tax_enabled: formData.tax_enabled,
      tax_rate: formData.tax_rate,
      receipt_footer: formData.receipt_footer.trim(),
    })
    toast.success('Berhasil!', 'Pengaturan toko berhasil disimpan')
  } catch (error: any) {
    toast.error('Gagal!', error.message || 'Gagal menyimpan pengaturan')
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  loading.value = true
  await settingsStore.fetchSettings()
  const s = settingsStore.settings
  formData.store_name = s.store_name || ''
  formData.store_subtitle = s.store_subtitle || ''
  formData.store_address = s.store_address || ''
  formData.store_phone = s.store_phone || ''
  formData.store_email = s.store_email || ''
  formData.tax_enabled = s.tax_enabled || false
  formData.tax_rate = s.tax_rate || 0
  formData.receipt_footer = s.receipt_footer || ''
  loading.value = false
})
</script>
