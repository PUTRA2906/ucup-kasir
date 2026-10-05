import { query, queryOne, run, addToSyncQueue, transaction } from './db'
import { getCurrentUserId, uuid, nowIso } from './db'
import type { Customer, CustomerInsert, CustomerUpdate } from '@/types/database'

// ============================================================
// SQLite Service: Customers
// Mirror dari src/services/customers.ts tapi akses SQLite lokal.
// ============================================================

export const sqliteCustomersService = {
  async getAll(): Promise<Customer[]> {
    const userId = getCurrentUserId()
    const rows = await query<any>(
      `SELECT id, user_id, name, store_name, phone, kecamatan, address, notes, credit_limit, created_at, updated_at
       FROM customers
       WHERE user_id = ?
       ORDER BY name ASC`,
      [userId]
    )
    return rows.map((r) => this.mapRow(r))
  },

  async getById(id: string): Promise<Customer | null> {
    const userId = getCurrentUserId()
    const row = await queryOne<any>(
      `SELECT id, user_id, name, store_name, phone, kecamatan, address, notes, credit_limit, created_at, updated_at
       FROM customers
       WHERE id = ? AND user_id = ?`,
      [id, userId]
    )
    return row ? this.mapRow(row) : null
  },

  async create(customer: CustomerInsert): Promise<Customer> {
    const userId = getCurrentUserId()
    const id = uuid()
    const now = nowIso()

    await transaction(async (tx) => {
      await tx.run(
        `INSERT INTO customers (id, user_id, name, store_name, phone, kecamatan, address, notes, credit_limit, created_at, updated_at, sync_status, updated_at_local)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
        [
          id,
          userId,
          customer.name,
          customer.store_name ?? null,
          customer.phone ?? null,
          customer.kecamatan ?? null,
          customer.address ?? null,
          customer.notes ?? null,
          customer.credit_limit ?? 0,
          now,
          now,
          now,
        ]
      )
    })

    const created: Customer = {
      id,
      user_id: userId,
      name: customer.name,
      store_name: customer.store_name,
      phone: customer.phone,
      kecamatan: customer.kecamatan,
      address: customer.address,
      notes: customer.notes,
      credit_limit: customer.credit_limit ?? 0,
      created_at: now,
      updated_at: now,
    }
    await addToSyncQueue('INSERT', 'customers', id, created)
    return created
  },

  /** Insert banyak customer sekaligus (import CSV / bulk). */
  async createMany(customers: CustomerInsert[]): Promise<Customer[]> {
    if (customers.length === 0) return []
    const userId = getCurrentUserId()
    const now = nowIso()

    const results: Customer[] = []
    await transaction(async (tx) => {
      for (const c of customers) {
        const id = uuid()
        await tx.run(
          `INSERT INTO customers (id, user_id, name, store_name, phone, kecamatan, address, notes, credit_limit, created_at, updated_at, sync_status, updated_at_local)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
          [
            id,
            userId,
            c.name,
            c.store_name ?? null,
            c.phone ?? null,
            c.kecamatan ?? null,
            c.address ?? null,
            c.notes ?? null,
            c.credit_limit ?? 0,
            now,
            now,
            now,
          ]
        )
        results.push({
          id,
          user_id: userId,
          name: c.name,
          store_name: c.store_name,
          phone: c.phone,
          kecamatan: c.kecamatan,
          address: c.address,
          notes: c.notes,
          credit_limit: c.credit_limit ?? 0,
          created_at: now,
          updated_at: now,
        })
      }
    })

    for (const r of results) {
      await addToSyncQueue('INSERT', 'customers', r.id, r)
    }
    return results
  },

  async update(id: string, customer: CustomerUpdate): Promise<Customer> {
    const userId = getCurrentUserId()
    const now = nowIso()

    const existing = await this.getById(id)
    if (!existing) throw new Error('Customer tidak ditemukan')

    const updated: Customer = {
      ...existing,
      ...customer,
      updated_at: now,
    }

    await transaction(async (tx) => {
      await tx.run(
        `UPDATE customers
         SET name = ?, store_name = ?, phone = ?, kecamatan = ?, address = ?, notes = ?, credit_limit = ?,
             updated_at = ?, sync_status = 'pending', updated_at_local = ?
         WHERE id = ? AND user_id = ?`,
        [
          updated.name,
          updated.store_name ?? null,
          updated.phone ?? null,
          updated.kecamatan ?? null,
          updated.address ?? null,
          updated.notes ?? null,
          updated.credit_limit ?? 0,
          now,
          now,
          id,
          userId,
        ]
      )
    })

    await addToSyncQueue('UPDATE', 'customers', id, updated)
    return updated
  },

  async delete(id: string): Promise<void> {
    const userId = getCurrentUserId()
    await transaction(async (tx) => {
      await tx.run('DELETE FROM customers WHERE id = ? AND user_id = ?', [id, userId])
    })
    await addToSyncQueue('DELETE', 'customers', id, { id })
  },

  async getPaginated(
    page: number,
    perPage: number,
    filters?: {
      search?: string
      kecamatan?: string
    }
  ): Promise<{ data: Customer[]; count: number }> {
    const userId = getCurrentUserId()
    const offset = (page - 1) * perPage

    const conditions: string[] = ['user_id = ?']
    const params: any[] = [userId]

    if (filters?.kecamatan) {
      conditions.push(`kecamatan = ?`)
      params.push(filters.kecamatan)
    }

    if (filters?.search) {
      conditions.push(`(name LIKE ? OR store_name LIKE ? OR phone LIKE ? OR kecamatan LIKE ?)`)
      params.push(
        `%${filters.search}%`,
        `%${filters.search}%`,
        `%${filters.search}%`,
        `%${filters.search}%`
      )
    }

    const where = `WHERE ${conditions.join(' AND ')}`

    const countRows = await query<{ total: number }>(
      `SELECT COUNT(*) as total FROM customers ${where}`,
      params
    )
    const count = countRows[0]?.total ?? 0

    const rows = await query<any>(
      `SELECT id, user_id, name, store_name, phone, kecamatan, address, notes, credit_limit, created_at, updated_at
       FROM customers ${where} ORDER BY name ASC LIMIT ? OFFSET ?`,
      [...params, perPage, offset]
    )

    return { data: rows.map((r) => this.mapRow(r)), count }
  },

  async search(queryStr: string): Promise<Customer[]> {
    const userId = getCurrentUserId()
    const rows = await query<any>(
      `SELECT id, user_id, name, store_name, phone, kecamatan, address, notes, credit_limit, created_at, updated_at
       FROM customers
       WHERE user_id = ? AND (name LIKE ? OR phone LIKE ? OR kecamatan LIKE ?)
       ORDER BY name ASC`,
      [userId, `%${queryStr}%`, `%${queryStr}%`, `%${queryStr}%`]
    )
    return rows.map((r) => this.mapRow(r))
  },

  /**
   * Menghitung total hutang customer (transaksi dengan remaining_amount > 0)
   */
  async getOutstandingBalance(customerId: string): Promise<number> {
    const userId = getCurrentUserId()
    const row = await queryOne<{ total: number | null }>(
      `SELECT SUM(remaining_amount) as total
       FROM transactions
       WHERE customer_id = ? AND user_id = ? AND remaining_amount > 0 AND status != 'batal'`,
      [customerId, userId]
    )
    return row?.total || 0
  },

  /**
   * Validasi apakah customer masih bisa kredit (cek limit kredit)
   * @returns { allowed: boolean, message?: string, currentDebt: number, limit: number }
   */
  async validateCreditLimit(customerId: string, additionalAmount: number): Promise<{
    allowed: boolean
    message?: string
    currentDebt: number
    limit: number
  }> {
    const userId = getCurrentUserId()

    // Ambil data customer
    const customer = await this.getById(customerId)
    if (!customer) {
      return {
        allowed: false,
        message: 'Customer tidak ditemukan',
        currentDebt: 0,
        limit: 0,
      }
    }

    // Ambil limit kredit (gunakan default jika customer limit = 0)
    let creditLimit = customer.credit_limit || 0

    if (creditLimit === 0) {
      // Gunakan limit default dari settings
      const settingsRow = await queryOne<{ default_credit_limit: number | null }>(
        `SELECT default_credit_limit FROM store_settings WHERE user_id = ? LIMIT 1`,
        [userId]
      )
      creditLimit = settingsRow?.default_credit_limit || 0
    }

    // Jika limit = 0, artinya tidak ada batasan (unlimited)
    if (creditLimit === 0) {
      return {
        allowed: true,
        currentDebt: 0,
        limit: 0,
      }
    }

    // Hitung hutang saat ini
    const currentDebt = await this.getOutstandingBalance(customerId)
    const totalAfter = currentDebt + additionalAmount

    if (totalAfter > creditLimit) {
      return {
        allowed: false,
        message: `Limit kredit terlampaui. Limit: Rp ${creditLimit.toLocaleString('id-ID')}, Hutang saat ini: Rp ${currentDebt.toLocaleString('id-ID')}, Total setelah transaksi: Rp ${totalAfter.toLocaleString('id-ID')}`,
        currentDebt,
        limit: creditLimit,
      }
    }

    return {
      allowed: true,
      currentDebt,
      limit: creditLimit,
    }
  },

  // ============================================================
  // Helper khusus sync
  // ============================================================

  async replaceAll(records: Customer[]): Promise<void> {
    const userId = getCurrentUserId()
    await transaction(async (tx) => {
      await tx.run('DELETE FROM customers WHERE user_id = ?', [userId])
      for (const r of records) {
        await tx.run(
          `INSERT OR REPLACE INTO customers (id, user_id, name, store_name, phone, kecamatan, address, notes, credit_limit, created_at, updated_at, sync_status, updated_at_local)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?)`,
          [
            r.id,
            r.user_id ?? userId,
            r.name,
            r.store_name ?? null,
            r.phone ?? null,
            r.kecamatan ?? null,
            r.address ?? null,
            r.notes ?? null,
            r.credit_limit ?? 0,
            r.created_at,
            r.updated_at,
            r.updated_at,
          ]
        )
      }
    })
  },

  mapRow(r: any): Customer {
    return {
      id: r.id,
      user_id: r.user_id,
      name: r.name,
      store_name: r.store_name ?? undefined,
      phone: r.phone ?? undefined,
      kecamatan: r.kecamatan ?? undefined,
      address: r.address ?? undefined,
      notes: r.notes ?? undefined,
      credit_limit: r.credit_limit ?? 0,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }
  },
}
