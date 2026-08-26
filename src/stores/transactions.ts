import { defineStore } from 'pinia'
import { ref } from 'vue'
import { sqliteTransactionsService } from '@/services/sqlite/transactions'
import type { Transaction, TransactionInput } from '@/types/database'

export const useTransactionsStore = defineStore('transactions', () => {
  const transactions = ref<Transaction[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchTransactions() {
    loading.value = true
    error.value = null
    try {
      transactions.value = await sqliteTransactionsService.getAll()
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function getTransaction(id: string) {
    loading.value = true
    error.value = null
    try {
      return await sqliteTransactionsService.getById(id)
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
      const id = await sqliteTransactionsService.create(input)
      // Optimistic: ambil transaksi baru & prepend ke local array (tanpa refetch semua)
      const newTxn = await sqliteTransactionsService.getById(id)
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
      const paymentId = await sqliteTransactionsService.addPayment(
        transactionId,
        amount,
        paymentMethod,
        notes
      )
      // Update local state: refresh transaksi terkait
      const index = transactions.value.findIndex((t) => t.id === transactionId)
      if (index !== -1) {
        const updated = await sqliteTransactionsService.getById(transactionId)
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
      await sqliteTransactionsService.delete(id)
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
      await sqliteTransactionsService.voidTransaction(id)
      transactions.value = transactions.value.map((t) =>
        t.id === id ? { ...t, status: 'batal' } : t
      )
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
      return await sqliteTransactionsService.search(query)
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
      return await sqliteTransactionsService.getByCustomer(customerId)
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
    fetchTransactions,
    getTransaction,
    createTransaction,
    addPayment,
    deleteTransaction,
    voidTransaction,
    searchTransactions,
    getTransactionsByCustomer,
  }
})