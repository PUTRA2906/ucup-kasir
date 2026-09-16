<template>
  <AdminLayout hide-bottom-nav>
    <PageBreadcrumb pageTitle="Variabel Global" class="hidden md:block" />
    <div class="mx-auto max-w-lg space-y-4 pb-8">
      <MobilePageHeader
        title="Variabel Global"
        subtitle="Limit kredit & upah bongkar muat"
        back-to="/settings"
      />

      <!-- Limit Kredit Customer -->
      <div class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h3 class="mb-1 text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Limit Kredit Customer</h3>
        <p class="mb-3 text-[10px] text-gray-400 dark:text-gray-500">Batas kredit default untuk semua customer. Customer bisa diatur limit khusus di halaman detail customer.</p>
        <div class="space-y-3">
          <div>
            <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Limit Kredit Default</label>
            <div class="relative">
              <span class="pointer-events-none absolute inset-y-0 left-3 flex items-center text-xs font-semibold text-gray-400 dark:text-gray-500">Rp</span>
              <CurrencyInput
                v-model="form.default_credit_limit"
                class="w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-8 pr-3 text-sm font-semibold text-gray-900 placeholder-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
                placeholder="0"
              />
            </div>
          </div>
          <button
            @click="saveCredit"
            :disabled="savingCredit"
            class="w-full rounded-xl bg-cyan-500 py-2.5 text-xs font-bold text-white shadow-md transition active:scale-[0.98] disabled:opacity-50"
          >
            <span v-if="savingCredit" class="flex items-center justify-center gap-2">
              <svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Menyimpan...
            </span>
            <span v-else>Simpan Limit Kredit</span>
          </button>
        </div>
      </div>

      <!-- Upah Bongkar Muat -->
      <div class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h3 class="mb-1 text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Upah Bongkar Muat</h3>
        <p class="mb-3 text-[10px] text-gray-400 dark:text-gray-500">Tarif ini otomatis terisi sebagai harga per unit pada item muatan di surat jalan, dan menjadi dasar perhitungan upah tim bongkar muat di payroll. Masih bisa diubah manual per item.</p>
        <div class="space-y-3">
          <div>
            <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Upah per Karung</label>
            <div class="relative">
              <span class="pointer-events-none absolute inset-y-0 left-3 flex items-center text-xs font-semibold text-gray-400 dark:text-gray-500">Rp</span>
              <CurrencyInput
                v-model="form.loading_rate_per_sack"
                class="w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-8 pr-3 text-sm font-semibold text-gray-900 placeholder-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
                placeholder="0"
              />
            </div>
          </div>
          <button
            @click="saveUpah"
            :disabled="savingUpah"
            class="w-full rounded-xl bg-emerald-500 py-2.5 text-xs font-bold text-white shadow-md transition active:scale-[0.98] disabled:opacity-50"
          >
            <span v-if="savingUpah" class="flex items-center justify-center gap-2">
              <svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Menyimpan...
            </span>
            <span v-else>Simpan Upah per Karung</span>
          </button>
        </div>
      </div>

    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import MobilePageHeader from '@/components/common/MobilePageHeader.vue'
import CurrencyInput from '@/components/common/CurrencyInput.vue'
import { useStoreSettingsStore } from '@/stores/storeSettings'
import { useToast } from '@/composables/useToast'

const settingsStore = useStoreSettingsStore()
const toast = useToast()

const savingCredit = ref(false)
const savingUpah = ref(false)

const form = reactive({
  default_credit_limit: 0,
  loading_rate_per_sack: 0,
})

async function saveCredit() {
  savingCredit.value = true
  try {
    await settingsStore.updateSettings({
      default_credit_limit: form.default_credit_limit || 0,
    })
    toast.success('Berhasil!', 'Limit kredit berhasil disimpan')
  } catch (e: any) {
    toast.error('Gagal!', e.message || 'Gagal menyimpan limit kredit')
  } finally {
    savingCredit.value = false
  }
}

async function saveUpah() {
  savingUpah.value = true
  try {
    await settingsStore.updateSettings({
      loading_rate_per_sack: form.loading_rate_per_sack || 0,
    })
    toast.success('Berhasil!', 'Tarif upah per karung berhasil disimpan')
  } catch (e: any) {
    toast.error('Gagal!', e.message || 'Gagal menyimpan tarif upah')
  } finally {
    savingUpah.value = false
  }
}

onMounted(async () => {
  await settingsStore.fetchSettings()
  const s = settingsStore.settings
  form.default_credit_limit = s.default_credit_limit || 0
  form.loading_rate_per_sack = s.loading_rate_per_sack || 0
})
</script>
