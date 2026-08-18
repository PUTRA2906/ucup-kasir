<template>
  <AdminLayout>
    <PageBreadcrumb pageTitle="Invoice Pelanggan" class="hidden md:block" />
    <div class="space-y-6 px-4 md:px-0">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Pilih Kecamatan</h1>
        <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Pilih kecamatan untuk melihat daftar customer beserta invoice-nya
        </p>
      </div>

      <div
        v-if="loading"
        class="flex items-center justify-center rounded-xl border border-gray-200 bg-white py-16 dark:border-gray-800 dark:bg-white/[0.03]"
      >
        <p class="text-sm text-gray-500 dark:text-gray-400">Memuat data...</p>
      </div>

      <div v-else class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        <button
          v-for="kecamatan in KECAMATAN_BANYUWANGI"
          :key="kecamatan"
          @click="goToKecamatan(kecamatan)"
          class="flex flex-col items-start gap-1 rounded-xl border border-gray-200 bg-white p-4 text-left transition hover:border-brand-500 hover:shadow-md dark:border-gray-800 dark:bg-white/[0.03] dark:hover:border-brand-500"
        >
          <span class="text-sm font-semibold text-gray-800 dark:text-white/90">{{ kecamatan }}</span>
          <span class="text-xs text-gray-500 dark:text-gray-400">
            {{ customersIn(kecamatan).length }} customer
          </span>
        </button>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import { KECAMATAN_BANYUWANGI } from '@/constants/kecamatan'
import { useCustomersStore } from '@/stores/customers'
import { useTransactionsStore } from '@/stores/transactions'
import { useToast } from '@/composables/useToast'

const router = useRouter()
const customersStore = useCustomersStore()
const transactionsStore = useTransactionsStore()
const toast = useToast()

const loading = ref(true)

const customersIn = (kecamatan: string) =>
  customersStore.customers.filter((c) => c.kecamatan === kecamatan)

const goToKecamatan = (kecamatan: string) => {
  router.push(`/customer-invoices/${encodeURIComponent(kecamatan)}`)
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
