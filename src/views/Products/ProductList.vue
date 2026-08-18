<template>
  <AdminLayout>
    <PageBreadcrumb pageTitle="Daftar Produk" class="hidden md:block" />
    <div class="space-y-6 px-4 md:px-0">
      <!-- DataTable -->
      <DataTable
        :columns="columns"
        :data="formattedProducts"
        :per-page="10"
        :searchable="true"
        :show-filter="true"
        :show-add-button="true"
        add-button-text="Tambah Produk"
        title="Produk Barang"
        :subtitle="`${settingsStore.storeSubtitle} - ${productsStore.products.length} Produk barang`"
        :show-import-button="true"
        :show-export-button="true"
        :category-options="categoryOptions"
        @add-click="addProduct"
        @menu-action="handleMenuAction"
        @import-click="handleImport"
        @export-click="handleExport"
        @category-change="handleCategoryChange"
        @apply-filter="applyFilters"
      >
          <template #header-checkbox>
            <div class="flex items-center gap-2">
              <input
                ref="selectAllCheckbox"
                type="checkbox"
                :checked="allSelected"
                @change="toggleSelectAll"
                class="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
              />
            </div>
          </template>

          <template #mobile-header>
            <div class="flex items-center gap-3">
              <input
                type="checkbox"
                :checked="allSelected"
                @change="toggleSelectAll"
                class="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
              />
              <span class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Nama Produk
              </span>
            </div>
          </template>

          <template #mobile-summary="{ row }">
            <div class="flex items-center gap-3 min-w-0 flex-1">
              <input
                type="checkbox"
                v-model="selectedProducts"
                :value="row.id"
                class="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500 flex-shrink-0"
                @click.stop
              />
              <div class="min-w-0 flex-1">
                <p class="font-medium text-gray-900 truncate dark:text-white">{{ row.name }}</p>
              </div>
            </div>
          </template>

          <template #cell-checkbox="{ row }">
            <input
              type="checkbox"
              v-model="selectedProducts"
              :value="row.id"
              class="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
            />
          </template>

          <template #cell-image="{ row }">
            <img
              :src="row.image"
              :alt="row.name"
              class="h-12 w-12 rounded-lg object-cover"
            />
          </template>

          <template #cell-stock="{ value }">
            <span
              :class="[
                'font-medium',
                value > 10
                  ? 'text-success-600 dark:text-success-500'
                  : value > 0
                    ? 'text-warning-600 dark:text-warning-500'
                    : 'text-error-600 dark:text-error-500',
              ]"
            >
              {{ value }}
            </span>
          </template>

          <template #actions>
            <div v-if="selectedProducts.length > 0" class="flex items-center gap-2">
              <span class="text-sm text-gray-600 dark:text-gray-400">
                {{ selectedProducts.length }} dipilih
              </span>
              <button
                @click="bulkDelete"
                class="rounded-lg bg-error-500 px-4 py-2 text-sm font-medium text-white hover:bg-error-600"
              >
                Hapus
              </button>
            </div>
          </template>

          <template #rowActions="{ row }">
            <div class="flex items-center gap-2">
              <button
                @click="viewProduct(row)"
                class="rounded-lg p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/[0.03]"
                title="Detail"
              >
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
              </button>
              <button
                @click="editProduct(row)"
                class="rounded-lg p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/[0.03]"
                title="Edit"
              >
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </button>
              <button
                @click="deleteProduct(row)"
                class="rounded-lg p-2 text-error-600 hover:bg-error-50 dark:text-error-500 dark:hover:bg-error-500/15"
                title="Hapus"
              >
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </div>
          </template>
        </DataTable>
    </div>

    <!-- Delete Confirmation Dialog -->
    <ConfirmDialog
      v-model="showDeleteDialog"
      title="Hapus Produk?"
      :message="`Apakah Anda yakin ingin menghapus produk '${productToDelete?.name}'? Tindakan ini tidak dapat dibatalkan.`"
      confirm-text="Ya, Hapus"
      cancel-text="Batal"
      variant="danger"
      @confirm="confirmDelete"
    />

    <!-- Bulk Delete Confirmation Dialog -->
    <ConfirmDialog
      v-model="showBulkDeleteDialog"
      title="Hapus Produk Terpilih?"
      :message="`Apakah Anda yakin ingin menghapus ${selectedProducts.length} produk terpilih? Tindakan ini tidak dapat dibatalkan.`"
      confirm-text="Ya, Hapus Semua"
      cancel-text="Batal"
      variant="danger"
      @confirm="confirmBulkDelete"
    />
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, computed, watchEffect, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import DataTable from '@/components/tables/DataTable.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import FilterModal from '@/components/common/FilterModal.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import { useProductsStore } from '@/stores/products'
import { useCategoriesStore } from '@/stores/categories'
import { useStoreSettingsStore } from '@/stores/storeSettings'
import { useToast } from '@/composables/useToast'

const router = useRouter()
const productsStore = useProductsStore()
const categoriesStore = useCategoriesStore()
const settingsStore = useStoreSettingsStore()
const toast = useToast()

