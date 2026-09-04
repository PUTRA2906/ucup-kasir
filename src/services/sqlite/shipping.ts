import { query, queryOne, run, addToSyncQueue, transaction } from './db'
import { getCurrentUserId, uuid, nowIso, generateDeliveryNumber } from './db'
import type {
  Vehicle,
  VehicleInsert,
  VehicleUpdate,
  DeliveryOrder,
  DeliveryOrderInsert,
  DeliveryOrderUpdate,
  DeliveryItem,
  DeliveryItemInsert,
  DeliveryTracking,
  DeliveryTrackingInsert,
} from '@/types/database'

// ============================================================
// SQLite Service: Pengiriman / Shipping
// Mirror dari src/services/shipping.ts
// - CRUD kendaraan (vehicle)
// - Surat Jalan (delivery_orders) + items + tracking
// - Sync queue integration
// ============================================================

export const sqliteShippingService = {
  // ============================================================
  // VEHICLES
  // ============================================================

  async fetchVehicles(): Promise<Vehicle[]> {
    const userId = getCurrentUserId()
    const rows = await query<any>(
      `SELECT * FROM vehicles WHERE user_id = ? ORDER BY plate_number`,
      [userId]
    )
    return rows.map(this.mapVehicle)
  },

  async getVehicle(id: string): Promise<Vehicle | null> {
    const userId = getCurrentUserId()
    const row = await queryOne<any>(
      `SELECT * FROM vehicles WHERE id = ? AND user_id = ?`,
      [id, userId]
    )
    return row ? this.mapVehicle(row) : null
  },

  async createVehicle(input: VehicleInsert): Promise<Vehicle> {
    const userId = getCurrentUserId()
    const id = uuid()
    const now = nowIso()

    await run(
      `INSERT INTO vehicles (id, user_id, plate_number, vehicle_type, brand, capacity_kg, status, is_active, created_at, updated_at, sync_status, updated_at_local)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
      [id, userId, input.plate_number, input.vehicle_type, input.brand || null,
       input.capacity_kg || 0, input.status || 'tersedia', input.is_active !== false ? 1 : 0,
       now, now, now]
    )

    const vehicle = await this.getVehicle(id)
    await addToSyncQueue('INSERT', 'vehicles', id, vehicle || { id })
    return vehicle!
  },

  async updateVehicle(id: string, updates: VehicleUpdate): Promise<Vehicle> {
    const userId = getCurrentUserId()
    const now = nowIso()
    const fields: string[] = []
    const values: any[] = []

    const updatable = ['plate_number', 'vehicle_type', 'brand', 'capacity_kg', 'status'] as const
    for (const key of updatable) {
      if ((updates as any)[key] !== undefined) {
        fields.push(`${key} = ?`)
        values.push((updates as any)[key])
      }
    }
    if (updates.is_active !== undefined) {
      fields.push('is_active = ?')
      values.push(updates.is_active ? 1 : 0)
    }

    fields.push('updated_at = ?', 'sync_status = ?', 'updated_at_local = ?')
    values.push(now, 'pending', now, id, userId)

    await run(
      `UPDATE vehicles SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`,
      values
    )

    const vehicle = await this.getVehicle(id)
    await addToSyncQueue('UPDATE', 'vehicles', id, vehicle || { id })
    return vehicle!
  },

  async deleteVehicle(id: string): Promise<void> {
    const userId = getCurrentUserId()
    await run(`DELETE FROM vehicles WHERE id = ? AND user_id = ?`, [id, userId])
    await addToSyncQueue('DELETE', 'vehicles', id, { id })
  },

  // ============================================================
  // DELIVERY ORDERS
  // ============================================================

  async fetchDeliveryOrders(): Promise<DeliveryOrder[]> {
    const userId = getCurrentUserId()
    const rows = await query<any>(
      `SELECT do.*, v.plate_number, v.vehicle_type, e.name as driver_name
       FROM delivery_orders do
       LEFT JOIN vehicles v ON v.id = do.vehicle_id
       LEFT JOIN employees e ON e.id = do.driver_id
       WHERE do.user_id = ?
       ORDER BY do.do_date DESC, do.created_at DESC`,
      [userId]
    )
    return rows.map((r: any) => ({
      ...this.mapDeliveryOrder(r),
      vehicle: r.plate_number ? { plate_number: r.plate_number, vehicle_type: r.vehicle_type } as any : undefined,
      driver: r.driver_name ? { name: r.driver_name } as any : undefined,
    }))
  },

  async getDeliveryOrder(id: string): Promise<DeliveryOrder | null> {
    const userId = getCurrentUserId()
    const row = await queryOne<any>(
      `SELECT do.*, v.plate_number, v.vehicle_type, v.brand, v.capacity_kg, v.status as vehicle_status,
              e.name as driver_name, e.employee_code as driver_code, e.phone as driver_phone
       FROM delivery_orders do
       LEFT JOIN vehicles v ON v.id = do.vehicle_id
       LEFT JOIN employees e ON e.id = do.driver_id
       WHERE do.id = ? AND do.user_id = ?`,
      [id, userId]
    )
    if (!row) return null

    const doOrder = this.mapDeliveryOrder(row)
    doOrder.vehicle = row.plate_number ? {
      plate_number: row.plate_number, vehicle_type: row.vehicle_type, brand: row.brand,
      capacity_kg: row.capacity_kg, status: row.vehicle_status,
    } as any : undefined
    doOrder.driver = row.driver_name ? {
      name: row.driver_name, employee_code: row.driver_code, phone: row.driver_phone,
    } as any : undefined

    doOrder.items = await this.fetchDeliveryItems(id)
    doOrder.tracking = await this.fetchDeliveryTracking(id)
    return doOrder
  },

  async createDeliveryOrder(input: DeliveryOrderInsert): Promise<DeliveryOrder> {
    const userId = getCurrentUserId()
    const id = uuid()
    const now = nowIso()
    const doNumber = input.do_number || generateDeliveryNumber()

    await transaction(async (tx) => {
      await tx.run(
        `INSERT INTO delivery_orders (id, user_id, do_number, do_date, transaction_id, customer_id,
           customer_name, customer_address, vehicle_id, driver_id, driver_name, notes, status,
           created_at, updated_at, sync_status, updated_at_local)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
        [id, userId, doNumber, input.do_date, input.transaction_id || null, input.customer_id || null,
         input.customer_name || null, input.customer_address || null, input.vehicle_id || null,
         input.driver_id || null, input.driver_name || null, input.notes || null, 'draft', now, now, now]
      )

      // Tracking awal
      await tx.run(
        `INSERT INTO delivery_tracking (id, user_id, delivery_order_id, status, note, created_at, sync_status, updated_at_local)
         VALUES (?, ?, ?, 'draft', ?, ?, 'pending', ?)`,
        [uuid(), userId, id, input.notes || null, now, now]
      )
    })

    const order = await this.getDeliveryOrder(id)
    await addToSyncQueue('INSERT', 'delivery_orders', id, order || { id })
    return order!
  },

  async updateDeliveryOrder(id: string, updates: DeliveryOrderUpdate): Promise<DeliveryOrder> {
    const userId = getCurrentUserId()
    const now = nowIso()
    const fields: string[] = []
    const values: any[] = []

    const updatable = ['do_date', 'transaction_id', 'customer_id', 'customer_name',
      'customer_address', 'vehicle_id', 'driver_id', 'driver_name', 'notes'] as const
    for (const key of updatable) {
      if ((updates as any)[key] !== undefined) {
        fields.push(`${key} = ?`)
        values.push((updates as any)[key])
      }
    }

    fields.push('updated_at = ?', 'sync_status = ?', 'updated_at_local = ?')
    values.push(now, 'pending', now, id, userId)

    await run(
      `UPDATE delivery_orders SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`,
      values
    )

    const order = await this.getDeliveryOrder(id)
    await addToSyncQueue('UPDATE', 'delivery_orders', id, order || { id })
    return order!
  },

  /** Update status DO + catat tracking. Update kendaraan jadi dipakai saat dikirim. */
  async updateDeliveryStatus(id: string, status: DeliveryOrder['status'], note?: string): Promise<DeliveryOrder> {
    const userId = getCurrentUserId()
    const now = nowIso()

    await transaction(async (tx) => {
      const rows = await tx.query<any>(
        `SELECT vehicle_id FROM delivery_orders WHERE id = ? AND user_id = ?`,
        [id, userId]
      )
      const row = rows[0]
      if (!row) throw new Error('Surat jalan tidak ditemukan')

      await tx.run(
        `UPDATE delivery_orders SET status = ?, updated_at = ?, sync_status = 'pending', updated_at_local = ?
         WHERE id = ? AND user_id = ?`,
        [status, now, now, id, userId]
      )

      await tx.run(
        `INSERT INTO delivery_tracking (id, user_id, delivery_order_id, status, note, created_at, sync_status, updated_at_local)
         VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`,
        [uuid(), userId, id, status, note || null, now, now]
      )

      // Update status kendaraan
      if (row.vehicle_id) {
        const vehicleStatus = status === 'dikirim' ? 'dipakai' : 'tersedia'
        await tx.run(
          `UPDATE vehicles SET status = ?, updated_at = ?, sync_status = 'pending', updated_at_local = ?
           WHERE id = ? AND user_id = ?`,
          [vehicleStatus, now, now, row.vehicle_id, userId]
        )
        const vPayload = JSON.stringify({ id: row.vehicle_id, status: vehicleStatus, updated_at: now })
        await tx.run(
          `INSERT INTO sync_queue (operation, table_name, record_id, payload, created_at)
           VALUES ('UPDATE', 'vehicles', ?, ?, ?)`,
          [row.vehicle_id, vPayload, now]
        )
      }
    })

    const order = await this.getDeliveryOrder(id)
    await addToSyncQueue('UPDATE', 'delivery_orders', id, order || { id })
    return order!
  },

  async deleteDeliveryOrder(id: string): Promise<void> {
    const userId = getCurrentUserId()
    await transaction(async (tx) => {
      await tx.run(`DELETE FROM delivery_tracking WHERE delivery_order_id = ? AND user_id = ?`, [id, userId])
      await tx.run(`DELETE FROM delivery_items WHERE delivery_order_id = ? AND user_id = ?`, [id, userId])
      await tx.run(`DELETE FROM delivery_orders WHERE id = ? AND user_id = ?`, [id, userId])
    })
    await addToSyncQueue('DELETE', 'delivery_orders', id, { id })
  },

  // ============================================================
  // DELIVERY ITEMS
  // ============================================================

  async fetchDeliveryItems(deliveryOrderId: string): Promise<DeliveryItem[]> {
    const userId = getCurrentUserId()
    const rows = await query<any>(
      `SELECT * FROM delivery_items WHERE delivery_order_id = ? AND user_id = ? ORDER BY created_at ASC`,
      [deliveryOrderId, userId]
    )
    return rows.map(this.mapDeliveryItem)
  },

  /** Simpan ulang semua item DO (hapus lama, insert baru). */
  async saveDeliveryItems(doId: string, items: DeliveryItemInsert[]): Promise<DeliveryItem[]> {
    const userId = getCurrentUserId()
    const now = nowIso()

    await transaction(async (tx) => {
      await tx.run(`DELETE FROM delivery_items WHERE delivery_order_id = ? AND user_id = ?`, [doId, userId])
      await tx.run(
        `DELETE FROM sync_queue WHERE table_name = 'delivery_items' AND record_id IN
         (SELECT id FROM delivery_items WHERE delivery_order_id = ? AND user_id = ?)`,
        [doId, userId]
      )

      for (const item of items) {
        const id = uuid()
        await tx.run(
          `INSERT INTO delivery_items (id, user_id, delivery_order_id, product_id, product_name, quantity, created_at, sync_status, updated_at_local)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
          [id, userId, doId, item.product_id || null, item.product_name, item.quantity || 0, now, now]
        )
        await tx.run(
          `INSERT INTO sync_queue (operation, table_name, record_id, payload, created_at)
           VALUES ('INSERT', 'delivery_items', ?, ?, ?)`,
          [id, JSON.stringify({ id, user_id: userId, delivery_order_id: doId, product_id: item.product_id || null, product_name: item.product_name, quantity: item.quantity || 0, created_at: now }), now]
        )
      }
    })

    return this.fetchDeliveryItems(doId)
  },

  // ============================================================
  // DELIVERY TRACKING
  // ============================================================

  async fetchDeliveryTracking(deliveryOrderId: string): Promise<DeliveryTracking[]> {
    const userId = getCurrentUserId()
    const rows = await query<any>(
      `SELECT * FROM delivery_tracking WHERE delivery_order_id = ? AND user_id = ?
       ORDER BY created_at DESC`,
      [deliveryOrderId, userId]
    )
    return rows.map(this.mapDeliveryTracking)
  },

  // ============================================================
  // Sync helpers
  // ============================================================

  async replaceAllVehicles(records: Vehicle[]): Promise<void> {
    const userId = getCurrentUserId()
    await run('DELETE FROM vehicles WHERE user_id = ?', [userId])
    const now = nowIso()
    for (const r of records) {
      await run(
        `INSERT OR REPLACE INTO vehicles (id, user_id, plate_number, vehicle_type, brand, capacity_kg, status, is_active, created_at, updated_at, sync_status, updated_at_local)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?)`,
        [r.id, r.user_id || userId, r.plate_number, r.vehicle_type, r.brand || null,
         r.capacity_kg, r.status, r.is_active ? 1 : 0, r.created_at, r.updated_at, r.updated_at || now]
      )
    }
  },

  async replaceAllDeliveryOrders(records: Array<DeliveryOrder & { items?: DeliveryItem[]; tracking?: DeliveryTracking[] }>): Promise<void> {
    const userId = getCurrentUserId()
    await run(
      `DELETE FROM delivery_items WHERE delivery_order_id IN (SELECT id FROM delivery_orders WHERE user_id = ?)`,
      [userId]
    )
    await run(
      `DELETE FROM delivery_tracking WHERE delivery_order_id IN (SELECT id FROM delivery_orders WHERE user_id = ?)`,
      [userId]
    )
    await run('DELETE FROM delivery_orders WHERE user_id = ?', [userId])
    const now = nowIso()

    for (const r of records) {
      await run(
        `INSERT OR REPLACE INTO delivery_orders (id, user_id, do_number, do_date, transaction_id, customer_id,
           customer_name, customer_address, vehicle_id, driver_id, driver_name, notes, status,
           created_at, updated_at, sync_status, updated_at_local)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?)`,
        [r.id, r.user_id || userId, r.do_number, r.do_date, r.transaction_id || null,
         r.customer_id || null, r.customer_name || null, r.customer_address || null,
         r.vehicle_id || null, r.driver_id || null, r.driver_name || null, r.notes || null,
         r.status, r.created_at, r.updated_at, r.updated_at || now]
      )
      for (const item of r.items || []) {
        await run(
          `INSERT OR REPLACE INTO delivery_items (id, user_id, delivery_order_id, product_id, product_name, quantity, created_at, sync_status, updated_at_local)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'synced', ?)`,
          [item.id, item.user_id || userId, r.id, item.product_id || null, item.product_name,
           item.quantity, item.created_at, item.created_at || now]
        )
      }
      for (const tr of r.tracking || []) {
        await run(
          `INSERT OR REPLACE INTO delivery_tracking (id, user_id, delivery_order_id, status, note, created_at, sync_status, updated_at_local)
           VALUES (?, ?, ?, ?, ?, ?, 'synced', ?)`,
          [tr.id, tr.user_id || userId, r.id, tr.status, tr.note || null, tr.created_at, tr.created_at || now]
        )
      }
    }
  },

  // ============================================================
  // Internal helpers — map DB rows ke typed objects
  // ============================================================

  mapVehicle(r: any): Vehicle {
    return {
      id: r.id,
      user_id: r.user_id,
      plate_number: r.plate_number,
      vehicle_type: r.vehicle_type,
      brand: r.brand ?? undefined,
      capacity_kg: r.capacity_kg,
      status: r.status,
      is_active: !!r.is_active,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }
  },

  mapDeliveryOrder(r: any): DeliveryOrder {
    return {
      id: r.id,
      user_id: r.user_id,
      do_number: r.do_number,
      do_date: r.do_date,
      transaction_id: r.transaction_id ?? undefined,
      customer_id: r.customer_id ?? undefined,
      customer_name: r.customer_name ?? undefined,
      customer_address: r.customer_address ?? undefined,
      vehicle_id: r.vehicle_id ?? undefined,
      driver_id: r.driver_id ?? undefined,
      driver_name: r.driver_name ?? undefined,
      notes: r.notes ?? undefined,
      status: r.status,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }
  },

  mapDeliveryItem(r: any): DeliveryItem {
    return {
      id: r.id,
      user_id: r.user_id,
      delivery_order_id: r.delivery_order_id,
      product_id: r.product_id ?? undefined,
      product_name: r.product_name,
      quantity: r.quantity,
      created_at: r.created_at,
    }
  },

  mapDeliveryTracking(r: any): DeliveryTracking {
    return {
      id: r.id,
      user_id: r.user_id,
      delivery_order_id: r.delivery_order_id,
      status: r.status,
      note: r.note ?? undefined,
      created_at: r.created_at,
    }
  },
}
