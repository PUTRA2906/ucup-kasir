import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite'
import { Capacitor } from '@capacitor/core'

// ============================================================
// Wrapper SQLite Database
// Inisialisasi koneksi, migrasi skema, dan helper operasi CRUD.
//
// API yang dipakai (verifikasi versi saat instalasi):
//   - new SQLiteConnection(CapacitorSQLite)
//   - connection.createConnection(dbName, encrypted, mode, version, readonly)
//   - connection.open(dbName)
//   - db.executeSet({ set })       — jalankan banyak statement
//   - db.run(query, values)        — INSERT/UPDATE/DELETE
//   - db.query(query, values)      — SELECT
//   - db.beginTransaction() / commit / rollback
// ============================================================

const DB_NAME = 'ucup_kasir'
const SCHEMA_VERSION = 1

let sqliteConn: SQLiteConnection | null = null
let db: SQLiteDBConnection | null = null
let initPromise: Promise<void> | null = null

export interface QueryParams {
  [key: string]: string | number | boolean | null
}

/**
 * Inisialisasi koneksi SQLite dan buat/migrasi skema jika belum ada.
 * Idempotent — aman dipanggil berulang kali.
 */
export async function initSQLite(): Promise<void> {
  if (initPromise) return initPromise

  initPromise = (async () => {
    try {
      // Buka koneksi database
      sqliteConn = new SQLiteConnection(CapacitorSQLite)

      // Cek apakah database sudah ada (untuk migrasi schema)
      const existing = await sqliteConn.isDatabase(DB_NAME)

      const conn = await sqliteConn.createConnection(
        DB_NAME,
        false, // no encryption
        'no-encryption',
        SCHEMA_VERSION,
        false // readonly
      )
      db = conn

      await conn.open()

      // Aktifkan foreign key constraint (dibutuhkan untuk ON DELETE CASCADE).
      // SQLite default-nya OFF — tanpa ini cascade tidak berjalan.
      await conn.execute('PRAGMA foreign_keys = ON')

      // SELALU jalankan initSchema() — semua statement memakai CREATE TABLE IF NOT EXISTS,
      // sehingga idempotent & aman untuk database yang sudah ada.
      // Ini penting karena database lama (sebelum migrasi SQLite) tidak punya tabel skema
      // yang dibutuhkan (categories, products, transactions, sync_queue, dll).
      await initSchema()

      if (!existing) {
        // Database baru — versi schema sudah ter-set saat init
        await setMetadata('schema_version', SCHEMA_VERSION.toString())
      } else {
        // Database sudah ada — cek/migrasi versi schema
        await migrateSchema()
      }
    } catch (e) {
      console.error('Gagal inisialisasi SQLite:', e)
      // Reset promise agar bisa dicoba ulang
      initPromise = null
      throw e
    }
  })()

  return initPromise
}

/** Jalankan seluruh isi src/db/init.sql (hanya untuk database baru). */
async function initSchema(): Promise<void> {
  if (!db) throw new Error('SQLite belum diinisialisasi')

  // Baca skema dari file init.sql
  // Untuk Capacitor web, skema di-import sebagai raw string.
  // Untuk native, kita embed via import dari file.
  const { initStatements } = await import('@/db/schema')
  const statements = splitStatements(initStatements)

  await db.executeSet(
    statements.map((statement) => ({ statement })),
    true // transaction
  )
}

/** Cek versi schema di sync_metadata, jalankan migrasi jika perlu. */
async function migrateSchema(): Promise<void> {
  if (!db) throw new Error('SQLite belum diinisialisasi')

  try {
    const res = await db.query('SELECT value FROM sync_metadata WHERE key = ?', ['schema_version'])
    const currentVersion = res.values?.[0]?.value ? parseInt(String(res.values[0].value), 10) : 0

    if (currentVersion < SCHEMA_VERSION) {
      // Jalankan migrasi bertahap sesuai kebutuhan
      await setMetadata('schema_version', SCHEMA_VERSION.toString())
    }
  } catch (e) {
    // Tabel sync_metadata belum ada (database lama) — buat dulu
    await db.execute(
      'CREATE TABLE IF NOT EXISTS sync_metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL)'
    )
    await setMetadata('schema_version', SCHEMA_VERSION.toString())
  }
}

/** Pecah SQL string menjadi array statement per ';'. */
function splitStatements(sql: string): string[] {
  return sql
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith('--'))
}

/** Dapatkan koneksi database (pastikan sudah diinisialisasi). */
export async function getDb(): Promise<SQLiteDBConnection> {
  if (!db) {
    await initSQLite()
  }
  if (!db) throw new Error('SQLite belum diinisialisasi')
  return db
}

