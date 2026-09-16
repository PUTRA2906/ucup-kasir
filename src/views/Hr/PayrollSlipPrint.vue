<template>
  <div class="min-h-screen bg-gray-100 dark:bg-gray-950">
    <!-- Toolbar (hidden saat print) -->
    <div class="sticky top-0 z-10 border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 print:hidden">
      <div class="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 sm:px-6">
        <button
          @click="router.back()"
          class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-white/[0.03]"
        >
          Kembali
        </button>
        <div class="flex items-center gap-2">
          <button
            @click="handleShare"
            :disabled="busy || !payroll"
            class="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-white/[0.03]"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            Bagikan
          </button>
          <button
            @click="handlePrint"
            :disabled="busy || !payroll"
            class="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4H7v4a2 2 0 002 2z" />
            </svg>
            {{ isNative ? 'Cetak (PDF)' : 'Cetak' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading && !payroll" class="flex items-center justify-center py-24">
      <div class="text-center">
        <svg class="mx-auto h-12 w-12 animate-spin text-brand-500" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p class="mt-4 text-sm text-gray-600 dark:text-gray-400">Memuat slip gaji...</p>
      </div>
    </div>

    <!-- Not Found -->
    <div v-else-if="!payroll" class="mx-auto max-w-4xl px-4 py-16 text-center">
      <p class="text-gray-600 dark:text-gray-400">Slip gaji tidak ditemukan</p>
    </div>

    <!-- Dokumen Slip Gaji -->
    <div v-else class="mx-auto max-w-4xl px-4 py-6 sm:py-8">
      <div class="print-area bg-white p-8 font-sans text-gray-900 shadow-xl sm:p-10">
        <!-- Kop -->
        <div class="text-center">
          <p class="text-base font-black uppercase tracking-widest">Slip Gaji</p>
          <p class="mt-2 text-[22px] font-bold leading-none" style="color: #0d86ff">{{ storeName }}</p>
          <p v-if="storeAddress" class="mt-1.5 text-sm text-gray-600">{{ storeAddress }}</p>
          <p v-if="storePhone" class="text-sm text-gray-600">Phone: {{ storePhone }}</p>
        </div>

        <div class="mt-5 border-t-2 border-b-2 border-black"></div>

        <!-- Info karyawan -->
        <div class="mt-4 grid grid-cols-1 gap-x-10 gap-y-1.5 text-sm sm:grid-cols-2">
          <div class="flex items-baseline gap-2">
            <span class="w-28 whitespace-nowrap font-semibold">No. Slip</span>
            <span>:</span>
            <span class="font-semibold">{{ payroll.period_code || '-' }}</span>
          </div>
          <div class="flex items-baseline gap-2">
            <span class="w-24 whitespace-nowrap font-semibold">Periode</span>
            <span>:</span>
            <span class="font-semibold">{{ formatDate(payroll.period_start) }} - {{ formatDate(payroll.period_end) }}</span>
          </div>
          <div class="flex items-baseline gap-2">
            <span class="w-28 whitespace-nowrap font-semibold">Nama</span>
            <span>:</span>
            <span class="font-semibold">{{ employeeName }}</span>
          </div>
          <div class="flex items-baseline gap-2">
            <span class="w-24 whitespace-nowrap font-semibold">Kode</span>
            <span>:</span>
            <span class="font-semibold">{{ employeeCode }}</span>
          </div>
          <div class="flex items-baseline gap-2">
            <span class="w-28 whitespace-nowrap font-semibold">Jabatan</span>
            <span>:</span>
            <span class="font-semibold capitalize">{{ position || '-' }}</span>
          </div>
          <div class="flex items-baseline gap-2">
            <span class="w-24 whitespace-nowrap font-semibold">Status</span>
            <span>:</span>
            <span class="font-semibold">{{ payroll.status === 'paid' ? 'Dibayar' : 'Draft' }}</span>
          </div>
        </div>

        <!-- Rincian -->
        <div class="mt-6 overflow-x-auto">
          <table class="w-full border-collapse text-sm">
            <tbody>
              <tr class="border-t-2 border-b border-black">
                <td colspan="2" class="py-2 text-xs font-bold uppercase tracking-wide">Pemasukan</td>
              </tr>
              <tr class="border-b border-gray-300">
                <td class="py-2 pl-2">Gaji Pokok</td>
                <td class="py-2 pr-4 text-right font-semibold">{{ formatCurrency(payroll.base_salary) }}</td>
              </tr>
              
              <!-- Detail Breakdown Insentif -->
              <tr v-if="payroll.incentive_details && payroll.incentive_details.length > 0" class="border-b border-gray-300 bg-gray-50">
                <td colspan="2" class="py-2 pl-2 text-xs font-semibold text-gray-700">Detail Insentif:</td>
              </tr>
              <template v-if="payroll.incentive_details && payroll.incentive_details.length > 0">
                <tr v-for="(detail, idx) in payroll.incentive_details" :key="idx" class="border-b border-gray-200">
                  <td class="py-1.5 pl-4 text-xs">
                    <div class="font-medium">{{ formatDate(detail.date) }} - {{ detail.do_number }}</div>
                    <div class="text-gray-600">{{ detail.description }}</div>
                  </td>
                  <td class="py-1.5 pr-4 text-right text-xs font-medium">{{ formatCurrency(detail.amount) }}</td>
                </tr>
              </template>
              
              <tr class="border-b border-gray-300">
                <td class="py-2 pl-2 font-semibold">Total Insentif</td>
                <td class="py-2 pr-4 text-right font-semibold">{{ formatCurrency(payroll.incentive_amount) }}</td>
              </tr>
              <tr class="border-b-2 border-black bg-gray-50">
                <td class="py-2 pl-2 font-bold">Total Pemasukan</td>
                <td class="py-2 pr-4 text-right font-bold">{{ formatCurrency(totalIncome) }}</td>
              </tr>
              <tr class="border-b border-black">
                <td colspan="2" class="py-2 text-xs font-bold uppercase tracking-wide">Potongan</td>
              </tr>
              <tr class="border-b border-gray-300">
                <td class="py-2 pl-2">Potongan Kasbon</td>
                <td class="py-2 pr-4 text-right font-semibold text-red-600">({{ formatCurrency(payroll.kasbon_deduction) }})</td>
              </tr>
              <tr class="border-b-2 border-black bg-gray-50">
                <td class="py-2 pl-2 font-bold">Total Potongan</td>
                <td class="py-2 pr-4 text-right font-bold text-red-600">({{ formatCurrency(payroll.kasbon_deduction) }})</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Take Home Pay -->
        <div class="mt-4 border-2 border-black px-4 py-3 flex items-center justify-between">
          <p class="text-sm font-black uppercase tracking-wide">Gaji Bersih (Take Home Pay)</p>
          <p class="text-lg font-black" style="color: #0d86ff">{{ formatCurrency(payroll.total_net) }}</p>
        </div>

        <!-- Terbilang -->
        <div class="mt-3 border border-black px-4 py-2">
          <p class="text-sm">
            <span class="font-bold">Terbilang:</span>
            <span class="italic"> {{ terbilang(payroll.total_net) }} rupiah</span>
          </p>
        </div>

        <!-- Catatan -->
        <p v-if="payroll.notes" class="mt-3 text-sm">
          <span class="font-bold">Catatan:</span> {{ payroll.notes }}
        </p>

        <!-- Tanda tangan -->
        <div class="mt-10 grid grid-cols-2 gap-8 text-center text-sm">
          <div>
            <p>Karyawan,</p>
            <div class="mt-14 border-t border-gray-500 pt-1">( ................................. )</div>
          </div>
          <div>
            <p>HRD / Manajemen,</p>
            <p class="text-xs text-gray-500">{{ formatDate(todayISO) }}</p>
            <div class="mt-11 border-t border-gray-500 pt-1">( ................................. )</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useHrStore } from '@/stores/hr'
import { useStoreSettingsStore } from '@/stores/storeSettings'
import { usePayrollSlipPdf, terbilang } from '@/composables/usePayrollSlipPdf'
import { isNativeApp } from '@/lib/platform'
import { useToast } from '@/composables/useToast'
import type { Payroll } from '@/types/database'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const store = useHrStore()
const settingsStore = useStoreSettingsStore()
const { generatePdfBlob, sharePdf } = usePayrollSlipPdf()
const isNative = isNativeApp()
const busy = ref(false)

const payrollId = route.params.id as string
const payroll = ref<Payroll | null>(null)
const loading = ref(false)

const storeName = computed(() => settingsStore.storeName)
const storeAddress = computed(() => settingsStore.storeAddress)
const storePhone = computed(() => settingsStore.storePhone)

const employeeName = computed(() => payroll.value?.employee?.name || '-')
const employeeCode = computed(() => payroll.value?.employee?.employee_code || '-')
const position = computed(() => payroll.value?.employee?.position || '')

const totalIncome = computed(
  () => (payroll.value?.base_salary || 0) + (payroll.value?.incentive_amount || 0)
)

const todayISO = new Date().toISOString()

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v || 0)

