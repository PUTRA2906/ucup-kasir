<template>
  <div>
    <!-- Section header -->
    <div v-if="title" class="flex items-center justify-between border-b border-gray-200 pb-1.5 dark:border-gray-700">
      <h4 class="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
        {{ title }}
      </h4>
      <span v-if="total !== null" class="text-[11px] font-bold tabular-nums text-gray-900 dark:text-white">
        {{ formatCurrency(total) }}
      </span>
    </div>

    <!-- Empty -->
    <p v-if="rows.length === 0" class="py-2 text-[11px] italic text-gray-400 dark:text-gray-500">
      {{ emptyText }}
    </p>

    <!-- Rows -->
    <div v-else class="divide-y divide-gray-100 dark:divide-gray-800">
      <component
        :is="clickable ? 'button' : 'div'"
        v-for="row in rows"
        :key="row.account_id"
        :type="clickable ? 'button' : undefined"
        class="flex w-full items-center justify-between gap-2 py-1.5 text-left"
        :class="clickable ? 'transition hover:bg-gray-50 active:scale-[0.99] dark:hover:bg-white/[0.03]' : ''"
        @click="clickable && $emit('select', row)"
      >
        <div class="min-w-0">
          <p class="truncate text-[11px] font-medium text-gray-800 dark:text-gray-200">
            {{ row.account_name }}
          </p>
          <p class="font-mono text-[9px] text-gray-400 dark:text-gray-500">{{ row.account_code }}</p>
        </div>
        <p
          class="shrink-0 text-[11px] font-semibold tabular-nums"
          :class="negative ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'"
        >
          {{ negative ? '−' : '' }}{{ formatCurrency(Math.abs(row.amount)) }}
        </p>
      </component>
    </div>

    <!-- Subtotal -->
    <div
      v-if="subtotal !== null && rows.length > 0"
      class="mt-1 flex items-center justify-between border-t border-gray-200 pt-1.5 dark:border-gray-700"
    >
      <span class="text-[10px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {{ subtotalLabel }}
      </span>
      <span class="text-[11px] font-black tabular-nums text-gray-900 dark:text-white">
        {{ formatCurrency(subtotal) }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { StatementAccountRow } from '@/types/database'

withDefaults(
  defineProps<{
    title?: string
    rows: StatementAccountRow[]
    /** Total ditampilkan di kanan header (mis. total kelompok). */
    total?: number | null
    /** Subtotal di bawah baris. */
    subtotal?: number | null
    subtotalLabel?: string
    emptyText?: string
    /** Baris bisa diklik (menuju buku besar). */
    clickable?: boolean
    /** Tampilkan nilai sebagai pengurang (merah, tanda −). */
    negative?: boolean
  }>(),
  {
    title: '',
    total: null,
    subtotal: null,
    subtotalLabel: 'Subtotal',
    emptyText: 'Tidak ada data.',
    clickable: true,
    negative: false,
  }
)

defineEmits<{ (e: 'select', row: StatementAccountRow): void }>()

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value || 0)
</script>
