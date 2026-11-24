<template>
  <div class="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
    <!-- Header -->
    <div class="border-b border-gray-200 bg-gradient-to-br from-blue-50 to-white px-3.5 py-3 dark:border-gray-700 dark:from-blue-500/10 dark:to-gray-900">
      <div class="flex items-start justify-between gap-2">
        <div class="min-w-0">
          <h3 class="text-sm font-bold text-gray-900 dark:text-white">Laporan Laba Rugi</h3>
          <p class="mt-0.5 truncate text-[10px] text-gray-500 dark:text-gray-400">
            {{ formatPeriod(statement.period_start, statement.period_end) }}
          </p>
        </div>
        <div class="shrink-0 text-right">
          <p class="text-[9px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Laba Bersih</p>
          <p
            class="text-sm font-black tabular-nums leading-tight"
            :class="statement.net_profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'"
          >
            {{ formatCurrency(statement.net_profit) }}
          </p>
          <p class="text-[9px] text-gray-500 dark:text-gray-400">Margin {{ statement.profit_margin }}%</p>
        </div>
      </div>
    </div>

    <div class="space-y-3 px-3.5 py-3">
      <!-- Pendapatan -->
      <StatementAccountList
        title="Pendapatan"
        :rows="statement.revenue"
        :total="statement.total_revenue"
        empty-text="Belum ada pendapatan pada periode ini."
        @select="onSelect"
      />

      <!-- HPP -->
      <StatementAccountList
        title="Harga Pokok Penjualan"
        :rows="statement.cogs"
        :total="statement.total_cogs"
        empty-text="Belum ada HPP."
        negative
        @select="onSelect"
      />

      <StatementTotalRow
        label="Laba Kotor"
        :amount="statement.gross_profit"
        tone="profit"
      />

      <!-- Beban operasional -->
      <StatementAccountList
        title="Beban Operasional"
        :rows="statement.operating_expenses"
        :total="statement.total_operating_expenses"
        empty-text="Belum ada beban operasional."
        negative
        @select="onSelect"
      />

      <div class="rounded-xl bg-gray-50 px-2.5 py-1 dark:bg-white/[0.03]">
        <StatementTotalRow
          label="Laba Bersih"
          :amount="statement.net_profit"
          emphasize
          tone="profit"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import StatementAccountList from './StatementAccountList.vue'
import StatementTotalRow from './StatementTotalRow.vue'
import type { IncomeStatement, StatementAccountRow } from '@/types/database'

defineProps<{ statement: IncomeStatement }>()

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
