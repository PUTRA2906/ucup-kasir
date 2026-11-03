<template>
  <AdminLayout>
    <PageBreadcrumb pageTitle="Dashboard Pembelian" class="hidden md:block" />

    <!-- Mobile Header -->
    <MobilePageHeader title="Pembelian" subtitle="Modul Purchasing" />

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-20">
      <div class="text-center">
        <div class="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
        <p class="text-sm text-gray-500 dark:text-gray-400">Memuat data pembelian...</p>
      </div>
    </div>

    <div v-else class="space-y-4 pb-6">
      <!-- Statistik Cards (2 kolom mobile, 4 kolom desktop) -->
      <div class="grid grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-4">
        <div class="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-4">
          <div class="mb-2 h-1 w-8 rounded-full bg-blue-500"></div>
          <p class="text-xl font-extrabold text-gray-900 dark:text-white sm:text-2xl">{{ stats.supplierCount }}</p>
          <p class="text-[10px] text-gray-500 dark:text-gray-400 sm:text-xs">Supplier</p>
        </div>
        <div class="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-4">
          <div class="mb-2 h-1 w-8 rounded-full bg-amber-500"></div>
          <p class="text-xl font-extrabold text-gray-900 dark:text-white sm:text-2xl">{{ stats.openPOCount }}</p>
          <p class="text-[10px] text-gray-500 dark:text-gray-400 sm:text-xs">PO Aktif</p>
        </div>
        <div class="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-4">
          <div class="mb-2 h-1 w-8 rounded-full bg-emerald-500"></div>
          <p class="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 sm:text-sm">{{ formatRupiahShort(stats.totalPurchases) }}</p>
          <p class="text-[10px] text-gray-500 dark:text-gray-400 sm:text-xs">Total Pembelian</p>
        </div>
        <div class="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-4">
          <div class="mb-2 h-1 w-8 rounded-full bg-red-500"></div>
          <p class="text-xs font-extrabold text-red-600 dark:text-red-400 sm:text-sm">{{ formatRupiahShort(stats.totalOutstanding) }}</p>
          <p class="text-[10px] text-gray-500 dark:text-gray-400 sm:text-xs">Hutang Berjalan</p>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="rounded-2xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900 sm:p-4">
        <h3 class="mb-3 text-xs font-bold text-gray-900 dark:text-white sm:text-sm">Aksi Cepat</h3>
        <div class="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
          <button @click="$router.push('/purchasing/suppliers')" class="rounded-xl border border-gray-200 p-2.5 text-left hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800 sm:p-3">
            <span class="mb-1 block text-lg sm:text-base">🏢</span>
            <span class="text-[10px] font-medium text-gray-700 dark:text-gray-300 sm:text-xs">Kelola Supplier</span>
          </button>
          <button @click="$router.push('/purchasing/pos/add')" class="rounded-xl border border-gray-200 p-2.5 text-left hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800 sm:p-3">
            <span class="mb-1 block text-lg sm:text-base">📋</span>
            <span class="text-[10px] font-medium text-gray-700 dark:text-gray-300 sm:text-xs">Buat PO</span>
          </button>
          <button @click="$router.push('/purchasing/grns/add')" class="rounded-xl border border-gray-200 p-2.5 text-left hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800 sm:p-3">
            <span class="mb-1 block text-lg sm:text-base">📦</span>
            <span class="text-[10px] font-medium text-gray-700 dark:text-gray-300 sm:text-xs">Terima Barang</span>
          </button>
          <button @click="$router.push('/purchasing/pis/add')" class="rounded-xl border border-gray-200 p-2.5 text-left hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800 sm:p-3">
            <span class="mb-1 block text-lg sm:text-base">🧾</span>
            <span class="text-[10px] font-medium text-gray-700 dark:text-gray-300 sm:text-xs">Buat Faktur</span>
          </button>
          <button @click="$router.push('/purchasing/returns/add')" class="rounded-xl border border-gray-200 p-2.5 text-left hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800 sm:p-3">
            <span class="mb-1 block text-lg sm:text-base">↩️</span>
            <span class="text-[10px] font-medium text-gray-700 dark:text-gray-300 sm:text-xs">Retur Barang</span>
          </button>
        </div>
      </div>

      <!-- Hutang Belum Lunas -->
      <div class="rounded-2xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900 sm:p-4">
        <div class="mb-3 flex items-center justify-between">
          <h3 class="text-xs font-bold text-gray-900 dark:text-white sm:text-sm">Hutang Belum Lunas</h3>
          <button @click="$router.push('/purchasing/pis')" class="text-[10px] font-medium text-blue-600 hover:underline dark:text-blue-400 sm:text-xs">Lihat semua</button>
        </div>
        <div v-if="unpaidInvoices.length === 0" class="rounded-xl border border-dashed border-gray-300 p-4 text-center text-[10px] text-gray-500 dark:border-gray-700 dark:text-gray-400 sm:p-6 sm:text-xs">
          Tidak ada hutang berjalan 🎉
        </div>
        <div v-else class="space-y-2">
          <div v-for="pi in unpaidInvoices" :key="pi.id" class="flex items-center justify-between rounded-xl border border-gray-200 p-2.5 dark:border-gray-700 sm:p-3">
            <div class="min-w-0 flex-1">
              <p class="truncate font-mono text-[10px] font-bold text-gray-900 dark:text-white sm:text-xs">{{ pi.pi_number }}</p>
              <p class="truncate text-[9px] text-gray-500 dark:text-gray-400 sm:text-[10px]">{{ pi.supplier_name || 'Tanpa supplier' }} · {{ formatDate(pi.due_date || pi.invoice_date) }}</p>
            </div>
            <div class="ml-2 flex-shrink-0 text-right">
              <p class="text-[10px] font-bold text-red-600 dark:text-red-400 sm:text-xs">{{ formatRupiahShort(pi.remaining_amount) }}</p>
              <button @click="$router.push(`/purchasing/pis/${pi.id}`)" class="text-[9px] font-medium text-blue-600 hover:underline dark:text-blue-400 sm:text-[10px]">Bayar</button>
            </div>
          </div>
        </div>
      </div>

      <!-- PO Terbuka -->
      <div class="rounded-2xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900 sm:p-4">
        <div class="mb-3 flex items-center justify-between">
          <h3 class="text-xs font-bold text-gray-900 dark:text-white sm:text-sm">PO Perlu Diterima</h3>
          <button @click="$router.push('/purchasing/pos')" class="text-[10px] font-medium text-blue-600 hover:underline dark:text-blue-400 sm:text-xs">Lihat semua</button>
        </div>
        <div v-if="openPOs.length === 0" class="rounded-xl border border-dashed border-gray-300 p-4 text-center text-[10px] text-gray-500 dark:border-gray-700 dark:text-gray-400 sm:p-6 sm:text-xs">
          Tidak ada PO terbuka.
        </div>
        <div v-else class="space-y-2">
          <div v-for="po in openPOs" :key="po.id" class="flex items-center justify-between rounded-xl border border-gray-200 p-2.5 dark:border-gray-700 sm:p-3">
            <div class="min-w-0 flex-1">
              <p class="truncate font-mono text-[10px] font-bold text-gray-900 dark:text-white sm:text-xs">{{ po.po_number }}</p>
              <p class="truncate text-[9px] text-gray-500 dark:text-gray-400 sm:text-[10px]">{{ po.supplier_name || 'Tanpa supplier' }} · {{ formatDate(po.po_date) }}</p>
            </div>
            <div class="ml-2 flex flex-shrink-0 items-center gap-1.5 sm:gap-2">
              <span class="rounded-lg px-1.5 py-0.5 text-[8px] font-bold uppercase bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 sm:px-2 sm:text-[9px]">{{ getStatusLabel(po.status) }}</span>
              <button @click="$router.push(`/purchasing/grns/add?po_id=${po.id}`)" class="text-[9px] font-medium text-blue-600 hover:underline dark:text-blue-400 sm:text-[10px]">Terima</button>
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
const loading = ref(true)

