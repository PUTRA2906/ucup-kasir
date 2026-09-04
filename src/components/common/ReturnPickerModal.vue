<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isOpen"
        class="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
        @click.self="close"
      >
        <Transition
          enter-active-class="transition-all duration-200 ease-out"
          enter-from-class="translate-y-full opacity-0 sm:translate-y-0 sm:scale-95"
          enter-to-class="translate-y-0 opacity-100 sm:scale-100"
          leave-active-class="transition-all duration-150 ease-in"
          leave-from-class="translate-y-0 opacity-100 sm:scale-100"
          leave-to-class="translate-y-full opacity-0 sm:translate-y-0 sm:scale-95"
        >
          <div
            v-if="isOpen"
            class="flex h-[90vh] w-full flex-col rounded-t-2xl border border-gray-200 bg-white shadow-xl sm:h-auto sm:max-h-[85vh] sm:w-full sm:max-w-2xl sm:rounded-2xl dark:border-gray-800 dark:bg-gray-900"
          >
            <!-- Header -->
            <div class="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
              <div>
                <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Klaim Retur</h2>
                <p class="text-xs text-gray-500 dark:text-gray-400">
                  Pilih item dari transaksi lama yang akan diretur
                </p>
              </div>
              <button
                @click="close"
                class="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/[0.03] dark:hover:text-gray-300"
              >
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <!-- Loading -->
            <div v-if="loading" class="flex items-center justify-center py-12">
              <div class="text-center">
                <svg class="mx-auto h-8 w-8 animate-spin text-brand-500" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p class="mt-3 text-sm text-gray-500 dark:text-gray-400">Memuat transaksi...</p>
              </div>
            </div>

            <!-- Empty State -->
            <div v-else-if="customerTransactions.length === 0" class="py-12 text-center">
              <svg class="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p class="mt-3 text-sm text-gray-500 dark:text-gray-400">
                Belum ada transaksi selesai untuk customer ini
              </p>
            </div>

            <!-- Transaction List -->
            <div v-else class="flex-1 overflow-y-auto px-6 py-4">
              <div class="space-y-4">
                <div
                  v-for="transaction in customerTransactions"
                  :key="transaction.id"
                  class="rounded-xl border border-gray-200 dark:border-gray-700"
                >
                  <!-- Transaction Header -->
                  <div class="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-700">
                    <div>
                      <p class="text-sm font-semibold text-gray-900 dark:text-white">
                        {{ transaction.transaction_number }}
                      </p>
                      <p class="text-xs text-gray-500 dark:text-gray-400">
                        {{ formatDate(transaction.created_at) }}
                      </p>
                    </div>
                    <div class="text-right">
                      <p class="text-sm font-semibold text-gray-900 dark:text-white">
                        {{ formatCurrency(transaction.total) }}
                      </p>
                      <span
                        :class="[
                          'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium',
                          transaction.payment_status === 'lunas'
                            ? 'bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-400'
                            : 'bg-warning-50 text-warning-600 dark:bg-warning-500/10 dark:text-warning-400'
                        ]"
                      >
                        {{ transaction.payment_status === 'lunas' ? 'Lunas' : 'Belum Lunas' }}
                      </span>
                    </div>
                  </div>

                  <!-- Transaction Items -->
                  <div class="divide-y divide-gray-100 dark:divide-gray-800">
                    <div
                      v-for="item in (transaction.items || []).filter(i => i.product_id)"
                      :key="item.id"
                      class="flex items-center gap-3 px-4 py-3"
                    >
                      <!-- Checkbox -->
                      <input
                        type="checkbox"
                        :checked="isSelected(transaction.id, item.product_id!)"
                        @change="toggleItem(transaction, item)"
                        :disabled="getAvailableQty(transaction.id, item.product_id!) <= 0"
                        class="h-4 w-4 flex-shrink-0 rounded border-gray-300 text-brand-500 focus:ring-brand-500 disabled:cursor-not-allowed"
                      />

                      <!-- Item Info -->
                      <div class="min-w-0 flex-1">
                        <p class="text-sm font-medium text-gray-900 dark:text-white">
                          {{ item.product_name }}
                        </p>
                        <p class="text-xs text-gray-500 dark:text-gray-400">
                          {{ formatCurrency(item.price) }} × {{ item.quantity }} = {{ formatCurrency(item.subtotal) }}
                        </p>
                      </div>

                      <!-- Quantity Selector (when selected) -->
                      <div v-if="isSelected(transaction.id, item.product_id!)" class="flex items-center gap-2">
                        <button
                          type="button"
                          @click="decreaseReturnQty(transaction.id, item.product_id!)"
                          :disabled="getReturnQty(transaction.id, item.product_id!) <= 1"
                          class="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-400"
                        >
                          <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
                          </svg>
                        </button>
                        <span class="w-8 text-center text-sm font-medium text-gray-900 dark:text-white">
                          {{ getReturnQty(transaction.id, item.product_id!) }}
                        </span>
                        <button
                          type="button"
                          @click="increaseReturnQty(transaction.id, item.product_id!)"
                          :disabled="getReturnQty(transaction.id, item.product_id!) >= getAvailableQty(transaction.id, item.product_id!)"
                          class="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-400"
                        >
                          <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                          </svg>
                        </button>
                      </div>

                      <!-- Max Available -->
                      <span v-else class="text-xs text-gray-400 dark:text-gray-500">
                        Stok: {{ getAvailableQty(transaction.id, item.product_id!) }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Footer -->
            <div class="border-t border-gray-200 px-6 py-4 dark:border-gray-700">
              <!-- Return Summary -->
              <div v-if="selectedItems.length > 0" class="mb-4 rounded-lg bg-error-50 p-3 dark:bg-error-500/10">
                <div class="flex items-center justify-between">
                  <span class="text-sm font-medium text-error-700 dark:text-error-400">
                    {{ selectedItems.length }} item dipilih untuk diretur
                  </span>
                  <span class="text-sm font-bold text-error-600 dark:text-error-400">
                    - {{ formatCurrency(totalReturnAmount) }}
                  </span>
                </div>
              </div>

              <div class="flex gap-3">
                <button
                  @click="close"
                  class="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-white/[0.03]"
                >
                  Batal
                </button>
                <button
                  @click="confirmSelection"
                  :disabled="selectedItems.length === 0"
                  class="flex-1 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 focus:outline-hidden focus:ring-3 focus:ring-brand-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Terapkan Retur (- {{ formatCurrency(totalReturnAmount) }})
                </button>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useTransactionsStore } from '@/stores/transactions'
