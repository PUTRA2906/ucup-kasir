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

    // ── Sumber tunggal: transaction_payments (hanya transfer) ────────────────
    const payments = await query<{ amount: number }>(
      `SELECT tp.amount
       FROM transaction_payments tp
       INNER JOIN transactions t ON t.id = tp.transaction_id
       WHERE (DATE(tp.payment_date) = DATE(?) OR DATE(tp.created_at) = DATE(?))
         AND tp.user_id = ?
         AND tp.payment_method = 'transfer'
         AND t.status NOT IN ('void', 'batal')`,
      [date, date, userId]
    )

    let transfer_in = payments.reduce((sum, p) => sum + (p.amount || 0), 0)

    // Jumlah transaksi bank hari ini
    const salesCount = await query<{ cnt: number }>(
      `SELECT COUNT(*) as cnt FROM transactions
       WHERE DATE(created_at) = DATE(?)
         AND payment_method = 'transfer'
         AND status NOT IN ('void', 'batal')
         AND user_id = ?`,
      [date, userId]
    )

    // ── Kas keluar dari jurnal manual (akun bank) ─────────────────────────────
    const bankAccounts = await query<{ id: string; code: string }>(
      `SELECT id, code FROM chart_of_accounts
       WHERE code IN ('1-1010') AND user_id = ?`,
      [userId]
    )

    const bankAccountIds = bankAccounts.map(a => a.id)
    let bankOut = 0

    if (bankAccountIds.length > 0) {
      const placeholders = bankAccountIds.map(() => '?').join(',')

      const journalLines = await query<{ debit: number; credit: number }>(
        `SELECT jl.debit, jl.credit
         FROM journal_lines jl
         INNER JOIN journal_entries je ON jl.journal_id = je.id
         WHERE jl.account_id IN (${placeholders})
           AND je.status = 'posted'
           AND DATE(je.entry_date) = DATE(?)
           AND (je.reference_type IS NULL
                OR je.reference_type NOT IN ('transaction', 'payment'))`,
        [...bankAccountIds, date]
      )

      for (const line of journalLines) {
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
      transactions_count: salesCount[0]?.cnt || 0,
      payments_count: payments.length
    }
  },

  /**
   * Ambil detail transaksi bank harian dari SQLite
   */
  async getDailyBankTransactions(date: string): Promise<BankTransaction[]> {
    const userId = getCurrentUserId()

    const transactions: BankTransaction[] = []

    // ── Sumber tunggal: transaction_payments (hanya transfer) ────────────────
    const payments = await query<{
      id: string
      amount: number
      payment_method: string
      created_at: string
      payment_date: string
      transaction_id: string
    }>(
      `SELECT tp.id, tp.amount, tp.payment_method, tp.created_at, tp.payment_date, tp.transaction_id
       FROM transaction_payments tp
       INNER JOIN transactions t ON t.id = tp.transaction_id
       WHERE (DATE(tp.payment_date) = DATE(?) OR DATE(tp.created_at) = DATE(?))
         AND tp.user_id = ?
         AND tp.payment_method = 'transfer'
         AND t.status NOT IN ('void', 'batal')
       ORDER BY tp.created_at DESC`,
      [date, date, userId]
    )

    for (const payment of payments) {
      const txData = await query<{
        transaction_number: string
        customer_name: string | null
        created_at: string
      }>(
        `SELECT transaction_number, customer_name, created_at FROM transactions WHERE id = ?`,
        [payment.transaction_id]
      )

      const tx = txData[0]
      if (!tx) continue

      // Payment pertama dari transaksi yang dibuat hari ini = label 'Penjualan'
      const isInitial = payment.created_at === tx.created_at
      transactions.push({
        id: payment.id,
        time: payment.created_at,
        type: isInitial ? 'sale' : 'payment',
        amount: payment.amount,
        customer_name: tx.customer_name || undefined,
        reference: tx.transaction_number,
        description: isInitial ? 'Penjualan' : 'Pembayaran Cicilan',
        is_in: true
      })
    }

    // ── Jurnal manual akun bank ────────────────────────────────────────────────
    const bankAccounts = await query<{ id: string; code: string; name: string }>(
      `SELECT id, code, name FROM chart_of_accounts
       WHERE code IN ('1-1010') AND user_id = ?`,
      [userId]
    )

    const bankAccountIds = bankAccounts.map(a => a.id)

    if (bankAccountIds.length > 0) {
      const placeholders = bankAccountIds.map(() => '?').join(',')

      const journalLines = await query<{
        id: string
        debit: number
        credit: number
        created_at: string
        journal_id: string
        reference_type: string | null
      }>(
        `SELECT jl.id, jl.debit, jl.credit, jl.created_at, jl.journal_id, je.reference_type
         FROM journal_lines jl
         INNER JOIN journal_entries je ON jl.journal_id = je.id
         WHERE jl.account_id IN (${placeholders})
           AND je.status = 'posted'
           AND DATE(je.entry_date) = DATE(?)
           AND (je.reference_type IS NULL
                OR je.reference_type NOT IN ('transaction', 'payment'))`,
        [...bankAccountIds, date]
      )

      for (const line of journalLines) {
        const debit = Number(line.debit || 0)
        const credit = Number(line.credit || 0)
        if (debit === 0 && credit === 0) continue

        const journalData = await query<{ journal_number: string; description: string | null }>(
          `SELECT journal_number, description FROM journal_entries WHERE id = ?`,
          [line.journal_id]
        )
        const journal = journalData[0]

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
