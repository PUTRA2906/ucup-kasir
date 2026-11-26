import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  stockServiceAdapter,
  type StockMovement,
  type StockAdjustment,
  type StockOpname,
  type StockAlert,
} from '@/services'
import { cachedQuery, variantOf } from '@/lib/queryCache'

export const useStockStore = defineStore('stock', () => {
  const movements = ref<StockMovement[]>([])
  const adjustments = ref<StockAdjustment[]>([])
  const opnames = ref<StockOpname[]>([])
  const alerts = ref<StockAlert[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const fetchMovements = async (filters?: {
    product_id?: string
    movement_type?: string
    start_date?: string
    end_date?: string
  }) => {
    loading.value = true
    error.value = null
    try {
      movements.value = await cachedQuery(
        'stock',
        `movements:${variantOf([filters])}`,
        () => stockServiceAdapter.fetchMovements(filters),
      )
    } catch (e: any) {
      error.value = e.message
      console.error('Error fetching stock movements:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  const fetchAdjustments = async (productId?: string) => {
    loading.value = true
    error.value = null
    try {
      adjustments.value = await cachedQuery(
        'stock',
        `adjustments:${variantOf([productId])}`,
        () => stockServiceAdapter.fetchAdjustments(productId),
      )
    } catch (e: any) {
      error.value = e.message
      console.error('Error fetching stock adjustments:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  const fetchOpnames = async () => {
    loading.value = true
    error.value = null
    try {
      opnames.value = await cachedQuery(
        'stock',
        'opnames',
        () => stockServiceAdapter.fetchOpnames(),
      )
    } catch (e: any) {
      error.value = e.message
      console.error('Error fetching stock opnames:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  const fetchStockAlerts = async () => {
    loading.value = true
    error.value = null
    try {
      alerts.value = await cachedQuery(
        'stock',
        'alerts',
        () => stockServiceAdapter.fetchStockAlerts(),
      )
    } catch (e: any) {
      error.value = e.message
      console.error('Error fetching stock alerts:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  const createAdjustment = async (adjustment: {
    product_id: string
    adjustment_type: 'add' | 'subtract' | 'correction'
    quantity_before: number
    quantity_after: number
    quantity_change: number
    reason: string
    notes?: string
  }) => {
    loading.value = true
    error.value = null
    try {
      const data = await stockServiceAdapter.createAdjustment(adjustment)
      adjustments.value.unshift(data)
      return data
    } catch (e: any) {
      error.value = e.message
      console.error('Error creating stock adjustment:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  const createOpname = async (opname: {
    opname_number?: string
    opname_date: string
    notes?: string
    items: Array<{
      product_id: string
      system_quantity: number
      actual_quantity: number
      difference: number
      notes?: string
    }>
  }) => {
    loading.value = true
    error.value = null
    try {
      const data = await stockServiceAdapter.createOpname(opname)
      opnames.value.unshift(data)
      return data
    } catch (e: any) {
      error.value = e.message
      console.error('Error creating stock opname:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  const setMinimumStock = async (productId: string, minimumStock: number) => {
    loading.value = true
    error.value = null
    try {
      const data = await stockServiceAdapter.setMinimumStock(productId, minimumStock)
      // Refresh/update alerts list
      const idx = alerts.value.findIndex(a => a.product_id === productId)
      if (idx !== -1) {
        alerts.value[idx] = data
      } else {
        alerts.value.unshift(data)
      }
      return data
    } catch (e: any) {
      error.value = e.message
      console.error('Error setting minimum stock:', e)
      throw e
    } finally {
      loading.value = false
    }
  }

  const importStock = async (
    rows: Record<string, string>[]
  ): Promise<{ updated: number; skipped: number; errors: string[] }> => {
    loading.value = true
    error.value = null
    try {
      return await stockServiceAdapter.importStockFromCsv(rows)
    } catch (e: any) {
      error.value = e.message
      throw e
    } finally {
      loading.value = false
    }
  }

  return {
    movements,
    adjustments,
    opnames,
    alerts,
    loading,
    error,
    fetchMovements,
    fetchAdjustments,
    fetchOpnames,
    fetchStockAlerts,
    createAdjustment,
    createOpname,
    setMinimumStock,
    importStock
  }
})