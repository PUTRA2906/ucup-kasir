<template>
  <AdminLayout>
    <PageBreadcrumb pageTitle="Laporan Laba Rugi" class="hidden md:block" />

    <!-- Mobile Header -->
    <MobilePageHeader title="Laporan Laba Rugi" subtitle="Analisis Penjualan & Profitabilitas" hide-back-button>
      <template #actions>
        <button
          @click="showFilterModal = true"
          class="flex h-8 w-8 items-center justify-center rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-white/[0.03]"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
        </button>
      </template>
    </MobilePageHeader>

    <!-- Loading State -->
    <div v-if="store.loading" class="flex items-center justify-center py-20">
      <div class="text-center">
        <div class="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
        <p class="text-sm text-gray-500 dark:text-gray-400">Memuat laporan...</p>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="store.error" class="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-500/30 dark:bg-red-500/10">
      <p class="text-sm text-red-600 dark:text-red-400">{{ store.error }}</p>
      <button
        @click="store.fetchReport()"
        class="mt-2 text-xs font-medium text-red-700 underline hover:no-underline dark:text-red-300"
      >
        Coba Lagi
      </button>
    </div>

    <!-- Content -->
    <div v-else class="space-y-4 pb-6">
      <!-- Filter Pills (Mobile) -->
      <div class="flex items-center gap-2 overflow-x-auto pb-2 md:hidden">
        <button
          @click="showFilterModal = true"
          class="flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 whitespace-nowrap dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
        >
          <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {{ formatDateRange() }}
        </button>
        <button
          v-if="store.paymentStatusFilter !== 'all'"
          @click="store.setPaymentStatusFilter('all'); store.fetchReport()"
          class="flex items-center gap-1.5 rounded-xl border border-blue-500 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-600 whitespace-nowrap dark:bg-blue-500/10 dark:text-blue-400"
        >
          {{ getPaymentStatusLabel(store.paymentStatusFilter) }}
          <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Summary Cards (4 Cards - Mobile 2 Kolom) -->
      <div class="grid grid-cols-2 gap-3 md:grid-cols-4">
        <!-- Card 1: Omzet Bersih -->
        <div class="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-3.5 shadow-sm dark:border-blue-500/30 dark:from-blue-500/10 dark:to-gray-900">
          <div class="mb-2 flex items-center justify-between">
            <span class="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Omzet Bersih</span>
            <div class="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-500/20">
              <svg class="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p class="mb-0.5 text-lg font-black leading-none text-gray-900 dark:text-white">
            {{ formatCurrency(store.summary.net_sales) }}
          </p>
          <p class="text-[9px] text-gray-500 dark:text-gray-400">
            Gross: {{ formatCurrency(store.summary.gross_sales) }}
          </p>
          <p class="text-[9px] text-red-600 dark:text-red-400">
            -{{ formatCurrency(store.summary.total_discount + store.summary.total_returns) }}
          </p>
        </div>

        <!-- Card 2: Kas Masuk -->
        <div class="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-3.5 shadow-sm dark:border-emerald-500/30 dark:from-emerald-500/10 dark:to-gray-900">
          <div class="mb-2 flex items-center justify-between">
            <span class="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Kas Masuk</span>
            <div class="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/20">
              <svg class="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p class="mb-0.5 text-lg font-black leading-none text-gray-900 dark:text-white">
            {{ formatCurrency(store.summary.total_cash_received) }}
          </p>
          <p class="text-[9px] text-emerald-600 dark:text-emerald-400">
            {{ store.summary.lunas_count }} transaksi lunas
          </p>
          <p class="text-[9px] text-gray-500 dark:text-gray-400">
            {{ store.summary.partial_count }} cicilan/DP
          </p>
        </div>

        <!-- Card 3: Piutang -->
        <div class="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-3.5 shadow-sm dark:border-amber-500/30 dark:from-amber-500/10 dark:to-gray-900">
          <div class="mb-2 flex items-center justify-between">
            <span class="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Piutang</span>
            <div class="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-500/20">
              <svg class="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p class="mb-0.5 text-lg font-black leading-none text-gray-900 dark:text-white">
            {{ formatCurrency(store.summary.total_receivables) }}
          </p>
          <p class="text-[9px] text-amber-600 dark:text-amber-400">
            {{ store.summary.tempo_count }} transaksi tempo
          </p>
          <button
            @click="router.push('/customer-invoices')"
            class="mt-1 text-[9px] font-medium text-amber-700 underline hover:no-underline dark:text-amber-300"
          >
            Lihat Daftar
          </button>
        </div>

        <!-- Card 4: Laba Kotor -->
        <div class="rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50 to-white p-3.5 shadow-sm dark:border-purple-500/30 dark:from-purple-500/10 dark:to-gray-900">
          <div class="mb-2 flex items-center justify-between">
            <span class="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">Laba Kotor</span>
            <div class="flex h-6 w-6 items-center justify-center rounded-lg bg-purple-500/20">
              <svg class="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
          <p class="mb-0.5 text-lg font-black leading-none text-gray-900 dark:text-white">
            {{ formatCurrency(store.summary.gross_profit) }}
          </p>
          <p class="text-[9px] text-purple-600 dark:text-purple-400">
            Margin: {{ store.summary.gross_profit_margin.toFixed(1) }}%
          </p>
          <div class="mt-1 space-y-0.5">
            <p class="text-[9px] text-emerald-600 dark:text-emerald-400">
              Terealisasi: {{ formatCurrency(store.summary.realized_profit) }}
            </p>
            <p class="text-[9px] text-amber-600 dark:text-amber-400">
              Tertahan: {{ formatCurrency(store.summary.unrealized_profit) }}
            </p>
          </div>
        </div>
      </div>

      <!-- Laba Bersih (Setelah Beban Operasional) -->
      <div class="rounded-2xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-4 shadow-sm dark:border-emerald-500/40 dark:from-emerald-500/10 dark:to-gray-900">
        <div class="flex items-center justify-between">
          <div>
            <span class="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Laba Bersih</span>
            <p class="text-[10px] text-emerald-600/70 dark:text-emerald-500/70">Laba Kotor − Beban Operasional</p>
          </div>
          <p class="text-lg font-black text-emerald-700 dark:text-emerald-400">{{ formatCurrency(netProfit) }}</p>
        </div>
        <div class="mt-2 flex items-center justify-between border-t border-emerald-200/60 pt-2 text-[10px] dark:border-emerald-500/20">
          <span class="text-emerald-600/80 dark:text-emerald-500/70">Beban Operasional</span>
          <span class="font-bold text-red-600 dark:text-red-400">-{{ formatCurrency(totalExpenses) }}</span>
        </div>
      </div>

      <!-- Breakdown Laba (Expandable) -->
      <div class="rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <button
          @click="showBreakdown = !showBreakdown"
          class="flex w-full items-center justify-between"
        >
          <span class="text-xs font-bold text-gray-700 dark:text-gray-300">Rincian Perhitungan Laba</span>
          <svg
            class="h-4 w-4 text-gray-400 transition-transform"
            :class="{ 'rotate-180': showBreakdown }"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <div v-if="showBreakdown" class="mt-3 space-y-2 border-t border-gray-200 pt-3 dark:border-gray-700">
          <div class="flex justify-between text-xs">
            <span class="text-gray-600 dark:text-gray-400">Penjualan Kotor</span>
            <span class="font-medium text-gray-900 dark:text-white">{{ formatCurrency(store.summary.gross_sales) }}</span>
          </div>
          <div class="flex justify-between text-xs">
            <span class="text-gray-600 dark:text-gray-400">- Diskon</span>
            <span class="font-medium text-red-600 dark:text-red-400">-{{ formatCurrency(store.summary.total_discount) }}</span>
          </div>
          <div class="flex justify-between text-xs">
            <span class="text-gray-600 dark:text-gray-400">- Retur</span>
            <span class="font-medium text-red-600 dark:text-red-400">-{{ formatCurrency(store.summary.total_returns) }}</span>
          </div>
          <div class="flex justify-between border-t border-gray-200 pt-2 text-xs font-bold dark:border-gray-700">
            <span class="text-gray-700 dark:text-gray-300">Penjualan Bersih</span>
            <span class="text-gray-900 dark:text-white">{{ formatCurrency(store.summary.net_sales) }}</span>
          </div>
          <div class="flex justify-between text-xs">
            <span class="text-gray-600 dark:text-gray-400">- HPP Bersih</span>
            <span class="font-medium text-red-600 dark:text-red-400">-{{ formatCurrency(store.summary.net_cogs) }}</span>
          </div>
          <div class="flex justify-between border-t border-gray-200 pt-2 text-xs font-bold dark:border-gray-700">
            <span class="text-purple-600 dark:text-purple-400">Laba Kotor</span>
            <span class="text-purple-600 dark:text-purple-400">{{ formatCurrency(store.summary.gross_profit) }}</span>
          </div>
          <div class="flex justify-between text-xs">
            <span class="text-gray-600 dark:text-gray-400">- Beban Operasional (non-HPP)</span>
            <span class="font-medium text-red-600 dark:text-red-400">-{{ formatCurrency(totalExpenses) }}</span>
          </div>
          <div class="flex justify-between border-t border-gray-200 pt-2 text-xs font-bold dark:border-gray-700">
            <span class="text-emerald-600 dark:text-emerald-400">Laba Bersih</span>
            <span class="text-emerald-600 dark:text-emerald-400">{{ formatCurrency(netProfit) }}</span>
          </div>
        </div>
      </div>

      <!-- Tabel Rincian Transaksi -->
      <div class="rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div class="mb-3 flex items-center justify-between border-b border-gray-200 pb-2 dark:border-gray-700">
          <div>
            <h3 class="text-sm font-bold text-gray-900 dark:text-white">Rincian Transaksi</h3>
            <p class="text-[10px] text-gray-500 dark:text-gray-400">{{ filteredTransactions.length }} transaksi</p>
          </div>
        </div>

        <!-- Quick Filter Status Pembayaran -->
        <div class="mb-3 flex items-center gap-2 overflow-x-auto pb-1">
          <button
            v-for="opt in txStatusOptions"
            :key="opt.value"
            @click="txStatusFilter = opt.value"
            :class="[
              'flex-shrink-0 rounded-lg border px-3 py-1.5 text-[11px] font-medium transition-colors',
              txStatusFilter === opt.value
                ? 'border-blue-500 bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400'
                : 'border-gray-300 bg-white text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300'
            ]"
          >
            {{ opt.label }}
          </button>
        </div>

        <!-- Empty State -->
        <div v-if="filteredTransactions.length === 0" class="py-8 text-center">
          <p class="text-sm text-gray-500 dark:text-gray-400">Tidak ada transaksi</p>
        </div>

        <!-- Transaction List (Mobile) -->
        <div v-else class="space-y-2.5">
          <div
            v-for="tx in filteredTransactions"
            :key="tx.id"
            @click="router.push(`/transactions/${tx.id}`)"
            class="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800"
          >
            <div class="mb-2 flex items-start justify-between">
              <div class="flex-1 min-w-0">
                <p class="text-xs font-bold text-gray-900 dark:text-white">{{ tx.customer_name || 'Customer' }}</p>
                <p class="text-[10px] text-gray-500 dark:text-gray-400">{{ tx.transaction_number }}</p>
                <p class="text-[9px] text-gray-400 dark:text-gray-500">{{ formatDateTime(tx.created_at) }}</p>
              </div>
              <span
                class="rounded-lg px-2 py-0.5 text-[9px] font-bold uppercase"
                :class="getPaymentStatusBadge(tx.payment_status, tx.paid_amount)"
              >
                {{ getPaymentStatusText(tx.payment_status, tx.paid_amount) }}
              </span>
            </div>

            <div class="grid grid-cols-2 gap-2 border-t border-gray-200 pt-2 text-[10px] dark:border-gray-700">
              <div>
                <span class="text-gray-500 dark:text-gray-400">Total Bersih</span>
                <p class="font-bold text-gray-900 dark:text-white">{{ formatCurrency(tx.total) }}</p>
              </div>
              <div>
                <span class="text-gray-500 dark:text-gray-400">Laba</span>
                <p class="font-bold text-purple-600 dark:text-purple-400">{{ formatCurrency(tx.transaction_profit) }}</p>
              </div>
              <div>
                <span class="text-gray-500 dark:text-gray-400">Kas Diterima</span>
                <p class="font-bold text-emerald-600 dark:text-emerald-400">{{ formatCurrency(tx.cash_received) }}</p>
              </div>
              <div>
                <span class="text-gray-500 dark:text-gray-400">Piutang</span>
                <p class="font-bold text-amber-600 dark:text-amber-400">{{ formatCurrency(tx.receivable) }}</p>
              </div>
            </div>

            <div class="mt-2 flex items-center justify-between border-t border-gray-200 pt-2 dark:border-gray-700">
              <div class="text-[9px]">
                <span class="text-gray-500 dark:text-gray-400">Margin:</span>
                <span class="font-bold text-purple-600 dark:text-purple-400">{{ tx.profit_margin.toFixed(1) }}%</span>
              </div>
              <svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <!-- Top 5 Produk Terlaris -->
      <div
        v-if="store.topProducts.length > 0"
        class="rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm dark:border-gray-800 dark:bg-gray-900"
      >
        <h3 class="mb-3 border-b border-gray-200 pb-2 text-sm font-bold text-gray-900 dark:border-gray-700 dark:text-white">
          Top 5 Produk Terlaris
        </h3>
        <div class="space-y-2">
          <div
            v-for="(product, index) in store.topProducts"
            :key="product.product_id"
            class="flex items-center gap-2.5"
          >
            <div class="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-xs font-bold text-blue-600 dark:text-blue-400">
              {{ index + 1 }}
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-xs font-medium text-gray-900 dark:text-white truncate">{{ product.product_name }}</p>
              <p class="text-[9px] text-gray-500 dark:text-gray-400">
                {{ product.net_quantity }} terjual · Laba {{ formatCurrency(product.profit) }}
              </p>
            </div>
            <div class="text-right">
              <p class="text-xs font-bold text-gray-900 dark:text-white">{{ formatCurrency(product.revenue) }}</p>
              <p class="text-[9px] text-purple-600 dark:text-purple-400">{{ product.profit_margin.toFixed(1) }}%</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Top 5 Produk Paling Sering Diretur -->
      <div
        v-if="store.topReturns.length > 0"
        class="rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm dark:border-gray-800 dark:bg-gray-900"
      >
        <h3 class="mb-3 border-b border-gray-200 pb-2 text-sm font-bold text-gray-900 dark:border-gray-700 dark:text-white">
          Top 5 Produk Paling Sering Diretur
        </h3>
        <div class="space-y-2">
          <div
            v-for="(product, index) in store.topReturns"
            :key="product.product_id"
            class="flex items-center gap-2.5"
          >
            <div class="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-xs font-bold text-red-600 dark:text-red-400">
              {{ index + 1 }}
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-xs font-medium text-gray-900 dark:text-white truncate">{{ product.product_name }}</p>
              <p class="text-[9px] text-gray-500 dark:text-gray-400">
                {{ product.quantity_returned }} diretur dari {{ product.quantity_sold }} terjual
              </p>
            </div>
            <div class="text-right">
              <p class="text-xs font-bold text-red-600 dark:text-red-400">{{ product.return_rate.toFixed(1) }}%</p>
              <p class="text-[9px] text-gray-500 dark:text-gray-400">Tingkat Retur</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Filter Modal -->
    <div
      v-if="showFilterModal"
      class="fixed inset-0 z-50 flex items-end justify-center bg-black/50 md:items-center"
      @click.self="showFilterModal = false"
    >
      <div
        class="w-full max-w-md rounded-t-3xl bg-white p-6 md:rounded-2xl dark:bg-gray-900"
        @click.stop
      >
        <div class="mb-4 flex items-center justify-between">
          <h3 class="text-lg font-bold text-gray-900 dark:text-white">Filter Laporan</h3>
          <button
            @click="showFilterModal = false"
            class="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="space-y-4">
          <!-- Quick Date Range -->
          <div>
            <label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Rentang Waktu</label>
            <div class="grid grid-cols-2 gap-2">
              <button
                @click="setQuickDateRange('today')"
                class="rounded-xl border border-gray-300 px-3 py-2 text-sm font-medium transition hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                :class="isQuickDateRange('today') ? 'border-blue-500 bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'"
              >
                Hari Ini
              </button>
              <button
                @click="setQuickDateRange('7days')"
                class="rounded-xl border border-gray-300 px-3 py-2 text-sm font-medium transition hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                :class="isQuickDateRange('7days') ? 'border-blue-500 bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'"
              >
                7 Hari
              </button>
              <button
                @click="setQuickDateRange('30days')"
                class="rounded-xl border border-gray-300 px-3 py-2 text-sm font-medium transition hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                :class="isQuickDateRange('30days') ? 'border-blue-500 bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'"
              >
                30 Hari
              </button>
              <button
                @click="setQuickDateRange('thisMonth')"
                class="rounded-xl border border-gray-300 px-3 py-2 text-sm font-medium transition hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                :class="isQuickDateRange('thisMonth') ? 'border-blue-500 bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'"
              >
                Bulan Ini
              </button>
            </div>
          </div>

          <!-- Custom Date Range -->
          <div>
            <label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Custom Range</label>
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="mb-1 block text-xs text-gray-500 dark:text-gray-400">Dari</label>
                <input
                  type="date"
                  v-model="tempDateRange.start"
                  class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>
              <div>
                <label class="mb-1 block text-xs text-gray-500 dark:text-gray-400">Sampai</label>
                <input
                  type="date"
                  v-model="tempDateRange.end"
                  class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>
            </div>
          </div>

          <!-- Status Pembayaran -->
          <div>
            <label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Status Pembayaran</label>
            <div class="grid grid-cols-2 gap-2">
              <button
                @click="tempPaymentStatus = 'all'"
                class="rounded-xl border border-gray-300 px-3 py-2 text-sm font-medium transition hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                :class="tempPaymentStatus === 'all' ? 'border-blue-500 bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'"
              >
                Semua
              </button>
              <button
                @click="tempPaymentStatus = 'lunas'"
                class="rounded-xl border border-gray-300 px-3 py-2 text-sm font-medium transition hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                :class="tempPaymentStatus === 'lunas' ? 'border-emerald-500 bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : 'text-gray-700 dark:text-gray-300'"
              >
                Lunas
              </button>
              <button
                @click="tempPaymentStatus = 'belum_lunas'"
                class="rounded-xl border border-gray-300 px-3 py-2 text-sm font-medium transition hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                :class="tempPaymentStatus === 'belum_lunas' ? 'border-amber-500 bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400' : 'text-gray-700 dark:text-gray-300'"
              >
                Tempo/Piutang
              </button>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex gap-2 pt-2">
            <button
              @click="resetFilters"
              class="flex-1 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Reset
            </button>
            <button
              @click="applyFilters"
              class="flex-1 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-500"
            >
              Terapkan Filter
            </button>
          </div>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import MobilePageHeader from '@/components/common/MobilePageHeader.vue'
