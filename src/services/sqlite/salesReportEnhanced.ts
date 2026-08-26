import { query } from '@/lib/sqlite'
import { getCurrentUserId } from '@/services/sqlite/db'
import type { Transaction } from '@/types/database'

// ============================================================
// INTERFACES & TYPES (identik dengan salesReportEnhanced.ts)
// ============================================================

export interface EnhancedSalesSummary {
  gross_sales: number
  total_discount: number
  total_returns: number
  net_sales: number
  raw_cogs: number
  returned_cogs: number
  net_cogs: number
  gross_profit: number
  gross_profit_margin: number
  total_cash_received: number
  total_receivables: number
  realized_profit: number
  unrealized_profit: number
  total_transactions: number
  average_transaction: number
  total_items: number
  lunas_count: number
  lunas_amount: number
  tempo_count: number
  tempo_amount: number
  partial_count: number
  partial_amount: number
}

export interface TransactionDetail extends Transaction {
  transaction_cogs: number
  transaction_profit: number
  profit_margin: number
  cash_received: number
  receivable: number
  realized_profit: number
  unrealized_profit: number
}

export interface ProductPerformance {
  product_id: string
  product_name: string
  quantity_sold: number
  quantity_returned: number
  net_quantity: number
  revenue: number
  cogs: number
  profit: number
  profit_margin: number
  return_rate: number
}

export interface EnhancedReportData {
  summary: EnhancedSalesSummary
  transactions: TransactionDetail[]
  top_products: ProductPerformance[]
  top_returns: ProductPerformance[]
}

export interface TransactionProfitItem {
  product_id?: string
  product_name: string
  quantity: number
  price: number
  subtotal: number
  price_buy: number
  cogs: number
  profit: number
  margin: number
  returned_qty: number
  returned_value: number
}

export interface TransactionProfitDetail {
  transaction: TransactionDetail
  items: TransactionProfitItem[]
  returns: any[]
  return_cogs: number
}

// ============================================================
// SERVICE IMPLEMENTATION (baca dari SQLite lokal)
// ============================================================

