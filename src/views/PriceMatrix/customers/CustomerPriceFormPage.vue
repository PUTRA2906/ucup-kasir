<template>
  <AdminLayout>
    <PageBreadcrumb :pageTitle="isEdit ? 'Edit Harga Khusus' : 'Tambah Harga Khusus'" class="hidden md:block" />
    <MobilePageHeader :title="isEdit ? 'Edit Harga Khusus' : 'Tambah Harga Khusus'" :subtitle="isEdit ? 'Perbarui harga khusus pelanggan' : 'Atur harga khusus per pelanggan'" @back="handleBack" />

    <div class="mx-auto max-w-3xl">
      <div v-if="loadingEdit" class="flex items-center justify-center py-16">
        <div class="text-center">
          <svg class="mx-auto h-8 w-8 animate-spin text-brand-500" viewBox="0 0 24 24" fill="none"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
          <p class="mt-3 text-sm text-gray-500">Memuat data…</p>
        </div>
      </div>

      <form v-else @submit.prevent="handleSubmit" class="space-y-4">
        <!-- Pelanggan -->
        <div class="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
          <h3 class="mb-3 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">Pelanggan</h3>
          <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Pelanggan <span class="text-error-500">*</span></label>
          <button type="button" class="flex w-full items-center justify-between rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-left text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" @click="showCustomerPicker=true">
            <span :class="form.customer_name ? 'text-gray-900 dark:text-white' : 'text-gray-400'">{{ form.customer_name || 'Pilih pelanggan…' }}</span>
            <svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
          </button>
        </div>

        <!-- Produk & Harga -->
        <div class="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
          <div class="mb-3 flex items-center justify-between">
            <h3 class="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">Produk &amp; Harga</h3>
            <span class="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">{{ rows.length }} produk</span>
          </div>

          <p v-if="rows.length===0" class="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-3 py-4 text-center text-xs text-gray-500 dark:border-gray-700 dark:bg-gray-900/50">Belum ada produk. Tambahkan satu atau lebih produk untuk harga khusus.</p>

          <div class="space-y-3">
            <div v-for="(row, idx) in rows" :key="row.product_id" class="rounded-xl border border-gray-200 p-3 dark:border-gray-800">
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <p class="truncate text-sm font-semibold text-gray-900 dark:text-white">{{ row.product_name }}</p>
                  <p class="text-[11px] text-gray-500">Harga normal: {{ formatCurrency(row.product_price) }}</p>
                </div>
                <button type="button" class="shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-error-50 hover:text-error-600 dark:hover:bg-error-500/10" :aria-label="`Hapus ${row.product_name}`" @click="removeRow(idx)">
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>
              <div class="mt-2.5 grid grid-cols-[1fr_88px] gap-2">
                <div>
                  <label class="mb-1 block text-[11px] font-medium text-gray-700 dark:text-gray-300">Harga khusus</label>
                  <CurrencyInput v-model="row.custom_price" class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800" />
                </div>
                <div>
                  <label class="mb-1 block text-[11px] font-medium text-gray-700 dark:text-gray-300">Min qty</label>
                  <input v-model.number="row.min_quantity" type="number" min="1" class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" placeholder="1" />
                </div>
              </div>
            </div>
          </div>

          <button type="button" class="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-brand-300 px-4 py-2.5 text-sm font-medium text-brand-600 hover:bg-brand-50/50 active:scale-[0.99] dark:border-brand-700 dark:text-brand-400 dark:hover:bg-brand-500/10" @click="showProductPicker=true">
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
            Tambah Produk
          </button>
        </div>

        <!-- Periode & status -->
        <div class="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
          <h3 class="mb-3 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">Periode & Status</h3>
          <div class="flex items-center gap-2">
            <button v-for="opt in periodOptions" :key="opt.value" type="button" :class="['rounded-lg border px-3 py-1.5 text-[11px] font-medium', periodMode===opt.value ? 'border-brand-500 bg-brand-500 text-white' : 'border-gray-300 bg-white text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300']" @click="setPeriodMode(opt.value)">{{ opt.label }}</button>
          </div>
          <div v-if="periodMode==='custom'" class="mt-3 grid grid-cols-2 gap-3">
            <div>
              <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Mulai tanggal</label>
              <DateField v-model="form.start_date" placeholder="Mulai sekarang" title="Mulai Berlaku" button-class="flex w-full items-center justify-between rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
            </div>
            <div>
              <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Sampai tanggal</label>
              <DateField v-model="form.end_date" placeholder="Selamanya" title="Sampai Tanggal" button-class="flex w-full items-center justify-between rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
            </div>
          </div>
          <p v-else class="mt-2 text-[11px] text-gray-500">Harga khusus berlaku mulai sekarang tanpa batas akhir.</p>
          <div class="mt-4">
            <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Catatan <span class="text-gray-400">(berlaku untuk semua produk)</span></label>
            <textarea v-model="form.notes" rows="3" placeholder="Alasan / keterangan…" class="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"></textarea>
          </div>
          <label class="mt-4 flex items-center justify-between gap-3 rounded-xl border border-gray-200 px-3 py-2.5 dark:border-gray-800">
            <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Aktif</span>
            <button type="button" class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors" :class="form.is_active ? 'bg-brand-500' : 'bg-gray-300 dark:bg-gray-700'" @click="form.is_active=!form.is_active" aria-label="Toggle aktif">
              <span class="inline-block h-4 w-4 rounded-full bg-white transition-transform" :class="form.is_active ? 'translate-x-6' : 'translate-x-1'"></span>
            </button>
          </label>
        </div>

        <div class="sticky bottom-4 z-10 flex gap-2 md:static md:justify-end">
          <button type="button" class="flex-1 rounded-xl border-2 border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 active:scale-[0.99] dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 md:flex-none md:px-6" @click="handleBack">Batal</button>
          <button type="submit" :disabled="!canSubmit || saving" class="flex-1 rounded-xl bg-brand-500 px-4 py-3 text-sm font-medium text-white hover:bg-brand-600 active:scale-[0.99] disabled:opacity-50 md:flex-none md:px-6">{{ saving ? 'Menyimpan…' : (isEdit ? 'Simpan Perubahan' : `Simpan${rows.length>1 ? ` (${rows.length})` : ''}`) }}</button>
        </div>
      </form>
    </div>

    <CustomerPickerModal v-if="showCustomerPicker" v-model="showCustomerPicker" :customers="customers" @select="onPickCustomer" />
    <ProductPickerModal v-if="showProductPicker" v-model="showProductPicker" :products="availableProducts" @add="onAddProducts" />

    <ConfirmDialog v-model="confirmLeaveOpen" title="Batalkan perubahan?" message="Perubahan yang belum disimpan akan hilang." confirm-text="Ya, Batalkan" cancel-text="Lanjut Edit" @confirm="doLeave" />
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import MobilePageHeader from '@/components/common/MobilePageHeader.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import DateField from '@/components/common/DateField.vue'
import CurrencyInput from '@/components/common/CurrencyInput.vue'
import CustomerPickerModal from '@/components/common/CustomerPickerModal.vue'
import ProductPickerModal from '@/components/common/ProductPickerModal.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import { useToast } from '@/composables/useToast'
import { useAutoNavigationStack } from '@/composables/useAutoNavigationStack'
import { priceMatrixServiceAdapter as priceMatrixService, productsServiceAdapter as productsService, customersServiceAdapter as customersService } from '@/services'
import { usePriceMatrixStore } from '@/stores/priceMatrix'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const priceMatrixStore = usePriceMatrixStore()
const isEdit = computed(()=> !!route.params.id)
const id = computed(()=> route.params.id as string | undefined)

