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

    // Konversi tanggal ke UTC untuk filter yang konsisten
    // Tambahkan 'Z' agar Date object menggunakan UTC, bukan timezone lokal
    const startOfDay = new Date(date + 'T00:00:00Z')
    const endOfDay = new Date(date + 'T23:59:59.999Z')

    // 1. Penjualan hari ini (paid_amount, bukan total)
    const { data: sales, error: salesErr } = await supabase
      .from('transactions')
      .select('paid_amount, payment_method, created_at')
      .gte('created_at', startOfDay.toISOString())
      .lte('created_at', endOfDay.toISOString())
      .neq('status', 'void')
      .neq('status', 'batal')
      .eq('user_id', user.user.id)

    if (salesErr) throw salesErr

    const salesList = sales || []

    // Hitung total dari penjualan saja (initial payment)
    // CATATAN: Pembayaran cicilan tidak dihitung di sini karena sudah tercatat
    // otomatis di jurnal akuntansi via trigger auto_journal_payment
    let tunai_in = salesList
      .filter(s => s.payment_method === 'tunai')
      .reduce((sum, s) => sum + (s.paid_amount || 0), 0)

    let transfer_in = salesList
      .filter(s => s.payment_method === 'transfer')
      .reduce((sum, s) => sum + (s.paid_amount || 0), 0)

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
        .select('debit, credit, account_id, journal:journal_entries!inner(entry_date, status)')
        .in('account_id', cashAccountIds)
        .eq('journal.status', 'posted')
        .gte('journal.entry_date', startOfDay.toISOString())
        .lte('journal.entry_date', endOfDay.toISOString())

      const lines = journalLines || []

      for (const line of lines) {
        const debit = Number(line.debit || 0)
        const credit = Number(line.credit || 0)
        const account = cashAccounts?.find(a => a.id === line.account_id)

        // Debit di kas/bank = pemasukan
        if (debit > 0) {
          if (account?.code === '1-1000') {
            tunai_in += debit
          } else {
            transfer_in += debit
          }
        }

        // Credit di kas/bank = pengeluaran
        if (credit > 0) {
          cashOut += credit
          if (account?.code === '1-1000') {
            tunai_out += credit
          } else {
            transfer_out += credit
          }
        }
      }
    }

    const total_in_final = tunai_in + transfer_in

    return {
      total_in: total_in_final,
      total_out: cashOut,
      net: total_in_final - cashOut,
      tunai_in,
      tunai_out,
      transfer_in,
      transfer_out,
      transactions_count: salesList.length,
      payments_count: 0
    }
  },

  /**
   * Ambil detail transaksi kas harian
   */
  async getDailyCashTransactions(date: string): Promise<CashTransaction[]> {
    const { data: user } = await supabase.auth.getUser()
    if (!user.user) throw new Error('Not authenticated')

    const transactions: CashTransaction[] = []

    // Konversi tanggal ke UTC untuk filter yang konsisten
    // Tambahkan 'Z' agar Date object menggunakan UTC, bukan timezone lokal
    const startOfDay = new Date(date + 'T00:00:00Z')
    const endOfDay = new Date(date + 'T23:59:59.999Z')

    // 1. Penjualan hari ini
    const { data: sales, error: salesErr } = await supabase
      .from('transactions')
      .select('id, transaction_number, created_at, paid_amount, payment_method, customer_name')
      .gte('created_at', startOfDay.toISOString())
      .lte('created_at', endOfDay.toISOString())
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

    // 2. Cicilan hari ini (filter by payment_date dengan range)
    const { data: payments, error: paymentsErr } = await supabase
      .from('transaction_payments')
      .select('id, amount, payment_method, created_at, payment_date, transaction:transactions!inner(transaction_number, customer_name)')
      .gte('payment_date', startOfDay.toISOString())
      .lte('payment_date', endOfDay.toISOString())
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

    // 3. Transaksi dari jurnal (baik masuk maupun keluar)
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

      for (const line of journalLines || []) {
        const journal = line.journal as any
        const account = cashAccounts?.find(a => a.id === line.account_id)
        const debit = Number(line.debit || 0)
        const credit = Number(line.credit || 0)

        // Skip jurnal dari pembayaran cicilan karena sudah ditampilkan di bagian payments
        if (journal?.reference_type === 'payment') {
          continue
        }

        // Debit di kas/bank = pemasukan
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

        // Credit di kas/bank = pengeluaran
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

    // Sort by time DESC
    transactions.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())

    return transactions
  }
}
