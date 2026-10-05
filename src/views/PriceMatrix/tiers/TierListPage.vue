<template>
  <AdminLayout>
    <PageBreadcrumb pageTitle="Harga Tier" class="hidden md:block" />
    <MobilePageHeader title="Harga Tier" :subtitle="paginationLabel">
      <template #actions>
        <button
          type="button"
          class="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-500 text-white shadow-sm hover:bg-brand-600 active:scale-95"
          @click="addTier"
          aria-label="Tambah harga tier"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
        </button>
      </template>
    </MobilePageHeader>

    <div class="space-y-4">
      <!-- Toolbar: search + filter status (mobile) + deskripsi -->
      <p class="hidden text-xs text-gray-500 dark:text-gray-400 md:block">Atur harga berbeda per rentang jumlah (eceran → grosir → partai besar).</p>

      <div class="flex flex-col gap-2 md:hidden">
        <div class="relative">
          <input
            v-model="search"
            type="text"
            placeholder="Cari produk / tier..."
            class="w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
          <svg class="absolute left-3 top-3 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        </div>
        <div class="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          <div class="w-36 shrink-0">
            <SelectField
              v-model="filterTierName"
              :options="tierNameFilterOptions"
              title="Nama Tier"
              placeholder="Semua tier"
              button-class="flex w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-[11px] font-medium text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
            />
          </div>
          <span class="h-4 w-px shrink-0 bg-gray-200 dark:bg-gray-700"></span>
          <button
            v-for="opt in statusOptions"
            :key="String(opt.value)"
            type="button"
            :class="['shrink-0 rounded-lg border px-3 py-1.5 text-[11px] font-medium transition-colors', filterStatus===opt.value ? 'border-brand-500 bg-brand-500 text-white' : 'border-gray-300 bg-white text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300']"
            @click="filterStatus = opt.value"
          >{{ opt.label }}</button>
        </div>
      </div>

      <!-- Desktop toolbar -->
      <div class="hidden items-center gap-3 md:flex">
        <div class="relative w-72">
          <input v-model="search" type="text" placeholder="Cari produk / tier..." class="w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
          <svg class="absolute left-3 top-3 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        </div>
        <SelectField v-model="filterTierName" :options="tierNameFilterOptions" title="Nama Tier" placeholder="Semua tier" button-class="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
        <button
          type="button"
          class="ml-auto rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600"
          @click="addTier"
        >+ Tambah Tier</button>
      </div>

      <!-- List -->
      <div v-if="loading" class="space-y-3 md:hidden">
        <div v-for="i in 3" :key="i" class="h-28 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800"></div>
      </div>
      <div v-else-if="filtered.length===0" class="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center dark:border-gray-700 dark:bg-gray-900/50 md:hidden">
        <p class="text-sm font-medium text-gray-700 dark:text-gray-300">{{ search || filterTierName || filterStatus ? 'Tidak ada yang cocok' : 'Belum ada harga tier' }}</p>
        <p class="mt-1 text-xs text-gray-500">Tambahkan harga tier untuk diskon berdasarkan jumlah.</p>
      </div>
      <div v-else class="space-y-3 md:hidden">
        <div v-for="row in pageItems" :key="row.id" class="rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0 flex-1">
              <p class="truncate text-xs font-bold text-gray-900 dark:text-white">{{ row.product_name }}</p>
              <p v-if="row.sku" class="text-[10px] text-gray-500">SKU: {{ row.sku }}</p>
              <span class="mt-1 inline-flex rounded-lg px-2 py-0.5 text-[10px] font-semibold" :style="{ backgroundColor: tierColor(row.tier_name).bg, color: tierColor(row.tier_name).text }">{{ row.tier_name || 'Tier' }}</span>
            </div>
            <button type="button" class="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800" @click="showMenu(row, $event)" aria-label="Menu">⋮</button>
          </div>
          <div class="mt-2 flex items-center justify-between">
            <span class="text-[11px] text-gray-500 dark:text-gray-400">x{{ row.min_quantity }}<template v-if="row.max_quantity">–{{ row.max_quantity }}</template><template v-else>+</template></span>
            <span class="text-sm font-bold text-gray-900 dark:text-white">{{ formatCurrency(row.tier_price) }}</span>
          </div>
          <div v-if="row.start_date || row.end_date" class="mt-1 text-[10px] text-gray-500 dark:text-gray-400">{{ formatRange(row.start_date, row.end_date) }}</div>
          <div class="mt-2 flex items-center gap-2">
            <span :class="['inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium', row.is_active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400']">
              <span :class="['h-1.5 w-1.5 rounded-full', row.is_active ? 'bg-emerald-500' : 'bg-gray-400']"></span>{{ row.is_active ? 'Aktif' : 'Nonaktif' }}
            </span>
          </div>
          <div class="mt-2 h-1 rounded-b-2xl" :style="{ backgroundColor: tierColor(row.tier_name).border }"></div>
        </div>
        <div v-if="filtered.length>pageSize" class="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-white/[0.03]">
          <span class="text-xs text-gray-600 dark:text-gray-400">{{ (page-1)*pageSize+1 }}–{{ Math.min(page*pageSize, filtered.length) }} / {{ filtered.length }}</span>
          <span class="flex items-center gap-2">
            <button type="button" :disabled="page===1" class="flex h-8 w-8 items-center justify-center rounded-lg border text-sm disabled:opacity-40" @click="page=Math.max(1,page-1)">‹</button>
            <span class="text-sm font-medium">{{ page }}/{{ totalPages }}</span>
            <button type="button" :disabled="page===totalPages" class="flex h-8 w-8 items-center justify-center rounded-lg border text-sm disabled:opacity-40" @click="page=Math.min(totalPages,page+1)">›</button>
          </span>
        </div>
      </div>

      <!-- Desktop table -->
      <div class="hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] md:block">
        <div v-if="loading" class="p-8 text-center text-sm text-gray-500">Memuat…</div>
        <div v-else-if="filtered.length===0" class="p-8 text-center text-sm text-gray-500">Belum ada harga tier.</div>
        <div v-else class="overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead class="border-b bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-gray-900/40 dark:text-gray-400">
              <tr><th class="px-4 py-3">Produk</th><th class="px-4 py-3">Tier</th><th class="px-4 py-3">Rentang</th><th class="px-4 py-3 text-right">Harga</th><th class="px-4 py-3">Periode</th><th class="px-4 py-3">Status</th><th class="px-4 py-3"></th></tr>
            </thead>
            <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
              <tr v-for="row in pageItems" :key="row.id" class="hover:bg-gray-50/60 dark:hover:bg-white/[0.02]">
                <td class="px-4 py-3"><span class="font-medium text-gray-900 dark:text-white">{{ row.product_name }}</span><span v-if="row.sku" class="ml-2 text-xs text-gray-500">{{ row.sku }}</span></td>
                <td class="px-4 py-3"><span class="rounded-lg px-2 py-1 text-xs font-semibold" :style="{ backgroundColor: tierColor(row.tier_name).bg, color: tierColor(row.tier_name).text }">{{ row.tier_name||'Tier' }}</span></td>
                <td class="px-4 py-3 text-xs text-gray-600 dark:text-gray-300">{{ row.min_quantity }}<template v-if="row.max_quantity"> – {{ row.max_quantity }}</template><template v-else>+</template></td>
                <td class="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">{{ formatCurrency(row.tier_price) }}</td>
                <td class="px-4 py-3 text-xs text-gray-500">{{ formatRange(row.start_date, row.end_date) }}</td>
                <td class="px-4 py-3"><span :class="['rounded-full px-2 py-0.5 text-xs', row.is_active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30' : 'bg-gray-100 text-gray-600']">{{ row.is_active ? 'Aktif' : 'Nonaktif' }}</span></td>
                <td class="px-4 py-3 text-right"><button type="button" class="rounded-lg border px-3 py-1.5 text-xs hover:bg-gray-50 dark:border-gray-700" @click="editTier(row)">Edit</button> <button type="button" class="ml-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50" @click="askDelete(row)">Hapus</button></td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-if="filtered.length>pageSize" class="flex items-center justify-between border-t px-4 py-3 text-xs dark:border-gray-800">
          <span class="text-gray-600 dark:text-gray-400">{{ (page-1)*pageSize+1 }}–{{ Math.min(page*pageSize, filtered.length) }} / {{ filtered.length }}</span>
          <span class="flex items-center gap-2"><button type="button" :disabled="page===1" class="rounded-lg border px-3 py-1 disabled:opacity-40" @click="page--">Prev</button><span>{{ page }}/{{ totalPages }}</span><button type="button" :disabled="page===totalPages" class="rounded-lg border px-3 py-1 disabled:opacity-40" @click="page++">Next</button></span>
        </div>
      </div>
    </div>

    <!-- Mobile sheet menu -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="sheetOpen" class="fixed inset-0 z-50 flex items-end justify-center bg-black/50 md:hidden" @click.self="sheetOpen=false">
          <div class="w-full max-w-lg rounded-t-3xl bg-white p-4 dark:bg-gray-900">
            <p class="text-center text-sm font-bold text-gray-900 dark:text-white">{{ sheetRow?.product_name }}</p>
            <div class="mt-4 grid gap-2">
              <button type="button" class="rounded-xl border bg-white px-4 py-3 text-left text-sm font-medium dark:border-gray-700 dark:bg-gray-800 dark:text-white" @click="editFromSheet">Edit</button>
              <button type="button" class="rounded-xl border px-4 py-3 text-left text-sm font-medium" :class="sheetRow?.is_active ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/40' : 'border-emerald-200 bg-emerald-50 text-emerald-800'" @click="toggleFromSheet">{{ sheetRow?.is_active ? 'Nonaktifkan' : 'Aktifkan' }}</button>
              <button type="button" class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-left text-sm font-medium text-red-600 dark:border-red-900/40 dark:bg-red-500/10" @click="deleteFromSheet">Hapus</button>
              <button type="button" class="mt-1 rounded-xl border-2 border-gray-300 bg-white px-4 py-3 text-sm font-medium dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200" @click="sheetOpen=false">Batal</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <ConfirmDialog v-model="confirmOpen" title="Hapus harga tier?" message="Data akan dihapus permanen." confirm-text="Hapus" cancel-text="Batal" variant="danger" @confirm="doDelete" />
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import MobilePageHeader from '@/components/common/MobilePageHeader.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import SelectField from '@/components/common/SelectField.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import { priceMatrixServiceAdapter as priceMatrixService } from '@/services'
import { useToast } from '@/composables/useToast'
import { usePriceMatrixStore } from '@/stores/priceMatrix'

