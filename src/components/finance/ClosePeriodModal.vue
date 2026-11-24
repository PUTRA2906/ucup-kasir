<script setup lang="ts">
import { ref, computed } from 'vue'
import { financeServiceAdapter as financeService } from '@/services'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'
import DateRangeField from '@/components/common/DateRangeField.vue'

const props = defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'success'): void
}>()

const toast = useToast()
const { confirm } = useConfirm()

const loading = ref(false)
const loadingPreview = ref(false)
const dateRange = ref({ start: '', end: '' })
const notes = ref('')
const showPreview = ref(false)

interface PreviewLine {
  account_code: string
  account_name: string
  debit: number
  credit: number
  hint?: string
}

interface PreviewData {
  lines: PreviewLine[]
  totalDebit: number
  totalCredit: number
  totalPendapatan: number
  totalBeban: number
  labaBersih: number
  labaDirealisasi: number
  labaPiutang: number
}

const preview = ref<PreviewData | null>(null)

const isValid = computed(() => {
  return !!(dateRange.value.start && dateRange.value.end)
})

const isBalanced = computed(() => {
  if (!preview.value) return true
  return Math.abs(preview.value.totalDebit - preview.value.totalCredit) < 0.01
})

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount)
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return ''
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

/**
 * Validasi periode: tanggal akhir >= mulai dan tidak overlap dengan
 * periode yang sudah ditutup. Mengembalikan pesan error atau null.
 */
const validatePeriod = async (): Promise<string | null> => {
  const { start, end } = dateRange.value
  if (!start || !end) return 'Pilih tanggal mulai dan akhir periode.'
  if (end < start) return 'Tanggal akhir periode harus >= tanggal mulai.'

  const periods = await financeService.getClosingPeriods()
  const overlap = periods.find(
    (p) =>
      p.status === 'closed' &&
      ((start >= p.period_start && start <= p.period_end) ||
        (end >= p.period_start && end <= p.period_end) ||
        (start <= p.period_start && end >= p.period_end))
  )
  if (overlap) {
    return `Periode overlap dengan periode yang sudah ditutup (${formatDate(
      overlap.period_start
    )} - ${formatDate(overlap.period_end)}).`
  }
  return null
}

const loadPreview = async () => {
  if (!dateRange.value.start || !dateRange.value.end) return

  loadingPreview.value = true
  showPreview.value = false
  try {
    const validationError = await validatePeriod()
    if (validationError) {
      toast.error('Periode Tidak Valid', validationError)
      return
    }

    // Aktivitas pendapatan & beban periode (tanpa jurnal penutup/penyesuaian)
    const activity = await financeService.getPeriodActivity(
      dateRange.value.start,
      dateRange.value.end
    )

    // Rasio laba direalisasi dari transaksi (cash basis)
    const profitSummary = await financeService.getProfitSummary(
      dateRange.value.start,
      dateRange.value.end
    )
    let realisedRatio = 0
    if (profitSummary.total_profit > 0.01) {
      realisedRatio = profitSummary.realized_profit / profitSummary.total_profit
      if (realisedRatio < 0) realisedRatio = 0
      if (realisedRatio > 1) realisedRatio = 1
    }

    const lines: PreviewLine[] = []

    // Debit semua akun pendapatan (tutup ke 0).
    // Hanya saldo positif — sama dengan HAVING SUM(...) > 0 di close_period().
    for (const acc of activity.byAccount.filter((a) => a.account_type === 'pendapatan')) {
      if (acc.amount <= 0.01) continue
      lines.push({
        account_code: acc.account_code,
        account_name: acc.account_name,
        debit: acc.amount,
        credit: 0,
      })
    }

    // Kredit semua akun beban (tutup ke 0).
    for (const acc of activity.byAccount.filter((a) => a.account_type === 'beban')) {
      if (acc.amount <= 0.01) continue
      lines.push({
        account_code: acc.account_code,
        account_name: acc.account_name,
        debit: 0,
        credit: acc.amount,
      })
    }

    // Plug = debit − kredit dari baris yang benar-benar masuk jurnal,
    // bukan activity.labaBersih (akun bersaldo negatif tidak ikut ditutup).
    const plug =
      Math.round(
        (lines.reduce((s, l) => s + l.debit, 0) - lines.reduce((s, l) => s + l.credit, 0)) * 100
      ) / 100
    let labaDirealisasi = 0
    let labaPiutang = 0

    if (Math.abs(plug) > 0.01) {
      if (plug > 0) {
        // Laba: kredit 3-3200 (direalisasi) + 3-3100 (belum terealisasi)
        labaDirealisasi = Math.round(plug * realisedRatio * 100) / 100
        labaPiutang = Math.round((plug - labaDirealisasi) * 100) / 100

        if (Math.abs(labaDirealisasi) > 0.01) {
          lines.push({
            account_code: '3-3200',
            account_name: 'Laba Direalisasi',
            debit: 0,
            credit: labaDirealisasi,
            hint: 'Laba yang sudah terima kas',
          })
        }
        if (Math.abs(labaPiutang) > 0.01) {
          lines.push({
            account_code: '3-3100',
            account_name: 'Laba Piutang',
            debit: 0,
            credit: labaPiutang,
            hint: 'Laba dari piutang yang belum dibayar',
          })
        }
      } else {
        // Rugi: debit 3-3100
        labaPiutang = Math.round(Math.abs(plug) * 100) / 100
        lines.push({
          account_code: '3-3100',
          account_name: 'Laba Piutang',
          debit: labaPiutang,
          credit: 0,
          hint: 'Menutup kerugian periode',
        })
      }
    }

    preview.value = {
      lines,
      totalDebit: lines.reduce((s, l) => s + l.debit, 0),
      totalCredit: lines.reduce((s, l) => s + l.credit, 0),
      totalPendapatan: activity.totalPendapatan,
      totalBeban: activity.totalBeban,
      labaBersih: activity.labaBersih,
      labaDirealisasi,
      labaPiutang,
    }
    showPreview.value = true
  } catch (error: any) {
    toast.error('Gagal Memuat Preview', error.message)
  } finally {
    loadingPreview.value = false
  }
}

