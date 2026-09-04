<template>
  <AdminLayout>
    <PageBreadcrumb pageTitle="Buat Faktur Pembelian" class="hidden md:block" />

    <!-- Mobile Header -->
    <MobilePageHeader title="Buat Faktur" subtitle="Purchase Invoice" @back="$router.back()" />

    <div class="mx-auto max-w-3xl space-y-4">
      <!-- Pilih GRN -->
      <div class="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <h3 class="mb-3 text-sm font-bold text-gray-900 dark:text-white">Dari GRN</h3>
        <div class="space-y-3">
          <div>
            <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Goods Receipt (opsional)</label>
            <select v-model="selectedGRNId" @change="onGRNSelect" class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white">
              <option :value="null">Faktur baru (tanpa referensi)</option>
              <option v-for="g in completedGRNs" :key="g.id" :value="g.id">{{ g.grn_number }} — {{ g.supplier_name || 'Tanpa supplier' }}</option>
            </select>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Supplier *</label>
              <select v-model="form.supplier_id" :disabled="!!selectedGRNId" class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm disabled:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:disabled:bg-gray-900">
                <option :value="null">Pilih supplier...</option>
                <option v-for="s in store.suppliers" :key="s.id" :value="s.id">{{ s.name }}</option>
              </select>
            </div>
            <div>
              <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Tanggal Faktur *</label>
              <input v-model="form.invoice_date" type="date" class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
            </div>
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Jatuh Tempo</label>
            <input v-model="form.due_date" type="date" class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
          </div>
        </div>
      </div>

      <!-- Items -->
      <div class="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <h3 class="mb-3 text-sm font-bold text-gray-900 dark:text-white">Barang</h3>
        <div v-if="form.items.length === 0" class="rounded-xl border border-dashed border-gray-300 p-6 text-center text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">Pilih GRN atau tambah barang manual.</div>
        <div v-for="(item, idx) in form.items" :key="idx" class="mb-3 rounded-xl border border-gray-200 p-3 dark:border-gray-700">
          <div class="flex items-start justify-between gap-2">
            <div class="flex-1">
              <p class="text-xs font-semibold text-gray-900 dark:text-white">{{ item.product_name }}</p>
            </div>
            <button v-if="!selectedGRNId" @click="form.items.splice(idx, 1)" class="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10">
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
          </div>
          <div class="mt-2 grid grid-cols-3 gap-2">
            <div>
              <label class="mb-1 block text-[10px] font-medium text-gray-500 dark:text-gray-400">Qty</label>
              <input v-model.number="item.quantity_received" type="number" min="0" :disabled="!!selectedGRNId" class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
            </div>
            <div>
              <label class="mb-1 block text-[10px] font-medium text-gray-500 dark:text-gray-400">Harga</label>
              <input v-model.number="item.price" type="number" min="0" class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
            </div>
            <div class="flex items-end">
              <p class="text-xs font-semibold text-gray-900 dark:text-white">{{ formatRupiah((item.quantity_received || 0) * item.price) }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Ringkasan -->
      <div class="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <div class="grid grid-cols-3 gap-3">
          <div>
            <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Diskon (Rp)</label>
            <input v-model.number="form.discount" type="number" min="0" class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Pajak (Rp)</label>
            <input v-model.number="form.tax" type="number" min="0" class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Ongkir (Rp)</label>
            <input v-model.number="form.shipping_cost" type="number" min="0" class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
          </div>
        </div>

        <div class="mt-4 space-y-1 border-t border-gray-200 pt-3 text-sm dark:border-gray-700">
          <div class="flex justify-between text-gray-600 dark:text-gray-400"><span>Subtotal</span><span>{{ formatRupiah(subtotal) }}</span></div>
          <div class="flex justify-between text-gray-600 dark:text-gray-400"><span>Diskon</span><span>-{{ formatRupiah(form.discount || 0) }}</span></div>
          <div class="flex justify-between text-gray-600 dark:text-gray-400"><span>Pajak</span><span>+{{ formatRupiah(form.tax || 0) }}</span></div>
          <div class="flex justify-between text-gray-600 dark:text-gray-400"><span>Ongkir</span><span>+{{ formatRupiah(form.shipping_cost || 0) }}</span></div>
          <div class="flex justify-between text-base font-bold text-gray-900 dark:text-white"><span>Total</span><span>{{ formatRupiah(total) }}</span></div>
        </div>

        <div class="mt-3">
          <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Catatan</label>
          <textarea v-model="form.notes" rows="2" placeholder="Catatan (opsional)" class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"></textarea>
        </div>

        <div v-if="formError" class="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-500/30 dark:bg-red-500/10">
          <p class="text-xs text-red-600 dark:text-red-400">{{ formError }}</p>
        </div>

        <div class="mt-4 flex gap-2">
          <button @click="$router.back()" class="flex-1 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">Batal</button>
          <button @click="handleSave" :disabled="saving" class="flex-1 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50">{{ saving ? 'Menyimpan...' : 'Simpan Faktur' }}</button>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import MobilePageHeader from '@/components/common/MobilePageHeader.vue'
import { usePurchasingStore } from '@/stores/purchasing'
import type { PurchaseInvoiceInput } from '@/types/database'

const route = useRoute()
const router = useRouter()
const store = usePurchasingStore()

const saving = ref(false)
const formError = ref<string | null>(null)
const selectedGRNId = ref<string | null>(null)
const today = new Date().toISOString().split('T')[0]

const form = ref({
  supplier_id: null as string | null,
  invoice_date: today,
  due_date: '',
  discount: 0,
  tax: 0,
  shipping_cost: 0,
  notes: '',
  items: [] as any[],
})

const completedGRNs = computed(() => store.goodsReceipts.filter((g) => g.status === 'completed'))
const subtotal = computed(() => form.value.items.reduce((sum, it) => sum + (it.quantity_received || 0) * it.price, 0))
const total = computed(() => subtotal.value - (form.value.discount || 0) + (form.value.tax || 0) + (form.value.shipping_cost || 0))

const formatRupiah = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n || 0)