const router = useRouter()
const toast = useToast()
const priceMatrixStore = usePriceMatrixStore()
const loading = ref(false)
const search = ref('')
const filterStatus = ref<string | null>(null)
const filterTierName = ref<string | null>(null)
const page = ref(1)
const pageSize = 10
type Row = { id: string; product_id: string; product_name: string; sku?: string; tier_name?: string; min_quantity: number; max_quantity: number | null; tier_price: number; is_active: boolean; start_date?: string; end_date?: string }
const rows = ref<Row[]>([])

const statusOptions = [{ label: 'Semua', value: null }, { label: 'Aktif', value: 'active' }, { label: 'Nonaktif', value: 'inactive' }]
const tierNameFilterOptions = [{ label: 'Semua tier', value: null }, { label: 'Eceran', value: 'Eceran' }, { label: 'Grosir', value: 'Grosir' }, { label: 'Partai Besar', value: 'Partai Besar' }]

const paginationLabel = computed(() => `${filtered.value.length} tier`)
const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize)))
const filtered = computed(() => {
  let r = rows.value
  const q = search.value.trim().toLowerCase()
  if (q) r = r.filter(x => (x.product_name||'').toLowerCase().includes(q) || (x.tier_name||'').toLowerCase().includes(q) || (x.sku||'').toLowerCase().includes(q))
  if (filterTierName.value) r = r.filter(x => x.tier_name === filterTierName.value)
  if (filterStatus.value==='active') r=r.filter(x=>x.is_active)
  else if (filterStatus.value==='inactive') r=r.filter(x=>!x.is_active)
  return r
})
const pageItems = computed(() => filtered.value.slice((page.value-1)*pageSize, page.value*pageSize))
watch([search, filterStatus, filterTierName], () => { page.value = 1 })

