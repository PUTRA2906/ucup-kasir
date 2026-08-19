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

    <!-- Import CSV Modal -->
    <ImportCsvModal
      v-model="showImportModal"
      @import="handleImportFile"
      @download-template="downloadImportTemplate"
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
import ImportCsvModal from '@/components/common/ImportCsvModal.vue'
import { useProductsStore } from '@/stores/products'
import { useCategoriesStore } from '@/stores/categories'
import { useStoreSettingsStore } from '@/stores/storeSettings'
import { useToast } from '@/composables/useToast'
import {
  downloadCsv,
  parseCsv,
  parseNumeric,
  readFileAsText,
} from '@/composables/useCsv'
import type { ProductInsert, ProductWithCategory } from '@/types/database'

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
const showImportModal = ref(false)
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
  showImportModal.value = true
}

const handleExport = () => {
  exportCsv()
}

const handleCategoryChange = (category: string) => {
  filters.value.category = category
}

/* ============================================================
 * EXPORT CSV
 * ============================================================ */
const EXPORT_HEADERS = [
  'Nama Produk',
  'SKU',
  'Barcode',
  'Kategori',
  'Harga Beli',
  'Harga Jual',
  'Stok',
  'Stok Minimum',
  'Status',
]

const exportCsv = () => {
  const rows = formattedProducts.value.map((p) => [
    p.name,
    p.sku || '',
    p.barcode || '',
    p.category || '',
    p.price_buy,
    p.price_sell,
    p.stock,
    p.minimum_stock ?? '',
    p.is_active ? 'Aktif' : 'Nonaktif',
  ])
  downloadCsv(`produk-${new Date().toISOString().slice(0, 10)}.csv`, [
    EXPORT_HEADERS,
    ...rows,
  ])
  toast.success(
    'Berhasil!',
    `${rows.length} produk diekspor ke file CSV`,
  )
}

/* ============================================================
 * TEMPLATE IMPORT CSV
 * ============================================================ */
const downloadImportTemplate = () => {
  downloadCsv('template-import-produk.csv', [
    EXPORT_HEADERS,
    [
      'Contoh Produk',
      'SKU001',
      '8990000000001',
      'Kategori A',
      5000,
      7500,
      100,
      10,
      'Aktif',
    ],
  ])
  toast.success('Berhasil!', 'Template CSV berhasil diunduh')
}

/* ============================================================
 * IMPORT CSV
 * ============================================================ */
// Normalisasi nama kolom: hilangkan spasi, aksen opsional, lowercase.
const normalizeHeader = (h: string) =>
  h
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/\s+/g, '')

