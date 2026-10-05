<template>
  <AdminLayout>
    <PageBreadcrumb pageTitle="Harga Grup" class="hidden md:block" />
    <MobilePageHeader title="Harga Grup" :subtitle="paginationLabel">
      <template #actions>
        <button type="button" class="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-500 text-white shadow-sm hover:bg-brand-600 active:scale-95" @click="addItem" aria-label="Tambah harga grup">
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
        </button>
      </template>
    </MobilePageHeader>

    <div class="space-y-4">
      <p class="hidden text-xs text-gray-500 dark:text-gray-400 md:block">Harga berbeda per grup — semua anggota grup otomatis mendapat harga ini saat transaksi.</p>

      <div class="flex flex-col gap-2 md:hidden">
        <div class="relative">
          <input v-model="search" type="text" placeholder="Cari grup / produk..." class="w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm placeholder-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
          <svg class="absolute left-3 top-3 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
        </div>
        <div class="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          <button v-for="opt in statusOptions" :key="String(opt.value)" type="button" :class="['shrink-0 rounded-lg border px-3 py-1.5 text-[11px] font-medium', filterStatus===opt.value ? 'border-brand-500 bg-brand-500 text-white' : 'border-gray-300 bg-white text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300']" @click="filterStatus=opt.value">{{ opt.label }}</button>
        </div>
      </div>

      <div class="hidden items-center gap-3 md:flex">
        <div class="relative w-72">
          <input v-model="search" type="text" placeholder="Cari grup / produk..." class="w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
          <svg class="absolute left-3 top-3 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
        </div>
        <button type="button" class="ml-auto rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600" @click="addItem">+ Tambah Harga Grup</button>
      </div>

      <div v-if="loading" class="space-y-3">
        <div v-for="i in 3" :key="i" class="h-20 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800"></div>
      </div>
      <div v-else-if="groups.length===0" class="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center dark:border-gray-700 dark:bg-gray-900/50">
        <p class="text-sm font-medium text-gray-700 dark:text-gray-300">{{ search || filterStatus ? 'Tidak ada yang cocok' : 'Belum ada harga grup' }}</p>
        <p class="mt-1 text-xs text-gray-500">Atur harga khusus untuk satu grup pelanggan.</p>
      </div>
      <div v-else class="space-y-3">
        <div v-for="g in pageGroups" :key="g.groupId" class="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <button type="button" class="flex w-full items-center gap-3 p-3.5 text-left md:p-4" @click="toggleGroup(g.groupId)">
            <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-sm font-bold text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">{{ initials(g.groupName) }}</span>
            <span class="min-w-0 flex-1">
              <span class="block truncate text-sm font-bold text-gray-900 dark:text-white">{{ g.groupName }}</span>
              <span class="mt-0.5 block text-xs text-gray-500">
                {{ g.items.length }} produk · {{ g.activeCount }} aktif
              </span>
            </span>
            <span class="hidden shrink-0 text-right text-[11px] text-gray-500 sm:block">
              <span class="block font-semibold text-gray-900 dark:text-white">{{ priceRange(g) }}</span>
            </span>
            <svg :class="['h-4 w-4 shrink-0 text-gray-400 transition-transform', isExpanded(g.groupId) ? 'rotate-180' : '']" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
          </button>

          <div v-if="isExpanded(g.groupId)" class="border-t border-gray-100 dark:border-gray-800">
            <div v-for="row in g.items" :key="row.id" class="flex items-start gap-3 border-b border-gray-100 px-3.5 py-3 last:border-b-0 dark:border-gray-800/70 md:px-4">
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-semibold text-gray-900 dark:text-white">{{ row.product_name }}</p>
                <p v-if="row.sku" class="text-[11px] text-gray-500">SKU: {{ row.sku }}</p>
                <p class="mt-0.5 text-[11px] text-gray-500">
                  Min x{{ row.min_quantity }} · {{ row.start_date || row.end_date ? formatRange(row.start_date, row.end_date) : 'Berlaku selamanya' }}
                </p>
                <span :class="['mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium', row.is_active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400']">
                  <span :class="['h-1.5 w-1.5 rounded-full', row.is_active ? 'bg-emerald-500' : 'bg-gray-400']"></span>{{ row.is_active ? 'Aktif' : 'Nonaktif' }}
                </span>
              </div>
              <div class="flex shrink-0 flex-col items-end gap-1.5">
                <span class="text-sm font-bold text-gray-900 dark:text-white">{{ formatCurrency(row.custom_price) }}</span>
                <span class="flex items-center gap-1">
                  <button type="button" class="hidden rounded-lg border border-gray-200 px-2.5 py-1 text-[11px] font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 md:inline-flex" @click="editItem(row)">Edit</button>
                  <button type="button" class="hidden rounded-lg border border-red-200 px-2.5 py-1 text-[11px] font-medium text-red-600 hover:bg-red-50 md:inline-flex" @click="askDelete(row)">Hapus</button>
                  <button type="button" class="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 md:hidden" @click="showMenu(row)" aria-label="Menu">⋮</button>
                </span>
              </div>
            </div>
          </div>
          <div class="h-1 rounded-b-2xl bg-violet-500/60"></div>
        </div>

        <div v-if="groups.length>pageSize" class="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-white/[0.03]">
          <span class="text-xs text-gray-600 dark:text-gray-400">{{ (page-1)*pageSize+1 }}–{{ Math.min(page*pageSize, groups.length) }} / {{ groups.length }} grup</span>
          <span class="flex items-center gap-2">
            <button type="button" :disabled="page===1" class="flex h-8 w-8 items-center justify-center rounded-lg border disabled:opacity-40" @click="page=Math.max(1,page-1)">‹</button>
            <span class="text-sm font-medium">{{ page }}/{{ totalPages }}</span>
            <button type="button" :disabled="page===totalPages" class="flex h-8 w-8 items-center justify-center rounded-lg border disabled:opacity-40" @click="page=Math.min(totalPages,page+1)">›</button>
          </span>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <Transition name="modal">
        <div v-if="sheetOpen" class="fixed inset-0 z-50 flex items-end justify-center bg-black/50" @click.self="sheetOpen=false">
          <div class="w-full max-w-lg rounded-t-3xl bg-white p-4 dark:bg-gray-900">
            <p class="text-center text-sm font-bold text-gray-900 dark:text-white">{{ sheetRow?.product_name }}</p>
            <p class="text-center text-xs text-gray-500">{{ sheetRow?.group_name }}</p>
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

    <ConfirmDialog v-model="confirmOpen" title="Hapus harga grup?" message="Data akan dihapus permanen." confirm-text="Hapus" cancel-text="Batal" variant="danger" @confirm="doDelete" />
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
const pageSize = 8
type Row = { id: string; group_id: string; group_name: string; product_id: string; product_name: string; sku?: string; custom_price: number; min_quantity: number; is_active: boolean; start_date?: string; end_date?: string; notes?: string }
const rows = ref<Row[]>([])
const statusOptions = [{ label: 'Semua', value: null }, { label: 'Aktif', value: 'active' }, { label: 'Nonaktif', value: 'inactive' }]