const handleSubmit = async () => {
  if (!isValid.value) return

  const confirmed = await confirm({
    title: 'Tutup Periode?',
    message: `Tutup periode ${formatDate(dateRange.value.start)} - ${formatDate(
      dateRange.value.end
    )}?\n\nJurnal penutup akan dibuat dan transaksi dalam periode ini tidak dapat diubah atau dihapus.`,
    confirmText: 'Ya, Tutup Periode',
    cancelText: 'Batal',
    variant: 'danger'
  })

  if (!confirmed) return

  loading.value = true
  try {
    const validationError = await validatePeriod()
    if (validationError) {
      toast.error('Periode Tidak Valid', validationError)
      return
    }

    await financeService.closePeriod({
      period_start: dateRange.value.start,
      period_end: dateRange.value.end,
      notes: notes.value
    })
    toast.success('Berhasil', 'Periode berhasil ditutup')
    emit('success')
    handleClose()
  } catch (error: any) {
    toast.error('Gagal Tutup Periode', error.message)
  } finally {
    loading.value = false
  }
}

const handleClose = () => {
  dateRange.value = { start: '', end: '' }
  notes.value = ''
  preview.value = null
  showPreview.value = false
  emit('close')
}
</script>

<template>
  <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
    <div class="w-full max-w-3xl rounded-2xl bg-white shadow-xl dark:bg-gray-900">
      <!-- Header -->
      <div class="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-800">
        <h3 class="text-lg font-bold text-gray-900 dark:text-white">Tutup Periode Baru</h3>
        <button
          @click="handleClose"
          class="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Body -->
      <div class="max-h-[70vh] overflow-y-auto p-6">
        <form @submit.prevent="handleSubmit" class="space-y-4">
          <!-- Periode (Date Range) -->
          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Periode
            </label>
            <DateRangeField
              :start="dateRange.start"
              :end="dateRange.end"
              @update:start="dateRange.start = $event"
              @update:end="dateRange.end = $event"
              title="Pilih Periode"
              placeholder="Pilih tanggal mulai dan akhir"
            />
          </div>

          <!-- Catatan -->
          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Catatan (Opsional)
            </label>
            <textarea
              v-model="notes"
              rows="3"
              placeholder="Misal: Tutup buku bulan September 2026"
              class="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
            ></textarea>
          </div>

          <!-- Button Preview -->
          <button
            type="button"
            @click="loadPreview"
            :disabled="!isValid || loadingPreview"
            class="w-full rounded-xl border border-blue-300 bg-blue-50 px-4 py-2.5 text-sm font-medium text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20"
          >
            {{ loadingPreview ? 'Memuat Preview...' : 'Lihat Preview Jurnal Penutup' }}
          </button>

          <!-- Preview Jurnal Penutup -->
          <div v-if="showPreview && preview" class="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900">
            <h4 class="mb-3 text-sm font-bold text-gray-900 dark:text-white">
              Preview Jurnal Penutup
            </h4>

            <!-- Ringkasan -->
            <div class="mb-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-3">
              <div class="rounded-lg bg-white p-2.5 dark:bg-gray-800">
                <p class="text-gray-500 dark:text-gray-400">Total Pendapatan</p>
                <p class="font-semibold text-gray-900 dark:text-white">{{ formatCurrency(preview.totalPendapatan) }}</p>
              </div>
              <div class="rounded-lg bg-white p-2.5 dark:bg-gray-800">
                <p class="text-gray-500 dark:text-gray-400">Total Beban</p>
                <p class="font-semibold text-gray-900 dark:text-white">{{ formatCurrency(preview.totalBeban) }}</p>
              </div>
              <div class="rounded-lg bg-white p-2.5 dark:bg-gray-800">
                <p class="text-gray-500 dark:text-gray-400">Laba Bersih</p>
                <p
                  class="font-semibold"
                  :class="preview.labaBersih >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'"
                >
                  {{ formatCurrency(preview.labaBersih) }}
                </p>
              </div>
            </div>

            <!-- Baris jurnal -->
            <div v-if="preview.lines.length > 0" class="overflow-x-auto">
              <table class="w-full text-xs">
                <thead>
                  <tr class="border-b border-gray-200 text-gray-500 dark:border-gray-700 dark:text-gray-400">
                    <th class="py-1.5 pr-2 text-left font-medium">Akun</th>
                    <th class="py-1.5 px-2 text-right font-medium">Debit</th>
                    <th class="py-1.5 pl-2 text-right font-medium">Kredit</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
                  <tr v-for="(line, idx) in preview.lines" :key="idx">
                    <td class="py-1.5 pr-2">
                      <span class="text-gray-700 dark:text-gray-300">
                        {{ line.account_code }} {{ line.account_name }}
                      </span>
                      <p v-if="line.hint" class="text-[10px] text-gray-500 dark:text-gray-400">
                        {{ line.hint }}
                      </p>
                    </td>
                    <td class="py-1.5 px-2 text-right text-gray-900 dark:text-white">
                      {{ line.debit > 0 ? formatCurrency(line.debit) : '-' }}
                    </td>
                    <td class="py-1.5 pl-2 text-right text-gray-900 dark:text-white">
                      {{ line.credit > 0 ? formatCurrency(line.credit) : '-' }}
                    </td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr class="border-t-2 border-gray-300 font-bold dark:border-gray-600">
                    <td class="py-2 pr-2 text-gray-900 dark:text-white">Total</td>
                    <td class="py-2 px-2 text-right text-gray-900 dark:text-white">{{ formatCurrency(preview.totalDebit) }}</td>
                    <td class="py-2 pl-2 text-right text-gray-900 dark:text-white">{{ formatCurrency(preview.totalCredit) }}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <p v-else class="text-xs text-gray-500 dark:text-gray-400">
              Tidak ada aktivitas pendapatan/beban pada periode ini. Tidak ada jurnal penutup yang dibuat.
            </p>

            <!-- Balance check -->
            <p
              v-if="preview.lines.length > 0"
              class="mt-2 text-xs font-medium"
              :class="isBalanced ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'"
            >
              {{ isBalanced ? '✓ Jurnal balance (debit = kredit)' : '✗ Jurnal tidak balance' }}
            </p>
          </div>
        </form>
      </div>

      <!-- Footer -->
      <div class="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4 dark:border-gray-800">
        <button
          type="button"
          @click="handleClose"
          class="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          Batal
        </button>
        <button
          type="button"
          @click="handleSubmit"
          :disabled="!isValid || loading"
          class="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {{ loading ? 'Menutup Periode...' : 'Tutup Periode' }}
        </button>
      </div>
    </div>
  </div>
</template>
