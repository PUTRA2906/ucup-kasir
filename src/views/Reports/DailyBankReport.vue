<template>
  <AdminLayout>
    <PageBreadcrumb pageTitle="Mutasi Bank Hari Ini" class="hidden md:block" />

    <!-- Mobile Header -->
    <MobilePageHeader title="Mutasi Bank" :subtitle="formatDate(selectedDate)">
      <template #actions>
        <button
          @click="showDatePicker = true"
          class="flex h-8 w-8 items-center justify-center rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-white/[0.03]"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </button>
      </template>
    </MobilePageHeader>

    <div class="space-y-4 px-4 md:px-0">
      <!-- Loading Skeleton -->
      <div v-if="loading" class="space-y-4">
        <!-- Saldo Card Skeleton -->
        <div class="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div class="flex items-center justify-between mb-4">
            <div class="flex-1">
              <div class="h-3 w-24 bg-gray-200 rounded animate-pulse dark:bg-gray-700"></div>
              <div class="mt-2 h-8 w-40 bg-gray-200 rounded animate-pulse dark:bg-gray-700"></div>
            </div>
            <div class="h-12 w-12 bg-gray-200 rounded-2xl animate-pulse dark:bg-gray-700"></div>
          </div>
        </div>

        <!-- Filter Chips Skeleton -->
        <div class="flex items-center gap-2 overflow-x-auto pb-2">
          <div v-for="i in 4" :key="i" class="h-8 w-24 bg-gray-200 rounded-xl animate-pulse dark:bg-gray-700"></div>
        </div>

        <!-- Riwayat Mutasi Skeleton -->
        <div class="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div class="border-b border-gray-100 px-4 py-3 dark:border-gray-800">
            <div class="h-4 w-32 bg-gray-200 rounded animate-pulse dark:bg-gray-700"></div>
          </div>
          <div class="divide-y divide-gray-100 dark:divide-gray-800">
            <div v-for="i in 5" :key="i" class="px-4 py-3">
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
      </div>

      <template v-else>
        <!-- Saldo Card - Bank Style (Real-time, tidak terpengaruh filter) -->
        <div class="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div class="flex items-center justify-between mb-4">
            <div>
              <p class="text-xs font-medium text-gray-500 dark:text-gray-400">Saldo Bank Saat Ini</p>
              <p class="mt-1 text-3xl font-bold text-gray-900 dark:text-white">
                {{ formatCurrency(currentBalance) }}
              </p>
            </div>
            <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/10">
              <svg class="h-6 w-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
          </div>
        </div>

        <!-- Filter Chips -->
        <div class="flex items-center gap-2 overflow-x-auto pb-2">
          <button
            v-for="preset in presets"
            :key="preset.value"
            @click="applyPreset(preset.value)"
            class="flex-shrink-0 rounded-xl px-3 py-1.5 text-xs font-medium transition active:scale-95"
            :class="selectedPreset === preset.value
              ? 'bg-brand-500 text-white'
              : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-white/[0.05]'"
          >
            {{ preset.label }}
          </button>
        </div>

        <!-- Riwayat Mutasi (Filtered) -->
        <div class="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div class="border-b border-gray-100 px-4 py-3 dark:border-gray-800">
            <div class="flex items-center justify-between">
              <h3 class="text-sm font-semibold text-gray-900 dark:text-white">Riwayat Mutasi</h3>
              <div class="flex items-center gap-2">
                <span class="text-xs text-gray-500 dark:text-gray-400">
                  {{ formatDate(selectedDate) }}
                  {{ selectedDate !== endDate ? ' - ' + formatDate(endDate) : '' }}
                </span>
              </div>
            </div>
          </div>

          <div v-if="transactions.length === 0" class="p-8 text-center">
            <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">Belum ada transaksi</p>
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
                    <span class="text-xs text-purple-600 dark:text-purple-400">
                      Transfer
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
      </template>
    </div>

    <!-- Date Picker Modal -->
    <Teleport to="body">
      <div
        v-if="showDatePicker"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        @click.self="showDatePicker = false"
      >
        <div class="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-800">
          <h3 class="mb-4 text-lg font-bold text-gray-900 dark:text-white">Pilih Tanggal</h3>
          <input
            v-model="selectedDate"
            type="date"
            class="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            @change="handleDateChange"
          />
          <div class="mt-4 flex gap-3">
            <button
              @click="showDatePicker = false"
              class="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.05]"
            >
              Batal
            </button>
            <button
              @click="applyDate"
              class="flex-1 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700"
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
import { ref, onMounted } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import MobilePageHeader from '@/components/common/MobilePageHeader.vue'
import { dailyBankServiceAdapter as dailyBankService } from '@/services'
import type { BankTransaction, DailyBankSummary } from '@/services/dailyBank'
import { useFinanceStore } from '@/stores/finance'

