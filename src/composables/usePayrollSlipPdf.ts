import jsPDF from 'jspdf'
import { Share } from '@capacitor/share'
import { Capacitor } from '@capacitor/core'
import { useToast } from '@/composables/useToast'

// ============================================================
// Export PDF Slip Gaji + share (WhatsApp / share sheet)
// Mengikuti pola useDeliveryOrderPdf.ts: jsPDF → Blob →
// native: Filesystem.Cache → Share.share | web: Web Share API.
// ============================================================

export interface PayrollSlipPdfData {
  storeName: string
  storeAddress: string
  storePhone: string
  periodCode: string
  periodStart: string
  periodEnd: string
  employeeName: string
  employeeCode: string
  position: string
  status: 'draft' | 'paid'
  paidAt?: string
  notes?: string
  baseSalary: number
  incentive: number
  incentiveDetails?: Array<{
    type: 'loader' | 'driver'
    date: string
    do_number: string
    description: string
    quantity?: number
    unit_price?: number
    amount: number
  }>
  kasbonDeduction: number
  totalNet: number
}

const formatCurrency = (v: number): string =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v || 0)

const formatDate = (d: string): string => {
  if (!d) return '-'
  const date = new Date(d)
  if (isNaN(date.getTime())) return d
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

/** Angka → terbilang Bahasa Indonesia (untuk kotak "Terbilang" di slip gaji). */
export const terbilang = (n: number): string => {
  n = Math.floor(Math.abs(n))
  const huruf = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas']
  if (n < 12) return huruf[n]
  if (n < 20) return `${terbilang(n - 10)} belas`
  if (n < 100) return `${terbilang(Math.floor(n / 10))} puluh${n % 10 ? ' ' + terbilang(n % 10) : ''}`
  if (n < 200) return `seratus${n % 100 ? ' ' + terbilang(n % 100) : ''}`
  if (n < 1000) return `${terbilang(Math.floor(n / 100))} ratus${n % 100 ? ' ' + terbilang(n % 100) : ''}`
  if (n < 2000) return `seribu${n % 1000 ? ' ' + terbilang(n % 1000) : ''}`
  if (n < 1e6) return `${terbilang(Math.floor(n / 1000))} ribu${n % 1000 ? ' ' + terbilang(n % 1000) : ''}`
  if (n < 1e9) return `${terbilang(Math.floor(n / 1e6))} juta${n % 1e6 ? ' ' + terbilang(n % 1e6) : ''}`
  return `${terbilang(Math.floor(n / 1e9))} miliar${n % 1e9 ? ' ' + terbilang(n % 1e9) : ''}`
}

export function usePayrollSlipPdf() {
  const toast = useToast()

  const generatePdf = (data: PayrollSlipPdfData): jsPDF => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

    const margin = 15
    const pageWidth = doc.internal.pageSize.getWidth()
    const contentWidth = pageWidth - 2 * margin
    const colAmount = pageWidth - margin - 4
    let yPos = margin

    // ---- Kop ----
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text('SLIP GAJI', pageWidth / 2, yPos, { align: 'center' })
    yPos += 7
    doc.setFontSize(16)
    doc.setTextColor(13, 134, 255)
    doc.text(data.storeName, pageWidth / 2, yPos, { align: 'center' })
    yPos += 6
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(0, 0, 0)
    if (data.storeAddress) {
      doc.text(data.storeAddress, pageWidth / 2, yPos, { align: 'center' })
      yPos += 5
    }
    if (data.storePhone) {
      doc.text(`Phone: ${data.storePhone}`, pageWidth / 2, yPos, { align: 'center' })
      yPos += 5
    }
    yPos += 2

    // Garis pemisah ganda
    doc.setLineWidth(0.6)
    doc.line(margin, yPos, pageWidth - margin, yPos)
    doc.setLineWidth(0.2)
    doc.line(margin, yPos + 1.3, pageWidth - margin, yPos + 1.3)
    yPos += 7

    // ---- Info karyawan ----
    const half = margin + contentWidth / 2
    const infoRow = (l1: string, v1: string, l2: string, v2: string) => {
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.text(`${l1}:`, margin, yPos)
      doc.text(`${l2}:`, half, yPos)
      doc.setFont('helvetica', 'normal')
      doc.text(v1, margin + 32, yPos)
      doc.text(v2, half + 26, yPos)
      yPos += 6
    }
    infoRow('No. Slip', data.periodCode || '-', 'Periode', `${formatDate(data.periodStart)} - ${formatDate(data.periodEnd)}`)
    infoRow('Nama', data.employeeName || '-', 'Jabatan', data.position || '-')
    infoRow('Kode Karyawan', data.employeeCode || '-', 'Status', data.status === 'paid' ? 'DIBAYAR' : 'DRAFT (BELUM DIBAYAR)')
    if (data.status === 'paid' && data.paidAt) {
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.text('Tanggal Bayar:', margin, yPos)
      doc.setFont('helvetica', 'normal')
      doc.text(formatDate(data.paidAt), margin + 32, yPos)
      yPos += 6
    }
    yPos += 3

    // ---- Rincian penghasilan & potongan ----
    const sectionHeader = (title: string) => {
      doc.setFillColor(0, 0, 0)
      doc.rect(margin, yPos, contentWidth, 7, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.text(title, margin + 4, yPos + 5)
      yPos += 7
      doc.setTextColor(0, 0, 0)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
    }

    const row = (label: string, amount: string, bold = false) => {
      doc.setFont('helvetica', bold ? 'bold' : 'normal')
      doc.text(label, margin + 4, yPos + 5)
      doc.text(amount, colAmount, yPos + 5, { align: 'right' })
      yPos += 8
      doc.setDrawColor(170, 170, 170)
      doc.setLineWidth(0.1)
      doc.line(margin, yPos - 2.5, pageWidth - margin, yPos - 2.5)
    }

    sectionHeader('PEMASUKAN')
    row('Gaji Pokok', formatCurrency(data.baseSalary))
    
    // Detail breakdown insentif
    if (data.incentiveDetails && data.incentiveDetails.length > 0) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.setFillColor(245, 245, 245)
      doc.rect(margin, yPos, contentWidth, 5, 'F')
      doc.text('Detail Insentif:', margin + 4, yPos + 3.5)
      yPos += 5
      
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      for (const detail of data.incentiveDetails) {
        // Header: Tanggal dan DO Number
        doc.setFont('helvetica', 'bold')
        doc.text(`${formatDate(detail.date)} - ${detail.do_number}`, margin + 8, yPos + 4)
        yPos += 4
        
        // Deskripsi
        doc.setFont('helvetica', 'normal')
        const descLines = doc.splitTextToSize(detail.description, contentWidth - 60)
        doc.text(descLines, margin + 8, yPos + 3)
        const descHeight = descLines.length * 3
        
        // Amount di kanan
        doc.text(formatCurrency(detail.amount), colAmount, yPos + 3, { align: 'right' })
        
        yPos += descHeight + 4
        doc.setDrawColor(220, 220, 220)
        doc.setLineWidth(0.05)
        doc.line(margin + 4, yPos - 1, pageWidth - margin, yPos - 1)
      }
      yPos += 2
    }
    
    row('Total Insentif', formatCurrency(data.incentive), true)
    row('Total Pemasukan', formatCurrency((data.baseSalary || 0) + (data.incentive || 0)), true)
    yPos += 4

    sectionHeader('POTONGAN')
    row('Potongan Kasbon', `(${formatCurrency(data.kasbonDeduction)})`)
    row('Total Potongan', `(${formatCurrency(data.kasbonDeduction)})`, true)
    yPos += 4

    // ---- Kotak Take Home Pay ----
    doc.setDrawColor(0, 0, 0)
    doc.setLineWidth(0.5)
    doc.rect(margin, yPos, contentWidth, 12)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text('GAJI BERSIH (TAKE HOME PAY)', margin + 4, yPos + 7.5)
    doc.setFontSize(12)
    doc.setTextColor(13, 134, 255)
    doc.text(formatCurrency(data.totalNet), colAmount, yPos + 7.5, { align: 'right' })
    doc.setTextColor(0, 0, 0)
    yPos += 12

    // ---- Terbilang ----
    doc.setDrawColor(0, 0, 0)
    doc.setLineWidth(0.3)
    doc.rect(margin, yPos, contentWidth, 10)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.text('Terbilang:', margin + 4, yPos + 6.5)
    doc.setFont('helvetica', 'italic')
    doc.text(`${terbilang(data.totalNet)} rupiah`, margin + 27, yPos + 6.5)
    yPos += 10 + 6

    // ---- Catatan ----
    if (data.notes) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.text('Catatan:', margin, yPos)
      doc.setFont('helvetica', 'normal')
      const lines = doc.splitTextToSize(data.notes, contentWidth - 20)
      doc.text(lines, margin + 20, yPos)
      yPos += lines.length * 4 + 3
    }

    // ---- Tanda tangan ----
    yPos = Math.max(yPos + 6, doc.internal.pageSize.getHeight() - 55)
    const colLeft = margin + contentWidth * 0.25
    const colRight = margin + contentWidth * 0.75
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.text('Karyawan,', colLeft, yPos, { align: 'center' })
    doc.text('HRD / Manajemen,', colRight, yPos, { align: 'center' })
    doc.text(formatDate(new Date().toISOString()), colRight, yPos + 5, { align: 'center' })
    yPos += 27
    doc.setDrawColor(120, 120, 120)
    doc.setLineWidth(0.3)
    doc.line(colLeft - 30, yPos, colLeft + 30, yPos)
    doc.line(colRight - 30, yPos, colRight + 30, yPos)
    yPos += 5
    doc.text('( ................................. )', colLeft, yPos, { align: 'center' })
    doc.text('( ................................. )', colRight, yPos, { align: 'center' })

    return doc
  }

  const generatePdfBlob = (data: PayrollSlipPdfData): Blob => {
    return generatePdf(data).output('blob')
  }

  /** Share PDF — Android: share sheet (WhatsApp), Web: Web Share API / unduh. */
  const sharePdf = async (pdfBlob: Blob, filename: string) => {
    if (Capacitor.isNativePlatform()) {
      try {
        const base64Data = await blobToBase64(pdfBlob)
        const { Filesystem, Directory } = await import('@capacitor/filesystem')
        const savedFile = await Filesystem.writeFile({
          path: filename,
          data: base64Data,
          directory: Directory.Cache,
        })
        await Share.share({
          title: 'Slip Gaji',
          text: 'Slip Gaji',
          url: savedFile.uri,
          dialogTitle: 'Kirim Slip Gaji',
        })
      } catch (error) {
        console.error('Error sharing slip gaji:', error)
        throw error
      }
    } else {
      try {
        if (navigator.share && navigator.canShare) {
          const file = new File([pdfBlob], filename, { type: 'application/pdf' })
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: 'Slip Gaji',
              text: 'Berikut slip gaji Anda',
            })
            return
          }
        }
        // Fallback web: unduh lalu beri tahu
        const url = URL.createObjectURL(pdfBlob)
        const link = document.createElement('a')
        link.href = url
        link.download = filename
        link.click()
        URL.revokeObjectURL(url)
        toast.info('Info', 'PDF berhasil diunduh. Silakan kirim lewat WhatsApp secara manual.')
      } catch (error) {
        console.error('Error sharing slip gaji on web:', error)
        throw error
      }
    }
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
