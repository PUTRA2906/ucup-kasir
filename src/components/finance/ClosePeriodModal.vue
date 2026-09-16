<script setup lang="ts">
import { ref, computed } from 'vue'
import { financeService } from '@/services/finance'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'
import type { ClosePeriodInput, AccountBalance } from '@/types/database'
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
const previewBalances = ref<AccountBalance[]>([])
const showPreview = ref(false)

const isValid = computed(() => {
  return dateRange.value.start && dateRange.value.end
})

const loadPreview = async () => {
  if (!dateRange.value.end) return

  loadingPreview.value = true
  try {
    const balances = await financeService.getAccountBalances(dateRange.value.end)
    previewBalances.value = balances
    showPreview.value = true
  } catch (error: any) {
    toast.error('Gagal Memuat Preview', error.message)
  } finally {
    loadingPreview.value = false
  }
}

const groupedBalances = computed(() => {
  const groups: Record<string, AccountBalance[]> = {
    aset: [],
    kewajiban: [],
    ekuitas: [],
    pendapatan: [],
    beban: []
  }

  previewBalances.value.forEach(b => {
    if (groups[b.account_type]) {
      groups[b.account_type].push(b)
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
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

const handleSubmit = async () => {
  if (!isValid.value) return

  const confirmed = await confirm({
    title: 'Tutup Periode?',
    message: `Tutup periode ${formatDate(dateRange.value.start)} - ${formatDate(dateRange.value.end)}?\n\nSetelah ditutup, semua transaksi dalam periode ini tidak dapat diubah atau dihapus.`,
    confirmText: 'Ya, Tutup Periode',
    cancelText: 'Batal',
    variant: 'danger'
  })

  if (!confirmed) return

  loading.value = true
  try {
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
  previewBalances.value = []
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
              v-model="dateRange"
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
            :disabled="!dateRange.end || loadingPreview"
            class="w-full rounded-xl border border-blue-300 bg-blue-50 px-4 py-2.5 text-sm font-medium text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20"
          >
            {{ loadingPreview ? 'Memuat Preview...' : 'Lihat Preview Saldo Akun' }}
          </button>

          <!-- Preview Saldo -->
          <div v-if="showPreview" class="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900">
            <h4 class="mb-3 text-sm font-bold text-gray-900 dark:text-white">Preview Saldo per {{ formatDate(dateRange.end) }}</h4>

            <div class="space-y-4 text-xs">
              <!-- Aset -->
              <div v-if="groupedBalances.aset.length > 0">
                <h5 class="mb-2 font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Aset</h5>
                <div class="space-y-1">
                  <div v-for="bal in groupedBalances.aset" :key="bal.account_id" class="flex justify-between">
                    <span class="text-gray-700 dark:text-gray-300">{{ bal.account_code }} {{ bal.account_name }}</span>
                    <span class="font-semibold text-gray-900 dark:text-white">{{ formatCurrency(bal.balance) }}</span>
                  </div>
                </div>
              </div>

              <!-- Kewajiban -->
              <div v-if="groupedBalances.kewajiban.length > 0">
                <h5 class="mb-2 font-bold uppercase tracking-wider text-red-600 dark:text-red-400">Kewajiban</h5>
                <div class="space-y-1">
                  <div v-for="bal in groupedBalances.kewajiban" :key="bal.account_id" class="flex justify-between">
                    <span class="text-gray-700 dark:text-gray-300">{{ bal.account_code }} {{ bal.account_name }}</span>
                    <span class="font-semibold text-gray-900 dark:text-white">{{ formatCurrency(bal.balance) }}</span>
                  </div>
                </div>
              </div>

              <!-- Ekuitas -->
              <div v-if="groupedBalances.ekuitas.length > 0">
                <h5 class="mb-2 font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Ekuitas</h5>
                <div class="space-y-1">
                  <div v-for="bal in groupedBalances.ekuitas" :key="bal.account_id" class="flex justify-between">
                    <span class="text-gray-700 dark:text-gray-300">{{ bal.account_code }} {{ bal.account_name }}</span>
                    <span class="font-semibold text-gray-900 dark:text-white">{{ formatCurrency(bal.balance) }}</span>
                  </div>
                </div>
              </div>

              <!-- Pendapatan -->
              <div v-if="groupedBalances.pendapatan.length > 0">
                <h5 class="mb-2 font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">Pendapatan</h5>
                <div class="space-y-1">
                  <div v-for="bal in groupedBalances.pendapatan" :key="bal.account_id" class="flex justify-between">
                    <span class="text-gray-700 dark:text-gray-300">{{ bal.account_code }} {{ bal.account_name }}</span>
                    <span class="font-semibold text-gray-900 dark:text-white">{{ formatCurrency(bal.balance) }}</span>
                  </div>
                </div>
              </div>

              <!-- Beban -->
              <div v-if="groupedBalances.beban.length > 0">
                <h5 class="mb-2 font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Beban</h5>
                <div class="space-y-1">
                  <div v-for="bal in groupedBalances.beban" :key="bal.account_id" class="flex justify-between">
                    <span class="text-gray-700 dark:text-gray-300">{{ bal.account_code }} {{ bal.account_name }}</span>
                    <span class="font-semibold text-gray-900 dark:text-white">{{ formatCurrency(bal.balance) }}</span>
                  </div>
                </div>
              </div>
            </div>
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
