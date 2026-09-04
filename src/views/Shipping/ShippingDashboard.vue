<template>
  <AdminLayout>
    <PageBreadcrumb pageTitle="Dashboard Pengiriman" class="hidden md:block" />

    <!-- Mobile Header -->
    <MobilePageHeader title="Pengiriman" subtitle="Dashboard &amp; rekap" @back="$router.back()" />

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-20">
      <div class="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
    </div>

    <div v-else class="space-y-4">
      <!-- Statistik -->
      <div class="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div class="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-3.5 shadow-sm dark:border-blue-500/30 dark:from-blue-500/10 dark:to-gray-900">
          <div class="mb-2 flex items-center justify-between">
            <span class="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Total Pengiriman</span>
            <div class="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-500/20">
              <svg class="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2-1m4-1l2 1m4-1l2 1" />
              </svg>
            </div>
          </div>
          <p class="mb-0.5 text-lg font-black leading-none text-gray-900 dark:text-white">{{ stats.total }}</p>
          <p class="text-[9px] text-blue-600 dark:text-blue-400">Surat Jalan</p>
        </div>

        <div class="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-3.5 shadow-sm dark:border-amber-500/30 dark:from-amber-500/10 dark:to-gray-900">
          <div class="mb-2 flex items-center justify-between">
            <span class="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Dalam Pengiriman</span>
            <div class="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-500/20">
              <svg class="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
          <p class="mb-0.5 text-lg font-black leading-none text-gray-900 dark:text-white">{{ stats.inTransit }}</p>
          <p class="text-[9px] text-amber-600 dark:text-amber-400">Sedang dikirim</p>
        </div>

        <div class="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-3.5 shadow-sm dark:border-emerald-500/30 dark:from-emerald-500/10 dark:to-gray-900">
          <div class="mb-2 flex items-center justify-between">
            <span class="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Selesai</span>
            <div class="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/20">
              <svg class="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p class="mb-0.5 text-lg font-black leading-none text-gray-900 dark:text-white">{{ stats.completed }}</p>
          <p class="text-[9px] text-emerald-600 dark:text-emerald-400">Terkirim</p>
        </div>

        <div class="rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50 to-white p-3.5 shadow-sm dark:border-purple-500/30 dark:from-purple-500/10 dark:to-gray-900">
          <div class="mb-2 flex items-center justify-between">
            <span class="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">Kendaraan</span>
            <div class="flex h-6 w-6 items-center justify-center rounded-lg bg-purple-500/20">
              <svg class="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
            </div>
          </div>
          <p class="mb-0.5 text-lg font-black leading-none text-gray-900 dark:text-white">{{ stats.availableVehicles }}</p>
          <p class="text-[9px] text-purple-600 dark:text-purple-400">Tersedia</p>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <h3 class="mb-3 text-sm font-bold text-gray-900 dark:text-white">Aksi Cepat</h3>
        <div class="grid grid-cols-2 gap-2 md:grid-cols-3">
          <button @click="router.push('/shipping/deliveries/add')" class="rounded-xl border border-gray-200 p-3 text-left text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
            <span class="mb-1 block text-base">📋</span>Buat Surat Jalan
          </button>
          <button @click="router.push('/shipping/deliveries')" class="rounded-xl border border-gray-200 p-3 text-left text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
            <span class="mb-1 block text-base">🚚</span>Daftar Pengiriman
          </button>
          <button @click="router.push('/shipping/vehicles')" class="rounded-xl border border-gray-200 p-3 text-left text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
            <span class="mb-1 block text-base">🛻</span>Kelola Kendaraan
          </button>
        </div>
      </div>

      <!-- Pengiriman Aktif -->
      <div class="rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div class="mb-3 flex items-center justify-between border-b border-gray-200 pb-2 dark:border-gray-700">
          <h3 class="text-sm font-bold text-gray-900 dark:text-white">Pengiriman Aktif</h3>
          <button @click="router.push('/shipping/deliveries')" class="text-[10px] font-medium text-blue-600 hover:underline dark:text-blue-400">Lihat semua →</button>
        </div>
        <div v-if="activeDeliveries.length === 0" class="py-6 text-center">
          <p class="text-sm text-gray-500 dark:text-gray-400">Tidak ada pengiriman aktif.</p>
          <button @click="router.push('/shipping/deliveries/add')" class="mt-3 rounded-xl bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-500">+ Buat Surat Jalan</button>
        </div>
        <div v-else class="space-y-2">
          <div
            v-for="d in activeDeliveries"
            :key="d.id"
            @click="router.push(`/shipping/deliveries/${d.id}`)"
            class="flex cursor-pointer items-center gap-2.5 rounded-xl border border-gray-200 bg-gray-50 p-2.5 hover:border-blue-300 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-500/50"
          >
            <div class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-[10px] font-bold text-amber-600 dark:text-amber-400">
              {{ d.do_number?.slice(-4) }}
            </div>
            <div class="flex-1 min-w-0">
              <p class="truncate text-xs font-medium text-gray-900 dark:text-white">{{ d.customer_name || 'Pelanggan' }}</p>
              <p class="text-[9px] text-gray-500 dark:text-gray-400">{{ d.do_number }} · {{ d.driver_name || 'Tanpa sopir' }}</p>
            </div>
            <span class="rounded-lg px-2 py-0.5 text-[9px] font-bold uppercase" :class="getStatusBadge(d.status)">{{ statusLabel(d.status) }}</span>
          </div>
        </div>
      </div>

      <!-- Status Kendaraan -->
      <div class="rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div class="mb-3 flex items-center justify-between border-b border-gray-200 pb-2 dark:border-gray-700">
          <h3 class="text-sm font-bold text-gray-900 dark:text-white">Status Kendaraan</h3>
          <button @click="router.push('/shipping/vehicles')" class="text-[10px] font-medium text-blue-600 hover:underline dark:text-blue-400">Kelola →</button>
        </div>
        <div v-if="store.vehicles.length === 0" class="py-6 text-center">
          <p class="text-sm text-gray-500 dark:text-gray-400">Belum ada kendaraan.</p>
        </div>
        <div v-else class="space-y-2">
          <div v-for="v in store.vehicles" :key="v.id" class="flex items-center gap-2.5 rounded-xl border border-gray-200 bg-gray-50 p-2.5 dark:border-gray-700 dark:bg-gray-800">
            <div class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-purple-500/10 text-[10px] font-bold text-purple-600 dark:text-purple-400">
              🛻
            </div>
            <div class="flex-1 min-w-0">
              <p class="truncate text-xs font-medium text-gray-900 dark:text-white">{{ v.plate_number }}</p>
              <p class="text-[9px] text-gray-500 dark:text-gray-400">{{ v.vehicle_type }}{{ v.brand ? ' · ' + v.brand : '' }}</p>
            </div>
            <span class="rounded-lg px-2 py-0.5 text-[9px] font-bold uppercase" :class="getVehicleStatusBadge(v.status)">{{ v.status }}</span>
          </div>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import MobilePageHeader from '@/components/common/MobilePageHeader.vue'
