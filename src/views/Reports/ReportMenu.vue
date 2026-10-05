<template>
  <div class="min-h-screen bg-bodydark1 dark:bg-boxdark-2">
    <!-- Header -->
    <div class="sticky top-0 z-10 border-b border-stroke bg-white dark:border-strokedark dark:bg-boxdark">
      <div class="flex items-center justify-between px-4 py-4">
        <button
          @click="goBack"
          class="flex h-10 w-10 items-center justify-center rounded-full hover:bg-gray-2 dark:hover:bg-meta-4"
        >
          <svg class="h-5 w-5 text-body dark:text-bodydark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 class="text-lg font-semibold text-black dark:text-white">Laporan</h1>
        <div class="w-10"></div>
      </div>
    </div>

    <!-- Report List -->
    <div class="p-4">
      <div class="overflow-hidden rounded-lg bg-white shadow-default dark:bg-boxdark">
        <button
          v-for="(report, index) in reports"
          :key="report.path"
          @click="navigateTo(report.path)"
          class="flex w-full items-center justify-between border-b border-stroke px-5 py-4 transition-colors hover:bg-gray-2 dark:border-strokedark dark:hover:bg-meta-4"
          :class="{ 'border-b-0': index === reports.length - 1 }"
        >
          <div class="flex items-center gap-3">
            <span class="text-2xl">{{ report.icon }}</span>
            <span class="text-base font-medium text-black dark:text-white">
              {{ report.name }}
            </span>
          </div>
          <svg class="h-5 w-5 text-bodydark1 dark:text-bodydark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <!-- Info Card -->
      <div class="mt-4 rounded-lg bg-primary/10 p-4">
        <div class="flex items-start gap-3">
          <span class="text-xl">💡</span>
          <div>
            <p class="text-sm text-black dark:text-white">
              Pilih laporan yang ingin Anda lihat untuk menganalisis performa bisnis Anda.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

interface Report {
  name: string
  path: string
  icon: string
}

const reports: Report[] = [
  {
    name: 'Laporan Penjualan',
    path: '/reports/sales',
    icon: '📊',
  },
  {
    name: 'Laporan Laba Rugi',
    path: '/reports/profit-loss',
    icon: '💰',
  },
  {
    name: 'Laba Per Transaksi',
    path: '/reports/transaction-profit',
    icon: '📈',
  },
  {
    name: 'Mutasi Kas Hari Ini',
    path: '/laporan/mutasi-kas',
    icon: '🏦',
  },
  {
    name: 'Mutasi Bank Hari Ini',
    path: '/laporan/mutasi-bank',
    icon: '🏦',
  },
]

const navigateTo = (path: string) => {
  router.push(path)
}

const goBack = () => {
  router.back()
}
</script>