const showCustomerPicker = ref(false)
const showProductPicker = ref(false)
const loadingEdit = ref(false)
const saving = ref(false)
const customers = ref<any[]>([])
const products = ref<any[]>([])

const form = ref({
  customer_id: '',
  customer_name: '',
  start_date: '',
  end_date: '',
  notes: '',
  is_active: true,
})

type PriceRow = { id?: string; product_id: string; product_name: string; product_price: number; custom_price: number; min_quantity: number }
const rows = ref<PriceRow[]>([])

const formatCurrency = (v:number)=> new Intl.NumberFormat('id-ID',{ style:'currency', currency:'IDR', maximumFractionDigits:0 }).format(v||0)

// Mode periode: 'forever' = tanpa tanggal (berlaku selamanya), 'custom' = tentukan tanggal sendiri
const periodOptions = [{ value: 'forever' as const, label: 'Selamanya' }, { value: 'custom' as const, label: 'Per Periode' }]
const periodMode = ref<'forever' | 'custom'>('forever')
const setPeriodMode = (m: 'forever' | 'custom')=>{
  periodMode.value = m
  if(m==='forever'){ form.value.start_date=''; form.value.end_date='' }
}

// Produk yang belum ada di daftar — mencegah duplikat di picker
const availableProducts = computed(()=>{
  const taken = new Set(rows.value.map(r=>r.product_id))
  return products.value.filter((p:any)=> !taken.has(p.id))
})

