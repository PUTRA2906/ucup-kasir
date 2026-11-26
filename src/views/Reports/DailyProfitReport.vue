<template>
  <AdminLayout hide-bottom-nav>
    <PageBreadcrumb pageTitle="Laporan Keuntungan" class="hidden md:block" />

    <!-- Mobile Header -->
    <MobilePageHeader title="Keuntungan" :subtitle="formatDateRange()">
      <template #actions>
        <button
          @click="openDatePicker"
          class="flex h-8 w-8 items-center justify-center rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-white/[0.03]"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </button>
      </template>
    </MobilePageHeader>

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center py-20">
      <div class="text-center">
        <div class="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
        <p class="text-sm text-gray-500 dark:text-gray-400">Memuat laporan...</p>
      </div>
    </div>

    <!-- Content -->
    <div v-else class="space-y-4 pb-24 md:pb-6">
      <!-- Range Picker (Mobile) -->
      <button
        @click="openDatePicker"
        class="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-xs font-medium text-gray-700 md:hidden dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
      >
        <svg class="h-4 w-4 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        {{ formatDateRange() }}
      </button>

      <!-- Summary Cards (2 Kolom Mobile) -->
      <div class="grid grid-cols-2 gap-3">
        <!-- Card 1: Kas Masuk -->
        <div class="relative overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-4 shadow-sm dark:border-emerald-500/30 dark:from-emerald-500/10 dark:to-gray-900">
          <div class="absolute right-0 top-0 h-20 w-20 translate-x-6 -translate-y-6 rounded-full bg-emerald-500/10"></div>
          <div class="relative">
            <div class="mb-2 flex items-center gap-2">
              <div class="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20">
                <svg class="h-4 w-4 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span class="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Kas Masuk</span>
            </div>
            <p class="mb-1 text-xl font-black leading-none text-gray-900 dark:text-white">
              {{ formatCurrency(summary.total_cash_received) }}
            </p>
            <div class="flex items-center gap-1.5">
              <span
                v-if="trendData.cashTrend !== 0"
                :class="[
                  'flex items-center gap-0.5 text-[9px] font-bold',
                  trendData.cashTrend > 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-red-600 dark:text-red-400'
                ]"
              >
                <svg v-if="trendData.cashTrend > 0" class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
                <svg v-else class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
                {{ Math.abs(trendData.cashTrend).toFixed(1) }}%
              </span>
              <span class="text-[9px] text-gray-500 dark:text-gray-400">vs periode sebelumnya</span>
            </div>
          </div>
        </div>

        <!-- Card 2: Laba Terealisasi -->
        <div class="relative overflow-hidden rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50 to-white p-4 shadow-sm dark:border-purple-500/30 dark:from-purple-500/10 dark:to-gray-900">
          <div class="absolute right-0 top-0 h-20 w-20 translate-x-6 -translate-y-6 rounded-full bg-purple-500/10"></div>
          <div class="relative">
            <div class="mb-2 flex items-center gap-2">
              <div class="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/20">
                <svg class="h-4 w-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <span class="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">Laba Terealisasi</span>
            </div>
            <p class="mb-1 text-xl font-black leading-none text-gray-900 dark:text-white">
              {{ formatCurrency(summary.realized_profit) }}
            </p>
            <p class="text-[9px] text-purple-600 dark:text-purple-400">
              Margin: {{ summary.gross_profit_margin.toFixed(1) }}%
            </p>
          </div>
        </div>

        <!-- Card 3: Laba Bersih -->
        <div class="relative overflow-hidden rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-4 shadow-sm dark:border-blue-500/30 dark:from-blue-500/10 dark:to-gray-900">
          <div class="absolute right-0 top-0 h-20 w-20 translate-x-6 -translate-y-6 rounded-full bg-blue-500/10"></div>
          <div class="relative">
            <div class="mb-2 flex items-center gap-2">
              <div class="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/20">
                <svg class="h-4 w-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span class="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Laba Bersih</span>
            </div>
            <p class="mb-1 text-xl font-black leading-none text-gray-900 dark:text-white">
              {{ formatCurrency(netProfit) }}
            </p>
            <p class="text-[9px] text-gray-500 dark:text-gray-400">
              Setelah beban operasional
            </p>
          </div>
        </div>

        <!-- Card 4: Saldo Tersedia -->
        <div class="relative overflow-hidden rounded-2xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-white p-4 shadow-sm dark:border-amber-500/40 dark:from-amber-500/10 dark:to-gray-900">
          <div class="absolute right-0 top-0 h-20 w-20 translate-x-6 -translate-y-6 rounded-full bg-amber-500/10"></div>
          <div class="relative">
            <div class="mb-2 flex items-center gap-2">
              <div class="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/20">
                <svg class="h-4 w-4 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <span class="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Bisa Diambil</span>
            </div>
            <p class="mb-1 text-xl font-black leading-none text-gray-900 dark:text-white">
              {{ formatCurrency(netProfit) }}
            </p>
            <p class="text-[9px] text-amber-600 dark:text-amber-400">
              💡 Uang siap putar
            </p>
          </div>
        </div>
      </div>

      <!-- Trend Chart -->
      <div
        v-if="showChart"
        class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900"
      >
        <div class="mb-3 flex items-center justify-between">
          <h3 class="text-sm font-bold text-gray-900 dark:text-white">{{ chartTitle }}</h3>
          <span class="text-[10px] text-gray-500 dark:text-gray-400">Laba Bersih</span>
        </div>
        <div id="trendChart" class="h-48"></div>
      </div>
      <div
        v-else
        class="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-4 text-center text-xs text-gray-500 dark:border-gray-700 dark:bg-white/[0.03] dark:text-gray-400"
      >
        Grafik harian hanya ditampilkan untuk rentang maksimal 31 hari.
      </div>

      <!-- Breakdown Periode -->
      <div class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h3 class="mb-3 border-b border-gray-200 pb-2 text-sm font-bold text-gray-900 dark:border-gray-700 dark:text-white">
          Rincian Periode
        </h3>
        <div class="space-y-2">
          <div class="flex justify-between text-xs">
            <span class="text-gray-600 dark:text-gray-400">Penjualan Kotor</span>
            <span class="font-medium text-gray-900 dark:text-white">{{ formatCurrency(summary.gross_sales) }}</span>
          </div>
          <div class="flex justify-between text-xs">
            <span class="text-gray-600 dark:text-gray-400">- Diskon</span>
            <span class="font-medium text-red-600 dark:text-red-400">-{{ formatCurrency(summary.total_discount) }}</span>
          </div>
          <div class="flex justify-between text-xs">
            <span class="text-gray-600 dark:text-gray-400">- Retur</span>
            <span class="font-medium text-red-600 dark:text-red-400">-{{ formatCurrency(summary.total_returns) }}</span>
          </div>
          <div class="flex justify-between border-t border-gray-200 pt-2 text-xs font-bold dark:border-gray-700">
            <span class="text-gray-700 dark:text-gray-300">Penjualan Bersih</span>
            <span class="text-gray-900 dark:text-white">{{ formatCurrency(summary.net_sales) }}</span>
          </div>
          <div class="flex justify-between text-xs">
            <span class="text-gray-600 dark:text-gray-400">- HPP Bersih</span>
            <span class="font-medium text-red-600 dark:text-red-400">-{{ formatCurrency(summary.net_cogs) }}</span>
          </div>
          <div class="flex justify-between border-t border-gray-200 pt-2 text-xs dark:border-gray-700">
            <span class="text-gray-600 dark:text-gray-400">Laba Kotor (akrual)</span>
            <span class="font-medium text-gray-600 dark:text-gray-400">{{ formatCurrency(summary.gross_profit) }}</span>
          </div>
          <div class="flex justify-between text-xs">
            <span class="pl-3 text-emerald-600 dark:text-emerald-400">✓ Terealisasi</span>
            <span class="font-medium text-emerald-600 dark:text-emerald-400">{{ formatCurrency(summary.realized_profit) }}</span>
          </div>
          <div class="flex justify-between text-xs">
            <span class="pl-3 text-amber-600 dark:text-amber-400">⏳ Tertahan (piutang)</span>
            <span class="font-medium text-amber-600 dark:text-amber-400">{{ formatCurrency(summary.unrealized_profit) }}</span>
          </div>
          <div class="flex justify-between text-xs">
            <span class="text-gray-600 dark:text-gray-400">- Beban Operasional</span>
            <span class="font-medium text-red-600 dark:text-red-400">-{{ formatCurrency(totalExpenses) }}</span>
          </div>
          <div class="flex justify-between border-t-2 border-amber-200 bg-amber-50/50 px-2 py-2 text-sm font-bold dark:border-amber-500/30 dark:bg-amber-500/5">
            <span class="text-amber-700 dark:text-amber-400">💰 Laba Bersih</span>
            <span class="text-amber-700 dark:text-amber-400">{{ formatCurrency(netProfit) }}</span>
          </div>
        </div>
      </div>

      <!-- Kas Masuk per Metode -->
      <div class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h3 class="mb-3 border-b border-gray-200 pb-2 text-sm font-bold text-gray-900 dark:border-gray-700 dark:text-white">
          Kas Masuk per Metode
        </h3>
        <div class="space-y-2.5">
          <div v-for="method in paymentMethods" :key="method.name" class="flex items-center gap-3">
            <div class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">
              <span class="text-base">{{ method.icon }}</span>
            </div>
            <div class="flex-1">
              <p class="text-xs font-medium text-gray-900 dark:text-white">{{ method.label }}</p>
              <div class="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                <div
                  class="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
                  :style="{ width: method.percentage + '%' }"
                ></div>
              </div>
            </div>
            <div class="text-right">
              <p class="text-xs font-bold text-gray-900 dark:text-white">{{ formatCurrency(method.amount) }}</p>
              <p class="text-[9px] text-gray-500 dark:text-gray-400">{{ method.percentage.toFixed(1) }}%</p>
            </div>
          </div>
          <div v-if="paymentMethods.length === 0" class="py-4 text-center text-xs text-gray-500 dark:text-gray-400">
            Belum ada kas masuk
          </div>
        </div>
      </div>

      <!-- Transaksi Periode -->
      <div class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div class="mb-3 flex items-center justify-between border-b border-gray-200 pb-2 dark:border-gray-700">
          <h3 class="text-sm font-bold text-gray-900 dark:text-white">
            Transaksi Periode
          </h3>
          <span class="text-xs text-gray-500 dark:text-gray-400">
            {{ transactions.length }} transaksi
          </span>
        </div>

        <!-- List Transaksi -->
        <div v-if="transactions.length > 0" class="space-y-2">
          <router-link
            v-for="transaction in transactions"
            :key="transaction.id"
            :to="`/transactions/${transaction.id}`"
            class="flex items-start gap-2.5 rounded-lg border border-gray-100 p-2.5 transition hover:border-brand-500 hover:bg-brand-50/50 dark:border-gray-800 dark:hover:border-brand-500 dark:hover:bg-brand-900/10"
          >
            <!-- Icon -->
            <div class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-brand-500/10">
              <svg class="h-4 w-4 text-brand-600 dark:text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>

            <!-- Info -->
            <div class="flex-1 min-w-0">
              <p class="text-xs font-medium text-gray-900 dark:text-white truncate">
                {{ transaction.transaction_number }}
              </p>
              <p class="text-[9px] text-gray-500 dark:text-gray-400">
                {{ formatDateTime(transaction.created_at) }} · {{ transaction.customer_name || 'Umum' }}
              </p>
              <div class="mt-1 flex items-center gap-2">
                <span
                  :class="[
                    'inline-flex items-center rounded-full px-1.5 py-0.5 text-[8px] font-medium',
                    transaction.payment_status === 'lunas'
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                  ]"
                >
                  {{ transaction.payment_status === 'lunas' ? 'Lunas' : 'Belum Lunas' }}
                </span>
                <span class="text-[9px] font-medium text-blue-600 dark:text-blue-400">
                  Kas: {{ formatCurrency(transaction.cash_received) }}
                </span>
              </div>
            </div>

            <!-- Total -->
            <div class="text-right">
              <p class="text-xs font-bold text-gray-900 dark:text-white">
                {{ formatCurrency(transaction.total) }}
              </p>
              <p class="text-[9px] text-gray-500 dark:text-gray-400">Total</p>
            </div>
          </router-link>
        </div>

        <!-- Empty State -->
        <div v-else class="py-8 text-center">
          <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Belum ada transaksi pada periode ini
          </p>
        </div>
      </div>

      <!-- Export Button -->
      <button
        @click="exportPDF"
        class="w-full inline-flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-brand-500 bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-600 transition hover:bg-brand-100 active:scale-95 dark:border-brand-400 dark:bg-brand-500/10 dark:text-brand-400"
      >
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Export ke PDF
      </button>
    </div>

    <!-- Hidden DateRangeField (Triggered Programmatically) -->
    <DateRangeField
      v-model:start="dateRange.start"
      v-model:end="dateRange.end"
      title="Pilih Rentang Tanggal"
      placeholder="Semua tanggal"
      ref="dateRangeRef"
      button-class="hidden"
    />
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import MobilePageHeader from '@/components/common/MobilePageHeader.vue'
import DateRangeField from '@/components/common/DateRangeField.vue'
import { salesReportEnhancedServiceAdapter } from '@/services'
import type { EnhancedSalesSummary, TransactionDetail } from '@/services/salesReportEnhanced'
import { useFinanceStore } from '@/stores/finance'
import { useToast } from '@/composables/useToast'
import { localDateStr, localTodayStr } from '@/utils/date'
import ApexCharts from 'apexcharts'