const onGRNSelect = async () => {
  form.value.items = []
  form.value.supplier_id = null
  if (!selectedGRNId.value) return
  const grn = await store.getGoodsReceipt(selectedGRNId.value)
  if (!grn) return
  form.value.supplier_id = grn.supplier_id || null
  form.value.items = (grn.items || []).map((it) => ({
    po_item_id: it.id,
    product_id: it.product_id,
    product_name: it.product_name,
    quantity_received: it.quantity_received,
    price: it.price,
  }))
}

const handleSave = async () => {
  formError.value = null
  if (form.value.items.length === 0) { formError.value = 'Minimal 1 barang'; return }
  const selectedSupplier = store.suppliers.find((s) => s.id === form.value.supplier_id)
  const input: PurchaseInvoiceInput = {
    grn_id: selectedGRNId.value || undefined,
    supplier_id: form.value.supplier_id || undefined,
    supplier_name: selectedSupplier?.name,
    invoice_date: form.value.invoice_date,
    due_date: form.value.due_date || undefined,
    discount: form.value.discount,
    tax: form.value.tax,
    shipping_cost: form.value.shipping_cost,
    notes: form.value.notes || undefined,
    items: form.value.items.map((it) => ({ po_item_id: it.po_item_id, product_id: it.product_id, product_name: it.product_name, quantity_received: it.quantity_received, price: it.price })),
  }
  saving.value = true
  try {
    const created = await store.createPurchaseInvoice(input)
    router.push(`/purchasing/pis/${created.id}`)
  } catch (e: any) { formError.value = e.message } finally { saving.value = false }
}

onMounted(async () => {
  if (store.suppliers.length === 0) await store.fetchSuppliers()
  if (store.goodsReceipts.length === 0) await store.fetchGoodsReceipts()
  const grnId = route.query.grn_id as string
  if (grnId) { selectedGRNId.value = grnId; await onGRNSelect() }
})
</script>