const findValue = (record: Record<string, string>, aliases: string[]) => {
  for (const alias of aliases) {
    if (record[alias] !== undefined) return record[alias]
  }
  return undefined
}

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

    // Petakan header asli -> normalized, supaya lookup via findValue
    // dengan kunci normalized bekerja pada record normalized.
    const normalizedRecords = parsed.rows.map((row) => {
      const out: Record<string, string> = {}
      parsed.headers.forEach((header, index) => {
        const key = normalizeHeader(header)
        if (key) out[key] = row[header] ?? ''
      })
      return out
    })

    const nameKey = ['namaproduk', 'nama', 'productname', 'name']
    const skuKey = ['sku', 'kode']
    const barcodeKey = ['barcode', 'kodebarcode']
    const categoryKey = ['kategori', 'category', 'kategorinama']
    const buyKey = ['hargabeli', 'purchaseprice', 'pricebuy', 'beli']
    const sellKey = ['hargajual', 'sellingprice', 'pricesell', 'jual']
    const stockKey = ['stok', 'stock', 'qty', 'jumlah']
    const minStockKey = ['stokminimum', 'minimumstock', 'minstock', 'min']
    const activeKey = ['status', 'aktif', 'isactive']

    // Map nama kategori -> id dari kategori yang sudah ada
    const categoryMap = new Map<string, string>()
    categoriesStore.categories.forEach((cat) => {
      categoryMap.set(cat.name.toLowerCase(), cat.id)
    })

    let created = 0
    let updated = 0
    let skipped = 0
    const errors: string[] = []

    // Untuk update: map SKU yang sudah ada -> produk
    const existingBySku = new Map<string, ProductWithCategory>()
    productsStore.products.forEach((p) => {
      if (p.sku) existingBySku.set(p.sku.toLowerCase(), p)
    })

    const importable: ProductInsert[] = []
    const updates: { id: string; data: ProductInsert }[] = []

    // Sinkronisasi stock_alerts: pasangan id produk -> minimum_stock.
    // Untuk produk baru, id baru diketahui setelah insert batch.
    const stockAlertsToSync: { product_id: string; minimum_stock: number }[] = []
    // Kunci pencocokan (SKU atau nama) -> minimum_stock untuk produk baru yang
    // akan diinsert, dipakai setelah insert untuk memetakan id hasil batch.
    const pendingMinStock = new Map<
      string,
      number
    >()

    for (let idx = 0; idx < normalizedRecords.length; idx++) {
      const row = normalizedRecords[idx]
      const rowNumber = idx + 2 // +2 karena header = baris 1

      const name = findValue(row, nameKey) ?? ''
      const sku = findValue(row, skuKey) ?? ''
      const barcode = findValue(row, barcodeKey) ?? ''
      const categoryName = findValue(row, categoryKey) ?? ''
      const buy = parseNumeric(findValue(row, buyKey) ?? '0')
      const sell = parseNumeric(findValue(row, sellKey) ?? '0')
      const stock = parseNumeric(findValue(row, stockKey) ?? '0')
      // Kolom stok minimum bersifat opsional: hanya dipakai bila CSV benar-benar
      // menyertakan nilai, agar tidak menimpa default 10 (atau stock_alerts yang
      // sudah ada) dengan 0 ketika kolomnya kosong/tidak ada.
      const minStockRaw = findValue(row, minStockKey)
      const hasMinStockValue =
        minStockRaw !== undefined && minStockRaw.trim() !== ''
      const minStock = hasMinStockValue
        ? parseNumeric(minStockRaw)
        : undefined
      const statusRaw = (findValue(row, activeKey) ?? 'aktif').toLowerCase()

      if (!name && !sku) {
        skipped++
        errors.push(
          `Baris ${rowNumber}: nama dan SKU kosong. Header file Anda mungkin tidak cocok dengan format yang diharapkan.`,
        )
        continue
      }

      // Status: aktif kecuali tertulis "nonaktif"/"tidak"/"0"/"false"
      const isActive = !['nonaktif', 'tidak', 'inactive', '0', 'false'].includes(
        statusRaw,
      )

      // Resolve kategori (buat jika belum ada)
      let categoryId: string | undefined
      if (categoryName) {
        const existing = categoryMap.get(categoryName.toLowerCase())
        if (existing) {
          categoryId = existing
        } else {
          try {
            const newCat = await categoriesStore.createCategory({
              name: categoryName.trim(),
            })
            categoryId = newCat.id
            categoryMap.set(categoryName.toLowerCase(), newCat.id)
          } catch (e: any) {
            errors.push(`Baris ${rowNumber}: gagal membuat kategori "${categoryName}" — ${e.message}`)
            skipped++
            continue
          }
        }
      }

      const payload: ProductInsert = {
        name: name.trim(),
        sku: sku || undefined,
        barcode: barcode || undefined,
        category_id: categoryId,
        price_buy: buy,
        price_sell: sell,
        stock: stock,
        // Hanya kirim bila CSV menyertakan nilai; jika undefined, DB memakai default 10.
        minimum_stock: minStock,
        is_active: isActive,
      }

      // Cek duplikat di file itu sendiri (by SKU atau nama)
      const existing = sku
        ? existingBySku.get(sku.toLowerCase())
        : productsStore.products.find((p) => p.name.toLowerCase() === name.trim().toLowerCase())

      if (existing && updateExisting) {
        updates.push({ id: existing.id, data: payload })
        // Sinkronkan stock_alerts hanya bila CSV menyertakan nilai minimum stok.
        if (minStock !== undefined) {
          stockAlertsToSync.push({ product_id: existing.id, minimum_stock: minStock })
        }
        existingBySku.set(sku.toLowerCase(), existing)
      } else if (existing && !updateExisting) {
        skipped++
        errors.push(`Baris ${rowNumber}: SKU "${sku}" sudah ada, dilewati (update nonaktif)`)
      } else {
        importable.push(payload)
        // Tandai SKU sebagai sudah diproses di file ini agar baris berikutnya
        // dengan SKU sama dianggap duplikat (bukan dibuat dua kali).
        if (sku) {
          existingBySku.set(sku.toLowerCase(), {
            id: '__pending__',
            name: name.trim(),
            sku,
          } as unknown as ProductWithCategory)
        }
        // Catat min stock untuk sinkronisasi setelah id produk diketahui.
        if (minStock !== undefined) {
          const key = sku
            ? `sku:${sku.toLowerCase()}`
            : `name:${name.trim().toLowerCase()}`
          pendingMinStock.set(key, minStock)
        }
      }
    }

    // Proses update
    for (const { id, data } of updates) {
      try {
        await productsStore.updateProduct(id, data)
        updated++
      } catch (e: any) {
        errors.push(`Gagal update produk ${data.name}: ${e.message}`)
      }
    }

    // Proses insert
    if (importable.length > 0) {
      try {
        const createdBatch = await productsStore.createProducts(importable)
        created += createdBatch.length
        // Petakan produk baru hasil batch ke nilai min stock dari CSV.
        for (const prod of createdBatch) {
          const key = prod.sku
            ? `sku:${prod.sku.toLowerCase()}`
            : `name:${prod.name.toLowerCase()}`
          const minStockValue = pendingMinStock.get(key)
          if (minStockValue !== undefined) {
            stockAlertsToSync.push({
              product_id: prod.id,
              minimum_stock: minStockValue,
            })
          }
        }
      } catch (e: any) {
        errors.push(`Gagal impor ${importable.length} produk baru: ${e.message}`)
      }
    }

    // Sinkronkan stock_alerts agar notifikasi stok menipis mengikuti nilai CSV.
    if (stockAlertsToSync.length > 0) {
      try {
        await productsStore.syncMinimumStocks(stockAlertsToSync)
      } catch (e: any) {
        errors.push(`Gagal menyinkronkan stok minimum: ${e.message}`)
      }
    }

    // Refresh data
    await Promise.all([
      productsStore.fetchProducts(),
      categoriesStore.fetchCategories(),
    ])

    const summaryParts = [
      `${created} produk baru`,
      `${updated} diperbarui`,
      `${skipped} dilewati`,
    ]

    if (errors.length === 0) {
      toast.success('Berhasil!', `Import selesai: ${summaryParts.join(', ')}`)
    } else {
      // Tampilkan hingga 3 error pertama agar user tahu penyebabnya
      const errorPreview = errors.slice(0, 3).join(' | ')
      const extra = errors.length > 3 ? ` (+${errors.length - 3} lainnya)` : ''
      toast.warning(
        'Selesai dengan catatan',
        `${summaryParts.join(', ')}. ${errors.length} masalah: ${errorPreview}${extra}`,
      )
    }

    showImportModal.value = false
  } catch (error: any) {
    toast.error('Gagal!', error.message || 'Gagal mengimpor file CSV')
    showImportModal.value = false
  }
}
</script>
