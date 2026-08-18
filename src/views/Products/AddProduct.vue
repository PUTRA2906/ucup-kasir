<template>
  <AdminLayout>
    <PageBreadcrumb pageTitle="Tambah Produk" class="hidden md:block" />

    <!-- Mobile Header with Close Button -->
    <div class="mb-6 flex items-center gap-3 pl-2 pr-4 md:hidden">
      <button
        @click="showConfirmDialog = true"
        class="flex h-10 w-10 items-center justify-center rounded-lg text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/[0.03]"
      >
        <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
      <h1 class="text-2xl font-semibold text-gray-900 dark:text-white">Tambah Produk</h1>
    </div>

    <div class="space-y-6">
      <!-- Form Card -->
      <ComponentCard title="Informasi Produk" desc="Masukkan detail produk baru">
        <form @submit.prevent="handleSubmit" class="space-y-6">
          <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
            <!-- Nama Produk -->
            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                Nama Produk <span class="text-error-500">*</span>
              </label>
              <input
                type="text"
                v-model="formData.name"
                placeholder="Masukkan nama produk"
                required
                class="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
              />
            </div>

            <!-- SKU -->
            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                SKU <span class="text-error-500">*</span>
              </label>
              <div class="flex gap-2">
                <input
                  type="text"
                  v-model="formData.sku"
                  placeholder="Masukkan SKU produk"
                  required
                  class="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                />
                <button
                  type="button"
                  @click="generateSKU"
                  class="h-11 whitespace-nowrap rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-white/[0.03]"
                  title="Generate SKU otomatis"
                >
                  <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
            </div>

            <!-- Kategori -->
            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                Kategori <span class="text-error-500">*</span>
              </label>
              <div class="space-y-2">
                <div class="relative z-20 bg-transparent">
                  <select
                    v-model="formData.category_id"
                    @change="handleCategoryChange"
                    required
                    class="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent bg-none px-4 py-2.5 pr-11 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                    :class="{ 'text-gray-800 dark:text-white/90': formData.category_id }"
                  >
                    <option value="" disabled>Pilih Kategori</option>
                    <option v-for="cat in categoryOptions" :key="cat.value" :value="cat.value">
                      {{ cat.label }}
                    </option>
                    <option value="__new__">+ Tambah Kategori Baru</option>
                  </select>
                  <span
                    class="absolute z-30 text-gray-500 -translate-y-1/2 pointer-events-none right-4 top-1/2 dark:text-gray-400"
                  >
                    <svg
                      class="stroke-current"
                      width="20"
                      height="20"
                      viewBox="0 0 20 20"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M4.79175 7.396L10.0001 12.6043L15.2084 7.396"
                        stroke=""
                        stroke-width="1.5"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    </svg>
                  </span>
                </div>

                <!-- Input Kategori Baru -->
                <div v-if="showNewCategoryInput" class="space-y-2">
                <input
                  type="text"
                  v-model="newCategoryName"
                  placeholder="Masukkan nama kategori baru"
                  class="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                  @keyup.enter="createNewCategory"
                />
                <div class="flex gap-2">
                  <button
                    type="button"
                    @click="createNewCategory"
                    :disabled="!newCategoryName.trim() || isCreatingCategory"
                    class="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 focus:outline-hidden focus:ring-3 focus:ring-brand-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {{ isCreatingCategory ? 'Menyimpan...' : 'Simpan Kategori' }}
                  </button>
                  <button
                    type="button"
                    @click="cancelNewCategory"
                    class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-white/[0.03]"
                  >
                    Batal
                  </button>
                </div>
                </div>
              </div>
            </div>

            <!-- Harga Beli -->
            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                Harga Beli <span class="text-error-500">*</span>
              </label>
              <div class="relative">
                <span
                  class="absolute left-0 top-1/2 flex h-11 w-12 -translate-y-1/2 items-center justify-center border-r border-gray-200 text-sm font-medium text-gray-700 dark:border-gray-800 dark:text-gray-400"
                >
                  Rp
                </span>
                <input
                  type="text"
                  v-model="displayPriceBuy"
                  @input="handlePriceBuyInput"
                  @blur="formatPriceBuy"
                  placeholder="0"
                  required
                  class="h-11 w-full rounded-lg border border-gray-300 bg-transparent py-2.5 pl-14 pr-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                />
              </div>
            </div>

            <!-- Harga Jual -->
            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                Harga Jual <span class="text-error-500">*</span>
              </label>
              <div class="relative">
                <span
                  class="absolute left-0 top-1/2 flex h-11 w-12 -translate-y-1/2 items-center justify-center border-r border-gray-200 text-sm font-medium text-gray-700 dark:border-gray-800 dark:text-gray-400"
                >
                  Rp
                </span>
                <input
                  type="text"
                  v-model="displayPriceSell"
                  @input="handlePriceSellInput"
                  @blur="formatPriceSell"
                  placeholder="0"
                  required
                  class="h-11 w-full rounded-lg border border-gray-300 bg-transparent py-2.5 pl-14 pr-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                />
              </div>
            </div>

            <!-- Stok -->
            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                Stok <span class="text-error-500">*</span>
              </label>
              <input
                type="number"
                v-model.number="formData.stock"
                placeholder="Masukkan jumlah stok"
                required
                min="0"
                class="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
              />
            </div>
          </div>

          <!-- Deskripsi -->
          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
              Deskripsi Produk
            </label>
            <textarea
              v-model="formData.description"
              rows="4"
              placeholder="Masukkan deskripsi produk (opsional)"
              class="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
            ></textarea>
          </div>

          <!-- Action Buttons -->
          <div class="flex items-center justify-end gap-3 border-t border-gray-100 pt-6 dark:border-gray-800">
            <button
              type="button"
              @click="showConfirmDialog = true"
              class="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-white/[0.03]"
            >
              Batal
            </button>
            <button
              type="submit"
              :disabled="isSubmitting"
              class="rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-600 focus:outline-hidden focus:ring-3 focus:ring-brand-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ isSubmitting ? 'Menyimpan...' : 'Simpan Produk' }}
            </button>
          </div>
        </form>
      </ComponentCard>
    </div>

    <!-- Confirm Dialog -->
    <ConfirmDialog
      v-model="showConfirmDialog"
      title="Batalkan Penambahan Produk?"
      message="Data yang sudah diisi akan hilang dan tidak dapat dikembalikan."
      confirm-text="Ya, Batalkan"
      cancel-text="Tidak"
      @confirm="handleConfirmCancel"
    />
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import { useProductsStore } from '@/stores/products'
import { useCategoriesStore } from '@/stores/categories'
import { useToast } from '@/composables/useToast'

