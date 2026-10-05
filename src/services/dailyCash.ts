import { supabase } from '@/lib/supabase'

export interface CashTransaction {
  id: string
  time: string
  type: 'sale' | 'payment' | 'expense' | 'journal'
  amount: number
  method: 'tunai' | 'transfer'
  customer_name?: string
  reference: string
  description: string
  is_in: boolean
}

export interface DailyCashSummary {
  total_in: number
  total_out: number
  net: number
  tunai_in: number
  tunai_out: number
  transfer_in: number
  transfer_out: number
  transactions_count: number
  payments_count: number
}

export const dailyCashService = {
  /**
   * Ambil ringkasan kas harian
   */
  async getDailyCashSummary(date: string): Promise<DailyCashSummary> {
    const { data: user } = await supabase.auth.getUser()
    if (!user.user) throw new Error('Not authenticated')

    // 1. Penjualan hari ini (paid_amount, bukan total)
    const { data: sales, error: salesErr } = await supabase
      .from('transactions')
      .select('paid_amount, payment_method, created_at')
      .gte('created_at', date + 'T00:00:00.000')
      .lte('created_at', date + 'T23:59:59.999')
      .neq('status', 'void')
      .neq('status', 'batal')
      .eq('user_id', user.user.id)

    if (salesErr) throw salesErr

    // 2. Cicilan hari ini
    const { data: payments, error: paymentsErr } = await supabase
      .from('transaction_payments')
      .select('amount, payment_method, created_at')
      .gte('created_at', date + 'T00:00:00.000')
      .lte('created_at', date + 'T23:59:59.999')
      .eq('user_id', user.user.id)

    if (paymentsErr) throw paymentsErr

    const salesList = sales || []
    const paymentsList = payments || []

    // Hitung total
    const tunai_in =
      salesList.filter(s => s.payment_method === 'tunai').reduce((sum, s) => sum + (s.paid_amount || 0), 0) +
      paymentsList.filter(p => p.payment_method === 'tunai').reduce((sum, p) => sum + (p.amount || 0), 0)

    const transfer_in =
      salesList.filter(s => s.payment_method === 'transfer').reduce((sum, s) => sum + (s.paid_amount || 0), 0) +
      paymentsList.filter(p => p.payment_method === 'transfer').reduce((sum, p) => sum + (p.amount || 0), 0)

    const total_in = tunai_in + transfer_in

    // Untuk kas keluar, kita ambil dari jurnal (credit di akun kas/bank)
    const { data: cashAccounts } = await supabase
      .from('chart_of_accounts')
      .select('id, code')
      .in('code', ['1-1000', '1-1010'])
      .eq('user_id', user.user.id)

    const cashAccountIds = (cashAccounts || []).map(a => a.id)

    let cashOut = 0
    let tunai_out = 0
    let transfer_out = 0

    if (cashAccountIds.length > 0) {
      const { data: journalLines } = await supabase
        .from('journal_lines')
        .select('credit, account_id, journal:journal_entries!inner(entry_date, status)')
        .in('account_id', cashAccountIds)
        .eq('journal.status', 'posted')
        .gte('journal.entry_date', date + 'T00:00:00.000')
        .lte('journal.entry_date', date + 'T23:59:59.999')

      const lines = journalLines || []

      for (const line of lines) {
        const credit = Number(line.credit || 0)
        cashOut += credit

        // Tentukan kas vs bank berdasarkan account_id
        const account = cashAccounts?.find(a => a.id === line.account_id)
        if (account?.code === '1-1000') {
          tunai_out += credit
        } else {
          transfer_out += credit
        }
      }
    }

    return {
      total_in,
      total_out: cashOut,
      net: total_in - cashOut,
      tunai_in,
      tunai_out,
      transfer_in,
      transfer_out,
      transactions_count: salesList.length,
      payments_count: paymentsList.length
    }
  },

  /**
   * Ambil detail transaksi kas harian
   */
  async getDailyCashTransactions(date: string): Promise<CashTransaction[]> {
    const { data: user } = await supabase.auth.getUser()
    if (!user.user) throw new Error('Not authenticated')

    const transactions: CashTransaction[] = []

    // 1. Penjualan hari ini
    const { data: sales, error: salesErr } = await supabase
      .from('transactions')
      .select('id, transaction_number, created_at, paid_amount, payment_method, customer_name')
      .gte('created_at', date + 'T00:00:00.000')
      .lte('created_at', date + 'T23:59:59.999')
      .neq('status', 'void')
      .neq('status', 'batal')
      .eq('user_id', user.user.id)
      .order('created_at', { ascending: false })

    if (salesErr) throw salesErr

    for (const sale of sales || []) {
      if (sale.paid_amount > 0) {
        transactions.push({
          id: sale.id,
          time: sale.created_at,
          type: 'sale',
          amount: sale.paid_amount,
          method: sale.payment_method as 'tunai' | 'transfer',
          customer_name: sale.customer_name,
          reference: sale.transaction_number,
          description: 'Penjualan',
          is_in: true
        })
      }
    }

    // 2. Cicilan hari ini
    const { data: payments, error: paymentsErr } = await supabase
      .from('transaction_payments')
      .select('id, amount, payment_method, created_at, transaction:transactions!inner(transaction_number, customer_name)')
      .gte('created_at', date + 'T00:00:00.000')
      .lte('created_at', date + 'T23:59:59.999')
      .eq('user_id', user.user.id)
      .order('created_at', { ascending: false })

    if (paymentsErr) throw paymentsErr

    for (const payment of payments || []) {
      const tx = payment.transaction as any
      transactions.push({
        id: payment.id,
        time: payment.created_at,
        type: 'payment',
        amount: payment.amount,
        method: payment.payment_method as 'tunai' | 'transfer',
        customer_name: tx?.customer_name,
        reference: tx?.transaction_number || '-',
        description: 'Pembayaran Cicilan',
        is_in: true
      })
    }

    // 3. Kas keluar dari jurnal
    const { data: cashAccounts } = await supabase
      .from('chart_of_accounts')
      .select('id, code, name')
      .in('code', ['1-1000', '1-1010'])
      .eq('user_id', user.user.id)

    const cashAccountIds = (cashAccounts || []).map(a => a.id)

    if (cashAccountIds.length > 0) {
      const { data: journalLines } = await supabase
        .from('journal_lines')
        .select('id, credit, account_id, created_at, journal:journal_entries!inner(journal_number, entry_date, description, status)')
        .in('account_id', cashAccountIds)
        .eq('journal.status', 'posted')
        .gte('journal.entry_date', date + 'T00:00:00.000')
        .lte('journal.entry_date', date + 'T23:59:59.999')
        .gt('credit', 0)

      for (const line of journalLines || []) {
        const journal = line.journal as any
        const account = cashAccounts?.find(a => a.id === line.account_id)

        transactions.push({
          id: line.id,
          time: line.created_at,
          type: 'journal',
          amount: Number(line.credit),
          method: account?.code === '1-1000' ? 'tunai' : 'transfer',
          reference: journal?.journal_number || '-',
          description: journal?.description || 'Pengeluaran',
          is_in: false
        })
      }
    }

    // Sort by time DESC
    transactions.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())

    return transactions
  }
}
