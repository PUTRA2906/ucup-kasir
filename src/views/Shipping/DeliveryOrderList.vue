<template>
  <AdminLayout>
    <PageBreadcrumb pageTitle="Surat Jalan" class="hidden md:block" />

    <!-- Mobile Header -->
    <MobilePageHeader title="Surat Jalan" subtitle="Daftar pengiriman" backTo="/dashboard">
      <template #actions>
        <button
          @click="router.push('/shipping/pending-shipments')"
          class="relative flex h-8 items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-2.5 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-white/[0.05]"
        >
          <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
          <span class="hidden sm:inline">Perlu Dikirim</span>
          <span v-if="pendingCount > 0" class="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
            {{ pendingCount }}
          </span>
        </button>
        <button
          @click="router.push('/shipping/deliveries/add')"
          class="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm hover:bg-blue-500 active:scale-95"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </template>
    </MobilePageHeader>

    <!-- Desktop Header -->
    <div class="mb-4 hidden items-center justify-between md:flex">
      <h2 class="text-lg font-bold text-gray-900 dark:text-white">Daftar Surat Jalan</h2>
      <div class="flex items-center gap-2">
        <button @click="router.push('/shipping/pending-shipments')" class="relative flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.05]">
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
          Perlu Dikirim
          <span v-if="pendingCount > 0" class="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">{{ pendingCount }}</span>
        </button>
        <button @click="router.push('/shipping/deliveries/add')" class="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-500">
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
          Buat Surat Jalan
        </button>
      </div>
    </div>

    <!-- Filters -->
    <div class="mb-4 space-y-2">
      <div class="flex gap-2">
        <div class="relative flex-1">
          <svg class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input v-model="search" type="text" placeholder="Cari no. surat jalan / pelanggan / sopir..." class="w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-9 pr-3 text-xs text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500" />
        </div>
      </div>
      <div class="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        <button v-for="f in statusFilters" :key="f.value" @click="statusFilter = f.value" :class="statusFilter === f.value ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 bg-white text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400'" class="flex-shrink-0 rounded-xl border px-3 py-1.5 text-[10px] font-medium transition">
          {{ f.label }}
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="store.loading && store.deliveryOrders.length === 0" class="flex items-center justify-center py-16">
      <div class="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
    </div>

    <div v-else-if="filtered.length === 0" class="rounded-2xl border border-gray-200 bg-white p-10 text-center dark:border-gray-800 dark:bg-gray-900">
      <p class="text-sm text-gray-500 dark:text-gray-400">Tidak ada surat jalan ditemukan.</p>
    </div>

    <!-- Desktop Table -->
    <div v-else class="hidden overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900 md:block">
      <table class="w-full text-left text-xs">
        <thead>
          <tr class="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
            <th class="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">No. Surat Jalan</th>
            <th class="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Tanggal</th>
            <th class="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Pelanggan</th>
            <th class="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Sopir</th>
            <th class="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Kendaraan</th>
            <th class="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Status</th>
            <th class="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-300">Aksi</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="d in filtered" :key="d.id" @click="router.push(`/shipping/deliveries/${d.id}`)" class="cursor-pointer border-b border-gray-100 transition hover:bg-blue-50/50 dark:border-gray-800 dark:hover:bg-blue-500/5">
            <td class="px-4 py-3 font-medium text-blue-600 dark:text-blue-400">{{ d.do_number }}</td>
            <td class="px-4 py-3 text-gray-600 dark:text-gray-400">{{ formatDate(d.do_date) }}</td>
            <td class="px-4 py-3 text-gray-900 dark:text-white">{{ d.customer_name || '-' }}</td>
            <td class="px-4 py-3 text-gray-600 dark:text-gray-400">{{ d.driver_name || '-' }}</td>
            <td class="px-4 py-3 text-gray-600 dark:text-gray-400">{{ d.vehicle?.plate_number || '-' }}</td>
            <td class="px-4 py-3"><span class="rounded-lg px-2 py-0.5 text-[9px] font-bold uppercase" :class="getStatusBadge(d.status)">{{ statusLabel(d.status) }}</span></td>
            <td class="px-4 py-3 text-right">
              <button @click.stop="router.push(`/shipping/deliveries/print/${d.id}`)" class="mr-2 rounded-lg border border-blue-300 px-2.5 py-1 text-[9px] font-medium text-blue-600 hover:bg-blue-50 dark:border-blue-500/30 dark:text-blue-400 dark:hover:bg-blue-500/10">Cetak</button>
              <button @click.stop="router.push(`/shipping/deliveries/edit/${d.id}`)" class="mr-2 rounded-lg border border-gray-300 px-2.5 py-1 text-[9px] font-medium text-gray-600 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800">Edit</button>
              <button @click.stop="handleDelete(d.id)" class="rounded-lg border border-red-300 px-2.5 py-1 text-[9px] font-medium text-red-600 hover:bg-red-50 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10">Hapus</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Mobile Cards -->
    <div v-else class="grid grid-cols-1 gap-3 md:hidden">
      <div v-for="d in filtered" :key="d.id" @click="router.push(`/shipping/deliveries/${d.id}`)" class="cursor-pointer rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-gray-800 dark:bg-gray-900">
        <!-- Header: Customer & Status -->
        <div class="mb-3 flex items-start justify-between">
          <div class="flex-1 min-w-0">
            <h3 class="truncate text-sm font-bold text-gray-900 dark:text-white">{{ d.customer_name || 'Pelanggan Umum' }}</h3>
            <p class="mt-0.5 text-xs font-medium text-blue-600 dark:text-blue-400">{{ d.do_number }}</p>
          </div>
          <span class="ml-2 flex-shrink-0 rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase" :class="getStatusBadge(d.status)">
            {{ statusLabel(d.status) }}
          </span>
        </div>

        <!-- Info Grid -->
        <div class="mb-3 space-y-2 rounded-xl bg-gray-50 p-3 dark:bg-gray-800/50">
          <!-- Tanggal -->
          <div class="flex items-center gap-2 text-xs">
            <svg class="h-4 w-4 flex-shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span class="font-medium text-gray-500 dark:text-gray-400">Tanggal:</span>
            <span class="font-semibold text-gray-900 dark:text-white">{{ formatDate(d.do_date) }}</span>
          </div>

          <!-- Kendaraan -->
          <div class="flex items-center gap-2 text-xs">
            <svg class="h-4 w-4 flex-shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span class="font-medium text-gray-500 dark:text-gray-400">Kendaraan:</span>
            <span class="font-semibold text-gray-900 dark:text-white">{{ d.vehicle?.plate_number || '-' }}</span>
          </div>

          <!-- Sopir -->
          <div class="flex items-center gap-2 text-xs">
            <svg class="h-4 w-4 flex-shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span class="font-medium text-gray-500 dark:text-gray-400">Sopir:</span>
            <span class="font-semibold text-gray-900 dark:text-white">{{ d.driver_name || '-' }}</span>
          </div>

          <!-- Jumlah Item -->
          <div class="flex items-center gap-2 text-xs">
            <svg class="h-4 w-4 flex-shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <span class="font-medium text-gray-500 dark:text-gray-400">Total Item:</span>
            <span class="font-semibold text-gray-900 dark:text-white">{{ d.items?.length || 0 }} item</span>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex gap-2 border-t border-gray-100 pt-3 dark:border-gray-800">
          <button
            @click.stop="router.push(`/shipping/deliveries/print/${d.id}`)"
            class="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-blue-300 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-600 transition hover:bg-blue-100 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20"
          >
            <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Cetak
          </button>
          <button
            @click.stop="router.push(`/shipping/deliveries/edit/${d.id}`)"
            class="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit
          </button>
          <button
            @click.stop="handleDelete(d.id)"
            class="flex items-center justify-center rounded-xl border border-red-300 bg-red-50 p-2 text-red-600 transition hover:bg-red-100 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { useConfirm } from '@/composables/useConfirm'