import { useSalesReportEnhancedStore } from '@/stores/salesReportEnhanced'
import { useFinanceStore } from '@/stores/finance'

const router = useRouter()
const store = useSalesReportEnhancedStore()
const financeStore = useFinanceStore()

const showFilterModal = ref(false)
const showBreakdown = ref(false)

// Saldo beban operasional per akun (dari jurnal, modul finance)
const expenseBalanceByAccount = ref<Record<string, number>>({})

// Beban operasional dari jurnal (modul finance) — akun beban selain HPP
const totalExpenses = computed(() => {
  return financeStore.accounts
    .filter((a) => a.type === 'beban' && a.code !== '5-5000')
    .reduce((sum, acc) => sum + (expenseBalanceByAccount.value[acc.id] || 0), 0)
})
const netProfit = computed(() => store.summary.gross_profit - totalExpenses.value)

// Temp filter state
const tempDateRange = ref({
  start: new Date().toISOString().split('T')[0],
  end: new Date().toISOString().split('T')[0],
})
const tempPaymentStatus = ref<'lunas' | 'belum_lunas' | 'all'>('all')

// Quick filter status pembayaran pada daftar transaksi
const txStatusFilter = ref<'semua' | 'lunas' | 'belum_lunas'>('semua')
const txStatusOptions = [
  { value: 'semua', label: 'Semua' },
  { value: 'lunas', label: 'Lunas' },
  { value: 'belum_lunas', label: 'Belum Lunas' },
] as const

