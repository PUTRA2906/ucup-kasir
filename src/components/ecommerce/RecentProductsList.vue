<template>
  <div class="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
    <div class="flex items-center justify-between gap-3 px-4 py-4 sm:px-6 sm:py-5">
      <div class="min-w-0">
        <h3 class="text-base font-medium text-gray-800 dark:text-white/90">Produk Terbaru</h3>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {{ recentProducts.length }} produk terakhir ditambahkan
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

    <div v-if="recentProducts.length === 0" class="border-t border-gray-100 px-4 py-10 text-center dark:border-gray-800 sm:px-6">
      <p class="text-sm text-gray-500 dark:text-gray-400">
        Belum ada produk. Tambahkan produk pertama Anda.
      </p>
    </div>

    <!-- Mobile Card View -->
    <div v-else class="divide-y divide-gray-100 border-t border-gray-100 md:hidden dark:divide-gray-800 dark:border-gray-800">
      <div
        v-for="product in recentProducts"
        :key="product.id"
        class="flex items-center gap-3 px-4 py-4"
      >
        <img
          v-if="product.image_url"
          :src="product.image_url"
          :alt="product.name"
          class="h-12 w-12 flex-shrink-0 rounded-lg object-cover"
        />
        <div
          v-else
          class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
        >
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
            />
          </svg>
        </div>
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-medium text-gray-800 dark:text-white/90">
            {{ product.name }}
          </p>
          <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            {{ product.category?.name || 'Tanpa kategori' }}
          </p>
        </div>
        <div class="flex flex-shrink-0 flex-col items-end gap-1">
          <span class="text-sm font-semibold text-gray-800 dark:text-white/90">
            {{ formatCurrency(product.price_sell) }}
          </span>
          <span
            class="text-xs font-medium"
            :class="
              product.stock > 10
                ? 'text-success-600 dark:text-success-500'
                : product.stock > 0
                  ? 'text-warning-600 dark:text-warning-500'
                  : 'text-error-600 dark:text-error-500'
            "
          >
            Stok: {{ product.stock }}
          </span>
        </div>
      </div>
    </div>

    <!-- Desktop Table -->
    <div class="hidden overflow-x-auto border-t border-gray-100 md:block dark:border-gray-800">
      <table v-if="recentProducts.length > 0" class="min-w-full">
        <thead>
          <tr class="border-b border-gray-100 dark:border-gray-800">
            <th class="px-6 py-3 text-left">
              <span class="text-xs font-medium text-gray-500 dark:text-gray-400">Produk</span>
            </th>
            <th class="px-6 py-3 text-left">
              <span class="text-xs font-medium text-gray-500 dark:text-gray-400">Kategori</span>
            </th>
            <th class="px-6 py-3 text-left">
              <span class="text-xs font-medium text-gray-500 dark:text-gray-400">Harga Jual</span>
            </th>
            <th class="px-6 py-3 text-left">
              <span class="text-xs font-medium text-gray-500 dark:text-gray-400">Stok</span>
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
          <tr v-for="product in recentProducts" :key="product.id" class="hover:bg-gray-50 dark:hover:bg-white/[0.03]">
            <td class="px-6 py-4">
              <div class="flex items-center gap-3">
                <img
                  v-if="product.image_url"
                  :src="product.image_url"
                  :alt="product.name"
                  class="h-10 w-10 flex-shrink-0 rounded-lg object-cover"
                />
                <div
                  v-else
                  class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                >
                  <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                    />
                  </svg>
                </div>
                <span class="text-sm font-medium text-gray-800 dark:text-white/90">
                  {{ product.name }}
                </span>
              </div>
            </td>
            <td class="px-6 py-4">
              <span
                class="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400"
              >
                {{ product.category?.name || 'Tanpa kategori' }}
              </span>
            </td>
            <td class="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
              {{ formatCurrency(product.price_sell) }}
            </td>
            <td class="px-6 py-4">
              <span
                class="text-sm font-medium"
                :class="
                  product.stock > 10
                    ? 'text-success-600 dark:text-success-500'
                    : product.stock > 0
                      ? 'text-warning-600 dark:text-warning-500'
                      : 'text-error-600 dark:text-error-500'
                "
              >
                {{ product.stock }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
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
  limit: 5,
})

const recentProducts = computed(() =>
  [...props.products]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, props.limit)
)

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value)
</script>
