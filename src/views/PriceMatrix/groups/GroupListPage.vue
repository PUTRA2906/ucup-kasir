<template>
  <AdminLayout>
    <PageBreadcrumb pageTitle="Grup Pelanggan" class="hidden md:block" />
    <MobilePageHeader title="Grup Pelanggan" :subtitle="paginationLabel">
      <template #actions>
        <button type="button" class="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-500 text-white shadow-sm hover:bg-brand-600 active:scale-95" @click="addItem" aria-label="Tambah grup">
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
        </button>
      </template>
    </MobilePageHeader>

    <div class="space-y-4">
      <p class="hidden text-xs text-gray-500 dark:text-gray-400 md:block">Satu grup berisi beberapa pelanggan — harga khusus per grup berlaku otomatis untuk semua anggotanya.</p>

      <div class="flex flex-col gap-2 md:hidden">
        <div class="relative">
          <input v-model="search" type="text" placeholder="Cari nama grup..." class="w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm placeholder-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
          <svg class="absolute left-3 top-3 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
        </div>
      </div>

      <div class="hidden items-center gap-3 md:flex">
        <div class="relative w-72">
          <input v-model="search" type="text" placeholder="Cari nama grup..." class="w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
          <svg class="absolute left-3 top-3 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
        </div>
        <button type="button" class="ml-auto rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600" @click="addItem">+ Tambah Grup</button>
      </div>

      <div v-if="loading" class="space-y-3 md:hidden">
        <div v-for="i in 3" :key="i" class="h-24 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800"></div>
      </div>
      <div v-else-if="filtered.length===0" class="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center dark:border-gray-700 dark:bg-gray-900/50 md:hidden">
        <p class="text-sm font-medium text-gray-700 dark:text-gray-300">{{ search ? 'Tidak ada yang cocok' : 'Belum ada grup' }}</p>
        <p class="mt-1 text-xs text-gray-500">Buat grup lalu isi dengan beberapa pelanggan.</p>
      </div>
      <div v-else class="space-y-3 md:hidden">
        <div v-for="g in pageItems" :key="g.id" class="rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div class="flex items-start justify-between gap-2">
            <div class="flex min-w-0 flex-1 items-center gap-2.5">
              <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-sm font-bold text-violet-600 ring-1 ring-violet-500/15 dark:text-violet-400">{{ g.name.charAt(0).toUpperCase() }}</span>
              <div class="min-w-0">
                <p class="truncate text-sm font-bold text-gray-900 dark:text-white">{{ g.name }}</p>
                <p class="text-[11px] text-gray-500">{{ memberCount(g) }} pelanggan</p>
              </div>
            </div>
            <button type="button" class="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800" @click="showMenu(g, $event)" aria-label="Menu">⋮</button>
          </div>
          <p v-if="g.notes" class="mt-2 line-clamp-2 text-[11px] leading-snug text-gray-600 dark:text-gray-400">{{ g.notes }}</p>
          <div class="mt-2 flex items-center gap-1.5">
            <span v-for="m in visibleMembers(g)" :key="m.customer_id" class="truncate rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">{{ m.customer?.name || '-' }}</span>
            <span v-if="memberCount(g)>3" class="shrink-0 text-[10px] text-gray-500">+{{ memberCount(g)-3 }} lagi</span>
          </div>
          <div class="mt-2 h-1 rounded-b-2xl bg-violet-500/60"></div>
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
        <div v-else-if="filtered.length===0" class="p-8 text-center text-sm text-gray-500">Belum ada grup.</div>
        <div v-else class="overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead class="border-b bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-gray-900/40">
              <tr><th class="px-4 py-3">Grup</th><th class="px-4 py-3">Anggota</th><th class="px-4 py-3">Catatan</th><th class="px-4 py-3"></th></tr>
            </thead>
            <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
              <tr v-for="g in pageItems" :key="g.id" class="hover:bg-gray-50/60">
                <td class="px-4 py-3 font-medium text-gray-900 dark:text-white">{{ g.name }}</td>
                <td class="px-4 py-3 text-xs">{{ memberCount(g) }} pelanggan</td>
                <td class="px-4 py-3 text-xs text-gray-500">{{ g.notes || '-' }}</td>
                <td class="px-4 py-3 text-right"><button type="button" class="rounded-lg border px-3 py-1.5 text-xs hover:bg-gray-50 dark:border-gray-700" @click="editItem(g)">Edit</button> <button type="button" class="ml-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50" @click="askDelete(g)">Hapus</button></td>
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
            <p class="text-center text-sm font-bold text-gray-900 dark:text-white">{{ sheetGroup?.name }}</p>
            <div class="mt-4 grid gap-2">
              <button type="button" class="rounded-xl border bg-white px-4 py-3 text-left text-sm font-medium dark:border-gray-700 dark:bg-gray-800 dark:text-white" @click="editFromSheet">Edit</button>
              <button type="button" class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-left text-sm font-medium text-red-600" @click="deleteFromSheet">Hapus</button>
              <button type="button" class="mt-1 rounded-xl border-2 border-gray-300 bg-white px-4 py-3 text-sm font-medium dark:border-gray-700 dark:bg-gray-800" @click="sheetOpen=false">Batal</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <ConfirmDialog v-model="confirmOpen" title="Hapus grup?" message="Grup dan keanggotaannya dihapus permanen. Harga khusus milik grup ini juga ikut terhapus." confirm-text="Hapus" cancel-text="Batal" variant="danger" @confirm="doDelete" />
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
import type { CustomerGroupWithMembers } from '@/types/priceMatrix'

