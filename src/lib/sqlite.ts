import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite'
import { Capacitor } from '@capacitor/core'
import { logEvent } from '@/lib/eventLog'
import type { EventLogEntry } from '@/lib/eventLog'

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

  // Koneksi sudah terbuka dari pemanggilan sebelumnya — jalankan ulang skema
  // (CREATE TABLE IF NOT EXISTS → idempotent) agar tabel yang sempat gagal
  // dibuat pada pemanggilan pertama tetap terbuat. Ini menyembuhkan kasus
  // "no such table sync_queue" pada database lama / inisialisasi sebagian.
  if (db) {
    try {
      await initSchema()
      await migrateSchema()
      return
    } catch (e) {
      console.error('Gagal menjalankan ulang skema SQLite:', e)
      return
    }
  }

  initPromise = (async () => {
    try {
      // Buka koneksi database
      sqliteConn = new SQLiteConnection(CapacitorSQLite)

      // Cek apakah database sudah ada (untuk migrasi schema)
      const existing = await sqliteConn.isDatabase(DB_NAME)

      // Cek apakah koneksi sudah pernah dibuat — jika ya, ambil ulang,
      // jangan create lagi (error "connection already exists").
      const connResult = await sqliteConn.isConnection(DB_NAME, false)
      let conn: SQLiteDBConnection
      if (connResult.result) {
        conn = await sqliteConn.retrieveConnection(DB_NAME, false)
      } else {
        conn = await sqliteConn.createConnection(
          DB_NAME,
          false, // no encryption
          'no-encryption',
          SCHEMA_VERSION,
          false // readonly
        )
      }
      db = conn

      await conn.open()

      // Aktifkan foreign key constraint (dibutuhkan untuk ON DELETE CASCADE).
      // SQLite default-nya OFF — tanpa ini cascade tidak berjalan.
      // transaction=false: PRAGMA foreign_keys tidak efektif dalam transaksi aktif.
      await conn.execute('PRAGMA foreign_keys = ON', false)

      // SELALU jalankan initSchema() — semua statement memakai CREATE TABLE IF NOT EXISTS,
      // sehingga idempotent & aman untuk database yang sudah ada.
      // Ini penting karena database lama (sebelum migrasi SQLite) tidak punya tabel skema
      // yang dibutuhkan (categories, products, transactions, sync_queue, dll).
      await initSchema()

      // Jalankan migrations untuk update schema yang sudah ada
      await runCustomMigrations()

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

/** Jalankan custom migrations untuk update schema */
async function runCustomMigrations(): Promise<void> {
  if (!db) throw new Error('SQLite belum diinisialisasi')
  
  try {
    const { runMigrations } = await import('@/db/migrations')
    await runMigrations(db)
  } catch (e) {
    console.warn('Migration warning:', e)
    // Tidak throw error agar init tetap lanjut
  }
}

/** Jalankan seluruh isi src/db/init.sql (untuk database baru ATAU existing). */
async function initSchema(): Promise<void> {
  if (!db) throw new Error('SQLite belum diinisialisasi')

  // Baca skema dari file init.sql
  const { initStatements } = await import('@/db/schema')
  const statements = splitStatements(initStatements)

  // Eksekusi statement SATU PER SATU, TIDAK dibungkus satu transaksi besar.
  // Alasan:
  //   1. Semua statement memakai CREATE TABLE IF NOT EXISTS → idempotent,
  //      statement yang sudah ada di database lama cukup di-skip.
  //   2. Jika satu statement gagal (mis. CREATE INDEX kolom belum ada),
  //      statement lain tetap jalan → tabel lain tetap terbuat.
  //   3. executeSet + transaction:true membungkus SEMUA statement dalam satu
  //      transaksi — satu kegagalan = seluruh batch ROLLBACK = tidak ada tabel.
  for (const statement of statements) {
    try {
      // parameter transaction=false: db.execute default membungkus statement
      // dalam BEGIN...COMMIT sendiri. Menjalankan banyak statement berurutan
      // dengan auto-transaction akan memicu "Already in transaction".
      await db.execute(statement, false)
    } catch (e) {
      // Abaikan error per-statement (IF NOT EXISTS) agar tabel lain tetap dibuat.
      console.warn('SQLite init: skip statement:', (e as Error).message)
    }
  }
}

/** Cek versi schema di sync_metadata, jalankan migrasi jika perlu. */
async function migrateSchema(): Promise<void> {
  if (!db) throw new Error('SQLite belum diinisialisasi')

  // Migrasi khusus: tabel journal_entries lama dibuat tanpa 'payroll' di CHECK
  // reference_type. CREATE TABLE IF NOT EXISTS tidak mengubah tabel yang sudah
  // ada, jadi rebuild tabel bila CHECK-nya belum mencakup 'payroll'
  // (post_payroll_journal gagal insert tanpa ini).
  try {
    const res = await db.query(
      "SELECT sql FROM sqlite_master WHERE type='table' AND name='journal_entries'"
    )
    const tblSql = String(res.values?.[0]?.sql || '')
    if (tblSql && !tblSql.includes("'payroll'")) {
      await db.execute(
        `CREATE TABLE journal_entries__new (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          journal_number TEXT NOT NULL,
          entry_date TEXT NOT NULL,
          description TEXT NOT NULL,
          reference_type TEXT CHECK (reference_type IN ('manual', 'transaction', 'return', 'payment', 'void', 'purchase', 'purchase_payment', 'purchase_return', 'payroll')),
          reference_id TEXT,
          status TEXT NOT NULL DEFAULT 'posted' CHECK (status IN ('draft', 'posted', 'void')),
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          sync_status TEXT NOT NULL DEFAULT 'synced',
          updated_at_local TEXT
        );
        INSERT INTO journal_entries__new SELECT id, user_id, journal_number, entry_date, description, reference_type, reference_id, status, created_at, updated_at, sync_status, updated_at_local FROM journal_entries;
        DROP TABLE journal_entries;
        ALTER TABLE journal_entries__new RENAME TO journal_entries;
        CREATE INDEX IF NOT EXISTS idx_journal_entries_user_date ON journal_entries (user_id, entry_date DESC);
        CREATE INDEX IF NOT EXISTS idx_journal_entries_reference ON journal_entries (reference_type, reference_id);`,
        true
      )
    }
  } catch (e) {
    console.warn('SQLite migrate: gagal rebuild journal_entries:', (e as Error).message)
  }

  // Migrasi: sistem payroll berubah dari periode global (payroll_periods +
  // payroll_components + payroll_items + payrolls ber-period_id) menjadi slip
  // gaji mandiri per karyawan (periode per slip, insentif otomatis, kasbon
  // manual) mengikuti refactor Supabase 2026-09-12. DB lama dengan kolom
  // payrolls.period_id dibangun ulang: tabel legacy dihapus, payrolls baru
  // dibuat kosong — cloud adalah sumber kebenaran, data lokal datang kembali
  // lewat sync replaceAll.
  try {
    const pr = await db.query('PRAGMA table_info(payrolls)')
    const hasPeriodId = (pr.values || []).some((r: any) => String(r.name) === 'period_id')
    if (hasPeriodId) {
      await db.execute('PRAGMA foreign_keys = OFF', false)
      try {
        await db.execute('DROP TABLE IF EXISTS payroll_items', false)
        await db.execute('DROP TABLE IF EXISTS payroll_periods', false)
        await db.execute('DROP TABLE IF EXISTS payroll_components', false)
        await db.execute('DROP TABLE IF EXISTS payrolls', false)
        await db.execute(
          `CREATE TABLE payrolls (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            employee_id TEXT NOT NULL,
            period_code TEXT NOT NULL,
            period_start TEXT NOT NULL,
            period_end TEXT NOT NULL,
            base_salary REAL NOT NULL DEFAULT 0,
            incentive_amount REAL NOT NULL DEFAULT 0,
            kasbon_deduction REAL NOT NULL DEFAULT 0,
            total_net REAL NOT NULL DEFAULT 0,
            status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'paid')),
            journal_entry_id TEXT,
            paid_at TEXT,
            notes TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            sync_status TEXT NOT NULL DEFAULT 'synced',
            updated_at_local TEXT,
            UNIQUE (user_id, period_code),
            FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
          )`,
          false
        )
        await db.execute(
          'CREATE INDEX IF NOT EXISTS idx_payrolls_user_employee ON payrolls (user_id, employee_id)',
          false
        )
        await db.execute(
          'CREATE INDEX IF NOT EXISTS idx_payrolls_period_dates ON payrolls (period_start, period_end)',
          false
        )
        await db.execute(
          'CREATE INDEX IF NOT EXISTS idx_payrolls_status ON payrolls (status)',
          false
        )
        await db.execute(
          'CREATE INDEX IF NOT EXISTS idx_payrolls_journal ON payrolls (journal_entry_id)',
          false
        )
      } finally {
        await db.execute('PRAGMA foreign_keys = ON', false)
      }
    }
  } catch (e) {
    console.warn('SQLite migrate: gagal rebuild skema payroll:', (e as Error).message)
  }

  // Migrasi: database lama dibuat sebelum kolom limit kredit ada.
  // CREATE TABLE IF NOT EXISTS tidak menambah kolom ke tabel yang sudah ada,
  // dan SQLite tidak mendukung ADD COLUMN IF NOT EXISTS — cek dulu via
  // PRAGMA table_info. Tanpa ini SELECT/UPDATE store_settings & customers
  // gagal dengan "no such column: default_credit_limit".
  try {
    const addColumnIfMissing = async (table: string, column: string, def: string) => {
      const res = await db!.query(`PRAGMA table_info(${table})`)
      const cols = (res.values || []).map((r: any) => String(r.name))
      if (cols.length > 0 && !cols.includes(column)) {
        await db!.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${def}`, false)
      }
    }
    await addColumnIfMissing('store_settings', 'default_credit_limit', 'REAL NOT NULL DEFAULT 0')
    await addColumnIfMissing('store_settings', 'loading_rate_per_sack', 'REAL NOT NULL DEFAULT 0')
    await addColumnIfMissing('customers', 'credit_limit', 'REAL NOT NULL DEFAULT 0')
    // Kolom transaction_status (status transaksi: disiapkan/dikirim/selesai).
    // DB lama dianggap semua transaksinya sudah selesai.
    await addColumnIfMissing('transactions', 'transaction_status', "TEXT NOT NULL DEFAULT 'disiapkan'")
    // Jabatan kini teks tetap ('supir' | 'loader') — tabel departments/positions dihapus
    await addColumnIfMissing('employees', 'position', 'TEXT')
    // Tarif supir per trip (dasar insentif supir di payroll). DB lama tidak
    // punya kolom ini — tanpa ALTER, INSERT delivery_orders gagal dengan
    // "no such column: driver_fee" dan gaji supir tidak pernah tersimpan.
    await addColumnIfMissing('delivery_orders', 'driver_fee', 'REAL NOT NULL DEFAULT 0')
  } catch (e) {
    console.warn('SQLite migrate: gagal menambah kolom limit kredit:', (e as Error).message)
  }

  // Migrasi: rebuild employees bila masih menyimpan department_id/position_id
  // (master Departemen/Jabatan sudah dihapus; jabatan kini kolom teks
  // `position`). Foreign keys dimatikan selama rebuild agar DROP TABLE lama
  // tidak cascade menghapus data turunan — id employee tetap sama sehingga
  // relasi FK hasil rebuild tetap valid.
  try {
    const hasColumn = async (table: string, column: string): Promise<boolean> => {
      const res = await db!.query(`PRAGMA table_info(${table})`)
      return (res.values || []).some((r: any) => String(r.name) === column)
    }
    const legacyEmp = await hasColumn('employees', 'department_id')
    if (legacyEmp) {
      await db!.execute('PRAGMA foreign_keys = OFF', false)
      try {
        if (legacyEmp) {
          await db!.execute(
            `CREATE TABLE employees__new (
              id TEXT PRIMARY KEY,
              user_id TEXT NOT NULL,
              employee_code TEXT NOT NULL,
              name TEXT NOT NULL,
              gender TEXT CHECK (gender IN ('laki_laki', 'perempuan')),
              birth_place TEXT,
              birth_date TEXT,
              phone TEXT,
              email TEXT,
              address TEXT,
              identity_type TEXT,
              identity_number TEXT,
              position TEXT CHECK (position IN ('supir', 'loader')),
              join_date TEXT,
              resign_date TEXT,
              status TEXT NOT NULL DEFAULT 'aktif' CHECK (status IN ('aktif', 'cuti', 'nonaktif', 'keluar')),
              salary_type TEXT NOT NULL DEFAULT 'bulanan' CHECK (salary_type IN ('bulanan', 'harian', 'mingguan')),
              base_salary REAL NOT NULL DEFAULT 0,
              bank_name TEXT,
              bank_account_number TEXT,
              bank_account_name TEXT,
              npwp TEXT,
              notes TEXT,
              is_active INTEGER NOT NULL DEFAULT 1,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL,
              sync_status TEXT NOT NULL DEFAULT 'synced',
              updated_at_local TEXT
            )`,
            false
          )
          await db!.execute(
            `INSERT INTO employees__new
             SELECT id, user_id, employee_code, name, gender, birth_place, birth_date, phone,
                    email, address, identity_type, identity_number,
                    COALESCE(NULLIF(position, ''),
                             CASE WHEN lower(COALESCE((SELECT p.name FROM positions p WHERE p.id = employees.position_id), ''))
                                  IN ('supir','loader')
                                  THEN lower((SELECT p.name FROM positions p WHERE p.id = employees.position_id))
                                  ELSE NULL END),
                    join_date, resign_date, status, salary_type, base_salary, bank_name,
                    bank_account_number, bank_account_name, npwp, notes, is_active,
                    created_at, updated_at, sync_status, updated_at_local
             FROM employees`,
            false
          )
          await db!.execute('DROP TABLE employees', false)
          await db!.execute('ALTER TABLE employees__new RENAME TO employees', false)
          await db!.execute(
            'CREATE INDEX IF NOT EXISTS idx_employees_user_name ON employees (user_id, name)',
            false
          )
        }
        // Buang master lama (data lokal tidak dipakai lagi)
        await db!.execute('DROP TABLE IF EXISTS positions', false)
        await db!.execute('DROP TABLE IF EXISTS departments', false)
      } finally {
        await db!.execute('PRAGMA foreign_keys = ON', false)
      }
    }
  } catch (e) {
    console.warn('SQLite migrate: gagal rebuild skema karyawan:', (e as Error).message)
  }

  // Migrasi: transaction_item_payments (alokasi pembayaran per item untuk
  // perhitungan laba terealisasi yang akurat). Database lama tidak punya tabel
  // ini — CREATE TABLE IF NOT EXISTS akan membuatnya kosong, tidak ada backfill
  // otomatis (berbeda dengan Supabase yang punya trigger backfill saat migrasi).
  // Data alokasi akan diisi saat:
  // 1. Transaksi baru dibuat (auto-allocate di create/addPayment)
  // 2. User manual reallocate via UI
  // 3. Sync dari Supabase (replaceAll) membawa alokasi yang sudah ada
  try {
    const res = await db.query(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='transaction_item_payments'"
    )
    if (!res.values || res.values.length === 0) {
      // Tabel belum ada, buat sekarang
      await db.execute(
        `CREATE TABLE transaction_item_payments (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          transaction_id TEXT NOT NULL,
          item_id TEXT NOT NULL,
          payment_id TEXT NOT NULL,
          allocated_amount REAL NOT NULL DEFAULT 0,
          notes TEXT,
          created_at TEXT NOT NULL,
          sync_status TEXT NOT NULL DEFAULT 'synced',
          updated_at_local TEXT,
          FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
          FOREIGN KEY (item_id) REFERENCES transaction_items(id) ON DELETE CASCADE,
          FOREIGN KEY (payment_id) REFERENCES transaction_payments(id) ON DELETE CASCADE,
          CHECK (allocated_amount > 0)
        )`,
        false
      )
      await db.execute(
        'CREATE INDEX IF NOT EXISTS idx_item_payments_transaction ON transaction_item_payments (transaction_id)',
        false
      )
      await db.execute(
        'CREATE INDEX IF NOT EXISTS idx_item_payments_item ON transaction_item_payments (item_id)',
        false
      )
      await db.execute(
        'CREATE INDEX IF NOT EXISTS idx_item_payments_payment ON transaction_item_payments (payment_id)',
        false
      )
      await db.execute(
        'CREATE INDEX IF NOT EXISTS idx_item_payments_user_created ON transaction_item_payments (user_id, created_at DESC)',
        false
      )
    }
  } catch (e) {
    console.warn('SQLite migrate: gagal membuat transaction_item_payments:', (e as Error).message)
  }

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
      'CREATE TABLE IF NOT EXISTS sync_metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL)',
      false
    )
    await setMetadata('schema_version', SCHEMA_VERSION.toString())
  }
}

/** Pecah SQL string menjadi array statement per ';'. */
function splitStatements(sql: string): string[] {
  return sql
    .split(';')
    .map((s) => s.trim())
    .filter((s) => {
      // Buang statement kosong.
      if (s.length === 0) return false
      // Buang statement yang HANYA berisi komentar (-- ...).
      // Jangan buang statement yang diawali komentar tapi masih berisi SQL
      // (mis. "-- 2) Products\nCREATE TABLE ...") — komentar inline aman di SQLite.
      const withoutComments = s
        .split('\n')
        .filter((line) => !line.trim().startsWith('--'))
        .join('\n')
        .trim()
      return withoutComments.length > 0
    })
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
  try {
    // query() TIDAK membungkus transaksi — parameter ketiga adalah isSQL92, bukan transaction.
    const res = await conn.query(sql, params)
    return (res.values || []) as T[]
  } catch (e: any) {
    logEvent({ level: 'error', source: 'sqlite', event: 'query_failed', message: e?.message || String(e), detail: sql })
    throw e
  }
}

/** Jalankan query SELECT, return 1 row atau null. */
export async function queryOne<T = any>(sql: string, params: (string | number | boolean | null)[] = []): Promise<T | null> {
  const rows = await query<T>(sql, params)
  return rows[0] ?? null
}

/** Jalankan INSERT/UPDATE/DELETE, return last inserted id (jika ada). */
export async function run(sql: string, params: (string | number | boolean | null)[] = []): Promise<{ changes: number; lastId?: number }> {
  const conn = await getDb()
  try {
    // transaction=false: plugin default-nya membungkus setiap run() dalam BEGIN...COMMIT
    // sendiri. Memakai false membuat statement dieksekusi langsung tanpa transaksi —
    // transaksi dikelola manual oleh helper transaction() di bawah.
    const res = await conn.run(sql, params, false)
    return { changes: res.changes?.changes ?? 0, lastId: res.changes?.lastId }
  } catch (e: any) {
    logEvent({ level: 'error', source: 'sqlite', event: 'run_failed', message: e?.message || String(e), detail: sql })
    throw e
  }
}

/**
 * Simpan entry event log dari buffer localStorage ke tabel app_event_log.
 * Dipanggil oleh flusher di @/lib/eventLog. INSERT OR IGNORE agar idempoten
 * (uid sama tidak ditulis ulang). Setelah insert, pangkas baris terlama.
 */
export async function saveEventLogEntries(entries: EventLogEntry[]): Promise<void> {
  const conn = await getDb()
  for (const e of entries) {
    await conn.run(
      `INSERT OR IGNORE INTO app_event_log (uid, ts, level, source, event, message, detail, platform)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [e.uid, e.ts, e.level, e.source, e.event, e.message, e.detail ?? null, e.platform],
      false
    )
  }
  // Pangkas: simpan maksimal 1000 baris terbaru.
  await conn.run(
    `DELETE FROM app_event_log WHERE uid NOT IN (SELECT uid FROM app_event_log ORDER BY ts DESC LIMIT 1000)`,
    [],
    false
  )
}

/** Executor transaksi: query & run dengan params bernilai nullable */
export interface TransactionExecutor {
  query: <T2 = any>(sql: string, params?: (string | number | boolean | null)[]) => Promise<T2[]>
  run: (sql: string, params?: (string | number | boolean | null)[]) => Promise<{ changes: number; lastId?: number }>
}

/**
 * Jalankan banyak statement dalam satu transaksi atomik.
 * Mengembalikan promise yang resolve jika sukses, reject jika salah satu gagal.
 */
export async function transaction<T>(
  fn: (executor: TransactionExecutor) => Promise<T>
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
        // transaction=false PENTING: kita sudah di dalam transaksi manual
        // (beginTransaction di atas). Plugin default membungkus setiap run()
        // dalam BEGIN...COMMIT sendiri → "Already in transaction".
        const res = await conn.run(sql, params, false)
        return { changes: res.changes?.changes ?? 0, lastId: res.changes?.lastId }
      },
    })

    await conn.commitTransaction()
    return result
  } catch (e: any) {
    try {
      await conn.rollbackTransaction()
    } catch {
      // abaikan error rollback
    }
    logEvent({ level: 'error', source: 'sqlite', event: 'transaction_failed', message: e?.message || String(e) })
    throw e
  }
}

