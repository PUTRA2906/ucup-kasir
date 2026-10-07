<template>
  <admin-layout>
    <PageBreadcrumb pageTitle="Dashboard" class="hidden md:block" />
    <div class="space-y-6 px-4 md:px-0">
      <!-- Mobile Greeting Banner -->
      <div class="md:hidden">
        <MobileGreeting
          :display-name="displayName"
          :unread-count="notificationsStore.unreadCount"
        />
      </div>

      <!-- Mobile Account Balance Carousel -->
      <div class="md:hidden">
        <MobileAccountBalance
          :hidden="financialHidden"
          :loading="loadingAccounts"
          :cash-balance="cashBalance"
          :bank-balance="bankBalance"
          @toggle-visibility="toggleFinancialVisibility"
        />
      </div>

      <!-- Mobile Quick Menu -->
      <div class="md:hidden">
        <MobileQuickMenu
          :menu-groups="QUICK_MENU_GROUPS"
          :pending-shipments-count="pendingShipmentsCount"
          @navigate-group="(slug) => router.push(`/quick-menu/${slug}`)"
        />
      </div>

      <!-- Mobile Peringatan Stok Gudang -->
      <div class="md:hidden">
        <MobileLowStockWarning
          :loading="loading"
          :products="lowStockProducts"
        />
      </div>

      <!-- Desktop Greeting -->
      <div class="hidden md:block">
        <DesktopGreeting
          :display-name="displayName"
          :today-label="todayLabel"
        />
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
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import DashboardStats from '@/components/ecommerce/DashboardStats.vue'
import LowStockList from '@/components/ecommerce/LowStockList.vue'
import CategoryBreakdown from '@/components/ecommerce/CategoryBreakdown.vue'
import RecentProductsList from '@/components/ecommerce/RecentProductsList.vue'
import MobileGreeting from '@/components/dashboard/MobileGreeting.vue'
import MobileAccountBalance from '@/components/dashboard/MobileAccountBalance.vue'
import MobileQuickMenu from '@/components/dashboard/MobileQuickMenu.vue'
import MobileLowStockWarning from '@/components/dashboard/MobileLowStockWarning.vue'
import DesktopGreeting from '@/components/dashboard/DesktopGreeting.vue'
import { useProductsStore } from '@/stores/products'
import { useCategoriesStore } from '@/stores/categories'
import { useAuthStore } from '@/stores/auth'
import { useSalesReportStore } from '@/stores/salesReport'
import { useNotificationsStore } from '@/stores/notifications'
import { useFinanceStore } from '@/stores/finance'
import { useTransactionsStore } from '@/stores/transactions'
import { useShippingStore } from '@/stores/shipping'
import { QUICK_MENU_GROUPS } from '@/data/quickMenu'

const router = useRouter()
const productsStore = useProductsStore()
const categoriesStore = useCategoriesStore()
const authStore = useAuthStore()
const salesReportStore = useSalesReportStore()
const notificationsStore = useNotificationsStore()
const financeStore = useFinanceStore()
const transactionsStore = useTransactionsStore()
const shippingStore = useShippingStore()

const loading = ref(true)
const loadingAccounts = ref(true)
const financialHidden = ref(localStorage.getItem('dashboard_financial_hidden') === 'true')
const cashBalance = ref(0)
const bankBalance = ref(0)

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

const pendingShipmentsCount = computed(() => {
  const shippedIds = new Set<string>()
  for (const dorder of shippingStore.deliveryOrders) {
    const txIds = dorder.transaction_ids || []
    txIds.forEach((id) => shippedIds.add(id))
  }

  return transactionsStore.transactions.filter((t) => {
    const notVoided = t.status !== 'void' && t.status !== 'batal'
    const notShipped = !shippedIds.has(t.id)
    return notVoided && notShipped
  }).length
})

onMounted(async () => {
  try {
    salesReportStore.applyPreset('thisMonth')
    await Promise.all([
      productsStore.fetchProducts(true),
      categoriesStore.fetchCategories(),
      salesReportStore.fetchSalesReport(),
      notificationsStore.fetchNotifications(),
      loadAccountBalances(),
      transactionsStore.fetchTransactions(),
      shippingStore.fetchDeliveryOrders(),
    ])
  } catch (error) {
    console.error('Error loading dashboard:', error)
  } finally {
    loading.value = false
  }
})

const loadAccountBalances = async () => {
  loadingAccounts.value = true
  try {
    const balances = await financeStore.getAccountBalances()

    const cashAccount = balances.find(b => b.account_code === '1-1000' || b.account_name.toLowerCase().includes('kas'))
    const bankAccount = balances.find(b => b.account_code === '1-1010' || b.account_name.toLowerCase().includes('bank'))

    cashBalance.value = cashAccount?.balance || 0
    bankBalance.value = bankAccount?.balance || 0
  } catch (error) {
    console.error('Error loading account balances:', error)
    cashBalance.value = 0
    bankBalance.value = 0
  } finally {
    loadingAccounts.value = false
  }
}
</script>
