import { query, getCurrentUserId } from './db'

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

export const sqliteDailyCashService = {
  /**
   * Ambil ringkasan kas harian dari SQLite
   */
  async getDailyCashSummary(date: string): Promise<DailyCashSummary> {
    const userId = getCurrentUserId()

    // 1. Penjualan hari ini (paid_amount, bukan total)
    const sales = await query<{
      paid_amount: number
      payment_method: string
    }>(
      `SELECT paid_amount, payment_method
       FROM transactions
       WHERE DATE(created_at) = DATE(?)
         AND status NOT IN ('void', 'batal')
         AND user_id = ?`,
      [date, userId]
    )

    // 2. Cicilan hari ini
    const payments = await query<{
      amount: number
      payment_method: string
    }>(
      `SELECT amount, payment_method
       FROM transaction_payments
       WHERE DATE(created_at) = DATE(?)
         AND user_id = ?`,
      [date, userId]
    )

    // Hitung total
    let tunai_in =
      sales.filter(s => s.payment_method === 'tunai').reduce((sum, s) => sum + (s.paid_amount || 0), 0) +
      payments.filter(p => p.payment_method === 'tunai').reduce((sum, p) => sum + (p.amount || 0), 0)

    let transfer_in =
      sales.filter(s => s.payment_method === 'transfer').reduce((sum, s) => sum + (s.paid_amount || 0), 0) +
      payments.filter(p => p.payment_method === 'transfer').reduce((sum, p) => sum + (p.amount || 0), 0)

    const total_in = tunai_in + transfer_in

    // 3. Kas keluar dari jurnal (credit di akun kas/bank)
    const cashAccounts = await query<{
      id: string
      code: string
    }>(
      `SELECT id, code
       FROM chart_of_accounts
       WHERE code IN ('1-1000', '1-1010')
         AND user_id = ?`,
      [userId]
    )

    const cashAccountIds = cashAccounts.map(a => a.id)

    let cashOut = 0
    let tunai_out = 0
    let transfer_out = 0

    if (cashAccountIds.length > 0) {
      const placeholders = cashAccountIds.map(() => '?').join(',')

      const journalLines = await query<{
        debit: number
        credit: number
        account_id: string
      }>(
        `SELECT jl.debit, jl.credit, jl.account_id
         FROM journal_lines jl
         INNER JOIN journal_entries je ON jl.journal_entry_id = je.id
         WHERE jl.account_id IN (${placeholders})
           AND je.status = 'posted'
           AND DATE(je.entry_date) = DATE(?)`,
        [...cashAccountIds, date]
      )

      for (const line of journalLines) {
        const debit = Number(line.debit || 0)
        const credit = Number(line.credit || 0)
        const account = cashAccounts.find(a => a.id === line.account_id)

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
      transactions_count: sales.length,
      payments_count: payments.length
    }
  },

  /**
   * Ambil detail transaksi kas harian dari SQLite
   */
  async getDailyCashTransactions(date: string): Promise<CashTransaction[]> {
    const userId = getCurrentUserId()

    const transactions: CashTransaction[] = []

    // 1. Penjualan hari ini
    const sales = await query<{
      id: string
      transaction_number: string
      created_at: string
      paid_amount: number
      payment_method: string
      customer_name: string | null
    }>(
      `SELECT id, transaction_number, created_at, paid_amount, payment_method, customer_name
       FROM transactions
       WHERE DATE(created_at) = DATE(?)
         AND status NOT IN ('void', 'batal')
         AND user_id = ?
       ORDER BY created_at DESC`,
      [date, userId]
    )

    for (const sale of sales) {
      if (sale.paid_amount > 0) {
        transactions.push({
          id: sale.id,
          time: sale.created_at,
          type: 'sale',
          amount: sale.paid_amount,
          method: sale.payment_method as 'tunai' | 'transfer',
          customer_name: sale.customer_name || undefined,
          reference: sale.transaction_number,
          description: 'Penjualan',
          is_in: true
        })
      }
    }

    // 2. Cicilan hari ini
    const payments = await query<{
      id: string
      amount: number
      payment_method: string
      created_at: string
      transaction_id: string
    }>(
      `SELECT id, amount, payment_method, created_at, transaction_id
       FROM transaction_payments
       WHERE DATE(created_at) = DATE(?)
         AND user_id = ?
       ORDER BY created_at DESC`,
      [date, userId]
    )

    for (const payment of payments) {
      // Ambil data transaksi untuk customer_name dan transaction_number
      const txData = await query<{
        transaction_number: string
        customer_name: string | null
      }>(
        `SELECT transaction_number, customer_name
         FROM transactions
         WHERE id = ?`,
        [payment.transaction_id]
      )

      const tx = txData[0]

      transactions.push({
        id: payment.id,
        time: payment.created_at,
        type: 'payment',
        amount: payment.amount,
        method: payment.payment_method as 'tunai' | 'transfer',
        customer_name: tx?.customer_name || undefined,
        reference: tx?.transaction_number || '-',
        description: 'Pembayaran Cicilan',
        is_in: true
      })
    }

    // 3. Transaksi dari jurnal (baik masuk maupun keluar)
    const cashAccounts = await query<{
      id: string
      code: string
      name: string
    }>(
      `SELECT id, code, name
       FROM chart_of_accounts
       WHERE code IN ('1-1000', '1-1010')
         AND user_id = ?`,
      [userId]
    )

    const cashAccountIds = cashAccounts.map(a => a.id)

    if (cashAccountIds.length > 0) {
      const placeholders = cashAccountIds.map(() => '?').join(',')

      const journalLines = await query<{
        id: string
        debit: number
        credit: number
        account_id: string
        created_at: string
        journal_entry_id: string
      }>(
        `SELECT jl.id, jl.debit, jl.credit, jl.account_id, jl.created_at, jl.journal_entry_id
         FROM journal_lines jl
         INNER JOIN journal_entries je ON jl.journal_entry_id = je.id
         WHERE jl.account_id IN (${placeholders})
           AND je.status = 'posted'
           AND DATE(je.entry_date) = DATE(?)`,
        [...cashAccountIds, date]
      )

      for (const line of journalLines) {
        const debit = Number(line.debit || 0)
        const credit = Number(line.credit || 0)

        // Skip jika debit dan credit keduanya 0
        if (debit === 0 && credit === 0) continue

        // Ambil data journal entry
        const journalData = await query<{
          journal_number: string
          description: string | null
        }>(
          `SELECT journal_number, description
           FROM journal_entries
           WHERE id = ?`,
          [line.journal_entry_id]
        )

        const journal = journalData[0]
        const account = cashAccounts.find(a => a.id === line.account_id)

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
