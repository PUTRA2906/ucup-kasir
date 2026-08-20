<template>
  <AdminLayout>
    <PageBreadcrumb pageTitle="Transaksi Baru" class="hidden md:block" />

    <!-- Mobile Header with Close Button -->
    <div class="mb-6 flex items-center gap-3 pl-2 pr-4 md:hidden">
      <button
        @click="router.push(`/customer-invoices/${route.params.kecamatan}/${route.params.customerId}`)"
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
      <h1 class="text-2xl font-semibold text-gray-900 dark:text-white">Transaksi Baru</h1>
    </div>

    <form @submit.prevent="handleSubmit">
      <div class="space-y-6">
        <!-- 1. Data Customer (Kepala Dokumen) -->
        <ComponentCard title="Data Customer" desc="Pilih customer untuk transaksi ini">
          <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                Nama Customer
              </label>
              <!-- Customer yang sudah dipilih (tidak bisa diubah) -->
              <div v-if="selectedCustomer" class="flex items-center gap-3 rounded-lg border border-brand-500 bg-brand-50/50 p-3 dark:bg-brand-500/10">
                <div class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
                  {{ selectedCustomer.name.charAt(0).toUpperCase() }}
                </div>
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-medium text-gray-900 dark:text-white">{{ selectedCustomer.name }}</p>
                  <p class="text-xs text-gray-500 dark:text-gray-400 truncate">
                    <span v-if="selectedCustomer.store_name">{{ selectedCustomer.store_name }} · </span>
                    {{ selectedCustomer.kecamatan || '-' }}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                Tanggal Transaksi
              </label>
              <input
                type="text"
                :value="formatDate(new Date())"
                disabled
                class="h-11 w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2.5 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-400"
              />
            </div>
          </div>
        </ComponentCard>

        <!-- 2. Rincian Item (Dokumen Penjualan) -->
        <ComponentCard title="Rincian Item" :desc="`${cartItems.length} item dalam transaksi`">
          <div class="mb-4 flex items-center justify-between">
            <p v-if="cartItems.length === 0" class="hidden text-sm text-gray-500 dark:text-gray-400 md:block">
              Belum ada item, tambahkan produk di bawah ini.
            </p>
            <p v-else class="text-sm text-gray-500 dark:text-gray-400">
              Total item: {{ cartItems.length }}
            </p>              <div class="flex items-center gap-2">
                <button
                  v-if="selectedCustomerId"
                  type="button"
                  @click="showReturnPicker = true"
                  class="inline-flex items-center gap-2 rounded-lg border border-error-500 bg-transparent px-4 py-2.5 text-sm font-medium text-error-600 hover:bg-error-50 focus:outline-hidden focus:ring-3 focus:ring-error-500/30 dark:text-error-400 dark:hover:bg-error-500/15"
                >
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                  </svg>
                  Klaim Retur
                </button>
                <button
                  type="button"
                  @click="showProductPicker = true"
                  class="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 focus:outline-hidden focus:ring-3 focus:ring-brand-500/30"
                >
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                  </svg>
                  Tambah Produk
                </button>
              </div>
          </div>

          <!-- Table - Desktop -->
          <div v-if="cartItems.length > 0" class="overflow-x-auto">
            <table class="w-full min-w-[640px] text-left">
              <thead>
                <tr class="border-b border-gray-200 dark:border-gray-700">
                  <th class="w-12 px-4 py-3 text-xs font-medium text-gray-500 uppercase dark:text-gray-400">No</th>
                  <th class="px-4 py-3 text-xs font-medium text-gray-500 uppercase dark:text-gray-400">Produk</th>
                  <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase dark:text-gray-400">Jumlah</th>
                  <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase dark:text-gray-400">Harga</th>
                  <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase dark:text-gray-400">Subtotal</th>
                  <th class="w-12 px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(item, index) in cartItems"
                  :key="item.product_id"
                  class="border-b border-gray-100 dark:border-gray-800"
                >
                  <td class="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{{ index + 1 }}</td>
                  <td class="px-4 py-3">
                    <p class="text-sm font-medium text-gray-900 dark:text-white">{{ item.name }}</p>
                    <p class="text-xs text-gray-500 dark:text-gray-400">Stok: {{ item.stock }}</p>
                  </td>
                  <td class="px-4 py-3">
                    <div class="flex items-center justify-center">
                      <input
                        type="text"
                        inputmode="numeric"
                        :value="item.quantity"
                        @input="updateQuantity(item, ($event.target as HTMLInputElement).value)"
                        @blur="validateQuantity(item)"
                        class="w-16 rounded-lg border border-gray-300 bg-transparent px-2 py-1.5 text-center text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                      />
                    </div>
                  </td>
                  <td class="px-4 py-3">
                    <div class="flex items-center justify-end gap-1">
                      <span class="text-xs text-gray-400 dark:text-gray-600">Rp</span>
                      <input
                        type="text"
                        inputmode="numeric"
                        :value="formatNumber(item.price)"
                        @input="updatePrice(item, ($event.target as HTMLInputElement).value)"
                        class="w-24 rounded-lg border border-gray-300 bg-transparent px-2 py-1.5 text-right text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                      />
                    </div>
                  </td>
                  <td class="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                    {{ formatCurrency(item.subtotal) }}
                  </td>
                  <td class="px-4 py-3 text-right">
                    <button
                      type="button"
                      @click="removeFromCart(item.product_id)"
                      class="text-error-600 hover:text-error-500 dark:text-error-500"
                      title="Hapus"
                    >
                      <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Mobile: stacked items -->
          <div v-else-if="cartItems.length === 0" class="rounded-lg border border-dashed border-gray-300 py-8 text-center dark:border-gray-700">
            <p class="text-sm text-gray-500 dark:text-gray-400">
              Keranjang masih kosong. Klik "Tambah Produk" untuk mulai.
            </p>
          </div>

          <!-- Return Items Summary -->
          <div v-if="returnItems.length > 0" class="mt-4 rounded-lg border border-error-200 bg-error-50 p-4 dark:border-error-500/30 dark:bg-error-500/10">
            <div class="flex items-center justify-between mb-2">
              <h4 class="text-sm font-semibold text-error-700 dark:text-error-400">
                <span class="inline-flex items-center gap-1.5">
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                  </svg>
                  Item Retur ({{ returnItems.length }})
                </span>
              </h4>
              <button
                type="button"
                @click="returnItems = []"
                class="text-xs font-medium text-error-600 hover:text-error-700 dark:text-error-400 dark:hover:text-error-300"
              >
                Hapus Semua
              </button>
            </div>
            <div class="space-y-2">
              <div
                v-for="item in returnItems"
                :key="`${item.transaction_id}_${item.product_id}`"
                class="flex items-center justify-between text-sm"
              >
                <span class="text-error-700 dark:text-error-300">
                  {{ item.product_name }} × {{ item.quantity }}
                  <span class="text-xs text-error-500 dark:text-error-400">
                    ({{ item.transaction_number }})
                  </span>
                </span>
                <span class="font-medium text-error-600 dark:text-error-400">
                  - {{ formatCurrency(item.subtotal) }}
                </span>
              </div>
            </div>
          </div>
        </ComponentCard>

        <!-- 3. Ringkasan & Pembayaran -->
        <ComponentCard title="Ringkasan & Pembayaran">
          <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <!-- Summary -->
            <div class="space-y-4">
              <div class="space-y-2 rounded-lg bg-gray-50 p-4 dark:bg-gray-900/50">
                <div class="flex justify-between text-sm">
                  <span class="text-gray-600 dark:text-gray-400">Subtotal</span>
                  <span class="font-medium text-gray-900 dark:text-white">{{ formatCurrency(subtotal) }}</span>
                </div>
                <div class="flex items-center justify-between gap-3">
                  <span class="text-sm text-gray-600 dark:text-gray-400">Diskon</span>
                  <div class="flex items-center gap-1">
                    <span class="text-xs text-gray-400 dark:text-gray-600">Rp</span>
                    <input
                      v-model="discountInput"
                      type="text"
                      inputmode="numeric"
                      placeholder="0"
                      class="w-28 rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-right text-sm text-gray-900 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                    />
                  </div>
                </div>
                <div v-if="totalReturnAmount > 0" class="flex justify-between text-sm">
                  <span class="text-error-600 dark:text-error-400">Potongan Retur</span>
                  <span class="font-medium text-error-600 dark:text-error-400">- {{ formatCurrency(totalReturnAmount) }}</span>
                </div>
                <div class="flex justify-between border-t border-gray-200 pt-2 dark:border-gray-700">
                  <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Total Bersih</span>
                  <span class="text-lg font-bold text-brand-600 dark:text-brand-400">{{ formatCurrency(netTotal) }}</span>
                </div>
              </div>

            </div>

            <!-- Payment details -->
            <div class="space-y-4">
              <!-- Payment Button / Summary -->
              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                  Pembayaran
                </label>

                <!-- Belum ada pembayaran -->
                <div v-if="!payment" class="rounded-lg border border-dashed border-gray-300 p-4 text-center dark:border-gray-700">
                  <p class="mb-3 text-sm text-gray-500 dark:text-gray-400">
                    Belum ada pembayaran. Bisa dibayar lunas atau dicicil.
                  </p>
                  <button
                    type="button"
                    @click="showPaymentModal = true"
                    :disabled="cartItems.length === 0"
                    class="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 focus:outline-hidden focus:ring-3 focus:ring-brand-500/30 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                    </svg>
                    Tambah Pembayaran
                  </button>
                </div>

                <!-- Pembayaran sudah dicatat -->
                <div v-else class="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/50">
                  <div class="flex items-center justify-between">
                    <div class="space-y-1">
                      <p class="text-sm font-semibold text-gray-900 dark:text-white">
                        {{ formatCurrency(payment.amount) }}
                      </p>
                      <p class="text-xs text-gray-500 dark:text-gray-400">
                        {{ formatPaymentMethod(payment.payment_method) }}
                        <span v-if="payment.notes"> · {{ payment.notes }}</span>
                      </p>
                    </div>
                    <div class="flex gap-2">
                      <button
                        type="button"
                        @click="showPaymentModal = true"
                        class="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-white/[0.03]"
                      >
                        Ubah
                      </button>
                      <button
                        type="button"
                        @click="payment = null"
                        class="rounded-lg border border-error-500 bg-transparent px-3 py-1.5 text-xs font-medium text-error-600 hover:bg-error-50 dark:text-error-500 dark:hover:bg-error-500/15"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                  <p v-if="payment.amount < total" class="mt-2 text-xs text-warning-600 dark:text-warning-500">
                    Pembayaran sebagian — sisa cicilan: {{ formatCurrency(total - payment.amount) }}
                  </p>
                  <p v-else-if="payment.amount > total" class="mt-2 text-xs text-success-600 dark:text-success-400">
                    Kembalian: {{ formatCurrency(payment.amount - total) }}
                  </p>
                </div>
              </div>

              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                  Catatan
                </label>
                <textarea
                  v-model="notes"
                  rows="3"
                  placeholder="Catatan transaksi (opsional)"
                  class="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                ></textarea>
              </div>

              <button
                type="submit"
                :disabled="isSubmitting || !selectedCustomerId || cartItems.length === 0"
                class="w-full rounded-lg bg-brand-500 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-600 focus:outline-hidden focus:ring-3 focus:ring-brand-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {{ isSubmitting ? 'Menyimpan...' : 'Simpan Transaksi' }}
              </button>
            </div>
          </div>
        </ComponentCard>
      </div>
    </form>

    <!-- Product Picker Modal -->
    <ProductPickerModal
      v-model="showProductPicker"
      :products="productsStore.products"
      @add="handleAddProduct"
    />

    <!-- Payment Modal -->
    <PaymentModal
      v-model="showPaymentModal"
      :transaction-number="'Transaksi Baru'"
      :remaining="netTotal"
      @submit="handlePaymentSubmit"
    />

    <!-- Customer Picker Modal -->
    <CustomerPickerModal
      v-model="showCustomerPicker"
      :customers="customersStore.customers"
      :selected-id="selectedCustomerId"
      @update:selected-id="selectedCustomerId = $event"
    />

    <!-- Return Picker Modal -->
    <ReturnPickerModal
      v-model="showReturnPicker"
      :customer-id="selectedCustomerId"
      @confirm="handleReturnConfirm"
    />
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import ProductPickerModal from '@/components/common/ProductPickerModal.vue'
import PaymentModal from '@/components/common/PaymentModal.vue'
import CustomerPickerModal from '@/components/common/CustomerPickerModal.vue'
import ReturnPickerModal from '@/components/common/ReturnPickerModal.vue'
import { useProductsStore } from '@/stores/products'
import { useCustomersStore } from '@/stores/customers'
import { useTransactionsStore } from '@/stores/transactions'
import { useReturnsStore } from '@/stores/returns'
import { useToast } from '@/composables/useToast'

