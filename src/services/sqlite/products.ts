import { query, queryOne, run, addToSyncQueue, transaction } from './db'
import { getCurrentUserId, uuid, nowIso } from './db'
import type { Product, ProductInsert, ProductUpdate, ProductWithCategory } from '@/types/database'

// ============================================================
// SQLite Service: Products
// Mirror dari src/services/products.ts tapi akses SQLite lokal.
// ============================================================

export const sqliteProductsService = {
  async getAll(includeInactive = false): Promise<ProductWithCategory[]> {
    const userId = getCurrentUserId()

    let sql = `SELECT p.id, p.user_id, p.name, p.description, p.category_id, p.price_buy,
                      p.price_sell, p.stock, p.minimum_stock, p.sku, p.barcode,
                      p.image_url, p.is_active, p.created_at, p.updated_at,
                      c.id AS cat_id, c.name AS cat_name, c.description AS cat_description
               FROM products p
               LEFT JOIN categories c ON c.id = p.category_id AND c.user_id = p.user_id
               WHERE p.user_id = ?`
    const params: (string | number | boolean)[] = [userId]

    if (!includeInactive) {
      sql += ' AND p.is_active = 1'
    }

    sql += ' ORDER BY p.name ASC'

    const rows = await query<any>(sql, params)
    return rows.map((r) => this.mapRow(r))
  },

  async getById(id: string): Promise<ProductWithCategory | null> {
    const userId = getCurrentUserId()
    const row = await queryOne<any>(
      `SELECT p.id, p.user_id, p.name, p.description, p.category_id, p.price_buy,
              p.price_sell, p.stock, p.minimum_stock, p.sku, p.barcode,
              p.image_url, p.is_active, p.created_at, p.updated_at,
              c.id AS cat_id, c.name AS cat_name, c.description AS cat_description
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id AND c.user_id = p.user_id
       WHERE p.id = ? AND p.user_id = ?`,
      [id, userId]
    )
    return row ? this.mapRow(row) : null
  },

  async getByCategory(categoryId: string): Promise<Product[]> {
    const userId = getCurrentUserId()
    const rows = await query<any>(
      `SELECT id, user_id, name, description, category_id, price_buy, price_sell,
              stock, minimum_stock, sku, barcode, image_url, is_active, created_at, updated_at
       FROM products
       WHERE category_id = ? AND user_id = ? AND is_active = 1
       ORDER BY name ASC`,
      [categoryId, userId]
    )
    return rows.map((r) => ({ ...r, is_active: !!r.is_active }))
  },

  async getBySku(sku: string): Promise<Product | null> {
    const userId = getCurrentUserId()
    const row = await queryOne<any>(
      `SELECT id, user_id, name, description, category_id, price_buy, price_sell,
              stock, minimum_stock, sku, barcode, image_url, is_active, created_at, updated_at
       FROM products
       WHERE sku = ? AND user_id = ?`,
      [sku, userId]
    )
    return row ? { ...row, is_active: !!row.is_active } : null
  },

  async getByBarcode(barcode: string): Promise<Product | null> {
    const userId = getCurrentUserId()
    const row = await queryOne<any>(
      `SELECT id, user_id, name, description, category_id, price_buy, price_sell,
              stock, minimum_stock, sku, barcode, image_url, is_active, created_at, updated_at
       FROM products
       WHERE barcode = ? AND user_id = ?`,
      [barcode, userId]
    )
    return row ? { ...row, is_active: !!row.is_active } : null
  },

  async create(product: ProductInsert): Promise<ProductWithCategory> {
    const userId = getCurrentUserId()
    const id = uuid()
    const now = nowIso()

    await transaction(async (tx) => {
      await tx.run(
        `INSERT INTO products (id, user_id, name, description, category_id, price_buy, price_sell,
                               stock, minimum_stock, sku, barcode, image_url, is_active,
                               created_at, updated_at, sync_status, updated_at_local)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
        [
          id,
          userId,
          product.name,
          product.description ?? null,
          product.category_id ?? null,
          product.price_buy,
          product.price_sell,
          product.stock ?? 0,
          product.minimum_stock ?? 10,
          product.sku ?? null,
          product.barcode ?? null,
          null, // image_url — tidak dipakai user
          product.is_active ?? 1,
          now,
          now,
          now,
        ]
      )
    })

    const created = {
      id,
      name: product.name,
      description: product.description,
      category_id: product.category_id,
      price_buy: product.price_buy,
      price_sell: product.price_sell,
      stock: product.stock ?? 0,
      minimum_stock: product.minimum_stock ?? 10,
      sku: product.sku,
      barcode: product.barcode,
      image_url: undefined,
      is_active: product.is_active ?? true,
      user_id: userId,
      created_at: now,
      updated_at: now,
      category: undefined,
    }

    await addToSyncQueue('INSERT', 'products', id, created)
    return created as ProductWithCategory
  },

  /** Insert banyak produk sekaligus (untuk import CSV / bulk). */
  async createMany(products: ProductInsert[]): Promise<ProductWithCategory[]> {
    if (products.length === 0) return []
    const userId = getCurrentUserId()
    const now = nowIso()

    const results: ProductWithCategory[] = []
    await transaction(async (tx) => {
      for (const p of products) {
        const id = uuid()
        await tx.run(
          `INSERT INTO products (id, user_id, name, description, category_id, price_buy, price_sell,
                                 stock, minimum_stock, sku, barcode, image_url, is_active,
                                 created_at, updated_at, sync_status, updated_at_local)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
          [
            id,
            userId,
            p.name,
            p.description ?? null,
            p.category_id ?? null,
            p.price_buy,
            p.price_sell,
            p.stock ?? 0,
            p.minimum_stock ?? 10,
            p.sku ?? null,
            p.barcode ?? null,
            null,
            p.is_active ?? 1,
            now,
            now,
            now,
          ]
        )
        results.push({
          id,
          name: p.name,
          description: p.description,
          category_id: p.category_id,
          price_buy: p.price_buy,
          price_sell: p.price_sell,
          stock: p.stock ?? 0,
          minimum_stock: p.minimum_stock ?? 10,
          sku: p.sku,
          barcode: p.barcode,
          image_url: undefined,
          is_active: p.is_active ?? true,
          user_id: userId,
          created_at: now,
          updated_at: now,
          category: undefined,
        } as ProductWithCategory)
      }
    })

    for (const r of results) {
      await addToSyncQueue('INSERT', 'products', r.id, r)
    }
    return results
  },

  async update(id: string, product: ProductUpdate): Promise<ProductWithCategory> {
    const userId = getCurrentUserId()
    const now = nowIso()

    const existing = await this.getById(id)
    if (!existing) throw new Error('Produk tidak ditemukan')

    // Merge data
    const updated = {
      ...existing,
      name: product.name ?? existing.name,
      description: product.description !== undefined ? product.description : existing.description,
      category_id: product.category_id !== undefined ? product.category_id : existing.category_id,
      price_buy: product.price_buy ?? existing.price_buy,
      price_sell: product.price_sell ?? existing.price_sell,
      stock: product.stock ?? existing.stock,
      minimum_stock: product.minimum_stock ?? existing.minimum_stock,
      sku: product.sku !== undefined ? product.sku : existing.sku,
      barcode: product.barcode !== undefined ? product.barcode : existing.barcode,
      is_active: product.is_active !== undefined ? product.is_active : existing.is_active,
      updated_at: now,
    }

    await transaction(async (tx) => {
      await tx.run(
        `UPDATE products
         SET name = ?, description = ?, category_id = ?, price_buy = ?, price_sell = ?,
             stock = ?, minimum_stock = ?, sku = ?, barcode = ?, is_active = ?,
             updated_at = ?, sync_status = 'pending', updated_at_local = ?
         WHERE id = ? AND user_id = ?`,
        [
          updated.name,
          updated.description ?? null,
          updated.category_id ?? null,
          updated.price_buy,
          updated.price_sell,
          updated.stock,
          updated.minimum_stock ?? null,
          updated.sku ?? null,
          updated.barcode ?? null,
          updated.is_active ? 1 : 0,
          now,
          now,
          id,
          userId,
        ]
      )
    })

    await addToSyncQueue('UPDATE', 'products', id, updated)
    return updated as ProductWithCategory
  },

  async delete(id: string): Promise<void> {
    const userId = getCurrentUserId()
    await transaction(async (tx) => {
      await tx.run('DELETE FROM products WHERE id = ? AND user_id = ?', [id, userId])
    })
    await addToSyncQueue('DELETE', 'products', id, { id })
  },

  async updateStock(id: string, quantity: number): Promise<ProductWithCategory> {
    const userId = getCurrentUserId()
    const now = nowIso()

    await transaction(async (tx) => {
      await tx.run(
        `UPDATE products SET stock = ?, updated_at = ?, sync_status = 'pending', updated_at_local = ?
         WHERE id = ? AND user_id = ?`,
        [quantity, now, now, id, userId]
      )
    })

    await addToSyncQueue('UPDATE', 'products', id, { id, stock: quantity })
    return (await this.getById(id))!
  },

  async adjustStock(id: string, adjustment: number): Promise<ProductWithCategory> {
    const product = await this.getById(id)
    if (!product) throw new Error('Produk tidak ditemukan')
    return this.updateStock(id, product.stock + adjustment)
  },

  async search(queryStr: string): Promise<ProductWithCategory[]> {
    const userId = getCurrentUserId()
    const rows = await query<any>(
      `SELECT p.id, p.user_id, p.name, p.description, p.category_id, p.price_buy,
              p.price_sell, p.stock, p.minimum_stock, p.sku, p.barcode,
              p.image_url, p.is_active, p.created_at, p.updated_at,
              c.id AS cat_id, c.name AS cat_name, c.description AS cat_description
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id AND c.user_id = p.user_id
       WHERE p.user_id = ? AND p.is_active = 1
         AND (p.name LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ?)
       ORDER BY p.name ASC`,
      [userId, `%${queryStr}%`, `%${queryStr}%`, `%${queryStr}%`]
    )
    return rows.map((r) => this.mapRow(r))
  },

  async getLowStock(threshold = 10): Promise<ProductWithCategory[]> {
    const userId = getCurrentUserId()
    const rows = await query<any>(
      `SELECT p.id, p.user_id, p.name, p.description, p.category_id, p.price_buy,
              p.price_sell, p.stock, p.minimum_stock, p.sku, p.barcode,
              p.image_url, p.is_active, p.created_at, p.updated_at,
              c.id AS cat_id, c.name AS cat_name, c.description AS cat_description
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id AND c.user_id = p.user_id
       WHERE p.user_id = ? AND p.is_active = 1 AND p.stock <= ?
       ORDER BY p.stock ASC`,
      [userId, threshold]
    )
    return rows.map((r) => this.mapRow(r))
  },

  // ============================================================
  // Helper khusus sync
  // ============================================================

  async replaceAll(records: Product[]): Promise<void> {
    const userId = getCurrentUserId()
    await transaction(async (tx) => {
      await tx.run('DELETE FROM products WHERE user_id = ?', [userId])
      for (const r of records) {
        await tx.run(
          `INSERT OR REPLACE INTO products (id, user_id, name, description, category_id,
                   price_buy, price_sell, stock, minimum_stock, sku, barcode, image_url,
                   is_active, created_at, updated_at, sync_status, updated_at_local)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?)`,
          [
            r.id,
            r.user_id ?? userId,
            r.name,
            r.description ?? null,
            r.category_id ?? null,
            r.price_buy,
            r.price_sell,
            r.stock,
            r.minimum_stock ?? 10,
            r.sku ?? null,
            r.barcode ?? null,
            r.image_url ?? null,
            r.is_active ? 1 : 0,
            r.created_at,
            r.updated_at,
            r.updated_at,
          ]
        )
      }
    })
  },

  mapRow(r: any): ProductWithCategory {
    const category = r.cat_id
      ? { id: r.cat_id, name: r.cat_name, description: r.cat_description ?? undefined, user_id: r.user_id, created_at: '', updated_at: '' }
      : undefined

    return {
      id: r.id,
      user_id: r.user_id,
      name: r.name,
      description: r.description ?? undefined,
      category_id: r.category_id ?? undefined,
      price_buy: r.price_buy,
      price_sell: r.price_sell,
      stock: r.stock,
      minimum_stock: r.minimum_stock ?? undefined,
      sku: r.sku ?? undefined,
      barcode: r.barcode ?? undefined,
      image_url: r.image_url ?? undefined,
      is_active: !!r.is_active,
      created_at: r.created_at,
      updated_at: r.updated_at,
      category,
    }
  },
}