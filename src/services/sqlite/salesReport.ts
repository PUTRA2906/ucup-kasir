import { query, queryOne } from '@/lib/sqlite'
import { getCurrentUserId } from '@/services/sqlite/db'
import type { Transaction, TransactionItem, TransactionPayment } from '@/types/database'

// ============================================================
// SQLite Service: Sales Report
// Mirror dari src/services/salesReport.ts tapi baca dari SQLite lokal.
// Struktur data SAMA persis dengan versi Supabase agar store & view
// tidak perlu diubah: transactions + items(with product join) + payments.
// ============================================================

export interface SalesSummary {
  gross_sales: number
  shipping_cost: number
  total_discount: number
  total_returns: number
  net_sales: number
  raw_cogs: number
  returned_cogs: number
  net_cogs: number
  gross_profit: number
  total_operating_expenses: number
  net_profit: number
  totalTransactions: number
  averageTransaction: number
  totalItems: number
  total_cash_received?: number
  total_receivables?: number
  realized_profit?: number
  unrealized_profit?: number
  lunas_count?: number
  tempo_count?: number
  partial_count?: number
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

// TransactionItem + product (untuk kalkulasi HPP & kategori)
interface ReportItem extends TransactionItem {
  product?: {
    id: string
    name: string
    category_id?: string
    price_buy: number
    price_sell: number
    category?: { id: string; name: string }
  }
}

interface ReportReturn {
  id: string
  transaction_id: string
  total_refund: number
  items?: Array<{
    id: string
    product_id?: string
    product_name: string
    price: number
    price_buy: number
    quantity: number
    subtotal: number
  }>
}

export const sqliteSalesReportService = {
  async getSalesReport(
    startDate: string,
    endDate: string,
    categoryId?: string,
    paymentStatusFilter?: 'lunas' | 'belum_lunas' | 'all'
  ): Promise<SalesReportData> {
    const userId = getCurrentUserId()

    // --- 1. Fetch transactions (dengan items + product info + payments) ---
    const params: (string | number)[] = [userId, startDate, endDate + 'T23:59:59']
    let statusFilter = ''
    if (paymentStatusFilter && paymentStatusFilter !== 'all') {
      statusFilter = ' AND t.payment_status = ?'
      params.push(paymentStatusFilter)
    }

    const txnRows = await query<any>(
      `SELECT t.*
       FROM transactions t
       WHERE t.user_id = ? AND t.status = 'selesai'
         AND t.created_at >= ? AND t.created_at <= ?${statusFilter}
       ORDER BY t.created_at DESC`,
      params
    )

    // --- 2. Fetch items + products untuk transaksi tsb ---
    const txns: Transaction[] = []
    for (const t of txnRows) {
      const txn: Transaction = this.mapTransaction(t)

      const itemRows = await query<any>(
        `SELECT ti.id, ti.user_id, ti.transaction_id, ti.product_id, ti.product_name,
                ti.price, ti.quantity, ti.subtotal, ti.created_at,
                p.id AS p_id, p.name AS p_name, p.category_id AS p_category_id,
                p.price_buy AS p_price_buy, p.price_sell AS p_price_sell,
                c.id AS c_id, c.name AS c_name
         FROM transaction_items ti
         LEFT JOIN products p ON p.id = ti.product_id AND p.user_id = ti.user_id
         LEFT JOIN categories c ON c.id = p.category_id AND c.user_id = p.user_id
         WHERE ti.transaction_id = ? AND ti.user_id = ?
         ORDER BY ti.created_at ASC`,
        [t.id, userId]
      )

      txn.items = itemRows.map((r: any) => ({
        id: r.id,
        user_id: r.user_id,
        transaction_id: r.transaction_id,
        product_id: r.product_id ?? undefined,
        product_name: r.product_name,
        price: r.price,
        quantity: r.quantity,
        subtotal: r.subtotal,
        created_at: r.created_at,
        product: r.p_id ? {
          id: r.p_id,
          name: r.p_name,
          category_id: r.p_category_id ?? undefined,
          price_buy: r.p_price_buy,
          price_sell: r.p_price_sell,
          category: r.c_id ? { id: r.c_id, name: r.c_name } : undefined,
        } : undefined,
      }))

      const paymentRows = await query<any>(
        `SELECT * FROM transaction_payments WHERE transaction_id = ? AND user_id = ? ORDER BY created_at ASC`,
        [t.id, userId]
      )
      txn.payments = paymentRows.map((r: any) => this.mapPayment(r))

      txns.push(txn)
    }

    // --- 3. Fetch returns untuk periode yang sama ---
    const returnRows = await query<any>(
      `SELECT r.* FROM returns r
       WHERE r.user_id = ? AND r.created_at >= ? AND r.created_at <= ?
       ORDER BY r.created_at DESC`,
      [userId, startDate, endDate + 'T23:59:59']
    )

    const returns: ReportReturn[] = []
    for (const r of returnRows) {
      const ret: ReportReturn = {
        id: r.id,
        transaction_id: r.transaction_id,
        total_refund: r.total_refund,
      }
      const riRows = await query<any>(
        `SELECT ri.* FROM return_items ri
         WHERE ri.return_id = ? AND ri.user_id = ? ORDER BY ri.created_at ASC`,
        [r.id, userId]
      )
      ret.items = riRows.map((ri: any) => ({
        id: ri.id,
        product_id: ri.product_id ?? undefined,
        product_name: ri.product_name,
        price: ri.price,
        price_buy: ri.price_buy,
        quantity: ri.quantity,
        subtotal: ri.subtotal,
      }))
      returns.push(ret)
    }

    // --- 4. Kalkulasi (reuse logika yang sama persis) ---
    const summary = this.calculateSummary(txns, returns)
    const dailySales = this.calculateDailySales(txns, startDate, endDate)
    const topProducts = this.calculateProductSales(txns, categoryId)
    const categorySales = this.calculateCategorySales(txns, categoryId)
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

  // ============================================================
  // Kalkulasi (identik dengan salesReport.ts — di-copy agar konsisten)
  // ============================================================

  calculateSummary(transactions: Transaction[], returns: any[] = []): SalesSummary {
    let gross_sales = 0
    let shipping_cost = 0
    let total_discount = 0
    let total_returns = 0
    let totalItems = 0

    transactions.forEach((t) => {
      let transactionGrossSales = 0
      t.items?.forEach((item: any) => {
        transactionGrossSales += item.subtotal || 0
        totalItems += item.quantity || 0
      })
      gross_sales += transactionGrossSales

      shipping_cost += t.shipping_cost || 0
      total_discount += t.discount || 0
    })

    returns.forEach((r: any) => {
      total_returns += parseFloat(r.total_refund || 0)
    })

    const net_sales = gross_sales - total_discount - total_returns

    let raw_cogs = 0
    let returned_cogs = 0

    transactions.forEach((t) => {
      t.items?.forEach((item: any) => {
        const hargaBeli = item.product?.price_buy || 0
        raw_cogs += hargaBeli * (item.quantity || 0)
      })
    })

    returns.forEach((r: any) => {
      r.items?.forEach((item: any) => {
        const hargaBeli = item.price_buy || 0
        returned_cogs += hargaBeli * (item.quantity || 0)
      })
    })

    const net_cogs = raw_cogs - returned_cogs
    const gross_profit = net_sales - net_cogs
    const total_operating_expenses = 0
    const net_profit = gross_profit - total_operating_expenses

    // Laba terealisasi
    const returnsByTx = new Map<string, any[]>()
    returns.forEach((r: any) => {
      const list = returnsByTx.get(r.transaction_id) || []
      list.push(r)
      returnsByTx.set(r.transaction_id, list)
    })

    let total_cash_received = 0
    let total_receivables = 0
    let realized_profit = 0
    let unrealized_profit = 0
    let lunas_count = 0
    let tempo_count = 0
    let partial_count = 0

    transactions.forEach((t) => {
      const paidAmount = t.paid_amount || 0
      const remainingAmount = t.remaining_amount || 0

      const txReturns = returnsByTx.get(t.id) || []
      let txReturnValue = 0
      let txReturnCogs = 0
      txReturns.forEach((r: any) => {
        txReturnValue += parseFloat(r.total_refund || 0)
        r.items?.forEach((item: any) => {
          txReturnCogs += (item.price_buy || 0) * (item.quantity || 0)
        })
      })

      let txRevenue = 0
      let txCogs = 0
      t.items?.forEach((item: any) => {
        txRevenue += item.subtotal || 0
        txCogs += (item.product?.price_buy || 0) * (item.quantity || 0)
      })
      const txNetSales = txRevenue - (t.discount || 0) - txReturnValue
      const txProfit = txNetSales - (txCogs - txReturnCogs)

      const effectiveCash = Math.max(0, Math.min(paidAmount, txNetSales))
      total_cash_received += effectiveCash
      total_receivables += remainingAmount

      const txRatio = txNetSales > 0 ? effectiveCash / txNetSales : 0
      realized_profit += txProfit * txRatio
      unrealized_profit += txProfit * (1 - txRatio)

      if (t.payment_status === 'lunas') {
        lunas_count++
      } else if (paidAmount === 0) {
        tempo_count++
      } else {
        partial_count++
      }
    })

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
      total_cash_received,
      total_receivables,
      realized_profit,
      unrealized_profit,
      lunas_count,
      tempo_count,
      partial_count,
    }
  },

  calculateDailySales(
    transactions: Transaction[],
    startDate: string,
    endDate: string
  ): DailySales[] {
    const dailyMap = new Map<string, DailySales>()

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

  // ============================================================
  // Internal helpers
  // ============================================================

  mapTransaction(r: any): Transaction {
    return {
      id: r.id,
      user_id: r.user_id,
      transaction_number: r.transaction_number,
      customer_id: r.customer_id ?? undefined,
      customer_name: r.customer_name ?? undefined,
      subtotal: r.subtotal,
      discount: r.discount,
      shipping_cost: r.shipping_cost ?? undefined,
      return_amount: r.return_amount ?? undefined,
      total: r.total,
      payment_method: r.payment_method,
      paid_amount: r.paid_amount,
      change_amount: r.change_amount,
      remaining_amount: r.remaining_amount,
      payment_status: r.payment_status,
      status: r.status,
      notes: r.notes ?? undefined,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }
  },

  mapPayment(r: any): TransactionPayment {
    return {
      id: r.id,
      user_id: r.user_id,
      transaction_id: r.transaction_id,
      amount: r.amount,
      payment_method: r.payment_method,
      notes: r.notes ?? undefined,
      created_at: r.created_at,
    }
  },
}
