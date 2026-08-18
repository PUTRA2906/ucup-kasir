<template>
  <AdminLayout>
    <PageBreadcrumb pageTitle="Tambah Customer" class="hidden md:block" />

    <!-- Mobile Header with Close Button -->
    <div class="mb-6 flex items-center gap-3 pl-2 pr-4 md:hidden">
      <button
        @click="showConfirmDialog = true"
        class="flex h-10 w-10 items-center justify-center rounded-lg text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/[0.03]"
      >
        <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
      <h1 class="text-2xl font-semibold text-gray-900 dark:text-white">Tambah Customer</h1>
    </div>

    <div class="space-y-6">
      <!-- Form Card -->
      <ComponentCard title="Informasi Customer" desc="Masukkan detail customer baru">
        <form @submit.prevent="handleSubmit" class="space-y-6">
          <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
            <!-- Nama Customer -->
            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                Nama Customer <span class="text-error-500">*</span>
              </label>
              <input
                type="text"
                v-model="formData.name"
                placeholder="Masukkan nama customer"
                required
                class="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
              />
            </div>

            <!-- Nama Toko -->
            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                Nama Toko
              </label>
              <input
                type="text"
                v-model="formData.storeName"
                placeholder="Nama toko customer (opsional)"
                class="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
              />
            </div>

            <!-- Telepon -->
            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                No. Telepon
              </label>
              <input
                type="tel"
                v-model="formData.phone"
                placeholder="Contoh: 0812-3456-7890"
                class="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
              />
            </div>

            <!-- Kecamatan -->
            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                Kecamatan <span class="text-error-500">*</span>
              </label>
              <KecamatanInput v-model="formData.kecamatan" :error="kecamatanError" />
              <p v-if="kecamatanError" class="mt-1.5 text-xs text-error-500">
                Kecamatan wajib diisi
              </p>
            </div>
          </div>

          <!-- Alamat -->
          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
              Alamat
            </label>
            <textarea
              v-model="formData.address"
              rows="3"
              placeholder="Masukkan alamat customer (opsional)"
              class="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
            ></textarea>
          </div>

          <!-- Catatan -->
          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
              Catatan
            </label>
            <textarea
              v-model="formData.notes"
              rows="3"
              placeholder="Masukkan catatan customer (opsional)"
              class="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
            ></textarea>
          </div>

          <!-- Action Buttons -->
          <div class="flex items-center justify-end gap-3 border-t border-gray-100 pt-6 dark:border-gray-800">
            <button
              type="button"
              @click="showConfirmDialog = true"
              class="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-white/[0.03]"
            >
              Batal
            </button>
            <button
              type="submit"
              :disabled="isSubmitting"
              class="rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-600 focus:outline-hidden focus:ring-3 focus:ring-brand-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ isSubmitting ? 'Menyimpan...' : 'Simpan Customer' }}
            </button>
          </div>
        </form>
      </ComponentCard>
    </div>

    <!-- Confirm Dialog -->
    <ConfirmDialog
      v-model="showConfirmDialog"
      title="Batalkan Penambahan Customer?"
      message="Data yang sudah diisi akan hilang dan tidak dapat dikembalikan."
      confirm-text="Ya, Batalkan"
      cancel-text="Tidak"
      @confirm="handleConfirmCancel"
    />
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import KecamatanInput from '@/components/common/KecamatanInput.vue'
import { useCustomersStore } from '@/stores/customers'
import { useToast } from '@/composables/useToast'

const router = useRouter()
const customersStore = useCustomersStore()
const toast = useToast()
const showConfirmDialog = ref(false)
const isSubmitting = ref(false)
const kecamatanError = ref(false)

const formData = reactive({
  name: '',
  storeName: '',
  phone: '',
  kecamatan: '',
  address: '',
  notes: '',
})

const handleSubmit = async () => {
  if (isSubmitting.value) return

  // Validasi: kecamatan wajib
  if (!formData.kecamatan.trim()) {
    kecamatanError.value = true
    toast.error('Gagal!', 'Kecamatan wajib diisi')
    return
  }
  kecamatanError.value = false

  isSubmitting.value = true
  try {
    await customersStore.createCustomer({
      name: formData.name,
      store_name: formData.storeName.trim() || undefined,
      phone: formData.phone.trim() || undefined,
      kecamatan: formData.kecamatan || undefined,
      address: formData.address.trim() || undefined,
      notes: formData.notes.trim() || undefined
    })
    toast.success('Berhasil!', 'Customer berhasil ditambahkan')
    setTimeout(() => {
      router.push('/customers')
    }, 1000)
  } catch (error) {
    console.error('Error creating customer:', error)
    toast.error('Gagal!', 'Gagal menambahkan customer. Silakan coba lagi.')
  } finally {
    isSubmitting.value = false
  }
}

const handleConfirmCancel = () => {
  router.push('/customers')
}
</script>
