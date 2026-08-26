import { supabase } from '@/lib/supabase'
import {
  initSQLite,
  run,
  query,
  setMetadata,
  getMetadata,
  getSyncQueue,
  removeFromSyncQueue,
  markSyncQueueFailed,
  disableForeignKeys,
  enableForeignKeys,
} from '@/lib/sqlite'
import { getCurrentUserId } from '@/services/sqlite/db'
import { isOnlineNow } from '@/lib/network'
import { sqliteCategoriesService } from '@/services/sqlite/categories'
import { sqliteProductsService } from '@/services/sqlite/products'
import { sqliteCustomersService } from '@/services/sqlite/customers'
import { sqliteTransactionsService } from '@/services/sqlite/transactions'
import { sqliteReturnsService } from '@/services/sqlite/returns'
import { sqliteStockService } from '@/services/sqlite/stock'
import { sqliteNotificationsService } from '@/services/sqlite/notifications'
import { sqliteStoreSettingsService } from '@/services/sqlite/storeSettings'
import type { SyncQueueItem } from '@/lib/sqlite'

// ============================================================
// Sync Engine — Offline-first backup ke Supabase
//
// 2 alur:
//   downloadAllFromSupabase()  — saat login: truncate SQLite, isi dari Supabase
//   uploadChangesToSupabase()  — saat buka app + tombol manual: proses sync_queue
//   uploadAllToSupabase()      — backup full (opsional)
//
// 1 device + last-write-wins → tidak perlu conflict resolution.
// ============================================================

const DOWNLOAD_TABLES = [
  'categories',
  'products',
  'customers',
  'transactions',
  'transaction_items',
  'transaction_payments',
  'returns',
  'return_items',
  'store_settings',
  'stock_movements',
  'stock_adjustments',
  'stock_opnames',
  'stock_opname_items',
  'stock_alerts',
  'notifications',
] as const

export interface SyncResult {
  success: boolean
  downloaded?: number
  uploaded?: number
  failed?: number
  message?: string
}

// ============================================================
// DOWNLOAD: Supabase → SQLite (saat login / manual refresh)
// ============================================================

/** Ambil semua data user dari Supabase dan isi ke SQLite (truncate dulu). */
export async function downloadAllFromSupabase(): Promise<SyncResult> {
  // Pastikan SQLite siap (buat tabel skema jika belum ada) sebelum operasi apa pun.
  // Tidak bergantung pada timing initSQLite di main.ts.
  await initSQLite()

  if (!isOnlineNow()) {
    throw new Error('Tidak ada koneksi internet')
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Tidak ada user yang login')

  try {
    // --- 1. Download semua tabel dari Supabase (berurutan sesuai dependensi) ---
    const [categories, products, customers, transactions, transactionItems, transactionPayments,
           returns, returnItems, storeSettings, stockMovements, stockAdjustments,
           stockOpnames, stockOpnameItems, stockAlerts, notifications] = await Promise.all([
      fetchAllFromTable('categories'),
      fetchAllFromTable('products'),
      fetchAllFromTable('customers'),
      fetchAllFromTable('transactions'),
      fetchAllFromTable('transaction_items'),
      fetchAllFromTable('transaction_payments'),
      fetchAllFromTable('returns'),
      fetchAllFromTable('return_items'),
      fetchAllFromTable('store_settings'),
      fetchAllFromTable('stock_movements'),
      fetchAllFromTable('stock_adjustments'),
      fetchAllFromTable('stock_opnames'),
      fetchAllFromTable('stock_opname_items'),
      fetchAllFromTable('stock_alerts'),
      fetchAllFromTable('notifications'),
    ])

    // --- 2. Bersihkan sync_queue (semua yang ada sudah didownload ke Supabase,
    //         dan sekarang kita punya snapshot fresh) ---
    await clearSyncQueue()

    // --- 3. Tulis ke SQLite (truncate + insert fresh, dalam urutan dependensi FK) ---
    // Matikan FK sementara: urutan DELETE (anak dulu) dan INSERT (induk dulu)
    // tidak bisa dipenuhi dalam satu urutan. Diaktifkan lagi di finally.
    await disableForeignKeys()
    try {
      await sqliteCategoriesService.replaceAll(categories)
      await sqliteProductsService.replaceAll(products)
      await sqliteCustomersService.replaceAll(customers)

      // transactions: gabungkan items + payments agar replaceAll menulis semuanya
      const txnMap = new Map<string, any>()
      for (const t of transactions) {
        txnMap.set(t.id, { ...t, items: [], payments: [] })
      }
      for (const it of transactionItems) {
        const t = txnMap.get(it.transaction_id)
        if (t) t.items.push(it)
      }
      for (const p of transactionPayments) {
        const t = txnMap.get(p.transaction_id)
        if (t) t.payments.push(p)
      }
      await sqliteTransactionsService.replaceAll([...txnMap.values()])

      // returns: gabungkan items
      const retMap = new Map<string, any>()
      for (const r of returns) {
        retMap.set(r.id, { ...r, items: [] })
      }
      for (const ri of returnItems) {
        const r = retMap.get(ri.return_id)
        if (r) r.items.push(ri)
      }
      await sqliteReturnsService.replaceAll([...retMap.values()])

      // stock opnames: gabungkan items
      const opMap = new Map<string, any>()
      for (const o of stockOpnames) {
        opMap.set(o.id, { ...o, items: [] })
      }
      for (const oi of stockOpnameItems) {
        const o = opMap.get(oi.opname_id)
        if (o) o.items.push(oi)
      }
      await sqliteStockService.replaceAllOpnames([...opMap.values()])

      await sqliteStockService.replaceAllMovements(stockMovements)
      await sqliteStockService.replaceAllAdjustments(stockAdjustments)
      await sqliteStockService.replaceAllAlerts(stockAlerts)
      await sqliteNotificationsService.replaceAll(notifications)
      await sqliteStoreSettingsService.replaceAll(storeSettings)
    } finally {
      await enableForeignKeys()
    }

    // --- 4. Simpan metadata ---
    await setMetadata('last_download_at', new Date().toISOString())
    await setMetadata('downloaded_user_id', user.id)

    return {
      success: true,
      downloaded: categories.length + products.length + customers.length + transactions.length,
    }
  } catch (e: any) {
    return { success: false, message: e.message || 'Gagal mengunduh data' }
  }
}

/** Fetch semua row dari satu tabel Supabase (tanpa relasi). */
async function fetchAllFromTable(table: string): Promise<any[]> {
  const limit = 1000
  let all: any[] = []
  let from = 0

  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .range(from, from + limit - 1)
      .order('created_at')

    if (error) throw error
    if (!data || data.length === 0) break

    all = all.concat(data)
    if (data.length < limit) break
    from += limit
  }

  return all
}

