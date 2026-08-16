<template>
  <AdminLayout>
    <PageBreadcrumb pageTitle="Data Table Composable" />
    <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
        Data Table dengan Composable
      </h1>
      <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
        Contoh penggunaan useDataTable composable untuk custom implementation
      </p>
    </div>

    <ComponentCard
      title="Custom DataTable dengan useDataTable"
      desc="Build custom table dengan logic dari composable"
    >
      <div class="space-y-4">
        <!-- Custom Search dan Filter -->
        <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div class="relative max-w-md">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Cari produk..."
              class="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400"
            />
          </div>

          <div class="flex items-center gap-2">
            <button
              @click="resetFilters"
              class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
            >
              Reset Filter
            </button>
            <select
              v-model="perPage"
              class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              <option :value="5">5 per halaman</option>
              <option :value="10">10 per halaman</option>
              <option :value="25">25 per halaman</option>
              <option :value="50">50 per halaman</option>
            </select>
          </div>
        </div>

        <!-- Custom Table -->
        <div
          class="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]"
        >
          <div class="max-w-full overflow-x-auto custom-scrollbar">
            <table class="min-w-full">
              <thead>
                <tr class="border-b border-gray-200 dark:border-gray-700">
                  <th
                    v-for="column in columns"
                    :key="column.key"
                    :class="[
                      'px-5 py-3 text-left sm:px-6',
                      column.sortable ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.03]' : '',
                    ]"
                    @click="column.sortable ? handleSort(column.key) : null"
                  >
                    <div class="flex items-center gap-2">
                      <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">
                        {{ column.label }}
                      </p>
                      <span
                        v-if="column.sortable && sortKey === column.key"
                        class="text-brand-500"
                      >
                        {{ sortOrder === 'asc' ? '↑' : '↓' }}
                      </span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
                <tr
                  v-if="paginatedData.length === 0"
                  class="border-t border-gray-100 dark:border-gray-800"
                >
                  <td :colspan="columns.length" class="px-5 py-8 text-center sm:px-6">
                    <p class="text-gray-500 text-theme-sm dark:text-gray-400">
                      Tidak ada data yang sesuai
                    </p>
                  </td>
                </tr>
                <tr
                  v-for="product in paginatedData"
                  :key="product.id"
                  class="border-t border-gray-100 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-white/[0.03]"
                >
                  <td class="px-5 py-4 sm:px-6">
                    <p class="font-medium text-gray-900 dark:text-white">{{ product.name }}</p>
                  </td>
                  <td class="px-5 py-4 sm:px-6">
                    <span
                      class="inline-flex rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-400"
                    >
                      {{ product.category }}
                    </span>
                  </td>
                  <td class="px-5 py-4 sm:px-6">
                    <p class="text-gray-900 dark:text-white">
                      {{ formatCurrency(product.price) }}
                    </p>
                  </td>
                  <td class="px-5 py-4 sm:px-6">
                    <p
                      :class="[
                        'font-medium',
                        product.stock > 10
                          ? 'text-success-600 dark:text-success-500'
                          : product.stock > 0
                            ? 'text-warning-600 dark:text-warning-500'
                            : 'text-error-600 dark:text-error-500',
                      ]"
                    >
                      {{ product.stock }}
                    </p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Custom Pagination -->
          <div
            v-if="totalPages > 1"
            class="flex flex-col gap-4 border-t border-gray-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 dark:border-gray-700"
          >
            <div class="text-sm text-gray-500 dark:text-gray-400">
              Menampilkan {{ (currentPage - 1) * perPage + 1 }} -
              {{ Math.min(currentPage * perPage, filteredData.length) }} dari
              {{ filteredData.length }} produk
            </div>
            <div class="flex items-center gap-2">
              <button
                @click="goToPage(1)"
                :disabled="currentPage === 1"
                class="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
              >
                ««
              </button>
              <button
                @click="prevPage"
                :disabled="currentPage === 1"
                class="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
              >
                «
              </button>
              <span class="px-3 py-2 text-sm text-gray-700 dark:text-gray-400">
                {{ currentPage }} / {{ totalPages }}
              </span>
              <button
                @click="nextPage"
                :disabled="currentPage === totalPages"
                class="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
              >
                »
              </button>
              <button
                @click="goToPage(totalPages)"
                :disabled="currentPage === totalPages"
                class="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
              >
                »»
              </button>
            </div>
          </div>
        </div>

        <!-- Info -->
        <div class="rounded-lg bg-blue-50 p-4 dark:bg-blue-500/10">
          <p class="text-sm text-blue-800 dark:text-blue-400">
            <strong>Info:</strong> Tabel ini menggunakan composable
            <code class="rounded bg-blue-100 px-1 dark:bg-blue-500/20">useDataTable</code>
            untuk mengelola state sorting, filtering, dan pagination.
          </p>
        </div>
      </div>
    </ComponentCard>

    <!-- Stats -->
    <div class="grid gap-6 sm:grid-cols-3">
      <div class="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <p class="text-sm text-gray-600 dark:text-gray-400">Total Produk</p>
        <p class="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
          {{ products.length }}
        </p>
      </div>
      <div class="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <p class="text-sm text-gray-600 dark:text-gray-400">Hasil Filter</p>
        <p class="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
          {{ filteredData.length }}
        </p>
      </div>
      <div class="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <p class="text-sm text-gray-600 dark:text-gray-400">Halaman</p>
        <p class="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
          {{ currentPage }} / {{ totalPages }}
        </p>
      </div>
    </div>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useDataTable } from '@/composables/useDataTable'
