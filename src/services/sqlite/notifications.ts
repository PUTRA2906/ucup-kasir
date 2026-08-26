import { query, queryOne, run, addToSyncQueue, transaction } from './db'
import { getCurrentUserId, uuid, nowIso } from './db'

// ============================================================
// SQLite Service: Notifications
// Mirror dari src/stores/notifications.ts (logika yang ada di store)
// tapi akses SQLite lokal. Semua query filter user_id manual.
// ============================================================

export interface SqliteNotification {
  id: string
  user_id: string
  type: 'stock_alert' | 'transaction' | 'return' | 'system' | 'payment'
  title: string
  message: string
  data?: any
  is_read: boolean
  created_at: string
  read_at?: string
}

export const sqliteNotificationsService = {
  async fetchNotifications(limit: number = 50): Promise<SqliteNotification[]> {
    const userId = getCurrentUserId()
    const rows = await query<any>(
      `SELECT id, user_id, type, title, message, data, is_read, created_at, read_at
       FROM notifications
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT ?`,
      [userId, limit]
    )
    return rows.map((r) => this.mapRow(r))
  },

  async fetchUnreadNotifications(): Promise<SqliteNotification[]> {
    const userId = getCurrentUserId()
    const rows = await query<any>(
      `SELECT id, user_id, type, title, message, data, is_read, created_at, read_at
       FROM notifications
       WHERE user_id = ? AND is_read = 0
       ORDER BY created_at DESC`,
      [userId]
    )
    return rows.map((r) => this.mapRow(r))
  },

  async fetchUnreadCount(): Promise<number> {
    const userId = getCurrentUserId()
    const row = await queryOne<any>(
      `SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND is_read = 0`,
      [userId]
    )
    return row?.count ?? 0
  },

  async markAsRead(notificationId: string): Promise<void> {
    const userId = getCurrentUserId()
    const now = nowIso()
    await run(
      `UPDATE notifications SET is_read = 1, read_at = ?, sync_status = 'pending', updated_at_local = ?
       WHERE id = ? AND user_id = ?`,
      [now, now, notificationId, userId]
    )
    await addToSyncQueue('UPDATE', 'notifications', notificationId, { id: notificationId, is_read: true, read_at: now })
  },

  async markAllAsRead(): Promise<void> {
    const userId = getCurrentUserId()
    const now = nowIso()
    // Ambil semua id yang belum dibaca untuk di-queue
    const unread = await query<any>(
      `SELECT id FROM notifications WHERE user_id = ? AND is_read = 0`,
      [userId]
    )
    await run(
      `UPDATE notifications SET is_read = 1, read_at = ?, sync_status = 'pending', updated_at_local = ?
       WHERE user_id = ? AND is_read = 0`,
      [now, now, userId]
    )
    for (const n of unread) {
      await addToSyncQueue('UPDATE', 'notifications', n.id, { id: n.id, is_read: true, read_at: now })
    }
  },

  async deleteNotification(notificationId: string): Promise<void> {
    const userId = getCurrentUserId()
    await run(`DELETE FROM notifications WHERE id = ? AND user_id = ?`, [notificationId, userId])
    await addToSyncQueue('DELETE', 'notifications', notificationId, { id: notificationId })
  },

  async deleteAllRead(): Promise<void> {
    const userId = getCurrentUserId()
    const read = await query<any>(
      `SELECT id FROM notifications WHERE user_id = ? AND is_read = 1`,
      [userId]
    )
    await run(`DELETE FROM notifications WHERE user_id = ? AND is_read = 1`, [userId])
    for (const n of read) {
      await addToSyncQueue('DELETE', 'notifications', n.id, { id: n.id })
    }
  },

  async createNotification(notification: {
    type: 'stock_alert' | 'transaction' | 'return' | 'system' | 'payment'
    title: string
    message: string
    data?: any
  }): Promise<SqliteNotification> {
    const userId = getCurrentUserId()
    const id = uuid()
    const now = nowIso()

    await run(
      `INSERT INTO notifications (id, user_id, type, title, message, data, is_read, created_at, sync_status, updated_at_local)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?, 'pending', ?)`,
      [id, userId, notification.type, notification.title, notification.message,
       notification.data ? JSON.stringify(notification.data) : null, now, now]
    )

    const created: SqliteNotification = {
      id, user_id: userId, ...notification, is_read: false, created_at: now,
    }
    await addToSyncQueue('INSERT', 'notifications', id, created)
    return created
  },

  // ============================================================
  // Helper khusus sync
  // ============================================================

  async replaceAll(records: SqliteNotification[]): Promise<void> {
    const userId = getCurrentUserId()
    await transaction(async (tx) => {
      await tx.run('DELETE FROM notifications WHERE user_id = ?', [userId])
      for (const r of records) {
        await tx.run(
          `INSERT OR REPLACE INTO notifications (id, user_id, type, title, message, data, is_read, created_at, read_at, sync_status, updated_at_local)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?)`,
          [r.id, userId, r.type, r.title, r.message,
           r.data ? JSON.stringify(r.data) : null,
           r.is_read ? 1 : 0, r.created_at, r.read_at ?? null, r.created_at]
        )
      }
    })
  },

  mapRow(r: any): SqliteNotification {
    let data: any
    if (r.data) {
      try { data = JSON.parse(r.data) } catch { data = r.data }
    }
    return {
      id: r.id,
      user_id: r.user_id,
      type: r.type,
      title: r.title,
      message: r.message,
      data,
      is_read: !!r.is_read,
      created_at: r.created_at,
      read_at: r.read_at ?? undefined,
    }
  },
}