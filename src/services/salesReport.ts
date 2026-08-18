import { supabase } from '@/lib/supabase'
import type { Transaction } from '@/types/database'

export interface SalesSummary {
  totalRevenue: number
  totalTransactions: number
  averageTransaction: number
  totalItems: number
  totalDiscount: number
  totalShipping: number
  profit: number
}

export interface DailySales {
  date: string
  revenue: number
  transactions: number
  items: number
}

export interface ProductSales {
  product_id: string
  product_name: string
  quantity: number
  revenue: number
  profit: number
}

export interface CategorySales {
  category_id: string
  category_name: string
  quantity: number
  revenue: number
  profit: number
}

export interface PaymentMethodSales {
  method: string
  count: number
  total: number
}

export interface SalesReportData {
  summary: SalesSummary
  dailySales: DailySales[]
  topProducts: ProductSales[]
  categorySales: CategorySales[]
  paymentMethods: PaymentMethodSales[]
  transactions: Transaction[]
}

export const salesReportService = {
  async getSalesReport(
    startDate: string,
    endDate: string,
    categoryId?: string
  ): Promise<SalesReportData> {
    // Fetch transactions with items and products for the date range
    let query = supabase
      .from('transactions')
      .select(`
        *,
        items:transaction_items(
          *,
          product:products(id, name, category_id, price_buy, price_sell)
        ),
        payments:transaction_payments(*)
      `)
      .eq('status', 'selesai')
      .gte('created_at', startDate)
      .lte('created_at', endDate + 'T23:59:59')
      .order('created_at', { ascending: false })

    const { data: transactions, error } = await query

    if (error) throw error

    const txns = (transactions || []) as Transaction[]

    // Calculate summary
    const summary = this.calculateSummary(txns)

    // Calculate daily sales
    const dailySales = this.calculateDailySales(txns, startDate, endDate)

    // Calculate top products
    const topProducts = this.calculateProductSales(txns, categoryId)

    // Calculate category sales
    const categorySales = this.calculateCategorySales(txns, categoryId)

    // Calculate payment methods
    const paymentMethods = this.calculatePaymentMethods(txns)

    return {
      summary,
      dailySales,
      topProducts,
      categorySales,
      paymentMethods,
      transactions: txns,
    }
  },

  calculateSummary(transactions: Transaction[]): SalesSummary {
    let totalRevenue = 0
    let totalItems = 0
    let totalDiscount = 0
    let totalShipping = 0

    transactions.forEach((t) => {
      totalRevenue += t.total || 0
      totalDiscount += t.discount || 0
      totalShipping += t.shipping_cost || 0
      t.items?.forEach((item) => {
        totalItems += item.quantity || 0
      })
    })

    const totalTransactions = transactions.length
    const averageTransaction = totalTransactions > 0 ? totalRevenue / totalTransactions : 0

    // Calculate profit (revenue - harga beli)
    let totalModal = 0
    transactions.forEach((t) => {
      t.items?.forEach((item: any) => {
        const hargaBeli = item.product?.price_buy || 0
        totalModal += hargaBeli * (item.quantity || 0)
      })
    })

    const profit = totalRevenue - totalModal

    return {
      totalRevenue,
      totalTransactions,
      averageTransaction,
      totalItems,
      totalDiscount,
      totalShipping,
      profit,
    }
  },

  calculateDailySales(
    transactions: Transaction[],
    startDate: string,
    endDate: string
  ): DailySales[] {
    const dailyMap = new Map<string, DailySales>()

    // Initialize all dates in range
    const start = new Date(startDate)
    const end = new Date(endDate)
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0]
      dailyMap.set(dateStr, {
        date: dateStr,
        revenue: 0,
        transactions: 0,
        items: 0,
      })
    }

    // Aggregate transactions by date
    transactions.forEach((t) => {
      const dateStr = t.created_at.split('T')[0]
      const existing = dailyMap.get(dateStr)
      if (existing) {
        existing.revenue += t.total || 0
        existing.transactions += 1
        t.items?.forEach((item) => {
          existing.items += item.quantity || 0
        })
      }
    })

    return Array.from(dailyMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    )
  },

  calculateProductSales(
    transactions: Transaction[],
    categoryId?: string
  ): ProductSales[] {
    const productMap = new Map<
      string,
      { name: string; quantity: number; revenue: number; modal: number }
    >()

    transactions.forEach((t) => {
      t.items?.forEach((item: any) => {
        const product = item.product
        if (!product) return

        // Filter by category if specified
        if (categoryId && product.category_id !== categoryId) return

        const existing = productMap.get(product.id) || {
          name: product.name,
          quantity: 0,
          revenue: 0,
          modal: 0,
        }
        existing.quantity += item.quantity || 0
        existing.revenue += item.subtotal || 0
        existing.modal += (product.price_buy || 0) * (item.quantity || 0)
        productMap.set(product.id, existing)
      })
    })

    return Array.from(productMap.entries())
      .map(([id, data]) => ({
        product_id: id,
        product_name: data.name,
        quantity: data.quantity,
        revenue: data.revenue,
        profit: data.revenue - data.modal,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)
  },

  calculateCategorySales(
    transactions: Transaction[],
    categoryId?: string
  ): CategorySales[] {
    const categoryMap = new Map<
      string,
      { name: string; quantity: number; revenue: number; modal: number }
    >()

    transactions.forEach((t) => {
      t.items?.forEach((item: any) => {
        const product = item.product
        if (!product) return

        const catId = product.category_id || 'uncategorized'
        const catName = product.category?.name || 'Lainnya'

        // Filter by category if specified
        if (categoryId && catId !== categoryId) return

        const existing = categoryMap.get(catId) || {
          name: catName,
          quantity: 0,
          revenue: 0,
          modal: 0,
        }
        existing.quantity += item.quantity || 0
        existing.revenue += item.subtotal || 0
        existing.modal += (product.price_buy || 0) * (item.quantity || 0)
        categoryMap.set(catId, existing)
      })
    })

    return Array.from(categoryMap.entries())
      .map(([id, data]) => ({
        category_id: id,
        category_name: data.name,
        quantity: data.quantity,
        revenue: data.revenue,
        profit: data.revenue - data.modal,
      }))
      .sort((a, b) => b.revenue - a.revenue)
  },

  calculatePaymentMethods(transactions: Transaction[]): PaymentMethodSales[] {
    const methodMap = new Map<string, { count: number; total: number }>()

    transactions.forEach((t) => {
      const method = t.payment_method || 'Lainnya'
      const existing = methodMap.get(method) || { count: 0, total: 0 }
      existing.count += 1
      existing.total += t.paid_amount || 0
      methodMap.set(method, existing)
    })

    return Array.from(methodMap.entries())
      .map(([method, data]) => ({
        method,
        count: data.count,
        total: data.total,
      }))
      .sort((a, b) => b.total - a.total)
  },
}
