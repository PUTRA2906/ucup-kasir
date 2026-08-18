<template>
  <AdminLayout>
    <PageBreadcrumb pageTitle="Invoice Pelanggan" class="hidden md:block" />
    <div class="space-y-6 px-4 md:px-0">
      <!-- Loading -->
      <div
        v-if="loading"
        class="flex items-center justify-center rounded-xl border border-gray-200 bg-white py-16 dark:border-gray-800 dark:bg-white/[0.03]"
      >
        <p class="text-sm text-gray-500 dark:text-gray-400">Memuat data...</p>
      </div>

      <!-- Customer tidak ditemukan -->
      <div
        v-else-if="!customer"
        class="rounded-xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-white/[0.03]"
      >
        <p class="text-gray-600 dark:text-gray-400">Customer tidak ditemukan</p>
        <button
          @click="router.push(`/customer-invoices/${encodeURIComponent(kecamatan)}`)"
          class="mt-4 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
        >
          Kembali Pilih Customer
        </button>
      </div>

      <!-- Daftar Invoice -->
      <div v-else class="space-y-6">
        <!-- Kartu Informasi Customer -->
        <div class="rounded-xl border border-gray-200 bg-white p-4 sm:p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div class="flex items-start gap-3 min-w-0">
              <div
                class="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-brand-100 text-base font-bold text-brand-600 dark:bg-brand-500/15 dark:text-brand-400"
              >
                {{ customerInitial }}
              </div>
              <div class="min-w-0">
                <h1 class="text-lg font-bold text-gray-900 break-words dark:text-white">
                  {{ customer.name }}
                </h1>
                <p class="mt-0.5 text-sm text-gray-600 break-words dark:text-gray-400">
                  {{ customerSubtitle }}
                </p>
                <p v-if="customer.phone" class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  {{ customer.phone }}
                </p>
              </div>
            </div>
            <div class="inline-flex flex-shrink-0 self-start items-center gap-2">
              <button
                @click="goToAddTransaction"
                class="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
              >
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                </svg>
                Tambah Transaksi
              </button>
              <button
                @click="router.push(`/customer-invoices/${encodeURIComponent(kecamatan)}`)"
                class="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03]"
              >
                ← Ganti Customer
              </button>
            </div>
          </div>

          <div class="mt-4 grid grid-cols-1 gap-3 border-t border-gray-100 pt-4 sm:grid-cols-3 dark:border-gray-800">
            <div class="flex items-center justify-between gap-2 sm:block">
              <p class="text-xs text-gray-500 dark:text-gray-400">Jumlah Invoice</p>
              <p class="text-lg font-bold text-gray-900 sm:mt-0.5 dark:text-white">{{ customerInvoices.length }}</p>
            </div>
            <div class="flex items-center justify-between gap-2 sm:block">
              <p class="text-xs text-gray-500 dark:text-gray-400">Total Tagihan</p>
              <p class="text-lg font-bold text-gray-900 sm:mt-0.5 dark:text-white">{{ formatCurrency(totalBill) }}</p>
            </div>
            <div class="flex items-center justify-between gap-2 sm:block">
              <p class="text-xs text-gray-500 dark:text-gray-400">Belum Lunas</p>
              <p class="text-lg font-bold text-warning-600 sm:mt-0.5 dark:text-warning-400">{{ formatCurrency(totalRemaining) }}</p>
            </div>
          </div>
        </div>

        <DataTable
          :columns="invoiceColumns"
          :data="customerInvoices"
          :per-page="10"
          :searchable="true"
          :paginated="true"
          title="Daftar Invoice"
          :subtitle="'Urut berdasarkan tanggal terbaru'"
          :empty-text="'Customer ini belum memiliki invoice'"
          @menu-action="handleMenuAction"
        >
          <template #mobile-header>
            <span class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Tanggal Invoice
            </span>
          </template>

          <template #mobile-summary="{ row }">
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium text-gray-900 truncate dark:text-white">
                {{ formatDate(row.created_at) }}
              </p>
              <p class="text-xs text-gray-500 truncate dark:text-gray-400">
                {{ row.transaction_number }}
                <span
                  :class="[
                    'ml-1 inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium',
                    row.payment_status === 'lunas'
                      ? 'bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-400'
                      : 'bg-warning-50 text-warning-600 dark:bg-warning-500/10 dark:text-warning-400'
                  ]"
                >
                  {{ row.payment_status === 'lunas' ? 'Lunas' : 'Belum Lunas' }}
                </span>
              </p>
            </div>
          </template>

          <template #cell-transaction_number="{ row }">
            <router-link
              :to="invoiceDetailUrl(row.id)"
              class="font-medium text-brand-600 hover:underline dark:text-brand-400"
            >
              {{ row.transaction_number }}
            </router-link>
          </template>

          <template #cell-created_at="{ value }">
            <span class="text-gray-600 dark:text-gray-400">{{ formatDate(value) }}</span>
          </template>

          <template #cell-total="{ value }">
            <span class="font-medium text-gray-900 dark:text-white">{{ formatCurrency(value) }}</span>
          </template>

          <template #cell-remaining_amount="{ value, row }">
            <span v-if="row.remaining_amount > 0" class="font-medium text-warning-600 dark:text-warning-400">
              {{ formatCurrency(value) }}
            </span>
            <span v-else class="text-gray-400 dark:text-gray-600">-</span>
          </template>

          <template #cell-payment_method="{ row }">
            <div class="flex flex-col gap-1 items-end md:items-start">
              <span class="text-gray-800 dark:text-white/90">{{ formatPaymentMethod(row.payment_method) }}</span>
              <span
                :class="[
                  'inline-flex w-fit items-center rounded-full px-2 py-0.5 text-[10px] font-medium',
                  row.payment_status === 'lunas'
                    ? 'bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-400'
                    : 'bg-warning-50 text-warning-600 dark:bg-warning-500/10 dark:text-warning-400'
                ]"
              >
                {{ row.payment_status === 'lunas' ? 'Lunas' : 'Belum Lunas' }}
              </span>
            </div>
          </template>

          <template #cell-status="{ value }">
            <span
              :class="[
                'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                value === 'selesai'
                  ? 'bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-400'
                  : 'bg-error-50 text-error-600 dark:bg-error-500/10 dark:text-error-400'
              ]"
            >
              {{ value === 'selesai' ? 'Selesai' : 'Batal' }}
            </span>
          </template>

          <template #rowActions="{ row }">
            <button
              @click="viewInvoice(row)"
              class="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-600"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Lihat Invoice
            </button>
          </template>
        </DataTable>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import DataTable from '@/components/tables/DataTable.vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import { useCustomersStore } from '@/stores/customers'