const toast = useToast()
const financeStore = useFinanceStore()

const dateRangeRef = ref()
const dateRange = ref({
  start: localTodayStr(),
  end: localTodayStr(),
})
const loading = ref(false)

const summary = ref<EnhancedSalesSummary>({
  gross_sales: 0,
  total_discount: 0,
  total_returns: 0,
  net_sales: 0,
  raw_cogs: 0,
  returned_cogs: 0,
  net_cogs: 0,
  gross_profit: 0,
  gross_profit_margin: 0,
  total_cash_received: 0,
  total_receivables: 0,
  realized_profit: 0,
  unrealized_profit: 0,
  total_transactions: 0,
  average_transaction: 0,
  total_items: 0,
  lunas_count: 0,
  lunas_amount: 0,
  tempo_count: 0,
  tempo_amount: 0,
  partial_count: 0,
  partial_amount: 0,
})

const transactions = ref<TransactionDetail[]>([])
const totalExpenses = ref(0)

// Periode sebelumnya (untuk indikator tren "vs periode sebelumnya")
const prevSummary = ref<EnhancedSalesSummary | null>(null)
const prevExpenses = ref(0)

// Chart
let chartInstance: ApexCharts | null = null
const chartData = ref<{ date: string; profit: number }[]>([])
const showChart = ref(true)

