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
            <button
              type="button"
              @click="showDatePicker = true"
              class="flex w-full items-center justify-between rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-xs text-gray-900 focus:border-blue-500 focus:outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              <span class="flex items-center gap-2">
                <svg class="h-4 w-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {{ formatDateLong(form.do_date) }}
              </span>
              <svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Referensi Transaksi (banyak) -->
      <div class="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <div class="mb-1 flex items-center justify-between">
          <h3 class="text-sm font-bold text-gray-900 dark:text-white">Transaksi Dirujuk</h3>
          <button @click="showTransactionDialog = true" class="flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1.5 text-[10px] font-semibold text-blue-600 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20">
            <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            Pilih Transaksi
          </button>
        </div>
        <p class="mb-3 text-[11px] text-gray-500 dark:text-gray-400">Satu surat jalan bisa merujuk beberapa transaksi penjualan sekaligus.</p>
        <div v-if="selectedTransactionIds.length === 0" class="rounded-xl border border-dashed border-gray-300 py-6 text-center dark:border-gray-700">
          <p class="text-xs text-gray-500 dark:text-gray-400">Belum ada transaksi dipilih.</p>
        </div>
        <div v-else class="space-y-1.5">
          <div v-for="txId in selectedTransactionIds" :key="txId" class="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-800">
            <span class="text-xs text-gray-700 dark:text-gray-200">{{ getTransactionLabel(txId) }}</span>
            <button @click="removeTransaction(txId)" class="rounded p-0.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10">
              <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Info Pelanggan dari Transaksi -->
      <div v-if="selectedCustomerInfo" class="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <h3 class="mb-3 text-sm font-bold text-gray-900 dark:text-white">Informasi Pelanggan</h3>
        <div class="space-y-2">
          <div>
            <p class="text-[10px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">Nama</p>
            <p class="text-xs font-medium text-gray-900 dark:text-white">{{ selectedCustomerInfo.name }}</p>
          </div>
          <div v-if="selectedCustomerInfo.store_name">
            <p class="text-[10px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">Nama Toko</p>
            <p class="text-xs font-medium text-gray-900 dark:text-white">{{ selectedCustomerInfo.store_name }}</p>
          </div>
          <div v-if="selectedCustomerInfo.address">
            <p class="text-[10px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">Alamat Pengiriman</p>
            <p class="text-xs font-medium text-gray-900 dark:text-white">{{ selectedCustomerInfo.address }}</p>
          </div>
          <div v-if="selectedCustomerInfo.phone">
            <p class="text-[10px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">Telepon</p>
            <p class="text-xs font-medium text-gray-900 dark:text-white">{{ selectedCustomerInfo.phone }}</p>
          </div>
        </div>
      </div>

      <!-- Sopir & Kendaraan -->
      <div class="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <h3 class="mb-3 text-sm font-bold text-gray-900 dark:text-white">Sopir &amp; Kendaraan</h3>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Sopir <span class="text-red-500">*</span></label>
            <SelectField
              v-model="form.driver_id"
              :options="driverOptions.map((emp) => ({ label: emp.name, value: emp.id }))"
              title="Pilih Sopir"
              placeholder="Pilih sopir"
              searchable
              search-placeholder="Cari sopir..."
              button-class="flex w-full items-center justify-between rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Kendaraan <span class="text-red-500">*</span></label>
            <SelectField
              v-model="form.vehicle_id"
              :options="vehicleOptions.map((v) => ({ label: `${v.plate_number} — ${v.vehicle_type}`, value: v.id }))"
              title="Pilih Kendaraan"
              placeholder="Pilih kendaraan"
              searchable
              search-placeholder="Cari kendaraan..."
              button-class="flex w-full items-center justify-between rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Gaji Sopir</label>
            <input
              :value="formatInputNumber(form.driver_fee)"
              @input="(e) => updateDriverFee(e)"
              type="text"
              inputmode="numeric"
              class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-xs text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              placeholder="0"
            />
          </div>
          <div class="sm:col-span-2">
            <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Catatan</label>
            <textarea v-model="form.notes" rows="2" class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-xs text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white" placeholder="Catatan pengiriman"></textarea>
          </div>
        </div>
      </div>

      <!-- Item Pengiriman (sumber data muatan + upah loader) -->
      <div class="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <div class="mb-1 flex items-center justify-between">
          <h3 class="text-sm font-bold text-gray-900 dark:text-white">Item Pengiriman</h3>
          <button @click="showProductDialog = true" class="flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1.5 text-[10px] font-semibold text-blue-600 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20">
            <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            Cari Produk
          </button>
        </div>
        <p class="mb-3 text-[11px] text-gray-500 dark:text-gray-400">Pilih produk yang dimuat beserta jumlah dan upah per karungnya — dasar perhitungan upah tim muat.</p>
        <div v-if="loadItems.length === 0" class="rounded-xl border border-dashed border-gray-300 py-8 text-center dark:border-gray-700">
          <p class="text-xs text-gray-500 dark:text-gray-400">Belum ada item. Cari dan tambahkan produk.</p>
        </div>
        <div v-else class="space-y-2">
          <div v-for="(li, i) in loadItems" :key="i" class="rounded-xl border border-gray-200 bg-gray-50 p-2.5 dark:border-gray-700 dark:bg-gray-800">
            <div class="mb-2">
              <div class="text-xs font-semibold text-gray-900 dark:text-white">{{ li.product_name }}</div>
            </div>
            <div class="flex items-start gap-2">
              <div class="flex-1">
                <label class="mb-1 block text-[10px] font-medium text-gray-600 dark:text-gray-400">Jumlah</label>
                <input v-model.number="li.quantity" type="number" min="0" class="w-full rounded-xl border border-gray-300 bg-white px-2 py-2 text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white" placeholder="Qty" />
              </div>
              <div class="flex-1">
                <label class="mb-1 block text-[10px] font-medium text-gray-600 dark:text-gray-400">Upah/karung</label>
                <input
                  :value="formatInputNumber(li.unit_price)"
                  @input="(e) => updateUnitPrice(li, e)"
                  type="text"
                  inputmode="numeric"
                  class="w-full rounded-xl border border-gray-300 bg-white px-2 py-2 text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  placeholder="0"
                />
              </div>
              <div class="pt-5">
                <button @click="removeLoadItem(i)" class="rounded-lg p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10">
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Tim Muat -->
      <div class="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <h3 class="mb-1 text-sm font-bold text-gray-900 dark:text-white">Tim Muat</h3>
        <p class="mb-3 text-[11px] text-gray-500 dark:text-gray-400">Karyawan yang ikut memuat. Upah dibagi rata ke seluruh anggota tim.</p>
        <div class="mb-3 flex gap-2">
          <SelectField
            v-model="loaderToAdd"
            :options="availableLoaderOptions.map((emp) => ({ label: emp.name, value: emp.id }))"
            title="Pilih Karyawan"
            placeholder="Pilih karyawan"
            searchable
            search-placeholder="Cari karyawan..."
            button-class="flex flex-1 items-center justify-between rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
          <button @click="addLoader" :disabled="!loaderToAdd" class="rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50">Tambah</button>
        </div>
        <div v-if="loaders.length === 0" class="rounded-xl border border-dashed border-gray-300 py-6 text-center dark:border-gray-700">
          <p class="text-xs text-gray-500 dark:text-gray-400">Belum ada tim muat.</p>
        </div>
        <div v-else class="flex flex-wrap gap-2">
          <span v-for="(l, i) in loaders" :key="l.employee_id" class="inline-flex items-center gap-1.5 rounded-full bg-blue-50 py-1 pl-3 pr-1.5 text-xs font-medium text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
            {{ l.employee_name }}
            <button @click="removeLoader(i)" class="flex h-4 w-4 items-center justify-center rounded-full hover:bg-blue-200 dark:hover:bg-blue-500/30">
              <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </span>
        </div>
      </div>

      <!-- Aksi -->
      <div class="sticky bottom-0 flex gap-2 rounded-2xl border border-gray-200 bg-white/95 p-3 shadow-lg backdrop-blur dark:border-gray-800 dark:bg-gray-900/95">
        <button @click="router.back()" class="flex-1 rounded-xl border border-gray-300 bg-white py-2.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">Batal</button>
        <button @click="handleSave('disiapkan')" :disabled="shipping.loading" class="flex-1 rounded-xl bg-emerald-600 py-2.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50">{{ shipping.loading ? 'Menyimpan...' : 'Simpan & Siapkan' }}</button>
        <button @click="handleSave('draft')" :disabled="shipping.loading" class="flex-1 rounded-xl bg-blue-600 py-2.5 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50">Simpan Draft</button>
      </div>
    </div>

    <!-- Dialogs -->
    <TransactionSearchDialog
      v-model="showTransactionDialog"
      :transactions="tx.transactions || []"
      :initial-selected="selectedTransactionIds"
      :delivery-orders="shipping.deliveryOrders"
      :exclude-current-do="isEdit"
      :current-do-id="doId"
      @confirm="onTransactionsConfirm"
    />
    <ProductSearchDialog
      v-model="showProductDialog"
      :products="products"
      @select="onProductSelect"
    />
    <DatePickerModal
      v-model="showDatePicker"
      :value="form.do_date"
      title="Tanggal Pengiriman"
      @update:value="(v: string) => (form.do_date = v.slice(0, 10))"
    />
  </AdminLayout>
