<template>
  <admin-layout>
    <PageBreadcrumb pageTitle="Dashboard" class="hidden md:block" />
    <div class="space-y-6 px-4 md:px-0">
      <!-- Mobile Greeting Banner (data user — tidak butuh skeleton) -->
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

          <!-- Kartu keuangan — skeleton hanya saat data laporan dimuat -->
          <div v-if="loading" class="grid grid-cols-2 gap-3">
            <LoadingSkeleton type="stats" />
            <LoadingSkeleton type="stats" />
          </div>
          <div v-else class="grid grid-cols-2 gap-3">
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

        <!-- Mobile Quick Menu — 3 item + "Lihat Semua" per grup -->
        <div class="md:hidden space-y-3">
          <!-- Header bar -->
          <div class="flex items-center justify-between px-1">
            <span class="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Menu Cepat
            </span>
          </div>

          <!-- Each Module Group -->
          <div
            v-for="group in quickMenuGrouped"
            :key="group.title"
            class="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03]"
          >
            <!-- Section Header -->
            <div class="flex items-center gap-2.5 border-b border-gray-100 px-4 py-3 dark:border-gray-800">
              
              <span class="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                {{ group.title }}
              </span>
              <span class="text-[10px] text-gray-400">({{ group.total }})</span>
            </div>

            <!-- Items Grid: 3 item + tombol "Lihat Semua" -->
            <div class="px-4 py-3">
              <div class="grid grid-cols-4 gap-y-4 gap-x-2 text-center">
                <template v-for="(item, iIdx) in group.visible" :key="item.id">
                  <div class="relative flex flex-col items-center">
                    <router-link
                      :to="item.to"
                      class="group flex flex-col items-center transition active:scale-95"
                    >
                      <div
                        class="flex h-12 w-12 items-center justify-center rounded-2xl border transition-transform group-hover:scale-105"
                        :class="item.iconClass"
                      >
                        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="item.iconPath" />
                        </svg>
                      </div>
                      <span class="mt-1.5 text-[11px] font-medium leading-tight text-gray-700 dark:text-gray-300">
                        {{ item.label }}
                      </span>
                    </router-link>
                  </div>
                </template>

                <!-- Tombol "Lihat Semua" di slot keempat -->
                <div
                  v-if="group.total > 3"
                  class="flex flex-col items-center"
                >
                  <button
                    type="button"
                    @click="router.push(`/quick-menu/${group.slug}`)"
                    class="group flex flex-col items-center transition active:scale-95"
                  >
                    <div
                      class="flex h-12 w-12 items-center justify-center rounded-2xl border border-brand-500/20 bg-brand-500/10 text-brand-500 transition-transform group-hover:scale-105"
                    >
                      <svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                      </svg>
                    </div>
                    <span class="mt-1.5 text-[11px] font-medium leading-tight text-gray-500 dark:text-gray-400">
                      Lihat Semua
                    </span>
                  </button>
                </div>
              </div>
            </div>
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

          <div v-if="loading" class="space-y-2">
            <LoadingSkeleton v-for="i in 3" :key="i" type="list-item" />
          </div>
          <template v-else>
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
          </template>
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
    </div>
  </admin-layout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
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
import {
  QUICK_MENU_GROUPS,
  GROUP_MAP,
  loadQuickMenuFromStorage,
  type QuickMenuItem,
} from '@/data/quickMenu'

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

// ============================================================
// Menu Cepat — urutan diambil dari localStorage (single source
// of truth: src/data/quickMenu.ts), hanya tampil 3 item per grup.
// ============================================================

const router = useRouter()

const quickMenu = ref<QuickMenuItem[]>(loadQuickMenuFromStorage())

/** Derived: quickMenu yang sudah di-group per modul */
const quickMenuGrouped = computed(() => {
  // Buat bucket
  const buckets: Record<string, QuickMenuItem[]> = {}
  for (const g of QUICK_MENU_GROUPS) {
    buckets[g.title] = []
  }

  // Distribusi item ke bucket
  for (const item of quickMenu.value) {
    const groupName = GROUP_MAP[item.id]
    if (groupName && buckets[groupName]) {
      buckets[groupName].push(item)
    }
  }

  // Kembalikan hanya grup yang punya item
  return QUICK_MENU_GROUPS
    .map((g) => ({
      title: g.title,
      color: g.color,
      slug: g.slug,
      items: buckets[g.title],
      visible: buckets[g.title].slice(0, 3),
      total: buckets[g.title].length,
    }))
    .filter((g) => g.items.length > 0)
})

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
