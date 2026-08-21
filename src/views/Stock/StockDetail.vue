<template>
  <AdminLayout>
    <!-- Mobile View -->
    <div class="md:hidden">
      <!-- Loading Skeleton -->
      <div v-if="loading" class="space-y-4 px-4 pb-6 animate-pulse">
        <!-- Header -->
        <div class="flex items-center gap-2.5">
          <div class="h-9 w-9 rounded-xl bg-gray-200 dark:bg-gray-800"></div>
          <div class="space-y-1.5">
            <div class="h-4 w-32 rounded bg-gray-200 dark:bg-gray-800"></div>
            <div class="h-2.5 w-24 rounded bg-gray-200 dark:bg-gray-800"></div>
          </div>
        </div>
        <!-- Info Card -->
        <div class="rounded-2xl border border-gray-200 bg-white p-4 space-y-3 dark:border-gray-800 dark:bg-white/[0.03]">
          <div class="h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-800"></div>
          <div class="grid grid-cols-3 gap-2">
            <div v-for="i in 3" :key="i" class="h-14 rounded-xl bg-gray-200 dark:bg-gray-800"></div>
          </div>
        </div>
        <!-- Movements -->
        <div class="space-y-2">
          <div class="h-3 w-24 rounded bg-gray-200 dark:bg-gray-800"></div>
          <div v-for="i in 5" :key="i" class="h-14 rounded-2xl bg-gray-200 dark:bg-gray-800"></div>
        </div>
      </div>

      <!-- Content -->
      <div v-else-if="product" class="space-y-4 px-4 pb-28">
        <!-- Header -->
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <button
              @click="router.push('/stock')"
              class="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 transition active:scale-95 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 class="text-base font-extrabold leading-tight text-gray-900 dark:text-white">Detail Stok</h1>
              <p class="text-[10px] text-gray-500 dark:text-gray-400">{{ product.category?.name || 'Tanpa Kategori' }}</p>
            </div>
          </div>
          <button
            @click="openAdjustment"
            class="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-3 py-2 text-xs font-bold text-white shadow-md transition active:scale-95"
          >
            <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Sesuaikan
          </button>
        </div>

        <!-- Info Produk -->
        <div class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0 flex-1">
              <h2 class="text-sm font-extrabold leading-snug text-gray-900 dark:text-white">{{ product.name }}</h2>
              <p class="mt-0.5 font-mono text-[10px] text-gray-400 dark:text-gray-500">{{ product.sku || '-' }}</p>
              <p v-if="product.barcode" class="font-mono text-[10px] text-gray-400 dark:text-gray-500">
                Barcode: {{ product.barcode }}
              </p>
            </div>
            <span
              class="flex-shrink-0 rounded-lg border px-2 py-0.5 text-[10px] font-bold"
              :class="stockBadgeClass"
            >
              {{ stockBadgeLabel }}
            </span>
          </div>

          <!-- Metrik Stok -->
          <div class="mt-3 grid grid-cols-3 divide-x divide-gray-200 rounded-2xl border border-gray-100 bg-gray-50 py-2.5 text-center dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-900/50">
            <div class="px-2">
              <span class="block text-[10px] font-medium text-gray-500 dark:text-gray-400">Stok Saat Ini</span>
              <span class="mt-0.5 block text-base font-extrabold" :class="stockTextClass">
                {{ product.stock ?? 0 }}
              </span>
            </div>
            <div class="px-2">
              <span class="block text-[10px] font-medium text-gray-500 dark:text-gray-400">Stok Min</span>
              <span class="mt-0.5 block text-base font-extrabold text-gray-900 dark:text-white">
                {{ product.minimum_stock ?? 10 }}
              </span>
            </div>
            <div class="px-2">
              <span class="block text-[10px] font-medium text-gray-500 dark:text-gray-400">Harga Pokok</span>
              <span class="mt-0.5 block text-xs font-extrabold text-gray-900 dark:text-white">
                {{ formatCurrencyShort(product.cost_price || 0) }}
              </span>
            </div>
          </div>
        </div>

        <!-- Riwayat Mutasi -->
        <div class="space-y-2.5">
          <div class="flex items-center justify-between px-0.5">
            <span class="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
              Riwayat Mutasi
            </span>
            <span class="text-[10px] font-medium text-gray-400 dark:text-gray-500">
              {{ movements.length }} entri
            </span>
          </div>

          <!-- Empty state -->
          <div
            v-if="movements.length === 0"
            class="rounded-2xl border border-dashed border-gray-300 bg-white p-6 text-center dark:border-gray-700 dark:bg-white/[0.03]"
          >
            <svg class="mx-auto h-8 w-8 text-gray-300 dark:text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p class="mt-2 text-xs text-gray-400 dark:text-gray-500">Belum ada riwayat mutasi</p>
          </div>

          <!-- Movement items -->
          <div
            v-for="movement in movements"
            :key="movement.id"
            class="flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]"
          >
            <div class="flex items-center gap-3">
              <!-- Icon tipe -->
              <div
                class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl"
                :class="movementIconBg(movement.movement_type)"
              >
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    v-if="movement.movement_type === 'in'"
                    stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M5 10l7-7m0 0l7 7m-7-7v18"
                  />
                  <path
                    v-else-if="movement.movement_type === 'out'"
                    stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M19 14l-7 7m0 0l-7-7m7 7V3"
                  />
                  <path
                    v-else-if="movement.movement_type === 'return'"
                    stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                  <path
                    v-else
                    stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </div>
              <div>
                <p class="text-xs font-semibold text-gray-900 dark:text-white">
                  {{ movementLabel(movement.movement_type) }}
                </p>
                <p class="text-[10px] text-gray-400 dark:text-gray-500">
                  {{ formatDate(movement.created_at) }}
                </p>
                <p v-if="movement.notes" class="mt-0.5 text-[10px] italic text-gray-400 dark:text-gray-500">
                  {{ movement.notes }}
                </p>
              </div>
            </div>
            <div class="text-right">
              <span
                class="block text-sm font-extrabold"
                :class="movement.movement_type === 'out' ? 'text-error-500' : 'text-success-500'"
              >
                {{ movement.movement_type === 'out' ? '-' : '+' }}{{ movement.quantity }}
              </span>
              <span class="text-[10px] text-gray-400 dark:text-gray-500">
                {{ movement.quantity_before }} → {{ movement.quantity_after }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Not found -->
      <div v-else class="flex flex-col items-center justify-center px-4 py-16 text-center">
        <p class="text-gray-500 dark:text-gray-400">Produk tidak ditemukan</p>
        <button
          @click="router.push('/stock')"
          class="mt-4 rounded-xl bg-brand-500 px-4 py-2 text-sm font-bold text-white"
        >
          Kembali ke Stok
        </button>
      </div>
    </div>

    <!-- Desktop: redirect ke daftar stok -->
    <div class="hidden md:block">
      <div class="flex flex-col items-center justify-center py-16 text-center">
        <p class="text-gray-500 dark:text-gray-400">Halaman ini khusus tampilan mobile.</p>
        <button
          @click="router.push('/stock')"
          class="mt-4 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white"
        >
          Ke Halaman Stok
        </button>
      </div>
    </div>

    <!-- Stock Adjustment Modal -->
    <StockAdjustmentModal
      v-model="showAdjustmentModal"
      :product="product"
      @saved="handleAdjustmentSaved"
    />
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import StockAdjustmentModal from './StockAdjustmentModal.vue'
import { useProductsStore } from '@/stores/products'
import { useStockStore } from '@/stores/stock'
import { useToast } from '@/composables/useToast'
import type { StockMovement } from '@/stores/stock'

const router = useRouter()
const route = useRoute()
const productsStore = useProductsStore()
const stockStore = useStockStore()
const toast = useToast()

const productId = route.params.id as string
const loading = ref(true)
const showAdjustmentModal = ref(false)
const movements = ref<StockMovement[]>([])

const product = computed(() =>
  productsStore.products.find((p) => p.id === productId)
)

const stockTextClass = computed(() => {
  const stock = product.value?.stock ?? 0
  const min = product.value?.minimum_stock ?? 10
  if (stock === 0) return 'text-error-500'
  if (stock <= min) return 'text-warning-500'
  return 'text-success-500'
})

const stockBadgeClass = computed(() => {
  const stock = product.value?.stock ?? 0
  const min = product.value?.minimum_stock ?? 10
  if (stock === 0) return 'bg-error-500/10 text-error-600 border-error-500/20 dark:text-error-400'
  if (stock <= min) return 'bg-warning-500/10 text-warning-600 border-warning-500/20 dark:text-warning-400'
  return 'bg-success-500/10 text-success-600 border-success-500/20 dark:text-success-400'
})

const stockBadgeLabel = computed(() => {
  const stock = product.value?.stock ?? 0
  const min = product.value?.minimum_stock ?? 10
  if (stock === 0) return 'Habis'
  if (stock <= min) return 'Menipis'
  return 'Stok Aman'
})

const movementIconBg = (type: string) => {
  switch (type) {
    case 'in': return 'bg-success-500/10 text-success-500'
    case 'out': return 'bg-error-500/10 text-error-500'
    case 'return': return 'bg-blue-500/10 text-blue-500'
    default: return 'bg-gray-500/10 text-gray-500'
  }
}

const movementLabel = (type: string) => {
  const labels: Record<string, string> = {
    in: 'Stok Masuk',
    out: 'Stok Keluar',
    adjustment: 'Penyesuaian',
    opname: 'Stock Opname',
    return: 'Retur',
  }
  return labels[type] || type
}

const formatDate = (value: string) => {
  return new Date(value).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const formatCurrencyShort = (value: number) => {
  if (value >= 1000000) return `Rp ${(value / 1000000).toFixed(1)}jt`
  if (value >= 1000) return `Rp ${(value / 1000).toFixed(0)}k`
  return `Rp ${value.toLocaleString('id-ID')}`
}

const openAdjustment = () => {
  showAdjustmentModal.value = true
}

const handleAdjustmentSaved = async () => {
  await productsStore.fetchProducts()
  await stockStore.fetchMovements({ product_id: productId })
  movements.value = stockStore.movements
  toast.success('Berhasil!', 'Penyesuaian stok berhasil disimpan')
}

onMounted(async () => {
  try {
    await Promise.all([
      productsStore.fetchProducts(),
      stockStore.fetchMovements({ product_id: productId }),
    ])
    movements.value = stockStore.movements
  } catch (error) {
    console.error('Error loading stock detail:', error)
    toast.error('Gagal!', 'Gagal memuat data stok')
  } finally {
    loading.value = false
  }
})
</script>
