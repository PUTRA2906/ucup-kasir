<template>
  <AdminLayout hide-bottom-nav>
    <PageBreadcrumb pageTitle="Laporan Keuntungan Harian" class="hidden md:block" />

    <!-- Mobile Header -->
    <MobilePageHeader title="Keuntungan Harian" :subtitle="formatDate(selectedDate)">
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
      <!-- Quick Date Navigation (Mobile) -->
      <div class="flex items-center gap-2 md:hidden">
        <button
          @click="changeDate(-1)"
          class="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl border border-gray-300 bg-white text-xs font-medium text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
          Kemarin
        </button>
        <button
          @click="openDatePicker"
          class="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl border border-gray-300 bg-white text-xs font-medium text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Pilih Tanggal
        </button>
        <button
          @click="changeDate(1)"
          :disabled="isToday"
          :class="[
            'flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl border text-xs font-medium',
            isToday
              ? 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400 dark:border-gray-800 dark:bg-gray-800/50'
              : 'border-gray-300 bg-white text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300'
          ]"
        >
          Besok
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

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
              <span class="text-[9px] text-gray-500 dark:text-gray-400">vs kemarin</span>
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

      <!-- Trend 7 Hari (Chart) -->
      <div class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div class="mb-3 flex items-center justify-between">
          <h3 class="text-sm font-bold text-gray-900 dark:text-white">Trend 7 Hari Terakhir</h3>
          <span class="text-[10px] text-gray-500 dark:text-gray-400">Laba Bersih</span>
        </div>
        <div id="trendChart" class="h-48"></div>
      </div>

      <!-- Breakdown Hari Ini -->
      <div class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h3 class="mb-3 border-b border-gray-200 pb-2 text-sm font-bold text-gray-900 dark:border-gray-700 dark:text-white">
          Rincian Hari Ini
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

      <!-- Transaksi Hari Ini -->
      <div class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div class="mb-3 flex items-center justify-between border-b border-gray-200 pb-2 dark:border-gray-700">
          <h3 class="text-sm font-bold text-gray-900 dark:text-white">
            Transaksi Hari Ini
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
                {{ formatTime(transaction.created_at) }} · {{ transaction.customer_name || 'Umum' }}
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
            Belum ada transaksi hari ini
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

    <!-- Hidden DateField (Triggered Programmatically) -->
    <DateField
      v-model="selectedDate"
      title="Pilih Tanggal"
      ref="dateFieldRef"
      button-class="hidden"
    />
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import MobilePageHeader from '@/components/common/MobilePageHeader.vue'
import DateField from '@/components/common/DateField.vue'
import { salesReportEnhancedService } from '@/services/salesReportEnhanced'
import { sqliteSalesReportEnhancedService } from '@/services/sqlite/salesReportEnhanced'
import type { EnhancedSalesSummary, TransactionDetail } from '@/services/salesReportEnhanced'
import { useFinanceStore } from '@/stores/finance'
import { useToast } from '@/composables/useToast'
import { localTodayStr } from '@/utils/date'
import { isNativeApp } from '@/lib/platform'
import ApexCharts from 'apexcharts'

const toast = useToast()
const financeStore = useFinanceStore()

const dateFieldRef = ref()
const selectedDate = ref(localTodayStr())
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
const trendData = ref({
  cashTrend: 0,
  profitTrend: 0,
})

// Chart
let chartInstance: ApexCharts | null = null
const chartData = ref<{ date: string; profit: number }[]>([])

const netProfit = computed(() => summary.value.realized_profit - totalExpenses.value)

const isToday = computed(() => selectedDate.value === localTodayStr())

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

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

