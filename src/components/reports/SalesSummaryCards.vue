<template>
  <div class="grid grid-cols-2 gap-3 md:gap-6 lg:grid-cols-4">
    <div class="rounded-2xl border border-gray-200 bg-white overflow-hidden dark:border-gray-800 dark:bg-white/[0.03]">
      <div class="p-3 md:p-6">
        <p class="text-xs md:text-sm text-gray-600 dark:text-gray-400">Total Penjualan</p>
        <p class="mt-2 text-base md:text-2xl font-bold text-gray-900 dark:text-white truncate">
          {{ formatCurrency(summary.totalRevenue) }}
        </p>
      </div>
      <div class="h-1 bg-brand-500"></div>
    </div>

    <div class="rounded-2xl border border-gray-200 bg-white overflow-hidden dark:border-gray-800 dark:bg-white/[0.03]">
      <div class="p-3 md:p-6">
        <p class="text-xs md:text-sm text-gray-600 dark:text-gray-400">Jumlah Transaksi</p>
        <p class="mt-2 text-base md:text-2xl font-bold text-gray-900 dark:text-white">{{ summary.totalTransactions }}</p>
      </div>
      <div class="h-1 bg-success-500"></div>
    </div>

    <div class="rounded-2xl border border-gray-200 bg-white overflow-hidden dark:border-gray-800 dark:bg-white/[0.03]">
      <div class="p-3 md:p-6">
        <p class="text-xs md:text-sm text-gray-600 dark:text-gray-400">Modal</p>
        <p class="mt-2 text-base md:text-2xl font-bold text-gray-900 dark:text-white truncate">
          {{ formatCurrency(totalModal) }}
        </p>
      </div>
      <div class="h-1 bg-violet-500"></div>
    </div>

    <div class="rounded-2xl border border-gray-200 bg-white overflow-hidden dark:border-gray-800 dark:bg-white/[0.03]">
      <div class="p-3 md:p-6">
        <p class="text-xs md:text-sm text-gray-600 dark:text-gray-400">Keuntungan</p>
        <p class="mt-2 text-base md:text-2xl font-bold text-gray-900 dark:text-white truncate">
          {{ formatCurrency(summary.profit) }}
        </p>
      </div>
      <div class="h-1 bg-warning-500"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { SalesSummary } from '@/services/salesReport'

interface Props {
  summary: SalesSummary
}

const props = defineProps<Props>()

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value || 0)

const totalModal = computed(() => {
  return props.summary.totalRevenue - props.summary.profit
})
</script>
