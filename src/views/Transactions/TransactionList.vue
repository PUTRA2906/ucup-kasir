<template>
  <AdminLayout>
    <PageBreadcrumb pageTitle="Daftar Transaksi" class="hidden md:block" />

    <!-- Mobile Header -->
    <div class="mb-4 flex items-center justify-between md:hidden">
      <div class="flex items-center gap-2.5">
        <button
          @click="router.push('/')"
          class="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-white/[0.03]"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 class="text-lg font-extrabold leading-tight text-gray-900 dark:text-white">Daftar Transaksi</h1>
          <p class="text-[10px] text-gray-500 dark:text-gray-400">{{ transactionsStore.transactions.length }} Transaksi</p>
        </div>
      </div>
      <button
        @click="addTransaction"
        class="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white shadow-lg hover:bg-blue-500"
      >
        <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Transaksi Baru
      </button>
    </div>

    <!-- Mobile Cards -->
    <div class="space-y-3 pb-4 md:hidden">
      <div
        v-for="transaction in paginatedTransactions"
        :key="transaction.id"
        class="rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm dark:border-gray-800 dark:bg-gray-900"
      >
        <div class="flex items-start justify-between">
          <div class="flex-1 min-w-0" @click="viewTransaction(transaction)">
            <p class="text-xs font-bold text-blue-600 dark:text-blue-400">{{ transaction.transaction_number }}</p>
            <p class="text-[10px] text-gray-500 dark:text-gray-400">{{ formatDate(transaction.created_at) }}</p>
          </div>
          <div class="flex items-center gap-2 flex-shrink-0">
            <span
              :class="[
                'rounded-full px-2 py-0.5 text-[10px] font-medium',
                transaction.status === 'selesai'
                  ? 'bg-success-100 text-success-700 dark:bg-success-900 dark:text-success-400'
                  : 'bg-error-100 text-error-700 dark:bg-error-900 dark:text-error-400'
              ]"
            >
              {{ transaction.status === 'selesai' ? 'Selesai' : 'Batal' }}
            </span>
            <button
              @click.stop="toggleExpand(transaction.id)"
              class="rounded-lg p-1 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              <svg
                class="h-4 w-4 transition-transform"
                :class="{ 'rotate-180': expandedCards.includes(transaction.id) }"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Collapsed View -->
        <div v-if="!expandedCards.includes(transaction.id)" @click="viewTransaction(transaction)" class="mt-2">
          <div class="flex items-center justify-between">
            <p class="text-xs font-medium text-gray-900 dark:text-white">{{ transaction.customer_name || 'Tanpa customer' }}</p>
            <p class="text-sm font-bold text-gray-900 dark:text-white">{{ formatCurrency(transaction.total) }}</p>
          </div>
        </div>

        <!-- Expanded View -->
        <div v-else class="mt-2 space-y-2">
          <div class="border-t border-gray-100 pt-2 dark:border-gray-800">
            <p class="text-xs font-medium text-gray-900 dark:text-white">{{ transaction.customer_name || 'Tanpa customer' }}</p>
            <p class="text-[10px] text-gray-500 dark:text-gray-400">{{ formatPaymentMethod(transaction.payment_method) }}</p>
          </div>

          <div class="flex items-center justify-between border-t border-gray-100 pt-2 dark:border-gray-800">
            <div>
              <p class="text-[10px] text-gray-500 dark:text-gray-400">Total</p>
              <p class="text-sm font-bold text-gray-900 dark:text-white">{{ formatCurrency(transaction.total) }}</p>
            </div>
            <div class="text-right">
              <span
                :class="[
                  'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium',
                  transaction.payment_status === 'lunas'
                    ? 'bg-success-100 text-success-700 dark:bg-success-900 dark:text-success-400'
                    : 'bg-warning-100 text-warning-700 dark:bg-warning-900 dark:text-warning-400'
                ]"
              >
                {{ transaction.payment_status === 'lunas' ? 'Lunas' : 'Belum Lunas' }}
              </span>
              <p v-if="transaction.remaining_amount > 0" class="mt-1 text-xs font-medium text-warning-600 dark:text-warning-400">
                Sisa: {{ formatCurrency(transaction.remaining_amount) }}
              </p>
            </div>
          </div>

          <div class="flex items-center gap-2 border-t border-gray-100 pt-2 dark:border-gray-800">
            <button
              @click.stop="viewTransaction(transaction)"
              class="flex flex-1 items-center justify-center gap-1 rounded-lg border border-gray-300 bg-white py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Detail
            </button>
            <button
              v-if="transaction.status === 'selesai'"
              @click.stop="voidTransaction(transaction)"
              class="flex flex-1 items-center justify-center gap-1 rounded-lg border border-error-500 bg-transparent py-1.5 text-xs font-medium text-error-600 hover:bg-error-50 dark:text-error-400 dark:hover:bg-error-500/15"
            >
              <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
              Batalkan
            </button>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="transactionsStore.transactions.length === 0" class="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center dark:border-gray-700 dark:bg-gray-800">
        <p class="text-xs font-medium text-gray-500 dark:text-gray-400">Belum ada transaksi</p>
        <p class="text-[10px] text-gray-400 dark:text-gray-500">Klik "Transaksi Baru" untuk membuat transaksi pertama</p>
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
        <button
          @click="currentPage--"
          :disabled="currentPage === 1"
          class="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed dark:text-gray-300 dark:hover:bg-gray-800"
        >
          <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
          Prev
        </button>
        <span class="text-xs font-medium text-gray-600 dark:text-gray-400">
          Hal {{ currentPage }} dari {{ totalPages }}
        </span>
        <button
          @click="currentPage++"
          :disabled="currentPage === totalPages"
          class="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed dark:text-gray-300 dark:hover:bg-gray-800"
        >
          Next
          <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Desktop DataTable -->
    <div class="hidden space-y-6 px-4 md:block md:px-0">
      <!-- DataTable -->
      <DataTable
        :columns="columns"
        :data="transactionsStore.transactions"
        :per-page="10"
        :searchable="true"
        :show-add-button="true"
        add-button-text="Transaksi Baru"
        title="Daftar Transaksi"
        :subtitle="`${settingsStore.storeSubtitle} - ${transactionsStore.transactions.length} Transaksi`"
        @add-click="addTransaction"
        @menu-action="handleMenuAction"
      >
        <template #header-checkbox>
          <div class="flex items-center gap-2">
            <input
              ref="selectAllCheckbox"
              type="checkbox"
              :checked="allSelected"
              @change="toggleSelectAll"
              class="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
            />
          </div>
        </template>

        <template #mobile-header>
          <div class="flex items-center gap-3">
            <input
              type="checkbox"
              :checked="allSelected"
              @change="toggleSelectAll"
              class="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
            />
            <span class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              No. Transaksi
            </span>
          </div>
        </template>

        <template #cell-checkbox="{ row }">
          <input
            type="checkbox"
            v-model="selectedTransactions"
            :value="row.id"
            class="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
          />
        </template>

        <template #actions>
          <div v-if="selectedTransactions.length > 0" class="flex items-center gap-2">
            <span class="text-sm text-gray-600 dark:text-gray-400">
              {{ selectedTransactions.length }} dipilih
            </span>
            <button
              @click="bulkVoid"
              class="rounded-lg bg-error-500 px-4 py-2 text-sm font-medium text-white hover:bg-error-600"
            >
              Batalkan
            </button>
          </div>
        </template>

        <template #cell-transaction_number="{ value }">
          <span class="font-medium text-brand-600 dark:text-brand-400">{{ value }}</span>
        </template>

        <template #cell-customer_name="{ value }">
          <span v-if="value" class="text-gray-800 dark:text-white/90">{{ value }}</span>
          <span v-else class="text-gray-400 dark:text-gray-600">-</span>
        </template>

        <template #cell-total="{ value }">
          <span class="font-medium text-gray-900 dark:text-white">{{ formatCurrency(value) }}</span>
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

        <template #cell-remaining_amount="{ value, row }">
          <span v-if="row.remaining_amount > 0" class="font-medium text-warning-600 dark:text-warning-400">
            {{ formatCurrency(value) }}
          </span>
          <span v-else class="text-gray-400 dark:text-gray-600">-</span>
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

        <template #cell-created_at="{ value }">
          <span class="text-gray-600 dark:text-gray-400">{{ formatDate(value) }}</span>
        </template>

        <template #mobile-summary="{ row }">
          <div class="flex items-center gap-3 min-w-0 flex-1">
            <input
              type="checkbox"
              v-model="selectedTransactions"
              :value="row.id"
              class="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500 flex-shrink-0"
              @click.stop
            />
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium text-gray-900 truncate dark:text-white">
                {{ row.transaction_number }}
              </p>
              <p class="text-xs text-gray-500 truncate dark:text-gray-400">
                {{ row.customer_name || 'Tanpa customer' }} · {{ formatPaymentMethod(row.payment_method) }}
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
          </div>
        </template>

        <template #rowActions="{ row }">
          <div class="flex items-center gap-2">
            <button
              @click="viewTransaction(row)"
              class="rounded-lg p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/[0.03]"
              title="Detail"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
            </button>
            <button
              @click="voidTransaction(row)"
              class="rounded-lg p-2 text-error-600 hover:bg-error-50 dark:text-error-500 dark:hover:bg-error-500/15"
              title="Batalkan"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                />
              </svg>
            </button>
          </div>
        </template>
      </DataTable>
    </div>

    <!-- Void Confirmation Dialog -->
    <ConfirmDialog
      v-model="showVoidDialog"
      title="Batalkan Transaksi?"
      :message="`Apakah Anda yakin ingin membatalkan transaksi '${transactionToVoid?.transaction_number}'? Stok produk akan dikembalikan dan transaksi ditandai 'batal'. Riwayat tetap tersimpan.`"
      confirm-text="Ya, Batalkan"
      cancel-text="Tutup"
      variant="danger"
      @confirm="confirmVoid"
    />

    <!-- Bulk Void Confirmation Dialog -->
    <ConfirmDialog
      v-model="showBulkVoidDialog"
      title="Batalkan Transaksi Terpilih?"
      :message="`Apakah Anda yakin ingin membatalkan ${selectedTransactions.length} transaksi terpilih? Stok produk akan dikembalikan dan transaksi ditandai 'batal'. Riwayat tetap tersimpan.`"
      confirm-text="Ya, Batalkan Semua"
      cancel-text="Tutup"
      variant="danger"
      @confirm="confirmBulkVoid"
    />
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, computed, watchEffect, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import DataTable from '@/components/tables/DataTable.vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import { useTransactionsStore } from '@/stores/transactions'
import { useStoreSettingsStore } from '@/stores/storeSettings'
import { useToast } from '@/composables/useToast'

