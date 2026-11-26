<template>
  <AdminLayout>
    <PageBreadcrumb :pageTitle="isEdit ? 'Edit Harga Tier' : 'Tambah Harga Tier'" class="hidden md:block" />
    <MobilePageHeader
      :title="isEdit ? 'Edit Harga Tier' : 'Tambah Harga Tier'"
      :subtitle="isEdit ? 'Perbarui rentang & harga tier' : 'Atur harga per rentang jumlah'"
      @back="handleBack"
    />

    <div class="mx-auto max-w-3xl">
      <div v-if="loadingEdit" class="flex items-center justify-center py-16">
        <div class="text-center">
          <svg class="mx-auto h-8 w-8 animate-spin text-brand-500" viewBox="0 0 24 24" fill="none"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
          <p class="mt-3 text-sm text-gray-500">Memuat data…</p>
        </div>
      </div>

      <form v-else @submit.prevent="handleSubmit" class="space-y-4">
        <!-- Produk -->
        <div class="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
          <h3 class="mb-3 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">Produk</h3>
          <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Produk <span class="text-error-500">*</span></label>
          <button
            type="button"
            class="flex w-full items-center justify-between rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-left text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            @click="showProductPicker = true"
          >
            <span :class="form.product_name ? 'text-gray-900 dark:text-white' : 'text-gray-400'">{{ form.product_name || 'Pilih produk…' }}</span>
            <svg class="h-4 w-4 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
          </button>
          <p v-if="form.product_price" class="mt-1.5 text-[11px] text-gray-500">Harga normal: {{ formatCurrency(form.product_price) }}</p>
        </div>

        <!-- Tier -->
        <div class="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
          <h3 class="mb-3 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">Tier</h3>
          <div class="space-y-4">
            <div>
              <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Nama tier</label>
              <SelectField
                v-model="form.tier_name"
                :options="tierOptions"
                title="Nama Tier"
                placeholder="Pilih tier"
                button-class="flex w-full items-center justify-between rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
              <input
                v-if="form.tier_name==='custom'"
                v-model="customTierName"
                type="text"
                placeholder="Nama tier kustom"
                class="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Min qty <span class="text-error-500">*</span></label>
                <input v-model.number="form.min_quantity" type="number" min="1" required class="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" placeholder="1" />
              </div>
              <div>
                <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Max qty</label>
                <input v-model.number="form.max_quantity" type="number" :min="form.min_quantity||1" class="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" placeholder="Tanpa batas" />
              </div>
            </div>
            <div>
              <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Harga tier <span class="text-error-500">*</span></label>
              <CurrencyInput v-model="form.tier_price" class="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800" />
            </div>
          </div>
        </div>

        <!-- Periode & status -->
        <div class="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
          <h3 class="mb-3 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">Periode & Status</h3>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Mulai tanggal</label>
              <DateField v-model="form.start_date" placeholder="Mulai sekarang" title="Mulai Berlaku" button-class="flex w-full items-center justify-between rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
            </div>
            <div>
              <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Sampai tanggal</label>
              <DateField v-model="form.end_date" placeholder="Tanpa batas" title="Sampai Tanggal" button-class="flex w-full items-center justify-between rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
            </div>
          </div>
          <label class="mt-4 flex items-center justify-between gap-3 rounded-xl border border-gray-200 px-3 py-2.5 dark:border-gray-800">
            <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Aktif</span>
            <button type="button" class="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors" :class="form.is_active ? 'bg-brand-500' : 'bg-gray-300 dark:bg-gray-700'" @click="form.is_active=!form.is_active" aria-label="Toggle aktif">
              <span class="inline-block h-4 w-4 rounded-full bg-white transition-transform" :class="form.is_active ? 'translate-x-6' : 'translate-x-1'"></span>
            </button>
          </label>
        </div>

        <!-- Actions: mobile sticky, desktop kanan -->
        <div class="sticky bottom-4 z-10 flex gap-2 md:static md:justify-end">
          <button type="button" class="flex-1 rounded-xl border-2 border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 active:scale-[0.99] dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 md:flex-none md:px-6" @click="handleBack">Batal</button>
          <button type="submit" :disabled="!canSubmit || saving" class="flex-1 rounded-xl bg-brand-500 px-4 py-3 text-sm font-medium text-white hover:bg-brand-600 active:scale-[0.99] disabled:opacity-50 md:flex-none md:px-6">{{ saving ? 'Menyimpan…' : (isEdit ? 'Simpan Perubahan' : 'Simpan') }}</button>
        </div>
      </form>
    </div>

    <ProductPickerModal v-if="showProductPicker" v-model="showProductPicker" :products="products" :single-select="true" @select="onPickProduct" />

    <ConfirmDialog v-model="confirmLeaveOpen" title="Batalkan perubahan?" message="Perubahan yang belum disimpan akan hilang." confirm-text="Ya, Batalkan" cancel-text="Lanjut Edit" @confirm="doLeave" />
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import MobilePageHeader from '@/components/common/MobilePageHeader.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import SelectField from '@/components/common/SelectField.vue'
import DateField from '@/components/common/DateField.vue'
import CurrencyInput from '@/components/common/CurrencyInput.vue'
import ProductPickerModal from '@/components/common/ProductPickerModal.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import { useToast } from '@/composables/useToast'
import { useAutoNavigationStack } from '@/composables/useAutoNavigationStack'
import { priceMatrixServiceAdapter as priceMatrixService, productsServiceAdapter as productsService } from '@/services'
import { usePriceMatrixStore } from '@/stores/priceMatrix'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const priceMatrixStore = usePriceMatrixStore()
const isEdit = computed(() => !!route.params.id)
const id = computed(() => route.params.id as string | undefined)

