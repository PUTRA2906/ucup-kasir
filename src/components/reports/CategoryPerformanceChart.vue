<template>
  <div class="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
    <h3 class="mb-6 text-lg font-semibold text-gray-900 dark:text-white">Performa Kategori</h3>
    <div class="space-y-4">
      <div v-for="category in categories.slice(0, 5)" :key="category.category_id" class="space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300">{{ category.category_name }}</span>
          <span class="text-sm font-semibold text-gray-900 dark:text-white">{{ formatCurrency(category.revenue) }}</span>
        </div>
        <div class="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
          <div class="h-full rounded-full bg-brand-500" :style="{ width: getPercentage(category.revenue) + '%' }"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CategorySales } from '@/services/sqlite/salesReport'

interface Props {
  categories: CategorySales[]
}

const props = defineProps<Props>()

const getPercentage = (revenue: number) => {
  const max = Math.max(...props.categories.map(c => c.revenue))
  return max > 0 ? (revenue / max) * 100 : 0
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value || 0)
</script>
