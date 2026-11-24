<template>
  <AdminLayout>
    <PageBreadcrumb pageTitle="Laporan Keuangan" class="hidden md:block" />

    <!-- Mobile Header -->
    <MobilePageHeader title="Laporan Keuangan" :subtitle="periodLabel">
      <template #actions>
        <button
          @click="handleShare"
          :disabled="!statements || exporting"
          class="flex h-8 w-8 items-center justify-center rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-100 disabled:opacity-40 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-white/[0.03]"
        >
          <svg v-if="!exporting" class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          <div v-else class="h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-transparent"></div>
        </button>
      </template>
    </MobilePageHeader>

    <div class="space-y-3">
      <!-- ============================================================
           Periode & preset
           ============================================================ -->
      <div class="rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div class="flex items-center justify-between gap-2">
          <div class="min-w-0">
            <p class="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Periode</p>
            <p class="truncate text-xs font-semibold text-gray-900 dark:text-white">{{ periodLabel }}</p>
          </div>
          <div class="w-[190px] shrink-0">
            <DateRangeField
              :start="periodStart"
              :end="periodEnd"
              title="Pilih Periode Laporan"
              placeholder="Pilih periode"
              button-class="flex w-full items-center justify-between gap-2 rounded-xl border border-gray-300 bg-white px-2.5 py-2 text-[11px] font-medium text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
              @update:start="onStartChange"
              @update:end="onEndChange"
            />
          </div>
        </div>

        <div class="mt-2.5 flex gap-1.5 overflow-x-auto pb-0.5">
          <button
            v-for="preset in periodPresets"
            :key="preset.key"
            @click="applyPreset(preset.key)"
            :class="[
              'shrink-0 rounded-lg border px-2.5 py-1.5 text-[10px] font-semibold transition',
              activePreset === preset.key
                ? 'border-blue-500 bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400'
                : 'border-gray-200 bg-white text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300'
            ]"
          >
            {{ preset.label }}
          </button>
        </div>

        <!-- Export (desktop) -->
        <button
          @click="handleShare"
          :disabled="!statements || exporting"
          class="mt-2.5 hidden w-full items-center justify-center gap-2 rounded-xl border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 md:flex dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.03]"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          {{ exporting ? 'Menyiapkan PDF...' : 'Cetak / Bagikan PDF' }}
        </button>
      </div>

      <!-- Loading -->
      <div v-if="loading && !statements" class="flex items-center justify-center py-16">
        <div class="text-center">
          <div class="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
          <p class="text-sm text-gray-500 dark:text-gray-400">Menyusun laporan keuangan...</p>
        </div>
      </div>

      <!-- Error -->
      <div
        v-else-if="error"
        class="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-500/30 dark:bg-red-500/10"
      >
        <p class="text-sm text-red-600 dark:text-red-400">{{ error }}</p>
        <button
          @click="fetchData"
          class="mt-2 rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 dark:border-red-500/40 dark:text-red-400 dark:hover:bg-red-500/10"
        >
          Coba Lagi
        </button>
      </div>

      <template v-else-if="statements">
        <!-- Indikator refresh -->
        <div v-if="loading" class="h-0.5 overflow-hidden rounded-full bg-blue-100 dark:bg-blue-500/20">
          <div class="h-full w-1/3 animate-pulse rounded-full bg-blue-500"></div>
        </div>

        <!-- ============================================================
             Ringkasan 4 kartu (2 kolom mobile)
             ============================================================ -->
        <div class="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div class="relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div class="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 to-blue-600"></div>
            <p class="mb-1 text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Pendapatan</p>
            <p class="mb-0.5 truncate text-lg font-black leading-none text-gray-900 dark:text-white">
              {{ formatCurrency(statements.income_statement.total_revenue) }}
            </p>
            <p class="text-[9px] text-gray-500 dark:text-gray-400">Periode berjalan</p>
          </div>

          <div class="relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div class="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-emerald-600"></div>
            <p class="mb-1 text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Laba Bersih</p>
            <p
              class="mb-0.5 truncate text-lg font-black leading-none"
              :class="statements.income_statement.net_profit >= 0 ? 'text-gray-900 dark:text-white' : 'text-red-600 dark:text-red-400'"
            >
              {{ formatCurrency(statements.income_statement.net_profit) }}
            </p>
            <p class="text-[9px] text-gray-500 dark:text-gray-400">Margin {{ statements.income_statement.profit_margin }}%</p>
          </div>

          <div class="relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div class="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-500 to-amber-600"></div>
            <p class="mb-1 text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Liabilitas</p>
            <p class="mb-0.5 truncate text-lg font-black leading-none text-gray-900 dark:text-white">
              {{ formatCurrency(statements.position_statement.total_liabilities) }}
            </p>
            <p class="text-[9px] text-gray-500 dark:text-gray-400">Posisi keuangan</p>
          </div>

          <div class="relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div class="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-violet-500 to-violet-600"></div>
            <p class="mb-1 text-[10px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">Ekuitas</p>
            <p class="mb-0.5 truncate text-lg font-black leading-none text-gray-900 dark:text-white">
              {{ formatCurrency(statements.position_statement.total_equity) }}
            </p>
            <p class="text-[9px] text-gray-500 dark:text-gray-400">Posisi keuangan</p>
          </div>
        </div>

        <!-- ============================================================
             Tab
             ============================================================ -->
        <div class="grid grid-cols-3 gap-1 rounded-xl bg-gray-100 p-1 dark:bg-gray-800">
          <button
            v-for="t in tabs"
            :key="t.key"
            @click="tab = t.key"
            :class="[
              'rounded-lg px-1.5 py-2 text-[10px] font-bold transition',
              tab === t.key
                ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-900 dark:text-white'
                : 'text-gray-500 dark:text-gray-400'
            ]"
          >
            {{ t.short }}
          </button>
        </div>

        <!-- ============================================================
             Tab: Laba Rugi
             ============================================================ -->
        <IncomeStatementCard
          v-if="tab === 'income'"
          :statement="statements.income_statement"
          @select-account="openLedger"
        />

        <!-- ============================================================
             Tab: Perubahan Ekuitas
             ============================================================ -->
        <EquityStatementCard
          v-else-if="tab === 'equity'"
          :statement="statements.equity_statement"
          @select-account="openLedger"
        />

        <!-- ============================================================
             Tab: Posisi Keuangan
             ============================================================ -->
        <PositionStatementCard
          v-else
          :statement="statements.position_statement"
          @select-account="openLedger"
        />

        <!-- Catatan metode -->
        <div class="rounded-2xl border border-gray-200 bg-white p-3.5 text-[10px] leading-relaxed text-gray-500 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
          <p class="mb-1 font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">Catatan</p>
          <p>
            Laporan disusun dari jurnal posted. Laba Rugi menghitung aktivitas pendapatan &amp; beban periode
            (jurnal penutup dikecualikan). Posisi Keuangan memakai saldo seluruh akun per akhir periode,
            dengan laba yang belum ditutup disajikan sebagai bagian ekuitas.
          </p>
        </div>
      </template>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import MobilePageHeader from '@/components/common/MobilePageHeader.vue'
