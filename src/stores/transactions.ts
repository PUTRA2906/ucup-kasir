import { defineStore } from 'pinia'
import { ref } from 'vue'
import { transactionsService } from '@/services/transactions'
import type { Transaction, TransactionInput } from '@/types/database'

export const useTransactionsStore = defineStore('transactions', () => {
  const transactions = ref<Transaction[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchTransactions() {
    loading.value = true
    error.value = null
    try {
      transactions.value = await transactionsService.getAll()
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
      return await transactionsService.getById(id)
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
      const id = await transactionsService.create(input)
      await fetchTransactions()
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
      const paymentId = await transactionsService.addPayment(
        transactionId,
        amount,
        paymentMethod,
        notes
      )
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
      await transactionsService.delete(id)
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
      await transactionsService.voidTransaction(id)
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
      return await transactionsService.search(query)
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
      return await transactionsService.getByCustomer(customerId)
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
