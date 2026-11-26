<template>
  <div class="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
    <h3 class="mb-6 text-lg font-semibold text-gray-900 dark:text-white">Metode Pembayaran</h3>
    <div class="flex justify-center">
      <VueApexCharts type="donut" height="280" :options="chartOptions" :series="series" />
    </div>
    <div class="mt-6 space-y-2 border-t border-gray-200 pt-4 dark:border-gray-700">
      <div v-for="method in paymentMethods" :key="method.method" class="flex items-center justify-between">
        <span class="text-sm text-gray-600 dark:text-gray-400">{{ formatMethod(method.method) }}</span>
        <span class="text-sm font-medium text-gray-900 dark:text-white">{{ method.count }} ({{ formatCurrency(method.total) }})</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import VueApexCharts from 'vue3-apexcharts'
import type { PaymentMethodSales } from '@/services/salesReport'

interface Props {
  paymentMethods: PaymentMethodSales[]
}

const props = defineProps<Props>()

const series = computed(() => props.paymentMethods.map(m => m.total))

const chartOptions = computed(() => ({
  labels: props.paymentMethods.map(m => formatMethod(m.method)),
  colors: ['#465fff', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
  chart: {
    fontFamily: 'Outfit, sans-serif',
  },
  legend: {
    show: false,
  },
  tooltip: {
    y: {
      formatter: (value: number) => formatCurrency(value),
    },
  },
}))

const formatMethod = (method: string) => {
  const methods: Record<string, string> = {
    tunai: 'Tunai',
    transfer: 'Transfer',
    qris: 'QRIS',
  }
  return methods[method] || method
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value || 0)
</script>
