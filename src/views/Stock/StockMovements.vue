<template>
  <AdminLayout>
    <PageBreadcrumb pageTitle="Riwayat Mutasi Stok" class="hidden md:block" />
    
    <!-- Mobile Header -->
    <div class="mb-6 flex items-center gap-3 px-4 md:hidden">
      <button
        @click="$router.push('/')"
        class="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-300 bg-white text-gray-500 transition hover:bg-gray-50 active:scale-95 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
      >
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <div class="flex-1">
        <h1 class="text-xl font-extrabold leading-tight tracking-tight text-gray-900 dark:text-white">
          RIWAYAT MUTASI STOK
        </h1>
        <p class="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
          {{ stockStore.movements.length }} Mutasi Stok
        </p>
      </div>
    </div>

    <div class="space-y-6 px-4 md:px-0">
      <!-- Mobile View: Filter & Cards -->
      <div class="space-y-4 md:hidden">
        <!-- Quick Filters -->
        <div class="flex items-center gap-2 overflow-x-auto pb-2">
          <button
            @click="quickFilter('all')"
            :class="[
              'flex-shrink-0 rounded-xl px-4 py-2 text-sm font-medium transition',
              filters.movement_type === '' 
                ? 'bg-brand-500 text-white' 
                : 'bg-white border border-gray-300 text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300'
            ]"
          >
            Semua
          </button>
          <button
            @click="quickFilter('in')"
            :class="[
              'flex-shrink-0 rounded-xl px-4 py-2 text-sm font-medium transition',
              filters.movement_type === 'in' 
                ? 'bg-success-500 text-white' 
                : 'bg-white border border-gray-300 text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300'
            ]"
          >
            Masuk
          </button>
          <button
            @click="quickFilter('out')"
            :class="[
              'flex-shrink-0 rounded-xl px-4 py-2 text-sm font-medium transition',
              filters.movement_type === 'out' 
                ? 'bg-error-500 text-white' 
                : 'bg-white border border-gray-300 text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300'
            ]"
          >
            Keluar
          </button>
          <button
            @click="quickFilter('adjustment')"
            :class="[
              'flex-shrink-0 rounded-xl px-4 py-2 text-sm font-medium transition',
              filters.movement_type === 'adjustment' 
                ? 'bg-warning-500 text-white' 
                : 'bg-white border border-gray-300 text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300'
            ]"
          >
            Penyesuaian
          </button>
        </div>

        <!-- Movement Cards -->
        <div v-if="paginatedMovements.length === 0" class="rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 p-8 text-center dark:border-gray-700 dark:bg-gray-900/50">
          <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
          </svg>
          <p class="mt-4 text-sm font-medium text-gray-900 dark:text-white">
            Tidak ada mutasi stok
          </p>
          <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Belum ada riwayat mutasi stok
          </p>
        </div>

        <div v-else class="space-y-2">
          <div
            v-for="movement in paginatedMovements"
            :key="movement.id"
            @click="viewDetail(movement)"
            class="relative rounded-lg border border-gray-200 bg-white p-2.5 shadow-sm transition active:scale-[0.98] dark:border-gray-800 dark:bg-white/[0.03]"
          >
            <div class="flex items-start gap-2">
              <!-- Icon -->
              <div
                :class="[
                  'flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg',
                  movement.movement_type === 'in' || movement.movement_type === 'return'
                    ? 'bg-success-100 text-success-600 dark:bg-success-900/30 dark:text-success-400'
                    : 'bg-error-100 text-error-600 dark:bg-error-900/30 dark:text-error-400'
                ]"
              >
                <svg v-if="movement.movement_type === 'in' || movement.movement_type === 'return'" class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16V4m0 0L3 8m4-4l4 4" />
                </svg>
                <svg v-else class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </div>

              <div class="min-w-0 flex-1">
                <h3 class="text-[13px] font-semibold text-gray-900 truncate dark:text-white">
                  {{ movement.product_name }}
                </h3>
                
                <div class="mt-0.5 flex items-center gap-1.5">
                  <span
                    :class="[
                      'inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-medium',
                      getMovementTypeClass(movement.movement_type)
                    ]"
                  >
                    {{ getMovementTypeLabel(movement.movement_type) }}
                  </span>
                  <span
                    :class="[
                      'text-[11px] font-bold',
                      movement.movement_type === 'in' || movement.movement_type === 'return'
                        ? 'text-success-600 dark:text-success-500'
                        : 'text-error-600 dark:text-error-500'
                    ]"
                  >
                    {{ movement.movement_type === 'in' || movement.movement_type === 'return' ? '+' : '-' }}{{ movement.quantity }}
                  </span>
                </div>

                <div class="mt-1 flex items-center gap-1.5 text-[10px] text-gray-500 dark:text-gray-400">
                  <span>{{ movement.quantity_before }}</span>
                  <svg class="h-2 w-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
                  </svg>
                  <span class="font-medium text-gray-900 dark:text-white">{{ movement.quantity_after }}</span>
                  <span class="ml-auto text-[9px]">
                    {{ formatDateTimeShort(movement.created_at) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Pagination -->
        <div v-if="filteredMovements.length > 0" class="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-white/[0.03]">
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

      <!-- Desktop Filter Section -->
      <div class="hidden rounded-xl border border-gray-200 bg-white p-6 md:block dark:border-white/[0.08] dark:bg-white/[0.02]">
        <div class="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Produk
            </label>
            <select
              v-model="filters.product_id"
              class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-white/[0.08] dark:bg-white/[0.05] dark:text-white"
            >
              <option value="">Semua Produk</option>
              <option v-for="product in productsStore.products" :key="product.id" :value="product.id">
                {{ product.name }}
              </option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Tipe Mutasi
            </label>
            <select
              v-model="filters.movement_type"
              class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-white/[0.08] dark:bg-white/[0.05] dark:text-white"
            >
              <option value="">Semua Tipe</option>
              <option value="in">Masuk</option>
              <option value="out">Keluar</option>
              <option value="adjustment">Penyesuaian</option>
              <option value="opname">Opname</option>
              <option value="return">Retur</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Dari Tanggal
            </label>
            <input
              v-model="filters.start_date"
              type="date"
              class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-white/[0.08] dark:bg-white/[0.05] dark:text-white"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Sampai Tanggal
            </label>
            <input
              v-model="filters.end_date"
              type="date"
              class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-white/[0.08] dark:bg-white/[0.05] dark:text-white"
            />
          </div>
        </div>

        <div class="mt-4 flex gap-3">
          <button
            @click="applyFilters"
            class="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            Terapkan Filter
          </button>
          <button
            @click="resetFilters"
            class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-white/[0.08] dark:text-gray-300 dark:hover:bg-white/[0.05]"
          >
            Reset
          </button>
        </div>
      </div>

      <!-- DataTable -->
      <DataTable
        class="hidden md:block"
        :columns="columns"
        :data="formattedMovements"
        :per-page="20"
        :searchable="true"
        title="Riwayat Mutasi Stok"
        :subtitle="`Total ${stockStore.movements.length} mutasi stok`"
        :show-export-button="true"
        @export-click="handleExport"
      >
        <template #cell-movement_type="{ value }">
          <span
            :class="[
              'inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium',
              getMovementTypeClass(value)
            ]"
          >
            <component :is="getMovementTypeIcon(value)" class="h-3 w-3" />
            {{ getMovementTypeLabel(value) }}
          </span>
        </template>

        <template #cell-quantity="{ value, row }">
          <span
            :class="[
              'font-medium',
              row.movement_type === 'in' || row.movement_type === 'return'
                ? 'text-success-600 dark:text-success-500'
                : 'text-error-600 dark:text-error-500'
            ]"
          >
            {{ row.movement_type === 'in' || row.movement_type === 'return' ? '+' : '-' }}{{ value }}
          </span>
        </template>

        <template #cell-stock_change="{ row }">
          <div class="flex items-center gap-2 text-sm">
            <span class="text-gray-600 dark:text-gray-400">{{ row.quantity_before }}</span>
            <svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
            </svg>
            <span class="font-medium text-gray-900 dark:text-white">{{ row.quantity_after }}</span>
          </div>
        </template>

        <template #cell-reference="{ row }">
          <button
            v-if="row.reference_type && row.reference_id"
            @click="viewReference(row)"
            class="text-brand-600 hover:text-brand-700 hover:underline dark:text-brand-500"
          >
            {{ getReferenceLabel(row.reference_type) }}
          </button>
          <span v-else class="text-gray-400">-</span>
        </template>

        <template #rowActions="{ row }">
          <div class="flex items-center gap-2">
            <button
              @click="viewDetail(row)"
              class="rounded-lg p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/[0.03]"
              title="Detail"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
              </svg>
            </button>
          </div>
        </template>
      </DataTable>
    </div>

    <!-- Detail Modal -->
    <Teleport to="body">
      <div
        v-if="showDetailModal && selectedMovement"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        @click.self="showDetailModal = false"
      >
        <div class="w-full max-w-2xl rounded-xl bg-white shadow-xl dark:bg-gray-800">
          <!-- Header -->
          <div class="flex items-center justify-between border-b border-gray-200 p-6 dark:border-white/[0.08]">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
              Detail Mutasi Stok
            </h3>
            <button
              @click="showDetailModal = false"
              class="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500 dark:hover:bg-white/[0.05]"
            >
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <!-- Body -->
          <div class="p-6">
            <dl class="space-y-4">
              <div>
                <dt class="text-sm font-medium text-gray-600 dark:text-gray-400">Produk</dt>
                <dd class="mt-1 text-base text-gray-900 dark:text-white">{{ selectedMovement.product_name }}</dd>
              </div>
              <div>
                <dt class="text-sm font-medium text-gray-600 dark:text-gray-400">Tipe Mutasi</dt>
                <dd class="mt-1">
                  <span
                    :class="[
                      'inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium',
                      getMovementTypeClass(selectedMovement.movement_type)
                    ]"
                  >
                    {{ getMovementTypeLabel(selectedMovement.movement_type) }}
                  </span>
                </dd>
              </div>
              <div class="grid grid-cols-3 gap-4">
                <div>
                  <dt class="text-sm font-medium text-gray-600 dark:text-gray-400">Jumlah</dt>
                  <dd class="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                    {{ selectedMovement.movement_type === 'in' || selectedMovement.movement_type === 'return' ? '+' : '-' }}{{ selectedMovement.quantity }}
                  </dd>
                </div>
                <div>
                  <dt class="text-sm font-medium text-gray-600 dark:text-gray-400">Stok Sebelum</dt>
                  <dd class="mt-1 text-lg font-semibold text-gray-900 dark:text-white">{{ selectedMovement.quantity_before }}</dd>
                </div>
                <div>
                  <dt class="text-sm font-medium text-gray-600 dark:text-gray-400">Stok Setelah</dt>
                  <dd class="mt-1 text-lg font-semibold text-gray-900 dark:text-white">{{ selectedMovement.quantity_after }}</dd>
                </div>
              </div>
              <div v-if="selectedMovement.reference_type">
                <dt class="text-sm font-medium text-gray-600 dark:text-gray-400">Referensi</dt>
                <dd class="mt-1 text-base text-gray-900 dark:text-white">{{ getReferenceLabel(selectedMovement.reference_type) }}</dd>
              </div>
              <div v-if="selectedMovement.notes">
                <dt class="text-sm font-medium text-gray-600 dark:text-gray-400">Catatan</dt>
                <dd class="mt-1 text-base text-gray-900 dark:text-white">{{ selectedMovement.notes }}</dd>
              </div>
              <div>
                <dt class="text-sm font-medium text-gray-600 dark:text-gray-400">Waktu</dt>
                <dd class="mt-1 text-base text-gray-900 dark:text-white">{{ formatDateTime(selectedMovement.created_at) }}</dd>
              </div>
            </dl>
          </div>

          <!-- Footer -->
          <div class="border-t border-gray-200 p-6 dark:border-white/[0.08]">
            <button
              @click="showDetailModal = false"
              class="w-full rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 dark:bg-white/[0.05] dark:text-gray-300 dark:hover:bg-white/[0.08]"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, h } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import DataTable from '@/components/tables/DataTable.vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import { useProductsStore } from '@/stores/products'
