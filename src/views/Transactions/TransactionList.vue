<template>
  <AdminLayout>
    <PageBreadcrumb pageTitle="Daftar Transaksi" class="hidden md:block" />

    <!-- Mobile Header -->
    <MobilePageHeader title="Daftar Transaksi" :subtitle="transactionsStore.paginationTotal + ' Transaksi'">
      <template #actions>
        <button
          @click="addTransaction"
          class="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm hover:bg-blue-500 active:scale-95"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </template>
    </MobilePageHeader>

    <!-- Mobile Search & Filter -->
    <div class="space-y-2 pt-2 pb-1 md:hidden">
      <!-- Search Bar -->
      <div class="relative">
        <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Cari no. transaksi, customer, metode..."
          class="w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder-gray-400"
        />
        <button
          v-if="searchQuery"
          @click="searchQuery = ''"
          class="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Filter Buttons -->
      <div class="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        <!-- Buka modal filter lengkap -->
        <button
          @click="showFilterModal = true"
          :class="[
            'relative flex flex-shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-medium transition-colors',
            mobileAdvancedFilterCount > 0
              ? 'border-brand-500 bg-brand-500 text-white'
              : 'border-gray-300 bg-white text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300'
          ]"
        >
          <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          Filter
          <span
            v-if="mobileAdvancedFilterCount > 0"
            class="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-error-500 text-[9px] font-bold text-white"
          >
            {{ mobileAdvancedFilterCount }}
          </span>
        </button>

        <span class="h-4 w-px flex-shrink-0 bg-gray-200 dark:bg-gray-700"></span>

        <!-- Status transaksi (dropdown) -->
        <div class="flex-shrink-0 w-36">
          <SelectField
            v-model="transactionStatusFilter"
            :options="transactionStatusOptions"
            title="Pilih Status Transaksi"
            placeholder="Semua Status"
            button-class="flex w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-[11px] font-medium text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
          />
        </div>

        <span class="h-4 w-px flex-shrink-0 bg-gray-200 dark:bg-gray-700"></span>

        <!-- Status pembayaran -->
        <button
          v-for="opt in paymentOptions"
          :key="'pm-' + opt.value"
          @click="paymentFilter = opt.value"
          :class="[
            'flex-shrink-0 rounded-lg border px-3 py-1.5 text-[11px] font-medium transition-colors',
            paymentFilter === opt.value
              ? 'border-brand-500 bg-brand-500 text-white'
              : 'border-gray-300 bg-white text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300'
          ]"
        >
          {{ opt.label }}
        </button>
      </div>

      <!-- Chip filter aktif dari modal -->
      <div v-if="activeFilterChips.length" class="flex flex-wrap gap-1.5">
        <button
          v-for="chip in activeFilterChips"
          :key="chip.key"
          @click="removeFilterChip(chip.key)"
          class="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-[10px] font-medium text-brand-700 dark:bg-brand-500/10 dark:text-brand-400"
        >
          {{ chip.label }}
          <svg class="h-2.5 w-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <button
          @click="clearModalFilters"
          class="inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-medium text-gray-500 underline decoration-dotted dark:text-gray-400"
        >
          Hapus semua
        </button>
      </div>
    </div>

    <!-- Mobile Cards -->
    <div class="space-y-3 pb-4 md:hidden">
      <div
        v-for="transaction in displayTransactions"
        :key="transaction.id"
        class="rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm dark:border-gray-800 dark:bg-gray-900"
      >
        <div class="flex items-start justify-between">
          <div class="flex-1 min-w-0" @click="viewTransaction(transaction)">
            <p class="text-xs font-bold text-blue-600 dark:text-blue-400">{{ transaction.transaction_number }}</p>
            <p class="text-[10px] text-gray-500 dark:text-gray-400">{{ formatDate(transaction.created_at) }}</p>
          </div>
          <div class="flex items-center gap-1.5 flex-shrink-0">
            <!-- Status Pembayaran -->
            <span
              :class="[
                'rounded-full px-2 py-0.5 text-[10px] font-medium',
                transaction.payment_status === 'lunas'
                  ? 'bg-success-100 text-success-700 dark:bg-success-900 dark:text-success-400'
                  : 'bg-warning-100 text-warning-700 dark:bg-warning-900 dark:text-warning-400'
              ]"
            >
              {{ transaction.payment_status === 'lunas' ? 'Lunas' : 'Belum Lunas' }}
            </span>
            <!-- Status Pengiriman (jika tidak batal) -->
            <span
              v-if="transaction.status !== 'void' && transaction.status !== 'batal'"
              :class="[
                'rounded-full px-2 py-0.5 text-[10px] font-medium',
                transactionStatusBadge(transaction.transaction_status).class
              ]"
            >
              {{ transactionStatusBadge(transaction.transaction_status).label }}
            </span>
            <!-- Status Batal -->
            <span
              v-else
              class="rounded-full bg-error-100 px-2 py-0.5 text-[10px] font-medium text-error-700 dark:bg-error-900 dark:text-error-400"
            >
              Batal
            </span>
            <button
              @click.stop="toggleExpand(transaction.id)"
              class="rounded-lg p-1 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              <svg
                class="h-4 w-4 transition-transform"
                :class="{ 'rotate-180': expandedCards.includes(transaction.id) }"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Collapsed View -->
        <div v-if="!expandedCards.includes(transaction.id)" @click="viewTransaction(transaction)" class="mt-2">
          <div class="flex items-center justify-between">
            <p class="text-xs font-medium text-gray-900 dark:text-white">{{ transaction.customer_name || 'Tanpa customer' }}</p>
            <p class="text-sm font-bold text-gray-900 dark:text-white">{{ formatCurrency(transaction.total) }}</p>
          </div>
        </div>

        <!-- Expanded View -->
        <div v-else class="mt-2 space-y-2">
          <div class="border-t border-gray-100 pt-2 dark:border-gray-800">
            <p class="text-xs font-medium text-gray-900 dark:text-white">{{ transaction.customer_name || 'Tanpa customer' }}</p>
            <p class="text-[10px] text-gray-500 dark:text-gray-400">{{ formatPaymentMethod(transaction.payment_method) }}</p>
          </div>

          <div class="flex items-center justify-between border-t border-gray-100 pt-2 dark:border-gray-800">
            <div>
              <p class="text-[10px] text-gray-500 dark:text-gray-400">Total</p>
              <p class="text-sm font-bold text-gray-900 dark:text-white">{{ formatCurrency(transaction.total) }}</p>
            </div>
            <div class="text-right">
              <span
                :class="[
                  'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium',
                  transaction.payment_status === 'lunas'
                    ? 'bg-success-100 text-success-700 dark:bg-success-900 dark:text-success-400'
                    : 'bg-warning-100 text-warning-700 dark:bg-warning-900 dark:text-warning-400'
                ]"
              >
                {{ transaction.payment_status === 'lunas' ? 'Lunas' : 'Belum Lunas' }}
              </span>
              <p v-if="transaction.remaining_amount > 0" class="mt-1 text-xs font-medium text-warning-600 dark:text-warning-400">
                Sisa: {{ formatCurrency(transaction.remaining_amount) }}
              </p>
            </div>
          </div>

          <!-- Status Transaksi (ubah status) -->
          <div v-if="transaction.status !== 'void' && transaction.status !== 'batal'" class="border-t border-gray-100 pt-2 dark:border-gray-800">
            <div class="mb-1 flex items-center justify-between">
              <label class="block text-[10px] text-gray-500 dark:text-gray-400">Status Transaksi</label>
              <span
                v-if="lockedShippingTxIds.has(transaction.id)"
                class="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[9px] font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400"
              >
                <svg class="h-2.5 w-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Terkunci — surat jalan selesai
              </span>
            </div>
            <SelectField
              :model-value="transaction.transaction_status ?? 'disiapkan'"
              :options="[
                { label: 'Disiapkan', value: 'disiapkan' },
                { label: 'Dikirim', value: 'dikirim' },
                { label: 'Selesai', value: 'selesai' },
              ]"
              title="Pilih Status Transaksi"
              :disabled="statusUpdatingId === transaction.id || lockedShippingTxIds.has(transaction.id)"
              button-class="flex w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              @update:model-value="(value) => changeTransactionStatus(transaction, value as TransactionStatus)"
            />
          </div>

          <div class="flex items-center gap-2 border-t border-gray-100 pt-2 dark:border-gray-800">
            <button
              @click.stop="viewTransaction(transaction)"
              class="flex flex-1 items-center justify-center gap-1 rounded-lg border border-gray-300 bg-white py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Detail
            </button>
            <button
              v-if="transaction.status === 'selesai'"
              @click.stop="deleteTransaction(transaction)"
              class="flex flex-1 items-center justify-center gap-1 rounded-lg border border-error-500 bg-transparent py-1.5 text-xs font-medium text-error-600 hover:bg-error-50 dark:text-error-400 dark:hover:bg-error-500/15"
            >
              <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Hapus
            </button>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="displayTransactions.length === 0 && !isLoading" class="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center dark:border-gray-700 dark:bg-gray-800">
        <template v-if="hasActiveFilter">
          <p class="text-xs font-medium text-gray-500 dark:text-gray-400">Tidak ada transaksi yang cocok</p>
          <button
            @click="clearFilters"
            class="mt-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-[11px] font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
          >
            Reset Filter
          </button>
        </template>
        <template v-else>
          <p class="text-xs font-medium text-gray-500 dark:text-gray-400">Belum ada transaksi</p>
          <p class="text-[10px] text-gray-400 dark:text-gray-500">Klik "Transaksi Baru" untuk membuat transaksi pertama</p>
        </template>
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
        <button
          @click="fetchData(currentPage - 1)"
          :disabled="currentPage === 1"
          class="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed dark:text-gray-300 dark:hover:bg-gray-800"
        >
          <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
          Prev
        </button>
        <span class="text-xs font-medium text-gray-600 dark:text-gray-400">
          Hal {{ currentPage }} dari {{ totalPages }} ({{ transactionsStore.paginationTotal }} transaksi)
        </span>
        <button
          @click="fetchData(currentPage + 1)"
          :disabled="currentPage === totalPages"
          class="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed dark:text-gray-300 dark:hover:bg-gray-800"
        >
          Next
          <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Desktop DataTable -->
    <div class="hidden space-y-6 px-4 md:block md:px-0">
      <!-- Desktop Search & Filter -->
      <div class="flex items-center gap-4">
        <div class="relative w-72">
          <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Cari no. transaksi, customer..."
            class="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400"
          />
        </div>
        <div class="flex items-center gap-2">
          <SelectField
            v-model="transactionStatusFilter"
            :options="transactionStatusOptions"
            title="Pilih Status Transaksi"
            placeholder="Semua Status"
            button-class="flex items-center justify-between rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
          />
        </div>
        <div class="flex items-center gap-2">
          <button
            v-for="opt in paymentOptions"
            :key="'pm-' + opt.value"
            @click="paymentFilter = opt.value"
            :class="[
              'rounded-lg border px-4 py-2 text-sm font-medium transition-colors',
              paymentFilter === opt.value
                ? 'border-brand-500 bg-brand-500 text-white'
                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400'
            ]"
          >
            {{ opt.label }}
          </button>
        </div>
        <button
          v-if="hasActiveFilter"
          @click="clearFilters"
          class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
        >
          Reset
        </button>
      </div>

      <!-- DataTable -->
      <DataTable
        :columns="columns"
        :data="displayTransactions"
        :per-page="PER_PAGE"
        :searchable="false"
        :show-add-button="true"
        add-button-text="Transaksi Baru"
        title="Daftar Transaksi"
        :subtitle="`${settingsStore.storeSubtitle} - ${transactionsStore.paginationTotal} Transaksi`"
        :show-import-button="true"
        @add-click="addTransaction"
        @import-click="showImportModal = true"
        @menu-action="handleMenuAction"
      >
        <template #header-checkbox>
          <div class="flex items-center gap-2">
            <input
              ref="selectAllCheckbox"
              type="checkbox"
              :checked="allSelected"
              @change="toggleSelectAll"
              class="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
            />
          </div>
        </template>

        <template #mobile-header>
          <div class="flex items-center gap-3">
            <input
              type="checkbox"
              :checked="allSelected"
              @change="toggleSelectAll"
              class="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
            />
            <span class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              No. Transaksi
            </span>
          </div>
        </template>

        <template #cell-checkbox="{ row }">
          <input
            type="checkbox"
            v-model="selectedTransactions"
            :value="row.id"
            class="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
          />
        </template>

        <template #actions>
          <div v-if="selectedTransactions.length > 0" class="flex items-center gap-2">
            <span class="text-sm text-gray-600 dark:text-gray-400">
              {{ selectedTransactions.length }} dipilih
            </span>
            <button
              @click="bulkDelete"
              class="rounded-lg bg-error-500 px-4 py-2 text-sm font-medium text-white hover:bg-error-600"
            >
              Hapus
            </button>
          </div>
        </template>

        <template #cell-transaction_number="{ value }">
          <span class="font-medium text-brand-600 dark:text-brand-400">{{ value }}</span>
        </template>

        <template #cell-customer_name="{ value }">
          <span v-if="value" class="text-gray-800 dark:text-white/90">{{ value }}</span>
          <span v-else class="text-gray-400 dark:text-gray-600">-</span>
        </template>

        <template #cell-total="{ value }">
          <span class="font-medium text-gray-900 dark:text-white">{{ formatCurrency(value) }}</span>
        </template>

        <template #cell-payment_method="{ row }">
          <div class="flex flex-col gap-1 items-end md:items-start">
            <span class="text-gray-800 dark:text-white/90">{{ formatPaymentMethod(row.payment_method) }}</span>
            <span
              :class="[
                'inline-flex w-fit items-center rounded-full px-2 py-0.5 text-[10px] font-medium',
                row.payment_status === 'lunas'
                  ? 'bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-400'
                  : 'bg-warning-50 text-warning-600 dark:bg-warning-500/10 dark:text-warning-400'
              ]"
            >
              {{ row.payment_status === 'lunas' ? 'Lunas' : 'Belum Lunas' }}
            </span>
          </div>
        </template>

        <template #cell-remaining_amount="{ value, row }">
          <span v-if="row.remaining_amount > 0" class="font-medium text-warning-600 dark:text-warning-400">
            {{ formatCurrency(value) }}
          </span>
          <span v-else class="text-gray-400 dark:text-gray-600">-</span>
        </template>

        <template #cell-status="{ value }">
          <span
            :class="[
              'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
              value === 'selesai'
                ? 'bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-400'
                : 'bg-error-50 text-error-600 dark:bg-error-500/10 dark:text-error-400'
            ]"
          >
            {{ value === 'selesai' ? 'Selesai' : 'Batal' }}
          </span>
        </template>

        <template #cell-created_at="{ value }">
          <span class="text-gray-600 dark:text-gray-400">{{ formatDate(value) }}</span>
        </template>

        <template #mobile-summary="{ row }">
          <div class="flex items-center gap-3 min-w-0 flex-1">
            <input
              type="checkbox"
              v-model="selectedTransactions"
              :value="row.id"
              class="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500 flex-shrink-0"
              @click.stop
            />
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium text-gray-900 truncate dark:text-white">
                {{ row.transaction_number }}
              </p>
              <p class="text-xs text-gray-500 truncate dark:text-gray-400">
                {{ row.customer_name || 'Tanpa customer' }} · {{ formatPaymentMethod(row.payment_method) }}
                <span
                  :class="[
                    'ml-1 inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium',
                    row.payment_status === 'lunas'
                      ? 'bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-400'
                      : 'bg-warning-50 text-warning-600 dark:bg-warning-500/10 dark:text-warning-400'
                  ]"
                >
                  {{ row.payment_status === 'lunas' ? 'Lunas' : 'Belum Lunas' }}
                </span>
              </p>
            </div>
          </div>
        </template>

        <template #rowActions="{ row }">
          <div class="flex items-center gap-2">
            <button
              @click="viewTransaction(row)"
              class="rounded-lg p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/[0.03]"
              title="Detail"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            </button>
            <button
              @click="voidTransaction(row)"
              class="rounded-lg p-2 text-error-600 hover:bg-error-50 dark:text-error-500 dark:hover:bg-error-500/15"
              title="Batalkan"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                />
              </svg>
            </button>
          </div>
        </template>
      </DataTable>
    </div>

    <!-- Mobile Filter Modal -->
    <TransactionFilterModal
      :is-open="showFilterModal"
      :model-value="modalFilters"
      :customer-options="customerFilterOptions"
      @close="showFilterModal = false"
      @apply="onModalApply"
    />

    <!-- Delete Confirmation Dialog -->
    <ConfirmDialog
      v-model="showDeleteDialog"
      title="Hapus Transaksi?"
      :message="`Apakah Anda yakin ingin menghapus transaksi '${transactionToDelete?.transaction_number}'? Stok produk akan dikembalikan dan transaksi akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.`"
      confirm-text="Ya, Hapus"
      cancel-text="Tutup"
      variant="danger"
      @confirm="confirmDelete"
    />

    <!-- Bulk Delete Confirmation Dialog -->
    <ConfirmDialog
      v-model="showBulkDeleteDialog"
      title="Hapus Transaksi Terpilih?"
      :message="`Apakah Anda yakin ingin menghapus ${selectedTransactions.length} transaksi terpilih? Stok produk akan dikembalikan dan transaksi akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.`"
      confirm-text="Ya, Hapus Semua"
      cancel-text="Tutup"
      variant="danger"
      @confirm="confirmBulkDelete"
    />

    <!-- Import Transaksi Modal -->
    <ImportTransactionModal
      ref="importModalRef"
      v-model="showImportModal"
      @import="handleImportFile"
      @download-template="downloadImportTemplate"
    />
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, computed, watch, watchEffect, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import DataTable from '@/components/tables/DataTable.vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import MobilePageHeader from '@/components/common/MobilePageHeader.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import SelectField from '@/components/common/SelectField.vue'
import TransactionFilterModal from '@/components/common/TransactionFilterModal.vue'
import ImportTransactionModal from '@/components/common/ImportTransactionModal.vue'
import { useTransactionsStore } from '@/stores/transactions'
import { useShippingStore } from '@/stores/shipping'
import { useStoreSettingsStore } from '@/stores/storeSettings'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'
import { parseCsv, downloadCsv, readFileAsText } from '@/composables/useCsv'
import type { TransactionStatus } from '@/types/database'

