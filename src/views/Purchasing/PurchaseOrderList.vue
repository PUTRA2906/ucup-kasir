<template>
  <AdminLayout>
    <PageBreadcrumb pageTitle="Purchase Order" class="hidden md:block" />

    <!-- Mobile Header -->
    <MobilePageHeader title="Purchase Order" subtitle="Pesanan Pembelian" @back="$router.back()">
      <template #actions>
        <button
          @click="$router.push('/purchasing/pos/add')"
          class="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-white hover:bg-blue-500"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </button>
      </template>
    </MobilePageHeader>

    <!-- Desktop Header -->
    <div class="mb-4 hidden items-center justify-between md:flex">
      <div></div>
      <button
        @click="$router.push('/purchasing/pos/add')"
        class="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
      >
        + Buat PO
      </button>
    </div>

    <!-- Loading -->
    <div v-if="store.loading" class="flex items-center justify-center py-20">
      <div class="text-center">
        <div class="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
        <p class="text-sm text-gray-500 dark:text-gray-400">Memuat PO...</p>
      </div>
    </div>

    <div v-else>
      <!-- Error -->
      <div v-if="store.error" class="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-500/30 dark:bg-red-500/10">
        <p class="text-sm text-red-600 dark:text-red-400">{{ store.error }}</p>
      </div>

      <!-- Empty -->
      <div v-if="!store.error && store.purchaseOrders.length === 0" class="rounded-2xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-gray-900">
        <div class="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10">
          <svg class="h-7 w-7 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 class="text-sm font-bold text-gray-900 dark:text-white">Belum ada Purchase Order</h3>
        <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Buat PO untuk memesan barang ke supplier.</p>
        <button
          @click="$router.push('/purchasing/pos/add')"
          class="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
        >
          Buat PO
        </button>
      </div>

      <!-- PO List -->
      <div v-else-if="store.purchaseOrders.length > 0" class="space-y-3">
        <!-- Filter Chips -->
        <div class="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            v-for="opt in statusOptions"
            :key="opt.value"
            @click="statusFilter = opt.value"
            :class="[
              'flex-shrink-0 rounded-lg border px-3 py-1.5 text-[11px] font-medium transition-colors',
              statusFilter === opt.value
                ? 'border-blue-500 bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400'
                : 'border-gray-300 bg-white text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300'
            ]"
          >
            {{ opt.label }}
          </button>
        </div>

        <!-- Desktop Table -->
        <div class="hidden overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm md:block dark:border-gray-800 dark:bg-gray-900">
          <table class="w-full text-left text-sm">
            <thead class="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
              <tr>
                <th class="px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">No. PO</th>
                <th class="px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Supplier</th>
                <th class="px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Tanggal</th>
                <th class="px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Total</th>
                <th class="px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Status</th>
                <th class="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Aksi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
              <tr v-for="po in filteredPOs" :key="po.id" class="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800" @click="$router.push(`/purchasing/pos/${po.id}`)">
                <td class="px-4 py-3 font-mono text-xs font-bold text-blue-600 dark:text-blue-400">{{ po.po_number }}</td>
                <td class="px-4 py-3 text-xs text-gray-900 dark:text-white">{{ po.supplier_name || '—' }}</td>
                <td class="px-4 py-3 text-xs text-gray-600 dark:text-gray-400">{{ formatDate(po.po_date) }}</td>
                <td class="px-4 py-3 text-xs font-semibold text-gray-900 dark:text-white">{{ formatRupiah(po.total) }}</td>
                <td class="px-4 py-3">
                  <span class="rounded-lg px-2 py-0.5 text-[9px] font-bold uppercase" :class="getStatusBadge(po.status)">
                    {{ getStatusLabel(po.status) }}
                  </span>
                </td>
                <td class="px-4 py-3" @click.stop>
                  <div class="flex items-center justify-end gap-1">
                    <button
                      @click="$router.push(`/purchasing/pos/${po.id}`)"
                      class="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700"
                    >
                      <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                    <button
                      v-if="['draft', 'submitted', 'confirmed', 'partial'].includes(po.status)"
                      @click="handleChangeStatus(po, 'completed')"
                      class="rounded-lg p-1.5 text-gray-400 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-500/10"
                    >
                      <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                    <button
                      v-if="po.status !== 'cancelled'"
                      @click="handleChangeStatus(po, 'cancelled')"
                      class="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                    >
                      <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                    <button
                      v-if="po.status === 'draft'"
                      @click="handleDelete(po)"
                      class="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                    >
                      <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Mobile Cards -->
        <div class="grid grid-cols-1 gap-2.5 md:hidden">
          <div
            v-for="po in filteredPOs"
            :key="po.id"
            class="rounded-xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-gray-900"
            @click="$router.push(`/purchasing/pos/${po.id}`)"
          >
            <div class="flex items-start justify-between">
              <div class="flex-1 min-w-0">
                <p class="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">{{ po.po_number }}</p>
                <p class="text-xs font-semibold text-gray-900 dark:text-white">{{ po.supplier_name || 'Tanpa supplier' }}</p>
              </div>
              <span class="rounded-lg px-2 py-0.5 text-[9px] font-bold uppercase" :class="getStatusBadge(po.status)">
                {{ getStatusLabel(po.status) }}
              </span>
            </div>
            <div class="mt-2 flex items-center justify-between border-t border-gray-200 pt-2 dark:border-gray-700">
              <span class="text-[10px] text-gray-500 dark:text-gray-400">{{ formatDate(po.po_date) }}</span>
              <span class="text-xs font-bold text-gray-900 dark:text-white">{{ formatRupiah(po.total) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { useConfirm } from '@/composables/useConfirm'
import { useToast } from '@/composables/useToast'
import { ref, computed, onMounted } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import MobilePageHeader from '@/components/common/MobilePageHeader.vue'
import { usePurchasingStore } from '@/stores/purchasing'
import type { PurchaseOrder } from '@/types/database'

const { confirm } = useConfirm()
const toast = useToast()
const store = usePurchasingStore()

const statusFilter = ref<string>('semua')

const statusOptions = [
  { value: 'semua', label: 'Semua' },
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Diajukan' },
  { value: 'confirmed', label: 'Dikonfirmasi' },
  { value: 'partial', label: 'Parsial' },
  { value: 'completed', label: 'Selesai' },
  { value: 'cancelled', label: 'Batal' },
]

const filteredPOs = computed(() => {
  if (statusFilter.value === 'semua') return store.purchaseOrders
  return store.purchaseOrders.filter((p) => p.status === statusFilter.value)
})

const formatRupiah = (n: number) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n || 0)
}

const formatDate = (d: string) => {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    draft: 'Draft',
    submitted: 'Diajukan',
    confirmed: 'Dikonfirmasi',
    partial: 'Parsial',
    completed: 'Selesai',
    cancelled: 'Batal',
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

const handleChangeStatus = async (po: PurchaseOrder, status: PurchaseOrder['status']) => {
  try {
    await store.updatePurchaseOrderStatus(po.id, status)
  } catch (e: any) {
    toast.error('Gagal!', e.message)
  }
}

const handleDelete = async (po: PurchaseOrder) => {
  if (!(await confirm(`Hapus PO "${po.po_number}"?`))) return
  try {
    await store.deletePurchaseOrder(po.id)
  } catch (e: any) {
    toast.error('Gagal!', e.message)
  }
}

onMounted(async () => {
  if (store.purchaseOrders.length === 0) {
    await store.fetchPurchaseOrders()
  }
})
</script>