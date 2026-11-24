<template>
  <div
    class="flex items-center justify-between gap-2 py-1.5"
    :class="emphasize ? 'border-t border-gray-200 pt-2 dark:border-gray-700' : ''"
  >
    <span
      class="min-w-0 truncate"
      :class="emphasize
        ? 'text-[11px] font-black uppercase tracking-wide text-gray-700 dark:text-gray-200'
        : 'text-[11px] font-medium text-gray-600 dark:text-gray-400'"
    >
      {{ label }}
    </span>
    <span
      class="shrink-0 tabular-nums"
      :class="[
        emphasize ? 'text-[13px] font-black' : 'text-[11px] font-semibold',
        toneClass,
      ]"
    >
      {{ prefix }}{{ formatCurrency(Math.abs(amount)) }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    label: string
    amount: number
    /** Tebal + garis atas (untuk total utama). */
    emphasize?: boolean
    /** Warna nilai: auto (ikut tanda), profit (hijau bila positif), loss (merah bila negatif). */
    tone?: 'auto' | 'neutral' | 'profit' | 'loss'
    /** Tampilkan tanda − otomatis untuk nilai negatif. */
    signed?: boolean
  }>(),
  {
    emphasize: false,
    tone: 'auto',
    signed: true,
  }
)

const prefix = computed(() => {
  if (!props.signed) return ''
  return props.amount < 0 ? '−' : ''
})

const toneClass = computed(() => {
  if (props.tone === 'neutral') return 'text-gray-900 dark:text-white'
  if (props.tone === 'profit') {
    return props.amount >= 0
      ? 'text-emerald-600 dark:text-emerald-400'
      : 'text-red-600 dark:text-red-400'
  }
  if (props.tone === 'loss') {
    return props.amount <= 0
      ? 'text-red-600 dark:text-red-400'
      : 'text-emerald-600 dark:text-emerald-400'
  }
  return props.amount < 0
    ? 'text-red-600 dark:text-red-400'
    : 'text-gray-900 dark:text-white'
})

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value || 0)
</script>
