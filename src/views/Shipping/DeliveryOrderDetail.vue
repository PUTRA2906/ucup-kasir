<template>
  <AdminLayout>
    <PageBreadcrumb pageTitle="Detail Surat Jalan" class="hidden md:block" />

    <!-- Mobile Header -->
    <MobilePageHeader title="Detail Surat Jalan" :subtitle="order?.do_number || 'Loading...'" back-to="/shipping/deliveries">
      <template #actions>
        <button @click="router.push(`/shipping/deliveries/edit/${order?.id}`)" class="flex h-8 w-8 items-center justify-center rounded-xl border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
        </button>
      </template>
    </MobilePageHeader>

    <!-- Loading -->
    <div v-if="store.loading && !order" class="flex items-center justify-center py-20">
      <div class="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
    </div>

    <div v-else-if="!order" class="rounded-2xl border border-gray-200 bg-white p-10 text-center dark:border-gray-800 dark:bg-gray-900">
      <p class="text-sm text-gray-500 dark:text-gray-400">Surat jalan tidak ditemukan.</p>
    </div>

    <div v-else class="space-y-4">
      <!-- Header status -->
      <div class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-lg font-black text-gray-900 dark:text-white">{{ order.do_number }}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400">{{ formatDate(order.do_date) }}</p>
          </div>
          <span class="rounded-xl px-3 py-1 text-[11px] font-bold uppercase" :class="getStatusBadge(order.status)">{{ statusLabel(order.status) }}</span>
        </div>

        <!-- Status action buttons -->
        <div class="mt-4 flex flex-wrap gap-2">
          <button
            v-if="order.status === 'draft'"
            @click="changeStatus('disiapkan')"
            class="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500"
          >
            Mulai Siapkan
          </button>
          <button
            v-if="order.status === 'disiapkan'"
            @click="changeStatus('dikirim')"
            class="rounded-xl bg-amber-500 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-400"
          >
            Kirim Sekarang
          </button>
          <button
            v-if="order.status === 'dikirim'"
            @click="changeStatus('selesai')"
            class="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500"
          >
            Tandai Selesai
          </button>
          <button
            v-if="['draft', 'disiapkan', 'dikirim'].includes(order.status)"
            @click="changeStatus('batal')"
            class="rounded-xl border border-red-300 px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10"
          >
            Batalkan
          </button>
          <button
            v-if="['batal', 'selesai'].includes(order.status)"
            @click="changeStatus('draft')"
            class="rounded-xl border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            Buka Kembali (Draft)
          </button>
        </div>
      </div>

      <!-- Info umum -->
      <div class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h3 class="mb-3 text-sm font-bold text-gray-900 dark:text-white">Informasi</h3>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <p class="text-[10px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">Pelanggan</p>
            <p class="text-xs font-medium text-gray-900 dark:text-white">{{ order.customer_name || '-' }}</p>
          </div>
          <div>
            <p class="text-[10px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">Sopir</p>
            <p class="text-xs font-medium text-gray-900 dark:text-white">{{ order.driver_name || '-' }}</p>
          </div>
          <div>
            <p class="text-[10px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">Kendaraan</p>
            <p class="text-xs font-medium text-gray-900 dark:text-white">{{ order.vehicle?.plate_number || '-' }} <span class="text-gray-400">({{ order.vehicle?.vehicle_type || '' }})</span></p>
          </div>
          <div>
            <p class="text-[10px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">Alamat</p>
            <p class="text-xs font-medium text-gray-900 dark:text-white">{{ order.customer_address || '-' }}</p>
          </div>
          <div v-if="order.notes" class="col-span-2">
            <p class="text-[10px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">Catatan</p>
            <p class="text-xs font-medium text-gray-900 dark:text-white">{{ order.notes }}</p>
          </div>
        </div>
      </div>

      <!-- Items -->
      <div class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h3 class="mb-3 text-sm font-bold text-gray-900 dark:text-white">Item Pengiriman</h3>
        <div v-if="!order.items || order.items.length === 0" class="rounded-xl border border-dashed border-gray-300 py-6 text-center dark:border-gray-700">
          <p class="text-xs text-gray-500 dark:text-gray-400">Tidak ada item.</p>
        </div>
        <div v-else class="space-y-2">
          <div v-for="(it, i) in order.items" :key="i" class="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 dark:border-gray-700 dark:bg-gray-800">
            <div class="flex-1 min-w-0">
              <p class="truncate text-xs font-medium text-gray-900 dark:text-white">{{ it.product_name }}</p>
            </div>
            <p class="text-xs font-semibold text-gray-900 dark:text-white">{{ it.quantity }} <span class="text-[9px] font-normal text-gray-400">item</span></p>
          </div>
        </div>
      </div>

      <!-- Timeline tracking -->
      <div class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h3 class="mb-3 text-sm font-bold text-gray-900 dark:text-white">Riwayat Status</h3>
        <div v-if="!order.tracking || order.tracking.length === 0" class="rounded-xl border border-dashed border-gray-300 py-6 text-center dark:border-gray-700">
          <p class="text-xs text-gray-500 dark:text-gray-400">Belum ada riwayat.</p>
        </div>
        <div v-else class="relative space-y-4">
          <div v-for="(t, i) in [...(order.tracking || [])].reverse()" :key="i" class="relative flex gap-3">
            <!-- line -->
            <div v-if="i < order.tracking!.length - 1" class="absolute left-[7px] top-6 bottom-[-16px] w-0.5 bg-gray-200 dark:bg-gray-700"></div>
            <div class="flex h-[15px] w-[15px] flex-shrink-0 items-center justify-center rounded-full border-2" :class="getDotClass(t.status)">
              <div class="h-1.5 w-1.5 rounded-full bg-current"></div>
            </div>
            <div class="flex-1 pb-1">
              <p class="text-xs font-semibold text-gray-900 dark:text-white">{{ statusLabel(t.status) }}</p>
              <p v-if="t.note" class="text-[10px] text-gray-500 dark:text-gray-400">{{ t.note }}</p>
              <p class="text-[9px] text-gray-400 dark:text-gray-500">{{ formatDateTime(t.created_at) }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Desktop edit button -->
      <div class="hidden md:flex justify-end">
        <button @click="router.push(`/shipping/deliveries/edit/${order.id}`)" class="rounded-xl border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
          Edit Surat Jalan
        </button>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { useConfirm } from '@/composables/useConfirm'
import { useToast } from '@/composables/useToast'
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import MobilePageHeader from '@/components/common/MobilePageHeader.vue'
import { useShippingStore } from '@/stores/shipping'

const { confirm } = useConfirm()
const toast = useToast()
const route = useRoute()
const router = useRouter()
const store = useShippingStore()

const doId = route.params.id as string
const order = computed(() => store.currentOrder)

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

const getDotClass = (status: string) => {
  switch (status) {
    case 'disiapkan': return 'border-blue-500 text-blue-500'
    case 'dikirim': return 'border-amber-500 text-amber-500'
    case 'selesai': return 'border-emerald-500 text-emerald-500'
    case 'batal': return 'border-red-500 text-red-500'
    default: return 'border-gray-400 text-gray-400'
  }
}

const statusLabel = (s: string) => {
  switch (s) {
    case 'draft': return 'Draft'
    case 'disiapkan': return 'Disiapkan'
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

const formatDateTime = (d: string) => {
  if (!d) return '-'
  const date = new Date(d)
  if (isNaN(date.getTime())) return d
  return date.toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const changeStatus = async (status: 'draft' | 'disiapkan' | 'dikirim' | 'selesai' | 'batal') => {
  if (status === 'batal' && !(await confirm('Batalkan surat jalan ini?'))) return
  try {
    await store.updateDeliveryStatus(doId, status)
    await store.getDeliveryOrder(doId)
  } catch (e: any) {
    toast.error('Gagal!', e.message)
  }
}

onMounted(async () => {
  await store.getDeliveryOrder(doId)
})
</script>