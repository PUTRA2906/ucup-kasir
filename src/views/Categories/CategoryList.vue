<template>
  <AdminLayout>
    <PageBreadcrumb pageTitle="Daftar Kategori" class="hidden md:block" />

    <!-- Mobile Header -->
    <MobilePageHeader title="Daftar Kategori" :subtitle="categoriesStore.categories.length + ' Kategori'" back-to="/">
      <template #actions>
        <button
          @click="addCategory"
          class="flex h-8 w-8 items-center justify-center rounded-xl border border-brand-500 bg-brand-500 text-white transition hover:bg-brand-600 active:scale-95"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </template>
    </MobilePageHeader>

    <!-- Mobile View: Search & Cards -->
      <div class="space-y-4 md:hidden">
        <!-- Search Bar -->
        <div class="relative">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Cari kategori..."
            class="w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
          />
          <svg class="absolute left-3 top-3 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <!-- Category Cards -->
        <div v-if="paginatedCategories.length === 0" class="rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 p-8 text-center dark:border-gray-700 dark:bg-gray-900/50">
          <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
          <p class="mt-4 text-sm font-medium text-gray-900 dark:text-white">
            {{ searchQuery ? 'Kategori tidak ditemukan' : 'Belum ada kategori' }}
          </p>
          <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {{ searchQuery ? 'Coba kata kunci lain' : 'Tambahkan kategori pertama Anda' }}
          </p>
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="category in paginatedCategories"
            :key="category.id"
            @click="viewCategory(category)"
            class="relative rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition active:scale-[0.98] dark:border-gray-800 dark:bg-white/[0.03]"
          >
            <div class="flex items-start justify-between">
              <div class="min-w-0 flex-1">
                <h3 class="font-semibold text-gray-900 dark:text-white">
                  {{ category.name }}
                </h3>
                
                <div class="mt-2 space-y-1">
                  <div class="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                    <svg class="h-3.5 w-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    <span class="font-medium text-brand-600 dark:text-brand-400">{{ category.productCount }} produk</span>
                  </div>
                </div>
              </div>

              <button
                @click.stop="showCategoryMenu(category, $event)"
                class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
              >
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- Pagination -->
        <div v-if="filteredCategories.length > 0" class="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-white/[0.03]">
          <div class="text-xs text-gray-600 dark:text-gray-400">
            {{ paginationInfo }}
          </div>
          <div class="flex items-center gap-2">
            <button
              @click="previousPage"
              :disabled="currentPage === 1"
              :class="[
                'flex h-8 w-8 items-center justify-center rounded-lg border transition active:scale-95',
                currentPage === 1
                  ? 'border-gray-200 bg-gray-100 text-gray-400 dark:border-gray-800 dark:bg-gray-800'
                  : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
              ]"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span class="text-sm font-medium text-gray-900 dark:text-white">
              {{ currentPage }} / {{ totalPages }}
            </span>
            <button
              @click="nextPage"
              :disabled="currentPage === totalPages"
              :class="[
                'flex h-8 w-8 items-center justify-center rounded-lg border transition active:scale-95',
                currentPage === totalPages
                  ? 'border-gray-200 bg-gray-100 text-gray-400 dark:border-gray-800 dark:bg-gray-800'
                  : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
              ]"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Mobile Popup Menu -->
      <teleport to="body">
        <div
          v-if="activeCategoryMenu"
          @click="closeCategoryMenu"
          class="fixed inset-0 z-40 md:hidden"
        ></div>
        <div
          v-if="activeCategoryMenu"
          class="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl border-t border-gray-200 bg-white p-4 shadow-2xl dark:border-gray-800 dark:bg-gray-900 md:hidden"
        >
          <div class="mb-4 flex items-center justify-center">
            <div class="h-1.5 w-12 rounded-full bg-gray-300 dark:bg-gray-700"></div>
          </div>
          <div class="space-y-2">
            <button
              @click="viewCategory(categoriesWithProductCount.find(c => c.id === activeCategoryMenu)); closeCategoryMenu()"
              class="flex w-full items-center gap-3 rounded-xl p-3 text-left text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <span class="font-medium">Detail</span>
            </button>
            <button
              @click="editCategory(categoriesWithProductCount.find(c => c.id === activeCategoryMenu)); closeCategoryMenu()"
              class="flex w-full items-center gap-3 rounded-xl p-3 text-left text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span class="font-medium">Edit</span>
            </button>
            <button
              @click="deleteCategory(categoriesWithProductCount.find(c => c.id === activeCategoryMenu)); closeCategoryMenu()"
              class="flex w-full items-center gap-3 rounded-xl p-3 text-left text-error-600 hover:bg-error-50 dark:text-error-500 dark:hover:bg-error-500/15"
            >
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span class="font-medium">Hapus</span>
            </button>
          </div>
        </div>
      </teleport>

      <!-- Desktop DataTable -->
      <DataTable
        class="hidden md:block"
        :columns="columns"
        :data="categoriesWithProductCount"
        :per-page="10"
        :searchable="true"

        :show-filter="false"
        :show-add-button="true"
        add-button-text="Tambah Kategori"
        title="Kategori Produk"
        :subtitle="`${settingsStore.storeSubtitle} - ${categoriesStore.categories.length} Kategori`"
        :show-import-button="true"
        :show-export-button="true"
        @add-click="addCategory"
        @menu-action="handleMenuAction"
        @import-click="handleImport"
        @export-click="handleExport"
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
              Nama Kategori
            </span>
          </div>
        </template>

        <template #mobile-summary="{ row }">
          <div class="flex items-center gap-3 min-w-0 flex-1">
            <input
              type="checkbox"
              v-model="selectedCategories"
              :value="row.id"
              class="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500 flex-shrink-0"
              @click.stop
            />
            <div class="min-w-0 flex-1">
              <p class="font-medium text-gray-900 truncate dark:text-white">{{ row.name }}</p>
              <p class="text-xs text-gray-500 truncate dark:text-gray-400">{{ row.productCount }} produk</p>
            </div>
          </div>
        </template>

        <template #cell-checkbox="{ row }">
          <input
            type="checkbox"
            v-model="selectedCategories"
            :value="row.id"
            class="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
          />
        </template>

        <template #cell-description="{ value }">
          <span v-if="value" class="text-gray-800 dark:text-white/90">{{ value }}</span>
          <span v-else class="text-gray-400 dark:text-gray-600">-</span>
        </template>

        <template #cell-productCount="{ value }">
          <span class="text-gray-800 dark:text-white/90">{{ value }} produk</span>
        </template>

        <template #actions>
          <div v-if="selectedCategories.length > 0" class="flex items-center gap-2">
            <span class="text-sm text-gray-600 dark:text-gray-400">
              {{ selectedCategories.length }} dipilih
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
                @click="viewCategory(row)"
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
                @click="editCategory(row)"
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
              @click="deleteCategory(row)"
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

    <!-- Delete Confirmation Dialog -->
    <ConfirmDialog
      v-model="showDeleteDialog"
      title="Hapus Kategori?"
      :message="`Apakah Anda yakin ingin menghapus kategori '${categoryToDelete?.name}'? Tindakan ini tidak dapat dibatalkan.`"
      confirm-text="Ya, Hapus"
      cancel-text="Batal"
      variant="danger"
      @confirm="confirmDelete"
    />

    <!-- Bulk Delete Confirmation Dialog -->
    <ConfirmDialog
      v-model="showBulkDeleteDialog"
      title="Hapus Kategori Terpilih?"
      :message="`Apakah Anda yakin ingin menghapus ${selectedCategories.length} kategori terpilih? Tindakan ini tidak dapat dibatalkan.`"
      confirm-text="Ya, Hapus Semua"
      cancel-text="Batal"
      variant="danger"
      @confirm="confirmBulkDelete"
    />

    <!-- Import CSV Modal -->
    <ImportCsvModal
      v-model="showImportModal"
      :accepted-hint="'.csv — kolom: Nama Kategori, Deskripsi'"
      @import="handleImportFile"
      @download-template="downloadImportTemplate"
    />
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, computed, watchEffect, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import DataTable from '@/components/tables/DataTable.vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import ImportCsvModal from '@/components/common/ImportCsvModal.vue'
import { useCategoriesStore } from '@/stores/categories'
import { useProductsStore } from '@/stores/products'
import { useStoreSettingsStore } from '@/stores/storeSettings'
import { useToast } from '@/composables/useToast'
import {
  downloadCsv,
  parseCsv,
  readFileAsText,
} from '@/composables/useCsv'
import type { CategoryInsert } from '@/types/database'