const router = useRouter()
const transactionsStore = useTransactionsStore()
const shippingStore = useShippingStore()
const settingsStore = useStoreSettingsStore()
const toast = useToast()

const showDeleteDialog = ref(false)
const showBulkDeleteDialog = ref(false)
const transactionToDelete = ref<any>(null)
const selectedTransactions = ref<string[]>([])
const selectAllCheckbox = ref<HTMLInputElement | null>(null)
const expandedCards = ref<string[]>([])

// Import modal
const showImportModal = ref(false)
const importModalRef = ref<InstanceType<typeof ImportTransactionModal> | null>(null)

// Server-side pagination
const PER_PAGE = 20
const currentPage = ref(1)

// Pencarian & filter
const searchQuery = ref('')
const transactionStatusFilter = ref<'semua' | TransactionStatus>('semua')
const paymentFilter = ref<'semua' | 'lunas' | 'belum_lunas'>('semua')

// Filter lengkap (modal mobile)
const showFilterModal = ref(false)

interface ModalFilterValues {
  transactionStatus: string
  paymentStatus: string
  paymentMethod: string
  recordStatus: string
  customer: string
  dateFrom: string
  dateTo: string
  minAmount: string
  maxAmount: string
  sortOrder: string
}

const emptyModalFilters = (): ModalFilterValues => ({
  transactionStatus: 'semua',
  paymentStatus: 'semua',
  paymentMethod: '',
  recordStatus: 'semua',
  customer: '',
  dateFrom: '',
  dateTo: '',
  minAmount: '',
  maxAmount: '',
  sortOrder: 'newest',
})

