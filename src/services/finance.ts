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
  ClosingPeriod,
  ClosePeriodInput,
  RealisedProfitResult,
  TrialBalanceWorksheet,
  FinancialStatements,
} from '@/types/database'
import { buildFinancialStatements } from '@/lib/financialStatements'
import { businessDayRangeIso } from '@/utils/date'
import { requireCurrentStoreId } from '@/lib/currentStore'

// ============================================================
// Service: Finance (Supabase)
// - Chart of Accounts
// - Jurnal Umum (post_journal via RPC)
// - Buku Besar, Neraca Saldo, Neraca, Arus Kas
// ============================================================

// ============================================================
// Default Accounts untuk Seed
// CATATAN: Akun 3-3100 berubah dari "Laba Ditahan" jadi "Laba Ditahan (Terealisasi)"
//          dan ada akun baru 3-3200 "Laba Ditahan (Belum Terealisasi)"
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

    // Ambil semua baris jurnal yang posted (bukan void/draft), sampai tanggal tertentu
    let query = supabase
      .from('journal_lines')
      .select('*, journal:journal_entries!inner(entry_date, status)')
      .eq('journal.status', 'posted')  // Filter status di query, bukan di loop
      .order('created_at')

    if (endDate && endDate.trim() !== '') {
      // `entry_date` timestamptz ber-jam; batas akhir hari = awal hari
      // berikutnya (setengah-terbuka) agar jurnal sore/malam tidak terlewat.
      query = query.lt('journal.entry_date', businessDayRangeIso(endDate).end)
    }

    const { data: lines, error: lineErr } = await query

    if (lineErr) throw lineErr
    const lineList = (lines || []) as Array<JournalLine & { journal?: { entry_date: string; status: string } }>

    const balances: AccountBalance[] = accList.map((acc) => {
      let totalDebit = 0
      let totalCredit = 0
      for (const l of lineList) {
        if (l.account_id === acc.id) {
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

  /**
   * Kertas kerja Neraca Saldo & Penyesuaian (worksheet).
   *
   * Kolom:
   *   - Sebelum penyesuaian = seluruh jurnal posted sampai period_end,
   *     KECUALI jurnal penyesuaian (reference_type='adjusting') yang
   *     tanggalnya berada di dalam periode terpilih.
   *   - Penyesuaian = jurnal penyesuaian di dalam periode terpilih.
   *   - Setelah penyesuaian = penjumlahan keduanya.
   *
   * Penempatan debit/kredit memakai posisi neto akun (debit − kredit),
   * sehingga akun kontra otomatis pindah ke kolom sebaliknya.
   */
  async getTrialBalanceWorksheet(
    periodStart?: string,
    periodEnd?: string
  ): Promise<TrialBalanceWorksheet> {
    const { data: accounts, error: accErr } = await supabase
      .from('chart_of_accounts')
      .select('*')
      .eq('is_active', true)
      .order('code')

    if (accErr) throw accErr
    const accList = (accounts || []) as Account[]

    let query = supabase
      .from('journal_lines')
      .select(
        '*, journal:journal_entries!inner(id, journal_number, entry_date, description, reference_type, status)'
      )
      .eq('journal.status', 'posted')
      .order('entry_date', { foreignTable: 'journal', ascending: true })

    if (periodEnd && periodEnd.trim() !== '') {
      query = query.lt('journal.entry_date', businessDayRangeIso(periodEnd).end)
    }

    const { data: lines, error: lineErr } = await query
    if (lineErr) throw lineErr

    type LineWithJournal = JournalLine & {
      journal?: {
        id: string
        journal_number: string
        entry_date: string
        description: string
        reference_type?: string | null
        status: string
      }
    }

    const lineList = (lines || []) as LineWithJournal[]

    const startMs = periodStart
      ? new Date(periodStart + 'T00:00:00.000').getTime()
      : -Infinity
    const endMs = periodEnd
      ? new Date(periodEnd + 'T23:59:59.999').getTime()
      : Infinity

    const raw = new Map<
      string,
      { unadjDebit: number; unadjCredit: number; adjDebit: number; adjCredit: number }
    >()
    const getAcc = (id: string) => {
      let v = raw.get(id)
      if (!v) {
        v = { unadjDebit: 0, unadjCredit: 0, adjDebit: 0, adjCredit: 0 }
        raw.set(id, v)
      }
      return v
    }

    const adjustmentJournals = new Map<string, JournalEntry>()

    for (const l of lineList) {
      const j = l.journal
      if (!j) continue

      const debit = Number(l.debit || 0)
      const credit = Number(l.credit || 0)
      const t = new Date(j.entry_date).getTime()

      const isAdjustmentInPeriod =
        j.reference_type === 'adjusting' && t >= startMs && t <= endMs

      const acc = getAcc(l.account_id)
      if (isAdjustmentInPeriod) {
        acc.adjDebit += debit
        acc.adjCredit += credit

        let journal = adjustmentJournals.get(j.id)
        if (!journal) {
          journal = {
            id: j.id,
            journal_number: j.journal_number,
            entry_date: j.entry_date,
            description: j.description,
            reference_type: 'adjusting',
            status: 'posted',
            created_at: '',
            updated_at: '',
            lines: [],
          }
          adjustmentJournals.set(j.id, journal)
        }
        journal.lines!.push(l)
      } else {
        acc.unadjDebit += debit
        acc.unadjCredit += credit
      }
    }

    const rows = accList
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

  /**
   * Posting jurnal penyesuaian (AJP).
   * Berbeda dari jurnal umum: reference_type ditandai 'adjusting'
   * supaya terpisah di kertas kerja Neraca Saldo & Penyesuaian.
   */
  async postAdjustingJournal(input: JournalInput): Promise<string> {
    const { data, error } = await supabase.rpc('post_adjusting_journal', {
      p_entry_date: input.entry_date,
      p_description: input.description,
      p_lines: input.lines,
    })

    if (error) throw error
    return data as string
  },

  /** Jurnal penyesuaian dalam rentang tanggal (dengan baris akun). */
  async getAdjustingJournals(
    startDate?: string,
    endDate?: string
  ): Promise<JournalEntry[]> {
    let query = supabase
      .from('journal_entries')
      .select('*, lines:journal_lines(*)')
      .eq('reference_type', 'adjusting')
      .eq('status', 'posted')
      .order('entry_date', { ascending: false })

    if (startDate && startDate.trim() !== '') {
      query = query.gte('entry_date', businessDayRangeIso(startDate).start)
    }
    if (endDate && endDate.trim() !== '') {
      query = query.lt('entry_date', businessDayRangeIso(endDate).end)
    }

    const { data, error } = await query
    if (error) throw error
    return (data || []) as JournalEntry[]
  },

  /** Riwayat baris buku besar untuk satu akun. */
  async getLedger(
    accountId: string,
    startDate?: string,
    endDate?: string
  ): Promise<{ balance: number; entries: LedgerEntry[] }> {
    // Saldo awal sampai sebelum startDate. Tanpa startDate = 0 (semua baris sudah tercakup di rentang).
    // Catatan: getAccountBalances mengembalikan saldo TERNORMALISASI (kredit = positif utk akun
    // normal-kredit), sedangkan delta baris di bawah memakai basis debit-mentah (debit - credit).
    // Konversi balik ke basis debit supaya kedua basis sama.
    let before = 0
    if (startDate && startDate.trim() !== '') {
      // 'YYYY-MM-DD' + 'T00:00:00' = tengah malam LOKAL (bukan UTC) -> minus 1 hari = akhir hari sebelumnya
      const prevDay = new Date(new Date(startDate + 'T00:00:00').getTime() - 86400000)
        .toLocaleDateString('en-CA') // en-CA == format 'YYYY-MM-DD'
      const allBalances = await this.getAccountBalances(prevDay)
      const found = allBalances.find((b) => b.account_id === accountId)
      if (found) before = found.normal_balance === 'debit' ? found.balance : -found.balance
    }

    let query = supabase
      .from('journal_lines')
      .select('*, journal:journal_entries!inner(id, journal_number, entry_date, description, reference_type, status)')
      .eq('account_id', accountId)
      .eq('journal.status', 'posted')
      .order('entry_date', { foreignTable: 'journal', ascending: true })

    if (startDate && startDate.trim() !== '') {
      query = query.gte('journal.entry_date', businessDayRangeIso(startDate).start)
    }
    if (endDate && endDate.trim() !== '') {
      query = query.lt('journal.entry_date', businessDayRangeIso(endDate).end)
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

    if (startDate && startDate.trim() !== '') query = query.gte('journal.entry_date', businessDayRangeIso(startDate).start)
    if (endDate && endDate.trim() !== '') query = query.lt('journal.entry_date', businessDayRangeIso(endDate).end)

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

  // ============================================================
  // Laba Aktual & Direalisasi (2 Akun Laba)
  // ============================================================

  /**
   * Mendapatkan summary laba aktual dan direalisasi dari database function.
   * - Laba Aktual: Total profit dari semua transaksi
   * - Laba Direalisasi: Profit yang sudah terima kas (bisa diambil owner)
   */
  async getProfitSummary(startDate?: string, endDate?: string): Promise<{
    total_revenue: number
    total_cogs: number
    total_profit: number
    realized_revenue: number
    realized_cogs: number
    realized_profit: number
  }> {
    const storeId = await requireCurrentStoreId()
    const { data, error } = await supabase.rpc('get_profit_summary', {
      p_store_id: storeId,
      p_start_date: startDate || null,
      p_end_date: endDate || null
    })

    if (error) throw error

    const result = data?.[0] || {}
    return {
      total_revenue: Number(result.total_revenue || 0),
      total_cogs: Number(result.total_cogs || 0),
      total_profit: Number(result.total_profit || 0),
      realized_revenue: Number(result.realized_revenue || 0),
      realized_cogs: Number(result.realized_cogs || 0),
      realized_profit: Number(result.realized_profit || 0),
    }
  },

  /**
   * LEGACY: Menghitung laba terealisasi (cash-based profit) berdasarkan alokasi pembayaran per item.
   * Ini menunjukkan berapa laba yang benar-benar bisa dipakai untuk modal usaha.
   *
   * Rumus per item:
   *   Allocated Revenue = SUM(allocated_amount untuk item ini)
   *   Item HPP = price_buy × quantity
   *   Realised Profit per item = Allocated Revenue - Item HPP
   *
   * DEPRECATED: Gunakan getProfitSummary() untuk metode baru (simplified proportional).
   */
  async getRealisedProfit(startDate?: string, endDate?: string): Promise<RealisedProfitResult> {
    // Ambil semua transaksi dengan items dan alokasi pembayaran
    let query = supabase
      .from('transactions')
      .select(`
        id,
        total,
        paid_amount,
        remaining_amount,
        items:transaction_items(
          id,
          product_id,
          quantity,
          price,
          subtotal,
          product:v_products(price_buy),
          allocations:transaction_item_payments(allocated_amount)
        )
      `)
      .order('created_at', { ascending: false })

    if (startDate && startDate.trim() !== '') {
      query = query.gte('created_at', new Date(startDate + 'T00:00:00.000').toISOString())
    }
    if (endDate && endDate.trim() !== '') {
      query = query.lte('created_at', new Date(endDate + 'T23:59:59.999').toISOString())
    }

    const { data: transactions, error } = await query

    if (error) throw error

    let totalRevenue = 0
    let realisedRevenue = 0
    let unrealisedRevenue = 0
    let totalCOGS = 0
    let realisedCOGS = 0

    for (const tx of transactions || []) {
      const total = Number((tx as any).total || 0)
      const paid = Number((tx as any).paid_amount || 0)
      const remaining = Number((tx as any).remaining_amount || 0)

      totalRevenue += total
      realisedRevenue += paid
      unrealisedRevenue += remaining

      // Hitung per item
      const items = (tx as any).items || []
      for (const item of items) {
        const priceBuy = item.product?.price_buy || 0
        const qty = Number(item.quantity || 0)
        const itemCOGS = priceBuy * qty

        totalCOGS += itemCOGS

        // Total yang sudah dibayar untuk item ini
        const allocations = item.allocations || []
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
   * Aktivitas pendapatan & beban dalam periode (dasar laporan Laba Rugi).
   *
   * PENTING: jurnal penutup (`closing`), jurnal penyesuaian (`adjusting`) dan
   * reklasifikasi laba (`reclassify`) DIKECUALIKAN. Jurnal penutup men-nol-kan
   * akun pendapatan/beban, sehingga kalau ikut dihitung laporan laba rugi akan
   * tampak nol/negatif. Jurnal penyesuaian sudah dihitung sebagai bagian dari
   * saldo akun pada laporan neraca, tapi untuk Laba Rugi kita pakai aktivitas
   * asli periode saja.
   *
   * Return `byAccount`: agregat per akun (dipakai laporan Laba Rugi per akun).
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
    // Filter tanggal & status di server agar tidak menarik seluruh baris jurnal.
    // `entry_date` adalah timestamptz ber-jam: batas memakai rentang hari LOKAL
    // (setengah-terbuka) agar tidak ada baris yang terlewat/tergeser.
    const startIso = businessDayRangeIso(startDate).start
    const endIso = businessDayRangeIso(endDate).end

    const { data: lines, error } = await supabase
      .from('journal_lines')
      .select(`
        debit,
        credit,
        account_id,
        account:chart_of_accounts!inner(code, name, type),
        journal:journal_entries!inner(entry_date, status, reference_type)
      `)
      .eq('journal.status', 'posted')
      .gte('journal.entry_date', startIso)
      .lt('journal.entry_date', endIso)

    if (error) throw error

    const excludedTypes = new Set(['closing', 'adjusting', 'reclassify'])
    const accountMap = new Map<string, {
      account_id: string
      account_code: string
      account_name: string
      account_type: 'pendapatan' | 'beban'
      amount: number
    }>()

    let totalPendapatan = 0
    let totalBeban = 0

    // Filter manual di JS karena Supabase tidak support nested filter di join
    for (const line of lines || []) {
      const journal = (line as any).journal
      if (!journal?.entry_date) continue
      if (excludedTypes.has(journal.reference_type)) continue

      // Tanggal bisnis = bagian tanggal UTC dari entry_date (lihat
      // businessDayRangeIso di utils/date.ts).
      const date = String(journal.entry_date).replace(' ', 'T').slice(0, 10)
      if (date < startDate || date > endDate) continue

      const account = (line as any).account
      const accountType = account?.type
      if (accountType !== 'pendapatan' && accountType !== 'beban') continue

      const debit = Number((line as any).debit || 0)
      const credit = Number((line as any).credit || 0)
      const amount = accountType === 'pendapatan' ? credit - debit : debit - credit

      if (accountType === 'pendapatan') totalPendapatan += amount
      else totalBeban += amount

      const accountId = (line as any).account_id as string
      const existing = accountMap.get(accountId)
      if (existing) {
        existing.amount += amount
      } else {
        accountMap.set(accountId, {
          account_id: accountId,
          account_code: account?.code || '',
          account_name: account?.name || '',
          account_type: accountType,
          amount,
        })
      }
    }

    return {
      totalPendapatan,
      totalBeban,
      labaBersih: totalPendapatan - totalBeban,
      byAccount: Array.from(accountMap.values()),
    }
  },

  /**
   * Hitung total pendapatan dan beban dalam periode tertentu (untuk preview tutup buku).
   * Memakai getPeriodActivity() sehingga jurnal penutup/penyesuaian tidak ikut.
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
  // Laporan Keuangan Lengkap
  // ============================================================

  /**
   * Susun paket laporan keuangan lengkap untuk satu periode:
   * Laba Rugi, Perubahan Ekuitas, dan Posisi Keuangan (Neraca).
   *
   * Mengambil seluruh baris jurnal posted (bukan per akun) supaya
   * perhitungan saldo awal/akhir dan mutasi ekuitas konsisten dengan
   * buku besar. Logika penyusunan ada di `buildFinancialStatements()`.
   */
  async getFinancialStatements(
    periodStart: string,
    periodEnd: string
  ): Promise<FinancialStatements> {
    const { data: accounts, error: accErr } = await supabase
      .from('chart_of_accounts')
      .select('*')
      .eq('is_active', true)
      .order('code')

    if (accErr) throw accErr
    const accountList = (accounts || []) as Account[]

    const { data: lines, error: lineErr } = await supabase
      .from('journal_lines')
      .select(
        'account_id, debit, credit, journal:journal_entries!inner(entry_date, status, reference_type)'
      )
      .eq('journal.status', 'posted')
      .lt('journal.entry_date', businessDayRangeIso(periodEnd).end)

    if (lineErr) throw lineErr

    // Supabase tanpa generated types menafsirkan relasi join sebagai array;
    // relasi many-to-one ini sebenarnya objek. Normalisasi keduanya.
    const rows = (lines || []) as unknown as Array<{
      account_id: string
      debit: number
      credit: number
      journal?:
        | { entry_date: string; status: string; reference_type?: string | null }
        | Array<{ entry_date: string; status: string; reference_type?: string | null }>
    }>

    const journalOf = (r: (typeof rows)[number]) =>
      Array.isArray(r.journal) ? r.journal[0] : r.journal

    return buildFinancialStatements({
      accounts: accountList,
      lines: rows.map((r) => ({
        account_id: r.account_id,
        debit: Number(r.debit || 0),
        credit: Number(r.credit || 0),
        entry_date: journalOf(r)?.entry_date || '',
        reference_type: journalOf(r)?.reference_type,
      })),
      periodStart,
      periodEnd,
    })
  },

  // ============================================================
  // Tutup Buku (Closing Period)
  // ============================================================

  async getClosingPeriods(): Promise<ClosingPeriod[]> {
    const { data, error } = await supabase
      .from('closing_periods')
      .select('*')
      .order('period_end', { ascending: false })

    if (error) throw error

    // Parse snapshot_balances dari JSONB ke array
    return (data || []).map(cp => ({
      ...cp,
      snapshot_balances: cp.snapshot_balances
        ? (Array.isArray(cp.snapshot_balances)
            ? cp.snapshot_balances
            : [])
        : []
    }))
  },

  async getClosingPeriod(id: string): Promise<ClosingPeriod | null> {
    const { data, error } = await supabase
      .from('closing_periods')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error

    return data ? {
      ...data,
      snapshot_balances: data.snapshot_balances
        ? (Array.isArray(data.snapshot_balances)
            ? data.snapshot_balances
            : [])
        : []
    } : null
  },

  async closePeriod(input: ClosePeriodInput): Promise<string> {
    const { data, error } = await supabase.rpc('close_period', {
      p_period_start: input.period_start,
      p_period_end: input.period_end,
      p_notes: input.notes || null
    })

    if (error) throw error
    return data as string
  },

  async reopenPeriod(closingId: string): Promise<void> {
    const { error } = await supabase.rpc('reopen_period', {
      p_closing_id: closingId
    })

    if (error) throw error
  },

  async deletePeriod(closingId: string): Promise<void> {
    const { error } = await supabase.rpc('delete_closing_period', {
      p_closing_id: closingId
    })

    if (error) throw error
  },

  async checkPeriodClosed(date: string): Promise<boolean> {
    const storeId = await requireCurrentStoreId()
    if (!storeId) return false

    const { data, error } = await supabase.rpc('check_period_closed', {
      p_date: date,
      p_store_id: storeId
    })

    if (error) throw error
    return data as boolean
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

    // Cari akun Persediaan Barang (1-1200) dan Modal Pemilik (3-3000)
    const persediaanId = await this.getAccountIdByCode('1-1200')
    const modalId = await this.getAccountIdByCode('3-3000')

    if (!persediaanId || !modalId) {
      console.warn('Akun Persediaan Barang atau Modal Pemilik tidak ditemukan. Jurnal stok awal tidak dibuat.')
      return null
    }

    // Buat jurnal via RPC post_journal
    try {
      const journalId = await this.createJournal({
        entry_date: new Date().toISOString().split('T')[0],
        description: `Stok awal produk: ${productName} (${initialStock} unit @ Rp ${priceBuy.toLocaleString('id-ID')})`,
        lines: [
          {
            account_id: persediaanId,
            debit: totalValue,
            credit: 0,
          },
          {
            account_id: modalId,
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

  /**
   * Helper: Cari ID akun berdasarkan kode
   */
  async getAccountIdByCode(code: string): Promise<string | null> {
    const { data, error } = await supabase
      .from('chart_of_accounts')
      .select('id')
      .eq('code', code)
      .eq('is_active', true)
      .single()

    if (error) return null
    return data?.id || null
  },
}
