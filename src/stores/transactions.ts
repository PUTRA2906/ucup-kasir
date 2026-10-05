import { defineStore } from 'pinia'
import { ref } from 'vue'
import { transactionsServiceAdapter } from '@/services'
import type { Transaction, TransactionInput, TransactionStatus } from '@/types/database'

export const useTransactionsStore = defineStore('transactions', () => {
  const transactions = ref<Transaction[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // State untuk server-side pagination
  const paginatedTransactions = ref<Transaction[]>([])
  const paginationTotal = ref(0)
  const paginationPage = ref(1)
  const paginationPerPage = ref(20)
  const paginationLoading = ref(false)

  async function fetchTransactions() {
    loading.value = true
    error.value = null
    try {
      transactions.value = await transactionsServiceAdapter.getAll()
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function fetchTransactionsPaginated(
    page: number,
    perPage: number,
    filters?: {
      search?: string
      paymentStatus?: string
      transactionStatus?: string
      recordStatus?: string
      paymentMethod?: string
      customer?: string
      dateFrom?: string
      dateTo?: string
      minAmount?: number
      maxAmount?: number
      sortOrder?: string
    }
  ) {
    paginationLoading.value = true
    error.value = null
    try {
      const result = await transactionsServiceAdapter.getPaginated(page, perPage, filters)
      paginatedTransactions.value = result.data
      paginationTotal.value = result.count
      paginationPage.value = page
      paginationPerPage.value = perPage
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      paginationLoading.value = false
    }
  }

  async function getTransaction(id: string) {
    loading.value = true
    error.value = null
    try {
      return await transactionsServiceAdapter.getById(id)
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function createTransaction(input: TransactionInput) {
    loading.value = true
    error.value = null
    try {
      const id = await transactionsServiceAdapter.create(input)
      // Optimistic: ambil transaksi baru & prepend ke local array (tanpa refetch semua)
      const newTxn = await transactionsServiceAdapter.getById(id)
      if (newTxn) {
        transactions.value.unshift(newTxn)
      }
      return id
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function addPayment(
    transactionId: string,
    amount: number,
    paymentMethod: string,
    notes?: string
  ) {
    loading.value = true
    error.value = null
    try {
      const paymentId = await transactionsServiceAdapter.addPayment(
        transactionId,
        amount,
        paymentMethod,
        notes
      )
      // Update local state: refresh transaksi terkait
      const index = transactions.value.findIndex((t) => t.id === transactionId)
      if (index !== -1) {
        const updated = await transactionsServiceAdapter.getById(transactionId)
        if (updated) transactions.value[index] = updated
      }
      return paymentId
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function deleteTransaction(id: string) {
    loading.value = true
    error.value = null
    try {
      await transactionsServiceAdapter.delete(id)
      transactions.value = transactions.value.filter((t) => t.id !== id)
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function voidTransaction(id: string) {
    loading.value = true
    error.value = null
    try {
      await transactionsServiceAdapter.void(id)
      const index = transactions.value.findIndex((t) => t.id === id)
      if (index !== -1) {
        const updated = await transactionsServiceAdapter.getById(id)
        if (updated) transactions.value[index] = updated
      }
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }


  async function searchTransactions(query: string) {
    loading.value = true
    error.value = null
    try {
      return await transactionsServiceAdapter.search(query)
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function getTransactionsByCustomer(customerId: string) {
    loading.value = true
    error.value = null
    try {
      return await transactionsServiceAdapter.getByCustomer(customerId)
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function importTransactions(
    rows: Record<string, string>[],
    headers: string[]
  ): Promise<{ created: number; skipped: number; errors: string[] }> {
    loading.value = true
    error.value = null
    try {
      return await transactionsServiceAdapter.importFromCsv(rows, headers)
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  /** Ubah status transaksi (disiapkan/dikirim/selesai) & update local state. */
  async function updateTransactionStatus(transactionId: string, transactionStatus: TransactionStatus) {
    loading.value = true
    error.value = null
    try {
      await transactionsServiceAdapter.updateStatus(transactionId, transactionStatus)
      const index = transactions.value.findIndex((t) => t.id === transactionId)
      if (index !== -1) {
        const updated = await transactionsServiceAdapter.getById(transactionId)
        if (updated) transactions.value[index] = updated
      }
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  return {
    transactions,
    loading,
    error,
    // Pagination state
    paginatedTransactions,
    paginationTotal,
    paginationPage,
    paginationPerPage,
    paginationLoading,
    fetchTransactions,
    fetchTransactionsPaginated,
    getTransaction,
    createTransaction,
    addPayment,
    deleteTransaction,
    voidTransaction,
    updateTransactionStatus,
    searchTransactions,
    getTransactionsByCustomer,
    importTransactions,
  }
})