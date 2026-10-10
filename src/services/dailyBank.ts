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

    const startOfDay = new Date(date + 'T00:00:00Z')
    const endOfDay = new Date(date + 'T23:59:59.999Z')

    // ── Sumber tunggal: transaction_payments (hanya transfer) ────────────────
    const { data: payments, error: paymentsErr } = await supabase
      .from('transaction_payments')
      .select('amount, transaction:transactions!inner(status)')
      .gte('payment_date', startOfDay.toISOString())
      .lte('payment_date', endOfDay.toISOString())
      .eq('user_id', user.user.id)
      .eq('payment_method', 'transfer')
      .not('transaction.status', 'in', '("void","batal")')

    if (paymentsErr) throw paymentsErr

    let transfer_in = (payments || []).reduce((sum, p) => sum + (p.amount || 0), 0)

    // Jumlah transaksi bank hari ini
    const { count: salesCount } = await supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', startOfDay.toISOString())
      .lte('created_at', endOfDay.toISOString())
      .eq('payment_method', 'transfer')
      .neq('status', 'void')
      .neq('status', 'batal')
      .eq('user_id', user.user.id)

    // ── Kas keluar dari jurnal manual (akun bank) ─────────────────────────────
    const { data: bankAccounts } = await supabase
      .from('chart_of_accounts')
      .select('id, code')
      .eq('code', '1-1010')
      .eq('user_id', user.user.id)

    const bankAccountIds = (bankAccounts || []).map(a => a.id)
    let bankOut = 0

    if (bankAccountIds.length > 0) {
      const { data: journalLines } = await supabase
        .from('journal_lines')
        .select('debit, credit, journal:journal_entries!inner(entry_date, status, reference_type)')
        .in('account_id', bankAccountIds)
        .eq('journal.status', 'posted')
        .gte('journal.entry_date', startOfDay.toISOString())
        .lte('journal.entry_date', endOfDay.toISOString())
        .not('journal.reference_type', 'in', '("transaction","payment")')

      for (const line of journalLines || []) {
        const debit = Number(line.debit || 0)
        const credit = Number(line.credit || 0)
        if (debit > 0) transfer_in += debit
        if (credit > 0) bankOut += credit
      }
    }

    return {
      total_in: transfer_in,
      total_out: bankOut,
      net: transfer_in - bankOut,
      transactions_count: salesCount || 0,
      payments_count: (payments || []).length
    }
  },

  /**
   * Ambil detail transaksi bank harian
   */
  async getDailyBankTransactions(date: string): Promise<BankTransaction[]> {
    const { data: user } = await supabase.auth.getUser()
    if (!user.user) throw new Error('Not authenticated')

    const transactions: BankTransaction[] = []

    const startOfDay = new Date(date + 'T00:00:00Z')
    const endOfDay = new Date(date + 'T23:59:59.999Z')

    // ── Sumber tunggal: transaction_payments (hanya transfer) ────────────────
    const { data: payments, error: paymentsErr } = await supabase
      .from('transaction_payments')
      .select('id, amount, created_at, transaction:transactions!inner(transaction_number, customer_name, created_at, status)')
      .gte('payment_date', startOfDay.toISOString())
      .lte('payment_date', endOfDay.toISOString())
      .eq('user_id', user.user.id)
      .eq('payment_method', 'transfer')
      .not('transaction.status', 'in', '("void","batal")')
      .order('created_at', { ascending: false })

    if (paymentsErr) throw paymentsErr

    for (const payment of payments || []) {
      const tx = payment.transaction as any
      const txCreatedAt: string = tx?.created_at || ''
      const txSameDay = txCreatedAt >= startOfDay.toISOString() && txCreatedAt <= endOfDay.toISOString()
      const isInitial = txSameDay && payment.created_at === txCreatedAt

      transactions.push({
        id: payment.id,
        time: payment.created_at,
        type: isInitial ? 'sale' : 'payment',
        amount: payment.amount,
        customer_name: tx?.customer_name,
        reference: tx?.transaction_number || '-',
        description: isInitial ? 'Penjualan' : 'Pembayaran Cicilan',
        is_in: true
      })
    }

    // ── Jurnal manual akun bank ────────────────────────────────────────────────
    const { data: bankAccounts } = await supabase
      .from('chart_of_accounts')
      .select('id, code, name')
      .eq('code', '1-1010')
      .eq('user_id', user.user.id)

    const bankAccountIds = (bankAccounts || []).map(a => a.id)

    if (bankAccountIds.length > 0) {
      const { data: journalLines } = await supabase
        .from('journal_lines')
        .select('id, debit, credit, created_at, journal:journal_entries!inner(journal_number, entry_date, description, status, reference_type)')
        .in('account_id', bankAccountIds)
        .eq('journal.status', 'posted')
        .gte('journal.entry_date', startOfDay.toISOString())
        .lte('journal.entry_date', endOfDay.toISOString())
        .not('journal.reference_type', 'in', '("transaction","payment")')

      for (const line of journalLines || []) {
        const journal = line.journal as any
        const debit = Number(line.debit || 0)
        const credit = Number(line.credit || 0)

        if (debit > 0) {
          transactions.push({
            id: line.id,
            time: line.created_at,
            type: 'journal',
            amount: debit,
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
