import { defineStore } from 'pinia'
import { ref } from 'vue'
import { salesReportEnhancedService } from '@/services/salesReportEnhanced'
import type {
  EnhancedSalesSummary,
  TransactionDetail,
  ProductPerformance,
  EnhancedReportData,
} from '@/services/salesReportEnhanced'

export const useSalesReportEnhancedStore = defineStore('salesReportEnhanced', () => {
  const summary = ref<EnhancedSalesSummary>({
    gross_sales: 0,
    total_discount: 0,
    total_returns: 0,
    net_sales: 0,
    raw_cogs: 0,
    returned_cogs: 0,
    net_cogs: 0,
    gross_profit: 0,
    gross_profit_margin: 0,
    total_cash_received: 0,
    total_receivables: 0,
    realized_profit: 0,
    unrealized_profit: 0,
    total_transactions: 0,
    average_transaction: 0,
    total_items: 0,
    lunas_count: 0,
    lunas_amount: 0,
    tempo_count: 0,
    tempo_amount: 0,
    partial_count: 0,
    partial_amount: 0,
  })

  const transactions = ref<TransactionDetail[]>([])
  const topProducts = ref<ProductPerformance[]>([])
  const topReturns = ref<ProductPerformance[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Filter state
  const dateRange = ref({
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  })
  const paymentStatusFilter = ref<'lunas' | 'belum_lunas' | 'all'>('all')
  const selectedCustomerIds = ref<string[]>([])

  async function fetchReport() {
    loading.value = true
    error.value = null

    try {
      const data: EnhancedReportData = await salesReportEnhancedService.getEnhancedSalesReport(
        dateRange.value.start,
        dateRange.value.end,
        paymentStatusFilter.value,
        selectedCustomerIds.value.length > 0 ? selectedCustomerIds.value : undefined
      )

      summary.value = data.summary
      transactions.value = data.transactions
      topProducts.value = data.top_products
      topReturns.value = data.top_returns
    } catch (e: any) {
      error.value = e.message || 'Gagal memuat laporan'
      console.error('Error fetching enhanced report:', e)
    } finally {
      loading.value = false
    }
  }

  function setDateRange(start: string, end: string) {
    dateRange.value = { start, end }
  }

  function setPaymentStatusFilter(status: 'lunas' | 'belum_lunas' | 'all') {
    paymentStatusFilter.value = status
  }

  function setCustomerFilter(customerIds: string[]) {
    selectedCustomerIds.value = customerIds
  }

  function resetFilters() {
    const today = new Date().toISOString().split('T')[0]
    dateRange.value = { start: today, end: today }
    paymentStatusFilter.value = 'all'
    selectedCustomerIds.value = []
  }

  return {
    summary,
    transactions,
    topProducts,
    topReturns,
    loading,
    error,
    dateRange,
    paymentStatusFilter,
    selectedCustomerIds,
    fetchReport,
    setDateRange,
    setPaymentStatusFilter,
    setCustomerFilter,
    resetFilters,
  }
})
