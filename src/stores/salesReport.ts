import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { salesReportService } from '@/services/salesReport'
import type {
  SalesReportData,
  SalesSummary,
  DailySales,
  ProductSales,
  CategorySales,
  PaymentMethodSales,
} from '@/services/salesReport'
import type { Transaction } from '@/types/database'

export const useSalesReportStore = defineStore('salesReport', () => {
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Date range
  const startDate = ref<string>(getTodayStart())
  const endDate = ref<string>(getTodayEnd())
  const selectedCategoryId = ref<string | undefined>(undefined)

  // Report data
  const summary = ref<SalesSummary>({
    totalRevenue: 0,
    totalTransactions: 0,
    averageTransaction: 0,
    totalItems: 0,
    totalDiscount: 0,
    totalShipping: 0,
    profit: 0,
  })
  const dailySales = ref<DailySales[]>([])
  const topProducts = ref<ProductSales[]>([])
  const categorySales = ref<CategorySales[]>([])
  const paymentMethods = ref<PaymentMethodSales[]>([])
  const transactions = ref<Transaction[]>([])

  // Preset date ranges
  const datePresets = [
    { label: 'Hari Ini', value: 'today' },
    { label: '7 Hari Terakhir', value: '7days' },
    { label: '30 Hari Terakhir', value: '30days' },
    { label: 'Bulan Ini', value: 'thisMonth' },
    { label: 'Bulan Lalu', value: 'lastMonth' },
    { label: 'Tahun Ini', value: 'thisYear' },
  ]

  function getTodayStart(): string {
    const now = new Date()
    return now.toISOString().split('T')[0]
  }

  function getTodayEnd(): string {
    const now = new Date()
    return now.toISOString().split('T')[0]
  }

  function applyPreset(preset: string) {
    const now = new Date()
    const today = now.toISOString().split('T')[0]

    switch (preset) {
      case 'today':
        startDate.value = today
        endDate.value = today
        break
      case '7days': {
        const sevenDaysAgo = new Date(now)
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
        startDate.value = sevenDaysAgo.toISOString().split('T')[0]
        endDate.value = today
        break
      }
      case '30days': {
        const thirtyDaysAgo = new Date(now)
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29)
        startDate.value = thirtyDaysAgo.toISOString().split('T')[0]
        endDate.value = today
        break
      }
      case 'thisMonth': {
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
        startDate.value = firstDay.toISOString().split('T')[0]
        endDate.value = today
        break
      }
      case 'lastMonth': {
        const lastMonthFirst = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        const lastMonthLast = new Date(now.getFullYear(), now.getMonth(), 0)
        startDate.value = lastMonthFirst.toISOString().split('T')[0]
        endDate.value = lastMonthLast.toISOString().split('T')[0]
        break
      }
      case 'thisYear': {
        const yearStart = new Date(now.getFullYear(), 0, 1)
        startDate.value = yearStart.toISOString().split('T')[0]
        endDate.value = today
        break
      }
    }
  }

  async function fetchSalesReport() {
    loading.value = true
    error.value = null
    try {
      const data = await salesReportService.getSalesReport(
        startDate.value,
        endDate.value,
        selectedCategoryId.value
      )
      summary.value = data.summary
      dailySales.value = data.dailySales
      topProducts.value = data.topProducts
      categorySales.value = data.categorySales
      paymentMethods.value = data.paymentMethods
      transactions.value = data.transactions
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  function setCategoryFilter(categoryId: string | undefined) {
    selectedCategoryId.value = categoryId
    fetchSalesReport()
  }

  return {
    loading,
    error,
    startDate,
    endDate,
    selectedCategoryId,
    summary,
    dailySales,
    topProducts,
    categorySales,
    paymentMethods,
    transactions,
    datePresets,
    fetchSalesReport,
    applyPreset,
    setCategoryFilter,
  }
})