import DateRangeField from '@/components/common/DateRangeField.vue'
import IncomeStatementCard from '@/components/finance/statements/IncomeStatementCard.vue'
import EquityStatementCard from '@/components/finance/statements/EquityStatementCard.vue'
import PositionStatementCard from '@/components/finance/statements/PositionStatementCard.vue'
import { useFinanceStore } from '@/stores/finance'
import { useStoreSettingsStore } from '@/stores/storeSettings'
import { useToast } from '@/composables/useToast'
import { useFinancialStatementPdf } from '@/composables/useFinancialStatementPdf'
import { localDateStr, localTodayStr } from '@/utils/date'
import type { FinancialStatements, StatementAccountRow } from '@/types/database'

const router = useRouter()
const store = useFinanceStore()
const settingsStore = useStoreSettingsStore()
const toast = useToast()
const { generatePdfBlob, sharePdf } = useFinancialStatementPdf()

type TabKey = 'income' | 'equity' | 'position'

const tabs: Array<{ key: TabKey; short: string; label: string }> = [
  { key: 'income', short: 'Laba Rugi', label: 'Laporan Laba Rugi' },
  { key: 'equity', short: 'Ekuitas', label: 'Laporan Perubahan Ekuitas' },
  { key: 'position', short: 'Posisi', label: 'Laporan Posisi Keuangan' },
]

const tab = ref<TabKey>('income')

const statements = ref<FinancialStatements | null>(null)
const loading = ref(false)
const exporting = ref(false)
const error = ref<string | null>(null)

