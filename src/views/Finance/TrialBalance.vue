<template>
  <AdminLayout>
    <PageBreadcrumb pageTitle="Neraca Saldo & Penyesuaian" class="hidden md:block" />

    <!-- Mobile Header -->
    <MobilePageHeader title="Neraca Saldo & Penyesuaian" subtitle="Kertas kerja trial balance">
      <template #actions>
        <button
          @click="openAdjustmentForm()"
          class="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-white hover:bg-blue-500"
          title="Buat jurnal penyesuaian"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </button>
      </template>
    </MobilePageHeader>

    <!-- Desktop Header -->
    <div class="mb-4 hidden items-start justify-between gap-3 md:flex">
      <div>
        <h2 class="text-lg font-bold text-gray-900 dark:text-white">Neraca Saldo & Penyesuaian</h2>
        <p class="text-xs text-gray-500 dark:text-gray-400">
          Kertas kerja saldo sebelum penyesuaian, jurnal penyesuaian, dan saldo setelah penyesuaian.
        </p>
      </div>
      <button
        @click="openAdjustmentForm()"
        class="shrink-0 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-500"
      >
        + Jurnal Penyesuaian
      </button>
    </div>

    <!-- Loading awal -->
    <div v-if="loading && !worksheet" class="flex items-center justify-center py-20">
      <div class="text-center">
        <div class="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
        <p class="text-sm text-gray-500 dark:text-gray-400">Memuat neraca saldo...</p>
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-500/30 dark:bg-red-500/10">
      <p class="text-sm text-red-600 dark:text-red-400">{{ error }}</p>
      <button
        @click="fetchData"
        class="mt-2 text-xs font-bold text-red-700 underline dark:text-red-300"
      >
        Coba lagi
      </button>
    </div>

    <template v-else>
      <!-- Indikator refresh (periode berubah tanpa mengosongkan halaman) -->
      <div v-if="loading" class="mb-2 h-0.5 overflow-hidden rounded-full bg-blue-100 dark:bg-blue-500/20">
        <div class="h-full w-1/3 animate-pulse rounded-full bg-blue-500"></div>
      </div>

      <!-- ============================================================
           Periode
           ============================================================ -->
      <div class="mb-3 rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div class="flex items-center justify-between gap-2">
          <div class="min-w-0">
            <p class="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Periode</p>
            <p class="truncate text-xs font-semibold text-gray-900 dark:text-white">{{ periodLabel }}</p>
          </div>
          <div class="w-[190px] shrink-0">
            <DateRangeField
              :start="periodStart"
              :end="periodEnd"
              title="Pilih Periode Neraca Saldo"
              placeholder="Semua periode"
              button-class="flex w-full items-center justify-between gap-2 rounded-xl border border-gray-300 bg-white px-2.5 py-2 text-[11px] font-medium text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
              @update:start="periodStart = $event"
              @update:end="periodEnd = $event"
            />
          </div>
        </div>

        <!-- Preset cepat -->
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
      </div>

      <!-- ============================================================
           Ringkasan keseimbangan
           ============================================================ -->
      <div
        class="mb-3 rounded-2xl border p-3.5 shadow-sm"
        :class="adjustedBalanced
          ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10'
          : 'border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10'"
      >
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0">
            <p
              class="text-[10px] font-bold uppercase tracking-wider"
              :class="adjustedBalanced ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'"
            >
              {{ adjustedBalanced ? '✓ Saldo Setelah Penyesuaian Seimbang' : '⚠ Saldo Setelah Penyesuaian Tidak Seimbang' }}
            </p>
            <p class="mt-0.5 text-[10px] text-gray-600 dark:text-gray-400">
              {{ worksheet?.rows.length || 0 }} akun · {{ adjustments.length }} jurnal penyesuaian
            </p>
          </div>
          <span
            v-if="!adjustedBalanced"
            class="shrink-0 rounded-lg bg-white/70 px-2 py-1 text-[10px] font-bold text-amber-700 dark:bg-black/20 dark:text-amber-300"
          >
            Selisih {{ formatCurrency(Math.abs(adjustedTotals.debit - adjustedTotals.credit)) }}
          </span>
        </div>

        <div class="mt-2.5 grid grid-cols-2 gap-2">
          <div class="rounded-xl bg-white/70 p-2.5 dark:bg-black/20">
            <p class="text-[9px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Total Debit</p>
            <p class="mt-0.5 text-xs font-black tabular-nums text-emerald-700 dark:text-emerald-400">
              {{ formatCurrency(adjustedTotals.debit) }}
            </p>
          </div>
          <div class="rounded-xl bg-white/70 p-2.5 dark:bg-black/20">
            <p class="text-[9px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Total Kredit</p>
            <p class="mt-0.5 text-xs font-black tabular-nums text-red-700 dark:text-red-400">
              {{ formatCurrency(adjustedTotals.credit) }}
            </p>
          </div>
        </div>

        <div class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-gray-600 dark:text-gray-400">
          <span>
            Sebelum: <b class="tabular-nums text-gray-800 dark:text-gray-200">{{ formatNumber(worksheet?.totals.unadjusted_debit || 0) }}</b>
            /
            <b class="tabular-nums text-gray-800 dark:text-gray-200">{{ formatNumber(worksheet?.totals.unadjusted_credit || 0) }}</b>
          </span>
          <span>
            Penyesuaian: <b class="tabular-nums text-amber-700 dark:text-amber-400">{{ formatNumber(worksheet?.totals.adjustment_debit || 0) }}</b>
            /
            <b class="tabular-nums text-amber-700 dark:text-amber-400">{{ formatNumber(worksheet?.totals.adjustment_credit || 0) }}</b>
          </span>
        </div>
      </div>

      <!-- ============================================================
           Tab
           ============================================================ -->
      <div class="mb-3 grid grid-cols-2 gap-1 rounded-xl bg-gray-100 p-1 dark:bg-gray-800">
        <button
          @click="tab = 'worksheet'"
          :class="[
            'rounded-lg px-3 py-2 text-[11px] font-bold transition',
            tab === 'worksheet'
              ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-900 dark:text-white'
              : 'text-gray-500 dark:text-gray-400'
          ]"
        >
          Kertas Kerja
        </button>
        <button
          @click="tab = 'adjustments'"
          :class="[
            'flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-bold transition',
            tab === 'adjustments'
              ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-900 dark:text-white'
              : 'text-gray-500 dark:text-gray-400'
          ]"
        >
          Penyesuaian
          <span class="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-black text-amber-700 dark:bg-amber-500/20 dark:text-amber-400">
            {{ adjustments.length }}
          </span>
        </button>
      </div>

      <!-- ============================================================
           TAB: Kertas Kerja
           ============================================================ -->
      <template v-if="tab === 'worksheet'">
        <!-- Filter tipe akun -->
        <div class="mb-3 flex items-center gap-1.5 overflow-x-auto pb-0.5">
          <button
            v-for="opt in typeFilterOptions"
            :key="opt.value"
            @click="typeFilter = opt.value"
            :class="[
              'shrink-0 rounded-lg border px-2.5 py-1.5 text-[10px] font-semibold transition',
              typeFilter === opt.value
                ? 'border-blue-500 bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400'
                : 'border-gray-200 bg-white text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300'
            ]"
          >
            {{ opt.label }}
          </button>
        </div>

        <!-- Empty -->
        <div v-if="filteredRows.length === 0" class="rounded-2xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-gray-900">
          <p class="text-sm font-medium text-gray-700 dark:text-gray-300">Belum ada saldo akun pada periode ini.</p>
          <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Saldo muncul setelah ada jurnal transaksi atau jurnal penyesuaian.
          </p>
          <button
            @click="openAdjustmentForm()"
            class="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-500"
          >
            + Buat Jurnal Penyesuaian
          </button>
        </div>

        <template v-else>
          <!-- ==========================================
               Mobile: kartu per akun, dikelompokkan tipe
               ========================================== -->
          <div class="space-y-3 md:hidden">
            <div
              v-for="group in groupedRows"
              :key="group.type"
              class="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900"
            >
              <!-- Group header -->
              <div class="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-800/60">
                <span class="text-[10px] font-black uppercase tracking-wider" :class="typeTextClass(group.type)">
                  {{ group.label }}
                </span>
                <span class="text-[10px] font-bold tabular-nums text-gray-700 dark:text-gray-300">
                  <template v-if="group.totals.adjusted_debit && group.totals.adjusted_credit">
                    D {{ formatNumber(group.totals.adjusted_debit) }} · K {{ formatNumber(group.totals.adjusted_credit) }}
                  </template>
                  <template v-else-if="group.totals.adjusted_debit">
                    D {{ formatNumber(group.totals.adjusted_debit) }}
                  </template>
                  <template v-else>
                    K {{ formatNumber(group.totals.adjusted_credit) }}
                  </template>
                </span>
              </div>

              <div class="divide-y divide-gray-100 dark:divide-gray-800">
                <div
                  v-for="row in group.rows"
                  :key="row.account_id"
                  class="px-3 py-2.5"
                  :class="hasAdjustment(row) ? 'bg-amber-50/50 dark:bg-amber-500/[0.04]' : ''"
                >
                  <!-- Nama akun -->
                  <div class="flex items-start justify-between gap-2">
                    <button
                      @click="router.push(`/finance/ledger?account=${row.account_id}`)"
                      class="min-w-0 flex-1 text-left"
                    >
                      <p class="truncate text-[11px] font-semibold text-gray-900 dark:text-white">
                        {{ row.account_name }}
                      </p>
                      <p class="font-mono text-[9px] text-blue-600 dark:text-blue-400">{{ row.account_code }}</p>
                    </button>
                    <div class="flex shrink-0 items-center gap-1">
                      <span
                        v-if="hasAdjustment(row)"
                        class="rounded bg-amber-100 px-1 py-0.5 text-[8px] font-black uppercase text-amber-700 dark:bg-amber-500/20 dark:text-amber-400"
                      >
                        AJP
                      </span>
                      <button
                        @click="openAdjustmentForm(row.account_id)"
                        class="rounded-lg border border-gray-200 px-2 py-1 text-[9px] font-bold text-gray-600 active:scale-95 dark:border-gray-700 dark:text-gray-300"
                      >
                        + Sesuaikan
                      </button>
                    </div>
                  </div>

                  <!-- Nilai: Sebelum / Penyesuaian / Setelah -->
                  <div class="mt-1.5 grid grid-cols-[56px_1fr_1fr] gap-x-2 gap-y-0.5 text-[10px] tabular-nums">
                    <span class="text-gray-500 dark:text-gray-400">Sebelum</span>
                    <span class="text-right font-medium" :class="row.unadjusted_debit ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-300 dark:text-gray-600'">
                      {{ row.unadjusted_debit ? 'D ' + formatNumber(row.unadjusted_debit) : '—' }}
                    </span>
                    <span class="text-right font-medium" :class="row.unadjusted_credit ? 'text-red-600 dark:text-red-400' : 'text-gray-300 dark:text-gray-600'">
                      {{ row.unadjusted_credit ? 'K ' + formatNumber(row.unadjusted_credit) : '—' }}
                    </span>

                    <template v-if="hasAdjustment(row)">
                      <span class="text-amber-700 dark:text-amber-400">Penyesuaian</span>
                      <span class="text-right font-medium text-amber-700 dark:text-amber-400">
                        {{ row.adjustment_debit ? 'D ' + formatNumber(row.adjustment_debit) : '—' }}
                      </span>
                      <span class="text-right font-medium text-amber-700 dark:text-amber-400">
                        {{ row.adjustment_credit ? 'K ' + formatNumber(row.adjustment_credit) : '—' }}
                      </span>
                    </template>

                    <span class="font-bold text-gray-700 dark:text-gray-300">Setelah</span>
                    <span class="text-right font-black" :class="row.adjusted_debit ? 'text-emerald-700 dark:text-emerald-400' : 'text-gray-300 dark:text-gray-600'">
                      {{ row.adjusted_debit ? 'D ' + formatNumber(row.adjusted_debit) : '—' }}
                    </span>
                    <span class="text-right font-black" :class="row.adjusted_credit ? 'text-red-700 dark:text-red-400' : 'text-gray-300 dark:text-gray-600'">
                      {{ row.adjusted_credit ? 'K ' + formatNumber(row.adjusted_credit) : '—' }}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Total -->
            <div class="rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <p class="mb-2 text-[10px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Total {{ typeFilter === 'all' ? 'Neraca Saldo' : typeFilterLabel }}
              </p>
              <div class="grid grid-cols-[56px_1fr_1fr] gap-x-2 gap-y-1 text-[10px] tabular-nums">
                <span class="text-gray-500 dark:text-gray-400">Sebelum</span>
                <span class="text-right font-bold text-emerald-700 dark:text-emerald-400">D {{ formatNumber(displayTotals.unadjusted_debit) }}</span>
                <span class="text-right font-bold text-red-700 dark:text-red-400">K {{ formatNumber(displayTotals.unadjusted_credit) }}</span>
                <span class="text-amber-700 dark:text-amber-400">Penyesuaian</span>
                <span class="text-right font-bold text-amber-700 dark:text-amber-400">D {{ formatNumber(displayTotals.adjustment_debit) }}</span>
                <span class="text-right font-bold text-amber-700 dark:text-amber-400">K {{ formatNumber(displayTotals.adjustment_credit) }}</span>
                <span class="font-black text-gray-800 dark:text-gray-200">Setelah</span>
                <span class="text-right font-black text-emerald-700 dark:text-emerald-400">D {{ formatNumber(displayTotals.adjusted_debit) }}</span>
                <span class="text-right font-black text-red-700 dark:text-red-400">K {{ formatNumber(displayTotals.adjusted_credit) }}</span>
              </div>
            </div>

            <p class="px-1 text-[10px] leading-relaxed text-gray-500 dark:text-gray-400">
              <b>Sebelum</b> = seluruh jurnal sampai akhir periode tanpa AJP periode ini.
              <b>Penyesuaian</b> = jurnal penyesuaian dalam periode.
              <b>Setelah</b> = gabungan keduanya. Ketuk nama akun untuk membuka buku besar.
            </p>
          </div>

          <!-- ==========================================
               Desktop: tabel kertas kerja
               ========================================== -->
          <div class="hidden overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm md:block dark:border-gray-800 dark:bg-gray-900">
            <table class="w-full text-left text-sm">
              <thead class="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
                <tr>
                  <th rowspan="2" class="px-4 py-2 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Akun</th>
                  <th colspan="2" class="border-l border-gray-200 px-4 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:border-gray-700 dark:text-gray-400">Sebelum Penyesuaian</th>
                  <th colspan="2" class="border-l border-gray-200 px-4 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:border-gray-700 dark:text-amber-400">Jurnal Penyesuaian</th>
                  <th colspan="2" class="border-l border-gray-200 px-4 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:border-gray-700 dark:text-gray-400">Setelah Penyesuaian</th>
                </tr>
                <tr class="border-t border-gray-200 dark:border-gray-700">
                  <th class="border-l border-gray-200 px-4 py-1.5 text-right text-[10px] font-bold uppercase text-gray-400 dark:border-gray-700">Debit</th>
                  <th class="px-4 py-1.5 text-right text-[10px] font-bold uppercase text-gray-400">Kredit</th>
                  <th class="border-l border-gray-200 px-4 py-1.5 text-right text-[10px] font-bold uppercase text-amber-500 dark:border-gray-700">Debit</th>
                  <th class="px-4 py-1.5 text-right text-[10px] font-bold uppercase text-amber-500">Kredit</th>
                  <th class="border-l border-gray-200 px-4 py-1.5 text-right text-[10px] font-bold uppercase text-gray-400 dark:border-gray-700">Debit</th>
                  <th class="px-4 py-1.5 text-right text-[10px] font-bold uppercase text-gray-400">Kredit</th>
                </tr>
              </thead>
              <tbody v-for="group in groupedRows" :key="group.type">
                <tr class="bg-gray-50/80 dark:bg-gray-800/50">
                  <td colspan="7" class="px-4 py-1.5 text-[10px] font-black uppercase tracking-wider" :class="typeTextClass(group.type)">
                    {{ group.label }}
                  </td>
                </tr>
                <tr
                  v-for="row in group.rows"
                  :key="row.account_id"
                  class="border-t border-gray-100 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/60"
                  :class="hasAdjustment(row) ? 'bg-amber-50/40 dark:bg-amber-500/[0.03]' : ''"
                >
                  <td class="px-4 py-2">
                    <button
                      @click="router.push(`/finance/ledger?account=${row.account_id}`)"
                      class="text-left"
                    >
                      <span class="block text-xs font-medium text-gray-900 dark:text-white">{{ row.account_name }}</span>
                      <span class="font-mono text-[10px] text-blue-600 dark:text-blue-400">{{ row.account_code }}</span>
                    </button>
                  </td>
                  <td class="border-l border-gray-100 px-4 py-2 text-right text-xs tabular-nums text-gray-700 dark:border-gray-800 dark:text-gray-300">{{ row.unadjusted_debit ? formatNumber(row.unadjusted_debit) : '—' }}</td>
                  <td class="px-4 py-2 text-right text-xs tabular-nums text-gray-700 dark:text-gray-300">{{ row.unadjusted_credit ? formatNumber(row.unadjusted_credit) : '—' }}</td>
                  <td class="border-l border-gray-100 px-4 py-2 text-right text-xs font-semibold tabular-nums text-amber-700 dark:border-gray-800 dark:text-amber-400">{{ row.adjustment_debit ? formatNumber(row.adjustment_debit) : '—' }}</td>
                  <td class="px-4 py-2 text-right text-xs font-semibold tabular-nums text-amber-700 dark:text-amber-400">{{ row.adjustment_credit ? formatNumber(row.adjustment_credit) : '—' }}</td>
                  <td class="border-l border-gray-100 px-4 py-2 text-right text-xs font-bold tabular-nums text-gray-900 dark:border-gray-800 dark:text-white">{{ row.adjusted_debit ? formatNumber(row.adjusted_debit) : '—' }}</td>
                  <td class="px-4 py-2 text-right text-xs font-bold tabular-nums text-gray-900 dark:text-white">{{ row.adjusted_credit ? formatNumber(row.adjusted_credit) : '—' }}</td>
                </tr>
                <tr class="border-t border-gray-200 bg-gray-50/60 dark:border-gray-700 dark:bg-gray-800/40">
                  <td class="px-4 py-1.5 text-[10px] font-bold uppercase text-gray-500 dark:text-gray-400">Subtotal {{ group.label }}</td>
                  <td class="border-l border-gray-100 px-4 py-1.5 text-right text-[11px] font-bold tabular-nums text-gray-700 dark:border-gray-800 dark:text-gray-300">{{ formatNumber(group.totals.unadjusted_debit) }}</td>
                  <td class="px-4 py-1.5 text-right text-[11px] font-bold tabular-nums text-gray-700 dark:text-gray-300">{{ formatNumber(group.totals.unadjusted_credit) }}</td>
                  <td class="border-l border-gray-100 px-4 py-1.5 text-right text-[11px] font-bold tabular-nums text-amber-700 dark:border-gray-800 dark:text-amber-400">{{ formatNumber(group.totals.adjustment_debit) }}</td>
                  <td class="px-4 py-1.5 text-right text-[11px] font-bold tabular-nums text-amber-700 dark:text-amber-400">{{ formatNumber(group.totals.adjustment_credit) }}</td>
                  <td class="border-l border-gray-100 px-4 py-1.5 text-right text-[11px] font-bold tabular-nums text-gray-900 dark:border-gray-800 dark:text-white">{{ formatNumber(group.totals.adjusted_debit) }}</td>
                  <td class="px-4 py-1.5 text-right text-[11px] font-bold tabular-nums text-gray-900 dark:text-white">{{ formatNumber(group.totals.adjusted_credit) }}</td>
                </tr>
              </tbody>
              <tfoot class="border-t-2 border-gray-300 bg-gray-100 dark:border-gray-600 dark:bg-gray-800">
                <tr>
                  <td class="px-4 py-3 text-xs font-black uppercase tracking-wide text-gray-900 dark:text-white">Total</td>
                  <td class="border-l border-gray-200 px-4 py-3 text-right text-xs font-black tabular-nums text-emerald-700 dark:border-gray-700 dark:text-emerald-400">{{ formatNumber(displayTotals.unadjusted_debit) }}</td>
                  <td class="px-4 py-3 text-right text-xs font-black tabular-nums text-red-700 dark:text-red-400">{{ formatNumber(displayTotals.unadjusted_credit) }}</td>
                  <td class="border-l border-gray-200 px-4 py-3 text-right text-xs font-black tabular-nums text-amber-700 dark:border-gray-700 dark:text-amber-400">{{ formatNumber(displayTotals.adjustment_debit) }}</td>
                  <td class="px-4 py-3 text-right text-xs font-black tabular-nums text-amber-700 dark:text-amber-400">{{ formatNumber(displayTotals.adjustment_credit) }}</td>
                  <td class="border-l border-gray-200 px-4 py-3 text-right text-xs font-black tabular-nums text-emerald-700 dark:border-gray-700 dark:text-emerald-400">{{ formatNumber(displayTotals.adjusted_debit) }}</td>
                  <td class="px-4 py-3 text-right text-xs font-black tabular-nums text-red-700 dark:text-red-400">{{ formatNumber(displayTotals.adjusted_credit) }}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </template>
      </template>

      <!-- ============================================================
           TAB: Jurnal Penyesuaian
           ============================================================ -->
      <template v-else>
        <div class="mb-3 flex items-center justify-between gap-2">
          <div class="min-w-0">
            <p class="text-xs font-bold text-gray-900 dark:text-white">Jurnal Penyesuaian</p>
            <p class="text-[10px] text-gray-500 dark:text-gray-400">{{ periodLabel }}</p>
          </div>
          <button
            @click="openAdjustmentForm()"
            class="shrink-0 rounded-xl bg-blue-600 px-3 py-2 text-[11px] font-bold text-white hover:bg-blue-500"
          >
            + Tambah
          </button>
        </div>

        <!-- Empty -->
        <div v-if="adjustments.length === 0" class="rounded-2xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-gray-900">
          <div class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10">
            <svg class="h-6 w-6 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
          <p class="text-sm font-bold text-gray-900 dark:text-white">Belum ada jurnal penyesuaian</p>
          <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Catat penyesuaian seperti beban yang masih harus dibayar, penyusutan, atau pemakaian perlengkapan.
          </p>
          <button
            @click="openAdjustmentForm()"
            class="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-500"
          >
            + Buat Jurnal Penyesuaian
          </button>
        </div>

        <!-- List -->
        <div v-else class="space-y-2.5">
          <div
            v-for="journal in adjustments"
            :key="journal.id"
            class="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900"
          >
            <div class="flex items-start justify-between gap-2 border-b border-gray-100 px-3 py-2.5 dark:border-gray-800">
              <div class="min-w-0">
                <p class="text-[11px] font-bold leading-snug text-gray-900 dark:text-white">{{ journal.description }}</p>
                <p class="mt-0.5 font-mono text-[9px] text-blue-600 dark:text-blue-400">{{ journal.journal_number }}</p>
                <p class="text-[9px] text-gray-500 dark:text-gray-400">{{ formatDate(journal.entry_date) }}</p>
              </div>
              <button
                @click="handleDeleteAdjustment(journal)"
                class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-red-500 transition hover:bg-red-50 active:scale-95 dark:hover:bg-red-500/10"
                title="Hapus jurnal penyesuaian"
              >
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>

            <table class="w-full table-fixed">
              <colgroup>
                <col />
                <col class="w-[80px]" />
                <col class="w-[80px]" />
              </colgroup>
              <thead>
                <tr class="bg-gray-50 dark:bg-gray-800/60">
                  <th class="px-3 py-1.5 text-left text-[9px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Akun</th>
                  <th class="px-2 py-1.5 text-right text-[9px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Debit</th>
                  <th class="px-3 py-1.5 text-right text-[9px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Kredit</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="line in journal.lines || []"
                  :key="line.id"
                  class="border-t border-gray-100 dark:border-gray-800"
                >
                  <td class="px-3 py-1.5 align-top">
                    <p class="text-[10px] font-medium leading-tight text-gray-900 dark:text-white line-clamp-2">{{ line.account_name }}</p>
                    <p class="font-mono text-[9px] leading-tight text-blue-600 dark:text-blue-400">{{ line.account_code }}</p>
                  </td>
                  <td class="px-2 py-1.5 text-right align-top text-[10px] font-bold tabular-nums" :class="line.debit ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-300 dark:text-gray-600'">
                    {{ line.debit ? formatNumber(line.debit) : '—' }}
                  </td>
                  <td class="px-3 py-1.5 text-right align-top text-[10px] font-bold tabular-nums" :class="line.credit ? 'text-red-600 dark:text-red-400' : 'text-gray-300 dark:text-gray-600'">
                    {{ line.credit ? formatNumber(line.credit) : '—' }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </template>
    </template>

    <!-- ============================================================
         Sheet: Form Jurnal Penyesuaian
         ============================================================ -->
    <div
      v-if="showAdjustmentForm"
      class="fixed inset-0 z-50 flex items-end justify-center bg-black/50 md:items-center"
      @click.self="closeAdjustmentForm"
    >
      <div
        class="flex max-h-[92vh] w-full max-w-2xl flex-col rounded-t-3xl bg-white md:rounded-2xl dark:bg-gray-900"
        @click.stop
      >
        <!-- Header -->
        <div class="flex items-start justify-between gap-3 border-b border-gray-200 px-4 py-3 dark:border-gray-800">
          <div class="min-w-0">
            <h3 class="text-base font-extrabold text-gray-900 dark:text-white">Jurnal Penyesuaian</h3>
            <p class="text-[10px] text-gray-500 dark:text-gray-400">Adjusting Journal Entry (AJP)</p>
          </div>
          <button
            @click="closeAdjustmentForm"
            class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Body -->
        <div class="flex-1 space-y-3 overflow-y-auto px-4 py-3">
          <!-- Tanggal -->
          <div>
            <label class="mb-1 block text-[11px] font-semibold text-gray-700 dark:text-gray-300">
              Tanggal Penyesuaian <span class="text-red-500">*</span>
            </label>
            <DateField
              v-model="form.entry_date"
              title="Tanggal Penyesuaian"
              button-class="flex w-full items-center justify-between rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
            <p v-if="periodStart || periodEnd" class="mt-1 text-[9px] text-gray-500 dark:text-gray-400">
              Harus di dalam periode {{ periodLabel }}.
            </p>
          </div>

          <!-- Keterangan -->
          <div>
            <label class="mb-1 block text-[11px] font-semibold text-gray-700 dark:text-gray-300">
              Keterangan <span class="text-red-500">*</span>
            </label>
            <input
              v-model="form.description"
              type="text"
              placeholder="contoh: Penyusutan peralatan bulan November"
              class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500"
            />
          </div>

          <!-- Baris akun -->
          <div class="rounded-xl border border-gray-200 bg-gray-50/60 p-2.5 dark:border-gray-700 dark:bg-gray-800/40">
            <div class="mb-2 flex items-center justify-between">
              <p class="text-[11px] font-bold text-gray-800 dark:text-gray-200">Baris Debit &amp; Kredit</p>
              <button
                @click="addLine"
                class="rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-[10px] font-bold text-blue-600 active:scale-95 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-400"
              >
                + Baris
              </button>
            </div>

            <div class="space-y-2">
              <div
                v-for="(line, index) in form.lines"
                :key="index"
                class="rounded-xl border border-gray-200 bg-white p-2 dark:border-gray-700 dark:bg-gray-900"
              >
                <div class="flex items-start gap-1.5">
                  <div class="min-w-0 flex-1">
                    <SelectField
                      v-model="line.account_id"
                      :options="accountOptions"
                      title="Pilih Akun"
                      placeholder="Pilih akun..."
                      searchable
                      search-placeholder="Cari akun..."
                      button-class="flex w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-2.5 py-2 text-[11px] text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    />
                  </div>
                  <button
                    @click="removeLine(index)"
                    :disabled="form.lines.length === 1"
                    class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-400 disabled:opacity-40 dark:border-gray-700"
                    title="Hapus baris"
                  >
                    <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div class="mt-1.5 flex items-center gap-1.5">
                  <div class="w-[86px] shrink-0">
                    <SelectField
                      v-model="line.mode"
                      :options="modeOptions"
                      title="Posisi"
                      :button-class="[
                        'flex w-full items-center justify-between rounded-lg border px-2 py-2 text-[11px] font-bold',
                        line.mode === 'debit'
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400'
                          : 'border-red-300 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400',
                      ].join(' ')"
                    />
                  </div>
                  <CurrencyInput
                    v-model="line.amount"
                    placeholder="Nominal"
                    class="min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-2.5 py-2 text-right text-xs font-semibold tabular-nums text-gray-900 placeholder:text-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- Ringkasan -->
          <div class="rounded-xl border border-gray-200 bg-gray-50 p-2.5 dark:border-gray-700 dark:bg-gray-800/60">
            <div class="grid grid-cols-3 gap-2">
              <div>
                <p class="text-[9px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Debit</p>
                <p class="mt-0.5 text-[11px] font-black tabular-nums text-emerald-600 dark:text-emerald-400">{{ formatCurrency(totalDebit) }}</p>
              </div>
              <div>
                <p class="text-[9px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Kredit</p>
                <p class="mt-0.5 text-[11px] font-black tabular-nums text-red-600 dark:text-red-400">{{ formatCurrency(totalCredit) }}</p>
              </div>
              <div>
                <p class="text-[9px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Status</p>
                <p class="mt-0.5 flex items-center gap-1 text-[10px] font-bold" :class="balanceStatus.textClass">
                  <span class="h-1.5 w-1.5 shrink-0 rounded-full" :class="balanceStatus.dotClass"></span>
                  {{ balanceStatus.label }}
                </p>
              </div>
            </div>
            <p v-if="selisih > 0" class="mt-1.5 border-t border-gray-200 pt-1.5 text-[10px] font-medium text-amber-700 dark:border-gray-700 dark:text-amber-400">
              Selisih debit-kredit: {{ formatCurrency(selisih) }}
            </p>
          </div>

          <div v-if="formError" class="rounded-xl border border-red-200 bg-red-50 p-2.5 dark:border-red-500/30 dark:bg-red-500/10">
            <p class="text-[11px] text-red-600 dark:text-red-400">{{ formError }}</p>
          </div>
        </div>

        <!-- Footer -->
        <div class="flex gap-2 border-t border-gray-200 px-4 py-3 dark:border-gray-800">
          <button
            @click="closeAdjustmentForm"
            class="flex-1 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Batal
          </button>
          <button
            @click="handleSubmit"
            :disabled="saving"
            class="flex flex-[2] items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span v-if="saving" class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
            {{ saving ? 'Menyimpan...' : 'Posting Penyesuaian' }}
          </button>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import MobilePageHeader from '@/components/common/MobilePageHeader.vue'
import DateField from '@/components/common/DateField.vue'
import DateRangeField from '@/components/common/DateRangeField.vue'
import SelectField from '@/components/common/SelectField.vue'
import CurrencyInput from '@/components/common/CurrencyInput.vue'
import { useFinanceStore } from '@/stores/finance'
import { useAutoNavigationStack } from '@/composables/useAutoNavigationStack'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'
import { localDateStr, localTodayStr, parseBusinessDate } from '@/utils/date'
import type {
  JournalEntry,
  TrialBalanceRow,
  TrialBalanceWorksheet,
} from '@/types/database'

const router = useRouter()
const store = useFinanceStore()
const toast = useToast()
const { confirm } = useConfirm()

// ============================================================
// Periode
// ============================================================
const today = localTodayStr()
const periodStart = ref(`${today.slice(0, 7)}-01`)
const periodEnd = ref(today)

const periodPresets = [
  { key: 'thisMonth', label: 'Bulan Ini' },
  { key: 'lastMonth', label: 'Bulan Lalu' },
  { key: 'thisYear', label: 'Tahun Ini' },
  { key: 'all', label: 'Semua' },
] as const

const applyPreset = (key: (typeof periodPresets)[number]['key']) => {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  if (key === 'thisMonth') {
    periodStart.value = localDateStr(new Date(y, m, 1))
    periodEnd.value = localTodayStr()
  } else if (key === 'lastMonth') {
    periodStart.value = localDateStr(new Date(y, m - 1, 1))
    periodEnd.value = localDateStr(new Date(y, m, 0))
  } else if (key === 'thisYear') {
    periodStart.value = localDateStr(new Date(y, 0, 1))
    periodEnd.value = localTodayStr()
  } else {
    periodStart.value = ''
    periodEnd.value = ''
  }
}

const activePreset = computed(() => {
  for (const preset of periodPresets) {
    const now = new Date()
    const y = now.getFullYear()
    const m = now.getMonth()
    let s = ''
    let e = ''
    if (preset.key === 'thisMonth') {
      s = localDateStr(new Date(y, m, 1))
      e = localTodayStr()
    } else if (preset.key === 'lastMonth') {
      s = localDateStr(new Date(y, m - 1, 1))
      e = localDateStr(new Date(y, m, 0))
    } else if (preset.key === 'thisYear') {
      s = localDateStr(new Date(y, 0, 1))
      e = localTodayStr()
    }
    if (s === periodStart.value && e === periodEnd.value) return preset.key
  }
  return ''
})

const periodLabel = computed(() => {
  if (!periodStart.value && !periodEnd.value) return 'Semua periode'
  if (periodStart.value && periodEnd.value) {
    return `${formatDate(periodStart.value)} – ${formatDate(periodEnd.value)}`
  }
  if (periodEnd.value) return `Sampai ${formatDate(periodEnd.value)}`
  return `Sejak ${formatDate(periodStart.value)}`
})

// ============================================================
// Data
// ============================================================
const loading = ref(false)
const error = ref<string | null>(null)
const worksheet = ref<TrialBalanceWorksheet | null>(null)
const tab = ref<'worksheet' | 'adjustments'>('worksheet')

const adjustments = computed<JournalEntry[]>(() => worksheet.value?.adjustments || [])

// Anti race-condition
let fetchSeq = 0
const fetchData = async () => {
  const seq = ++fetchSeq
  loading.value = true
  error.value = null
  try {
    const result = await store.getTrialBalanceWorksheet(
      periodStart.value || undefined,
      periodEnd.value || undefined
    )
    if (seq !== fetchSeq) return
    worksheet.value = result
  } catch (e) {
    if (seq !== fetchSeq) return
    error.value = e instanceof Error ? e.message : 'Gagal memuat neraca saldo'
  } finally {
    if (seq === fetchSeq) loading.value = false
  }
}

// ============================================================
// Filter tipe & grouping
// ============================================================
const typeFilter = ref<'all' | 'aset' | 'kewajiban' | 'ekuitas' | 'pendapatan' | 'beban'>('all')
const typeFilterOptions = [
  { label: 'Semua', value: 'all' },
  { label: 'Aset', value: 'aset' },
  { label: 'Kewajiban', value: 'kewajiban' },
  { label: 'Ekuitas', value: 'ekuitas' },
  { label: 'Pendapatan', value: 'pendapatan' },
  { label: 'Beban', value: 'beban' },
] as const

const TYPE_ORDER = ['aset', 'kewajiban', 'ekuitas', 'pendapatan', 'beban'] as const
const TYPE_LABELS: Record<string, string> = {
  aset: 'Aset',
  kewajiban: 'Kewajiban',
  ekuitas: 'Ekuitas',
  pendapatan: 'Pendapatan',
  beban: 'Beban',
}

const filteredRows = computed<TrialBalanceRow[]>(() => {
  const rows = worksheet.value?.rows || []
  return typeFilter.value === 'all'
    ? rows
    : rows.filter((r) => r.account_type === typeFilter.value)
})

const groupedRows = computed(() =>
  TYPE_ORDER.map((type) => {
    const rows = filteredRows.value.filter((r) => r.account_type === type)
    return {
      type,
      label: TYPE_LABELS[type],
      rows,
      totals: groupTotals(rows),
    }
  }).filter((g) => g.rows.length > 0)
)

const typeFilterLabel = computed(() =>
  typeFilter.value === 'all' ? '' : TYPE_LABELS[typeFilter.value]
)

const groupTotals = (rows: TrialBalanceRow[]) =>
  rows.reduce(
    (t, r) => ({
      unadjusted_debit: t.unadjusted_debit + r.unadjusted_debit,
      unadjusted_credit: t.unadjusted_credit + r.unadjusted_credit,
      adjustment_debit: t.adjustment_debit + r.adjustment_debit,
      adjustment_credit: t.adjustment_credit + r.adjustment_credit,
      adjusted_debit: t.adjusted_debit + r.adjusted_debit,
      adjusted_credit: t.adjusted_credit + r.adjusted_credit,
    }),
    {
      unadjusted_debit: 0,
      unadjusted_credit: 0,
      adjustment_debit: 0,
      adjustment_credit: 0,
      adjusted_debit: 0,
      adjusted_credit: 0,
    }
  )

const displayTotals = computed(() => groupTotals(filteredRows.value))

const adjustedTotals = computed(() => ({
  debit: worksheet.value?.totals.adjusted_debit || 0,
  credit: worksheet.value?.totals.adjusted_credit || 0,
}))

const adjustedBalanced = computed(
  () => Math.abs(adjustedTotals.value.debit - adjustedTotals.value.credit) < 0.51
)

const hasAdjustment = (row: TrialBalanceRow) =>
  row.adjustment_debit !== 0 || row.adjustment_credit !== 0

// ============================================================
// Format
// ============================================================
const formatNumber = (value: number) =>
  new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(value || 0)

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value || 0)

