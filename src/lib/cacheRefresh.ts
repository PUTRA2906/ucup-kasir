import { logEvent } from '@/lib/eventLog'

// ============================================================
// Penjadwal penyegaran cache SQLite setelah mutasi ONLINE.
//
// Saat online, tulis langsung ke Supabase (tidak lewat sync_queue),
// jadi SQLite bisa tertinggal. Setelah mutasi berhasil, jadwalkan
// refresh incremental ter-debounce agar cache siap dipakai bila
// koneksi putus. Debounce mencegah puluhan request saat user
// menyimpan banyak data beruntun.
// ============================================================

const DEBOUNCE_MS = 45_000
const MIN_GAP_MS = 120_000

let timer: ReturnType<typeof setTimeout> | null = null
let lastRunAt = 0
let running = false

async function runRefresh(): Promise<void> {
  if (running) return
  const now = Date.now()
  if (now - lastRunAt < MIN_GAP_MS) {
    // Terlalu cepat — jadwalkan ulang untuk sisa waktu.
    scheduleCacheRefresh()
    return
  }
  running = true
  lastRunAt = now
  try {
    const { useSyncStore } = await import('@/stores/sync')
    await useSyncStore().refreshCache()
  } catch (e) {
    logEvent({
      level: 'warn',
      source: 'sync',
      event: 'cache_refresh_failed',
      message: (e as Error)?.message || String(e),
    })
  } finally {
    running = false
  }
}

/**
 * Jadwalkan refresh cache SQLite (debounced). Aman dipanggil berulang.
 * Hanya efektif di native & saat online — dicek oleh pemanggil/router.
 */
export function scheduleCacheRefresh(): void {
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => {
    timer = null
    void runRefresh()
  }, DEBOUNCE_MS)
}
