<template>
  <AdminLayout>
    <PageBreadcrumb pageTitle="Edit Produk" class="hidden md:block" />

    <!-- Mobile Header -->
    <MobilePageHeader title="Edit Produk" icon-type="close" @back="showConfirmDialog = true" />

    <div v-if="loading" class="flex items-center justify-center py-12">
      <div class="text-center">
        <svg class="mx-auto h-12 w-12 animate-spin text-brand-500" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p class="mt-4 text-sm text-gray-600 dark:text-gray-400">Memuat data produk...</p>
      </div>
    </div>

    <div v-else-if="product" class="space-y-6">
      <!-- Form Card -->
      <ComponentCard title="Edit Informasi Produk" desc="Perbarui detail produk">
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
                placeholder="0"
                required
                min="0"
                class="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
              />
            </div>

            <!-- Status -->
            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                Status <span class="text-error-500">*</span>
              </label>
              <div class="relative z-20 bg-transparent">
                <select
                  v-model="formData.is_active"
                  required
                  class="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent bg-none px-4 py-2.5 pr-11 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800"
                >
                  <option :value="true">Aktif</option>
                  <option :value="false">Tidak Aktif</option>
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
              {{ isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan' }}
            </button>
          </div>
        </form>
      </ComponentCard>
    </div>

    <!-- Confirm Dialog -->
    <ConfirmDialog
      v-model="showConfirmDialog"
      title="Batalkan Perubahan?"
      message="Perubahan yang sudah diisi akan hilang dan tidak dapat dikembalikan."
      confirm-text="Ya, Batalkan"
      cancel-text="Tidak"
      @confirm="handleConfirmCancel"
    />
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import MobilePageHeader from '@/components/common/MobilePageHeader.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import { useProductsStore } from '@/stores/products'
import { useCategoriesStore } from '@/stores/categories'
import { useToast } from '@/composables/useToast'

const router = useRouter()
const route = useRoute()
const productsStore = useProductsStore()
const categoriesStore = useCategoriesStore()
const toast = useToast()

const productId = route.params.id as string
const product = ref<any>(null)
const loading = ref(true)
const showConfirmDialog = ref(false)
const isSubmitting = ref(false)
const showNewCategoryInput = ref(false)
const newCategoryName = ref('')
const isCreatingCategory = ref(false)

const formData = reactive({
  name: '',
  sku: '',
  category_id: '',
  price_buy: 0,
  price_sell: 0,
  stock: 0,
  description: '',
  is_active: true
})

const displayPriceBuy = ref('')
const displayPriceSell = ref('')

const categoryOptions = computed(() =>
  categoriesStore.categories.map(cat => ({
    value: cat.id,
    label: cat.name
  }))
)

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

const handleCategoryChange = () => {
  if (formData.category_id === '__new__') {
    showNewCategoryInput.value = true
    formData.category_id = product.value?.category_id || ''
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
  formData.category_id = product.value?.category_id || ''
}

const handleSubmit = async () => {
  if (isSubmitting.value) return

  isSubmitting.value = true
  try {
    await productsStore.updateProduct(productId, {
      name: formData.name,
      sku: formData.sku || undefined,
      category_id: formData.category_id || undefined,
      price_buy: formData.price_buy,
      price_sell: formData.price_sell,
      stock: formData.stock,
      description: formData.description || undefined,
      is_active: formData.is_active
    })
    toast.success('Berhasil!', 'Produk berhasil diperbarui')
    setTimeout(() => {
      router.push('/products')
    }, 1000)
  } catch (error) {
    console.error('Error updating product:', error)
    toast.error('Gagal!', 'Gagal memperbarui produk. Silakan coba lagi.')
  } finally {
    isSubmitting.value = false
  }
}

const handleConfirmCancel = () => {
  router.push('/products')
}

onMounted(async () => {
  try {
    await categoriesStore.fetchCategories()
    product.value = await productsStore.getProduct(productId)

    if (product.value) {
      formData.name = product.value.name
      formData.sku = product.value.sku || ''
      formData.category_id = product.value.category_id || ''
      formData.price_buy = product.value.price_buy
      formData.price_sell = product.value.price_sell
      formData.stock = product.value.stock
      formData.description = product.value.description || ''
      formData.is_active = product.value.is_active

      displayPriceBuy.value = formatCurrency(product.value.price_buy)
      displayPriceSell.value = formatCurrency(product.value.price_sell)
    }
  } catch (error) {
    console.error('Error loading product:', error)
    toast.error('Gagal!', 'Gagal memuat data produk')
  } finally {
    loading.value = false
  }
})
</script>