const modalFilters = ref<ModalFilterValues>(emptyModalFilters())

// Bangun filters object untuk dikirim ke server
const buildServerFilters = () => {
  const f = modalFilters.value
  return {
    search: searchQuery.value.trim() || undefined,
    paymentStatus: f.paymentStatus !== 'semua' ? f.paymentStatus : undefined,
    transactionStatus: f.transactionStatus !== 'semua' ? f.transactionStatus : undefined,
    recordStatus: f.recordStatus !== 'semua' ? f.recordStatus : undefined,
    paymentMethod: f.paymentMethod || undefined,
    customer: f.customer || undefined,
    dateFrom: f.dateFrom || undefined,
    dateTo: f.dateTo || undefined,
    minAmount: f.minAmount ? Number(f.minAmount) : undefined,
    maxAmount: f.maxAmount ? Number(f.maxAmount) : undefined,
    sortOrder: f.sortOrder !== 'newest' ? f.sortOrder : undefined,
  }
}

// Debounce untuk search agar tidak terlalu sering request
let searchDebounce: ReturnType<typeof setTimeout> | null = null
const fetchData = (page = 1) => {
  currentPage.value = page
  transactionsStore.fetchTransactionsPaginated(page, PER_PAGE, buildServerFilters())
}

const fetchDataDebounced = () => {
  if (searchDebounce) clearTimeout(searchDebounce)
  searchDebounce = setTimeout(() => fetchData(1), 400)
}