import type { Transaction, TransactionItem } from '@/types/database'

interface ReturnSelection {
  transaction_id: string
  transaction_number: string
  product_id: string
  product_name: string
  price: number
  quantity: number
  subtotal: number
}

interface Props {
  modelValue: boolean
  customerId: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: [items: ReturnSelection[]]
}>()

const transactionsStore = useTransactionsStore()
const isOpen = ref(props.modelValue)
const loading = ref(false)
const customerTransactions = ref<Transaction[]>([])

// Map: `${transactionId}_${productId}` -> quantity to return
const selectedItemsMap = ref<Map<string, number>>(new Map())

// Map: `${transactionId}_${productId}` -> max available (original qty - already returned)
const maxAvailableMap = ref<Map<string, number>>(new Map())

watch(
  () => props.modelValue,
  async (newValue) => {
    isOpen.value = newValue
    if (newValue && props.customerId) {
      loading.value = true
      selectedItemsMap.value = new Map()
      maxAvailableMap.value = new Map()
      try {
        const txs = await transactionsStore.getTransactionsByCustomer(props.customerId)
        // Filter to only transactions that have items
        customerTransactions.value = txs.filter((t) => t.items && t.items.length > 0)
        // Set max available for each item
        customerTransactions.value.forEach((tx) => {
          tx.items?.forEach((item) => {
            const key = `${tx.id}_${item.product_id}`
            maxAvailableMap.value.set(key, item.quantity)
          })
        })
      } catch (error) {
        console.error('Error loading customer transactions:', error)
      } finally {
        loading.value = false
      }
    }
  }
)

const selectedItems = computed(() => {
  const result: ReturnSelection[] = []
  customerTransactions.value.forEach((tx) => {
    tx.items?.forEach((item) => {
      if (!item.product_id) return
      const key = `${tx.id}_${item.product_id}`
      const qty = selectedItemsMap.value.get(key)
      if (qty && qty > 0) {
        result.push({
          transaction_id: tx.id,
          transaction_number: tx.transaction_number,
          product_id: item.product_id,
          product_name: item.product_name,
          price: item.price,
          quantity: qty,
          subtotal: item.price * qty,
        })
      }
    })
  })
  return result
})

const totalReturnAmount = computed(() =>
  selectedItems.value.reduce((sum, item) => sum + item.subtotal, 0)
)

const isSelected = (transactionId: string, productId: string) => {
  return selectedItemsMap.value.has(`${transactionId}_${productId}`)
}

const getReturnQty = (transactionId: string, productId: string) => {
  return selectedItemsMap.value.get(`${transactionId}_${productId}`) || 0
}

const getAvailableQty = (transactionId: string, productId: string) => {
  return maxAvailableMap.value.get(`${transactionId}_${productId}`) || 0
}

const toggleItem = (transaction: Transaction, item: TransactionItem) => {
  const key = `${transaction.id}_${item.product_id}`
  if (selectedItemsMap.value.has(key)) {
    selectedItemsMap.value.delete(key)
  } else {
    selectedItemsMap.value.set(key, 1)
  }
}

const increaseReturnQty = (transactionId: string, productId: string) => {
  const key = `${transactionId}_${productId}`
  const current = selectedItemsMap.value.get(key) || 0
  const max = maxAvailableMap.value.get(key) || 0
  if (current < max) {
    selectedItemsMap.value.set(key, current + 1)
  }
}

const decreaseReturnQty = (transactionId: string, productId: string) => {
  const key = `${transactionId}_${productId}`
  const current = selectedItemsMap.value.get(key) || 0
  if (current > 1) {
    selectedItemsMap.value.set(key, current - 1)
  } else {
    selectedItemsMap.value.delete(key)
  }
}

const confirmSelection = () => {
  emit('confirm', selectedItems.value)
  close()
}

const close = () => {
  emit('update:modelValue', false)
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value || 0)

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}
</script>
