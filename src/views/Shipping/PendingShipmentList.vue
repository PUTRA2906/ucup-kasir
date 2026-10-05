<template>
  <AdminLayout>
    <PageBreadcrumb pageTitle="Transaksi Belum Dikirim" class="hidden md:block" />

    <!-- Mobile Header -->
    <MobilePageHeader title="Transaksi Belum Dikirim" subtitle="Pilih transaksi untuk dibuat surat jalan">
      <template #actions>
        <button
          v-if="selectedTxIds.length > 0"
          @click="createDeliveryOrder"
          class="flex h-8 items-center gap-1 rounded-xl bg-blue-600 px-3 text-xs font-semibold text-white shadow-sm hover:bg-blue-500 active:scale-95"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
          Buat DO ({{ selectedTxIds.length }})
        </button>
      </template>
    </MobilePageHeader>

    <!-- Desktop Header -->
    <div class="mb-4 hidden items-center justify-between md:flex">
      <div>
        <h2 class="text-lg font-bold text-gray-900 dark:text-white">Transaksi Belum Dikirim</h2>
        <p class="text-xs text-gray-500 dark:text-gray-400">Pilih transaksi yang akan dibuat surat jalan</p>
      </div>
      <button
        v-if="selectedTxIds.length > 0"
        @click="createDeliveryOrder"
        class="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-500"
      >
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
        Buat Surat Jalan ({{ selectedTxIds.length }})
      </button>
    </div>

    <!-- Filter -->
    <div class="mb-4 flex items-center gap-2 pl-3.5 md:pl-0">
      <input type="checkbox" :checked="isAllSelected" @change="toggleAll" class="h-4 w-4 shrink-0 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-200" />
      <div class="relative flex-1">
        <svg class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        <input v-model="search" type="text" placeholder="Cari nomor transaksi / pelanggan..." class="w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-9 pr-3 text-xs text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500" />
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-16">
      <div class="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
    </div>

    <div v-else-if="filtered.length === 0" class="rounded-2xl border border-gray-200 bg-white p-10 text-center dark:border-gray-800 dark:bg-gray-900">
      <svg class="mx-auto mb-3 h-12 w-12 text-gray-300 dark:text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
      </svg>
      <p class="text-sm font-medium text-gray-900 dark:text-white">Tidak ada transaksi yang perlu dikirim</p>
      <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Semua transaksi sudah masuk surat jalan</p>
    </div>

    <!-- Desktop Table -->
    <div v-else class="hidden overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900 md:block">
      <table class="w-full text-left text-xs">
        <thead>
          <tr class="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
            <th class="px-4 py-3">
              <input type="checkbox" @change="toggleAll" :checked="isAllSelected" class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-200" />
            </th>
            <th class="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">No. Transaksi</th>
            <th class="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Tanggal</th>
            <th class="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Pelanggan</th>
            <th class="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Total</th>
            <th class="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Item</th>
            <th class="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Status Bayar</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="t in paginated"
            :key="t.id"
            @click="toggleTransaction(t.id)"
            class="cursor-pointer border-b border-gray-100 transition hover:bg-blue-50/50 dark:border-gray-800 dark:hover:bg-blue-500/5"
          >
            <td class="px-4 py-3">
              <input type="checkbox" :checked="selectedTxIds.includes(t.id)" @click.stop="toggleTransaction(t.id)" class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-200" />
            </td>
            <td class="px-4 py-3 font-medium text-blue-600 dark:text-blue-400">{{ t.transaction_number }}</td>
            <td class="px-4 py-3 text-gray-600 dark:text-gray-400">{{ formatDate(t.created_at) }}</td>
            <td class="px-4 py-3 text-gray-900 dark:text-white">{{ t.customer_name || 'Umum' }}</td>
            <td class="px-4 py-3 font-semibold text-gray-900 dark:text-white">{{ formatMoney(t.total || 0) }}</td>
            <td class="px-4 py-3 text-gray-600 dark:text-gray-400">{{ t.items?.length || 0 }} item</td>
            <td class="px-4 py-3">
              <span class="rounded-lg px-2 py-0.5 text-[9px] font-bold uppercase" :class="getPaymentBadge(t.payment_status)">{{ getPaymentLabel(t.payment_status) }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Mobile Cards -->
    <div v-else class="grid grid-cols-1 gap-3 md:hidden">
      <div
        v-for="t in paginated"
        :key="t.id"
        @click="toggleTransaction(t.id)"
        :class="[
          'cursor-pointer rounded-2xl border p-3.5 shadow-sm transition',
          selectedTxIds.includes(t.id)
            ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-500/10'
            : 'border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900'
        ]"
      >
        <div class="flex items-start justify-between">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <input type="checkbox" :checked="selectedTxIds.includes(t.id)" @click.stop="toggleTransaction(t.id)" class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-200" />
              <div class="min-w-0">
                <p class="truncate text-sm font-semibold text-gray-900 dark:text-white">{{ t.customer_name || 'Umum' }}</p>
                <p class="text-[10px] text-blue-600 dark:text-blue-400">{{ t.transaction_number }}</p>
              </div>
            </div>
          </div>
          <span class="rounded-lg px-2 py-0.5 text-[9px] font-bold uppercase" :class="getPaymentBadge(t.payment_status)">{{ getPaymentLabel(t.payment_status) }}</span>
        </div>
        <div class="mt-2 grid grid-cols-2 gap-1 text-[10px] text-gray-500 dark:text-gray-400">
          <p>📅 {{ formatDate(t.created_at) }}</p>
          <p>📦 {{ t.items?.length || 0 }} item</p>
          <p class="col-span-2 font-semibold text-gray-900 dark:text-white">{{ formatMoney(t.total || 0) }}</p>
        </div>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="!loading && totalPages > 1" class="mt-4 flex items-center justify-between rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
      <button
        @click="currentPage--"
        :disabled="currentPage === 1"
        class="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed dark:text-gray-300 dark:hover:bg-gray-800"
      >
        <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
        Prev
      </button>
      <span class="text-xs font-medium text-gray-600 dark:text-gray-400">
        Hal {{ currentPage }} dari {{ totalPages }}
      </span>
      <button
        @click="currentPage++"
        :disabled="currentPage === totalPages"
        class="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed dark:text-gray-300 dark:hover:bg-gray-800"
      >
        Next
        <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>

    <!-- Floating Action Button (Mobile) -->
    <div v-if="selectedTxIds.length > 0" class="fixed bottom-6 right-6 z-10 md:hidden">
      <button
        @click="createDeliveryOrder"
        class="flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-500 active:scale-95"
      >
        <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
      </button>
      <div class="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
        {{ selectedTxIds.length }}
      </div>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { useToast } from '@/composables/useToast'
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import MobilePageHeader from '@/components/common/MobilePageHeader.vue'
import { useTransactionsStore } from '@/stores/transactions'
import { useShippingStore } from '@/stores/shipping'
import type { Transaction } from '@/types/database'

