<template>
  <AdminLayout>
    <PageBreadcrumb pageTitle="Detail Retur Pembelian" class="hidden md:block" />

    <!-- Mobile Header -->
    <MobilePageHeader :title="pr?.pr_number || 'Detail Retur'" subtitle="Retur Pembelian" @back="$router.back()" />

    <div v-if="loading" class="flex items-center justify-center py-20">
      <div class="text-center">
        <div class="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
        <p class="text-sm text-gray-500 dark:text-gray-400">Memuat retur...</p>
      </div>
    </div>

    <div v-else-if="pr" class="mx-auto max-w-3xl space-y-4">
      <!-- Header -->
      <div class="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 class="font-mono text-lg font-bold text-gray-900 dark:text-white">{{ pr.pr_number }}</h2>
            <p class="text-xs text-gray-500 dark:text-gray-400">Supplier: {{ pr.supplier_name || '—' }}</p>
          </div>
          <span class="rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">Selesai</span>
        </div>
        <div class="mt-3 grid grid-cols-2 gap-2 border-t border-gray-200 pt-3 text-xs dark:border-gray-700">
          <div>
            <p class="text-gray-500 dark:text-gray-400">Tanggal Retur</p>
            <p class="font-medium text-gray-900 dark:text-white">{{ formatDate(pr.return_date) }}</p>
          </div>
          <div>
            <p class="text-gray-500 dark:text-gray-400">Alasan</p>
            <p class="font-medium text-gray-900 dark:text-white">{{ getReasonLabel(pr.reason) }}</p>
          </div>
        </div>
      </div>

      <!-- Items -->
      <div class="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <h3 class="mb-3 text-sm font-bold text-gray-900 dark:text-white">Barang Retur</h3>
        <div class="hidden overflow-hidden rounded-xl border border-gray-200 md:block dark:border-gray-700">
          <table class="w-full text-left text-sm">
            <thead class="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
              <tr>
                <th class="px-3 py-2 text-[10px] font-bold uppercase text-gray-500 dark:text-gray-400">Barang</th>
                <th class="px-3 py-2 text-[10px] font-bold uppercase text-gray-500 dark:text-gray-400">Qty</th>
                <th class="px-3 py-2 text-[10px] font-bold uppercase text-gray-500 dark:text-gray-400">Harga</th>
                <th class="px-3 py-2 text-right text-[10px] font-bold uppercase text-gray-500 dark:text-gray-400">Subtotal</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
              <tr v-for="it in pr.items" :key="it.id">
                <td class="px-3 py-2.5 text-xs text-gray-900 dark:text-white">{{ it.product_name }}</td>
                <td class="px-3 py-2.5 text-xs text-gray-600 dark:text-gray-400">{{ it.quantity }}</td>
                <td class="px-3 py-2.5 text-xs text-gray-600 dark:text-gray-400">{{ formatRupiah(it.price) }}</td>
                <td class="px-3 py-2.5 text-right text-xs font-semibold text-gray-900 dark:text-white">{{ formatRupiah(it.subtotal) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="space-y-2 md:hidden">
          <div v-for="it in pr.items" :key="it.id" class="rounded-xl border border-gray-200 p-3 dark:border-gray-700">
            <div class="flex justify-between gap-2">
              <p class="text-xs font-semibold text-gray-900 dark:text-white">{{ it.product_name }}</p>
              <p class="text-xs font-bold text-gray-900 dark:text-white">{{ formatRupiah(it.subtotal) }}</p>
            </div>
            <p class="mt-1 text-[10px] text-gray-500 dark:text-gray-400">{{ it.quantity }} x {{ formatRupiah(it.price) }}</p>
          </div>
        </div>
        <div class="mt-3 flex justify-between border-t border-gray-200 pt-3 dark:border-gray-700">
          <span class="text-xs font-bold text-gray-900 dark:text-white">Total Refund</span>
          <span class="text-base font-bold text-red-600 dark:text-red-400">{{ formatRupiah(pr.total_refund) }}</span>
        </div>
      </div>

      <p v-if="pr.notes" class="rounded-xl bg-gray-50 p-3 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400">{{ pr.notes }}</p>
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
import type { PurchaseReturn } from '@/types/database'

const toast = useToast()
const route = useRoute()
const router = useRouter()
const store = usePurchasingStore()

const pr = ref<PurchaseReturn | null>(null)
const loading = ref(false)

const formatRupiah = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n || 0)
const formatDate = (d: string) => d ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
const getReasonLabel = (r: string) => { const m: Record<string, string> = { cacat: 'Cacat', salah_produk: 'Salah Produk', kadaluarsa: 'Kadaluarsa', rusak_kirim: 'Rusak Kirim', lainnya: 'Lainnya' }; return m[r] || r }

const load = async () => {
  loading.value = true
  try {
    pr.value = await store.getPurchaseReturn(route.params.id as string)
    if (!pr.value) router.replace('/purchasing/returns')
  } catch (e: any) { toast.error('Gagal!', e.message); router.replace('/purchasing/returns') } finally { loading.value = false }
}

onMounted(load)
</script>