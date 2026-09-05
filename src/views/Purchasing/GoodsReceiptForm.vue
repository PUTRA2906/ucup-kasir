<template>
  <AdminLayout>
    <PageBreadcrumb pageTitle="Goods Receipt" class="hidden md:block" />

    <!-- Mobile Header -->
    <MobilePageHeader title="Terima Barang" subtitle="Penerimaan Barang (GRN)" @back="$router.back()" />

    <div class="mx-auto max-w-3xl space-y-4">
      <!-- Pilih PO -->
      <div class="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <h3 class="mb-3 text-sm font-bold text-gray-900 dark:text-white">Dari PO</h3>
        <div class="space-y-3">
          <div>
            <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Purchase Order (opsional)</label>
            <select
              v-model="selectedPOId"
              @change="onPOSelect"
              class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              <option :value="null">PO Baru (tanpa referensi)</option>
              <option v-for="po in openPOs" :key="po.id" :value="po.id">{{ po.po_number }} — {{ po.supplier_name }}</option>
            </select>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Supplier *</label>
              <select
                v-model="form.supplier_id"
                :disabled="!!selectedPOId"
                class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm disabled:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:disabled:bg-gray-900"
              >
                <option :value="null">Pilih supplier...</option>
                <option v-for="s in store.suppliers" :key="s.id" :value="s.id">{{ s.name }}</option>
              </select>
            </div>
            <div>
              <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Tanggal Terima *</label>
              <input v-model="form.receipt_date" type="date" class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
            </div>
          </div>
        </div>
      </div>

      <!-- Daftar Barang -->
      <div class="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <div class="mb-3 flex items-center justify-between">
          <h3 class="text-sm font-bold text-gray-900 dark:text-white">Barang Diterima</h3>
          <button
            v-if="!selectedPOId"
            @click="addRow"
            class="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500"
          >
            + Tambah Barang
          </button>
        </div>

        <div v-if="form.items.length === 0" class="rounded-xl border border-dashed border-gray-300 p-6 text-center text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">
          Pilih PO atau tambah barang manual.
        </div>

        <div v-for="(item, idx) in form.items" :key="idx" class="mb-3 rounded-xl border border-gray-200 p-3 dark:border-gray-700">
          <div class="flex items-start justify-between gap-2">
            <div class="flex-1">
              <p class="text-xs font-semibold text-gray-900 dark:text-white">{{ item.product_name }}</p>
              <p v-if="item.product_id" class="text-[10px] text-gray-400 dark:text-gray-500">ID: {{ item.product_id }}</p>
            </div>
            <button
              v-if="!selectedPOId"
              @click="removeRow(idx)"
              class="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
          <div class="mt-2 grid grid-cols-3 gap-2">
            <div>
              <label class="mb-1 block text-[10px] font-medium text-gray-500 dark:text-gray-400">Diterima</label>
              <input v-model.number="item.quantity_received" type="number" min="0" class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
            </div>
            <div>
              <label class="mb-1 block text-[10px] font-medium text-gray-500 dark:text-gray-400">Rusak</label>
              <input v-model.number="item.quantity_rejected" type="number" min="0" class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
            </div>
            <div>
              <label class="mb-1 block text-[10px] font-medium text-gray-500 dark:text-gray-400">Harga</label>
              <CurrencyInput v-model="item.price" class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"/>
            </div>
          </div>
        </div>
      </div>

      <!-- Catatan -->
      <div class="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Catatan</label>
        <textarea v-model="form.notes" rows="2" placeholder="Catatan (opsional)" class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"></textarea>

        <div v-if="formError" class="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-500/30 dark:bg-red-500/10">
          <p class="text-xs text-red-600 dark:text-red-400">{{ formError }}</p>
        </div>

        <div class="mt-4 flex gap-2">
          <button
            @click="$router.back()"
            class="flex-1 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Batal
          </button>
          <button
            @click="handleSave"
            :disabled="saving"
            class="flex-1 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {{ saving ? 'Menyimpan...' : 'Simpan GRN' }}
          </button>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import CurrencyInput from '@/components/common/CurrencyInput.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import MobilePageHeader from '@/components/common/MobilePageHeader.vue'
import { usePurchasingStore } from '@/stores/purchasing'
import type { GRNItemInput, GoodsReceiptInput } from '@/types/database'

const route = useRoute()
const router = useRouter()
const store = usePurchasingStore()

const saving = ref(false)
const formError = ref<string | null>(null)
const selectedPOId = ref<string | null>(null)

const today = new Date().toISOString().split('T')[0]

const form = ref({
  supplier_id: null as string | null,
  receipt_date: today,
  notes: '',
  items: [] as GRNItemInput[],
})

const openPOs = computed(() =>
  store.purchaseOrders.filter((p) => ['draft', 'submitted', 'confirmed', 'partial'].includes(p.status))
)

const addRow = () => {
  form.value.items.push({ product_id: null as any, product_name: '', quantity_received: 1, quantity_rejected: 0, price: 0 })
}

const removeRow = (idx: number) => {
  form.value.items.splice(idx, 1)
}

const onPOSelect = async () => {
  form.value.items = []
  form.value.supplier_id = null
  if (!selectedPOId.value) return

  const po = await store.getPurchaseOrder(selectedPOId.value)
  if (!po) return

  form.value.supplier_id = po.supplier_id || null
  form.value.items = (po.items || []).map((it) => ({
    po_item_id: it.id,
    product_id: it.product_id!,
    product_name: it.product_name,
    quantity_received: Number(it.quantity) - Number(it.received_quantity || 0),
    quantity_rejected: 0,
    price: it.price,
  }))
}

const handleSave = async () => {
  formError.value = null
  if (form.value.items.length === 0) {
    formError.value = 'Minimal 1 barang wajib diisi'
    return
  }

  const validItems = form.value.items.filter((it) => it.quantity_received > 0 || (it.quantity_rejected || 0) > 0)
  if (validItems.length === 0) {
    formError.value = 'Minimal 1 barang dengan quantity > 0'
    return
  }

  const selectedSupplier = store.suppliers.find((s) => s.id === form.value.supplier_id)

  const input: GoodsReceiptInput = {
    po_id: selectedPOId.value || undefined,
    supplier_id: form.value.supplier_id || undefined,
    supplier_name: selectedSupplier?.name,
    receipt_date: form.value.receipt_date,
    notes: form.value.notes || undefined,
    items: validItems.map((it) => ({
      po_item_id: it.po_item_id,
      product_id: it.product_id,
      product_name: it.product_name,
      quantity_received: it.quantity_received || 0,
      quantity_rejected: it.quantity_rejected || 0,
      price: it.price,
    })),
  }

  saving.value = true
  try {
    await store.createGoodsReceipt(input)
    router.push('/purchasing/grns')
  } catch (e: any) {
    formError.value = e.message
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  if (store.suppliers.length === 0) await store.fetchSuppliers()
  if (store.purchaseOrders.length === 0) await store.fetchPurchaseOrders()

  // Auto-select PO dari query param
  const poId = route.query.po_id as string
  if (poId) {
    selectedPOId.value = poId
    await onPOSelect()
  }
})
</script>