</template>

<script setup lang="ts">
import { useToast } from '@/composables/useToast'
import { useAutoNavigationStack } from '@/composables/useAutoNavigationStack'
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import MobilePageHeader from '@/components/common/MobilePageHeader.vue'
import TransactionSearchDialog from '@/components/shipping/TransactionSearchDialog.vue'
import ProductSearchDialog from '@/components/shipping/ProductSearchDialog.vue'
import DatePickerModal from '@/components/common/DatePickerModal.vue'
import SelectField from '@/components/common/SelectField.vue'
import { useShippingStore } from '@/stores/shipping'
import { useHrStore } from '@/stores/hr'
import { useTransactionsStore } from '@/stores/transactions'
import { useProductsStore } from '@/stores/products'
import { useCustomersStore } from '@/stores/customers'
import { useStoreSettingsStore } from '@/stores/storeSettings'
import type { Product, Customer } from '@/types/database'

const toast = useToast()
const route = useRoute()
const router = useRouter()
const shipping = useShippingStore()
const hr = useHrStore()
const tx = useTransactionsStore()
const productsStore = useProductsStore()
const customersStore = useCustomersStore()
const settingsStore = useStoreSettingsStore()

const isEdit = computed(() => !!route.params.id)
const doId = route.params.id as string | undefined

