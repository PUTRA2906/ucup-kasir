<template>
  <AdminLayout>
    <PageBreadcrumb :pageTitle="isEdit ? 'Edit Surat Jalan' : 'Buat Surat Jalan'" class="hidden md:block" />

    <!-- Mobile Header -->
    <MobilePageHeader :title="isEdit ? 'Edit Surat Jalan' : 'Buat Surat Jalan'" :subtitle="isEdit ? 'Nomor: ' + (form.do_number || '-') : 'Form pengiriman baru'" @back="router.back()" />

    <div class="mx-auto max-w-3xl space-y-4">
      <!-- Info Surat Jalan -->
      <div class="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <h3 class="mb-3 text-sm font-bold text-gray-900 dark:text-white">Informasi Surat Jalan</h3>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Nomor Surat Jalan</label>
            <input :value="form.do_number || 'Otomatis saat disimpan'" disabled class="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-xs text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400" />
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Tanggal <span class="text-red-500">*</span></label>
            <input v-model="form.do_date" type="date" class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-xs text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Dari Transaksi</label>
            <select v-model="form.transaction_id" class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white">
              <option value="">Tanpa referensi transaksi</option>
              <option v-for="t in transactionOptions" :key="t.id" :value="t.id">{{ t.label }}</option>
            </select>
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Pelanggan</label>
            <input v-model="form.customer_name" type="text" class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white" placeholder="Nama pelanggan" />
          </div>
          <div class="sm:col-span-2">
            <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Alamat Pengiriman</label>
            <textarea v-model="form.customer_address" rows="2" class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-xs text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white" placeholder="Alamat tujuan"></textarea>
          </div>
        </div>
      </div>

      <!-- Sopir & Kendaraan -->
      <div class="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <h3 class="mb-3 text-sm font-bold text-gray-900 dark:text-white">Sopir &amp; Kendaraan</h3>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Sopir <span class="text-red-500">*</span></label>
            <select v-model="form.driver_id" class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white">
              <option value="">Pilih sopir</option>
              <option v-for="emp in driverOptions" :key="emp.id" :value="emp.id">{{ emp.name }}</option>
            </select>
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Kendaraan <span class="text-red-500">*</span></label>
            <select v-model="form.vehicle_id" class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white">
              <option value="">Pilih kendaraan</option>
              <option v-for="v in vehicleOptions" :key="v.id" :value="v.id">{{ v.plate_number }} — {{ v.vehicle_type }}</option>
            </select>
          </div>
          <div class="sm:col-span-2">
            <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Catatan</label>
            <textarea v-model="form.notes" rows="2" class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-xs text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white" placeholder="Catatan pengiriman"></textarea>
          </div>
        </div>
      </div>

      <!-- Item Pengiriman -->
      <div class="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <div class="mb-3 flex items-center justify-between">
          <h3 class="text-sm font-bold text-gray-900 dark:text-white">Item Pengiriman</h3>
          <button @click="addItem" class="flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1.5 text-[10px] font-semibold text-blue-600 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20">
            <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
            Tambah Item
          </button>
        </div>
        <div v-if="items.length === 0" class="rounded-xl border border-dashed border-gray-300 py-8 text-center dark:border-gray-700">
          <p class="text-xs text-gray-500 dark:text-gray-400">Belum ada item. Tambahkan produk yang dikirim.</p>
        </div>
        <div v-else class="space-y-2">
          <div v-for="(item, i) in items" :key="i" class="rounded-xl border border-gray-200 bg-gray-50 p-2.5 dark:border-gray-700 dark:bg-gray-800">
            <div class="flex items-start gap-2">
              <div class="flex-1">
                <select v-model="item.product_id" @change="onProductSelect(item)" class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white">
                  <option value="">Pilih produk</option>
                  <option v-for="p in products" :key="p.id" :value="p.id">{{ p.name }} (stok: {{ p.stock }})</option>
                </select>
              </div>
              <div class="w-24">
                <input v-model.number="item.quantity" type="number" min="1" class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white" placeholder="Qty" />
              </div>
              <button @click="removeItem(i)" class="mt-1.5 rounded-lg p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10">
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Aksi -->
      <div class="sticky bottom-0 flex gap-2 rounded-2xl border border-gray-200 bg-white/95 p-3 shadow-lg backdrop-blur dark:border-gray-800 dark:bg-gray-900/95">
        <button @click="router.back()" class="flex-1 rounded-xl border border-gray-300 bg-white py-2.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">Batal</button>
        <button @click="handleSave('disiapkan')" :disabled="shipping.loading" class="flex-1 rounded-xl bg-emerald-600 py-2.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50">{{ shipping.loading ? 'Menyimpan...' : 'Simpan & Siapkan' }}</button>
        <button @click="handleSave('draft')" :disabled="shipping.loading" class="flex-1 rounded-xl bg-blue-600 py-2.5 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50">Simpan Draft</button>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import MobilePageHeader from '@/components/common/MobilePageHeader.vue'