const onModalApply = (values: ModalFilterValues) => {
  modalFilters.value = { ...values }
  transactionStatusFilter.value = values.transactionStatus as any
  paymentFilter.value = values.paymentStatus as any
  fetchData(1)
}

// Kontrol cepat → fetch ulang
watch(transactionStatusFilter, (v) => {
  modalFilters.value.transactionStatus = v
  fetchData(1)
})
watch(paymentFilter, (v) => {
  modalFilters.value.paymentStatus = v
  fetchData(1)
})
watch(searchQuery, fetchDataDebounced)

// Data dari store (server-side)
const displayTransactions = computed(() => transactionsStore.paginatedTransactions)
const totalPages = computed(() => Math.ceil(transactionsStore.paginationTotal / PER_PAGE))
const isLoading = computed(() => transactionsStore.paginationLoading)

// Opsi customer untuk filter modal — ambil dari data yang sedang ditampilkan
// (tidak bisa dari semua data karena server-side, jadi fallback ke input manual)
const customerFilterOptions = computed(() => {
  const names = new Set<string>()
  for (const t of transactionsStore.paginatedTransactions) {
    if (t.customer_name) names.add(t.customer_name)
  }
  return [...names].sort((a, b) => a.localeCompare(b)).map((name) => ({ value: name, label: name }))
})