const router = useRouter()
const route = useRoute()
const productsStore = useProductsStore()
const customersStore = useCustomersStore()
const transactionsStore = useTransactionsStore()
const returnsStore = useReturnsStore()
const toast = useToast()

const selectedCustomerId = ref((route.params.customerId as string) || '')
const discountInput = ref('')
const notes = ref('')
const isSubmitting = ref(false)
const showProductPicker = ref(false)
const showPaymentModal = ref(false)
const showCustomerPicker = ref(false)
const showReturnPicker = ref(false)

const selectedCustomer = computed(() =>
  customersStore.customers.find((c) => c.id === selectedCustomerId.value) || null
)

interface ReturnSelection {
  transaction_id: string
  transaction_number: string
  product_id: string
  product_name: string
  price: number
  quantity: number
  subtotal: number
}

const returnItems = ref<ReturnSelection[]>([])

const totalReturnAmount = computed(() =>
  returnItems.value.reduce((sum, item) => sum + item.subtotal, 0)
)

const netTotal = computed(() =>
  Math.max(subtotal.value - discount.value - totalReturnAmount.value, 0)
)

interface Payment {
  amount: number
  payment_method: string
  notes?: string
}

const payment = ref<Payment | null>(null)

interface CartItem {
  product_id: string
  name: string
  price: number
  stock: number
  quantity: number
  subtotal: number
}

