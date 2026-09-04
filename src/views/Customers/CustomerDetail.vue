<template>
  <AdminLayout>
    <PageBreadcrumb pageTitle="Detail Customer" class="hidden md:block" />

    <MobilePageHeader title="Detail Customer" subtitle="Informasi lengkap customer" back-to="/customers" />

    <div v-if="loading" class="flex items-center justify-center py-12">
      <div class="text-center">
        <svg class="mx-auto h-12 w-12 animate-spin text-brand-500" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p class="mt-4 text-sm text-gray-600 dark:text-gray-400">Memuat data customer...</p>
      </div>
    </div>

    <div v-else-if="customer" class="space-y-6">
      <!-- Mobile View: Customer Info Cards -->
      <div class="space-y-3 md:hidden">
        <!-- Basic Info Card -->
        <div class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
          <h3 class="mb-3 text-sm font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Informasi Dasar
          </h3>
          <div class="space-y-3">
            <div>
              <label class="text-[11px] font-medium text-gray-500 dark:text-gray-400">Nama Customer</label>
              <p class="mt-0.5 text-base font-semibold text-gray-900 dark:text-white">{{ customer.name }}</p>
            </div>
            <div v-if="customer.store_name">
              <label class="text-[11px] font-medium text-gray-500 dark:text-gray-400">Nama Toko</label>
              <p class="mt-0.5 text-sm text-gray-900 dark:text-white">{{ customer.store_name }}</p>
            </div>
          </div>
        </div>

        <!-- Contact Card -->
        <div class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
          <h3 class="mb-3 text-sm font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Kontak
          </h3>
          <div class="space-y-3">
            <div v-if="customer.phone" class="flex items-center gap-2">
              <svg class="h-4 w-4 flex-shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <div class="min-w-0 flex-1">
                <label class="text-[11px] font-medium text-gray-500 dark:text-gray-400">Telepon</label>
                <p class="mt-0.5 text-sm text-gray-900 dark:text-white">{{ customer.phone }}</p>
              </div>
            </div>
            <div v-if="customer.kecamatan" class="flex items-center gap-2">
              <svg class="h-4 w-4 flex-shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <div class="min-w-0 flex-1">
                <label class="text-[11px] font-medium text-gray-500 dark:text-gray-400">Kecamatan</label>
                <p class="mt-0.5 text-sm text-gray-900 dark:text-white">{{ customer.kecamatan }}</p>
              </div>
            </div>
            <div v-if="customer.address">
              <label class="text-[11px] font-medium text-gray-500 dark:text-gray-400">Alamat Lengkap</label>
              <p class="mt-0.5 text-sm text-gray-900 dark:text-white">{{ customer.address }}</p>
            </div>
          </div>
        </div>

        <!-- Notes Card (if exists) -->
        <div v-if="customer.notes" class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
          <h3 class="mb-3 text-sm font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Catatan
          </h3>
          <p class="text-sm text-gray-900 dark:text-white">{{ customer.notes }}</p>
        </div>

        <!-- Metadata Card -->
        <div class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
          <h3 class="mb-3 text-sm font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Informasi Sistem
          </h3>
          <div class="space-y-2">
            <div class="flex items-center justify-between text-xs">
              <span class="text-gray-500 dark:text-gray-400">Dibuat pada</span>
              <span class="font-medium text-gray-900 dark:text-white">{{ formatDate(customer.created_at) }}</span>
            </div>
            <div class="flex items-center justify-between text-xs">
              <span class="text-gray-500 dark:text-gray-400">Terakhir diupdate</span>
              <span class="font-medium text-gray-900 dark:text-white">{{ formatDate(customer.updated_at) }}</span>
            </div>
          </div>
        </div>

        <!-- Action Buttons Mobile -->
        <div class="sticky bottom-4 z-10 flex gap-2">
          <button
            @click="router.push(`/customers/edit/${customerId}`)"
            class="flex-1 rounded-xl border border-brand-500 bg-brand-500 px-4 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-brand-600 active:scale-95"
          >
            <div class="flex items-center justify-center gap-2">
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span>Edit</span>
            </div>
          </button>
          <button
            @click="showDeleteDialog = true"
            class="rounded-xl border-2 border-error-500 bg-white px-4 py-3 text-error-600 shadow-sm transition hover:bg-error-50 active:scale-95 dark:bg-gray-900 dark:text-error-500 dark:hover:bg-error-500/10"
          >
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Desktop View: Info Card -->
      <div class="hidden md:block">
        <ComponentCard title="Informasi Customer" desc="Detail lengkap customer">
          <div class="space-y-6">
          <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-400">Nama Customer</label>
              <p class="mt-1 text-base font-semibold text-gray-900 dark:text-white">{{ customer.name }}</p>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-400">Nama Toko</label>
              <p v-if="customer.store_name" class="mt-1 text-base text-gray-900 dark:text-white">{{ customer.store_name }}</p>
              <p v-else class="mt-1 text-sm text-gray-400 dark:text-gray-600">-</p>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-400">No. Telepon</label>
              <p v-if="customer.phone" class="mt-1 text-base text-gray-900 dark:text-white">{{ customer.phone }}</p>
              <p v-else class="mt-1 text-sm text-gray-400 dark:text-gray-600">-</p>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-400">Kecamatan</label>
              <p v-if="customer.kecamatan" class="mt-1 text-base text-gray-900 dark:text-white">{{ customer.kecamatan }}</p>
              <p v-else class="mt-1 text-sm text-gray-400 dark:text-gray-600">-</p>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-400">Alamat</label>
            <p v-if="customer.address" class="mt-1 text-base text-gray-900 dark:text-white">{{ customer.address }}</p>
            <p v-else class="mt-1 text-sm text-gray-400 dark:text-gray-600">-</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-400">Catatan</label>
            <p v-if="customer.notes" class="mt-1 text-base text-gray-900 dark:text-white">{{ customer.notes }}</p>
            <p v-else class="mt-1 text-sm text-gray-400 dark:text-gray-600">-</p>
          </div>

          <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-400">Dibuat Pada</label>
              <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {{ formatDate(customer.created_at) }}
              </p>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-400">Terakhir Diupdate</label>
              <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {{ formatDate(customer.updated_at) }}
              </p>
            </div>
          </div>
          </div>

          <!-- Actions -->
          <div class="mt-6 flex gap-3 border-t border-gray-100 pt-6 dark:border-gray-800">
          <button
            @click="router.push(`/customers/edit/${customerId}`)"
            class="rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-600 focus:outline-hidden focus:ring-3 focus:ring-brand-500/30"
          >
            Edit Customer
          </button>
          <button
            @click="showDeleteDialog = true"
            class="rounded-lg border border-error-500 bg-transparent px-5 py-2.5 text-sm font-medium text-error-600 hover:bg-error-50 focus:outline-hidden focus:ring-3 focus:ring-error-500/30 dark:text-error-500 dark:hover:bg-error-500/15"
          >
            Hapus Customer
          </button>
          <button
            @click="router.push('/customers')"
            class="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-white/[0.03]"
          >
            Kembali
          </button>
        </div>
        </ComponentCard>
      </div>
    </div>

    <!-- Riwayat Transaksi -->
    <div v-if="customer" class="mt-6 px-4 md:px-0">
      <!-- Mobile Transaction Header -->
      <div class="mb-4 md:hidden">
        <h2 class="text-lg font-bold text-gray-900 dark:text-white">Riwayat Transaksi</h2>
        <p class="text-xs text-gray-500 dark:text-gray-400">{{ filteredTransactions.length }} Transaksi</p>
      </div>

      <!-- Desktop uses ComponentCard -->
      <div class="hidden md:block">
        <ComponentCard title="Riwayat Transaksi" desc="Daftar transaksi customer">
        <!-- Filter Section -->
        <div class="mb-6 space-y-4">
          <!-- Mobile Filter Toggle Button -->
          <button
            @click="showFilterModal = !showFilterModal"
            class="flex w-full items-center justify-between rounded-xl border-2 border-dashed border-brand-500 bg-white px-4 py-3 text-sm font-medium text-brand-600 transition hover:bg-brand-50 active:scale-95 dark:bg-gray-900 dark:text-brand-400 dark:hover:bg-brand-500/10 md:hidden"
            :class="{ 'bg-brand-50 dark:bg-brand-500/10': hasActiveFilters }"
          >
            <div class="flex items-center gap-2">
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <span>Filter Transaksi</span>
              <span v-if="hasActiveFilters" class="rounded-full bg-brand-500 px-2 py-0.5 text-xs text-white dark:bg-brand-400">
                {{ activeFilterCount }}
              </span>
            </div>
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          <!-- Desktop Filter Toggle -->
          <button
            @click="showFilters = !showFilters"
            class="hidden w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-white/[0.03] md:flex"
          >
            <span>Filter Transaksi</span>
            <svg
              class="h-5 w-5 transition-transform"
              :class="{ 'rotate-180': showFilters }"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          <!-- Filter Content - Desktop -->
          <div
            class="hidden space-y-4 md:block"
            :class="{ 'md:hidden': !showFilters }"
          >
            <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              <!-- Urutan Waktu -->
              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                  Urutan Waktu
                </label>
                <select
                  v-model="filters.sortOrder"
                  class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:focus:border-brand-500"
                >
                  <option value="newest">Terbaru</option>
                  <option value="oldest">Terlama</option>
                </select>
              </div>

              <!-- Status Pembayaran -->
              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                  Status Pembayaran
                </label>
                <select
                  v-model="filters.paymentStatus"
                  class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:focus:border-brand-500"
                >
                  <option value="all">Semua Status</option>
                  <option value="lunas">Lunas</option>
                  <option value="belum_lunas">Belum Lunas</option>
                </select>
              </div>

              <!-- Metode Pembayaran -->
              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                  Metode Pembayaran
                </label>
                <select
                  v-model="filters.paymentMethod"
                  class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:focus:border-brand-500"
                >
                  <option value="all">Semua Metode</option>
                  <option value="cash">Cash</option>
                  <option value="transfer">Transfer</option>
                  <option value="qris">QRIS</option>
                  <option value="tempo">Tempo</option>
                </select>
              </div>

              <!-- Tanggal Dari -->
              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                  Dari Tanggal
                </label>
                <input
                  type="date"
                  v-model="filters.dateFrom"
                  class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:focus:border-brand-500"
                />
              </div>

              <!-- Tanggal Sampai -->
              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                  Sampai Tanggal
                </label>
                <input
                  type="date"
                  v-model="filters.dateTo"
                  class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:focus:border-brand-500"
                />
              </div>

              <!-- Nominal Min -->
              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                  Nominal Min
                </label>
                <input
                  type="number"
                  v-model.number="filters.minAmount"
                  placeholder="0"
                  class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:focus:border-brand-500"
                />
              </div>

              <!-- Nominal Max -->
              <div>
                <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                  Nominal Max
                </label>
                <input
                  type="number"
                  v-model.number="filters.maxAmount"
                  placeholder="Tanpa batas"
                  class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:focus:border-brand-500"
                />
              </div>
            </div>

            <!-- Reset Filter -->
            <div class="flex justify-end">
              <button
                @click="resetFilters"
                class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-white/[0.03]"
              >
                Reset Filter
              </button>
            </div>
          </div>
        </div>

        <!-- Transaction List -->
        <div v-if="loadingTransactions" class="py-8 text-center">
          <svg class="mx-auto h-8 w-8 animate-spin text-brand-500" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">Memuat transaksi...</p>
        </div>

        <div v-else-if="filteredTransactions.length === 0" class="py-8 text-center">
          <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {{ transactions.length === 0 ? 'Belum ada transaksi' : 'Tidak ada transaksi yang sesuai filter' }}
          </p>
        </div>

        <div v-else class="space-y-3">
          <!-- Desktop Table -->
          <div class="hidden overflow-x-auto md:block">
            <table class="w-full">
              <thead class="border-b border-gray-200 dark:border-gray-800">
                <tr>
                  <th class="pb-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">No. Transaksi</th>
                  <th class="pb-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Tanggal</th>
                  <th class="pb-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Total</th>
                  <th class="pb-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Metode</th>
                  <th class="pb-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Status</th>
                  <th class="pb-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Aksi</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
                <tr v-for="transaction in filteredTransactions" :key="transaction.id" class="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                  <td class="py-3 text-sm font-medium text-gray-900 dark:text-white">
                    {{ transaction.transaction_number }}
                  </td>
                  <td class="py-3 text-sm text-gray-600 dark:text-gray-400">
                    {{ formatDate(transaction.created_at) }}
                  </td>
                  <td class="py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                    {{ formatCurrency(transaction.total) }}
                  </td>
                  <td class="py-3 text-center">
                    <span class="inline-flex rounded-full px-2.5 py-1 text-xs font-medium"
                      :class="getPaymentMethodClass(transaction.payment_method)"
                    >
                      {{ formatPaymentMethod(transaction.payment_method) }}
                    </span>
                  </td>
                  <td class="py-3 text-center">
                    <span class="inline-flex rounded-full px-2.5 py-1 text-xs font-medium"
                      :class="getPaymentStatusClass(transaction.payment_status)"
                    >
                      {{ formatPaymentStatus(transaction.payment_status) }}
                    </span>
                  </td>
                  <td class="py-3 text-center">
                    <button
                      @click="viewTransaction(transaction.id)"
                      class="rounded-lg p-2 text-brand-600 hover:bg-brand-50 dark:text-brand-500 dark:hover:bg-brand-500/15"
                      title="Lihat Detail"
                    >
                      <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Mobile Cards -->
          <div class="space-y-3 md:hidden">
            <div
              v-for="transaction in filteredTransactions"
              :key="transaction.id"
              @click="viewTransaction(transaction.id)"
              class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition active:scale-[0.98] dark:border-gray-800 dark:bg-white/[0.03]"
            >
              <div class="mb-3 flex items-start justify-between">
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-bold text-gray-900 dark:text-white">
                    {{ transaction.transaction_number }}
                  </p>
                  <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                    {{ formatDate(transaction.created_at) }}
                  </p>
                </div>
                <span class="ml-2 inline-flex flex-shrink-0 rounded-full px-2.5 py-1 text-xs font-medium"
                  :class="getPaymentStatusClass(transaction.payment_status)"
                >
                  {{ formatPaymentStatus(transaction.payment_status) }}
                </span>
              </div>
              
              <div class="flex items-center justify-between border-t border-gray-100 pt-3 dark:border-gray-800">
                <span class="inline-flex rounded-full px-2.5 py-1 text-xs font-medium"
                  :class="getPaymentMethodClass(transaction.payment_method)"
                >
                  {{ formatPaymentMethod(transaction.payment_method) }}
                </span>
                <p class="text-base font-bold text-gray-900 dark:text-white">
                  {{ formatCurrency(transaction.total) }}
                </p>
              </div>
            </div>
          </div>

          <!-- Summary -->
          <div class="mt-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-white/[0.03] md:rounded-lg md:border-0 md:bg-gray-50 md:shadow-none md:dark:bg-gray-800/50">
            <div class="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p class="text-xs text-gray-500 dark:text-gray-400 md:text-sm md:text-gray-600">Total Transaksi</p>
                <p class="mt-1 text-lg font-bold text-gray-900 dark:text-white md:text-base md:font-semibold">
                  {{ filteredTransactions.length }}
                </p>
              </div>
              <div>
                <p class="text-xs text-gray-500 dark:text-gray-400 md:text-sm md:text-gray-600">Total Nominal</p>
                <p class="mt-1 text-lg font-bold text-gray-900 dark:text-white md:text-base md:font-semibold">
                  {{ formatCurrency(totalAmount) }}
                </p>
              </div>
              <div>
                <p class="text-xs text-gray-500 dark:text-gray-400 md:text-sm md:text-gray-600">Lunas</p>
                <p class="mt-1 text-lg font-bold text-success-600 dark:text-success-500 md:text-base md:font-semibold">
                  {{ paidCount }}
                </p>
              </div>
              <div>
                <p class="text-xs text-gray-500 dark:text-gray-400 md:text-sm md:text-gray-600">Belum Lunas</p>
                <p class="mt-1 text-lg font-bold text-warning-600 dark:text-warning-500 md:text-base md:font-semibold">
                  {{ unpaidCount }}
                </p>
              </div>
            </div>
          </div>
        </div>
        </ComponentCard>
      </div>

      <!-- Mobile Filter Modal -->
      <Teleport to="body">
        <Transition name="modal">
          <div
            v-if="showFilterModal"
            class="fixed inset-0 z-50 flex items-end justify-center bg-black/50 md:hidden"
            @click.self="showFilterModal = false"
          >
            <div class="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-6 dark:bg-gray-900">
              <div class="mb-4 flex items-center justify-between">
                <h3 class="text-lg font-bold text-gray-900 dark:text-white">Filter Transaksi</h3>
                <button
                  @click="showFilterModal = false"
                  class="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                >
                  <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div class="space-y-4">
                <!-- Urutan Waktu -->
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Urutan Waktu
                  </label>
                  <select
                    v-model="filters.sortOrder"
                    class="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="newest">Terbaru</option>
                    <option value="oldest">Terlama</option>
                  </select>
                </div>

                <!-- Status Pembayaran -->
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Status Pembayaran
                  </label>
                  <select
                    v-model="filters.paymentStatus"
                    class="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="all">Semua Status</option>
                    <option value="lunas">Lunas</option>
                    <option value="belum_lunas">Belum Lunas</option>
                  </select>
                </div>

                <!-- Metode Pembayaran -->
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Metode Pembayaran
                  </label>
                  <select
                    v-model="filters.paymentMethod"
                    class="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="all">Semua Metode</option>
                    <option value="cash">Cash</option>
                    <option value="transfer">Transfer</option>
                    <option value="qris">QRIS</option>
                    <option value="tempo">Tempo</option>
                  </select>
                </div>

                <!-- Tanggal Dari -->
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Dari Tanggal
                  </label>
                  <input
                    type="date"
                    v-model="filters.dateFrom"
                    class="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>

                <!-- Tanggal Sampai -->
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Sampai Tanggal
                  </label>
                  <input
                    type="date"
                    v-model="filters.dateTo"
                    class="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>

                <!-- Nominal Min -->
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Nominal Minimal
                  </label>
                  <input
                    type="number"
                    v-model.number="filters.minAmount"
                    placeholder="0"
                    class="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>

                <!-- Nominal Max -->
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Nominal Maksimal
                  </label>
                  <input
                    type="number"
                    v-model.number="filters.maxAmount"
                    placeholder="Tanpa batas"
                    class="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>

                <!-- Action Buttons -->
                <div class="flex gap-2 border-t border-gray-200 pt-4 dark:border-gray-800">
                  <button
                    @click="resetFilters; showFilterModal = false"
                    class="flex-1 rounded-xl border-2 border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50 active:scale-95 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    Reset
                  </button>
                  <button
                    @click="showFilterModal = false"
                    class="flex-1 rounded-xl border border-brand-500 bg-brand-500 px-4 py-3 text-sm font-medium text-white transition hover:bg-brand-600 active:scale-95"
                  >
                    Terapkan
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Transition>
      </Teleport>
    </div>

    <div v-else class="rounded-xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-gray-900">
      <p class="text-gray-600 dark:text-gray-400">Customer tidak ditemukan</p>
      <button
        @click="router.push('/customers')"
        class="mt-4 rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-600"
      >
        Kembali ke Daftar Customer
      </button>
    </div>

    <!-- Delete Confirmation Dialog -->
    <ConfirmDialog
      v-model="showDeleteDialog"
      title="Hapus Customer?"
      :message="`Apakah Anda yakin ingin menghapus customer '${customer?.name}'? Tindakan ini tidak dapat dibatalkan.`"
      confirm-text="Ya, Hapus"
      cancel-text="Batal"
      variant="danger"
      @confirm="confirmDelete"
    />
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import MobilePageHeader from '@/components/common/MobilePageHeader.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import { useCustomersStore } from '@/stores/customers'
import { sqliteTransactionsService } from '@/services/sqlite/transactions'
import { useToast } from '@/composables/useToast'
import type { Transaction } from '@/types/database'

