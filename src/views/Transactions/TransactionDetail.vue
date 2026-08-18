<template>
  <AdminLayout>
    <PageBreadcrumb pageTitle="Detail Transaksi" class="hidden md:block" />

    <!-- Mobile Header with Back Button -->
    <div class="mb-6 flex items-center gap-3 pl-2 pr-4 md:hidden">
      <button
        @click="router.push('/transactions')"
        class="flex h-10 w-10 items-center justify-center rounded-lg text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/[0.03]"
      >
        <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <h1 class="text-2xl font-semibold text-gray-900 dark:text-white">Detail Transaksi</h1>
    </div>

    <div v-if="loading" class="flex items-center justify-center py-12">
      <div class="text-center">
        <svg class="mx-auto h-12 w-12 animate-spin text-brand-500" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p class="mt-4 text-sm text-gray-600 dark:text-gray-400">Memuat data transaksi...</p>
      </div>
    </div>

    <div v-else-if="transaction" class="mx-auto max-w-3xl">
      <!-- Invoice Card -->
      <div class="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <!-- Invoice Header -->
        <div class="flex flex-col gap-4 border-b border-gray-200 p-6 dark:border-gray-700 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 class="text-xl font-bold text-gray-900 dark:text-white">{{ settingsStore.storeName }}</h2>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">{{ settingsStore.storeSubtitle }}</p>
          </div>
          <div class="text-left sm:text-right">
            <p class="text-sm font-semibold text-brand-600 dark:text-brand-400">
              {{ transaction.transaction_number }}
            </p>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">{{ formatDate(transaction.created_at) }}</p>
            <div class="mt-2 flex gap-2 sm:justify-end">
              <span
                :class="[
                  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                  transaction.payment_status === 'lunas'
                    ? 'bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-400'
                    : 'bg-warning-50 text-warning-600 dark:bg-warning-500/10 dark:text-warning-400'
                ]"
              >
                {{ transaction.payment_status === 'lunas' ? 'Lunas' : 'Belum Lunas' }}
              </span>
              <span
                :class="[
                  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                  transaction.status === 'selesai'
                    ? 'bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-400'
                    : 'bg-error-50 text-error-600 dark:bg-error-500/10 dark:text-error-400'
                ]"
              >
                {{ transaction.status === 'selesai' ? 'Selesai' : 'Batal' }}
              </span>
            </div>
          </div>
        </div>

        <!-- Customer Info -->
        <div class="grid grid-cols-1 gap-4 border-b border-gray-200 p-6 dark:border-gray-700 sm:grid-cols-2">
          <div>
            <p class="text-xs font-medium text-gray-400 uppercase dark:text-gray-500">Ditagih kepada</p>
            <p class="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
              {{ transaction.customer_name || 'Umum (tanpa customer)' }}
            </p>
            <p v-if="transaction.notes" class="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Catatan: {{ transaction.notes }}
            </p>
          </div>
          <div class="text-left sm:text-right">
            <p class="text-xs font-medium text-gray-400 uppercase dark:text-gray-500">Pembayaran</p>
            <p class="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
              {{ formatPaymentMethod(transaction.payment_method) }}
            </p>
          </div>
        </div>

        <!-- Items Table -->
        <div class="border-b border-gray-200 dark:border-gray-700">
          <div v-if="transaction.items && transaction.items.length > 0" class="overflow-x-auto">
            <table class="w-full text-left">
              <thead>
                <tr class="bg-gray-50 dark:bg-gray-800/50">
                  <th class="px-6 py-3 text-xs font-medium text-gray-500 uppercase dark:text-gray-400">No</th>
                  <th class="px-6 py-3 text-xs font-medium text-gray-500 uppercase dark:text-gray-400">Produk</th>
                  <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase dark:text-gray-400">Harga</th>
                  <th class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase dark:text-gray-400">Qty</th>
                  <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase dark:text-gray-400">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(item, index) in transaction.items"
                  :key="item.id"
                  class="border-t border-gray-100 dark:border-gray-800"
                >
                  <td class="px-6 py-3 text-sm text-gray-500 dark:text-gray-400">{{ index + 1 }}</td>
                  <td class="px-6 py-3 text-sm font-medium text-gray-900 dark:text-white">
                    {{ item.product_name }}
                    <span
                      v-if="returnedQty(item.product_id) > 0"
                      class="block text-xs font-normal text-error-600 dark:text-error-400"
                    >
                      {{ returnedQty(item.product_id) }} item diretur
                    </span>
                  </td>
                  <td class="px-6 py-3 text-right text-sm text-gray-600 dark:text-gray-400">{{ formatCurrency(item.price) }}</td>
                  <td class="px-6 py-3 text-center text-sm text-gray-600 dark:text-gray-400">{{ item.quantity }}</td>
                  <td class="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">{{ formatCurrency(item.subtotal) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-else class="px-6 py-6 text-center">
            <p class="text-sm text-gray-500 dark:text-gray-400">Tidak ada rincian item</p>
          </div>
        </div>

        <!-- Produk Diretur -->
        <div v-if="allReturnItems.length > 0" class="border-b border-gray-200 dark:border-gray-700">
          <div class="bg-error-50 px-6 py-3 dark:bg-error-500/10">
            <p class="text-sm font-semibold text-error-700 dark:text-error-400">
              <span class="inline-flex items-center gap-1.5">
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
                Produk Diretur
              </span>
            </p>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-left">
              <thead>
                <tr class="bg-error-50/50 dark:bg-error-500/5">
                  <th class="px-6 py-3 text-xs font-medium text-error-600 uppercase dark:text-error-400">No</th>
                  <th class="px-6 py-3 text-xs font-medium text-error-600 uppercase dark:text-error-400">Produk</th>
                  <th class="px-6 py-3 text-right text-xs font-medium text-error-600 uppercase dark:text-error-400">Harga</th>
                  <th class="px-6 py-3 text-center text-xs font-medium text-error-600 uppercase dark:text-error-400">Qty</th>
                  <th class="px-6 py-3 text-right text-xs font-medium text-error-600 uppercase dark:text-error-400">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(item, index) in allReturnItems"
                  :key="item.product_id"
                  class="border-t border-error-100 dark:border-error-500/10"
                >
                  <td class="px-6 py-3 text-sm text-error-500 dark:text-error-400">{{ index + 1 }}</td>
                  <td class="px-6 py-3 text-sm font-medium text-error-700 dark:text-error-300">
                    {{ item.product_name }}
                  </td>
                  <td class="px-6 py-3 text-right text-sm text-error-600 dark:text-error-400">{{ formatCurrency(item.price) }}</td>
                  <td class="px-6 py-3 text-center text-sm text-error-600 dark:text-error-400">{{ item.quantity }}</td>
                  <td class="px-6 py-3 text-right text-sm font-semibold text-error-700 dark:text-error-300">- {{ formatCurrency(item.subtotal) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Totals -->
        <div class="grid grid-cols-1 gap-6 border-b border-gray-200 p-6 dark:border-gray-700 sm:grid-cols-2">
          <!-- Payment History -->
          <div>
            <p class="mb-3 text-xs font-medium text-gray-400 uppercase dark:text-gray-500">Riwayat Pembayaran</p>
            <div v-if="transaction.payments && transaction.payments.length > 0" class="space-y-2">
              <div
                v-for="payment in transaction.payments"
                :key="payment.id"
                class="flex items-center justify-between gap-2"
              >
                <div class="min-w-0">
                  <p class="truncate text-sm text-gray-700 dark:text-gray-300">
                    {{ formatDate(payment.created_at) }}
                  </p>
                  <p class="text-xs text-gray-400 dark:text-gray-500">
                    {{ formatPaymentMethod(payment.payment_method) }}
                  </p>
                </div>
                <span class="text-sm font-semibold text-success-600 dark:text-success-400">
                  + {{ formatCurrency(payment.amount) }}
                </span>
              </div>
            </div>
            <div v-else>
              <p class="text-sm text-gray-400 dark:text-gray-500">Belum ada pembayaran dicatat</p>
            </div>
          </div>

          <!-- Total Summary -->
          <div class="space-y-2">
            <div class="flex justify-between text-sm">
              <span class="text-gray-600 dark:text-gray-400">Total Barang</span>
              <span class="font-medium text-gray-900 dark:text-white">{{ formatCurrency(originalSubtotal) }}</span>
            </div>
            <div v-if="returnAmount > 0" class="flex justify-between text-sm">
              <span class="text-error-600 dark:text-error-400">Retur</span>
              <span class="font-medium text-error-600 dark:text-error-400">- {{ formatCurrency(returnAmount) }}</span>
            </div>
            <div v-if="discountAmount > 0" class="flex justify-between text-sm">
              <span class="text-gray-600 dark:text-gray-400">Diskon</span>
              <span class="font-medium text-error-600 dark:text-error-400">- {{ formatCurrency(discountAmount) }}</span>
            </div>
            <div v-if="(transaction.shipping_cost || 0) > 0" class="flex justify-between text-sm">
              <span class="text-gray-600 dark:text-gray-400">Ongkir</span>
              <span class="font-medium text-gray-900 dark:text-white">+ {{ formatCurrency(transaction.shipping_cost) }}</span>
            </div>
            <div class="flex justify-between border-t border-gray-200 pt-2 dark:border-gray-700">
              <span class="text-sm font-semibold text-gray-700 dark:text-gray-300">Total</span>
              <span class="text-lg font-bold text-brand-600 dark:text-brand-400">{{ formatCurrency(transaction.total) }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-gray-600 dark:text-gray-400">Sudah Dibayar</span>
              <span class="font-medium text-gray-900 dark:text-white">{{ formatCurrency(transaction.paid_amount) }}</span>
            </div>
            <div v-if="transaction.change_amount > 0" class="flex justify-between text-sm">
              <span class="text-gray-600 dark:text-gray-400">Kembalian</span>
              <span class="font-medium text-gray-900 dark:text-white">{{ formatCurrency(transaction.change_amount) }}</span>
            </div>
            <div
              v-if="transaction.remaining_amount > 0"
              class="flex justify-between rounded-lg bg-warning-50 px-3 py-2 dark:bg-warning-500/10"
            >
              <span class="text-sm font-medium text-warning-700 dark:text-warning-400">Sisa Cicilan</span>
              <span class="text-sm font-bold text-warning-700 dark:text-warning-400">
                {{ formatCurrency(transaction.remaining_amount) }}
              </span>
            </div>
          </div>
        </div>

        <!-- Footer Actions -->
        <div class="flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div class="flex flex-wrap gap-3">
            <button
              @click="router.push(`/transactions/${transaction.id}/invoice`)"
              class="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 focus:outline-hidden focus:ring-3 focus:ring-brand-500/30"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4H7v4a2 2 0 002 2z" />
              </svg>
              Cetak Invoice
            </button>
            <button
              v-if="transaction.remaining_amount > 0"
              @click="showPaymentModal = true"
              class="inline-flex items-center gap-2 rounded-lg border border-brand-500 bg-transparent px-4 py-2.5 text-sm font-medium text-brand-600 hover:bg-brand-50 focus:outline-hidden focus:ring-3 focus:ring-brand-500/30 dark:text-brand-400 dark:hover:bg-brand-500/15"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
              Tambah Pembayaran
            </button>
            <button
              v-if="transaction.status === 'selesai'"
              @click="showReturnModal = true"
              class="inline-flex items-center gap-2 rounded-lg border border-brand-500 bg-transparent px-4 py-2.5 text-sm font-medium text-brand-600 hover:bg-brand-50 focus:outline-hidden focus:ring-3 focus:ring-brand-500/30 dark:text-brand-400 dark:hover:bg-brand-500/15"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
              Retur Barang
            </button>
            <button
              v-if="transaction.status === 'selesai'"
              @click="showVoidDialog = true"
              class="rounded-lg border border-error-500 bg-transparent px-4 py-2.5 text-sm font-medium text-error-600 hover:bg-error-50 focus:outline-hidden focus:ring-3 focus:ring-error-500/30 dark:text-error-500 dark:hover:bg-error-500/15"
            >
              Batalkan Transaksi
            </button>
          </div>
          <button
            @click="router.push('/transactions')"
            class="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-white/[0.03]"
          >
            Kembali
          </button>
        </div>
      </div>

      <!-- Riwayat Retur -->
      <div class="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div class="flex items-center justify-between border-b border-gray-200 p-6 dark:border-gray-700">
          <h3 class="text-base font-semibold text-gray-900 dark:text-white">Riwayat Retur</h3>
          <span class="text-sm text-gray-500 dark:text-gray-400">{{ returnsStore.returns.length }} retur</span>
        </div>
        <div v-if="returnsStore.returns.length === 0" class="p-6 text-center">
          <p class="text-sm text-gray-500 dark:text-gray-400">Belum ada retur untuk transaksi ini</p>
        </div>
        <div v-else class="divide-y divide-gray-100 dark:divide-gray-800">
          <div v-for="ret in returnsStore.returns" :key="ret.id" class="p-6">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="text-sm font-semibold text-gray-900 dark:text-white">{{ ret.return_number }}</p>
                <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{{ formatDate(ret.created_at) }}</p>
                <p v-if="ret.notes" class="mt-1 text-xs text-gray-500 dark:text-gray-400">Catatan: {{ ret.notes }}</p>
              </div>
              <div class="flex items-center gap-3">
                <span class="text-sm font-bold text-error-600 dark:text-error-400">- {{ formatCurrency(ret.total_refund) }}</span>
                <button
                  @click="openDeleteReturn(ret)"
                  class="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-error-600 dark:hover:bg-white/[0.03] dark:hover:text-error-500"
                  title="Batalkan Retur"
                >
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
            <div class="mt-3 space-y-1">
              <div
                v-for="item in ret.items"
                :key="item.id"
                class="flex items-center justify-between text-sm"
              >
                <span class="text-gray-600 dark:text-gray-400">{{ item.product_name }} × {{ item.quantity }}</span>
                <span class="text-gray-700 dark:text-gray-300">{{ formatCurrency(item.subtotal) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="rounded-xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-gray-900">
      <p class="text-gray-600 dark:text-gray-400">Transaksi tidak ditemukan</p>
      <button
        @click="router.push('/transactions')"
        class="mt-4 rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-600"
      >
        Kembali ke Daftar Transaksi
      </button>
    </div>

    <!-- Payment Modal -->
    <PaymentModal
      v-model="showPaymentModal"
      :transaction-number="transaction?.transaction_number"
      :remaining="transaction?.remaining_amount || 0"
      @submit="handleAddPayment"
    />

    <!-- Return Modal -->
    <ReturnModal
      v-model="showReturnModal"
      :transaction-number="transaction?.transaction_number"
      :items="returnableItems"
      @submit="handleReturnSubmit"
    />

    <!-- Delete Return Confirmation Dialog -->
    <ConfirmDialog
      v-model="showDeleteReturnDialog"
      title="Batalkan Retur?"
      :message="`Apakah Anda yakin ingin membatalkan retur '${returnToDelete?.return_number}'? Stok produk akan dikurangi kembali.`"
      confirm-text="Ya, Batalkan"
      cancel-text="Tutup"
      variant="danger"
      @confirm="confirmDeleteReturn"
    />

    <!-- Void Confirmation Dialog -->
    <ConfirmDialog
      v-model="showVoidDialog"
      title="Batalkan Transaksi?"
      :message="`Apakah Anda yakin ingin membatalkan transaksi '${transaction?.transaction_number}'? Stok produk akan dikembalikan dan transaksi ditandai 'batal'. Riwayat tetap tersimpan.`"
      confirm-text="Ya, Batalkan"
      cancel-text="Tutup"
      variant="danger"
      @confirm="confirmVoid"
    />
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import PaymentModal from '@/components/common/PaymentModal.vue'
import ReturnModal from '@/components/common/ReturnModal.vue'
import { useTransactionsStore } from '@/stores/transactions'
import { useReturnsStore } from '@/stores/returns'
import { useStoreSettingsStore } from '@/stores/storeSettings'
import { useToast } from '@/composables/useToast'

const router = useRouter()
const route = useRoute()
const transactionsStore = useTransactionsStore()
const returnsStore = useReturnsStore()
const settingsStore = useStoreSettingsStore()
const toast = useToast()

const transactionId = route.params.id as string
const transaction = ref<any>(null)
const loading = ref(true)
const showVoidDialog = ref(false)
const showPaymentModal = ref(false)
const showReturnModal = ref(false)
const showDeleteReturnDialog = ref(false)
const returnToDelete = ref<any>(null)

// Total nilai barang yang sudah diretur
const totalRefund = computed(() =>
  returnsStore.returns.reduce((sum, r) => sum + (r.total_refund || 0), 0)
)

const returnAmount = computed(() => transaction.value?.return_amount || totalRefund.value)
const discountAmount = computed(() => transaction.value?.discount || 0)

// Nilai seluruh barang sebelum retur (jumlah dari rincian item asli)
const originalSubtotal = computed(() => {
  const items = transaction.value?.items
  if (items && items.length > 0) {
    return items.reduce((sum: number, item: any) => sum + (item.subtotal || 0), 0)
  }
  return (transaction.value?.subtotal || 0) + returnAmount.value
})

// Gabungkan semua item retur (digest per produk)
const allReturnItems = computed(() => {
  const items: { product_id: string; product_name: string; price: number; quantity: number; subtotal: number }[] = []
  returnsStore.returns.forEach((ret) => {
    (ret.items || []).forEach((item) => {
      if (!item.product_id) return
      const existing = items.find((i) => i.product_id === item.product_id)
      if (existing) {
        existing.quantity += item.quantity
        existing.subtotal += item.subtotal
      } else {
        items.push({
          product_id: item.product_id,
          product_name: item.product_name,
          price: item.price,
          quantity: item.quantity,
          subtotal: item.subtotal,
        })
      }
    })
  })
  return items
})

// Jumlah unit yang sudah diretur untuk sebuah produk
const returnedQty = (productId: string) =>
  returnsStore.returns.reduce(
    (sum, ret) =>
      sum +
      (ret.items || [])
        .filter((ri) => ri.product_id && ri.product_id === productId)
        .reduce((s, ri) => s + ri.quantity, 0),
    0
  )

// Item yang bisa diretur: sisa = jumlah dibeli - jumlah yang sudah diretur
const returnableItems = computed(() => {
  const txItems = transaction.value?.items || []
  return txItems
    .filter((item: any) => item.product_id)
    .map((item: any) => {
      const returned = returnsStore.returns.reduce((sum, ret) => {
        return (
          sum +
          (ret.items || [])
            .filter((ri) => ri.product_id === item.product_id)
            .reduce((s, ri) => s + ri.quantity, 0)
        )
      }, 0)
      return {
        product_id: item.product_id,
        product_name: item.product_name,
        price: item.price,
        max: Math.max(item.quantity - returned, 0),
      }
    })
})

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value || 0)

const formatPaymentMethod = (value: string) => {
  const methods: Record<string, string> = {
    tunai: 'Tunai',
    transfer: 'Transfer',
    qris: 'QRIS',
  }
  return methods[value] || value
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const handleAddPayment = async (payload: {
  amount: number
  payment_method: string
  notes?: string
}) => {
  try {
    await transactionsStore.addPayment(
      transactionId,
      payload.amount,
      payload.payment_method,
      payload.notes
    )
    toast.success('Berhasil!', 'Pembayaran berhasil dicatat')
    transaction.value = await transactionsStore.getTransaction(transactionId)
    showPaymentModal.value = false
  } catch (error: any) {
    console.error('Error adding payment:', error)
    toast.error('Gagal!', error.message || 'Gagal mencatat pembayaran')
  }
}

const confirmVoid = async () => {
  try {
    await transactionsStore.voidTransaction(transactionId)
    toast.success('Berhasil!', 'Transaksi berhasil dibatalkan')
    router.push('/transactions')
  } catch (error) {
    console.error('Error voiding transaction:', error)
    toast.error('Gagal!', 'Gagal membatalkan transaksi')
  }
}

const handleReturnSubmit = async (payload: {
  items: { product_id: string; quantity: number }[]
  notes?: string
}) => {
  try {
    await returnsStore.createReturn(transactionId, payload.items, payload.notes)
    toast.success('Berhasil!', 'Retur berhasil dicatat')
    transaction.value = await transactionsStore.getTransaction(transactionId)
    showReturnModal.value = false
  } catch (error: any) {
    console.error('Error creating return:', error)
    toast.error('Gagal!', error.message || 'Gagal mencatat retur')
  }
}

const openDeleteReturn = (ret: any) => {
  returnToDelete.value = ret
  showDeleteReturnDialog.value = true
}

const confirmDeleteReturn = async () => {
  if (!returnToDelete.value) return
  try {
    await returnsStore.deleteReturn(returnToDelete.value.id, transactionId)
    toast.success('Berhasil!', 'Retur berhasil dibatalkan')
    transaction.value = await transactionsStore.getTransaction(transactionId)
    returnToDelete.value = null
  } catch (error: any) {
    console.error('Error deleting return:', error)
    toast.error('Gagal!', error.message || 'Gagal membatalkan retur')
  }
}

onMounted(async () => {
  try {
    transaction.value = await transactionsStore.getTransaction(transactionId)
    await returnsStore.fetchReturns(transactionId)
  } catch (error) {
    console.error('Error loading transaction:', error)
    toast.error('Gagal!', 'Gagal memuat data transaksi')
  } finally {
    loading.value = false
  }
})
</script>
