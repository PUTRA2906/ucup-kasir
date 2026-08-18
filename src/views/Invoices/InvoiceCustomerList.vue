<template>
  <AdminLayout>
    <PageBreadcrumb pageTitle="Invoice Pelanggan" class="hidden md:block" />
    <div class="space-y-6 px-4 md:px-0">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div class="min-w-0">
          <h1 class="text-xl sm:text-2xl font-bold text-gray-900 break-words dark:text-white">
            Customer di {{ kecamatan }}
          </h1>
          <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Pilih customer untuk melihat daftar invoice-nya
          </p>
        </div>
        <button
          @click="router.push('/customer-invoices')"
          class="inline-flex flex-shrink-0 self-start items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03]"
        >
          ← Ganti Kecamatan
        </button>
      </div>

      <div
        v-if="loading"
        class="flex items-center justify-center rounded-xl border border-gray-200 bg-white py-16 dark:border-gray-800 dark:bg-white/[0.03]"
      >
        <p class="text-sm text-gray-500 dark:text-gray-400">Memuat data...</p>
      </div>

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

      <div v-else class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <button
          v-for="customer in customersInKecamatan"
          :key="customer.id"
          @click="goToCustomer(customer.id)"
          class="flex flex-col items-start gap-1 rounded-xl border border-gray-200 bg-white p-4 text-left transition hover:border-brand-500 hover:shadow-md dark:border-gray-800 dark:bg-white/[0.03] dark:hover:border-brand-500"
        >
          <span class="text-sm font-semibold text-gray-900 dark:text-white">{{ customer.name }}</span>
          <span v-if="customer.store_name" class="text-xs text-gray-500 dark:text-gray-400">
            {{ customer.store_name }}
          </span>
          <span v-if="customer.phone" class="text-xs text-gray-500 dark:text-gray-400">{{ customer.phone }}</span>
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
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import { useCustomersStore } from '@/stores/customers'
import { useTransactionsStore } from '@/stores/transactions'
import { useToast } from '@/composables/useToast'

const router = useRouter()
const route = useRoute()
const customersStore = useCustomersStore()
const transactionsStore = useTransactionsStore()
const toast = useToast()

const kecamatan = route.params.kecamatan as string
const loading = ref(true)

const customersInKecamatan = computed(() =>
  customersStore.customers.filter((c) => c.kecamatan === kecamatan)
)

const invoiceCount = (customerId: string) =>
  transactionsStore.transactions.filter((t) => t.customer_id === customerId).length

const goToCustomer = (customerId: string) => {
  router.push(`/customer-invoices/${encodeURIComponent(kecamatan)}/${customerId}`)
}

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