const router = useRouter()
const transactionsStore = useTransactionsStore()
const settingsStore = useStoreSettingsStore()
const toast = useToast()

const showVoidDialog = ref(false)
const showBulkVoidDialog = ref(false)
const transactionToVoid = ref<any>(null)
const selectedTransactions = ref<string[]>([])
const selectAllCheckbox = ref<HTMLInputElement | null>(null)
const expandedCards = ref<string[]>([])
const currentPage = ref(1)
const perPage = 10

const paginatedTransactions = computed(() => {
  const start = (currentPage.value - 1) * perPage
  const end = start + perPage
  return transactionsStore.transactions.slice(start, end)
})

const totalPages = computed(() => {
  return Math.ceil(transactionsStore.transactions.length / perPage)
})

const toggleExpand = (id: string) => {
  const index = expandedCards.value.indexOf(id)
  if (index > -1) {
    expandedCards.value.splice(index, 1)
  } else {
    expandedCards.value.push(id)
  }
}

const allSelected = computed(() => {
  return transactionsStore.transactions.length > 0 && selectedTransactions.value.length === transactionsStore.transactions.length
})

const someSelected = computed(() => {
  return selectedTransactions.value.length > 0 && selectedTransactions.value.length < transactionsStore.transactions.length
})

watchEffect(() => {
  if (selectAllCheckbox.value) {
    selectAllCheckbox.value.indeterminate = someSelected.value
  }
})

