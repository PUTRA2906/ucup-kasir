import { query, queryOne, run, addToSyncQueue, transaction } from './db'
import { getCurrentUserId, uuid, nowIso } from './db'
import type {
  PriceTier,
  CustomerPriceMatrix,
  CustomerGroup,
  CustomerGroupWithMembers,
  CustomerGroupMember,
} from '@/types/priceMatrix'

// ============================================================
// SQLite Service: Price Matrix (tier, harga customer/grup, grup)
// Mirror dari src/services/priceMatrix.ts — akses SQLite lokal,
// tulis ke sync_queue agar naik ke Supabase nanti.
// Bentuk hasil query menyamai Supabase (objek relasi `product`,
// `customer`, `group`, `members`).
// ============================================================

const boolToInt = (v: unknown) => (v === false || v === 0 ? 0 : 1)

// ---------- mappers (row SQLite → bentuk Supabase) ----------
function mapTier(r: any): PriceTier & { product?: any } {
  return {
    id: r.id,
    user_id: r.user_id,
    product_id: r.product_id,
    min_quantity: r.min_quantity,
    max_quantity: r.max_quantity ?? null,
    tier_price: r.tier_price,
    tier_name: r.tier_name ?? undefined,
    is_active: !!r.is_active,
    start_date: r.start_date ?? undefined,
    end_date: r.end_date ?? undefined,
    created_at: r.created_at,
    updated_at: r.updated_at,
    ...(r.product_name
      ? { product: { id: r.product_id, name: r.product_name, sku: r.product_sku, price_sell: r.product_price_sell } }
      : {}),
  }
}

function mapPrice(r: any): CustomerPriceMatrix & { customer?: any; group?: any; product?: any } {
  return {
    id: r.id,
    user_id: r.user_id,
    customer_id: r.customer_id ?? null,
    group_id: r.group_id ?? null,
    product_id: r.product_id,
    custom_price: r.custom_price,
    min_quantity: r.min_quantity,
    is_active: !!r.is_active,
    start_date: r.start_date ?? undefined,
    end_date: r.end_date ?? undefined,
    notes: r.notes ?? undefined,
    created_at: r.created_at,
    updated_at: r.updated_at,
    customer: r.customer_id ? { id: r.customer_id, name: r.customer_name ?? '' } : null,
    group: r.group_id ? { id: r.group_id, name: r.group_name ?? '' } : null,
    product: r.product_id ? { id: r.product_id, name: r.product_name ?? '', sku: r.product_sku, price_sell: r.product_price_sell } : undefined,
  }
}

const TIER_SELECT = `
  SELECT pt.*, p.name AS product_name, p.sku AS product_sku, p.price_sell AS product_price_sell
  FROM price_tiers pt
  LEFT JOIN products p ON p.id = pt.product_id`

const PRICE_SELECT = `
  SELECT cpm.*,
         c.name AS customer_name,
         g.name AS group_name,
         p.name AS product_name, p.sku AS product_sku, p.price_sell AS product_price_sell
  FROM customer_price_matrix cpm
  LEFT JOIN customers c ON c.id = cpm.customer_id
  LEFT JOIN customer_groups g ON g.id = cpm.group_id
  LEFT JOIN products p ON p.id = cpm.product_id`

async function loadMembers(groupIds: string[]): Promise<Map<string, Array<{ customer_id: string; customer: { id: string; name: string } }>>> {
  const map = new Map<string, Array<{ customer_id: string; customer: { id: string; name: string } }>>()
  if (!groupIds.length) return map
  const userId = getCurrentUserId()
  const placeholders = groupIds.map(() => '?').join(',')
  const rows = await query<any>(
    `SELECT cgm.group_id, cgm.customer_id, c.name AS customer_name
     FROM customer_group_members cgm
     LEFT JOIN customers c ON c.id = cgm.customer_id
     WHERE cgm.user_id = ? AND cgm.group_id IN (${placeholders})
     ORDER BY c.name ASC`,
    [userId, ...groupIds]
  )
  for (const r of rows) {
    if (!map.has(r.group_id)) map.set(r.group_id, [])
    map.get(r.group_id)!.push({ customer_id: r.customer_id, customer: { id: r.customer_id, name: r.customer_name ?? '' } })
  }
  return map
}

