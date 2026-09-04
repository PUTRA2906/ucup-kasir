<template>
  <AdminLayout>
    <PageBreadcrumb pageTitle="Daftar Retur" class="hidden md:block" />

    <div class="space-y-6">
      <!-- Mobile Header -->
      <MobilePageHeader title="Daftar Retur" :subtitle="returnsList.length + ' Retur'" back-to="/" />

      <!-- Mobile View: Search & Cards -->
      <div class="space-y-4 md:hidden">
        <!-- Search Bar & Sort -->
        <div class="flex items-center gap-2">
          <div class="relative flex-1">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Cari nomor retur, customer..."
              class="w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
            />
            <svg class="absolute left-3 top-3 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <button
            @click="showSortModal = true"
            class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-brand-500 bg-white text-brand-500 transition hover:bg-brand-50 active:scale-95 dark:bg-gray-900 dark:hover:bg-brand-500/10"
          >
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
            </svg>
          </button>
        </div>

        <!-- Return Cards -->
        <div v-if="filteredReturns.length === 0" class="rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 p-8 text-center dark:border-gray-700 dark:bg-gray-900/50">
          <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 15v-1a4 4 0 00-4-4H8m0 0l3 3m-3-3l3-3m9 14V5a2 2 0 00-2-2H6a2 2 0 00-2 2v16l4-2 4 2 4-2 4 2z" />
          </svg>
          <p class="mt-4 text-sm font-medium text-gray-900 dark:text-white">
            {{ searchQuery ? 'Retur tidak ditemukan' : 'Belum ada retur' }}
          </p>
          <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {{ searchQuery ? 'Coba kata kunci lain' : 'Retur barang akan muncul di sini' }}
          </p>
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="returnItem in paginatedReturns"
            :key="returnItem.id"
            @click="$router.push(`/transactions/${returnItem.transaction_id}`)"
            class="relative rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition active:scale-[0.98] dark:border-gray-800 dark:bg-white/[0.03]"
          >
            <div class="mb-3 flex items-start justify-between">
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2">
                  <div class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-error-50 dark:bg-error-500/10">
                    <svg class="h-4 w-4 text-error-600 dark:text-error-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 15v-1a4 4 0 00-4-4H8m0 0l3 3m-3-3l3-3" />
                    </svg>
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="text-sm font-bold text-gray-900 dark:text-white">
                      {{ returnItem.return_number }}
                    </p>
                    <p class="text-xs text-gray-500 dark:text-gray-400">
                      {{ formatDate(returnItem.created_at) }}
                    </p>
                  </div>
                </div>
              </div>
              <p class="ml-2 text-base font-bold text-error-600 dark:text-error-400 flex-shrink-0">
                - {{ formatCurrency(returnItem.total_refund) }}
              </p>
            </div>

            <div class="space-y-2 border-t border-gray-100 pt-3 dark:border-gray-800">
              <div class="flex items-center justify-between text-xs">
                <span class="text-gray-500 dark:text-gray-400">Transaksi</span>
                <span class="font-medium text-gray-900 dark:text-white">
                  {{ returnItem.return_number }}
                </span>
              </div>
              <div class="flex items-center justify-between text-xs">
                <span class="text-gray-500 dark:text-gray-400">Customer</span>
                <span class="font-medium text-gray-900 dark:text-white">
                  Umum
                </span>
              </div>
              <div class="flex items-center justify-between text-xs">
                <span class="text-gray-500 dark:text-gray-400">Produk Diretur</span>
                <span class="font-medium text-gray-900 dark:text-white">
                  {{ (returnItem.items || []).length }} item
                </span>
              </div>
            </div>

            <div class="mt-3 flex items-center justify-end border-t border-gray-100 pt-3 dark:border-gray-800">
              <span class="inline-flex items-center gap-1.5 text-xs font-medium text-brand-600 dark:text-brand-400">
                Lihat Transaksi
                <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </span>
            </div>
          </div>
        </div>

        <!-- Pagination -->
        <div v-if="filteredReturns.length > 0" class="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-white/[0.03]">
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

      <!-- Sort Modal -->
      <Teleport to="body">
        <Transition name="modal">
          <div
            v-if="showSortModal"
            class="fixed inset-0 z-50 flex items-end justify-center bg-black/50 md:hidden"
            @click.self="showSortModal = false"
          >
            <div class="w-full max-w-lg rounded-t-3xl bg-white p-6 dark:bg-gray-900">
              <div class="mb-4 flex items-center justify-between">
                <h3 class="text-lg font-bold text-gray-900 dark:text-white">Urutkan</h3>
                <button
                  @click="showSortModal = false"
                  class="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                >
                  <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div class="space-y-2">
                <button
                  @click="sortBy = 'newest'; showSortModal = false"
                  :class="[
                    'w-full rounded-xl border px-4 py-3 text-left text-sm font-medium transition active:scale-95',
                    sortBy === 'newest'
                      ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400'
                      : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                  ]"
                >
                  <div class="flex items-center justify-between">
                    <span>Terbaru</span>
                    <span v-if="sortBy === 'newest'" class="text-brand-600 dark:text-brand-400">✓</span>
                  </div>
                </button>

                <button
                  @click="sortBy = 'oldest'; showSortModal = false"
                  :class="[
                    'w-full rounded-xl border px-4 py-3 text-left text-sm font-medium transition active:scale-95',
                    sortBy === 'oldest'
                      ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400'
                      : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                  ]"
                >
                  <div class="flex items-center justify-between">
                    <span>Terlama</span>
                    <span v-if="sortBy === 'oldest'" class="text-brand-600 dark:text-brand-400">✓</span>
                  </div>
                </button>

                <button
                  @click="sortBy = 'highest'; showSortModal = false"
                  :class="[
                    'w-full rounded-xl border px-4 py-3 text-left text-sm font-medium transition active:scale-95',
                    sortBy === 'highest'
                      ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400'
                      : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                  ]"
                >
                  <div class="flex items-center justify-between">
                    <span>Refund Tertinggi</span>
                    <span v-if="sortBy === 'highest'" class="text-brand-600 dark:text-brand-400">✓</span>
                  </div>
                </button>

                <button
                  @click="sortBy = 'lowest'; showSortModal = false"
                  :class="[
                    'w-full rounded-xl border px-4 py-3 text-left text-sm font-medium transition active:scale-95',
                    sortBy === 'lowest'
                      ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400'
                      : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                  ]"
                >
                  <div class="flex items-center justify-between">
                    <span>Refund Terendah</span>
                    <span v-if="sortBy === 'lowest'" class="text-brand-600 dark:text-brand-400">✓</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </Transition>
      </Teleport>

      <!-- Desktop: DataTable -->
      <div class="hidden md:block">
        <DataTable
      title="Daftar Retur"
      subtitle="Riwayat seluruh retur barang"
      :data="returnsList"
      :columns="columns"
      :searchable="true"
      searchPlaceholder="Cari nomor retur, customer..."
      :show-add-button="false"
      :show-import-button="false"
      :show-export-button="false"
    >
      <!-- Desktop: Nomor Retur -->
      <template #cell-return_number="{ row }">
        <router-link
          :to="`/transactions/${row.transaction_id}`"
          class="font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
        >
          {{ row.return_number }}
        </router-link>
      </template>

      <!-- Desktop: Tanggal -->
      <template #cell-created_at="{ row }">
        <span class="text-sm text-gray-600 dark:text-gray-400">
          {{ formatDate(row.created_at) }}
        </span>
      </template>

      <!-- Desktop: Transaksi -->
      <template #cell-transaction="{ row }">
        <span class="text-sm text-gray-600 dark:text-gray-400">
          {{ row.transaction?.transaction_number || '-' }}
        </span>
      </template>

      <!-- Desktop: Customer -->
      <template #cell-customer="{ row }">
        <span class="text-sm text-gray-700 dark:text-gray-300">
          {{ row.transaction?.customer_name || 'Umum' }}
        </span>
      </template>

      <!-- Desktop: Total Refund -->
      <template #cell-total_refund="{ row }">
        <span class="text-sm font-semibold text-error-600 dark:text-error-400">
          - {{ formatCurrency(row.total_refund) }}
        </span>
      </template>

      <!-- Desktop: Items summary -->
      <template #cell-items="{ row }">
        <span class="text-sm text-gray-500 dark:text-gray-400">
          {{ (row.items || []).length }} produk
        </span>
      </template>

      <!-- Desktop: Aksi -->
      <template #cell-actions="{ row }">
        <router-link
          :to="`/transactions/${row.transaction_id}`"
          class="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
        >
          <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          Lihat Transaksi
        </router-link>
      </template>

      <!-- Mobile: Card title -->
      <template #mobile-title="{ row }">
        <div class="flex items-center justify-between">
          <span class="font-semibold text-gray-900 dark:text-white">{{ row.return_number }}</span>
          <span class="text-sm font-semibold text-error-600 dark:text-error-400">
            - {{ formatCurrency(row.total_refund) }}
          </span>
        </div>
      </template>

      <!-- Mobile: Card subtitle -->
      <template #mobile-subtitle="{ row }">
        <div class="mt-1 space-y-0.5">
          <p class="text-xs text-gray-500 dark:text-gray-400">
            {{ formatDate(row.created_at) }}
          </p>
          <p class="text-xs text-gray-500 dark:text-gray-400">
            Transaksi: {{ row.transaction?.transaction_number || '-' }} · {{ row.transaction?.customer_name || 'Umum' }}
          </p>
          <p class="text-xs text-gray-500 dark:text-gray-400">
            {{ (row.items || []).length }} produk diretur
          </p>
          <router-link
            :to="`/transactions/${row.transaction_id}`"
            class="mt-1 inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
          >
            Lihat Transaksi →
          </router-link>
        </div>
      </template>
    </DataTable>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import MobilePageHeader from '@/components/common/MobilePageHeader.vue'
