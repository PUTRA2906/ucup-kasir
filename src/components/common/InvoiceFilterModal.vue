<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="isOpen"
        class="fixed inset-0 z-[9999] md:hidden"
        @click="close"
      >
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/50"></div>

        <!-- Modal Content -->
        <div
          class="absolute bottom-0 left-0 right-0 max-h-[90vh] rounded-t-2xl bg-white dark:bg-gray-900"
          @click.stop
        >
          <!-- Header -->
          <div class="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Filter Invoice</h2>
            <button
              @click="close"
              class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Filter Content -->
          <div class="overflow-y-auto px-6 py-4 space-y-4">
            <!-- Urutan -->
            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                Urutan
              </label>
              <div class="relative z-20 bg-transparent">
                <select
                  v-model="filters.sortOrder"
                  class="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-white px-4 py-2.5 pr-11 text-sm text-gray-800 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                >
                  <option value="newest">Terbaru</option>
                  <option value="oldest">Terlama</option>
                </select>
                <span class="absolute right-4 top-1/2 z-30 -translate-y-1/2 pointer-events-none text-gray-700 dark:text-gray-400">
                  <svg class="stroke-current" width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M4.79175 7.396L10.0001 12.6043L15.2084 7.396" stroke="" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                </span>
              </div>
            </div>

            <!-- Status Pembayaran -->
            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                Status Pembayaran
              </label>
              <div class="relative z-20 bg-transparent">
                <select
                  v-model="filters.paymentStatus"
                  class="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-white px-4 py-2.5 pr-11 text-sm text-gray-800 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                >
                  <option value="">Semua Status</option>
                  <option value="lunas">Lunas</option>
                  <option value="belum_lunas">Belum Lunas</option>
                </select>
                <span class="absolute right-4 top-1/2 z-30 -translate-y-1/2 pointer-events-none text-gray-700 dark:text-gray-400">
                  <svg class="stroke-current" width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M4.79175 7.396L10.0001 12.6043L15.2084 7.396" stroke="" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                </span>
              </div>
            </div>

            <!-- Metode Pembayaran -->
            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                Metode Pembayaran
              </label>
              <div class="relative z-20 bg-transparent">
                <select
                  v-model="filters.paymentMethod"
                  class="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-white px-4 py-2.5 pr-11 text-sm text-gray-800 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                >
                  <option value="">Semua Metode</option>
                  <option value="cash">Cash</option>
                  <option value="transfer">Transfer</option>
                  <option value="qris">QRIS</option>
                  <option value="tempo">Tempo</option>
                </select>
                <span class="absolute right-4 top-1/2 z-30 -translate-y-1/2 pointer-events-none text-gray-700 dark:text-gray-400">
                  <svg class="stroke-current" width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M4.79175 7.396L10.0001 12.6043L15.2084 7.396" stroke="" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                </span>
              </div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="border-t border-gray-200 px-6 py-4 space-y-3 dark:border-gray-700">
            <button
              @click="applyFilters"
              class="w-full rounded-lg bg-brand-500 py-3 text-sm font-medium text-white hover:bg-brand-600"
            >
              Terapkan Filter
            </button>
            <button
              @click="resetFilters"
              class="w-full rounded-lg bg-gray-100 py-3 text-sm font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Reset Filter
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

interface InvoiceFilterValues {
  sortOrder: string
  paymentStatus: string
  paymentMethod: string
  dateFrom: string
  dateTo: string
  minAmount: number | null
  maxAmount: number | null
}

interface Props {
  isOpen: boolean
  modelValue?: InvoiceFilterValues
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: () => ({
    sortOrder: 'newest',
    paymentStatus: '',
    paymentMethod: '',
    dateFrom: '',
    dateTo: '',
    minAmount: null,
    maxAmount: null
  })
})

const emit = defineEmits(['close', 'apply', 'update:modelValue'])

const filters = ref<InvoiceFilterValues>({ ...props.modelValue })

watch(() => props.modelValue, (newVal) => {
  filters.value = { ...newVal }
}, { deep: true })

const applyFilters = () => {
  emit('update:modelValue', filters.value)
  emit('apply', filters.value)
  emit('close')
}

const resetFilters = () => {
  filters.value = {
    sortOrder: 'newest',
    paymentStatus: '',
    paymentMethod: '',
    dateFrom: '',
    dateTo: '',
    minAmount: null,
    maxAmount: null
  }
  emit('update:modelValue', filters.value)
  emit('apply', filters.value)
}

const close = () => {
  emit('close')
}
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-active .absolute:last-child,
.modal-leave-active .absolute:last-child {
  transition: transform 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .absolute:last-child,
.modal-leave-to .absolute:last-child {
  transform: translateY(100%);
}
</style>
