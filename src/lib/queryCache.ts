/**
 * Cache baca (L1, in-memory) — pengganti mode offline.
 *
 * Masalah yang diselesaikan: ~95 view memanggil service di `onMounted`, dan
 * berpindah halaman bolak-balik berarti request Supabase berulang untuk data
 * yang sama. Cache ini memberi TTL pendek + penggabungan request yang sedang
 * berjalan (in-flight dedup), sehingga navigasi tidak memicu fetch baru.
 *
 * Aturan penting:
 *   - Key SELALU memuat `storeId` → data toko A tidak pernah terbaca toko B
 *     di perangkat yang sama. `clearAll()` dipanggil saat logout / ganti toko.
 *   - Setiap mutasi membatalkan domain terkait (`invalidateDomain`), jadi data
 *     setelah tulis tidak basi.
 *   - Ini cache BACA saja. Tidak ada penulisan offline, tidak ada antrean
 *     sinkronisasi — transaksi tetap wajib lewat RPC Supabase.
 */
import { getCurrentStoreId } from '@/lib/currentStore'

interface CacheEntry {
  value: unknown
  expiresAt: number
}

/** TTL default per domain (ms). Domain yang tidak terdaftar memakai DEFAULT_TTL. */
const DOMAIN_TTL: Record<string, number> = {
  products: 5 * 60_000,
  categories: 10 * 60_000,
  customers: 5 * 60_000,
  storeSettings: 10 * 60_000,
  priceMatrix: 5 * 60_000,
  hr: 5 * 60_000,
  purchasing: 2 * 60_000,
  transactions: 60_000,
  returns: 60_000,
  stock: 60_000,
  salesReport: 60_000,
  salesReportEnhanced: 60_000,
  finance: 60_000,
  shipping: 60_000,
  itemPayment: 60_000,
  dailyCash: 60_000,
  dailyBank: 60_000,
  agingReceivables: 60_000,
  notifications: 30_000,
}
const DEFAULT_TTL = 60_000

/**
 * Domain lain yang ikut basi saat sebuah domain berubah.
 * Contoh: transaksi baru mengubah stok, laporan penjualan, dan notifikasi.
 */
const DEPENDENTS: Record<string, string[]> = {
  products: ['products', 'stock', 'priceMatrix', 'salesReport', 'salesReportEnhanced'],
  categories: ['categories', 'products'],
  customers: ['customers', 'transactions', 'priceMatrix', 'agingReceivables'],
  transactions: ['transactions', 'salesReport', 'salesReportEnhanced', 'stock', 'products', 'notifications', 'agingReceivables', 'dailyCash', 'finance'],
  returns: ['returns', 'transactions', 'salesReport', 'salesReportEnhanced', 'stock', 'products', 'finance'],
  stock: ['stock', 'products', 'transactions'],
  purchasing: ['purchasing', 'stock', 'products', 'finance'],
  finance: ['finance', 'salesReportEnhanced'],
  itemPayment: ['itemPayment', 'transactions', 'salesReportEnhanced'],
  dailyCash: ['dailyCash'],
  dailyBank: ['dailyBank'],
  notifications: ['notifications'],
}

const cache = new Map<string, CacheEntry>()
const inflight = new Map<string, Promise<unknown>>()

/** Statistik ringan untuk debugging (dipakai test manual / event log). */
let hits = 0
let misses = 0

function storeScope(): string {
  // `anon` hanya dipakai sebelum keanggotaan dimuat; `clearAll()` saat login
  // memastikan tidak ada data lintas-tenant yang tertinggal.
  return getCurrentStoreId() ?? 'anon'
}

function keyFor(domain: string, variant: string): string {
  return `${storeScope()}:${domain}:${variant}`
}

/** Serialisasi argumen jadi bagian key; aman untuk nilai non-JSON. */
export function variantOf(args: unknown[]): string {
  if (args.length === 0) return 'default'
  try {
    return JSON.stringify(args)
  } catch {
    return args.map((a) => String(a)).join('|')
  }
}

/** Salinan dangkal agar pemanggil tidak bisa merusak isi cache. */
function copyForCaller<T>(value: T): T {
  if (Array.isArray(value)) return value.slice() as unknown as T
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>
    if (Array.isArray(obj.data)) return { ...obj, data: obj.data.slice() } as unknown as T
  }
  return value
}

/**
 * Ambil dari cache bila masih segar; jika tidak, jalankan `fetcher`.
 * Request identik yang berjalan bersamaan memakai promise yang sama.
 */
export function cachedQuery<T>(
  domain: string,
  variant: string,
  fetcher: () => Promise<T>,
  ttlMs: number = DOMAIN_TTL[domain] ?? DEFAULT_TTL,
): Promise<T> {
  const key = keyFor(domain, variant)
  const now = Date.now()

  const entry = cache.get(key)
  if (entry && entry.expiresAt > now) {
    hits++
    return Promise.resolve(copyForCaller(entry.value as T))
  }

  const pending = inflight.get(key)
  if (pending) {
    hits++
    return pending.then((v) => copyForCaller(v as T))
  }

  misses++
  const promise = fetcher()
    .then((value) => {
      cache.set(key, { value, expiresAt: Date.now() + ttlMs })
      return value
    })
    .finally(() => {
      inflight.delete(key)
    })

  inflight.set(key, promise)
  return promise
}

/** Hapus seluruh entri milik domain (dan domain turunannya) untuk toko aktif. */
export function invalidateDomain(domain: string): void {
  const scope = `${storeScope()}:`
  const targets = new Set([domain, ...(DEPENDENTS[domain] ?? [])])
  for (const key of cache.keys()) {
    if (!key.startsWith(scope)) continue
    const rest = key.slice(scope.length)
    const dom = rest.slice(0, rest.indexOf(':'))
    if (targets.has(dom)) cache.delete(key)
  }
}

/** Kosongkan cache seluruh toko (dipakai saat logout / ganti akun). */
export function clearAll(): void {
  cache.clear()
  inflight.clear()
  hits = 0
  misses = 0
}

/** Info cache — untuk debugging manual di konsol. */
export function cacheStats(): { entries: number; inflight: number; hits: number; misses: number } {
  return { entries: cache.size, inflight: inflight.size, hits, misses }
}