const filteredTransactions = computed(() => {
  if (txStatusFilter.value === 'semua') return store.transactions
  return store.transactions.filter((tx) => {
    const isLunas = tx.payment_status === 'lunas' || (tx.paid_amount || 0) > 0 && (tx.remaining_amount || 0) <= 0
    return txStatusFilter.value === 'lunas' ? isLunas : !isLunas
  })
})

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value || 0)

const formatDateTime = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

const formatDateRange = () => {
  const start = new Date(store.dateRange.start)
  const end = new Date(store.dateRange.end)

  if (store.dateRange.start === store.dateRange.end) {
    return start.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  return `${start.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} - ${end.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`
}

const getPaymentStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    lunas: 'Lunas',
    belum_lunas: 'Tempo/Piutang',
    all: 'Semua',
  }
  return labels[status] || status
}

const getPaymentStatusBadge = (status: string, paidAmount: number) => {
  if (status === 'lunas') {
    return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
  } else if (paidAmount === 0) {
    return 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
  } else {
    return 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400'
  }
}

const getPaymentStatusText = (status: string, paidAmount: number) => {
  if (status === 'lunas') {
    return 'Lunas'
  } else if (paidAmount === 0) {
    return 'Tempo'
  } else {
    return 'Cicilan'
  }
}

