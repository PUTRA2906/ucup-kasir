import jsPDF from 'jspdf'
import { useToast } from '@/composables/useToast'
import { Share } from '@capacitor/share'
import { Capacitor } from '@capacitor/core'

interface InvoiceData {
  transaction_number: string
  created_at: string
  customer_name: string
  customer_store_name?: string
  customer_address?: string
  items: Array<{
    product_name: string
    price: number
    quantity: number
    subtotal: number
  }>
  return_items?: Array<{
    product_name: string
    price: number
    quantity: number
    subtotal: number
  }>
  subtotal: number
  discount: number
  shipping_cost: number
  return_amount: number
  total: number
  payments: Array<{
    payment_method: string
    amount: number
    created_at: string
  }>
  payment_status: string
  updated_at: string
}

interface StoreSettings {
  name: string
  description?: string
  address: string
  email: string
  phone: string
}

export function usePdfExport() {
  const toast = useToast()
  const formatPrice = (value: number): string => {
    return 'Rp ' + (value || 0).toLocaleString('id-ID')
  }

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    const day = date.getDate().toString().padStart(2, '0')
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const year = date.getFullYear()
    return `${day}/${month}/${year}`
  }

  const formatPaymentMethod = (method: string): string => {
    const methods: Record<string, string> = {
      tunai: 'Tunai',
      transfer: 'Transfer',
      qris: 'QRIS',
    }
    return methods[method] || method
  }

  const generateInvoicePdf = (
    invoice: InvoiceData,
    storeSettings: StoreSettings
  ): jsPDF => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a5',
    })

    // Margins
    const margin = 15
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const contentWidth = pageWidth - 2 * margin
    const maxY = pageHeight - margin // batas aman bawah
    let yPos = margin

    // Pindah ke halaman baru jika ruang tersisa tidak cukup
    const ensureSpace = (needed: number) => {
      if (yPos + needed > maxY) {
        doc.addPage()
        yPos = margin
      }
    }

    // Header
    ensureSpace(20)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('INVOICE:', margin, yPos)
    yPos += 5
    doc.text(invoice.transaction_number, margin, yPos)
    yPos += 10

    // Store Info
    doc.setFontSize(16)
    doc.setTextColor(13, 134, 255) // Brand blue
    doc.text(storeSettings.name, margin, yPos)
    yPos += 7

    // Deskripsi toko di bawah nama toko
    if (storeSettings.description) {
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(80, 80, 80)
      doc.text(storeSettings.description, margin, yPos)
      yPos += 5
    }

    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(0, 0, 0)
    doc.text(storeSettings.address, margin, yPos)
    yPos += 5
    doc.text(`Email: ${storeSettings.email}`, margin, yPos)
    yPos += 5
    doc.text(`Phone: ${storeSettings.phone}`, margin, yPos)
    yPos += 10

    // Customer Info (right aligned)
    const rightX = pageWidth - margin
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.text('DITERBITKAN ATAS NAMA:', rightX, yPos - 25, { align: 'right' })
    
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    yPos -= 18
    doc.text(`Tanggal: ${formatDate(invoice.created_at)}`, rightX, yPos, { align: 'right' })
    yPos += 5
    doc.text(`Toko: ${invoice.customer_store_name || '-'}`, rightX, yPos, { align: 'right' })
    yPos += 5
    doc.text(`Pembeli: ${invoice.customer_name || 'Umum'}`, rightX, yPos, { align: 'right' })
    yPos += 5
    doc.text(`Alamat: ${invoice.customer_address || '-'}`, rightX, yPos, { align: 'right' })
    yPos += 15

    // Products Table Header
    ensureSpace(20)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.text('PRODUK DIBELI', margin, yPos)
    yPos += 5

    // Table Header
    doc.setFillColor(0, 0, 0)
    doc.rect(margin, yPos, contentWidth, 7, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(8)
    
    const col1 = margin + 2
    const col2 = margin + contentWidth * 0.5
    const col3 = margin + contentWidth * 0.7
    const col4 = margin + contentWidth * 0.85
    
    doc.text('PRODUK', col1, yPos + 5)
    doc.text('HARGA', col2, yPos + 5)
    doc.text('QTY', col3, yPos + 5)
    doc.text('TOTAL', col4, yPos + 5)
    yPos += 7

    // Table Content
    doc.setTextColor(0, 0, 0)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)

    invoice.items.forEach((item) => {
      if (yPos > maxY) { // New page if needed
        doc.addPage()
        yPos = margin
      }
      
      doc.text(item.product_name, col1, yPos + 4)
      doc.text(formatPrice(item.price), col2, yPos + 4)
      doc.text(item.quantity.toString(), col3, yPos + 4)
      doc.text(formatPrice(item.subtotal), col4, yPos + 4)
      yPos += 7
      
      // Line separator
      doc.setDrawColor(200, 200, 200)
      doc.line(margin, yPos, pageWidth - margin, yPos)
    })

    yPos += 5

    // Return Items (if any)
    if (invoice.return_items && invoice.return_items.length > 0) {
      ensureSpace(20)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(220, 38, 38) // Red
      doc.text('PRODUK DIRETUR', margin, yPos)
      yPos += 5

      doc.setFillColor(220, 38, 38)
      doc.rect(margin, yPos, contentWidth, 7, 'F')
      doc.setTextColor(255, 255, 255)
      
      doc.text('PRODUK', col1, yPos + 5)
      doc.text('HARGA', col2, yPos + 5)
      doc.text('QTY', col3, yPos + 5)
      doc.text('RETUR', col4, yPos + 5)
      yPos += 7

      doc.setTextColor(220, 38, 38)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)

      invoice.return_items.forEach((item) => {
        if (yPos > maxY) {
          doc.addPage()
          yPos = margin
        }
        
        doc.text(item.product_name, col1, yPos + 4)
        doc.text(formatPrice(item.price), col2, yPos + 4)
        doc.text(item.quantity.toString(), col3, yPos + 4)
        doc.text(`- ${formatPrice(item.subtotal)}`, col4, yPos + 4)
        yPos += 7
        
        doc.setDrawColor(252, 165, 165)
        doc.line(margin, yPos, pageWidth - margin, yPos)
      })

      yPos += 5
    }

    // Summary
    ensureSpace(40)
    doc.setTextColor(0, 0, 0)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    
    const summaryX = pageWidth - margin - 60
    const labelX = summaryX
    const valueX = pageWidth - margin

    doc.line(summaryX, yPos, valueX, yPos)
    yPos += 5
    
    doc.text('TOTAL PEMBELIAN', labelX, yPos)
    doc.text(formatPrice(invoice.subtotal), valueX, yPos, { align: 'right' })
    yPos += 7

    if (invoice.return_amount > 0) {
      doc.setTextColor(220, 38, 38)
      doc.text('TOTAL RETUR', labelX, yPos)
      doc.text(`- ${formatPrice(invoice.return_amount)}`, valueX, yPos, { align: 'right' })
      yPos += 7
      doc.setTextColor(0, 0, 0)
    }

    if (invoice.discount > 0) {
      doc.text('Diskon', labelX, yPos)
      doc.text(`- ${formatPrice(invoice.discount)}`, valueX, yPos, { align: 'right' })
      yPos += 7
    }

    if (invoice.shipping_cost > 0) {
      doc.text('Pengiriman', labelX, yPos)
      doc.text(`+ ${formatPrice(invoice.shipping_cost)}`, valueX, yPos, { align: 'right' })
      yPos += 7
    }

    doc.setFont('helvetica', 'bold')
    doc.line(summaryX, yPos, valueX, yPos)
    yPos += 5
    doc.text('TOTAL TAGIHAN', labelX, yPos)
    doc.text(formatPrice(invoice.total), valueX, yPos, { align: 'right' })
    yPos += 10

    // Payment History
    ensureSpace(25)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.text('RIWAYAT PEMBAYARAN', labelX, yPos)
    yPos += 5

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)

    // Pastikan payments adalah array
    const payments = Array.isArray(invoice.payments) ? invoice.payments : []

    if (payments.length === 0) {
      doc.text('Belum ada pembayaran', labelX, yPos)
      yPos += 7
    } else {
      payments.forEach((payment, idx) => {
        ensureSpace(15)
        const label = `Pembayaran ${idx + 1}`
        doc.text(label, labelX, yPos)
        doc.text(`- ${formatPrice(payment.amount)}`, valueX, yPos, { align: 'right' })
        yPos += 5
        doc.setFontSize(7)
        doc.setTextColor(100, 100, 100)
        doc.text(formatDate(payment.created_at), labelX, yPos)
        yPos += 6
        doc.setFontSize(9)
        doc.setTextColor(0, 0, 0)
      })
    }

    const totalPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0)
    const remaining = invoice.total - totalPaid

    yPos += 3
    doc.setFont('helvetica', 'bold')
    doc.line(summaryX, yPos, valueX, yPos)
    yPos += 5
    doc.setTextColor(220, 38, 38) // Merah
    doc.text('SISA TAGIHAN', labelX, yPos)
    doc.text(formatPrice(Math.max(remaining, 0)), valueX, yPos, { align: 'right' })
    doc.setTextColor(0, 0, 0)
    yPos += 7

    doc.text('STATUS', labelX, yPos)
    const status = invoice.payment_status === 'lunas' || remaining <= 0 ? 'LUNAS' : 'BELUM LUNAS'
    doc.text(status, valueX, yPos, { align: 'right' })
    yPos += 10

    // Footer
    ensureSpace(15)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(100, 100, 100)
    doc.text('Invoice ini sah dan diproses oleh komputer', margin, yPos)
    yPos += 4
    doc.text(`Silakan hubungi ${storeSettings.name} apabila membutuhkan bantuan`, margin, yPos)
    doc.text(`Update: ${formatDate(invoice.updated_at)}`, valueX, yPos, { align: 'right' })

    return doc
  }

  const generatePdfBlob = (invoice: InvoiceData, storeSettings: StoreSettings): Blob => {
    const doc = generateInvoicePdf(invoice, storeSettings)
    return doc.output('blob')
  }

  const shareToWhatsApp = async (
    pdfBlob: Blob,
    filename: string
  ) => {
    // Jika di platform native (Android/iOS)
    if (Capacitor.isNativePlatform()) {
      try {
        const reader = new FileReader()
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onloadend = () => {
            const base64 = (reader.result as string).split(',')[1]
            resolve(base64)
          }
          reader.onerror = reject
        })
        reader.readAsDataURL(pdfBlob)

        const base64Data = await base64Promise

        const { Filesystem, Directory } = await import('@capacitor/filesystem')

        const savedFile = await Filesystem.writeFile({
          path: filename,
          data: base64Data,
          directory: Directory.Cache,
        })

        await Share.share({
          title: 'Invoice',
          text: 'Invoice',
          url: savedFile.uri,
          dialogTitle: 'Kirim Invoice',
        })
      } catch (error) {
        console.error('Error sharing invoice:', error)
        throw error
      }
    } else {
      // Jika di web browser (termasuk WhatsApp Web)
      try {
        // Cek apakah browser support Web Share API dengan file
        if (navigator.share && navigator.canShare) {
          const file = new File([pdfBlob], filename, { type: 'application/pdf' })

          // Cek apakah bisa share file
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: 'Invoice',
              text: 'Berikut invoice Anda'
            })
            return
          }
        }

        // Fallback: download PDF jika Web Share API tidak tersedia
        const url = URL.createObjectURL(pdfBlob)
        const link = document.createElement('a')
        link.href = url
        link.download = filename
        link.click()
        URL.revokeObjectURL(url)

        // Tampilkan pesan untuk manual share
        toast.info('Info', 'PDF berhasil diunduh. Silakan buka WhatsApp dan kirim file yang sudah diunduh.')
      } catch (error) {
        console.error('Error sharing invoice on web:', error)
        throw error
      }
    }
  }

  const downloadPdf = async (pdfBlob: Blob, filename: string) => {
    if (Capacitor.isNativePlatform()) {
      const { Filesystem, Directory } = await import('@capacitor/filesystem')

      const reader = new FileReader()
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1]
          resolve(base64)
        }
        reader.onerror = reject
      })
      reader.readAsDataURL(pdfBlob)

      const base64Data = await base64Promise

      await Filesystem.writeFile({
        path: filename,
        data: base64Data,
        directory: Directory.Documents,
      })
    } else {
      const url = URL.createObjectURL(pdfBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      link.click()
      URL.revokeObjectURL(url)
    }
  }

  return {
    generatePdfBlob,
    shareToWhatsApp,
    downloadPdf,
  }
}
