<template>
  <AdminLayout>
    <PageBreadcrumb pageTitle="Goods Receipt" class="hidden md:block" />

    <!-- Mobile Header -->
    <MobilePageHeader title="Goods Receipt" subtitle="Penerimaan Barang" @back="$router.back()">
      <template #actions>
        <button
          @click="$router.push('/purchasing/grns/add')"
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
        @click="$router.push('/purchasing/grns/add')"
        class="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
      >
        + Terima Barang
      </button>
    </div>

    <!-- Loading -->
    <div v-if="store.loading" class="flex items-center justify-center py-20">
      <div class="text-center">
        <div class="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
        <p class="text-sm text-gray-500 dark:text-gray-400">Memuat GRN...</p>
      </div>
    </div>

    <div v-else>
      <!-- Error -->
      <div v-if="store.error" class="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-500/30 dark:bg-red-500/10">
        <p class="text-sm text-red-600 dark:text-red-400">{{ store.error }}</p>
      </div>

      <!-- Empty -->
      <div v-if="!store.error && store.goodsReceipts.length === 0" class="rounded-2xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-gray-900">
        <div class="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10">
          <svg class="h-7 w-7 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        </div>
        <h3 class="text-sm font-bold text-gray-900 dark:text-white">Belum ada penerimaan barang</h3>
        <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Terima barang dari PO untuk menambah stok.</p>
        <button
          @click="$router.push('/purchasing/grns/add')"
          class="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
        >
          Terima Barang
        </button>
      </div>

      <!-- GRN List -->
      <div v-else-if="store.goodsReceipts.length > 0" class="space-y-3">
        <!-- Desktop Table -->
        <div class="hidden overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm md:block dark:border-gray-800 dark:bg-gray-900">
          <table class="w-full text-left text-sm">
            <thead class="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
              <tr>
                <th class="px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">No. GRN</th>
                <th class="px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Supplier</th>
                <th class="px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Tanggal</th>
                <th class="px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Total</th>
                <th class="px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
              <tr v-for="g in store.goodsReceipts" :key="g.id" class="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800" @click="$router.push(`/purchasing/grns/${g.id}`)">
                <td class="px-4 py-3 font-mono text-xs font-bold text-blue-600 dark:text-blue-400">{{ g.grn_number }}</td>
                <td class="px-4 py-3 text-xs text-gray-900 dark:text-white">{{ g.supplier_name || '—' }}</td>
                <td class="px-4 py-3 text-xs text-gray-600 dark:text-gray-400">{{ formatDate(g.receipt_date) }}</td>
                <td class="px-4 py-3 text-xs font-semibold text-gray-900 dark:text-white">{{ formatRupiah(g.total) }}</td>
                <td class="px-4 py-3">
                  <span class="rounded-lg px-2 py-0.5 text-[9px] font-bold uppercase" :class="g.status === 'completed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'">
                    {{ g.status === 'completed' ? 'Selesai' : g.status }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Mobile Cards -->
        <div class="grid grid-cols-1 gap-2.5 md:hidden">
          <div
            v-for="g in store.goodsReceipts"
            :key="g.id"
            class="rounded-xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-gray-900"
            @click="$router.push(`/purchasing/grns/${g.id}`)"
          >
            <div class="flex items-start justify-between">
              <div class="flex-1 min-w-0">
                <p class="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">{{ g.grn_number }}</p>
                <p class="text-xs font-semibold text-gray-900 dark:text-white">{{ g.supplier_name || 'Tanpa supplier' }}</p>
              </div>
              <span class="rounded-lg px-2 py-0.5 text-[9px] font-bold uppercase" :class="g.status === 'completed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'">
                {{ g.status === 'completed' ? 'Selesai' : g.status }}
              </span>
            </div>
            <div class="mt-2 flex items-center justify-between border-t border-gray-200 pt-2 dark:border-gray-700">
              <span class="text-[10px] text-gray-500 dark:text-gray-400">{{ formatDate(g.receipt_date) }}</span>
              <span class="text-xs font-bold text-gray-900 dark:text-white">{{ formatRupiah(g.total) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import MobilePageHeader from '@/components/common/MobilePageHeader.vue'
import { usePurchasingStore } from '@/stores/purchasing'

const store = usePurchasingStore()

const formatRupiah = (n: number) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n || 0)
}

const formatDate = (d: string) => {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}

onMounted(async () => {
  if (store.goodsReceipts.length === 0) {
    await store.fetchGoodsReceipts()
  }
})
</script>