const router = useRouter()
const route = useRoute()
const customersStore = useCustomersStore()
const toast = useToast()

const customerId = route.params.id as string
const customer = ref<any>(null)
const loading = ref(true)
const showDeleteDialog = ref(false)

// Transactions
const transactions = ref<Transaction[]>([])
const loadingTransactions = ref(false)
const showFilters = ref(false)
const showFilterModal = ref(false)

// Filter state
const filters = ref({
  sortOrder: 'newest' as 'newest' | 'oldest',
  paymentStatus: 'all' as 'all' | 'lunas' | 'belum_lunas',
  paymentMethod: 'all' as 'all' | 'cash' | 'transfer' | 'qris' | 'tempo',
  dateFrom: '',
  dateTo: '',
  minAmount: null as number | null,
  maxAmount: null as number | null,
})

// Check if any filters are active
const hasActiveFilters = computed(() => {
  return (
    filters.value.paymentStatus !== 'all' ||
    filters.value.paymentMethod !== 'all' ||
    filters.value.dateFrom !== '' ||
    filters.value.dateTo !== '' ||
    (filters.value.minAmount !== null && filters.value.minAmount > 0) ||
    (filters.value.maxAmount !== null && filters.value.maxAmount > 0) ||
    filters.value.sortOrder !== 'newest'
  )
})

