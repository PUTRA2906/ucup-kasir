import { createClient } from '@supabase/supabase-js'
import { logEvent } from '@/lib/eventLog'
import { notifyNetworkFailure } from '@/lib/network'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseKey)

// ============================================================
// Instrumentasi event log — semua error Supabase terekam otomatis.
//
// Supabase-js mengembalikan error lewat `{ error }` (bukan throw), jadi
// kita bungkus builder dari `from()`/`rpc()` dan setiap panggilan di
// `auth` dengan proxy yang memeriksa hasil resolve-nya. Saat ada error,
// entry ditulis ke event log (source: 'supabase' / 'auth') beserta tabel,
// operasi, dan filter terakhir yang dipakai — cukup untuk menelusuri
// kegagalan dari halaman Log Event.
// ============================================================

function describeError(error: any): string {
  const parts = [error?.message || String(error)]
  if (error?.code) parts.push(`code=${error.code}`)
  if (error?.details) parts.push(String(error.details))
  if (error?.hint) parts.push(`hint: ${error.hint}`)
  return parts.join(' | ')
}

/**
 * Apakah error berasal dari masalah JARINGAN (bukan validasi/logika)?
 * Supabase-js melempar TypeError("Failed to fetch")/AbortError saat offline,
 * atau mengembalikan error dengan pesan jaringan. Ini memicu probe koneksi
 * agar aplikasi berpindah ke mode offline + menampilkan popup persetujuan.
 */
function isNetworkError(error: any): boolean {
  if (!error) return false
  const msg = String(error?.message || error).toLowerCase()
  return (
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('network request failed') ||
    msg.includes('fetch failed') ||
    msg.includes('timeout') ||
    msg.includes('abort') ||
    error?.name === 'AbortError' ||
    error?.name === 'TypeError'
  )
}

const QUERY_METHODS = new Set(['select', 'insert', 'update', 'delete', 'upsert'])

/**
 * Bungkus PostgrestFilterBuilder dengan Proxy yang:
 *  - mencatat operasi (select/insert/...) & filter terakhir (.eq/.in/...)
 *  - saat di-await, periksa `{ error }` hasil dan rekam ke event log
 * Metode builder mengembalikan `this` — proxy mengembalikan dirinya lagi
 * agar seluruh rantai tetap terinstrumentasi.
 */
function wrapBuilder(builder: any, table: string, method: 'from' | 'rpc'): any {
  let op = method === 'rpc' ? `rpc:${table}` : 'select'
  const filters: string[] = []
  let rowsHint = ''

  const proxy: any = new Proxy(builder, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver)

      if (prop === 'then') {
        // Builder di-await — tangkap hasil.
        return (resolve: any, reject: any) =>
          Promise.resolve(target).then(
            (result: any) => {
              if (result && result.error) {
                logEvent({
                  level: 'error',
                  source: 'supabase',
                  event: `request_failed`,
                  message: `${op} ${table}${rowsHint ? ` (${rowsHint})` : ''}: ${describeError(result.error)}`,
                  detail: filters.length ? `filters: ${filters.join(', ')}` : undefined,
                })
                if (isNetworkError(result.error)) notifyNetworkFailure()
              }
              return resolve?.(result)
            },
            (e) => {
              logEvent({
                level: 'error',
                source: 'supabase',
                event: 'request_exception',
                message: `${op} ${table}: ${(e as Error)?.message || String(e)}`,
                detail: (e as Error)?.stack,
              })
              if (isNetworkError(e)) notifyNetworkFailure()
              return reject?.(e)
            }
          )
      }

      if (typeof value === 'function') {
        return function (this: unknown, ...args: any[]) {
          if (QUERY_METHODS.has(prop as string)) op = prop as string
          if ((prop === 'insert' || prop === 'upsert') && Array.isArray(args[0])) {
            rowsHint = `${args[0].length} rows`
          } else if (prop === 'eq' || prop === 'in' || prop === 'is' || prop === 'gte' || prop === 'lte') {
            if (filters.length < 6) filters.push(`${prop}(${args[0]})`)
          }
          const ret = value.apply(target, args)
          // Metode builder mengembalikan this → kembalikan proxy agar rantai ikut terpantau.
          return ret === target ? proxy : ret
        }
      }
      return value
    },
  })
  return proxy
}

const originalFrom = supabase.from.bind(supabase)
supabase.from = ((table: string) => wrapBuilder(originalFrom(table), table, 'from')) as typeof supabase.from

const originalRpc = supabase.rpc.bind(supabase)
supabase.rpc = ((fn: string, args?: any) =>
  wrapBuilder(originalRpc(fn, args), fn, 'rpc')) as typeof supabase.rpc

// --- Auth: setiap error pada hasil auth.* terekam sebagai source 'auth' ---
function wrapAuth(target: any): any {
  return new Proxy(target, {
    get(t, prop, receiver) {
      const value = Reflect.get(t, prop, receiver)
      if (typeof value === 'function') {
        return (...args: any[]) => {
          const result = value.apply(t, args)
          if (result && typeof result.then === 'function') {
            return result.then(
              (r: any) => {
                if (r && r.error) {
                  logEvent({
                    level: 'error',
                    source: 'auth',
                    event: `auth_${String(prop)}`,
                    message: describeError(r.error),
                  })
                  if (isNetworkError(r.error)) notifyNetworkFailure()
                }
                return r
              },
              (e: any) => {
                // Auth bisa melempar (bukan return { error }) saat jaringan putus.
                if (isNetworkError(e)) notifyNetworkFailure()
                throw e
              }
            )
          }
          return result
        }
      }
      return value
    },
  })
}
;(supabase as any).auth = wrapAuth((supabase as any).auth)
