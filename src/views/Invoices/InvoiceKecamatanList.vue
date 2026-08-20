<template>
  <AdminLayout>
    <PageBreadcrumb pageTitle="Invoice Pelanggan" class="hidden md:block" />

    <div class="space-y-6 px-4 pb-6 pt-6 md:px-0">
      <!-- Header Mobile -->
      <div class="flex items-center justify-between md:hidden">
        <div>
          <h1 class="font-outfit text-xl font-extrabold leading-tight tracking-tight text-gray-900 dark:text-white">
            Pilih Kecamatan
          </h1>
          <p class="text-[11px] text-gray-500 dark:text-gray-400">
            Pilih kecamatan untuk melihat invoice
          </p>
        </div>
      </div>

      <!-- Header Desktop -->
      <div class="hidden md:block">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Pilih Kecamatan</h1>
        <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Pilih kecamatan untuk melihat daftar customer beserta invoice-nya
        </p>
      </div>

      <!-- Kolom Pencarian -->
      <div v-if="!loading" class="relative">
        <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Cari kecamatan..."
          class="w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder-gray-500"
        />
      </div>

      <!-- Loading State -->
      <div
        v-if="loading"
        class="flex items-center justify-center rounded-xl border border-gray-200 bg-white py-16 dark:border-gray-800 dark:bg-white/[0.03]"
      >
        <div class="text-center">
          <svg class="mx-auto h-8 w-8 animate-spin text-brand-500" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p class="mt-3 text-sm text-gray-500 dark:text-gray-400">Memuat data...</p>
        </div>
      </div>

      <!-- Grid Kecamatan - Mobile -->
      <div v-if="!loading" class="grid grid-cols-2 gap-3 md:hidden">
        <button
          v-for="kecamatan in filteredKecamatan"
          :key="kecamatan"
          @click="goToKecamatan(kecamatan)"
          class="group flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-gray-200 bg-white p-4 text-center transition active:scale-95 dark:border-gray-800 dark:bg-white/[0.03]"
        >
          <p class="text-sm font-bold text-gray-900 dark:text-white">{{ kecamatan }}</p>
          <p class="text-[11px] text-gray-500 dark:text-gray-400">
            {{ customersIn(kecamatan).length }} customer
          </p>
        </button>
      </div>

      <!-- Grid Kecamatan - Desktop -->
      <div v-if="!loading" class="hidden grid-cols-3 gap-3 md:grid lg:grid-cols-4 xl:grid-cols-5">
        <button
          v-for="kecamatan in filteredKecamatan"
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
import { ref, computed, onMounted } from 'vue'
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
const searchQuery = ref('')

const customersIn = (kecamatan: string) =>
  customersStore.customers.filter((c) => c.kecamatan === kecamatan)

const filteredKecamatan = computed(() => {
  if (!searchQuery.value.trim()) {
    return KECAMATAN_BANYUWANGI
  }
  return KECAMATAN_BANYUWANGI.filter((kecamatan) =>
    kecamatan.toLowerCase().includes(searchQuery.value.toLowerCase())
  )
})

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
