import type { SQLiteDBConnection } from '@capacitor-community/sqlite'

/**
 * Jalankan migration untuk menambahkan kolom incentive_details
 * Aman untuk dijalankan bahkan jika kolom sudah ada
 */
export async function migrateIncentiveDetails(db: SQLiteDBConnection): Promise<void> {
  try {
    // Cek apakah kolom sudah ada
    const result = await db.query('PRAGMA table_info(payrolls);')
    const hasColumn = result.values?.some((row: any) => row.name === 'incentive_details')

    if (hasColumn) {
      console.log('✓ Kolom incentive_details sudah ada')
      return
    }

    // Tambahkan kolom
    await db.execute('ALTER TABLE payrolls ADD COLUMN incentive_details TEXT;')
    console.log('✓ Kolom incentive_details berhasil ditambahkan')
  } catch (error) {
    // Jika error karena kolom sudah ada, abaikan
    if (error && String(error).includes('duplicate column')) {
      console.log('✓ Kolom incentive_details sudah ada')
      return
    }
    console.error('✗ Error saat migration:', error)
    throw error
  }
}

/**
 * Jalankan semua migration yang pending
 */
export async function runMigrations(db: SQLiteDBConnection): Promise<void> {
  console.log('Running database migrations...')
  await migrateIncentiveDetails(db)
  console.log('✓ All migrations completed')
}
