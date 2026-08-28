import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  stockServiceAdapter,
  type StockMovement,
  type StockAdjustment,
  type StockOpname,
  type StockAlert,
} from '@/services'
import { isNativeApp } from '@/lib/platform'
import { run } from '@/lib/sqlite'
import { getCurrentUserId, uuid, nowIso, addToSyncQueue } from '@/services/sqlite/db'

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
      movements.value = await stockServiceAdapter.fetchMovements(filters)
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
      adjustments.value = await stockServiceAdapter.fetchAdjustments(productId)
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
      opnames.value = await stockServiceAdapter.fetchOpnames()
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
      alerts.value = await stockServiceAdapter.fetchStockAlerts()
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

  const recordStockMovement = async (movement: {
    product_id: string
    movement_type: 'in' | 'out' | 'return'
    quantity: number
    quantity_before: number
    quantity_after: number
    reference_type?: string
    reference_id?: string
    notes?: string
  }) => {
    try {
      // Di web (Supabase): movement stok otomatis dicatat oleh trigger
      // trigger_record_stock_movement saat kolom stock berubah,
      // jadi tidak perlu insert manual di sini.
      if (!isNativeApp()) {
        return
      }

      // Android: insert langsung ke SQLite dengan generate id & queue sync
      const userId = getCurrentUserId()
      const id = uuid()
      const now = nowIso()
      await run(
        `INSERT INTO stock_movements (id, user_id, product_id, movement_type, quantity,
                                      quantity_before, quantity_after, reference_type, reference_id,
                                      notes, created_at, created_by, sync_status, updated_at_local)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
        [id, userId, movement.product_id, movement.movement_type, movement.quantity,
         movement.quantity_before, movement.quantity_after, movement.reference_type ?? null,
         movement.reference_id ?? null, movement.notes ?? null, now, userId, now]
      )
      await addToSyncQueue('INSERT', 'stock_movements', id, {
        id,
        product_id: movement.product_id,
        movement_type: movement.movement_type,
        quantity: movement.quantity,
        quantity_before: movement.quantity_before,
        quantity_after: movement.quantity_after,
        reference_type: movement.reference_type,
        reference_id: movement.reference_id,
        notes: movement.notes,
        created_at: now,
        created_by: userId,
      })

      // Update local state
      movements.value.unshift({
        ...movement,
        id,
        product_id: movement.product_id,
        created_at: now,
        created_by: userId,
      })
    } catch (e: any) {
      console.error('Error recording stock movement:', e)
      throw e
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
    recordStockMovement
  }
})