// Format tanggal panjang: "Senin, 7 September 2026" (untuk tampilan input tanggal)
const formatDateLong = (d: string) => {
  if (!d) return '-'
  const date = new Date(d + 'T00:00:00')
  if (isNaN(date.getTime())) return d
  return date.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

const form = reactive({
  do_number: '',
  do_date: new Date().toISOString().slice(0, 10),
  vehicle_id: '',
  driver_id: '',
  driver_fee: 0,
  notes: '',
})

const showDatePicker = ref(false)
const selectedTransactionIds = ref<string[]>([])
const loadItems = ref<Array<{ product_id: string; product_name: string; quantity: number; unit_price: number }>>([])
const loaders = ref<Array<{ employee_id: string; employee_name: string }>>([])
const loaderToAdd = ref('')
const showTransactionDialog = ref(false)
const showProductDialog = ref(false)

// Auto register/unregister layer di navigation stack
useAutoNavigationStack(showDatePicker, 'delivery-date-picker-modal')
useAutoNavigationStack(showTransactionDialog, 'delivery-transaction-dialog')
useAutoNavigationStack(showProductDialog, 'delivery-product-dialog')

const driverOptions = computed(() =>
  (hr.employees || []).filter((e: any) => e.status === 'aktif').map((e: any) => ({ id: e.id, name: e.name }))
)

const vehicleOptions = computed(() =>
  shipping.vehicles.filter((v) => v.status === 'tersedia' || v.id === form.vehicle_id)
)

const getTransactionLabel = (txId: string) => {
  const t = (tx.transactions || []).find((x: any) => x.id === txId)
  if (!t) return txId.slice(0, 8)
  return `${t.transaction_number || t.id.slice(0, 8)} — ${t.customer_name || 'Pelanggan'} (${formatMoney(t.total || 0)})`
}

const products = computed(() => productsStore.products || [])

const availableLoaderOptions = computed(() =>
  driverOptions.value.filter((e) => !loaders.value.some((l) => l.employee_id === e.id))
)

const selectedCustomerInfo = computed(() => {
  if (selectedTransactionIds.value.length === 0) return null

  // Ambil transaksi pertama untuk mendapatkan customer_id
  const firstTxId = selectedTransactionIds.value[0]
  const firstTx = (tx.transactions || []).find((t: any) => t.id === firstTxId)

  if (!firstTx || !firstTx.customer_id) return null

  // Cari data customer
  const customer = (customersStore.customers || []).find((c: Customer) => c.id === firstTx.customer_id)

  return customer || null
})

const formatMoney = (n: number) => 'Rp ' + new Intl.NumberFormat('id-ID').format(n || 0)

const formatInputNumber = (value: number) => {
  if (!value || value === 0) return ''
  return new Intl.NumberFormat('id-ID').format(value)
}

const updateUnitPrice = (item: any, event: Event) => {
  const input = event.target as HTMLInputElement
  const rawValue = input.value.replace(/\D/g, '')
  item.unit_price = rawValue ? parseInt(rawValue) : 0
}

const updateDriverFee = (event: Event) => {
  const input = event.target as HTMLInputElement
  const rawValue = input.value.replace(/\D/g, '')
  form.driver_fee = rawValue ? parseInt(rawValue) : 0
}

const onTransactionsConfirm = (ids: string[]) => {
  selectedTransactionIds.value = ids
  // Auto-load items dari transaksi yang dipilih
  loadItemsFromTransactions(ids)
}

const removeTransaction = (txId: string) => {
  const idx = selectedTransactionIds.value.indexOf(txId)
  if (idx > -1) {
    selectedTransactionIds.value.splice(idx, 1)
  }
}

const loadItemsFromTransactions = (txIds: string[]) => {
  // Kumpulkan semua item dari transaksi yang dipilih
  const itemsMap = new Map<string, { product_id: string; product_name: string; quantity: number }>()

  txIds.forEach((txId) => {
    const transaction = (tx.transactions || []).find((t: any) => t.id === txId)
    if (!transaction || !transaction.items) return

    transaction.items.forEach((item: any) => {
      const key = item.product_id || item.product_name
      if (itemsMap.has(key)) {
        // Jika produk sudah ada, tambahkan quantity
        const existing = itemsMap.get(key)!
        existing.quantity += item.quantity || 0
      } else {
        // Produk baru
        itemsMap.set(key, {
          product_id: item.product_id || '',
          product_name: item.product_name || '',
          quantity: item.quantity || 0
        })
      }
    })
  })

  // Convert map ke array dan tambahkan unit_price dari settings
  loadItems.value = Array.from(itemsMap.values()).map((item) => ({
    ...item,
    unit_price: settingsStore.loadingRatePerSack || 0
  }))
}

const onProductSelect = (product: Product) => {
  loadItems.value.push({
    product_id: product.id,
    product_name: product.name || '',
    quantity: 1,
    // Prefill dari tarif global upah per karung (Pengaturan Toko → Upah Bongkar Muat)
    unit_price: settingsStore.loadingRatePerSack || 0,
  })
}

const removeLoadItem = (i: number) => {
  loadItems.value.splice(i, 1)
}

const addLoader = () => {
  const emp = driverOptions.value.find((e) => e.id === loaderToAdd.value)
  if (!emp) return
  if (!loaders.value.some((l) => l.employee_id === emp.id)) {
    loaders.value.push({ employee_id: emp.id, employee_name: emp.name })
  }
  loaderToAdd.value = ''
}

const removeLoader = (i: number) => {
  loaders.value.splice(i, 1)
}

// Default form baru: sopir terisi pegawai berposisi 'supir' pertama,
// tim muat terisi pegawai berposisi 'loader' pertama.
const applyDefaultCrew = () => {
  const active = (hr.employees || []).filter((e: any) => e.status === 'aktif')

  if (!form.driver_id) {
    const firstDriver = active.find((e: any) => e.position === 'supir')
    if (firstDriver) form.driver_id = firstDriver.id
  }

  if (!form.vehicle_id) {
    const firstVehicle = shipping.vehicles.find((v) => v.status === 'tersedia')
    if (firstVehicle) form.vehicle_id = firstVehicle.id
  }

  if (loaders.value.length === 0) {
    const firstLoader = active.find((e: any) => e.position === 'loader')
    if (firstLoader) {
      loaders.value.push({ employee_id: firstLoader.id, employee_name: firstLoader.name })
    }
  }
}

const handleSave = async (status: 'draft' | 'disiapkan') => {
  if (!form.driver_id) return toast.warning('Perhatian', 'Pilih sopir terlebih dahulu')
  if (!form.vehicle_id) return toast.warning('Perhatian', 'Pilih kendaraan terlebih dahulu')
  const validLoad = loadItems.value.filter((li) => li.product_id && li.product_name.trim() && li.quantity > 0)
  if (validLoad.length === 0) return toast.warning('Perhatian', 'Tambahkan minimal 1 barang dimuat')

  try {
    const payload: any = {
      do_date: form.do_date,
      vehicle_id: form.vehicle_id,
      driver_id: form.driver_id,
      driver_name: driverOptions.value.find((d) => d.id === form.driver_id)?.name || null,
      driver_fee: form.driver_fee || 0,
      notes: form.notes || null,
      status,
    }

    let targetId: string
    if (isEdit.value && doId) {
      await shipping.updateDeliveryOrder(doId, payload)
      targetId = doId
    } else {
      const created = await shipping.createDeliveryOrder(payload)
      targetId = created.id
    }

    // Satu daftar barang = item pengiriman sekaligus dasar upah loader
    await shipping.saveDeliveryItems(
      targetId,
      validLoad.map((li) => ({ product_id: li.product_id, product_name: li.product_name.trim(), quantity: li.quantity })) as any
    )
    await shipping.saveDeliveryOrderTransactions(targetId, selectedTransactionIds.value)
    await shipping.saveDeliveryLoaders(targetId, loaders.value.map((l) => ({ employee_id: l.employee_id, employee_name: l.employee_name })))
    await shipping.saveDeliveryLoadItems(
      targetId,
      validLoad.map((li) => ({ product_name: li.product_name.trim(), quantity: li.quantity, unit_price: li.unit_price || 0 }))
    )
    router.push(`/shipping/deliveries/${targetId}`)
  } catch (e: any) {
    toast.error('Gagal!', e.message)
  }
}

onMounted(async () => {
  await Promise.all([
    shipping.fetchVehicles(),
    shipping.fetchDeliveryOrders(),
    hr.fetchEmployees(),
    tx.fetchTransactions(),
    productsStore.fetchProducts(),
    customersStore.fetchCustomers(),
    settingsStore.loaded ? Promise.resolve() : settingsStore.fetchSettings(),
  ])

  // Handle query params dari PendingShipmentList
  if (route.query.tx && typeof route.query.tx === 'string') {
    const txIds = route.query.tx.split(',').filter(Boolean)
    if (txIds.length > 0) {
      selectedTransactionIds.value = txIds
      loadItemsFromTransactions(txIds)
    }
  }

  // Form baru: auto-isi sopir & tim muat dari pegawai aktif
  if (!isEdit.value) {
    applyDefaultCrew()
  }

  if (isEdit.value && doId) {
    const d = await shipping.getDeliveryOrder(doId)
    if (d) {
      form.do_number = d.do_number || ''
      form.do_date = d.do_date || new Date().toISOString().slice(0, 10)
      form.vehicle_id = d.vehicle_id || ''
      form.driver_id = d.driver_id || ''
      form.driver_fee = d.driver_fee || 0
      form.notes = d.notes || ''
      selectedTransactionIds.value = [...(d.transaction_ids || [])]
      loaders.value = (d.loaders || []).map((l) => ({
        employee_id: l.employee_id,
        employee_name: l.employee_name || '',
      }))
      // Satu daftar barang: utamakan load_items (punya harga); fallback items lama
      const priceByName = new Map((d.load_items || []).map((li) => [li.product_name, li.unit_price]))
      const source = (d.load_items && d.load_items.length > 0)
        ? d.load_items.map((li) => ({ product_name: li.product_name, quantity: li.quantity, unit_price: li.unit_price }))
        : (d.items || []).map((it) => ({ product_name: it.product_name, quantity: it.quantity, unit_price: priceByName.get(it.product_name) || 0 }))
      loadItems.value = source.map((row) => {
        const p = products.value.find((x) => x.name === row.product_name)
        return {
          product_id: p?.id || '',
          product_name: row.product_name,
          quantity: row.quantity,
          unit_price: row.unit_price,
        }
      })
    }
  }
})
</script>
