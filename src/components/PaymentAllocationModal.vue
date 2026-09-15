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
        v-if="modelValue"
        class="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm md:items-center"
        @click.self="close"
      >
        <Transition
          enter-active-class="transition-all duration-300 ease-out"
          enter-from-class="translate-y-full md:translate-y-0 md:scale-95 md:opacity-0"
          enter-to-class="translate-y-0 md:scale-100 md:opacity-100"
          leave-active-class="transition-all duration-200 ease-in"
          leave-from-class="translate-y-0 md:scale-100 md:opacity-100"
          leave-to-class="translate-y-full md:translate-y-0 md:scale-95 md:opacity-0"
        >
          <div
            v-if="modelValue"
            class="w-full max-w-2xl max-h-[90vh] overflow-hidden bg-white dark:bg-gray-900 md:rounded-2xl rounded-t-3xl shadow-2xl flex flex-col"
          >
            <!-- Header -->
            <div class="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-5 py-4">
              <div class="flex items-center justify-between">
                <div>
                  <h3 class="text-lg font-bold text-gray-900 dark:text-white">
                    Alokasi Pembayaran
                  </h3>
                  <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {{ paymentData?.notes || 'Atur pembayaran per item' }}
                  </p>
                </div>
                <button
                  @click="close"
                  class="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center justify-center"
                >
                  <svg class="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <!-- Content -->
            <div class="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              <!-- Loading State -->
              <div v-if="loading" class="flex items-center justify-center py-12">
                <div class="text-center">
                  <svg class="mx-auto h-10 w-10 animate-spin text-brand-500" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <p class="mt-3 text-sm text-gray-600 dark:text-gray-400">Memuat data...</p>
                </div>
              </div>

              <template v-else>
                <!-- Info Card -->
                <div class="bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800 rounded-xl p-4">
                  <div class="flex items-start gap-3">
                    <div class="w-10 h-10 rounded-lg bg-brand-500/10 border border-brand-500/20 flex items-center justify-center shrink-0">
                      <svg class="w-5 h-5 text-brand-600 dark:text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <div class="flex-1">
                      <p class="text-sm font-semibold text-brand-900 dark:text-brand-100">
                        Total Pembayaran
                      </p>
                      <p class="text-2xl font-bold text-brand-600 dark:text-brand-400 mt-1">
                        {{ formatCurrency(paymentAmount) }}
                      </p>
                      <p class="text-xs text-brand-600/70 dark:text-brand-400/70 mt-1">
                        {{ formatPaymentMethod(paymentData?.payment_method ?? '') }} • {{ formatDate(paymentData?.created_at ?? '') }}
                      </p>
                    </div>
                  </div>
                </div>

                <!-- Allocation Summary -->
                <div class="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 space-y-2">
                  <div class="flex justify-between items-center text-sm">
                    <span class="text-gray-600 dark:text-gray-400">Total Dialokasikan</span>
                    <span class="font-bold text-gray-900 dark:text-white">
                      {{ formatCurrency(totalAllocated) }}
                    </span>
                  </div>
                  <div class="flex justify-between items-center text-sm">
                    <span class="text-gray-600 dark:text-gray-400">Sisa Belum Dialokasikan</span>
                    <span
                      :class="[
                        'font-bold',
                        remaining < 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'
                      ]"
                    >
                      {{ formatCurrency(remaining) }}
                    </span>
                  </div>
                  
                  <!-- Progress Bar -->
                  <div class="mt-3">
                    <div class="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        :class="[
                          'h-full transition-all duration-300',
                          remaining < 0 ? 'bg-red-500' : 'bg-brand-500'
                        ]"
                        :style="{ width: `${Math.min((totalAllocated / paymentAmount) * 100, 100)}%` }"
                      ></div>
                    </div>
                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-1.5 text-center">
                      {{ Math.min(Math.round((totalAllocated / paymentAmount) * 100), 100) }}% Dialokasikan
                    </p>
                  </div>

                  <!-- Warning untuk over-allocation -->
                  <div v-if="remaining < 0" class="flex items-start gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mt-3">
                    <svg class="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div class="flex-1">
                      <p class="text-xs font-semibold text-red-700 dark:text-red-300">Total alokasi melebihi pembayaran</p>
                      <p class="text-xs text-red-600 dark:text-red-400 mt-0.5">Kurangi alokasi sebelum menyimpan</p>
                    </div>
                  </div>
                </div>

                <!-- Items List -->
                <div class="space-y-3">
                  <h4 class="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Alokasi ke Item ({{ items.length }})
                  </h4>

                  <div
                    v-for="(item, index) in items"
                    :key="item.item_id"
                    class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3"
                  >
                    <!-- Item Header -->
                    <div class="flex items-start justify-between gap-3">
                      <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2">
                          <span class="w-6 h-6 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-bold flex items-center justify-center shrink-0">
                            {{ index + 1 }}
                          </span>
                          <p class="text-sm font-semibold text-gray-900 dark:text-white truncate">
                            {{ item.product_name }}
                          </p>
                        </div>
                        <div class="flex items-center gap-3 mt-2 text-xs text-gray-500 dark:text-gray-400">
                          <span>Total: {{ formatCurrency(item.item_total) }}</span>
                          <span class="w-1 h-1 rounded-full bg-gray-400"></span>
                          <span>Terbayar: {{ formatCurrency(item.paid_amount) }}</span>
                        </div>
                      </div>
                      
                      <!-- Status Badge -->
                      <span
                        :class="[
                          'text-xs px-2.5 py-1 rounded-full font-semibold shrink-0',
                          item.payment_status === 'lunas'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                            : item.payment_status === 'sebagian'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                            : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                        ]"
                      >
                        {{ item.payment_status === 'lunas' ? 'Lunas' : item.payment_status === 'sebagian' ? 'Sebagian' : 'Belum Bayar' }}
                      </span>
                    </div>

                    <!-- Progress Bar per Item -->
                    <div>
                      <div class="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          class="h-full bg-brand-500 transition-all duration-300"
                          :style="{ width: `${Math.min((item.paid_amount / item.item_total) * 100, 100)}%` }"
                        ></div>
                      </div>
                    </div>

                    <!-- Allocation Input -->
                    <div class="space-y-2">
                      <label class="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center justify-between">
                        <span>Alokasi dari pembayaran ini:</span>
                        <span class="text-gray-500 dark:text-gray-400 font-normal">
                          Sisa: {{ formatCurrency(item.remaining_amount) }}
                        </span>
                      </label>
                      <div class="relative">
                        <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 text-sm">
                          Rp
                        </span>
                        <input
                          v-model.number="allocations[index]"
                          type="number"
                          inputmode="decimal"
                          :max="item.remaining_amount"
                          min="0"
                          step="1000"
                          class="w-full pl-10 pr-4 py-3 text-sm font-semibold text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                          :class="{
                            'border-red-300 dark:border-red-700 focus:ring-red-500': allocations[index] > item.remaining_amount
                          }"
                          @input="validateAllocation(index)"
                        />
                      </div>
                      
                      <!-- Quick Action Buttons -->
                      <div class="flex gap-2">
                        <button
                          v-if="item.remaining_amount > 0"
                          @click="allocateMax(index)"
                          class="flex-1 px-3 py-2 text-xs font-semibold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/20 hover:bg-brand-100 dark:hover:bg-brand-900/30 rounded-lg transition-colors"
                        >
                          Maksimal ({{ formatCurrency(item.remaining_amount) }})
                        </button>
                        <button
                          v-if="allocations[index] > 0"
                          @click="allocations[index] = 0"
                          class="px-3 py-2 text-xs font-semibold text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        >
                          Reset
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </template>
            </div>

            <!-- Footer Actions -->
            <div class="sticky bottom-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 px-5 py-4 space-y-3">
              <!-- Auto Allocate Button -->
              <button
                v-if="!loading && remaining > 0"
                @click="autoAllocate"
                class="w-full px-4 py-3 text-sm font-semibold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/20 hover:bg-brand-100 dark:hover:bg-brand-900/30 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Auto Alokasi (FIFO)
              </button>

              <!-- Action Buttons -->
              <div class="flex gap-3">
                <button
                  @click="close"
                  class="flex-1 px-4 py-3 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  @click="save"
                  :disabled="loading || remaining < 0 || saving"
                  class="flex-1 px-4 py-3 text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:text-gray-500 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <svg v-if="saving" class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>{{ saving ? 'Menyimpan...' : 'Simpan Alokasi' }}</span>
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
import { itemPaymentServiceAdapter as itemPaymentService } from '@/services'
import type { ItemPaymentSummary } from '@/services/itemPaymentService'

