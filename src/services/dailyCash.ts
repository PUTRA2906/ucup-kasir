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

    const startOfDay = new Date(date + 'T00:00:00Z')
    const endOfDay = new Date(date + 'T23:59:59.999Z')

    // ── Sumber tunggal: transaction_payments ─────────────────────────────────
    // Semua pemasukan kas ada di sini — pembayaran awal maupun cicilan.
    const { data: payments, error: paymentsErr } = await supabase
      .from('transaction_payments')
      .select('amount, payment_method, transaction:transactions!inner(status)')
      .gte('payment_date', startOfDay.toISOString())
      .lte('payment_date', endOfDay.toISOString())
      .eq('user_id', user.user.id)
      .not('transaction.status', 'in', '("void","batal")')

    if (paymentsErr) throw paymentsErr

    let tunai_in = 0
    let transfer_in = 0
    for (const p of payments || []) {
      if (p.payment_method === 'tunai') tunai_in += p.amount || 0
      else if (p.payment_method === 'transfer') transfer_in += p.amount || 0
    }

    // Jumlah transaksi hari ini (untuk info)
    const { count: salesCount } = await supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', startOfDay.toISOString())
      .lte('created_at', endOfDay.toISOString())
      .neq('status', 'void')
      .neq('status', 'batal')
      .eq('user_id', user.user.id)

    // ── Kas keluar dari jurnal manual ─────────────────────────────────────────
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
        .select('debit, credit, account_id, journal:journal_entries!inner(entry_date, status, reference_type)')
        .in('account_id', cashAccountIds)
        .eq('journal.status', 'posted')
        .gte('journal.entry_date', startOfDay.toISOString())
        .lte('journal.entry_date', endOfDay.toISOString())
        .not('journal.reference_type', 'in', '("transaction","payment")')

      for (const line of journalLines || []) {
        const debit = Number(line.debit || 0)
        const credit = Number(line.credit || 0)
        const account = cashAccounts?.find(a => a.id === line.account_id)

        if (debit > 0) {
          if (account?.code === '1-1000') tunai_in += debit
          else transfer_in += debit
        }
        if (credit > 0) {
          cashOut += credit
          if (account?.code === '1-1000') tunai_out += credit
          else transfer_out += credit
        }
      }
    }

    const total_in = tunai_in + transfer_in

    return {
      total_in,
      total_out: cashOut,
      net: total_in - cashOut,
      tunai_in,
      tunai_out,
      transfer_in,
      transfer_out,
      transactions_count: salesCount || 0,
      payments_count: (payments || []).length
    }
  },

  /**
   * Ambil detail transaksi kas harian
   */
  async getDailyCashTransactions(date: string): Promise<CashTransaction[]> {
    const { data: user } = await supabase.auth.getUser()
    if (!user.user) throw new Error('Not authenticated')

    const transactions: CashTransaction[] = []

    const startOfDay = new Date(date + 'T00:00:00Z')
    const endOfDay = new Date(date + 'T23:59:59.999Z')

    // ── Sumber tunggal: transaction_payments ─────────────────────────────────
    const { data: payments, error: paymentsErr } = await supabase
      .from('transaction_payments')
      .select('id, amount, payment_method, created_at, transaction:transactions!inner(transaction_number, customer_name, created_at, status)')
      .gte('payment_date', startOfDay.toISOString())
      .lte('payment_date', endOfDay.toISOString())
      .eq('user_id', user.user.id)
      .not('transaction.status', 'in', '("void","batal")')
      .order('created_at', { ascending: false })

    if (paymentsErr) throw paymentsErr

    for (const payment of payments || []) {
      const tx = payment.transaction as any

      // Payment pertama dari transaksi yang dibuat hari ini = label 'Penjualan'
      const txCreatedAt: string = tx?.created_at || ''
      const txSameDay = txCreatedAt >= startOfDay.toISOString() && txCreatedAt <= endOfDay.toISOString()
      const isInitial = txSameDay && payment.created_at === txCreatedAt

      transactions.push({
        id: payment.id,
        time: payment.created_at,
        type: isInitial ? 'sale' : 'payment',
        amount: payment.amount,
        method: payment.payment_method as 'tunai' | 'transfer',
        customer_name: tx?.customer_name,
        reference: tx?.transaction_number || '-',
        description: isInitial ? 'Penjualan' : 'Pembayaran Cicilan',
        is_in: true
      })
    }

    // ── Jurnal manual (kas masuk/keluar selain penjualan & cicilan) ───────────
    const { data: cashAccounts } = await supabase
      .from('chart_of_accounts')
      .select('id, code, name')
      .in('code', ['1-1000', '1-1010'])
      .eq('user_id', user.user.id)

    const cashAccountIds = (cashAccounts || []).map(a => a.id)

    if (cashAccountIds.length > 0) {
      const { data: journalLines } = await supabase
        .from('journal_lines')
        .select('id, debit, credit, account_id, created_at, journal:journal_entries!inner(journal_number, entry_date, description, status, reference_type)')
        .in('account_id', cashAccountIds)
        .eq('journal.status', 'posted')
        .gte('journal.entry_date', startOfDay.toISOString())
        .lte('journal.entry_date', endOfDay.toISOString())
        .not('journal.reference_type', 'in', '("transaction","payment")')

      for (const line of journalLines || []) {
        const journal = line.journal as any
        const account = cashAccounts?.find(a => a.id === line.account_id)
        const debit = Number(line.debit || 0)
        const credit = Number(line.credit || 0)

        if (debit > 0) {
          transactions.push({
            id: line.id,
            time: line.created_at,
            type: 'journal',
            amount: debit,
            method: account?.code === '1-1000' ? 'tunai' : 'transfer',
            reference: journal?.journal_number || '-',
            description: journal?.description || 'Pemasukan',
            is_in: true
          })
        }

        if (credit > 0) {
          transactions.push({
            id: line.id,
            time: line.created_at,
            type: 'journal',
            amount: credit,
            method: account?.code === '1-1000' ? 'tunai' : 'transfer',
            reference: journal?.journal_number || '-',
            description: journal?.description || 'Pengeluaran',
            is_in: false
          })
        }
      }
    }

    transactions.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())

    return transactions
  }
}
