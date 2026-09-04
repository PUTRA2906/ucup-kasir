<template>
  <AdminLayout>
    <PageBreadcrumb pageTitle="Tambah Customer" class="hidden md:block" />

    <!-- Mobile Header -->
    <MobilePageHeader title="Tambah Customer" subtitle="Isi data customer baru" @back="showConfirmDialog = true" />

    <div class="space-y-6">
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
import MobilePageHeader from '@/components/common/MobilePageHeader.vue'
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
