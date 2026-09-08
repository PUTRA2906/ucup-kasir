<template>
  <AdminLayout>
    <PageBreadcrumb pageTitle="Dashboard Pembelian" class="hidden md:block" />

    <!-- Mobile Header -->
    <MobilePageHeader title="Pembelian" subtitle="Modul Purchasing" back-to="/quick-menu/pembelian" />

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-20">
      <div class="text-center">
        <div class="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
        <p class="text-sm text-gray-500 dark:text-gray-400">Memuat data pembelian...</p>
      </div>
    </div>

    <div v-else class="space-y-4">
      <!-- Statistik Cards -->
      <div class="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div class="mb-2 h-1 w-8 rounded-full bg-blue-500"></div>
          <p class="text-2xl font-extrabold text-gray-900 dark:text-white">{{ stats.supplierCount }}</p>
          <p class="text-xs text-gray-500 dark:text-gray-400">Supplier</p>
        </div>
        <div class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div class="mb-2 h-1 w-8 rounded-full bg-amber-500"></div>
          <p class="text-2xl font-extrabold text-gray-900 dark:text-white">{{ stats.openPOCount }}</p>
          <p class="text-xs text-gray-500 dark:text-gray-400">PO Aktif</p>
        </div>
        <div class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div class="mb-2 h-1 w-8 rounded-full bg-emerald-500"></div>
          <p class="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">{{ formatRupiah(stats.totalPurchases) }}</p>
          <p class="text-xs text-gray-500 dark:text-gray-400">Total Pembelian</p>
        </div>
        <div class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div class="mb-2 h-1 w-8 rounded-full bg-red-500"></div>
          <p class="text-2xl font-extrabold text-red-600 dark:text-red-400">{{ formatRupiah(stats.totalOutstanding) }}</p>
          <p class="text-xs text-gray-500 dark:text-gray-400">Hutang Berjalan</p>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <h3 class="mb-3 text-sm font-bold text-gray-900 dark:text-white">Aksi Cepat</h3>
        <div class="grid grid-cols-2 gap-2 md:grid-cols-5">
          <button @click="$router.push('/purchasing/suppliers')" class="rounded-xl border border-gray-200 p-3 text-left text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
            <span class="mb-1 block text-base">🏢</span>Kelola Supplier
          </button>
          <button @click="$router.push('/purchasing/pos/add')" class="rounded-xl border border-gray-200 p-3 text-left text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
            <span class="mb-1 block text-base">📋</span>Buat PO
          </button>
          <button @click="$router.push('/purchasing/grns/add')" class="rounded-xl border border-gray-200 p-3 text-left text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
            <span class="mb-1 block text-base">📦</span>Terima Barang
          </button>
          <button @click="$router.push('/purchasing/pis/add')" class="rounded-xl border border-gray-200 p-3 text-left text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
            <span class="mb-1 block text-base">🧾</span>Buat Faktur
          </button>
          <button @click="$router.push('/purchasing/returns/add')" class="rounded-xl border border-gray-200 p-3 text-left text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
            <span class="mb-1 block text-base">↩️</span>Retur Barang
          </button>
        </div>
      </div>

      <!-- Barang Menipis → Auto Faktur -->
      <div class="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <div class="mb-3 flex items-center justify-between">
          <div>
            <h3 class="text-sm font-bold text-gray-900 dark:text-white">Barang Menipis</h3>
            <p class="text-[10px] text-gray-500 dark:text-gray-400">Buat faktur pembelian otomatis untuk barang di bawah stok minimum</p>
          </div>
          <span v-if="lowStockList.length" class="rounded-lg bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700 dark:bg-red-500/20 dark:text-red-400">{{ lowStockList.length }} item</span>
        </div>

        <div v-if="lowStockList.length === 0" class="rounded-xl border border-dashed border-gray-300 p-6 text-center text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">
          Semua stok aman 🎉
        </div>
        <div v-else class="space-y-2">
          <label v-for="p in lowStockList" :key="p.id" class="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-gray-200 p-3 dark:border-gray-700">
            <div class="flex min-w-0 items-start gap-2">
              <input v-model="p.selected" type="checkbox" class="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
              <div class="min-w-0">
                <p class="truncate text-xs font-semibold text-gray-900 dark:text-white">{{ p.name }}</p>
                <p class="text-[10px] text-gray-500 dark:text-gray-400">
                  Stok <span class="font-bold text-red-600 dark:text-red-400">{{ p.stock }}</span> / min {{ p.min }} ·
                  beli <span class="font-bold text-gray-700 dark:text-gray-300">{{ p.restockQty }}</span> ·
                  {{ p.supplierName }}
                </p>
              </div>
            </div>
            <p class="flex-shrink-0 text-right text-[10px] font-semibold text-gray-600 dark:text-gray-400">{{ formatRupiah(p.restockQty * (p.price_buy || 0)) }}</p>
          </label>

          <div class="flex items-center justify-between border-t border-gray-200 pt-3 dark:border-gray-700">
            <p class="text-xs text-gray-500 dark:text-gray-400">
              {{ selectedCount }} item · estimasi {{ formatRupiah(selectedTotal) }}
            </p>
            <button @click="generateInvoices" :disabled="generating || selectedCount === 0" class="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50">
              {{ generating ? 'Membuat...' : 'Buat Faktur Otomatis' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Hutang Belum Lunas -->
      <div class="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <div class="mb-3 flex items-center justify-between">
          <h3 class="text-sm font-bold text-gray-900 dark:text-white">Hutang Belum Lunas</h3>
          <button @click="$router.push('/purchasing/pis')" class="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400">Lihat semua</button>
        </div>
        <div v-if="unpaidInvoices.length === 0" class="rounded-xl border border-dashed border-gray-300 p-6 text-center text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">
          Tidak ada hutang berjalan 🎉
        </div>
        <div v-else class="space-y-2">
          <div v-for="pi in unpaidInvoices" :key="pi.id" class="flex items-center justify-between rounded-xl border border-gray-200 p-3 dark:border-gray-700">
            <div>
              <p class="font-mono text-xs font-bold text-gray-900 dark:text-white">{{ pi.pi_number }}</p>
              <p class="text-[10px] text-gray-500 dark:text-gray-400">{{ pi.supplier_name || 'Tanpa supplier' }} · {{ formatDate(pi.due_date || pi.invoice_date) }}</p>
            </div>
            <div class="text-right">
              <p class="text-sm font-bold text-red-600 dark:text-red-400">{{ formatRupiah(pi.remaining_amount) }}</p>
              <button @click="$router.push(`/purchasing/pis/${pi.id}`)" class="text-[10px] font-medium text-blue-600 hover:underline dark:text-blue-400">Bayar</button>
            </div>
          </div>
        </div>
      </div>

      <!-- PO Terbuka -->
      <div class="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <div class="mb-3 flex items-center justify-between">
          <h3 class="text-sm font-bold text-gray-900 dark:text-white">PO Perlu Diterima</h3>
          <button @click="$router.push('/purchasing/pos')" class="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400">Lihat semua</button>
        </div>
        <div v-if="openPOs.length === 0" class="rounded-xl border border-dashed border-gray-300 p-6 text-center text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">
          Tidak ada PO terbuka.
        </div>
        <div v-else class="space-y-2">
          <div v-for="po in openPOs" :key="po.id" class="flex items-center justify-between rounded-xl border border-gray-200 p-3 dark:border-gray-700">
            <div>
              <p class="font-mono text-xs font-bold text-gray-900 dark:text-white">{{ po.po_number }}</p>
              <p class="text-[10px] text-gray-500 dark:text-gray-400">{{ po.supplier_name || 'Tanpa supplier' }} · {{ formatDate(po.po_date) }}</p>
            </div>
            <div class="flex items-center gap-2">
              <span class="rounded-lg px-2 py-0.5 text-[9px] font-bold uppercase bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400">{{ getStatusLabel(po.status) }}</span>
              <button @click="$router.push(`/purchasing/grns/add?po_id=${po.id}`)" class="text-[10px] font-medium text-blue-600 hover:underline dark:text-blue-400">Terima</button>
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
import { useProductsStore } from '@/stores/products'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'
import type { PurchaseInvoiceInput } from '@/types/database'

const store = usePurchasingStore()
const productsStore = useProductsStore()
const toast = useToast()
const { confirm } = useConfirm()
const loading = ref(true)
const generating = ref(false)

interface LowStockRow {
  id: string
  name: string
  stock: number
  min: number
  price_buy: number
  restockQty: number
  supplier_id: string | null
  supplierName: string
  selected: boolean
}

/** Cari supplier terakhir yang pernah menjual produk ini (dari faktur lalu PO). */
function findLastSupplier(productId: string): { id: string | null; name: string } {
  for (const pi of store.purchaseInvoices) {
    if ((pi.items || []).some((it) => it.product_id === productId)) {
      return { id: pi.supplier_id || null, name: pi.supplier_name || 'Tanpa supplier' }
    }
  }
  for (const po of store.purchaseOrders) {
    if ((po.items || []).some((it) => it.product_id === productId)) {
      return { id: po.supplier_id || null, name: po.supplier_name || 'Tanpa supplier' }
    }
  }
  return { id: null, name: 'Tanpa supplier' }
}

/** Produk yang sudah masuk faktur hari ini tidak dibuatkan faktur lagi. */
const alreadyInvoicedToday = computed(() => {
  const today = new Date().toISOString().slice(0, 10)
  const ids = new Set<string>()
  for (const pi of store.purchaseInvoices) {
    if ((pi.invoice_date || pi.created_at || '').slice(0, 10) !== today) continue
    for (const it of pi.items || []) {
      if (it.product_id) ids.add(it.product_id)
    }
  }
  return ids
})

const lowStockList = computed<LowStockRow[]>(() => {
  const rows: LowStockRow[] = []
  for (const p of productsStore.products) {
    if (!p.is_active) continue
    const min = p.minimum_stock ?? 10
    if (p.stock > min) continue
    if (alreadyInvoicedToday.value.has(p.id)) continue
    const target = min * 2
    const supplier = findLastSupplier(p.id)
    rows.push({
      id: p.id,
      name: p.name,
      stock: p.stock,
      min,
      price_buy: p.price_buy || 0,
      restockQty: Math.max(1, target - p.stock),
      supplier_id: supplier.id,
      supplierName: supplier.name,
      selected: true,
    })
  }
  return rows
})

const selectedCount = computed(() => lowStockList.value.filter((p) => p.selected).length)
const selectedTotal = computed(() =>
  lowStockList.value.filter((p) => p.selected).reduce((sum, p) => sum + p.restockQty * p.price_buy, 0)
)

async function generateInvoices() {
  const selected = lowStockList.value.filter((p) => p.selected)
  if (selected.length === 0) return

  const supplierGroups = new Map<string, LowStockRow[]>()
  for (const p of selected) {
    const key = p.supplier_id || `anon:${p.supplierName}`
    if (!supplierGroups.has(key)) supplierGroups.set(key, [])
    supplierGroups.get(key)!.push(p)
  }

  const ok = await confirm({
    title: 'Buat Faktur Otomatis',
    message: `Buat ${supplierGroups.size} faktur pembelian untuk ${selected.length} barang menipis (estimasi ${formatRupiah(selectedTotal.value)})? Supplier diambil dari pembelian terakhir tiap barang.`,
    confirmText: 'Buat Faktur',
    variant: 'primary',
  })
  if (!ok) return

  generating.value = true
  const today = new Date().toISOString().slice(0, 10)
  let created = 0
  try {
    for (const [, group] of supplierGroups) {
      const input: PurchaseInvoiceInput = {
        supplier_id: group[0].supplier_id || undefined,
        supplier_name: group[0].supplierName !== 'Tanpa supplier' ? group[0].supplierName : undefined,
        invoice_date: today,
        notes: 'Faktur otomatis: restock barang menipis',
        items: group.map((p) => ({
          product_id: p.id,
          product_name: p.name,
          quantity_received: p.restockQty,
          price: p.price_buy,
        })),
      }
      await store.createPurchaseInvoice(input)
      created++
    }
    toast.success('Berhasil!', `${created} faktur pembelian otomatis dibuat`)
    await Promise.all([store.fetchPurchaseInvoices(), productsStore.fetchProducts()])
  } catch (e) {
    toast.error('Gagal!', e instanceof Error ? e.message : 'Gagal membuat faktur otomatis')
  } finally {
    generating.value = false
  }
}

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
      productsStore.fetchProducts(),
    ])
  } catch (e: any) {
    console.error(e)
  } finally {
    loading.value = false
  }
})
</script>