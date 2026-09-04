// ============================================================
// Helper khusus SQLite service layer.
// Di Supabase, RLS otomatis menyaring user_id = auth.uid().
// Di SQLite, setiap query HARUS menyaring user_id secara manual.
// User id di-set oleh auth store saat login/init.
// ============================================================

export * from '@/lib/sqlite'

let currentUserId: string | null = null

/** Set user yang sedang aktif (dipanggil dari auth store). */
export function setCurrentUserId(id: string | null): void {
  currentUserId = id
}

/** Ambil user_id aktif. Lempar error jika belum ada (tidak login). */
export function getCurrentUserId(): string {
  if (!currentUserId) {
    throw new Error('Tidak ada user yang login')
  }
  return currentUserId
}

/** Apakah user sudah di-set (untuk cek tanpa throw). */
export function hasCurrentUser(): boolean {
  return !!currentUserId
}

// ============================================================
// Helper utilitas
// ============================================================

/** Generate UUID v4 (fallback jika crypto.randomUUID tidak ada). */
export function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  // Fallback manual (web worker / environment lama)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/** Timestamp ISO 8601 saat ini. */
export function nowIso(): string {
  return new Date().toISOString()
}

/** Generate nomor transaksi: TRX-YYYYMMDD-XXXXXX */
export function generateTransactionNumber(): string {
  const now = new Date()
  const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(
    now.getDate()
  ).padStart(2, '0')}`
  return `TRX-${date}-${randomSuffix()}`
}

/** Generate nomor retur: RTR-YYYYMMDD-XXXXXX */
export function generateReturnNumber(): string {
  const now = new Date()
  const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(
    now.getDate()
  ).padStart(2, '0')}`
  return `RTR-${date}-${randomSuffix()}`
}

/** Generate nomor opname: OPN-YYYYMMDD-XXXXXX */
export function generateOpnameNumber(): string {
  const now = new Date()
  const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(
    now.getDate()
  ).padStart(2, '0')}`
  return `OPN-${date}-${randomSuffix()}`
}

/** Generate nomor surat jalan: SJ-YYYYMMDD-XXXXXX */
export function generateDeliveryNumber(): string {
  const now = new Date()
  const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(
    now.getDate()
  ).padStart(2, '0')}`
  return `SJ-${date}-${randomSuffix()}`
}

/** Suffix acak 6 karakter uppercase (mirip substr(md5(random()), 1, 6)). */
function randomSuffix(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase().padEnd(6, 'X')
}
