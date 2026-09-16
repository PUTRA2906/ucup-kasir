<template>
  <teleport to="body">
    <div v-if="modelValue" class="fixed inset-0 z-50 flex items-center justify-center p-4" @click.self="close">
      <div class="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
      <div class="relative w-full max-w-2xl rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-900">
        <!-- Header -->
        <div class="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-800">
          <h3 class="text-sm font-bold text-gray-900 dark:text-white">Pilih Transaksi</h3>
          <button @click="close" class="rounded-lg p-1 hover:bg-gray-100 dark:hover:bg-gray-800">
            <svg class="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Search -->
        <div class="p-4">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Cari nomor transaksi atau pelanggan..."
            class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-xs text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
        </div>

        <!-- List -->
        <div class="max-h-96 overflow-y-auto custom-scrollbar px-4 pb-4">
          <div v-if="filteredTransactions.length === 0" class="rounded-xl border border-dashed border-gray-300 py-8 text-center dark:border-gray-700">
            <p class="text-xs text-gray-500 dark:text-gray-400">Tidak ada transaksi ditemukan</p>
          </div>
          <div v-else class="space-y-2">
            <button
              v-for="tx in filteredTransactions"
              :key="tx.id"
              @click="selectTransaction(tx)"
              :class="[
                'w-full rounded-xl border p-3 text-left transition-colors',
                selectedIds.includes(tx.id)
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800'
              ]"
            >
              <div class="mb-1 flex items-center justify-between">
                <span class="text-xs font-semibold text-gray-900 dark:text-white">{{ tx.transaction_number || tx.id.slice(0, 8) }}</span>
                <span class="text-xs font-medium text-blue-600 dark:text-blue-400">{{ formatMoney(tx.total || 0) }}</span>
              </div>
              <div class="text-[11px] text-gray-600 dark:text-gray-400">
                {{ tx.customer_name || 'Pelanggan' }}
              </div>
              <div class="mt-1 text-[10px] text-gray-500 dark:text-gray-500">
                {{ formatDate(tx.created_at) }}
              </div>
            </button>
          </div>
        </div>

        <!-- Footer -->
        <div class="flex gap-2 border-t border-gray-200 p-4 dark:border-gray-800">
          <button @click="close" class="flex-1 rounded-xl border border-gray-300 bg-white py-2.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
            Batal
          </button>
          <button @click="confirm" class="flex-1 rounded-xl bg-blue-600 py-2.5 text-xs font-semibold text-white hover:bg-blue-500">
            Konfirmasi ({{ selectedIds.length }})
          </button>
        </div>
      </div>
    </div>
  </teleport>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Transaction, DeliveryOrder } from '@/types/database'

interface Props {
  modelValue: boolean
  transactions: Transaction[]
  initialSelected?: string[]
  deliveryOrders?: DeliveryOrder[]
  excludeCurrentDo?: boolean
  currentDoId?: string
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'confirm', ids: string[]): void
}

const props = withDefaults(defineProps<Props>(), {
  initialSelected: () => [],
  deliveryOrders: () => [],
  excludeCurrentDo: true,
  currentDoId: undefined
})

const emit = defineEmits<Emits>()

const searchQuery = ref('')
const selectedIds = ref<string[]>([...props.initialSelected])

// Kumpulkan ID transaksi yang sudah ada di surat jalan lain
const shippedTransactionIds = computed(() => {
  const shippedIds = new Set<string>()
  
  for (const dorder of props.deliveryOrders) {
    // Jika edit mode dan excludeCurrentDo true, skip DO yang sedang diedit
    if (props.excludeCurrentDo && props.currentDoId && dorder.id === props.currentDoId) {
      continue
    }
    
    const txIds = dorder.transaction_ids || []
    txIds.forEach((id) => shippedIds.add(id))
  }
  
  return shippedIds
})

// Transaksi yang belum shipped (kecuali yang sudah dipilih/ada di DO saat ini)
const availableTransactions = computed(() => {
  return props.transactions.filter(tx => {
    // Skip transaksi void/batal
    if (tx.status === 'void' || tx.status === 'batal') return false
    
    // Jika sudah di initial selected (dari DO yang sedang diedit), tampilkan
    if (props.initialSelected.includes(tx.id)) return true
    
    // Jika sudah shipped, jangan tampilkan
    if (shippedTransactionIds.value.has(tx.id)) return false
    
    return true
  })
})

const filteredTransactions = computed(() => {
  const q = searchQuery.value.toLowerCase()
  if (!q) return availableTransactions.value
  return availableTransactions.value.filter(tx =>
    (tx.transaction_number || '').toLowerCase().includes(q) ||
    (tx.customer_name || '').toLowerCase().includes(q)
  )
})

const formatMoney = (n: number) => 'Rp ' + new Intl.NumberFormat('id-ID').format(n || 0)

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr)
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

const selectTransaction = (tx: Transaction) => {
  const idx = selectedIds.value.indexOf(tx.id)
  if (idx > -1) {
    selectedIds.value.splice(idx, 1)
  } else {
    selectedIds.value.push(tx.id)
  }
}

const close = () => {
  emit('update:modelValue', false)
}

const confirm = () => {
  emit('confirm', selectedIds.value)
  close()
}
</script>
