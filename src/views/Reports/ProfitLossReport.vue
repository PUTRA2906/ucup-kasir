<template>
  <AdminLayout hide-bottom-nav>
    <PageBreadcrumb pageTitle="Laporan Laba Rugi" class="hidden md:block" />

    <!-- Mobile Header -->
    <MobilePageHeader title="Laporan Laba Rugi" subtitle="Analisis Penjualan & Profitabilitas">
      <template #actions>
        <button
          @click="openDatePicker"
          class="flex h-8 w-8 items-center justify-center rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-white/[0.03]"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
        </button>
      </template>
    </MobilePageHeader>

    <!-- Loading State -->
    <div v-if="store.loading" class="flex items-center justify-center py-20">
      <div class="text-center">
        <div class="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
        <p class="text-sm text-gray-500 dark:text-gray-400">Memuat laporan...</p>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="store.error" class="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-500/30 dark:bg-red-500/10">
      <p class="text-sm text-red-600 dark:text-red-400">{{ store.error }}</p>
      <button
        @click="store.fetchReport()"
        class="mt-2 text-xs font-medium text-red-700 underline hover:no-underline dark:text-red-300"
      >
        Coba Lagi
      </button>
    </div>

    <!-- Content -->
    <div v-else class="space-y-4 pb-24 md:pb-6">
      <!-- Filter Pill (Mobile) -->
      <div class="flex items-center gap-2 overflow-x-auto pb-2 md:hidden">
        <button
          @click="openDatePicker"
          class="flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 whitespace-nowrap dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
        >
          <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {{ formatDateRange() }}
        </button>
      </div>

      <!-- Summary Cards (4 Cards - Mobile 2 Kolom) -->
      <div class="grid grid-cols-2 gap-3 md:grid-cols-4">
        <!-- Card 1: Omzet Bersih -->
        <div class="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-3.5 shadow-sm dark:border-blue-500/30 dark:from-blue-500/10 dark:to-gray-900">
          <div class="mb-2 flex items-center justify-between">
            <span class="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Omzet Bersih</span>
            <div class="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-500/20">
              <svg class="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p class="mb-0.5 text-lg font-black leading-none text-gray-900 dark:text-white">
            {{ formatCurrency(store.summary.net_sales) }}
          </p>
          <p class="text-[9px] text-gray-500 dark:text-gray-400">
            Gross: {{ formatCurrency(store.summary.gross_sales) }}
          </p>
          <p class="text-[9px] text-red-600 dark:text-red-400">
            -{{ formatCurrency(store.summary.total_discount + store.summary.total_returns) }}
          </p>
        </div>

        <!-- Card 2: Kas Masuk -->
        <div class="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-3.5 shadow-sm dark:border-emerald-500/30 dark:from-emerald-500/10 dark:to-gray-900">
          <div class="mb-2 flex items-center justify-between">
            <span class="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Kas Masuk</span>
            <div class="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/20">
              <svg class="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p class="mb-0.5 text-lg font-black leading-none text-gray-900 dark:text-white">
            {{ formatCurrency(store.summary.total_cash_received) }}
          </p>
          <p class="text-[9px] text-emerald-600 dark:text-emerald-400">
            {{ store.summary.lunas_count }} transaksi lunas
          </p>
          <p class="text-[9px] text-gray-500 dark:text-gray-400">
            {{ store.summary.partial_count }} cicilan/DP
          </p>
        </div>

        <!-- Card 3: Piutang -->
        <div class="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-3.5 shadow-sm dark:border-amber-500/30 dark:from-amber-500/10 dark:to-gray-900">
          <div class="mb-2 flex items-center justify-between">
            <span class="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Piutang</span>
            <div class="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-500/20">
              <svg class="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p class="mb-0.5 text-lg font-black leading-none text-gray-900 dark:text-white">
            {{ formatCurrency(store.summary.total_receivables) }}
          </p>
          <p class="text-[9px] text-amber-600 dark:text-amber-400">
            {{ store.summary.tempo_count }} transaksi tempo
          </p>
          <button
            @click="router.push('/customer-invoices')"
            class="mt-1 text-[9px] font-medium text-amber-700 underline hover:no-underline dark:text-amber-300"
          >
            Lihat Daftar
          </button>
        </div>

        <!-- Card 4: Laba Terealisasi -->
        <div class="rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50 to-white p-3.5 shadow-sm dark:border-purple-500/30 dark:from-purple-500/10 dark:to-gray-900">
          <div class="mb-2 flex items-center justify-between">
            <span class="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">Laba Terealisasi</span>
            <div class="flex h-6 w-6 items-center justify-center rounded-lg bg-purple-500/20">
              <svg class="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
          <p class="mb-0.5 text-lg font-black leading-none text-gray-900 dark:text-white">
            {{ formatCurrency(store.summary.realized_profit) }}
          </p>
          <p class="text-[9px] text-purple-600 dark:text-purple-400">
            Margin: {{ store.summary.gross_profit_margin.toFixed(1) }}%
          </p>
          <div class="mt-1 space-y-0.5">
            <p class="text-[9px] text-gray-500 dark:text-gray-400">
              Laba Kotor (akrual): {{ formatCurrency(store.summary.gross_profit) }}
            </p>
            <p class="text-[9px] text-amber-600 dark:text-amber-400">
              Tertahan: {{ formatCurrency(store.summary.unrealized_profit) }}
            </p>
          </div>
        </div>
      </div>

      <!-- Laba Bersih Terealisasi (Setelah Beban Operasional) -->
      <div class="rounded-2xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-4 shadow-sm dark:border-emerald-500/40 dark:from-emerald-500/10 dark:to-gray-900">
        <div class="flex items-center justify-between">
          <div>
            <span class="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Laba Bersih Terealisasi</span>
            <p class="text-[10px] text-emerald-600/70 dark:text-emerald-500/70">Laba Terealisasi − Beban Operasional</p>
          </div>
          <p class="text-lg font-black text-emerald-700 dark:text-emerald-400">{{ formatCurrency(realizedNetProfit) }}</p>
        </div>
        <div class="mt-2 flex items-center justify-between border-t border-emerald-200/60 pt-2 text-[10px] dark:border-emerald-500/20">
          <span class="text-emerald-600/80 dark:text-emerald-500/70">Beban Operasional</span>
          <span class="font-bold text-red-600 dark:text-red-400">-{{ formatCurrency(totalExpenses) }}</span>
        </div>
        <div class="mt-1 flex items-center justify-between text-[10px] text-gray-500 dark:text-gray-400">
          <span>Laba Bersih (Akrual):</span>
          <span>{{ formatCurrency(netProfit) }}</span>
        </div>
      </div>

      <!-- Breakdown Laba (selalu tampil) -->
      <div class="rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <span class="text-xs font-bold text-gray-700 dark:text-gray-300">Rincian Perhitungan Laba</span>

        <div class="mt-3 space-y-2 border-t border-gray-200 pt-3 dark:border-gray-700">
          <div class="flex justify-between text-xs">
            <span class="text-gray-600 dark:text-gray-400">Penjualan Kotor</span>
            <span class="font-medium text-gray-900 dark:text-white">{{ formatCurrency(store.summary.gross_sales) }}</span>
          </div>
          <div class="flex justify-between text-xs">
            <span class="text-gray-600 dark:text-gray-400">- Diskon</span>
            <span class="font-medium text-red-600 dark:text-red-400">-{{ formatCurrency(store.summary.total_discount) }}</span>
          </div>
          <div class="flex justify-between text-xs">
            <span class="text-gray-600 dark:text-gray-400">- Retur</span>
            <span class="font-medium text-red-600 dark:text-red-400">-{{ formatCurrency(store.summary.total_returns) }}</span>
          </div>
          <div class="flex justify-between border-t border-gray-200 pt-2 text-xs font-bold dark:border-gray-700">
            <span class="text-gray-700 dark:text-gray-300">Penjualan Bersih</span>
            <span class="text-gray-900 dark:text-white">{{ formatCurrency(store.summary.net_sales) }}</span>
          </div>
          <div class="flex justify-between text-xs">
            <span class="text-gray-600 dark:text-gray-400">- HPP Bersih</span>
            <span class="font-medium text-red-600 dark:text-red-400">-{{ formatCurrency(store.summary.net_cogs) }}</span>
          </div>
          <div class="flex justify-between border-t border-gray-200 pt-2 text-xs font-bold dark:border-gray-700">
            <span class="text-gray-600 dark:text-gray-400">Laba Kotor (akrual)</span>
            <span class="text-gray-600 dark:text-gray-400">{{ formatCurrency(store.summary.gross_profit) }}</span>
          </div>
          <div class="flex justify-between text-xs">
            <span class="text-emerald-600 dark:text-emerald-400">  ↳ Terealisasi (sudah dibayar)</span>
            <span class="font-medium text-emerald-600 dark:text-emerald-400">{{ formatCurrency(store.summary.realized_profit) }}</span>
          </div>
          <div class="flex justify-between text-xs">
            <span class="text-amber-600 dark:text-amber-400">  ↳ Tertahan (belum dibayar)</span>
            <span class="font-medium text-amber-600 dark:text-amber-400">{{ formatCurrency(store.summary.unrealized_profit) }}</span>
          </div>
          <div class="flex justify-between text-xs">
            <span class="text-gray-600 dark:text-gray-400">- Beban Operasional (non-HPP)</span>
            <span class="font-medium text-red-600 dark:text-red-400">-{{ formatCurrency(totalExpenses) }}</span>
          </div>
          <div class="flex justify-between border-t border-gray-200 pt-2 text-xs font-bold dark:border-gray-700">
            <span class="text-purple-600 dark:text-purple-400">Laba Bersih Terealisasi</span>
            <span class="text-purple-600 dark:text-purple-400">{{ formatCurrency(realizedNetProfit) }}</span>
          </div>
          <div class="flex justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>Laba Bersih (Akrual)</span>
            <span>{{ formatCurrency(netProfit) }}</span>
          </div>
        </div>
      </div>

      <!-- Daftar Transaksi -->
      <div class="rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div class="mb-3 flex items-center justify-between border-b border-gray-200 pb-2 dark:border-gray-700">
          <h3 class="text-sm font-bold text-gray-900 dark:text-white">
            Daftar Transaksi
          </h3>
          <span class="text-xs text-gray-500 dark:text-gray-400">
            {{ store.transactions.length }} transaksi
          </span>
        </div>

        <!-- List Transaksi -->
        <div v-if="paginatedTransactions.length > 0" class="space-y-2">
          <router-link
            v-for="transaction in paginatedTransactions"
            :key="transaction.id"
            :to="`/transactions/${transaction.id}`"
            class="flex items-start gap-2.5 rounded-lg border border-gray-100 p-2 transition hover:border-brand-500 hover:bg-brand-50/50 dark:border-gray-800 dark:hover:border-brand-500 dark:hover:bg-brand-900/10"
          >
            <!-- Badge Icon -->
            <div class="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-brand-500/10 text-xs font-bold text-brand-600 dark:text-brand-400">
              <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>

            <!-- Info Transaksi -->
            <div class="flex-1 min-w-0">
              <!-- Nomor Faktur & Tanggal -->
              <p class="text-xs font-medium text-gray-900 dark:text-white truncate">
                {{ transaction.transaction_number }}
              </p>
              <p class="text-[9px] text-gray-500 dark:text-gray-400">
                {{ formatDateTime(transaction.created_at) }} · {{ transaction.customer_name || 'Umum' }}
              </p>

              <!-- Status & Kas Masuk -->
              <div class="mt-1 flex items-center gap-2 flex-wrap">
                <span
                  class="inline-flex items-center rounded-full px-1.5 py-0.5 text-[8px] font-medium"
                  :class="transaction.payment_status === 'lunas'
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'"
                >
                  {{ transaction.payment_status === 'lunas' ? 'Lunas' : 'Belum Lunas' }}
                </span>
                <span class="text-[9px] text-blue-600 dark:text-blue-400 font-medium">
                  Kas: {{ formatCurrency(transaction.cash_received) }}
                </span>
              </div>
            </div>

            <!-- Total -->
            <div class="text-right">
              <p class="text-xs font-bold text-gray-900 dark:text-white">
                {{ formatCurrency(transaction.total) }}
              </p>
              <p class="text-[9px] text-gray-500 dark:text-gray-400">
                Total
              </p>
            </div>
          </router-link>
        </div>

        <!-- Empty State -->
        <div v-else class="py-8 text-center">
          <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Tidak ada transaksi dalam periode ini
          </p>
        </div>

        <!-- Pagination Controls -->
        <div v-if="totalPages > 1" class="mt-3 flex items-center justify-between border-t border-gray-200 pt-3 dark:border-gray-700">
          <button
            type="button"
            :disabled="currentTransactionPage === 1"
            class="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-300 dark:hover:bg-gray-800"
            @click="currentTransactionPage--"
          >
            <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
            Prev
          </button>

          <span class="text-xs text-gray-600 dark:text-gray-400">
            Hal {{ currentTransactionPage }} dari {{ totalPages }}
          </span>

          <button
            type="button"
            :disabled="currentTransactionPage === totalPages"
            class="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-300 dark:hover:bg-gray-800"
            @click="currentTransactionPage++"
          >
            Next
            <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Top 5 Produk Paling Sering Diretur -->
      <div
        v-if="store.topReturns.length > 0"
        class="rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm dark:border-gray-800 dark:bg-gray-900"
      >
        <h3 class="mb-3 border-b border-gray-200 pb-2 text-sm font-bold text-gray-900 dark:border-gray-700 dark:text-white">
          Top 5 Produk Paling Sering Diretur
        </h3>
        <div class="space-y-2">
          <div
            v-for="(product, index) in store.topReturns"
            :key="product.product_id"
            class="flex items-center gap-2.5"
          >
            <div class="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-xs font-bold text-red-600 dark:text-red-400">
              {{ index + 1 }}
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-xs font-medium text-gray-900 dark:text-white truncate">{{ product.product_name }}</p>
              <p class="text-[9px] text-gray-500 dark:text-gray-400">
                {{ product.quantity_returned }} diretur dari {{ product.quantity_sold }} terjual
              </p>
            </div>
            <div class="text-right">
              <p class="text-xs font-bold text-red-600 dark:text-red-400">{{ product.return_rate.toFixed(1) }}%</p>
              <p class="text-[9px] text-gray-500 dark:text-gray-400">Tingkat Retur</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Hidden DateRangeField (Triggered Programmatically) -->
    <DateRangeField
      v-model:start="tempDateRange.start"
      v-model:end="tempDateRange.end"
      title="Pilih Rentang Tanggal"
      placeholder="Semua tanggal"
      ref="dateRangeRef"
      button-class="hidden"
    />
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import MobilePageHeader from '@/components/common/MobilePageHeader.vue'
import DateRangeField from '@/components/common/DateRangeField.vue'
import { useSalesReportEnhancedStore } from '@/stores/salesReportEnhanced'
import { useFinanceStore } from '@/stores/finance'
import { localDateStr, localTodayStr } from '@/utils/date'

