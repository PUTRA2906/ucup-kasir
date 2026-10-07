<template>
  <AdminLayout>
    <PageBreadcrumb pageTitle="Laporan Penjualan" class="hidden md:block" />

    <div class="space-y-6 pb-24 md:pb-0">
      <MobilePageHeader
        title="Laporan Penjualan"
        :subtitle="formatDateRange(reportStore.startDate, reportStore.endDate)"
        @back="$router.back()"
      />

      <!-- Filter Modal (Mobile) -->
      <Teleport to="body">
        <Transition name="modal">
          <div
            v-if="showFilterModal"
            class="fixed inset-0 z-50 flex items-end justify-center bg-black/50 md:hidden"
            @click.self="showFilterModal = false"
          >
            <div class="w-full max-w-lg rounded-t-3xl bg-white p-6 dark:bg-gray-900">
              <div class="mb-4 flex items-center justify-between">
                <h3 class="text-lg font-bold text-gray-900 dark:text-white">Filter Periode</h3>
                <button
                  @click="showFilterModal = false"
                  class="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                >
                  <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div class="space-y-4">
                <!-- Range Date -->
                <div>
                  <label class="mb-2 block text-xs font-medium text-gray-700 dark:text-gray-300">
                    Periode
                  </label>
                  <DateRangeField
                    :start="tempStartDate"
                    :end="tempEndDate"
                    title="Pilih Periode"
                    placeholder="Pilih rentang tanggal"
                    button-class="flex w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    @update:start="tempStartDate = $event"
                    @update:end="tempEndDate = $event"
                  />
                </div>

                <!-- Status Pembayaran -->
                <div>
                  <label class="mb-2 block text-xs font-medium text-gray-700 dark:text-gray-300">
                    Status Pembayaran
                  </label>
                  <div class="grid grid-cols-3 gap-2">
                    <button
                      v-for="opt in paymentStatusOptions"
                      :key="opt.value"
                      @click="tempPaymentStatus = opt.value"
                      :class="[
                        'rounded-lg border px-2 py-2 text-xs font-medium transition-colors',
                        tempPaymentStatus === opt.value
                          ? 'border-blue-500 bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400'
                          : 'border-gray-300 bg-white text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300'
                      ]"
                    >
                      {{ opt.label }}
                    </button>
                  </div>
                </div>

                <button
                  @click="applyFilter()"
                  class="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-600 active:scale-95"
                >
                  <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                  Terapkan Filter
                </button>
              </div>
            </div>
          </div>
        </Transition>
      </Teleport>

      <!-- Desktop Filter & Header -->
      <div class="hidden md:block rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Laporan Penjualan</h1>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {{ formatDateRange(reportStore.startDate, reportStore.endDate) }}
          </p>
        </div>

        <!-- Presets Buttons -->
        <div class="mt-4">
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
        <div class="mt-4 flex items-center gap-2">
          <DateField
            v-model="reportStore.startDate"
            title="Dari Tanggal"
            button-class="flex items-center justify-between gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
          <span class="text-gray-500">-</span>
          <DateField
            v-model="reportStore.endDate"
            title="Sampai Tanggal"
            button-class="flex items-center justify-between gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
          <button
            @click="fetchReport()"
            class="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Perbarui
          </button>
        </div>

        <!-- Status Pembayaran (Desktop) -->
        <div class="mt-4 flex items-center gap-3">
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Status Pembayaran:</span>
          <div class="flex gap-2">
            <button
              v-for="opt in paymentStatusOptions"
              :key="opt.value"
              @click="reportStore.setPaymentStatusFilter(opt.value); fetchReport()"
              :class="[
                'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                reportStore.paymentStatusFilter === opt.value
                  ? 'bg-brand-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
              ]"
            >
              {{ opt.label }}
            </button>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="reportStore.loading" class="space-y-6">
        <!-- Mobile: skeleton kartu ringkasan (2 kolom) -->
        <div class="grid grid-cols-2 gap-3 md:hidden">
          <LoadingSkeleton v-for="i in 6" :key="i" type="stats" />
        </div>

        <!-- Mobile: skeleton ringkasan detail (list) -->
        <div class="space-y-3 md:hidden">
          <div class="h-6 w-32 rounded bg-gray-200 animate-pulse dark:bg-gray-800"></div>
          <LoadingSkeleton v-for="i in 8" :key="i" type="list-item" />
        </div>

        <!-- Desktop: skeleton kartu ringkasan (3 kolom) -->
        <div class="hidden grid-cols-2 gap-6 lg:grid-cols-3 md:grid">
          <LoadingSkeleton v-for="i in 6" :key="i" type="stats" />
        </div>

        <!-- Desktop: skeleton detail (baris tabel) -->
        <div class="hidden rounded-2xl border border-gray-200 bg-white p-6 md:block dark:border-gray-800 dark:bg-white/[0.03]">
          <div class="space-y-3">
            <div class="h-5 w-40 rounded bg-gray-200 animate-pulse dark:bg-gray-800"></div>
            <div v-for="i in 8" :key="i">
              <LoadingSkeleton type="table-row" :columns="2" />
            </div>
          </div>
        </div>
      </div>

      <template v-else>
        <!-- Summary Cards - Fokus Omzet & Performa Penjualan -->
        <SalesPerformanceCards :summary="reportStore.summary" />

        <!-- Filter Button (Mobile) -->
        <button
          @click="openFilterModal()"
          class="w-full inline-flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-brand-500 bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-600 transition hover:bg-brand-100 active:scale-95 md:hidden dark:border-brand-400 dark:bg-brand-500/10 dark:text-brand-400"
        >
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          Ubah Filter Periode
        </button>

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
import MobilePageHeader from '@/components/common/MobilePageHeader.vue'
import SalesPerformanceCards from '@/components/reports/SalesPerformanceCards.vue'
import SalesSummaryDetail from '@/components/reports/SalesSummaryDetail.vue'
import LoadingSkeleton from '@/components/common/LoadingSkeleton.vue'
import DateField from '@/components/common/DateField.vue'
import DateRangeField from '@/components/common/DateRangeField.vue'
import { useSalesReportStore } from '@/stores/salesReport'
import { useToast } from '@/composables/useToast'
import { useAutoNavigationStack } from '@/composables/useAutoNavigationStack'

