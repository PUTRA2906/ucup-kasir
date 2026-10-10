<template>
  <AdminLayout>
    <PageBreadcrumb pageTitle="Laporan" class="hidden md:block" />

    <div class="space-y-6 pb-24 md:pb-0">
      <MobilePageHeader title="Laporan" subtitle="Pilih jenis laporan yang ingin dilihat" />

      <!-- Desktop Header -->
      <div class="hidden md:block rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Laporan</h1>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Pilih jenis laporan yang ingin Anda lihat
        </p>
      </div>

      <!-- Report Cards Grid -->
      <div class="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-6">
        <!-- Laporan Penjualan -->
        <router-link
          to="/reports/sales"
          class="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-4 transition hover:shadow-lg active:scale-95 md:p-6 dark:border-gray-800 dark:bg-white/[0.03]"
        >
          <div class="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 to-blue-600"></div>
          <div class="flex flex-col items-start gap-3">
            <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition group-hover:scale-110 dark:bg-blue-500/10">
              <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h3 class="text-sm font-bold text-gray-900 md:text-base dark:text-white">Laporan Penjualan</h3>
              <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Total penjualan & transaksi per periode</p>
            </div>
          </div>
        </router-link>

        <!-- Laporan Laba Rugi -->
        <router-link
          to="/reports/profit-loss"
          class="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-4 transition hover:shadow-lg active:scale-95 md:p-6 dark:border-gray-800 dark:bg-white/[0.03]"
        >
          <div class="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-green-500 to-green-600"></div>
          <div class="flex flex-col items-start gap-3">
            <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-green-50 text-green-600 transition group-hover:scale-110 dark:bg-green-500/10">
              <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 class="text-sm font-bold text-gray-900 md:text-base dark:text-white">Laba Rugi</h3>
              <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Rekap laba & rugi per periode</p>
            </div>
          </div>
        </router-link>

        <!-- Mutasi Kas Bulanan -->
        <router-link
          to="/laporan/mutasi-kas-bulanan"
          class="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-4 transition hover:shadow-lg active:scale-95 md:p-6 dark:border-gray-800 dark:bg-white/[0.03]"
        >
          <div class="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-violet-500 to-violet-600"></div>
          <div class="flex flex-col items-start gap-3">
            <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-50 text-violet-600 transition group-hover:scale-110 dark:bg-violet-500/10">
              <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h3 class="text-sm font-bold text-gray-900 md:text-base dark:text-white">Mutasi Kas Bulanan</h3>
              <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Kas masuk & keluar per bulan</p>
            </div>
          </div>
        </router-link>

        <!-- Piutang Menua -->
        <router-link
          to="/reports/aging-receivables"
          class="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-4 transition hover:shadow-lg active:scale-95 md:p-6 dark:border-gray-800 dark:bg-white/[0.03]"
        >
          <div class="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-red-500 to-red-600"></div>
          <div class="flex flex-col items-start gap-3">
            <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600 transition group-hover:scale-110 dark:bg-red-500/10">
              <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 class="text-sm font-bold text-gray-900 md:text-base dark:text-white">Piutang Menua</h3>
              <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Aging piutang per pelanggan</p>
            </div>
          </div>
        </router-link>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import MobilePageHeader from '@/components/common/MobilePageHeader.vue'
</script>