// Count active filters
const activeFilterCount = computed(() => {
  let count = 0
  if (filters.value.paymentStatus !== 'all') count++
  if (filters.value.paymentMethod !== 'all') count++
  if (filters.value.dateFrom !== '') count++
  if (filters.value.dateTo !== '') count++
  if (filters.value.minAmount !== null && filters.value.minAmount > 0) count++
  if (filters.value.maxAmount !== null && filters.value.maxAmount > 0) count++
  if (filters.value.sortOrder !== 'newest') count++
  return count
})

// Computed filtered transactions
const filteredTransactions = computed(() => {
  let result = [...transactions.value]

  // Filter by payment status
  if (filters.value.paymentStatus !== 'all') {
    result = result.filter(t => t.payment_status === filters.value.paymentStatus)
  }

  // Filter by payment method
  if (filters.value.paymentMethod !== 'all') {
    result = result.filter(t => t.payment_method === filters.value.paymentMethod)
  }

  // Filter by date range
  if (filters.value.dateFrom) {
    const fromDate = new Date(filters.value.dateFrom)
    fromDate.setHours(0, 0, 0, 0)
    result = result.filter(t => new Date(t.created_at) >= fromDate)
  }

  if (filters.value.dateTo) {
    const toDate = new Date(filters.value.dateTo)
    toDate.setHours(23, 59, 59, 999)
    result = result.filter(t => new Date(t.created_at) <= toDate)
  }

  // Filter by amount range
  if (filters.value.minAmount !== null && filters.value.minAmount > 0) {
    result = result.filter(t => t.total >= filters.value.minAmount!)
  }

  if (filters.value.maxAmount !== null && filters.value.maxAmount > 0) {
    result = result.filter(t => t.total <= filters.value.maxAmount!)
  }

  // Sort by date
  result.sort((a, b) => {
    const dateA = new Date(a.created_at).getTime()
    const dateB = new Date(b.created_at).getTime()
    return filters.value.sortOrder === 'newest' ? dateB - dateA : dateA - dateB
  })

  return result
})

