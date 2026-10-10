<template>
  <AdminLayout hide-bottom-nav>
    <PageBreadcrumb pageTitle="Laporan Laba Rugi" class="hidden md:block" />

    <!-- Mobile Header -->
    <MobilePageHeader title="Laporan Laba Rugi" subtitle="Analisis Penjualan & Profitabilitas">
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
    <div v-else class="space-y-4 pb-24 md:pb-6">
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

        <!-- Card 4: Laba Terealisasi -->
        <div class="rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50 to-white p-3.5 shadow-sm dark:border-purple-500/30 dark:from-purple-500/10 dark:to-gray-900">
          <div class="mb-2 flex items-center justify-between">
            <span class="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">Laba Terealisasi</span>
            <div class="flex h-6 w-6 items-center justify-center rounded-lg bg-purple-500/20">
              <svg class="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
          <p class="mb-0.5 text-lg font-black leading-none text-gray-900 dark:text-white">
            {{ formatCurrency(store.summary.realized_profit) }}
          </p>
          <p class="text-[9px] text-purple-600 dark:text-purple-400">
            Margin: {{ store.summary.gross_profit_margin.toFixed(1) }}%
          </p>
          <div class="mt-1 space-y-0.5">
            <p class="text-[9px] text-gray-500 dark:text-gray-400">
              Laba Kotor (akrual): {{ formatCurrency(store.summary.gross_profit) }}
            </p>
            <p class="text-[9px] text-amber-600 dark:text-amber-400">
              Tertahan: {{ formatCurrency(store.summary.unrealized_profit) }}
            </p>
          </div>
        </div>
      </div>

      <!-- Laba Bersih Terealisasi (Setelah Beban Operasional) -->
      <div class="rounded-2xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-4 shadow-sm dark:border-emerald-500/40 dark:from-emerald-500/10 dark:to-gray-900">
        <div class="flex items-center justify-between">
          <div>
            <span class="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Laba Bersih Terealisasi</span>
            <p class="text-[10px] text-emerald-600/70 dark:text-emerald-500/70">Laba Terealisasi − Beban Operasional</p>
          </div>
          <p class="text-lg font-black text-emerald-700 dark:text-emerald-400">{{ formatCurrency(realizedNetProfit) }}</p>
        </div>
        <div class="mt-2 flex items-center justify-between border-t border-emerald-200/60 pt-2 text-[10px] dark:border-emerald-500/20">
          <span class="text-emerald-600/80 dark:text-emerald-500/70">Beban Operasional</span>
          <span class="font-bold text-red-600 dark:text-red-400">-{{ formatCurrency(totalExpenses) }}</span>
        </div>
        <div class="mt-1 flex items-center justify-between text-[10px] text-gray-500 dark:text-gray-400">
          <span>Laba Bersih (Akrual):</span>
          <span>{{ formatCurrency(netProfit) }}</span>
        </div>
      </div>

      <!-- Breakdown Laba (selalu tampil) -->
      <div class="rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <span class="text-xs font-bold text-gray-700 dark:text-gray-300">Rincian Perhitungan Laba</span>

        <div class="mt-3 space-y-2 border-t border-gray-200 pt-3 dark:border-gray-700">
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
            <span class="text-gray-600 dark:text-gray-400">Laba Kotor (akrual)</span>
            <span class="text-gray-600 dark:text-gray-400">{{ formatCurrency(store.summary.gross_profit) }}</span>
          </div>
          <div class="flex justify-between text-xs">
            <span class="text-emerald-600 dark:text-emerald-400">  ↳ Terealisasi (sudah dibayar)</span>
            <span class="font-medium text-emerald-600 dark:text-emerald-400">{{ formatCurrency(store.summary.realized_profit) }}</span>
          </div>
          <div class="flex justify-between text-xs">
            <span class="text-amber-600 dark:text-amber-400">  ↳ Tertahan (belum dibayar)</span>
            <span class="font-medium text-amber-600 dark:text-amber-400">{{ formatCurrency(store.summary.unrealized_profit) }}</span>
          </div>
          <div class="flex justify-between text-xs">
            <span class="text-gray-600 dark:text-gray-400">- Beban Operasional (non-HPP)</span>
            <span class="font-medium text-red-600 dark:text-red-400">-{{ formatCurrency(totalExpenses) }}</span>
          </div>
          <div class="flex justify-between border-t border-gray-200 pt-2 text-xs font-bold dark:border-gray-700">
            <span class="text-purple-600 dark:text-purple-400">Laba Bersih Terealisasi</span>
            <span class="text-purple-600 dark:text-purple-400">{{ formatCurrency(realizedNetProfit) }}</span>
          </div>
          <div class="flex justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>Laba Bersih (Akrual)</span>
            <span>{{ formatCurrency(netProfit) }}</span>
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
          <!-- Mode Toggle: Per Periode vs Per Bulan -->
          <div class="flex rounded-xl border border-gray-200 p-1 dark:border-gray-700">
            <button
              @click="filterMode = 'range'"
              class="flex-1 rounded-lg py-2 text-sm font-medium transition"
              :class="filterMode === 'range'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'"
            >
              Per Periode
            </button>
            <button
              @click="filterMode = 'month'"
              class="flex-1 rounded-lg py-2 text-sm font-medium transition"
              :class="filterMode === 'month'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'"
            >
              Per Bulan
            </button>
          </div>

          <!-- Mode Per Bulan -->
          <div v-if="filterMode === 'month'" class="space-y-3">
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Bulan</label>
                <select
                  v-model="tempMonth"
                  class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                >
                  <option v-for="m in monthOptions" :key="m.value" :value="m.value">{{ m.label }}</option>
                </select>
              </div>
              <div>
                <label class="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Tahun</label>
                <select
                  v-model="tempYear"
                  class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                >
                  <option v-for="y in yearOptions" :key="y" :value="y">{{ y }}</option>
                </select>
              </div>
            </div>
            <p v-if="isFuturePeriod(tempMonth, tempYear)" class="text-xs text-red-500 dark:text-red-400">
              ⚠ Tidak dapat melihat laporan periode yang belum terjadi.
            </p>
          </div>

          <!-- Mode Per Periode (range) -->
          <template v-else>
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
                <button
                  @click="setQuickDateRange('allTime')"
                  class="rounded-xl border border-gray-300 px-3 py-2 text-sm font-medium transition hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                  :class="isQuickDateRange('allTime') ? 'border-purple-500 bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400' : 'text-gray-700 dark:text-gray-300'"
                >
                  Sepanjang Masa
                </button>
              </div>
            </div>

            <!-- Custom Date Range -->
            <div>
              <label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Custom Range</label>
              <DateRangeField
                v-model:start="tempDateRange.start"
                v-model:end="tempDateRange.end"
                title="Pilih Rentang Tanggal"
                placeholder="Pilih periode custom"
                button-class="flex w-full items-center justify-between rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700"
              />
            </div>
          </template>

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
import DateRangeField from '@/components/common/DateRangeField.vue'
import { useSalesReportEnhancedStore } from '@/stores/salesReportEnhanced'
import { useFinanceStore } from '@/stores/finance'
import { useAutoNavigationStack } from '@/composables/useAutoNavigationStack'
import { localDateStr, localTodayStr, localDateOffsetStr } from '@/utils/date'

