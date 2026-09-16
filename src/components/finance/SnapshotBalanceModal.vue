<script setup lang="ts">
import { computed } from 'vue'
import type { ClosingPeriod, AccountBalance } from '@/types/database'
import { usePdfExport } from '@/composables/usePdfExport'
import { useToast } from '@/composables/useToast'

const props = defineProps<{
  show: boolean
  closingPeriod: ClosingPeriod | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const toast = useToast()
// TODO: Implementasi export PDF untuk snapshot balance
// const { downloadPdf } = usePdfExport()

const balances = computed(() => props.closingPeriod?.snapshot_balances || [])

const groupedBalances = computed(() => {
  const groups: Record<string, { balances: AccountBalance[], total: number }> = {
    aset: { balances: [], total: 0 },
    kewajiban: { balances: [], total: 0 },
    ekuitas: { balances: [], total: 0 },
    pendapatan: { balances: [], total: 0 },
    beban: { balances: [], total: 0 }
  }

  balances.value.forEach(b => {
    if (groups[b.account_type]) {
      groups[b.account_type].balances.push(b)
      groups[b.account_type].total += b.balance
    }
  })

  return groups
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
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

const formatDateTime = (dateStr: string) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const handleExportPdf = async () => {
  if (!props.closingPeriod) return

  // TODO: Implementasi export PDF untuk snapshot balance
  // usePdfExport hanya support invoice, perlu buat fungsi terpisah untuk snapshot balance
  toast.error('Fitur Export PDF', 'Belum tersedia untuk snapshot saldo')

  /*
  try {
    const content = buildPdfContent()
    await exportToPdf({
      title: `Snapshot Saldo - ${formatDate(props.closingPeriod.period_start)} s/d ${formatDate(props.closingPeriod.period_end)}`,
      content,
      filename: `snapshot-saldo-${props.closingPeriod.period_start}-${props.closingPeriod.period_end}.pdf`
    })
    toast.success('Berhasil', 'PDF berhasil diunduh')
  } catch (error: any) {
    toast.error('Gagal Export PDF', error.message)
  }
  */
}

const buildPdfContent = () => {
  if (!props.closingPeriod) return ''

  let html = `
    <div style="text-align: center; margin-bottom: 20px;">
      <h2>Snapshot Saldo Akun</h2>
      <p>Periode: ${formatDate(props.closingPeriod.period_start)} - ${formatDate(props.closingPeriod.period_end)}</p>
      <p style="font-size: 12px; color: #666;">Ditutup: ${formatDateTime(props.closingPeriod.closed_at)}</p>
    </div>
  `

  const types = [
    { key: 'aset', label: 'ASET' },
    { key: 'kewajiban', label: 'KEWAJIBAN' },
    { key: 'ekuitas', label: 'EKUITAS' },
    { key: 'pendapatan', label: 'PENDAPATAN' },
    { key: 'beban', label: 'BEBAN' }
  ]

  types.forEach(type => {
    const group = groupedBalances.value[type.key]
    if (group.balances.length > 0) {
      html += `
        <div style="margin-top: 20px;">
          <h3 style="border-bottom: 2px solid #333; padding-bottom: 5px;">${type.label}</h3>
          <table style="width: 100%; margin-top: 10px; border-collapse: collapse;">
            <thead>
              <tr style="border-bottom: 1px solid #ddd;">
                <th style="text-align: left; padding: 8px;">Kode</th>
                <th style="text-align: left; padding: 8px;">Nama Akun</th>
                <th style="text-align: right; padding: 8px;">Saldo</th>
              </tr>
            </thead>
            <tbody>
      `

      group.balances.forEach(b => {
        html += `
          <tr>
            <td style="padding: 6px;">${b.account_code}</td>
            <td style="padding: 6px;">${b.account_name}</td>
            <td style="text-align: right; padding: 6px;">${formatCurrency(b.balance)}</td>
          </tr>
        `
      })

      html += `
            </tbody>
            <tfoot>
              <tr style="border-top: 2px solid #333; font-weight: bold;">
                <td colspan="2" style="padding: 8px;">Total ${type.label}</td>
                <td style="text-align: right; padding: 8px;">${formatCurrency(group.total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      `
    }
  })

  if (props.closingPeriod.notes) {
    html += `
      <div style="margin-top: 30px; padding: 15px; background: #f5f5f5; border-radius: 5px;">
        <p style="margin: 0; font-size: 12px; color: #666;"><strong>Catatan:</strong></p>
        <p style="margin: 5px 0 0 0; font-size: 12px;">${props.closingPeriod.notes}</p>
      </div>
    `
  }

  return html
}
</script>

<template>
  <div v-if="show && closingPeriod" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
    <div class="w-full max-w-4xl rounded-2xl bg-white shadow-xl dark:bg-gray-900">
      <!-- Header -->
      <div class="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-800">
        <div>
          <h3 class="text-lg font-bold text-gray-900 dark:text-white">Snapshot Saldo Akun</h3>
          <p class="text-sm text-gray-600 dark:text-gray-400">
            Periode: {{ formatDate(closingPeriod.period_start) }} - {{ formatDate(closingPeriod.period_end) }}
          </p>
        </div>
        <button
          @click="$emit('close')"
          class="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Body -->
      <div class="max-h-[65vh] overflow-y-auto p-6">
        <!-- Info -->
        <div class="mb-4 rounded-xl border border-blue-200 bg-blue-50 p-3 dark:border-blue-500/30 dark:bg-blue-500/10">
          <p class="text-xs text-blue-700 dark:text-blue-300">
            <strong>Ditutup:</strong> {{ formatDateTime(closingPeriod.closed_at) }}
          </p>
          <p v-if="closingPeriod.notes" class="mt-1 text-xs text-blue-700 dark:text-blue-300">
            <strong>Catatan:</strong> {{ closingPeriod.notes }}
          </p>
        </div>

        <!-- Aset -->
        <div v-if="groupedBalances.aset.balances.length > 0" class="mb-6">
          <h4 class="mb-3 text-sm font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            Aset
          </h4>
          <div class="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
            <table class="w-full text-sm">
              <thead class="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th class="px-4 py-2 text-left font-medium text-gray-700 dark:text-gray-300">Kode</th>
                  <th class="px-4 py-2 text-left font-medium text-gray-700 dark:text-gray-300">Nama Akun</th>
                  <th class="px-4 py-2 text-right font-medium text-gray-700 dark:text-gray-300">Saldo</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200 dark:divide-gray-800">
                <tr v-for="bal in groupedBalances.aset.balances" :key="bal.account_id">
                  <td class="px-4 py-2 text-gray-700 dark:text-gray-300">{{ bal.account_code }}</td>
                  <td class="px-4 py-2 text-gray-900 dark:text-white">{{ bal.account_name }}</td>
                  <td class="px-4 py-2 text-right font-semibold text-gray-900 dark:text-white">
                    {{ formatCurrency(bal.balance) }}
                  </td>
                </tr>
              </tbody>
              <tfoot class="border-t-2 border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
                <tr>
                  <td colspan="2" class="px-4 py-2 font-bold text-gray-900 dark:text-white">Total Aset</td>
                  <td class="px-4 py-2 text-right font-bold text-gray-900 dark:text-white">
                    {{ formatCurrency(groupedBalances.aset.total) }}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <!-- Kewajiban -->
        <div v-if="groupedBalances.kewajiban.balances.length > 0" class="mb-6">
          <h4 class="mb-3 text-sm font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
            Kewajiban
          </h4>
          <div class="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
            <table class="w-full text-sm">
              <thead class="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th class="px-4 py-2 text-left font-medium text-gray-700 dark:text-gray-300">Kode</th>
                  <th class="px-4 py-2 text-left font-medium text-gray-700 dark:text-gray-300">Nama Akun</th>
                  <th class="px-4 py-2 text-right font-medium text-gray-700 dark:text-gray-300">Saldo</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200 dark:divide-gray-800">
                <tr v-for="bal in groupedBalances.kewajiban.balances" :key="bal.account_id">
                  <td class="px-4 py-2 text-gray-700 dark:text-gray-300">{{ bal.account_code }}</td>
                  <td class="px-4 py-2 text-gray-900 dark:text-white">{{ bal.account_name }}</td>
                  <td class="px-4 py-2 text-right font-semibold text-gray-900 dark:text-white">
                    {{ formatCurrency(bal.balance) }}
                  </td>
                </tr>
              </tbody>
              <tfoot class="border-t-2 border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
                <tr>
                  <td colspan="2" class="px-4 py-2 font-bold text-gray-900 dark:text-white">Total Kewajiban</td>
                  <td class="px-4 py-2 text-right font-bold text-gray-900 dark:text-white">
                    {{ formatCurrency(groupedBalances.kewajiban.total) }}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <!-- Ekuitas -->
        <div v-if="groupedBalances.ekuitas.balances.length > 0" class="mb-6">
          <h4 class="mb-3 text-sm font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            Ekuitas
          </h4>
          <div class="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
            <table class="w-full text-sm">
              <thead class="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th class="px-4 py-2 text-left font-medium text-gray-700 dark:text-gray-300">Kode</th>
                  <th class="px-4 py-2 text-left font-medium text-gray-700 dark:text-gray-300">Nama Akun</th>
                  <th class="px-4 py-2 text-right font-medium text-gray-700 dark:text-gray-300">Saldo</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200 dark:divide-gray-800">
                <tr v-for="bal in groupedBalances.ekuitas.balances" :key="bal.account_id">
                  <td class="px-4 py-2 text-gray-700 dark:text-gray-300">{{ bal.account_code }}</td>
                  <td class="px-4 py-2 text-gray-900 dark:text-white">{{ bal.account_name }}</td>
                  <td class="px-4 py-2 text-right font-semibold text-gray-900 dark:text-white">
                    {{ formatCurrency(bal.balance) }}
                  </td>
                </tr>
              </tbody>
              <tfoot class="border-t-2 border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
                <tr>
                  <td colspan="2" class="px-4 py-2 font-bold text-gray-900 dark:text-white">Total Ekuitas</td>
                  <td class="px-4 py-2 text-right font-bold text-gray-900 dark:text-white">
                    {{ formatCurrency(groupedBalances.ekuitas.total) }}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <!-- Pendapatan -->
        <div v-if="groupedBalances.pendapatan.balances.length > 0" class="mb-6">
          <h4 class="mb-3 text-sm font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
            Pendapatan
          </h4>
          <div class="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
            <table class="w-full text-sm">
              <thead class="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th class="px-4 py-2 text-left font-medium text-gray-700 dark:text-gray-300">Kode</th>
                  <th class="px-4 py-2 text-left font-medium text-gray-700 dark:text-gray-300">Nama Akun</th>
                  <th class="px-4 py-2 text-right font-medium text-gray-700 dark:text-gray-300">Saldo</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200 dark:divide-gray-800">
                <tr v-for="bal in groupedBalances.pendapatan.balances" :key="bal.account_id">
                  <td class="px-4 py-2 text-gray-700 dark:text-gray-300">{{ bal.account_code }}</td>
                  <td class="px-4 py-2 text-gray-900 dark:text-white">{{ bal.account_name }}</td>
                  <td class="px-4 py-2 text-right font-semibold text-gray-900 dark:text-white">
                    {{ formatCurrency(bal.balance) }}
                  </td>
                </tr>
              </tbody>
              <tfoot class="border-t-2 border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
                <tr>
                  <td colspan="2" class="px-4 py-2 font-bold text-gray-900 dark:text-white">Total Pendapatan</td>
                  <td class="px-4 py-2 text-right font-bold text-gray-900 dark:text-white">
                    {{ formatCurrency(groupedBalances.pendapatan.total) }}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <!-- Beban -->
        <div v-if="groupedBalances.beban.balances.length > 0" class="mb-6">
          <h4 class="mb-3 text-sm font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
            Beban
          </h4>
          <div class="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
            <table class="w-full text-sm">
              <thead class="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th class="px-4 py-2 text-left font-medium text-gray-700 dark:text-gray-300">Kode</th>
                  <th class="px-4 py-2 text-left font-medium text-gray-700 dark:text-gray-300">Nama Akun</th>
                  <th class="px-4 py-2 text-right font-medium text-gray-700 dark:text-gray-300">Saldo</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200 dark:divide-gray-800">
                <tr v-for="bal in groupedBalances.beban.balances" :key="bal.account_id">
                  <td class="px-4 py-2 text-gray-700 dark:text-gray-300">{{ bal.account_code }}</td>
                  <td class="px-4 py-2 text-gray-900 dark:text-white">{{ bal.account_name }}</td>
                  <td class="px-4 py-2 text-right font-semibold text-gray-900 dark:text-white">
                    {{ formatCurrency(bal.balance) }}
                  </td>
                </tr>
              </tbody>
              <tfoot class="border-t-2 border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
                <tr>
                  <td colspan="2" class="px-4 py-2 font-bold text-gray-900 dark:text-white">Total Beban</td>
                  <td class="px-4 py-2 text-right font-bold text-gray-900 dark:text-white">
                    {{ formatCurrency(groupedBalances.beban.total) }}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4 dark:border-gray-800">
        <button
          type="button"
          @click="handleExportPdf"
          class="rounded-xl border border-blue-300 bg-blue-50 px-4 py-2.5 text-sm font-medium text-blue-700 hover:bg-blue-100 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20"
        >
          <svg class="mr-2 inline-block h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
          </svg>
          Cetak PDF
        </button>
        <button
          type="button"
          @click="$emit('close')"
          class="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          Tutup
        </button>
      </div>
    </div>
  </div>
</template>
