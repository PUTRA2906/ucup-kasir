/**
 * Helper tanggal zona-waktu lokal.
 *
 * PENTING: jangan pakai `new Date().toISOString().split('T')[0]` untuk
 * mendapatkan "tanggal hari ini" — ISO string memakai UTC, sehingga di WIB
 * (UTC+7) hasilnya masih kemarin sebelum jam 07:00 pagi.
 * Gunakan fungsi di bawah ini.
 */

/** Format Date -> 'YYYY-MM-DD' berdasarkan zona waktu lokal device. */
export function localDateStr(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** 'YYYY-MM-DD' hari ini (lokal). */
export function localTodayStr(): string {
  return localDateStr(new Date())
}

/** 'YYYY-MM-DD' hari ini digeser `offsetDays` (lokal). Negatif = ke belakang. */
export function localDateOffsetStr(offsetDays: number): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return localDateStr(d)
}

/**
 * Ekstrak 'YYYY-MM-DD' (lokal) dari string timestamp ISO apa pun.
 * Bedakan dari `iso.split('T')[0]` yang mengambil bagian UTC-nya.
 */
export function localDateFromIso(iso: string): string {
  const d = new Date(iso)
  return isNaN(d.getTime()) ? iso.slice(0, 10) : localDateStr(d)
}

/**
 * Rentang instan untuk SATU "hari bisnis" pada kolom `timestamptz` seperti
 * `journal_entries.entry_date`.
 *
 * Kenapa berbasis hari UTC, bukan hari lokal:
 * `post_journal`/`post_adjusting_journal` menyimpan
 * `entry_date := p_entry_date::date + CURRENT_TIME`, dan seluruh fungsi SQL
 * (cek tutup buku, jurnal penutup) memakai `entry_date::date` — yaitu bagian
 * tanggal dalam UTC. Jadi **bagian tanggal UTC adalah tanggal bisnis**.
 * Memakai rentang lokal (WIB) akan menggeser batas 7 jam dan membuat jurnal
 * pagi/siang jatuh ke hari yang salah.
 *
 * JANGAN kirim string 'YYYY-MM-DD' mentah ke PostgREST untuk kolom ini:
 * PostgREST me-cast ke `D 00:00:00+00`, sehingga `.gte(date).lte(date)` hanya
 * cocok untuk baris yang tepat tengah malam — semua jurnal ber-jam hilang.
 *
 * Pakai `.gte(start)` + `.lt(end)` (setengah-terbuka).
 */
export function businessDayRangeIso(date: string): { start: string; end: string } {
  const [y, m, d] = date.split('-').map(Number)
  if (!y || !m || !d) {
    // Input tak terduga — fallback ke perilaku lama agar tidak crash.
    return { start: `${date}T00:00:00.000Z`, end: `${date}T23:59:59.999Z` }
  }
  const start = new Date(Date.UTC(y, m - 1, d))
  const end = new Date(Date.UTC(y, m - 1, d + 1))
  return { start: start.toISOString(), end: end.toISOString() }
}

/**
 * Tanggal bisnis ('YYYY-MM-DD') dari `entry_date` jurnal.
 *
 * `entry_date` disimpan sebagai `tanggal_bisnis::date + CURRENT_TIME`, jadi
 * bagian tanggal dalam **UTC** adalah tanggal bisnisnya. Mengonversi ke zona
 * lokal (mis. WIB) bisa menggeser jurnal yang dibuat dini hari ke hari
 * berikutnya — jangan pakai `localDateFromIso` untuk kolom ini.
 */
export function businessDateFromIso(iso: string | null | undefined): string {
  if (!iso) return ''
  const normalized = String(iso).replace(' ', 'T')
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(normalized)
  return m ? m[1] : ''
}

/**
 * Parse tanggal bisnis jadi `Date` lokal pada tengah hari.
 *
 * Dipakai untuk menampilkan tanggal tanpa risiko pergeseran zona waktu:
 * `new Date('2026-11-26')` dibaca sebagai UTC, sedangkan tengah hari lokal
 * selalu jatuh di tanggal yang sama untuk semua zona ±14 jam.
 */
export function parseBusinessDate(iso: string | null | undefined): Date | null {
  const ymd = businessDateFromIso(iso)
  if (!ymd) return null
  const [y, m, d] = ymd.split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d, 12, 0, 0, 0)
}
