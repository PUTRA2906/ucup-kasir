<template>
  <AdminLayout>
    <PageBreadcrumb pageTitle="Stok Gudang" class="hidden md:block" />
    <div class="space-y-6 px-4 md:px-0">
      <!-- ===== MOBILE: Header & Tombol Penyesuaian ===== -->
      <div class="flex items-center justify-between md:hidden">
        <div>
          <h1 class="text-xl font-extrabold leading-tight tracking-tight text-gray-900 dark:text-white">
            Stok Gudang
          </h1>
          <p class="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
            {{ settingsStore.storeSubtitle }} • {{ stats.totalProducts }} Item Terdata
          </p>
        </div>
        <button
          @click="openAdjustmentModal"
          class="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-3.5 py-2 text-xs font-bold text-white shadow-md transition active:scale-95"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          <span>Penyesuaian</span>
        </button>
      </div>

      <!-- ===== MOBILE: Metrics Strip ===== -->
      <div
        class="flex items-center justify-between divide-x divide-gray-200 rounded-2xl border border-gray-200 bg-white p-3 text-center md:hidden dark:divide-gray-800 dark:border-gray-800 dark:bg-white/[0.03]"
      >
        <div class="flex-1 px-1">
          <span class="block text-[10px] font-medium text-gray-500 dark:text-gray-400">Total Jenis</span>
          <span class="mt-0.5 block text-sm font-extrabold text-gray-900 dark:text-white">{{ stats.totalProducts }}</span>
        </div>
        <div class="flex-1 px-1">
          <span class="block text-[10px] font-medium text-gray-500 dark:text-gray-400">Total Fisik</span>
          <span class="mt-0.5 block text-sm font-extrabold text-success-500">{{ stats.totalStock }}</span>
        </div>
        <div class="flex-1 px-1">
          <span class="block text-[10px] font-medium text-warning-500">Menipis</span>
          <span class="mt-0.5 block text-sm font-extrabold text-warning-500">{{ stats.lowStock }}</span>
        </div>
        <div class="flex-1 px-1">
          <span class="block text-[10px] font-medium text-gray-500 dark:text-gray-400">Habis</span>
          <span class="mt-0.5 block text-sm font-extrabold text-gray-900 dark:text-white">{{ stats.outOfStock }}</span>
        </div>
      </div>

      <!-- ===== MOBILE: Search & Filter Chips ===== -->
      <div class="space-y-2.5 md:hidden">
        <div class="relative">
          <svg class="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <input
            v-model="mobileSearch"
            type="text"
            placeholder="Cari nama produk, SKU..."
            class="w-full rounded-2xl border border-gray-200 bg-white pl-10 pr-4 py-2.5 text-xs text-gray-900 placeholder-gray-400 focus:border-brand-500 focus:outline-none dark:border-gray-800 dark:bg-white/[0.03] dark:text-white"
          />
        </div>

        <div class="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
          <button
            v-for="chip in mobileFilterChips"
            :key="chip.value"
            @click="mobileFilter = chip.value"
            class="whitespace-nowrap rounded-xl px-3.5 py-1.5 font-semibold transition"
            :class="
              mobileFilter === chip.value
                ? 'bg-brand-600 text-white shadow-sm'
                : 'border border-gray-200 bg-white text-gray-500 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-400'
            "
          >
            {{ chip.label }} ({{ chip.count }})
          </button>
        </div>
      </div>

      <!-- Statistik Cards (Desktop) -->
      <div class="hidden grid-cols-1 gap-4 md:grid lg:grid-cols-4">
        <div class="relative overflow-hidden rounded-xl border border-gray-200 bg-white p-4 sm:p-6 dark:border-white/[0.08] dark:bg-white/[0.02]">
          <div class="absolute left-0 top-0 h-full w-1 bg-brand-500"></div>
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div class="flex-1">
              <p class="text-xs font-medium text-gray-600 sm:text-sm dark:text-gray-400">Total Produk</p>
              <p class="mt-1 text-2xl font-bold text-gray-900 sm:mt-2 sm:text-3xl dark:text-white">{{ stats.totalProducts }}</p>
            </div>
            <div class="rounded-full bg-brand-50 p-2 sm:p-3 dark:bg-brand-500/10">
              <svg class="h-6 w-6 text-brand-600 sm:h-8 sm:w-8 dark:text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
              </svg>
            </div>
          </div>
        </div>

        <div class="relative overflow-hidden rounded-xl border border-gray-200 bg-white p-4 sm:p-6 dark:border-white/[0.08] dark:bg-white/[0.02]">
          <div class="absolute left-0 top-0 h-full w-1 bg-success-500"></div>
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div class="flex-1">
              <p class="text-xs font-medium text-gray-600 sm:text-sm dark:text-gray-400">Total Stok</p>
              <p class="mt-1 text-2xl font-bold text-gray-900 sm:mt-2 sm:text-3xl dark:text-white">{{ stats.totalStock }}</p>
            </div>
            <div class="rounded-full bg-success-50 p-2 sm:p-3 dark:bg-success-500/10">
              <svg class="h-6 w-6 text-success-600 sm:h-8 sm:w-8 dark:text-success-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
            </div>
          </div>
        </div>

        <div class="relative overflow-hidden rounded-xl border border-gray-200 bg-white p-4 sm:p-6 dark:border-white/[0.08] dark:bg-white/[0.02]">
          <div class="absolute left-0 top-0 h-full w-1 bg-warning-500"></div>
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div class="flex-1">
              <p class="text-xs font-medium text-gray-600 sm:text-sm dark:text-gray-400">Stok Menipis</p>
              <p class="mt-1 text-2xl font-bold text-gray-900 sm:mt-2 sm:text-3xl dark:text-white">{{ stats.lowStock }}</p>
            </div>
            <div class="rounded-full bg-warning-50 p-2 sm:p-3 dark:bg-warning-500/10">
              <svg class="h-6 w-6 text-warning-600 sm:h-8 sm:w-8 dark:text-warning-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
              </svg>
            </div>
          </div>
        </div>

        <div class="relative overflow-hidden rounded-xl border border-gray-200 bg-white p-4 sm:p-6 dark:border-white/[0.08] dark:bg-white/[0.02]">
          <div class="absolute left-0 top-0 h-full w-1 bg-error-500"></div>
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div class="flex-1">
              <p class="text-xs font-medium text-gray-600 sm:text-sm dark:text-gray-400">Stok Habis</p>
              <p class="mt-1 text-2xl font-bold text-gray-900 sm:mt-2 sm:text-3xl dark:text-white">{{ stats.outOfStock }}</p>
            </div>
            <div class="rounded-full bg-error-50 p-2 sm:p-3 dark:bg-error-500/10">
              <svg class="h-6 w-6 text-error-600 sm:h-8 sm:w-8 dark:text-error-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </div>
          </div>
        </div>
      </div>

      <!-- ===== MOBILE: List Produk ===== -->
      <div class="space-y-2.5 md:hidden">
        <div
          v-if="mobileFilteredProducts.length === 0"
          class="rounded-2xl border border-dashed border-gray-300 bg-white p-6 text-center dark:border-gray-700 dark:bg-white/[0.03]"
        >
          <p class="text-sm text-gray-500 dark:text-gray-400">Tidak ada produk yang cocok.</p>
        </div>

        <router-link
          v-for="product in mobileFilteredProducts.slice((mobilePage - 1) * 8, mobilePage * 8)"
          :key="product.id"
          :to="`/stock/${product.id}`"
          class="flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-3.5 transition active:scale-[0.99] dark:border-gray-800 dark:bg-white/[0.03]"
          :class="
            product.stock === 0
              ? 'border-error-500/30'
              : product.stock <= (product.minimum_stock || 10)
                ? 'border-warning-500/30'
                : ''
          "
        >
          <div class="max-w-[68%] space-y-0.5">
            <h2 class="text-xs font-bold leading-snug text-gray-900 dark:text-white">
              {{ product.name }}
            </h2>
            <p class="text-[10px] text-gray-500 dark:text-gray-400">
              {{ product.category?.name || '-' }} • SKU: {{ product.sku || '-' }}
            </p>
          </div>
          <div class="text-right">
            <span
              class="block text-xs font-bold"
              :class="stockTextClass(product)"
            >
              {{ product.stock }} Pcs
            </span>
            <span
              class="mt-0.5 inline-block rounded border px-1.5 py-0.5 text-[9px] font-medium"
              :class="stockBadgeClass(product)"
            >
              {{ stockBadgeLabel(product) }}
            </span>
          </div>
        </router-link>
      </div>

      <!-- ===== MOBILE: Paginasi ===== -->
      <div
        v-if="mobileFilteredProducts.length > 8"
        class="flex items-center justify-between pt-1 text-xs md:hidden"
      >
        <span class="text-[11px] text-gray-500 dark:text-gray-400">
          Hal. <span class="font-bold text-gray-900 dark:text-white">{{ mobilePage }}</span> dari {{ mobileTotalPages }}
        </span>
        <div class="flex gap-1.5">
          <button
            :disabled="mobilePage <= 1"
            :class="mobilePage <= 1 ? 'cursor-not-allowed opacity-40' : ''"
            class="rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-gray-600 transition active:scale-95 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-400"
            @click="mobilePage--"
          >
            « Prev
          </button>
          <button
            :disabled="mobilePage >= mobileTotalPages"
            :class="mobilePage >= mobileTotalPages ? 'cursor-not-allowed opacity-40' : ''"
            class="rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-gray-600 transition active:scale-95 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-400"
            @click="mobilePage++"
          >
            Next »
          </button>
        </div>
      </div>

      <!-- DataTable (Desktop) -->
      <div class="hidden md:block">
      <DataTable
        :columns="columns"
        :data="formattedProducts"
        :paginated="true"
        :per-page="10"
        :searchable="true"
        :show-filter="true"
        :show-add-button="true"
        add-button-text="Penyesuaian Stok"
        title="Stok Gudang"
        :subtitle="`${settingsStore.storeSubtitle} - ${productsStore.products.length} Produk`"
        :show-export-button="true"
        :category-options="categoryOptions"
        @add-click="openAdjustmentModal"
        @menu-action="handleMenuAction"
        @export-click="handleExport"
        @category-change="handleCategoryChange"
        @apply-filter="applyFilters"
      >
        <template #header-actions>
          <div class="flex flex-col gap-2 sm:flex-row sm:gap-3">
            <button
              @click="openOpnameModal"
              class="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:px-4 dark:bg-white/[0.05] dark:text-gray-300 dark:ring-white/[0.08] dark:hover:bg-white/[0.08]"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
              </svg>
              <span class="hidden sm:inline">Stock Opname</span>
              <span class="sm:hidden">Opname</span>
            </button>
            <button
              @click="viewMovements"
              class="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:px-4 dark:bg-white/[0.05] dark:text-gray-300 dark:ring-white/[0.08] dark:hover:bg-white/[0.08]"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
              </svg>
              <span class="hidden sm:inline">Riwayat Mutasi</span>
              <span class="sm:hidden">Riwayat</span>
            </button>
          </div>
        </template>

        <template #cell-stock="{ value, row }">
          <div class="flex items-center gap-2">
            <span
              :class="[
                'font-medium',
                getStockStatus(value, row.minimum_stock).color
              ]"
            >
              {{ value }}
            </span>
            <span
              v-if="getStockStatus(value, row.minimum_stock).badge"
              :class="[
                'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                getStockStatus(value, row.minimum_stock).badgeClass
              ]"
            >
              {{ getStockStatus(value, row.minimum_stock).badge }}
            </span>
          </div>
        </template>

        <template #cell-minimum_stock="{ value }">
          <span class="text-gray-600 dark:text-gray-400">{{ value || 10 }}</span>
        </template>

        <template #rowActions="{ row }">
          <div class="flex items-center gap-2">
            <button
              @click="adjustStock(row)"
              class="rounded-lg p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/[0.03]"
              title="Sesuaikan Stok"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
              </svg>
            </button>
            <button
              @click="viewHistory(row)"
              class="rounded-lg p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/[0.03]"
              title="Lihat Riwayat"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </button>
            <button
              @click="setMinimumStock(row)"
              class="rounded-lg p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/[0.03]"
              title="Atur Stok Minimum"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
            </button>
          </div>
        </template>
      </DataTable>
      </div>
    </div>

    <!-- Stock Adjustment Modal -->
    <StockAdjustmentModal
      v-model="showAdjustmentModal"
      :product="selectedProduct"
      @saved="handleAdjustmentSaved"
    />

    <!-- Stock Opname Modal -->
    <StockOpnameModal
      v-model="showOpnameModal"
      @saved="handleOpnameSaved"
    />

    <!-- Minimum Stock Modal -->
    <Teleport to="body">
      <div
        v-if="showMinimumStockModal"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        @click.self="showMinimumStockModal = false"
      >
        <div class="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Atur Stok Minimum</h3>
          <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Produk: <span class="font-medium">{{ selectedProduct?.name }}</span>
          </p>
          <div class="mt-4">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Stok Minimum
            </label>
            <input
              v-model.number="minimumStockValue"
              type="number"
              min="0"
              class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-white/[0.08] dark:bg-white/[0.05] dark:text-white"
            />
          </div>
          <div class="mt-6 flex gap-3">
            <button
              @click="showMinimumStockModal = false"
              class="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-white/[0.08] dark:text-gray-300 dark:hover:bg-white/[0.05]"
            >
              Batal
            </button>
            <button
              @click="saveMinimumStock"
              class="flex-1 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              Simpan
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import DataTable from '@/components/tables/DataTable.vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import StockAdjustmentModal from './StockAdjustmentModal.vue'
import StockOpnameModal from './StockOpnameModal.vue'
import { useProductsStore } from '@/stores/products'
import { useCategoriesStore } from '@/stores/categories'
import { useStoreSettingsStore } from '@/stores/storeSettings'
import { useStockStore } from '@/stores/stock'
import { useToast } from '@/composables/useToast'