const selectedProducts = ref<string[]>([])
const searchQuery = ref('')
const selectAllCheckbox = ref<HTMLInputElement | null>(null)
const showFilterModal = ref(false)
const showDeleteDialog = ref(false)
const showBulkDeleteDialog = ref(false)
const productToDelete = ref<any>(null)
const filters = ref({ category: '', status: '', stock: '' })
const statusFilter = ref('')

// Category options for desktop dropdown
const categoryOptions = computed(() => [
  { value: '', label: 'Semua Kategori' },
  ...categoriesStore.categories.map(cat => ({
    value: cat.id,
    label: cat.name
  }))
])

// Computed untuk mengecek apakah semua produk dipilih
const allSelected = computed(() => {
  return productsStore.products.length > 0 && selectedProducts.value.length === productsStore.products.length
})

// Computed untuk mengecek apakah ada sebagian produk dipilih
const someSelected = computed(() => {
  return selectedProducts.value.length > 0 && selectedProducts.value.length < productsStore.products.length
})

// Watch untuk set indeterminate state
watchEffect(() => {
  if (selectAllCheckbox.value) {
    selectAllCheckbox.value.indeterminate = someSelected.value
  }
})

// Fungsi toggle select all
const toggleSelectAll = () => {
  if (allSelected.value) {
    selectedProducts.value = []
  } else {
    selectedProducts.value = productsStore.products.map(p => p.id)
  }
}

// Terapkan filter kategori, status, dan stok
const applyFilters = (filterValues: any) => {
  filters.value = filterValues
}

// Format products untuk datatable (dengan filter diterapkan)
const formattedProducts = computed(() => {
  let result = productsStore.products

  // Filter kategori
  if (filters.value.category) {
    result = result.filter((p) => p.category_id === filters.value.category)
  }

  // Filter status
  if (filters.value.status) {
    result = result.filter((p) =>
      filters.value.status === 'Aktif' ? p.is_active : !p.is_active
    )
  }

  // Filter stok
  if (filters.value.stock) {
    result = result.filter((p) => {
      if (filters.value.stock === 'high') return p.stock > 10
      if (filters.value.stock === 'medium') return p.stock >= 1 && p.stock <= 10
      if (filters.value.stock === 'low') return p.stock === 0
      return true
    })
  }

  return result.map(product => ({
    ...product,
    category: product.category?.name || '-'
  }))
})

const columns = [
  { key: 'checkbox', label: 'Pilih', width: 'w-1/12' },
  { key: 'name', label: 'NAMA PRODUK', sortable: true, width: 'w-2/12' },
  { key: 'sku', label: 'SKU', sortable: true, width: 'w-1/12' },
  { key: 'category', label: 'KATEGORI', sortable: true, width: 'w-1/12' },
  { key: 'price_buy', label: 'HARGA BELI', sortable: true, format: 'currency' as const, width: 'w-2/12' },
  { key: 'price_sell', label: 'HARGA JUAL', sortable: true, format: 'currency' as const, width: 'w-2/12' },
  { key: 'stock', label: 'STOK', sortable: true, width: 'w-1/12' },
]

onMounted(async () => {
  try {
    await Promise.all([
      productsStore.fetchProducts(),
      categoriesStore.fetchCategories()
    ])
  } catch (error) {
    console.error('Error loading data:', error)
    alert('Gagal memuat data. Silakan refresh halaman.')
  }
})

const addProduct = () => {
  router.push('/products/add')
}

const refreshData = () => {
  searchQuery.value = ''
  selectedProducts.value = []
  alert('Data telah di-refresh')
}

const editProduct = (product: any) => {
  router.push(`/products/edit/${product.id}`)
}

const viewProduct = (product: any) => {
  router.push(`/products/${product.id}`)
}

const deleteProduct = async (product: any) => {
  productToDelete.value = product
  showDeleteDialog.value = true
}

const confirmDelete = async () => {
  if (!productToDelete.value) return

  try {
    await productsStore.deleteProduct(productToDelete.value.id)
    toast.success('Berhasil!', 'Produk berhasil dihapus')
  } catch (error) {
    console.error('Error deleting product:', error)
    toast.error('Gagal!', 'Gagal menghapus produk')
  } finally {
    productToDelete.value = null
  }
}

const bulkDelete = () => {
  showBulkDeleteDialog.value = true
}

const confirmBulkDelete = async () => {
  const count = selectedProducts.value.length
  try {
    await Promise.all(
      selectedProducts.value.map(id => productsStore.deleteProduct(id))
    )
    selectedProducts.value = []
    toast.success('Berhasil!', `${count} produk berhasil dihapus`)
  } catch (error) {
    console.error('Error deleting products:', error)
    toast.error('Gagal!', 'Gagal menghapus beberapa produk')
  }
}


const handleMenuAction = ({ action, row }: { action: string; row: any }) => {
  switch (action) {
    case 'detail':
      router.push(`/products/${row.id}`)
      break
    case 'edit':
      editProduct(row)
      break
    case 'outlet':
      alert(`Atur per outlet: ${row.name}`)
      break
    case 'delete':
      deleteProduct(row)
      break
  }
}



const handleImport = () => {
  alert('Fungsi impor data - akan dibuat nanti')
}

const handleExport = () => {
  alert('Fungsi ekspor data - akan dibuat nanti')
}

const handleCategoryChange = (category: string) => {
  filters.value.category = category
}
</script>
