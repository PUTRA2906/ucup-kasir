<template>
  <AdminLayout>
    <PageBreadcrumb pageTitle="Detail Kategori" class="hidden md:block" />

    <!-- Mobile Header with Back Button -->
    <div class="mb-6 flex items-center gap-3 pl-2 pr-4 md:hidden">
      <button
        @click="router.push('/categories')"
        class="flex h-10 w-10 items-center justify-center rounded-lg text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/[0.03]"
      >
        <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <h1 class="text-2xl font-semibold text-gray-900 dark:text-white">Detail Kategori</h1>
    </div>

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
      <!-- Info Card -->
      <ComponentCard title="Informasi Kategori" desc="Detail lengkap kategori">
        <div class="space-y-6">
          <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-400">Nama Kategori</label>
              <p class="mt-1 text-base font-semibold text-gray-900 dark:text-white">{{ category.name }}</p>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-400">Jumlah Produk</label>
              <p class="mt-1 text-base font-semibold text-brand-600 dark:text-brand-500">
                {{ productCount }} produk
              </p>
            </div>
          </div>

          <div v-if="category.description">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-400">Deskripsi</label>
            <p class="mt-1 text-base text-gray-900 dark:text-white">{{ category.description }}</p>
          </div>

          <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-400">Dibuat Pada</label>
              <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {{ formatDate(category.created_at) }}
              </p>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-400">Terakhir Diupdate</label>
              <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {{ formatDate(category.updated_at) }}
              </p>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="mt-6 flex gap-3 border-t border-gray-100 pt-6 dark:border-gray-800">
          <button
            @click="router.push(`/categories/edit/${categoryId}`)"
            class="rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-600 focus:outline-hidden focus:ring-3 focus:ring-brand-500/30"
          >
            Edit Kategori
          </button>
          <button
            @click="showDeleteDialog = true"
            class="rounded-lg border border-error-500 bg-transparent px-5 py-2.5 text-sm font-medium text-error-600 hover:bg-error-50 focus:outline-hidden focus:ring-3 focus:ring-error-500/30 dark:text-error-500 dark:hover:bg-error-500/15"
          >
            Hapus Kategori
          </button>
          <button
            @click="router.push('/categories')"
            class="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-white/[0.03]"
          >
            Kembali
          </button>
        </div>
      </ComponentCard>
    </div>

    <div v-else class="rounded-xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-gray-900">
      <p class="text-gray-600 dark:text-gray-400">Kategori tidak ditemukan</p>
      <button
        @click="router.push('/categories')"
        class="mt-4 rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-600"
      >
        Kembali ke Daftar Kategori
      </button>
    </div>

    <!-- Delete Confirmation Dialog -->
    <ConfirmDialog
      v-model="showDeleteDialog"
      title="Hapus Kategori?"
      :message="`Apakah Anda yakin ingin menghapus kategori '${category?.name}'? Tindakan ini tidak dapat dibatalkan.`"
      confirm-text="Ya, Hapus"
      cancel-text="Batal"
      variant="danger"
      @confirm="confirmDelete"
    />
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import { useCategoriesStore } from '@/stores/categories'
import { useProductsStore } from '@/stores/products'
import { useToast } from '@/composables/useToast'

const router = useRouter()
const route = useRoute()
const categoriesStore = useCategoriesStore()
const productsStore = useProductsStore()
const toast = useToast()

const categoryId = route.params.id as string
const category = ref<any>(null)
const loading = ref(true)
const showDeleteDialog = ref(false)

const productCount = computed(() => {
  return productsStore.products.filter(p => p.category_id === categoryId).length
})

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const confirmDelete = async () => {
  try {
    await categoriesStore.deleteCategory(categoryId)
    toast.success('Berhasil!', 'Kategori berhasil dihapus')
    router.push('/categories')
  } catch (error) {
    console.error('Error deleting category:', error)
    toast.error('Gagal!', 'Gagal menghapus kategori')
  }
}

onMounted(async () => {
  try {
    await productsStore.fetchProducts()
    category.value = await categoriesStore.getCategory(categoryId)
  } catch (error) {
    console.error('Error loading category:', error)
    toast.error('Gagal!', 'Gagal memuat data kategori')
  } finally {
    loading.value = false
  }
})
</script>