export const sqliteSalesReportEnhancedService = {
  /**
   * Mengambil laporan penjualan & laba rugi yang komprehensif
   * dari SQLite lokal (mirror getEnhancedSalesReport versi Supabase)
   */
  async getEnhancedSalesReport(
    startDate: string,
    endDate: string,
    paymentStatusFilter?: 'lunas' | 'belum_lunas' | 'all',
    customerIds?: string[]
  ): Promise<EnhancedReportData> {
    const userId = getCurrentUserId()

    // --- 1. Fetch transactions + items + product + payments ---
    const params: (string | number)[] = [userId, startDate, endDate + 'T23:59:59']
    let filter = ''

    if (paymentStatusFilter && paymentStatusFilter !== 'all') {
      filter += ' AND t.payment_status = ?'
      params.push(paymentStatusFilter)
    }

    if (customerIds && customerIds.length > 0) {
      const placeholders = customerIds.map(() => '?').join(', ')
      filter += ` AND t.customer_id IN (${placeholders})`
      params.push(...customerIds)
    }

    const txnRows = await query<any>(
      `SELECT t.* FROM transactions t
       WHERE t.user_id = ? AND t.status = 'selesai'
         AND t.created_at >= ? AND t.created_at <= ?${filter}
       ORDER BY t.created_at DESC`,
      params
    )

    const txns: Transaction[] = []
    for (const t of txnRows) {
      txns.push(await this.fetchTransactionDetail(t))
    }

    // --- 2. Fetch returns + items untuk periode yang sama ---
    const returnRows = await query<any>(
      `SELECT r.* FROM returns r
       WHERE r.user_id = ? AND r.created_at >= ? AND r.created_at <= ?
       ORDER BY r.created_at DESC`,
      [userId, startDate, endDate + 'T23:59:59']
    )

    const returnData = await this.fetchReturnsWithItems(returnRows)

    // --- 3. Kalkulasi (reuse logika identik) ---
    const summary = this.calculateEnhancedSummary(txns, returnData)
    const transactionDetails = this.calculateTransactionDetails(txns, returnData)
    const topProducts = this.calculateProductPerformance(txns, returnData, 'top')
    const topReturns = this.calculateProductPerformance(txns, returnData, 'returns')

    return {
      summary,
      transactions: transactionDetails,
      top_products: topProducts,
      top_returns: topReturns,
    }
  },

  /**
   * Mengambil detail laba per transaksi + breakdown per item
   */
  async getTransactionProfitDetail(transactionId: string): Promise<TransactionProfitDetail> {
    const userId = getCurrentUserId()

    const txnRows = await query<any>(
      `SELECT * FROM transactions WHERE id = ? AND user_id = ? LIMIT 1`,
      [transactionId, userId]
    )
    if (txnRows.length === 0) {
      throw new Error('Transaksi tidak ditemukan')
    }

    const transaction = await this.fetchTransactionDetail(txnRows[0])

    // Ambil retur terkait
    const returnRows = await query<any>(
      `SELECT * FROM returns WHERE transaction_id = ? AND user_id = ? ORDER BY created_at ASC`,
      [transactionId, userId]
    )
    const returnData = await this.fetchReturnsWithItems(returnRows)

    // Hitung detail per item
    let txCogs = 0
    let txRevenue = 0
    let totalReturnValue = 0
    let totalReturnCogs = 0

    // Map retur per product_id
    const returnMap = new Map<string, { qty: number; value: number; cogs: number }>()
    returnData.forEach((r: any) => {
      totalReturnValue += parseFloat(r.total_refund || 0)
      r.items?.forEach((item: any) => {
        const pid = item.product_id || 'unknown'
        const existing = returnMap.get(pid) || { qty: 0, value: 0, cogs: 0 }
        existing.qty += item.quantity || 0
        existing.value += (item.price || 0) * (item.quantity || 0)
        existing.cogs += (item.price_buy || 0) * (item.quantity || 0)
        returnMap.set(pid, existing)
      })
    })

    const items: TransactionProfitItem[] = (transaction.items || []).map((item: any) => {
      const pid = item.product_id || 'unknown'
      const ret = returnMap.get(pid) || { qty: 0, value: 0, cogs: 0 }
      const priceBuy = item.product?.price_buy || 0
      const itemCogs = priceBuy * (item.quantity || 0)
      const itemSubtotal = item.subtotal || 0

      // Bagi diskon & retur proporsional ke tiap item
      const discountRatio = itemSubtotal / (txRevenue || 1)
      const itemDiscount = (transaction.discount || 0) * discountRatio
      const itemReturnValue = ret.value
      const itemReturnCogs = ret.cogs
      const itemNetRevenue = itemSubtotal - itemDiscount - itemReturnValue
      const itemNetCogs = itemCogs - itemReturnCogs
      const itemProfit = itemNetRevenue - itemNetCogs
      const itemMargin = itemNetRevenue > 0 ? (itemProfit / itemNetRevenue) * 100 : 0

      txCogs += itemCogs
      txRevenue += itemSubtotal

      return {
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity || 0,
        price: item.price || 0,
        subtotal: itemSubtotal,
        price_buy: priceBuy,
        cogs: itemNetCogs,
        profit: itemProfit,
        margin: itemMargin,
        returned_qty: ret.qty,
        returned_value: ret.value,
      }
    })

    // Hitung summary per transaksi
    const netRevenue = txRevenue - (transaction.discount || 0) - totalReturnValue
    const netCogs = txCogs - totalReturnCogs
    const profit = netRevenue - netCogs
    const profitMargin = netRevenue > 0 ? (profit / netRevenue) * 100 : 0
    const cashReceived = Math.max(0, Math.min(transaction.paid_amount || 0, netRevenue))
    const realizationRatio = netRevenue > 0 ? cashReceived / netRevenue : 0
    const realizedProfit = profit * realizationRatio
    const unrealizedProfit = profit - realizedProfit

    const transactionDetail: TransactionDetail = {
      ...transaction,
      transaction_cogs: netCogs,
      transaction_profit: profit,
      profit_margin: profitMargin,
      cash_received: cashReceived,
      receivable: transaction.remaining_amount || 0,
      realized_profit: realizedProfit,
      unrealized_profit: unrealizedProfit,
    }

    return {
      transaction: transactionDetail,
      items,
      returns: returnData,
      return_cogs: totalReturnCogs,
    }
  },

  /**
   * Menghitung summary dengan pemisahan laba akrual vs terealisasi
   */
  calculateEnhancedSummary(
    transactions: Transaction[],
    returns: any[]
  ): EnhancedSalesSummary {
    let gross_sales = 0
    let total_discount = 0
    let total_returns = 0
    let total_items = 0

    let raw_cogs = 0
    let returned_cogs = 0

    let total_cash_received = 0
    let total_receivables = 0

    let lunas_count = 0
    let lunas_amount = 0
    let tempo_count = 0
    let tempo_amount = 0
    let partial_count = 0
    let partial_amount = 0

    let realized_profit = 0
    let unrealized_profit = 0

    // Kelompokkan retur per transaksi agar laba dihitung per transaksi
    const returnsByTx = new Map<string, any[]>()
    returns.forEach((r: any) => {
      const list = returnsByTx.get(r.transaction_id) || []
      list.push(r)
      returnsByTx.set(r.transaction_id, list)
    })

    // Hitung dari transaksi
    transactions.forEach((t) => {
      let txGrossSales = 0
      let txCogs = 0

      t.items?.forEach((item: any) => {
        const itemSubtotal = item.subtotal || 0
        const priceBuy = item.product?.price_buy || 0
        const qty = item.quantity || 0

        txGrossSales += itemSubtotal
        txCogs += priceBuy * qty
        total_items += qty
      })

      gross_sales += txGrossSales
      raw_cogs += txCogs
      total_discount += t.discount || 0

      // Kas masuk & piutang
      const paidAmount = t.paid_amount || 0
      const remainingAmount = t.remaining_amount || 0

      // Nilai & modal retur untuk transaksi ini
      const txReturns = returnsByTx.get(t.id) || []
      let txReturnValue = 0
      let txReturnCogs = 0
      txReturns.forEach((r: any) => {
        txReturnValue += parseFloat(r.total_refund || 0)
        r.items?.forEach((item: any) => {
          txReturnCogs += (item.price_buy || 0) * (item.quantity || 0)
        })
      })

      // Penjualan bersih & laba per transaksi
      const txNetSales = txGrossSales - (t.discount || 0) - txReturnValue
      const txProfit = txNetSales - (txCogs - txReturnCogs)

      // Kas efektif
      const effectiveCash = Math.max(0, Math.min(paidAmount, txNetSales))

      total_cash_received += effectiveCash
      total_receivables += remainingAmount

      // Laba riil & tertahan per transaksi
      const txRatio = txNetSales > 0 ? effectiveCash / txNetSales : 0
      realized_profit += txProfit * txRatio
      unrealized_profit += txProfit * (1 - txRatio)

      // Breakdown status pembayaran
      if (t.payment_status === 'lunas') {
        lunas_count++
        lunas_amount += t.total || 0
      } else if (paidAmount === 0) {
        tempo_count++
        tempo_amount += t.total || 0
      } else {
        partial_count++
        partial_amount += t.total || 0
      }
    })

    // Hitung retur
    returns.forEach((r: any) => {
      total_returns += parseFloat(r.total_refund || 0)

      r.items?.forEach((item: any) => {
        const priceBuy = item.price_buy || 0
        const qty = item.quantity || 0
        returned_cogs += priceBuy * qty
      })
    })

    // Perhitungan final
    const net_sales = gross_sales - total_discount - total_returns
    const net_cogs = raw_cogs - returned_cogs
    const gross_profit = net_sales - net_cogs
    const gross_profit_margin = net_sales > 0 ? (gross_profit / net_sales) * 100 : 0

    const total_transactions = transactions.length
    const average_transaction = total_transactions > 0 ? net_sales / total_transactions : 0

    return {
      gross_sales,
      total_discount,
      total_returns,
      net_sales,
      raw_cogs,
      returned_cogs,
      net_cogs,
      gross_profit,
      gross_profit_margin,
      total_cash_received,
      total_receivables,
      realized_profit,
      unrealized_profit,
      total_transactions,
      average_transaction,
      total_items,
      lunas_count,
      lunas_amount,
      tempo_count,
      tempo_amount,
      partial_count,
      partial_amount,
    }
  },

  /**
   * Menghitung detail per transaksi dengan breakdown laba
   */
  calculateTransactionDetails(
    transactions: Transaction[],
    returns: any[]
  ): TransactionDetail[] {
    return transactions.map((t) => {
      let txCogs = 0
      let txRevenue = 0

      t.items?.forEach((item: any) => {
        const priceBuy = item.product?.price_buy || 0
        const qty = item.quantity || 0
        const subtotal = item.subtotal || 0

        txCogs += priceBuy * qty
        txRevenue += subtotal
      })

      // Cari retur yang terkait dengan transaksi ini
      const relatedReturns = returns.filter((r: any) => r.transaction_id === t.id)
      let returnValue = 0
      let returnCogs = 0

      relatedReturns.forEach((r: any) => {
        returnValue += parseFloat(r.total_refund || 0)
        r.items?.forEach((item: any) => {
          returnCogs += (item.price_buy || 0) * (item.quantity || 0)
        })
      })

      const netRevenue = txRevenue - (t.discount || 0) - returnValue
      const netCogs = txCogs - returnCogs
      const profit = netRevenue - netCogs
      const profitMargin = netRevenue > 0 ? (profit / netRevenue) * 100 : 0

      // Kas efektif
      const cashReceived = Math.max(0, Math.min(t.paid_amount || 0, netRevenue))
      const receivable = t.remaining_amount || 0

      // Laba terealisasi berdasarkan proporsi kas
      const realizationRatio = netRevenue > 0 ? cashReceived / netRevenue : 0
      const realizedProfit = profit * realizationRatio
      const unrealizedProfit = profit - realizedProfit

      return {
        ...t,
        transaction_cogs: netCogs,
        transaction_profit: profit,
        profit_margin: profitMargin,
        cash_received: cashReceived,
        receivable: receivable,
        realized_profit: realizedProfit,
        unrealized_profit: unrealizedProfit,
      }
    })
  },

  /**
   * Menghitung performa produk (top 5 terlaris atau top 5 paling banyak diretur)
   */
  calculateProductPerformance(
    transactions: Transaction[],
    returns: any[],
    mode: 'top' | 'returns'
  ): ProductPerformance[] {
    const productMap = new Map<
      string,
      {
        name: string
        sold: number
        returned: number
        revenue: number
        cogs: number
      }
    >()

    // Hitung penjualan
    transactions.forEach((t) => {
      t.items?.forEach((item: any) => {
        const product = item.product
        if (!product) return

        const existing = productMap.get(product.id) || {
          name: product.name,
          sold: 0,
          returned: 0,
          revenue: 0,
          cogs: 0,
        }

        existing.sold += item.quantity || 0
        existing.revenue += item.subtotal || 0
        existing.cogs += (product.price_buy || 0) * (item.quantity || 0)

        productMap.set(product.id, existing)
      })
    })

    // Hitung retur
    returns.forEach((r: any) => {
      r.items?.forEach((item: any) => {
        const productId = item.product_id
        if (!productId) return

        const existing = productMap.get(productId)
        if (existing) {
          existing.returned += item.quantity || 0
          existing.revenue -= item.price * (item.quantity || 0)
          existing.cogs -= (item.price_buy || 0) * (item.quantity || 0)
        }
      })
    })

    const products = Array.from(productMap.entries()).map(([id, data]) => {
      const netQty = data.sold - data.returned
      const profit = data.revenue - data.cogs
      const profitMargin = data.revenue > 0 ? (profit / data.revenue) * 100 : 0
      const returnRate = data.sold > 0 ? (data.returned / data.sold) * 100 : 0

      return {
        product_id: id,
        product_name: data.name,
        quantity_sold: data.sold,
        quantity_returned: data.returned,
        net_quantity: netQty,
        revenue: data.revenue,
        cogs: data.cogs,
        profit: profit,
        profit_margin: profitMargin,
        return_rate: returnRate,
      }
    })

    if (mode === 'top') {
      return products
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5)
    } else {
      return products
        .filter((p) => p.quantity_returned > 0)
        .sort((a, b) => b.quantity_returned - a.quantity_returned)
        .slice(0, 5)
    }
  },

  // ============================================================
  // Internal helpers
  // ============================================================

  async fetchTransactionDetail(t: any): Promise<Transaction> {
    const userId = t.user_id

    const txn: Transaction = {
      id: t.id,
      user_id: t.user_id,
      transaction_number: t.transaction_number,
      customer_id: t.customer_id ?? undefined,
      customer_name: t.customer_name ?? undefined,
      subtotal: t.subtotal,
      discount: t.discount,
      shipping_cost: t.shipping_cost ?? undefined,
      return_amount: t.return_amount ?? undefined,
      total: t.total,
      payment_method: t.payment_method,
      paid_amount: t.paid_amount,
      change_amount: t.change_amount,
      remaining_amount: t.remaining_amount,
      payment_status: t.payment_status,
      status: t.status,
      notes: t.notes ?? undefined,
      created_at: t.created_at,
      updated_at: t.updated_at,
    }

    const itemRows = await query<any>(
      `SELECT ti.id, ti.user_id, ti.transaction_id, ti.product_id, ti.product_name,
              ti.price, ti.quantity, ti.subtotal, ti.created_at,
              p.id AS p_id, p.name AS p_name, p.category_id AS p_category_id,
              p.price_buy AS p_price_buy, p.price_sell AS p_price_sell
       FROM transaction_items ti
       LEFT JOIN products p ON p.id = ti.product_id AND p.user_id = ti.user_id
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
      } : undefined,
    }))

    const paymentRows = await query<any>(
      `SELECT * FROM transaction_payments WHERE transaction_id = ? AND user_id = ? ORDER BY created_at ASC`,
      [t.id, userId]
    )
    txn.payments = paymentRows.map((r: any) => ({
      id: r.id,
      user_id: r.user_id,
      transaction_id: r.transaction_id,
      amount: r.amount,
      payment_method: r.payment_method,
      notes: r.notes ?? undefined,
      created_at: r.created_at,
    }))

    return txn
  },

  async fetchReturnsWithItems(returnRows: any[]): Promise<any[]> {
    const returns: any[] = []
    for (const r of returnRows) {
      const riRows = await query<any>(
        `SELECT ri.* FROM return_items ri
         WHERE ri.return_id = ? AND ri.user_id = ? ORDER BY ri.created_at ASC`,
        [r.id, r.user_id]
      )
      returns.push({
        id: r.id,
        user_id: r.user_id,
        transaction_id: r.transaction_id,
        total_refund: r.total_refund,
        created_at: r.created_at,
        items: riRows.map((ri: any) => ({
          id: ri.id,
          product_id: ri.product_id ?? undefined,
          product_name: ri.product_name,
          price: ri.price,
          price_buy: ri.price_buy,
          quantity: ri.quantity,
          subtotal: ri.subtotal,
        })),
      })
    }
    return returns
  },
}
