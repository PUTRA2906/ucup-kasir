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
  TrialBalanceWorksheet,
  FinancialStatements,
} from '@/types/database'
import { buildFinancialStatements } from '@/lib/financialStatements'

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
  { code: '2-2100', name: 'Hutang Gaji', type: 'kewajiban', normal_balance: 'kredit', is_active: true, is_system: true },
  { code: '3-3000', name: 'Modal Pemilik', type: 'ekuitas', normal_balance: 'kredit', is_active: true, is_system: true },
  { code: '3-3100', name: 'Laba Piutang', type: 'ekuitas', normal_balance: 'kredit', is_active: true, is_system: true },
  { code: '3-3200', name: 'Laba Direalisasi', type: 'ekuitas', normal_balance: 'kredit', is_active: true, is_system: true },
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

// Helper: Round ke 2 desimal untuk mencegah floating point error
function round2(value: number): number {
  return Math.round(value * 100) / 100
}

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
    return this.createJournalInternal(input, 'manual')
  },

  /**
   * Posting jurnal penyesuaian (AJP).
   * Sama seperti jurnal umum, tetapi reference_type='adjusting'
   * agar terpisah di kertas kerja Neraca Saldo & Penyesuaian.
   */
  async postAdjustingJournal(input: JournalInput): Promise<string> {
    return this.createJournalInternal(input, 'adjusting')
  },

  /** Internal: buat jurnal dengan reference_type tertentu. */
  async createJournalInternal(
    input: JournalInput,
    referenceType: 'manual' | 'adjusting'
  ): Promise<string> {
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

      // Periode yang sudah ditutup tidak boleh menerima jurnal baru
      const closedRows = await tx.query<any>(
        `SELECT id FROM closing_periods
         WHERE user_id = ? AND status = 'closed' AND ? >= period_start AND ? <= period_end`,
        [userId, input.entry_date, input.entry_date]
      )
      if (closedRows.length > 0) {
        throw new Error(
          `Periode ${input.entry_date} sudah ditutup. Buka kembali periode tersebut sebelum mencatat jurnal.`
        )
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

      // Buat entry_date dengan waktu sekarang (bukan midnight)
      // Format: "YYYY-MM-DD HH:MM:SS" agar jurnal manual muncul paling atas
      const entryDateTime = `${input.entry_date} ${new Date().toTimeString().slice(0, 8)}`

      // Simpan header
      await tx.run(
        `INSERT INTO journal_entries (id, user_id, journal_number, entry_date, description, reference_type, status, created_at, updated_at, sync_status, updated_at_local)
         VALUES (?, ?, ?, ?, ?, ?, 'posted', ?, ?, 'pending', ?)`,
        [journalId, userId, journalNumber, entryDateTime, input.description, referenceType, now, now, now]
      )

      // Simpan baris
      for (const line of input.lines) {
        const lineId = uuid()
        const account = await tx.query<any>(
          `SELECT code, name FROM chart_of_accounts WHERE id = ? AND user_id = ?`,
          [line.account_id, userId]
        )
        const acc = account[0]
        
        // Round debit/credit ke 2 desimal untuk mencegah floating point error
        const debit = Math.round(Number(line.debit || 0) * 100) / 100
        const credit = Math.round(Number(line.credit || 0) * 100) / 100
        
        await tx.run(
          `INSERT INTO journal_lines (id, user_id, journal_id, account_id, account_code, account_name, debit, credit, created_at, sync_status, updated_at_local)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
          [lineId, userId, journalId, line.account_id, acc.code, acc.name,
           debit, credit, now, now]
        )
      }
    }).then(async () => {
      const entry = await this.getJournal(journalId)
      if (entry) {
        await addToSyncQueue('INSERT', 'journal_entries', journalId, entry)
      }
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

    // Jurnal di periode tertutup tidak boleh dihapus (mirror trigger Supabase)
    const existing = await queryOne<any>(
      `SELECT entry_date FROM journal_entries WHERE id = ? AND user_id = ?`,
      [id, userId]
    )
    if (!existing) return

    const date = String(existing.entry_date || '').slice(0, 10)
    const closed = await queryOne<any>(
      `SELECT id FROM closing_periods
       WHERE user_id = ? AND status = 'closed' AND ? >= period_start AND ? <= period_end`,
      [userId, date, date]
    )
    if (closed) {
      throw new Error(`Tidak dapat menghapus jurnal di periode yang sudah ditutup (${date}).`)
    }

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

  /**
   * Kertas kerja Neraca Saldo & Penyesuaian.
   * - Sebelum penyesuaian: jurnal posted s/d periodEnd, tanpa AJP dalam periode.
   * - Penyesuaian: AJP (reference_type='adjusting') dalam periode.
   * - Setelah penyesuaian: penjumlahan keduanya.
   */
  async getTrialBalanceWorksheet(
    periodStart?: string,
    periodEnd?: string
  ): Promise<TrialBalanceWorksheet> {
    const userId = getCurrentUserId()
    const accounts = await this.getAccounts()

    let sql = `SELECT jl.account_id, jl.debit, jl.credit,
                      je.id as journal_id, je.journal_number, je.entry_date,
                      je.description, je.reference_type
               FROM journal_lines jl
               INNER JOIN journal_entries je ON je.id = jl.journal_id
               WHERE jl.user_id = ? AND je.status = 'posted'`
    const params: any[] = [userId]

    if (periodEnd) {
      sql += ` AND je.entry_date <= ?`
      params.push(periodEnd + 'T23:59:59.999')
    }

    sql += ` ORDER BY je.entry_date ASC`

    const lines = await query<any>(sql, params)

    const startMs = periodStart ? new Date(periodStart + 'T00:00:00').getTime() : -Infinity
    const endMs = periodEnd ? new Date(periodEnd + 'T23:59:59.999').getTime() : Infinity

    type Acc = { unadjDebit: number; unadjCredit: number; adjDebit: number; adjCredit: number }
    const raw = new Map<string, Acc>()
    const getAcc = (id: string) => {
      let v = raw.get(id)
      if (!v) {
        v = { unadjDebit: 0, unadjCredit: 0, adjDebit: 0, adjCredit: 0 }
        raw.set(id, v)
      }
      return v
    }

    const adjustmentJournals = new Map<string, JournalEntry>()

    for (const l of lines) {
      const debit = Number(l.debit || 0)
      const credit = Number(l.credit || 0)
      const t = new Date(l.entry_date).getTime()
      const isAdjustmentInPeriod =
        l.reference_type === 'adjusting' && t >= startMs && t <= endMs

      const acc = getAcc(l.account_id)
      if (isAdjustmentInPeriod) {
        acc.adjDebit += debit
        acc.adjCredit += credit

        let journal = adjustmentJournals.get(l.journal_id)
        if (!journal) {
          journal = {
            id: l.journal_id,
            journal_number: l.journal_number,
            entry_date: l.entry_date,
            description: l.description,
            reference_type: 'adjusting',
            status: 'posted',
            created_at: '',
            updated_at: '',
            lines: [],
          }
          adjustmentJournals.set(l.journal_id, journal)
        }
        journal.lines!.push({
          id: '',
          journal_id: l.journal_id,
          account_id: l.account_id,
          account_code: '',
          account_name: '',
          debit,
          credit,
          created_at: '',
        })
      } else {
        acc.unadjDebit += debit
        acc.unadjCredit += credit
      }
    }

    // Lengkapi detail baris AJP dengan nama/kode akun.
    const accountById = new Map(accounts.map((a) => [a.id, a]))
    for (const journal of adjustmentJournals.values()) {
      for (const line of journal.lines || []) {
        const acc = accountById.get(line.account_id)
        if (acc) {
          line.account_code = acc.code
          line.account_name = acc.name
        }
      }
    }

    const rows = accounts
      .filter((acc) => acc.is_active)
      .map((acc) => {
        const v = raw.get(acc.id) || {
          unadjDebit: 0,
          unadjCredit: 0,
          adjDebit: 0,
          adjCredit: 0,
        }
        const unadjNet = v.unadjDebit - v.unadjCredit
        const adjNet = v.adjDebit - v.adjCredit
        const adjustedNet = unadjNet + adjNet

        return {
          account_id: acc.id,
          account_code: acc.code,
          account_name: acc.name,
          account_type: acc.type,
          normal_balance: acc.normal_balance,
          unadjusted_debit: unadjNet > 0 ? unadjNet : 0,
          unadjusted_credit: unadjNet < 0 ? Math.abs(unadjNet) : 0,
          adjustment_debit: adjNet > 0 ? adjNet : 0,
          adjustment_credit: adjNet < 0 ? Math.abs(adjNet) : 0,
          adjusted_debit: adjustedNet > 0 ? adjustedNet : 0,
          adjusted_credit: adjustedNet < 0 ? Math.abs(adjustedNet) : 0,
        }
      })
      .filter(
        (r) =>
          r.unadjusted_debit !== 0 ||
          r.unadjusted_credit !== 0 ||
          r.adjustment_debit !== 0 ||
          r.adjustment_credit !== 0 ||
          r.adjusted_debit !== 0 ||
          r.adjusted_credit !== 0
      )

    const totals = rows.reduce(
      (t, r) => ({
        unadjusted_debit: t.unadjusted_debit + r.unadjusted_debit,
        unadjusted_credit: t.unadjusted_credit + r.unadjusted_credit,
        adjustment_debit: t.adjustment_debit + r.adjustment_debit,
        adjustment_credit: t.adjustment_credit + r.adjustment_credit,
        adjusted_debit: t.adjusted_debit + r.adjusted_debit,
        adjusted_credit: t.adjusted_credit + r.adjusted_credit,
      }),
      {
        unadjusted_debit: 0,
        unadjusted_credit: 0,
        adjustment_debit: 0,
        adjustment_credit: 0,
        adjusted_debit: 0,
        adjusted_credit: 0,
      }
    )

    return {
      rows,
      adjustments: Array.from(adjustmentJournals.values()).sort((a, b) =>
        a.entry_date < b.entry_date ? 1 : -1
      ),
      period_start: periodStart,
      period_end: periodEnd,
      totals,
    }
  },

  /** Jurnal penyesuaian dalam rentang tanggal (dengan baris akun). */
  async getAdjustingJournals(
    startDate?: string,
    endDate?: string
  ): Promise<JournalEntry[]> {
    const userId = getCurrentUserId()

    let sql = `SELECT * FROM journal_entries
               WHERE user_id = ? AND reference_type = 'adjusting' AND status = 'posted'`
    const params: any[] = [userId]

    if (startDate) {
      sql += ` AND entry_date >= ?`
      params.push(startDate + 'T00:00:00.000')
    }
    if (endDate) {
      sql += ` AND entry_date <= ?`
      params.push(endDate + 'T23:59:59.999')
    }

    sql += ` ORDER BY entry_date DESC`

    const rows = await query<any>(sql, params)
    const entries = rows.map(this.mapJournalEntry)
    for (const entry of entries) {
      entry.lines = await this.getLines(entry.id)
    }
    return entries
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
    now: string,
    paymentMethod?: string
  ): Promise<string | null> {
    const journalId = uuid()
    const date = new Date().toISOString().split('T')[0].replace(/-/g, '')
    const suffix = Math.random().toString(36).substring(2, 8).toUpperCase()
    const journalNumber = `JRN-${date}-${suffix}`

    // Cari akun (termasuk Bank untuk pembayaran transfer/QRIS)
    const accounts = await tx.query<any>(
      `SELECT id, code, name FROM chart_of_accounts WHERE user_id = ? AND code IN ('1-1000', '1-1010', '1-1100', '4-4000', '5-5000', '1-1200')`,
      [userId]
    )
    const accMap: Record<string, any> = {}
    for (const a of accounts) accMap[a.code] = a

    const kas = accMap['1-1000']
    const bank = accMap['1-1010']
    const piutang = accMap['1-1100']
    const pendapatan = accMap['4-4000']
    const hpp = accMap['5-5000']
    const persediaan = accMap['1-1200']

    // Tentukan akun penerimaan berdasarkan payment_method
    const isTransferOrQRIS = paymentMethod === 'transfer' || paymentMethod === 'qris'
    const receivingAccount = isTransferOrQRIS ? bank : kas
    const receivingAccountCode = isTransferOrQRIS ? '1-1010' : '1-1000'
    const receivingAccountName = isTransferOrQRIS ? 'Bank' : 'Kas'

    // Validasi: akun yang dibutuhkan harus ada
    if (!kas || !pendapatan) {
      throw new Error('Akun Kas atau Pendapatan Penjualan tidak ditemukan. Seed COA terlebih dahulu.')
    }
    if (isTransferOrQRIS && !bank) {
      throw new Error('Akun Bank tidak ditemukan untuk pembayaran transfer/QRIS. Seed COA terlebih dahulu.')
    }
    if (remainingAmount > 0 && !piutang) {
      throw new Error('Akun Piutang Usaha tidak ditemukan untuk transaksi kredit. Seed COA terlebih dahulu.')
    }
    if (totalCogs > 0 && (!hpp || !persediaan)) {
      throw new Error('Akun HPP atau Persediaan tidak ditemukan. Seed COA terlebih dahulu.')
    }

    // Simpan header jurnal
    await tx.run(
      `INSERT INTO journal_entries (id, user_id, journal_number, entry_date, description, reference_type, reference_id, status, created_at, updated_at, sync_status, updated_at_local)
       VALUES (?, ?, ?, ?, ?, 'transaction', ?, 'posted', ?, ?, 'pending', ?)`,
      [journalId, userId, journalNumber, entryDate, `Penjualan ${customerName || 'eceran'}`, transactionId, now, now, now]
    )

    // Baris: Kas/Bank (debit) - tergantung payment_method
    if (paidAmount > 0 && receivingAccount) {
      await tx.run(
        `INSERT INTO journal_lines (id, user_id, journal_id, account_id, account_code, account_name, debit, credit, created_at, sync_status, updated_at_local)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, 'pending', ?)`,
        [uuid(), userId, journalId, receivingAccount.id, receivingAccountCode, receivingAccountName, round2(paidAmount), now, now]
      )
    }

    // Baris: Piutang (debit)
    if (remainingAmount > 0 && piutang) {
      await tx.run(
        `INSERT INTO journal_lines (id, user_id, journal_id, account_id, account_code, account_name, debit, credit, created_at, sync_status, updated_at_local)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, 'pending', ?)`,
        [uuid(), userId, journalId, piutang.id, '1-1100', 'Piutang Usaha', round2(remainingAmount), now, now]
      )
    }

    // Baris: Pendapatan Penjualan (kredit)
    await tx.run(
      `INSERT INTO journal_lines (id, user_id, journal_id, account_id, account_code, account_name, debit, credit, created_at, sync_status, updated_at_local)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, 'pending', ?)`,
      [uuid(), userId, journalId, pendapatan.id, '4-4000', 'Pendapatan Penjualan', round2(total), now, now]
    )

    // Baris: HPP (debit) & Persediaan (kredit)
    if (totalCogs > 0 && hpp && persediaan) {
      await tx.run(
        `INSERT INTO journal_lines (id, user_id, journal_id, account_id, account_code, account_name, debit, credit, created_at, sync_status, updated_at_local)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, 'pending', ?)`,
        [uuid(), userId, journalId, hpp.id, '5-5000', 'Harga Pokok Penjualan (HPP)', round2(totalCogs), now, now]
      )
      await tx.run(
        `INSERT INTO journal_lines (id, user_id, journal_id, account_id, account_code, account_name, debit, credit, created_at, sync_status, updated_at_local)
         VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, 'pending', ?)`,
        [uuid(), userId, journalId, persediaan.id, '1-1200', 'Persediaan Barang', round2(totalCogs), now, now]
      )
    }

    return journalId
  },

  /**
   * Buat jurnal pembayaran cicilan (Piutang → Kas/Bank)
   */
  async postPaymentJournal(
    tx: TransactionExecutor,
    userId: string,
    transactionId: string,
    paymentAmount: number,
    transactionNumber: string,
    now: string,
    paymentMethod?: string
  ): Promise<string | null> {
    const journalId = uuid()
    const date = new Date().toISOString().split('T')[0].replace(/-/g, '')
    const suffix = Math.random().toString(36).substring(2, 8).toUpperCase()
    const journalNumber = `JRN-${date}-${suffix}`

    // Cari akun (termasuk Bank untuk pembayaran transfer/QRIS)
    const accounts = await tx.query<any>(
      `SELECT id, code, name FROM chart_of_accounts WHERE user_id = ? AND code IN ('1-1000', '1-1010', '1-1100')`,
      [userId]
    )
    const accMap: Record<string, any> = {}
    for (const a of accounts) accMap[a.code] = a
    const kas = accMap['1-1000']
    const bank = accMap['1-1010']
    const piutang = accMap['1-1100']
    
    // Tentukan akun penerimaan berdasarkan payment_method
    const isTransferOrQRIS = paymentMethod === 'transfer' || paymentMethod === 'qris'
    const receivingAccount = isTransferOrQRIS ? bank : kas
    const receivingAccountCode = isTransferOrQRIS ? '1-1010' : '1-1000'
    const receivingAccountName = isTransferOrQRIS ? 'Bank' : 'Kas'
    
    // Validasi: akun Kas dan Piutang harus ada
    if (!kas || !piutang) {
      throw new Error('Akun Kas atau Piutang Usaha tidak ditemukan. Seed COA terlebih dahulu.')
    }
    if (isTransferOrQRIS && !bank) {
      throw new Error('Akun Bank tidak ditemukan untuk pembayaran transfer/QRIS. Seed COA terlebih dahulu.')
    }
    if (!receivingAccount) {
      throw new Error(`Akun penerimaan (${receivingAccountName}) tidak ditemukan. Seed COA terlebih dahulu.`)
    }

    await tx.run(
      `INSERT INTO journal_entries (id, user_id, journal_number, entry_date, description, reference_type, reference_id, status, created_at, updated_at, sync_status, updated_at_local)
       VALUES (?, ?, ?, ?, ?, 'payment', ?, 'posted', ?, ?, 'pending', ?)`,
      [journalId, userId, journalNumber, now, `Pembayaran cicilan ${transactionNumber}`, transactionId, now, now, now]
    )

    await tx.run(
      `INSERT INTO journal_lines (id, user_id, journal_id, account_id, account_code, account_name, debit, credit, created_at, sync_status, updated_at_local)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, 'pending', ?)`,
      [uuid(), userId, journalId, receivingAccount.id, receivingAccountCode, receivingAccountName, round2(paymentAmount), now, now]
    )
    await tx.run(
      `INSERT INTO journal_lines (id, user_id, journal_id, account_id, account_code, account_name, debit, credit, created_at, sync_status, updated_at_local)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, 'pending', ?)`,
      [uuid(), userId, journalId, piutang.id, '1-1100', 'Piutang Usaha', round2(paymentAmount), now, now]
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

    // Validasi: akun yang dibutuhkan harus ada
    if (!pendapatan) {
      throw new Error('Akun Pendapatan Penjualan tidak ditemukan. Seed COA terlebih dahulu.')
    }
    if (paidAmount > 0 && !kas) {
      throw new Error('Akun Kas tidak ditemukan untuk reversal pembayaran. Seed COA terlebih dahulu.')
    }
    if (remainingAmount > 0 && !piutang) {
      throw new Error('Akun Piutang Usaha tidak ditemukan untuk reversal kredit. Seed COA terlebih dahulu.')
    }
    if (totalCogsReturned > 0 && (!hpp || !persediaan)) {
      throw new Error('Akun HPP atau Persediaan tidak ditemukan untuk reversal stok. Seed COA terlebih dahulu.')
    }

    await tx.run(
      `INSERT INTO journal_entries (id, user_id, journal_number, entry_date, description, reference_type, reference_id, status, created_at, updated_at, sync_status, updated_at_local)
       VALUES (?, ?, ?, ?, ?, 'return', ?, 'posted', ?, ?, 'pending', ?)`,
      [journalId, userId, journalNumber, now, `Retur ${transactionNumber}`, returnId, now, now, now]
    )

    // Reversal Pendapatan (debit)
    await tx.run(
      `INSERT INTO journal_lines (id, user_id, journal_id, account_id, account_code, account_name, debit, credit, created_at, sync_status, updated_at_local)
       VALUES (?, ?, ?, ?, '4-4000', 'Pendapatan Penjualan', ?, 0, ?, 'pending', ?)`,
      [uuid(), userId, journalId, pendapatan.id, round2(totalRefund), now, now]
    )

    // Bagi refund: porsi piutang diserap dulu (konsisten dengan update
    // remaining_amount = MAX(total - refund - paid, 0) di returns.ts),
    // sisanya baru porsi kas yang benar-benar dikembalikan tunai
    const refundFromAr = round2(Math.min(totalRefund, remainingAmount))
    const refundFromCash = round2(totalRefund - refundFromAr)

    // Kredit Kas (dari yang sudah dibayar)
    if (refundFromCash > 0 && kas) {
      await tx.run(
        `INSERT INTO journal_lines (id, user_id, journal_id, account_id, account_code, account_name, debit, credit, created_at, sync_status, updated_at_local)
         VALUES (?, ?, ?, ?, '1-1000', 'Kas', 0, ?, ?, 'pending', ?)`,
        [uuid(), userId, journalId, kas.id, refundFromCash, now, now]
      )
    }

    // Kredit Piutang (sisa refund)
    if (refundFromAr > 0 && piutang) {
      await tx.run(
        `INSERT INTO journal_lines (id, user_id, journal_id, account_id, account_code, account_name, debit, credit, created_at, sync_status, updated_at_local)
         VALUES (?, ?, ?, ?, '1-1100', 'Piutang Usaha', 0, ?, ?, 'pending', ?)`,
        [uuid(), userId, journalId, piutang.id, refundFromAr, now, now]
      )
    }

    // Reversal HPP & Persediaan
    if (totalCogsReturned > 0 && hpp && persediaan) {
      await tx.run(
        `INSERT INTO journal_lines (id, user_id, journal_id, account_id, account_code, account_name, debit, credit, created_at, sync_status, updated_at_local)
         VALUES (?, ?, ?, ?, '1-1200', 'Persediaan Barang', ?, 0, ?, 'pending', ?)`,
        [uuid(), userId, journalId, persediaan.id, round2(totalCogsReturned), now, now]
      )
      await tx.run(
        `INSERT INTO journal_lines (id, user_id, journal_id, account_id, account_code, account_name, debit, credit, created_at, sync_status, updated_at_local)
         VALUES (?, ?, ?, ?, '5-5000', 'Harga Pokok Penjualan (HPP)', 0, ?, ?, 'pending', ?)`,
        [uuid(), userId, journalId, hpp.id, round2(totalCogsReturned), now, now]
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

    // Validasi: akun yang dibutuhkan harus ada
    if (!pendapatan) {
      throw new Error('Akun Pendapatan Penjualan tidak ditemukan. Seed COA terlebih dahulu.')
    }
    if (paidAmount > 0 && !kas) {
      throw new Error('Akun Kas tidak ditemukan untuk reversal pembayaran. Seed COA terlebih dahulu.')
    }
    if (remainingAmount > 0 && !piutang) {
      throw new Error('Akun Piutang Usaha tidak ditemukan untuk reversal kredit. Seed COA terlebih dahulu.')
    }
    if (totalCogs > 0 && (!hpp || !persediaan)) {
      throw new Error('Akun HPP atau Persediaan tidak ditemukan untuk reversal stok. Seed COA terlebih dahulu.')
    }

    await tx.run(
      `INSERT INTO journal_entries (id, user_id, journal_number, entry_date, description, reference_type, reference_id, status, created_at, updated_at, sync_status, updated_at_local)
       VALUES (?, ?, ?, ?, ?, 'void', ?, 'posted', ?, ?, 'pending', ?)`,
      [journalId, userId, journalNumber, now, `Pembatalan ${transactionNumber}`, transactionId, now, now, now]
    )

    // Reversal Pendapatan (debit)
    await tx.run(
      `INSERT INTO journal_lines (id, user_id, journal_id, account_id, account_code, account_name, debit, credit, created_at, sync_status, updated_at_local)
       VALUES (?, ?, ?, ?, '4-4000', 'Pendapatan Penjualan', ?, 0, ?, 'pending', ?)`,
      [uuid(), userId, journalId, pendapatan.id, round2(total), now, now]
    )

    // Kredit Kas (jika ada pembayaran)
    if (paidAmount > 0 && kas) {
      await tx.run(
        `INSERT INTO journal_lines (id, user_id, journal_id, account_id, account_code, account_name, debit, credit, created_at, sync_status, updated_at_local)
         VALUES (?, ?, ?, ?, '1-1000', 'Kas', 0, ?, ?, 'pending', ?)`,
        [uuid(), userId, journalId, kas.id, round2(paidAmount), now, now]
      )
    }

    // Kredit Piutang (jika ada)
    if (remainingAmount > 0 && piutang) {
      await tx.run(
        `INSERT INTO journal_lines (id, user_id, journal_id, account_id, account_code, account_name, debit, credit, created_at, sync_status, updated_at_local)
         VALUES (?, ?, ?, ?, '1-1100', 'Piutang Usaha', 0, ?, ?, 'pending', ?)`,
        [uuid(), userId, journalId, piutang.id, round2(remainingAmount), now, now]
      )
    }

    // Reversal HPP & Persediaan
    if (totalCogs > 0 && hpp && persediaan) {
      await tx.run(
        `INSERT INTO journal_lines (id, user_id, journal_id, account_id, account_code, account_name, debit, credit, created_at, sync_status, updated_at_local)
         VALUES (?, ?, ?, ?, '1-1200', 'Persediaan Barang', ?, 0, ?, 'pending', ?)`,
        [uuid(), userId, journalId, persediaan.id, round2(totalCogs), now, now]
      )
      await tx.run(
        `INSERT INTO journal_lines (id, user_id, journal_id, account_id, account_code, account_name, debit, credit, created_at, sync_status, updated_at_local)
         VALUES (?, ?, ?, ?, '5-5000', 'Harga Pokok Penjualan (HPP)', 0, ?, ?, 'pending', ?)`,
        [uuid(), userId, journalId, hpp.id, round2(totalCogs), now, now]
      )
    }

    return journalId
  },

  /**
   * Void jurnal yang terkait dengan transaksi (void transaction)
   */
  async voidJournalByReference(tx: TransactionExecutor, userId: string, referenceType: string, referenceId: string, now: string): Promise<void> {
    // Cek apakah jurnal sudah void sebelumnya
    const existing = await tx.query<any>(
      `SELECT id, status FROM journal_entries 
       WHERE reference_type = ? AND reference_id = ? AND user_id = ?`,
      [referenceType, referenceId, userId]
    )
    
    if (existing.length > 0 && existing[0].status === 'void') {
      throw new Error('Jurnal sudah dibatalkan sebelumnya')
    }

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

  async mergeAccounts(records: Account[]): Promise<void> {
    if (records.length === 0) return
    const userId = getCurrentUserId()
    const now = nowIso()
    await transaction(async (tx) => {
      for (const a of records) {
        const existing = await tx.query<{ sync_status: string }>(
          'SELECT sync_status FROM chart_of_accounts WHERE id = ?',
          [a.id]
        )

        if (existing.length > 0 && existing[0].sync_status !== 'synced') {
          continue
        }

        await tx.run(
          `INSERT OR REPLACE INTO chart_of_accounts (id, user_id, code, name, type, normal_balance, is_active, is_system, parent_id, created_at, updated_at, sync_status, updated_at_local)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?)`,
          [a.id, a.user_id || userId, a.code, a.name, a.type, a.normal_balance,
           a.is_active ? 1 : 0, a.is_system ? 1 : 0, a.parent_id || null,
           a.created_at, a.updated_at, a.updated_at || now]
        )
      }
    })
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

  // ============================================================
  // Laba Terealisasi (Cash-Based Profit)
  // ============================================================

  /**
   * Menghitung laba terealisasi (cash-based profit) berdasarkan alokasi pembayaran per item.
   * Ini menunjukkan berapa laba yang benar-benar bisa dipakai untuk modal usaha.
   *
   * Rumus per item:
   *   Allocated Revenue = SUM(allocated_amount untuk item ini)
   *   Item HPP = price_buy × quantity
   *   Realised Profit per item = Allocated Revenue - Item HPP
   */
  async getRealisedProfit(startDate?: string, endDate?: string): Promise<{
    realisedProfit: number
    unrealisedProfit: number
    totalProfit: number
    realisedRevenue: number
    unrealisedRevenue: number
    totalRevenue: number
    totalCOGS: number
  }> {
    const userId = getCurrentUserId()

    // Ambil semua transaksi dalam periode
    let sql = `SELECT t.id, t.total, t.paid_amount, t.remaining_amount
               FROM transactions t
               WHERE t.user_id = ?`
    const params: any[] = [userId]

    if (startDate && startDate.trim() !== '') {
      sql += ` AND t.created_at >= ?`
      params.push(startDate + 'T00:00:00.000')
    }
    if (endDate && endDate.trim() !== '') {
      sql += ` AND t.created_at <= ?`
      params.push(endDate + 'T23:59:59.999')
    }

    sql += ` ORDER BY t.created_at DESC`

    const transactions = await query<any>(sql, params)

    let totalRevenue = 0
    let realisedRevenue = 0
    let unrealisedRevenue = 0
    let totalCOGS = 0
    let realisedCOGS = 0

    for (const tx of transactions) {
      const total = Number(tx.total || 0)
      const paid = Number(tx.paid_amount || 0)
      const remaining = Number(tx.remaining_amount || 0)

      totalRevenue += total
      realisedRevenue += paid
      unrealisedRevenue += remaining

      // Ambil items dengan JOIN ke products untuk dapatkan price_buy
      const items = await query<any>(
        `SELECT ti.id, ti.quantity, ti.subtotal, p.price_buy
         FROM transaction_items ti
         LEFT JOIN products p ON p.id = ti.product_id
         WHERE ti.transaction_id = ? AND ti.user_id = ?`,
        [tx.id, userId]
      )

      // Hitung per item
      for (const item of items) {
        const priceBuy = Number(item.price_buy || 0)
        const qty = Number(item.quantity || 0)
        const itemCOGS = priceBuy * qty

        totalCOGS += itemCOGS

        // Total yang sudah dibayar untuk item ini (dari transaction_item_payments)
        const allocations = await query<any>(
          `SELECT allocated_amount
           FROM transaction_item_payments
           WHERE item_id = ? AND user_id = ?`,
          [item.id, userId]
        )

        const allocatedAmount = allocations.reduce((sum: number, alloc: any) => {
          return sum + Number(alloc.allocated_amount || 0)
        }, 0)

        // Jika item ini sudah ada alokasi pembayaran, hitung HPP yang terealisasi
        if (allocatedAmount > 0) {
          // Rasio pembayaran untuk item ini
          const itemSubtotal = Number(item.subtotal || 0)
          const allocationRatio = itemSubtotal > 0 ? allocatedAmount / itemSubtotal : 0

          // HPP yang terealisasi = HPP × rasio pembayaran item
          realisedCOGS += itemCOGS * allocationRatio
        }
      }
    }

    // Laba = Pendapatan - HPP
    const totalProfit = totalRevenue - totalCOGS
    const realisedProfit = realisedRevenue - realisedCOGS
    const unrealisedProfit = totalProfit - realisedProfit

    return {
      realisedProfit,
      unrealisedProfit,
      totalProfit,
      realisedRevenue,
      unrealisedRevenue,
      totalRevenue,
      totalCOGS,
    }
  },

  /**
   * Summary laba aktual & direalisasi (mirror RPC get_profit_summary di Supabase).
   * - total_profit     = total penjualan − HPP
   * - realized_profit  = porsi yang sudah dibayar × margin (proporsional)
   */
  async getProfitSummary(startDate?: string, endDate?: string): Promise<{
    total_revenue: number
    total_cogs: number
    total_profit: number
    realized_revenue: number
    realized_cogs: number
    realized_profit: number
  }> {
    const userId = getCurrentUserId()

    let sql = `SELECT t.id, t.total, t.paid_amount
               FROM transactions t
               WHERE t.user_id = ? AND t.status NOT IN ('void', 'batal', 'dibatalkan')`
    const params: any[] = [userId]

    if (startDate && startDate.trim() !== '') {
      sql += ` AND t.created_at >= ?`
      params.push(startDate + 'T00:00:00.000')
    }
    if (endDate && endDate.trim() !== '') {
      sql += ` AND t.created_at <= ?`
      params.push(endDate + 'T23:59:59.999')
    }

    const transactions = await query<any>(sql, params)

    let totalRevenue = 0
    let totalCogs = 0
    let realizedRevenue = 0

    for (const tx of transactions) {
      const total = Number(tx.total || 0)
      const paid = Number(tx.paid_amount || 0)
      totalRevenue += total
      realizedRevenue += paid

      const cogsRow = await queryOne<any>(
        `SELECT COALESCE(SUM(ti.quantity * COALESCE(p.price_buy, 0)), 0) AS cogs
         FROM transaction_items ti
         LEFT JOIN products p ON p.id = ti.product_id
         WHERE ti.transaction_id = ? AND ti.user_id = ?`,
        [tx.id, userId]
      )
      totalCogs += Number(cogsRow?.cogs || 0)
    }

    const totalProfit = totalRevenue - totalCogs
    const realizedCogs = totalRevenue > 0 ? (realizedRevenue / totalRevenue) * totalCogs : 0
    const realizedProfit = totalRevenue > 0 ? realizedRevenue - realizedCogs : 0

    return {
      total_revenue: totalRevenue,
      total_cogs: totalCogs,
      total_profit: totalProfit,
      realized_revenue: realizedRevenue,
      realized_cogs: realizedCogs,
      realized_profit: realizedProfit,
    }
  },

  /**
   * Aktivitas pendapatan & beban periode (mirror financeService.getPeriodActivity).
   * Jurnal penutup/penyesuaian/reklasifikasi DIKECUALIKAN agar laporan
   * Laba Rugi tidak ter-nol-kan oleh jurnal penutup.
   */
  async getPeriodActivity(startDate: string, endDate: string): Promise<{
    totalPendapatan: number
    totalBeban: number
    labaBersih: number
    byAccount: Array<{
      account_id: string
      account_code: string
      account_name: string
      account_type: 'pendapatan' | 'beban'
      amount: number
    }>
  }> {
    const userId = getCurrentUserId()

    const rows = await query<any>(
      `SELECT
         coa.id AS account_id,
         coa.code AS account_code,
         coa.name AS account_name,
         coa.type AS account_type,
         COALESCE(SUM(CASE WHEN coa.type = 'pendapatan' THEN jl.credit - jl.debit
                           ELSE jl.debit - jl.credit END), 0) AS amount
       FROM journal_lines jl
       INNER JOIN journal_entries je ON je.id = jl.journal_id
       INNER JOIN chart_of_accounts coa ON coa.id = jl.account_id
       WHERE jl.user_id = ? AND je.status = 'posted'
         AND COALESCE(je.reference_type, '') NOT IN ('closing', 'adjusting', 'reclassify')
         AND je.entry_date >= ? AND je.entry_date <= ?
         AND coa.type IN ('pendapatan', 'beban')
       GROUP BY coa.id, coa.code, coa.name, coa.type
       ORDER BY coa.code`,
      [userId, startDate + 'T00:00:00.000', endDate + 'T23:59:59.999']
    )

    let totalPendapatan = 0
    let totalBeban = 0
    const byAccount = rows.map((r) => {
      const amount = Number(r.amount || 0)
      if (r.account_type === 'pendapatan') totalPendapatan += amount
      else totalBeban += amount
      return {
        account_id: r.account_id,
        account_code: r.account_code,
        account_name: r.account_name,
        account_type: r.account_type as 'pendapatan' | 'beban',
        amount,
      }
    })

    return {
      totalPendapatan,
      totalBeban,
      labaBersih: totalPendapatan - totalBeban,
      byAccount,
    }
  },

  /**
   * Hitung total pendapatan dan beban dalam periode tertentu
   * (untuk preview tutup buku). Memakai getPeriodActivity().
   */
  async getPeriodProfitLoss(startDate: string, endDate: string): Promise<{
    totalPendapatan: number
    totalBeban: number
    labaBersih: number
  }> {
    const activity = await this.getPeriodActivity(startDate, endDate)
    return {
      totalPendapatan: activity.totalPendapatan,
      totalBeban: activity.totalBeban,
      labaBersih: activity.labaBersih,
    }
  },

  // ============================================================
  // Laporan Keuangan Lengkap (mirror financeService.getFinancialStatements)
  // ============================================================

  async getFinancialStatements(
    periodStart: string,
    periodEnd: string
  ): Promise<FinancialStatements> {
    const userId = getCurrentUserId()
    const accounts = await this.getAccounts()

    const lines = await query<any>(
      `SELECT jl.account_id, jl.debit, jl.credit,
              je.entry_date, je.reference_type
       FROM journal_lines jl
       INNER JOIN journal_entries je ON je.id = jl.journal_id
       WHERE jl.user_id = ? AND je.status = 'posted'
         AND je.entry_date <= ?
       ORDER BY je.entry_date ASC`,
      [userId, periodEnd + 'T23:59:59.999']
    )

    return buildFinancialStatements({
      accounts,
      lines: lines.map((r) => ({
        account_id: r.account_id,
        debit: Number(r.debit || 0),
        credit: Number(r.credit || 0),
        entry_date: r.entry_date || '',
        reference_type: r.reference_type,
      })),
      periodStart,
      periodEnd,
    })
  },

  // ============================================================
  // Tutup Buku (Closing Period)
  // ============================================================

  async getClosingPeriods(): Promise<any[]> {
    const userId = getCurrentUserId()
    const rows = await query<any>(
      `SELECT * FROM closing_periods WHERE user_id = ? ORDER BY period_end DESC`,
      [userId]
    )

    return rows.map(r => ({
      id: r.id,
      user_id: r.user_id,
      period_start: r.period_start,
      period_end: r.period_end,
      closed_at: r.closed_at,
      closed_by: r.closed_by,
      notes: r.notes,
      status: r.status,
      snapshot_balances: r.snapshot_balances ? JSON.parse(r.snapshot_balances) : [],
      created_at: r.created_at,
      updated_at: r.updated_at,
    }))
  },

  async getClosingPeriod(id: string): Promise<any | null> {
    const userId = getCurrentUserId()
    const row = await queryOne<any>(
      `SELECT * FROM closing_periods WHERE id = ? AND user_id = ?`,
      [id, userId]
    )

    if (!row) return null

    return {
      id: row.id,
      user_id: row.user_id,
      period_start: row.period_start,
      period_end: row.period_end,
      closed_at: row.closed_at,
      closed_by: row.closed_by,
      notes: row.notes,
      status: row.status,
      snapshot_balances: row.snapshot_balances ? JSON.parse(row.snapshot_balances) : [],
      created_at: row.created_at,
      updated_at: row.updated_at,
    }
  },

  /**
   * Tutup buku satu periode. Mirror RPC close_period() Supabase:
   *   1. Jurnal penutup BALANCE: debit semua pendapatan, kredit semua beban,
   *      selisih (plug) dibagi ke Laba Direalisasi (3-3200) & Laba Piutang (3-3100).
   *   2. Rugi → debit 3-3100 sebesar |plug|.
   *   3. reference_id jurnal = id closing_periods (untuk void saat reopen).
   */
  async closePeriod(input: { period_start: string; period_end: string; notes?: string }): Promise<string> {
    const userId = getCurrentUserId()
    const closingId = uuid()
    const now = nowIso()

    if (input.period_end < input.period_start) {
      throw new Error('Tanggal akhir periode harus >= tanggal mulai.')
    }

    // 1. Validasi: Periode tidak boleh overlap dengan periode tertutup lainnya
    const overlapping = await query<any>(
      `SELECT id FROM closing_periods
       WHERE user_id = ?
         AND status = 'closed'
         AND (
           (? >= period_start AND ? <= period_end) OR
           (? >= period_start AND ? <= period_end) OR
           (? <= period_start AND ? >= period_end)
         )`,
      [userId, input.period_start, input.period_start, input.period_end, input.period_end, input.period_start, input.period_end]
    )

    if (overlapping.length > 0) {
      throw new Error('Periode ini overlap dengan periode yang sudah ditutup.')
    }

    // 2. Hitung total pendapatan & beban periode (kecualikan jurnal penutup)
    const pendapatanBeban = await queryOne<any>(
      `SELECT
         COALESCE(SUM(CASE WHEN coa.type = 'pendapatan' THEN jl.credit - jl.debit ELSE 0 END), 0) as total_pendapatan,
         COALESCE(SUM(CASE WHEN coa.type = 'beban' THEN jl.debit - jl.credit ELSE 0 END), 0) as total_beban
       FROM journal_lines jl
       INNER JOIN journal_entries je ON je.id = jl.journal_id
       INNER JOIN chart_of_accounts coa ON coa.id = jl.account_id
       WHERE je.user_id = ? AND je.status = 'posted'
         AND COALESCE(je.reference_type, '') <> 'closing'
         AND je.entry_date >= ? AND je.entry_date <= ?
         AND coa.type IN ('pendapatan', 'beban')`,
      [userId, input.period_start + 'T00:00:00.000', input.period_end + 'T23:59:59.999']
    )

    const totalPendapatan = Number(pendapatanBeban?.total_pendapatan || 0)
    const totalBeban = Number(pendapatanBeban?.total_beban || 0)
    const hasActivity = Math.abs(totalPendapatan) > 0.01 || Math.abs(totalBeban) > 0.01

    // 3. Rasio laba direalisasi (cash basis) dari transaksi
    const profitSummary = await this.getProfitSummary(input.period_start, input.period_end)
    const totalProfit = Number(profitSummary.total_profit || 0)
    const realisedProfit = Number(profitSummary.realized_profit || 0)
    let realisedRatio = 0
    if (totalProfit > 0.01) {
      realisedRatio = realisedProfit / totalProfit
      if (realisedRatio < 0) realisedRatio = 0
      if (realisedRatio > 1) realisedRatio = 1
    }

    // 4. Cari ID akun laba
    const labaPiutang = await queryOne<any>(
      `SELECT id FROM chart_of_accounts WHERE user_id = ? AND code = '3-3100' AND is_active = 1`,
      [userId]
    )
    const labaDirealisasi = await queryOne<any>(
      `SELECT id FROM chart_of_accounts WHERE user_id = ? AND code = '3-3200' AND is_active = 1`,
      [userId]
    )

    if (!labaPiutang || !labaDirealisasi) {
      throw new Error('Akun Laba Piutang/Direalisasi tidak ditemukan. Seed COA terlebih dahulu.')
    }

    // 5. Buat jurnal penutup (dalam transaction)
    let closingJournalId: string | null = null
    return transaction(async (tx) => {
      let journalId: string | null = null

      if (hasActivity) {
        journalId = uuid()
        closingJournalId = journalId
        const journalNumber = `CLOSING-${input.period_end.replace(/-/g, '')}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`

        // Insert journal entry (reference_id = id closing_periods)
        await tx.run(
          `INSERT INTO journal_entries (id, user_id, journal_number, entry_date, description, reference_type, reference_id, status, created_at, updated_at, sync_status, updated_at_local)
           VALUES (?, ?, ?, ?, ?, 'closing', ?, 'posted', ?, ?, 'pending', ?)`,
          [journalId, userId, journalNumber, input.period_end + 'T23:59:59.999',
           `Jurnal Penutup Periode ${input.period_start} s/d ${input.period_end}`,
           closingId, now, now, now]
        )

        // Tutup semua akun pendapatan (Debit)
        const pendapatanAccounts = await tx.query<any>(
          `SELECT coa.id, coa.code, coa.name, COALESCE(SUM(jl.credit - jl.debit), 0) as balance
           FROM chart_of_accounts coa
           LEFT JOIN journal_lines jl ON jl.account_id = coa.id
           LEFT JOIN journal_entries je ON je.id = jl.journal_id
           WHERE coa.user_id = ? AND coa.type = 'pendapatan' AND coa.is_active = 1
             AND je.status = 'posted'
             AND COALESCE(je.reference_type, '') <> 'closing'
             AND je.entry_date >= ? AND je.entry_date <= ?
           GROUP BY coa.id, coa.code, coa.name
           HAVING SUM(jl.credit - jl.debit) > 0`,
          [userId, input.period_start + 'T00:00:00.000', input.period_end + 'T23:59:59.999']
        )

        for (const acc of pendapatanAccounts) {
          await tx.run(
            `INSERT INTO journal_lines (id, user_id, journal_id, account_id, account_code, account_name, debit, credit, created_at, sync_status, updated_at_local)
             VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, 'pending', ?)`,
            [uuid(), userId, journalId, acc.id, acc.code, acc.name, Number(acc.balance), now, now]
          )
        }

        // Tutup semua akun beban (Kredit)
        const bebanAccounts = await tx.query<any>(
          `SELECT coa.id, coa.code, coa.name, COALESCE(SUM(jl.debit - jl.credit), 0) as balance
           FROM chart_of_accounts coa
           LEFT JOIN journal_lines jl ON jl.account_id = coa.id
           LEFT JOIN journal_entries je ON je.id = jl.journal_id
           WHERE coa.user_id = ? AND coa.type = 'beban' AND coa.is_active = 1
             AND je.status = 'posted'
             AND COALESCE(je.reference_type, '') <> 'closing'
             AND je.entry_date >= ? AND je.entry_date <= ?
           GROUP BY coa.id, coa.code, coa.name
           HAVING SUM(jl.debit - jl.credit) > 0`,
          [userId, input.period_start + 'T00:00:00.000', input.period_end + 'T23:59:59.999']
        )

        for (const acc of bebanAccounts) {
          await tx.run(
            `INSERT INTO journal_lines (id, user_id, journal_id, account_id, account_code, account_name, debit, credit, created_at, sync_status, updated_at_local)
             VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, 'pending', ?)`,
            [uuid(), userId, journalId, acc.id, acc.code, acc.name, Number(acc.balance), now, now]
          )
        }

        // Plug ekuitas = total debit − total kredit dari baris pendapatan/beban
        const plugRow = await tx.query<any>(
          `SELECT COALESCE(SUM(debit) - SUM(credit), 0) AS plug FROM journal_lines WHERE journal_id = ?`,
          [journalId]
        )
        const plug = round2(Number(plugRow[0]?.plug || 0))

        if (Math.abs(plug) > 0.01) {
          if (plug > 0) {
            // Laba: kredit 3-3200 (direalisasi) + 3-3100 (belum terealisasi)
            const realisedPart = round2(plug * realisedRatio)
            const unrealisedPart = round2(plug - realisedPart)

            if (Math.abs(realisedPart) > 0.01) {
              await tx.run(
                `INSERT INTO journal_lines (id, user_id, journal_id, account_id, account_code, account_name, debit, credit, created_at, sync_status, updated_at_local)
                 VALUES (?, ?, ?, ?, '3-3200', 'Laba Direalisasi', 0, ?, ?, 'pending', ?)`,
                [uuid(), userId, journalId, labaDirealisasi.id, realisedPart, now, now]
              )
            }
            if (Math.abs(unrealisedPart) > 0.01) {
              await tx.run(
                `INSERT INTO journal_lines (id, user_id, journal_id, account_id, account_code, account_name, debit, credit, created_at, sync_status, updated_at_local)
                 VALUES (?, ?, ?, ?, '3-3100', 'Laba Piutang', 0, ?, ?, 'pending', ?)`,
                [uuid(), userId, journalId, labaPiutang.id, unrealisedPart, now, now]
              )
            }
          } else {
            // Rugi: debit 3-3100 sebesar |plug|
            await tx.run(
              `INSERT INTO journal_lines (id, user_id, journal_id, account_id, account_code, account_name, debit, credit, created_at, sync_status, updated_at_local)
               VALUES (?, ?, ?, ?, '3-3100', 'Laba Piutang', ?, 0, ?, 'pending', ?)`,
              [uuid(), userId, journalId, labaPiutang.id, Math.abs(plug), now, now]
            )
          }
        }

        // Safety check: jurnal penutup wajib balance
        const checkRow = await tx.query<any>(
          `SELECT COALESCE(SUM(debit), 0) - COALESCE(SUM(credit), 0) AS diff FROM journal_lines WHERE journal_id = ?`,
          [journalId]
        )
        if (Math.abs(Number(checkRow[0]?.diff || 0)) > 0.01) {
          throw new Error('Jurnal penutup tidak balance — proses dibatalkan.')
        }
      }

      // 6. Snapshot saldo semua akun per tanggal penutupan (setelah jurnal)
      const snapshotRows = await tx.query<any>(
        `SELECT
           coa.id AS account_id,
           coa.code AS account_code,
           coa.name AS account_name,
           coa.type AS account_type,
           coa.normal_balance AS normal_balance,
           COALESCE(SUM(CASE WHEN coa.normal_balance = 'debit' THEN jl.debit - jl.credit
                             ELSE jl.credit - jl.debit END), 0) AS balance
         FROM chart_of_accounts coa
         LEFT JOIN journal_lines jl ON jl.account_id = coa.id
         LEFT JOIN journal_entries je ON je.id = jl.journal_id
         WHERE coa.user_id = ?
           AND coa.is_active = 1
           AND (je.id IS NULL OR (je.status = 'posted' AND je.entry_date <= ?))
         GROUP BY coa.id, coa.code, coa.name, coa.type, coa.normal_balance
         ORDER BY coa.code`,
        [userId, input.period_end + 'T23:59:59.999']
      )
      const snapshotBalances = JSON.stringify(snapshotRows.map((r) => ({
        account_id: r.account_id,
        account_code: r.account_code,
        account_name: r.account_name,
        account_type: r.account_type,
        normal_balance: r.normal_balance,
        balance: Number(r.balance || 0),
      })))

      // 7. Hapus baris 'reopened' dengan rentang sama agar bisa ditutup ulang
      await tx.run(
        `DELETE FROM closing_periods WHERE user_id = ? AND period_start = ? AND period_end = ? AND status = 'reopened'`,
        [userId, input.period_start, input.period_end]
      )

      // 8. Insert closing period
      await tx.run(
        `INSERT INTO closing_periods (id, user_id, period_start, period_end, closed_at, closed_by, notes, status, snapshot_balances, created_at, updated_at, sync_status, updated_at_local)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'closed', ?, ?, ?, 'pending', ?)`,
        [closingId, userId, input.period_start, input.period_end, now, userId, input.notes || null, snapshotBalances, now, now, now]
      )
    }).then(async () => {
      // Queue ke sync. Jurnal penutup ikut di-queue (header + baris menumpang
      // di payload 'lines' → syncEngine.queueEmbeddedChildren menaikkan
      // journal_lines setelah header berhasil).
      if (closingJournalId) {
        const journal = await this.getJournal(closingJournalId)
        if (journal) {
          await addToSyncQueue('INSERT', 'journal_entries', closingJournalId, journal)
        }
      }

      const period = await this.getClosingPeriod(closingId)
      if (period) {
        await addToSyncQueue('INSERT', 'closing_periods', closingId, period)
      }

      return closingId
    })
  },

  /**
   * Void jurnal penutup milik satu periode (internal).
   * Mencocokkan reference_id = id closing_periods; fallback ke tanggal akhir
   * periode untuk data lama yang belum menyimpan reference_id.
   */
  async voidClosingJournal(
    tx: TransactionExecutor,
    userId: string,
    closingId: string,
    periodEnd: string | null,
    now: string
  ): Promise<string[]> {
    const rows = await tx.query<any>(
      `SELECT id FROM journal_entries
       WHERE user_id = ? AND reference_type = 'closing' AND status <> 'void'
         AND (reference_id = ? OR (reference_id IS NULL AND ? IS NOT NULL AND substr(entry_date, 1, 10) = ?))`,
      [userId, closingId, periodEnd, periodEnd]
    )

    for (const row of rows) {
      await tx.run(
        `UPDATE journal_entries SET status = 'void', updated_at = ?, sync_status = 'pending', updated_at_local = ? WHERE id = ? AND user_id = ?`,
        [now, now, row.id, userId]
      )
    }

    return rows.map((r) => String(r.id))
  },

  /**
   * Buka kembali periode. Mirror RPC reopen_period():
   * status closing_periods → 'reopened' dan jurnal penutup di-void.
   */
  async reopenPeriod(closingId: string): Promise<void> {
    const userId = getCurrentUserId()
    const now = nowIso()

    // Validasi: Hanya bisa reopen milik sendiri
    const existing = await queryOne<any>(
      `SELECT id, period_end FROM closing_periods WHERE id = ? AND user_id = ?`,
      [closingId, userId]
    )

    if (!existing) {
      throw new Error('Periode tidak ditemukan atau bukan milik Anda.')
    }

    let voidedJournalIds: string[] = []
    await transaction(async (tx) => {
      voidedJournalIds = await this.voidClosingJournal(
        tx, userId, closingId, existing.period_end, now
      )

      await tx.run(
        `UPDATE closing_periods SET status = 'reopened', updated_at = ?, sync_status = 'pending', updated_at_local = ? WHERE id = ? AND user_id = ?`,
        [now, now, closingId, userId]
      )
    })

    // Queue status void jurnal penutup agar ikut tersinkron ke Supabase.
    for (const journalId of voidedJournalIds) {
      await addToSyncQueue('UPDATE', 'journal_entries', journalId, { id: journalId, status: 'void' })
    }

    await addToSyncQueue('UPDATE', 'closing_periods', closingId, { id: closingId, status: 'reopened' })
  },

  /**
   * Hapus periode tutup buku. Mirror RPC delete_closing_period():
   * void jurnal penutup lalu hapus baris closing_periods.
   */
  async deletePeriod(closingId: string): Promise<void> {
    const userId = getCurrentUserId()
    const now = nowIso()

    const existing = await queryOne<any>(
      `SELECT id, period_end FROM closing_periods WHERE id = ? AND user_id = ?`,
      [closingId, userId]
    )

    if (!existing) {
      throw new Error('Periode tidak ditemukan atau bukan milik Anda.')
    }

    let voidedJournalIds: string[] = []
    await transaction(async (tx) => {
      voidedJournalIds = await this.voidClosingJournal(
        tx, userId, closingId, existing.period_end, now
      )

      await tx.run(
        `DELETE FROM closing_periods WHERE id = ? AND user_id = ?`,
        [closingId, userId]
      )
    })

    // Queue status void jurnal penutup agar ikut tersinkron ke Supabase.
    for (const journalId of voidedJournalIds) {
      await addToSyncQueue('UPDATE', 'journal_entries', journalId, { id: journalId, status: 'void' })
    }

    await addToSyncQueue('DELETE', 'closing_periods', closingId, { id: closingId })
  },

  async checkPeriodClosed(date: string): Promise<boolean> {
    const userId = getCurrentUserId()

    const row = await queryOne<any>(
      `SELECT id FROM closing_periods
       WHERE user_id = ?
         AND status = 'closed'
         AND ? >= period_start
         AND ? <= period_end`,
      [userId, date, date]
    )

    return !!row
  },

  /**
   * Reklasifikasi laba dari Laba Piutang (3-3100) ke Laba Direalisasi (3-3200)
   * saat piutang dibayar. Dipanggil dari sqliteTransactionsService setelah add payment.
   *
   * Hanya relevan bila laba sudah diakui di 3-3100 oleh jurnal penutup
   * (periode transaksi sudah ditutup).
   */
  async reclassifyRetainedEarnings(
    tx: TransactionExecutor,
    userId: string,
    paymentAmount: number,
    transactionId: string,
    now: string
  ): Promise<string | null> {
    // Cari ID akun
    const labaPiutang = await tx.query<any>(
      `SELECT id FROM chart_of_accounts WHERE user_id = ? AND code = '3-3100' AND is_active = 1`,
      [userId]
    )
    const labaDirealisasi = await tx.query<any>(
      `SELECT id FROM chart_of_accounts WHERE user_id = ? AND code = '3-3200' AND is_active = 1`,
      [userId]
    )

    if (labaPiutang.length === 0 || labaDirealisasi.length === 0) {
      // Akun belum ada, skip (mungkin belum tutup buku pertama kali)
      return null
    }

    const labaPiutangId = labaPiutang[0].id
    const labaDirealisasiId = labaDirealisasi[0].id

    // Hanya reklasifikasi jika periode transaksi sudah ditutup
    const txRow = await tx.query<any>(
      `SELECT created_at, total FROM transactions WHERE id = ? AND user_id = ?`,
      [transactionId, userId]
    )
    if (txRow.length === 0) return null

    const txDate = String(txRow[0].created_at || '').slice(0, 10)
    const closed = await tx.query<any>(
      `SELECT id FROM closing_periods
       WHERE user_id = ? AND status = 'closed' AND ? >= period_start AND ? <= period_end`,
      [userId, txDate, txDate]
    )
    if (closed.length === 0) return null

    // Laba yang direalisasi oleh pembayaran ini (proporsional) — mirror trigger
    // auto_update_realized_profit di Supabase.
    const txTotal = Number(txRow[0].total || 0)
    if (txTotal <= 0) return null

    const cogsRow = await tx.query<any>(
      `SELECT COALESCE(SUM(ti.quantity * COALESCE(p.price_buy, 0)), 0) AS cogs
       FROM transaction_items ti
       LEFT JOIN products p ON p.id = ti.product_id
       WHERE ti.transaction_id = ? AND ti.user_id = ?`,
      [transactionId, userId]
    )
    const cogs = Number(cogsRow[0]?.cogs || 0)

    let reclassifyAmount = round2((paymentAmount / txTotal) * (txTotal - cogs))
    if (reclassifyAmount <= 0.01) return null

    // Jangan melebihi saldo kredit 3-3100 yang tersedia
    const availableRow = await tx.query<any>(
      `SELECT COALESCE(SUM(jl.credit - jl.debit), 0) AS available
       FROM journal_lines jl
       INNER JOIN journal_entries je ON je.id = jl.journal_id
       WHERE jl.user_id = ? AND jl.account_id = ? AND je.status = 'posted'`,
      [userId, labaPiutangId]
    )
    const available = Number(availableRow[0]?.available || 0)
    if (available <= 0.01) return null
    if (reclassifyAmount > available) reclassifyAmount = round2(available)

    const journalId = uuid()
    const journalNumber = `REALIZE-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`

    // Buat jurnal reklasifikasi
    await tx.run(
      `INSERT INTO journal_entries (id, user_id, journal_number, entry_date, description, reference_type, reference_id, status, created_at, updated_at, sync_status, updated_at_local)
       VALUES (?, ?, ?, ?, 'Realisasi Laba: Pembayaran Piutang', 'reclassify', ?, 'posted', ?, ?, 'pending', ?)`,
      [journalId, userId, journalNumber, now, transactionId, now, now, now]
    )

    // Debit: Laba Piutang (3-3100)
    await tx.run(
      `INSERT INTO journal_lines (id, user_id, journal_id, account_id, account_code, account_name, debit, credit, created_at, sync_status, updated_at_local)
       VALUES (?, ?, ?, ?, '3-3100', 'Laba Piutang', ?, 0, ?, 'pending', ?)`,
      [uuid(), userId, journalId, labaPiutangId, reclassifyAmount, now, now]
    )

    // Kredit: Laba Direalisasi (3-3200)
    await tx.run(
      `INSERT INTO journal_lines (id, user_id, journal_id, account_id, account_code, account_name, debit, credit, created_at, sync_status, updated_at_local)
       VALUES (?, ?, ?, ?, '3-3200', 'Laba Direalisasi', 0, ?, ?, 'pending', ?)`,
      [uuid(), userId, journalId, labaDirealisasiId, reclassifyAmount, now, now]
    )

    return journalId
  },

  async replaceAllClosingPeriods(records: any[]): Promise<void> {
    const userId = getCurrentUserId()
    await run('DELETE FROM closing_periods WHERE user_id = ?', [userId])
    const now = nowIso()
    for (const cp of records) {
      const snapshotBalances = cp.snapshot_balances
        ? (typeof cp.snapshot_balances === 'string' ? cp.snapshot_balances : JSON.stringify(cp.snapshot_balances))
        : null

      await run(
        `INSERT OR REPLACE INTO closing_periods (id, user_id, period_start, period_end, closed_at, closed_by, notes, status, snapshot_balances, created_at, updated_at, sync_status, updated_at_local)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?)`,
        [cp.id, cp.user_id || userId, cp.period_start, cp.period_end, cp.closed_at, cp.closed_by, cp.notes || null, cp.status, snapshotBalances, cp.created_at, cp.updated_at, cp.updated_at || now]
      )
    }
  },

  // ============================================================
  // Jurnal Otomatis: Stok Awal Produk
  // ============================================================

  /**
   * Buat jurnal otomatis untuk stok awal produk.
   * Dipanggil saat produk dibuat dengan stok > 0.
   *
   * Jurnal:
   * Debit: Persediaan Barang (1-1200)
   * Kredit: Modal Pemilik (3-3000)
   */
  async postInitialStockJournal(
    productId: string,
    productName: string,
    initialStock: number,
    priceBuy: number
  ): Promise<string | null> {
    if (initialStock <= 0) return null

    const totalValue = initialStock * priceBuy
    const userId = getCurrentUserId()

    // Cari akun Persediaan Barang (1-1200) dan Modal Pemilik (3-3000)
    const persediaan = await queryOne<any>(
      `SELECT id FROM chart_of_accounts WHERE user_id = ? AND code = '1-1200' AND is_active = 1`,
      [userId]
    )
    const modal = await queryOne<any>(
      `SELECT id FROM chart_of_accounts WHERE user_id = ? AND code = '3-3000' AND is_active = 1`,
      [userId]
    )

    if (!persediaan || !modal) {
      console.warn('Akun Persediaan Barang atau Modal Pemilik tidak ditemukan. Jurnal stok awal tidak dibuat.')
      return null
    }

    // Buat jurnal
    try {
      const journalId = await this.createJournal({
        entry_date: new Date().toISOString().split('T')[0],
        description: `Stok awal produk: ${productName} (${initialStock} unit @ Rp ${priceBuy.toLocaleString('id-ID')})`,
        lines: [
          {
            account_id: persediaan.id,
            debit: totalValue,
            credit: 0,
          },
          {
            account_id: modal.id,
            debit: 0,
            credit: totalValue,
          }
        ]
      })

      return journalId
    } catch (error) {
      console.error('Error posting initial stock journal:', error)
      return null
    }
  },
}