/** Hapus semua isi sync_queue (dipakai setelah download penuh). */
async function clearSyncQueue(): Promise<void> {
  await run('DELETE FROM sync_queue')
}

// ============================================================
// UPLOAD: SQLite → Supabase (proses sync_queue)
// ============================================================

/**
 * Proses semua item di sync_queue ke Supabase.
 * Setiap item: INSERT/UPDATE/DELETE sesuai operation.
 * Sukses → hapus dari queue. Gagal → retry_count++ + last_error.
 */
export async function uploadChangesToSupabase(): Promise<SyncResult> {
  // Pastikan SQLite siap (buat tabel skema jika belum ada).
  await initSQLite()

  if (!isOnlineNow()) {
    return { success: false, message: 'Tidak ada koneksi internet' }
  }

  const queue = await getSyncQueue()
  if (queue.length === 0) {
    return { success: true, uploaded: 0 }
  }

  let uploaded = 0
  let failed = 0
  let firstError: string | null = null

  for (const item of queue) {
    try {
      await processQueueItem(item)
      await removeFromSyncQueue(item.id)
      uploaded++
    } catch (e: any) {
      failed++
      if (!firstError) firstError = e.message
      await markSyncQueueFailed(item.id, e.message || 'Gagal upload')
    }
  }

  if (uploaded > 0) {
    await setMetadata('last_sync_at', new Date().toISOString())
  }

  return {
    success: failed === 0,
    uploaded,
    failed,
    message: firstError || undefined,
  }
}

/**
 * Proses satu item queue: jalankan operasi ke Supabase.
 * Order penting: categories → products → customers → transactions → returns → lainnya.
 * Table yang diupdate dari parent juga ikut di-proses di sini (misal update stock
 * produk setelah transaksi — sudah ditangani karena products di-queue saat stok berubah).
 */
async function processQueueItem(item: SyncQueueItem): Promise<void> {
  const { table_name, operation, record_id, payload } = item
  const data = JSON.parse(payload)

  // Non-relational / simpel: pakai generic upsert/delete
  switch (table_name) {
    case 'categories':
      await genericUpsert('categories', operation, record_id, data)
      break
    case 'products':
      await genericUpsert('products', operation, record_id, data)
      break
    case 'customers':
      await genericUpsert('customers', operation, record_id, data)
      break
    case 'transactions':
      await genericUpsert('transactions', operation, record_id, data)
      break
    case 'transaction_items':
      await genericUpsert('transaction_items', operation, record_id, data)
      break
    case 'transaction_payments':
      await genericUpsert('transaction_payments', operation, record_id, data)
      break
    case 'returns':
      await genericUpsert('returns', operation, record_id, data)
      break
    case 'return_items':
      await genericUpsert('return_items', operation, record_id, data)
      break
    case 'store_settings':
      await genericUpsert('store_settings', operation, record_id, data)
      break
    case 'stock_movements':
      await genericUpsert('stock_movements', operation, record_id, data)
      break
    case 'stock_adjustments':
      await genericUpsert('stock_adjustments', operation, record_id, data)
      break
    case 'stock_opnames':
      await genericUpsert('stock_opnames', operation, record_id, data)
      break
    case 'stock_opname_items':
      await genericUpsert('stock_opname_items', operation, record_id, data)
      break
    case 'stock_alerts':
      await genericUpsert('stock_alerts', operation, record_id, data)
      break
    case 'notifications':
      await genericUpsert('notifications', operation, record_id, data)
      break
    default:
      throw new Error(`Tabel tidak dikenal: ${table_name}`)
  }
}