const router = useRouter()
const store = useSalesReportEnhancedStore()
const financeStore = useFinanceStore()

const showFilterModal = ref(false)

// Auto register/unregister modal di navigation stack
useAutoNavigationStack(showFilterModal, 'profit-loss-filter-modal')

// ── Filter mode: 'range' = per periode custom, 'month' = per bulan ────────────
const filterMode = ref<'range' | 'month'>('range')

// Tanggal sekarang (lokal)
const nowDate = new Date()
const currentMonthNum = nowDate.getMonth() + 1  // 1-12
const currentYearNum = nowDate.getFullYear()

// Picker bulan/tahun sementara
const tempMonth = ref(currentMonthNum)
const tempYear = ref(currentYearNum)

const monthOptions = [
  { value: 1, label: 'Januari' },
  { value: 2, label: 'Februari' },
  { value: 3, label: 'Maret' },
  { value: 4, label: 'April' },
  { value: 5, label: 'Mei' },
  { value: 6, label: 'Juni' },
  { value: 7, label: 'Juli' },
  { value: 8, label: 'Agustus' },
  { value: 9, label: 'September' },
  { value: 10, label: 'Oktober' },
  { value: 11, label: 'November' },
  { value: 12, label: 'Desember' },
]

const yearOptions = computed(() => {
  const years: number[] = []
  for (let y = currentYearNum - 3; y <= currentYearNum; y++) {
    years.push(y)
  }
  return years
})

const isFuturePeriod = (month: number, year: number): boolean => {
  if (year > currentYearNum) return true
  if (year === currentYearNum && month > currentMonthNum) return true
  return false
}

// Saldo beban operasional per akun (dari jurnal, modul finance)
const expenseBalanceByAccount = ref<Record<string, number>>({})

// Beban operasional dari jurnal (modul finance) — akun beban selain HPP
const totalExpenses = computed(() => {
  return financeStore.accounts
    .filter((a) => a.type === 'beban' && a.code !== '5-5000')
    .reduce((sum, acc) => sum + (expenseBalanceByAccount.value[acc.id] || 0), 0)
})
const netProfit = computed(() => store.summary.gross_profit - totalExpenses.value)
const realizedNetProfit = computed(() => store.summary.realized_profit - totalExpenses.value)

