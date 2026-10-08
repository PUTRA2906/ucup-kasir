// ============================================================
// useStartupLog — Bus log real-time untuk layar pemuatan awal.
//
// Cara kerja:
//   - Proses startup (main.ts, syncEngine, dll.) memanggil pushStartupLog()
//     untuk mengirim pesan yang ingin ditampilkan ke layar.
//   - DownloadScreen.vue memakai useStartupLog() untuk subscribe dan
//     menampilkan daftar log tersebut secara reaktif.
//
// Desain sengaja ringan: tidak pakai Pinia, cukup ref + listeners.
// Bus aktif hanya selama startup; setelah navigasi ke app utama, listener
// dibuang otomatis oleh onUnmounted di komponen subscriber.
// ============================================================

import { ref, readonly } from 'vue'

export interface StartupLogEntry {
  id: number
  ts: number
  level: 'info' | 'warn' | 'error'
  message: string
}

let _seq = 0
const _entries = ref<StartupLogEntry[]>([])
const _listeners = new Set<(entry: StartupLogEntry) => void>()

/** Kirim satu baris log ke semua subscriber aktif. */
export function pushStartupLog(
  message: string,
  level: StartupLogEntry['level'] = 'info'
): void {
  const entry: StartupLogEntry = {
    id: ++_seq,
    ts: Date.now(),
    level,
    message,
  }
  _entries.value.push(entry)
  // Batasi buffer agar tidak tumbuh tak terbatas jika startup lama
  if (_entries.value.length > 200) {
    _entries.value.splice(0, _entries.value.length - 200)
  }
  _listeners.forEach((fn) => fn(entry))
}

/** Kosongkan semua log (mis. saat mulai download baru). */
export function clearStartupLog(): void {
  _entries.value = []
}

/**
 * Composable untuk komponen yang ingin menampilkan log.
 * `entries` adalah readonly reactive ref — cukup di-render langsung di template.
 */
export function useStartupLog() {
  /**
   * Daftarkan callback yang dipanggil setiap kali ada log baru.
   * Return unsubscribe function — panggil di onUnmounted.
   */
  function onLog(fn: (entry: StartupLogEntry) => void): () => void {
    _listeners.add(fn)
    return () => _listeners.delete(fn)
  }

  return {
    /** Seluruh log yang sudah masuk sejak startup. */
    entries: readonly(_entries),
    onLog,
    pushStartupLog,
    clearStartupLog,
  }
}