const reportStore = useSalesReportStore()
const toast = useToast()
const activePreset = ref('today')
const showFilterModal = ref(false)

// Auto register/unregister modal di navigation stack
useAutoNavigationStack(showFilterModal, 'sales-report-filter-modal')

// Status pembayaran (temp state untuk modal)
const tempPaymentStatus = ref<'lunas' | 'belum_lunas' | 'all'>('all')
const tempStartDate = ref('')
const tempEndDate = ref('')
const paymentStatusOptions = [
  { value: 'all', label: 'Semua' },
  { value: 'lunas', label: 'Lunas' },
  { value: 'belum_lunas', label: 'Belum Lunas' },
] as const

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

const openFilterModal = () => {
  tempPaymentStatus.value = reportStore.paymentStatusFilter
  tempStartDate.value = reportStore.startDate
  tempEndDate.value = reportStore.endDate
  showFilterModal.value = true
}

const applyFilter = async () => {
  if (tempStartDate.value) reportStore.startDate = tempStartDate.value
  if (tempEndDate.value) reportStore.endDate = tempEndDate.value
  reportStore.setPaymentStatusFilter(tempPaymentStatus.value)
  activePreset.value = ''
  showFilterModal.value = false
  await fetchReport()
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
  // Load saved preset if exists
  if (reportStore.savedPeriod.preset) {
    activePreset.value = reportStore.savedPeriod.preset
  }
  fetchReport()
})
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-active > div,
.modal-leave-active > div {
  transition: transform 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from > div,
.modal-leave-to > div {
  transform: translateY(100%);
}
</style>
