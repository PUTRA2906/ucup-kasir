<template>
  <Teleport to="body">
    <div
      v-if="modelValue"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      @click.self="close"
    >
      <div class="w-full max-w-6xl rounded-xl bg-white shadow-xl dark:bg-gray-800">
        <!-- Header -->
        <div class="flex items-center justify-between border-b border-gray-200 p-6 dark:border-white/[0.08]">
          <div>
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
              Stock Opname
            </h3>
            <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {{ opnameNumber }} - {{ formatDate(opnameDate) }}
            </p>
          </div>
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
          <!-- Filter & Search -->
          <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div class="flex-1">
              <input
                v-model="searchQuery"
                type="text"
                placeholder="Cari produk..."
                class="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-white/[0.08] dark:bg-white/[0.05] dark:text-white"
              />
            </div>
            <div class="flex gap-2">
              <button
                @click="addAllProducts"
                :disabled="items.length > 0"
                class="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:bg-gray-300 disabled:cursor-not-allowed dark:disabled:bg-gray-700"
              >
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                </svg>
                Tambah Semua Produk
              </button>
            </div>
          </div>

          <!-- Empty State -->
          <div v-if="items.length === 0" class="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center dark:border-white/[0.08]">
            <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
            </svg>
            <p class="mt-4 text-sm font-medium text-gray-900 dark:text-white">Belum ada produk</p>
            <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Klik "Tambah Semua Produk" untuk memulai stock opname
            </p>
          </div>

          <!-- Items Table -->
          <div v-else class="overflow-hidden rounded-lg border border-gray-200 dark:border-white/[0.08]">
            <table class="min-w-full divide-y divide-gray-200 dark:divide-white/[0.08]">
              <thead class="bg-gray-50 dark:bg-white/[0.03]">
                <tr>
                  <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">
                    Produk
                  </th>
                  <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">
                    SKU
                  </th>
                  <th class="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">
                    Stok Sistem
                  </th>
                  <th class="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">
                    Stok Fisik
                  </th>
                  <th class="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">
                    Selisih
                  </th>
                  <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">
                    Catatan
                  </th>
                  <th class="w-10 px-4 py-3"></th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200 bg-white dark:divide-white/[0.08] dark:bg-gray-800">
                <tr v-for="(item, index) in filteredItems" :key="item.product_id" class="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                  <td class="px-4 py-3">
                    <p class="font-medium text-gray-900 dark:text-white">{{ item.product_name }}</p>
                  </td>
                  <td class="px-4 py-3 text-gray-600 dark:text-gray-400">
                    {{ item.product_sku }}
                  </td>
                  <td class="px-4 py-3 text-center">
                    <span class="font-medium text-gray-900 dark:text-white">{{ item.system_quantity }}</span>
                  </td>
                  <td class="px-4 py-3">
                    <input
                      v-model.number="item.actual_quantity"
                      type="number"
                      min="0"
                      class="w-24 rounded-lg border border-gray-300 px-2 py-1 text-center focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-white/[0.08] dark:bg-white/[0.05] dark:text-white"
                      @input="calculateDifference(item)"
                    />
                  </td>
                  <td class="px-4 py-3 text-center">
                    <span
                      :class="[
                        'inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium',
                        item.difference === 0
                          ? 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                          : item.difference > 0
                            ? 'bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-500'
                            : 'bg-error-50 text-error-700 dark:bg-error-500/10 dark:text-error-500'
                      ]"
                    >
                      <svg v-if="item.difference > 0" class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18"/>
                      </svg>
                      <svg v-else-if="item.difference < 0" class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"/>
                      </svg>
                      {{ item.difference > 0 ? '+' : '' }}{{ item.difference }}
                    </span>
                  </td>
                  <td class="px-4 py-3">
                    <input
                      v-model="item.notes"
                      type="text"
                      placeholder="Catatan..."
                      class="w-full rounded-lg border border-gray-300 px-2 py-1 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-white/[0.08] dark:bg-white/[0.05] dark:text-white"
                    />
                  </td>
                  <td class="px-4 py-3">
                    <button
                      @click="removeItem(index)"
                      class="rounded-lg p-1 text-error-600 hover:bg-error-50 dark:text-error-500 dark:hover:bg-error-500/15"
                    >
                      <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                      </svg>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Summary -->
          <div v-if="items.length > 0" class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div class="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-white/[0.08] dark:bg-white/[0.03]">
              <p class="text-sm text-gray-600 dark:text-gray-400">Total Produk</p>
              <p class="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{{ items.length }}</p>
            </div>
            <div class="rounded-lg border border-success-200 bg-success-50 p-4 dark:border-success-500/20 dark:bg-success-500/10">
              <p class="text-sm text-success-700 dark:text-success-500">Selisih Lebih</p>
              <p class="mt-1 text-2xl font-bold text-success-700 dark:text-success-500">{{ positiveCount }}</p>
            </div>
            <div class="rounded-lg border border-error-200 bg-error-50 p-4 dark:border-error-500/20 dark:bg-error-500/10">
              <p class="text-sm text-error-700 dark:text-error-500">Selisih Kurang</p>
              <p class="mt-1 text-2xl font-bold text-error-700 dark:text-error-500">{{ negativeCount }}</p>
            </div>
          </div>

          <!-- Notes -->
          <div v-if="items.length > 0" class="mt-4">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Catatan Opname
            </label>
            <textarea
              v-model="notes"
              rows="3"
              class="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-white/[0.08] dark:bg-white/[0.05] dark:text-white"
              placeholder="Tambahkan catatan untuk stock opname ini..."
            ></textarea>
          </div>
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
            :disabled="items.length === 0 || !isFormValid || loading"
            :class="[
              'flex-1 rounded-lg px-4 py-2 text-sm font-medium text-white',
              items.length > 0 && isFormValid && !loading
                ? 'bg-brand-600 hover:bg-brand-700'
                : 'bg-gray-300 cursor-not-allowed dark:bg-gray-700'
            ]"
          >
            {{ loading ? 'Menyimpan...' : 'Simpan Stock Opname' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useProductsStore } from '@/stores/products'
import { useStockStore } from '@/stores/stock'

interface Props {
  modelValue: boolean
}

interface OpnameItem {
  product_id: string
  product_name: string
  product_sku: string
  system_quantity: number
  actual_quantity: number
  difference: number
  notes: string
}

const props = defineProps<Props>()
const emit = defineEmits(['update:modelValue', 'saved'])

const productsStore = useProductsStore()
const stockStore = useStockStore()

const opnameNumber = ref('')
const opnameDate = ref(new Date().toISOString().split('T')[0])
const items = ref<OpnameItem[]>([])
const notes = ref('')
const searchQuery = ref('')
const loading = ref(false)

const filteredItems = computed(() => {
  if (!searchQuery.value) return items.value

  const query = searchQuery.value.toLowerCase()
  return items.value.filter(item =>
    item.product_name.toLowerCase().includes(query) ||
    item.product_sku.toLowerCase().includes(query)
  )
})

const positiveCount = computed(() => {
  return items.value.filter(item => item.difference > 0).length
})

const negativeCount = computed(() => {
  return items.value.filter(item => item.difference < 0).length
})

const isFormValid = computed(() => {
  return items.value.every(item => item.actual_quantity >= 0)
})

const generateOpnameNumber = () => {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  opnameNumber.value = `OPN-${date}-${random}`
}

const addAllProducts = () => {
  items.value = productsStore.products.map(product => ({
    product_id: product.id,
    product_name: product.name,
    product_sku: product.sku || '-',
    system_quantity: product.stock || 0,
    actual_quantity: product.stock || 0,
    difference: 0,
    notes: ''
  }))
}

const calculateDifference = (item: OpnameItem) => {
  item.difference = item.actual_quantity - item.system_quantity
}

const removeItem = (index: number) => {
  items.value.splice(index, 1)
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

const handleSubmit = async () => {
  if (!isFormValid.value || loading.value) return

  loading.value = true
  try {
    await stockStore.createOpname({
      opname_number: opnameNumber.value,
      opname_date: opnameDate.value,
      notes: notes.value,
      items: items.value
    })

    emit('saved')
    close()
  } catch (error) {
    console.error('Error creating stock opname:', error)
  } finally {
    loading.value = false
  }
}

const close = () => {
  emit('update:modelValue', false)
  resetForm()
}

const resetForm = () => {
  items.value = []
  notes.value = ''
  searchQuery.value = ''
  generateOpnameNumber()
}

onMounted(() => {
  generateOpnameNumber()
})
</script>