const isBatal = (t: any) => t.status === 'void' || t.status === 'batal'

// Opsi filter status transaksi (dropdown)
const transactionStatusOptions = [
  { value: 'semua', label: 'Semua Status' },
  { value: 'disiapkan', label: 'Disiapkan' },
  { value: 'dikirim', label: 'Dikirim' },
  { value: 'selesai', label: 'Selesai' },
]

const paymentOptions = [
  { value: 'semua', label: 'Semua Bayar' },
  { value: 'lunas', label: 'Lunas' },
  { value: 'belum_lunas', label: 'Belum Lunas' },
] as const

const paymentMethodLabels: Record<string, string> = {
  tunai: 'Tunai',
  transfer: 'Transfer',
  qris: 'QRIS',
  tempo: 'Tempo',
}

const formatShortDate = (ymd: string) => {
  const d = new Date(ymd + 'T00:00:00')
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })
}

// Chip filter aktif dari modal
const activeFilterChips = computed(() => {
  const f = modalFilters.value
  const chips: { key: string; label: string }[] = []
  if (f.recordStatus !== 'semua') {
    chips.push({ key: 'recordStatus', label: f.recordStatus === 'aktif' ? 'Aktif saja' : 'Dibatalkan' })
  }
  if (f.paymentMethod) {
    chips.push({ key: 'paymentMethod', label: paymentMethodLabels[f.paymentMethod] || f.paymentMethod })
  }
  if (f.customer) {
    chips.push({ key: 'customer', label: f.customer === '__tanpa__' ? 'Tanpa customer' : f.customer })
  }
  if (f.dateFrom || f.dateTo) {
    const from = f.dateFrom ? formatShortDate(f.dateFrom) : '...'
    const to = f.dateTo ? formatShortDate(f.dateTo) : '...'
    chips.push({ key: 'date', label: `${from} – ${to}` })
  }
  if (f.minAmount) chips.push({ key: 'minAmount', label: `≥ ${formatCurrency(Number(f.minAmount))}` })
  if (f.maxAmount) chips.push({ key: 'maxAmount', label: `≤ ${formatCurrency(Number(f.maxAmount))}` })
  if (f.sortOrder !== 'newest') {
    const labels: Record<string, string> = { oldest: 'Terlama', highest: 'Nominal tertinggi', lowest: 'Nominal terendah' }
    chips.push({ key: 'sortOrder', label: labels[f.sortOrder] || f.sortOrder })
  }
  return chips
})

