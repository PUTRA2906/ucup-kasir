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

      <!-- Loading Skeleton Mobile -->
      <div v-if="loading" class="md:hidden space-y-4 animate-pulse">
        <!-- Search bar skeleton -->
        <div class="h-10 w-full rounded-xl bg-gray-200 dark:bg-gray-800"></div>
        <!-- Grid skeleton -->
        <div class="grid grid-cols-2 gap-3">
          <div
            v-for="i in 12"
            :key="i"
            class="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]"
          >
            <div class="h-3.5 w-20 rounded bg-gray-200 dark:bg-gray-800"></div>
            <div class="h-2.5 w-14 rounded bg-gray-200 dark:bg-gray-800"></div>
          </div>
        </div>
      </div>

      <!-- Loading Skeleton Desktop -->
      <div v-if="loading" class="hidden md:block space-y-4 animate-pulse">
        <div class="h-10 w-full rounded-xl bg-gray-200 dark:bg-gray-800"></div>
        <div class="grid grid-cols-3 gap-3 lg:grid-cols-4 xl:grid-cols-5">
          <div
            v-for="i in 15"
            :key="i"
            class="flex flex-col items-start gap-1 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]"
          >
            <div class="h-3.5 w-24 rounded bg-gray-200 dark:bg-gray-800"></div>
            <div class="h-2.5 w-16 rounded bg-gray-200 dark:bg-gray-800"></div>
          </div>
        </div>
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
