<template>
  <AdminLayout>
    <PageBreadcrumb pageTitle="Daftar Retur" class="hidden md:block" />

    <!-- Mobile Header -->
    <div class="mb-6 flex items-center gap-3 pl-2 pr-4 md:hidden">
      <h1 class="text-2xl font-semibold text-gray-900 dark:text-white">Daftar Retur</h1>
    </div>

    <DataTable
      title="Daftar Retur"
      subtitle="Riwayat seluruh retur barang"
      :data="returnsList"
      :columns="columns"
      :searchable="true"
      searchPlaceholder="Cari nomor retur, customer..."
      :show-add-button="false"
      :show-import-button="false"
      :show-export-button="false"
    >
      <!-- Desktop: Nomor Retur -->
      <template #cell-return_number="{ row }">
        <router-link
          :to="`/transactions/${row.transaction_id}`"
          class="font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
        >
          {{ row.return_number }}
        </router-link>
      </template>

      <!-- Desktop: Tanggal -->
      <template #cell-created_at="{ row }">
        <span class="text-sm text-gray-600 dark:text-gray-400">
          {{ formatDate(row.created_at) }}
        </span>
      </template>

      <!-- Desktop: Transaksi -->
      <template #cell-transaction="{ row }">
        <span class="text-sm text-gray-600 dark:text-gray-400">
          {{ row.transaction?.transaction_number || '-' }}
        </span>
      </template>

      <!-- Desktop: Customer -->
      <template #cell-customer="{ row }">
        <span class="text-sm text-gray-700 dark:text-gray-300">
          {{ row.transaction?.customer_name || 'Umum' }}
        </span>
      </template>

      <!-- Desktop: Total Refund -->
      <template #cell-total_refund="{ row }">
        <span class="text-sm font-semibold text-error-600 dark:text-error-400">
          - {{ formatCurrency(row.total_refund) }}
        </span>
      </template>

      <!-- Desktop: Items summary -->
      <template #cell-items="{ row }">
        <span class="text-sm text-gray-500 dark:text-gray-400">
          {{ (row.items || []).length }} produk
        </span>
      </template>

      <!-- Desktop: Aksi -->
      <template #cell-actions="{ row }">
        <router-link
          :to="`/transactions/${row.transaction_id}`"
          class="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
        >
          <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          Lihat Transaksi
        </router-link>
      </template>

      <!-- Mobile: Card title -->
      <template #mobile-title="{ row }">
        <div class="flex items-center justify-between">
          <span class="font-semibold text-gray-900 dark:text-white">{{ row.return_number }}</span>
          <span class="text-sm font-semibold text-error-600 dark:text-error-400">
            - {{ formatCurrency(row.total_refund) }}
          </span>
        </div>
      </template>

      <!-- Mobile: Card subtitle -->
      <template #mobile-subtitle="{ row }">
        <div class="mt-1 space-y-0.5">
          <p class="text-xs text-gray-500 dark:text-gray-400">
            {{ formatDate(row.created_at) }}
          </p>
          <p class="text-xs text-gray-500 dark:text-gray-400">
            Transaksi: {{ row.transaction?.transaction_number || '-' }} · {{ row.transaction?.customer_name || 'Umum' }}
          </p>
          <p class="text-xs text-gray-500 dark:text-gray-400">
            {{ (row.items || []).length }} produk diretur
          </p>
          <router-link
            :to="`/transactions/${row.transaction_id}`"
            class="mt-1 inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
          >
            Lihat Transaksi →
          </router-link>
        </div>
      </template>
    </DataTable>
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import DataTable from '@/components/tables/DataTable.vue'
import { useReturnsStore } from '@/stores/returns'

const returnsStore = useReturnsStore()
const returnsList = computed(() => returnsStore.returns)

const columns = [
  { key: 'return_number', label: 'No. Retur', sortable: true },
  { key: 'created_at', label: 'Tanggal', sortable: true },
  { key: 'transaction', label: 'Transaksi' },
  { key: 'customer', label: 'Customer' },
  { key: 'items', label: 'Item' },
  { key: 'total_refund', label: 'Total Refund', sortable: true },
  { key: 'actions', label: 'Aksi' },
]

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value || 0)

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

onMounted(async () => {
  await returnsStore.fetchAllReturns()
})
</script>
