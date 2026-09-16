<template>
  <AdminLayout hide-bottom-nav>
    <PageBreadcrumb pageTitle="Informasi Toko" class="hidden md:block" />
    <div class="mx-auto max-w-lg space-y-4 pb-8">
      <MobilePageHeader
        title="Informasi Toko"
        subtitle="Data ditampilkan pada invoice & struk"
        back-to="/settings"
      />

      <!-- Form -->
      <div class="space-y-3">

        <!-- Nama & Deskripsi -->
        <div class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h3 class="mb-3 text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Identitas Toko</h3>
          <div class="space-y-3">
            <div>
              <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Nama Toko <span class="text-red-500">*</span></label>
              <input
                v-model="form.store_name"
                type="text"
                placeholder="Ucup Kasir"
                class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
              />
            </div>
            <div>
              <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Deskripsi / Tagline</label>
              <input
                v-model="form.store_subtitle"
                type="text"
                placeholder="Toko kelontong terpercaya"
                class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
              />
            </div>
          </div>
        </div>

        <!-- Kontak -->
        <div class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h3 class="mb-3 text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Kontak</h3>
          <div class="space-y-3">
            <div>
              <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">No. WhatsApp / Telepon</label>
              <div class="relative">
                <div class="pointer-events-none absolute inset-y-0 left-3 flex items-center">
                  <svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <input
                  v-model="form.store_phone"
                  type="tel"
                  placeholder="081234567890"
                  class="w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-9 pr-3 font-mono text-sm text-gray-900 placeholder-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
                />
              </div>
            </div>
            <div>
              <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Email Toko</label>
              <div class="relative">
                <div class="pointer-events-none absolute inset-y-0 left-3 flex items-center">
                  <svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <input
                  v-model="form.store_email"
                  type="email"
                  placeholder="toko@email.com"
                  class="w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-9 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Alamat -->
        <div class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h3 class="mb-3 text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Alamat</h3>
          <textarea
            v-model="form.store_address"
            rows="3"
            placeholder="Jl. Contoh No. 1, Banyuwangi"
            class="w-full resize-none rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
          ></textarea>
        </div>

        <!-- Footer Struk -->
        <div class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h3 class="mb-1 text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Footer Struk / Invoice</h3>
          <p class="mb-3 text-[10px] text-gray-400 dark:text-gray-500">Teks yang tampil di bagian bawah nota cetak</p>
          <input
            v-model="form.receipt_footer"
            type="text"
            placeholder="Terima kasih atas kunjungan Anda"
            class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
          />
        </div>

        <!-- Tombol Simpan -->
        <button
          @click="save"
          :disabled="saving"
          class="w-full rounded-2xl bg-brand-600 py-3.5 text-sm font-bold text-white shadow-md transition active:scale-[0.98] disabled:opacity-50"
        >
          <span v-if="saving" class="flex items-center justify-center gap-2">
            <svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Menyimpan...
          </span>
          <span v-else>Simpan Informasi Toko</span>
        </button>

      </div>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import MobilePageHeader from '@/components/common/MobilePageHeader.vue'
import { useStoreSettingsStore } from '@/stores/storeSettings'
import { useToast } from '@/composables/useToast'

const settingsStore = useStoreSettingsStore()
const toast = useToast()

const saving = ref(false)

const form = reactive({
  store_name: '',
  store_subtitle: '',
  store_phone: '',
  store_email: '',
  store_address: '',
  receipt_footer: '',
})

async function save() {
  if (!form.store_name.trim()) {
    toast.error('Gagal!', 'Nama toko tidak boleh kosong')
    return
  }
  saving.value = true
  try {
    await settingsStore.updateSettings({
      store_name: form.store_name.trim(),
      store_subtitle: form.store_subtitle.trim(),
      store_phone: form.store_phone.trim(),
      store_email: form.store_email.trim(),
      store_address: form.store_address.trim(),
      receipt_footer: form.receipt_footer.trim(),
    })
    toast.success('Berhasil!', 'Informasi toko berhasil disimpan')
  } catch (e: any) {
    toast.error('Gagal!', e.message || 'Gagal menyimpan')
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  await settingsStore.fetchSettings()
  const s = settingsStore.settings
  form.store_name = s.store_name || ''
  form.store_subtitle = s.store_subtitle || ''
  form.store_phone = s.store_phone || ''
  form.store_email = s.store_email || ''
  form.store_address = s.store_address || ''
  form.receipt_footer = s.receipt_footer || ''
})
</script>
