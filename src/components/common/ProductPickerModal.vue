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
            class="flex h-[90vh] w-full flex-col rounded-t-2xl border border-gray-200 bg-white shadow-xl sm:h-auto sm:max-h-[80vh] sm:w-full sm:max-w-2xl sm:rounded-2xl dark:border-gray-800 dark:bg-gray-900"
          >
            <!-- Header -->
            <div class="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
              <div>
                <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Pilih Produk</h2>
                <p class="text-xs text-gray-500 dark:text-gray-400">
                  Cari produk untuk ditambahkan ke transaksi
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

            <!-- Search & Category Filter -->
            <div class="space-y-3 border-b border-gray-200 px-6 py-4 dark:border-gray-700">
              <div class="relative">
                <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  ref="searchInput"
                  v-model="searchQuery"
                  type="text"
                  placeholder="Cari nama produk, SKU, atau barcode..."
                  class="h-11 w-full rounded-lg border border-gray-300 bg-transparent pl-10 pr-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                />
              </div>

              <!-- Category Filter -->
              <div class="relative z-20">
                <select
                  v-model="selectedCategory"
                  class="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 pr-11 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800"
                >
                  <option value="" class="bg-white text-gray-800 dark:bg-gray-900 dark:text-white/90">
                    Semua Kategori
                  </option>
                  <option
                    v-for="cat in categoryOptions"
                    :key="cat.value"
                    :value="cat.value"
                    class="bg-white text-gray-800 dark:bg-gray-900 dark:text-white/90"
                  >
                    {{ cat.label }}
                  </option>
                </select>
                <span class="absolute right-4 top-1/2 z-30 -translate-y-1/2 pointer-events-none text-gray-500 dark:text-gray-400">
                  <svg class="stroke-current" width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M4.79175 7.396L10.0001 12.6043L15.2084 7.396" stroke="" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                </span>
              </div>
            </div>

            <!-- Product List -->
            <div class="flex-1 overflow-y-auto px-6 py-4">
              <!-- Select All -->
              <label
                v-if="availableProducts.length > 0 && !singleSelect"
                class="mb-3 flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                <input
                  type="checkbox"
                  :checked="allSelected"
                  @change="toggleSelectAll"
                  class="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                />
                Pilih Semua
              </label>

              <div v-if="filteredProducts.length === 0" class="py-12 text-center">
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  {{ searchQuery || selectedCategory ? 'Produk tidak ditemukan' : 'Tidak ada produk tersedia' }}
                </p>
              </div>

              <div v-else class="space-y-2">
                <div
                  v-for="product in filteredProducts"
                  :key="product.id"
                  class="flex items-center gap-3 rounded-lg border px-4 py-3 dark:border-gray-700"
                  :class="[
                    product.stock <= 0
                      ? 'cursor-not-allowed border-gray-100 opacity-60 dark:border-gray-800'
                      : isSelected(product.id)
                        ? 'cursor-pointer border-brand-500 bg-brand-50/50 dark:bg-brand-500/10'
                        : 'cursor-pointer border-gray-200 hover:border-gray-300 dark:hover:border-gray-600',
                  ]"
                  @click="product.stock > 0 && toggleSelect(product.id)"
                >
                  <input
                    v-if="!singleSelect"
                    type="checkbox"
                    :checked="isSelected(product.id)"
                    :disabled="product.stock <= 0"
                    @change="toggleSelect(product.id)"
                    class="h-4 w-4 flex-shrink-0 rounded border-gray-300 text-brand-500 focus:ring-brand-500 disabled:cursor-not-allowed"
                  />
                  <div class="min-w-0 flex-1">
                    <p class="truncate text-sm font-medium text-gray-900 dark:text-white">{{ product.name }}</p>
                    <p class="text-xs text-gray-500 dark:text-gray-400">
                      {{ formatCurrency(product.price_sell) }}
                      <span :class="product.stock <= 0 ? 'text-error-500' : ''" class="ml-2">
                        Stok: {{ product.stock }}
                      </span>
                    </p>
                  </div>
                  <span
                    v-if="product.stock <= 0"
                    class="flex-shrink-0 rounded-lg bg-error-50 px-3 py-1.5 text-xs font-medium text-error-600 dark:bg-error-500/10 dark:text-error-400"
                  >
                    Habis
                  </span>
                </div>
              </div>
            </div>

            <!-- Footer -->
            <div v-if="!singleSelect" class="space-y-3 border-t border-gray-200 px-6 py-4 dark:border-gray-700">
              <button
                @click="addSelectedProducts"
                :disabled="selectedIds.length === 0"
                class="w-full rounded-lg bg-brand-500 py-3 text-sm font-medium text-white hover:bg-brand-600 focus:outline-hidden focus:ring-3 focus:ring-brand-500/30 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Tambahkan ({{ selectedIds.length }})
              </button>
              <button
                @click="close"
                class="w-full rounded-lg bg-gray-100 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Selesai
              </button>
            </div>
            <div v-else class="border-t border-gray-200 px-6 py-4 dark:border-gray-700">
              <button
                @click="close"
                class="w-full rounded-lg bg-gray-100 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Batal
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'

