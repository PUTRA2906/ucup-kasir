<template>
  <AdminLayout>
    <PageBreadcrumb pageTitle="Detail Produk" class="hidden md:block" />

    <!-- Mobile Header with Back Button -->
    <div class="mb-6 flex items-center gap-3 pl-2 pr-4 md:hidden">
      <button
        @click="router.push('/products')"
        class="flex h-10 w-10 items-center justify-center rounded-lg text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/[0.03]"
      >
        <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <h1 class="text-2xl font-semibold text-gray-900 dark:text-white">Detail Produk</h1>
    </div>

    <div v-if="loading" class="space-y-6">
      <LoadingSkeleton type="card" />
      <LoadingSkeleton type="card" />
    </div>

    <div v-else-if="product" class="space-y-4 md:space-y-6">
      <!-- Mobile Layout -->
      <div class="space-y-4 md:hidden">
        <!-- Nama & Status Card -->
        <div class="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <div class="flex items-start justify-between gap-3">
            <div class="flex-1 min-w-0">
              <h2 class="text-lg font-bold text-gray-900 break-words dark:text-white">{{ product.name }}</h2>
              <p v-if="product.sku" class="mt-1 text-xs text-gray-500 dark:text-gray-400">SKU: {{ product.sku }}</p>
            </div>
            <span
              :class="[
                'flex-shrink-0 rounded-full px-2.5 py-1 text-xs font-medium',
                product.is_active
                  ? 'bg-success-100 text-success-700 dark:bg-success-900 dark:text-success-400'
                  : 'bg-error-100 text-error-700 dark:bg-error-900 dark:text-error-400',
              ]"
            >
              {{ product.is_active ? 'Aktif' : 'Nonaktif' }}
            </span>
          </div>
        </div>

        <!-- Harga & Stok Card -->
        <div class="grid grid-cols-2 gap-3">
          <!-- Harga Beli -->
          <div class="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <p class="text-xs text-gray-500 dark:text-gray-400">Harga Beli</p>
            <p class="mt-1 text-base font-bold text-gray-900 dark:text-white">
              Rp {{ formatNumber(product.price_buy) }}
            </p>
          </div>

          <!-- Harga Jual -->
          <div class="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <p class="text-xs text-gray-500 dark:text-gray-400">Harga Jual</p>
            <p class="mt-1 text-base font-bold text-success-600 dark:text-success-500">
              Rp {{ formatNumber(product.price_sell) }}
            </p>
          </div>

          <!-- Stok -->
          <div class="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <p class="text-xs text-gray-500 dark:text-gray-400">Stok Tersedia</p>
            <p
              :class="[
                'mt-1 text-2xl font-bold',
                product.stock > 10
                  ? 'text-success-600 dark:text-success-500'
                  : product.stock > 0
                    ? 'text-warning-600 dark:text-warning-500'
                    : 'text-error-600 dark:text-error-500',
              ]"
            >
              {{ product.stock }}
            </p>
          </div>

          <!-- Kategori -->
          <div class="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <p class="text-xs text-gray-500 dark:text-gray-400">Kategori</p>
            <p class="mt-1 text-sm font-medium text-gray-900 dark:text-white">{{ product.category?.name || '-' }}</p>
          </div>
        </div>

        <!-- Info Tambahan Card -->
        <div class="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <h3 class="text-sm font-semibold text-gray-900 dark:text-white">Informasi Tambahan</h3>

          <div class="mt-3 space-y-3">
            <div v-if="product.barcode">
              <p class="text-xs text-gray-500 dark:text-gray-400">Barcode</p>
              <p class="mt-0.5 text-sm text-gray-900 dark:text-white">{{ product.barcode }}</p>
            </div>

            <div v-if="product.description">
              <p class="text-xs text-gray-500 dark:text-gray-400">Deskripsi</p>
              <p class="mt-0.5 text-sm text-gray-900 dark:text-white">{{ product.description }}</p>
            </div>

            <div class="pt-3 border-t border-gray-100 dark:border-gray-800">
              <div class="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p class="text-gray-500 dark:text-gray-400">Dibuat</p>
                  <p class="mt-0.5 text-gray-900 dark:text-white">{{ formatDateShort(product.created_at) }}</p>
                </div>
                <div>
                  <p class="text-gray-500 dark:text-gray-400">Diupdate</p>
                  <p class="mt-0.5 text-gray-900 dark:text-white">{{ formatDateShort(product.updated_at) }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Actions Mobile -->
        <div class="flex flex-col gap-3 pb-4">
          <button
            @click="router.push(`/products/edit/${productId}`)"
            class="w-full rounded-lg bg-brand-500 py-3 text-sm font-medium text-white hover:bg-brand-600 focus:outline-hidden focus:ring-3 focus:ring-brand-500/30"
          >
            Edit Produk
          </button>
          <button
            @click="showDeleteDialog = true"
            class="w-full rounded-lg border border-error-500 bg-transparent py-3 text-sm font-medium text-error-600 hover:bg-error-50 focus:outline-hidden focus:ring-3 focus:ring-error-500/30 dark:text-error-500 dark:hover:bg-error-500/15"
          >
            Hapus Produk
          </button>
        </div>
      </div>

      <!-- Desktop Layout -->
      <ComponentCard title="Informasi Produk" desc="Detail lengkap produk" class="hidden md:block">
        <div class="space-y-6">
          <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-400">Nama Produk</label>
              <p class="mt-1 text-base font-semibold text-gray-900 dark:text-white">{{ product.name }}</p>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-400">SKU</label>
              <p class="mt-1 text-base text-gray-900 dark:text-white">{{ product.sku || '-' }}</p>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-400">Kategori</label>
              <p class="mt-1 text-base text-gray-900 dark:text-white">{{ product.category?.name || '-' }}</p>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-400">Barcode</label>
              <p class="mt-1 text-base text-gray-900 dark:text-white">{{ product.barcode || '-' }}</p>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-400">Harga Beli</label>
              <p class="mt-1 text-base font-semibold text-gray-900 dark:text-white">
                Rp {{ formatNumber(product.price_buy) }}
              </p>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-400">Harga Jual</label>
              <p class="mt-1 text-base font-semibold text-success-600 dark:text-success-500">
                Rp {{ formatNumber(product.price_sell) }}
              </p>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-400">Stok</label>
              <p
                :class="[
                  'mt-1 text-base font-semibold',
                  product.stock > 10
                    ? 'text-success-600 dark:text-success-500'
                    : product.stock > 0
                      ? 'text-warning-600 dark:text-warning-500'
                      : 'text-error-600 dark:text-error-500',
                ]"
              >
                {{ product.stock }}
              </p>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-400">Status</label>
              <span
                :class="[
                  'mt-1 inline-flex rounded-full px-3 py-1 text-xs font-medium',
                  product.is_active
                    ? 'bg-success-100 text-success-700 dark:bg-success-900 dark:text-success-400'
                    : 'bg-error-100 text-error-700 dark:bg-error-900 dark:text-error-400',
                ]"
              >
                {{ product.is_active ? 'Aktif' : 'Tidak Aktif' }}
              </span>
            </div>
          </div>

          <div v-if="product.description">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-400">Deskripsi</label>
            <p class="mt-1 text-base text-gray-900 dark:text-white">{{ product.description }}</p>
          </div>

          <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-400">Dibuat Pada</label>
              <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {{ formatDate(product.created_at) }}
              </p>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-400">Terakhir Diupdate</label>
              <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {{ formatDate(product.updated_at) }}
              </p>
            </div>
          </div>
        </div>

        <!-- Actions Desktop -->
        <div class="mt-6 flex flex-col-reverse gap-3 border-t border-gray-100 pt-6 sm:flex-row sm:justify-end dark:border-gray-800">
          <button
            @click="showDeleteDialog = true"
            class="inline-flex w-full items-center justify-center rounded-lg border border-error-500 bg-transparent px-5 py-3 text-sm font-medium text-error-600 hover:bg-error-50 focus:outline-hidden focus:ring-3 focus:ring-error-500/30 sm:w-auto sm:py-2.5 dark:text-error-500 dark:hover:bg-error-500/15"
          >
            Hapus Produk
          </button>
          <button
            @click="router.push(`/products/edit/${productId}`)"
            class="inline-flex w-full items-center justify-center rounded-lg bg-brand-500 px-5 py-3 text-sm font-medium text-white hover:bg-brand-600 focus:outline-hidden focus:ring-3 focus:ring-brand-500/30 sm:w-auto sm:py-2.5"
          >
            Edit Produk
          </button>
          <button
            @click="router.push('/products')"
            class="hidden rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 sm:inline-flex dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-white/[0.03]"
          >
            Kembali
          </button>
        </div>
      </ComponentCard>
    </div>

    <div v-else class="rounded-xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-gray-900">
      <p class="text-gray-600 dark:text-gray-400">Produk tidak ditemukan</p>
      <button
        @click="router.push('/products')"
        class="mt-4 rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-600"
      >
        Kembali ke Daftar Produk
      </button>
    </div>

    <!-- Delete Confirmation Dialog -->
    <ConfirmDialog
      v-model="showDeleteDialog"
      title="Hapus Produk?"
      :message="`Apakah Anda yakin ingin menghapus produk '${product?.name}'? Tindakan ini tidak dapat dibatalkan.`"
      confirm-text="Ya, Hapus"
      cancel-text="Batal"
      variant="danger"
      @confirm="confirmDelete"
    />
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import { useProductsStore } from '@/stores/products'
import { useToast } from '@/composables/useToast'

const router = useRouter()
const route = useRoute()
const productsStore = useProductsStore()
const toast = useToast()

const productId = route.params.id as string
const product = ref<any>(null)
const loading = ref(true)
const showDeleteDialog = ref(false)

const formatNumber = (num: number) => {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

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

const formatDateShort = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

const confirmDelete = async () => {
  try {
    await productsStore.deleteProduct(productId)
    toast.success('Berhasil!', 'Produk berhasil dihapus')
    router.push('/products')
  } catch (error) {
    console.error('Error deleting product:', error)
    toast.error('Gagal!', 'Gagal menghapus produk')
  }
}

onMounted(async () => {
  try {
    product.value = await productsStore.getProduct(productId)
  } catch (error) {
    console.error('Error loading product:', error)
    toast.error('Gagal!', 'Gagal memuat data produk')
  } finally {
    loading.value = false
  }
})
</script>
