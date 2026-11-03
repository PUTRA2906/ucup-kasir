// ============================================================
// Event Log — perekam aktivitas & error aplikasi.
//
// Tujuan: saat ada error (SQLite gagal, Supabase error, sync gagal,
// crash WebView), user bisa buka halaman "Log Event" di Pengaturan
// dan melihat sumber error: SQLite lokal, Supabase, Sync, Auth, dll.
//
// Penyimpanan:
//   - Buffer in-memory + mirror localStorage (jalan di web & Android).
//   - Saat SQLite tersedia (native), entry di-flush ke tabel
//     app_event_log agar tahan-banting terhadap WebView storage dikosongkan.
//   - Tabel app_event_log TIDAK ikut disinkron ke Supabase (lokal saja).
//
// Perekaman otomatis: installEventLog() memasang window.onerror,
// unhandledrejection, dan patch console.error/warn — sehingga error
// lama di seluruh app ikut terekam tanpa perlu diubah satu-satu.
// ============================================================

import { isNativeApp } from '@/lib/platform'

export type EventLevel = 'info' | 'warn' | 'error'

export type EventSource = 'sqlite' | 'supabase' | 'sync' | 'auth' | 'network' | 'app' | 'scheduled_sync'

export interface EventLogEntry {
  uid: string
  ts: number // epoch ms
  level: EventLevel
  source: EventSource
  event: string
  message: string
  detail?: string
  platform: 'android' | 'web'
}

export interface LogEventInput {
  level?: EventLevel
  source: EventSource
  event: string
  message: string
  detail?: string
}

const LS_KEY = 'ucup_eve'
const MAX_LOCAL = 500
const MAX_MESSAGE = 500
const MAX_DETAIL = 2000

let buffer: EventLogEntry[] | null = null
let uidSeq = 0
let installed = false
let suppress = false // guard rekursi: jangan rekam error dari mekanisme log sendiri

// ------------------------------------------------------------
// Util
// ------------------------------------------------------------

function makeUid(): string {
  uidSeq += 1
  return `${Date.now().toString(36)}-${uidSeq.toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

function truncate(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max)}…` : s
}

/** Tebak sumber error dari teks pesan (dipakai untuk auto-capture). */
export function guessSource(text: string): EventSource {
  const t = text.toLowerCase()
  if (/sqlite|no such table|no such column|already in transaction|jeep[- ]?sqlite/.test(t)) return 'sqlite'
  if (/supabase|postgrest|jwt expired|invalid apikey|rls|row level security/.test(t)) return 'supabase'
  if (/\bsync\b|sinkron|queue|upload|download|backup|inguh data|unduh/.test(t)) return 'sync'
  if (/\bauth\b|login|signin|logout|session|password|kata sandi|token/.test(t)) return 'auth'
  if (/internet|offline|network|fetch failed|connection|timeout|err_network|load failed/.test(t)) return 'network'
  return 'app'
}

function loadBuffer(): EventLogEntry[] {
  if (buffer) return buffer
  buffer = []
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        buffer = parsed.filter((e) => e && typeof e.uid === 'string')
      }
    }
  } catch {
    // storage korup/kosong — mulai bersih, jangan sampai app crash
    buffer = []
  }
  return buffer
}

let saveTimer: ReturnType<typeof setTimeout> | null = null
function scheduleSave() {
  if (saveTimer) return
  saveTimer = setTimeout(() => {
    saveTimer = null
    saveNow()
  }, 1000)
}

function saveNow() {
  if (!buffer) return
  try {
    // Simpan MAX_LOCAL terakhir; batasi juga total ukuran serialization.
    let slice = buffer.slice(-MAX_LOCAL)
    let json = JSON.stringify(slice)
    while (json.length > 400_000 && slice.length > 50) {
      slice = slice.slice(Math.ceil(slice.length / 4))
      json = JSON.stringify(slice)
    }
    localStorage.setItem(LS_KEY, json)
  } catch {
    // quota penuh — buang separuh terlama lalu coba sekali lagi
    try {
      buffer = buffer.slice(-Math.floor(MAX_LOCAL / 2))
      localStorage.setItem(LS_KEY, JSON.stringify(buffer))
    } catch {
      // menyerah; buffer in-memory tetap dipakai
    }
  }
}

// ------------------------------------------------------------
// Flush ke SQLite (native saja, best-effort)
// ------------------------------------------------------------

let flushTimer: ReturnType<typeof setTimeout> | null = null
let flushing = false

function scheduleFlush() {
  if (!isNativeApp() || flushTimer || flushing) return
  flushTimer = setTimeout(() => {
    flushTimer = null
    void flushToSQLite()
  }, 5000)
}