const toggleSelectAll = () => {
  if (allSelected.value) {
    selectedTransactions.value = []
  } else {
    selectedTransactions.value = transactionsStore.transactions.map(t => t.id)
  }
}

const columns = [
  { key: 'checkbox', label: 'Pilih', width: 'w-1/12' },
  { key: 'transaction_number', label: 'NO. TRANSAKSI', sortable: true, width: 'w-2/12' },
  { key: 'created_at', label: 'TANGGAL', sortable: true, width: 'w-2/12' },
  { key: 'customer_name', label: 'CUSTOMER', sortable: true, width: 'w-2/12' },
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

const formatPaymentMethod = (value: string) => {
  const methods: Record<string, string> = {
    tunai: 'Tunai',
    transfer: 'Transfer',
    qris: 'QRIS',
  }
  return methods[value] || value
}

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

onMounted(async () => {
  try {
    await transactionsStore.fetchTransactions()
  } catch (error) {
    console.error('Error loading transactions:', error)
    toast.error('Gagal!', 'Gagal memuat data transaksi')
  }
})

const addTransaction = () => {
  router.push('/transactions/add')
}

const viewTransaction = (transaction: any) => {
  router.push(`/transactions/${transaction.id}`)
}

const voidTransaction = (transaction: any) => {
  transactionToVoid.value = transaction
  showVoidDialog.value = true
}

const confirmVoid = async () => {
  if (!transactionToVoid.value) return

  try {
    await transactionsStore.voidTransaction(transactionToVoid.value.id)
    toast.success('Berhasil!', 'Transaksi berhasil dibatalkan')
  } catch (error) {
    console.error('Error voiding transaction:', error)
    toast.error('Gagal!', 'Gagal membatalkan transaksi')
  } finally {
    transactionToVoid.value = null
  }
}

const bulkVoid = () => {
  showBulkVoidDialog.value = true
}

const confirmBulkVoid = async () => {
  const count = selectedTransactions.value.length
  try {
    await Promise.all(
      selectedTransactions.value.map(id => transactionsStore.voidTransaction(id))
    )
    selectedTransactions.value = []
    toast.success('Berhasil!', `${count} transaksi berhasil dibatalkan`)
  } catch (error) {
    console.error('Error voiding transactions:', error)
    toast.error('Gagal!', 'Gagal membatalkan beberapa transaksi')
  }
}

const handleMenuAction = ({ action, row }: { action: string; row: any }) => {
  switch (action) {
    case 'detail':
      viewTransaction(row)
      break
    case 'delete':
      voidTransaction(row)
      break
  }
}
</script>
