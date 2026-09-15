import { supabase } from '@/lib/supabase'
import type { Transaction } from '@/types/database'

// ============================================================
// INTERFACES & TYPES
// ============================================================

export interface EnhancedSalesSummary {
  // Penjualan
  gross_sales: number           // Total penjualan kotor (subtotal sebelum diskon & retur)
  total_discount: number         // Total diskon transaksi
  total_returns: number          // Total nilai retur (harga jual)
  net_sales: number              // Penjualan bersih = gross_sales - discount - returns

  // Modal & Laba Kotor (Akrual - semua transaksi)
  raw_cogs: number               // HPP kotor (modal barang terjual)
  returned_cogs: number          // Modal barang yang diretur
  net_cogs: number               // HPP bersih = raw_cogs - returned_cogs
  gross_profit: number           // Laba kotor = net_sales - net_cogs
  gross_profit_margin: number    // Margin laba kotor (%)

  // Arus Kas (Realisasi)
  total_cash_received: number    // Total uang kas masuk (lunas + DP)
  total_receivables: number      // Total piutang (tempo)

  // Laba Terealisasi (berdasarkan kas masuk)
  realized_profit: number        // Laba yang sudah terealisasi (kas)
  unrealized_profit: number      // Laba tertahan di piutang

  // Statistik
  total_transactions: number
  average_transaction: number
  total_items: number

  // Breakdown Status Pembayaran
  lunas_count: number            // Jumlah transaksi lunas
  lunas_amount: number           // Total nilai transaksi lunas
  tempo_count: number            // Jumlah transaksi tempo
  tempo_amount: number           // Total nilai transaksi tempo
  partial_count: number          // Jumlah transaksi cicilan/DP
  partial_amount: number         // Total nilai transaksi cicilan
}

export interface TransactionDetail extends Transaction {
  // Perhitungan tambahan per transaksi
  transaction_cogs: number       // HPP transaksi ini
  transaction_profit: number     // Laba kotor transaksi ini
  profit_margin: number          // Margin laba (%)
  cash_received: number          // Uang kas diterima
  receivable: number             // Piutang
  realized_profit: number        // Laba terealisasi
  unrealized_profit: number      // Laba tertahan
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
  return_rate: number            // % barang yang diretur
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
  cogs: number          // HPP item ini
  profit: number        // Laba kotor item ini
  margin: number        // Margin % item ini
  returned_qty: number  // Jumlah yang diretur
  returned_value: number // Nilai retur item ini
}

export interface TransactionProfitDetail {
  transaction: TransactionDetail
  items: TransactionProfitItem[]
  returns: any[]         // Data retur terkait
  return_cogs: number    // HPP barang yang diretur
}

// ============================================================
// SERVICE IMPLEMENTATION
// ============================================================