const formatDate = (d: string) => {
  if (!d) return '-'
  const date = new Date(d)
  if (isNaN(date.getTime())) return d
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

const printSlip = () => {
  document.title = `Slip Gaji - ${payroll.value?.period_code || ''}`
  window.print()
}

const buildPdfData = () => {
  const p = payroll.value!
  return {
    storeName: storeName.value,
    storeAddress: storeAddress.value,
    storePhone: storePhone.value,
    periodCode: p.period_code || '',
    periodStart: p.period_start,
    periodEnd: p.period_end,
    employeeName: employeeName.value,
    employeeCode: employeeCode.value,
    position: position.value,
    status: p.status,
    paidAt: p.paid_at,
    notes: p.notes,
    baseSalary: p.base_salary,
    incentive: p.incentive_amount,
    incentiveDetails: p.incentive_details,
    kasbonDeduction: p.kasbon_deduction,
    totalNet: p.total_net,
  }
}

const slipFilename = () => `Slip_Gaji_${payroll.value?.employee?.name?.replace(/\s+/g, '_') || ''}_${payroll.value?.period_code || ''}.pdf`

const sharePdfFlow = async () => {
  if (!payroll.value) return
  busy.value = true
  try {
    const blob = generatePdfBlob(buildPdfData())
    await sharePdf(blob, slipFilename())
  } catch (e: any) {
    // Batal share dari dialog sistem bukan error nyata
    if (e?.message !== 'USER_CANCELED' && e?.code !== 'USER_CLOSED')
      toast.error('Gagal!', e.message || 'Gagal membagikan slip gaji')
  } finally {
    busy.value = false
  }
}

const handleShare = () => sharePdfFlow()

// Android: "Cetak" langsung export PDF lalu buka share sheet (WhatsApp);
// web: tetap dialog print browser.
const handlePrint = () => {
  if (isNative) return sharePdfFlow()
  printSlip()
}

onMounted(async () => {
  loading.value = true
  try {
    payroll.value = await store.getPayroll(payrollId)
  } catch (e: any) {
    toast.error('Gagal!', e.message || 'Gagal memuat slip gaji')
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
@media print {
  /* Margins 0 menekan header/footer otomatis Chrome (tanggal, jam, judul halaman) */
  @page {
    margin: 0;
  }

  body * {
    visibility: hidden;
  }

  .print-area,
  .print-area * {
    visibility: visible;
  }

  .print-area {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    box-shadow: none !important;
    max-width: none !important;
    padding: 24px 72px !important;
    background: #fff !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}
</style>