/** Insert entry yang belum pernah ditulis ke tabel app_event_log. */
export async function flushToSQLite(): Promise<void> {
  if (!isNativeApp() || flushing) return
  const pending = loadBuffer()
  if (pending.length === 0) return
  flushing = true
  suppress = true
  try {
    const { saveEventLogEntries } = await import('@/lib/sqlite')
    await saveEventLogEntries(pending)
  } catch {
    // SQLite belum siap / gagal — entry tetap aman di localStorage,
    // dicoba lagi pada flush berikutnya.
  } finally {
    suppress = false
    flushing = false
  }
}

// ------------------------------------------------------------
// API utama
// ------------------------------------------------------------

/** Catat satu event. Tidak pernah melempar error (perekaman harus pasif). */
export function logEvent(input: LogEventInput): void {
  if (suppress) return
  try {
    const entry: EventLogEntry = {
      uid: makeUid(),
      ts: Date.now(),
      level: input.level || 'info',
      source: input.source,
      event: input.event,
      message: truncate(String(input.message || ''), MAX_MESSAGE),
      detail: input.detail ? truncate(String(input.detail), MAX_DETAIL) : undefined,
      platform: isNativeApp() ? 'android' : 'web',
    }
    const buf = loadBuffer()
    buf.push(entry)
    if (buf.length > MAX_LOCAL * 2) {
      buffer = buf.slice(-MAX_LOCAL)
    }
    scheduleSave()
    scheduleFlush()
  } catch {
    // perekaman tidak boleh merusak alur utama
  }
}

/** Helper: tangkap error dari catch dan rekam. Return pesan error string. */
export function logError(source: EventSource, event: string, e: unknown, extra?: string): string {
  const err = e as Error
  const message = err?.message || String(e)
  logEvent({
    level: 'error',
    source,
    event,
    message: extra ? `${extra}: ${message}` : message,
    detail: err?.stack,
  })
  return message
}

/** Semua entry yang tersimpan di localStorage (terlama → terbaru). */
export function getLocalEntries(): EventLogEntry[] {
  return loadBuffer().slice()
}

/** Kosongkan buffer localStorage. (SQLite dibersihkan terpisah.) */
export function clearLocalEntries(): void {
  buffer = []
  try {
    localStorage.removeItem(LS_KEY)
  } catch {
    // ignore
  }
}

// ------------------------------------------------------------
// Auto-capture global
// ------------------------------------------------------------

function stringifyArgs(args: unknown[]): string {
  return args
    .map((a) => {
      if (typeof a === 'string') return a
      if (a instanceof Error) return a.message
      try {
        return JSON.stringify(a)
      } catch {
        return String(a)
      }
    })
    .join(' ')
}

/**
 * Pasang perekaman global: error window, promise rejection, console.error/warn.
 * Idempotent — aman dipanggil berkali-kali.
 */
export function installEventLog(): void {
  if (installed || typeof window === 'undefined') return
  installed = true

  // Muat buffer + simpan sekali supaya crash setelah ini tetap tersimpan.
  loadBuffer()

  window.addEventListener('error', (e) => {
    if (!e.message) return // resource load error (gambar/skrip) — lewati
    const file = e.filename ? `${e.filename.split('/').pop()}:${e.lineno || 0}` : ''
    logEvent({
      level: 'error',
      source: guessSource(`${e.message} ${e.error?.stack || ''}`),
      event: 'window_error',
      message: file ? `${e.message} (${file})` : e.message,
      detail: e.error?.stack,
    })
  })

  window.addEventListener('unhandledrejection', (e) => {
    const reason = (e as PromiseRejectionEvent).reason
    const message = reason?.message || String(reason ?? 'unknown')
    logEvent({
      level: 'error',
      source: guessSource(`${message} ${reason?.stack || ''}`),
      event: 'unhandled_rejection',
      message,
      detail: reason?.stack,
    })
  })

  // Patch console.error / console.warn agar error yang sudah ada di seluruh
  // app (pola lama) ikut terekam tanpa harus diubah satu-satu.
  const origError = console.error.bind(console)
  const origWarn = console.warn.bind(console)
  console.error = (...args: unknown[]) => {
    origError(...args)
    if (!suppress) {
      const msg = stringifyArgs(args)
      if (msg) logEvent({ level: 'error', source: guessSource(msg), event: 'console_error', message: msg })
    }
  }
  console.warn = (...args: unknown[]) => {
    origWarn(...args)
    if (!suppress) {
      const msg = stringifyArgs(args)
      if (msg) logEvent({ level: 'warn', source: guessSource(msg), event: 'console_warn', message: msg })
    }
  }

  logEvent({ level: 'info', source: 'app', event: 'app_start', message: 'Aplikasi dimulai' })
}
