<template>
  <button
    @click="runMigration"
    class="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700"
  >
    🔧 Force Migrasi Database
  </button>
</template>

<script setup lang="ts">
import { runMigrations } from '@/lib/sqlite'
import { useToast } from '@/composables/useToast'

const toast = useToast()

const runMigration = async () => {
  try {
    toast.info('Migrasi Database', 'Menjalankan migrasi database...')
    await runMigrations()
    toast.success('Berhasil!', 'Database berhasil dimigrasi. Refresh halaman untuk apply changes.')

    // Auto refresh setelah 2 detik
    setTimeout(() => {
      window.location.reload()
    }, 2000)
  } catch (error: any) {
    console.error('Error migrasi:', error)
    toast.error('Gagal!', error.message || 'Gagal menjalankan migrasi')
  }
}
</script>
