<template>
  <AdminLayout>
    <PageBreadcrumb pageTitle="Harga Khusus" class="hidden md:block" />
    <MobilePageHeader title="Harga Khusus" :subtitle="paginationLabel">
      <template #actions>
        <button type="button" class="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-500 text-white shadow-sm hover:bg-brand-600 active:scale-95" @click="addItem" aria-label="Tambah harga khusus">
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
        </button>
      </template>
    </MobilePageHeader>

    <div class="space-y-4">
      <p class="hidden text-xs text-gray-500 dark:text-gray-400 md:block">Harga berbeda per pelanggan — untuk kontrak, langganan, atau promo khusus.</p>

      <div class="flex flex-col gap-2 md:hidden">
        <div class="relative">
          <input v-model="search" type="text" placeholder="Cari pelanggan / produk..." class="w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm placeholder-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
          <svg class="absolute left-3 top-3 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
        </div>
        <div class="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          <button v-for="opt in statusOptions" :key="String(opt.value)" type="button" :class="['shrink-0 rounded-lg border px-3 py-1.5 text-[11px] font-medium', filterStatus===opt.value ? 'border-brand-500 bg-brand-500 text-white' : 'border-gray-300 bg-white text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300']" @click="filterStatus=opt.value">{{ opt.label }}</button>
        </div>
      </div>

      <div class="hidden items-center gap-3 md:flex">
        <div class="relative w-72">
          <input v-model="search" type="text" placeholder="Cari pelanggan / produk..." class="w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
          <svg class="absolute left-3 top-3 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
        </div>
        <button type="button" class="ml-auto rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600" @click="addItem">+ Tambah Harga Khusus</button>
      </div>

      <div v-if="loading" class="space-y-3 md:hidden">
        <div v-for="i in 3" :key="i" class="h-28 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800"></div>
      </div>
      <div v-else-if="filtered.length===0" class="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center dark:border-gray-700 dark:bg-gray-900/50 md:hidden">
        <p class="text-sm font-medium text-gray-700 dark:text-gray-300">{{ search || filterStatus ? 'Tidak ada yang cocok' : 'Belum ada harga khusus' }}</p>
        <p class="mt-1 text-xs text-gray-500">Tambahkan harga khusus per pelanggan.</p>
      </div>
      <div v-else class="space-y-3 md:hidden">
        <div v-for="row in pageItems" :key="row.id" class="rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0 flex-1">
              <p class="truncate text-xs font-bold text-gray-900 dark:text-white">{{ row.product_name }}</p>
              <p v-if="row.sku" class="text-[10px] text-gray-500">SKU: {{ row.sku }}</p>
              <p class="mt-1 truncate text-[11px] font-medium text-cyan-700 dark:text-cyan-300">{{ row.customer_name }}</p>
            </div>
            <button type="button" class="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800" @click="showMenu(row, $event)" aria-label="Menu">⋮</button>
          </div>
          <div class="mt-2 flex items-center justify-between">
            <span class="text-[11px] text-gray-500">Min x{{ row.min_quantity }}</span>
            <span class="text-sm font-bold text-gray-900 dark:text-white">{{ formatCurrency(row.custom_price) }}</span>
          </div>
          <div v-if="row.start_date || row.end_date" class="mt-1 text-[10px] text-gray-500">{{ formatRange(row.start_date, row.end_date) }}</div>
          <p v-if="row.notes" class="mt-1 line-clamp-2 text-[11px] leading-snug text-gray-600 dark:text-gray-400">{{ row.notes }}</p>
          <div class="mt-2 flex items-center gap-2">
            <span :class="['inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium', row.is_active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400']">
              <span :class="['h-1.5 w-1.5 rounded-full', row.is_active ? 'bg-emerald-500' : 'bg-gray-400']"></span>{{ row.is_active ? 'Aktif' : 'Nonaktif' }}
            </span>
          </div>
          <div class="mt-2 h-1 rounded-b-2xl bg-cyan-500/60"></div>
        </div>
        <div v-if="filtered.length>pageSize" class="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-white/[0.03]">
          <span class="text-xs text-gray-600 dark:text-gray-400">{{ (page-1)*pageSize+1 }}–{{ Math.min(page*pageSize, filtered.length) }} / {{ filtered.length }}</span>
          <span class="flex items-center gap-2">
            <button type="button" :disabled="page===1" class="flex h-8 w-8 items-center justify-center rounded-lg border disabled:opacity-40" @click="page=Math.max(1,page-1)">‹</button>
            <span class="text-sm font-medium">{{ page }}/{{ totalPages }}</span>
            <button type="button" :disabled="page===totalPages" class="flex h-8 w-8 items-center justify-center rounded-lg border disabled:opacity-40" @click="page=Math.min(totalPages,page+1)">›</button>
          </span>
        </div>
      </div>

      <div class="hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] md:block">
        <div v-if="loading" class="p-8 text-center text-sm text-gray-500">Memuat…</div>
        <div v-else-if="filtered.length===0" class="p-8 text-center text-sm text-gray-500">Belum ada harga khusus.</div>
        <div v-else class="overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead class="border-b bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-gray-900/40">
              <tr><th class="px-4 py-3">Pelanggan</th><th class="px-4 py-3">Produk</th><th class="px-4 py-3">Min qty</th><th class="px-4 py-3 text-right">Harga</th><th class="px-4 py-3">Periode</th><th class="px-4 py-3">Status</th><th class="px-4 py-3"></th></tr>
            </thead>
            <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
              <tr v-for="row in pageItems" :key="row.id" class="hover:bg-gray-50/60">
                <td class="px-4 py-3 font-medium text-gray-900 dark:text-white">{{ row.customer_name }}</td>
                <td class="px-4 py-3">{{ row.product_name }}<span v-if="row.sku" class="ml-2 text-xs text-gray-500">{{ row.sku }}</span></td>
                <td class="px-4 py-3 text-xs">{{ row.min_quantity }}</td>
                <td class="px-4 py-3 text-right font-semibold">{{ formatCurrency(row.custom_price) }}</td>
                <td class="px-4 py-3 text-xs text-gray-500">{{ formatRange(row.start_date, row.end_date) }}</td>
                <td class="px-4 py-3"><span :class="['rounded-full px-2 py-0.5 text-xs', row.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600']">{{ row.is_active ? 'Aktif' : 'Nonaktif' }}</span></td>
                <td class="px-4 py-3 text-right"><button type="button" class="rounded-lg border px-3 py-1.5 text-xs hover:bg-gray-50 dark:border-gray-700" @click="editItem(row)">Edit</button> <button type="button" class="ml-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50" @click="askDelete(row)">Hapus</button></td>
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

    <Teleport to="body">
      <Transition name="modal">
        <div v-if="sheetOpen" class="fixed inset-0 z-50 flex items-end justify-center bg-black/50 md:hidden" @click.self="sheetOpen=false">
          <div class="w-full max-w-lg rounded-t-3xl bg-white p-4 dark:bg-gray-900">
            <p class="text-center text-sm font-bold text-gray-900 dark:text-white">{{ sheetRow?.customer_name }} · {{ sheetRow?.product_name }}</p>
            <div class="mt-4 grid gap-2">
              <button type="button" class="rounded-xl border bg-white px-4 py-3 text-left text-sm font-medium dark:border-gray-700 dark:bg-gray-800 dark:text-white" @click="editFromSheet">Edit</button>
              <button type="button" class="rounded-xl border px-4 py-3 text-left text-sm font-medium" :class="sheetRow?.is_active ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'" @click="toggleFromSheet">{{ sheetRow?.is_active ? 'Nonaktifkan' : 'Aktifkan' }}</button>
              <button type="button" class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-left text-sm font-medium text-red-600" @click="deleteFromSheet">Hapus</button>
              <button type="button" class="mt-1 rounded-xl border-2 border-gray-300 bg-white px-4 py-3 text-sm font-medium dark:border-gray-700 dark:bg-gray-800" @click="sheetOpen=false">Batal</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <ConfirmDialog v-model="confirmOpen" title="Hapus harga khusus?" message="Data akan dihapus permanen." confirm-text="Hapus" cancel-text="Batal" variant="danger" @confirm="doDelete" />
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import MobilePageHeader from '@/components/common/MobilePageHeader.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
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
const page = ref(1)
const pageSize = 10
type Row = { id: string; customer_id: string; customer_name: string; product_id: string; product_name: string; sku?: string; custom_price: number; min_quantity: number; is_active: boolean; start_date?: string; end_date?: string; notes?: string }
const rows = ref<Row[]>([])
const statusOptions = [{ label: 'Semua', value: null }, { label: 'Aktif', value: 'active' }, { label: 'Nonaktif', value: 'inactive' }]
const paginationLabel = computed(()=> `${filtered.value.length} harga khusus`)
const totalPages = computed(()=> Math.max(1, Math.ceil(filtered.value.length/pageSize)))
const filtered = computed(()=>{
  let r = rows.value
  const q = search.value.trim().toLowerCase()
  if (q) r = r.filter(x => (x.customer_name||'').toLowerCase().includes(q) || (x.product_name||'').toLowerCase().includes(q) || (x.sku||'').toLowerCase().includes(q))
  if (filterStatus.value==='active') r=r.filter(x=>x.is_active)
  else if (filterStatus.value==='inactive') r=r.filter(x=>!x.is_active)
  return r
})
const pageItems = computed(()=> filtered.value.slice((page.value-1)*pageSize, page.value*pageSize))
watch([search, filterStatus], ()=> page.value=1)

