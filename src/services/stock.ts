import { supabase } from '@/lib/supabase'
import type { Product } from '@/types/database'

// ============================================================
// Supabase Service: Stock
// Mengelola stock_movements, stock_adjustments, stock_opnames, stock_alerts
// RLS menangani filtering user_id (auth.uid())
// ============================================================

export interface StockMovement {
  id: string
  user_id?: string
  product_id: string
  product?: Pick<Product, 'id' | 'name' | 'sku' | 'price_sell' | 'stock'>
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
  user_id?: string
  product_id: string
  product?: Pick<Product, 'id' | 'name' | 'sku' | 'price_sell' | 'stock'>
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
  user_id?: string
  opname_number: string
  opname_date: string
  status: 'draft' | 'completed' | 'cancelled'
  notes?: string
  created_at: string
  completed_at?: string
  created_by?: string
  items?: StockOpnameItem[]
}

export interface StockOpnameItem {
  id: string
  user_id?: string
  opname_id: string
  product_id: string
  product?: Pick<Product, 'id' | 'name' | 'sku' | 'price_sell' | 'stock'>
  system_quantity: number
  actual_quantity: number
  difference: number
  notes?: string
  created_at?: string
}

export interface StockAlert {
  id: string
  user_id?: string
  product_id: string
  product?: Pick<Product, 'id' | 'name' | 'sku' | 'price_sell' | 'stock'>
  minimum_stock: number
  alert_enabled: boolean
  created_at: string
  updated_at: string
}