interface Props {
  modelValue: boolean
  paymentId: string
  transactionId: string
  paymentData?: {
    amount: number
    payment_method: string
    notes?: string
    created_at: string
  }
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'saved'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// State
const loading = ref(false)
const saving = ref(false)
const items = ref<ItemPaymentSummary[]>([])
const allocations = ref<number[]>([])

// Computed
const paymentAmount = computed(() => props.paymentData?.amount || 0)

const totalAllocated = computed(() => {
  return allocations.value.reduce((sum, amount) => sum + (amount || 0), 0)
})

const remaining = computed(() => {
  return paymentAmount.value - totalAllocated.value
})

// Watchers
watch(() => props.modelValue, async (isOpen) => {
  if (isOpen) {
    await loadData()
  }
})

// Methods
async function loadData() {
  loading.value = true
  try {
    // Get item summary for this transaction
    items.value = await itemPaymentService.getItemPaymentSummary(props.transactionId)
    
    // Get existing allocations for this payment
    const existingAllocations = await itemPaymentService.getAllocationsByPayment(props.paymentId)
    
    // Initialize allocation amounts
    allocations.value = items.value.map((item) => {
      const existing = existingAllocations.find((a) => a.item_id === item.item_id)
      return existing ? Number(existing.allocated_amount) : 0
    })
  } catch (error) {
    console.error('Error loading allocation data:', error)
    alert('Gagal memuat data alokasi')
  } finally {
    loading.value = false
  }
}

function validateAllocation(index: number) {
  const item = items.value[index]
  const allocation = allocations.value[index]
  
  // Cap allocation to remaining amount
  if (allocation > item.remaining_amount) {
    allocations.value[index] = item.remaining_amount
  }
  
  // Minimum 0
  if (allocation < 0) {
    allocations.value[index] = 0
  }
}

function allocateMax(index: number) {
  const item = items.value[index]
  const maxAllocatable = Math.min(item.remaining_amount, remaining.value + allocations.value[index])
  allocations.value[index] = maxAllocatable
}

function autoAllocate() {
  let remainingPayment = paymentAmount.value
  
  // Reset all allocations first
  allocations.value = items.value.map(() => 0)
  
  // FIFO: allocate to items in order
  items.value.forEach((item, index) => {
    if (remainingPayment <= 0) return
    
    const allocatable = Math.min(item.remaining_amount, remainingPayment)
    allocations.value[index] = allocatable
    remainingPayment -= allocatable
  })
}

async function save() {
  if (remaining.value < 0) {
    alert('Total alokasi melebihi jumlah pembayaran')
    return
  }
  
  saving.value = true
  try {
    // Build allocation input
    const allocationInput = items.value
      .map((item, index) => ({
        item_id: item.item_id,
        amount: allocations.value[index] || 0,
      }))
      .filter((a) => a.amount > 0) // Only send non-zero allocations
    
    // Call reallocate API
    await itemPaymentService.reallocatePayment(props.paymentId, allocationInput)
    
    emit('saved')
    close()
  } catch (error: any) {
    console.error('Error saving allocation:', error)
    alert(error.message || 'Gagal menyimpan alokasi')
  } finally {
    saving.value = false
  }
}

function close() {
  emit('update:modelValue', false)
}

// Utilities
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDate(date: string): string {
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date))
}

function formatPaymentMethod(method: string): string {
  const methods: Record<string, string> = {
    tunai: 'Tunai',
    transfer: 'Transfer',
    qris: 'QRIS',
    tempo: 'Tempo',
  }
  return methods[method] || method
}
</script>
