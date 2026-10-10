<template>
  <AdminLayout hide-bottom-nav>
    <PageBreadcrumb pageTitle="Mutasi Kas Bulanan" class="hidden md:block" />

    <!-- Mobile Header -->
    <MobilePageHeader title="Mutasi Kas Bulanan" :subtitle="periodLabel">
      <template #actions>
        <button
          @click="showPeriodPicker = true"
          class="flex h-8 w-8 items-center justify-center rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-white/[0.03]"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </button>
      </template>
    </MobilePageHeader>

    <div class="space-y-4 px-4 md:px-0">

      <!-- Period Selector Desktop -->
      <div class="hidden md:flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Periode:</span>
        <select
          v-model="selectedMonth"
          @change="onPeriodChange"
          class="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
        >
          <option v-for="m in months" :key="m.value" :value="m.value">{{ m.label }}</option>
        </select>
        <select
          v-model="selectedYear"
          @change="onPeriodChange"
          class="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
        >
          <option v-for="y in availableYears" :key="y" :value="y">{{ y }}</option>
        </select>
        <span class="ml-auto text-sm font-semibold text-gray-900 dark:text-white">{{ periodLabel }}</span>
      </div>

      <!-- Saldo Card -->
      <div class="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div class="flex items-center justify-between mb-4">
          <div>
            <p class="text-xs font-medium text-gray-500 dark:text-gray-400">Saldo Kas Saat Ini</p>
            <p class="mt-1 text-3xl font-bold text-gray-900 dark:text-white">
              {{ formatCurrency(currentBalance) }}
            </p>
          </div>
          <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10">
            <svg class="h-6 w-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
        </div>
      </div>

      <!-- Loading Skeleton -->
      <div v-if="loading" class="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div class="border-b border-gray-100 px-4 py-3 dark:border-gray-800">
          <div class="h-4 w-32 bg-gray-200 rounded animate-pulse dark:bg-gray-700"></div>
        </div>
        <div class="divide-y divide-gray-100 dark:divide-gray-800">
          <div v-for="i in 7" :key="i" class="px-4 py-3">
            <div class="flex items-start justify-between gap-3">
              <div class="flex-1 min-w-0">
                <div class="h-4 w-3/4 bg-gray-200 rounded animate-pulse dark:bg-gray-700"></div>
                <div class="mt-2 h-3 w-1/2 bg-gray-200 rounded animate-pulse dark:bg-gray-700"></div>
              </div>
              <div class="h-4 w-24 bg-gray-200 rounded animate-pulse dark:bg-gray-700"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Riwayat Mutasi -->
      <div v-else class="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div class="border-b border-gray-100 px-4 py-3 dark:border-gray-800">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-semibold text-gray-900 dark:text-white">Riwayat Mutasi</h3>
            <span class="text-xs text-gray-500 dark:text-gray-400">
              {{ transactions.length }} transaksi
            </span>
          </div>
        </div>

        <div v-if="transactions.length === 0" class="p-8 text-center">
          <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
          <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">Belum ada transaksi pada periode ini</p>
        </div>

        <div v-else class="divide-y divide-gray-100 dark:divide-gray-800">
          <div
            v-for="(trx, i) in transactions"
            :key="i"
            class="px-4 py-3 transition hover:bg-gray-50 dark:hover:bg-white/[0.02]"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-900 dark:text-white">
                  {{ trx.customer_name || trx.description }}
                </p>
                <div class="mt-1 flex items-center gap-2">
                  <span class="text-xs text-gray-500 dark:text-gray-400">
                    {{ formatDateTime(trx.time) }}
                  </span>
                  <span class="text-xs text-gray-400">•</span>
                  <span class="text-xs text-gray-500 dark:text-gray-400">
                    {{ getTypeLabel(trx.type) }}
                  </span>
                  <span class="text-xs text-gray-400">•</span>
                  <span class="text-xs" :class="trx.method === 'tunai' ? 'text-emerald-600 dark:text-emerald-400' : 'text-blue-600 dark:text-blue-400'">
                    {{ trx.method === 'tunai' ? 'Tunai' : 'Transfer' }}
                  </span>
                </div>
                <p v-if="trx.reference" class="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                  {{ trx.reference }}
                </p>
              </div>
              <div class="text-right">
                <p
                  class="text-sm font-semibold"
                  :class="trx.is_in
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-red-600 dark:text-red-400'"
                >
                  {{ trx.is_in ? '+' : '-' }}{{ formatCurrency(trx.amount) }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Period Picker Modal (Mobile) -->
    <Teleport to="body">
      <div
        v-if="showPeriodPicker"
        class="fixed inset-0 z-50 flex items-end justify-center bg-black/50 md:items-center md:p-4"
        @click.self="showPeriodPicker = false"
      >
        <div class="w-full rounded-t-2xl bg-white p-6 shadow-xl dark:bg-gray-800 md:max-w-sm md:rounded-2xl">
          <h3 class="mb-4 text-lg font-bold text-gray-900 dark:text-white">Pilih Periode</h3>

          <div class="space-y-3">
            <div>
              <label class="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Bulan</label>
              <select
                v-model="pickerMonth"
                class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              >
                <option v-for="m in months" :key="m.value" :value="m.value">{{ m.label }}</option>
              </select>
            </div>
            <div>
              <label class="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Tahun</label>
              <select
                v-model="pickerYear"
                class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              >
                <option v-for="y in availableYears" :key="y" :value="y">{{ y }}</option>
              </select>
            </div>

            <!-- Validasi masa depan -->
            <p v-if="isFuturePeriod(pickerMonth, pickerYear)" class="text-xs text-red-500 dark:text-red-400">
              ⚠ Tidak dapat melihat laporan periode yang belum terjadi.
            </p>
          </div>

          <div class="mt-5 flex gap-3">
            <button
              @click="showPeriodPicker = false"
              class="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.05]"
            >
              Batal
            </button>
            <button
              @click="applyPeriod"
              :disabled="isFuturePeriod(pickerMonth, pickerYear)"
              class="flex-1 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Terapkan
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import MobilePageHeader from '@/components/common/MobilePageHeader.vue'
import { dailyCashServiceAdapter as dailyCashService } from '@/services'
import type { CashTransaction, DailyCashSummary } from '@/services/dailyCash'
import { useFinanceStore } from '@/stores/finance'

const financeStore = useFinanceStore()
const loading = ref(true)
const showPeriodPicker = ref(false)

// Tanggal sekarang (lokal)
const now = new Date()
const currentMonthNum = now.getMonth() + 1  // 1-12
const currentYear = now.getFullYear()

// Filter yang aktif
const selectedMonth = ref(currentMonthNum)
const selectedYear = ref(currentYear)

// Picker sementara (sebelum di-apply)
const pickerMonth = ref(currentMonthNum)
const pickerYear = ref(currentYear)

// Data
const currentBalance = ref(0)
const summary = ref<DailyCashSummary>({
  total_in: 0,
  total_out: 0,
  net: 0,
  tunai_in: 0,
  tunai_out: 0,
  transfer_in: 0,
  transfer_out: 0,
  transactions_count: 0,
  payments_count: 0,
})
const transactions = ref<CashTransaction[]>([])

// ── Options ──────────────────────────────────────────────────────────────────

const months = [
  { value: 1, label: 'Januari' },
  { value: 2, label: 'Februari' },
  { value: 3, label: 'Maret' },
  { value: 4, label: 'April' },
  { value: 5, label: 'Mei' },
  { value: 6, label: 'Juni' },
  { value: 7, label: 'Juli' },
  { value: 8, label: 'Agustus' },
  { value: 9, label: 'September' },
  { value: 10, label: 'Oktober' },
  { value: 11, label: 'November' },
  { value: 12, label: 'Desember' },
]

// Tampilkan tahun dari 3 tahun lalu sampai tahun sekarang
const availableYears = computed(() => {
  const years: number[] = []
  for (let y = currentYear - 3; y <= currentYear; y++) {
    years.push(y)
  }
  return years
})

// Label periode yang ditampilkan
const periodLabel = computed(() => {
  const m = months.find((m) => m.value === selectedMonth.value)
  return `${m?.label ?? ''} ${selectedYear.value}`
})

// ── Validasi masa depan ───────────────────────────────────────────────────────
const isFuturePeriod = (month: number, year: number): boolean => {
  if (year > currentYear) return true
  if (year === currentYear && month > currentMonthNum) return true
  return false
}

// ── Event handlers ────────────────────────────────────────────────────────────

const onPeriodChange = () => {
  // Validasi masa depan saat dropdown desktop berubah
  if (isFuturePeriod(selectedMonth.value, selectedYear.value)) {
    // Reset ke periode sekarang
    selectedMonth.value = currentMonthNum
    selectedYear.value = currentYear
  }
  loadData()
}

const applyPeriod = () => {
  if (isFuturePeriod(pickerMonth.value, pickerYear.value)) return
  selectedMonth.value = pickerMonth.value
  selectedYear.value = pickerYear.value
  showPeriodPicker.value = false
  loadData()
}

// Saat modal dibuka, sinkronkan picker dengan nilai aktif
const openPeriodPicker = () => {
  pickerMonth.value = selectedMonth.value
  pickerYear.value = selectedYear.value
  showPeriodPicker.value = true
}

// ── Format helpers ────────────────────────────────────────────────────────────

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value || 0)