const mobileAdvancedFilterCount = computed(() => activeFilterChips.value.length)

const removeFilterChip = (key: string) => {
  if (key === 'date') {
    modalFilters.value.dateFrom = ''
    modalFilters.value.dateTo = ''
  } else if (key === 'sortOrder') {
    modalFilters.value.sortOrder = 'newest'
  } else {
    (modalFilters.value as any)[key] = key === 'recordStatus' ? 'semua' : ''
  }
  fetchData(1)
}

const clearModalFilters = () => {
  modalFilters.value = emptyModalFilters()
  transactionStatusFilter.value = 'semua'
  paymentFilter.value = 'semua'
  fetchData(1)
}

const hasActiveFilter = computed(() => {
  return searchQuery.value.trim() !== '' || mobileAdvancedFilterCount.value > 0 || transactionStatusFilter.value !== 'semua' || paymentFilter.value !== 'semua'
})

const clearFilters = () => {
  clearModalFilters()
  searchQuery.value = ''
}

const toggleExpand = (id: string) => {
  const index = expandedCards.value.indexOf(id)
  if (index > -1) {
    expandedCards.value.splice(index, 1)
  } else {
    expandedCards.value.push(id)
  }
}

const allSelected = computed(() => {
  return displayTransactions.value.length > 0 && selectedTransactions.value.length === displayTransactions.value.length
})

