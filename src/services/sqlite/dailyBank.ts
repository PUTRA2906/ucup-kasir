import { query, getCurrentUserId } from './db'

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

export const sqliteDailyBankService = {
  /**
   * Ambil ringkasan bank harian dari SQLite
   */
  async getDailyBankSummary(date: string): Promise<DailyBankSummary> {
    const userId = getCurrentUserId()

    // 1. Penjualan hari ini dengan payment_method = 'transfer'
    const sales = await query<{
      paid_amount: number
      payment_method: string
    }>(
      `SELECT paid_amount, payment_method
       FROM transactions
       WHERE DATE(created_at) = DATE(?)
         AND payment_method = 'transfer'
         AND status NOT IN ('void', 'batal')
         AND user_id = ?`,
      [date, userId]
    )

    // 2. Cicilan hari ini dengan payment_method = 'transfer'
    const payments = await query<{
      amount: number
      payment_method: string
    }>(
      `SELECT amount, payment_method
       FROM transaction_payments
       WHERE DATE(created_at) = DATE(?)
         AND payment_method = 'transfer'
         AND user_id = ?`,
      [date, userId]
    )

    const transfer_in =
      sales.reduce((sum, s) => sum + (s.paid_amount || 0), 0) +
      payments.reduce((sum, p) => sum + (p.amount || 0), 0)

    // 3. Bank keluar dari jurnal (credit di akun bank)
    const bankAccounts = await query<{
      id: string
      code: string
    }>(
      `SELECT id, code
       FROM chart_of_accounts
       WHERE code IN ('1-1002', '1-1010')
         AND user_id = ?`,
      [userId]
    )

    const bankAccountIds = bankAccounts.map(a => a.id)

    let bankOut = 0

    if (bankAccountIds.length > 0) {
      const placeholders = bankAccountIds.map(() => '?').join(',')

      const journalLines = await query<{
        credit: number
      }>(
        `SELECT jl.credit
         FROM journal_lines jl
         INNER JOIN journal_entries je ON jl.journal_entry_id = je.id
         WHERE jl.account_id IN (${placeholders})
           AND je.status = 'posted'
           AND DATE(je.entry_date) = DATE(?)`,
        [...bankAccountIds, date]
      )

      bankOut = journalLines.reduce((sum, line) => sum + Number(line.credit || 0), 0)
    }

    return {
      total_in: transfer_in,
      total_out: bankOut,
      net: transfer_in - bankOut,
      transactions_count: sales.length,
      payments_count: payments.length
    }
  },

  /**
   * Ambil detail transaksi bank harian dari SQLite
   */
  async getDailyBankTransactions(date: string): Promise<BankTransaction[]> {
    const userId = getCurrentUserId()

    const transactions: BankTransaction[] = []

    // 1. Penjualan hari ini dengan payment_method = 'transfer'
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
         AND payment_method = 'transfer'
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
          customer_name: sale.customer_name || undefined,
          reference: sale.transaction_number,
          description: 'Penjualan',
          is_in: true
        })
      }
    }

    // 2. Cicilan hari ini dengan payment_method = 'transfer'
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
         AND payment_method = 'transfer'
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
        customer_name: tx?.customer_name || undefined,
        reference: tx?.transaction_number || '-',
        description: 'Pembayaran Cicilan',
        is_in: true
      })
    }

    // 3. Bank keluar dari jurnal
    const bankAccounts = await query<{
      id: string
      code: string
      name: string
    }>(
      `SELECT id, code, name
       FROM chart_of_accounts
       WHERE code IN ('1-1002', '1-1010')
         AND user_id = ?`,
      [userId]
    )

    const bankAccountIds = bankAccounts.map(a => a.id)

    if (bankAccountIds.length > 0) {
      const placeholders = bankAccountIds.map(() => '?').join(',')

      const journalLines = await query<{
        id: string
        credit: number
        account_id: string
        created_at: string
        journal_entry_id: string
      }>(
        `SELECT jl.id, jl.credit, jl.account_id, jl.created_at, jl.journal_entry_id
         FROM journal_lines jl
         INNER JOIN journal_entries je ON jl.journal_entry_id = je.id
         WHERE jl.account_id IN (${placeholders})
           AND je.status = 'posted'
           AND DATE(je.entry_date) = DATE(?)
           AND jl.credit > 0`,
        [...bankAccountIds, date]
      )

      for (const line of journalLines) {
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