const toast = useToast()
const router = useRouter()
const txStore = useTransactionsStore()
const shippingStore = useShippingStore()

const search = ref('')
const selectedTxIds = ref<string[]>([])
const loading = ref(false)
const shippedTransactionIds = ref<Set<string>>(new Set())
const currentPage = ref(1)
const perPage = 10

// Semua transaksi yang belum ada di surat jalan (termasuk yang belum lunas)
const pendingTransactions = computed(() => {
  return (txStore.transactions || []).filter((t: Transaction) => {
    const notVoided = t.status !== 'void' && t.status !== 'batal'
    const notShipped = !shippedTransactionIds.value.has(t.id)
    return notVoided && notShipped
  })
})

const filtered = computed(() => {
  const q = search.value.toLowerCase()
  if (!q) return pendingTransactions.value
  return pendingTransactions.value.filter((t) =>
    (t.transaction_number || '').toLowerCase().includes(q) ||
    (t.customer_name || '').toLowerCase().includes(q)
  )
})

const totalPages = computed(() => Math.ceil(filtered.value.length / perPage))

const paginated = computed(() => {
  const start = (currentPage.value - 1) * perPage
  return filtered.value.slice(start, start + perPage)
})

watch(search, () => { currentPage.value = 1 })
watch(() => filtered.value.length, () => {
  if (currentPage.value > totalPages.value) currentPage.value = Math.max(1, totalPages.value)
})

const isAllSelected = computed(() =>
  filtered.value.length > 0 && filtered.value.every((t) => selectedTxIds.value.includes(t.id))
)

const formatMoney = (n: number) => 'Rp ' + new Intl.NumberFormat('id-ID').format(n || 0)

const formatDate = (d: string) => {
  if (!d) return '-'
  const date = new Date(d)
  if (isNaN(date.getTime())) return d
  return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}

const getPaymentBadge = (status: string) => {
  if (status === 'lunas') return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
  if (status === 'cicilan' || status === 'sebagian') return 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
  return 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400'
}

const getPaymentLabel = (status: string) => {
  if (status === 'lunas') return 'Lunas'
  if (status === 'cicilan' || status === 'sebagian') return 'Cicilan'
  return 'Belum Lunas'
}

const toggleTransaction = (txId: string) => {
  const idx = selectedTxIds.value.indexOf(txId)
  if (idx > -1) {
    selectedTxIds.value.splice(idx, 1)
  } else {
    selectedTxIds.value.push(txId)
  }
}

const toggleAll = () => {
  if (isAllSelected.value) {
    selectedTxIds.value = []
  } else {
    selectedTxIds.value = filtered.value.map((t) => t.id)
  }
}

const createDeliveryOrder = () => {
  if (selectedTxIds.value.length === 0) {
    toast.warning('Perhatian', 'Pilih minimal satu transaksi')
    return
  }
  // Navigasi ke form dengan query params berisi transaksi terpilih
  router.push({
    path: '/shipping/deliveries/add',
    query: { tx: selectedTxIds.value.join(',') }
  })
}

onMounted(async () => {
  loading.value = true
  try {
    await Promise.all([
      txStore.fetchTransactions(),
      shippingStore.fetchDeliveryOrders()
    ])

    // Kumpulkan semua ID transaksi yang sudah ada di surat jalan
    const shipped = new Set<string>()
    for (const dorder of shippingStore.deliveryOrders) {
      const txIds = dorder.transaction_ids || []
      txIds.forEach((id) => shipped.add(id))
    }
    shippedTransactionIds.value = shipped
  } catch (e: any) {
    toast.error('Gagal!', e.message)
  } finally {
    loading.value = false
  }
})
</script>