const someSelected = computed(() => {
  return selectedTransactions.value.length > 0 && selectedTransactions.value.length < displayTransactions.value.length
})

watchEffect(() => {
  if (selectAllCheckbox.value) {
    selectAllCheckbox.value.indeterminate = someSelected.value
  }
})

const toggleSelectAll = () => {
  if (allSelected.value) {
    selectedTransactions.value = []
  } else {
    selectedTransactions.value = displayTransactions.value.map(t => t.id)
  }
}

const columns = [
  { key: 'checkbox', label: 'Pilih', width: 'w-1/12' },
  { key: 'transaction_number', label: 'NO. TRANSAKSI', sortable: true, width: 'w-2/12' },
  { key: 'created_at', label: 'TANGGAL', sortable: true, width: 'w-2/12' },
  { key: 'customer_name', label: 'CUSTOMER', sortable: true, width: 'w-2/12' },
  { key: 'total', label: 'TOTAL', sortable: true, width: 'w-2/12' },
  { key: 'remaining_amount', label: 'SISA', sortable: true, width: 'w-2/12' },
  { key: 'payment_method', label: 'PEMBAYARAN', sortable: true, width: 'w-2/12' },
  { key: 'status', label: 'STATUS', sortable: true, width: 'w-1/12' },
]

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value || 0)