const router = useRouter()
const categoriesStore = useCategoriesStore()
const productsStore = useProductsStore()
const settingsStore = useStoreSettingsStore()
const toast = useToast()

const selectedCategories = ref<string[]>([])
const selectAllCheckbox = ref<HTMLInputElement | null>(null)
const showDeleteDialog = ref(false)
const showBulkDeleteDialog = ref(false)
const showImportModal = ref(false)
const categoryToDelete = ref<any>(null)

// Mobile states
const searchQuery = ref('')
const currentPage = ref(1)
const itemsPerPage = ref(10)
const activeCategoryMenu = ref<string | null>(null)

const allSelected = computed(() => {
  return categoriesStore.categories.length > 0 && selectedCategories.value.length === categoriesStore.categories.length
})

const someSelected = computed(() => {
  return selectedCategories.value.length > 0 && selectedCategories.value.length < categoriesStore.categories.length
})

watchEffect(() => {
  if (selectAllCheckbox.value) {
    selectAllCheckbox.value.indeterminate = someSelected.value
  }
})

const toggleSelectAll = () => {
  if (allSelected.value) {
    selectedCategories.value = []
  } else {
    selectedCategories.value = categoriesStore.categories.map(c => c.id)
  }
}

const columns = [
  { key: 'checkbox', label: 'Pilih', width: 'w-1/12' },
  { key: 'name', label: 'NAMA KATEGORI', sortable: true, width: 'w-4/12' },
  { key: 'description', label: 'DESKRIPSI', sortable: true, width: 'w-5/12' },
  { key: 'productCount', label: 'JUMLAH PRODUK', sortable: true, width: 'w-2/12' },
]