const router = useRouter()
const store = useSalesReportEnhancedStore()
const financeStore = useFinanceStore()

const dateRangeRef = ref()

// Temp filter state — tanggal LOKAL (lihat @/utils/date), bukan UTC
const tempDateRange = ref({
  start: localTodayStr(),
  end: localTodayStr(),
})

// Fungsi untuk membuka date picker
const openDatePicker = () => {
  // Trigger click pada button tersembunyi di DateRangeField
  const button = dateRangeRef.value?.$el?.querySelector('button')
  if (button) {
    button.click()
  }
}

// Saldo beban operasional per akun (dari jurnal, modul finance)
const expenseBalanceByAccount = ref<Record<string, number>>({})

// Beban operasional dari jurnal (modul finance) — akun beban selain HPP
const totalExpenses = computed(() => {
  return financeStore.accounts
    .filter((a) => a.type === 'beban' && a.code !== '5-5000')
    .reduce((sum, acc) => sum + (expenseBalanceByAccount.value[acc.id] || 0), 0)
})
const netProfit = computed(() => store.summary.gross_profit - totalExpenses.value)
const realizedNetProfit = computed(() => store.summary.realized_profit - totalExpenses.value)

// ── Pagination untuk Daftar Transaksi ────────────────────────────────────────
const currentTransactionPage = ref(1)
const itemsPerPage = 5

