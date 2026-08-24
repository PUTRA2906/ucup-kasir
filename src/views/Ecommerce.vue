<template>
  <admin-layout>
    <PageBreadcrumb pageTitle="Dashboard" class="hidden md:block" />
    <div class="space-y-6 px-4 md:px-0">
      <!-- Loading Skeleton -->
      <div v-if="loading" class="space-y-6">
        <LoadingSkeleton type="mobile-greeting" />
        <LoadingSkeleton type="mobile-menu" />
        <div class="hidden md:block">
          <LoadingSkeleton type="default" />
        </div>
      </div>

      <template v-else>
        <!-- Mobile Greeting Banner -->
        <div class="flex items-center justify-between md:hidden">
          <div>
            <p class="text-[11px] tracking-wide text-gray-500 dark:text-gray-400">
              Selamat Datang,
            </p>
            <h1 class="text-xl font-extrabold leading-tight tracking-tight text-gray-900 dark:text-white">
              {{ displayName.toUpperCase() }}
            </h1>
          </div>
          <router-link
            to="/notifications"
            class="relative rounded-xl border border-gray-300 bg-white p-2.5 text-gray-500 transition hover:text-gray-900 active:scale-95 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-400 dark:hover:text-white"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
            <span
              v-if="notificationsStore.unreadCount > 0"
              class="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white"
            >
              {{ notificationsStore.unreadCount > 9 ? '9+' : notificationsStore.unreadCount }}
            </span>
          </router-link>
        </div>

        <!-- Mobile Financial Summary (Penjualan & Laba) -->
        <div class="md:hidden">
          <!-- Header dengan tombol toggle -->
          <div class="mb-2 flex items-center justify-between px-1">
            <span class="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
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

          <!-- Kartu keuangan -->
          <div class="grid grid-cols-2 gap-3">
            <div
              class="relative rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]"
            >
              <div class="flex items-center gap-1">
                <span class="text-[11px] text-gray-500 dark:text-gray-400">Penjualan Bersih</span>
                <button
                  type="button"
                  class="inline-flex cursor-pointer text-gray-400 transition-colors hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                  @click.stop="toggleInfoTooltip('net_sales')"
                >
                  <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </button>
              </div>
              <h3 class="mt-1 text-base font-bold text-gray-900 dark:text-white">
                {{ financialHidden ? 'Rp ××××××' : formatCurrency(salesReportStore.summary.net_sales) }}
              </h3>
              <span class="text-[10px] font-medium text-success-500">Bulan Ini</span>

              <transition name="tooltip-fade">
                <div
                  v-if="activeInfoTooltip === 'net_sales'"
                  class="absolute inset-x-2 top-full z-20 mt-2 rounded-lg bg-gray-900 px-3 py-2 text-[10px] font-normal leading-relaxed text-gray-100 shadow-lg dark:bg-gray-700"
                >
                  Total pendapatan dari transaksi setelah dikurangi diskon dan retur, belum dipotong biaya operasional.
                </div>
              </transition>
            </div>

            <div
              class="relative rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]"
            >
              <div class="flex items-center gap-1">
                <span class="text-[11px] text-gray-500 dark:text-gray-400">Laba Bersih</span>
                <button
                  type="button"
                  class="inline-flex cursor-pointer text-gray-400 transition-colors hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                  @click.stop="toggleInfoTooltip('net_profit')"
                >
                  <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </button>
              </div>
              <h3 class="mt-1 text-base font-bold text-gray-900 dark:text-white">
                {{ financialHidden ? 'Rp ××××××' : formatCurrency(salesReportStore.summary.net_profit) }}
              </h3>
              <span class="text-[10px] text-gray-400 dark:text-gray-500">Keuntungan Riil</span>

              <transition name="tooltip-fade">
                <div
                  v-if="activeInfoTooltip === 'net_profit'"
                  class="absolute inset-x-2 top-full z-20 mt-2 rounded-lg bg-gray-900 px-3 py-2 text-[10px] font-normal leading-relaxed text-gray-100 shadow-lg dark:bg-gray-700"
                >
                  Penjualan bersih dikurangi HPP (modal) dan biaya operasional. Ini keuntungan riil Anda.
                </div>
              </transition>
            </div>
          </div>
        </div>

        <!-- Mobile Quick Menu Grid (8 items) -->
        <div
          class="space-y-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:hidden dark:border-gray-800 dark:bg-white/[0.03]"
        >
          <div class="flex items-center justify-between border-b border-gray-200 pb-2 dark:border-gray-800">
            <span
              class="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300"
            >
              Menu Cepat
            </span>
            <span class="text-[10px] font-medium text-brand-500">Akses Cepat</span>
          </div>
          <div class="grid grid-cols-4 gap-y-4 gap-x-2 text-center">
            <router-link
              to="/stock"
              class="group flex flex-col items-center transition active:scale-95"
            >
              <div
                class="flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-500/20 bg-blue-500/10 text-blue-500 transition-transform group-hover:scale-105"
              >
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                  />
                </svg>
              </div>
              <span class="mt-1.5 text-[11px] font-medium leading-tight text-gray-700 dark:text-gray-300"
                >Stok</span
              >
            </router-link>

            <router-link
              to="/customers"
              class="group flex flex-col items-center transition active:scale-95"
            >
              <div
                class="flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10 text-amber-500 transition-transform group-hover:scale-105"
              >
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <span class="mt-1.5 text-[11px] font-medium leading-tight text-gray-700 dark:text-gray-300"
                >Customer</span
              >
            </router-link>

            <router-link
              to="/returns"
              class="group flex flex-col items-center transition active:scale-95"
            >
              <div
                class="flex h-12 w-12 items-center justify-center rounded-2xl border border-rose-500/20 bg-rose-500/10 text-rose-500 transition-transform group-hover:scale-105"
              >
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </div>
              <span class="mt-1.5 text-[11px] font-medium leading-tight text-gray-700 dark:text-gray-300"
                >Retur</span
              >
            </router-link>



            <router-link
              to="/categories"
              class="group flex flex-col items-center transition active:scale-95"
            >
              <div
                class="flex h-12 w-12 items-center justify-center rounded-2xl border border-teal-500/20 bg-teal-500/10 text-teal-500 transition-transform group-hover:scale-105"
              >
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                  />
                </svg>
              </div>
              <span class="mt-1.5 text-[11px] font-medium leading-tight text-gray-700 dark:text-gray-300"
                >Kategori</span
              >
            </router-link>

            <router-link
              to="/products"
              class="group flex flex-col items-center transition active:scale-95"
            >
              <div
                class="flex h-12 w-12 items-center justify-center rounded-2xl border border-violet-500/20 bg-violet-500/10 text-violet-500 transition-transform group-hover:scale-105"
              >
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                  />
                </svg>
              </div>
              <span class="mt-1.5 text-[11px] font-medium leading-tight text-gray-700 dark:text-gray-300"
                >Produk</span
              >
            </router-link>

            <router-link
              to="/transactions"
              class="group flex flex-col items-center transition active:scale-95"
            >
              <div
                class="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-500/20 bg-cyan-500/10 text-cyan-500 transition-transform group-hover:scale-105"
              >
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                  />
                </svg>
              </div>
              <span class="mt-1.5 text-[11px] font-medium leading-tight text-gray-700 dark:text-gray-300"
                >Transaksi</span
              >
            </router-link>

            <router-link
              to="/stock/movements"
              class="group flex flex-col items-center transition active:scale-95"
            >
              <div
                class="flex h-12 w-12 items-center justify-center rounded-2xl border border-orange-500/20 bg-orange-500/10 text-orange-500 transition-transform group-hover:scale-105"
              >
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                  />
                </svg>
              </div>
              <span class="mt-1.5 text-[11px] font-medium leading-tight text-gray-700 dark:text-gray-300"
                >Mutasi</span
              >
            </router-link>

            <router-link
              to="/reports/transaction-profit"
              class="group flex flex-col items-center transition active:scale-95"
            >
              <div
                class="flex h-12 w-12 items-center justify-center rounded-2xl border border-purple-500/20 bg-purple-500/10 text-purple-500 transition-transform group-hover:scale-105"
              >
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <span class="mt-1.5 text-[11px] font-medium leading-tight text-gray-700 dark:text-gray-300"
                >Laba/Tx</span
              >
            </router-link>


          </div>
        </div>

        <!-- Mobile Peringatan Stok Gudang -->
        <div
          class="space-y-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:hidden dark:border-gray-800 dark:bg-white/[0.03]"
        >
          <div class="flex items-center justify-between border-b border-gray-200 pb-2 dark:border-gray-800">
            <span class="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
              Peringatan Stok Gudang
            </span>
            <router-link
              to="/products"
              class="text-[11px] font-semibold text-brand-500"
            >
              Ke Gudang
            </router-link>
          </div>

          <div v-if="lowStockProducts.length === 0" class="py-3 text-center">
            <p class="text-xs text-gray-500 dark:text-gray-400">
              Semua stok aman. Tidak ada produk yang menipis.
            </p>
          </div>

          <div v-else class="space-y-2">
            <div
              v-for="product in lowStockProducts.slice(0, 4)"
              :key="product.id"
              class="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 p-3 text-xs dark:border-gray-700 dark:bg-white/[0.02]"
            >
              <div class="min-w-0">
                <p class="truncate font-bold text-gray-900 dark:text-white">{{ product.name }}</p>
                <p class="mt-0.5 text-[10px] text-gray-500 dark:text-gray-400">
                  Batas minimum: {{ product.minimum_stock ?? 10 }}
                </p>
              </div>
              <span
                class="flex-shrink-0 rounded-lg px-2.5 py-1 text-[10px] font-bold"
                :class="
                  product.stock === 0
                    ? 'bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-500'
                    : 'bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-warning-500'
                "
              >
                {{ product.stock === 0 ? 'Habis' : `Sisa ${product.stock}` }}
              </span>
            </div>
          </div>
        </div>

        <!-- Desktop Greeting -->
        <div
          class="hidden flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-6 md:flex sm:flex-row sm:items-center sm:justify-between dark:border-gray-800 dark:bg-white/[0.03]"
        >
          <div>
            <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
              Selamat datang, {{ displayName }} 👋
            </h1>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">{{ todayLabel }}</p>
          </div>
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
            <router-link
              to="/products"
              class="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 sm:w-auto dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 6h16M4 10h16M4 14h16M4 18h16"
                />
              </svg>
              Lihat Produk
            </router-link>
            <router-link
              to="/products/add"
              class="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 sm:w-auto"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
              Tambah Produk
            </router-link>
          </div>
        </div>

        <!-- Empty State CTA - Desktop Only -->
        <div
          v-if="productsStore.products.length === 0"
          class="hidden rounded-2xl border border-dashed border-gray-300 bg-white p-6 text-center md:block dark:border-gray-700 dark:bg-white/[0.03] sm:p-10"
        >
          <svg
            class="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
            />
          </svg>
          <h3 class="mt-4 text-base font-medium text-gray-800 dark:text-white/90">
            Belum ada produk
          </h3>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Mulai tambahkan produk pertama Anda untuk melihat statistik di dashboard ini.
          </p>
          <router-link
            to="/products/add"
            class="mt-6 inline-flex items-center gap-2 rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-600"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Tambah Produk Pertama
          </router-link>
        </div>

        <!-- Stats & Widgets - Desktop Only -->
        <template v-else>
          <div class="hidden md:block">
            <!-- Stats -->
            <DashboardStats
              :total-products="totalProducts"
              :total-categories="totalCategories"
              :total-stock="totalStock"
              :stock-value="stockValue"
            />
          </div>

          <!-- Widgets - Desktop Only -->
          <div class="hidden grid-cols-12 gap-4 md:grid md:gap-6">
            <div class="col-span-12 xl:col-span-7">
              <LowStockList :products="productsStore.products" />
            </div>
            <div class="col-span-12 xl:col-span-5">
              <CategoryBreakdown
                :categories="categoriesStore.categories"
                :products="productsStore.products"
              />
            </div>
            <div class="col-span-12">
              <RecentProductsList :products="productsStore.products" />
            </div>
          </div>
        </template>
      </template>
    </div>
  </admin-layout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import DashboardStats from '@/components/ecommerce/DashboardStats.vue'
