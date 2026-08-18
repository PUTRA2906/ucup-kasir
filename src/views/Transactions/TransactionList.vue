<template>
  <AdminLayout>
    <PageBreadcrumb pageTitle="Daftar Transaksi" class="hidden md:block" />
    <div class="space-y-6 px-4 md:px-0">
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