const formatDate = (dateStr: string) => {
  if (!dateStr) return ''
  // Tanggal bisnis = bagian tanggal UTC (lihat parseBusinessDate).
  const d = parseBusinessDate(dateStr)
  if (!d) return dateStr.slice(0, 10)
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

const typeTextClass = (type: string) => {
  const classes: Record<string, string> = {
    aset: 'text-blue-600 dark:text-blue-400',
    kewajiban: 'text-amber-600 dark:text-amber-400',
    ekuitas: 'text-purple-600 dark:text-purple-400',
    pendapatan: 'text-emerald-600 dark:text-emerald-400',
    beban: 'text-red-600 dark:text-red-400',
  }
  return classes[type] || 'text-gray-600 dark:text-gray-400'
}

// ============================================================
// Form jurnal penyesuaian
// ============================================================
type LineMode = 'debit' | 'kredit'
interface AdjLine {
  account_id: string
  mode: LineMode
  amount: number | null
}

const showAdjustmentForm = ref(false)
useAutoNavigationStack(showAdjustmentForm, 'adjustment-form-sheet')

const saving = ref(false)
const formError = ref<string | null>(null)
const form = ref<{ entry_date: string; description: string; lines: AdjLine[] }>({
  entry_date: periodEnd.value || localTodayStr(),
  description: '',
  lines: [{ account_id: '', mode: 'debit', amount: null }],
})

const modeOptions = [
  { label: 'Debit', value: 'debit' },
  { label: 'Kredit', value: 'kredit' },
]

const accountOptions = computed(() =>
  store.accounts
    .filter((acc) => acc.is_active)
    .map((acc) => ({ label: `${acc.code} — ${acc.name}`, value: acc.id }))
)

const openAdjustmentForm = (accountId?: string) => {
  form.value = {
    entry_date: periodEnd.value || localTodayStr(),
    description: '',
    lines: [{ account_id: accountId || '', mode: 'debit', amount: null }],
  }
  formError.value = null
  showAdjustmentForm.value = true
}

const closeAdjustmentForm = () => {
  showAdjustmentForm.value = false
}

const addLine = () => {
  form.value.lines.push({ account_id: '', mode: 'debit', amount: null })
}

const removeLine = (index: number) => {
  if (form.value.lines.length === 1) return
  form.value.lines.splice(index, 1)
}

const totalDebit = computed(() =>
  form.value.lines.reduce((s, l) => s + (l.mode === 'debit' ? l.amount || 0 : 0), 0)
)
const totalCredit = computed(() =>
  form.value.lines.reduce((s, l) => s + (l.mode === 'kredit' ? l.amount || 0 : 0), 0)
)
const selisih = computed(() => Math.abs(totalDebit.value - totalCredit.value))

const balanceStatus = computed(() => {
  if (totalDebit.value === 0 && totalCredit.value === 0) {
    return {
      label: 'Belum terisi',
      textClass: 'text-gray-500 dark:text-gray-400',
      dotClass: 'bg-gray-400',
    }
  }
  if (selisih.value < 0.01) {
    return {
      label: 'Seimbang',
      textClass: 'text-emerald-600 dark:text-emerald-400',
      dotClass: 'bg-emerald-500',
    }
  }
  return {
    label: 'Tidak seimbang',
    textClass: 'text-red-600 dark:text-red-400',
    dotClass: 'bg-red-500',
  }
})

const handleSubmit = async () => {
  formError.value = null

  if (!form.value.entry_date) {
    formError.value = 'Tanggal penyesuaian wajib diisi'
    return
  }
  const chosen = form.value.entry_date
  if (periodStart.value && chosen < periodStart.value) {
    formError.value = `Tanggal harus di dalam periode (mulai ${formatDate(periodStart.value)})`
    return
  }
  if (periodEnd.value && chosen > periodEnd.value) {
    formError.value = `Tanggal harus di dalam periode (sampai ${formatDate(periodEnd.value)})`
    return
  }
  if (!form.value.description.trim()) {
    formError.value = 'Keterangan wajib diisi'
    return
  }

  const filled = form.value.lines.filter((l) => l.account_id)
  if (filled.length === 0) {
    formError.value = 'Minimal satu baris dengan akun dipilih'
    return
  }
  if (filled.some((l) => !l.amount || l.amount <= 0)) {
    formError.value = 'Setiap baris harus memiliki nominal lebih dari 0'
    return
  }
  if (totalDebit.value <= 0 || totalCredit.value <= 0) {
    formError.value = 'Jurnal harus memiliki minimal satu sisi debit dan satu sisi kredit'
    return
  }
  if (selisih.value >= 0.01) {
    formError.value = `Total debit harus sama dengan total kredit (selisih ${formatCurrency(selisih.value)})`
    return
  }

  // Periode yang sudah ditutup tidak boleh menerima jurnal penyesuaian
  try {
    if (await store.checkPeriodClosed(chosen)) {
      formError.value = `Periode tanggal ${chosen} sudah ditutup. Buka kembali periode tersebut di menu Tutup Buku jika perlu mencatat penyesuaian.`
      toast.error('Periode Tertutup', 'Tanggal penyesuaian berada di periode yang sudah ditutup.')
      return
    }
  } catch {
    // Pengecekan gagal — biarkan server menolak bila perlu.
  }

  saving.value = true
  try {
    await store.postAdjustingJournal({
      entry_date: chosen,
      description: form.value.description.trim(),
      lines: filled.map((l) => ({
        account_id: l.account_id,
        debit: l.mode === 'debit' ? l.amount || 0 : 0,
        credit: l.mode === 'kredit' ? l.amount || 0 : 0,
      })),
    })
    toast.success('Berhasil!', 'Jurnal penyesuaian berhasil diposting')
    showAdjustmentForm.value = false
    tab.value = 'adjustments'
    await fetchData()
  } catch (e) {
    formError.value = e instanceof Error ? e.message : 'Gagal menyimpan jurnal penyesuaian'
  } finally {
    saving.value = false
  }
}

const handleDeleteAdjustment = async (journal: JournalEntry) => {
  // Jurnal penyesuaian di periode tertutup tidak boleh dihapus
  try {
    const date = String(journal.entry_date || '').slice(0, 10)
    if (date && (await store.checkPeriodClosed(date))) {
      toast.error(
        'Periode Tertutup',
        `Jurnal ini berada di periode yang sudah ditutup (${date}). Buka kembali periode tersebut terlebih dahulu.`
      )
      return
    }
  } catch {
    // Pengecekan gagal — biarkan server menolak bila perlu.
  }

  const confirmed = await confirm({
    title: 'Hapus Jurnal Penyesuaian?',
    message: `Hapus "${journal.description}"?\n\nSaldo setelah penyesuaian akan dihitung ulang.`,
    confirmText: 'Ya, Hapus',
    cancelText: 'Batal',
    variant: 'danger',
  })
  if (!confirmed) return

  try {
    await store.deleteJournal(journal.id)
    toast.success('Berhasil', 'Jurnal penyesuaian dihapus')
    await fetchData()
  } catch (e) {
    toast.error('Gagal Menghapus', e instanceof Error ? e.message : 'Terjadi kesalahan')
  }
}

// ============================================================
// Lifecycle
// ============================================================
watch([periodStart, periodEnd], () => {
  fetchData()
})

onMounted(async () => {
  try {
    if (store.accounts.length === 0) {
      await store.fetchAccounts()
    }
  } catch {
    // Akun gagal dimuat tidak menghalangi tampilan kertas kerja.
  }
  await fetchData()
})
</script>