import { useTransactionsStore } from '@/stores/transactions'
import { useToast } from '@/composables/useToast'

const router = useRouter()
const route = useRoute()
const customersStore = useCustomersStore()
const transactionsStore = useTransactionsStore()
const toast = useToast()

const kecamatan = route.params.kecamatan as string
const customerId = route.params.customerId as string
const loading = ref(true)

const customer = computed(() =>
  customersStore.customers.find((c) => c.id === customerId)
)

const customerInvoices = computed(() => {
  if (!customer.value) return []
  return transactionsStore.transactions
    .filter((t) => t.customer_id === customerId)
    .sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
})

const customerInitial = computed(() => {
  const name = customer.value?.name || '?'
  return name.charAt(0).toUpperCase()
})

const customerSubtitle = computed(() => {
  if (!customer.value) return '-'
  return (
    [customer.value.store_name, customer.value.kecamatan, customer.value.address]
      .filter(Boolean)
      .join(' · ') || '-'
  )
})

const totalBill = computed(() =>
  customerInvoices.value.reduce((sum, t) => sum + (t.total || 0), 0)
)

const totalRemaining = computed(() =>
  customerInvoices.value.reduce((sum, t) => sum + (t.remaining_amount || 0), 0)
)

const invoiceDetailUrl = (transactionId: string) =>
  `/customer-invoices/${encodeURIComponent(kecamatan)}/${customerId}/${transactionId}`

const viewInvoice = (transaction: any) => {
  router.push(invoiceDetailUrl(transaction.id))
}

const goToAddTransaction = () => {
  router.push(`/transactions/add?customer=${customerId}`)
}

const handleMenuAction = ({ action, row }: { action: string; row: any }) => {
  if (action === 'detail') viewInvoice(row)
}

const invoiceColumns = [
  { key: 'transaction_number', label: 'NO. INVOICE', sortable: true, width: 'w-2/12' },
  { key: 'created_at', label: 'TANGGAL', sortable: true, width: 'w-2/12' },
  { key: 'total', label: 'TOTAL', sortable: true, width: 'w-2/12' },
  { key: 'remaining_amount', label: 'SISA', sortable: true, width: 'w-2/12' },
  { key: 'payment_method', label: 'PEMBAYARAN', sortable: true, width: 'w-2/12' },
  { key: 'status', label: 'STATUS', sortable: true, width: 'w-1/12' },
]

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value || 0)

const formatDate = (value: string) => {
  const date = new Date(value)
  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const formatPaymentMethod = (value: string) => {
  const methods: Record<string, string> = {
    tunai: 'Tunai',
    transfer: 'Transfer',
    qris: 'QRIS',
  }
  return methods[value] || value
}

onMounted(async () => {
  try {
    await Promise.all([
      customersStore.fetchCustomers(),
      transactionsStore.fetchTransactions(),
    ])
  } catch (error) {
    console.error('Error loading invoice data:', error)
    toast.error('Gagal!', 'Gagal memuat data customer dan transaksi')
  } finally {
    loading.value = false
  }
})
</script>
