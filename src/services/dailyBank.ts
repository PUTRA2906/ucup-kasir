import { supabase } from '@/lib/supabase'

export interface BankTransaction {
  id: string
  time: string
  type: 'sale' | 'payment' | 'expense' | 'journal'
  amount: number
  customer_name?: string
  reference: string
  description: string
  is_in: boolean
}

export interface DailyBankSummary {
  total_in: number
  total_out: number
  net: number
  transactions_count: number
  payments_count: number
}

export const dailyBankService = {
  /**
   * Ambil ringkasan bank harian
   */
  async getDailyBankSummary(date: string): Promise<DailyBankSummary> {
    const { data: user } = await supabase.auth.getUser()
    if (!user.user) throw new Error('Not authenticated')

    // 1. Penjualan hari ini dengan payment_method = 'transfer'
    const { data: sales, error: salesErr } = await supabase
      .from('transactions')
      .select('paid_amount, payment_method, created_at')
      .gte('created_at', date + 'T00:00:00.000')
      .lte('created_at', date + 'T23:59:59.999')
      .eq('payment_method', 'transfer')
      .neq('status', 'void')
      .neq('status', 'batal')
      .eq('user_id', user.user.id)

    if (salesErr) throw salesErr

    // 2. Cicilan hari ini dengan payment_method = 'transfer'
    const { data: payments, error: paymentsErr } = await supabase
      .from('transaction_payments')
      .select('amount, payment_method, created_at')
      .gte('created_at', date + 'T00:00:00.000')
      .lte('created_at', date + 'T23:59:59.999')
      .eq('payment_method', 'transfer')
      .eq('user_id', user.user.id)

    if (paymentsErr) throw paymentsErr

    const salesList = sales || []
    const paymentsList = payments || []

    const transfer_in =
      salesList.reduce((sum, s) => sum + (s.paid_amount || 0), 0) +
      paymentsList.reduce((sum, p) => sum + (p.amount || 0), 0)

    // Untuk bank keluar, kita ambil dari jurnal (credit di akun bank)
    const { data: bankAccounts } = await supabase
      .from('chart_of_accounts')
      .select('id, code')
      .in('code', ['1-1002', '1-1010']) // Bank account codes
      .eq('user_id', user.user.id)

    const bankAccountIds = (bankAccounts || []).map(a => a.id)

    let bankOut = 0

    if (bankAccountIds.length > 0) {
      const { data: journalLines } = await supabase
        .from('journal_lines')
        .select('credit, account_id, journal:journal_entries!inner(entry_date, status)')
        .in('account_id', bankAccountIds)
        .eq('journal.status', 'posted')
        .gte('journal.entry_date', date + 'T00:00:00.000')
        .lte('journal.entry_date', date + 'T23:59:59.999')

      const lines = journalLines || []
      bankOut = lines.reduce((sum, line) => sum + Number(line.credit || 0), 0)
    }

    return {
      total_in: transfer_in,
      total_out: bankOut,
      net: transfer_in - bankOut,
      transactions_count: salesList.length,
      payments_count: paymentsList.length
    }
  },

  /**
   * Ambil detail transaksi bank harian
   */
  async getDailyBankTransactions(date: string): Promise<BankTransaction[]> {
    const { data: user } = await supabase.auth.getUser()
    if (!user.user) throw new Error('Not authenticated')

    const transactions: BankTransaction[] = []

    // 1. Penjualan hari ini dengan payment_method = 'transfer'
    const { data: sales, error: salesErr } = await supabase
      .from('transactions')
      .select('id, transaction_number, created_at, paid_amount, payment_method, customer_name')
      .gte('created_at', date + 'T00:00:00.000')
      .lte('created_at', date + 'T23:59:59.999')
      .eq('payment_method', 'transfer')
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
          customer_name: sale.customer_name,
          reference: sale.transaction_number,
          description: 'Penjualan',
          is_in: true
        })
      }
    }

    // 2. Cicilan hari ini dengan payment_method = 'transfer'
    const { data: payments, error: paymentsErr } = await supabase
      .from('transaction_payments')
      .select('id, amount, payment_method, created_at, transaction:transactions!inner(transaction_number, customer_name)')
      .gte('created_at', date + 'T00:00:00.000')
      .lte('created_at', date + 'T23:59:59.999')
      .eq('payment_method', 'transfer')
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
        customer_name: tx?.customer_name,
        reference: tx?.transaction_number || '-',
        description: 'Pembayaran Cicilan',
        is_in: true
      })
    }

    // 3. Bank keluar dari jurnal
    const { data: bankAccounts } = await supabase
      .from('chart_of_accounts')
      .select('id, code, name')
      .in('code', ['1-1002', '1-1010']) // Bank account codes
      .eq('user_id', user.user.id)

    const bankAccountIds = (bankAccounts || []).map(a => a.id)

    if (bankAccountIds.length > 0) {
      const { data: journalLines } = await supabase
        .from('journal_lines')
        .select('id, credit, account_id, created_at, journal:journal_entries!inner(journal_number, entry_date, description, status)')
        .in('account_id', bankAccountIds)
        .eq('journal.status', 'posted')
        .gte('journal.entry_date', date + 'T00:00:00.000')
        .lte('journal.entry_date', date + 'T23:59:59.999')
        .gt('credit', 0)

      for (const line of journalLines || []) {
        const journal = line.journal as any

        transactions.push({
          id: line.id,
          time: line.created_at,
          type: 'journal',
          amount: Number(line.credit),
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