const router = useRouter()
const productsStore = useProductsStore()
const categoriesStore = useCategoriesStore()
const settingsStore = useStoreSettingsStore()
const stockStore = useStockStore()
const toast = useToast()

const showAdjustmentModal = ref(false)
const showOpnameModal = ref(false)
const showMinimumStockModal = ref(false)
const selectedProduct = ref<any>(null)
const minimumStockValue = ref(10)
const filters = ref({ category: '', status: '', stock: '' })

// Mobile state
const mobileSearch = ref('')
const mobileFilter = ref('all')
const mobilePage = ref(1)

const categoryOptions = computed(() => [
  { value: '', label: 'Semua Kategori' },
  ...categoriesStore.categories.map(cat => ({
    value: cat.id,
    label: cat.name
  }))
])

const stats = computed(() => {
  const products = productsStore.products
  return {
    totalProducts: products.length,
    totalStock: products.reduce((sum, p) => sum + (p.stock || 0), 0),
    lowStock: products.filter(p => p.stock > 0 && p.stock <= (p.minimum_stock || 10)).length,
    outOfStock: products.filter(p => p.stock === 0).length
  }
})

const formattedProducts = computed(() => {
  let result = productsStore.products

  if (filters.value.category) {
    result = result.filter((p) => p.category_id === filters.value.category)
  }

  if (filters.value.stock) {
    result = result.filter((p) => {
      const minStock = p.minimum_stock || 10
      if (filters.value.stock === 'high') return p.stock > minStock
      if (filters.value.stock === 'medium') return p.stock >= 1 && p.stock <= minStock
      if (filters.value.stock === 'low') return p.stock === 0
      return true
    })
  }

  return result.map(product => ({
    ...product,
    category: product.category?.name || '-',
    minimum_stock: product.minimum_stock || 10
  }))
})

