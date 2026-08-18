<template>
  <Teleport to="body">
    <div
      v-if="modelValue"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      @click.self="close"
    >
      <div class="w-full max-w-2xl rounded-xl bg-white shadow-xl dark:bg-gray-800">
        <!-- Header -->
        <div class="flex items-center justify-between border-b border-gray-200 p-6 dark:border-white/[0.08]">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
            Penyesuaian Stok
          </h3>
          <button
            @click="close"
            class="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500 dark:hover:bg-white/[0.05]"
          >
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <!-- Body -->
        <div class="max-h-[calc(100vh-200px)] overflow-y-auto p-6">
          <form @submit.prevent="handleSubmit" class="space-y-6">
            <!-- Pilih Produk -->
            <div v-if="!product">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Pilih Produk <span class="text-error-500">*</span>
              </label>
              <button
                type="button"
                @click="showProductPicker = true"
                class="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-left hover:border-brand-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-white/[0.08] dark:bg-white/[0.05] dark:text-white"
              >
                <span v-if="selectedProduct" class="text-gray-900 dark:text-white">
                  {{ selectedProduct.name }} (Stok: {{ selectedProduct.stock }})
                </span>
                <span v-else class="text-gray-500">Pilih produk...</span>
              </button>
            </div>

            <!-- Info Produk (jika product prop ada) -->
            <div v-else class="rounded-lg bg-gray-50 p-4 dark:bg-white/[0.03]">
              <div class="flex items-center justify-between">
                <div>
                  <p class="font-medium text-gray-900 dark:text-white">{{ product.name }}</p>
                  <p class="text-sm text-gray-600 dark:text-gray-400">SKU: {{ product.sku }}</p>
                </div>
                <div class="text-right">
                  <p class="text-sm text-gray-600 dark:text-gray-400">Stok Saat Ini</p>
                  <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ product.stock }}</p>
                </div>
              </div>
            </div>

            <!-- Tipe Penyesuaian -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Tipe Penyesuaian <span class="text-error-500">*</span>
              </label>
              <div class="mt-2 grid grid-cols-3 gap-3">
                <button
                  type="button"
                  @click="form.adjustmentType = 'add'"
                  :class="[
                    'rounded-lg border-2 px-4 py-3 text-sm font-medium transition-colors',
                    form.adjustmentType === 'add'
                      ? 'border-success-500 bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-500'
                      : 'border-gray-300 text-gray-700 hover:border-gray-400 dark:border-white/[0.08] dark:text-gray-300'
                  ]"
                >
                  <svg class="mx-auto mb-1 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                  </svg>
                  Tambah Stok
                </button>
                <button
                  type="button"
                  @click="form.adjustmentType = 'subtract'"
                  :class="[
                    'rounded-lg border-2 px-4 py-3 text-sm font-medium transition-colors',
                    form.adjustmentType === 'subtract'
                      ? 'border-error-500 bg-error-50 text-error-700 dark:bg-error-500/10 dark:text-error-500'
                      : 'border-gray-300 text-gray-700 hover:border-gray-400 dark:border-white/[0.08] dark:text-gray-300'
                  ]"
                >
                  <svg class="mx-auto mb-1 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"/>
                  </svg>
                  Kurangi Stok
                </button>
                <button
                  type="button"
                  @click="form.adjustmentType = 'correction'"
                  :class="[
                    'rounded-lg border-2 px-4 py-3 text-sm font-medium transition-colors',
                    form.adjustmentType === 'correction'
                      ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-500'
                      : 'border-gray-300 text-gray-700 hover:border-gray-400 dark:border-white/[0.08] dark:text-gray-300'
                  ]"
                >
                  <svg class="mx-auto mb-1 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                  </svg>
                  Koreksi
                </button>
              </div>
            </div>

            <!-- Jumlah -->
            <div v-if="form.adjustmentType !== 'correction'">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Jumlah <span class="text-error-500">*</span>
              </label>
              <input
                v-model.number="form.quantity"
                type="number"
                min="1"
                required
                class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-white/[0.08] dark:bg-white/[0.05] dark:text-white"
              />
            </div>

            <!-- Stok Baru (untuk koreksi) -->
            <div v-else>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Stok Baru <span class="text-error-500">*</span>
              </label>
              <input
                v-model.number="form.newStock"
                type="number"
                min="0"
                required
                class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-white/[0.08] dark:bg-white/[0.05] dark:text-white"
              />
              <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Stok saat ini: {{ currentStock }}
              </p>
            </div>

            <!-- Preview Hasil -->
            <div v-if="canShowPreview" class="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-white/[0.08] dark:bg-white/[0.03]">
              <p class="text-sm font-medium text-gray-700 dark:text-gray-300">Preview:</p>
              <div class="mt-2 flex items-center gap-4">
                <div>
                  <p class="text-xs text-gray-600 dark:text-gray-400">Stok Sekarang</p>
                  <p class="text-lg font-bold text-gray-900 dark:text-white">{{ currentStock }}</p>
                </div>
                <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
                </svg>
                <div>
                  <p class="text-xs text-gray-600 dark:text-gray-400">Stok Setelah</p>
                  <p :class="[
                    'text-lg font-bold',
                    calculatedStock < 0 ? 'text-error-600 dark:text-error-500' : 'text-success-600 dark:text-success-500'
                  ]">
                    {{ calculatedStock }}
                  </p>
                </div>
                <div v-if="stockDifference !== 0">
                  <p class="text-xs text-gray-600 dark:text-gray-400">Perubahan</p>
                  <p :class="[
                    'text-lg font-bold',
                    stockDifference > 0 ? 'text-success-600 dark:text-success-500' : 'text-error-600 dark:text-error-500'
                  ]">
                    {{ stockDifference > 0 ? '+' : '' }}{{ stockDifference }}
                  </p>
                </div>
              </div>
              <div v-if="calculatedStock < 0" class="mt-2 flex items-center gap-2 text-error-600 dark:text-error-500">
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                </svg>
                <p class="text-sm">Peringatan: Stok akan menjadi negatif!</p>
              </div>
            </div>

            <!-- Alasan -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Alasan <span class="text-error-500">*</span>
              </label>
              <select
                v-model="form.reason"
                required
                class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-white/[0.08] dark:bg-white/[0.05] dark:text-white"
              >
                <option value="">Pilih alasan...</option>
                <option v-for="reason in reasonOptions" :key="reason" :value="reason">
                  {{ reason }}
                </option>
              </select>
            </div>

            <!-- Catatan -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Catatan
              </label>
              <textarea
                v-model="form.notes"
                rows="3"
                class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-white/[0.08] dark:bg-white/[0.05] dark:text-white"
                placeholder="Tambahkan catatan tambahan..."
              ></textarea>
            </div>
          </form>
        </div>

        <!-- Footer -->
        <div class="flex gap-3 border-t border-gray-200 p-6 dark:border-white/[0.08]">
          <button
            type="button"
            @click="close"
            class="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-white/[0.08] dark:text-gray-300 dark:hover:bg-white/[0.05]"
          >
            Batal
          </button>
          <button
            type="button"
            @click="handleSubmit"
            :disabled="!isFormValid || loading"
            :class="[
              'flex-1 rounded-lg px-4 py-2 text-sm font-medium text-white',
              isFormValid && !loading
                ? 'bg-brand-600 hover:bg-brand-700'
                : 'bg-gray-300 cursor-not-allowed dark:bg-gray-700'
            ]"
          >
            {{ loading ? 'Menyimpan...' : 'Simpan' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Product Picker Modal -->
    <ProductPickerModal
      v-model="showProductPicker"
      :products="productsStore.products"
      :single-select="true"
      @select="handleProductSelect"
    />
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import ProductPickerModal from '@/components/common/ProductPickerModal.vue'
import { useStockStore } from '@/stores/stock'
import { useProductsStore } from '@/stores/products'

interface Props {
  modelValue: boolean
  product?: any
}

const props = defineProps<Props>()
const emit = defineEmits(['update:modelValue', 'saved'])

const stockStore = useStockStore()
const productsStore = useProductsStore()
const showProductPicker = ref(false)
const selectedProduct = ref<any>(null)
const loading = ref(false)

const form = ref({
  adjustmentType: 'add' as 'add' | 'subtract' | 'correction',
  quantity: 1,
  newStock: 0,
  reason: '',
  notes: ''
})

const reasonOptions = [
  'Pembelian/Restok',
  'Penjualan Manual',
  'Produk Rusak/Kadaluarsa',
  'Kehilangan/Dicuri',
  'Koreksi Perhitungan',
  'Retur dari Supplier',
  'Sample/Promosi',
  'Lainnya'
]

const currentStock = computed(() => {
  if (props.product) return props.product.stock
  if (selectedProduct.value) return selectedProduct.value.stock
  return 0
})

const calculatedStock = computed(() => {
  if (form.value.adjustmentType === 'correction') {
    return form.value.newStock
  }

  const change = form.value.quantity || 0
  if (form.value.adjustmentType === 'add') {
    return currentStock.value + change
  } else {
    return currentStock.value - change
  }
})

const stockDifference = computed(() => {
  return calculatedStock.value - currentStock.value
})

const canShowPreview = computed(() => {
  if (form.value.adjustmentType === 'correction') {
    return form.value.newStock >= 0
  }
  return form.value.quantity > 0
})

const isFormValid = computed(() => {
  const hasProduct = props.product || selectedProduct.value
  const hasType = !!form.value.adjustmentType
  const hasReason = !!form.value.reason

  if (form.value.adjustmentType === 'correction') {
    return hasProduct && hasType && hasReason && form.value.newStock >= 0
  }

  return hasProduct && hasType && hasReason && form.value.quantity > 0
})

const handleProductSelect = (product: any) => {
  selectedProduct.value = product
  showProductPicker.value = false
}

const handleSubmit = async () => {
  if (!isFormValid.value || loading.value) return

  const targetProduct = props.product || selectedProduct.value
  if (!targetProduct) return

  loading.value = true
  try {
    await stockStore.createAdjustment({
      product_id: targetProduct.id,
      adjustment_type: form.value.adjustmentType,
      quantity_before: currentStock.value,
      quantity_after: calculatedStock.value,
      quantity_change: stockDifference.value,
      reason: form.value.reason,
      notes: form.value.notes
    })

    emit('saved')
    close()
  } catch (error) {
    console.error('Error creating adjustment:', error)
  } finally {
    loading.value = false
  }
}

const close = () => {
  emit('update:modelValue', false)
  resetForm()
}

const resetForm = () => {
  selectedProduct.value = null
  form.value = {
    adjustmentType: 'add',
    quantity: 1,
    newStock: 0,
    reason: '',
    notes: ''
  }
}

watch(() => props.modelValue, (newValue) => {
  if (newValue && props.product) {
    form.value.newStock = props.product.stock
  }
})
</script>