const paginatedTransactions = computed(() => {
  const start = (currentTransactionPage.value - 1) * itemsPerPage
  const end = start + itemsPerPage
  return store.transactions.slice(start, end)
})

const totalPages = computed(() => {
  return Math.ceil(store.transactions.length / itemsPerPage)
})

// Reset pagination saat data berubah
watch(() => store.transactions.length, () => {
  currentTransactionPage.value = 1
})

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value || 0)

const formatDateTime = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

const formatDateRange = () => {
  const start = new Date(store.dateRange.start)
  const end = new Date(store.dateRange.end)

  if (store.dateRange.start === store.dateRange.end) {
    return start.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  return `${start.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} - ${end.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`
}

// Auto-apply filter saat tanggal berubah
watch(tempDateRange, (newRange) => {
  store.setDateRange(newRange.start, newRange.end)
  store.setPaymentStatusFilter('all')
  store.fetchReport()
  loadExpenseBalances(newRange.start, newRange.end)
}, { deep: true })

onMounted(() => {
  // Set default ke hari ini
  const today = localTodayStr()
  tempDateRange.value = { start: today, end: today }
  store.setDateRange(today, today)
  store.fetchReport()

  // Ambil saldo beban operasional dari modul finance
  loadExpenseBalances(today, today)
})

/** Muat saldo akun beban (non-HPP) dari modul finance dalam rentang periode. */
async function loadExpenseBalances(startDate: string, endDate: string) {
  try {
    if (financeStore.accounts.length === 0) {
      await financeStore.fetchAccounts()
    }

    // Ambil saldo awal (sebelum startDate) dan saldo akhir (sampai endDate)
    // Jika startDate kosong (allTime), ambil dari awal (undefined = semua)
    const balancesStart = await financeStore.getAccountBalances(
      startDate
        ? new Date(new Date(startDate + 'T00:00:00').getTime() - 86400000)
            .toLocaleDateString('en-CA')
        : undefined
    )
    const balancesEnd = await financeStore.getAccountBalances(endDate || undefined)

    // Hitung selisih saldo dalam periode (beban dalam periode = saldo akhir - saldo awal)
    expenseBalanceByAccount.value = {}
    for (const accEnd of balancesEnd) {
      if (accEnd.account_type === 'beban') {
        const accStart = balancesStart.find(b => b.account_id === accEnd.account_id)
        const balanceStart = accStart?.balance || 0
        const expenseInPeriod = accEnd.balance - balanceStart

        if (expenseInPeriod !== 0) {
          expenseBalanceByAccount.value[accEnd.account_id] = expenseInPeriod
        }
      }
    }
  } catch (error) {
    console.error('Error loading expense balances:', error)
    // silently fail — beban tetap 0
  }
}
</script>
