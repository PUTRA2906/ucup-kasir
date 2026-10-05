<template>
  <AdminLayout>
    <PageBreadcrumb pageTitle="Detail Surat Jalan" class="hidden md:block" />

    <!-- Mobile Header -->
    <MobilePageHeader title="Detail Surat Jalan" :subtitle="order?.do_number || 'Loading...'">
      <template #actions>
        <button @click="router.push(`/shipping/deliveries/print/${order?.id}`)" class="flex h-8 w-8 items-center justify-center rounded-xl border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400" title="Cetak surat jalan">
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4H7v4a2 2 0 002 2zM7 5h10a2 2 0 002-2V1H5v2a2 2 0 002 2z" /></svg>
        </button>
        <button @click="router.push(`/shipping/deliveries/edit/${order?.id}`)" class="flex h-8 w-8 items-center justify-center rounded-xl border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
        </button>
      </template>
    </MobilePageHeader>

    <!-- Loading -->
    <div v-if="store.loading && !order" class="flex items-center justify-center py-20">
      <div class="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
    </div>

    <div v-else-if="!order" class="rounded-2xl border border-gray-200 bg-white p-10 text-center dark:border-gray-800 dark:bg-gray-900">
      <p class="text-sm text-gray-500 dark:text-gray-400">Surat jalan tidak ditemukan.</p>
    </div>

    <div v-else class="space-y-4">
      <!-- Header status -->
      <div class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-lg font-black text-gray-900 dark:text-white">{{ order.do_number }}</p>
            <!-- Tanggal pengiriman: klik untuk ubah -->
            <div class="flex items-center gap-1.5">
              <p class="text-xs text-gray-500 dark:text-gray-400">{{ formatDate(order.do_date) }}</p>
              <button
                @click="startEditDate"
                class="rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-blue-600 dark:hover:bg-gray-800 dark:hover:text-blue-400"
                title="Ubah tanggal pengiriman"
              >
                <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              </button>
            </div>
          </div>
          <span class="rounded-xl px-3 py-1 text-[11px] font-bold uppercase" :class="getStatusBadge(order.status)">{{ statusLabel(order.status) }}</span>
        </div>

        <!-- Status action buttons -->
        <div class="mt-4 flex flex-wrap gap-2">
          <button
            v-if="order.status === 'draft'"
            @click="changeStatus('disiapkan')"
            class="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500"
          >
            Mulai Siapkan
          </button>
          <button
            v-if="order.status === 'disiapkan'"
            @click="changeStatus('dikirim')"
            class="rounded-xl bg-amber-500 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-400"
          >
            Kirim Sekarang
          </button>
          <button
            v-if="order.status === 'dikirim'"
            @click="changeStatus('selesai')"
            class="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500"
          >
            Tandai Selesai
          </button>
          <button
            v-if="['draft', 'disiapkan', 'dikirim'].includes(order.status)"
            @click="handleDelete"
            class="rounded-xl border border-red-300 px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10"
          >
            Hapus
          </button>
        </div>
      </div>

      <!-- Info umum -->
      <div class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h3 class="mb-3 text-sm font-bold text-gray-900 dark:text-white">Informasi</h3>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <p class="text-[10px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">Pelanggan</p>
            <p class="text-xs font-medium text-gray-900 dark:text-white">{{ customerInfo?.name || order.customer_name || '-' }}</p>
          </div>
          <div>
            <p class="text-[10px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">Sopir</p>
            <p class="text-xs font-medium text-gray-900 dark:text-white">{{ order.driver_name || '-' }}</p>
          </div>
          <div v-if="customerInfo?.store_name">
            <p class="text-[10px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">Nama Toko</p>
            <p class="text-xs font-medium text-gray-900 dark:text-white">{{ customerInfo.store_name }}</p>
          </div>
          <div v-if="customerInfo?.phone">
            <p class="text-[10px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">Telepon</p>
            <p class="text-xs font-medium text-gray-900 dark:text-white">{{ customerInfo.phone }}</p>
          </div>
          <div>
            <p class="text-[10px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">Kendaraan</p>
            <p class="text-xs font-medium text-gray-900 dark:text-white">{{ order.vehicle?.plate_number || '-' }} <span class="text-gray-400">({{ order.vehicle?.vehicle_type || '' }})</span></p>
          </div>
          <div class="col-span-2">
            <p class="text-[10px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">Alamat Pengiriman</p>
            <p class="text-xs font-medium text-gray-900 dark:text-white">{{ customerInfo?.address || order.customer_address || '-' }}</p>
          </div>
          <div v-if="order.notes" class="col-span-2">
            <p class="text-[10px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">Catatan</p>
            <p class="text-xs font-medium text-gray-900 dark:text-white">{{ order.notes }}</p>
          </div>
        </div>
      </div>

      <!-- Transaksi dirujuk -->
      <div class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h3 class="mb-3 text-sm font-bold text-gray-900 dark:text-white">Transaksi Dirujuk <span class="ml-1 text-[10px] font-medium text-gray-400">({{ order.transactions?.length || 0 }})</span></h3>
        <div v-if="!order.transactions || order.transactions.length === 0" class="rounded-xl border border-dashed border-gray-300 py-6 text-center dark:border-gray-700">
          <p class="text-xs text-gray-500 dark:text-gray-400">Tidak ada transaksi dirujuk.</p>
        </div>
        <div v-else class="space-y-2">
          <router-link v-for="(t, i) in order.transactions" :key="i" :to="`/transactions/${t.id}`" class="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700">
            <div class="min-w-0">
              <p class="truncate text-xs font-medium text-gray-900 dark:text-white">{{ t.transaction_number }}</p>
              <p class="truncate text-[10px] text-gray-500 dark:text-gray-400">{{ t.customer_name || '-' }}</p>
            </div>
            <p class="text-xs font-semibold text-gray-900 dark:text-white">{{ formatMoney(t.total || 0) }}</p>
          </router-link>
        </div>
      </div>

      <!-- Barang dimuat + tim muat + upah -->
      <div class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h3 class="mb-3 text-sm font-bold text-gray-900 dark:text-white">Muatan &amp; Tim Muat</h3>

        <p class="mb-2 text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Item Pengiriman</p>
        <div v-if="loadRows.length === 0" class="mb-4 rounded-xl border border-dashed border-gray-300 py-5 text-center dark:border-gray-700">
          <p class="text-xs text-gray-500 dark:text-gray-400">Belum ada item.</p>
        </div>
        <div v-else class="mb-4 overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead>
              <tr class="border-b border-gray-200 text-[10px] uppercase tracking-wide text-gray-400 dark:border-gray-700">
                <th class="py-2 pr-2 font-medium">Produk</th>
                <th class="py-2 px-2 text-right font-medium">Jumlah</th>
                <th class="py-2 pl-2 text-right font-medium">Nilai Barang</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(li, i) in loadRows" :key="i" class="border-b border-gray-100 last:border-0 dark:border-gray-800">
                <td class="py-2 pr-2 font-medium text-gray-900 dark:text-white">{{ li.product_name }}</td>
                <td class="py-2 px-2 text-right text-gray-700 dark:text-gray-300">{{ li.quantity }}</td>
                <td class="py-2 pl-2 text-right font-semibold text-gray-900 dark:text-white">{{ formatMoney(li.item_value) }}</td>
              </tr>
              <tr>
                <td colspan="2" class="pt-2.5 pr-2 text-right text-[10px] font-semibold uppercase tracking-wide text-gray-400">Total</td>
                <td class="pt-2.5 pl-2 text-right text-xs font-black text-gray-900 dark:text-white">{{ formatMoney(totalItemValue) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p class="mb-2 text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Tim Muat <span class="normal-case">({{ order.loaders?.length || 0 }} orang)</span></p>
        <div v-if="!order.loaders || order.loaders.length === 0" class="rounded-xl border border-dashed border-gray-300 py-5 text-center dark:border-gray-700">
          <p class="text-xs text-gray-500 dark:text-gray-400">Belum ada tim muat.</p>
        </div>
        <div v-else class="flex flex-wrap gap-2">
          <span v-for="(l, i) in order.loaders" :key="i" class="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
            {{ l.employee_name || '-' }}
          </span>
        </div>
      </div>

      <!-- Timeline tracking -->
      <div class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h3 class="mb-3 text-sm font-bold text-gray-900 dark:text-white">Riwayat Status</h3>
        <div v-if="!order.tracking || order.tracking.length === 0" class="rounded-xl border border-dashed border-gray-300 py-6 text-center dark:border-gray-700">
          <p class="text-xs text-gray-500 dark:text-gray-400">Belum ada riwayat.</p>
        </div>
        <div v-else class="relative space-y-4">
          <div v-for="(t, i) in [...(order.tracking || [])].reverse()" :key="i" class="relative flex gap-3">
            <!-- line -->
            <div v-if="i < order.tracking!.length - 1" class="absolute left-[7px] top-6 bottom-[-16px] w-0.5 bg-gray-200 dark:bg-gray-700"></div>
            <div class="flex h-[15px] w-[15px] flex-shrink-0 items-center justify-center rounded-full border-2" :class="getDotClass(t.status)">
              <div class="h-1.5 w-1.5 rounded-full bg-current"></div>
            </div>
            <div class="flex-1 pb-1">
              <p class="text-xs font-semibold text-gray-900 dark:text-white">{{ statusLabel(t.status) }}</p>
              <p v-if="t.note" class="text-[10px] text-gray-500 dark:text-gray-400">{{ t.note }}</p>
              <p class="text-[9px] text-gray-400 dark:text-gray-500">{{ formatDateTime(t.created_at) }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Desktop action buttons -->
      <div class="hidden md:flex justify-end gap-2">
        <button @click="router.push(`/shipping/deliveries/print/${order.id}`)" class="rounded-xl border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
          Cetak Surat Jalan
        </button>
        <button @click="router.push(`/shipping/deliveries/edit/${order.id}`)" class="rounded-xl border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
          Edit Surat Jalan
        </button>
      </div>
    </div>

    <DatePickerModal
      v-model="showDatePicker"
      :value="order?.do_date"
      title="Tanggal Pengiriman"
      @update:value="saveDate"
    />
  </AdminLayout>
</template>

<script setup lang="ts">
import { useConfirm } from '@/composables/useConfirm'
import { useToast } from '@/composables/useToast'
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import MobilePageHeader from '@/components/common/MobilePageHeader.vue'
import DatePickerModal from '@/components/common/DatePickerModal.vue'
import { useShippingStore } from '@/stores/shipping'
import { useCustomersStore } from '@/stores/customers'
import { useTransactionsStore } from '@/stores/transactions'
import type { Customer } from '@/types/database'

const { confirm } = useConfirm()
const toast = useToast()
const route = useRoute()
const router = useRouter()
const store = useShippingStore()
const customersStore = useCustomersStore()
const txStore = useTransactionsStore()

const doId = route.params.id as string
const order = computed(() => store.currentOrder)

// Data pelanggan diambil dari referensi transaksi (transaksi pertama yang dirujuk)
const customerInfo = computed(() => {
  const firstTx = (order.value?.transactions || [])[0]
  const customerId = firstTx?.customer_id || order.value?.customer_id
  const master = customerId
    ? (customersStore.customers || []).find((c: Customer) => c.id === customerId)
    : null
  if (master) return master as Customer
  // Fallback: nama pelanggan yang tersimpan di transaksi
  if (firstTx?.customer_name) {
    return {
      id: firstTx.customer_id || '',
      name: firstTx.customer_name,
      store_name: '',
      phone: '',
      address: '',
      credit_limit: 0,
      created_at: '',
      updated_at: '',
    } as Customer
  }
  return null
})

// ---- Ubah tanggal pengiriman langsung dari halaman detail (pakai DatePickerModal) ----
const showDatePicker = ref(false)
const savingDate = ref(false)

const startEditDate = () => {
  showDatePicker.value = true
}

const saveDate = async (value: string) => {
  const newDate = value.slice(0, 10)
  if (!newDate) return toast.warning('Perhatian', 'Tanggal belum diisi')
  if (newDate === order.value?.do_date) return
  // DO selesai ikut menentukan upah loader di payroll — konfirmasi bila periode sudah digenerate
  if (order.value?.status === 'selesai') {
    const ok = await confirm(
      'Surat jalan ini sudah selesai dan bisa jadi sudah masuk payroll. ' +
        'Ubah tanggalnya akan memindahkan perhitungan upah loader ke periode yang baru saat payroll digenerate ulang. Lanjutkan?'
    )
    if (!ok) return
  }
  savingDate.value = true
  try {
    await store.updateDeliveryOrder(doId, { do_date: newDate })
    await store.getDeliveryOrder(doId)
    toast.success('Tersimpan', 'Tanggal pengiriman diubah')
  } catch (e: any) {
    toast.error('Gagal!', e.message)
  } finally {
    savingDate.value = false
  }
}

const formatMoney = (n: number) => 'Rp ' + new Intl.NumberFormat('id-ID').format(n || 0)

// Satu daftar barang: utamakan load_items; fallback items lama.
// Nilai barang per produk diambil dari referensi transaksi (harga jual × jumlah dimuat).
const loadRows = computed(() => {
  const li = order.value?.load_items || []
  const source = li.length > 0
    ? li.map((r) => ({ product_name: r.product_name, quantity: r.quantity }))
    : (order.value?.items || []).map((r) => ({ product_name: r.product_name, quantity: r.quantity }))

  // Kumpulkan harga satuan per produk dari transaksi yang dirujuk
  const priceByName = new Map<string, number>()
  const refTxIds = new Set(order.value?.transaction_ids || [])
  for (const t of txStore.transactions || []) {
    if (!refTxIds.has(t.id)) continue
    for (const it of t.items || []) {
      const name = (it.product_name || '').trim().toLowerCase()
      if (name && !priceByName.has(name)) priceByName.set(name, it.price || 0)
    }
  }

  return source.map((row) => {
    const unitSellPrice = priceByName.get(row.product_name.trim().toLowerCase()) || 0
    return { ...row, item_value: unitSellPrice * (row.quantity || 0) }
  })
})

const totalItemValue = computed(() =>
  loadRows.value.reduce((sum, r) => sum + (r.item_value || 0), 0)
)

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'draft': return 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
    case 'disiapkan': return 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400'
    case 'dikirim': return 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
    case 'selesai': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
    default: return 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
  }
}

const getDotClass = (status: string) => {
  switch (status) {
    case 'disiapkan': return 'border-blue-500 text-blue-500'
    case 'dikirim': return 'border-amber-500 text-amber-500'
    case 'selesai': return 'border-emerald-500 text-emerald-500'
    default: return 'border-gray-400 text-gray-400'
  }
}

const statusLabel = (s: string) => {
  switch (s) {
    case 'draft': return 'Draft'
    case 'disiapkan': return 'Disiapkan'
    case 'dikirim': return 'Dikirim'
    case 'selesai': return 'Selesai'
    default: return s
  }
}

const formatDate = (d: string) => {
  if (!d) return '-'
  const date = new Date(d)
  if (isNaN(date.getTime())) return d
  return date.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

const formatDateTime = (d: string) => {
  if (!d) return '-'
  const date = new Date(d)
  if (isNaN(date.getTime())) return d
  return date.toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const changeStatus = async (status: 'draft' | 'disiapkan' | 'dikirim' | 'selesai') => {
  try {
    await store.updateDeliveryStatus(doId, status)
    await store.getDeliveryOrder(doId)
  } catch (e: any) {
    toast.error('Gagal!', e.message)
  }
}

const handleDelete = async () => {
  if (!(await confirm('Hapus surat jalan ini? Data akan dihapus permanen dan tidak dapat dikembalikan.'))) return
  try {
    await store.deleteDeliveryOrder(doId)
    toast.success('Berhasil!', 'Surat jalan berhasil dihapus')
    router.push('/shipping/deliveries')
  } catch (e: any) {
    toast.error('Gagal!', e.message)
  }
}

onMounted(async () => {
  await Promise.all([
    store.getDeliveryOrder(doId),
    customersStore.fetchCustomers(),
    txStore.fetchTransactions(),
  ])
})
</script>