const setQuickDateRange = (range: string) => {
  const today = new Date()
  const endDate = today.toISOString().split('T')[0]

  switch (range) {
    case 'today':
      tempDateRange.value = { start: endDate, end: endDate }
      break
    case '7days':
      const sevenDaysAgo = new Date(today)
      sevenDaysAgo.setDate(today.getDate() - 6)
      tempDateRange.value = {
        start: sevenDaysAgo.toISOString().split('T')[0],
        end: endDate,
      }
      break
    case '30days':
      const thirtyDaysAgo = new Date(today)
      thirtyDaysAgo.setDate(today.getDate() - 29)
      tempDateRange.value = {
        start: thirtyDaysAgo.toISOString().split('T')[0],
        end: endDate,
      }
      break
    case 'thisMonth':
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
      tempDateRange.value = {
        start: firstDay.toISOString().split('T')[0],
        end: endDate,
      }
      break
  }
}

const isQuickDateRange = (range: string) => {
  const today = new Date().toISOString().split('T')[0]
  const { start, end } = tempDateRange.value

  switch (range) {
    case 'today':
      return start === today && end === today
    case '7days':
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
      return start === sevenDaysAgo.toISOString().split('T')[0] && end === today
    case '30days':
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29)
      return start === thirtyDaysAgo.toISOString().split('T')[0] && end === today
    case 'thisMonth':
      const firstDay = new Date()
      firstDay.setDate(1)
      return start === firstDay.toISOString().split('T')[0] && end === today
    default:
      return false
  }
}