// Computed summary
const totalAmount = computed(() => {
  return filteredTransactions.value.reduce((sum, t) => sum + t.total, 0)
})

const paidCount = computed(() => {
  return filteredTransactions.value.filter(t => t.payment_status === 'lunas').length
})

const unpaidCount = computed(() => {
  return filteredTransactions.value.filter(t => t.payment_status === 'belum_lunas').length
})

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

const formatPaymentMethod = (method: string) => {
  const methods: Record<string, string> = {
    cash: 'Cash',
    transfer: 'Transfer',
    qris: 'QRIS',
    tempo: 'Tempo'
  }
  return methods[method] || method
}

const formatPaymentStatus = (status: string) => {
  const statuses: Record<string, string> = {
    lunas: 'Lunas',
    belum_lunas: 'Belum Lunas'
  }
  return statuses[status] || status
}

const getPaymentMethodClass = (method: string) => {
  const classes: Record<string, string> = {
    cash: 'bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400',
    transfer: 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-400',
    qris: 'bg-purple-50 text-purple-700 dark:bg-purple-500/15 dark:text-purple-400',
    tempo: 'bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-400'
  }
  return classes[method] || 'bg-gray-50 text-gray-700 dark:bg-gray-500/15 dark:text-gray-400'
}

const getPaymentStatusClass = (status: string) => {
  const classes: Record<string, string> = {
    lunas: 'bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400',
    belum_lunas: 'bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-400'
  }
  return classes[status] || 'bg-gray-50 text-gray-700 dark:bg-gray-500/15 dark:text-gray-400'
}

