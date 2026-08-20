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
            to="/settings"
            class="rounded-xl border border-gray-300 bg-white p-2.5 text-gray-500 transition hover:text-gray-900 active:scale-95 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-400 dark:hover:text-white"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
          </router-link>
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
              to="/transactions/add"
              class="group flex flex-col items-center transition active:scale-95"
            >
              <div
                class="flex h-12 w-12 items-center justify-center rounded-2xl border border-brand-500/20 bg-brand-500/10 text-brand-500 transition-transform group-hover:scale-105"
              >
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <span class="mt-1.5 text-[11px] font-medium leading-tight text-gray-700 dark:text-gray-300"
                >+ Faktur</span
              >
            </router-link>

            <router-link
              to="/customer-invoices"
              class="group flex flex-col items-center transition active:scale-95"
            >
              <div
                class="flex h-12 w-12 items-center justify-center rounded-2xl border border-indigo-500/20 bg-indigo-500/10 text-indigo-500 transition-transform group-hover:scale-105"
              >
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
              </div>
              <span class="mt-1.5 text-[11px] font-medium leading-tight text-gray-700 dark:text-gray-300"
                >Kios Mitra</span
              >
            </router-link>

            <router-link
              to="/products"
              class="group flex flex-col items-center transition active:scale-95"
            >
              <div
                class="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-500 transition-transform group-hover:scale-105"
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
              to="/reports/sales"
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
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <span class="mt-1.5 text-[11px] font-medium leading-tight text-gray-700 dark:text-gray-300"
                >Laporan</span
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
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <span class="mt-1.5 text-[11px] font-medium leading-tight text-gray-700 dark:text-gray-300"
                >Tagihan</span
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
              to="/stock"
              class="group flex flex-col items-center transition active:scale-95"
            >
              <div
                class="flex h-12 w-12 items-center justify-center rounded-2xl border border-purple-500/20 bg-purple-500/10 text-purple-500 transition-transform group-hover:scale-105"
              >
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                  />
                </svg>
              </div>
              <span class="mt-1.5 text-[11px] font-medium leading-tight text-gray-700 dark:text-gray-300"
                >Gudang</span
              >
            </router-link>

            <router-link
              to="/settings"
              class="group flex flex-col items-center transition active:scale-95"
            >
              <div
                class="flex h-12 w-12 items-center justify-center rounded-2xl border border-gray-500/20 bg-gray-500/10 text-gray-500 transition-transform group-hover:scale-105"
              >
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                  />
                </svg>
              </div>
              <span class="mt-1.5 text-[11px] font-medium leading-tight text-gray-700 dark:text-gray-300"
                >Setting</span
              >
            </router-link>
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
import { ref, computed, onMounted } from 'vue'
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

const productsStore = useProductsStore()
const categoriesStore = useCategoriesStore()
const authStore = useAuthStore()

const loading = ref(true)

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

onMounted(async () => {
  try {
    await Promise.all([
      productsStore.fetchProducts(true),
      categoriesStore.fetchCategories(),
    ])
  } catch (error) {
    console.error('Error loading dashboard:', error)
  } finally {
    loading.value = false
  }
})
</script>
