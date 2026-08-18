import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'

export interface StockMovement {
  id: string
  product_id: string
  product?: any
  movement_type: 'in' | 'out' | 'adjustment' | 'opname' | 'return'
  quantity: number
  quantity_before: number
  quantity_after: number
  reference_type?: string
  reference_id?: string
  notes?: string
  created_at: string
  created_by?: string
}

export interface StockAdjustment {
  id: string
  product_id: string
  product?: any
  adjustment_type: 'add' | 'subtract' | 'correction'
  quantity_before: number
  quantity_after: number
  quantity_change: number
  reason: string
  notes?: string
  created_at: string
  created_by?: string
}

export interface StockOpname {
  id: string
  opname_number: string
  opname_date: string
  status: 'draft' | 'completed' | 'cancelled'
  notes?: string
  created_at: string
  completed_at?: string
  items?: StockOpnameItem[]
}

export interface StockOpnameItem {
  id: string
  opname_id: string
  product_id: string
  product?: any
  system_quantity: number
  actual_quantity: number
  difference: number
  notes?: string
}

export interface StockAlert {
  id: string
  product_id: string
  product?: any
  minimum_stock: number
  alert_enabled: boolean
  created_at: string
  updated_at: string
}

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
      let query = supabase
        .from('stock_movements')
        .select('*, product:products(*)')
        .order('created_at', { ascending: false })

      if (filters?.product_id) {
        query = query.eq('product_id', filters.product_id)
      }
      if (filters?.movement_type) {
        query = query.eq('movement_type', filters.movement_type)
      }
      if (filters?.start_date) {
        query = query.gte('created_at', filters.start_date)
      }
      if (filters?.end_date) {
        query = query.lte('created_at', filters.end_date)
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError
      movements.value = data || []
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
      let query = supabase
        .from('stock_adjustments')
        .select('*, product:products(*)')
        .order('created_at', { ascending: false })

      if (productId) {
        query = query.eq('product_id', productId)
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError
      adjustments.value = data || []
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
      const { data, error: fetchError } = await supabase
        .from('stock_opnames')
        .select(`
          *,
          items:stock_opname_items(*, product:products(*))
        `)
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError
      opnames.value = data || []
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
      const { data, error: fetchError } = await supabase
        .from('stock_alerts')
        .select('*, product:products(*)')
        .eq('alert_enabled', true)
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError
      alerts.value = data || []
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
      const { data, error: insertError } = await supabase
        .from('stock_adjustments')
        .insert(adjustment)
        .select()
        .single()

      if (insertError) throw insertError

      await supabase
        .from('products')
        .update({ stock: adjustment.quantity_after })
        .eq('id', adjustment.product_id)

      const { error: movementError } = await supabase
        .from('stock_movements')
        .insert({
          product_id: adjustment.product_id,
          movement_type: 'adjustment',
          quantity: Math.abs(adjustment.quantity_change),
          quantity_before: adjustment.quantity_before,
          quantity_after: adjustment.quantity_after,
          reference_type: 'adjustment',
          reference_id: data.id,
          notes: `${adjustment.reason}${adjustment.notes ? ' - ' + adjustment.notes : ''}`
        })

      if (movementError) throw movementError

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
    opname_number: string
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
      const { data: opnameData, error: opnameError } = await supabase
        .from('stock_opnames')
        .insert({
          opname_number: opname.opname_number,
          opname_date: opname.opname_date,
          notes: opname.notes,
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .select()
        .single()

      if (opnameError) throw opnameError

      const itemsToInsert = opname.items.map(item => ({
        opname_id: opnameData.id,
        product_id: item.product_id,
        system_quantity: item.system_quantity,
        actual_quantity: item.actual_quantity,
        difference: item.difference,
        notes: item.notes
      }))

      const { error: itemsError } = await supabase
        .from('stock_opname_items')
        .insert(itemsToInsert)

      if (itemsError) throw itemsError

      for (const item of opname.items) {
        if (item.difference !== 0) {
          await supabase
            .from('products')
            .update({ stock: item.actual_quantity })
            .eq('id', item.product_id)

          await supabase
            .from('stock_movements')
            .insert({
              product_id: item.product_id,
              movement_type: 'opname',
              quantity: Math.abs(item.difference),
              quantity_before: item.system_quantity,
              quantity_after: item.actual_quantity,
              reference_type: 'opname',
              reference_id: opnameData.id,
              notes: `Stock Opname ${opname.opname_number}${item.notes ? ' - ' + item.notes : ''}`
            })
        }
      }

      return opnameData
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
      const { data, error: upsertError } = await supabase
        .from('stock_alerts')
        .upsert({
          product_id: productId,
          minimum_stock: minimumStock,
          alert_enabled: true
        }, {
          onConflict: 'product_id,user_id'
        })
        .select()

      if (upsertError) throw upsertError

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
      const { error: movementError } = await supabase
        .from('stock_movements')
        .insert(movement)

      if (movementError) throw movementError
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