const netProfit = computed(() => summary.value.realized_profit - totalExpenses.value)

/** Jumlah hari inklusif dalam rentang (YYYY-MM-DD). */
const daysBetween = (start: string, end: string): number => {
  if (!start || !end) return 0
  const s = new Date(start + 'T00:00:00')
  const e = new Date(end + 'T00:00:00')
  return Math.round((e.getTime() - s.getTime()) / 86400000) + 1
}

const rangeDays = computed(() => daysBetween(dateRange.value.start, dateRange.value.end))
const isSingleDay = computed(() => rangeDays.value === 1)

const chartTitle = computed(() =>
  isSingleDay.value ? 'Trend 7 Hari Terakhir' : 'Tren Laba Bersih Harian'
)

const trendData = computed(() => {
  if (!prevSummary.value) return { cashTrend: 0, profitTrend: 0 }
  const prevCash = prevSummary.value.total_cash_received
  const prevNet = prevSummary.value.realized_profit - prevExpenses.value
  const curCash = summary.value.total_cash_received
  const curNet = netProfit.value
  return {
    cashTrend: prevCash !== 0 ? ((curCash - prevCash) / Math.abs(prevCash)) * 100 : 0,
    profitTrend: prevNet !== 0 ? ((curNet - prevNet) / Math.abs(prevNet)) * 100 : 0,
  }
})

