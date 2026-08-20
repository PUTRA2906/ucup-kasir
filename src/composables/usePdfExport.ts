import html2pdf from 'html2pdf.js'
import { Share } from '@capacitor/share'
import { Capacitor } from '@capacitor/core'

export function usePdfExport() {
  const generatePdf = async (element: HTMLElement, filename: string): Promise<Blob> => {
    const options = {
      margin: 10,
      filename: filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    }

    return await html2pdf().set(options).from(element).outputPdf('blob')
  }

  const shareToWhatsApp = async (phoneNumber: string, pdfBlob: Blob, filename: string) => {
    if (!Capacitor.isNativePlatform()) {
      throw new Error('Fitur ini hanya tersedia di aplikasi mobile')
    }

    try {
      // Convert Blob to base64
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

      // Save to temporary file using Capacitor Filesystem
      const { Filesystem, Directory } = await import('@capacitor/filesystem')

      const savedFile = await Filesystem.writeFile({
        path: filename,
        data: base64Data,
        directory: Directory.Cache
      })

      // Format nomor WhatsApp (hapus karakter non-digit, tambahkan 62 jika perlu)
      let formattedPhone = phoneNumber.replace(/\D/g, '')
      if (formattedPhone.startsWith('0')) {
        formattedPhone = '62' + formattedPhone.substring(1)
      } else if (!formattedPhone.startsWith('62')) {
        formattedPhone = '62' + formattedPhone
      }

      // Share via WhatsApp
      await Share.share({
        title: 'Invoice',
        text: `Invoice ${filename}`,
        url: savedFile.uri,
        dialogTitle: 'Kirim Invoice via WhatsApp'
      })

      // Buka WhatsApp dengan nomor yang sudah diformat
      const whatsappUrl = `https://wa.me/${formattedPhone}`
      window.open(whatsappUrl, '_system')

    } catch (error) {
      console.error('Error sharing to WhatsApp:', error)
      throw error
    }
  }

  const downloadPdf = async (pdfBlob: Blob, filename: string) => {
    if (Capacitor.isNativePlatform()) {
      // Di mobile, gunakan Filesystem API
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
        directory: Directory.Documents
      })
    } else {
      // Di web, gunakan download biasa
      const url = URL.createObjectURL(pdfBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      link.click()
      URL.revokeObjectURL(url)
    }
  }

  return {
    generatePdf,
    shareToWhatsApp,
    downloadPdf
  }
}
