<template>
  <AdminLayout>
    <PageBreadcrumb pageTitle="Data Table Advanced" />
    <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Data Table - Advanced</h1>
      <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
        Contoh advanced dengan loading state, bulk actions, dan export
      </p>
    </div>

    <!-- DataTable dengan Loading State -->
    <ComponentCard title="DataTable dengan Loading" desc="Menangani async data loading">
      <div class="space-y-4">
        <div class="flex gap-2">
          <button
            @click="loadData"
            class="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
          >
            Muat Data
          </button>
          <button
            @click="clearData"
            class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
          >
            Hapus Data
          </button>
        </div>

        <div v-if="loading" class="rounded-xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-white/[0.03]">
          <div class="flex items-center justify-center gap-2">
            <svg class="h-5 w-5 animate-spin text-brand-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span class="text-gray-600 dark:text-gray-400">Memuat data...</span>
          </div>
        </div>

        <DataTable v-else :columns="productColumns" :data="products" />
      </div>
    </ComponentCard>

    <!-- DataTable dengan Bulk Actions -->
    <ComponentCard title="Bulk Actions" desc="Pilih multiple rows dan lakukan aksi">
      <DataTable :columns="selectableColumns" :data="items">
        <template #cell-checkbox="{ row }">
          <input
            type="checkbox"
            v-model="selectedItems"
            :value="row.id"
            class="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
          />
        </template>

        <template #actions>
          <div v-if="selectedItems.length > 0" class="flex items-center gap-2">
            <span class="text-sm text-gray-600 dark:text-gray-400">
              {{ selectedItems.length }} dipilih
            </span>
            <button
              @click="bulkDelete"
              class="rounded-lg bg-error-500 px-4 py-2 text-sm font-medium text-white hover:bg-error-600"
            >
              Hapus Terpilih
            </button>
            <button
              @click="bulkExport"
              class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
            >
              Export
            </button>
          </div>
        </template>
      </DataTable>
    </ComponentCard>

    <!-- DataTable dengan Filter Lanjutan -->
    <ComponentCard title="Advanced Filter" desc="Filter berdasarkan kategori dan status">
      <div class="space-y-4">
        <div class="flex flex-wrap gap-4">
          <div>
            <label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Kategori
            </label>
            <select
              v-model="filterCategory"
              class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              <option value="">Semua Kategori</option>
              <option value="Elektronik">Elektronik</option>
              <option value="Makanan">Makanan</option>
              <option value="Pakaian">Pakaian</option>
            </select>
          </div>

          <div>
            <label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Status
            </label>
            <select
              v-model="filterStatus"
              class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              <option value="">Semua Status</option>
              <option value="Tersedia">Tersedia</option>
              <option value="Habis">Habis</option>
            </select>
          </div>
        </div>

        <DataTable :columns="productColumns" :data="filteredProducts" />
      </div>
    </ComponentCard>
    </div>

    <!-- Bulk Delete Confirmation Dialog -->
    <ConfirmDialog
      v-model="showBulkDeleteDialog"
      title="Hapus Item Terpilih?"
      :message="`Apakah Anda yakin ingin menghapus ${selectedItems.length} item terpilih? Tindakan ini tidak dapat dibatalkan.`"
      confirm-text="Ya, Hapus Semua"
      cancel-text="Batal"
      variant="danger"
      @confirm="confirmBulkDelete"
    />
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import DataTable from '@/components/tables/DataTable.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import { useToast } from '@/composables/useToast'

const toast = useToast()
const showBulkDeleteDialog = ref(false)

const loading = ref(false)
const selectedItems = ref<number[]>([])
const filterCategory = ref('')
const filterStatus = ref('')

const productColumns = [
  { key: 'name', label: 'Nama Produk', sortable: true, width: 'w-3/12' },
  { key: 'category', label: 'Kategori', sortable: true, width: 'w-2/12' },
  { key: 'price', label: 'Harga', sortable: true, format: 'currency' as const, width: 'w-2/12' },
  { key: 'stock', label: 'Stok', sortable: true, format: 'number' as const, width: 'w-2/12' },
  { key: 'status', label: 'Status', sortable: true, width: 'w-2/12' },
]

const selectableColumns = [
  { key: 'checkbox', label: '', width: 'w-1/12' },
  { key: 'name', label: 'Nama Produk', sortable: true, width: 'w-4/12' },
  { key: 'category', label: 'Kategori', sortable: true, width: 'w-3/12' },
  { key: 'price', label: 'Harga', sortable: true, format: 'currency' as const, width: 'w-3/12' },
]

const products = ref([
  { id: 1, name: 'Laptop Asus ROG', category: 'Elektronik', price: 15000000, stock: 5, status: 'Tersedia' },
  { id: 2, name: 'Mouse Gaming', category: 'Elektronik', price: 350000, stock: 0, status: 'Habis' },
  { id: 3, name: 'Keyboard Mechanical', category: 'Elektronik', price: 850000, stock: 12, status: 'Tersedia' },
  { id: 4, name: 'Kopi Arabica 100g', category: 'Makanan', price: 75000, stock: 25, status: 'Tersedia' },
  { id: 5, name: 'Teh Hijau 50g', category: 'Makanan', price: 35000, stock: 0, status: 'Habis' },
  { id: 6, name: 'Kaos Polos Premium', category: 'Pakaian', price: 125000, stock: 30, status: 'Tersedia' },
  { id: 7, name: 'Headset Gaming RGB', category: 'Elektronik', price: 650000, stock: 8, status: 'Tersedia' },
  { id: 8, name: 'Celana Jeans Slim', category: 'Pakaian', price: 350000, stock: 15, status: 'Tersedia' },
  { id: 9, name: 'Mie Instan Premium', category: 'Makanan', price: 25000, stock: 50, status: 'Tersedia' },
  { id: 10, name: 'Monitor LG 24 inch', category: 'Elektronik', price: 2500000, stock: 3, status: 'Tersedia' },
  { id: 11, name: 'Jaket Hoodie', category: 'Pakaian', price: 275000, stock: 20, status: 'Tersedia' },
  { id: 12, name: 'Cokelat Premium', category: 'Makanan', price: 45000, stock: 0, status: 'Habis' },
])

const items = ref([...products.value])

const filteredProducts = computed(() => {
  let result = [...products.value]

  if (filterCategory.value) {
    result = result.filter(p => p.category === filterCategory.value)
  }

  if (filterStatus.value) {
    result = result.filter(p => p.status === filterStatus.value)
  }

  return result
})

const loadData = () => {
  loading.value = true
  setTimeout(() => {
    loading.value = false
  }, 2000)
}

const clearData = () => {
  products.value = []
}

const bulkDelete = () => {
  showBulkDeleteDialog.value = true
}

const confirmBulkDelete = () => {
  const count = selectedItems.value.length
  items.value = items.value.filter(item => !selectedItems.value.includes(item.id))
  selectedItems.value = []
  toast.success('Berhasil!', `${count} item berhasil dihapus`)
}

const bulkExport = () => {
  const selected = items.value.filter(item => selectedItems.value.includes(item.id))
  console.log('Export data:', selected)
  toast.info('Export', `${selectedItems.value.length} item berhasil diekspor ke CSV`)
}
</script>