const viewTransaction = (transactionId: string) => {
  router.push(`/transactions/${transactionId}`)
}

const resetFilters = () => {
  filters.value = {
    sortOrder: 'newest',
    paymentStatus: 'all',
    paymentMethod: 'all',
    dateFrom: '',
    dateTo: '',
    minAmount: null,
    maxAmount: null,
  }
}

const loadTransactions = async () => {
  loadingTransactions.value = true
  try {
    transactions.value = await sqliteTransactionsService.getByCustomer(customerId)
  } catch (error) {
    console.error('Error loading transactions:', error)
    toast.error('Gagal!', 'Gagal memuat data transaksi')
  } finally {
    loadingTransactions.value = false
  }
}

const confirmDelete = async () => {
  try {
    await customersStore.deleteCustomer(customerId)
    toast.success('Berhasil!', 'Customer berhasil dihapus')
    router.push('/customers')
  } catch (error) {
    console.error('Error deleting customer:', error)
    toast.error('Gagal!', 'Gagal menghapus customer')
  }
}

onMounted(async () => {
  try {
    customer.value = await customersStore.getCustomer(customerId)
    await loadTransactions()
  } catch (error) {
    console.error('Error loading customer:', error)
    toast.error('Gagal!', 'Gagal memuat data customer')
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-active > div,
.modal-leave-active > div {
  transition: transform 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from > div,
.modal-leave-to > div {
  transform: translateY(100%);
}

.modal-enter-to > div,
.modal-leave-from > div {
  transform: translateY(0);
}
</style>
