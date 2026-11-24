<template>
  <div class="space-y-3">
    <!-- Status keseimbangan -->
    <div
      class="rounded-2xl border px-3.5 py-2.5 shadow-sm"
      :class="statement.is_balanced
        ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10'
        : 'border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10'"
    >
      <div class="flex items-center justify-between gap-2">
        <div class="min-w-0">
          <p
            class="text-[10px] font-bold uppercase tracking-wider"
            :class="statement.is_balanced ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'"
          >
            {{ statement.is_balanced ? '✓ Posisi Keuangan Seimbang' : '⚠ Tidak Seimbang' }}
          </p>
          <p class="mt-0.5 text-[10px] text-gray-600 dark:text-gray-400">
            Per {{ formatDate(statement.as_of) }}
            <template v-if="!statement.is_balanced">
              · selisih {{ formatCurrency(Math.abs(statement.difference)) }}
            </template>
          </p>
        </div>
        <p class="shrink-0 text-xs font-black tabular-nums text-gray-900 dark:text-white">
          {{ formatCurrency(statement.total_assets) }}
        </p>
      </div>
    </div>

    <!-- ASET -->
    <div class="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div class="border-b border-gray-200 bg-gray-50 px-3.5 py-2 dark:border-gray-700 dark:bg-gray-800">
        <div class="flex items-center justify-between">
          <h3 class="text-[11px] font-bold uppercase tracking-wider text-gray-700 dark:text-gray-200">Aset</h3>
          <span class="text-[11px] font-black tabular-nums text-gray-900 dark:text-white">
            {{ formatCurrency(statement.total_assets) }}
          </span>
        </div>
      </div>
      <div class="px-3.5 py-2">
        <StatementAccountList
          :rows="statement.assets"
          empty-text="Belum ada aset."
          @select="onSelect"
        />
      </div>
      <div class="border-t border-gray-200 bg-gray-50 px-3.5 py-2 dark:border-gray-700 dark:bg-gray-800">
        <div class="flex items-center justify-between">
          <span class="text-[10px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">Total Aset</span>
          <span class="text-xs font-black tabular-nums text-gray-900 dark:text-white">{{ formatCurrency(statement.total_assets) }}</span>
        </div>
      </div>
    </div>

    <!-- KEWAJIBAN -->
    <div class="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div class="border-b border-gray-200 bg-gray-50 px-3.5 py-2 dark:border-gray-700 dark:bg-gray-800">
        <div class="flex items-center justify-between">
          <h3 class="text-[11px] font-bold uppercase tracking-wider text-gray-700 dark:text-gray-200">Liabilitas</h3>
          <span class="text-[11px] font-black tabular-nums text-gray-900 dark:text-white">
            {{ formatCurrency(statement.total_liabilities) }}
          </span>
        </div>
      </div>
      <div class="px-3.5 py-2">
        <StatementAccountList
          :rows="statement.liabilities"
          empty-text="Tidak ada liabilitas."
          @select="onSelect"
        />
      </div>
      <div class="border-t border-gray-200 bg-gray-50 px-3.5 py-2 dark:border-gray-700 dark:bg-gray-800">
        <div class="flex items-center justify-between">
          <span class="text-[10px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">Total Liabilitas</span>
          <span class="text-xs font-black tabular-nums text-gray-900 dark:text-white">{{ formatCurrency(statement.total_liabilities) }}</span>
        </div>
      </div>
    </div>

    <!-- EKUITAS -->
    <div class="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div class="border-b border-gray-200 bg-gray-50 px-3.5 py-2 dark:border-gray-700 dark:bg-gray-800">
        <div class="flex items-center justify-between">
          <h3 class="text-[11px] font-bold uppercase tracking-wider text-gray-700 dark:text-gray-200">Ekuitas</h3>
          <span class="text-[11px] font-black tabular-nums text-gray-900 dark:text-white">
            {{ formatCurrency(statement.total_equity) }}
          </span>
        </div>
      </div>
      <div class="px-3.5 py-2">
        <StatementAccountList
          :rows="statement.equity_accounts"
          empty-text="Belum ada akun ekuitas."
          @select="onSelect"
        />
        <div
          v-if="statement.unclosed_profit !== 0"
          class="mt-1 flex items-center justify-between border-t border-dashed border-gray-200 pt-1.5 dark:border-gray-700"
        >
          <div class="min-w-0">
            <p class="truncate text-[11px] font-medium text-gray-700 dark:text-gray-300">Laba Belum Ditutup</p>
            <p class="text-[9px] text-gray-400 dark:text-gray-500">Pendapatan − Beban</p>
          </div>
          <p
            class="shrink-0 text-[11px] font-semibold tabular-nums"
            :class="statement.unclosed_profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'"
          >
            {{ formatCurrency(statement.unclosed_profit) }}
          </p>
        </div>
      </div>
      <div class="border-t border-gray-200 bg-gray-50 px-3.5 py-2 dark:border-gray-700 dark:bg-gray-800">
        <div class="flex items-center justify-between">
          <span class="text-[10px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">Total Ekuitas</span>
          <span class="text-xs font-black tabular-nums text-gray-900 dark:text-white">{{ formatCurrency(statement.total_equity) }}</span>
        </div>
      </div>
    </div>

    <!-- TOTAL LIABILITAS + EKUITAS -->
    <div class="rounded-2xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white p-3.5 shadow-sm dark:border-blue-500/40 dark:from-blue-500/10 dark:to-gray-900">
      <div class="flex items-center justify-between gap-2">
        <span class="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
          Total Liabilitas + Ekuitas
        </span>
        <span class="text-base font-black tabular-nums text-blue-700 dark:text-blue-300">
          {{ formatCurrency(statement.total_liabilities_equity) }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import StatementAccountList from './StatementAccountList.vue'
import type { PositionStatement, StatementAccountRow } from '@/types/database'

defineProps<{ statement: PositionStatement }>()

const emit = defineEmits<{ (e: 'select-account', row: StatementAccountRow): void }>()

const onSelect = (row: StatementAccountRow) => emit('select-account', row)

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value || 0)

const formatDate = (d: string) =>
  d
    ? new Date(d + 'T00:00:00').toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '-'
</script>
