import { query, queryOne, run, addToSyncQueue, transaction } from './db'
import type { TransactionExecutor } from '@/lib/sqlite'
import { getCurrentUserId, uuid, nowIso } from './db'
import type {
  Account,
  AccountInsert,
  AccountUpdate,
  AccountBalance,
  JournalEntry,
  JournalInput,
  JournalLine,
  JournalLineInput,
  LedgerEntry,
} from '@/types/database'

// ============================================================
// SQLite Service: Finance
// Mirror dari src/services/finance.ts + replikasi fungsi RPC:
//   - seed_default_accounts
//   - post_journal (validasi balance)
//   - void_journal
// ============================================================

/** Akun default untuk seed. */
const DEFAULT_ACCOUNTS: Array<Omit<Account, 'id' | 'user_id' | 'created_at' | 'updated_at'>> = [
  { code: '1-1000', name: 'Kas', type: 'aset', normal_balance: 'debit', is_active: true, is_system: true },
  { code: '1-1010', name: 'Bank', type: 'aset', normal_balance: 'debit', is_active: true, is_system: true },
  { code: '1-1100', name: 'Piutang Usaha', type: 'aset', normal_balance: 'debit', is_active: true, is_system: true },
  { code: '1-1200', name: 'Persediaan Barang', type: 'aset', normal_balance: 'debit', is_active: true, is_system: true },
  { code: '2-2000', name: 'Utang Usaha', type: 'kewajiban', normal_balance: 'kredit', is_active: true, is_system: true },
  { code: '3-3000', name: 'Modal Pemilik', type: 'ekuitas', normal_balance: 'kredit', is_active: true, is_system: true },
  { code: '3-3100', name: 'Laba Ditahan', type: 'ekuitas', normal_balance: 'kredit', is_active: true, is_system: true },
  { code: '4-4000', name: 'Pendapatan Penjualan', type: 'pendapatan', normal_balance: 'kredit', is_active: true, is_system: true },
  { code: '4-4100', name: 'Pendapatan Lainnya', type: 'pendapatan', normal_balance: 'kredit', is_active: true, is_system: true },
  { code: '5-5000', name: 'Harga Pokok Penjualan (HPP)', type: 'beban', normal_balance: 'debit', is_active: true, is_system: true },
  { code: '5-5100', name: 'Beban Operasional', type: 'beban', normal_balance: 'debit', is_active: true, is_system: true },
  { code: '5-5200', name: 'Beban Gaji', type: 'beban', normal_balance: 'debit', is_active: true, is_system: true },
  { code: '5-5300', name: 'Beban Sewa', type: 'beban', normal_balance: 'debit', is_active: true, is_system: true },
  { code: '5-5400', name: 'Beban Utilitas', type: 'beban', normal_balance: 'debit', is_active: true, is_system: true },
  { code: '5-5500', name: 'Beban Transportasi', type: 'beban', normal_balance: 'debit', is_active: true, is_system: true },
  { code: '5-5600', name: 'Beban Lainnya', type: 'beban', normal_balance: 'debit', is_active: true, is_system: true },
]

