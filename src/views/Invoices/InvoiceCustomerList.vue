<template>
  <AdminLayout>
    <PageBreadcrumb pageTitle="Invoice Pelanggan" class="hidden md:block" />
    <div class="space-y-6">
      <!-- ============ MOBILE: Header ============ -->
      <MobilePageHeader :title="'Customer di ' + kecamatan" subtitle="Pilih mitra untuk melihat riwayat invoice & piutang" back-to="/customer-invoices" />

      <!-- ============ DESKTOP: Header ============ -->
      <div class="hidden items-center gap-2 md:flex">
        <button
          @click="router.push('/customer-invoices')"
          class="flex-shrink-0 inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white p-1.5 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03]"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div class="min-w-0 flex-1">
          <h1 class="text-xl sm:text-2xl font-bold text-gray-900 break-words dark:text-white">
            Customer di {{ kecamatan }}
          </h1>
          <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Pilih customer untuk melihat daftar invoice-nya
          </p>
        </div>
      </div>

      <!-- ============ MOBILE: Search Bar ============ -->
      <div v-if="!loading && customersInKecamatan.length > 0" class="relative md:hidden">
        <Search class="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Cari nama kios, pemilik, no. telepon..."
          class="w-full rounded-2xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-xs text-gray-900 placeholder-gray-400 shadow-inner focus:border-brand-500 focus:outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-white dark:placeholder-gray-500"
        />
      </div>

      <!-- ============ MOBILE: Filter Chip Horizontal ============ -->
      <div
        v-if="!loading && customersInKecamatan.length > 0"
        class="no-scrollbar flex items-center gap-1.5 overflow-x-auto text-xs md:hidden"
      >
        <button
          @click="setFilter('all')"
          class="whitespace-nowrap rounded-xl px-3.5 py-1.5 font-semibold transition"
          :class="activeFilter === 'all'
            ? 'bg-brand-500 text-white shadow-sm'
            : 'bg-white text-gray-500 border border-gray-200 dark:bg-gray-900 dark:border-gray-800'"
        >
          Semua ({{ customersInKecamatan.length }})
        </button>
        <button
          @click="setFilter('debt')"
          class="whitespace-nowrap rounded-xl px-3.5 py-1.5 font-semibold transition"
          :class="activeFilter === 'debt'
            ? 'bg-brand-500 text-white shadow-sm'
            : 'text-error-500 border border-error-500/20 bg-white dark:bg-gray-900'"
        >
          Ada Piutang ({{ overdueCustomers.length }})
        </button>
        <button
          @click="setFilter('top')"
          class="whitespace-nowrap rounded-xl px-3.5 py-1.5 font-semibold transition"
          :class="activeFilter === 'top'
            ? 'bg-brand-500 text-white shadow-sm'
            : 'text-gray-500 border border-gray-200 bg-white dark:bg-gray-900 dark:border-gray-800'"
        >
          Invoice Terbanyak
        </button>
      </div>

      <!-- ============ DESKTOP: Search + Sort ============ -->
      <div v-if="!loading && customersInKecamatan.length > 0" class="hidden relative md:block">
        <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Cari customer (nama, toko, atau telepon)..."
          class="w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder-gray-500"
        />
      </div>

      <!-- Desktop Sort -->
      <div v-if="!loading && customersInKecamatan.length > 0" class="hidden items-center gap-2 md:flex">
        <select
          v-model="sortOrder"
          class="flex-1 appearance-none rounded-xl border border-gray-300 bg-white py-2.5 px-3 pr-8 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
        >
          <option value="name-asc">Nama A-Z</option>
          <option value="name-desc">Nama Z-A</option>
          <option value="invoice-desc">Invoice Terbanyak</option>
          <option value="invoice-asc">Invoice Tersedikit</option>
        </select>
      </div>

      <!-- Loading State -->
      <div
        v-if="loading"
        class="flex items-center justify-center rounded-xl border border-gray-200 bg-white py-16 dark:border-gray-800 dark:bg-white/[0.03]"
      >
        <p class="text-sm text-gray-500 dark:text-gray-400">Memuat data...</p>
      </div>

      <!-- Empty State -->
      <div
        v-else-if="customersInKecamatan.length === 0"
        class="rounded-xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-white/[0.03]"
      >
        <p class="text-gray-600 dark:text-gray-400">Belum ada customer di kecamatan {{ kecamatan }}</p>
        <button
          @click="router.push('/customer-invoices')"
          class="mt-4 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
        >
          Kembali Pilih Kecamatan
        </button>
      </div>

      <!-- ============ MOBILE: List Card Customer ============ -->
      <div v-else-if="true" class="space-y-3 md:hidden">
        <div
          v-for="customer in filteredCustomers"
          :key="customer.id"
          @click="goToCustomer(customer.id)"
          class="cursor-pointer rounded-2xl border border-gray-200 bg-white p-3.5 shadow-md transition active:scale-[0.99] dark:border-gray-800 dark:bg-white/[0.03]"
        >
          <div class="flex justify-between items-start gap-2">
            <div class="min-w-0 space-y-0.5">
              <h2 class="font-outfit text-sm font-bold text-gray-900 dark:text-white">
                {{ customer.name }}
              </h2>
              <p
                v-if="customer.store_name"
                class="text-xs font-medium text-gray-500 dark:text-gray-300"
              >
                {{ customer.store_name }}
              </p>
              <p v-if="customer.phone" class="font-mono text-[11px] text-gray-400 dark:text-gray-500">
                {{ customer.phone }}
              </p>
            </div>

            <span
              v-if="hasDebt(customer.id)"
              class="flex-shrink-0 rounded-lg border border-error-500/30 bg-error-500/10 px-2.5 py-1 text-[10px] font-bold text-error-500 dark:text-error-400"
            >
              Sisa: {{ formatCurrency(customerOutstanding(customer.id)) }}
            </span>
            <span
              v-else
              class="flex-shrink-0 rounded-lg border border-success-500/20 bg-success-500/10 px-2.5 py-1 text-[10px] font-bold text-success-600 dark:text-success-400"
            >
              Lunas
            </span>
          </div>

          <div class="flex items-center justify-between border-t border-gray-100 pt-2 text-xs dark:border-gray-800/60">
            <button
              @click="goToCustomer(customer.id)"
              class="rounded-lg border border-brand-500/20 bg-brand-500/10 px-2.5 py-1 text-[11px] font-semibold text-brand-500 transition hover:bg-brand-500/20 active:scale-95"
            >
              {{ invoiceCount(customer.id) }} Invoice
            </button>

            <div class="flex items-center gap-2">
              <a
                v-if="customer.phone"
                :href="waLink(customer.phone)"
                target="_blank"
                @click.stop
                class="flex h-8 w-8 items-center justify-center rounded-xl border border-success-500/30 bg-success-500/10 text-success-600 transition active:scale-95 dark:text-success-400"
              >
                <MessageCircle class="h-4 w-4" />
              </a>
              <button
                @click.stop="goToAddTransaction(customer.id)"
                class="font-outfit flex items-center gap-1 rounded-xl bg-brand-500 px-3 py-1.5 text-[11px] font-bold text-white shadow-md shadow-brand-500/20 transition hover:bg-brand-600 active:scale-95"
              >
                <Plus class="h-3.5 w-3.5" />
                <span>Buat Nota</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- ============ DESKTOP: Grid Customer ============ -->
      <div v-else class="hidden grid-cols-1 gap-3 md:grid sm:grid-cols-2 lg:grid-cols-3">
        <button
          v-for="customer in filteredCustomers"
          :key="customer.id"
          @click="goToCustomer(customer.id)"
          class="flex flex-col items-start gap-1 rounded-xl border border-gray-200 bg-white p-4 text-left transition hover:border-brand-500 hover:shadow-md dark:border-gray-800 dark:bg-white/[0.03] dark:hover:border-brand-500"
        >
          <span class="text-sm font-semibold text-gray-900 dark:text-white">{{ customer.name }}</span>
          <span v-if="customer.store_name" class="text-xs text-gray-500 dark:text-gray-400">
            {{ customer.store_name }}
          </span>
          <span v-if="customer.phone" class="text-xs text-gray-400">
            {{ customer.phone }}
          </span>
          <span
            class="mt-1 inline-flex items-center rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-600 dark:bg-brand-500/10 dark:text-brand-400"
          >
            {{ invoiceCount(customer.id) }} invoice
          </span>
        </button>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { MessageCircle, Plus, Search } from 'lucide-vue-next'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import MobilePageHeader from '@/components/common/MobilePageHeader.vue'