const filtered = computed(()=>{
  let r = rows.value
  const q = search.value.trim().toLowerCase()
  if (q) r = r.filter(x => (x.group_name||'').toLowerCase().includes(q) || (x.product_name||'').toLowerCase().includes(q) || (x.sku||'').toLowerCase().includes(q))
  if (filterStatus.value==='active') r=r.filter(x=>x.is_active)
  else if (filterStatus.value==='inactive') r=r.filter(x=>!x.is_active)
  return r
})

type Group = { groupId: string; groupName: string; items: Row[]; activeCount: number }
const groups = computed<Group[]>(()=>{
  const map = new Map<string, Group>()
  for (const row of filtered.value) {
    const key = row.group_id || row.group_name
    let g = map.get(key)
    if (!g) { g = { groupId: key, groupName: row.group_name, items: [], activeCount: 0 }; map.set(key, g) }
    g.items.push(row)
    if (row.is_active) g.activeCount++
  }
  return [...map.values()].sort((a,b)=> a.groupName.localeCompare(b.groupName, 'id'))
})

const paginationLabel = computed(()=> `${groups.value.length} grup`)
const totalPages = computed(()=> Math.max(1, Math.ceil(groups.value.length/pageSize)))
const pageGroups = computed(()=> groups.value.slice((page.value-1)*pageSize, page.value*pageSize))
watch([search, filterStatus], ()=> page.value=1)

const expanded = ref<Set<string>>(new Set())
const isExpanded = (id:string)=> !!search.value.trim() || expanded.value.has(id)
const toggleGroup = (id:string)=>{
  const s = new Set(expanded.value)
  s.has(id) ? s.delete(id) : s.add(id)
  expanded.value = s
}

const initials = (name:string)=> (name||'?').trim().split(/\s+/).slice(0,2).map(w=>w[0]).join('').toUpperCase()
const priceRange = (g:Group)=>{
  const prices = g.items.map(i=>i.custom_price||0)
  const min = Math.min(...prices), max = Math.max(...prices)
  return min===max ? formatCurrency(min) : `${formatCurrency(min)} – ${formatCurrency(max)}`
}

const formatCurrency = (v:number)=> new Intl.NumberFormat('id-ID',{ style:'currency', currency:'IDR', maximumFractionDigits:0 }).format(v||0)
const formatRange = (a?:string,b?:string)=> {
  const f=(s:string)=> new Date(s).toLocaleDateString('id-ID',{ day:'numeric', month:'short', year:'numeric'})
  if(a&&b) return `${f(a)} – ${f(b)}`
  if(a) return `Mulai ${f(a)}`
  if(b) return `Sampai ${f(b)}`
  return 'Selamanya'
}
const load = async()=>{
  loading.value=true
  try{
    const data:any[] = await priceMatrixService.getGroupPrices()
    rows.value = data.map(d=>({ id:d.id, group_id:d.group_id, group_name:d.group?.name||'-', product_id:d.product_id, product_name:d.product?.name||'-', sku:d.product?.sku, custom_price:d.custom_price, min_quantity:d.min_quantity, is_active:d.is_active, start_date:d.start_date, end_date:d.end_date, notes:d.notes }))
  }catch(e:any){ toast.error('Gagal', e.message||'Gagal memuat') }
  finally{ loading.value=false }
}
onMounted(load)

const addItem = ()=> router.push('/price-matrix/group-prices/add')
const editItem = (r:Row)=> router.push(`/price-matrix/group-prices/${r.id}/edit`)
const sheetOpen = ref(false)
const sheetRow = ref<Row|null>(null)
const showMenu = (r:Row)=>{ sheetRow.value=r; sheetOpen.value=true }
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
  try{ await priceMatrixService.deleteCustomerPrice(r.id); toast.success('Berhasil','Harga grup dihapus'); await load(); priceMatrixStore.invalidate()}catch(e:any){ toast.error('Gagal', e.message)} finally{ toDelete.value=null }
}
</script>

<style scoped>
.modal-enter-active,.modal-leave-active{ transition: opacity .2s ease }
.modal-enter-active>div,.modal-leave-active>div{ transition: transform .2s ease }
.modal-enter-from,.modal-leave-to{ opacity:0 }
.modal-enter-from>div,.modal-leave-to>div{ transform: translateY(100%) }
</style>