import { useStockStore } from '@/stores/stock'
import { useToast } from '@/composables/useToast'

const router = useRouter()
const route = useRoute()
const productsStore = useProductsStore()
const stockStore = useStockStore()
const toast = useToast()

const filters = ref({
  product_id: '',
  movement_type: '',
  start_date: '',
  end_date: ''
})

// Mobile states
const currentPage = ref(1)
const itemsPerPage = ref(10)

const showDetailModal = ref(false)
const selectedMovement = ref<any>(null)

const columns = [
  { key: 'created_at', label: 'TANGGAL', sortable: true, format: 'date' as const, width: 'w-2/12' },
  { key: 'product_name', label: 'PRODUK', sortable: true, width: 'w-2/12' },
  { key: 'movement_type', label: 'TIPE', sortable: true, width: 'w-1/12' },
  { key: 'quantity', label: 'JUMLAH', sortable: true, width: 'w-1/12' },
  { key: 'stock_change', label: 'PERUBAHAN STOK', width: 'w-2/12' },
  { key: 'reference', label: 'REFERENSI', width: 'w-2/12' },
  { key: 'notes', label: 'CATATAN', width: 'w-2/12' }
]

const formattedMovements = computed(() => {
  return stockStore.movements.map(movement => ({
    ...movement,
    product_name: movement.product?.name || '-',
    notes: movement.notes || '-'
  }))
})

