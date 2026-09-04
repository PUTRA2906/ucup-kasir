<template>
  <AdminLayout>
    <PageBreadcrumb pageTitle="Detail Purchase Order" class="hidden md:block" />

    <!-- Mobile Header -->
    <MobilePageHeader :title="po?.po_number || 'Detail PO'" subtitle="Pesanan Pembelian" @back="$router.back()" />

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-20">
      <div class="text-center">
        <div class="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
        <p class="text-sm text-gray-500 dark:text-gray-400">Memuat PO...</p>
      </div>
    </div>

    <div v-else-if="po" class="mx-auto max-w-3xl space-y-4">
      <!-- Header -->
      <div class="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 class="font-mono text-lg font-bold text-gray-900 dark:text-white">{{ po.po_number }}</h2>
            <p class="text-xs text-gray-500 dark:text-gray-400">Supplier: {{ po.supplier_name || '—' }}</p>
          </div>
          <span class="rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase" :class="getStatusBadge(po.status)">
            {{ getStatusLabel(po.status) }}
          </span>
        </div>
        <div class="mt-3 grid grid-cols-2 gap-2 border-t border-gray-200 pt-3 text-xs dark:border-gray-700">
          <div>
            <p class="text-gray-500 dark:text-gray-400">Tanggal PO</p>
            <p class="font-medium text-gray-900 dark:text-white">{{ formatDate(po.po_date) }}</p>
          </div>
          <div>
            <p class="text-gray-500 dark:text-gray-400">Estimasi Tiba</p>
            <p class="font-medium text-gray-900 dark:text-white">{{ po.expected_date ? formatDate(po.expected_date) : '—' }}</p>
          </div>
        </div>
      </div>

      <!-- Items -->
      <div class="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <h3 class="mb-3 text-sm font-bold text-gray-900 dark:text-white">Barang</h3>
        <!-- Desktop -->
        <div class="hidden overflow-hidden rounded-xl border border-gray-200 md:block dark:border-gray-700">
          <table class="w-full text-left text-sm">
            <thead class="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
              <tr>
                <th class="px-3 py-2 text-[10px] font-bold uppercase text-gray-500 dark:text-gray-400">Barang</th>
                <th class="px-3 py-2 text-[10px] font-bold uppercase text-gray-500 dark:text-gray-400">Qty</th>
                <th class="px-3 py-2 text-[10px] font-bold uppercase text-gray-500 dark:text-gray-400">Harga</th>
                <th class="px-3 py-2 text-[10px] font-bold uppercase text-gray-500 dark:text-gray-400">Disc</th>
                <th class="px-3 py-2 text-right text-[10px] font-bold uppercase text-gray-500 dark:text-gray-400">Subtotal</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
              <tr v-for="it in po.items" :key="it.id">
                <td class="px-3 py-2.5 text-xs text-gray-900 dark:text-white">{{ it.product_name }}</td>
                <td class="px-3 py-2.5 text-xs text-gray-600 dark:text-gray-400">{{ it.quantity }}</td>
                <td class="px-3 py-2.5 text-xs text-gray-600 dark:text-gray-400">{{ formatRupiah(it.price) }}</td>
                <td class="px-3 py-2.5 text-xs text-gray-600 dark:text-gray-400">{{ it.discount ? formatRupiah(it.discount) : '—' }}</td>
                <td class="px-3 py-2.5 text-right text-xs font-semibold text-gray-900 dark:text-white">{{ formatRupiah(it.subtotal) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <!-- Mobile -->
        <div class="space-y-2 md:hidden">
          <div v-for="it in po.items" :key="it.id" class="rounded-xl border border-gray-200 p-3 dark:border-gray-700">
            <div class="flex justify-between gap-2">
              <p class="text-xs font-semibold text-gray-900 dark:text-white">{{ it.product_name }}</p>
              <p class="text-xs font-bold text-gray-900 dark:text-white">{{ formatRupiah(it.subtotal) }}</p>
            </div>
            <p class="mt-1 text-[10px] text-gray-500 dark:text-gray-400">
              {{ it.quantity }} x {{ formatRupiah(it.price) }}<span v-if="it.discount"> · disc {{ formatRupiah(it.discount) }}</span>
            </p>
          </div>
        </div>
      </div>

      <!-- Ringkasan -->
      <div class="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <div class="space-y-1 text-sm">
          <div class="flex justify-between text-gray-600 dark:text-gray-400">
            <span>Subtotal</span>
            <span>{{ formatRupiah(po.subtotal) }}</span>
          </div>
          <div v-if="po.discount" class="flex justify-between text-gray-600 dark:text-gray-400">
            <span>Diskon</span>
            <span>-{{ formatRupiah(po.discount) }}</span>
          </div>
          <div v-if="po.tax" class="flex justify-between text-gray-600 dark:text-gray-400">
            <span>Pajak</span>
            <span>+{{ formatRupiah(po.tax) }}</span>
          </div>
          <div v-if="po.shipping_cost" class="flex justify-between text-gray-600 dark:text-gray-400">
            <span>Ongkir</span>
            <span>+{{ formatRupiah(po.shipping_cost) }}</span>
          </div>
          <div class="flex justify-between border-t border-gray-200 pt-2 text-base font-bold text-gray-900 dark:border-gray-700 dark:text-white">
            <span>Total</span>
            <span>{{ formatRupiah(po.total) }}</span>
          </div>
        </div>
        <p v-if="po.notes" class="mt-3 rounded-xl bg-gray-50 p-3 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400">
          {{ po.notes }}
        </p>
      </div>

      <!-- Aksi -->
      <div class="flex gap-2">
        <button
          @click="$router.push(`/purchasing/grns/add?po_id=${po.id}`)"
          :disabled="['completed', 'cancelled'].includes(po.status)"
          class="flex-1 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
        >
          Terima Barang (GRN)
        </button>
        <button
          v-if="po.status !== 'cancelled'"
          @click="handleChangeStatus('cancelled')"
          class="flex-1 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10"
        >
          Batalkan PO
        </button>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import MobilePageHeader from '@/components/common/MobilePageHeader.vue'
import { usePurchasingStore } from '@/stores/purchasing'
import type { PurchaseOrder } from '@/types/database'

const route = useRoute()
const router = useRouter()
const store = usePurchasingStore()

const po = ref<PurchaseOrder | null>(null)
const loading = ref(false)

const formatRupiah = (n: number) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n || 0)
}

const formatDate = (d: string) => {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    draft: 'Draft', submitted: 'Diajukan', confirmed: 'Dikonfirmasi',
    partial: 'Parsial', completed: 'Selesai', cancelled: 'Batal',
  }
  return labels[status] || status
}

const getStatusBadge = (status: string) => {
  const badges: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
    submitted: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400',
    confirmed: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
    partial: 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400',
    completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400',
    cancelled: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400',
  }
  return badges[status] || 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400'
}

const handleChangeStatus = async (status: PurchaseOrder['status']) => {
  if (status === 'cancelled' && !confirm(`Batalkan PO "${po.value?.po_number}"?`)) return
  try {
    await store.updatePurchaseOrderStatus(route.params.id as string, status)
    await load()
  } catch (e: any) {
    alert(e.message)
  }
}

const load = async () => {
  loading.value = true
  try {
    po.value = await store.getPurchaseOrder(route.params.id as string)
    if (!po.value) router.replace('/purchasing/pos')
  } catch (e: any) {
    alert(e.message)
    router.replace('/purchasing/pos')
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>