// Periode default: bulan berjalan
const today = new Date()
const periodStart = ref(localDateStr(new Date(today.getFullYear(), today.getMonth(), 1)))
const periodEnd = ref(localTodayStr())

const periodPresets = [
  { key: 'thisMonth', label: 'Bulan Ini' },
  { key: 'lastMonth', label: 'Bulan Lalu' },
  { key: 'thisYear', label: 'Tahun Ini' },
]

const presetRange = (key: string): [string, string] | null => {
  const now = new Date()
  if (key === 'thisMonth') {
    return [localDateStr(new Date(now.getFullYear(), now.getMonth(), 1)), localTodayStr()]
  }
  if (key === 'lastMonth') {
    const first = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const last = new Date(now.getFullYear(), now.getMonth(), 0)
    return [localDateStr(first), localDateStr(last)]
  }
  if (key === 'thisYear') {
    return [localDateStr(new Date(now.getFullYear(), 0, 1)), localTodayStr()]
  }
  return null
}

const activePreset = computed(() => {
  for (const preset of periodPresets) {
    const range = presetRange(preset.key)
    if (range && range[0] === periodStart.value && range[1] === periodEnd.value) {
      return preset.key
    }
  }
  return ''
})

const applyPreset = (key: string) => {
  const range = presetRange(key)
  if (!range) return
  periodStart.value = range[0]
  periodEnd.value = range[1]
}

// DateRangeField meng-emit start lalu end; kosongkan () diabaikan agar
// laporan tidak jatuh ke periode kosong.
const onStartChange = (v: string) => {
  if (v) periodStart.value = v
}
const onEndChange = (v: string) => {
  if (v) periodEnd.value = v
}

// Re-fetch saat periode berubah. DateRangeField meng-emit start lalu end
// (dua kali), jadi debounce singkat agar hanya satu request per perubahan.
let periodTimer: ReturnType<typeof setTimeout> | null = null
watch([periodStart, periodEnd], () => {
  if (!periodStart.value || !periodEnd.value) return
  if (periodStart.value > periodEnd.value) {
    // Tukar bila terbalik
    const start = periodEnd.value
    periodEnd.value = periodStart.value
    periodStart.value = start
    return
  }
  if (periodTimer) clearTimeout(periodTimer)
  periodTimer = setTimeout(() => {
    periodTimer = null
    fetchData()
  }, 150)
})

const formatDateShort = (d: string) =>
  d
    ? new Date(d + 'T00:00:00').toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '-'

const periodLabel = computed(
  () => `${formatDateShort(periodStart.value)} – ${formatDateShort(periodEnd.value)}`
)

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value || 0)

// Anti race-condition
let fetchSeq = 0
const fetchData = async () => {
  if (!periodStart.value || !periodEnd.value) return
  const seq = ++fetchSeq
  loading.value = true
  error.value = null
  try {
    const result = await store.getFinancialStatements(periodStart.value, periodEnd.value)
    if (seq !== fetchSeq) return
    statements.value = result
  } catch (e: unknown) {
    if (seq !== fetchSeq) return
    error.value = e instanceof Error ? e.message : 'Gagal menyusun laporan keuangan.'
  } finally {
    if (seq === fetchSeq) loading.value = false
  }
}

const openLedger = (row: StatementAccountRow) => {
  router.push(`/finance/ledger?account=${row.account_id}`)
}

const handleShare = async () => {
  if (!statements.value || exporting.value) return
  exporting.value = true
  try {
    const blob = generatePdfBlob(statements.value, {
      storeName: settingsStore.storeName,
      storeAddress: settingsStore.storeAddress,
      storePhone: settingsStore.storePhone,
      periodStart: periodStart.value,
      periodEnd: periodEnd.value,
    })
    const filename = `laporan-keuangan-${periodStart.value}_${periodEnd.value}.pdf`
    await sharePdf(blob, filename)
    toast.success('Berhasil', 'Laporan keuangan siap dibagikan.')
  } catch (e: unknown) {
    console.error('Error exporting financial statements:', e)
    toast.error('Gagal', e instanceof Error ? e.message : 'Tidak dapat membuat PDF laporan keuangan.')
  } finally {
    exporting.value = false
  }
}

onMounted(async () => {
  if (!settingsStore.loaded) settingsStore.fetchSettings()
  await fetchData()
})
</script>