import { useShippingStore } from '@/stores/shipping'

const router = useRouter()
const store = useShippingStore()

const loading = computed(() => store.loading)

const stats = computed(() => {
  const orders = store.deliveryOrders
  return {
    total: orders.length,
    inTransit: orders.filter((d) => d.status === 'dikirim').length,
    completed: orders.filter((d) => d.status === 'selesai').length,
    availableVehicles: store.vehicles.filter((v) => v.status === 'tersedia').length,
  }
})

const activeDeliveries = computed(() =>
  store.deliveryOrders.filter((d) => d.status === 'dikirim' || d.status === 'disiapkan')
)

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'draft': return 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
    case 'disiapkan': return 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400'
    case 'dikirim': return 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
    case 'selesai': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
    case 'batal': return 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400'
    default: return 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
  }
}

const getVehicleStatusBadge = (status: string) => {
  switch (status) {
    case 'tersedia': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
    case 'dipakai': return 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
    case 'service': return 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400'
    default: return 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
  }
}

const statusLabel = (s: string) => {
  switch (s) {
    case 'draft': return 'Draft'
    case 'disiapkan': return 'Siap'
    case 'dikirim': return 'Dikirim'
    case 'selesai': return 'Selesai'
    case 'batal': return 'Batal'
    default: return s
  }
}

onMounted(async () => {
  await Promise.all([
    store.fetchDeliveryOrders(),
    store.fetchVehicles(),
  ])
})
</script>