const formatTime = (dateStr: string) => {
  const date = new Date(dateStr)
  return date.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

const openDatePicker = () => {
  const button = dateFieldRef.value?.$el?.querySelector('button')
  if (button) {
    button.click()
  }
}

const changeDate = (offset: number) => {
  const current = new Date(selectedDate.value + 'T00:00:00')
  current.setDate(current.getDate() + offset)
  selectedDate.value = current.toLocaleDateString('en-CA')
}

const fetchReport = async () => {
  loading.value = true
  try {
    // Pilih service berdasarkan platform
    const service = isNativeApp() ? sqliteSalesReportEnhancedService : salesReportEnhancedService

    const result = await service.getEnhancedSalesReport(
      selectedDate.value,
      selectedDate.value,
      'all'
    )

    summary.value = result.summary
    transactions.value = result.transactions

    // Load beban operasional
    await loadExpenseBalances(selectedDate.value, selectedDate.value)
  } catch (error) {
    console.error('Error fetching report:', error)
    toast.error('Gagal!', 'Gagal memuat laporan keuntungan harian')
  } finally {
    loading.value = false

    // Load trend setelah loading selesai dan DOM sudah update
    await new Promise(resolve => setTimeout(resolve, 200))
    await loadTrendData()
  }
}

const loadExpenseBalances = async (startDate: string, endDate: string) => {
  try {
    if (financeStore.accounts.length === 0) {
      await financeStore.fetchAccounts()
    }

    const balancesStart = await financeStore.getAccountBalances(
      startDate
        ? new Date(new Date(startDate + 'T00:00:00').getTime() - 86400000)
            .toLocaleDateString('en-CA')
        : undefined
    )
    const balancesEnd = await financeStore.getAccountBalances(endDate || undefined)

    let expenseTotal = 0
    for (const accEnd of balancesEnd) {
      if (accEnd.account_type === 'beban' && accEnd.account_code !== '5-5000') {
        const accStart = balancesStart.find(b => b.account_id === accEnd.account_id)
        const balanceStart = accStart?.balance || 0
        const expenseInPeriod = accEnd.balance - balanceStart
        expenseTotal += expenseInPeriod
      }
    }

    totalExpenses.value = expenseTotal
  } catch (error) {
    console.error('Error loading expense balances:', error)
    totalExpenses.value = 0
  }
}

const loadTrendData = async () => {
  try {
    // Pilih service berdasarkan platform
    const service = isNativeApp() ? sqliteSalesReportEnhancedService : salesReportEnhancedService

    // Load 7 hari terakhir dari selectedDate
    const endDate = new Date(selectedDate.value + 'T00:00:00')
    const startDate = new Date(endDate)
    startDate.setDate(startDate.getDate() - 6)

    const data: { date: string; profit: number }[] = []

    for (let i = 0; i < 7; i++) {
      const current = new Date(startDate)
      current.setDate(current.getDate() + i)
      const dateStr = current.toLocaleDateString('en-CA')

      const result = await service.getEnhancedSalesReport(
        dateStr,
        dateStr,
        'all'
      )

      // Load expenses untuk hari ini
      const balancesStart = await financeStore.getAccountBalances(
        new Date(current.getTime() - 86400000).toLocaleDateString('en-CA')
      )
      const balancesEnd = await financeStore.getAccountBalances(dateStr)

      let expenseTotal = 0
      for (const accEnd of balancesEnd) {
        if (accEnd.account_type === 'beban' && accEnd.account_code !== '5-5000') {
          const accStart = balancesStart.find(b => b.account_id === accEnd.account_id)
          const balanceStart = accStart?.balance || 0
          expenseTotal += accEnd.balance - balanceStart
        }
      }

      const dayNetProfit = result.summary.realized_profit - expenseTotal

      data.push({
        date: dateStr,
        profit: dayNetProfit,
      })
    }

    chartData.value = data

    // Hitung trend vs kemarin
    if (data.length >= 2) {
      const today = data[data.length - 1].profit
      const yesterday = data[data.length - 2].profit

      if (yesterday !== 0) {
        trendData.value.cashTrend = ((summary.value.total_cash_received - 0) / (yesterday || 1)) * 100
        trendData.value.profitTrend = ((today - yesterday) / Math.abs(yesterday)) * 100
      }
    }

    // Render chart dengan nextTick untuk memastikan DOM sudah ready
    await new Promise(resolve => setTimeout(resolve, 100))
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

watch(selectedDate, () => {
  fetchReport()
})

onMounted(() => {
  fetchReport()
})

onUnmounted(() => {
  if (chartInstance) {
    chartInstance.destroy()
  }
})
</script>