const applyFilters = () => {
  store.setDateRange(tempDateRange.value.start, tempDateRange.value.end)
  store.setPaymentStatusFilter(tempPaymentStatus.value)
  txStatusFilter.value = 'semua'
  store.fetchReport()
  loadExpenseBalances()
  showFilterModal.value = false
}

const resetFilters = () => {
  const today = new Date().toISOString().split('T')[0]
  tempDateRange.value = { start: today, end: today }
  tempPaymentStatus.value = 'all'
  txStatusFilter.value = 'semua'
}

onMounted(() => {
  // Set default ke hari ini
  const today = new Date().toISOString().split('T')[0]
  tempDateRange.value = { start: today, end: today }
  store.setDateRange(today, today)
  store.fetchReport()

  // Ambil saldo beban operasional dari modul finance
  loadExpenseBalances()
})

/** Muat saldo akun beban (non-HPP) dari modul finance. */
async function loadExpenseBalances() {
  try {
    if (financeStore.accounts.length === 0) {
      await financeStore.fetchAccounts()
    }
    const balances = await financeStore.getAccountBalances()
    expenseBalanceByAccount.value = {}
    for (const b of balances) {
      if (b.account_type === 'beban' && b.balance !== 0) {
        expenseBalanceByAccount.value[b.account_id] = b.balance
      }
    }
  } catch {
    // silently fail — beban tetap 0
  }
}
</script>