import DataTable from '@/components/tables/DataTable.vue'
import { useReturnsStore } from '@/stores/returns'

const router = useRouter()
const returnsStore = useReturnsStore()
const returnsList = computed(() => returnsStore.returns)

// Pagination & Search
const currentPage = ref(1)
const itemsPerPage = ref(10)
const searchQuery = ref('')
const sortBy = ref<'newest' | 'oldest' | 'highest' | 'lowest'>('newest')
const showSortModal = ref(false)

// Filter logic
const filteredReturns = computed(() => {
  let result = returnsList.value

  // Search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(
      (item: any) =>
        item.return_number.toLowerCase().includes(query) ||
        (item.transaction?.transaction_number && item.transaction.transaction_number.toLowerCase().includes(query)) ||
        (item.transaction?.customer_name && item.transaction.customer_name.toLowerCase().includes(query))
    )
  }

  // Sort
  const sorted = [...result]
  switch (sortBy.value) {
    case 'newest':
      sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      break
    case 'oldest':
      sorted.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      break
    case 'highest':
      sorted.sort((a, b) => b.total_refund - a.total_refund)
      break
    case 'lowest':
      sorted.sort((a, b) => a.total_refund - b.total_refund)
      break
  }

  return sorted
})

// Pagination logic
const totalPages = computed(() => Math.ceil(filteredReturns.value.length / itemsPerPage.value))

const paginatedReturns = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value
  return filteredReturns.value.slice(start, end)
})

const paginationInfo = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value + 1
  const end = Math.min(currentPage.value * itemsPerPage.value, filteredReturns.value.length)
  return `${start}-${end} dari ${filteredReturns.value.length}`
})

const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++
  }
}

const previousPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--
  }
}

const columns = [
  { key: 'return_number', label: 'No. Retur', sortable: true },
  { key: 'created_at', label: 'Tanggal', sortable: true },
  { key: 'transaction', label: 'Transaksi' },
  { key: 'customer', label: 'Customer' },
  { key: 'items', label: 'Item' },
  { key: 'total_refund', label: 'Total Refund', sortable: true },
  { key: 'actions', label: 'Aksi' },
]

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value || 0)

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

onMounted(async () => {
  await returnsStore.fetchAllReturns()
})
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-active > div,
.modal-leave-active > div {
  transition: transform 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from > div,
.modal-leave-to > div {
  transform: translateY(100%);
}

.modal-enter-to > div,
.modal-leave-from > div {
  transform: translateY(0);
}
</style>