import { useToast } from '@/composables/useToast'
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import MobilePageHeader from '@/components/common/MobilePageHeader.vue'
import { useShippingStore } from '@/stores/shipping'
import { useTransactionsStore } from '@/stores/transactions'
import type { Transaction } from '@/types/database'

const { confirm } = useConfirm()
const toast = useToast()
const router = useRouter()
const store = useShippingStore()
const txStore = useTransactionsStore()

// Hitung jumlah transaksi yang belum masuk surat jalan
const pendingCount = computed(() => {
  const shippedIds = new Set<string>()
  for (const d of store.deliveryOrders) {
    for (const id of (d.transaction_ids || [])) shippedIds.add(id)
  }
  return (txStore.transactions || []).filter((t: Transaction) =>
    t.status !== 'void' && t.status !== 'batal' && !shippedIds.has(t.id)
  ).length
})

const search = ref('')
const statusFilter = ref('all')

const statusFilters = [
  { value: 'all', label: 'Semua' },
  { value: 'draft', label: 'Draft' },
  { value: 'disiapkan', label: 'Disiapkan' },
  { value: 'dikirim', label: 'Dikirim' },
  { value: 'selesai', label: 'Selesai' },
]

const filtered = computed(() => {
  const q = search.value.toLowerCase()
  return store.deliveryOrders.filter((d) => {
    const matchStatus = statusFilter.value === 'all' || d.status === statusFilter.value
    const matchSearch =
      !q ||
      (d.do_number || '').toLowerCase().includes(q) ||
      (d.customer_name || '').toLowerCase().includes(q) ||
      (d.driver_name || '').toLowerCase().includes(q) ||
      (d.vehicle?.plate_number || '').toLowerCase().includes(q)
    return matchStatus && matchSearch
  })
})

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'draft': return 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
    case 'disiapkan': return 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400'
    case 'dikirim': return 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
    case 'selesai': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
    default: return 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
  }
}

const statusLabel = (s: string) => {
  switch (s) {
    case 'draft': return 'Draft'
    case 'disiapkan': return 'Siap'
    case 'dikirim': return 'Dikirim'
    case 'selesai': return 'Selesai'
    default: return s
  }
}

const formatDate = (d: string) => {
  if (!d) return '-'
  const date = new Date(d)
  if (isNaN(date.getTime())) return d
  return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}

const handleDelete = async (id: string) => {
  if (!(await confirm('Hapus surat jalan ini?'))) return
  try { await store.deleteDeliveryOrder(id) } catch (e: any) { toast.error('Gagal!', e.message) }
}

onMounted(() => {
  store.fetchDeliveryOrders()
  txStore.fetchTransactions()
})
</script>