import { useShippingStore } from '@/stores/shipping'
import { useHrStore } from '@/stores/hr'
import { useTransactionsStore } from '@/stores/transactions'
import { useProductsStore } from '@/stores/products'

const route = useRoute()
const router = useRouter()
const shipping = useShippingStore()
const hr = useHrStore()
const tx = useTransactionsStore()
const productsStore = useProductsStore()

const isEdit = computed(() => !!route.params.id)
const doId = route.params.id as string | undefined

const form = reactive({
  do_number: '',
  do_date: new Date().toISOString().slice(0, 10),
  transaction_id: '',
  customer_id: '',
  customer_name: '',
  customer_address: '',
  vehicle_id: '',
  driver_id: '',
  notes: '',
})

const items = ref<Array<{ product_id: string; product_name: string; quantity: number }>>([])

const driverOptions = computed(() =>
  (hr.employees || []).filter((e: any) => e.status === 'aktif').map((e: any) => ({ id: e.id, name: e.name }))
)

const vehicleOptions = computed(() =>
  shipping.vehicles.filter((v) => v.status === 'tersedia' || v.id === form.vehicle_id)
)

const transactionOptions = computed(() =>
  (tx.transactions || []).map((t: any) => ({
    id: t.id,
    label: `${t.transaction_number || t.id.slice(0, 8)} — ${t.customer_name || 'Pelanggan'} (${formatMoney(t.total || 0)})`,
  }))
)

const products = computed(() => productsStore.products || [])

const formatMoney = (n: number) => 'Rp ' + new Intl.NumberFormat('id-ID').format(n || 0)

const onProductSelect = (item: any) => {
  const p = products.value.find((x) => x.id === item.product_id)
  item.product_name = p?.name || ''
}

const addItem = () => {
  items.value.push({ product_id: '', product_name: '', quantity: 1 })
}

const removeItem = (i: number) => {
  items.value.splice(i, 1)
}

const handleSave = async (status: 'draft' | 'disiapkan') => {
  if (!form.driver_id) return alert('Pilih sopir terlebih dahulu')
  if (!form.vehicle_id) return alert('Pilih kendaraan terlebih dahulu')
  if (items.value.length === 0) return alert('Tambahkan minimal 1 item')
  const validItems = items.value.filter((i) => i.product_id && i.quantity > 0)
  if (validItems.length === 0) return alert('Item belum lengkap')

  try {
    const payload: any = {
      do_date: form.do_date,
      transaction_id: form.transaction_id || null,
      customer_id: form.customer_id || null,
      customer_name: form.customer_name || null,
      customer_address: form.customer_address || null,
      vehicle_id: form.vehicle_id,
      driver_id: form.driver_id,
      driver_name: driverOptions.value.find((d) => d.id === form.driver_id)?.name || null,
      notes: form.notes || null,
      status,
    }

    if (isEdit.value && doId) {
      await shipping.updateDeliveryOrder(doId, payload)
      await shipping.saveDeliveryItems(doId, validItems as any)
      router.push(`/shipping/deliveries/${doId}`)
    } else {
      const created = await shipping.createDeliveryOrder(payload)
      await shipping.saveDeliveryItems(created.id, validItems as any)
      router.push(`/shipping/deliveries/${created.id}`)
    }
  } catch (e: any) {
    alert(e.message)
  }
}

onMounted(async () => {
  await Promise.all([
    shipping.fetchVehicles(),
    shipping.fetchDeliveryOrders(),
    hr.fetchEmployees(),
    tx.fetchTransactions(),
    productsStore.fetchProducts(),
  ])

  if (isEdit.value && doId) {
    const d = await shipping.getDeliveryOrder(doId)
    if (d) {
      form.do_number = d.do_number || ''
      form.do_date = d.do_date || new Date().toISOString().slice(0, 10)
      form.transaction_id = d.transaction_id || ''
      form.customer_id = d.customer_id || ''
      form.customer_name = d.customer_name || ''
      form.customer_address = d.customer_address || ''
      form.vehicle_id = d.vehicle_id || ''
      form.driver_id = d.driver_id || ''
      form.notes = d.notes || ''
      items.value = (d.items || []).map((it) => ({
        product_id: it.product_id || '',
        product_name: it.product_name,
        quantity: it.quantity,
      }))
    }
  }
})
</script>