<template>
  <AdminLayout>
    <PageBreadcrumb pageTitle="Laporan Penjualan" class="hidden md:block" />

    <div class="space-y-6 px-4 md:px-0">
      <!-- Filter & Header -->
      <div class="rounded-2xl border border-gray-200 bg-white p-4 md:p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <div>
          <h1 class="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Laporan Penjualan</h1>
          <p class="mt-1 text-xs md:text-sm text-gray-500 dark:text-gray-400">
            {{ formatDateRange(reportStore.startDate, reportStore.endDate) }}
          </p>
        </div>

        <!-- Presets Dropdown for mobile -->
        <div class="mt-4 md:hidden">
          <select
            v-model="activePreset"
            @change="reportStore.applyPreset(activePreset); fetchReport()"
            class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          >
            <option value="">Pilih periode...</option>
            <option v-for="preset in reportStore.datePresets" :key="preset.value" :value="preset.value">
              {{ preset.label }}
            </option>
          </select>
        </div>

        <!-- Presets Buttons for desktop -->
        <div class="hidden md:block mt-4">
          <div class="flex flex-wrap gap-2">
            <button
              v-for="preset in reportStore.datePresets"
              :key="preset.value"
              @click="activePreset = preset.value; reportStore.applyPreset(preset.value); fetchReport()"
              :class="[
                'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                preset.value === activePreset
                  ? 'bg-brand-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
              ]"
            >
              {{ preset.label }}
            </button>
          </div>
        </div>

        <!-- Date Range Inputs -->
        <div class="mt-4 space-y-3 md:space-y-0 md:flex md:items-center md:gap-2">
          <input
            v-model="reportStore.startDate"
            type="date"
            class="w-full md:w-auto rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs md:text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
          <span class="hidden md:inline text-gray-500">-</span>
          <input
            v-model="reportStore.endDate"
            type="date"
            class="w-full md:w-auto rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs md:text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
          <button
            @click="fetchReport()"
            class="w-full md:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2 md:py-2 text-xs md:text-sm font-medium text-white hover:bg-brand-600"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span class="hidden sm:inline">Perbarui</span>
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="reportStore.loading" class="flex items-center justify-center py-24">
        <div class="text-center">
          <svg class="mx-auto h-12 w-12 animate-spin text-brand-500" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p class="mt-4 text-sm text-gray-600 dark:text-gray-400">Memuat laporan penjualan...</p>
        </div>
      </div>

      <template v-else>
        <!-- Summary Cards -->
        <SalesSummaryCards :summary="reportStore.summary" />

        <!-- Sales Summary Detail -->
        <SalesSummaryDetail :summary="reportStore.summary" />
      </template>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import SalesSummaryCards from '@/components/reports/SalesSummaryCards.vue'
import SalesSummaryDetail from '@/components/reports/SalesSummaryDetail.vue'
import { useSalesReportStore } from '@/stores/salesReport'
import { useToast } from '@/composables/useToast'

const reportStore = useSalesReportStore()
const toast = useToast()
const activePreset = ref('30days')

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value || 0)

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const formatMethod = (method: string) => {
  const methods: Record<string, string> = {
    tunai: 'Tunai',
    transfer: 'Transfer',
    qris: 'QRIS',
  }
  return methods[method] || method
}

const formatDateRange = (from: string, to: string) => {
  if (!from || !to) return ''
  const fromDate = new Date(from + 'T00:00:00')
  const toDate = new Date(to + 'T23:59:59')

  const formatter = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return `${formatter.format(fromDate)} - ${formatter.format(toDate)}`
}

const calculatePercentage = (value: number, total: number) => {
  if (total === 0) return 0
  return Math.round((value / total) * 100)
}

const fetchReport = async () => {
  try {
    await reportStore.fetchSalesReport()
  } catch (error) {
    console.error('Error fetching report:', error)
    toast.error('Gagal!', 'Gagal memuat laporan penjualan')
  }
}

onMounted(() => {
  reportStore.applyPreset('30days')
  fetchReport()
})
</script>
