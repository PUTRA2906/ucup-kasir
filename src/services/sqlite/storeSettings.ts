import { query, queryOne, run, addToSyncQueue, transaction } from './db'
import { getCurrentUserId, uuid, nowIso } from './db'
import type { StoreSettings, StoreSettingsUpdate } from '@/types/database'

// ============================================================
// SQLite Service: Store Settings
// Mirror dari src/services/storeSettings.ts tapi akses SQLite lokal.
// ============================================================

const DEFAULT_SETTINGS: Omit<StoreSettings, 'id' | 'user_id' | 'created_at' | 'updated_at'> = {
  store_name: 'Ucup Kasir',
  store_subtitle: 'Toko Berkat Jaya Makmur',
  store_address: '',
  store_phone: '',
  store_email: '',
  tax_enabled: false,
  tax_rate: 0,
  currency: 'IDR',
  receipt_footer: 'Terima kasih atas kunjungan Anda',
}

export const sqliteStoreSettingsService = {
  async getSettings(): Promise<StoreSettings> {
    const userId = getCurrentUserId()
    const row = await queryOne<any>(
      `SELECT id, user_id, store_name, store_subtitle, store_address, store_phone,
              store_email, tax_enabled, tax_rate, currency, receipt_footer, created_at, updated_at
       FROM store_settings
       WHERE user_id = ?`,
      [userId]
    )

    if (row) {
      return this.mapRow(row)
    }

    // Belum ada record — buat default
    const id = uuid()
    const now = nowIso()
    await transaction(async (tx) => {
      await tx.run(
        `INSERT INTO store_settings (id, user_id, store_name, store_subtitle, store_address,
                                     store_phone, store_email, tax_enabled, tax_rate, currency,
                                     receipt_footer, created_at, updated_at, sync_status, updated_at_local)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
        [
          id,
          userId,
          DEFAULT_SETTINGS.store_name,
          DEFAULT_SETTINGS.store_subtitle,
          DEFAULT_SETTINGS.store_address,
          DEFAULT_SETTINGS.store_phone,
          DEFAULT_SETTINGS.store_email,
          DEFAULT_SETTINGS.tax_enabled ? 1 : 0,
          DEFAULT_SETTINGS.tax_rate,
          DEFAULT_SETTINGS.currency,
          DEFAULT_SETTINGS.receipt_footer,
          now,
          now,
          now,
        ]
      )
    })

    const created: StoreSettings = { id, user_id: userId, ...DEFAULT_SETTINGS, created_at: now, updated_at: now }
    await addToSyncQueue('INSERT', 'store_settings', id, created)
    return created
  },

  async updateSettings(updates: StoreSettingsUpdate): Promise<StoreSettings> {
    const userId = getCurrentUserId()
    const now = nowIso()

    const current = await this.getSettings()
    const updated: StoreSettings = {
      ...current,
      ...updates,
      updated_at: now,
    }

    await transaction(async (tx) => {
      await tx.run(
        `UPDATE store_settings
         SET store_name = ?, store_subtitle = ?, store_address = ?, store_phone = ?,
             store_email = ?, tax_enabled = ?, tax_rate = ?, currency = ?,
             receipt_footer = ?, updated_at = ?, sync_status = 'pending', updated_at_local = ?
         WHERE user_id = ?`,
        [
          updated.store_name,
          updated.store_subtitle ?? null,
          updated.store_address ?? null,
          updated.store_phone ?? null,
          updated.store_email ?? null,
          updated.tax_enabled ? 1 : 0,
          updated.tax_rate,
          updated.currency,
          updated.receipt_footer,
          now,
          now,
          userId,
        ]
      )
    })

    await addToSyncQueue('UPDATE', 'store_settings', updated.id, updated)
    return updated
  },

  // ============================================================
  // Helper khusus sync
  // ============================================================

  async replaceAll(records: StoreSettings[]): Promise<void> {
    const userId = getCurrentUserId()
    await transaction(async (tx) => {
      await tx.run('DELETE FROM store_settings WHERE user_id = ?', [userId])
      for (const r of records) {
        await tx.run(
          `INSERT OR REPLACE INTO store_settings (id, user_id, store_name, store_subtitle,
                   store_address, store_phone, store_email, tax_enabled, tax_rate, currency,
                   receipt_footer, created_at, updated_at, sync_status, updated_at_local)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced', ?)`,
          [
            r.id,
            r.user_id ?? userId,
            r.store_name,
            r.store_subtitle ?? null,
            r.store_address ?? null,
            r.store_phone ?? null,
            r.store_email ?? null,
            r.tax_enabled ? 1 : 0,
            r.tax_rate,
            r.currency,
            r.receipt_footer,
            r.created_at,
            r.updated_at,
            r.updated_at,
          ]
        )
      }
    })
  },

  private mapRow(r: any): StoreSettings {
    return {
      id: r.id,
      user_id: r.user_id,
      store_name: r.store_name,
      store_subtitle: r.store_subtitle ?? undefined,
      store_address: r.store_address ?? undefined,
      store_phone: r.store_phone ?? undefined,
      store_email: r.store_email ?? undefined,
      tax_enabled: !!r.tax_enabled,
      tax_rate: r.tax_rate,
      currency: r.currency,
      receipt_footer: r.receipt_footer,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }
  },
}
