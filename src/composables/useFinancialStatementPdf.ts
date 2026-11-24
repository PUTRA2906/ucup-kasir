import jsPDF from 'jspdf'
import { Share } from '@capacitor/share'
import { Capacitor } from '@capacitor/core'
import { useToast } from '@/composables/useToast'
import type { FinancialStatements, StatementAccountRow } from '@/types/database'

// ============================================================
// Export PDF Laporan Keuangan Lengkap
// (Laba Rugi, Perubahan Ekuitas, Posisi Keuangan)
//
// Mengikuti pola usePayrollSlipPdf.ts:
//   jsPDF → Blob → native: Filesystem.Cache → Share.share
//                  → web: Web Share API / unduh
// ============================================================

export interface FinancialStatementPdfMeta {
  storeName: string
  storeAddress?: string
  storePhone?: string
  periodStart: string
  periodEnd: string
}

const formatCurrency = (v: number): string =>
  'Rp ' + Math.round(Math.abs(v || 0)).toLocaleString('id-ID')

const formatSigned = (v: number): string => (v < 0 ? '−' : '') + formatCurrency(v)

const formatDate = (d: string): string => {
  if (!d) return '-'
  const date = new Date(d + 'T00:00:00')
  if (isNaN(date.getTime())) return d
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function useFinancialStatementPdf() {
  const toast = useToast()

  const generatePdf = (
    statements: FinancialStatements,
    meta: FinancialStatementPdfMeta
  ): jsPDF => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const margin = 14
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const contentWidth = pageWidth - 2 * margin
    const valueX = pageWidth - margin
    let y = margin

    /** Pastikan ruang; tambah halaman bila perlu. */
    const ensure = (needed: number) => {
      if (y + needed > pageHeight - margin) {
        doc.addPage()
        y = margin
      }
    }

    const sectionTitle = (title: string) => {
      ensure(10)
      y += 3
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10.5)
      doc.setTextColor(30, 41, 59)
      doc.text(title, margin, y)
      y += 1.6
      doc.setDrawColor(203, 213, 225)
      doc.setLineWidth(0.25)
      doc.line(margin, y, pageWidth - margin, y)
      y += 4.5
    }

    const line = (
      label: string,
      value: number,
      opts: { bold?: boolean; indent?: number; signed?: boolean } = {}
    ) => {
      ensure(6)
      doc.setFont('helvetica', opts.bold ? 'bold' : 'normal')
      doc.setFontSize(opts.bold ? 9.2 : 8.8)
      doc.setTextColor(51, 65, 85)
      const indent = opts.indent ?? 0
      const labelLines = doc.splitTextToSize(label, contentWidth - 34 - indent)
      doc.text(labelLines, margin + indent, y)
      doc.text(opts.signed === false ? formatCurrency(value) : formatSigned(value), valueX, y, {
        align: 'right',
      })
      y += Math.max(labelLines.length * 3.8, 4.6)
    }

    const accountRows = (rows: StatementAccountRow[], indent = 4) => {
      if (rows.length === 0) {
        line('— tidak ada —', 0, { indent, signed: false })
        return
      }
      for (const row of rows) {
        line(`${row.account_code}  ${row.account_name}`, row.amount, { indent })
      }
    }

    const totalRow = (label: string, value: number) => {
      ensure(7)
      doc.setDrawColor(148, 163, 184)
      doc.setLineWidth(0.3)
      doc.line(margin, y - 1.2, pageWidth - margin, y - 1.2)
      line(label, value, { bold: true })
    }

    // ---------------- KOP ----------------
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.setTextColor(15, 23, 42)
    doc.text(meta.storeName || 'Ucup Kasir', pageWidth / 2, y, { align: 'center' })
    y += 5

    if (meta.storeAddress) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(100, 116, 139)
      const addr = doc.splitTextToSize(meta.storeAddress, contentWidth)
      doc.text(addr, pageWidth / 2, y, { align: 'center' })
      y += addr.length * 3.5
    }
    if (meta.storePhone) {
      doc.setFontSize(8)
      doc.text(`Telp: ${meta.storePhone}`, pageWidth / 2, y, { align: 'center' })
      y += 4
    }

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(15, 23, 42)
    doc.text('LAPORAN KEUANGAN', pageWidth / 2, y, { align: 'center' })
    y += 4.5
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(71, 85, 105)
    doc.text(
      `Periode ${formatDate(meta.periodStart)} – ${formatDate(meta.periodEnd)}`,
      pageWidth / 2,
      y,
      { align: 'center' }
    )
    y += 3
    doc.setLineWidth(0.6)
    doc.setDrawColor(15, 23, 42)
    doc.line(margin, y, pageWidth - margin, y)

    // ---------------- 1. LABA RUGI ----------------
    const inc = statements.income_statement
    sectionTitle('1. LAPORAN LABA RUGI')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.8)
    doc.setTextColor(51, 65, 85)
    doc.text('PENDAPATAN', margin, y)
    y += 4
    accountRows(inc.revenue)
    totalRow('Total Pendapatan', inc.total_revenue)

    y += 2
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.8)
    doc.text('HARGA POKOK PENJUALAN', margin, y)
    y += 4
    accountRows(inc.cogs)
    totalRow('Total HPP', inc.total_cogs)
    totalRow('Laba Kotor', inc.gross_profit)

    y += 2
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.8)
    doc.text('BEBAN OPERASIONAL', margin, y)
    y += 4
    accountRows(inc.operating_expenses)
    totalRow('Total Beban Operasional', inc.total_operating_expenses)

    y += 1
    totalRow('LABA BERSIH', inc.net_profit)

    // ---------------- 2. PERUBAHAN EKUITAS ----------------
    const eq = statements.equity_statement
    sectionTitle('2. LAPORAN PERUBAHAN EKUITAS')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.8)
    doc.setTextColor(51, 65, 85)
    doc.text('EKUITAS AWAL PERIODE', margin, y)
    y += 4
    accountRows(eq.opening_equity_accounts)
    if (eq.opening_unclosed_profit !== 0) {
      line('Laba belum ditutup', eq.opening_unclosed_profit, { indent: 4 })
    }
    totalRow('Total Ekuitas Awal', eq.opening_total)

    y += 2
    line('Laba bersih periode berjalan', eq.net_profit, { signed: true })
    if (eq.contributions.length > 0) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8.8)
      doc.text('Setoran modal / penambahan', margin + 4, y)
      y += 4
      accountRows(eq.contributions, 6)
      line('Total setoran modal', eq.total_contributions, { bold: true })
    }
    if (eq.withdrawals.length > 0) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8.8)
      doc.text('Prive / penarikan modal', margin + 4, y)
      y += 4
      for (const row of eq.withdrawals) {
        line(`${row.account_code}  ${row.account_name}`, -row.amount, { indent: 6 })
      }
      line('Total prive', -eq.total_withdrawals, { bold: true })
    }
    totalRow('EKUITAS AKHIR', eq.ending_total)

    // ---------------- 3. POSISI KEUANGAN ----------------
    const pos = statements.position_statement
    sectionTitle('3. LAPORAN POSISI KEUANGAN (NERACA)')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(100, 116, 139)
    doc.text(`Per ${formatDate(pos.as_of)}`, margin, y)
    y += 4.5

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.8)
    doc.setTextColor(51, 65, 85)
    doc.text('ASET', margin, y)
    y += 4
    accountRows(pos.assets)
    totalRow('Total Aset', pos.total_assets)

    y += 2
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.8)
    doc.text('LIABILITAS', margin, y)
    y += 4
    accountRows(pos.liabilities)
    totalRow('Total Liabilitas', pos.total_liabilities)

    y += 2
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.8)
    doc.text('EKUITAS', margin, y)
    y += 4
    accountRows(pos.equity_accounts)
    if (pos.unclosed_profit !== 0) {
      line('Laba belum ditutup', pos.unclosed_profit, { indent: 4 })
    }
    totalRow('Total Ekuitas', pos.total_equity)

    y += 1
    totalRow('TOTAL LIABILITAS + EKUITAS', pos.total_liabilities_equity)

    if (!pos.is_balanced) {
      ensure(8)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.setTextColor(180, 83, 9)
      doc.text(
        `Catatan: neraca tidak seimbang, selisih ${formatCurrency(pos.difference)}`,
        margin,
        y
      )
      y += 4
    }

    // ---------------- FOOTER ----------------
    const totalPages = doc.getNumberOfPages()
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7.5)
      doc.setTextColor(148, 163, 184)
      doc.text(
        `Dicetak ${new Date().toLocaleString('id-ID')}`,
        margin,
        pageHeight - 8
      )
      doc.text(`Halaman ${i} dari ${totalPages}`, pageWidth - margin, pageHeight - 8, {
        align: 'right',
      })
    }

    return doc
  }

  const generatePdfBlob = (
    statements: FinancialStatements,
    meta: FinancialStatementPdfMeta
  ): Blob => generatePdf(statements, meta).output('blob')

  /** Share PDF — Android: share sheet, Web: Web Share API / unduh. */
  const sharePdf = async (pdfBlob: Blob, filename: string) => {
    if (Capacitor.isNativePlatform()) {
      const base64Data = await blobToBase64(pdfBlob)
      const { Filesystem, Directory } = await import('@capacitor/filesystem')
      const savedFile = await Filesystem.writeFile({
        path: filename,
        data: base64Data,
        directory: Directory.Cache,
      })
      await Share.share({
        title: 'Laporan Keuangan',
        text: 'Laporan Keuangan',
        url: savedFile.uri,
        dialogTitle: 'Bagikan Laporan Keuangan',
      })
      return
    }

    if (navigator.share && navigator.canShare) {
      const file = new File([pdfBlob], filename, { type: 'application/pdf' })
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Laporan Keuangan',
          text: 'Berikut laporan keuangan Anda',
        })
        return
      }
    }

    const url = URL.createObjectURL(pdfBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
    toast.info('Info', 'PDF berhasil diunduh.')
  }

  return { generatePdf, generatePdfBlob, sharePdf }
}

const blobToBase64 = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve((reader.result as string).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