const stats = computed(() => {
  const suppliers = store.suppliersWithStats
  const pos = store.purchaseOrders
  const pis = store.purchaseInvoices
  return {
    supplierCount: suppliers.length,
    openPOCount: pos.filter((p) => !['completed', 'cancelled'].includes(p.status)).length,
    totalPurchases: pos.reduce((sum, p) => sum + Number(p.total || 0), 0),
    totalOutstanding: pis.reduce((sum, p) => sum + Number(p.remaining_amount || 0), 0),
  }
})

const unpaidInvoices = computed(() =>
  store.purchaseInvoices.filter((p) => p.payment_status !== 'lunas' && p.remaining_amount > 0)
)

const openPOs = computed(() =>
  store.purchaseOrders.filter((p) => ['draft', 'submitted', 'confirmed', 'partial'].includes(p.status))
)

const formatRupiah = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n || 0)

const formatRupiahShort = (n: number) => {
  if (n >= 1_000_000_000) return `Rp ${(n / 1_000_000_000).toFixed(1)} M`
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1)} Jt`
  if (n >= 1_000) return `Rp ${(n / 1_000).toFixed(0)} Rb`
  return formatRupiah(n)
}

const formatDate = (d: string) => d ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
const getStatusLabel = (s: string) => { const m: Record<string, string> = { draft: 'Draft', submitted: 'Diajukan', confirmed: 'Dikonfirmasi', partial: 'Parsial', completed: 'Selesai', cancelled: 'Batal' }; return m[s] || s }

onMounted(async () => {
  loading.value = true
  try {
    await Promise.all([
      store.fetchSuppliersWithStats(),
      store.fetchPurchaseOrders(),
      store.fetchGoodsReceipts(),
      store.fetchPurchaseInvoices(),
      store.fetchPurchaseReturns(),
    ])
  } catch (e: any) {
    console.error(e)
  } finally {
    loading.value = false
  }
})
</script>