const categoriesWithProductCount = computed(() => {
  return categoriesStore.categories.map(category => ({
    ...category,
    productCount: productsStore.products.filter(p => p.category_id === category.id).length
  }))
})

// Mobile computed properties
const filteredCategories = computed(() => {
  if (!searchQuery.value) return categoriesWithProductCount.value
  
  const query = searchQuery.value.toLowerCase()
  return categoriesWithProductCount.value.filter(category =>
    category.name.toLowerCase().includes(query) ||
    (category.description && category.description.toLowerCase().includes(query))
  )
})

const totalPages = computed(() => Math.ceil(filteredCategories.value.length / itemsPerPage.value))

const paginatedCategories = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value
  return filteredCategories.value.slice(start, end)
})

const paginationInfo = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value + 1
  const end = Math.min(currentPage.value * itemsPerPage.value, filteredCategories.value.length)
  return `${start}-${end} dari ${filteredCategories.value.length}`
})

onMounted(async () => {
  try {
    await Promise.all([
      categoriesStore.fetchCategories(),
      productsStore.fetchProducts()
    ])
  } catch (error) {
    console.error('Error loading data:', error)
    alert('Gagal memuat data. Silakan refresh halaman.')
  }
})

// Mobile functions
const showCategoryMenu = (category: any, event: Event) => {
  event.stopPropagation()
  activeCategoryMenu.value = activeCategoryMenu.value === category.id ? null : category.id
}

const closeCategoryMenu = () => {
  activeCategoryMenu.value = null
}

const previousPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--
  }
}

const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++
  }
}

const addCategory = () => {
  router.push('/categories/add')
}

const editCategory = (category: any) => {
  router.push(`/categories/edit/${category.id}`)
}

const viewCategory = (category: any) => {
  router.push(`/categories/${category.id}`)
}

const deleteCategory = async (category: any) => {
  categoryToDelete.value = category
  showDeleteDialog.value = true
}

const confirmDelete = async () => {
  if (!categoryToDelete.value) return

  try {
    await categoriesStore.deleteCategory(categoryToDelete.value.id)
    toast.success('Berhasil!', 'Kategori berhasil dihapus')
  } catch (error) {
    console.error('Error deleting category:', error)
    toast.error('Gagal!', 'Gagal menghapus kategori')
  } finally {
    categoryToDelete.value = null
  }
}

const bulkDelete = () => {
  showBulkDeleteDialog.value = true
}

const confirmBulkDelete = async () => {
  const count = selectedCategories.value.length
  try {
    await Promise.all(
      selectedCategories.value.map(id => categoriesStore.deleteCategory(id))
    )
    selectedCategories.value = []
    toast.success('Berhasil!', `${count} kategori berhasil dihapus`)
  } catch (error) {
    console.error('Error deleting categories:', error)
    toast.error('Gagal!', 'Gagal menghapus beberapa kategori')
  }
}

