<template>
  <AdminLayout>
    <PageBreadcrumb pageTitle="Edit Customer" class="hidden md:block" />

    <!-- Mobile Header with Back Button -->
    <div class="mb-6 flex items-center gap-3 px-4 md:hidden">
      <button
        @click="showConfirmDialog = true"
        class="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-300 bg-white text-gray-500 transition hover:bg-gray-50 active:scale-95 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
      >
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <div class="flex-1">
        <h1 class="text-xl font-extrabold leading-tight tracking-tight text-gray-900 dark:text-white">
          EDIT CUSTOMER
        </h1>
        <p class="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
          Perbarui data customer
        </p>
      </div>
    </div>

    <div v-if="loading" class="flex items-center justify-center py-12">
      <div class="text-center">
        <svg class="mx-auto h-12 w-12 animate-spin text-brand-500" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p class="mt-4 text-sm text-gray-600 dark:text-gray-400">Memuat data customer...</p>
      </div>
    </div>

    <div v-else-if="customer" class="space-y-6 px-4 md:px-0">
      <!-- Mobile Form -->
      <form @submit.prevent="handleSubmit" class="space-y-4 md:hidden">
        <!-- Basic Info Card -->
        <div class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
          <h3 class="mb-3 text-sm font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Informasi Dasar
          </h3>
          <div class="space-y-4">
            <!-- Nama Customer -->
            <div>
              <label class="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-400">
                Nama Customer <span class="text-error-500">*</span>
              </label>
              <input
                type="text"
                v-model="formData.name"
                placeholder="Masukkan nama customer"
                required
                class="h-11 w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500"
              />
            </div>

            <!-- Nama Toko -->
            <div>
              <label class="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-400">
                Nama Toko
              </label>
              <input
                type="text"
                v-model="formData.storeName"
                placeholder="Nama toko (opsional)"
                class="h-11 w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500"
              />
            </div>
          </div>
        </div>

        <!-- Contact Card -->
        <div class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
          <h3 class="mb-3 text-sm font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Kontak & Lokasi
          </h3>
          <div class="space-y-4">
            <!-- Telepon -->
            <div>
              <label class="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-400">
                No. Telepon
              </label>
              <input
                type="tel"
                v-model="formData.phone"
                placeholder="Contoh: 0812-3456-7890"
                class="h-11 w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500"
              />
            </div>

            <!-- Kecamatan -->
            <div>
              <label class="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-400">
                Kecamatan <span class="text-error-500">*</span>
              </label>
              <KecamatanInput v-model="formData.kecamatan" :error="kecamatanError" />
              <p v-if="kecamatanError" class="mt-1.5 text-xs text-error-500">
                Kecamatan wajib diisi
              </p>
            </div>

            <!-- Alamat -->
            <div>
              <label class="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-400">
                Alamat Lengkap
              </label>
              <textarea
                v-model="formData.address"
                rows="3"
                placeholder="Alamat lengkap (opsional)"
                class="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500"
              ></textarea>
            </div>
          </div>
        </div>

        <!-- Notes Card -->
        <div class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
          <h3 class="mb-3 text-sm font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Catatan
          </h3>
          <textarea
            v-model="formData.notes"
            rows="3"
            placeholder="Catatan tambahan (opsional)"
            class="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500"
          ></textarea>
        </div>

        <!-- Action Buttons Mobile -->
        <div class="sticky bottom-4 z-10 flex gap-2">
          <button
            type="button"
            @click="showConfirmDialog = true"
            class="flex-1 rounded-xl border-2 border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 active:scale-95 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Batal
          </button>
          <button
            type="submit"
            :disabled="isSubmitting"
            class="flex-1 rounded-xl border border-brand-500 bg-brand-500 px-4 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-brand-600 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ isSubmitting ? 'Menyimpan...' : 'Simpan' }}
          </button>
        </div>
      </form>

      <!-- Desktop Form Card -->
      <div class="hidden md:block">
        <ComponentCard title="Edit Informasi Customer" desc="Perbarui detail customer">
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
              {{ isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan' }}
            </button>
          </div>
        </form>
        </ComponentCard>
      </div>
    </div>

    <!-- Confirm Dialog -->
    <ConfirmDialog
      v-model="showConfirmDialog"
      title="Batalkan Perubahan?"
      message="Perubahan yang sudah diisi akan hilang dan tidak dapat dikembalikan."
      confirm-text="Ya, Batalkan"
      cancel-text="Tidak"
      @confirm="handleConfirmCancel"
    />
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import KecamatanInput from '@/components/common/KecamatanInput.vue'
import { useCustomersStore } from '@/stores/customers'
import { useToast } from '@/composables/useToast'

const router = useRouter()
const route = useRoute()
const customersStore = useCustomersStore()
const toast = useToast()

const customerId = route.params.id as string
const customer = ref<any>(null)
const loading = ref(true)
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
    await customersStore.updateCustomer(customerId, {
      name: formData.name,
      store_name: formData.storeName.trim() || undefined,
      phone: formData.phone.trim() || undefined,
      kecamatan: formData.kecamatan || undefined,
      address: formData.address.trim() || undefined,
      notes: formData.notes.trim() || undefined
    })
    toast.success('Berhasil!', 'Customer berhasil diperbarui')
    setTimeout(() => {
      router.push('/customers')
    }, 1000)
  } catch (error) {
    console.error('Error updating customer:', error)
    toast.error('Gagal!', 'Gagal memperbarui customer. Silakan coba lagi.')
  } finally {
    isSubmitting.value = false
  }
}

const handleConfirmCancel = () => {
  router.push('/customers')
}

onMounted(async () => {
  try {
    customer.value = await customersStore.getCustomer(customerId)

    if (customer.value) {
      formData.name = customer.value.name
      formData.storeName = customer.value.store_name || ''
      formData.phone = customer.value.phone || ''
      formData.kecamatan = customer.value.kecamatan || ''
      formData.address = customer.value.address || ''
      formData.notes = customer.value.notes || ''
    }
  } catch (error) {
    console.error('Error loading customer:', error)
    toast.error('Gagal!', 'Gagal memuat data customer')
  } finally {
    loading.value = false
  }
})
</script>
