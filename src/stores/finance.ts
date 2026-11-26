import { defineStore } from 'pinia'
import { ref } from 'vue'
import { financeServiceAdapter } from '@/services'
import { cachedQuery } from '@/lib/queryCache'
import type {
  Account,
  AccountInsert,
  AccountUpdate,
  AccountBalance,
  JournalEntry,
  JournalInput,
  LedgerEntry,
  TrialBalanceWorksheet,
  ClosingPeriod,
  ClosePeriodInput,
} from '@/types/database'

export const useFinanceStore = defineStore('finance', () => {
  // ============================================================
  // State
  // ============================================================
  const accounts = ref<Account[]>([])
  const journals = ref<JournalEntry[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // ============================================================
  // Chart of Accounts
  // ============================================================

  /** Seed akun default (dipanggil saat pertama kali buka modul). */
  async function seedAccounts() {
    loading.value = true
    error.value = null
    try {
      accounts.value = await financeServiceAdapter.seedDefaultAccounts()
      return accounts.value
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function fetchAccounts() {
    loading.value = true
    error.value = null
    try {
      const result = await cachedQuery(
        'finance',
        'accounts',
        () => financeServiceAdapter.getAccounts(),
      )
      // Auto-seed jika akun keuangan belum ada (akun baru / pertama kali)
      if (result.length === 0) {
        accounts.value = await financeServiceAdapter.seedDefaultAccounts()
      } else {
        accounts.value = result
      }
      return accounts.value
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function createAccount(input: AccountInsert) {
    loading.value = true
    error.value = null
    try {
      const created = await financeServiceAdapter.createAccount(input)
      accounts.value.push(created)
      return created
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function updateAccount(id: string, updates: AccountUpdate) {
    loading.value = true
    error.value = null

    const index = accounts.value.findIndex((a) => a.id === id)
    const oldAccount = index !== -1 ? { ...accounts.value[index] } : null

    try {
      const updated = await financeServiceAdapter.updateAccount(id, updates)
      if (index !== -1) accounts.value[index] = updated
      return updated
    } catch (e: any) {
      if (oldAccount && index !== -1) accounts.value[index] = oldAccount
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function deleteAccount(id: string) {
    loading.value = true
    error.value = null

    const index = accounts.value.findIndex((a) => a.id === id)
    const oldAccount = index !== -1 ? { ...accounts.value[index] } : null

    try {
      await financeServiceAdapter.deleteAccount(id)
      accounts.value = accounts.value.filter((a) => a.id !== id)
    } catch (e: any) {
      // Tidak perlu rollback: kalau throw, filter di atas tidak pernah jalan,
      // jadi daftar akun masih utuh. (Dulu splice() di sini malahan Duplikat akun.)
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  // ============================================================
  // Jurnal Umum
  // ============================================================

  async function fetchJournals() {
    loading.value = true
    error.value = null
    try {
      journals.value = await financeServiceAdapter.getJournals()
      return journals.value
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function getJournal(id: string): Promise<JournalEntry | null> {
    loading.value = true
    error.value = null
    try {
      return await financeServiceAdapter.getJournal(id)
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function createJournal(input: JournalInput): Promise<string> {
    loading.value = true
    error.value = null
    try {
      const id = await financeServiceAdapter.createJournal(input)
      return id
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }


  async function deleteJournal(id: string) {
    loading.value = true
    error.value = null

    const index = journals.value.findIndex((j) => j.id === id)
    const oldJournal = index !== -1 ? { ...journals.value[index] } : null

    try {
      await financeServiceAdapter.deleteJournal(id)
      journals.value = journals.value.filter((j) => j.id !== id)
    } catch (e: any) {
      // Tidak perlu rollback: kalau throw, filter di atas tidak pernah jalan.
      // (Dulu splice() di sini malahan Duplikat jurnal.)
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  // ============================================================
  // Laporan
  // ============================================================

  /** Saldo semua akun sampai tanggal tertentu (Buku Besar & Neraca). */
  async function getAccountBalances(endDate?: string): Promise<AccountBalance[]> {
    loading.value = true
    error.value = null
    try {
      return await financeServiceAdapter.getAccountBalances(endDate)
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  /** Kertas kerja Neraca Saldo & Penyesuaian. */
  async function getTrialBalanceWorksheet(
    periodStart?: string,
    periodEnd?: string
  ): Promise<TrialBalanceWorksheet> {
    loading.value = true
    error.value = null
    try {
      return await financeServiceAdapter.getTrialBalanceWorksheet(periodStart, periodEnd)
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  /** Posting jurnal penyesuaian. */
  async function postAdjustingJournal(input: JournalInput): Promise<string> {
    loading.value = true
    error.value = null
    try {
      return await financeServiceAdapter.postAdjustingJournal(input)
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  /** Riwayat buku besar satu akun. */
  async function getLedger(
    accountId: string,
    startDate?: string,
    endDate?: string
  ): Promise<{ balance: number; entries: LedgerEntry[] }> {
    loading.value = true
    error.value = null
    try {
      return await financeServiceAdapter.getLedger(accountId, startDate, endDate)
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  /** Arus kas. */
  async function getCashFlow(startDate?: string, endDate?: string) {
    loading.value = true
    error.value = null
    try {
      return await financeServiceAdapter.getCashFlow(startDate, endDate)
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  /** Laba Terealisasi (cash-based profit). */
  async function getRealisedProfit(startDate?: string, endDate?: string) {
    loading.value = true
    error.value = null
    try {
      return await financeServiceAdapter.getRealisedProfit(startDate, endDate)
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  /** Ringkasan laba aktual & direalisasi. */
  async function getProfitSummary(startDate?: string, endDate?: string) {
    loading.value = true
    error.value = null
    try {
      return await financeServiceAdapter.getProfitSummary(startDate, endDate)
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  /**
   * Aktivitas pendapatan & beban periode (tanpa jurnal penutup/penyesuaian).
   * Dipakai laporan Laba Rugi & dashboard.
   */
  async function getPeriodActivity(startDate: string, endDate: string) {
    loading.value = true
    error.value = null
    try {
      return await financeServiceAdapter.getPeriodActivity(startDate, endDate)
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  /**
   * Paket laporan keuangan lengkap: Laba Rugi, Perubahan Ekuitas,
   * dan Posisi Keuangan (Neraca) untuk satu periode.
   */
  async function getFinancialStatements(startDate: string, endDate: string) {
    loading.value = true
    error.value = null
    try {
      return await financeServiceAdapter.getFinancialStatements(startDate, endDate)
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  /** Total pendapatan/beban periode (untuk preview tutup buku). */
  async function getPeriodProfitLoss(startDate: string, endDate: string) {
    loading.value = true
    error.value = null
    try {
      return await financeServiceAdapter.getPeriodProfitLoss(startDate, endDate)
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  // ============================================================
  // Tutup Buku (Closing Period)
  // ============================================================

  async function getClosingPeriods(): Promise<ClosingPeriod[]> {
    loading.value = true
    error.value = null
    try {
      return await financeServiceAdapter.getClosingPeriods()
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function getClosingPeriod(id: string): Promise<ClosingPeriod | null> {
    loading.value = true
    error.value = null
    try {
      return await financeServiceAdapter.getClosingPeriod(id)
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function closePeriod(input: ClosePeriodInput): Promise<string> {
    loading.value = true
    error.value = null
    try {
      return await financeServiceAdapter.closePeriod(input)
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function reopenPeriod(closingId: string): Promise<void> {
    loading.value = true
    error.value = null
    try {
      await financeServiceAdapter.reopenPeriod(closingId)
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function deletePeriod(closingId: string): Promise<void> {
    loading.value = true
    error.value = null
    try {
      await financeServiceAdapter.deletePeriod(closingId)
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  /** Apakah tanggal berada di periode yang sudah ditutup. */
  async function checkPeriodClosed(date: string): Promise<boolean> {
    try {
      return await financeServiceAdapter.checkPeriodClosed(date)
    } catch (e: any) {
      error.value = e.message
      throw e
    }
  }

  return {
    accounts,
    journals,
    loading,
    error,
    seedAccounts,
    fetchAccounts,
    createAccount,
    updateAccount,
    deleteAccount,
    fetchJournals,
    getJournal,
    createJournal,
    deleteJournal,
    getAccountBalances,
    getTrialBalanceWorksheet,
    postAdjustingJournal,
    getLedger,
    getCashFlow,
    getRealisedProfit,
    getProfitSummary,
    getPeriodActivity,
    getFinancialStatements,
    getPeriodProfitLoss,
    getClosingPeriods,
    getClosingPeriod,
    closePeriod,
    reopenPeriod,
    deletePeriod,
    checkPeriodClosed,
  }
})