const columns = [
  { key: 'name', label: 'NAMA PRODUK', sortable: true, width: 'w-3/12' },
  { key: 'sku', label: 'SKU', sortable: true, width: 'w-2/12' },
  { key: 'category', label: 'KATEGORI', sortable: true, width: 'w-2/12' },
  { key: 'stock', label: 'STOK SAAT INI', sortable: true, width: 'w-2/12' },
  { key: 'minimum_stock', label: 'STOK MINIMUM', sortable: true, width: 'w-2/12' },
]

const mobileFilterChips = computed(() => {
  const products = productsStore.products
  return [
    { value: 'all', label: 'Semua', count: products.length },
    { value: 'low', label: 'Menipis', count: products.filter(p => p.stock > 0 && p.stock <= (p.minimum_stock || 10)).length },
    { value: 'out', label: 'Habis', count: products.filter(p => p.stock === 0).length },
    ...categoriesStore.categories.map(cat => ({
      value: `cat:${cat.id}`,
      label: cat.name,
      count: products.filter(p => p.category_id === cat.id).length
    }))
  ]
})

const mobileFilteredProducts = computed(() => {
  let result = productsStore.products

  if (mobileFilter.value === 'low') {
    result = result.filter(p => p.stock > 0 && p.stock <= (p.minimum_stock || 10))
  } else if (mobileFilter.value === 'out') {
    result = result.filter(p => p.stock === 0)
  } else if (mobileFilter.value.startsWith('cat:')) {
    const catId = mobileFilter.value.split(':')[1]
    result = result.filter(p => p.category_id === catId)
  } else if (mobileFilter.value === 'all') {
    result = result
  } else {
    result = result.filter(p => p.category_id === mobileFilter.value)
  }

  const q = mobileSearch.value.trim().toLowerCase()
  if (q) {
    result = result.filter(
      p =>
        p.name.toLowerCase().includes(q) ||
        (p.sku || '').toLowerCase().includes(q) ||
        (p.barcode || '').toLowerCase().includes(q)
    )
  }

  return [...result].sort((a, b) => a.name.localeCompare(b.name))
})

