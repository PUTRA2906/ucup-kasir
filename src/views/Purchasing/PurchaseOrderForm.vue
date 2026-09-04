<template>
  <AdminLayout>
    <PageBreadcrumb pageTitle="Buat Purchase Order" class="hidden md:block" />

    <!-- Mobile Header -->
    <MobilePageHeader title="Buat PO" subtitle="Pesanan Pembelian" @back="$router.back()" />

    <div class="mx-auto max-w-3xl space-y-4">
      <!-- Info Supplier -->
      <div class="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <h3 class="mb-3 text-sm font-bold text-gray-900 dark:text-white">Info Supplier</h3>
        <div class="space-y-3">
          <div>
            <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Supplier</label>
            <select
              v-model="form.supplier_id"
              class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              <option :value="null">Pilih supplier...</option>
              <option v-for="s in suppliers" :key="s.id" :value="s.id">{{ s.name }}</option>
            </select>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Tanggal PO *</label>
              <input v-model="form.po_date" type="date" class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
            </div>
            <div>
              <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Estimasi Tiba</label>
              <input v-model="form.expected_date" type="date" class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
            </div>
          </div>
        </div>
      </div>

      <!-- Daftar Item -->
      <div class="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <div class="mb-3 flex items-center justify-between">
          <h3 class="text-sm font-bold text-gray-900 dark:text-white">Daftar Barang</h3>
          <button
            @click="addRow"
            class="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500"
          >
            + Tambah Barang
          </button>
        </div>

        <div v-if="form.items.length === 0" class="rounded-xl border border-dashed border-gray-300 p-6 text-center text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">
          Belum ada barang. Klik "Tambah Barang" untuk memulai.
        </div>

        <div v-for="(item, idx) in form.items" :key="idx" class="mb-3 rounded-xl border border-gray-200 p-3 dark:border-gray-700">
          <div class="flex items-start justify-between gap-2">
            <div class="flex-1">
              <select
                v-model="item.product_id"
                @change="onProductSelect(idx)"
                class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              >
                <option :value="null">Pilih produk...</option>
                <option v-for="p in products" :key="p.id" :value="p.id">
                  {{ p.name }} — stok: {{ p.stock }}
                </option>
              </select>
              <p v-if="item.product_name && !item.product_id" class="mt-1 text-[10px] text-gray-400 dark:text-gray-500">
                {{ item.product_name }}
              </p>
            </div>
            <button
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
              <label class="mb-1 block text-[10px] font-medium text-gray-500 dark:text-gray-400">Qty</label>
              <input v-model.number="item.quantity" type="number" min="1" class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
            </div>
            <div>
              <label class="mb-1 block text-[10px] font-medium text-gray-500 dark:text-gray-400">Harga</label>
              <input v-model.number="item.price" type="number" min="0" class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
            </div>
            <div>
              <label class="mb-1 block text-[10px] font-medium text-gray-500 dark:text-gray-400">Disc</label>
              <input v-model.number="item.discount" type="number" min="0" class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
            </div>
          </div>
          <p class="mt-2 text-right text-xs font-semibold text-gray-900 dark:text-white">
            Subtotal: {{ formatRupiah(itemSubtotal(item)) }}
          </p>
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
          <div class="flex justify-between text-gray-600 dark:text-gray-400">
            <span>Subtotal</span>
            <span>{{ formatRupiah(subtotal) }}</span>
          </div>
          <div class="flex justify-between text-gray-600 dark:text-gray-400">
            <span>Diskon</span>
            <span>-{{ formatRupiah(form.discount || 0) }}</span>
          </div>
          <div class="flex justify-between text-gray-600 dark:text-gray-400">
            <span>Pajak</span>
            <span>+{{ formatRupiah(form.tax || 0) }}</span>
          </div>
          <div class="flex justify-between text-gray-600 dark:text-gray-400">
            <span>Ongkir</span>
            <span>+{{ formatRupiah(form.shipping_cost || 0) }}</span>
          </div>
          <div class="flex justify-between text-base font-bold text-gray-900 dark:text-white">
            <span>Total</span>
            <span>{{ formatRupiah(total) }}</span>
          </div>
        </div>
        <div class="mt-4">
          <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Catatan</label>
          <textarea v-model="form.notes" rows="2" placeholder="Catatan (opsional)" class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"></textarea>
        </div>

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
            {{ saving ? 'Menyimpan...' : 'Simpan PO' }}
          </button>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import MobilePageHeader from '@/components/common/MobilePageHeader.vue'
import { usePurchasingStore } from '@/stores/purchasing'
import { useProductsStore } from '@/stores/products'
import type { POItemInput, PurchaseOrderInput } from '@/types/database'

const router = useRouter()
const store = usePurchasingStore()
const productsStore = useProductsStore()

const saving = ref(false)
const formError = ref<string | null>(null)

const today = new Date().toISOString().split('T')[0]

const form = ref({
  supplier_id: null as string | null,
  po_date: today,
  expected_date: '',
  discount: 0,
  tax: 0,
  shipping_cost: 0,
  notes: '',
  items: [] as POItemInput[],
})

const suppliers = computed(() => store.suppliers)
const products = computed(() => productsStore.products)

const addRow = () => {
  form.value.items.push({ product_id: null as any, product_name: '', quantity: 1, price: 0, discount: 0 })
}

const removeRow = (idx: number) => {
  form.value.items.splice(idx, 1)
}

const onProductSelect = (idx: number) => {
  const item = form.value.items[idx]
  const product = products.value.find((p) => p.id === item.product_id)
  if (product) {
    item.product_name = product.name
    if (!item.price || item.price === 0) item.price = product.price_buy
  }
}

const itemSubtotal = (item: POItemInput) => {
  return (item.quantity * item.price) - (item.discount || 0)
}

const subtotal = computed(() => form.value.items.reduce((sum, it) => sum + itemSubtotal(it), 0))
const total = computed(() => subtotal.value - (form.value.discount || 0) + (form.value.tax || 0) + (form.value.shipping_cost || 0))

const formatRupiah = (n: number) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n || 0)
}

const handleSave = async () => {
  formError.value = null
  if (!form.value.po_date) {
    formError.value = 'Tanggal PO wajib diisi'
    return
  }
  const validItems = form.value.items.filter((it) => it.product_name && it.quantity > 0)
  if (validItems.length === 0) {
    formError.value = 'Minimal 1 barang wajib diisi'
    return
  }

  const selectedSupplier = suppliers.value.find((s) => s.id === form.value.supplier_id)

  const input: PurchaseOrderInput = {
    supplier_id: form.value.supplier_id || undefined,
    supplier_name: selectedSupplier?.name,
    po_date: form.value.po_date,
    expected_date: form.value.expected_date || undefined,
    discount: form.value.discount,
    tax: form.value.tax,
    shipping_cost: form.value.shipping_cost,
    notes: form.value.notes || undefined,
    items: validItems.map((it) => ({
      product_id: it.product_id,
      product_name: it.product_name,
      quantity: it.quantity,
      price: it.price,
      discount: it.discount,
    })),
  }

  saving.value = true
  try {
    const created = await store.createPurchaseOrder(input)
    router.push(`/purchasing/pos/${created.id}`)
  } catch (e: any) {
    formError.value = e.message
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  if (store.suppliers.length === 0) await store.fetchSuppliers()
  if (productsStore.products.length === 0) await productsStore.fetchProducts()
})
</script>