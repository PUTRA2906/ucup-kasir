<template>
  <AdminLayout>
    <PageBreadcrumb pageTitle="Detail Goods Receipt" class="hidden md:block" />

    <!-- Mobile Header -->
    <MobilePageHeader :title="grn?.grn_number || 'Detail GRN'" subtitle="Penerimaan Barang" @back="$router.back()" />

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-20">
      <div class="text-center">
        <div class="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
        <p class="text-sm text-gray-500 dark:text-gray-400">Memuat GRN...</p>
      </div>
    </div>

    <div v-else-if="grn" class="mx-auto max-w-3xl space-y-4">
      <!-- Header -->
      <div class="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 class="font-mono text-lg font-bold text-gray-900 dark:text-white">{{ grn.grn_number }}</h2>
            <p class="text-xs text-gray-500 dark:text-gray-400">Supplier: {{ grn.supplier_name || '—' }}</p>
          </div>
          <span class="rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
            {{ grn.status === 'completed' ? 'Selesai' : grn.status }}
          </span>
        </div>
        <p class="mt-3 border-t border-gray-200 pt-3 text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">
          Tanggal Terima: {{ formatDate(grn.receipt_date) }}
        </p>
      </div>

      <!-- Items -->
      <div class="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <h3 class="mb-3 text-sm font-bold text-gray-900 dark:text-white">Barang Diterima</h3>
        <!-- Desktop -->
        <div class="hidden overflow-hidden rounded-xl border border-gray-200 md:block dark:border-gray-700">
          <table class="w-full text-left text-sm">
            <thead class="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
              <tr>
                <th class="px-3 py-2 text-[10px] font-bold uppercase text-gray-500 dark:text-gray-400">Barang</th>
                <th class="px-3 py-2 text-[10px] font-bold uppercase text-gray-500 dark:text-gray-400">Diterima</th>
                <th class="px-3 py-2 text-[10px] font-bold uppercase text-gray-500 dark:text-gray-400">Rusak</th>
                <th class="px-3 py-2 text-[10px] font-bold uppercase text-gray-500 dark:text-gray-400">Harga</th>
                <th class="px-3 py-2 text-right text-[10px] font-bold uppercase text-gray-500 dark:text-gray-400">Subtotal</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
              <tr v-for="it in grn.items" :key="it.id">
                <td class="px-3 py-2.5 text-xs text-gray-900 dark:text-white">{{ it.product_name }}</td>
                <td class="px-3 py-2.5 text-xs text-gray-600 dark:text-gray-400">{{ it.quantity_received }}</td>
                <td class="px-3 py-2.5 text-xs text-gray-600 dark:text-gray-400">{{ it.quantity_rejected || '—' }}</td>
                <td class="px-3 py-2.5 text-xs text-gray-600 dark:text-gray-400">{{ formatRupiah(it.price) }}</td>
                <td class="px-3 py-2.5 text-right text-xs font-semibold text-gray-900 dark:text-white">{{ formatRupiah(it.subtotal) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <!-- Mobile -->
        <div class="space-y-2 md:hidden">
          <div v-for="it in grn.items" :key="it.id" class="rounded-xl border border-gray-200 p-3 dark:border-gray-700">
            <div class="flex justify-between gap-2">
              <p class="text-xs font-semibold text-gray-900 dark:text-white">{{ it.product_name }}</p>
              <p class="text-xs font-bold text-gray-900 dark:text-white">{{ formatRupiah(it.subtotal) }}</p>
            </div>
            <p class="mt-1 text-[10px] text-gray-500 dark:text-gray-400">
              Terima {{ it.quantity_received }}<span v-if="it.quantity_rejected"> · rusak {{ it.quantity_rejected }}</span> x {{ formatRupiah(it.price) }}
            </p>
          </div>
        </div>
        <div class="mt-3 flex justify-between border-t border-gray-200 pt-3 dark:border-gray-700">
          <span class="text-xs text-gray-500 dark:text-gray-400">Total</span>
          <span class="text-sm font-bold text-gray-900 dark:text-white">{{ formatRupiah(grn.total) }}</span>
        </div>
      </div>

      <p v-if="grn.notes" class="rounded-xl bg-gray-50 p-3 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400">
        {{ grn.notes }}
      </p>

      <!-- Aksi -->
      <div class="flex gap-2">
        <button
          @click="$router.push(`/purchasing/pis/add?grn_id=${grn.id}`)"
          class="flex-1 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-500"
        >
          Buat Faktur (PI)
        </button>
        <button
          @click="$router.push(`/purchasing/returns/add?grn_id=${grn.id}`)"
          class="flex-1 rounded-xl border border-amber-200 px-4 py-2.5 text-sm font-medium text-amber-600 hover:bg-amber-50 dark:border-amber-500/30 dark:text-amber-400 dark:hover:bg-amber-500/10"
        >
          Retur Barang
        </button>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { useToast } from '@/composables/useToast'
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import MobilePageHeader from '@/components/common/MobilePageHeader.vue'
import { usePurchasingStore } from '@/stores/purchasing'
import type { GoodsReceipt } from '@/types/database'

const toast = useToast()
const route = useRoute()
const router = useRouter()
const store = usePurchasingStore()

const grn = ref<GoodsReceipt | null>(null)
const loading = ref(false)

const formatRupiah = (n: number) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n || 0)
}

const formatDate = (d: string) => {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}

const load = async () => {
  loading.value = true
  try {
    grn.value = await store.getGoodsReceipt(route.params.id as string)
    if (!grn.value) router.replace('/purchasing/grns')
  } catch (e: any) {
    toast.error('Gagal!', e.message)
    router.replace('/purchasing/grns')
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>