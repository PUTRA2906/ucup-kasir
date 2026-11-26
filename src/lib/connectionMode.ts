import { ref, readonly, watch } from 'vue'
import { isNativeApp } from '@/lib/platform'
import { isOnlineRef, probeConnectivity } from '@/lib/network'
import { logEvent } from '@/lib/eventLog'

// ============================================================
// Connection Mode — "otak" mode hybrid online/offline.
//
// Prinsip penting:
//   - BACKEND (Supabase vs SQLite) ditentukan KONEKTIVITAS, bukan
//     persetujuan pengguna. Lihat getActiveBackend().
//   - PERSETUJUAN hanya mengatur LAPISAN UI (popup & layar blokir).
//     Dengan pemisahan ini tidak ada race saat cold-start offline:
//     service sudah otomatis memakai SQLite, sementara UI menanyakan
//     apakah pengguna mau melanjutkan.
//
// Android:
//   online  → backend 'online'  (Supabase) + cache SQLite diperbarui
//   offline → backend 'local'   (SQLite)  + popup persetujuan setiap putus
//             - setuju  → app tetap jalan
//             - tolak   → layar blokir (Coba Lagi / Masuk Mode Offline)
// Web:
//   selalu backend 'online'; saat offline tampilkan layar blokir
//   (tanpa opsi offline — web tidak punya SQLite).
// ============================================================

export type ActiveBackend = 'online' | 'local'

const isNative = isNativeApp()

const consentOpen = ref(false)
const blocked = ref(false)

let watcherStarted = false
let cacheTimer: ReturnType<typeof setInterval> | null = null

// Segarkan cache SQLite saat online secara berkala agar siap bila koneksi
// putus. Incremental tiap 3 menit; full refresh ditangani sync engine saat
// login. Interval sengaja konservatif agar tidak membebani server.
const CACHE_REFRESH_INTERVAL_MS = 3 * 60_000

/**
 * Backend aktif — dipanggil SINKRON oleh router service setiap request.
 * Web selalu 'online'. Android mengikuti status konektivitas.
 */
export function getActiveBackend(): ActiveBackend {
  if (!isNative) return 'online'
  return isOnlineRef.value ? 'online' : 'local'
}

export const isConsentOpen = readonly(consentOpen)
export const isOfflineBlocked = readonly(blocked)

/** Apakah sedang berada di mode offline (native & tidak online). */
export function isOfflineMode(): boolean {
  return isNative && !isOnlineRef.value
}

async function isAuthenticated(): Promise<boolean> {
  try {
    const { useAuthStore } = await import('@/stores/auth')
    return useAuthStore().isAuthenticated
  } catch {
    return false
  }
}

/** Pengguna menerima masuk mode offline → tutup popup, lanjut pakai app. */
export function acceptOffline(): void {
  consentOpen.value = false
  blocked.value = false
  logEvent({
    level: 'info',
    source: 'network',
    event: 'offline_accepted',
    message: 'Pengguna menyetujui mode offline',
  })
}

/** Pengguna menolak mode offline → tampilkan layar blokir. */
export function rejectOffline(): void {
  consentOpen.value = false
  blocked.value = true
  logEvent({
    level: 'warn',
    source: 'network',
    event: 'offline_blocked',
    message: 'Pengguna menolak mode offline — aplikasi diblokir sampai online',
  })
}

/** Coba sambung ulang (tombol "Coba Lagi"). */
export async function retryConnection(): Promise<boolean> {
  const ok = await probeConnectivity()
  if (ok) {
    // Transisi online akan ditangani watcher.
    return true
  }
  return false
}

async function handleWentOffline(): Promise<void> {
  logEvent({
    level: 'warn',
    source: 'network',
    event: 'mode_switch',
    message: 'Koneksi hilang — beralih ke backend lokal',
  })

  if (!isNative) {
    // Web: tidak ada mode offline → blokir.
    blocked.value = true
    return
  }

  // Android: hanya tampilkan popup bila pengguna sudah login (di dalam app).
  // Di layar login, biarkan alur login yang menampilkan error koneksi.
  if (!(await isAuthenticated())) {
    blocked.value = false
    consentOpen.value = false
    return
  }

  // Setiap putus → tanya lagi (tidak diingat antar-putus).
  blocked.value = false
  consentOpen.value = true
}

async function handleBackOnline(): Promise<void> {
  consentOpen.value = false
  blocked.value = false

  logEvent({
    level: 'info',
    source: 'network',
    event: 'mode_switch',
    message: 'Koneksi pulih — kembali ke backend Supabase',
  })

  if (!isNative) return
  // Belum login (mis. di layar masuk) — tidak ada yang perlu disinkronkan.
  if (!(await isAuthenticated())) return

  // Kirim antrean offline + segarkan cache. Jangan blokir UI bila gagal.
  try {
    const { useToast } = await import('@/composables/useToast')
    useToast().info('Kembali online', 'Menyinkronkan data ke server...')
  } catch {
    /* toast opsional */
  }
  try {
    const { useSyncStore } = await import('@/stores/sync')
    await useSyncStore().handleReconnect()
  } catch (e) {
    logEvent({
      level: 'error',
      source: 'network',
      event: 'reconnect_sync_failed',
      message: (e as Error)?.message || String(e),
    })
  }
}

/**
 * Mulai memantau transisi konektivitas. Panggil SEKALI saat bootstrap
 * (App.vue onMounted) SETELAH auth diinisialisasi, agar pengecekan kondisi
 * awal tahu apakah pengguna sudah login.
 */
export function startConnectionWatcher(): void {
  if (watcherStarted) return
  watcherStarted = true

  watch(
    isOnlineRef,
    (online, prev) => {
      if (online === prev) return
      if (online) void handleBackOnline()
      else void handleWentOffline()
    }
  )

  // Kondisi awal: bila app dibuka saat sudah offline.
  if (!isOnlineRef.value) void handleWentOffline()

  // Penyegaran cache berkala selama online (native saja).
  if (isNative) {
    if (cacheTimer) clearInterval(cacheTimer)
    cacheTimer = setInterval(() => {
      if (!isOnlineRef.value) return
      if (typeof document !== 'undefined' && document.hidden) return
      void (async () => {
        try {
          const { useSyncStore } = await import('@/stores/sync')
          await useSyncStore().refreshCache()
        } catch {
          /* non-critical */
        }
      })()
    }, CACHE_REFRESH_INTERVAL_MS)
  }
}