// Kas masuk per metode pembayaran
const paymentMethods = computed(() => {
  const methods: Record<string, { amount: number; label: string; icon: string }> = {
    tunai: { amount: 0, label: 'Tunai', icon: '💵' },
    transfer: { amount: 0, label: 'Transfer', icon: '🏦' },
    qris: { amount: 0, label: 'QRIS', icon: '📱' },
  }

  transactions.value.forEach((t) => {
    const payments = (t as any).payments || []
    payments.forEach((p: any) => {
      const method = p.payment_method || 'tunai'
      if (methods[method]) {
        methods[method].amount += parseFloat(p.amount) || 0
      }
    })
  })

  const total = Object.values(methods).reduce((sum, m) => sum + m.amount, 0)

  return Object.entries(methods)
    .map(([name, data]) => ({
      name,
      label: data.label,
      icon: data.icon,
      amount: data.amount,
      percentage: total > 0 ? (data.amount / total) * 100 : 0,
    }))
    .filter((m) => m.amount > 0)
    .sort((a, b) => b.amount - a.amount)
})

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value || 0)

const fmtShort = (ymd: string) =>
  new Date(ymd + 'T00:00:00').toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

const formatDateRange = () => {
  const { start, end } = dateRange.value
  if (!start) return 'Pilih rentang tanggal'
  if (!end || start === end) return fmtShort(start)
  return `${fmtShort(start)} – ${fmtShort(end)}`
}

