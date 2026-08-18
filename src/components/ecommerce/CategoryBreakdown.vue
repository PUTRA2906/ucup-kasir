<template>
  <div class="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
    <div class="px-4 py-4 sm:px-6 sm:py-5">
      <h3 class="text-base font-medium text-gray-800 dark:text-white/90">Produk per Kategori</h3>
      <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Jumlah produk pada setiap kategori
      </p>
    </div>

    <div class="border-t border-gray-100 px-4 py-5 dark:border-gray-800 sm:px-6">
      <div v-if="items.length === 0" class="py-6 text-center">
        <p class="text-sm text-gray-500 dark:text-gray-400">Belum ada kategori.</p>
      </div>

      <div v-else class="space-y-5">
        <div v-for="item in items" :key="item.category.id">
          <div class="mb-2 flex items-center justify-between gap-3">
            <span class="truncate text-sm font-medium text-gray-700 dark:text-gray-300">
              {{ item.category.name }}
            </span>
            <span class="flex-shrink-0 text-sm text-gray-500 dark:text-gray-400">
              {{ item.count }} produk
            </span>
          </div>
          <div class="h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
            <div
              class="h-full rounded-full bg-brand-500 transition-all duration-500"
              :style="{ width: `${item.percentage}%` }"
            ></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Category, Product } from '@/types/database'

interface Props {
  categories: Category[]
  products: Product[]
}

const props = defineProps<Props>()

const items = computed(() => {
  const withCount = props.categories.map((category) => ({
    category,
    count: props.products.filter((p) => p.category_id === category.id).length,
  }))

  const max = Math.max(1, ...withCount.map((i) => i.count))

  return withCount.map((i) => ({
    ...i,
    percentage: Math.round((i.count / max) * 100),
  }))
})
</script>
