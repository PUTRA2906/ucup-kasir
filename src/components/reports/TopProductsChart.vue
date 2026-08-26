<template>
  <div class="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
    <h3 class="mb-6 text-lg font-semibold text-gray-900 dark:text-white">Produk Terlaris</h3>
    <div class="space-y-4">
      <div v-for="(product, idx) in products.slice(0, 5)" :key="product.product_id" class="flex items-center gap-4">
        <div class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-brand-100 dark:bg-brand-500/15">
          <span class="text-sm font-semibold text-brand-600 dark:text-brand-400">{{ idx + 1 }}</span>
        </div>
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-medium text-gray-900 dark:text-white">{{ product.product_name }}</p>
          <p class="text-xs text-gray-500 dark:text-gray-400">{{ product.quantity }} terjual</p>
        </div>
        <div class="flex-shrink-0 text-right">
          <p class="text-sm font-semibold text-gray-900 dark:text-white">{{ formatCurrency(product.revenue) }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ProductSales } from '@/services/sqlite/salesReport'

interface Props {
  products: ProductSales[]
}

defineProps<Props>()

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value || 0)
</script>
