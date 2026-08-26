import { query, queryOne, run, addToSyncQueue, transaction } from './db'
import { getCurrentUserId, uuid, nowIso, generateOpnameNumber } from './db'
import type { Product } from '@/types/database'

// ============================================================
// SQLite Service: Stock
// Mengelola stock_movements, stock_adjustments, stock_opnames, stock_alerts
// Semua operasi: filter user_id manual (pengganti RLS)
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

export const sqliteStockService = {
  // ============================================================
  // Stock Movements
  // ============================================================

  async fetchMovements(filters?: {
    product_id?: string
    movement_type?: string
    start_date?: string
    end_date?: string
  }): Promise<StockMovement[]> {
    const userId = getCurrentUserId()
    let sql = `SELECT sm.*, p.name AS product_name, p.sku AS product_sku
               FROM stock_movements sm
               LEFT JOIN products p ON p.id = sm.product_id AND p.user_id = sm.user_id
               WHERE sm.user_id = ?`
    const params: (string | number)[] = [userId]

    if (filters?.product_id) {
      sql += ' AND sm.product_id = ?'
      params.push(filters.product_id)
    }
    if (filters?.movement_type) {
      sql += ' AND sm.movement_type = ?'
      params.push(filters.movement_type)
    }
    if (filters?.start_date) {
      sql += ' AND sm.created_at >= ?'
      params.push(filters.start_date)
    }
    if (filters?.end_date) {
      sql += ' AND sm.created_at <= ?'
      params.push(filters.end_date)
    }

    sql += ' ORDER BY sm.created_at DESC'

    const rows = await query<any>(sql, params)
    return rows.map((r: any) => this.mapMovement(r))
  },

  async fetchMovementsByProduct(productId: string): Promise<StockMovement[]> {
    return this.fetchMovements({ product_id: productId })
  },

  // ============================================================
  // Stock Adjustments
  // ============================================================

  async fetchAdjustments(productId?: string): Promise<StockAdjustment[]> {
    const userId = getCurrentUserId()
    let sql = `SELECT sa.*, p.name AS product_name, p.sku AS product_sku
               FROM stock_adjustments sa
               LEFT JOIN products p ON p.id = sa.product_id AND p.user_id = sa.user_id
               WHERE sa.user_id = ?`
    const params: (string | number)[] = [userId]

    if (productId) {
      sql += ' AND sa.product_id = ?'
      params.push(productId)
    }

    sql += ' ORDER BY sa.created_at DESC'

    const rows = await query<any>(sql, params)
    return rows.map((r: any) => this.mapAdjustment(r))
  },

  /**
   * Buat adjustment stok manual:
   * 1. Update stok produk
   * 2. Simpan record adjustment
   * 3. Catat stock_movement (replikasi trigger record_stock_movement)
   * 4. Queue ke sync_queue
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
    const userId = getCurrentUserId()
    const id = uuid()
    const now = nowIso()

    await transaction(async (tx) => {
      // Update stok produk
      await tx.run(
        `UPDATE products SET stock = ?, updated_at = ?, sync_status = 'pending', updated_at_local = ?
         WHERE id = ? AND user_id = ?`,
        [adjustment.quantity_after, now, now, adjustment.product_id, userId]
      )

      // Simpan adjustment
      await tx.run(
        `INSERT INTO stock_adjustments (id, user_id, product_id, adjustment_type, quantity_before,
                                        quantity_after, quantity_change, reason, notes, created_at, created_by,
                                        sync_status, updated_at_local)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
        [
          id, userId, adjustment.product_id, adjustment.adjustment_type,
          adjustment.quantity_before, adjustment.quantity_after,
          adjustment.quantity_change, adjustment.reason, adjustment.notes ?? null,
          now, userId, now,
        ]
      )

      // Catat stock_movement
      await tx.run(
        `INSERT INTO stock_movements (id, user_id, product_id, movement_type, quantity,
                                      quantity_before, quantity_after, reference_type, reference_id,
                                      notes, created_at, created_by, sync_status, updated_at_local)
         VALUES (?, ?, ?, 'adjustment', ?, ?, ?, 'adjustment', ?, ?, ?, ?, 'pending', ?)`,
        [
          uuid(), userId, adjustment.product_id,
          Math.abs(adjustment.quantity_change),
          adjustment.quantity_before, adjustment.quantity_after,
          id,
          `${adjustment.reason}${adjustment.notes ? ' - ' + adjustment.notes : ''}`,
          now, userId, now,
        ]
      )
    })

    await addToSyncQueue('INSERT', 'stock_adjustments', id, {
      id,
      product_id: adjustment.product_id,
      adjustment_type: adjustment.adjustment_type,
      quantity_before: adjustment.quantity_before,
      quantity_after: adjustment.quantity_after,
      quantity_change: adjustment.quantity_change,
      reason: adjustment.reason,
      notes: adjustment.notes ?? null,
      created_at: now,
      created_by: userId,
    })
    return {
      id, user_id: userId, ...adjustment,
      created_at: now, created_by: userId,
    }
  },

  // ============================================================
  // Stock Opnames
  // ============================================================

  async fetchOpnames(): Promise<StockOpname[]> {
    const userId = getCurrentUserId()
    const rows = await query<any>(
      `SELECT * FROM stock_opnames WHERE user_id = ? ORDER BY created_at DESC`,
      [userId]
    )
    return Promise.all(rows.map(async (r: any) => {
      const op = this.mapOpname(r)
      op.items = await this.fetchOpnameItems(r.id)
      return op
    }))
  },

  async fetchOpnameItems(opnameId: string): Promise<StockOpnameItem[]> {
    const userId = getCurrentUserId()
    const rows = await query<any>(
      `SELECT soi.*, p.name AS product_name, p.sku AS product_sku
       FROM stock_opname_items soi
       LEFT JOIN products p ON p.id = soi.product_id AND p.user_id = soi.user_id
       WHERE soi.opname_id = ? AND soi.user_id = ?
       ORDER BY soi.created_at ASC`,
      [opnameId, userId]
    )
    return rows.map((r: any) => this.mapOpnameItem(r))
  },

  /**
   * Buat opname stok:
   * 1. Simpan header opname (status = 'completed')
   * 2. Simpan items
   * 3. Update stok produk (jika difference ≠ 0)
   * 4. Catat stock_movement per item
   * 5. Queue ke sync_queue
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
    const userId = getCurrentUserId()
    const id = uuid()
    const now = nowIso()
    const opnameNumber = opname.opname_number || generateOpnameNumber()

    await transaction(async (tx) => {
      // Header
      await tx.run(
        `INSERT INTO stock_opnames (id, user_id, opname_number, opname_date, status, notes, created_at, completed_at, created_by, sync_status, updated_at_local)
         VALUES (?, ?, ?, ?, 'completed', ?, ?, ?, ?, 'pending', ?)`,
        [id, userId, opnameNumber, opname.opname_date, opname.notes ?? null, now, now, userId, now]
      )

      for (const item of opname.items) {
        const itemId = uuid()
        await tx.run(
          `INSERT INTO stock_opname_items (id, user_id, opname_id, product_id, system_quantity, actual_quantity, difference, notes, created_at, sync_status, updated_at_local)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
          [itemId, userId, id, item.product_id, item.system_quantity, item.actual_quantity, item.difference, item.notes ?? null, now, now]
        )

        if (item.difference !== 0) {
          // Update stok
          await tx.run(
            `UPDATE products SET stock = ?, updated_at = ?, sync_status = 'pending', updated_at_local = ?
             WHERE id = ? AND user_id = ?`,
            [item.actual_quantity, now, now, item.product_id, userId]
          )

          // Catat stock_movement
          await tx.run(
            `INSERT INTO stock_movements (id, user_id, product_id, movement_type, quantity,
                                          quantity_before, quantity_after, reference_type, reference_id,
                                          notes, created_at, created_by, sync_status, updated_at_local)
             VALUES (?, ?, ?, 'opname', ?, ?, ?, 'opname', ?, ?, ?, ?, 'pending', ?)`,
            [
              uuid(), userId, item.product_id,
              Math.abs(item.difference),
              item.system_quantity, item.actual_quantity,
              id,
              `Stock Opname ${opnameNumber}${item.notes ? ' - ' + item.notes : ''}`,
              now, userId, now,
            ]
          )
        }
      }
    })

    const created = await this.getOpnameById(id)
    if (created) await addToSyncQueue('INSERT', 'stock_opnames', id, created)
    return created!
  },

  async getOpnameById(id: string): Promise<StockOpname | null> {
    const userId = getCurrentUserId()
    const row = await queryOne<any>(
      `SELECT * FROM stock_opnames WHERE id = ? AND user_id = ?`,
      [id, userId]
    )
    if (!row) return null
    const op = this.mapOpname(row)
    op.items = await this.fetchOpnameItems(id)
    return op
  },

  // ============================================================
  // Stock Alerts (minimum stock)
  // ============================================================

  async fetchStockAlerts(): Promise<StockAlert[]> {
    const userId = getCurrentUserId()
    const rows = await query<any>(
      `SELECT sa.*, p.name AS product_name, p.sku AS product_sku
       FROM stock_alerts sa
       LEFT JOIN products p ON p.id = sa.product_id AND p.user_id = sa.user_id
       WHERE sa.user_id = ? AND sa.alert_enabled = 1
       ORDER BY sa.created_at DESC`,
      [userId]
    )
    return rows.map((r: any) => this.mapAlert(r))
  },

  /**
   * Set / update minimum stock untuk suatu produk (upsert).
   * Karena SQLite tidak punya ON CONFLICT, kita cek dulu.
   */
  async setMinimumStock(productId: string, minimumStock: number): Promise<StockAlert> {
    const userId = getCurrentUserId()
    const now = nowIso()

    const existing = await queryOne<any>(
      `SELECT * FROM stock_alerts WHERE product_id = ? AND user_id = ?`,
      [productId, userId]
    )

    if (existing) {
      await run(
        `UPDATE stock_alerts SET minimum_stock = ?, alert_enabled = 1, updated_at = ?, sync_status = 'pending', updated_at_local = ?
         WHERE id = ? AND user_id = ?`,
        [minimumStock, now, now, existing.id, userId]
      )
      await addToSyncQueue('UPDATE', 'stock_alerts', existing.id, {
        ...existing, minimum_stock: minimumStock, alert_enabled: true, updated_at: now,
      })
      return {
        id: existing.id,
        user_id: userId,
        product_id: productId,
        minimum_stock: minimumStock,
        alert_enabled: true,
        created_at: existing.created_at,
        updated_at: now,
      }
    } else {
      const id = uuid()
      await run(
        `INSERT INTO stock_alerts (id, user_id, product_id, minimum_stock, alert_enabled, created_at, updated_at, sync_status, updated_at_local)
         VALUES (?, ?, ?, ?, 1, ?, ?, 'pending', ?)`,
        [id, userId, productId, minimumStock, now, now, now]
      )
      const created: StockAlert = {
        id, user_id: userId, product_id: productId,
        minimum_stock: minimumStock, alert_enabled: true,
        created_at: now, updated_at: now,
      }
      await addToSyncQueue('INSERT', 'stock_alerts', id, created)
      return created
    }
  },

  // ============================================================
  // Helper khusus sync
  // ============================================================

  async replaceAllMovements(records: StockMovement[]): Promise<void> {
    const userId = getCurrentUserId()
    await transaction(async (tx) => {
      await tx.run('DELETE FROM stock_movements WHERE user_id = ?', [userId])
      for (const r of records) {
        await tx.run(
          `INSERT OR REPLACE INTO stock_movements (id, user_id, product_id, movement_type, quantity,
                   quantity_before, quantity_after, reference_type, reference_id, notes, created_at, created_by,
                   sync_status, updated_at_local)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?)`,
          [r.id, userId, r.product_id, r.movement_type, r.quantity, r.quantity_before, r.quantity_after,
           r.reference_type ?? null, r.reference_id ?? null, r.notes ?? null, r.created_at, r.created_by ?? null, r.created_at]
        )
      }
    })
  },

  async replaceAllAdjustments(records: StockAdjustment[]): Promise<void> {
    const userId = getCurrentUserId()
    await transaction(async (tx) => {
      await tx.run('DELETE FROM stock_adjustments WHERE user_id = ?', [userId])
      for (const r of records) {
        await tx.run(
          `INSERT OR REPLACE INTO stock_adjustments (id, user_id, product_id, adjustment_type, quantity_before,
                   quantity_after, quantity_change, reason, notes, created_at, created_by, sync_status, updated_at_local)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?)`,
          [r.id, userId, r.product_id, r.adjustment_type, r.quantity_before, r.quantity_after, r.quantity_change,
           r.reason, r.notes ?? null, r.created_at, r.created_by ?? null, r.created_at]
        )
      }
    })
  },

  async replaceAllOpnames(records: StockOpname[]): Promise<void> {
    const userId = getCurrentUserId()
    await transaction(async (tx) => {
      await tx.run('DELETE FROM stock_opnames WHERE user_id = ?', [userId])
      for (const o of records) {
        await tx.run(
          `INSERT OR REPLACE INTO stock_opnames (id, user_id, opname_number, opname_date, status, notes,
                   created_at, completed_at, created_by, sync_status, updated_at_local)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?)`,
          [o.id, userId, o.opname_number, o.opname_date, o.status, o.notes ?? null, o.created_at, o.completed_at ?? null, o.created_by ?? null, o.created_at]
        )
        for (const item of o.items || []) {
          await tx.run(
            `INSERT OR REPLACE INTO stock_opname_items (id, user_id, opname_id, product_id, system_quantity,
                     actual_quantity, difference, notes, created_at, sync_status, updated_at_local)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?)`,
            [item.id, userId, o.id, item.product_id, item.system_quantity, item.actual_quantity, item.difference,
             item.notes ?? null, item.created_at ?? o.created_at, item.created_at ?? o.created_at]
          )
        }
      }
    })
  },

  async replaceAllAlerts(records: StockAlert[]): Promise<void> {
    const userId = getCurrentUserId()
    await transaction(async (tx) => {
      await tx.run('DELETE FROM stock_alerts WHERE user_id = ?', [userId])
      for (const r of records) {
        await tx.run(
          `INSERT OR REPLACE INTO stock_alerts (id, user_id, product_id, minimum_stock, alert_enabled, created_at, updated_at, sync_status, updated_at_local)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'synced', ?)`,
          [r.id, userId, r.product_id, r.minimum_stock, r.alert_enabled ? 1 : 0, r.created_at, r.updated_at, r.updated_at]
        )
      }
    })
  },

  // ============================================================
  // Internal helpers
  // ============================================================

  mapMovement(r: any): StockMovement {
    const product = r.product_id
      ? { id: r.product_id, name: r.product_name, sku: r.product_sku, price_sell: 0, stock: 0 }
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
    const product = r.product_id
      ? { id: r.product_id, name: r.product_name, sku: r.product_sku, price_sell: 0, stock: 0 }
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
    }
  },

  mapOpnameItem(r: any): StockOpnameItem {
    const product = r.product_id
      ? { id: r.product_id, name: r.product_name, sku: r.product_sku, price_sell: 0, stock: 0 }
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
    const product = r.product_id
      ? { id: r.product_id, name: r.product_name, sku: r.product_sku, price_sell: 0, stock: 0 }
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