const formatCurrency = (v:number)=> new Intl.NumberFormat('id-ID',{ style:'currency', currency:'IDR', maximumFractionDigits:0 }).format(v||0)
const formatRange = (a?:string,b?:string)=> {
  const f=(s:string)=> new Date(s).toLocaleDateString('id-ID',{ day:'numeric', month:'short', year:'numeric'})
  if(a&&b) return `${f(a)} – ${f(b)}`
  if(a) return `Mulai ${f(a)}`
  if(b) return `Sampai ${f(b)}`
  return 'Tanpa batas'
}
const load = async()=>{
  loading.value=true
  try{
    const data:any[] = await priceMatrixService.getIndividualPrices()
    rows.value = data.map(d=>({ id:d.id, customer_id:d.customer_id, customer_name:d.customer?.name||'-', product_id:d.product_id, product_name:d.product?.name||'-', sku:d.product?.sku, custom_price:d.custom_price, min_quantity:d.min_quantity, is_active:d.is_active, start_date:d.start_date, end_date:d.end_date, notes:d.notes }))
  }catch(e:any){ toast.error('Gagal', e.message||'Gagal memuat') }
  finally{ loading.value=false }
}
onMounted(load)

const addItem = ()=> router.push('/price-matrix/customers/add')
const editItem = (r:Row)=> router.push(`/price-matrix/customers/${r.id}/edit`)
const sheetOpen = ref(false)
const sheetRow = ref<Row|null>(null)
const showMenu = (r:Row,_e:Event)=>{ sheetRow.value=r; sheetOpen.value=true }
const editFromSheet = ()=>{ const r=sheetRow.value; sheetOpen.value=false; if(r) editItem(r) }
const toggleFromSheet = async()=>{
  const r=sheetRow.value; if(!r) return; sheetOpen.value=false
  try{ await priceMatrixService.updateCustomerPrice(r.id, { is_active: !r.is_active } as any); await load(); priceMatrixStore.invalidate(); toast.success('Berhasil','Status diperbarui')}catch(e:any){ toast.error('Gagal', e.message)}
}
const confirmOpen=ref(false)
const toDelete=ref<Row|null>(null)
const askDelete=(r:Row)=>{ toDelete.value=r; confirmOpen.value=true }
const deleteFromSheet=()=>{ const r=sheetRow.value; sheetOpen.value=false; if(r) askDelete(r) }
const doDelete=async()=>{
  const r=toDelete.value; if(!r) return
  try{ await priceMatrixService.deleteCustomerPrice(r.id); toast.success('Berhasil','Harga khusus dihapus'); await load(); priceMatrixStore.invalidate()}catch(e:any){ toast.error('Gagal', e.message)} finally{ toDelete.value=null }
}
</script>

<style scoped>
.modal-enter-active,.modal-leave-active{ transition: opacity .2s ease }
.modal-enter-active>div,.modal-leave-active>div{ transition: transform .2s ease }
.modal-enter-from,.modal-leave-to{ opacity:0 }
.modal-enter-from>div,.modal-leave-to>div{ transform: translateY(100%) }
</style>