const transactionStatusBadge = (value?: string) => {
  switch (value) {
    case 'dikirim':
      return { label: 'Dikirim', class: 'bg-warning-100 text-warning-700 dark:bg-warning-900 dark:text-warning-400' }
    case 'selesai':
      return { label: 'Selesai', class: 'bg-success-100 text-success-700 dark:bg-success-900 dark:text-success-400' }
    case 'disiapkan':
    default:
      return { label: 'Disiapkan', class: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-400' }
  }
}

const statusUpdatingId = ref<string | null>(null)

const lockedShippingTxIds = computed(() => {
  const ids = new Set<string>()
  for (const d of shippingStore.deliveryOrders || []) {
    if (d.status === 'selesai') {
      for (const txId of d.transaction_ids || []) ids.add(txId)
    }
  }
  return ids
})

const changeTransactionStatus = async (transaction: any, value: TransactionStatus) => {
  if (!value || value === transaction.transaction_status) return
  if (lockedShippingTxIds.value.has(transaction.id)) {
    toast.warning('Terkunci', 'Status tidak bisa diubah karena surat jalannya sudah selesai')
    return
  }
  statusUpdatingId.value = transaction.id
  try {
    await transactionsStore.updateTransactionStatus(transaction.id, value)
    // Refresh halaman saat ini
    fetchData(currentPage.value)
    toast.success('Berhasil!', 'Status transaksi diperbarui')
  } catch (error: any) {
    console.error('Error updating transaction status:', error)
    toast.error('Gagal!', error.message || 'Gagal mengubah status transaksi')
  } finally {
    statusUpdatingId.value = null
  }
}

const formatPaymentMethod = (value: string) => {
  const methods: Record<string, string> = {
    tunai: 'Tunai',
    transfer: 'Transfer',
    qris: 'QRIS',
  }
  return methods[value] || value
}

const formatDate = (value: string) => {
  const date = new Date(value)
  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

onMounted(async () => {
  try {
    await Promise.all([
      fetchData(1),
      shippingStore.fetchDeliveryOrders().catch(() => {}),
    ])
  } catch (error) {
    console.error('Error loading transactions:', error)
    toast.error('Gagal!', 'Gagal memuat data transaksi')
  }
})

const addTransaction = () => {
  router.push('/transactions/add')
}

const viewTransaction = (transaction: any) => {
  router.push(`/transactions/${transaction.id}`)
}

const deleteTransaction = (transaction: any) => {
  transactionToDelete.value = transaction
  showDeleteDialog.value = true
}

const confirmDelete = async () => {
  if (!transactionToDelete.value) return
  try {
    await transactionsStore.deleteTransaction(transactionToDelete.value.id)
    toast.success('Berhasil!', 'Transaksi berhasil dihapus')
    fetchData(currentPage.value)
  } catch (error) {
    console.error('Error deleting transaction:', error)
    toast.error('Gagal!', 'Gagal menghapus transaksi')
  } finally {
    transactionToDelete.value = null
  }
}

const bulkDelete = () => {
  showBulkDeleteDialog.value = true
}

const confirmBulkDelete = async () => {
  const count = selectedTransactions.value.length
  try {
    await Promise.all(
      selectedTransactions.value.map(id => transactionsStore.deleteTransaction(id))
    )
    selectedTransactions.value = []
    toast.success('Berhasil!', `${count} transaksi berhasil dihapus`)
    fetchData(1)
  } catch (error) {
    console.error('Error deleting transactions:', error)
    toast.error('Gagal!', 'Gagal menghapus beberapa transaksi')
  }
}

const voidTransaction = async (transaction: any) => {
  const confirmed = await useConfirm().confirm({
    title: 'Batalkan Transaksi',
    message: `Apakah Anda yakin ingin membatalkan transaksi ${transaction.transaction_number}? Transaksi akan ditandai sebagai void.`,
  })
  if (!confirmed) return

  try {
    await transactionsStore.voidTransaction(transaction.id)
    toast.success('Berhasil!', 'Transaksi berhasil dibatalkan')
    fetchData(currentPage.value)
  } catch (error: any) {
    console.error('Error voiding transaction:', error)
    toast.error('Gagal!', error.message || 'Gagal membatalkan transaksi')
  }
}

const handleMenuAction = ({ action, row }: { action: string; row: any }) => {
  switch (action) {
    case 'detail':
      viewTransaction(row)
      break
    case 'delete':
      deleteTransaction(row)
      break
  }
}

/* ============================================================
 * TEMPLATE IMPORT CSV
 * ============================================================ */
const IMPORT_TEMPLATE_HEADERS = [
  'No. Transaksi',
  'Tanggal',
  'Nama Customer',
  'Metode Bayar',
  'Nama Produk',
  'Qty',
  'Harga Satuan',
  'Jumlah Bayar',
  'Diskon',
  'Ongkir',
  'Catatan',
]

const downloadImportTemplate = () => {
  downloadCsv('template-import-transaksi.csv', [
    IMPORT_TEMPLATE_HEADERS,
    ['TRX-001', '01/09/2026', 'Toko Barokah', 'tunai', 'Beras Premium 5kg', '2', '75000', '150000', '0', '0', ''],
    ['TRX-001', '01/09/2026', 'Toko Barokah', 'tunai', 'Minyak Goreng 2L', '3', '28000', '', '0', '0', ''],
    ['TRX-002', '02/09/2026', 'Warung Pak Hasan', 'transfer', 'Gula Pasir 1kg', '5', '14000', '70000', '0', '5000', 'Kirim sore'],
  ])
  toast.success('Berhasil!', 'Template CSV transaksi berhasil diunduh')
}

/* ============================================================
 * IMPORT CSV
 * ============================================================ */
const handleImportFile = async (file: File) => {
  try {
    const text = await readFileAsText(file)
    const parsed = parseCsv(text)

    if (!parsed.headers || parsed.headers.length === 0) {
      importModalRef.value?.setResult({ created: 0, skipped: 0, errors: ['File CSV kosong atau format tidak valid'] })
      return
    }
    if (parsed.rows.length === 0) {
      importModalRef.value?.setResult({ created: 0, skipped: 0, errors: ['Tidak ada data di dalam file'] })
      return
    }

    const result = await transactionsStore.importTransactions(parsed.rows, parsed.headers)

    // Tampilkan hasil di modal
    importModalRef.value?.setResult(result)

    // Refresh daftar transaksi
    await fetchData(1)

    if (result.errors.length === 0) {
      toast.success('Berhasil!', `${result.created} transaksi berhasil diimpor`)
    } else {
      toast.warning('Selesai dengan catatan', `${result.created} transaksi dibuat, ${result.skipped} dilewati`)
    }
  } catch (e: any) {
    importModalRef.value?.setResult({ created: 0, skipped: 0, errors: [e.message || 'Gagal mengimpor file CSV'] })
    toast.error('Gagal!', e.message || 'Gagal mengimpor file CSV')
  }
}
</script>