import LowStockList from '@/components/ecommerce/LowStockList.vue'
import CategoryBreakdown from '@/components/ecommerce/CategoryBreakdown.vue'
import RecentProductsList from '@/components/ecommerce/RecentProductsList.vue'
import LoadingSkeleton from '@/components/common/LoadingSkeleton.vue'
import { useProductsStore } from '@/stores/products'
import { useCategoriesStore } from '@/stores/categories'
import { useAuthStore } from '@/stores/auth'
import { useSalesReportStore } from '@/stores/salesReport'
import { useNotificationsStore } from '@/stores/notifications'

const productsStore = useProductsStore()
const categoriesStore = useCategoriesStore()
const authStore = useAuthStore()
const salesReportStore = useSalesReportStore()
const notificationsStore = useNotificationsStore()

const loading = ref(true)
const activeInfoTooltip = ref<string | null>(null)
const financialHidden = ref(localStorage.getItem('dashboard_financial_hidden') === 'true')

const toggleFinancialVisibility = () => {
  financialHidden.value = !financialHidden.value
  localStorage.setItem('dashboard_financial_hidden', String(financialHidden.value))
}

const displayName = computed(() => {
  const user = authStore.user
  const fullName = user?.user_metadata?.full_name as string | undefined
  return fullName || user?.email?.split('@')[0] || 'User'
})