// Temp filter state — tanggal LOKAL (lihat @/utils/date), bukan UTC
const tempDateRange = ref({
  start: localTodayStr(),
  end: localTodayStr(),
})
const tempPaymentStatus = ref<'lunas' | 'belum_lunas' | 'all'>('all')

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

const setQuickDateRange = (range: string) => {
  const now = new Date()
  const endDate = localTodayStr()

  switch (range) {
    case 'today':
      tempDateRange.value = { start: endDate, end: endDate }
      break
    case '7days':
      tempDateRange.value = {
        start: localDateOffsetStr(-6),
        end: endDate,
      }
      break
    case '30days':
      tempDateRange.value = {
        start: localDateOffsetStr(-29),
        end: endDate,
      }
      break
    case 'thisMonth':
      tempDateRange.value = {
        start: localDateStr(new Date(now.getFullYear(), now.getMonth(), 1)),
        end: endDate,
      }
      break
    case 'allTime':
      tempDateRange.value = { start: '', end: '' }
      break
  }
}

const isQuickDateRange = (range: string) => {
  const today = localTodayStr()
  const now = new Date()
  const { start, end } = tempDateRange.value

  switch (range) {
    case 'today':
      return start === today && end === today
    case '7days':
      return start === localDateOffsetStr(-6) && end === today
    case '30days':
      return start === localDateOffsetStr(-29) && end === today
    case 'thisMonth':
      return (
        start === localDateStr(new Date(now.getFullYear(), now.getMonth(), 1)) &&
        end === today
      )
    case 'allTime':
      return start === '' && end === ''
    default:
      return false
  }
}

const applyFilters = () => {
  let startDate: string
  let endDate: string

  if (filterMode.value === 'month') {
    if (isFuturePeriod(tempMonth.value, tempYear.value)) return
    const mm = String(tempMonth.value).padStart(2, '0')
    const lastDay = new Date(tempYear.value, tempMonth.value, 0).getDate()
    // Jika bulan berjalan, batasi sampai hari ini
    const maxDay =
      tempYear.value === currentYearNum && tempMonth.value === currentMonthNum
        ? nowDate.getDate()
        : lastDay
    const dd = String(maxDay).padStart(2, '0')
    startDate = `${tempYear.value}-${mm}-01`
    endDate = `${tempYear.value}-${mm}-${dd}`
  } else {
    startDate = tempDateRange.value.start
    endDate = tempDateRange.value.end
  }

  store.setDateRange(startDate, endDate)
  store.setPaymentStatusFilter(tempPaymentStatus.value)
  store.fetchReport()
  loadExpenseBalances(startDate, endDate)
  showFilterModal.value = false
}

const resetFilters = () => {
  const today = localTodayStr()
  tempDateRange.value = { start: today, end: today }
  tempPaymentStatus.value = 'all'
}

onMounted(() => {
  // Set default ke hari ini
  const today = localTodayStr()
  tempDateRange.value = { start: today, end: today }
  store.setDateRange(today, today)
  store.fetchReport()

  // Ambil saldo beban operasional dari modul finance
  loadExpenseBalances(today, today)
})

/** Muat saldo akun beban (non-HPP) dari modul finance dalam rentang periode. */
async function loadExpenseBalances(startDate: string, endDate: string) {
  try {
    if (financeStore.accounts.length === 0) {
      await financeStore.fetchAccounts()
    }

    // Ambil saldo awal (sebelum startDate) dan saldo akhir (sampai endDate)
    // Jika startDate kosong (allTime), ambil dari awal (undefined = semua)
    const balancesStart = await financeStore.getAccountBalances(
      startDate
        ? new Date(new Date(startDate + 'T00:00:00').getTime() - 86400000)
            .toLocaleDateString('en-CA')
        : undefined
    )
    const balancesEnd = await financeStore.getAccountBalances(endDate || undefined)

    // Hitung selisih saldo dalam periode (beban dalam periode = saldo akhir - saldo awal)
    expenseBalanceByAccount.value = {}
    for (const accEnd of balancesEnd) {
      if (accEnd.account_type === 'beban') {
        const accStart = balancesStart.find(b => b.account_id === accEnd.account_id)
        const balanceStart = accStart?.balance || 0
        const expenseInPeriod = accEnd.balance - balanceStart

        if (expenseInPeriod !== 0) {
          expenseBalanceByAccount.value[accEnd.account_id] = expenseInPeriod
        }
      }
    }
  } catch (error) {
    console.error('Error loading expense balances:', error)
    // silently fail — beban tetap 0
  }
}
</script>
