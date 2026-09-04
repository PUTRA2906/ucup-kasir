import { supabase } from '@/lib/supabase'
import type {
  Account,
  AccountInsert,
  AccountUpdate,
  AccountBalance,
  JournalEntry,
  JournalInput,
  JournalLine,
  LedgerEntry,
} from '@/types/database'

// ============================================================
// Service: Finance (Supabase)
// - Chart of Accounts
// - Jurnal Umum (post_journal via RPC)
// - Buku Besar, Neraca Saldo, Neraca, Arus Kas
// ============================================================

export const financeService = {
  // ============================================================
  // Chart of Accounts
  // ============================================================

  async seedDefaultAccounts(): Promise<Account[]> {
    const { data, error } = await supabase.rpc('seed_default_accounts')
    if (error) throw error
    return (data || []) as Account[]
  },

  async getAccounts(): Promise<Account[]> {
    const { data, error } = await supabase
      .from('chart_of_accounts')
      .select('*')
      .order('code')

    if (error) throw error
    return data || []
  },

  async createAccount(input: AccountInsert): Promise<Account> {
    const { data, error } = await supabase
      .from('chart_of_accounts')
      .insert(input)
      .select()
      .single()

    if (error) throw error
    return data as Account
  },

  async updateAccount(id: string, updates: AccountUpdate): Promise<Account> {
    const { data, error } = await supabase
      .from('chart_of_accounts')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data as Account
  },

  async deleteAccount(id: string): Promise<void> {
    // Hanya akun non-sistem yang bisa dihapus
    const { error } = await supabase
      .from('chart_of_accounts')
      .delete()
      .eq('id', id)
      .eq('is_system', false)

    if (error) throw error
  },

  // ============================================================
  // Jurnal Umum
  // ============================================================

  async getJournals(): Promise<JournalEntry[]> {
    const { data, error } = await supabase
      .from('journal_entries')
      .select('*, lines:journal_lines(*)')
      .order('entry_date', { ascending: false })

    if (error) throw error
    return data || []
  },

  async getJournal(id: string): Promise<JournalEntry | null> {
    const { data, error } = await supabase
      .from('journal_entries')
      .select('*, lines:journal_lines(*)')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  },

  async createJournal(input: JournalInput): Promise<string> {
    const { data, error } = await supabase.rpc('post_journal', {
      p_entry_date: input.entry_date,
      p_description: input.description,
      p_lines: input.lines,
    })

    if (error) throw error
    return data as string
  },

  async voidJournal(id: string): Promise<void> {
    const { error } = await supabase.rpc('void_journal', {
      p_journal_id: id,
    })

    if (error) throw error
  },

  async deleteJournal(id: string): Promise<void> {
    const { error } = await supabase
      .from('journal_entries')
      .delete()
      .eq('id', id)

    if (error) throw error
  },

  // ============================================================
  // Laporan: Buku Besar
  // ============================================================

  /** Saldo akun sampai tanggal tertentu (Buku Besar & Neraca). */
  async getAccountBalances(endDate?: string): Promise<AccountBalance[]> {
    const { data: accounts, error: accErr } = await supabase
      .from('chart_of_accounts')
      .select('*')
      .eq('is_active', true)
      .order('code')

    if (accErr) throw accErr
    const accList = (accounts || []) as Account[]

    // Ambil semua baris jurnal yang belum void, sampai tanggal tertentu
    let query = supabase
      .from('journal_lines')
      .select('*, journal:journal_entries!inner(entry_date, status)')
      .order('created_at')

    if (endDate) {
      query = query.lte('journal.entry_date', new Date(endDate + 'T23:59:59.999').toISOString())
    }

    const { data: lines, error: lineErr } = await query

    if (lineErr) throw lineErr
    const lineList = (lines || []) as Array<JournalLine & { journal?: { entry_date: string; status: string } }>

    const balances: AccountBalance[] = accList.map((acc) => {
      let totalDebit = 0
      let totalCredit = 0
      for (const l of lineList) {
        if (l.account_id === acc.id && l.journal?.status !== 'void') {
          totalDebit += Number(l.debit || 0)
          totalCredit += Number(l.credit || 0)
        }
      }
      const rawBalance = totalDebit - totalCredit
      const balance = acc.normal_balance === 'debit' ? rawBalance : -rawBalance
      return {
        account_id: acc.id,
        account_code: acc.code,
        account_name: acc.name,
        account_type: acc.type,
        normal_balance: acc.normal_balance,
        total_debit: totalDebit,
        total_credit: totalCredit,
        balance,
      }
    })

    return balances
  },

  /** Riwayat baris buku besar untuk satu akun. */
  async getLedger(
    accountId: string,
    startDate?: string,
    endDate?: string
  ): Promise<{ balance: number; entries: LedgerEntry[] }> {
    // Saldo awal sampai sebelum startDate. Tanpa startDate = 0 (semua baris sudah tercakup di rentang).
    let before = 0
    if (startDate) {
      const prevDay = new Date(new Date(startDate).getTime() - 86400000).toISOString().split('T')[0]
      const allBalances = await this.getAccountBalances(prevDay)
      before = allBalances.find((b) => b.account_id === accountId)?.balance || 0
    }

    let query = supabase
      .from('journal_lines')
      .select('*, journal:journal_entries!inner(id, journal_number, entry_date, description, reference_type, status)')
      .eq('account_id', accountId)
      .eq('journal.status', 'posted')
      .order('entry_date', { foreignTable: 'journal', ascending: true })

    if (startDate) {
      query = query.gte('journal.entry_date', new Date(startDate + 'T00:00:00.000').toISOString())
    }
    if (endDate) {
      query = query.lte('journal.entry_date', new Date(endDate + 'T23:59:59.999').toISOString())
    }

    const { data, error } = await query
    if (error) throw error

    const rows = (data || []) as Array<JournalLine & { journal?: { id: string; journal_number: string; entry_date: string; description: string; reference_type?: string; status: string } }>

    let running = before
    const entries: LedgerEntry[] = rows.map((r) => {
      const debit = Number(r.debit || 0)
      const credit = Number(r.credit || 0)
      running = running + debit - credit
      return {
        entry_date: r.journal?.entry_date || r.created_at,
        journal_number: r.journal?.journal_number || '',
        description: r.journal?.description || '',
        reference_type: r.journal?.reference_type,
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

  /** Ringkasan arus kas: total debit/kredit per akun kas/bank dalam rentang. */
  async getCashFlow(startDate?: string, endDate?: string): Promise<{
    cashIn: number
    cashOut: number
    netCash: number
    lines: Array<{ entry_date: string; journal_number: string; description: string; debit: number; credit: number; customer_name?: string | null; is_payment?: boolean }>
  }> {
    const { data: cashAccounts, error: accErr } = await supabase
      .from('chart_of_accounts')
      .select('id, code, name')
      .in('code', ['1-1000', '1-1010'])

    if (accErr) throw accErr
    const cashIds = (cashAccounts || []).map((a) => a.id)
    if (cashIds.length === 0) {
      return { cashIn: 0, cashOut: 0, netCash: 0, lines: [] }
    }

    let query = supabase
      .from('journal_lines')
      .select('account_code, account_name, debit, credit, created_at, journal:journal_entries!inner(id, journal_number, entry_date, description, reference_type, reference_id, status)')
      .in('account_id', cashIds)
      .eq('journal.status', 'posted')
      .order('entry_date', { foreignTable: 'journal', ascending: true })

    if (startDate) query = query.gte('journal.entry_date', new Date(startDate + 'T00:00:00.000').toISOString())
    if (endDate) query = query.lte('journal.entry_date', new Date(endDate + 'T23:59:59.999').toISOString())

    const { data, error } = await query
    if (error) throw error

    const rows = (data || []) as unknown as Array<{ account_code: string; account_name: string; debit: number; credit: number; created_at: string; journal?: { journal_number: string; entry_date: string; description: string; reference_type?: string; reference_id?: string } }>

    // Ambil nama customer untuk jurnal pembayaran (reference_type = payment, reference_id = id transaksi)
    const paymentTxIds = rows
      .map((r) => r.journal?.reference_type === 'payment' ? r.journal?.reference_id : null)
      .filter((id): id is string => !!id)
    const uniqueTxIds = [...new Set(paymentTxIds)]

    const customerNameById = new Map<string, string>()
    if (uniqueTxIds.length > 0) {
      const { data: txRows, error: txErr } = await supabase
        .from('transactions')
        .select('id, customer_name')
        .in('id', uniqueTxIds)
      if (txErr) throw txErr
      for (const t of (txRows || [])) {
        customerNameById.set(t.id, t.customer_name || '')
      }
    }

    let cashIn = 0
    let cashOut = 0
    const lines = rows.map((r) => {
      const debit = Number(r.debit || 0)
      const credit = Number(r.credit || 0)
      cashIn += debit
      cashOut += credit
      const isPayment = r.journal?.reference_type === 'payment'
      const customerName = isPayment && r.journal?.reference_id ? (customerNameById.get(r.journal.reference_id) || null) : null
      return {
        entry_date: r.journal?.entry_date || r.created_at,
        journal_number: r.journal?.journal_number || '',
        description: r.journal?.description || '',
        account_code: r.account_code,
        account_name: r.account_name,
        customer_name: customerName,
        is_payment: isPayment,
        debit,
        credit,
      }
    })

    return { cashIn, cashOut, netCash: cashIn - cashOut, lines }
  },
}
