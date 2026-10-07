/**
 * Utility untuk force migrasi database SQLite
 * Gunakan ini jika kolom baru tidak muncul setelah update kode
 */

import { runMigrations } from '@/lib/sqlite'
import { useToast } from '@/composables/useToast'

export async function forceSQLiteMigration() {
  const toast = useToast()

  try {
    toast.info('Migrasi Database', 'Memulai migrasi database...')
    await runMigrations()
    toast.success('Berhasil!', 'Database berhasil dimigrasi. Silakan refresh halaman.')
  } catch (error: any) {
    console.error('Error migrasi:', error)
    toast.error('Gagal!', error.message || 'Gagal menjalankan migrasi database')
  }
}
