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
            class="w-full rounded-t-2xl border border-gray-200 bg-white p-6 shadow-xl sm:w-full sm:max-w-md sm:rounded-2xl dark:border-gray-800 dark:bg-gray-900"
          >
            <!-- Header -->
            <div class="mb-5 flex items-center justify-between">
              <div>
                <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Tambah Pembayaran</h2>
                <p class="text-xs text-gray-500 dark:text-gray-400">
                  {{ transactionNumber }} · Sisa cicilan: {{ formatCurrency(remaining) }}
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

            <form @submit.prevent="submit" class="space-y-5">
              <!-- Amount -->
              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                  Jumlah Dibayar <span class="text-error-500">*</span>
                </label>
                <input
                  ref="amountInputRef"
                  type="text"
                  inputmode="numeric"
                  :value="formatAmountInput(amountInput)"
                  @input="handleAmountInput"
                  placeholder="0"
                  class="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                />
                <p v-if="amount > remaining" class="mt-1.5 text-xs text-error-500">
                  Jumlah melebihi sisa cicilan (maks {{ formatCurrency(remaining) }})
                </p>
              </div>

              <!-- Quick amounts -->
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="quick in quickAmounts"
                  :key="quick"
                  type="button"
                  @click="setQuickAmount(quick)"
                  class="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-white/[0.03]"
                >
                  {{ formatCurrency(quick) }}
                </button>
              </div>

              <!-- Payment Method -->
              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                  Metode Pembayaran
                </label>
                <div class="grid grid-cols-3 gap-2">
                  <button
                    v-for="method in paymentMethods"
                    :key="method.value"
                    type="button"
                    @click="paymentMethod = method.value"
                    :class="[
                      'rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                      paymentMethod === method.value
                        ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400'
                    ]"
                  >
                    {{ method.label }}
                  </button>
                </div>
              </div>

              <!-- Notes -->
              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                  Catatan
                </label>
                <input
                  v-model="notes"
                  type="text"
                  placeholder="Catatan pembayaran (opsional)"
                  class="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                />
              </div>

              <!-- Actions -->
              <div class="flex gap-3 pt-1">
                <button
                  type="button"
                  @click="close"
                  class="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-white/[0.03]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  :disabled="isSubmitting || amount <= 0 || amount > remaining"
                  class="flex-1 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 focus:outline-hidden focus:ring-3 focus:ring-brand-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {{ isSubmitting ? 'Menyimpan...' : 'Simpan Pembayaran' }}
                </button>
              </div>
            </form>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'

interface Props {
  modelValue: boolean
  transactionNumber?: string
  remaining: number
}

const props = withDefaults(defineProps<Props>(), {
  transactionNumber: '',
  remaining: 0,
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  submit: [payload: { amount: number; payment_method: string; notes?: string }]
}>()

const isOpen = ref(props.modelValue)
const amountInput = ref('')
const paymentMethod = ref('tunai')
const notes = ref('')
const isSubmitting = ref(false)
const amountInputRef = ref<HTMLInputElement | null>(null)

const paymentMethods = [
  { value: 'tunai', label: 'Tunai' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'qris', label: 'QRIS' },
]

const amount = computed(() => parseInt(amountInput.value.replace(/\D/g, '')) || 0)

const formatAmountInput = (value: string) => {
  const numeric = value.replace(/\D/g, '')
  if (!numeric) return ''
  return parseInt(numeric, 10).toLocaleString('id-ID')
}

const handleAmountInput = (event: Event) => {
  const raw = (event.target as HTMLInputElement).value
  amountInput.value = raw.replace(/\D/g, '')
}

const quickAmounts = computed(() => {
  if (props.remaining <= 0) return []
  const full = props.remaining
  const half = Math.floor(full / 2)
  const third = Math.floor(full / 3)
  return [...new Set([third, half, full])].filter((v) => v > 0)
})

const setQuickAmount = (value: number) => {
  amountInput.value = value.toString()
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value || 0)

watch(
  () => props.modelValue,
  (newValue) => {
    isOpen.value = newValue
    if (newValue) {
      amountInput.value = props.remaining > 0 ? props.remaining.toString() : ''
      paymentMethod.value = 'tunai'
      notes.value = ''
      isSubmitting.value = false
      nextTick(() => {
        amountInputRef.value?.focus()
        amountInputRef.value?.setSelectionRange(
          amountInputRef.value.value.length,
          amountInputRef.value.value.length
        )
      })
    }
  }
)

const close = () => {
  emit('update:modelValue', false)
}

const submit = () => {
  if (isSubmitting.value || amount.value <= 0 || amount.value > props.remaining) return
  isSubmitting.value = true
  emit('submit', {
    amount: amount.value,
    payment_method: paymentMethod.value,
    notes: notes.value.trim() || undefined,
  })
}
</script>
