<template>
  <AdminLayout>
    <PageBreadcrumb pageTitle="Faktur Pembelian" class="hidden md:block" />

    <!-- Mobile Header -->
    <MobilePageHeader title="Faktur Pembelian" subtitle="Purchase Invoice" @back="$router.back()">
      <template #actions>
        <button @click="$router.push('/purchasing/pis/add')" class="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-white hover:bg-blue-500">
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
        </button>
      </template>
    </MobilePageHeader>

    <div class="mb-4 hidden items-center justify-between md:flex">
      <div></div>
      <button @click="$router.push('/purchasing/pis/add')" class="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500">+ Buat Faktur</button>
    </div>

    <div v-if="store.loading" class="flex items-center justify-center py-20">
      <div class="text-center">
        <div class="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
        <p class="text-sm text-gray-500 dark:text-gray-400">Memuat faktur...</p>
      </div>
    </div>

    <div v-else>
      <div v-if="store.error" class="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-500/30 dark:bg-red-500/10">
        <p class="text-sm text-red-600 dark:text-red-400">{{ store.error }}</p>
      </div>

      <div v-if="!store.error && store.purchaseInvoices.length === 0" class="rounded-2xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-gray-900">
        <div class="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10">
          <svg class="h-7 w-7 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
        </div>
        <h3 class="text-sm font-bold text-gray-900 dark:text-white">Belum ada faktur pembelian</h3>
        <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Buat faktur dari GRN untuk mencatat hutang.</p>
        <button @click="$router.push('/purchasing/pis/add')" class="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500">Buat Faktur</button>
      </div>

      <div v-else-if="store.purchaseInvoices.length > 0" class="space-y-3">
        <!-- Filter Chips -->
        <div class="flex items-center gap-2 overflow-x-auto pb-1">
          <button v-for="opt in statusOptions" :key="opt.value" @click="statusFilter = opt.value" :class="['flex-shrink-0 rounded-lg border px-3 py-1.5 text-[11px] font-medium transition-colors', statusFilter === opt.value ? 'border-blue-500 bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400' : 'border-gray-300 bg-white text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300']">{{ opt.label }}</button>
        </div>

        <div class="hidden overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm md:block dark:border-gray-800 dark:bg-gray-900">
          <table class="w-full text-left text-sm">
            <thead class="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
              <tr>
                <th class="px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">No. Faktur</th>
                <th class="px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Supplier</th>
                <th class="px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Tanggal</th>
                <th class="px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Total</th>
                <th class="px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Sisa</th>
                <th class="px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
              <tr v-for="pi in filteredPIs" :key="pi.id" class="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800" @click="$router.push(`/purchasing/pis/${pi.id}`)">
                <td class="px-4 py-3 font-mono text-xs font-bold text-blue-600 dark:text-blue-400">{{ pi.pi_number }}</td>
                <td class="px-4 py-3 text-xs text-gray-900 dark:text-white">{{ pi.supplier_name || '—' }}</td>
                <td class="px-4 py-3 text-xs text-gray-600 dark:text-gray-400">{{ formatDate(pi.invoice_date) }}</td>
                <td class="px-4 py-3 text-xs font-semibold text-gray-900 dark:text-white">{{ formatRupiah(pi.total) }}</td>
                <td class="px-4 py-3 text-xs font-semibold" :class="pi.remaining_amount > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'">{{ formatRupiah(pi.remaining_amount) }}</td>
                <td class="px-4 py-3">
                  <span class="rounded-lg px-2 py-0.5 text-[9px] font-bold uppercase" :class="getPaymentBadge(pi.payment_status)">{{ getPaymentLabel(pi.payment_status) }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="grid grid-cols-1 gap-2.5 md:hidden">
          <div v-for="pi in filteredPIs" :key="pi.id" class="rounded-xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-gray-900" @click="$router.push(`/purchasing/pis/${pi.id}`)">
            <div class="flex items-start justify-between">
              <div class="flex-1 min-w-0">
                <p class="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">{{ pi.pi_number }}</p>
                <p class="text-xs font-semibold text-gray-900 dark:text-white">{{ pi.supplier_name || 'Tanpa supplier' }}</p>
              </div>
              <span class="rounded-lg px-2 py-0.5 text-[9px] font-bold uppercase" :class="getPaymentBadge(pi.payment_status)">{{ getPaymentLabel(pi.payment_status) }}</span>
            </div>
            <div class="mt-2 flex items-center justify-between border-t border-gray-200 pt-2 dark:border-gray-700">
              <span class="text-[10px] text-gray-500 dark:text-gray-400">{{ formatDate(pi.invoice_date) }}</span>
              <div class="text-right">
                <p class="text-xs font-bold text-gray-900 dark:text-white">{{ formatRupiah(pi.total) }}</p>
                <p class="text-[9px]" :class="pi.remaining_amount > 0 ? 'text-red-500' : 'text-emerald-500'">Sisa: {{ formatRupiah(pi.remaining_amount) }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import MobilePageHeader from '@/components/common/MobilePageHeader.vue'
import { usePurchasingStore } from '@/stores/purchasing'

const store = usePurchasingStore()
const statusFilter = ref<string>('semua')

const statusOptions = [
  { value: 'semua', label: 'Semua' },
  { value: 'belum_lunas', label: 'Belum Lunas' },
  { value: 'sebagian', label: 'Sebagian' },
  { value: 'lunas', label: 'Lunas' },
]

const filteredPIs = computed(() => {
  if (statusFilter.value === 'semua') return store.purchaseInvoices
  return store.purchaseInvoices.filter((p) => p.payment_status === statusFilter.value)
})

const formatRupiah = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n || 0)
const formatDate = (d: string) => d ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

const getPaymentLabel = (s: string) => { const m: Record<string, string> = { belum_lunas: 'Belum Lunas', sebagian: 'Sebagian', lunas: 'Lunas' }; return m[s] || s }
const getPaymentBadge = (s: string) => {
  const b: Record<string, string> = { belum_lunas: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400', sebagian: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400', lunas: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' }
  return b[s] || 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400'
}

onMounted(async () => { if (store.purchaseInvoices.length === 0) await store.fetchPurchaseInvoices() })
</script>