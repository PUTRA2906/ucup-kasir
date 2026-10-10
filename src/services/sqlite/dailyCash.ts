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

    // ── Sumber tunggal: transaction_payments ─────────────────────────────────
    // Semua pemasukan kas (penjualan + cicilan) selalu ada di transaction_payments.
    // Tidak perlu split antara transactions dan transaction_payments.
    const payments = await query<{
      amount: number
      payment_method: string
    }>(
      `SELECT tp.amount, tp.payment_method
       FROM transaction_payments tp
       INNER JOIN transactions t ON t.id = tp.transaction_id
       WHERE (DATE(tp.payment_date) = DATE(?) OR DATE(tp.created_at) = DATE(?))
         AND tp.user_id = ?
         AND t.status NOT IN ('void', 'batal')`,
      [date, date, userId]
    )

    let tunai_in = payments
      .filter(p => p.payment_method === 'tunai')
      .reduce((sum, p) => sum + (p.amount || 0), 0)

    let transfer_in = payments
      .filter(p => p.payment_method === 'transfer')
      .reduce((sum, p) => sum + (p.amount || 0), 0)

    // Hitung jumlah transaksi (untuk info saja)
    const salesCount = await query<{ cnt: number }>(
      `SELECT COUNT(*) as cnt FROM transactions
       WHERE DATE(created_at) = DATE(?) AND status NOT IN ('void', 'batal') AND user_id = ?`,
      [date, userId]
    )

    // ── Kas keluar dari jurnal manual (bukan dari penjualan/cicilan) ──────────
    const cashAccounts = await query<{ id: string; code: string }>(
      `SELECT id, code FROM chart_of_accounts
       WHERE code IN ('1-1000', '1-1010') AND user_id = ?`,
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
         INNER JOIN journal_entries je ON jl.journal_id = je.id
         WHERE jl.account_id IN (${placeholders})
           AND je.status = 'posted'
           AND DATE(je.entry_date) = DATE(?)
           AND (je.reference_type IS NULL
                OR je.reference_type NOT IN ('transaction', 'payment'))`,
        [...cashAccountIds, date]
      )

      for (const line of journalLines) {
        const debit = Number(line.debit || 0)
        const credit = Number(line.credit || 0)
        const account = cashAccounts.find(a => a.id === line.account_id)

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
      transactions_count: salesCount[0]?.cnt || 0,
      payments_count: payments.length
    }
  },

  /**
   * Ambil detail transaksi kas harian dari SQLite
   */
  async getDailyCashTransactions(date: string): Promise<CashTransaction[]> {
    const userId = getCurrentUserId()

    const transactions: CashTransaction[] = []

    // ── Sumber 1: transaction_payments (SEMUA payment di hari ini) ──────────
    // Ini adalah sumber tunggal untuk semua pemasukan kas dari penjualan & cicilan.
    // Tidak perlu exclude — setiap baris di transaction_payments = 1 entry kas masuk.
    // Pembayaran awal saat buat transaksi juga ada di sini, dengan label 'Penjualan'.
    const payments = await query<{
      id: string
      amount: number
      payment_method: string
      created_at: string
      payment_date: string
      transaction_id: string
    }>(
      `SELECT id, amount, payment_method, created_at, payment_date, transaction_id
       FROM transaction_payments
       WHERE (DATE(payment_date) = DATE(?) OR DATE(created_at) = DATE(?))
         AND user_id = ?
       ORDER BY created_at DESC`,
      [date, date, userId]
    )

    for (const payment of payments) {
      // Ambil data transaksi induk
      const txData = await query<{
        id: string
        transaction_number: string
        customer_name: string | null
        created_at: string
      }>(
        `SELECT id, transaction_number, customer_name, created_at
         FROM transactions
         WHERE id = ? AND status NOT IN ('void', 'batal')`,
        [payment.transaction_id]
      )

      const tx = txData[0]
      if (!tx) continue // transaksi void/batal — skip

      // Tentukan label: jika ini adalah payment pertama dari transaksi
      // (created_at payment = created_at transaksi), tampilkan sebagai 'Penjualan'
      // Jika tidak, tampilkan sebagai 'Pembayaran Cicilan'
      const isInitial = payment.created_at === tx.created_at
      const type: 'sale' | 'payment' = isInitial ? 'sale' : 'payment'
      const description = isInitial ? 'Penjualan' : 'Pembayaran Cicilan'

      transactions.push({
        id: payment.id,
        time: payment.created_at,
        type,
        amount: payment.amount,
        method: payment.payment_method as 'tunai' | 'transfer',
        customer_name: tx.customer_name || undefined,
        reference: tx.transaction_number,
        description,
        is_in: true
      })
    }

    // ── Sumber 2: jurnal manual (kas masuk/keluar selain penjualan & cicilan) ──
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
        journal_id: string
        reference_type: string | null
      }>(
        `SELECT jl.id, jl.debit, jl.credit, jl.account_id, jl.created_at, jl.journal_id,
                je.reference_type
         FROM journal_lines jl
         INNER JOIN journal_entries je ON jl.journal_id = je.id
         WHERE jl.account_id IN (${placeholders})
           AND je.status = 'posted'
           AND DATE(je.entry_date) = DATE(?)
           AND (je.reference_type IS NULL
                OR je.reference_type NOT IN ('transaction', 'payment'))`,
        [...cashAccountIds, date]
      )

      for (const line of journalLines) {
        const debit = Number(line.debit || 0)
        const credit = Number(line.credit || 0)
        if (debit === 0 && credit === 0) continue

        const journalData = await query<{
          journal_number: string
          description: string | null
        }>(
          `SELECT journal_number, description FROM journal_entries WHERE id = ?`,
          [line.journal_id]
        )

        const journal = journalData[0]
        const account = cashAccounts.find(a => a.id === line.account_id)

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

    // Sort by time DESC
    transactions.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())

    return transactions
  }
}
