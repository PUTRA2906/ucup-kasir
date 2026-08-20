<template>
  <div class="min-h-screen bg-gray-100 dark:bg-gray-950">
    <!-- Toolbar (hidden saat print) -->
    <div class="sticky top-0 z-10 border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 print:hidden">
      <div class="mx-auto flex max-w-3xl items-center justify-end px-4 py-4 sm:px-6">
        <div class="flex gap-2">
          <button
            @click="router.push(backUrl)"
            class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-white/[0.03]"
          >
            Kembali
          </button>
          <button
            @click="printInvoice"
            class="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4H7v4a2 2 0 002 2z" />
            </svg>
            Cetak
          </button>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-24">
      <div class="text-center">
        <svg class="mx-auto h-12 w-12 animate-spin text-brand-500" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p class="mt-4 text-sm text-gray-600 dark:text-gray-400">Memuat invoice...</p>
      </div>
    </div>

    <!-- Not Found -->
    <div v-else-if="!transaction" class="mx-auto max-w-3xl px-4 py-16 text-center">
      <p class="text-gray-600 dark:text-gray-400">Invoice tidak ditemukan</p>
      <button
        @click="router.push(backUrl)"
        class="mt-4 rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-600"
      >
        Kembali ke Detail Invoice
      </button>
    </div>

    <!-- Invoice Document -->
    <div v-else class="mx-auto max-w-3xl px-4 py-6 sm:py-8">
      <div
        class="print-area bg-white p-8 font-sans text-gray-900 shadow-xl sm:p-10"
      >
        <!-- Header Invoice -->
        <div class="flex items-start justify-between">
          <!-- Kiri: Nomor + Nama Toko -->
          <div>
            <p class="text-base font-bold leading-tight">INVOICE:</p>
            <p class="text-base font-bold leading-tight">{{ transaction.transaction_number }}</p>
            <div class="mt-6">
              <p class="text-[22px] font-bold leading-none" style="color: #0d86ff">
                {{ storeName }}
              </p>
              <p class="mt-2 text-sm">{{ storeAddress }}</p>
              <p class="text-sm">Email: {{ storeEmail }}</p>
              <p class="text-sm">Phone: {{ storePhone }}</p>
            </div>
          </div>

          <!-- Kanan: Diterbitkan Atas Nama -->
          <div class="mt-16 text-right sm:mt-16">
            <p class="text-xs font-semibold uppercase tracking-wide">
              DI TERBITKAN ATAS NAMA :
            </p>
            <div class="mt-3 space-y-1.5 text-left text-sm">
              <div class="flex items-start">
                <span class="w-14">Tanggal</span>
                <span class="mr-1">:</span>
                <span class="font-semibold">{{ formatDate(transaction.created_at) }}</span>
              </div>
              <div class="flex items-start">
                <span class="w-14">Toko</span>
                <span class="mr-1">:</span>
                <span class="font-semibold">{{ transaction.customer_store_name || '-' }}</span>
              </div>
              <div class="flex items-start">
                <span class="w-14">Pembeli</span>
                <span class="mr-1">:</span>
                <span class="font-semibold">{{ transaction.customer_name || 'Umum' }}</span>
              </div>
              <div class="flex items-start">
                <span class="w-14">Alamat</span>
                <span class="mr-1">:</span>
                <span class="font-semibold">{{ transaction.customer_address || '-' }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Tabel Produk Dibeli -->
        <div class="mt-8 overflow-x-auto">
          <p class="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">Produk Dibeli</p>
          <table class="w-full border-collapse text-sm">
            <thead>
              <tr class="border-t-2 border-b-2 border-black">
                <th class="py-2 pr-2 text-left text-xs font-bold uppercase">Product</th>
                <th class="px-2 py-2 text-right text-xs font-bold uppercase">Harga Barang</th>
                <th class="px-2 py-2 text-center text-xs font-bold uppercase">Jumlah</th>
                <th class="py-2 pl-2 text-right text-xs font-bold uppercase">Total Harga</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="item in transaction.items"
                :key="item.id"
                class="border-b border-gray-400"
              >
                <td class="py-2.5 pr-2">{{ item.product_name }}</td>
                <td class="px-2 py-2.5 text-right">{{ formatPrice(item.price) }}</td>
                <td class="px-2 py-2.5 text-center">{{ item.quantity }}</td>
                <td class="py-2.5 pl-2 text-right">{{ formatPrice(item.subtotal) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Tabel Produk Diretur -->
        <div v-if="allReturnItems.length > 0" class="mt-6 overflow-x-auto">
          <p class="mb-2 text-xs font-bold uppercase tracking-wide text-red-600">Produk Diretur</p>
          <table class="w-full border-collapse text-sm">
            <thead>
              <tr class="border-t-2 border-b-2 border-red-600">
                <th class="py-2 pr-2 text-left text-xs font-bold uppercase text-red-700">Product</th>
                <th class="px-2 py-2 text-right text-xs font-bold uppercase text-red-700">Harga Barang</th>
                <th class="px-2 py-2 text-center text-xs font-bold uppercase text-red-700">Jumlah</th>
                <th class="py-2 pl-2 text-right text-xs font-bold uppercase text-red-700">Total Retur</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="item in allReturnItems"
                :key="item.product_id"
                class="border-b border-red-200"
              >
                <td class="py-2.5 pr-2 text-red-700">{{ item.product_name }}</td>
                <td class="px-2 py-2.5 text-right text-red-700">{{ formatPrice(item.price) }}</td>
                <td class="px-2 py-2.5 text-center text-red-700">{{ item.quantity }}</td>
                <td class="py-2.5 pl-2 text-right font-semibold text-red-700">- {{ formatPrice(item.subtotal) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Ringkasan -->
        <div class="mt-8 flex justify-end">
          <div class="w-full max-w-xs text-sm">
            <div class="flex justify-between border-t border-gray-400 py-2">
              <span>TOTAL PEMBELIAN</span>
              <span class="font-semibold">{{ formatPrice(originalSubtotal) }}</span>
            </div>
            <div
              v-if="returnAmount > 0"
              class="flex justify-between border-t border-gray-400 py-2"
            >
              <span class="text-red-600">TOTAL RETUR</span>
              <span class="font-semibold text-red-600">- {{ formatPrice(returnAmount) }}</span>
            </div>
            <div
              v-if="discount > 0"
              class="flex justify-between border-t border-gray-400 py-2"
            >
              <span>Diskon</span>
              <span class="font-semibold">- {{ formatPrice(discount) }}</span>
            </div>
            <div
              v-if="shippingCost > 0"
              class="flex justify-between border-t border-gray-400 py-2"
            >
              <span>Pengiriman</span>
              <span class="font-semibold">+ {{ formatPrice(shippingCost) }}</span>
            </div>
            <!-- Total Tagihan -->
            <div class="flex justify-between border-t border-gray-400 py-2">
              <span class="font-bold">TOTAL TAGIHAN</span>
              <span class="font-bold">{{ formatPrice(transaction.total) }}</span>
            </div>

            <!-- Riwayat Pembayaran & Penyesuaian -->
            <div class="border-t border-gray-400">
              <p class="pt-2 text-xs font-bold uppercase">Riwayat Pembayaran & Penyesuaian</p>
              <div v-if="statementLines.length === 0" class="border-t border-gray-400 py-2 text-sm">
                Belum ada pembayaran dicatat
              </div>
              <div
                v-for="line in statementLines"
                :key="line.label + line.date"
                class="flex items-start justify-between border-t border-gray-400 py-2"
              >
                <div>
                  <span>{{ line.label }}</span><br />
                  <span class="text-xs">{{ line.date }}</span>
                  <span v-if="line.ref" class="block text-xs">{{ line.ref }}</span>
                </div>
                <span class="font-semibold">- {{ formatPrice(line.amount) }}</span>
              </div>
            </div>

            <!-- Sisa Tagihan & Status -->
            <div class="flex items-start justify-between border-t border-gray-400 py-2">
              <span class="font-bold">Sisa Tagihan (Outstanding)</span>
              <span class="font-bold">{{ isOverpaid ? formatPrice(0) : formatPrice(Math.max(rawRemaining, 0)) }}</span>
            </div>
            <div class="flex items-start justify-between border-t border-gray-400 py-2">
              <span>Status</span>
              <span class="font-semibold">
                {{ isOverpaid || transaction.payment_status === 'lunas' ? 'LUNAS' : 'BELUM LUNAS' }}
              </span>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="mt-10 text-xs text-gray-500">
          <p>Invoice ini sah dan diproses oleh komputer</p>
          <div class="mt-1.5 flex items-center justify-between">
            <p>Silakan hubungi {{ storeName }} apabila kamu membutuhkan bantuan</p>
            <p>Terakhir di update {{ formatDateTime(transaction.updated_at) }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useTransactionsStore } from '@/stores/transactions'
import { useCustomersStore } from '@/stores/customers'
import { useReturnsStore } from '@/stores/returns'
import { useStoreSettingsStore } from '@/stores/storeSettings'

const router = useRouter()
const route = useRoute()
const transactionsStore = useTransactionsStore()
const customersStore = useCustomersStore()
const returnsStore = useReturnsStore()
const settingsStore = useStoreSettingsStore()

const kecamatan = route.params.kecamatan as string
const customerId = route.params.customerId as string
const invoiceId = route.params.invoiceId as string

const transaction = ref<any>(null)
const loading = ref(true)

const backUrl = computed(
  () => `/customer-invoices/${encodeURIComponent(kecamatan)}/${customerId}/${invoiceId}`
)

const storeName = computed(() => settingsStore.storeSubtitle)
const storeAddress = computed(() => settingsStore.storeAddress)
const storeEmail = computed(() => settingsStore.storeEmail)
const storePhone = computed(() => settingsStore.storePhone)

const shippingCost = computed(() => transaction.value?.shipping_cost || 0)
const discount = computed(() => transaction.value?.discount || 0)

const totalRefund = computed(() =>
  returnsStore.returns.reduce((sum, r) => sum + (r.total_refund || 0), 0)
)

const returnAmount = computed(() => transaction.value?.return_amount || totalRefund.value)

const originalSubtotal = computed(() => {
  const items = transaction.value?.items
  if (items && items.length > 0) {
    return items.reduce((sum: number, item: any) => sum + (item.subtotal || 0), 0)
  }
  return (transaction.value?.subtotal || 0) + returnAmount.value
})

const allReturnItems = computed(() => {
  const items: { product_id: string; product_name: string; price: number; quantity: number; subtotal: number }[] = []

  const processReturns = (retList: typeof returnsStore.returns) => {
    retList.forEach((ret) => {
      (ret.items || []).forEach((item) => {
        if (!item.product_id) return
        const existing = items.find((i) => i.product_id === item.product_id)
        if (existing) {
          existing.quantity += item.quantity
          existing.subtotal += item.subtotal
        } else {
          items.push({
            product_id: item.product_id,
            product_name: item.product_name,
            price: item.price,
            quantity: item.quantity,
            subtotal: item.subtotal,
          })
        }
      })
    })
  }

  processReturns(returnsStore.returns)
  processReturns(returnsStore.linkedReturns)
  return items
})

// Total tagihan awal (sebelum retur & pembayaran)
const originalTotal = computed(() => (transaction.value?.total || 0) + totalRefund.value)

const formatPaymentMethod = (value: string) => {
  const methods: Record<string, string> = {
    tunai: 'Tunai',
    transfer: 'Transfer',
    qris: 'QRIS',
  }
  return methods[value] || value
}

const formatShortDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

// Total pembayaran
const totalPaid = computed(() =>
  (transaction.value?.payments || []).reduce(
    (sum: number, p: any) => sum + (p.amount || 0),
    0
  )
)

// Sisa tagihan actual (bisa negatif jika overpaid)
const rawRemaining = computed(() => originalTotal.value - totalPaid.value - totalRefund.value)

// Apakah ada kelebihan bayar?
const isOverpaid = computed(() => rawRemaining.value < 0)
const overpayAmount = computed(() => (isOverpaid.value ? Math.abs(rawRemaining.value) : 0))

// Baris riwayat (pembayaran & retur) diurutkan kronologis untuk statement
const statementLines = computed(() => {
  const lines: {
    sortKey: number
    date: string
    label: string
    ref?: string
    amount: number
    type: 'payment' | 'refund'
  }[] = []
  const payments = [...(transaction.value?.payments || [])].sort(
    (a: any, b: any) => +new Date(a.created_at) - +new Date(b.created_at)
  )
  payments.forEach((p: any, i: number) => {
    lines.push({
      sortKey: +new Date(p.created_at),
      date: formatShortDate(p.created_at),
      label: `Pembayaran ${formatPaymentMethod(p.payment_method)}${i === 0 ? ' (DP)' : ''}`,
      amount: p.amount,
      type: 'payment',
    })
  })
  returnsStore.returns.forEach((r: any) => {
    lines.push({
      sortKey: +new Date(r.created_at),
      date: formatShortDate(r.created_at),
      label: 'Retur Penjualan',
      ref: `[Ref: ${[r.return_number, r.notes].filter(Boolean).join(' - ')}]`,
      amount: r.total_refund,
      type: 'payment',
    })
  })
  // Jika overpaid, tambahkan baris pengembalian lebih bayar (tanda +)
  if (isOverpaid.value) {
    const lastSortKey = lines.length > 0 ? lines[lines.length - 1].sortKey + 1 : Date.now()
    lines.push({
      sortKey: lastSortKey,
      date: formatShortDate(new Date().toISOString()),
      label: 'Pengembalian Lebih Bayar',
      amount: overpayAmount.value,
      type: 'refund',
    })
  }
  return lines.sort((a, b) => a.sortKey - b.sortKey)
})

const formatPrice = (value: number) => 'Rp ' + (value || 0).toLocaleString('id-ID')

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  const day = date.getDate().toString().padStart(2, '0')
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

const formatDateTime = (dateString: string) => {
  const date = new Date(dateString)
  const datePart = date
    .toLocaleDateString('en-US', { day: '2-digit', month: 'long', year: 'numeric' })
    .replace(/ /g, '-')
  const time = date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  return `${datePart} ${time} WIB`
}

const printInvoice = () => {
  const customerName = transaction.value?.customer_name || 'Umum'
  const customerKecamatan = transaction.value?.customer_kecamatan || ''
  const invoiceNumber = transaction.value?.transaction_number || ''
  // Nama file PDF: nama pelanggan - kecamatan - nomor invoice
  document.title = [customerName, customerKecamatan, invoiceNumber].filter(Boolean).join(' - ')
  window.print()
}

onMounted(async () => {
  try {
    await customersStore.fetchCustomers()
    const data = await transactionsStore.getTransaction(invoiceId)
    if (!data) return
    const customer = customersStore.customers.find((c) => c.id === data.customer_id)
    transaction.value = {
      ...data,
      customer_address: customer?.address || '',
      customer_store_name: customer?.store_name || '',
      customer_kecamatan: customer?.kecamatan || '',
    }
    await returnsStore.fetchReturns(invoiceId)
    await returnsStore.fetchLinkedReturns(invoiceId)
    await returnsStore.fetchReturnsForNewTransaction(invoiceId)
  } catch (error) {
    console.error('Error loading invoice:', error)
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
@media print {
  /* Margins 0 menekan header/footer otomatis Chrome (tanggal, jam, judul halaman) */
  @page {
    margin: 0;
  }

  body * {
    visibility: hidden;
  }

  .print-area,
  .print-area * {
    visibility: visible;
  }

  .print-area {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    box-shadow: none !important;
    max-width: none !important;
    padding: 24px 72px !important;
    background: #fff !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}
</style>