const handleMenuAction = ({ action, row }: { action: string; row: any }) => {
  switch (action) {
    case 'detail':
      viewCategory(row)
      break
    case 'edit':
      editCategory(row)
      break
    case 'delete':
      deleteCategory(row)
      break
  }
}

const handleImport = () => {
  showImportModal.value = true
}

const handleExport = () => {
  exportCsv()
}

/* ============================================================
 * EXPORT CSV
 * ============================================================ */
const EXPORT_HEADERS = ['Nama Kategori', 'Deskripsi']

const exportCsv = () => {
  const rows = categoriesStore.categories.map((c) => [c.name, c.description || ''])
  downloadCsv(`kategori-${new Date().toISOString().slice(0, 10)}.csv`, [
    EXPORT_HEADERS,
    ...rows,
  ])
  toast.success('Berhasil!', `${rows.length} kategori diekspor ke file CSV`)
}

/* ============================================================
 * TEMPLATE IMPORT CSV
 * ============================================================ */
const downloadImportTemplate = () => {
  downloadCsv('template-import-kategori.csv', [
    EXPORT_HEADERS,
    ['Contoh Kategori', 'Deskripsi contoh'],
  ])
  toast.success('Berhasil!', 'Template CSV berhasil diunduh')
}

/* ============================================================
 * IMPORT CSV
 * ============================================================ */
const normalizeHeader = (h: string) =>
  h
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/\s+/g, '')

const handleImportFile = async (file: File, updateExisting: boolean) => {
  try {
    const text = await readFileAsText(file)
    const parsed = parseCsv(text)

    if (!parsed.headers || parsed.headers.length === 0) {
      throw new Error('File CSV kosong atau format tidak valid')
    }

    if (parsed.rows.length === 0) {
      throw new Error('Tidak ada data untuk diimpor')
    }

    // Normalisasi header baris pertama
    const normalizedRecords = parsed.rows.map((row) => {
      const out: Record<string, string> = {}
      parsed.headers.forEach((header, index) => {
        const key = normalizeHeader(header)
        if (key) out[key] = row[header] ?? ''
      })
      return out
    })

    const nameKeys = ['namakategori', 'nama', 'categoryname', 'name', 'kategori']
    const descKeys = ['deskripsi', 'description', 'desc', 'keterangan']

    const findValue = (record: Record<string, string>, keys: string[]) => {
      for (const key of keys) {
        if (record[key] !== undefined) return record[key]
      }
      return undefined
    }

    const existingNames = new Set(
      categoriesStore.categories.map((c) => c.name.toLowerCase()),
    )

    const importable: CategoryInsert[] = []
    let created = 0
    let skipped = 0
    const errors: string[] = []

    for (let idx = 0; idx < normalizedRecords.length; idx++) {
      const row = normalizedRecords[idx]
      const rowNumber = idx + 2

      const name = (findValue(row, nameKeys) ?? '').trim()
      const description = (findValue(row, descKeys) ?? '').trim()

      if (!name) {
        skipped++
        errors.push(
          `Baris ${rowNumber}: nama kategori kosong. Header file Anda mungkin tidak cocok dengan format yang diharapkan.`,
        )
        continue
      }

      const nameLower = name.toLowerCase()

      if (existingNames.has(nameLower)) {
        skipped++
        errors.push(`Baris ${rowNumber}: kategori "${name}" sudah ada, dilewati`)
        continue
      }

      importable.push({ name, description: description || undefined })
      existingNames.add(nameLower)
    }

    for (const cat of importable) {
      try {
        await categoriesStore.createCategory(cat)
        created++
      } catch (e: any) {
        errors.push(`Gagal membuat kategori "${cat.name}": ${e.message}`)
      }
    }

    // Refresh kategori
    await categoriesStore.fetchCategories()

    if (errors.length === 0) {
      toast.success('Berhasil!', `Import selesai: ${created} kategori baru, ${skipped} dilewati`)
    } else {
      toast.warning(
        'Selesai dengan catatan',
        `${created} kategori baru, ${skipped} dilewati. ${errors.length} masalah: ${errors[0]}`,
      )
    }

    showImportModal.value = false
  } catch (error: any) {
    toast.error('Gagal!', error.message || 'Gagal mengimpor file CSV')
    showImportModal.value = false
  }
}
</script>
