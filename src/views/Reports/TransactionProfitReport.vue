<template>
  <AdminLayout hide-bottom-nav>
    <PageBreadcrumb pageTitle="Laba Per Transaksi" class="hidden md:block" />

    <div class="space-y-4 pb-8">
      <!-- Mobile Header -->
      <MobilePageHeader
        title="Laba Per Transaksi"
        :subtitle="formatDateRange(store.dateRange.start, store.dateRange.end)"
        back-to="/"
      >
        <template #actions>
          <button
            @click="showFilter = true"
            class="flex h-8 w-8 items-center justify-center rounded-xl border border-gray-300 bg-white text-gray-600 transition hover:bg-gray-50 active:scale-95 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
          </button>
        </template>
      </MobilePageHeader>

      <!-- Ringkasan Kas & Laba (Mobile) -->
      <div class="grid grid-cols-2 gap-3">
        <div class="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
          <p class="text-[10px] font-medium text-gray-500 dark:text-gray-400">Total Laba Kotor</p>
          <p class="mt-1 text-sm font-bold text-gray-900 dark:text-white">{{ formatCurrency(store.summary.gross_profit) }}</p>
          <p class="mt-0.5 text-[9px] text-gray-500 dark:text-gray-400">Margin {{ store.summary.gross_profit_margin.toFixed(1) }}%</p>
        </div>
        <div class="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
          <p class="text-[10px] font-medium text-gray-500 dark:text-gray-400">Total Kas Masuk</p>
          <p class="mt-1 text-sm font-bold text-emerald-600 dark:text-emerald-400">{{ formatCurrency(store.summary.total_cash_received) }}</p>
          <p class="mt-0.5 text-[9px] text-gray-500 dark:text-gray-400">{{ store.summary.total_transactions }} transaksi</p>
        </div>
      </div>

      <!-- Ringkasan Riil vs Tertahan -->
      <div class="space-y-2">
        <div class="flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3 dark:border-emerald-500/30 dark:bg-emerald-500/10">
          <div class="flex items-center gap-2.5">
            <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p class="text-[10px] font-medium text-emerald-700 dark:text-emerald-400">Keuntungan Riil</p>
              <p class="text-xs text-emerald-600/70 dark:text-emerald-500/60">Kas sudah masuk</p>
            </div>
          </div>
          <p class="text-sm font-bold text-emerald-700 dark:text-emerald-400">{{ formatCurrency(store.summary.realized_profit) }}</p>
        </div>

        <div class="flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50/60 p-3 dark:border-amber-500/30 dark:bg-amber-500/10">
          <div class="flex items-center gap-2.5">
            <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p class="text-[10px] font-medium text-amber-700 dark:text-amber-400">Keuntungan Tertahan</p>
              <p class="text-xs text-amber-600/70 dark:text-amber-500/60">Masih di piutang</p>
            </div>
          </div>
          <p class="text-sm font-bold text-amber-700 dark:text-amber-400">{{ formatCurrency(store.summary.unrealized_profit) }}</p>
        </div>
      </div>

      <!-- Daftar Transaksi -->
      <div v-if="store.loading" class="flex items-center justify-center py-12">
        <div class="text-center">
          <svg class="mx-auto h-10 w-10 animate-spin text-brand-500" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p class="mt-3 text-xs text-gray-500 dark:text-gray-400">Memuat laporan...</p>
        </div>
      </div>

      <div v-else-if="store.error" class="rounded-2xl border border-error-200 bg-error-50 p-6 text-center dark:border-error-500/30 dark:bg-error-500/10">
        <p class="text-xs font-medium text-error-700 dark:text-error-400">{{ store.error }}</p>
        <button
          @click="store.fetchReport()"
          class="mt-3 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-[11px] font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
        >
          Coba Lagi
        </button>
      </div>

      <div v-else-if="store.transactions.length === 0" class="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center dark:border-gray-700 dark:bg-gray-800">
        <p class="text-xs font-medium text-gray-500 dark:text-gray-400">Belum ada transaksi di periode ini</p>
      </div>

      <div v-else class="space-y-3">
        <div
          v-for="(tx, index) in store.transactions"
          :key="tx.id"
          class="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900"
        >
          <!-- Header: No Transaksi + Status -->
          <div
            class="flex items-center justify-between border-b border-gray-100 px-3.5 py-2.5 dark:border-gray-800"
            @click="goDetail(tx)"
          >
            <div class="flex items-center gap-2">
              <span class="text-xs font-bold text-brand-600 dark:text-brand-400">{{ tx.transaction_number }}</span>
              <span
                :class="[
                  'rounded-full px-2 py-0.5 text-[9px] font-medium',
                  tx.payment_status === 'lunas'
                    ? 'bg-success-100 text-success-700 dark:bg-success-900 dark:text-success-400'
                    : 'bg-warning-100 text-warning-700 dark:bg-warning-900 dark:text-warning-400'
                ]"
              >
                {{ tx.payment_status === 'lunas' ? 'LUNAS' : 'TEMPO' }}
              </span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-[10px] text-gray-400 dark:text-gray-500">{{ formatTime(tx.created_at) }}</span>
              <svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>

          <!-- Body -->
          <div class="space-y-2.5 px-3.5 py-3">
            <div class="flex items-center justify-between">
              <p class="text-xs font-medium text-gray-700 dark:text-gray-300">{{ tx.customer_name || 'Tanpa Customer' }}</p>
              <p class="text-sm font-bold text-gray-900 dark:text-white">{{ formatCurrency(tx.transaction_profit) }}</p>
            </div>

            <!-- Laba Riil & Tertahan per Transaksi -->
            <div class="grid grid-cols-2 gap-2">
              <div class="rounded-xl border border-emerald-200 bg-emerald-50/60 p-2 dark:border-emerald-500/30 dark:bg-emerald-500/10">
                <p class="text-[9px] font-medium text-emerald-700 dark:text-emerald-400">Laba Riil</p>
                <p class="mt-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">{{ formatCurrency(tx.realized_profit) }}</p>
                <p class="text-[9px] text-emerald-600/60 dark:text-emerald-500/60">Kas: {{ formatCurrency(tx.cash_received) }}</p>
              </div>
              <div class="rounded-xl border border-amber-200 bg-amber-50/60 p-2 dark:border-amber-500/30 dark:bg-amber-500/10">
                <p class="text-[9px] font-medium text-amber-700 dark:text-amber-400">Laba Tertahan</p>
                <p class="mt-0.5 text-xs font-bold text-amber-700 dark:text-amber-400">{{ formatCurrency(tx.unrealized_profit) }}</p>
                <p class="text-[9px] text-amber-600/60 dark:text-amber-500/60">Piutang: {{ formatCurrency(tx.receivable) }}</p>
              </div>
            </div>

            <!-- Tombol lihat detail -->
            <button
              @click.stop="goDetail(tx)"
              class="flex w-full items-center justify-center gap-1 rounded-xl border border-brand-200 bg-brand-500/5 py-2 text-xs font-semibold text-brand-600 transition active:scale-[0.98] dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-400"
            >
              <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Lihat Detail Laba
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Filter Modal (Mobile) -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="showFilter"
          class="fixed inset-0 z-50 flex items-end justify-center bg-black/50 md:hidden"
          @click.self="showFilter = false"
        >
          <div class="w-full max-w-lg rounded-t-3xl bg-white p-6 dark:bg-gray-900">
            <div class="mb-4 flex items-center justify-between">
              <h3 class="text-lg font-bold text-gray-900 dark:text-white">Filter Periode</h3>
              <button
                @click="showFilter = false"
                class="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
              >
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div class="space-y-4">
              <!-- Preset -->
              <div>
                <label class="mb-2 block text-xs font-medium text-gray-700 dark:text-gray-300">Pilih Periode Cepat</label>
                <select
                  v-model="activePreset"
                  @change="applyPreset(activePreset)"
                  class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                >
                  <option value="">Custom...</option>
                  <option v-for="preset in presets" :key="preset.value" :value="preset.value">
                    {{ preset.label }}
                  </option>
                </select>
              </div>

              <!-- Custom Date -->
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="mb-2 block text-xs font-medium text-gray-700 dark:text-gray-300">Dari Tanggal</label>
                  <input
                    v-model="tempStart"
                    type="date"
                    class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>
                <div>
                  <label class="mb-2 block text-xs font-medium text-gray-700 dark:text-gray-300">Sampai Tanggal</label>
                  <input
                    v-model="tempEnd"
                    type="date"
                    class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>
              </div>

              <!-- Status Pembayaran -->
              <div>
                <label class="mb-2 block text-xs font-medium text-gray-700 dark:text-gray-300">Status Pembayaran</label>
                <div class="grid grid-cols-3 gap-2">
                  <button
                    v-for="opt in statusOptions"
                    :key="opt.value"
                    @click="tempStatus = opt.value as 'lunas' | 'belum_lunas' | 'all'"
                    :class="[
                      'rounded-lg border px-2 py-2 text-xs font-medium transition',
                      tempStatus === opt.value
                        ? 'border-brand-500 bg-brand-500 text-white'
                        : 'border-gray-300 bg-white text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300'
                    ]"
                  >
                    {{ opt.label }}
                  </button>
                </div>
              </div>

              <!-- Apply -->
              <button
                @click="applyFilter"
                class="w-full rounded-xl bg-brand-600 py-3 text-sm font-bold text-white shadow-lg transition active:scale-[0.98]"
              >
                Terapkan Filter
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import MobilePageHeader from '@/components/common/MobilePageHeader.vue'
import { useSalesReportEnhancedStore } from '@/stores/salesReportEnhanced'

