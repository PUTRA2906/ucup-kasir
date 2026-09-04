import { defineStore } from 'pinia'
import { ref } from 'vue'
import { financeServiceAdapter } from '@/services'
import type {
  Account,
  AccountInsert,
  AccountUpdate,
  AccountBalance,
  JournalEntry,
  JournalInput,
  LedgerEntry,
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
      accounts.value = await financeServiceAdapter.getAccounts()
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
      if (oldAccount && index !== -1) accounts.value.splice(index, 0, oldAccount)
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

  async function voidJournal(id: string) {
    loading.value = true
    error.value = null

    const index = journals.value.findIndex((j) => j.id === id)
    const oldJournal = index !== -1 ? { ...journals.value[index] } : null

    try {
      await financeServiceAdapter.voidJournal(id)
      if (index !== -1) journals.value[index].status = 'void'
    } catch (e: any) {
      if (oldJournal && index !== -1) journals.value[index] = oldJournal
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
      if (oldJournal && index !== -1) journals.value.splice(index, 0, oldJournal)
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
    voidJournal,
    deleteJournal,
    getAccountBalances,
    getLedger,
    getCashFlow,
  }
})