// Mobile computed properties
const filteredMovements = computed(() => {
  let result = formattedMovements.value

  if (filters.value.movement_type) {
    result = result.filter(m => m.movement_type === filters.value.movement_type)
  }

  if (filters.value.product_id) {
    result = result.filter(m => m.product_id === filters.value.product_id)
  }

  if (filters.value.start_date) {
    result = result.filter(m => new Date(m.created_at) >= new Date(filters.value.start_date))
  }

  if (filters.value.end_date) {
    result = result.filter(m => new Date(m.created_at) <= new Date(filters.value.end_date))
  }

  return result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
})

const totalPages = computed(() => Math.ceil(filteredMovements.value.length / itemsPerPage.value))

const paginatedMovements = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value
  return filteredMovements.value.slice(start, end)
})

const paginationInfo = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value + 1
  const end = Math.min(currentPage.value * itemsPerPage.value, filteredMovements.value.length)
  return `${start}-${end} dari ${filteredMovements.value.length}`
})

const getMovementTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    in: 'Masuk',
    out: 'Keluar',
    adjustment: 'Penyesuaian',
    opname: 'Opname',
    return: 'Retur'
  }
  return labels[type] || type
}

const getMovementTypeClass = (type: string) => {
  const classes: Record<string, string> = {
    in: 'bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-500',
    out: 'bg-error-50 text-error-700 dark:bg-error-500/10 dark:text-error-500',
    adjustment: 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-500',
    opname: 'bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-500',
    return: 'bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-500'
  }
  return classes[type] || 'bg-gray-50 text-gray-700 dark:bg-gray-500/10 dark:text-gray-500'
}