import ComponentCard from '@/components/common/ComponentCard.vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'

const columns = [
  { key: 'name', label: 'Nama Produk', sortable: true },
  { key: 'category', label: 'Kategori', sortable: true },
  { key: 'price', label: 'Harga', sortable: true },
  { key: 'stock', label: 'Stok', sortable: true },
]

const products = ref([
  { id: 1, name: 'Laptop Asus ROG', category: 'Elektronik', price: 15000000, stock: 5 },
  { id: 2, name: 'Mouse Gaming Logitech', category: 'Elektronik', price: 350000, stock: 15 },
  { id: 3, name: 'Keyboard Mechanical', category: 'Elektronik', price: 850000, stock: 12 },
  { id: 4, name: 'Monitor LG 27 inch', category: 'Elektronik', price: 3500000, stock: 8 },
  { id: 5, name: 'Webcam Logitech HD', category: 'Elektronik', price: 750000, stock: 20 },
  { id: 6, name: 'Kopi Arabica Premium 100g', category: 'Makanan', price: 75000, stock: 25 },
  { id: 7, name: 'Teh Hijau Organik 50g', category: 'Makanan', price: 35000, stock: 30 },
  { id: 8, name: 'Cokelat Dark 70%', category: 'Makanan', price: 45000, stock: 18 },
  { id: 9, name: 'Kaos Polos Premium', category: 'Pakaian', price: 125000, stock: 30 },
  { id: 10, name: 'Celana Jeans Slim Fit', category: 'Pakaian', price: 350000, stock: 22 },
  { id: 11, name: 'Jaket Hoodie', category: 'Pakaian', price: 275000, stock: 15 },
  { id: 12, name: 'Sepatu Sneakers', category: 'Pakaian', price: 550000, stock: 10 },
  { id: 13, name: 'Headphone Sony WH-1000XM4', category: 'Elektronik', price: 4500000, stock: 6 },
  { id: 14, name: 'Speaker Bluetooth JBL', category: 'Elektronik', price: 1200000, stock: 14 },
  { id: 15, name: 'Power Bank 20000mAh', category: 'Elektronik', price: 350000, stock: 25 },
])

const {
  searchQuery,
  sortKey,
  sortOrder,
  currentPage,
  perPage,
  filteredData,
  paginatedData,
  totalPages,
  handleSort,
  resetFilters,
  goToPage,
  nextPage,
  prevPage,
} = useDataTable({
  data: products,
  columns,
  defaultSortKey: 'name',
  defaultSortOrder: 'asc',
  defaultPerPage: 10,
})

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value)
}
</script>