const router = useRouter()
const store = useSalesReportEnhancedStore()

const showFilter = ref(false)
const activePreset = ref('')
const tempStart = ref('')
const tempEnd = ref('')
const tempStatus = ref<'lunas' | 'belum_lunas' | 'all'>('all')

const presets = [
  { label: 'Hari Ini', value: 'today' },
  { label: '7 Hari Terakhir', value: '7days' },
  { label: '30 Hari Terakhir', value: '30days' },
  { label: 'Bulan Ini', value: 'thisMonth' },
  { label: 'Bulan Lalu', value: 'lastMonth' },
]

const statusOptions = [
  { label: 'Semua', value: 'all' },
  { label: 'Lunas', value: 'lunas' },
  { label: 'Tempo', value: 'belum_lunas' },
]

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value || 0)

const formatTime = (dateStr: string) => {
  const d = new Date(dateStr)
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}

const goDetail = (tx: { id: string }) => {
  router.push(`/reports/transaction-profit/${tx.id}`)
}

const formatDateRange = (start: string, end: string) => {
  const fmt = (s: string) => new Date(s).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
  return start === end ? fmt(start) : `${fmt(start)} - ${fmt(end)}`
}

const applyPreset = (preset: string) => {
  const now = new Date()
  const today = now.toISOString().split('T')[0]
  let start = today
  let end = today

  switch (preset) {
    case '7days': {
      const d = new Date(now); d.setDate(d.getDate() - 6); start = d.toISOString().split('T')[0]; break
    }
    case '30days': {
      const d = new Date(now); d.setDate(d.getDate() - 29); start = d.toISOString().split('T')[0]; break
    }
    case 'thisMonth': {
      start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]; break
    }
    case 'lastMonth': {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0]
      end = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0]
      break
    }
  }

  tempStart.value = start
  tempEnd.value = end
  store.setDateRange(start, end)
  store.fetchReport()
  activePreset.value = preset
}

const applyFilter = () => {
  store.setDateRange(tempStart.value || store.dateRange.start, tempEnd.value || store.dateRange.end)
  store.setPaymentStatusFilter(tempStatus.value)
  store.fetchReport()
  showFilter.value = false
}

onMounted(() => {
  // Set default periode ke bulan ini
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const today = now.toISOString().split('T')[0]

  store.setDateRange(startOfMonth, today)
  tempStart.value = startOfMonth
  tempEnd.value = today
  activePreset.value = 'thisMonth'

  store.fetchReport()
})
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: transform 0.3s ease, opacity 0.3s ease;
}
.modal-enter-from,
.modal-leave-to {
  transform: translateY(100%);
  opacity: 0;
}
</style>
