<template>
  <div class="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
    <!-- Header -->
    <div class="border-b border-gray-200 bg-gradient-to-br from-violet-50 to-white px-3.5 py-3 dark:border-gray-700 dark:from-violet-500/10 dark:to-gray-900">
      <div class="flex items-start justify-between gap-2">
        <div class="min-w-0">
          <h3 class="text-sm font-bold text-gray-900 dark:text-white">Laporan Perubahan Ekuitas</h3>
          <p class="mt-0.5 truncate text-[10px] text-gray-500 dark:text-gray-400">
            {{ formatPeriod(statement.period_start, statement.period_end) }}
          </p>
        </div>
        <div class="shrink-0 text-right">
          <p class="text-[9px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Ekuitas Akhir</p>
          <p class="text-sm font-black tabular-nums leading-tight text-violet-700 dark:text-violet-300">
            {{ formatCurrency(statement.ending_total) }}
          </p>
        </div>
      </div>
    </div>

    <div class="space-y-2 px-3.5 py-3">
      <!-- Ekuitas awal -->
      <div class="rounded-xl border border-gray-200 px-2.5 py-1 dark:border-gray-700">
        <StatementAccountList
          title="Ekuitas Awal Periode"
          :rows="statement.opening_equity_accounts"
          empty-text="Belum ada saldo ekuitas awal."
          @select="onSelect"
        />
        <div
          v-if="statement.opening_unclosed_profit !== 0"
          class="mt-1 flex items-center justify-between border-t border-dashed border-gray-200 pt-1.5 dark:border-gray-700"
        >
          <div class="min-w-0">
            <p class="truncate text-[11px] font-medium text-gray-700 dark:text-gray-300">Laba Belum Ditutup</p>
            <p class="text-[9px] text-gray-400 dark:text-gray-500">Pendapatan − Beban sebelum periode</p>
          </div>
          <p
            class="shrink-0 text-[11px] font-semibold tabular-nums"
            :class="statement.opening_unclosed_profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'"
          >
            {{ formatCurrency(statement.opening_unclosed_profit) }}
          </p>
        </div>
        <StatementTotalRow
          label="Total Ekuitas Awal"
          :amount="statement.opening_total"
          emphasize
          tone="neutral"
        />
      </div>

      <!-- Mutasi periode -->
      <div class="rounded-xl border border-gray-200 px-2.5 py-1 dark:border-gray-700">
        <p class="border-b border-gray-200 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:border-gray-700 dark:text-gray-400">
          Mutasi Periode Berjalan
        </p>

        <StatementTotalRow
          label="Laba Bersih Periode"
          :amount="statement.net_profit"
          tone="profit"
        />

        <StatementAccountList
          title="Setoran Modal / Penambahan"
          :rows="statement.contributions"
          :subtotal="statement.total_contributions"
          subtotal-label="Total Setoran"
          empty-text="Tidak ada setoran modal."
          class="mt-1"
          @select="onSelect"
        />

        <StatementAccountList
          title="Prive / Penarikan Modal"
          :rows="statement.withdrawals"
          :subtotal="statement.total_withdrawals"
          subtotal-label="Total Prive"
          empty-text="Tidak ada prive."
          negative
          class="mt-1"
          @select="onSelect"
        />
      </div>

      <!-- Ekuitas akhir -->
      <div class="rounded-xl bg-gray-50 px-2.5 py-1 dark:bg-white/[0.03]">
        <StatementTotalRow
          label="Ekuitas Akhir"
          :amount="statement.ending_total"
          emphasize
          tone="neutral"
        />
      </div>

      <!-- Rincian akun ekuitas akhir -->
      <details class="rounded-xl border border-gray-200 px-2.5 py-1 dark:border-gray-700">
        <summary class="cursor-pointer py-1 text-[10px] font-semibold text-gray-500 dark:text-gray-400">
          Rincian saldo akun ekuitas akhir
        </summary>
        <StatementAccountList
          :rows="statement.ending_equity_accounts"
          empty-text="Belum ada saldo ekuitas."
          @select="onSelect"
        />
        <div
          v-if="endingUnclosed !== 0"
          class="mt-1 flex items-center justify-between border-t border-dashed border-gray-200 pt-1.5 dark:border-gray-700"
        >
          <div class="min-w-0">
            <p class="truncate text-[11px] font-medium text-gray-700 dark:text-gray-300">Laba Belum Ditutup</p>
            <p class="text-[9px] text-gray-400 dark:text-gray-500">Belum dipindah ke akun ekuitas</p>
          </div>
          <p
            class="shrink-0 text-[11px] font-semibold tabular-nums"
            :class="endingUnclosed >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'"
          >
            {{ formatCurrency(endingUnclosed) }}
          </p>
        </div>
      </details>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import StatementAccountList from './StatementAccountList.vue'
import StatementTotalRow from './StatementTotalRow.vue'
import type { EquityStatement, StatementAccountRow } from '@/types/database'

const props = defineProps<{ statement: EquityStatement }>()

// Selisih total ekuitas akhir dengan saldo akun ekuitas = laba yang
// belum dipindahkan lewat jurnal penutup.
const endingUnclosed = computed(
  () =>
    Math.round(
      (props.statement.ending_total -
        props.statement.ending_equity_accounts.reduce((sum, row) => sum + row.amount, 0)) *
        100
    ) / 100
)

const emit = defineEmits<{ (e: 'select-account', row: StatementAccountRow): void }>()

const onSelect = (row: StatementAccountRow) => emit('select-account', row)

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value || 0)

const formatPeriod = (start: string, end: string) => {
  const fmt = (d: string) =>
    d ? new Date(d + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'
  return `${fmt(start)} – ${fmt(end)}`
}
</script>