export const salesReportEnhancedService = {
  /**
   * Mengambil laporan penjualan & laba rugi yang komprehensif
   * dengan pemisahan antara laba akrual dan laba terealisasi
   */
  async getEnhancedSalesReport(
    startDate: string,
    endDate: string,
    paymentStatusFilter?: 'lunas' | 'belum_lunas' | 'all',
    customerIds?: string[]
  ): Promise<EnhancedReportData> {
    // Fetch transactions dengan filter
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

    // Filter status pembayaran
    if (paymentStatusFilter && paymentStatusFilter !== 'all') {
      query = query.eq('payment_status', paymentStatusFilter)
    }

    // Filter customer
    if (customerIds && customerIds.length > 0) {
      query = query.in('customer_id', customerIds)
    }

    const { data: transactions, error } = await query

    if (error) throw error

    const txns = (transactions || []) as Transaction[]

    // Fetch data retur
    const { data: returns, error: returnsError } = await supabase
      .from('returns')
      .select('*, items:return_items(*, product:products(id, name))')
      .gte('created_at', startDate)
      .lte('created_at', endDate + 'T23:59:59')

    if (returnsError) throw returnsError

    const returnData = (returns || []) as any[]

    // Hitung summary dengan logika enhanced (await karena sekarang async)
    const summary = await this.calculateEnhancedSummary(txns, returnData)

    // Hitung detail per transaksi (await karena sekarang async)
    const transactionDetails = await this.calculateTransactionDetails(txns, returnData)

    // Hitung performa produk
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
   * Menghitung summary dengan pemisahan laba akrual vs terealisasi
   * 
   * ✅ UPDATED: Laba terealisasi dihitung dari item_payments (bukan proporsional)
   */
  async calculateEnhancedSummary(
    transactions: Transaction[],
    returns: any[]
  ): Promise<EnhancedSalesSummary> {
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
    for (const t of transactions) {
      // Gross sales dari items (sebelum diskon & retur)
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

      // Kas efektif: dibatasi agar tidak melebihi nilai bersih transaksi
      // (saat retur, paid_amount di DB tidak dikurangi padahal sebagian sudah direfund)
      //
      // Nilai kas efektif dihitung dulu di sini karena txNetSales butuh txReturnValue.
      // txReturnValue akan kita akumulasikan ke total_returns di loop returns di bawah
      // (satu sumber kebenaran), tapi untuk kebutuhan effectiveCash per-transaksi kita
      // tetap hitung lokal di sini agar clamp akurat.
      const txReturns = returnsByTx.get(t.id) || []
      let txReturnValue = 0
      txReturns.forEach((r: any) => {
        txReturnValue += parseFloat(r.total_refund || 0)
      })

      const txNetSales = txGrossSales - (t.discount || 0) - txReturnValue
      const effectiveCash = Math.max(0, Math.min(paidAmount, txNetSales))

      total_cash_received += effectiveCash
      total_receivables += remainingAmount

      // ✅ Hitung laba terealisasi dari item_payments (akurat per-item)
      const { realizedProfit, unrealizedProfit } = await this.calculateRealizedProfitFromItems(
        t.id,
        t.items || [],
        txReturns
      )

      realized_profit += realizedProfit
      unrealized_profit += unrealizedProfit

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
    }

    // Hitung total retur SEKALI di sini (sumber kebenaran tunggal).
    // Loop sebelumnya TIDAK menambah ke returned_cogs / total_returns agar
    // tidak terjadi double-counting.
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
   * 
   * ✅ UPDATED: Laba terealisasi dihitung dari item_payments (bukan proporsional)
   */
  async calculateTransactionDetails(
    transactions: Transaction[],
    returns: any[]
  ): Promise<TransactionDetail[]> {
    const result: TransactionDetail[] = []
    
    for (const t of transactions) {
      // Hitung COGS & profit transaksi ini
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

      // Kas efektif: dibatasi agar tidak melebihi nilai bersih transaksi
      // (saat retur, paid_amount di DB tidak dikurangi padahal sebagian sudah direfund)
      const cashReceived = Math.max(0, Math.min(t.paid_amount || 0, netRevenue))
      const receivable = t.remaining_amount || 0

      // ✅ NEW: Hitung laba terealisasi dari item_payments (akurat per-item)
      const { realizedProfit, unrealizedProfit } = await this.calculateRealizedProfitFromItems(
        t.id,
        t.items || [],
        relatedReturns
      )

      result.push({
        ...t,
        transaction_cogs: netCogs,
        transaction_profit: profit,
        profit_margin: profitMargin,
        cash_received: cashReceived,
        receivable: receivable,
        realized_profit: realizedProfit,
        unrealized_profit: unrealizedProfit,
      })
    }
    
    return result
  },

  /**
   * ✅ NEW HELPER: Hitung laba terealisasi dari item_payments
   * 
   * Formula AKURAT per-item:
   * - Laba terealisasi = sum(item_profit * (paid_amount / item_subtotal))
   * - Laba tertahan = total_profit - realized_profit
   * 
   * Menggunakan data dari transaction_item_payments untuk track
   * pembayaran per item secara spesifik.
   */
  async calculateRealizedProfitFromItems(
    transactionId: string,
    items: any[],
    returns: any[]
  ): Promise<{ realizedProfit: number; unrealizedProfit: number }> {
    // Get item payment allocations
    const { data: itemPayments, error } = await supabase
      .from('transaction_item_payments')
      .select('item_id, allocated_amount')
      .eq('transaction_id', transactionId)

    if (error) {
      console.error('Error fetching item payments:', error)
      // Fallback ke formula proporsional jika query gagal
      return this.calculateRealizedProfitFallback(items, returns)
    }

    // Map: item_id -> total_paid
    const paidByItem = new Map<string, number>()
    ;(itemPayments || []).forEach((ip) => {
      const existing = paidByItem.get(ip.item_id) || 0
      paidByItem.set(ip.item_id, existing + Number(ip.allocated_amount))
    })

    // Map: product_id -> returned_qty & returned_cogs
    const returnsByProduct = new Map<string, { qty: number; cogs: number; value: number }>()
    returns.forEach((r: any) => {
      r.items?.forEach((item: any) => {
        const pid = item.product_id || 'unknown'
        const existing = returnsByProduct.get(pid) || { qty: 0, cogs: 0, value: 0 }
        existing.qty += item.quantity || 0
        existing.cogs += (item.price_buy || 0) * (item.quantity || 0)
        existing.value += (item.price || 0) * (item.quantity || 0)
        returnsByProduct.set(pid, existing)
      })
    })

    let totalProfit = 0
    let realizedProfit = 0

    // Hitung per item
    items.forEach((item: any) => {
      const itemId = item.id
      const productId = item.product_id || 'unknown'
      const priceBuy = item.product?.price_buy || 0
      const qty = item.quantity || 0
      const subtotal = item.subtotal || 0

      // COGS & return untuk item ini
      const itemCogs = priceBuy * qty
      const returnData = returnsByProduct.get(productId) || { qty: 0, cogs: 0, value: 0 }
      const netSubtotal = subtotal - returnData.value
      const netCogs = itemCogs - returnData.cogs

      // Laba item (setelah dikurangi retur)
      const itemProfit = netSubtotal - netCogs
      totalProfit += itemProfit

      // Pembayaran untuk item ini
      const paidAmount = paidByItem.get(itemId) || 0

      // Laba terealisasi item = profit * (paid / subtotal bersih)
      // Gunakan netSubtotal agar denominator konsisten dengan laba
      const realizationRatio = netSubtotal > 0 ? Math.min(paidAmount / netSubtotal, 1) : 0
      const itemRealizedProfit = itemProfit * realizationRatio

      realizedProfit += itemRealizedProfit
    })

    // Pastikan realized tidak melebihi total_profit,
    // dan realized + unrealized == totalProfit (tidak ada sisa yang hilang)
    const clampedRealized = totalProfit >= 0
      ? Math.min(Math.max(0, realizedProfit), totalProfit)
      : Math.max(Math.min(0, realizedProfit), totalProfit)
    const unrealizedProfit = totalProfit - clampedRealized

    return {
      realizedProfit: clampedRealized,
      unrealizedProfit,
    }
  },

  /**
   * Fallback: Gunakan formula proporsional jika query item_payments gagal
   * (backward compatibility untuk data lama atau jika migrasi belum dijalankan)
   */
  calculateRealizedProfitFallback(
    items: any[],
    returns: any[]
  ): { realizedProfit: number; unrealizedProfit: number } {
    let txRevenue = 0
    let txCogs = 0
    let returnValue = 0
    let returnCogs = 0

    items.forEach((item: any) => {
      const priceBuy = item.product?.price_buy || 0
      const qty = item.quantity || 0
      txRevenue += item.subtotal || 0
      txCogs += priceBuy * qty
    })

    returns.forEach((r: any) => {
      returnValue += parseFloat(r.total_refund || 0)
      r.items?.forEach((item: any) => {
        returnCogs += (item.price_buy || 0) * (item.quantity || 0)
      })
    })

    const netRevenue = txRevenue - returnValue
    const netCogs = txCogs - returnCogs
    const profit = netRevenue - netCogs

    // Asumsi proporsional (tidak akurat, tapi fallback)
    const realizationRatio = 0.5 // Assume 50% paid if data not available
    
    return {
      realizedProfit: profit * realizationRatio,
      unrealizedProfit: profit * (1 - realizationRatio),
    }
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

  /**
   * Mengambil detail laba per transaksi + breakdown per item
   */
  async getTransactionProfitDetail(transactionId: string): Promise<TransactionProfitDetail> {
    const { data: txn, error: txError } = await supabase
      .from('transactions')
      .select(`
        *,
        items:transaction_items(
          *,
          product:products(id, name, category_id, price_buy, price_sell)
        ),
        payments:transaction_payments(*)
      `)
      .eq('id', transactionId)
      .single()

    if (txError) throw txError

    const transaction = txn as Transaction

    // Ambil retur terkait
    const { data: returns, error: retError } = await supabase
      .from('returns')
      .select('*, items:return_items(*, product:products(id, name))')
      .eq('transaction_id', transactionId)

    if (retError) throw retError

    const returnData = (returns || []) as any[]

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

    // Hitung summary per transaksi dengan laba terealisasi yang akurat
    const netRevenue = txRevenue - (transaction.discount || 0) - totalReturnValue
    const netCogs = txCogs - totalReturnCogs
    const profit = netRevenue - netCogs
    const profitMargin = netRevenue > 0 ? (profit / netRevenue) * 100 : 0
    const cashReceived = Math.max(0, Math.min(transaction.paid_amount || 0, netRevenue))
    
    // ✅ NEW: Gunakan perhitungan akurat dari item_payments
    const { realizedProfit, unrealizedProfit } = await this.calculateRealizedProfitFromItems(
      transactionId,
      transaction.items || [],
      returnData
    )

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
}
