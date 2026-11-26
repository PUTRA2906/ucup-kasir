import { ref, computed, readonly } from 'vue'
import { isNativeApp } from '@/lib/platform'
import { logEvent } from '@/lib/eventLog'

// ============================================================
// Deteksi status jaringan — singleton & andal.
//
// Perbaikan dari versi lama:
//   - Listener dipasang SEKALI di module scope (tidak lagi dilepas oleh
//     onUnmounted komponen mana pun → dulu menghapus listener pemakai lain).
//   - Ada "reachability probe" ke endpoint health Supabase, sehingga
//     navigator.onLine yang menipu (captive portal / WiFi tanpa internet)
//     tidak dianggap online.
//   - Probe diulang saat app resume (Capacitor appStateChange) & periodik.
//   - Bila tersedia plugin @capacitor/network, dipakai untuk event native
//     (import dinamis, fallback ke navigator bila tidak terpasang).
//
// Modul ini sengaja tidak meng-import connectionMode / store agar tidak
// terjadi circular import — lapisan mode membaca isOnlineRef dari sini.
// ============================================================

const isOnline = ref<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true)

const PROBE_INTERVAL_MS = 45_000
const PROBE_TIMEOUT_MS = 5_000

let started = false
let intervalId: ReturnType<typeof setInterval> | null = null
let probeInFlight: Promise<boolean> | null = null
let failureDebounce: ReturnType<typeof setTimeout> | null = null

function healthUrl(): string {
  const base = (import.meta as any).env?.VITE_SUPABASE_URL as string | undefined
  if (!base) return ''
  return `${base.replace(/\/+$/, '')}/auth/v1/health`
}

/** Ubah status online + catat transisi ke event log. */
function setOnline(next: boolean, reason: string): void {
  if (isOnline.value === next) return
  isOnline.value = next
  logEvent({
    level: next ? 'info' : 'warn',
    source: 'network',
    event: next ? 'online' : 'offline',
    message: `Koneksi ${next ? 'tersedia' : 'hilang'} (${reason})`,
  })
}

/**
 * Cek apakah server benar-benar terjangkau.
 * Mengembalikan true bila endpoint health Supabase merespons (status < 500).
 * Idempotent saat probe sedang berjalan (mengembalikan promise yang sama).
 */
export async function probeConnectivity(): Promise<boolean> {
  // navigator bilang offline → tidak perlu fetch, langsung offline.
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    setOnline(false, 'navigator')
    return false
  }

  const url = healthUrl()
  if (!url) {
    // Tanpa URL Supabase, andalkan navigator.
    return isOnline.value
  }

  if (probeInFlight) return probeInFlight

  probeInFlight = (async () => {
    const attempt = async (): Promise<boolean | null> => {
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null
      const timer = controller ? setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS) : null
      try {
        const res = await fetch(url, {
          method: 'GET',
          cache: 'no-store',
          signal: controller?.signal,
        })
        // 2xx/3xx/4xx = server terjangkau (4xx bisa berarti auth, bukan jaringan).
        return res.status < 500
      } catch {
        return null
      } finally {
        if (timer) clearTimeout(timer)
      }
    }

    try {
      const first = await attempt()
      if (first !== null) {
        setOnline(first, 'probe')
        return first
      }

      // Gagal sekali bisa sekadar blip jaringan seluler. Coba sekali lagi
      // singkat sebelum menyatakan offline — popup persetujuan offline
      // tidak boleh muncul hanya karena satu request timeout sesaat.
      await new Promise((r) => setTimeout(r, 1200))
      const second = await attempt()
      if (second !== null) {
        setOnline(second, 'probe-retry')
        return second
      }

      setOnline(false, 'probe-failed')
      return false
    } finally {
      probeInFlight = null
    }
  })()

  return probeInFlight
}

/**
 * Dipanggil saat sebuah request Supabase gagal karena masalah jaringan
 * (bukan error validasi/logika). Memicu probe singkat untuk memastikan
 * koneksi benar-benar putus sebelum berpindah ke mode offline.
 */
export function notifyNetworkFailure(): void {
  if (failureDebounce) return
  failureDebounce = setTimeout(() => {
    failureDebounce = null
    void probeConnectivity()
  }, 600)
}

function onBrowserOnline(): void {
  void probeConnectivity()
}

function onBrowserOffline(): void {
  setOnline(false, 'browser')
}

/**
 * Pasang seluruh pemantau koneksi. Aman dipanggil berulang (idempotent).
 * Panggil sekali saat bootstrap (App.vue / main.ts).
 */
export function startNetworkMonitor(): void {
  if (started || typeof window === 'undefined') return
  started = true

  window.addEventListener('online', onBrowserOnline)
  window.addEventListener('offline', onBrowserOffline)

  if (isNativeApp()) {
    // Plugin jaringan native (opsional).
    import('@capacitor/network')
      .then(({ Network }) => {
        Network.addListener('networkStatusChange', (status) => {
          if (status.connected) void probeConnectivity()
          else setOnline(false, 'network-plugin')
        })
      })
      .catch(() => {
        /* plugin @capacitor/network tidak terpasang — fallback navigator + probe */
      })

    // Probe ulang saat aplikasi kembali ke foreground.
    import('@capacitor/app')
      .then(({ App }) => {
        App.addListener('appStateChange', ({ isActive }) => {
          if (isActive) void probeConnectivity()
        })
      })
      .catch(() => {
        /* plugin app tidak tersedia — abaikan */
      })
  }

  // Probe awal + periodik.
  void probeConnectivity()
  intervalId = setInterval(() => {
    // Lewati saat tab/app tidak aktif untuk hemat baterai.
    if (typeof document !== 'undefined' && document.hidden) return
    void probeConnectivity()
  }, PROBE_INTERVAL_MS)
}

/** Hentikan pemantau (dipakai saat testing / teardown). */
export function stopNetworkMonitor(): void {
  if (!started) return
  if (typeof window !== 'undefined') {
    window.removeEventListener('online', onBrowserOnline)
    window.removeEventListener('offline', onBrowserOffline)
  }
  if (intervalId) {
    clearInterval(intervalId)
    intervalId = null
  }
  started = false
}

/** Ref read-only status online (reaktif, sinkron dengan hasil probe). */
export const isOnlineRef = readonly(isOnline)

/**
 * Composable reaktif untuk komponen. Tidak memasang/menghapus listener
 * (sudah dikelola singleton) — aman dipanggil di mana saja.
 */
export function useNetwork() {
  return {
    isOnline: computed(() => isOnline.value),
  }
}

/** Getter non-reaktif untuk dipakai di service / sync engine. */
export function isOnlineNow(): boolean {
  return isOnline.value
}