const formatCurrency = (v: number) => new Intl.NumberFormat('id-ID',{ style:'currency', currency:'IDR', maximumFractionDigits:0 }).format(v||0)
const formatRange = (a?: string, b?: string) => {
  const f = (s: string) => new Date(s).toLocaleDateString('id-ID',{ day:'numeric', month:'short', year:'numeric'})
  if (a&&b) return `${f(a)} – ${f(b)}`
  if (a) return `Mulai ${f(a)}`
  if (b) return `Sampai ${f(b)}`
  return 'Tanpa batas'
}
const tierColor = (name?: string) => {
  const m: Record<string,{bg:string;text:string;border:string}> = {
    'Eceran': { bg:'#fef3c7', text:'#92400e', border:'#fbbf24' },
    'Grosir': { bg:'#dbeafe', text:'#1e3a8a', border:'#3b82f6' },
    'Partai Besar': { bg:'#dcfce7', text:'#14532d', border:'#22c55e' },
  }
  return (name && m[name]) || { bg:'#f3f4f6', text:'#374151', border:'#9ca3af' }
}

const load = async () => {
  loading.value = true
  try {
    const data: any[] = await priceMatrixService.getPriceTiers()
    rows.value = data.map(d => ({
      id: d.id, product_id: d.product_id, product_name: d.product?.name || '-', sku: d.product?.sku,
      tier_name: d.tier_name, min_quantity: d.min_quantity, max_quantity: d.max_quantity ?? null,
      tier_price: d.tier_price, is_active: d.is_active, start_date: d.start_date, end_date: d.end_date,
    }))
  } catch (e: any) { toast.error('Gagal', e.message || 'Gagal memuat data') }
  finally { loading.value = false }
}
onMounted(load)