const getMovementTypeIcon = (type: string) => {
  const icons: Record<string, any> = {
    in: () => h('svg', { class: 'h-3 w-3', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
      h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4' })
    ]),
    out: () => h('svg', { class: 'h-3 w-3', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
      h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4' })
    ]),
    adjustment: () => h('svg', { class: 'h-3 w-3', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
      h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' })
    ]),
    opname: () => h('svg', { class: 'h-3 w-3', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
      h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' })
    ]),
    return: () => h('svg', { class: 'h-3 w-3', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, [
      h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6' })
    ])
  }
  return icons[type] || icons.adjustment
}

const getReferenceLabel = (type: string) => {
  const labels: Record<string, string> = {
    transaction: 'Transaksi',
    return: 'Retur',
    adjustment: 'Penyesuaian',
    opname: 'Opname',
    purchase: 'Pembelian'
  }
  return labels[type] || type
}

const formatDateTime = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatDateTimeShort = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Mobile functions
const quickFilter = (type: string) => {
  filters.value.movement_type = type === 'all' ? '' : type
  currentPage.value = 1
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

const applyFilters = async () => {
  try {
    await stockStore.fetchMovements(filters.value)
  } catch (error) {
    console.error('Error fetching movements:', error)
    toast.error('Gagal!', 'Gagal memuat data mutasi stok')
  }
}

const resetFilters = async () => {
  filters.value = {
    product_id: '',
    movement_type: '',
    start_date: '',
    end_date: ''
  }
  await applyFilters()
}

const viewDetail = (movement: any) => {
  selectedMovement.value = movement
  showDetailModal.value = true
}

const viewReference = (movement: any) => {
  if (movement.reference_type === 'transaction' && movement.reference_id) {
    router.push(`/transactions/${movement.reference_id}`)
  } else if (movement.reference_type === 'return' && movement.reference_id) {
    router.push(`/returns/${movement.reference_id}`)
  }
}

const handleExport = () => {
  toast.info('Info', 'Fungsi ekspor akan segera tersedia')
}

onMounted(async () => {
  try {
    // Check if there's a product filter in route query
    if (route.query.product) {
      filters.value.product_id = route.query.product as string
    }

    await Promise.all([
      productsStore.fetchProducts(),
      stockStore.fetchMovements(filters.value)
    ])
  } catch (error) {
    console.error('Error loading data:', error)
    toast.error('Gagal!', 'Gagal memuat data. Silakan refresh halaman.')
  }
})
</script>
