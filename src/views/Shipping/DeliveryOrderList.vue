<template>
  <AdminLayout>
    <PageBreadcrumb pageTitle="Surat Jalan" class="hidden md:block" />

    <!-- Mobile Header -->
    <MobilePageHeader title="Surat Jalan" subtitle="Daftar pengiriman" back-to="/">
      <template #actions>
        <button @click="router.push('/shipping/deliveries/add')" class="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm hover:bg-blue-500 active:scale-95">
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
        </button>
      </template>
    </MobilePageHeader>

    <!-- Desktop Header -->
    <div class="mb-4 hidden items-center justify-between md:flex">
      <h2 class="text-lg font-bold text-gray-900 dark:text-white">Daftar Surat Jalan</h2>
      <button @click="router.push('/shipping/deliveries/add')" class="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-500">
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
        Buat Surat Jalan
      </button>
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
              <button @click.stop="router.push(`/shipping/deliveries/edit/${d.id}`)" class="mr-2 rounded-lg border border-gray-300 px-2.5 py-1 text-[9px] font-medium text-gray-600 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800">Edit</button>
              <button @click.stop="handleDelete(d.id)" class="rounded-lg border border-red-300 px-2.5 py-1 text-[9px] font-medium text-red-600 hover:bg-red-50 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10">Hapus</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Mobile Cards -->
    <div v-else class="grid grid-cols-1 gap-3 md:hidden">
      <div v-for="d in filtered" :key="d.id" @click="router.push(`/shipping/deliveries/${d.id}`)" class="cursor-pointer rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div class="flex items-center justify-between">
          <div class="flex-1 min-w-0">
            <p class="truncate text-sm font-semibold text-gray-900 dark:text-white">{{ d.customer_name || 'Pelanggan' }}</p>
            <p class="text-[10px] text-blue-600 dark:text-blue-400">{{ d.do_number }}</p>
          </div>
          <span class="rounded-lg px-2 py-0.5 text-[9px] font-bold uppercase" :class="getStatusBadge(d.status)">{{ statusLabel(d.status) }}</span>
        </div>
        <div class="mt-2 grid grid-cols-2 gap-1 text-[10px] text-gray-500 dark:text-gray-400">
          <p>📅 {{ formatDate(d.do_date) }}</p>
          <p>🚚 {{ d.vehicle?.plate_number || '-' }}</p>
          <p>🧑‍✈️ {{ d.driver_name || '-' }}</p>
          <p>📦 {{ d.items?.length || 0 }} item</p>
        </div>
        <div class="mt-2 flex justify-end gap-2 border-t border-gray-100 pt-2 dark:border-gray-800">
          <button @click.stop="router.push(`/shipping/deliveries/edit/${d.id}`)" class="rounded-lg border border-gray-300 px-2.5 py-1 text-[9px] font-medium text-gray-600 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800">Edit</button>
          <button @click.stop="handleDelete(d.id)" class="rounded-lg border border-red-300 px-2.5 py-1 text-[9px] font-medium text-red-600 hover:bg-red-50 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10">Hapus</button>
        </div>
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
import { useShippingStore } from '@/stores/shipping'

const router = useRouter()
const store = useShippingStore()

const search = ref('')
const statusFilter = ref('all')

const statusFilters = [
  { value: 'all', label: 'Semua' },
  { value: 'draft', label: 'Draft' },
  { value: 'disiapkan', label: 'Disiapkan' },
  { value: 'dikirim', label: 'Dikirim' },
  { value: 'selesai', label: 'Selesai' },
  { value: 'batal', label: 'Batal' },
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
    case 'batal': return 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400'
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

const formatDate = (d: string) => {
  if (!d) return '-'
  const date = new Date(d)
  if (isNaN(date.getTime())) return d
  return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}

const handleDelete = async (id: string) => {
  if (!confirm('Hapus surat jalan ini?')) return
  try { await store.deleteDeliveryOrder(id) } catch (e: any) { alert(e.message) }
}

onMounted(() => store.fetchDeliveryOrders())
</script>