const mobileTotalPages = computed(() =>
  Math.max(1, Math.ceil(mobileFilteredProducts.value.length / 8))
)

const stockTextClass = (product: any) => {
  const min = product.minimum_stock || 10
  if (product.stock === 0) return 'text-error-500'
  if (product.stock <= min) return 'text-warning-500'
  return 'text-gray-900 dark:text-white'
}

const stockBadgeClass = (product: any) => {
  const min = product.minimum_stock || 10
  if (product.stock === 0) {
    return 'bg-error-500/10 text-error-500 border-error-500/20'
  }
  if (product.stock <= min) {
    return 'bg-warning-500/10 text-warning-500 border-warning-500/20'
  }
  return 'bg-success-500/10 text-success-500 border-success-500/20'
}

const stockBadgeLabel = (product: any) => {
  const min = product.minimum_stock || 10
  if (product.stock === 0) return 'Habis'
  if (product.stock <= min) return 'Menipis'
  return 'Stok Aman'
}

const getStockStatus = (stock: number, minimumStock: number = 10) => {
  if (stock === 0) {
    return {
      color: 'text-error-600 dark:text-error-500',
      badge: 'Habis',
      badgeClass: 'bg-error-50 text-error-700 dark:bg-error-500/10 dark:text-error-500'
    }
  } else if (stock <= minimumStock) {
    return {
      color: 'text-warning-600 dark:text-warning-500',
      badge: 'Menipis',
      badgeClass: 'bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-500'
    }
  } else {
    return {
      color: 'text-success-600 dark:text-success-500',
      badge: null,
      badgeClass: ''
    }
  }
}

