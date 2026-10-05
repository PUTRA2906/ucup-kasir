<template>
  <div class="space-y-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
    <div class="flex items-center justify-between border-b border-gray-200 pb-2 dark:border-gray-800">
      <span class="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
        Peringatan Stok Gudang
      </span>
      <router-link
        to="/products"
        class="text-[11px] font-semibold text-brand-500"
      >
        Ke Gudang
      </router-link>
    </div>

    <div v-if="loading" class="space-y-2">
      <LoadingSkeleton v-for="i in 3" :key="i" type="list-item" />
    </div>
    <template v-else>
      <div v-if="products.length === 0" class="py-3 text-center">
        <p class="text-xs text-gray-500 dark:text-gray-400">
          Semua stok aman. Tidak ada produk yang menipis.
        </p>
      </div>

      <div v-else class="space-y-2">
        <div
          v-for="product in products.slice(0, 4)"
          :key="product.id"
          class="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 p-3 text-xs dark:border-gray-700 dark:bg-white/[0.02]"
        >
          <div class="min-w-0">
            <p class="truncate font-bold text-gray-900 dark:text-white">{{ product.name }}</p>
            <p class="mt-0.5 text-[10px] text-gray-500 dark:text-gray-400">
              Batas minimum: {{ product.minimum_stock ?? 10 }}
            </p>
          </div>
          <span
            class="flex-shrink-0 rounded-lg px-2.5 py-1 text-[10px] font-bold"
            :class="
              product.stock === 0
                ? 'bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-500'
                : 'bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-warning-500'
            "
          >
            {{ product.stock === 0 ? 'Habis' : `Sisa ${product.stock}` }}
          </span>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import LoadingSkeleton from '@/components/common/LoadingSkeleton.vue'

interface Product {
  id: string
  name: string
  stock: number
  minimum_stock?: number
}

interface Props {
  loading: boolean
  products: Product[]
}

defineProps<Props>()
</script>