function rawTierPayload(data: Partial<PriceTier>): Record<string, any> {
  const p: Record<string, any> = { ...data }
  delete (p as any).product
  if (p.is_active !== undefined) p.is_active = !!p.is_active
  return p
}

// ============================================================

export const sqlitePriceMatrixService = {
  // ---------- Price Tiers ----------
  async getPriceTiers(productId?: string): Promise<PriceTier[]> {
    const userId = getCurrentUserId()
    const rows = await query<any>(
      `${TIER_SELECT} WHERE pt.user_id = ? ${productId ? 'AND pt.product_id = ?' : ''} ORDER BY pt.created_at DESC`,
      productId ? [userId, productId] : [userId]
    )
    return rows.map(mapTier)
  },

  async getPriceTier(id: string): Promise<PriceTier> {
    const userId = getCurrentUserId()
    const row = await queryOne<any>(`${TIER_SELECT} WHERE pt.id = ? AND pt.user_id = ?`, [id, userId])
    if (!row) throw new Error('Price tier tidak ditemukan')
    return mapTier(row)
  },

  async createPriceTier(data: Partial<PriceTier>): Promise<PriceTier> {
    const userId = getCurrentUserId()
    await assertNoTierOverlap(userId, data, null)
    const id = uuid()
    const now = nowIso()
    const record: PriceTier = {
      id,
      user_id: userId,
      product_id: data.product_id!,
      min_quantity: data.min_quantity ?? 1,
      max_quantity: data.max_quantity ?? null,
      tier_price: data.tier_price ?? 0,
      tier_name: data.tier_name,
      is_active: data.is_active ?? true,
      start_date: data.start_date,
      end_date: data.end_date,
      created_at: now,
      updated_at: now,
    }
    await transaction(async (tx) => {
      await tx.run(
        `INSERT INTO price_tiers (id, user_id, product_id, min_quantity, max_quantity, tier_price, tier_name, is_active, start_date, end_date, created_at, updated_at, sync_status, updated_at_local)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
        [id, userId, record.product_id, record.min_quantity, record.max_quantity, record.tier_price, record.tier_name ?? null, boolToInt(record.is_active), record.start_date ?? null, record.end_date ?? null, now, now, now]
      )
    })
    await addToSyncQueue('INSERT', 'price_tiers', id, rawTierPayload(record))
    return record
  },

  async updatePriceTier(id: string, data: Partial<PriceTier>): Promise<PriceTier> {
    const userId = getCurrentUserId()
    const row = await queryOne<any>('SELECT * FROM price_tiers WHERE id = ? AND user_id = ?', [id, userId])
    if (!row) throw new Error('Price tier tidak ditemukan')
    const existing = mapTier(row)
    const merged = { ...existing, ...data, updated_at: nowIso() }
    if (data.min_quantity !== undefined || data.max_quantity !== undefined || data.is_active !== undefined || data.start_date !== undefined || data.end_date !== undefined || data.product_id !== undefined) {
      await assertNoTierOverlap(userId, merged, id)
    }
    await transaction(async (tx) => {
      await tx.run(
        `UPDATE price_tiers SET product_id = ?, min_quantity = ?, max_quantity = ?, tier_price = ?, tier_name = ?, is_active = ?, start_date = ?, end_date = ?, updated_at = ?, sync_status = 'pending', updated_at_local = ?
         WHERE id = ? AND user_id = ?`,
        [merged.product_id, merged.min_quantity, merged.max_quantity ?? null, merged.tier_price, merged.tier_name ?? null, boolToInt(merged.is_active), merged.start_date ?? null, merged.end_date ?? null, merged.updated_at, merged.updated_at, id, userId]
      )
    })
    await addToSyncQueue('UPDATE', 'price_tiers', id, rawTierPayload(merged))
    return merged
  },

  async deletePriceTier(id: string): Promise<void> {
    const userId = getCurrentUserId()
    await transaction(async (tx) => {
      await tx.run('DELETE FROM price_tiers WHERE id = ? AND user_id = ?', [id, userId])
    })
    await addToSyncQueue('DELETE', 'price_tiers', id, { id })
  },

  // ---------- Customer Price Matrix ----------
  async getCustomerPrices(customerId?: string, productId?: string, groupId?: string): Promise<CustomerPriceMatrix[]> {
    const userId = getCurrentUserId()
    const conds = ['cpm.user_id = ?']
    const params: any[] = [userId]
    if (customerId) { conds.push('cpm.customer_id = ?'); params.push(customerId) }
    if (groupId) { conds.push('cpm.group_id = ?'); params.push(groupId) }
    if (productId) { conds.push('cpm.product_id = ?'); params.push(productId) }
    const rows = await query<any>(`${PRICE_SELECT} WHERE ${conds.join(' AND ')} ORDER BY cpm.created_at DESC`, params)
    return rows.map(mapPrice)
  },

  async getIndividualPrices(productId?: string): Promise<CustomerPriceMatrix[]> {
    const userId = getCurrentUserId()
    const rows = await query<any>(
      `${PRICE_SELECT} WHERE cpm.user_id = ? AND cpm.customer_id IS NOT NULL ${productId ? 'AND cpm.product_id = ?' : ''} ORDER BY cpm.created_at DESC`,
      productId ? [userId, productId] : [userId]
    )
    return rows.map(mapPrice)
  },

  async getGroupPrices(productId?: string): Promise<CustomerPriceMatrix[]> {
    const userId = getCurrentUserId()
    const rows = await query<any>(
      `${PRICE_SELECT} WHERE cpm.user_id = ? AND cpm.group_id IS NOT NULL ${productId ? 'AND cpm.product_id = ?' : ''} ORDER BY cpm.created_at DESC`,
      productId ? [userId, productId] : [userId]
    )
    return rows.map(mapPrice)
  },

  async getCustomerPrice(id: string): Promise<CustomerPriceMatrix> {
    const userId = getCurrentUserId()
    const row = await queryOne<any>(`${PRICE_SELECT} WHERE cpm.id = ? AND cpm.user_id = ?`, [id, userId])
    if (!row) throw new Error('Harga khusus tidak ditemukan')
    return mapPrice(row)
  },

  async createCustomerPrice(data: Partial<CustomerPriceMatrix>): Promise<CustomerPriceMatrix> {
    const list = await this.createCustomerPrices([data])
    return list[0]
  },

  async createCustomerPrices(list: Array<Partial<CustomerPriceMatrix>>): Promise<CustomerPriceMatrix[]> {
    const userId = getCurrentUserId()
    const now = nowIso()
    const results: CustomerPriceMatrix[] = []
    await transaction(async (tx) => {
      for (const d of list) {
        const id = uuid()
        const record: CustomerPriceMatrix = {
          id,
          user_id: userId,
          customer_id: d.customer_id ?? null,
          group_id: d.group_id ?? null,
          product_id: d.product_id!,
          custom_price: d.custom_price ?? 0,
          min_quantity: d.min_quantity ?? 1,
          is_active: d.is_active ?? true,
          start_date: d.start_date,
          end_date: d.end_date,
          notes: d.notes,
          created_at: now,
          updated_at: now,
        }
        await tx.run(
          `INSERT INTO customer_price_matrix (id, user_id, customer_id, group_id, product_id, custom_price, min_quantity, is_active, start_date, end_date, notes, created_at, updated_at, sync_status, updated_at_local)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
          [id, userId, record.customer_id, record.group_id, record.product_id, record.custom_price, record.min_quantity, boolToInt(record.is_active), record.start_date ?? null, record.end_date ?? null, record.notes ?? null, now, now, now]
        )
        results.push(record)
      }
    })
    for (const r of results) {
      const { customer, group, product, ...raw } = r as any
      await addToSyncQueue('INSERT', 'customer_price_matrix', r.id, raw)
    }
    return results
  },

  async updateCustomerPrice(id: string, data: Partial<CustomerPriceMatrix>): Promise<CustomerPriceMatrix> {
    const userId = getCurrentUserId()
    const row = await queryOne<any>('SELECT * FROM customer_price_matrix WHERE id = ? AND user_id = ?', [id, userId])
    if (!row) throw new Error('Harga khusus tidak ditemukan')
    const merged: CustomerPriceMatrix = { ...mapPrice(row), ...data, updated_at: nowIso() }
    await transaction(async (tx) => {
      await tx.run(
        `UPDATE customer_price_matrix SET customer_id = ?, group_id = ?, product_id = ?, custom_price = ?, min_quantity = ?, is_active = ?, start_date = ?, end_date = ?, notes = ?, updated_at = ?, sync_status = 'pending', updated_at_local = ?
         WHERE id = ? AND user_id = ?`,
        [merged.customer_id, merged.group_id, merged.product_id, merged.custom_price, merged.min_quantity, boolToInt(merged.is_active), merged.start_date ?? null, merged.end_date ?? null, merged.notes ?? null, merged.updated_at, merged.updated_at, id, userId]
      )
    })
    const { customer, group, product, ...raw } = merged as any
    await addToSyncQueue('UPDATE', 'customer_price_matrix', id, raw)
    return merged
  },

  async deleteCustomerPrice(id: string): Promise<void> {
    const userId = getCurrentUserId()
    await transaction(async (tx) => {
      await tx.run('DELETE FROM customer_price_matrix WHERE id = ? AND user_id = ?', [id, userId])
    })
    await addToSyncQueue('DELETE', 'customer_price_matrix', id, { id })
  },

  // ---------- Resolusi harga (mirror RPC get_applicable_price) ----------
  async getApplicablePrice(
    productId: string,
    customerId?: string,
    quantity: number = 1,
    date: string = new Date().toISOString().split('T')[0]
  ): Promise<number> {
    const userId = getCurrentUserId()
    const def = await queryOne<{ price_sell: number }>('SELECT price_sell FROM products WHERE id = ? AND user_id = ?', [productId, userId])
    if (!def) throw new Error('Produk tidak ditemukan')

    if (customerId) {
      // 1. harga per pelanggan
      const c = await queryOne<{ custom_price: number }>(
        `SELECT custom_price FROM customer_price_matrix
         WHERE user_id = ? AND customer_id = ? AND product_id = ? AND is_active = 1 AND ? >= min_quantity
           AND (start_date IS NULL OR start_date <= ?) AND (end_date IS NULL OR end_date >= ?)
         ORDER BY min_quantity DESC LIMIT 1`,
        [userId, customerId, productId, quantity, date, date]
      )
      if (c) return c.custom_price
      // 2. harga per grup (termurah bila beberapa grup cocok)
      const g = await queryOne<{ custom_price: number }>(
        `SELECT MIN(cpm.custom_price) AS custom_price
         FROM customer_price_matrix cpm
         JOIN customer_group_members cgm ON cgm.group_id = cpm.group_id
         WHERE cpm.user_id = ? AND cgm.customer_id = ? AND cpm.product_id = ? AND cpm.is_active = 1 AND ? >= cpm.min_quantity
           AND (cpm.start_date IS NULL OR cpm.start_date <= ?) AND (cpm.end_date IS NULL OR cpm.end_date >= ?)`,
        [userId, customerId, productId, quantity, date, date]
      )
      if (g && g.custom_price != null) return g.custom_price
    }

    // 3. tier kuantitas
    const t = await queryOne<{ tier_price: number }>(
      `SELECT tier_price FROM price_tiers
       WHERE user_id = ? AND product_id = ? AND is_active = 1 AND ? >= min_quantity
         AND (max_quantity IS NULL OR ? <= max_quantity)
         AND (start_date IS NULL OR start_date <= ?) AND (end_date IS NULL OR end_date >= ?)
       ORDER BY min_quantity DESC LIMIT 1`,
      [userId, productId, quantity, quantity, date, date]
    )
    if (t) return t.tier_price

    // 4. default
    return def.price_sell
  },

  // ---------- Customer Groups ----------
  async getGroups(): Promise<CustomerGroupWithMembers[]> {
    const userId = getCurrentUserId()
    const rows = await query<any>(
      'SELECT * FROM customer_groups WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    )
    const groups = rows.map(mapGroup)
    const members = await loadMembers(groups.map((g) => g.id))
    return groups.map((g) => {
      const m = members.get(g.id) || []
      return { ...g, members: m, member_count: m.length }
    })
  },

  async getGroup(id: string): Promise<CustomerGroupWithMembers> {
    const userId = getCurrentUserId()
    const row = await queryOne<any>('SELECT * FROM customer_groups WHERE id = ? AND user_id = ?', [id, userId])
    if (!row) throw new Error('Grup tidak ditemukan')
    const g = mapGroup(row)
    const members = await loadMembers([id])
    const m = members.get(id) || []
    return { ...g, members: m, member_count: m.length }
  },

  async createGroup(data: Partial<CustomerGroup>, memberIds: string[] = []): Promise<CustomerGroup> {
    const userId = getCurrentUserId()
    const id = uuid()
    const now = nowIso()
    const record: CustomerGroup = {
      id,
      user_id: userId,
      name: data.name!,
      notes: data.notes,
      is_active: data.is_active ?? true,
      created_at: now,
      updated_at: now,
    }
    const memberRecords: CustomerGroupMember[] = []
    await transaction(async (tx) => {
      await tx.run(
        `INSERT INTO customer_groups (id, user_id, name, notes, is_active, created_at, updated_at, sync_status, updated_at_local)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
        [id, userId, record.name, record.notes ?? null, boolToInt(record.is_active), now, now, now]
      )
      for (const customer_id of memberIds) {
        const memberId = uuid()
        await tx.run(
          `INSERT OR IGNORE INTO customer_group_members (id, user_id, group_id, customer_id, created_at, sync_status, updated_at_local)
           VALUES (?, ?, ?, ?, ?, 'pending', ?)`,
          [memberId, userId, id, customer_id, now, now]
        )
        memberRecords.push({ id: memberId, user_id: userId, group_id: id, customer_id, created_at: now })
      }
    })
    await addToSyncQueue('INSERT', 'customer_groups', id, { ...record, is_active: !!record.is_active })
    for (const m of memberRecords) {
      await addToSyncQueue('INSERT', 'customer_group_members', m.id, m)
    }
    return record
  },

  async updateGroup(id: string, data: Partial<CustomerGroup>, memberIds?: string[]): Promise<CustomerGroup> {
    const userId = getCurrentUserId()
    const row = await queryOne<any>('SELECT * FROM customer_groups WHERE id = ? AND user_id = ?', [id, userId])
    if (!row) throw new Error('Grup tidak ditemukan')
    const merged: CustomerGroup = { ...mapGroup(row), ...data, updated_at: nowIso() }
    const memberToAdd: CustomerGroupMember[] = []
    const memberIdsToRemove: string[] = []
    await transaction(async (tx) => {
      await tx.run(
        `UPDATE customer_groups SET name = ?, notes = ?, is_active = ?, updated_at = ?, sync_status = 'pending', updated_at_local = ?
         WHERE id = ? AND user_id = ?`,
        [merged.name, merged.notes ?? null, boolToInt(merged.is_active), merged.updated_at, merged.updated_at, id, userId]
      )
      if (memberIds) {
        const existing = await tx.query<any>('SELECT id, customer_id FROM customer_group_members WHERE group_id = ? AND user_id = ?', [id, userId])
        const current = new Map(existing.map((r: any) => [r.customer_id, r.id]))
        const wanted = new Set(memberIds)
        for (const [customerId, memberId] of current) {
          if (!wanted.has(customerId)) {
            await tx.run('DELETE FROM customer_group_members WHERE id = ?', [memberId])
            memberIdsToRemove.push(memberId)
          }
        }
        for (const c of wanted) {
          if (!current.has(c)) {
            const memberId = uuid()
            await tx.run(
              `INSERT INTO customer_group_members (id, user_id, group_id, customer_id, created_at, sync_status, updated_at_local)
               VALUES (?, ?, ?, ?, ?, 'pending', ?)`,
              [memberId, userId, id, c, merged.updated_at, merged.updated_at]
            )
            memberToAdd.push({ id: memberId, user_id: userId, group_id: id, customer_id: c, created_at: merged.updated_at })
          }
        }
      }
    })
    await addToSyncQueue('UPDATE', 'customer_groups', id, { ...merged, is_active: !!merged.is_active })
    // Anggota grup: satu operasi per baris (INSERT/DELETE by id) agar sync engine generik.
    for (const m of memberToAdd) {
      await addToSyncQueue('INSERT', 'customer_group_members', m.id, m)
    }
    for (const memberId of memberIdsToRemove) {
      await addToSyncQueue('DELETE', 'customer_group_members', memberId, { id: memberId })
    }
    return merged
  },

  async deleteGroup(id: string): Promise<void> {
    const userId = getCurrentUserId()
    await transaction(async (tx) => {
      await tx.run('DELETE FROM customer_groups WHERE id = ? AND user_id = ?', [id, userId])
    })
    await addToSyncQueue('DELETE', 'customer_groups', id, { id })
  },

  // ---------- Helper khusus sync ----------
  async replaceAllPriceTiers(records: any[]): Promise<void> {
    const userId = getCurrentUserId()
    await transaction(async (tx) => {
      await tx.run('DELETE FROM price_tiers WHERE user_id = ?', [userId])
      for (const r of records) {
        await tx.run(
          `INSERT OR REPLACE INTO price_tiers (id, user_id, product_id, min_quantity, max_quantity, tier_price, tier_name, is_active, start_date, end_date, created_at, updated_at, sync_status, updated_at_local)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?)`,
          [r.id, r.user_id ?? userId, r.product_id, r.min_quantity, r.max_quantity ?? null, r.tier_price, r.tier_name ?? null, boolToInt(r.is_active), r.start_date ?? null, r.end_date ?? null, r.created_at, r.updated_at, r.updated_at]
        )
      }
    })
  },

  async replaceAllCustomerPrices(records: any[]): Promise<void> {
    const userId = getCurrentUserId()
    await transaction(async (tx) => {
      await tx.run('DELETE FROM customer_price_matrix WHERE user_id = ?', [userId])
      for (const r of records) {
        await tx.run(
          `INSERT OR REPLACE INTO customer_price_matrix (id, user_id, customer_id, group_id, product_id, custom_price, min_quantity, is_active, start_date, end_date, notes, created_at, updated_at, sync_status, updated_at_local)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?)`,
          [r.id, r.user_id ?? userId, r.customer_id ?? null, r.group_id ?? null, r.product_id, r.custom_price, r.min_quantity, boolToInt(r.is_active), r.start_date ?? null, r.end_date ?? null, r.notes ?? null, r.created_at, r.updated_at, r.updated_at]
        )
      }
    })
  },

  async replaceAllGroups(records: any[]): Promise<void> {
    const userId = getCurrentUserId()
    await transaction(async (tx) => {
      await tx.run('DELETE FROM customer_groups WHERE user_id = ?', [userId])
      for (const r of records) {
        await tx.run(
          `INSERT OR REPLACE INTO customer_groups (id, user_id, name, notes, is_active, created_at, updated_at, sync_status, updated_at_local)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'synced', ?)`,
          [r.id, r.user_id ?? userId, r.name, r.notes ?? null, boolToInt(r.is_active), r.created_at, r.updated_at, r.updated_at]
        )
      }
    })
  },

  async mergeGroups(records: any[]): Promise<void> {
    if (records.length === 0) return
    const userId = getCurrentUserId()
    await transaction(async (tx) => {
      for (const r of records) {
        const existing = await tx.query<{ sync_status: string }>(
          'SELECT sync_status FROM customer_groups WHERE id = ?',
          [r.id]
        )

        if (existing.length > 0 && existing[0].sync_status !== 'synced') {
          continue
        }

        await tx.run(
          `INSERT OR REPLACE INTO customer_groups (id, user_id, name, notes, is_active, created_at, updated_at, sync_status, updated_at_local)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'synced', ?)`,
          [r.id, r.user_id ?? userId, r.name, r.notes ?? null, boolToInt(r.is_active), r.created_at, r.updated_at, r.updated_at]
        )
      }
    })
  },

  async replaceAllGroupMembers(records: any[]): Promise<void> {
    const userId = getCurrentUserId()
    await transaction(async (tx) => {
      await tx.run('DELETE FROM customer_group_members WHERE user_id = ?', [userId])
      for (const r of records) {
        await tx.run(
          `INSERT OR REPLACE INTO customer_group_members (id, user_id, group_id, customer_id, created_at, sync_status, updated_at_local)
           VALUES (?, ?, ?, ?, ?, 'synced', ?)`,
          [r.id, r.user_id ?? userId, r.group_id, r.customer_id, r.created_at, r.created_at]
        )
      }
    })
  },
}

function mapGroup(r: any): CustomerGroup {
  return {
    id: r.id,
    user_id: r.user_id,
    name: r.name,
    notes: r.notes ?? undefined,
    is_active: !!r.is_active,
    created_at: r.created_at,
    updated_at: r.updated_at,
  }
}

/**
 * Validasi tumpang-tindih range tier (mirror trigger validate_price_tier_range
 * di Supabase) agar error muncul saat input, bukan saat upload sync.
 */
async function assertNoTierOverlap(userId: string, t: Partial<PriceTier>, excludeId: string | null): Promise<void> {
  if (!t.product_id || !t.is_active) return
  const maxQ = t.max_quantity ?? 999999
  const rows = await query<any>(
    `SELECT id, min_quantity, max_quantity, start_date, end_date FROM price_tiers
     WHERE user_id = ? AND product_id = ? AND is_active = 1 ${excludeId ? 'AND id != ?' : ''}`,
    excludeId ? [userId, t.product_id, excludeId] : [userId, t.product_id]
  )
  const dateOverlap = (aS?: string | null, aE?: string | null, bS?: string | null, bE?: string | null) => {
    if (!aS || !bS) return !aS && !bS
    const aEnd = aE || '9999-12-31'
    const bEnd = bE || '9999-12-31'
    return aS <= bEnd && bS <= aEnd
  }
  for (const r of rows) {
    const rMax = r.max_quantity ?? 999999
    const qtyOverlap = t.min_quantity! <= rMax && r.min_quantity <= maxQ
    if (qtyOverlap && dateOverlap(t.start_date, t.end_date, r.start_date, r.end_date)) {
      throw new Error('Range kuantitas atau periode bertumpuk dengan tier harga lain untuk produk ini')
    }
  }
}
