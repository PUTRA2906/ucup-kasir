import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  downloadAllFromSupabase,
  uploadChangesToSupabase,
  uploadAllToSupabase,
  getLastSyncInfo,
} from '@/services/sync/syncEngine'
import { isOnlineNow } from '@/lib/network'

// ============================================================
// Sync Store — status download & backup
// Dipakai oleh DownloadScreen, BackupStatus, dan startup sync.
// ============================================================

export const useSyncStore = defineStore('sync', () => {
  const syncing = ref(false)
  const uploading = ref(false)
  const lastSyncAt = ref<string | null>(null)
  const lastDownloadAt = ref<string | null>(null)
  const pendingCount = ref(0)
  const error = ref<string | null>(null)
  const message = ref<string | null>(null)

  const hasPending = computed(() => pendingCount.value > 0)

  /** Muat info terakhir (dipanggil saat app start). */
  async function loadInfo() {
    try {
      const info = await getLastSyncInfo()
      lastSyncAt.value = info.lastSyncAt
      lastDownloadAt.value = info.lastDownloadAt
    } catch (e) {
      // non-critical
    }
  }

  /** Download semua data dari Supabase ke SQLite (saat login). */
  async function downloadAll() {
    syncing.value = true
    error.value = null
    message.value = 'Mengunduh data dari server...'
    try {
      const result = await downloadAllFromSupabase()
      if (!result.success) {
        error.value = result.message || 'Gagal mengunduh data'
        throw new Error(error.value)
      }
      message.value = result.downloaded
        ? `${result.downloaded} data berhasil diunduh`
        : 'Tidak ada data untuk diunduh'
      await loadInfo()
      return result
    } catch (e: any) {
      error.value = e.message || 'Gagal mengunduh data'
      throw e
    } finally {
      syncing.value = false
    }
  }

  /** Upload perubahan (dari sync_queue) ke Supabase. */
  async function uploadChanges() {
    uploading.value = true
    error.value = null
    try {
      const result = await uploadChangesToSupabase()
      if (!result.success && result.message) {
        error.value = result.message
      }
      if (result.uploaded) {
        message.value = `${result.uploaded} data berhasil dibackup`
      }
      await loadInfo()
      return result
    } catch (e: any) {
      error.value = e.message || 'Gagal backup'
      throw e
    } finally {
      uploading.value = false
    }
  }

  /** Upload full (tombol manual "Backup Sekarang"). */
  async function uploadAll() {
    uploading.value = true
    error.value = null
    try {
      const result = await uploadAllToSupabase()
      if (!result.success && result.message) {
        error.value = result.message
      }
      if (result.uploaded) {
        message.value = `${result.uploaded} data berhasil dibackup`
      }
      await loadInfo()
      return result
    } catch (e: any) {
      error.value = e.message || 'Gagal backup'
      throw e
    } finally {
      uploading.value = false
    }
  }

  /** Cek & upload saat app dibuka (startup sync). */
  async function checkAndUpload() {
    if (!isOnlineNow()) return { success: false, message: 'Offline — backup dilewati' }
    const result = await uploadChanges()
    if (result.uploaded === 0) return { success: true, uploaded: 0 }
    return result
  }

  return {
    syncing,
    uploading,
    lastSyncAt,
    lastDownloadAt,
    pendingCount,
    hasPending,
    error,
    message,
    loadInfo,
    downloadAll,
    uploadChanges,
    uploadAll,
    checkAndUpload,
  }
})