const addTier = () => router.push('/price-matrix/tiers/add')
const editTier = (r: Row) => router.push(`/price-matrix/tiers/${r.id}/edit`)

const sheetOpen = ref(false)
const sheetRow = ref<Row | null>(null)
const showMenu = (r: Row, _e: Event) => { sheetRow.value = r; sheetOpen.value = true }
const editFromSheet = () => { const r = sheetRow.value; sheetOpen.value=false; if (r) editTier(r) }
const toggleFromSheet = async () => {
  const r = sheetRow.value; if (!r) return
  sheetOpen.value=false
  try { await priceMatrixService.updatePriceTier(r.id, { is_active: !r.is_active } as any); await load(); priceMatrixStore.invalidate(); toast.success('Berhasil', 'Status diperbarui') } catch (e:any){ toast.error('Gagal', e.message)}
}
const confirmOpen = ref(false)
const toDelete = ref<Row | null>(null)
const askDelete = (r: Row) => { toDelete.value = r; confirmOpen.value = true }
const deleteFromSheet = () => { const r = sheetRow.value; sheetOpen.value=false; if (r) askDelete(r) }
const doDelete = async () => {
  const r = toDelete.value; if (!r) return
  try { await priceMatrixService.deletePriceTier(r.id); toast.success('Berhasil','Harga tier dihapus'); await load(); priceMatrixStore.invalidate() } catch(e:any){ toast.error('Gagal', e.message)} finally { toDelete.value=null }
}
</script>

<style scoped>
.modal-enter-active,.modal-leave-active{ transition: opacity .2s ease }
.modal-enter-active>div,.modal-leave-active>div{ transition: transform .2s ease }
.modal-enter-from,.modal-leave-to{ opacity:0 }
.modal-enter-from>div,.modal-leleave-to>div{ transform: translateY(100%) }
</style>