const financeStore = useFinanceStore()
const loading = ref(true)
const showDatePicker = ref(false)

// Helper untuk mendapatkan tanggal lokal dalam format YYYY-MM-DD (menghindari UTC offset)
const getLocalDateString = (date: Date = new Date()) => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const selectedDate = ref(getLocalDateString())
const endDate = ref(getLocalDateString())
const selectedPreset = ref('today')
const currentBalance = ref(0)

const presets = [
  { label: 'Hari Ini', value: 'today' },
  { label: 'Kemarin', value: 'yesterday' },
  { label: 'Minggu Ini', value: 'thisWeek' },
  { label: 'Bulan Ini', value: 'thisMonth' },
]

const summary = ref<DailyBankSummary>({
  total_in: 0,
  total_out: 0,
  net: 0,
  transactions_count: 0,
  payments_count: 0
})
const transactions = ref<BankTransaction[]>([])

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value || 0)

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(date)
}

const formatDateTime = (dateStr: string) => {
  const date = new Date(dateStr)
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

const getTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    sale: 'Penjualan',
    payment: 'Cicilan',
    expense: 'Pengeluaran',
    journal: 'Jurnal'
  }
  return labels[type] || type
}

const applyPreset = (preset: string) => {
  selectedPreset.value = preset
  const now = new Date()

  switch (preset) {
    case 'today':
      selectedDate.value = getLocalDateString(now)
      endDate.value = getLocalDateString(now)
      break
    case 'yesterday':
      const yesterday = new Date(now)
      yesterday.setDate(yesterday.getDate() - 1)
      selectedDate.value = getLocalDateString(yesterday)
      endDate.value = getLocalDateString(yesterday)
      break
    case 'thisWeek':
      // Mulai dari Senin minggu ini
      const startOfWeek = new Date(now)
      const day = startOfWeek.getDay()
      const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1)
      startOfWeek.setDate(diff)
      selectedDate.value = getLocalDateString(startOfWeek)
      endDate.value = getLocalDateString(now)
      break
    case 'thisMonth':
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      selectedDate.value = getLocalDateString(startOfMonth)
      endDate.value = getLocalDateString(now)
      break
  }

  loadData()
}

const handleDateChange = () => {
  // Auto close when date selected in mobile
}

const applyDate = () => {
  showDatePicker.value = false
  selectedPreset.value = '' // Reset preset saat pilih tanggal manual
  endDate.value = selectedDate.value
  loadData()
}

const loadData = async () => {
  loading.value = true
  try {
    // Load current bank balance
    const balances = await financeStore.getAccountBalances()
    const bankAccount = balances.find(b => b.account_code === '1-1010' || b.account_name.toLowerCase().includes('bank'))
    currentBalance.value = bankAccount?.balance || 0

    // Aggregate data dari range tanggal
    const days: string[] = []
    const start = new Date(selectedDate.value + 'T00:00:00')
    const end = new Date(endDate.value + 'T00:00:00')

    // Gunakan format tanggal lokal (bukan toISOString yang UTC) untuk menghindari
    // bug timezone WIB (UTC+7): toISOString() bisa menghasilkan tanggal kemarin
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      days.push(getLocalDateString(d))
    }

    // Fetch data untuk semua tanggal dalam range
    const summaries = await Promise.all(
      days.map(day => dailyBankService.getDailyBankSummary(day))
    )

    const transactionsList = await Promise.all(
      days.map(day => dailyBankService.getDailyBankTransactions(day))
    )

    // Aggregate summary
    summary.value = summaries.reduce((acc, s) => ({
      total_in: acc.total_in + s.total_in,
      total_out: acc.total_out + s.total_out,
      net: acc.net + s.net,
      transactions_count: acc.transactions_count + s.transactions_count,
      payments_count: acc.payments_count + s.payments_count,
    }), {
      total_in: 0,
      total_out: 0,
      net: 0,
      transactions_count: 0,
      payments_count: 0,
    })

    // Gabungkan dan sort transactions
    transactions.value = transactionsList.flat().sort(
      (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()
    )
  } catch (error) {
    console.error('Error loading daily bank:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadData()
})
</script>
