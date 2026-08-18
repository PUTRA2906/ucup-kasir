<template>
  <div class="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
    <div class="flex items-center justify-between gap-3 px-4 py-4 sm:px-6 sm:py-5">
      <div class="min-w-0">
        <h3 class="text-base font-medium text-gray-800 dark:text-white/90">Stok Menipis</h3>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Produk dengan stok kurang dari atau sama dengan 10
        </p>
      </div>
      <router-link
        to="/products"
        class="inline-flex flex-shrink-0 items-center gap-1 text-sm font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400"
      >
        Lihat Semua
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </router-link>
    </div>

    <div class="border-t border-gray-100 dark:border-gray-800">
      <div v-if="sortedProducts.length === 0" class="px-4 py-10 text-center sm:px-6">
        <svg
          class="mx-auto h-10 w-10 text-success-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <p class="mt-3 text-sm text-gray-500 dark:text-gray-400">
          Semua stok aman. Tidak ada produk yang menipis.
        </p>
      </div>

      <ul v-else class="divide-y divide-gray-100 dark:divide-gray-800">
        <li
          v-for="product in sortedProducts.slice(0, limit)"
          :key="product.id"
          class="flex items-center justify-between gap-4 px-4 py-4 sm:px-6"
        >
          <div class="flex min-w-0 items-center gap-3">
            <div
              class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg"
              :class="
                product.stock === 0
                  ? 'bg-error-100 text-error-600 dark:bg-error-500/15 dark:text-error-500'
                  : 'bg-warning-100 text-warning-600 dark:bg-warning-500/15 dark:text-warning-500'
              "
            >
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <div class="min-w-0">
              <p class="truncate text-sm font-medium text-gray-800 dark:text-white/90">
                {{ product.name }}
              </p>
              <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                {{ product.category?.name || 'Tanpa kategori' }}
              </p>
            </div>
          </div>
          <span
            class="flex-shrink-0 rounded-full px-2.5 py-1 text-xs font-medium"
            :class="
              product.stock === 0
                ? 'bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-500'
                : 'bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-warning-500'
            "
          >
            {{ product.stock === 0 ? 'Habis' : `Sisa ${product.stock}` }}
          </span>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ProductWithCategory } from '@/types/database'

interface Props {
  products: ProductWithCategory[]
  limit?: number
}

const props = withDefaults(defineProps<Props>(), {
  limit: 6,
})

const sortedProducts = computed(() =>
  props.products
    .filter((p) => p.stock <= 10)
    .sort((a, b) => a.stock - b.stock)
)
</script>
