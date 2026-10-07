/**
 * Utility untuk memperbaiki missing kolom payment_date di transaction_payments.
 *
 * Masalah: Database SQLite lama tidak punya kolom payment_date, dan migrasi
 * di sqlite.ts mungkin gagal silent atau belum dijalankan.
 *
 * Solusi: Panggil fungsi ini sekali untuk memaksa migrasi berjalan dan
 * menampilkan hasil/error dengan jelas.
 */

import { initSQLite } from '@/lib/sqlite'
import { CapacitorSQLite, SQLiteConnection } from '@capacitor-community/sqlite'
import { Capacitor } from '@capacitor/core'

export async function fixPaymentDateMigration(): Promise<{
  success: boolean
  message: string
  details?: any
}> {
  try {
    // Pastikan SQLite sudah init
    await initSQLite()

    if (!Capacitor.isNativePlatform()) {
      return {
        success: false,
        message: 'Migrasi SQLite hanya berjalan di platform native (Android)'
      }
    }

    const sqliteConn = new SQLiteConnection(CapacitorSQLite)
    const db = await sqliteConn.createConnection('ucup_kasir', false, 'no-encryption', 1, false)
    await db.open()

    // Cek apakah kolom payment_date sudah ada
    const tableInfo = await db.query('PRAGMA table_info(transaction_payments)')
    const columns = (tableInfo.values || []).map((r: any) => r.name)

    const hasPaymentDate = columns.includes('payment_date')

    if (hasPaymentDate) {
      await db.close()
      return {
        success: true,
        message: 'Kolom payment_date sudah ada di transaction_payments',
        details: { columns }
      }
    }

    // Tambah kolom payment_date
    console.log('Menambahkan kolom payment_date ke transaction_payments...')
    await db.execute('ALTER TABLE transaction_payments ADD COLUMN payment_date TEXT', false)

    // Backfill existing records dengan DATE(created_at)
    console.log('Backfill payment_date dari created_at...')
    const updateResult = await db.execute(
      `UPDATE transaction_payments SET payment_date = date(created_at) WHERE payment_date IS NULL`,
      false
    )

    // Verifikasi
    const verifyInfo = await db.query('PRAGMA table_info(transaction_payments)')
    const newColumns = (verifyInfo.values || []).map((r: any) => r.name)
    const verified = newColumns.includes('payment_date')

    await db.close()

    if (verified) {
      return {
        success: true,
        message: 'Berhasil menambahkan kolom payment_date dan backfill data',
        details: {
          columnsAfter: newColumns,
          updateResult
        }
      }
    } else {
      return {
        success: false,
        message: 'Kolom ditambahkan tapi verifikasi gagal',
        details: { newColumns }
      }
    }
  } catch (error: any) {
    console.error('Error fixing payment_date migration:', error)
    return {
      success: false,
      message: `Error: ${error.message}`,
      details: error
    }
  }
}

/**
 * Utility untuk reset database SQLite (HATI-HATI: menghapus semua data lokal!)
 */
export async function resetSQLiteDatabase(): Promise<{
  success: boolean
  message: string
}> {
  try {
    if (!Capacitor.isNativePlatform()) {
      return {
        success: false,
        message: 'Reset SQLite hanya berjalan di platform native (Android)'
      }
    }

    const sqliteConn = new SQLiteConnection(CapacitorSQLite)

    // Tutup koneksi yang ada
    const isConn = await sqliteConn.isConnection('ucup_kasir', false)
    if (isConn.result) {
      await sqliteConn.closeConnection('ucup_kasir', false)
    }

    // Hapus database
    await CapacitorSQLite.deleteDatabase({ database: 'ucup_kasir' })

    // Reinitialize dengan skema baru
    await initSQLite()

    return {
      success: true,
      message: 'Database SQLite berhasil direset. Lakukan sync ulang untuk ambil data dari cloud.'
    }
  } catch (error: any) {
    console.error('Error resetting SQLite database:', error)
    return {
      success: false,
      message: `Error: ${error.message}`
    }
  }
}
