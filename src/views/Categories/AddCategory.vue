<template>
  <AdminLayout>
    <PageBreadcrumb pageTitle="Tambah Kategori" class="hidden md:block" />

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
      <h1 class="text-2xl font-semibold text-gray-900 dark:text-white">Tambah Kategori</h1>
    </div>

    <div class="space-y-6">
      <!-- Form Card -->
      <ComponentCard title="Informasi Kategori" desc="Masukkan detail kategori baru">
        <form @submit.prevent="handleSubmit" class="space-y-6">
          <!-- Nama Kategori -->
          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
              Nama Kategori <span class="text-error-500">*</span>
            </label>
            <input
              type="text"
              v-model="formData.name"
              placeholder="Masukkan nama kategori"
              required
              class="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
            />
          </div>

          <!-- Deskripsi -->
          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
              Deskripsi Kategori
            </label>
            <textarea
              v-model="formData.description"
              rows="4"
              placeholder="Masukkan deskripsi kategori (opsional)"
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
              {{ isSubmitting ? 'Menyimpan...' : 'Simpan Kategori' }}
            </button>
          </div>
        </form>
      </ComponentCard>
    </div>

    <!-- Confirm Dialog -->
    <ConfirmDialog
      v-model="showConfirmDialog"
      title="Batalkan Penambahan Kategori?"
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
import { useCategoriesStore } from '@/stores/categories'
import { useToast } from '@/composables/useToast'

const router = useRouter()
const categoriesStore = useCategoriesStore()
const toast = useToast()
const showConfirmDialog = ref(false)
const isSubmitting = ref(false)

const formData = reactive({
  name: '',
  description: '',
})

const handleSubmit = async () => {
  if (isSubmitting.value) return

  isSubmitting.value = true
  try {
    await categoriesStore.createCategory({
      name: formData.name,
      description: formData.description || undefined
    })
    toast.success('Berhasil!', 'Kategori berhasil ditambahkan')
    setTimeout(() => {
      router.push('/categories')
    }, 1000)
  } catch (error) {
    console.error('Error creating category:', error)
    toast.error('Gagal!', 'Gagal menambahkan kategori. Silakan coba lagi.')
  } finally {
    isSubmitting.value = false
  }
}

const handleConfirmCancel = () => {
  router.push('/categories')
}
</script>