const applyFilters = (filterValues: any) => {
  filters.value = filterValues
}

const handleCategoryChange = (category: string) => {
  filters.value.category = category
}

const openAdjustmentModal = () => {
  selectedProduct.value = null
  showAdjustmentModal.value = true
}

const adjustStock = (product: any) => {
  selectedProduct.value = product
  showAdjustmentModal.value = true
}

const openOpnameModal = () => {
  showOpnameModal.value = true
}

const viewMovements = () => {
  router.push('/stock/movements')
}

const viewHistory = (product: any) => {
  router.push(`/stock/movements?product=${product.id}`)
}

const setMinimumStock = (product: any) => {
  selectedProduct.value = product
  minimumStockValue.value = product.minimum_stock || 10
  showMinimumStockModal.value = true
}

const saveMinimumStock = async () => {
  if (!selectedProduct.value) return

  try {
    await stockStore.setMinimumStock(selectedProduct.value.id, minimumStockValue.value)
    toast.success('Berhasil!', 'Stok minimum berhasil diatur')
    showMinimumStockModal.value = false
    await productsStore.fetchProducts()
  } catch (error) {
    console.error('Error setting minimum stock:', error)
    toast.error('Gagal!', 'Gagal mengatur stok minimum')
  }
}

const handleAdjustmentSaved = async () => {
  await productsStore.fetchProducts()
  toast.success('Berhasil!', 'Penyesuaian stok berhasil disimpan')
}

const handleOpnameSaved = async () => {
  await productsStore.fetchProducts()
  toast.success('Berhasil!', 'Stock opname berhasil disimpan')
}

const handleMenuAction = ({ action, row }: { action: string; row: any }) => {
  switch (action) {
    case 'adjust':
      adjustStock(row)
      break
    case 'history':
      viewHistory(row)
      break
    case 'minimum':
      setMinimumStock(row)
      break
  }
}

const handleExport = () => {
  toast.info('Info', 'Fungsi ekspor akan segera tersedia')
}

onMounted(async () => {
  try {
    await Promise.all([
      productsStore.fetchProducts(),
      categoriesStore.fetchCategories(),
      stockStore.fetchStockAlerts()
    ])
  } catch (error) {
    console.error('Error loading data:', error)
    toast.error('Gagal!', 'Gagal memuat data. Silakan refresh halaman.')
  }
})
</script>
