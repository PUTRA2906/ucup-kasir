<template>
  <AdminLayout>
    <PageBreadcrumb pageTitle="Edit Kategori" class="hidden md:block" />

    <!-- Mobile Header -->
    <MobilePageHeader title="Edit Kategori" icon-type="close" @back="showConfirmDialog = true" />

    <div v-if="loading" class="flex items-center justify-center py-12">
      <div class="text-center">
        <svg class="mx-auto h-12 w-12 animate-spin text-brand-500" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p class="mt-4 text-sm text-gray-600 dark:text-gray-400">Memuat data kategori...</p>
      </div>
    </div>

    <div v-else-if="category" class="space-y-6">
      <!-- Form Card -->
      <ComponentCard title="Edit Informasi Kategori" desc="Perbarui detail kategori">
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
              {{ isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan' }}
            </button>
          </div>
        </form>
      </ComponentCard>
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
import MobilePageHeader from '@/components/common/MobilePageHeader.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import { useCategoriesStore } from '@/stores/categories'
import { useToast } from '@/composables/useToast'

const router = useRouter()
const route = useRoute()
const categoriesStore = useCategoriesStore()
const toast = useToast()

const categoryId = route.params.id as string
const category = ref<any>(null)
const loading = ref(true)
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
    await categoriesStore.updateCategory(categoryId, {
      name: formData.name,
      description: formData.description || undefined
    })
    toast.success('Berhasil!', 'Kategori berhasil diperbarui')
    setTimeout(() => {
      router.push('/categories')
    }, 1000)
  } catch (error) {
    console.error('Error updating category:', error)
    toast.error('Gagal!', 'Gagal memperbarui kategori. Silakan coba lagi.')
  } finally {
    isSubmitting.value = false
  }
}

const handleConfirmCancel = () => {
  router.push('/categories')
}

onMounted(async () => {
  try {
    category.value = await categoriesStore.getCategory(categoryId)

    if (category.value) {
      formData.name = category.value.name
      formData.description = category.value.description || ''
    }
  } catch (error) {
    console.error('Error loading category:', error)
    toast.error('Gagal!', 'Gagal memuat data kategori')
  } finally {
    loading.value = false
  }
})
</script>
