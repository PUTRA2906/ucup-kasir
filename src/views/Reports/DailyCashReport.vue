<template>
  <AdminLayout>
    <PageBreadcrumb pageTitle="Mutasi Kas Hari Ini" class="hidden md:block" />

    <!-- Mobile Header -->
    <MobilePageHeader title="Mutasi Kas" :subtitle="formatDate(selectedDate)">
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

      <!-- Loading -->
      <div v-if="loading" class="flex items-center justify-center py-20">
        <div class="text-center">
          <div class="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
          <p class="text-sm text-gray-500 dark:text-gray-400">Memuat mutasi kas...</p>
        </div>
      </div>

      <template v-else>
        <!-- Summary Cards -->
        <div class="grid grid-cols-2 gap-3">
          <!-- Uang Masuk -->
          <div class="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-4 shadow-sm dark:border-emerald-500/30 dark:from-emerald-500/10 dark:to-gray-900">
            <div class="mb-2 flex items-center gap-2">
              <div class="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20">
                <svg class="h-4 w-4 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 11l5-5m0 0l5 5m-5-5v12" />
                </svg>
              </div>
              <span class="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Uang Masuk</span>
            </div>
            <p class="text-xl font-black text-gray-900 dark:text-white">{{ formatCurrency(summary.total_in) }}</p>
            <p class="mt-1 text-[10px] text-emerald-600 dark:text-emerald-400">
              {{ summary.transactions_count + summary.payments_count }} transaksi
            </p>
          </div>

          <!-- Uang Keluar -->
          <div class="rounded-2xl border border-red-200 bg-gradient-to-br from-red-50 to-white p-4 shadow-sm dark:border-red-500/30 dark:from-red-500/10 dark:to-gray-900">
            <div class="mb-2 flex items-center gap-2">
              <div class="flex h-7 w-7 items-center justify-center rounded-lg bg-red-500/20">
                <svg class="h-4 w-4 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 13l5 5m0 0l5-5m-5 5V6" />
                </svg>
              </div>
              <span class="text-[10px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400">Uang Keluar</span>
            </div>
            <p class="text-xl font-black text-gray-900 dark:text-white">{{ formatCurrency(summary.total_out) }}</p>
            <p class="mt-1 text-[10px] text-red-600 dark:text-red-400">Pengeluaran</p>
          </div>
        </div>

        <!-- Net Balance -->
        <div class="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-4 shadow-sm dark:border-blue-500/30 dark:from-blue-500/10 dark:to-gray-900">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs font-medium text-blue-600 dark:text-blue-400">Selisih Bersih</p>
              <p class="mt-1 text-2xl font-black" :class="summary.net >= 0 ? 'text-gray-900 dark:text-white' : 'text-red-600 dark:text-red-400'">
                {{ formatCurrency(summary.net) }}
              </p>
            </div>
            <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/20">
              <svg class="h-6 w-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <!-- Breakdown Tunai vs Transfer -->
        <div class="grid grid-cols-2 gap-3">
          <div class="rounded-2xl border border-gray-200 bg-white p-3.5 dark:border-gray-800 dark:bg-gray-900">
            <p class="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">💵 Tunai</p>
            <p class="mt-2 text-sm font-bold text-emerald-600 dark:text-emerald-400">+{{ formatCurrency(summary.tunai_in) }}</p>
            <p class="text-sm font-bold text-red-600 dark:text-red-400">-{{ formatCurrency(summary.tunai_out) }}</p>
          </div>
          <div class="rounded-2xl border border-gray-200 bg-white p-3.5 dark:border-gray-800 dark:bg-gray-900">
            <p class="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">🏦 Transfer</p>
            <p class="mt-2 text-sm font-bold text-emerald-600 dark:text-emerald-400">+{{ formatCurrency(summary.transfer_in) }}</p>
            <p class="text-sm font-bold text-red-600 dark:text-red-400">-{{ formatCurrency(summary.transfer_out) }}</p>
          </div>
        </div>

        <!-- List Transaksi -->
        <div class="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div class="border-b border-gray-200 p-4 dark:border-gray-800">
            <h3 class="text-sm font-bold text-gray-900 dark:text-white">Rincian Transaksi</h3>
          </div>

          <div v-if="transactions.length === 0" class="p-6 text-center">
            <p class="text-sm text-gray-500 dark:text-gray-400">Belum ada transaksi hari ini</p>
          </div>

          <div v-else class="divide-y divide-gray-200 dark:divide-gray-800">
            <div
              v-for="(trx, i) in transactions"
              :key="i"
              class="flex items-center gap-3 p-4 transition hover:bg-gray-50 dark:hover:bg-white/[0.02]"
            >
              <!-- Icon -->
              <div
                class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
                :class="trx.is_in
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'bg-red-500/10 text-red-600 dark:text-red-400'"
              >
                <svg v-if="trx.is_in" class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 11l5-5m0 0l5 5m-5-5v12" />
                </svg>
                <svg v-else class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 13l5 5m0 0l5-5m-5 5V6" />
                </svg>
              </div>

              <!-- Info -->
              <div class="flex-1 min-w-0">
                <p class="truncate text-sm font-medium text-gray-900 dark:text-white">
                  {{ trx.customer_name || trx.description }}
                </p>
                <div class="mt-0.5 flex items-center gap-2">
                  <span class="text-xs text-gray-500 dark:text-gray-400">{{ formatTime(trx.time) }}</span>
                  <span class="text-xs text-gray-400 dark:text-gray-500">•</span>
                  <span
                    class="rounded-lg px-2 py-0.5 text-[10px] font-bold"
                    :class="trx.method === 'tunai'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
                      : 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400'"
                  >
                    {{ trx.method === 'tunai' ? '💵 Tunai' : '🏦 Transfer' }}
                  </span>
                </div>
                <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{{ trx.reference }}</p>
              </div>

              <!-- Amount -->
              <div class="text-right">
                <p
                  class="text-sm font-bold"
                  :class="trx.is_in
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-red-600 dark:text-red-400'"
                >
                  {{ trx.is_in ? '+' : '-' }}{{ formatCurrency(trx.amount) }}
                </p>
                <p class="text-xs text-gray-500 dark:text-gray-400">
                  {{ getTypeLabel(trx.type) }}
                </p>
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
import { dailyCashService } from '@/services/dailyCash'
import type { CashTransaction, DailyCashSummary } from '@/services/dailyCash'

