<template>
  <div class="rounded-2xl border border-gray-200 bg-white p-3 md:p-6 shadow-sm md:shadow-none dark:border-gray-800 dark:bg-white/[0.03]">
    <div class="flex items-center justify-between border-b border-gray-200 pb-2 md:mb-6 md:border-0 md:pb-0 dark:border-gray-800">
      <h3 class="text-xs md:text-lg font-bold uppercase tracking-wider text-gray-700 md:font-semibold md:normal-case md:tracking-normal dark:text-gray-300 md:dark:text-white">
        Ringkasan Detail
      </h3>
      <span class="text-[10px] font-medium text-brand-500 md:hidden">Penjualan</span>
    </div>

    <div class="mt-3 space-y-4 md:mt-6 md:space-y-6">
      <!-- PENDAPATAN Section -->
      <div>
        <div class="mb-1.5 md:mb-2 rounded-lg px-2 md:px-4 py-1.5 md:py-2 bg-green-50 dark:bg-green-500/10">
          <h4 class="text-[10px] md:text-sm font-bold text-green-700 dark:text-green-400 uppercase tracking-wide">
            PENDAPATAN
          </h4>
        </div>
        <div class="space-y-0">
          <div class="flex justify-between items-center px-2 md:px-4 py-1.5 md:py-2 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/50">
            <span class="text-[11px] md:text-sm text-gray-600 dark:text-gray-400">Penjualan Kotor</span>
            <span class="text-[11px] md:text-sm font-semibold text-gray-900 dark:text-white whitespace-nowrap">
              {{ formatCurrency(summary.gross_sales) }}
            </span>
          </div>
          <div class="flex justify-between items-center px-2 md:px-4 py-1.5 md:py-2 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/50">
            <span class="text-[11px] md:text-sm text-gray-600 dark:text-gray-400">Ongkos Kirim</span>
            <span class="text-[11px] md:text-sm font-semibold text-gray-900 dark:text-white whitespace-nowrap">
              {{ formatCurrency(summary.shipping_cost) }}
            </span>
          </div>
          <div class="flex justify-between items-center px-2 md:px-4 py-2 md:py-3 border-b-2 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/50">
            <span class="text-[11px] md:text-sm font-bold text-gray-900 dark:text-white">TOTAL PENDAPATAN</span>
            <span class="text-[11px] md:text-sm font-bold text-gray-900 dark:text-white whitespace-nowrap">
              {{ formatCurrency(totalPendapatan) }}
            </span>
          </div>
        </div>
      </div>

      <!-- PENJUALAN BERSIH Section -->
      <div>
        <div class="mb-1.5 md:mb-2 rounded-lg px-2 md:px-4 py-1.5 md:py-2 bg-blue-50 dark:bg-blue-500/10">
          <h4 class="text-[10px] md:text-sm font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wide">
            PENJUALAN BERSIH
          </h4>
        </div>
        <div class="space-y-0">
          <div class="flex justify-between items-center px-2 md:px-4 py-1.5 md:py-2 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/50">
            <span class="text-[11px] md:text-sm text-gray-600 dark:text-gray-400">Total Penjualan</span>
            <span class="text-[11px] md:text-sm font-semibold text-gray-900 dark:text-white whitespace-nowrap">
              {{ formatCurrency(summary.gross_sales) }}
            </span>
          </div>
          <div class="flex justify-between items-center px-2 md:px-4 py-1.5 md:py-2 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/50">
            <span class="text-[11px] md:text-sm text-gray-600 dark:text-gray-400">Diskon</span>
            <span class="text-[11px] md:text-sm font-semibold text-gray-600 dark:text-gray-400 whitespace-nowrap">
              ( {{ formatCurrency(summary.total_discount) }} )
            </span>
          </div>
          <div class="flex justify-between items-center px-2 md:px-4 py-1.5 md:py-2 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/50">
            <span class="text-[11px] md:text-sm text-gray-600 dark:text-gray-400">Pengembalian</span>
            <span class="text-[11px] md:text-sm font-semibold text-gray-600 dark:text-gray-400 whitespace-nowrap">
              ( {{ formatCurrency(summary.total_returns) }} )
            </span>
          </div>
          <div class="flex justify-between items-center px-2 md:px-4 py-2 md:py-3 border-b-2 border-gray-300 dark:border-gray-600 bg-blue-50 dark:bg-blue-500/10">
            <span class="text-[11px] md:text-sm font-bold text-brand-600 dark:text-brand-400">TOTAL PENJUALAN BERSIH</span>
            <span class="text-[11px] md:text-sm font-bold text-brand-600 dark:text-brand-400 whitespace-nowrap">
              {{ formatCurrency(summary.net_sales) }}
            </span>
          </div>
        </div>
      </div>

      <!-- LABA KOTOR Section -->
      <div>
        <div class="mb-1.5 md:mb-2 rounded-lg px-2 md:px-4 py-1.5 md:py-2 bg-purple-50 dark:bg-purple-500/10">
          <h4 class="text-[10px] md:text-sm font-bold text-purple-700 dark:text-purple-400 uppercase tracking-wide">
            LABA KOTOR
          </h4>
        </div>
        <div class="space-y-0">
          <div class="flex justify-between items-center px-2 md:px-4 py-1.5 md:py-2 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/50">
            <span class="text-[11px] md:text-sm text-gray-600 dark:text-gray-400">Penjualan Bersih</span>
            <span class="text-[11px] md:text-sm font-semibold text-gray-900 dark:text-white whitespace-nowrap">
              {{ formatCurrency(summary.net_sales) }}
            </span>
          </div>
          <div class="flex justify-between items-center px-2 md:px-4 py-1.5 md:py-2 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/50">
            <span class="text-[11px] md:text-sm text-gray-600 dark:text-gray-400">HPP (Modal)</span>
            <span class="text-[11px] md:text-sm font-semibold text-gray-600 dark:text-gray-400 whitespace-nowrap">
              ( {{ formatCurrency(summary.net_cogs) }} )
            </span>
          </div>
          <div class="flex justify-between items-center px-2 md:px-4 py-2 md:py-3 border-b-2 border-gray-300 dark:border-gray-600 bg-green-50 dark:bg-green-500/10">
            <span class="text-[11px] md:text-sm font-bold text-success-600 dark:text-success-400">TOTAL LABA KOTOR</span>
            <span class="text-[11px] md:text-sm font-bold text-success-600 dark:text-success-400 whitespace-nowrap">
              {{ formatCurrency(summary.gross_profit) }}
            </span>
          </div>
        </div>
      </div>

      <!-- PENGELUARAN & LABA BERSIH Section -->
      <div>
        <div class="mb-1.5 md:mb-2 rounded-lg px-2 md:px-4 py-1.5 md:py-2 bg-yellow-50 dark:bg-yellow-500/10">
          <h4 class="text-[10px] md:text-sm font-bold text-yellow-700 dark:text-yellow-400 uppercase tracking-wide">
            LABA BERSIH
          </h4>
        </div>
        <div class="space-y-0">
          <div class="flex justify-between items-center px-2 md:px-4 py-1.5 md:py-2 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/50">
            <span class="text-[11px] md:text-sm text-gray-600 dark:text-gray-400">Laba Kotor</span>
            <span class="text-[11px] md:text-sm font-semibold text-gray-900 dark:text-white whitespace-nowrap">
              {{ formatCurrency(summary.gross_profit) }}
            </span>
          </div>
          <div class="flex justify-between items-center px-2 md:px-4 py-1.5 md:py-2 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/50">
            <span class="text-[11px] md:text-sm text-gray-600 dark:text-gray-400">Biaya Operasional</span>
            <span class="text-[11px] md:text-sm font-semibold text-gray-600 dark:text-gray-400 whitespace-nowrap">
              ( {{ formatCurrency(summary.total_operating_expenses) }} )
            </span>
          </div>
          <div class="flex justify-between items-center px-2 md:px-4 py-2 md:py-3 border-b-2 border-gray-300 dark:border-gray-600 bg-yellow-50 dark:bg-yellow-500/10">
            <span class="text-[11px] md:text-sm font-bold text-warning-600 dark:text-warning-400">TOTAL LABA BERSIH</span>
            <span class="text-[11px] md:text-sm font-bold text-warning-600 dark:text-warning-400 whitespace-nowrap">
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
