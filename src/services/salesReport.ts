import { supabase } from '@/lib/supabase'
import type { Transaction } from '@/types/database'

export interface SalesSummary {
  // Penjualan
  gross_sales: number           // Penjualan Kotor (subtotal sebelum diskon)
  shipping_cost: number          // Ongkos Kirim
  total_discount: number         // Total Diskon
  total_returns: number          // Total Nilai Retur (harga jual)
  net_sales: number              // Penjualan Bersih = gross_sales - discount - returns

  // Modal & Laba
  raw_cogs: number               // HPP Kotor (modal semua barang terjual)
  returned_cogs: number          // Modal barang yang diretur
  net_cogs: number               // HPP Bersih = raw_cogs - returned_cogs
  gross_profit: number           // Laba Kotor = net_sales - net_cogs

  // Beban & Laba Bersih
  total_operating_expenses: number  // Total Biaya Operasional
  net_profit: number             // Laba Bersih = gross_profit - operating_expenses

  // Statistik
  totalTransactions: number
  averageTransaction: number
  totalItems: number
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

    // Fetch returns data untuk periode yang sama
    const { data: returns, error: returnsError } = await supabase
      .from('returns')
      .select('*, items:return_items(*, product:products(id, name))')
      .gte('created_at', startDate)
      .lte('created_at', endDate + 'T23:59:59')

    if (returnsError) throw returnsError

    const returnData = (returns || []) as any[]

    // Calculate summary dengan data retur
    const summary = this.calculateSummary(txns, returnData)

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

  calculateSummary(transactions: Transaction[], returns: any[] = []): SalesSummary {
    let gross_sales = 0          // Penjualan Kotor (subtotal ASLI dari items sebelum retur)
    let shipping_cost = 0         // Ongkos Kirim
    let total_discount = 0        // Total Diskon
    let total_returns = 0         // Total Nilai Retur (dari tabel returns)
    let totalItems = 0

    // Hitung penjualan ASLI dari transaction_items (sebelum retur mengurangi transactions.subtotal)
    transactions.forEach((t) => {
      // Hitung gross_sales dari SUM(transaction_items.subtotal)
      // BUKAN dari transactions.subtotal yang sudah dikurangi retur
      let transactionGrossSales = 0
      t.items?.forEach((item) => {
        transactionGrossSales += item.subtotal || 0
        totalItems += item.quantity || 0
      })
      gross_sales += transactionGrossSales

      shipping_cost += t.shipping_cost || 0
      total_discount += t.discount || 0
    })

    // Hitung total retur dari tabel returns (field: total_refund)
    returns.forEach((r: any) => {
      total_returns += parseFloat(r.total_refund || 0)
    })

    // Penjualan Bersih = Penjualan Kotor - Diskon - Retur
    const net_sales = gross_sales - total_discount - total_returns

    // Hitung modal (HPP)
    let raw_cogs = 0              // Modal kotor semua barang terjual
    let returned_cogs = 0         // Modal barang yang diretur

    transactions.forEach((t) => {
      t.items?.forEach((item: any) => {
        const hargaBeli = item.product?.price_buy || 0
        raw_cogs += hargaBeli * (item.quantity || 0)
      })
    })

    // Hitung modal barang yang diretur dari tabel return_items
    // Gunakan price_buy yang tersimpan di return_items (historis)
    returns.forEach((r: any) => {
      r.items?.forEach((item: any) => {
        const hargaBeli = item.price_buy || 0
        returned_cogs += hargaBeli * (item.quantity || 0)
      })
    })

    const net_cogs = raw_cogs - returned_cogs

    // Laba Kotor = Penjualan Bersih - HPP Bersih
    const gross_profit = net_sales - net_cogs

    // Beban Operasional (sementara default 0, nanti bisa diambil dari tabel expenses)
    const total_operating_expenses = 0

    // Laba Bersih = Laba Kotor - Beban Operasional
    const net_profit = gross_profit - total_operating_expenses

    const totalTransactions = transactions.length
    const averageTransaction = totalTransactions > 0 ? net_sales / totalTransactions : 0

    return {
      gross_sales,
      shipping_cost,
      total_discount,
      total_returns,
      net_sales,
      raw_cogs,
      returned_cogs,
      net_cogs,
      gross_profit,
      total_operating_expenses,
      net_profit,
      totalTransactions,
      averageTransaction,
      totalItems,
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
