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
  DeliveryLoader,
  DeliveryLoaderInput,
  DeliveryLoadItem,
  DeliveryLoadItemInput,
} from '@/types/database'

// ============================================================
// SQLite Service: Pengiriman / Shipping
// Mirror dari src/services/shipping.ts
// - CRUD kendaraan (vehicle)
// - Surat Jalan (delivery_orders) + items + tracking
// - Anak DO: transaksi, tim muat, barang dimuat (insentif bongkar muat)
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
      `SELECT dor.*, v.plate_number, v.vehicle_type, e.name as driver_name
       FROM delivery_orders dor
       LEFT JOIN vehicles v ON v.id = dor.vehicle_id
       LEFT JOIN employees e ON e.id = dor.driver_id
       WHERE dor.user_id = ?
       ORDER BY dor.do_date DESC, dor.created_at DESC`,
      [userId]
    )
    // Kumpulkan transaction_ids untuk semua surat jalan sekali query
    const links = await query<any>(
      `SELECT delivery_order_id, transaction_id FROM delivery_order_transactions WHERE user_id = ?`,
      [userId]
    )
    const idsByDo = new Map<string, string[]>()
    for (const l of links) {
      if (!idsByDo.has(l.delivery_order_id)) idsByDo.set(l.delivery_order_id, [])
      idsByDo.get(l.delivery_order_id)!.push(l.transaction_id)
    }
    return rows.map((r: any) => ({
      ...this.mapDeliveryOrder(r),
      transaction_ids: idsByDo.get(r.id) || [],
      vehicle: r.plate_number ? { plate_number: r.plate_number, vehicle_type: r.vehicle_type } as any : undefined,
      driver: r.driver_name ? { name: r.driver_name } as any : undefined,
    }))
  },

  async getDeliveryOrder(id: string): Promise<DeliveryOrder | null> {
    const userId = getCurrentUserId()
    const row = await queryOne<any>(
      `SELECT dor.*, v.plate_number, v.vehicle_type, v.brand, v.capacity_kg, v.status as vehicle_status,
              e.name as driver_name, e.employee_code as driver_code, e.phone as driver_phone
       FROM delivery_orders dor
       LEFT JOIN vehicles v ON v.id = dor.vehicle_id
       LEFT JOIN employees e ON e.id = dor.driver_id
       WHERE dor.id = ? AND dor.user_id = ?`,
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
    doOrder.loaders = await this.fetchDeliveryLoaders(id)
    doOrder.load_items = await this.fetchDeliveryLoadItems(id)
    doOrder.transaction_ids = await this.fetchDeliveryTransactionIds(id)
    if (doOrder.transaction_ids && doOrder.transaction_ids.length > 0) {
      const placeholders = doOrder.transaction_ids.map(() => '?').join(',')
      const txRows = await query<any>(
        `SELECT id, transaction_number, customer_id, customer_name, total FROM transactions
         WHERE user_id = ? AND id IN (${placeholders})`,
        [userId, ...doOrder.transaction_ids]
      )
      doOrder.transactions = txRows as any
    } else {
      doOrder.transactions = []
    }
    return doOrder
  },

  async createDeliveryOrder(input: DeliveryOrderInsert): Promise<DeliveryOrder> {
    const userId = getCurrentUserId()
    const id = uuid()
    const now = nowIso()
    const doNumber = input.do_number || generateDeliveryNumber()

    await transaction(async (tx) => {
      await tx.run(
        `INSERT INTO delivery_orders (id, user_id, do_number, do_date, customer_id,
           customer_name, customer_address, vehicle_id, driver_id, driver_name, driver_fee, notes, status,
           created_at, updated_at, sync_status, updated_at_local)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
        [id, userId, doNumber, input.do_date, input.customer_id || null,
         input.customer_name || null, input.customer_address || null, input.vehicle_id || null,
         input.driver_id || null, input.driver_name || null, input.driver_fee || 0, input.notes || null, 'draft', now, now, now]
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

    const updatable = ['do_date', 'customer_id', 'customer_name',
      'customer_address', 'vehicle_id', 'driver_id', 'driver_name', 'driver_fee', 'notes'] as const
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
    const childTables = [
      'delivery_items', 'delivery_tracking', 'delivery_loaders',
      'delivery_load_items', 'delivery_order_transactions',
    ] as const
    await transaction(async (tx) => {
      // Bersihkan antrean sync anak SEBELUM barisnya dihapus (subquery dependency)
      for (const t of childTables) {
        await tx.run(
          `DELETE FROM sync_queue WHERE table_name = ? AND record_id IN
           (SELECT id FROM ${t} WHERE delivery_order_id = ? AND user_id = ?)`,
          [t, id, userId]
        )
      }
      for (const t of childTables) {
        await tx.run(`DELETE FROM ${t} WHERE delivery_order_id = ? AND user_id = ?`, [id, userId])
      }
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
  // ANAK SURAT JALAN: transaksi, tim muat, barang dimuat
  // ============================================================

  async fetchDeliveryTransactionIds(deliveryOrderId: string): Promise<string[]> {
    const userId = getCurrentUserId()
    const rows = await query<any>(
      `SELECT transaction_id FROM delivery_order_transactions WHERE delivery_order_id = ? AND user_id = ?`,
      [deliveryOrderId, userId]
    )
    return rows.map((r: any) => r.transaction_id)
  },

  /** Simpan ulang referensi transaksi DO (hapus lama, insert baru). Pola saveDeliveryItems. */
  async saveDeliveryOrderTransactions(doId: string, transactionIds: string[]): Promise<void> {
    const userId = getCurrentUserId()
    const now = nowIso()

    await transaction(async (tx) => {
      // Bersihkan antrean sync milik baris lama SEBELUM barisnya dihapus
      await tx.run(
        `DELETE FROM sync_queue WHERE table_name = 'delivery_order_transactions' AND record_id IN
         (SELECT id FROM delivery_order_transactions WHERE delivery_order_id = ? AND user_id = ?)`,
        [doId, userId]
      )
      await tx.run(`DELETE FROM delivery_order_transactions WHERE delivery_order_id = ? AND user_id = ?`, [doId, userId])

      for (const tid of transactionIds) {
        const id = uuid()
        await tx.run(
          `INSERT INTO delivery_order_transactions (id, user_id, delivery_order_id, transaction_id, created_at, sync_status, updated_at_local)
           VALUES (?, ?, ?, ?, ?, 'pending', ?)`,
          [id, userId, doId, tid, now, now]
        )
        await tx.run(
          `INSERT INTO sync_queue (operation, table_name, record_id, payload, created_at)
           VALUES ('INSERT', 'delivery_order_transactions', ?, ?, ?)`,
          [id, JSON.stringify({ id, user_id: userId, delivery_order_id: doId, transaction_id: tid, created_at: now }), now]
        )
      }
    })
  },

  async fetchDeliveryLoaders(deliveryOrderId: string): Promise<DeliveryLoader[]> {
    const userId = getCurrentUserId()
    const rows = await query<any>(
      `SELECT * FROM delivery_loaders WHERE delivery_order_id = ? AND user_id = ? ORDER BY employee_name`,
      [deliveryOrderId, userId]
    )
    return rows.map(this.mapDeliveryLoader)
  },

  /** Simpan ulang tim muat DO (hapus lama, insert baru). Pola saveDeliveryItems. */
  async saveDeliveryLoaders(doId: string, loaders: DeliveryLoaderInput[]): Promise<DeliveryLoader[]> {
    const userId = getCurrentUserId()
    const now = nowIso()

    await transaction(async (tx) => {
      await tx.run(
        `DELETE FROM sync_queue WHERE table_name = 'delivery_loaders' AND record_id IN
         (SELECT id FROM delivery_loaders WHERE delivery_order_id = ? AND user_id = ?)`,
        [doId, userId]
      )
      await tx.run(`DELETE FROM delivery_loaders WHERE delivery_order_id = ? AND user_id = ?`, [doId, userId])

      for (const l of loaders) {
        const id = uuid()
        await tx.run(
          `INSERT INTO delivery_loaders (id, user_id, delivery_order_id, employee_id, employee_name, created_at, sync_status, updated_at_local)
           VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`,
          [id, userId, doId, l.employee_id, l.employee_name || null, now, now]
        )
        await tx.run(
          `INSERT INTO sync_queue (operation, table_name, record_id, payload, created_at)
           VALUES ('INSERT', 'delivery_loaders', ?, ?, ?)`,
          [id, JSON.stringify({ id, user_id: userId, delivery_order_id: doId, employee_id: l.employee_id, employee_name: l.employee_name || null, created_at: now }), now]
        )
      }
    })

    return this.fetchDeliveryLoaders(doId)
  },

  async fetchDeliveryLoadItems(deliveryOrderId: string): Promise<DeliveryLoadItem[]> {
    const userId = getCurrentUserId()
    const rows = await query<any>(
      `SELECT * FROM delivery_load_items WHERE delivery_order_id = ? AND user_id = ? ORDER BY created_at ASC`,
      [deliveryOrderId, userId]
    )
    return rows.map(this.mapDeliveryLoadItem)
  },

  /** Simpan ulang daftar barang dimuat DO (hapus lama, insert baru). Pola saveDeliveryItems. */
  async saveDeliveryLoadItems(doId: string, items: DeliveryLoadItemInput[]): Promise<DeliveryLoadItem[]> {
    const userId = getCurrentUserId()
    const now = nowIso()

    await transaction(async (tx) => {
      await tx.run(
        `DELETE FROM sync_queue WHERE table_name = 'delivery_load_items' AND record_id IN
         (SELECT id FROM delivery_load_items WHERE delivery_order_id = ? AND user_id = ?)`,
        [doId, userId]
      )
      await tx.run(`DELETE FROM delivery_load_items WHERE delivery_order_id = ? AND user_id = ?`, [doId, userId])

      for (const item of items) {
        const id = uuid()
        await tx.run(
          `INSERT INTO delivery_load_items (id, user_id, delivery_order_id, product_name, quantity, unit_price, created_at, sync_status, updated_at_local)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
          [id, userId, doId, item.product_name, item.quantity || 0, item.unit_price || 0, now, now]
        )
        await tx.run(
          `INSERT INTO sync_queue (operation, table_name, record_id, payload, created_at)
           VALUES ('INSERT', 'delivery_load_items', ?, ?, ?)`,
          [id, JSON.stringify({ id, user_id: userId, delivery_order_id: doId, product_name: item.product_name, quantity: item.quantity || 0, unit_price: item.unit_price || 0, created_at: now }), now]
        )
      }
    })

    return this.fetchDeliveryLoadItems(doId)
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
    for (const t of ['delivery_items', 'delivery_tracking', 'delivery_loaders', 'delivery_load_items', 'delivery_order_transactions'] as const) {
      await run(
        `DELETE FROM ${t} WHERE delivery_order_id IN (SELECT id FROM delivery_orders WHERE user_id = ?)`,
        [userId]
      )
    }
    await run('DELETE FROM delivery_orders WHERE user_id = ?', [userId])
    const now = nowIso()

    for (const r of records) {
      await run(
        `INSERT OR REPLACE INTO delivery_orders (id, user_id, do_number, do_date, customer_id,
           customer_name, customer_address, vehicle_id, driver_id, driver_name, driver_fee, notes, status,
           created_at, updated_at, sync_status, updated_at_local)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?)`,
        [r.id, r.user_id || userId, r.do_number, r.do_date,
         r.customer_id || null, r.customer_name || null, r.customer_address || null,
         r.vehicle_id || null, r.driver_id || null, r.driver_name || null, r.driver_fee ?? 0, r.notes || null,
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

  async replaceAllDeliveryLoaders(records: DeliveryLoader[]): Promise<void> {
    const userId = getCurrentUserId()
    await run('DELETE FROM delivery_loaders WHERE user_id = ?', [userId])
    const now = nowIso()
    for (const r of records) {
      await run(
        `INSERT OR REPLACE INTO delivery_loaders (id, user_id, delivery_order_id, employee_id, employee_name, created_at, sync_status, updated_at_local)
         VALUES (?, ?, ?, ?, ?, ?, 'synced', ?)`,
        [r.id, r.user_id || userId, r.delivery_order_id, r.employee_id, r.employee_name || null,
         r.created_at, r.created_at || now]
      )
    }
  },

  async replaceAllDeliveryLoadItems(records: DeliveryLoadItem[]): Promise<void> {
    const userId = getCurrentUserId()
    await run('DELETE FROM delivery_load_items WHERE user_id = ?', [userId])
    const now = nowIso()
    for (const r of records) {
      await run(
        `INSERT OR REPLACE INTO delivery_load_items (id, user_id, delivery_order_id, product_name, quantity, unit_price, created_at, sync_status, updated_at_local)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'synced', ?)`,
        [r.id, r.user_id || userId, r.delivery_order_id, r.product_name, r.quantity, r.unit_price,
         r.created_at, r.created_at || now]
      )
    }
  },

  async replaceAllDeliveryOrderTransactions(records: Array<{ id: string; user_id?: string; delivery_order_id: string; transaction_id: string; created_at: string }>): Promise<void> {
    const userId = getCurrentUserId()
    await run('DELETE FROM delivery_order_transactions WHERE user_id = ?', [userId])
    const now = nowIso()
    for (const r of records) {
      await run(
        `INSERT OR REPLACE INTO delivery_order_transactions (id, user_id, delivery_order_id, transaction_id, created_at, sync_status, updated_at_local)
         VALUES (?, ?, ?, ?, ?, 'synced', ?)`,
        [r.id, r.user_id || userId, r.delivery_order_id, r.transaction_id,
         r.created_at, r.created_at || now]
      )
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
      customer_id: r.customer_id ?? undefined,
      customer_name: r.customer_name ?? undefined,
      customer_address: r.customer_address ?? undefined,
      vehicle_id: r.vehicle_id ?? undefined,
      driver_id: r.driver_id ?? undefined,
      driver_name: r.driver_name ?? undefined,
      driver_fee: r.driver_fee ?? undefined,
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

  mapDeliveryLoader(r: any): DeliveryLoader {
    return {
      id: r.id,
      user_id: r.user_id,
      delivery_order_id: r.delivery_order_id,
      employee_id: r.employee_id,
      employee_name: r.employee_name ?? undefined,
      created_at: r.created_at,
    }
  },

  mapDeliveryLoadItem(r: any): DeliveryLoadItem {
    return {
      id: r.id,
      user_id: r.user_id,
      delivery_order_id: r.delivery_order_id,
      product_name: r.product_name,
      quantity: r.quantity,
      unit_price: r.unit_price,
      created_at: r.created_at,
    }
  },
}