const showProductPicker = ref(false)
const loadingEdit = ref(false)
const saving = ref(false)
const products = ref<any[]>([])
const customTierName = ref('')

const form = ref({
  product_id: '',
  product_name: '',
  product_price: 0,
  tier_name: '' as string,
  min_quantity: 1,
  max_quantity: null as number | null,
  tier_price: 0,
  start_date: '',
  end_date: '',
  is_active: true,
})

const tierOptions = [
  { label: 'Eceran', value: 'Eceran' },
  { label: 'Grosir', value: 'Grosir' },
  { label: 'Partai Besar', value: 'Partai Besar' },
  { label: 'Kustom…', value: 'custom' },
]

const formatCurrency = (v: number) => new Intl.NumberFormat('id-ID',{ style:'currency', currency:'IDR', maximumFractionDigits:0 }).format(v||0)

const canSubmit = computed(() => !!form.value.product_id && form.value.min_quantity>0 && form.value.tier_price>=0 && (!form.value.max_quantity || form.value.max_quantity >= form.value.min_quantity))

const onPickProduct = (p: any) => {
  form.value.product_id = p.id
  form.value.product_name = p.name
  form.value.product_price = p.price_sell ?? 0
  showProductPicker.value = false
}

const handleSubmit = async () => {
  if (!canSubmit.value) return
  const tierName = form.value.tier_name === 'custom' ? customTierName.value.trim() : form.value.tier_name
  const payload: any = {
    product_id: form.value.product_id,
    tier_name: tierName || undefined,
    min_quantity: form.value.min_quantity,
    max_quantity: form.value.max_quantity || null,
    tier_price: form.value.tier_price,
    start_date: form.value.start_date || undefined,
    end_date: form.value.end_date || undefined,
    is_active: form.value.is_active,
  }
  saving.value = true
  try {
    if (isEdit.value && id.value) await priceMatrixService.updatePriceTier(id.value, payload)
    else await priceMatrixService.createPriceTier(payload)
    priceMatrixStore.invalidate()
    toast.success('Berhasil', isEdit.value ? 'Harga tier diperbarui' : 'Harga tier ditambahkan')
    router.push('/price-matrix/tiers')
  } catch (e: any) {
    toast.error('Gagal', e.message || 'Gagal menyimpan')
  } finally { saving.value = false }
}

const confirmLeaveOpen = ref(false)
const pendingLeave = ref(false)
useAutoNavigationStack(confirmLeaveOpen, 'tier-form-leave')
const handleBack = () => {
  // kalau form sudah terisi, konfirmasi dulu di mobile — sederhana: cek ada product_id
  if (form.value.product_id || form.value.tier_price) { confirmLeaveOpen.value = true; pendingLeave.value = true }
  else doLeave()
}
const doLeave = () => { confirmLeaveOpen.value=false; pendingLeave.value=false; router.push('/price-matrix/tiers') }

const loadProducts = async () => {
  try {
    const list = await productsService.getAll()
    products.value = (list as any[]).map((p: any) => ({
      id: p.id, name: p.name, sku: p.sku, barcode: p.barcode, price_sell: p.price_sell, price_buy: p.price_buy ?? 0, stock: p.stock ?? 0, category_id: p.category_id, category: p.category,
    }))
  } catch {}
}

const loadEdit = async () => {
  if (!id.value) return
  loadingEdit.value = true
  try {
    const d: any = await priceMatrixService.getPriceTier(id.value)
    const known = ['Eceran','Grosir','Partai Besar']
    const isKnown = d.tier_name && known.includes(d.tier_name)
    form.value = {
      product_id: d.product_id,
      product_name: d.product?.name || '',
      product_price: d.product?.price_sell ?? 0,
      tier_name: isKnown ? d.tier_name : (d.tier_name ? 'custom' : ''),
      min_quantity: d.min_quantity,
      max_quantity: d.max_quantity ?? null,
      tier_price: d.tier_price,
      start_date: d.start_date || '',
      end_date: d.end_date || '',
      is_active: d.is_active,
    }
    if (!isKnown && d.tier_name) customTierName.value = d.tier_name
  } catch (e: any) {
    toast.error('Gagal', e.message || 'Gagal memuat data')
    router.replace('/price-matrix/tiers')
  } finally { loadingEdit.value = false }
}

onMounted(async () => {
  await loadProducts()
  if (isEdit.value) await loadEdit()
})

// kalau product_name kosong tapi product_id ada (mis. edit), coba isi dari products list setelah load
watch(products, () => {
  if (form.value.product_id && !form.value.product_name) {
    const p = products.value.find(x => x.id === form.value.product_id)
    if (p) { form.value.product_name = p.name; form.value.product_price = p.price_sell }
  }
})
</script>