export const stockService = {
  // ============================================================
  // Stock Movements
  // ============================================================

  async fetchMovements(filters?: {
    product_id?: string
    movement_type?: string
    start_date?: string
    end_date?: string
  }): Promise<StockMovement[]> {
    let query = supabase
      .from('stock_movements')
      .select(`
        *,
        product:products(id, name, sku, price_sell, stock)
      `)

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

    query = query.order('created_at', { ascending: false })

    const { data, error } = await query

    if (error) throw error
    return (data || []).map((r: any) => this.mapMovement(r))
  },

  async fetchMovementsByProduct(productId: string): Promise<StockMovement[]> {
    return this.fetchMovements({ product_id: productId })
  },

  // ============================================================
  // Stock Adjustments
  // ============================================================

  async fetchAdjustments(productId?: string): Promise<StockAdjustment[]> {
    let query = supabase
      .from('stock_adjustments')
      .select(`
        *,
        product:products(id, name, sku, price_sell, stock)
      `)

    if (productId) {
      query = query.eq('product_id', productId)
    }

    query = query.order('created_at', { ascending: false })

    const { data, error } = await query

    if (error) throw error
    return (data || []).map((r: any) => this.mapAdjustment(r))
  },

  /**
   * Buat adjustment stok manual secara atomik di Supabase:
   * 1. Simpan record stock_adjustments
   * 2. Update stok produk (trigger record_stock_movement otomatis mencatat stock_movements)
   */
  async createAdjustment(adjustment: {
    product_id: string
    adjustment_type: 'add' | 'subtract' | 'correction'
    quantity_before: number
    quantity_after: number
    quantity_change: number
    reason: string
    notes?: string
  }): Promise<StockAdjustment> {
    const { data, error } = await supabase.rpc('create_stock_adjustment', {
      p_product_id: adjustment.product_id,
      p_adjustment_type: adjustment.adjustment_type,
      p_quantity_before: adjustment.quantity_before,
      p_quantity_after: adjustment.quantity_after,
      p_quantity_change: adjustment.quantity_change,
      p_reason: adjustment.reason,
      p_notes: adjustment.notes || null,
    })

    if (error) throw error

    // Ambil ulang adjustment yang baru dibuat untuk dikembalikan
    const created = await this.getAdjustmentById(data as string)
    if (created) return created

    // Fallback: kembalikan objek dari input (tanpa id asli)
    return {
      id: data as string,
      ...adjustment,
      created_at: new Date().toISOString(),
    }
  },

  async getAdjustmentById(id: string): Promise<StockAdjustment | null> {
    const { data, error } = await supabase
      .from('stock_adjustments')
      .select(`
        *,
        product:products(id, name, sku, price_sell, stock)
      `)
      .eq('id', id)
      .single()

    if (error) throw error
    return this.mapAdjustment(data)
  },

  // ============================================================
  // Stock Opnames
  // ============================================================

  async fetchOpnames(): Promise<StockOpname[]> {
    const { data, error } = await supabase
      .from('stock_opnames')
      .select(`
        *,
        items:stock_opname_items(
          *,
          product:products(id, name, sku, price_sell, stock)
        )
      `)
      .order('created_at', { ascending: false })

    if (error) throw error
    return (data || []).map((r: any) => this.mapOpname(r))
  },

  async fetchOpnameItems(opnameId: string): Promise<StockOpnameItem[]> {
    const { data, error } = await supabase
      .from('stock_opname_items')
      .select(`
        *,
        product:products(id, name, sku, price_sell, stock)
      `)
      .eq('opname_id', opnameId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return (data || []).map((r: any) => this.mapOpnameItem(r))
  },

  /**
   * Buat opname stok secara atomik di Supabase:
   * 1. Simpan header opname (status = 'completed')
   * 2. Simpan items
   * 3. Update stok produk (trigger mencatat stock_movements)
   */
  async createOpname(opname: {
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
  }): Promise<StockOpname> {
    const { data, error } = await supabase.rpc('create_stock_opname', {
      p_opname_number: opname.opname_number || null,
      p_opname_date: opname.opname_date,
      p_notes: opname.notes || null,
      p_items: opname.items,
    })

    if (error) throw error

    const created = await this.getOpnameById(data as string)
    if (created) return created

    // Fallback: kembalikan objek minimal
    return {
      id: data as string,
      opname_number: opname.opname_number || `OPN-${data as string}`,
      opname_date: opname.opname_date,
      status: 'completed',
      notes: opname.notes,
      items: opname.items.map((i) => ({
        id: '',
        opname_id: data as string,
        product_id: i.product_id,
        system_quantity: i.system_quantity,
        actual_quantity: i.actual_quantity,
        difference: i.difference,
        notes: i.notes,
      })),
      created_at: new Date().toISOString(),
    }
  },

  async getOpnameById(id: string): Promise<StockOpname | null> {
    const { data, error } = await supabase
      .from('stock_opnames')
      .select(`
        *,
        items:stock_opname_items(
          *,
          product:products(id, name, sku, price_sell, stock)
        )
      `)
      .eq('id', id)
      .single()

    if (error) throw error
    return this.mapOpname(data)
  },

  // ============================================================
  // Stock Alerts (minimum stock)
  // ============================================================

  async fetchStockAlerts(): Promise<StockAlert[]> {
    const { data, error } = await supabase
      .from('stock_alerts')
      .select(`
        *,
        product:products(id, name, sku, price_sell, stock)
      `)
      .eq('alert_enabled', true)
      .order('created_at', { ascending: false })

    if (error) throw error
    return (data || []).map((r: any) => this.mapAlert(r))
  },

  /**
   * Set / update minimum stock untuk suatu produk (upsert via PostgreSQL).
   */
  async setMinimumStock(productId: string, minimumStock: number): Promise<StockAlert> {
    // Upsert: cek dulu apakah sudah ada untuk produk ini
    const { data: existing, error: findError } = await supabase
      .from('stock_alerts')
      .select('*')
      .eq('product_id', productId)
      .maybeSingle()

    if (findError) throw findError

    const now = new Date().toISOString()

    if (existing) {
      const { data, error } = await supabase
        .from('stock_alerts')
        .update({
          minimum_stock: minimumStock,
          alert_enabled: true,
          updated_at: now,
        })
        .eq('id', existing.id)
        .select(`
          *,
          product:products(id, name, sku, price_sell, stock)
        `)
        .single()

      if (error) throw error
      return this.mapAlert(data)
    }

    const { data, error } = await supabase
      .from('stock_alerts')
      .insert({
        product_id: productId,
        minimum_stock: minimumStock,
        alert_enabled: true,
        created_at: now,
        updated_at: now,
      })
      .select(`
        *,
        product:products(id, name, sku, price_sell, stock)
      `)
      .single()

    if (error) throw error
    return this.mapAlert(data)
  },

  // ============================================================
  // Internal helpers
  // ============================================================

  mapMovement(r: any): StockMovement {
    const product = r.product
      ? { id: r.product_id, name: r.product.name, sku: r.product.sku, price_sell: r.product.price_sell, stock: r.product.stock }
      : undefined
    return {
      id: r.id,
      user_id: r.user_id,
      product_id: r.product_id,
      product,
      movement_type: r.movement_type,
      quantity: r.quantity,
      quantity_before: r.quantity_before,
      quantity_after: r.quantity_after,
      reference_type: r.reference_type ?? undefined,
      reference_id: r.reference_id ?? undefined,
      notes: r.notes ?? undefined,
      created_at: r.created_at,
      created_by: r.created_by ?? undefined,
    }
  },

  mapAdjustment(r: any): StockAdjustment {
    const product = r.product
      ? { id: r.product_id, name: r.product.name, sku: r.product.sku, price_sell: r.product.price_sell, stock: r.product.stock }
      : undefined
    return {
      id: r.id,
      user_id: r.user_id,
      product_id: r.product_id,
      product,
      adjustment_type: r.adjustment_type,
      quantity_before: r.quantity_before,
      quantity_after: r.quantity_after,
      quantity_change: r.quantity_change,
      reason: r.reason,
      notes: r.notes ?? undefined,
      created_at: r.created_at,
      created_by: r.created_by ?? undefined,
    }
  },

  mapOpname(r: any): StockOpname {
    return {
      id: r.id,
      user_id: r.user_id,
      opname_number: r.opname_number,
      opname_date: r.opname_date,
      status: r.status,
      notes: r.notes ?? undefined,
      created_at: r.created_at,
      completed_at: r.completed_at ?? undefined,
      created_by: r.created_by ?? undefined,
      items: (r.items || []).map((i: any) => this.mapOpnameItem(i)),
    }
  },

  mapOpnameItem(r: any): StockOpnameItem {
    const product = r.product
      ? { id: r.product_id, name: r.product.name, sku: r.product.sku, price_sell: r.product.price_sell, stock: r.product.stock }
      : undefined
    return {
      id: r.id,
      user_id: r.user_id,
      opname_id: r.opname_id,
      product_id: r.product_id,
      product,
      system_quantity: r.system_quantity,
      actual_quantity: r.actual_quantity,
      difference: r.difference,
      notes: r.notes ?? undefined,
      created_at: r.created_at,
    }
  },

  mapAlert(r: any): StockAlert {
    const product = r.product
      ? { id: r.product_id, name: r.product.name, sku: r.product.sku, price_sell: r.product.price_sell, stock: r.product.stock }
      : undefined
    return {
      id: r.id,
      user_id: r.user_id,
      product_id: r.product_id,
      product,
      minimum_stock: r.minimum_stock,
      alert_enabled: !!r.alert_enabled,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }
  },
}
