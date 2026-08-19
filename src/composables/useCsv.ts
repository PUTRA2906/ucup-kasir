/**
 * Utilitas untuk export & import data CSV.
 * Menyediakan parser CSV (memperhitungkan nilai yang dikutip) dan generator
 * file CSV yang bisa diunduh.
 */

/** Escape satu nilai/kolom CSV. Nilai yang mengandung koma, tanda kutip,
 * atau baris baru akan dibungkus tanda kutip ganda. */
export function csvEscape(value: unknown): string {
  const str = value === null || value === undefined ? '' : String(value)
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

/** Gabungkan baris-baris (array of arrays) menjadi string CSV. */
export function rowsToCsv(rows: unknown[][]): string {
  return rows.map((row) => row.map(csvEscape).join(',')).join('\n')
}

/** Buat Blob CSV dan picu unduhan otomatis di browser. */
export function downloadCsv(
  filename: string,
  rows: unknown[][],
  bom = true,
): void {
  let content = rowsToCsv(rows)
  if (bom) {
    // BOM (U+FEFF) agar Excel mengenali UTF-8 (karakter khusus Bahasa Indonesia).
    content = `﻿${content}`
  }
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/** Baca teks file yang dipilih user (lewat input[type=file]). */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(new Error('Gagal membaca file'))
    reader.readAsText(file)
  })
}

interface ParseCsvOptions {
  /** Kolom header baris pertama (default: baris pertama dianggap header). */
  headers?: string[]
  /** Pemisah kolom (default: koma). */
  delimiter?: string
}

export interface ParsedCsv {
  headers: string[]
  rows: Record<string, string>[]
}

/**
 * Parse string CSV menjadi array of objects, dengan dukungan:
 * - Nilai yang dibungkus tanda kutip ganda (koma di dalam tanda kutip aman)
 * - Tanda kutip ganda ganda ("") sebagai escape
 * - Baris baru di dalam tanda kutip
 */
export function parseCsv(text: string, options: ParseCsvOptions = {}): ParsedCsv {
  const delimiter = options.delimiter ?? ','
  const rows: string[][] = []
  let field = ''
  let row: string[] = []
  let inQuotes = false
  let i = 0

  const textLength = text.length

  // Buang BOM bila ada
  if (text.charCodeAt(0) === 0xfeff) {
    i = 1
  }

  const pushField = () => {
    row.push(field)
    field = ''
  }

  const pushRow = () => {
    pushField()
    rows.push(row)
    row = []
  }

  while (i < textLength) {
    const char = text[i]
    const next = text[i + 1]

    if (inQuotes) {
      if (char === '"') {
        if (next === '"') {
          // Tanda kutip ganda = tanda kutip literal
          field += '"'
          i += 2
          continue
        }
        inQuotes = false
        i++
        continue
      }
      field += char
      i++
      continue
    }

    if (char === '"' && field.length === 0) {
      inQuotes = true
      i++
      continue
    }

    if (char === delimiter) {
      pushField()
      i++
      continue
    }

    if (char === '\n' || char === '\r') {
      // Tangani CRLF dan CR
      if (char === '\r' && next === '\n') {
        i++
      }
      pushRow()
      i++
      continue
    }

    field += char
    i++
  }

  // Baris terakhir tanpa newline
  if (field.length > 0 || row.length > 0) {
    pushRow()
  }

  if (rows.length === 0) return { headers: [], rows: [] }

  const headers = options.headers ?? rows[0]
  const dataRows = options.headers ? rows : rows.slice(1)

  // Header dinormalisasi ke lowercase (trim) agar konsisten dengan key record.
  // Dengan ini, pemakai bisa mengakses nilai via row[header] di mana header
  // berasal dari parsed.headers.
  const normalizedHeaders = headers.map((h) => h.trim().toLowerCase())

  const records = dataRows
    .filter((r) => r.some((cell) => cell.trim() !== ''))
    .map((r) => {
      const record: Record<string, string> = {}
      normalizedHeaders.forEach((header, index) => {
        record[header] = (r[index] ?? '').trim()
      })
      return record
    })

  return { headers: normalizedHeaders, rows: records }
}

/**
 * Ubah string angka (format Indonesia atau internasional) menjadi number.
 * Mendukung "1.000,50", "1000,50", "1000.50", "10.5", dan "-500".
 */
export function parseNumeric(value: string): number {
  const raw = String(value).trim().replace(/[^\d.,-]/g, '')
  if (!raw) return 0

  const isNegative = raw.startsWith('-')
  const digits = raw.replace(/-/g, '')

  const lastComma = digits.lastIndexOf(',')
  const lastDot = digits.lastIndexOf('.')

  // Jika ada koma dan titik, asumsikan format Indonesia (titik = ribuan, koma = desimal)
  if (lastComma > -1 && lastDot > -1) {
    const normalized = digits.replace(/\./g, '').replace(',', '.')
    const num = Number(normalized)
    return (isNegative ? -num : num) || 0
  }

  // Jika hanya ada koma, asumsikan koma = pemisah desimal
  if (lastComma > -1 && lastDot === -1) {
    const num = Number(digits.replace(',', '.'))
    return (isNegative ? -num : num) || 0
  }

  // Jika hanya ada titik: titik terakhir dianggap desimal, sisanya ribuan
  if (lastDot > -1) {
    const integerPart = digits.slice(0, lastDot).replace(/\./g, '')
    const decimalPart = digits.slice(lastDot + 1)
    const num = Number(`${integerPart}.${decimalPart}`)
    return (isNegative ? -num : num) || 0
  }

  // Tanpa desimal
  const num = Number(digits)
  return (isNegative ? -num : num) || 0
}
