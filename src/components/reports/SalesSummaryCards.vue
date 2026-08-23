<template>
  <!-- Mobile View - 2 Columns -->
  <div class="md:hidden">
    <div class="mb-2 flex items-center justify-between px-1">
      <span class="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
        Ringkasan Keuangan
      </span>
      <button
        type="button"
        class="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 active:scale-95 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-300"
        @click.stop="toggleFinancialVisibility"
      >
        <svg
          v-if="financialHidden"
          class="h-3.5 w-3.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
          />
        </svg>
        <svg
          v-else
          class="h-3.5 w-3.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
          />
        </svg>
        {{ financialHidden ? 'Tampilkan' : 'Sembunyikan' }}
      </button>
    </div>

    <div class="grid grid-cols-2 gap-3">
      <!-- Total Penjualan -->
      <div class="relative rounded-2xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <div class="flex items-center gap-2 mb-2">
          <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/10 text-brand-500">
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <button
            @click.stop="activeInfoTooltip = activeInfoTooltip === 'penjualan' ? null : 'penjualan'"
            class="ml-auto flex h-5 w-5 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
          >
            <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        </div>
        <p class="text-[10px] font-medium text-gray-500 dark:text-gray-400">Total Penjualan</p>
        <p class="mt-1 text-sm font-bold text-gray-900 dark:text-white">
          {{ financialHidden ? 'Rp ××××××' : formatCurrency(summary.net_sales) }}
        </p>
        <!-- Tooltip Info -->
        <div
          v-if="activeInfoTooltip === 'penjualan'"
          class="absolute left-0 right-0 top-full z-10 mt-1 rounded-lg border border-gray-200 bg-white p-2 shadow-lg dark:border-gray-700 dark:bg-gray-800"
        >
          <p class="text-[10px] leading-relaxed text-gray-600 dark:text-gray-400">
            Penjualan bersih setelah dikurangi diskon dan retur. Ini adalah omzet riil yang Anda terima.
          </p>
        </div>
      </div>

      <!-- Jumlah Transaksi -->
      <div class="relative rounded-2xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <div class="flex items-center gap-2 mb-2">
          <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-success-500/10 text-success-500">
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <button
            @click.stop="activeInfoTooltip = activeInfoTooltip === 'transaksi' ? null : 'transaksi'"
            class="ml-auto flex h-5 w-5 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
          >
            <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        </div>
        <p class="text-[10px] font-medium text-gray-500 dark:text-gray-400">Jumlah Transaksi</p>
        <p class="mt-1 text-sm font-bold text-gray-900 dark:text-white">
          {{ summary.totalTransactions }}
        </p>
        <!-- Tooltip Info -->
        <div
          v-if="activeInfoTooltip === 'transaksi'"
          class="absolute left-0 right-0 top-full z-10 mt-1 rounded-lg border border-gray-200 bg-white p-2 shadow-lg dark:border-gray-700 dark:bg-gray-800"
        >
          <p class="text-[10px] leading-relaxed text-gray-600 dark:text-gray-400">
            Total transaksi penjualan yang tercatat dalam periode ini.
          </p>
        </div>
      </div>

      <!-- Modal (HPP) -->
      <div class="relative rounded-2xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <div class="flex items-center gap-2 mb-2">
          <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-500">
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <button
            @click.stop="activeInfoTooltip = activeInfoTooltip === 'modal' ? null : 'modal'"
            class="ml-auto flex h-5 w-5 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
          >
            <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        </div>
        <p class="text-[10px] font-medium text-gray-500 dark:text-gray-400">Modal (HPP)</p>
        <p class="mt-1 text-sm font-bold text-gray-900 dark:text-white">
          {{ financialHidden ? 'Rp ××××××' : formatCurrency(summary.net_cogs) }}
        </p>
        <!-- Tooltip Info -->
        <div
          v-if="activeInfoTooltip === 'modal'"
          class="absolute left-0 right-0 top-full z-10 mt-1 rounded-lg border border-gray-200 bg-white p-2 shadow-lg dark:border-gray-700 dark:bg-gray-800"
        >
          <p class="text-[10px] leading-relaxed text-gray-600 dark:text-gray-400">
            Harga Pokok Penjualan (HPP) atau modal yang dikeluarkan untuk barang yang terjual, sudah dikurangi retur.
          </p>
        </div>
      </div>

      <!-- Laba Kotor -->
      <div class="relative rounded-2xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <div class="flex items-center gap-2 mb-2">
          <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-warning-500/10 text-warning-500">
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <button
            @click.stop="activeInfoTooltip = activeInfoTooltip === 'laba_kotor' ? null : 'laba_kotor'"
            class="ml-auto flex h-5 w-5 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
          >
            <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        </div>
        <p class="text-[10px] font-medium text-gray-500 dark:text-gray-400">Laba Kotor</p>
        <p class="mt-1 text-sm font-bold text-gray-900 dark:text-white">
          {{ financialHidden ? 'Rp ××××××' : formatCurrency(summary.gross_profit) }}
        </p>
        <p class="mt-1 text-[9px] text-gray-500 dark:text-gray-400">
          Margin: {{ ((summary.gross_profit / summary.net_sales) * 100).toFixed(1) }}%
        </p>
        <!-- Tooltip Info -->
        <div
          v-if="activeInfoTooltip === 'laba_kotor'"
          class="absolute left-0 right-0 top-full z-10 mt-1 rounded-lg border border-gray-200 bg-white p-2 shadow-lg dark:border-gray-700 dark:bg-gray-800"
        >
          <p class="text-[10px] leading-relaxed text-gray-600 dark:text-gray-400">
            Penjualan bersih dikurangi HPP. Belum memperhitungkan status pembayaran (kas/piutang).
          </p>
        </div>
      </div>

      <!-- Keuntungan Riil (Laba Terealisasi) -->
      <div class="relative rounded-2xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <div class="flex items-center gap-2 mb-2">
          <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <button
            @click.stop="activeInfoTooltip = activeInfoTooltip === 'riil' ? null : 'riil'"
            class="ml-auto flex h-5 w-5 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
          >
            <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        </div>
        <p class="text-[10px] font-medium text-gray-500 dark:text-gray-400">Keuntungan Riil</p>
        <p class="mt-1 text-sm font-bold text-gray-900 dark:text-white">
          {{ financialHidden ? 'Rp ××××××' : formatCurrency(summary.realized_profit || 0) }}
        </p>
        <p class="mt-1 text-[9px] text-emerald-600 dark:text-emerald-400">
          {{ ((summary.realized_profit || 0) / (summary.gross_profit || 1) * 100).toFixed(0) }}% kas
        </p>
        <!-- Tooltip Info -->
        <div
          v-if="activeInfoTooltip === 'riil'"
          class="absolute left-0 right-0 top-full z-10 mt-1 rounded-lg border border-gray-200 bg-white p-2 shadow-lg dark:border-gray-700 dark:bg-gray-800"
        >
          <p class="text-[10px] leading-relaxed text-gray-600 dark:text-gray-400">
            Laba dari transaksi yang sudah dibayar lunas. Uangnya sudah masuk ke kas Anda.
          </p>
        </div>
      </div>

      <!-- Keuntungan Tertahan (Laba di Piutang) -->
      <div class="relative rounded-2xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <div class="flex items-center gap-2 mb-2">
          <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <button
            @click.stop="activeInfoTooltip = activeInfoTooltip === 'tertahan' ? null : 'tertahan'"
            class="ml-auto flex h-5 w-5 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
          >
            <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        </div>
        <p class="text-[10px] font-medium text-gray-500 dark:text-gray-400">Keuntungan Tertahan</p>
        <p class="mt-1 text-sm font-bold text-gray-900 dark:text-white">
          {{ financialHidden ? 'Rp ××××××' : formatCurrency(summary.unrealized_profit || 0) }}
        </p>
        <p class="mt-1 text-[9px] text-amber-600 dark:text-amber-400">
          {{ ((summary.unrealized_profit || 0) / (summary.gross_profit || 1) * 100).toFixed(0) }}% piutang
        </p>
        <!-- Tooltip Info -->
        <div
          v-if="activeInfoTooltip === 'tertahan'"
          class="absolute left-0 right-0 top-full z-10 mt-1 rounded-lg border border-gray-200 bg-white p-2 shadow-lg dark:border-gray-700 dark:bg-gray-800"
        >
          <p class="text-[10px] leading-relaxed text-gray-600 dark:text-gray-400">
            Laba dari transaksi tempo/bayar nanti yang belum diterima. Keuntungan ini masih tertahan di piutang.
          </p>
        </div>
      </div>

      <!-- Kas Masuk (Baru) -->
      <div class="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <div class="flex items-center gap-2 mb-2">
          <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
        <p class="text-[10px] font-medium text-gray-500 dark:text-gray-400">Kas Masuk</p>
        <p class="mt-1 text-sm font-bold text-gray-900 dark:text-white">
          {{ financialHidden ? 'Rp ××××××' : formatCurrency(summary.total_cash_received || 0) }}
        </p>
        <p class="mt-1 text-[9px] text-emerald-600 dark:text-emerald-400">
          {{ summary.lunas_count || 0 }} lunas
        </p>
      </div>

      <!-- Piutang (Baru) -->
      <div class="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <div class="flex items-center gap-2 mb-2">
          <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
        <p class="text-[10px] font-medium text-gray-500 dark:text-gray-400">Piutang</p>
        <p class="mt-1 text-sm font-bold text-gray-900 dark:text-white">
          {{ financialHidden ? 'Rp ××××××' : formatCurrency(summary.total_receivables || 0) }}
        </p>
        <p class="mt-1 text-[9px] text-amber-600 dark:text-amber-400">
          {{ summary.tempo_count || 0 }} tempo
        </p>
      </div>
    </div>
  </div>

  <!-- Desktop View -->
  <div class="hidden md:grid grid-cols-2 gap-6 lg:grid-cols-3">
    <!-- Card 1: Total Penjualan (Penjualan Bersih) -->
    <div class="rounded-2xl border border-gray-200 bg-white overflow-hidden dark:border-gray-800 dark:bg-white/[0.03]">
      <div class="p-6">
        <p class="text-sm text-gray-600 dark:text-gray-400">Total Penjualan</p>
        <p class="mt-2 text-2xl font-bold text-gray-900 dark:text-white truncate">
          {{ formatCurrency(summary.net_sales) }}
        </p>
      </div>
      <div class="h-1 bg-brand-500"></div>
    </div>

    <!-- Card 2: Jumlah Transaksi -->
    <div class="rounded-2xl border border-gray-200 bg-white overflow-hidden dark:border-gray-800 dark:bg-white/[0.03]">
      <div class="p-6">
        <p class="text-sm text-gray-600 dark:text-gray-400">Jumlah Transaksi</p>
        <p class="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{{ summary.totalTransactions }}</p>
      </div>
      <div class="h-1 bg-success-500"></div>
    </div>

    <!-- Card 3: Modal (HPP Bersih) -->
    <div class="rounded-2xl border border-gray-200 bg-white overflow-hidden dark:border-gray-800 dark:bg-white/[0.03]">
      <div class="p-6">
        <p class="text-sm text-gray-600 dark:text-gray-400">Modal</p>
        <p class="mt-2 text-2xl font-bold text-gray-900 dark:text-white truncate">
          {{ formatCurrency(summary.net_cogs) }}
        </p>
      </div>
      <div class="h-1 bg-violet-500"></div>
    </div>

    <!-- Card 4: Laba Kotor -->
    <div class="rounded-2xl border border-gray-200 bg-white overflow-hidden dark:border-gray-800 dark:bg-white/[0.03]">
      <div class="p-6">
        <p class="text-sm text-gray-600 dark:text-gray-400">Laba Kotor</p>
        <p class="mt-2 text-2xl font-bold text-gray-900 dark:text-white truncate">
          {{ formatCurrency(summary.gross_profit) }}
        </p>
        <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Margin: {{ ((summary.gross_profit / summary.net_sales) * 100).toFixed(1) }}%
        </p>
      </div>
      <div class="h-1 bg-warning-500"></div>
    </div>

    <!-- Card 5: Kas Masuk (Baru) -->
    <div class="rounded-2xl border border-gray-200 bg-white overflow-hidden dark:border-gray-800 dark:bg-white/[0.03]">
      <div class="p-6">
        <p class="text-sm text-gray-600 dark:text-gray-400">Kas Masuk</p>
        <p class="mt-2 text-2xl font-bold text-gray-900 dark:text-white truncate">
          {{ formatCurrency(summary.total_cash_received || 0) }}
        </p>
        <p class="mt-1 text-xs text-emerald-600 dark:text-emerald-400">
          {{ summary.lunas_count || 0 }} transaksi lunas
        </p>
      </div>
      <div class="h-1 bg-emerald-500"></div>
    </div>

    <!-- Card 6: Piutang (Baru) -->
    <div class="rounded-2xl border border-gray-200 bg-white overflow-hidden dark:border-gray-800 dark:bg-white/[0.03]">
      <div class="p-6">
        <p class="text-sm text-gray-600 dark:text-gray-400">Piutang</p>
        <p class="mt-2 text-2xl font-bold text-gray-900 dark:text-white truncate">
          {{ formatCurrency(summary.total_receivables || 0) }}
        </p>
        <p class="mt-1 text-xs text-amber-600 dark:text-amber-400">
          {{ summary.tempo_count || 0 }} transaksi tempo
        </p>
      </div>
      <div class="h-1 bg-amber-500"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { SalesSummary } from '@/services/salesReport'

interface Props {
  summary: SalesSummary
}

const props = defineProps<Props>()

const financialHidden = ref(localStorage.getItem('report_financial_hidden') === 'true')

const toggleFinancialVisibility = () => {
  financialHidden.value = !financialHidden.value
  localStorage.setItem('report_financial_hidden', String(financialHidden.value))
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value || 0)
</script>
