<template>
  <AdminLayout>
    <PageBreadcrumb pageTitle="Buat Retur Pembelian" class="hidden md:block" />

    <!-- Mobile Header -->
    <MobilePageHeader title="Buat Retur" subtitle="Retur Pembelian" @back="$router.back()" />

    <div class="mx-auto max-w-3xl space-y-4">
      <!-- Info Retur -->
      <div class="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <h3 class="mb-3 text-sm font-bold text-gray-900 dark:text-white">Info Retur</h3>
        <div class="space-y-3">
          <div>
            <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Dari Faktur (opsional)</label>
            <select v-model="selectedPIId" @change="onPISelect" class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white">
              <option :value="null">Tanpa referensi</option>
              <option v-for="pi in store.purchaseInvoices" :key="pi.id" :value="pi.id">{{ pi.pi_number }} — {{ pi.supplier_name || 'Tanpa supplier' }}</option>
            </select>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Supplier *</label>
              <select v-model="form.supplier_id" :disabled="!!selectedPIId" class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm disabled:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:disabled:bg-gray-900">
                <option :value="null">Pilih supplier...</option>
                <option v-for="s in store.suppliers" :key="s.id" :value="s.id">{{ s.name }}</option>
              </select>
            </div>
            <div>
              <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Tanggal Retur *</label>
              <input v-model="form.return_date" type="date" class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
            </div>
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Alasan *</label>
            <select v-model="form.reason" class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white">
              <option value="cacat">Cacat</option>
              <option value="salah_produk">Salah Produk</option>
              <option value="kadaluarsa">Kadaluarsa</option>
              <option value="rusak_kirim">Rusak Saat Kirim</option>
              <option value="lainnya">Lainnya</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Barang Retur -->
      <div class="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <div class="mb-3 flex items-center justify-between">
          <h3 class="text-sm font-bold text-gray-900 dark:text-white">Barang Retur</h3>
          <button @click="addRow" class="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500">+ Tambah Barang</button>
        </div>
        <div v-if="form.items.length === 0" class="rounded-xl border border-dashed border-gray-300 p-6 text-center text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">Belum ada barang. Pilih dari faktur atau tambah manual.</div>
        <div v-for="(item, idx) in form.items" :key="idx" class="mb-3 rounded-xl border border-gray-200 p-3 dark:border-gray-700">
          <div class="flex items-start justify-between gap-2">
            <div class="flex-1">
              <p class="text-xs font-semibold text-gray-900 dark:text-white">{{ item.product_name }}</p>
            </div>
            <button @click="form.items.splice(idx, 1)" class="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10">
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
          </div>
          <div class="mt-2 grid grid-cols-3 gap-2">
            <div>
              <label class="mb-1 block text-[10px] font-medium text-gray-500 dark:text-gray-400">Qty Retur</label>
              <input v-model.number="item.quantity_received" type="number" min="1" class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
            </div>
            <div>
              <label class="mb-1 block text-[10px] font-medium text-gray-500 dark:text-gray-400">Harga</label>
              <CurrencyInput v-model="item.price" class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"/>
            </div>
            <div class="flex items-end">
              <p class="text-xs font-semibold text-gray-900 dark:text-white">{{ formatRupiah((item.quantity_received || 0) * item.price) }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Catatan -->
      <div class="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Catatan</label>
        <textarea v-model="form.notes" rows="2" placeholder="Catatan (opsional)" class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"></textarea>
        <div class="mt-3 flex justify-between border-t border-gray-200 pt-3 dark:border-gray-700">
          <span class="text-xs text-gray-500 dark:text-gray-400">Total Refund</span>
          <span class="text-base font-bold text-red-600 dark:text-red-400">{{ formatRupiah(totalRefund) }}</span>
        </div>
        <div v-if="formError" class="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-500/30 dark:bg-red-500/10">
          <p class="text-xs text-red-600 dark:text-red-400">{{ formError }}</p>
        </div>
        <div class="mt-4 flex gap-2">
          <button @click="$router.back()" class="flex-1 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">Batal</button>
          <button @click="handleSave" :disabled="saving" class="flex-1 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50">{{ saving ? 'Menyimpan...' : 'Simpan Retur' }}</button>
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
import type { PurchaseReturnInput } from '@/types/database'

const route = useRoute()
const router = useRouter()
const store = usePurchasingStore()

const saving = ref(false)
const formError = ref<string | null>(null)
const selectedPIId = ref<string | null>(null)
const today = new Date().toISOString().split('T')[0]

const form = ref({
  supplier_id: null as string | null,
  return_date: today,
  reason: 'cacat',
  notes: '',
  items: [] as any[],
})

const totalRefund = computed(() => form.value.items.reduce((sum, it) => sum + (it.quantity_received || 0) * it.price, 0))
const formatRupiah = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n || 0)

const addRow = () => { form.value.items.push({ product_id: null as any, product_name: '', quantity_received: 1, price: 0 }) }

const onPISelect = async () => {
  form.value.items = []
  form.value.supplier_id = null
  if (!selectedPIId.value) return
  const pi = await store.getPurchaseInvoice(selectedPIId.value)
  if (!pi) return
  form.value.supplier_id = pi.supplier_id || null
  form.value.items = (pi.items || []).map((it) => ({
    product_id: it.product_id,
    product_name: it.product_name,
    quantity_received: 1,
    price: it.price,
  }))
}

const handleSave = async () => {
  formError.value = null
  const validItems = form.value.items.filter((it) => it.product_name && it.quantity_received > 0)
  if (validItems.length === 0) { formError.value = 'Minimal 1 barang dengan qty > 0'; return }
  const selectedSupplier = store.suppliers.find((s) => s.id === form.value.supplier_id)
  const input: PurchaseReturnInput = {
    pi_id: selectedPIId.value || undefined,
    supplier_id: form.value.supplier_id || undefined,
    supplier_name: selectedSupplier?.name,
    return_date: form.value.return_date,
    reason: form.value.reason as PurchaseReturnInput['reason'],
    notes: form.value.notes || undefined,
    items: validItems.map((it) => ({ product_id: it.product_id, product_name: it.product_name, quantity_received: it.quantity_received, price: it.price })),
  }
  saving.value = true
  try {
    const created = await store.createPurchaseReturn(input)
    router.push(`/purchasing/returns/${created.id}`)
  } catch (e: any) { formError.value = e.message } finally { saving.value = false }
}

onMounted(async () => {
  if (store.suppliers.length === 0) await store.fetchSuppliers()
  if (store.purchaseInvoices.length === 0) await store.fetchPurchaseInvoices()
  const piId = route.query.pi_id as string
  const grnId = route.query.grn_id as string
  if (piId) { selectedPIId.value = piId; await onPISelect() }
  // Jika datang dari GRN (bukan PI), cari PI yang terkait GRN tsb
  else if (grnId) {
    const linkedPI = store.purchaseInvoices.find((p) => p.grn_id === grnId)
    if (linkedPI) { selectedPIId.value = linkedPI.id; await onPISelect() }
  }
})
</script>