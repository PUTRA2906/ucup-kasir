import { localDateFromIso } from '@/utils/date'
import type {
  Account,
  EquityMovementRow,
  EquityStatement,
  FinancialStatements,
  IncomeStatement,
  PositionStatement,
  StatementAccountRow,
} from '@/types/database'

// ============================================================
// Builder Laporan Keuangan Lengkap
//
// Satu sumber logika untuk web (Supabase) dan Android (SQLite).
// Service hanya menyiapkan daftar akun + baris jurnal posted, lalu
// fungsi di sini menyusun tiga laporan:
//   1. Laba Rugi
//   2. Perubahan Ekuitas
//   3. Posisi Keuangan (Neraca)
//
// Aturan penting:
// - Jurnal penutup (`closing`) TIDAK dihitung sebagai aktivitas
//   pendapatan/beban periode, karena jurnal itu justru men-nol-kan
//   akun pendapatan/beban dan memindahkan laba ke ekuitas.
// - Jurnal penyesuaian (`adjusting`) IKUT dihitung. Ini konsisten
//   dengan close_period() di database yang hanya mengecualikan
//   `closing` saat menghitung laba periode.
// - Laporan Posisi Keuangan memakai SEMUA jurnal posted s/d tanggal,
//   termasuk jurnal penutup, sehingga saldo akun sesuai buku besar.
// ============================================================

/** Baris jurnal minimal yang dibutuhkan builder. */
export interface StatementJournalLine {
  account_id: string
  debit: number
  credit: number
  /** Tanggal jurnal (ISO timestamp / 'YYYY-MM-DD HH:mm:ss' / 'YYYY-MM-DD'). */
  entry_date: string
  reference_type?: string | null
}

const round2 = (value: number): number => Math.round((value || 0) * 100) / 100

/**
 * Ambil tanggal lokal 'YYYY-MM-DD' dari entry_date apa pun.
 * SQLite menyimpan "YYYY-MM-DD HH:mm:ss" (spasi) — normalisasi ke 'T'
 * supaya Safari/WebView Android bisa mem-parse dengan benar.
 */
const lineDate = (entryDate: string): string => {
  if (!entryDate) return ''
  const normalized = /^\d{4}-\d{2}-\d{2} /.test(entryDate)
    ? entryDate.replace(' ', 'T')
    : entryDate
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return normalized
  return localDateFromIso(normalized)
}