const loading = ref(true)
const showDatePicker = ref(false)
const selectedDate = ref(new Date().toISOString().split('T')[0])
const endDate = ref(new Date().toISOString().split('T')[0])
const selectedPreset = ref('today')

const presets = [
  { label: 'Hari Ini', value: 'today' },
  { label: 'Kemarin', value: 'yesterday' },
  { label: 'Minggu Ini', value: 'thisWeek' },
  { label: 'Bulan Ini', value: 'thisMonth' },
]

const summary = ref<DailyCashSummary>({
  total_in: 0,
  total_out: 0,
  net: 0,
  tunai_in: 0,
  tunai_out: 0,
  transfer_in: 0,
  transfer_out: 0,
  transactions_count: 0,
  payments_count: 0
})
const transactions = ref<CashTransaction[]>([])

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

const formatTime = (dateStr: string) => {
  const date = new Date(dateStr)
  return new Intl.DateTimeFormat('id-ID', {
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
      selectedDate.value = now.toISOString().split('T')[0]
      endDate.value = now.toISOString().split('T')[0]
      break
    case 'yesterday':
      const yesterday = new Date(now)
      yesterday.setDate(yesterday.getDate() - 1)
      selectedDate.value = yesterday.toISOString().split('T')[0]
      endDate.value = yesterday.toISOString().split('T')[0]
      break
    case 'thisWeek':
      // Mulai dari Senin minggu ini
      const startOfWeek = new Date(now)
      const day = startOfWeek.getDay()
      const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1)
      startOfWeek.setDate(diff)
      selectedDate.value = startOfWeek.toISOString().split('T')[0]
      endDate.value = now.toISOString().split('T')[0]
      break
    case 'thisMonth':
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      selectedDate.value = startOfMonth.toISOString().split('T')[0]
      endDate.value = now.toISOString().split('T')[0]
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
    // Aggregate data dari range tanggal
    const days = []
    const start = new Date(selectedDate.value)
    const end = new Date(endDate.value)

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      days.push(d.toISOString().split('T')[0])
    }

    // Fetch data untuk semua tanggal dalam range
    const summaries = await Promise.all(
      days.map(day => dailyCashService.getDailyCashSummary(day))
    )

    const transactionsList = await Promise.all(
      days.map(day => dailyCashService.getDailyCashTransactions(day))
    )

    // Aggregate summary
    summary.value = summaries.reduce((acc, s) => ({
      total_in: acc.total_in + s.total_in,
      total_out: acc.total_out + s.total_out,
      net: acc.net + s.net,
      tunai_in: acc.tunai_in + s.tunai_in,
      tunai_out: acc.tunai_out + s.tunai_out,
      transfer_in: acc.transfer_in + s.transfer_in,
      transfer_out: acc.transfer_out + s.transfer_out,
      transactions_count: acc.transactions_count + s.transactions_count,
      payments_count: acc.payments_count + s.payments_count,
    }), {
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

    // Gabungkan dan sort transactions
    transactions.value = transactionsList.flat().sort(
      (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()
    )
  } catch (error) {
    console.error('Error loading daily cash:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadData()
})
</script>
