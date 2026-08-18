<template>
  <div class="grid grid-cols-2 gap-3 sm:grid-cols-2 md:gap-6 xl:grid-cols-4">
    <div
      v-for="card in cards"
      :key="card.label"
      class="min-w-0 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03] md:p-6"
    >
      <div
        class="flex items-center justify-center w-10 h-10 rounded-xl sm:w-12 sm:h-12"
        :class="card.iconBg"
      >
        <component :is="card.icon" class="w-5 h-5 sm:w-6 sm:h-6" :class="card.iconColor" />
      </div>

      <div class="flex items-end justify-between mt-4 sm:mt-5">
        <div class="min-w-0">
          <span class="text-xs text-gray-500 dark:text-gray-400 sm:text-sm">{{ card.label }}</span>
          <h4 class="mt-1.5 font-bold text-gray-800 text-base break-words sm:mt-2 sm:text-title-sm dark:text-white/90">
            {{ card.value }}
          </h4>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Package, Tags, Boxes, Wallet } from 'lucide-vue-next'

interface Props {
  totalProducts: number
  totalCategories: number
  totalStock: number
  stockValue: number
}

const props = defineProps<Props>()

const formatNumber = (value: number) => new Intl.NumberFormat('id-ID').format(value)

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value)

const cards = computed(() => [
  {
    label: 'Total Produk',
    value: formatNumber(props.totalProducts),
    icon: Package,
    iconBg: 'bg-brand-100 dark:bg-brand-500/15',
    iconColor: 'text-brand-600 dark:text-brand-500',
  },
  {
    label: 'Total Kategori',
    value: formatNumber(props.totalCategories),
    icon: Tags,
    iconBg: 'bg-violet-100 dark:bg-violet-500/15',
    iconColor: 'text-violet-600 dark:text-violet-500',
  },
  {
    label: 'Total Stok',
    value: formatNumber(props.totalStock),
    icon: Boxes,
    iconBg: 'bg-warning-100 dark:bg-warning-500/15',
    iconColor: 'text-warning-600 dark:text-warning-500',
  },
  {
    label: 'Nilai Stok (Modal)',
    value: formatCurrency(props.stockValue),
    icon: Wallet,
    iconBg: 'bg-success-100 dark:bg-success-500/15',
    iconColor: 'text-success-600 dark:text-success-500',
  },
])
</script>
