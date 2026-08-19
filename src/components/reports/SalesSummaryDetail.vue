<template>
  <div class="rounded-2xl border border-gray-200 bg-white p-4 md:p-6 dark:border-gray-800 dark:bg-white/[0.03]">
    <h3 class="mb-4 md:mb-6 text-base md:text-lg font-semibold text-gray-900 dark:text-white">
      Ringkasan Penjualan
    </h3>

    <div class="space-y-6">
      <!-- PENDAPATAN Section -->
      <div>
        <div class="mb-2 px-2 md:px-4 py-2 bg-green-50 dark:bg-green-500/10">
          <h4 class="text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase">
            PENDAPATAN
          </h4>
        </div>
        <div class="space-y-0">
          <div class="flex justify-between items-center px-2 md:px-4 py-2 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/50">
            <span class="text-xs md:text-sm text-gray-600 dark:text-gray-400">Penjualan Kotor</span>
            <span class="text-xs md:text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">
              {{ formatCurrency(summary.gross_sales) }}
            </span>
          </div>
          <div class="flex justify-between items-center px-2 md:px-4 py-2 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/50">
            <span class="text-xs md:text-sm text-gray-600 dark:text-gray-400">Ongkos Kirim</span>
            <span class="text-xs md:text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">
              {{ formatCurrency(summary.shipping_cost) }}
            </span>
          </div>
          <div class="flex justify-between items-center px-2 md:px-4 py-2 md:py-3 border-b-2 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/50">
            <span class="text-xs md:text-sm font-bold text-gray-900 dark:text-white">TOTAL PENDAPATAN</span>
            <span class="text-xs md:text-sm font-bold text-gray-900 dark:text-white whitespace-nowrap">
              {{ formatCurrency(totalPendapatan) }}
            </span>
          </div>
        </div>
      </div>

      <!-- PENJUALAN BERSIH Section -->
      <div>
        <div class="mb-2 px-2 md:px-4 py-2 bg-blue-50 dark:bg-blue-500/10">
          <h4 class="text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase">
            PENJUALAN BERSIH
          </h4>
        </div>
        <div class="space-y-0">
          <div class="flex justify-between items-center px-2 md:px-4 py-2 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/50">
            <span class="text-xs md:text-sm text-gray-600 dark:text-gray-400">Total Penjualan</span>
            <span class="text-xs md:text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">
              {{ formatCurrency(summary.gross_sales) }}
            </span>
          </div>
          <div class="flex justify-between items-center px-2 md:px-4 py-2 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/50">
            <span class="text-xs md:text-sm text-gray-600 dark:text-gray-400">Diskon</span>
            <span class="text-xs md:text-sm font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">
              ( {{ formatCurrency(summary.total_discount) }} )
            </span>
          </div>
          <div class="flex justify-between items-center px-2 md:px-4 py-2 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/50">
            <span class="text-xs md:text-sm text-gray-600 dark:text-gray-400">Pengembalian</span>
            <span class="text-xs md:text-sm font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">
              ( {{ formatCurrency(summary.total_returns) }} )
            </span>
          </div>
          <div class="flex justify-between items-center px-2 md:px-4 py-2 md:py-3 border-b-2 border-gray-300 dark:border-gray-600 bg-blue-50 dark:bg-blue-500/10">
            <span class="text-xs md:text-sm font-bold text-brand-600 dark:text-brand-400">TOTAL PENJUALAN BERSIH</span>
            <span class="text-xs md:text-sm font-bold text-brand-600 dark:text-brand-400 whitespace-nowrap">
              {{ formatCurrency(summary.net_sales) }}
            </span>
          </div>
        </div>
      </div>

      <!-- LABA KOTOR Section -->
      <div>
        <div class="mb-2 px-2 md:px-4 py-2 bg-purple-50 dark:bg-purple-500/10">
          <h4 class="text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase">
            LABA KOTOR
          </h4>
        </div>
        <div class="space-y-0">
          <div class="flex justify-between items-center px-2 md:px-4 py-2 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/50">
            <span class="text-xs md:text-sm text-gray-600 dark:text-gray-400">Penjualan Bersih</span>
            <span class="text-xs md:text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">
              {{ formatCurrency(summary.net_sales) }}
            </span>
          </div>
          <div class="flex justify-between items-center px-2 md:px-4 py-2 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/50">
            <span class="text-xs md:text-sm text-gray-600 dark:text-gray-400">HPP (Modal)</span>
            <span class="text-xs md:text-sm font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">
              ( {{ formatCurrency(summary.net_cogs) }} )
            </span>
          </div>
          <div class="flex justify-between items-center px-2 md:px-4 py-2 md:py-3 border-b-2 border-gray-300 dark:border-gray-600 bg-green-50 dark:bg-green-500/10">
            <span class="text-xs md:text-sm font-bold text-success-600 dark:text-success-400">TOTAL LABA KOTOR</span>
            <span class="text-xs md:text-sm font-bold text-success-600 dark:text-success-400 whitespace-nowrap">
              {{ formatCurrency(summary.gross_profit) }}
            </span>
          </div>
        </div>
      </div>

      <!-- PENGELUARAN & LABA BERSIH Section -->
      <div>
        <div class="mb-2 px-2 md:px-4 py-2 bg-yellow-50 dark:bg-yellow-500/10">
          <h4 class="text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase">
            LABA BERSIH
          </h4>
        </div>
        <div class="space-y-0">
          <div class="flex justify-between items-center px-2 md:px-4 py-2 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/50">
            <span class="text-xs md:text-sm text-gray-600 dark:text-gray-400">Laba Kotor</span>
            <span class="text-xs md:text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">
              {{ formatCurrency(summary.gross_profit) }}
            </span>
          </div>
          <div class="flex justify-between items-center px-2 md:px-4 py-2 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/50">
            <span class="text-xs md:text-sm text-gray-600 dark:text-gray-400">Biaya Operasional</span>
            <span class="text-xs md:text-sm font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">
              ( {{ formatCurrency(summary.total_operating_expenses) }} )
            </span>
          </div>
          <div class="flex justify-between items-center px-2 md:px-4 py-2 md:py-3 border-b-2 border-gray-300 dark:border-gray-600 bg-yellow-50 dark:bg-yellow-500/10">
            <span class="text-xs md:text-sm font-bold text-warning-600 dark:text-warning-400">TOTAL LABA BERSIH</span>
            <span class="text-xs md:text-sm font-bold text-warning-600 dark:text-warning-400 whitespace-nowrap">
              {{ formatCurrency(summary.net_profit) }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { SalesSummary } from '@/services/salesReport'

const props = defineProps<{
  summary: SalesSummary
}>()

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value || 0)

const totalPendapatan = computed(() => {
  return props.summary.gross_sales + props.summary.shipping_cost
})
</script>
