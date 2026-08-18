import { defineStore } from 'pinia'
import { ref } from 'vue'
import { returnsService } from '@/services/returns'
import type { TransactionReturn, ReturnItemInput } from '@/types/database'

export const useReturnsStore = defineStore('returns', () => {
  const returns = ref<TransactionReturn[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchReturns(transactionId: string) {
    loading.value = true
    error.value = null
    try {
      returns.value = await returnsService.getByTransaction(transactionId)
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
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
      const id = await returnsService.createReturn(transactionId, items, notes)
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
      await returnsService.deleteReturn(id)
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
      returns.value = await returnsService.getAll()
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  return {
    returns,
    loading,
    error,
    fetchReturns,
    fetchAllReturns,
    createReturn,
    deleteReturn,
  }
})