const formatDateTime = (dateStr: string) => {
  const date = new Date(dateStr)
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const openDatePicker = () => {
  const button = dateRangeRef.value?.$el?.querySelector('button')
  if (button) {
    button.click()
  }
}

const fetchReport = async () => {
  loading.value = true
  try {
    const service = salesReportEnhancedServiceAdapter
    const { start, end } = dateRange.value

    const result = await service.getEnhancedSalesReport(start, end, 'all')

    summary.value = result.summary
    transactions.value = result.transactions

    // Load beban operasional periode
    await loadExpenseBalances(start, end)

    // Load periode sebelumnya untuk indikator tren (best-effort)
    await loadPreviousPeriod(start, end)
  } catch (error) {
    console.error('Error fetching report:', error)
    toast.error('Gagal!', 'Gagal memuat laporan keuntungan')
  } finally {
    loading.value = false

    // Load trend setelah loading selesai dan DOM sudah update
    await nextTick()
    await loadTrendData()
  }
}

/**
 * Beban non-HPP periode dari getPeriodActivity() (bukan selisih saldo —
 * jurnal penutup men-nol-kan akun beban sehingga selisih saldo salah).
 */
const loadExpenseBalances = async (startDate: string, endDate: string) => {
  try {
    if (!startDate || !endDate) {
      totalExpenses.value = 0
      return
    }

    const activity = await financeStore.getPeriodActivity(startDate, endDate)
    let expenseTotal = 0
    for (const acc of activity.byAccount) {
      if (acc.account_type === 'beban' && acc.account_code !== '5-5000') {
        expenseTotal += acc.amount
      }
    }

    totalExpenses.value = expenseTotal
  } catch (error) {
    console.error('Error loading expense balances:', error)
    totalExpenses.value = 0
  }
}

/**
 * Muat ringkasan periode sebelumnya (panjang sama, tepat sebelum rentang
 * terpilih) untuk menghitung indikator tren "vs periode sebelumnya".
 * Best-effort: bila gagal, indikator tren disembunyikan.
 */
const loadPreviousPeriod = async (start: string, end: string) => {
  try {
    const len = daysBetween(start, end)
    if (len <= 0) {
      prevSummary.value = null
      prevExpenses.value = 0
      return
    }

    const startD = new Date(start + 'T00:00:00')
    const prevEndD = new Date(startD)
    prevEndD.setDate(prevEndD.getDate() - 1)
    const prevStartD = new Date(prevEndD)
    prevStartD.setDate(prevStartD.getDate() - (len - 1))

    const ps = localDateStr(prevStartD)
    const pe = localDateStr(prevEndD)

    const service = salesReportEnhancedServiceAdapter
    const prev = await service.getEnhancedSalesReport(ps, pe, 'all')
    prevSummary.value = prev.summary

    const activity = await financeStore.getPeriodActivity(ps, pe)
    let expenseTotal = 0
    for (const acc of activity.byAccount) {
      if (acc.account_type === 'beban' && acc.account_code !== '5-5000') {
        expenseTotal += acc.amount
      }
    }
    prevExpenses.value = expenseTotal
  } catch (error) {
    console.error('Error loading previous period:', error)
    prevSummary.value = null
    prevExpenses.value = 0
  }
}

/**
 * Data grafik:
 * - Rentang 1 hari → 7 hari terakhir berakhir di tanggal itu (perilaku lama).
 * - Rentang multi-hari → laba bersih harian sepanjang rentang.
 * - Rentang > 31 hari → grafik disembunyikan (terlalu banyak query harian).
 */
const loadTrendData = async () => {
  try {
    const service = salesReportEnhancedServiceAdapter

    let startD: Date
    let endD: Date
    if (isSingleDay.value) {
      endD = new Date(dateRange.value.start + 'T00:00:00')
      startD = new Date(endD)
      startD.setDate(startD.getDate() - 6)
    } else {
      startD = new Date(dateRange.value.start + 'T00:00:00')
      endD = new Date(dateRange.value.end + 'T00:00:00')
    }

    const totalDays = Math.round((endD.getTime() - startD.getTime()) / 86400000) + 1

    if (totalDays > 31) {
      showChart.value = false
      chartData.value = []
      if (chartInstance) {
        chartInstance.destroy()
        chartInstance = null
      }
      return
    }

    showChart.value = true

    const data: { date: string; profit: number }[] = []

    for (let i = 0; i < totalDays; i++) {
      const current = new Date(startD)
      current.setDate(current.getDate() + i)
      const dateStr = localDateStr(current)

      const result = await service.getEnhancedSalesReport(dateStr, dateStr, 'all')

      // Load expenses untuk hari itu (aktivitas periode, tanpa jurnal penutup)
      const activity = await financeStore.getPeriodActivity(dateStr, dateStr)
      let expenseTotal = 0
      for (const acc of activity.byAccount) {
        if (acc.account_type === 'beban' && acc.account_code !== '5-5000') {
          expenseTotal += acc.amount
        }
      }

      data.push({
        date: dateStr,
        profit: result.summary.realized_profit - expenseTotal,
      })
    }

    chartData.value = data

    await nextTick()
    renderChart()
  } catch (error) {
    console.error('Error loading trend data:', error)
  }
}

const renderChart = () => {
  // Cek apakah element tersedia
  const chartElement = document.querySelector('#trendChart')
  if (!chartElement) {
    console.warn('Chart element not found, skipping render')
    return
  }

  if (chartInstance) {
    chartInstance.destroy()
  }

  const options = {
    series: [
      {
        name: 'Laba Bersih',
        data: chartData.value.map((d) => d.profit),
      },
    ],
    chart: {
      type: 'area',
      height: 192,
      toolbar: { show: false },
      sparkline: { enabled: false },
    },
    colors: ['#3b82f6'],
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.4,
        opacityTo: 0.1,
        stops: [0, 90, 100],
      },
    },
    dataLabels: { enabled: false },
    stroke: {
      curve: 'smooth',
      width: 2,
    },
    xaxis: {
      categories: chartData.value.map((d) =>
        new Date(d.date + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
      ),
      labels: {
        style: {
          fontSize: '10px',
        },
      },
    },
    yaxis: {
      labels: {
        formatter: (val: number) => formatCurrency(val).replace('Rp', '').trim(),
        style: {
          fontSize: '10px',
        },
      },
    },
    tooltip: {
      y: {
        formatter: (val: number) => formatCurrency(val),
      },
    },
    grid: {
      borderColor: '#e5e7eb',
      strokeDashArray: 3,
    },
  }

  chartInstance = new ApexCharts(document.querySelector('#trendChart'), options)
  chartInstance.render()
}

const exportPDF = async () => {
  toast.info('Export PDF', 'Fitur export PDF sedang dalam pengembangan')
}

watch(dateRange, () => {
  fetchReport()
}, { deep: true })

onMounted(() => {
  fetchReport()
})

onUnmounted(() => {
  if (chartInstance) {
    chartInstance.destroy()
  }
})
</script>