/**
 * Generic upsert ke Supabase.
 * - INSERT  → insert (skip jika sudah ada, pakai ignoreDuplicates=false agar error jelas)
 * - UPDATE  → update by id
 * - DELETE  → delete by id
 */
async function genericUpsert(
  table: string,
  operation: SyncQueueItem['operation'],
  recordId: string,
  data: Record<string, any>
): Promise<void> {
  // Hapus field internal SQLite yang tidak ada di Supabase
  const clean = sanitizeForSupabase(data)

  if (operation === 'DELETE') {
    const { error } = await supabase.from(table).delete().eq('id', recordId)
    if (error) throw error
    return
  }

  if (operation === 'INSERT') {
    // Insert; jika conflict id → ubah jadi update (idempotent)
    const { error } = await supabase.from(table).upsert(clean, { onConflict: 'id' })
    if (error) throw error
    return
  }

  // UPDATE
  const { error } = await supabase.from(table).update(clean).eq('id', recordId)
  if (error) throw error
}

/** Buang field internal SQLite (sync_status, updated_at_local) agar tidak bentrok. */
function sanitizeForSupabase(data: Record<string, any>): Record<string, any> {
  const { sync_status, updated_at_local, ...rest } = data
  return rest
}

// ============================================================
// UPLOAD FULL: backup seluruh data lokal ke Supabase
// ============================================================

/**
 * Backup full: upload semua data dari SQLite ke Supabase.
 * Dipakai untuk tombol "Backup Sekarang" di pengaturan.
 * Memakai INSERT ... ON CONFLICT (id) DO UPDATE agar idempotent.
 */
export async function uploadAllToSupabase(): Promise<SyncResult> {
  // Pastikan SQLite siap (buat tabel skema jika belum ada).
  await initSQLite()

  if (!isOnlineNow()) {
    return { success: false, message: 'Tidak ada koneksi internet' }
  }

  const userId = getCurrentUserId()
  const { query } = await import('@/lib/sqlite')

  const tables = [
    'categories', 'products', 'customers', 'transactions', 'transaction_items',
    'transaction_payments', 'returns', 'return_items', 'store_settings',
    'stock_movements', 'stock_adjustments', 'stock_opnames', 'stock_opname_items',
    'stock_alerts', 'notifications',
  ]

  let uploaded = 0
  try {
    for (const table of tables) {
      const rows = await query<any>(`SELECT * FROM ${table} WHERE user_id = ?`, [userId])
      if (rows.length === 0) continue

      const clean = rows.map(sanitizeForSupabase)
      const { error } = await supabase.from(table).upsert(clean, { onConflict: 'id' })
      if (error) throw error
      uploaded += clean.length
    }

    // Tandai semua data sebagai synced
    await markAllSynced(tables)

    await setMetadata('last_sync_at', new Date().toISOString())
    return { success: true, uploaded }
  } catch (e: any) {
    return { success: false, message: e.message || 'Gagal backup' }
  }
}

/** Set sync_status = 'synced' untuk semua data user di tabel tertentu. */
async function markAllSynced(tables: string[]): Promise<void> {
  const userId = getCurrentUserId()
  const { run } = await import('@/lib/sqlite')
  for (const table of tables) {
    await run(`UPDATE ${table} SET sync_status = 'synced', updated_at_local = NULL WHERE user_id = ?`, [userId])
  }
  // Bersihkan queue yang sudah terproses
  await clearSyncQueue()
}

// ============================================================
// Helper status
// ============================================================

/** Kapan terakhir sync (untuk ditampilkan di UI). */
export async function getLastSyncInfo(): Promise<{ lastSyncAt: string | null; lastDownloadAt: string | null }> {
  const [lastSyncAt, lastDownloadAt] = await Promise.all([
    getMetadata('last_sync_at'),
    getMetadata('last_download_at'),
  ])
  return { lastSyncAt, lastDownloadAt }
}