/** Jalankan query SELECT, return array rows. */
export async function query<T = any>(sql: string, params: (string | number | boolean | null)[] = []): Promise<T[]> {
  const conn = await getDb()
  const res = await conn.query(sql, params)
  return (res.values || []) as T[]
}

/** Jalankan query SELECT, return 1 row atau null. */
export async function queryOne<T = any>(sql: string, params: (string | number | boolean | null)[] = []): Promise<T | null> {
  const rows = await query<T>(sql, params)
  return rows[0] ?? null
}

/** Jalankan INSERT/UPDATE/DELETE, return last inserted id (jika ada). */
export async function run(sql: string, params: (string | number | boolean | null)[] = []): Promise<{ changes: number; lastId?: number }> {
  const conn = await getDb()
  const res = await conn.run(sql, params)
  return { changes: res.changes?.changes ?? 0, lastId: res.changes?.lastId }
}

/**
 * Jalankan banyak statement dalam satu transaksi atomik.
 * Mengembalikan promise yang resolve jika sukses, reject jika salah satu gagal.
 */
export async function transaction<T>(
  fn: (executor: {
    query: <T2 = any>(sql: string, params?: (string | number | boolean | null)[]) => Promise<T2[]>
    run: (sql: string, params?: (string | number | boolean | null)[]) => Promise<{ changes: number; lastId?: number }>
  }) => Promise<T>
): Promise<T> {
  const conn = await getDb()
  try {
    await conn.beginTransaction()

    const result = await fn({
      async query<T2 = any>(sql: string, params: (string | number | boolean | null)[] = []): Promise<T2[]> {
        const res = await conn.query(sql, params)
        return (res.values || []) as T2[]
      },
      async run(sql: string, params: (string | number | boolean | null)[] = []) {
        const res = await conn.run(sql, params)
        return { changes: res.changes?.changes ?? 0, lastId: res.changes?.lastId }
      },
    })

    await conn.commitTransaction()
    return result
  } catch (e) {
    try {
      await conn.rollbackTransaction()
    } catch {
      // abaikan error rollback
    }
    throw e
  }
}

// ============================================================
// Helper Sync Queue
// ============================================================

export interface SyncQueueItem {
  id: number
  operation: 'INSERT' | 'UPDATE' | 'DELETE'
  table_name: string
  record_id: string
  payload: string
  created_at: string
  retry_count: number
  last_error: string | null
}

/** Tambahkan operasi ke sync_queue untuk diupload ke Supabase. */
export async function addToSyncQueue(
  operation: 'INSERT' | 'UPDATE' | 'DELETE',
  tableName: string,
  recordId: string,
  payload: Record<string, any>
): Promise<void> {
  await run(
    `INSERT INTO sync_queue (operation, table_name, record_id, payload, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    [operation, tableName, recordId, JSON.stringify(payload), new Date().toISOString()]
  )
}

/** Ambil semua item sync_queue yang belum diproses, urut dari terlama. */
export async function getSyncQueue(): Promise<SyncQueueItem[]> {
  return query<SyncQueueItem>(
    'SELECT * FROM sync_queue ORDER BY id ASC'
  )
}

/** Hapus item dari sync_queue setelah berhasil diupload. */
export async function removeFromSyncQueue(id: number): Promise<void> {
  await run('DELETE FROM sync_queue WHERE id = ?', [id])
}

/** Update retry_count & last_error untuk item yang gagal upload. */
export async function markSyncQueueFailed(id: number, error: string): Promise<void> {
  await run(
    'UPDATE sync_queue SET retry_count = retry_count + 1, last_error = ? WHERE id = ?',
    [error, id]
  )
}

// ============================================================
// Helper Metadata
// ============================================================

export async function getMetadata(key: string): Promise<string | null> {
  const row = await queryOne<{ value: string }>('SELECT value FROM sync_metadata WHERE key = ?', [key])
  return row?.value ?? null
}

export async function setMetadata(key: string, value: string): Promise<void> {
  await run(
    `INSERT INTO sync_metadata (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [key, value]
  )
}

/** Apakah ini platform web (untuk fallback IndexedDB localStorage)? */
export function isWebPlatform(): boolean {
  return !Capacitor.isNativePlatform()
}

/**
 * Matikan sementara foreign key constraints.
 * Dipakai saat fase download full (truncate + insert ulang) karena urutan
 * DELETE (anak dulu) dan INSERT (induk dulu) tidak bisa dipenuhi satu urutan.
 * WAJIB dihidupkan kembali di finally.
 */
export async function disableForeignKeys(): Promise<void> {
  const conn = await getDb()
  await conn.execute('PRAGMA foreign_keys = OFF')
}

/** Nyalakan kembali foreign key constraints. */
export async function enableForeignKeys(): Promise<void> {
  const conn = await getDb()
  await conn.execute('PRAGMA foreign_keys = ON')
}