const formatDateTime = (dateStr: string) => {
  const date = new Date(dateStr)
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

const getTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    sale: 'Penjualan',
    payment: 'Cicilan',
    expense: 'Pengeluaran',
    journal: 'Jurnal',
  }
  return labels[type] || type
}

// ── Load data ─────────────────────────────────────────────────────────────────

const getDaysInMonth = (year: number, month: number): string[] => {
  const days: string[] = []
  const total = new Date(year, month, 0).getDate() // hari terakhir bulan

  // Jika bulan ini (periode berjalan), hanya ambil sampai hari ini
  const maxDay =
    year === currentYear && month === currentMonthNum
      ? now.getDate()
      : total

  for (let d = 1; d <= maxDay; d++) {
    const mm = String(month).padStart(2, '0')
    const dd = String(d).padStart(2, '0')
    days.push(`${year}-${mm}-${dd}`)
  }
  return days
}

const loadData = async () => {
  loading.value = true
  try {
    // Saldo kas real-time
    const balances = await financeStore.getAccountBalances()
    const cashAccount = balances.find((b) => b.account_code === '1-1000')
    currentBalance.value =
      cashAccount
        ? cashAccount.normal_balance === 'debit'
          ? cashAccount.balance
          : -cashAccount.balance
        : 0

    // Buat daftar tanggal dalam bulan yang dipilih
    const days = getDaysInMonth(selectedYear.value, selectedMonth.value)

    // Ambil summary & transaksi untuk semua hari secara paralel
    const [summaries, transactionLists] = await Promise.all([
      Promise.all(days.map((d) => dailyCashService.getDailyCashSummary(d))),
      Promise.all(days.map((d) => dailyCashService.getDailyCashTransactions(d))),
    ])

    // Agregasi summary
    summary.value = summaries.reduce(
      (acc, s) => ({
        total_in: acc.total_in + s.total_in,
        total_out: acc.total_out + s.total_out,
        net: acc.net + s.net,
        tunai_in: acc.tunai_in + s.tunai_in,
        tunai_out: acc.tunai_out + s.tunai_out,
        transfer_in: acc.transfer_in + s.transfer_in,
        transfer_out: acc.transfer_out + s.transfer_out,
        transactions_count: acc.transactions_count + s.transactions_count,
        payments_count: acc.payments_count + s.payments_count,
      }),
      {
        total_in: 0,
        total_out: 0,
        net: 0,
        tunai_in: 0,
        tunai_out: 0,
        transfer_in: 0,
        transfer_out: 0,
        transactions_count: 0,
        payments_count: 0,
      }
    )

    // Gabungkan dan urutkan berdasarkan waktu terbaru
    transactions.value = transactionLists
      .flat()
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
  } catch (error) {
    console.error('Error loading monthly cash report:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadData()
})
</script>