interface ProductOption {
  id: string
  name: string
  price_sell: number
  stock: number
  sku?: string
  barcode?: string
  category_id?: string
  category?: { name?: string } | null
}

interface Props {
  modelValue: boolean
  products: ProductOption[]
  singleSelect?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  singleSelect: false
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  add: [payload: { products: ProductOption[]; quantity: number }]
  select: [product: ProductOption]
}>()

const isOpen = ref(props.modelValue)
const searchQuery = ref('')
const selectedCategory = ref('')
const selectedIds = ref<string[]>([])
const searchInput = ref<HTMLInputElement | null>(null)

watch(
  () => props.modelValue,
  (newValue) => {
    isOpen.value = newValue
    if (newValue) {
      searchQuery.value = ''
      selectedCategory.value = ''
      selectedIds.value = []
      // Only autofocus on desktop (screen width >= 768px)
      nextTick(() => {
        if (window.innerWidth >= 768) {
          searchInput.value?.focus()
        }
      })
    }
  }
)

// Produk yang bisa dipilih (stok > 0)
const availableProducts = computed(() =>
  props.products.filter((p) => p.stock > 0)
)

// Semua produk di daftar terpilih
const allSelected = computed(
  () =>
    availableProducts.value.length > 0 &&
    selectedIds.value.length === availableProducts.value.length
)

const isSelected = (id: string) => selectedIds.value.includes(id)

const toggleSelect = (id: string) => {
  if (props.singleSelect) {
    const product = props.products.find(p => p.id === id)
    if (product) {
      emit('select', product)
      close()
    }
  } else {
    if (selectedIds.value.includes(id)) {
      selectedIds.value = selectedIds.value.filter((i) => i !== id)
    } else {
      selectedIds.value = [...selectedIds.value, id]
    }
  }
}

const toggleSelectAll = () => {
  if (allSelected.value) {
    selectedIds.value = []
  } else {
    selectedIds.value = availableProducts.value.map((p) => p.id)
  }
}

const categoryOptions = computed(() => {
  const map = new Map<string, string>()
  props.products.forEach((p) => {
    if (p.category_id && p.category?.name) {
      map.set(p.category_id, p.category.name)
    }
  })
  return Array.from(map, ([value, label]) => ({ value, label }))
})

const filteredProducts = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  return props.products.filter((p) => {
    // Filter kategori
    if (selectedCategory.value && p.category_id !== selectedCategory.value) return false
    // Filter pencarian
    if (!query) return true
    return (
      p.name.toLowerCase().includes(query) ||
      (p.sku || '').toLowerCase().includes(query) ||
      (p.barcode || '').toLowerCase().includes(query)
    )
  })
})

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value || 0)

const addSelectedProducts = () => {
  // Jumlah default 1 untuk tiap produk — diatur di rincian item
  const products = props.products.filter((p) => selectedIds.value.includes(p.id))
  emit('add', { products, quantity: 1 })
  selectedIds.value = []
  close()
}

const close = () => {
  emit('update:modelValue', false)
}
</script>