const todayLabel = computed(() =>
  new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date())
)

const totalProducts = computed(() => productsStore.products.length)
const totalCategories = computed(() => categoriesStore.categories.length)

const totalStock = computed(() =>
  productsStore.products.reduce((sum, p) => sum + (p.stock || 0), 0)
)

const stockValue = computed(() =>
  productsStore.products.reduce((sum, p) => sum + (p.price_buy || 0) * (p.stock || 0), 0)
)

const lowStockProducts = computed(() =>
  productsStore.products
    .filter((p) => p.is_active && p.stock <= (p.minimum_stock ?? 10))
    .sort((a, b) => a.stock - b.stock)
)

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value || 0)

const toggleInfoTooltip = (id: string) => {
  activeInfoTooltip.value = activeInfoTooltip.value === id ? null : id
}

const closeInfoTooltip = () => {
  activeInfoTooltip.value = null
}

onMounted(() => {
  document.addEventListener('click', closeInfoTooltip)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', closeInfoTooltip)
})

onMounted(async () => {
  try {
    salesReportStore.applyPreset('thisMonth')
    await Promise.all([
      productsStore.fetchProducts(true),
      categoriesStore.fetchCategories(),
      salesReportStore.fetchSalesReport(),
      notificationsStore.fetchNotifications(),
    ])
  } catch (error) {
    console.error('Error loading dashboard:', error)
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.tooltip-fade-enter-active,
.tooltip-fade-leave-active {
  transition: opacity 0.15s ease;
}
.tooltip-fade-enter-from,
.tooltip-fade-leave-to {
  opacity: 0;
}
</style>