const canSubmit = computed(()=>{
  if(!form.value.customer_id || rows.value.length===0) return false
  return rows.value.every(r=> r.custom_price>=0 && r.min_quantity>0)
})

const onPickCustomer = (c:any)=>{ form.value.customer_id=c.id; form.value.customer_name=c.name; showCustomerPicker.value=false }

const onAddProducts = (payload:{products:any[]})=>{
  const existing = new Set(rows.value.map(r=>r.product_id))
  for(const p of payload.products){
    if(existing.has(p.id)) continue
    rows.value.push({ product_id: p.id, product_name: p.name, product_price: p.price_sell ?? 0, custom_price: p.price_sell ?? 0, min_quantity: 1 })
  }
  showProductPicker.value=false
}

const removeRow = (idx:number)=>{
  rows.value.splice(idx,1)
}

const handleSubmit = async()=>{
  if(!canSubmit.value || saving.value) return
  const shared = {
    customer_id: form.value.customer_id,
    start_date: form.value.start_date || undefined,
    end_date: form.value.end_date || undefined,
    notes: form.value.notes || undefined,
    is_active: form.value.is_active,
  }
  const toInsert = rows.value.filter(r=> !r.id).map(r=>({ ...shared, product_id: r.product_id, custom_price: r.custom_price, min_quantity: r.min_quantity }))
  const toUpdate = rows.value.filter(r=> r.id).map(r=>({ id: r.id!, data: { ...shared, product_id: r.product_id, custom_price: r.custom_price, min_quantity: r.min_quantity } }))
  saving.value=true
  try{
    for(const u of toUpdate) await priceMatrixService.updateCustomerPrice(u.id, u.data)
    // Baris asli (mode edit) tidak lagi ada di daftar → hapus record-nya
    if(isEdit.value && id.value && !toUpdate.some(u=>u.id===id.value)) await priceMatrixService.deleteCustomerPrice(id.value)
    if(toInsert.length) await priceMatrixService.createCustomerPrices(toInsert)
    priceMatrixStore.invalidate()
    const total = toInsert.length + toUpdate.length
    toast.success('Berhasil', isEdit.value ? `${total} harga khusus diperbarui` : `${total} harga khusus ditambahkan`)
    router.push('/price-matrix/customers')
  }catch(e:any){
    if(e?.code==='23505') toast.error('Gagal', 'Sudah ada harga khusus untuk produk ini pada periode tersebut')
    else toast.error('Gagal', e.message||'Gagal menyimpan')
  }
  finally{ saving.value=false }
}

const confirmLeaveOpen = ref(false)
useAutoNavigationStack(confirmLeaveOpen, 'customer-price-form-leave')
const handleBack=()=>{ if(form.value.customer_id || rows.value.length) confirmLeaveOpen.value=true; else doLeave() }
const doLeave=()=>{ confirmLeaveOpen.value=false; router.push('/price-matrix/customers') }

const loadLookups = async()=>{
  try{ customers.value = await customersService.getAll() }catch{}
  try{
    const list = await productsService.getAll()
    products.value = (list as any[]).map((p:any)=>({ id:p.id, name:p.name, sku:p.sku, barcode:p.barcode, price_sell:p.price_sell, price_buy:p.price_buy ?? 0, stock: p.stock??0, category_id:p.category_id, category:p.category }))
  }catch{}
}
const loadEdit = async()=>{
  if(!id.value) return
  loadingEdit.value=true
  try{
    const d:any = await priceMatrixService.getCustomerPrice(id.value)
    form.value = {
      customer_id: d.customer_id,
      customer_name: d.customer?.name || '',
      start_date: d.start_date || '',
      end_date: d.end_date || '',
      notes: d.notes || '',
      is_active: d.is_active,
    }
    periodMode.value = (d.start_date || d.end_date) ? 'custom' : 'forever'
    const row: PriceRow = {
      id: d.id,
      product_id: d.product_id,
      product_name: d.product?.name || '',
      product_price: d.product?.price_sell ?? 0,
      custom_price: d.custom_price,
      min_quantity: d.min_quantity,
    }
    rows.value = [row]
  }catch(e:any){ toast.error('Gagal', e.message||'Gagal memuat'); router.replace('/price-matrix/customers') }
  finally{ loadingEdit.value=false }
}

onMounted(async()=>{
  await loadLookups()
  if(isEdit.value) await loadEdit()
})

watch(customers, ()=>{
  if(form.value.customer_id && !form.value.customer_name){
    const c = customers.value.find((x:any)=> x.id===form.value.customer_id)
    if(c) form.value.customer_name=c.name
  }
})
</script>