import { useCustomersStore } from '@/stores/customers'
import { useTransactionsStore } from '@/stores/transactions'
import { useToast } from '@/composables/useToast'
import type { Customer } from '@/types/database'

const router = useRouter()
const route = useRoute()
const customersStore = useCustomersStore()
const transactionsStore = useTransactionsStore()
const toast = useToast()

const kecamatan = route.params.kecamatan as string
const loading = ref(true)
const searchQuery = ref('')
const sortOrder = ref('name-asc')
const activeFilter = ref<'all' | 'debt' | 'top'>('all')

const customersInKecamatan = computed(() =>
  customersStore.customers.filter((c) => c.kecamatan === kecamatan)
)

const customerInvoices = (customerId: string) =>
  transactionsStore.transactions.filter((t) => t.customer_id === customerId)

const invoiceCount = (customerId: string) => customerInvoices(customerId).length

const customerOutstanding = (customerId: string) =>
  customerInvoices(customerId).reduce(
    (sum, t) => sum + (t.remaining_amount || 0),
    0
  )

const hasDebt = (customerId: string) => customerOutstanding(customerId) > 0

const overdueCustomers = computed(() =>
  customersInKecamatan.value.filter((c) => hasDebt(c.id))
)

const filteredCustomers = computed<Customer[]>(() => {
  let result = [...customersInKecamatan.value]

  if (activeFilter.value === 'debt') {
    result = result.filter((customer) => hasDebt(customer.id))
  }

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase()
    result = result.filter(
      (customer) =>
        customer.name.toLowerCase().includes(q) ||
        customer.store_name?.toLowerCase().includes(q) ||
        customer.phone?.toLowerCase().includes(q)
    )
  }

  if (activeFilter.value === 'top') {
    return result.sort(
      (a, b) => invoiceCount(b.id) - invoiceCount(a.id)
    )
  }

  return result.sort((a, b) => {
    switch (sortOrder.value) {
      case 'name-asc':
        return a.name.localeCompare(b.name)
      case 'name-desc':
        return b.name.localeCompare(a.name)
      case 'invoice-desc':
        return invoiceCount(b.id) - invoiceCount(a.id)
      case 'invoice-asc':
        return invoiceCount(a.id) - invoiceCount(b.id)
      default:
        return 0
    }
  })
})

const setFilter = (filter: 'all' | 'debt' | 'top') => {
  activeFilter.value = filter
}

const waLink = (phone: string) => {
  let digits = phone.replace(/[^0-9]/g, '')
  if (digits.startsWith('0')) {
    digits = '62' + digits.slice(1)
  }
  // Use intent URL for Android to open regular WhatsApp (not Business)
  // Falls back to web.whatsapp.com if not on Android
  return `intent://send?phone=${digits}#Intent;scheme=whatsapp;package=com.whatsapp;end;`
}

const goToCustomer = (customerId: string) => {
  router.push(`/customer-invoices/${encodeURIComponent(kecamatan)}/${customerId}`)
}

const goToAddTransaction = (customerId: string) => {
  router.push(
    `/customer-invoices/${encodeURIComponent(kecamatan)}/${customerId}/add-transaction`
  )
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value || 0)

onMounted(async () => {
  try {
    await Promise.all([
      customersStore.fetchCustomers(),
      transactionsStore.fetchTransactions(),
    ])
  } catch (error) {
    console.error('Error loading invoice data:', error)
    toast.error('Gagal!', 'Gagal memuat data customer dan transaksi')
  } finally {
    loading.value = false
  }
})
</script>