export const sqliteFinanceService = {
  // ============================================================
  // Chart of Accounts
  // ============================================================

  async seedDefaultAccounts(): Promise<Account[]> {
    const userId = getCurrentUserId()
    const now = nowIso()
    const created: Account[] = []

    for (const acc of DEFAULT_ACCOUNTS) {
      const existing = await queryOne<any>(
        `SELECT id FROM chart_of_accounts WHERE user_id = ? AND code = ?`,
        [userId, acc.code]
      )
      if (!existing) {
        const id = uuid()
        await run(
          `INSERT INTO chart_of_accounts (id, user_id, code, name, type, normal_balance, is_active, is_system, created_at, updated_at, sync_status, updated_at_local)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
          [id, userId, acc.code, acc.name, acc.type, acc.normal_balance, acc.is_active ? 1 : 0, acc.is_system ? 1 : 0, now, now, now]
        )
        created.push({ ...acc, id, user_id: userId, created_at: now, updated_at: now })
      }
    }

    // Queue akun baru ke sync
    for (const acc of created) {
      await addToSyncQueue('INSERT', 'chart_of_accounts', acc.id, acc)
    }

    return this.getAccounts()
  },

  async getAccounts(): Promise<Account[]> {
    const userId = getCurrentUserId()
    const rows = await query<any>(
      `SELECT * FROM chart_of_accounts WHERE user_id = ? ORDER BY code`,
      [userId]
    )
    return rows.map(this.mapAccount)
  },

  async createAccount(input: AccountInsert): Promise<Account> {
    const userId = getCurrentUserId()
    const id = uuid()
    const now = nowIso()

    await run(
      `INSERT INTO chart_of_accounts (id, user_id, code, name, type, normal_balance, is_active, is_system, created_at, updated_at, sync_status, updated_at_local)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, 'pending', ?)`,
      [id, userId, input.code, input.name, input.type, input.normal_balance,
       input.is_active ? 1 : 0, now, now, now]
    )

    const account = await this.getById(id)
    await addToSyncQueue('INSERT', 'chart_of_accounts', id, account || { id })
    return account!
  },

  async getById(id: string): Promise<Account | null> {
    const userId = getCurrentUserId()
    const row = await queryOne<any>(
      `SELECT * FROM chart_of_accounts WHERE id = ? AND user_id = ?`,
      [id, userId]
    )
    return row ? this.mapAccount(row) : null
  },

  async updateAccount(id: string, updates: AccountUpdate): Promise<Account> {
    const userId = getCurrentUserId()
    const now = nowIso()
    const fields: string[] = []
    const values: any[] = []

    if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name) }
    if ((updates as any).description !== undefined) { fields.push('description = ?'); values.push((updates as any).description) }
    if (updates.is_active !== undefined) { fields.push('is_active = ?'); values.push(updates.is_active ? 1 : 0) }

    fields.push('updated_at = ?')
    values.push(now)
    fields.push('sync_status = ?')
    values.push('pending')
    fields.push('updated_at_local = ?')
    values.push(now)

    values.push(id, userId)

    await run(
      `UPDATE chart_of_accounts SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`,
      values
    )

    const account = await this.getById(id)
    await addToSyncQueue('UPDATE', 'chart_of_accounts', id, account || { id })
    return account!
  },

  async deleteAccount(id: string): Promise<void> {
    const userId = getCurrentUserId()
    // Hanya akun non-sistem yang bisa dihapus
    await run(
      `DELETE FROM chart_of_accounts WHERE id = ? AND user_id = ? AND is_system = 0`,
      [id, userId]
    )
    await addToSyncQueue('DELETE', 'chart_of_accounts', id, { id })
  },

  // ============================================================
  // Jurnal Umum
  // ============================================================

  async getJournals(): Promise<JournalEntry[]> {
    const userId = getCurrentUserId()
    const rows = await query<any>(
      `SELECT * FROM journal_entries WHERE user_id = ? ORDER BY entry_date DESC`,
      [userId]
    )
    const entries = rows.map(this.mapJournalEntry)
    for (const entry of entries) {
      entry.lines = await this.getLines(entry.id)
    }
    return entries
  },

  async getJournal(id: string): Promise<JournalEntry | null> {
    const userId = getCurrentUserId()
    const row = await queryOne<any>(
      `SELECT * FROM journal_entries WHERE id = ? AND user_id = ?`,
      [id, userId]
    )
    if (!row) return null
    const entry = this.mapJournalEntry(row)
    entry.lines = await this.getLines(id)
    return entry
  },

  async getLines(journalId: string): Promise<JournalLine[]> {
    const userId = getCurrentUserId()
    const rows = await query<any>(
      `SELECT * FROM journal_lines WHERE journal_id = ? AND user_id = ? ORDER BY created_at ASC`,
      [journalId, userId]
    )
    return rows.map(this.mapJournalLine)
  },

  /**
   * Replikasi fungsi RPC post_journal:
   * 1. Validasi akun & balance
   * 2. Simpan header jurnal
   * 3. Simpan baris jurnal
   */
  async createJournal(input: JournalInput): Promise<string> {
    const userId = getCurrentUserId()
    const journalId = uuid()
    const now = nowIso()

    // Generate journal number
    const date = new Date().toISOString().split('T')[0].replace(/-/g, '')
    const suffix = Math.random().toString(36).substring(2, 8).toUpperCase()
    const journalNumber = `JRN-${date}-${suffix}`

    return transaction(async (tx) => {
      // Validasi
      if (!input.lines || input.lines.length === 0) {
        throw new Error('Jurnal harus memiliki minimal 1 baris')
      }

      if (!input.description || input.description.trim() === '') {
        throw new Error('Deskripsi jurnal wajib diisi')
      }

      let totalDebit = 0
      let totalCredit = 0

      for (const line of input.lines) {
        const account = await tx.query<any>(
          `SELECT id, code, name, is_active FROM chart_of_accounts WHERE id = ? AND user_id = ?`,
          [line.account_id, userId]
        )
        if (!account || account.length === 0) {
          throw new Error('Akun tidak ditemukan')
        }
        if (!account[0].is_active) {
          throw new Error(`Akun ${account[0].name} tidak aktif`)
        }
        totalDebit += Number(line.debit || 0)
        totalCredit += Number(line.credit || 0)
      }

      if (totalDebit <= 0 && totalCredit <= 0) {
        throw new Error('Jurnal harus memiliki nilai debit atau kredit')
      }

      if (Math.round(totalDebit * 100) !== Math.round(totalCredit * 100)) {
        throw new Error(`Total debit (${totalDebit}) tidak sama dengan total kredit (${totalCredit})`)
      }

      // Simpan header
      await tx.run(
        `INSERT INTO journal_entries (id, user_id, journal_number, entry_date, description, reference_type, status, created_at, updated_at, sync_status, updated_at_local)
         VALUES (?, ?, ?, ?, ?, 'manual', 'posted', ?, ?, 'pending', ?)`,
        [journalId, userId, journalNumber, input.entry_date, input.description, now, now, now]
      )

      // Simpan baris
      for (const line of input.lines) {
        const lineId = uuid()
        const account = await tx.query<any>(
          `SELECT code, name FROM chart_of_accounts WHERE id = ? AND user_id = ?`,
          [line.account_id, userId]
        )
        const acc = account[0]
        await tx.run(
          `INSERT INTO journal_lines (id, user_id, journal_id, account_id, account_code, account_name, debit, credit, created_at, sync_status, updated_at_local)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
          [lineId, userId, journalId, line.account_id, acc.code, acc.name,
           Number(line.debit || 0), Number(line.credit || 0), now, now]
        )
      }
    }).then(async () => {
      const entry = await this.getJournal(journalId)
      await addToSyncQueue('INSERT', 'journal_entries', journalId, { id: journalId })
      return journalId
    })
  },

  /** Replikasi fungsi RPC void_journal */
  async voidJournal(id: string): Promise<void> {
    const userId = getCurrentUserId()
    const now = nowIso()

    const row = await queryOne<any>(
      `SELECT status FROM journal_entries WHERE id = ? AND user_id = ?`,
      [id, userId]
    )
    if (!row) throw new Error('Jurnal tidak ditemukan')
    if (row.status === 'void') throw new Error('Jurnal sudah dibatalkan sebelumnya')

    await run(
      `UPDATE journal_entries SET status = 'void', updated_at = ?, sync_status = 'pending', updated_at_local = ? WHERE id = ? AND user_id = ?`,
      [now, now, id, userId]
    )

    await addToSyncQueue('UPDATE', 'journal_entries', id, { id, status: 'void' })
  },

  async deleteJournal(id: string): Promise<void> {
    const userId = getCurrentUserId()
    // Hapus baris dulu, lalu header
    await run(
      `DELETE FROM journal_lines WHERE journal_id = ? AND user_id = ?`,
      [id, userId]
    )
    await run(
      `DELETE FROM journal_entries WHERE id = ? AND user_id = ?`,
      [id, userId]
    )
    await addToSyncQueue('DELETE', 'journal_entries', id, { id })
  },

  // ============================================================
  // Laporan: Buku Besar
  // ============================================================

  /** Saldo akun sampai tanggal tertentu. */
  async getAccountBalances(endDate?: string): Promise<AccountBalance[]> {
    const userId = getCurrentUserId()
    const accounts = await this.getAccounts()

    const balances: AccountBalance[] = []

    for (const acc of accounts) {
      if (!acc.is_active) continue

      let sql = `SELECT COALESCE(SUM(jl.debit), 0) as total_debit, COALESCE(SUM(jl.credit), 0) as total_credit
                 FROM journal_lines jl
                 INNER JOIN journal_entries je ON je.id = jl.journal_id
                 WHERE jl.account_id = ? AND jl.user_id = ? AND je.status = 'posted'`

      const params: any[] = [acc.id, userId]

      if (endDate) {
        sql += ` AND je.entry_date <= ?`
        params.push(endDate + 'T23:59:59.999')
      }

      const row = await queryOne<any>(sql, params)
      const totalDebit = Number(row?.total_debit || 0)
      const totalCredit = Number(row?.total_credit || 0)
      const rawBalance = totalDebit - totalCredit
      const balance = acc.normal_balance === 'debit' ? rawBalance : -rawBalance

      balances.push({
        account_id: acc.id,
        account_code: acc.code,
        account_name: acc.name,
        account_type: acc.type,
        normal_balance: acc.normal_balance,
        total_debit: totalDebit,
        total_credit: totalCredit,
        balance,
      })
    }

    return balances
  },

  /** Riwayat buku besar untuk satu akun. */
  async getLedger(
    accountId: string,
    startDate?: string,
    endDate?: string
  ): Promise<{ balance: number; entries: LedgerEntry[] }> {
    const userId = getCurrentUserId()

    // Saldo awal sebelum startDate. Tanpa startDate = 0 (semua baris sudah tercakup di rentang).
    let before = 0
    if (startDate) {
      const beforeSql = `SELECT COALESCE(SUM(jl.debit), 0) as total_debit, COALESCE(SUM(jl.credit), 0) as total_credit
                         FROM journal_lines jl
                         INNER JOIN journal_entries je ON je.id = jl.journal_id
                         WHERE jl.account_id = ? AND jl.user_id = ? AND je.status = 'posted'
                         AND je.entry_date < ?`
      const beforeRow = await queryOne<any>(beforeSql, [accountId, userId, startDate + 'T00:00:00.000'])
      const beforeDebit = Number(beforeRow?.total_debit || 0)
      const beforeCredit = Number(beforeRow?.total_credit || 0)
      before = beforeDebit - beforeCredit
    }

    // Entries dalam rentang
    let sql = `SELECT jl.debit, jl.credit, je.journal_number, je.entry_date, je.description, je.reference_type
               FROM journal_lines jl
               INNER JOIN journal_entries je ON je.id = jl.journal_id
               WHERE jl.account_id = ? AND jl.user_id = ? AND je.status = 'posted'`
    const params: any[] = [accountId, userId]

    if (startDate) { sql += ` AND je.entry_date >= ?`; params.push(startDate + 'T00:00:00.000') }
    if (endDate) { sql += ` AND je.entry_date <= ?`; params.push(endDate + 'T23:59:59.999') }

    sql += ` ORDER BY je.entry_date ASC`

    const rows = await query<any>(sql, params)

    let running = before
    const entries: LedgerEntry[] = rows.map((r) => {
      const debit = Number(r.debit || 0)
      const credit = Number(r.credit || 0)
      running = running + debit - credit
      return {
        entry_date: r.entry_date,
        journal_number: r.journal_number,
        description: r.description,
        reference_type: r.reference_type || undefined,
        debit,
        credit,
        balance: running,
      }
    })

    return { balance: before, entries }
  },

  // ============================================================
  // Laporan: Arus Kas
  // ============================================================

  async getCashFlow(startDate?: string, endDate?: string): Promise<{
    cashIn: number
    cashOut: number
    netCash: number
    lines: Array<{ entry_date: string; journal_number: string; description: string; debit: number; credit: number; customer_name?: string | null; is_payment?: boolean }>
  }> {
    const userId = getCurrentUserId()

    // Cari akun Kas & Bank
    const cashAccounts = await query<any>(
      `SELECT id FROM chart_of_accounts WHERE user_id = ? AND code IN ('1-1000', '1-1010')`,
      [userId]
    )
    const cashIds = cashAccounts.map((a: any) => a.id)
    if (cashIds.length === 0) {
      return { cashIn: 0, cashOut: 0, netCash: 0, lines: [] }
    }

    const placeholders = cashIds.map(() => '?').join(',')
    let sql = `SELECT jl.account_code, jl.account_name, jl.debit, jl.credit, je.journal_number, je.entry_date, je.description,
                      je.reference_type, t.customer_name
               FROM journal_lines jl
               INNER JOIN journal_entries je ON je.id = jl.journal_id
               LEFT JOIN transactions t ON t.id = je.reference_id
               WHERE jl.account_id IN (${placeholders}) AND jl.user_id = ? AND je.status = 'posted'`
    const params: any[] = [...cashIds, userId]

    if (startDate) { sql += ` AND je.entry_date >= ?`; params.push(startDate + 'T00:00:00.000') }
    if (endDate) { sql += ` AND je.entry_date <= ?`; params.push(endDate + 'T23:59:59.999') }

    sql += ` ORDER BY je.entry_date ASC`

    const rows = await query<any>(sql, params)

    let cashIn = 0
    let cashOut = 0
    const lines = rows.map((r: any) => {
      const debit = Number(r.debit || 0)
      const credit = Number(r.credit || 0)
      cashIn += debit
      cashOut += credit
      const isPayment = r.reference_type === 'payment'
      return {
        entry_date: r.entry_date,
        journal_number: r.journal_number,
        description: r.description,
        account_code: r.account_code,
        account_name: r.account_name,
        customer_name: isPayment ? (r.customer_name || null) : null,
        is_payment: isPayment,
        debit,
        credit,
      }
    })

    return { cashIn, cashOut, netCash: cashIn - cashOut, lines }
  },

  // ============================================================
  // Auto-jurnal untuk transaksi penjualan (dipanggil dari sqlite/transactions.ts)
  // ============================================================

  /**
   * Buat jurnal otomatis untuk transaksi penjualan.
   * Dipanggil dari sqliteTransactionsService.create() dalam transaction yang sama.
   */
  async postSalesJournal(
    tx: TransactionExecutor,
    userId: string,
    transactionId: string,
    customerName: string | null,
    total: number,
    paidAmount: number,
    remainingAmount: number,
    totalCogs: number,
    entryDate: string,
    now: string
  ): Promise<string | null> {
    const journalId = uuid()
    const date = new Date().toISOString().split('T')[0].replace(/-/g, '')
    const suffix = Math.random().toString(36).substring(2, 8).toUpperCase()
    const journalNumber = `JRN-${date}-${suffix}`

    // Cari akun
    const accounts = await tx.query<any>(
      `SELECT id, code, name FROM chart_of_accounts WHERE user_id = ? AND code IN ('1-1000', '1-1100', '4-4000', '5-5000', '1-1200')`,
      [userId]
    )
    const accMap: Record<string, any> = {}
    for (const a of accounts) accMap[a.code] = a

    const kas = accMap['1-1000']
    const piutang = accMap['1-1100']
    const pendapatan = accMap['4-4000']
    const hpp = accMap['5-5000']
    const persediaan = accMap['1-1200']

    if (!kas || !pendapatan) return null // COA belum di-seed

    // Simpan header jurnal
    await tx.run(
      `INSERT INTO journal_entries (id, user_id, journal_number, entry_date, description, reference_type, reference_id, status, created_at, updated_at, sync_status, updated_at_local)
       VALUES (?, ?, ?, ?, ?, 'transaction', ?, 'posted', ?, ?, 'pending', ?)`,
      [journalId, userId, journalNumber, entryDate, `Penjualan ${customerName || 'eceran'}`, transactionId, now, now, now]
    )

    // Baris: Kas (debit)
    if (paidAmount > 0) {
      await tx.run(
        `INSERT INTO journal_lines (id, user_id, journal_id, account_id, account_code, account_name, debit, credit, created_at, sync_status, updated_at_local)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, 'pending', ?)`,
        [uuid(), userId, journalId, kas.id, '1-1000', 'Kas', paidAmount, now, now]
      )
    }

    // Baris: Piutang (debit)
    if (remainingAmount > 0) {
      await tx.run(
        `INSERT INTO journal_lines (id, user_id, journal_id, account_id, account_code, account_name, debit, credit, created_at, sync_status, updated_at_local)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, 'pending', ?)`,
        [uuid(), userId, journalId, piutang?.id, '1-1100', 'Piutang Usaha', remainingAmount, now, now]
      )
    }

    // Baris: Pendapatan Penjualan (kredit)
    await tx.run(
      `INSERT INTO journal_lines (id, user_id, journal_id, account_id, account_code, account_name, debit, credit, created_at, sync_status, updated_at_local)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, 'pending', ?)`,
      [uuid(), userId, journalId, pendapatan.id, '4-4000', 'Pendapatan Penjualan', total, now, now]
    )

    // Baris: HPP (debit) & Persediaan (kredit)
    if (totalCogs > 0 && hpp && persediaan) {
      await tx.run(
        `INSERT INTO journal_lines (id, user_id, journal_id, account_id, account_code, account_name, debit, credit, created_at, sync_status, updated_at_local)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, 'pending', ?)`,
        [uuid(), userId, journalId, hpp.id, '5-5000', 'Harga Pokok Penjualan (HPP)', totalCogs, now, now]
      )
      await tx.run(
        `INSERT INTO journal_lines (id, user_id, journal_id, account_id, account_code, account_name, debit, credit, created_at, sync_status, updated_at_local)
         VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, 'pending', ?)`,
        [uuid(), userId, journalId, persediaan.id, '1-1200', 'Persediaan Barang', totalCogs, now, now]
      )
    }

    return journalId
  },

  /**
   * Buat jurnal pembayaran cicilan (Piutang → Kas)
   */
  async postPaymentJournal(
    tx: TransactionExecutor,
    userId: string,
    transactionId: string,
    paymentAmount: number,
    transactionNumber: string,
    now: string
  ): Promise<string | null> {
    const journalId = uuid()
    const date = new Date().toISOString().split('T')[0].replace(/-/g, '')
    const suffix = Math.random().toString(36).substring(2, 8).toUpperCase()
    const journalNumber = `JRN-${date}-${suffix}`

    const accounts = await tx.query<any>(
      `SELECT id, code, name FROM chart_of_accounts WHERE user_id = ? AND code IN ('1-1000', '1-1100')`,
      [userId]
    )
    const accMap: Record<string, any> = {}
    for (const a of accounts) accMap[a.code] = a
    const kas = accMap['1-1000']
    const piutang = accMap['1-1100']
    if (!kas || !piutang) return null

    await tx.run(
      `INSERT INTO journal_entries (id, user_id, journal_number, entry_date, description, reference_type, reference_id, status, created_at, updated_at, sync_status, updated_at_local)
       VALUES (?, ?, ?, ?, ?, 'payment', ?, 'posted', ?, ?, 'pending', ?)`,
      [journalId, userId, journalNumber, now, `Pembayaran cicilan ${transactionNumber}`, transactionId, now, now, now]
    )

    await tx.run(
      `INSERT INTO journal_lines (id, user_id, journal_id, account_id, account_code, account_name, debit, credit, created_at, sync_status, updated_at_local)
       VALUES (?, ?, ?, ?, 'Kas', ?, ?, 0, ?, 'pending', ?)`,
      [uuid(), userId, journalId, kas.id, paymentAmount, now, now]
    )
    await tx.run(
      `INSERT INTO journal_lines (id, user_id, journal_id, account_id, account_code, account_name, debit, credit, created_at, sync_status, updated_at_local)
       VALUES (?, ?, ?, ?, 'Piutang Usaha', ?, 0, ?, ?, 'pending', ?)`,
      [uuid(), userId, journalId, piutang.id, paymentAmount, now, now]
    )

    return journalId
  },

  /**
   * Buat jurnal reversal untuk retur
   */
  async postReturnJournal(
    tx: TransactionExecutor,
    userId: string,
    returnId: string,
    transactionId: string,
    totalRefund: number,
    paidAmount: number,
    remainingAmount: number,
    totalCogsReturned: number,
    transactionNumber: string,
    now: string
  ): Promise<string | null> {
    const journalId = uuid()
    const date = new Date().toISOString().split('T')[0].replace(/-/g, '')
    const suffix = Math.random().toString(36).substring(2, 8).toUpperCase()
    const journalNumber = `JRN-${date}-${suffix}`

    const accounts = await tx.query<any>(
      `SELECT id, code, name FROM chart_of_accounts WHERE user_id = ? AND code IN ('1-1000', '1-1100', '4-4000', '5-5000', '1-1200')`,
      [userId]
    )
    const accMap: Record<string, any> = {}
    for (const a of accounts) accMap[a.code] = a
    const kas = accMap['1-1000']
    const piutang = accMap['1-1100']
    const pendapatan = accMap['4-4000']
    const hpp = accMap['5-5000']
    const persediaan = accMap['1-1200']

    if (!pendapatan) return null

    await tx.run(
      `INSERT INTO journal_entries (id, user_id, journal_number, entry_date, description, reference_type, reference_id, status, created_at, updated_at, sync_status, updated_at_local)
       VALUES (?, ?, ?, ?, ?, 'return', ?, 'posted', ?, ?, 'pending', ?)`,
      [journalId, userId, journalNumber, now, `Retur ${transactionNumber}`, returnId, now, now, now]
    )

    // Reversal Pendapatan (debit)
    await tx.run(
      `INSERT INTO journal_lines (id, user_id, journal_id, account_id, account_code, account_name, debit, credit, created_at, sync_status, updated_at_local)
       VALUES (?, ?, ?, ?, '4-4000', 'Pendapatan Penjualan', ?, 0, ?, 'pending', ?)`,
      [uuid(), userId, journalId, pendapatan.id, totalRefund, now, now]
    )

    // Kredit Kas (dari yang sudah dibayar)
    if (paidAmount > 0 && kas) {
      await tx.run(
        `INSERT INTO journal_lines (id, user_id, journal_id, account_id, account_code, account_name, debit, credit, created_at, sync_status, updated_at_local)
         VALUES (?, ?, ?, ?, '1-1000', 'Kas', 0, ?, ?, 'pending', ?)`,
        [uuid(), userId, journalId, kas.id, Math.min(totalRefund, paidAmount), now, now]
      )
    }

    // Kredit Piutang
    if (remainingAmount > 0 && piutang) {
      await tx.run(
        `INSERT INTO journal_lines (id, user_id, journal_id, account_id, account_code, account_name, debit, credit, created_at, sync_status, updated_at_local)
         VALUES (?, ?, ?, ?, '1-1100', 'Piutang Usaha', 0, ?, ?, 'pending', ?)`,
        [uuid(), userId, journalId, piutang.id, Math.min(totalRefund, remainingAmount), now, now]
      )
    }

    // Reversal HPP & Persediaan
    if (totalCogsReturned > 0 && hpp && persediaan) {
      await tx.run(
        `INSERT INTO journal_lines (id, user_id, journal_id, account_id, account_code, account_name, debit, credit, created_at, sync_status, updated_at_local)
         VALUES (?, ?, ?, ?, '1-1200', 'Persediaan Barang', ?, 0, ?, 'pending', ?)`,
        [uuid(), userId, journalId, persediaan.id, totalCogsReturned, now, now]
      )
      await tx.run(
        `INSERT INTO journal_lines (id, user_id, journal_id, account_id, account_code, account_name, debit, credit, created_at, sync_status, updated_at_local)
         VALUES (?, ?, ?, ?, '5-5000', 'Harga Pokok Penjualan (HPP)', 0, ?, ?, 'pending', ?)`,
        [uuid(), userId, journalId, hpp.id, totalCogsReturned, now, now]
      )
    }

    return journalId
  },

  /**
   * Buat jurnal reversal untuk void transaksi
   */
  async postVoidJournal(
    tx: TransactionExecutor,
    userId: string,
    transactionId: string,
    transactionNumber: string,
    total: number,
    paidAmount: number,
    remainingAmount: number,
    totalCogs: number,
    now: string
  ): Promise<string | null> {
    const journalId = uuid()
    const date = new Date().toISOString().split('T')[0].replace(/-/g, '')
    const suffix = Math.random().toString(36).substring(2, 8).toUpperCase()
    const journalNumber = `JRN-${date}-${suffix}`

    const accounts = await tx.query<any>(
      `SELECT id, code, name FROM chart_of_accounts WHERE user_id = ? AND code IN ('1-1000', '1-1100', '4-4000', '5-5000', '1-1200')`,
      [userId]
    )
    const accMap: Record<string, any> = {}
    for (const a of accounts) accMap[a.code] = a
    const kas = accMap['1-1000']
    const piutang = accMap['1-1100']
    const pendapatan = accMap['4-4000']
    const hpp = accMap['5-5000']
    const persediaan = accMap['1-1200']

    if (!pendapatan) return null

    await tx.run(
      `INSERT INTO journal_entries (id, user_id, journal_number, entry_date, description, reference_type, reference_id, status, created_at, updated_at, sync_status, updated_at_local)
       VALUES (?, ?, ?, ?, ?, 'void', ?, 'posted', ?, ?, 'pending', ?)`,
      [journalId, userId, journalNumber, now, `Pembatalan ${transactionNumber}`, transactionId, now, now, now]
    )

    // Reversal Pendapatan (debit)
    await tx.run(
      `INSERT INTO journal_lines (id, user_id, journal_id, account_id, account_code, account_name, debit, credit, created_at, sync_status, updated_at_local)
       VALUES (?, ?, ?, ?, '4-4000', 'Pendapatan Penjualan', ?, 0, ?, 'pending', ?)`,
      [uuid(), userId, journalId, pendapatan.id, total, now, now]
    )

    // Kredit Kas (jika ada pembayaran)
    if (paidAmount > 0 && kas) {
      await tx.run(
        `INSERT INTO journal_lines (id, user_id, journal_id, account_id, account_code, account_name, debit, credit, created_at, sync_status, updated_at_local)
         VALUES (?, ?, ?, ?, '1-1000', 'Kas', 0, ?, ?, 'pending', ?)`,
        [uuid(), userId, journalId, kas.id, paidAmount, now, now]
      )
    }

    // Kredit Piutang (jika ada)
    if (remainingAmount > 0 && piutang) {
      await tx.run(
        `INSERT INTO journal_lines (id, user_id, journal_id, account_id, account_code, account_name, debit, credit, created_at, sync_status, updated_at_local)
         VALUES (?, ?, ?, ?, '1-1100', 'Piutang Usaha', 0, ?, ?, 'pending', ?)`,
        [uuid(), userId, journalId, piutang.id, remainingAmount, now, now]
      )
    }

    // Reversal HPP & Persediaan
    if (totalCogs > 0 && hpp && persediaan) {
      await tx.run(
        `INSERT INTO journal_lines (id, user_id, journal_id, account_id, account_code, account_name, debit, credit, created_at, sync_status, updated_at_local)
         VALUES (?, ?, ?, ?, '1-1200', 'Persediaan Barang', ?, 0, ?, 'pending', ?)`,
        [uuid(), userId, journalId, persediaan.id, totalCogs, now, now]
      )
      await tx.run(
        `INSERT INTO journal_lines (id, user_id, journal_id, account_id, account_code, account_name, debit, credit, created_at, sync_status, updated_at_local)
         VALUES (?, ?, ?, ?, '5-5000', 'Harga Pokok Penjualan (HPP)', 0, ?, ?, 'pending', ?)`,
        [uuid(), userId, journalId, hpp.id, totalCogs, now, now]
      )
    }

    return journalId
  },

  /**
   * Void jurnal yang terkait dengan transaksi (void transaction)
   */
  async voidJournalByReference(tx: TransactionExecutor, userId: string, referenceType: string, referenceId: string, now: string): Promise<void> {
    await tx.run(
      `UPDATE journal_entries SET status = 'void', updated_at = ?, sync_status = 'pending', updated_at_local = ?
       WHERE reference_type = ? AND reference_id = ? AND user_id = ?`,
      [now, now, referenceType, referenceId, userId]
    )
  },

  // ============================================================
  // Sync helper
  // ============================================================

  async replaceAllAccounts(records: Account[]): Promise<void> {
    const userId = getCurrentUserId()
    await run('DELETE FROM chart_of_accounts WHERE user_id = ?', [userId])
    const now = nowIso()
    for (const a of records) {
      await run(
        `INSERT OR REPLACE INTO chart_of_accounts (id, user_id, code, name, type, normal_balance, is_active, is_system, parent_id, created_at, updated_at, sync_status, updated_at_local)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?)`,
        [a.id, a.user_id || userId, a.code, a.name, a.type, a.normal_balance,
         a.is_active ? 1 : 0, a.is_system ? 1 : 0, a.parent_id || null,
         a.created_at, a.updated_at, a.updated_at || now]
      )
    }
  },

  async replaceAllJournals(entries: Array<JournalEntry & { lines?: JournalLine[] }>): Promise<void> {
    const userId = getCurrentUserId()
    await run('DELETE FROM journal_entries WHERE user_id = ?', [userId])
    const now = nowIso()
    for (const e of entries) {
      await run(
        `INSERT OR REPLACE INTO journal_entries (id, user_id, journal_number, entry_date, description, reference_type, reference_id, status, created_at, updated_at, sync_status, updated_at_local)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?)`,
        [e.id, e.user_id || userId, e.journal_number, e.entry_date, e.description,
         e.reference_type || null, e.reference_id || null, e.status,
         e.created_at, e.updated_at, e.updated_at || now]
      )
      for (const l of e.lines || []) {
        await run(
          `INSERT OR REPLACE INTO journal_lines (id, user_id, journal_id, account_id, account_code, account_name, debit, credit, created_at, sync_status, updated_at_local)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?)`,
          [l.id, l.user_id || userId, e.id, l.account_id, l.account_code, l.account_name,
           l.debit, l.credit, l.created_at, l.created_at || now]
        )
      }
    }
  },

  // ============================================================
  // Internal helpers
  // ============================================================

  mapAccount(r: any): Account {
    return {
      id: r.id,
      user_id: r.user_id,
      code: r.code,
      name: r.name,
      type: r.type,
      normal_balance: r.normal_balance,
      is_active: !!r.is_active,
      is_system: !!r.is_system,
      parent_id: r.parent_id ?? undefined,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }
  },

  mapJournalEntry(r: any): JournalEntry {
    return {
      id: r.id,
      user_id: r.user_id,
      journal_number: r.journal_number,
      entry_date: r.entry_date,
      description: r.description,
      reference_type: r.reference_type ?? undefined,
      reference_id: r.reference_id ?? undefined,
      status: r.status,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }
  },

  mapJournalLine(r: any): JournalLine {
    return {
      id: r.id,
      user_id: r.user_id,
      journal_id: r.journal_id,
      account_id: r.account_id,
      account_code: r.account_code,
      account_name: r.account_name,
      debit: r.debit,
      credit: r.credit,
      created_at: r.created_at,
    }
  },
}