const router = useRouter()
const productsStore = useProductsStore()
const categoriesStore = useCategoriesStore()
const toast = useToast()
const showConfirmDialog = ref(false)
const isSubmitting = ref(false)

const formData = reactive({
  name: '',
  sku: '',
  category_id: '',
  price_buy: 0,
  price_sell: 0,
  stock: null as number | null,
  description: '',
})

const displayPriceBuy = ref('')
const displayPriceSell = ref('')
const showNewCategoryInput = ref(false)
const newCategoryName = ref('')
const isCreatingCategory = ref(false)

const categoryOptions = computed(() =>
  categoriesStore.categories.map(cat => ({
    value: cat.id,
    label: cat.name
  }))
)

onMounted(async () => {
  await categoriesStore.fetchCategories()
})

const handleCategoryChange = () => {
  if (formData.category_id === '__new__') {
    showNewCategoryInput.value = true
    formData.category_id = ''
  } else {
    showNewCategoryInput.value = false
  }
}

const createNewCategory = async () => {
  if (!newCategoryName.value.trim() || isCreatingCategory.value) return

  isCreatingCategory.value = true
  try {
    const newCategory = await categoriesStore.createCategory({
      name: newCategoryName.value.trim()
    })

    formData.category_id = newCategory.id
    showNewCategoryInput.value = false
    newCategoryName.value = ''
    toast.success('Berhasil!', 'Kategori baru berhasil dibuat')
  } catch (error) {
    console.error('Error creating category:', error)
    toast.error('Gagal!', 'Gagal membuat kategori baru. Silakan coba lagi.')
  } finally {
    isCreatingCategory.value = false
  }
}

const cancelNewCategory = () => {
  showNewCategoryInput.value = false
  newCategoryName.value = ''
  formData.category_id = ''
}

const formatCurrency = (value: number): string => {
  if (!value) return ''
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

const parseCurrency = (value: string): number => {
  return parseInt(value.replace(/\D/g, '')) || 0
}

const handlePriceBuyInput = (e: Event) => {
  const input = e.target as HTMLInputElement
  const numericValue = parseCurrency(input.value)
  formData.price_buy = numericValue
  displayPriceBuy.value = formatCurrency(numericValue)
}

const formatPriceBuy = () => {
  displayPriceBuy.value = formatCurrency(formData.price_buy)
}

const handlePriceSellInput = (e: Event) => {
  const input = e.target as HTMLInputElement
  const numericValue = parseCurrency(input.value)
  formData.price_sell = numericValue
  displayPriceSell.value = formatCurrency(numericValue)
}

const formatPriceSell = () => {
  displayPriceSell.value = formatCurrency(formData.price_sell)
}

const generateSKU = () => {
  const prefix = 'SKU'
  const timestamp = Date.now().toString().slice(-8)
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  formData.sku = `${prefix}-${timestamp}-${random}`
}

const handleSubmit = async () => {
  if (isSubmitting.value) return

  isSubmitting.value = true
  try {
    await productsStore.createProduct({
      name: formData.name,
      sku: formData.sku || undefined,
      category_id: formData.category_id || undefined,
      price_buy: formData.price_buy,
      price_sell: formData.price_sell,
      stock: formData.stock ?? 0,
      description: formData.description || undefined,
      is_active: true
    })
    toast.success('Berhasil!', 'Produk berhasil ditambahkan')
    setTimeout(() => {
      router.push('/products')
    }, 1000)
  } catch (error) {
    console.error('Error creating product:', error)
    toast.error('Gagal!', 'Gagal menambahkan produk. Silakan coba lagi.')
  } finally {
    isSubmitting.value = false
  }
}

const handleConfirmCancel = () => {
  router.push('/products')
}
</script>