/** Baca event log dari tabel SQLite (native). Terlama → terbaru. */
export async function getEventLogFromSqlite(limit = 1000): Promise<EventLogEntry[]> {
  const rows = await query<any>(
    `SELECT uid, ts, level, source, event, message, detail, platform
     FROM app_event_log ORDER BY ts DESC LIMIT ?`,
    [limit]
  )
  return rows
    .reverse()
    .map((r) => ({
      uid: String(r.uid),
      ts: Number(r.ts),
      level: r.level,
      source: r.source,
      event: String(r.event),
      message: String(r.message),
      detail: r.detail ? String(r.detail) : undefined,
      platform: r.platform,
    }))
}

/** Hapus semua isi tabel app_event_log (native). */
export async function clearEventLogTable(): Promise<void> {
  await run('DELETE FROM app_event_log')
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
  // transaction=false: PRAGMA foreign_keys TIDAK efektif di dalam transaksi aktif,
  // dan db.execute default membungkus statement dalam BEGIN...COMMIT.
  await conn.execute('PRAGMA foreign_keys = OFF', false)
}

/** Nyalakan kembali foreign key constraints. */
export async function enableForeignKeys(): Promise<void> {
  const conn = await getDb()
  await conn.execute('PRAGMA foreign_keys = ON', false)
}