const cartItems = reactive<CartItem[]>([])

const subtotal = computed(() =>
  cartItems.reduce((sum, item) => sum + item.subtotal, 0)
)

const discount = computed(() => {
  return parseInt(discountInput.value.replace(/\D/g, '')) || 0
})

const total = computed(() => Math.max(subtotal.value - discount.value, 0))

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value || 0)

const formatNumber = (value: number) =>
  (value || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')

const parseNumber = (value: string) => parseInt(value.replace(/\D/g, '')) || 0

const updatePrice = (item: CartItem, rawValue: string) => {
  item.price = parseNumber(rawValue)
  item.subtotal = item.price * item.quantity
}

const formatDate = (date: Date) =>
  date.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

const formatPaymentMethod = (value: string) => {
  const methods: Record<string, string> = {
    tunai: 'Tunai',
    transfer: 'Transfer',
    qris: 'QRIS',
  }
  return methods[value] || value
}

const handlePaymentSubmit = (payload: {
  amount: number
  payment_method: string
  notes?: string
}) => {
  payment.value = { ...payload }
  toast.success('Berhasil!', 'Pembayaran dicatat')
  showPaymentModal.value = false
}

const handleReturnConfirm = (items: ReturnSelection[]) => {
  returnItems.value = items
  showReturnPicker.value = false
  if (items.length > 0) {
    toast.success('Retur Dipilih', `${items.length} item akan diretur (-${formatCurrency(totalReturnAmount.value)})`)
  }
}

const handleAddProduct = ({ products, quantity }: { products: any[]; quantity: number }) => {
  let addedCount = 0
  products.forEach((product) => {
    const existing = cartItems.find((item) => item.product_id === product.id)
    if (existing) {
      const newQty = Math.min(existing.quantity + quantity, existing.stock)
      existing.quantity = newQty
      existing.subtotal = newQty * existing.price
    } else {
      cartItems.push({
        product_id: product.id,
        name: product.name,
        price: product.price_sell,
        stock: product.stock,
        quantity: Math.min(quantity, product.stock),
        subtotal: product.price_sell * Math.min(quantity, product.stock),
      })
    }
    addedCount += 1
  })
  toast.success('Ditambahkan', `${addedCount} produk masuk keranjang`)
}

const updateQuantity = (item: CartItem, rawValue: string) => {
  const numValue = parseInt(rawValue.replace(/\D/g, '')) || 0
  if (numValue > 0) {
    item.quantity = numValue
    item.subtotal = item.quantity * item.price
  }
}

const validateQuantity = (item: CartItem) => {
  if (item.quantity < 1) {
    removeFromCart(item.product_id)
    return
  }
  if (item.quantity > item.stock) {
    item.quantity = item.stock
    item.subtotal = item.quantity * item.price
    toast.error('Stok Tidak Cukup', `Stok ${item.name} hanya tersedia ${item.stock} unit`)
  }
}

const removeFromCart = (productId: string) => {
  const index = cartItems.findIndex((i) => i.product_id === productId)
  if (index !== -1) cartItems.splice(index, 1)
}

const handleSubmit = async () => {
  if (isSubmitting.value) return

  if (!selectedCustomerId.value) {
    toast.error('Gagal!', 'Customer harus dipilih dari daftar yang tersedia')
    return
  }

  if (cartItems.length === 0) {
    toast.error('Gagal!', 'Belum ada produk di keranjang')
    return
  }

  isSubmitting.value = true
  try {
    const selectedCustomer = customersStore.customers.find(
      (c) => c.id === selectedCustomerId.value
    )

    const transactionId = await transactionsStore.createTransaction({
      customer_id: selectedCustomer?.id || undefined,
      customer_name: selectedCustomer?.name,
      payment_method: payment.value?.payment_method || 'tunai',
      paid_amount: payment.value?.amount || 0,
      discount: discount.value,
      return_amount: totalReturnAmount.value,
      notes: notes.value.trim() || undefined,
      items: cartItems.map((item) => ({
        product_id: item.product_id,
        quantity: item.quantity,
        price: item.price,
      })),
    })

    // Process returns if any
    if (returnItems.value.length > 0) {
      // Group returns by transaction_id
      const returnsByTx = new Map<string, { product_id: string; quantity: number }[]>()
      returnItems.value.forEach((item) => {
        if (!returnsByTx.has(item.transaction_id)) {
          returnsByTx.set(item.transaction_id, [])
        }
        returnsByTx.get(item.transaction_id)!.push({
          product_id: item.product_id,
          quantity: item.quantity,
        })
      })

      // Create returns for each transaction
      for (const [txId, items] of returnsByTx) {
        await returnsStore.createReturn(txId, items, `Retur gabungan dengan transaksi baru`)
      }
    }

    toast.success('Berhasil!', 'Transaksi berhasil disimpan')
    router.push(`/customer-invoices/${route.params.kecamatan}/${route.params.customerId}`)
  } catch (error: any) {
    console.error('Error creating transaction:', error)
    toast.error('Gagal!', error.message || 'Gagal menyimpan transaksi')
  } finally {
    isSubmitting.value = false
  }
}

onMounted(async () => {
  try {
    await Promise.all([
      productsStore.fetchProducts(),
      customersStore.fetchCustomers(),
    ])
  } catch (error) {
    console.error('Error loading data:', error)
    toast.error('Gagal!', 'Gagal memuat data produk/customer')
  }
})
</script>
