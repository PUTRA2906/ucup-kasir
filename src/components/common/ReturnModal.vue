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
            class="w-full rounded-t-2xl border border-gray-200 bg-white p-6 shadow-xl sm:w-full sm:max-w-lg sm:rounded-2xl dark:border-gray-800 dark:bg-gray-900"
          >
            <!-- Header -->
            <div class="mb-4 flex items-center justify-between">
              <div>
                <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Retur Barang</h2>
                <p class="text-xs text-gray-500 dark:text-gray-400">
                  {{ transactionNumber }} · Pilih item yang akan diretur
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

            <!-- Items -->
            <div class="max-h-72 space-y-3 overflow-y-auto pr-1">
              <div
                v-for="item in items"
                :key="item.product_id"
                class="rounded-lg border border-gray-200 p-3 dark:border-gray-700"
              >
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <p class="truncate text-sm font-medium text-gray-900 dark:text-white">{{ item.product_name }}</p>
                    <p class="text-xs text-gray-500 dark:text-gray-400">{{ formatCurrency(item.price) }}</p>
                    <p v-if="item.max <= 0" class="mt-0.5 text-[11px] text-success-600 dark:text-success-400">
                      Sudah diretur semua
                    </p>
                    <p v-else class="text-[11px] text-gray-400 dark:text-gray-500">Sisa bisa diretur: {{ item.max }}</p>
                  </div>
                  <div class="flex flex-shrink-0 items-center gap-2">
                    <button
                      type="button"
                      @click="decrease(item)"
                      :disabled="(quantities[item.product_id] || 0) <= 0"
                      class="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-white/[0.03]"
                    >
                      −
                    </button>
                    <span class="w-8 text-center text-sm font-semibold text-gray-900 dark:text-white">
                      {{ quantities[item.product_id] || 0 }}
                    </span>
                    <button
                      type="button"
                      @click="increase(item)"
                      :disabled="(quantities[item.product_id] || 0) >= item.max"
                      class="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-white/[0.03]"
                    >
                      +
                    </button>
                  </div>
                </div>
                <div class="mt-2 flex items-center justify-between text-xs">
                  <span class="text-gray-500 dark:text-gray-400">Subtotal retur</span>
                  <span class="font-semibold text-gray-900 dark:text-white">{{ formatCurrency(subtotalOf(item)) }}</span>
                </div>
              </div>
              <p v-if="items.length === 0" class="py-6 text-center text-sm text-gray-400 dark:text-gray-500">
                Tidak ada item yang bisa diretur
              </p>
            </div>

            <!-- Total Refund -->
            <div class="mt-4 flex items-center justify-between border-t border-gray-200 pt-3 dark:border-gray-700">
              <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Total Refund</span>
              <span class="text-lg font-bold text-brand-600 dark:text-brand-400">{{ formatCurrency(totalRefund) }}</span>
            </div>

            <!-- Notes -->
            <div class="mt-4">
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Catatan</label>
              <input
                v-model="notes"
                type="text"
                placeholder="Catatan retur (opsional)"
                class="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
              />
            </div>

            <!-- Actions -->
            <div class="mt-5 flex gap-3">
              <button
                type="button"
                @click="close"
                class="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-white/[0.03]"
              >
                Batal
              </button>
              <button
                type="button"
                @click="submit"
                :disabled="isSubmitting || totalRefund <= 0"
                class="flex-1 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 focus:outline-hidden focus:ring-3 focus:ring-brand-500/30 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {{ isSubmitting ? 'Menyimpan...' : 'Simpan Retur' }}
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'

export interface ReturnableItem {
  product_id: string
  product_name: string
  price: number
  max: number
}

interface Props {
  modelValue: boolean
  transactionNumber?: string
  items: ReturnableItem[]
}

const props = withDefaults(defineProps<Props>(), {
  transactionNumber: '',
  items: () => [],
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  submit: [payload: { items: { product_id: string; quantity: number }[]; notes?: string }]
}>()

const isOpen = ref(props.modelValue)
const quantities = reactive<Record<string, number>>({})
const notes = ref('')
const isSubmitting = ref(false)

const totalRefund = computed(() =>
  props.items.reduce((sum, item) => {
    const qty = quantities[item.product_id] || 0
    return sum + item.price * qty
  }, 0)
)

const subtotalOf = (item: ReturnableItem) => {
  const qty = quantities[item.product_id] || 0
  return item.price * qty
}

const increase = (item: ReturnableItem) => {
  const current = quantities[item.product_id] || 0
  if (current < item.max) {
    quantities[item.product_id] = current + 1
  }
}

const decrease = (item: ReturnableItem) => {
  const current = quantities[item.product_id] || 0
  if (current > 0) {
    quantities[item.product_id] = current - 1
  }
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
      props.items.forEach((item) => {
        quantities[item.product_id] = 0
      })
      notes.value = ''
      isSubmitting.value = false
    }
  }
)

const close = () => {
  emit('update:modelValue', false)
}

const submit = () => {
  if (isSubmitting.value || totalRefund.value <= 0) return
  const items = props.items
    .map((item) => ({
      product_id: item.product_id,
      quantity: quantities[item.product_id] || 0,
    }))
    .filter((item) => item.quantity > 0)

  if (items.length === 0) return

  isSubmitting.value = true
  emit('submit', {
    items,
    notes: notes.value.trim() || undefined,
  })
}
</script>
