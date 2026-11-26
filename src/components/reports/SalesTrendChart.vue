<template>
  <div class="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
    <h3 class="mb-6 text-lg font-semibold text-gray-900 dark:text-white">Tren Penjualan</h3>
    <div class="overflow-x-auto">
      <VueApexCharts type="line" height="300" :options="chartOptions" :series="series" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import VueApexCharts from 'vue3-apexcharts'
import type { DailySales } from '@/services/salesReport'

interface Props {
  dailySales: DailySales[]
}

const props = defineProps<Props>()

const series = computed(() => [
  {
    name: 'Penjualan (Rp)',
    data: props.dailySales.map(d => Math.round(d.revenue / 1000000)), // Convert to millions for readability
  },
])

const chartOptions = computed(() => ({
  colors: ['#465fff'],
  chart: {
    fontFamily: 'Outfit, sans-serif',
    type: 'line',
    toolbar: { show: false },
  },
  stroke: {
    width: 2,
    curve: 'smooth',
  },
  xaxis: {
    categories: props.dailySales.map(d => d.date),
    axisBorder: { show: false },
    axisTicks: { show: false },
  },
  yaxis: {
    title: { text: 'Penjualan (Juta Rp)' },
  },
  grid: {
    yaxis: { lines: { show: true } },
  },
  tooltip: {
    theme: 'light',
    y: {
      formatter: (value: number) => `Rp ${(value * 1000000).toLocaleString('id-ID')}`,
    },
  },
}))
</script>