const router = useRouter()
const toast = useToast()
const priceMatrixStore = usePriceMatrixStore()
const loading = ref(false)
const search = ref('')
const page = ref(1)
const pageSize = 10
const groups = ref<CustomerGroupWithMembers[]>([])
const paginationLabel = computed(()=> `${filtered.value.length} grup`)
const totalPages = computed(()=> Math.max(1, Math.ceil(filtered.value.length/pageSize)))
const filtered = computed(()=>{
  const q = search.value.trim().toLowerCase()
  if (!q) return groups.value
  return groups.value.filter(g => g.name.toLowerCase().includes(q))
})
const pageItems = computed(()=> filtered.value.slice((page.value-1)*pageSize, page.value*pageSize))
watch(search, ()=> page.value=1)

const memberList = (g:CustomerGroupWithMembers)=> g.members || []
const memberCount = (g:CustomerGroupWithMembers)=> memberList(g).length
const visibleMembers = (g:CustomerGroupWithMembers)=> memberList(g).slice(0,3)

const load = async()=>{
  loading.value=true
  try{ groups.value = await priceMatrixService.getGroups() }
  catch(e:any){ toast.error('Gagal', e.message||'Gagal memuat') }
  finally{ loading.value=false }
}
onMounted(load)

const addItem = ()=> router.push('/price-matrix/groups/add')
const editItem = (g:CustomerGroupWithMembers)=> router.push(`/price-matrix/groups/${g.id}/edit`)

const sheetOpen = ref(false)
const sheetGroup = ref<CustomerGroupWithMembers|null>(null)
const showMenu = (g:CustomerGroupWithMembers,_e:Event)=>{ sheetGroup.value=g; sheetOpen.value=true }
const editFromSheet = ()=>{ const g=sheetGroup.value; sheetOpen.value=false; if(g) editItem(g) }
const deleteFromSheet = ()=>{ const g=sheetGroup.value; sheetOpen.value=false; if(g) askDelete(g) }

const confirmOpen=ref(false)
const toDelete=ref<CustomerGroupWithMembers|null>(null)
const askDelete=(g:CustomerGroupWithMembers)=>{ toDelete.value=g; confirmOpen.value=true }
const doDelete=async()=>{
  const g=toDelete.value; if(!g) return
  try{ await priceMatrixService.deleteGroup(g.id); toast.success('Berhasil','Grup dihapus'); await load(); priceMatrixStore.invalidate()}catch(e:any){ toast.error('Gagal', e.message)} finally{ toDelete.value=null }
}
</script>

<style scoped>
.modal-enter-active,.modal-leave-active{ transition: opacity .2s ease }
.modal-enter-active>div,.modal-leave-active>div{ transition: transform .2s ease }
.modal-enter-from,.modal-leave-to{ opacity:0 }
.modal-enter-from>div,.modal-leave-to>div{ transform: translateY(100%) }
</style>
