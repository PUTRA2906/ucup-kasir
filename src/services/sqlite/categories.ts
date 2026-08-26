import { query, queryOne, run, addToSyncQueue, transaction } from './db'
import { getCurrentUserId, uuid, nowIso } from './db'
import type { Category, CategoryInsert, CategoryUpdate } from '@/types/database'

// ============================================================
// SQLite Service: Categories
// Mirror dari src/services/categories.ts tapi akses SQLite lokal.
// Setiap operasi write menambahkan ke sync_queue untuk backup.
// ============================================================

export const sqliteCategoriesService = {
  async getAll(): Promise<Category[]> {
    const userId = getCurrentUserId()
    const rows = await query<any>(
      `SELECT id, user_id, name, description, created_at, updated_at
       FROM categories
       WHERE user_id = ?
       ORDER BY name ASC`,
      [userId]
    )
    return rows.map((r) => this.mapRow(r))
  },

  async getById(id: string): Promise<Category | null> {
    const userId = getCurrentUserId()
    const row = await queryOne<any>(
      `SELECT id, user_id, name, description, created_at, updated_at
       FROM categories
       WHERE id = ? AND user_id = ?`,
      [id, userId]
    )
    return row ? this.mapRow(row) : null
  },

  async create(category: CategoryInsert): Promise<Category> {
    const userId = getCurrentUserId()
    const id = uuid()
    const now = nowIso()

    const result = await transaction(async (tx) => {
      await tx.run(
        `INSERT INTO categories (id, user_id, name, description, created_at, updated_at, sync_status, updated_at_local)
         VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`,
        [id, userId, category.name, category.description ?? null, now, now, now]
      )
    })

    // Queue untuk backup ke Supabase
    const created: Category = {
      id,
      user_id: userId,
      name: category.name,
      description: category.description,
      created_at: now,
      updated_at: now,
    }
    await addToSyncQueue('INSERT', 'categories', id, created)

    return created
  },

  /** Insert banyak kategori sekaligus (untuk sync/import bulk). */
  async createMany(categories: CategoryInsert[]): Promise<Category[]> {
    if (categories.length === 0) return []
    const userId = getCurrentUserId()
    const now = nowIso()

    const results: Category[] = []
    await transaction(async (tx) => {
      for (const cat of categories) {
        const id = uuid()
        await tx.run(
          `INSERT INTO categories (id, user_id, name, description, created_at, updated_at, sync_status, updated_at_local)
           VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`,
          [id, userId, cat.name, cat.description ?? null, now, now, now]
        )
        results.push({
          id,
          user_id: userId,
          name: cat.name,
          description: cat.description,
          created_at: now,
          updated_at: now,
        })
      }
    })

    for (const r of results) {
      await addToSyncQueue('INSERT', 'categories', r.id, r)
    }
    return results
  },

  async update(id: string, category: CategoryUpdate): Promise<Category> {
    const userId = getCurrentUserId()
    const now = nowIso()

    const existing = await this.getById(id)
    if (!existing) throw new Error('Kategori tidak ditemukan')

    const updated: Category = {
      ...existing,
      ...category,
      updated_at: now,
    }

    await transaction(async (tx) => {
      await tx.run(
        `UPDATE categories
         SET name = ?, description = ?, updated_at = ?, sync_status = 'pending', updated_at_local = ?
         WHERE id = ? AND user_id = ?`,
        [updated.name, updated.description ?? null, now, now, id, userId]
      )
    })

    await addToSyncQueue('UPDATE', 'categories', id, updated)
    return updated
  },

  async delete(id: string): Promise<void> {
    const userId = getCurrentUserId()
    await transaction(async (tx) => {
      await tx.run('DELETE FROM categories WHERE id = ? AND user_id = ?', [id, userId])
    })
    await addToSyncQueue('DELETE', 'categories', id, { id })
  },

  async search(queryStr: string): Promise<Category[]> {
    const userId = getCurrentUserId()
    const rows = await query<any>(
      `SELECT id, user_id, name, description, created_at, updated_at
       FROM categories
       WHERE user_id = ? AND name LIKE ?
       ORDER BY name ASC`,
      [userId, `%${queryStr}%`]
    )
    return rows.map((r) => this.mapRow(r))
  },

  // ============================================================
  // Helper khusus sync (memasukkan data dari Supabase)
  // ============================================================

  /** Replace semua data categories dari hasil download Supabase. */
  async replaceAll(records: Category[]): Promise<void> {
    const userId = getCurrentUserId()
    await transaction(async (tx) => {
      await tx.run('DELETE FROM categories WHERE user_id = ?', [userId])
      for (const r of records) {
        await tx.run(
          `INSERT OR REPLACE INTO categories (id, user_id, name, description, created_at, updated_at, sync_status, updated_at_local)
           VALUES (?, ?, ?, ?, ?, ?, 'synced', ?)`,
          [r.id, r.user_id ?? userId, r.name, r.description ?? null, r.created_at, r.updated_at, r.updated_at]
        )
      }
    })
  },

  private mapRow(r: any): Category {
    return {
      id: r.id,
      user_id: r.user_id,
      name: r.name,
      description: r.description ?? undefined,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }
  },
}
