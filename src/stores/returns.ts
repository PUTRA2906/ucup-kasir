import { defineStore } from 'pinia'
import { ref } from 'vue'
import { returnsServiceAdapter } from '@/services'
import type { TransactionReturn, ReturnItemInput } from '@/types/database'

export const useReturnsStore = defineStore('returns', () => {
  const returns = ref<TransactionReturn[]>([])
  const linkedReturns = ref<TransactionReturn[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchReturns(transactionId: string) {
    loading.value = true
    error.value = null
    try {
      returns.value = await returnsServiceAdapter.getByTransaction(transactionId)
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function fetchLinkedReturns(transactionId: string) {
    try {
      linkedReturns.value = await returnsServiceAdapter.getLinkedReturns(transactionId)
    } catch (e: any) {
      // non-critical, silently fail
      linkedReturns.value = []
    }
  }

  async function fetchReturnsForNewTransaction(transactionId: string) {
    try {
      const data = await returnsServiceAdapter.getReturnsForNewTransaction(transactionId)
      // Gabungkan ke linkedReturns agar bisa diproses oleh allReturnItems
      linkedReturns.value = [...linkedReturns.value, ...data]
    } catch (e: any) {
      // non-critical, silently fail
    }
  }

  async function createReturn(
    transactionId: string,
    items: ReturnItemInput[],
    notes?: string
  ) {
    loading.value = true
    error.value = null
    try {
      const id = await returnsServiceAdapter.createReturn(transactionId, items, notes)
      await fetchReturns(transactionId)
      return id
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function deleteReturn(id: string, transactionId: string) {
    loading.value = true
    error.value = null
    try {
      await returnsServiceAdapter.deleteReturn(id)
      await fetchReturns(transactionId)
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  async function fetchAllReturns() {
    loading.value = true
    error.value = null
    try {
      returns.value = await returnsServiceAdapter.getAll()
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  return {
    returns,
    linkedReturns,
    loading,
    error,
    fetchReturns,
    fetchLinkedReturns,
    fetchReturnsForNewTransaction,
    fetchAllReturns,
    createReturn,
    deleteReturn,
  }
})