/** Tanggal sehari sebelum `ymd` (format lokal 'YYYY-MM-DD'). */
const dayBefore = (ymd: string): string => {
  const d = new Date(ymd + 'T00:00:00')
  d.setDate(d.getDate() - 1)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const isCogsAccount = (account: Account): boolean => {
  // HPP memakai kode 5-50xx (default 5-5000). Akun beban lain = operasional.
  return account.code.startsWith('5-50')
}

type RawBalance = { debit: number; credit: number }

/** Agregasi debit/kredit per akun untuk baris yang lolos filter. */
const aggregate = (
  lines: StatementJournalLine[],
  accept: (line: StatementJournalLine) => boolean
): Map<string, RawBalance> => {
  const map = new Map<string, RawBalance>()
  for (const line of lines) {
    if (!accept(line)) continue
    const current = map.get(line.account_id) || { debit: 0, credit: 0 }
    current.debit += Number(line.debit || 0)
    current.credit += Number(line.credit || 0)
    map.set(line.account_id, current)
  }
  return map
}

/** Saldo bertanda sesuai normal_balance akun (sama dengan getAccountBalances). */
const signedBalance = (account: Account, raw: RawBalance | undefined): number => {
  if (!raw) return 0
  const net = raw.debit - raw.credit
  return round2(account.normal_balance === 'debit' ? net : -net)
}

/** Ubah map saldo menjadi baris laporan per tipe akun, buang yang nol. */
const rowsByType = (
  accounts: Account[],
  balances: Map<string, RawBalance>,
  type: Account['type']
): StatementAccountRow[] =>
  accounts
    .filter((acc) => acc.type === type)
    .map((acc) => ({
      account_id: acc.id,
      account_code: acc.code,
      account_name: acc.name,
      amount: signedBalance(acc, balances.get(acc.id)),
    }))
    .filter((row) => Math.abs(row.amount) > 0.004)
    .sort((a, b) => a.account_code.localeCompare(b.account_code))

const sum = (rows: Array<{ amount: number }>): number =>
  round2(rows.reduce((total, row) => total + row.amount, 0))

// ------------------------------------------------------------
// 1. Laba Rugi
// ------------------------------------------------------------
const buildIncomeStatement = (
  accounts: Account[],
  lines: StatementJournalLine[],
  periodStart: string,
  periodEnd: string
): IncomeStatement => {
  const byAccount = aggregate(
    lines,
    (line) =>
      (line.reference_type || '') !== 'closing' &&
      lineDate(line.entry_date) >= periodStart &&
      lineDate(line.entry_date) <= periodEnd
  )

  const revenue = rowsByType(accounts, byAccount, 'pendapatan')
  const expenseAccounts = accounts.filter((acc) => acc.type === 'beban')

  const toExpenseRows = (accs: Account[]): StatementAccountRow[] =>
    accs
      .map((acc) => ({
        account_id: acc.id,
        account_code: acc.code,
        account_name: acc.name,
        amount: signedBalance(acc, byAccount.get(acc.id)),
      }))
      .filter((row) => Math.abs(row.amount) > 0.004)
      .sort((a, b) => a.account_code.localeCompare(b.account_code))

  const cogs = toExpenseRows(expenseAccounts.filter(isCogsAccount))
  const operatingExpenses = toExpenseRows(expenseAccounts.filter((acc) => !isCogsAccount(acc)))

  const totalRevenue = sum(revenue)
  const totalCogs = sum(cogs)
  const totalOperating = sum(operatingExpenses)
  const grossProfit = round2(totalRevenue - totalCogs)
  const totalExpenses = round2(totalCogs + totalOperating)
  const netProfit = round2(totalRevenue - totalExpenses)
  const profitMargin = totalRevenue !== 0 ? round2((netProfit / totalRevenue) * 100) : 0

  return {
    period_start: periodStart,
    period_end: periodEnd,
    revenue,
    total_revenue: totalRevenue,
    cogs,
    total_cogs: totalCogs,
    gross_profit: grossProfit,
    operating_expenses: operatingExpenses,
    total_operating_expenses: totalOperating,
    total_expenses: totalExpenses,
    net_profit: netProfit,
    profit_margin: profitMargin,
  }
}

// ------------------------------------------------------------
// 2. Posisi Keuangan (Neraca)
// ------------------------------------------------------------
const buildPositionStatement = (
  accounts: Account[],
  lines: StatementJournalLine[],
  asOf: string
): PositionStatement => {
  const balances = aggregate(lines, (line) => lineDate(line.entry_date) <= asOf)

  const assets = rowsByType(accounts, balances, 'aset')
  const liabilities = rowsByType(accounts, balances, 'kewajiban')
  const equityAccounts = rowsByType(accounts, balances, 'ekuitas')

  const totalRevenue = sum(rowsByType(accounts, balances, 'pendapatan'))
  const totalExpense = sum(rowsByType(accounts, balances, 'beban'))
  const unclosedProfit = round2(totalRevenue - totalExpense)

  const totalAssets = sum(assets)
  const totalLiabilities = sum(liabilities)
  const totalEquityAccounts = sum(equityAccounts)
  const totalEquity = round2(totalEquityAccounts + unclosedProfit)
  const totalLiabilitiesEquity = round2(totalLiabilities + totalEquity)
  const difference = round2(totalAssets - totalLiabilitiesEquity)

  return {
    as_of: asOf,
    assets,
    total_assets: totalAssets,
    liabilities,
    total_liabilities: totalLiabilities,
    equity_accounts: equityAccounts,
    total_equity_accounts: totalEquityAccounts,
    unclosed_profit: unclosedProfit,
    total_equity: totalEquity,
    total_liabilities_equity: totalLiabilitiesEquity,
    is_balanced: Math.abs(difference) < 0.51,
    difference,
  }
}

// ------------------------------------------------------------
// 3. Perubahan Ekuitas
// ------------------------------------------------------------
const buildEquityStatement = (
  accounts: Account[],
  lines: StatementJournalLine[],
  periodStart: string,
  periodEnd: string,
  netProfit: number
): EquityStatement => {
  // Saldo awal = semua jurnal sebelum periode dimulai.
  const openingDate = dayBefore(periodStart)
  const openingBalances = aggregate(lines, (line) => lineDate(line.entry_date) <= openingDate)
  const openingEquityAccounts = rowsByType(accounts, openingBalances, 'ekuitas')
  const openingRevenue = sum(rowsByType(accounts, openingBalances, 'pendapatan'))
  const openingExpense = sum(rowsByType(accounts, openingBalances, 'beban'))
  const openingUnclosed = round2(openingRevenue - openingExpense)
  const openingTotal = round2(sum(openingEquityAccounts) + openingUnclosed)

  // Mutasi ekuitas periode berjalan. Jurnal penutup dikecualikan karena
  // laba periode sudah disajikan sebagai baris "Laba Bersih".
  const movement = aggregate(
    lines,
    (line) =>
      (line.reference_type || '') !== 'closing' &&
      lineDate(line.entry_date) >= periodStart &&
      lineDate(line.entry_date) <= periodEnd
  )

  const equityAccounts = accounts.filter((acc) => acc.type === 'ekuitas')
  // Pisahkan bruto: setiap kredit = penambahan, setiap debit = pengurangan.
  // Jangan di-net per akun, supaya setoran dan prive yang dibukukan pada
  // akun modal yang sama tetap tampil terpisah di laporan.
  const contributions: EquityMovementRow[] = []
  const withdrawals: EquityMovementRow[] = []
  for (const acc of equityAccounts) {
    const raw = movement.get(acc.id)
    if (!raw) continue
    const credit = round2(raw.credit)
    const debit = round2(raw.debit)
    if (credit > 0.004) {
      contributions.push({
        account_id: acc.id,
        account_code: acc.code,
        account_name: acc.name,
        amount: credit,
      })
    }
    if (debit > 0.004) {
      withdrawals.push({
        account_id: acc.id,
        account_code: acc.code,
        account_name: acc.name,
        amount: debit,
      })
    }
  }
  const byCode = (a: EquityMovementRow, b: EquityMovementRow) =>
    a.account_code.localeCompare(b.account_code)
  contributions.sort(byCode)
  withdrawals.sort(byCode)

  const totalContributions = round2(contributions.reduce((s, r) => s + r.amount, 0))
  const totalWithdrawals = round2(withdrawals.reduce((s, r) => s + r.amount, 0))

  const endingTotal = round2(openingTotal + netProfit + totalContributions - totalWithdrawals)

  // Saldo ekuitas akhir (termasuk jurnal penutup) untuk ditampilkan.
  const endingBalances = aggregate(lines, (line) => lineDate(line.entry_date) <= periodEnd)
  const endingEquityAccounts = rowsByType(accounts, endingBalances, 'ekuitas')

  return {
    period_start: periodStart,
    period_end: periodEnd,
    opening_equity_accounts: openingEquityAccounts,
    opening_unclosed_profit: openingUnclosed,
    opening_total: openingTotal,
    net_profit: netProfit,
    contributions,
    total_contributions: totalContributions,
    withdrawals,
    total_withdrawals: totalWithdrawals,
    ending_equity_accounts: endingEquityAccounts,
    ending_total: endingTotal,
  }
}

// ------------------------------------------------------------
// Entry point
// ------------------------------------------------------------
export function buildFinancialStatements(params: {
  accounts: Account[]
  lines: StatementJournalLine[]
  periodStart: string
  periodEnd: string
}): FinancialStatements {
  const { accounts, lines, periodStart, periodEnd } = params
  const activeAccounts = accounts.filter((acc) => acc.is_active !== false)

  const incomeStatement = buildIncomeStatement(
    activeAccounts,
    lines,
    periodStart,
    periodEnd
  )
  const equityStatement = buildEquityStatement(
    activeAccounts,
    lines,
    periodStart,
    periodEnd,
    incomeStatement.net_profit
  )
  const positionStatement = buildPositionStatement(activeAccounts, lines, periodEnd)

  return {
    income_statement: incomeStatement,
    equity_statement: equityStatement,
    position_statement: positionStatement,
    generated_at: new Date().toISOString(),
  }
}
