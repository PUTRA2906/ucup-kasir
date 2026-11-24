<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { financeServiceAdapter as financeService } from '@/services'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import MobilePageHeader from '@/components/common/MobilePageHeader.vue'
import type { ClosingPeriod, AccountBalance, JournalEntry } from '@/types/database'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const { confirm } = useConfirm()

const loading = ref(false)
const closingPeriod = ref<ClosingPeriod | null>(null)
const snapshotBalances = ref<AccountBalance[]>([])
const closingJournal = ref<JournalEntry | null>(null)

const closingId = computed(() => route.params.id as string)

const journalTotalDebit = computed(() =>
  (closingJournal.value?.lines || []).reduce((s, l) => s + Number(l.debit || 0), 0)
)
const journalTotalCredit = computed(() =>
  (closingJournal.value?.lines || []).reduce((s, l) => s + Number(l.credit || 0), 0)
)

const groupedBalances = computed(() => {
  const groups: Record<string, AccountBalance[]> = {
    aset: [],
    kewajiban: [],
    ekuitas: [],
    pendapatan: [],
    beban: []
  }

  snapshotBalances.value.forEach(b => {
    if (groups[b.account_type]) {
      groups[b.account_type].push(b)
    }
  })

  return groups
})

const totalAset = computed(() => {
  return groupedBalances.value.aset.reduce((sum, b) => sum + b.balance, 0)
})

const totalKewajiban = computed(() => {
  return groupedBalances.value.kewajiban.reduce((sum, b) => sum + b.balance, 0)
})

const totalEkuitas = computed(() => {
  return groupedBalances.value.ekuitas.reduce((sum, b) => sum + b.balance, 0)
})

const isBalanced = computed(() => {
  const diff = Math.abs(totalAset.value - (totalKewajiban.value + totalEkuitas.value))
  return diff < 0.01
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
  const date = new Date(dateStr)
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

const formatDateTime = (dateStr: string) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const loadData = async () => {
  loading.value = true
  try {
    const data = await financeService.getClosingPeriod(closingId.value)
    if (!data) {
      toast.error('Gagal', 'Periode tutup buku tidak ditemukan')
      router.push('/finance/closing-periods')
      return
    }
    closingPeriod.value = data
    snapshotBalances.value = data.snapshot_balances || []

    // Cari jurnal penutup milik periode ini
    try {
      const journals = await financeService.getJournals()
      closingJournal.value =
        journals.find(
          (j) => j.reference_type === 'closing' && j.reference_id === data.id
        ) ||
        journals.find(
          (j) =>
            j.reference_type === 'closing' &&
            !j.reference_id &&
            String(j.entry_date || '').slice(0, 10) === data.period_end
        ) ||
        null
    } catch {
      closingJournal.value = null
    }
  } catch (error: any) {
    toast.error('Gagal Memuat Data', error.message)
  } finally {
    loading.value = false
  }
}

const handleReopen = async () => {
  if (!closingPeriod.value) return

  const confirmed = await confirm({
    title: 'Buka Kembali Periode?',
    message: `Apakah Anda yakin ingin membuka kembali periode ${formatDate(closingPeriod.value.period_start)} - ${formatDate(closingPeriod.value.period_end)}?\n\nJurnal penutup akan dibatalkan dan transaksi dalam periode ini dapat diubah kembali.`,
    confirmText: 'Ya, Buka Kembali',
    cancelText: 'Batal',
    // Buka kembali periode bukan tindakan destruktif → tombol utama (bukan merah)
    variant: 'primary'
  })

  if (!confirmed) return

  loading.value = true
  try {
    await financeService.reopenPeriod(closingId.value)
    toast.success('Berhasil', 'Periode berhasil dibuka kembali')
    router.push('/finance/closing-periods')
  } catch (error: any) {
    toast.error('Gagal Membuka Periode', error.message)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadData()
})
</script>

<template>
  <AdminLayout>
    <PageBreadcrumb pageTitle="Detail Tutup Buku" class="hidden md:block" />

    <!-- Mobile Header -->
    <MobilePageHeader title="Detail Tutup Buku" subtitle="Snapshot Saldo">
      <template #actions>
        <button
          @click="router.push('/finance/closing-periods')"
          class="flex h-8 w-8 items-center justify-center rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-white/[0.03]"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
      </template>
    </MobilePageHeader>

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center py-20">
      <div class="text-center">
        <div class="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
        <p class="text-sm text-gray-500 dark:text-gray-400">Memuat data...</p>
      </div>
    </div>

    <!-- Content -->
    <template v-else-if="closingPeriod">
      <!-- Info Card -->
      <div class="mb-4 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <h2 class="text-sm font-bold text-gray-900 dark:text-white">
              Periode {{ formatDate(closingPeriod.period_start) }} - {{ formatDate(closingPeriod.period_end) }}
            </h2>
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Ditutup pada {{ formatDateTime(closingPeriod.closed_at) }}
            </p>
            <p v-if="closingPeriod.notes" class="mt-2 text-xs text-gray-600 dark:text-gray-300">
              {{ closingPeriod.notes }}
            </p>
          </div>
          <span
            class="rounded-full px-3 py-1 text-xs font-semibold"
            :class="closingPeriod.status === 'closed'
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
              : 'bg-gray-100 text-gray-700 dark:bg-gray-500/10 dark:text-gray-400'"
          >
            {{ closingPeriod.status === 'closed' ? 'Tertutup' : 'Terbuka' }}
          </span>
        </div>

        <!-- Action Button -->
        <div v-if="closingPeriod.status === 'closed'" class="mt-4 flex justify-end">
          <button
            @click="handleReopen"
            class="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-100 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400 dark:hover:bg-amber-500/20"
          >
            Buka Kembali Periode
          </button>
        </div>
      </div>

      <!-- Jurnal Penutup -->
      <div class="mb-4 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <div class="mb-3 flex items-center justify-between">
          <h3 class="text-sm font-bold text-gray-900 dark:text-white">Jurnal Penutup</h3>
          <span
            v-if="closingJournal"
            class="rounded-lg px-2 py-0.5 text-[10px] font-semibold"
            :class="closingJournal.status === 'void'
              ? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
              : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'"
          >
            {{ closingJournal.status === 'void' ? 'Dibatalkan' : 'Posted' }}
          </span>
        </div>

        <div v-if="closingJournal" class="overflow-x-auto">
          <p class="mb-2 text-[11px] text-gray-500 dark:text-gray-400">
            {{ closingJournal.journal_number }} · {{ formatDate(closingJournal.entry_date) }}
          </p>
          <table class="w-full text-xs">
            <thead>
              <tr class="border-b border-gray-200 text-gray-500 dark:border-gray-700 dark:text-gray-400">
                <th class="py-1.5 pr-2 text-left font-medium">Akun</th>
                <th class="px-2 py-1.5 text-right font-medium">Debit</th>
                <th class="py-1.5 pl-2 text-right font-medium">Kredit</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
              <tr v-for="line in closingJournal.lines" :key="line.id">
                <td class="py-1.5 pr-2 text-gray-700 dark:text-gray-300">
                  {{ line.account_code }} {{ line.account_name }}
                </td>
                <td class="px-2 py-1.5 text-right text-gray-900 dark:text-white">
                  {{ Number(line.debit) > 0 ? formatCurrency(Number(line.debit)) : '-' }}
                </td>
                <td class="py-1.5 pl-2 text-right text-gray-900 dark:text-white">
                  {{ Number(line.credit) > 0 ? formatCurrency(Number(line.credit)) : '-' }}
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr class="border-t-2 border-gray-300 font-bold dark:border-gray-600">
                <td class="py-2 pr-2 text-gray-900 dark:text-white">Total</td>
                <td class="px-2 py-2 text-right text-gray-900 dark:text-white">{{ formatCurrency(journalTotalDebit) }}</td>
                <td class="py-2 pl-2 text-right text-gray-900 dark:text-white">{{ formatCurrency(journalTotalCredit) }}</td>
              </tr>
            </tfoot>
          </table>
          <p
            class="mt-2 text-xs font-medium"
            :class="Math.abs(journalTotalDebit - journalTotalCredit) < 0.01
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-red-600 dark:text-red-400'"
          >
            {{ Math.abs(journalTotalDebit - journalTotalCredit) < 0.01
              ? '✓ Jurnal balance (debit = kredit)'
              : '✗ Jurnal tidak balance' }}
          </p>
        </div>
        <p v-else class="text-xs text-gray-500 dark:text-gray-400">
          Tidak ada jurnal penutup untuk periode ini (tidak ada aktivitas pendapatan/beban).
        </p>
      </div>

      <!-- Balance Summary -->
      <div class="mb-4 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <h3 class="mb-3 text-sm font-bold text-gray-900 dark:text-white">Ringkasan Neraca</h3>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div class="rounded-xl bg-emerald-50 p-3 dark:bg-emerald-500/10">
            <p class="text-xs text-emerald-600 dark:text-emerald-400">Total Aset</p>
            <p class="mt-1 text-base font-bold text-emerald-700 dark:text-emerald-300">{{ formatCurrency(totalAset) }}</p>
          </div>
          <div class="rounded-xl bg-red-50 p-3 dark:bg-red-500/10">
            <p class="text-xs text-red-600 dark:text-red-400">Total Kewajiban</p>
            <p class="mt-1 text-base font-bold text-red-700 dark:text-red-300">{{ formatCurrency(totalKewajiban) }}</p>
          </div>
          <div class="rounded-xl bg-blue-50 p-3 dark:bg-blue-500/10">
            <p class="text-xs text-blue-600 dark:text-blue-400">Total Ekuitas</p>
            <p class="mt-1 text-base font-bold text-blue-700 dark:text-blue-300">{{ formatCurrency(totalEkuitas) }}</p>
          </div>
        </div>

        <!-- Balance Check -->
        <div
          class="mt-3 rounded-xl px-3 py-2"
          :class="isBalanced
            ? 'border border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10'
            : 'border border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10'"
        >
          <p class="text-xs font-bold" :class="isBalanced ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'">
            {{ isBalanced ? '✓ Balance: Aset = Kewajiban + Ekuitas' : '⚠️ Tidak Balance: selisih ' + formatCurrency(Math.abs(totalAset - (totalKewajiban + totalEkuitas))) }}
          </p>
        </div>
      </div>

      <!-- Snapshot Saldo -->
      <div class="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <h3 class="mb-4 text-sm font-bold text-gray-900 dark:text-white">Snapshot Saldo Akun</h3>

        <div class="space-y-4 text-xs">
          <!-- Aset -->
          <div v-if="groupedBalances.aset.length > 0">
            <h5 class="mb-2 font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Aset</h5>
            <div class="space-y-1.5">
              <div v-for="bal in groupedBalances.aset" :key="bal.account_id" class="flex justify-between rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-800">
                <span class="text-gray-700 dark:text-gray-300">{{ bal.account_code }} {{ bal.account_name }}</span>
                <span class="font-semibold text-gray-900 dark:text-white">{{ formatCurrency(bal.balance) }}</span>
              </div>
            </div>
            <div class="mt-2 flex justify-between border-t border-gray-200 pt-2 dark:border-gray-700">
              <span class="font-bold text-gray-700 dark:text-gray-300">Total Aset</span>
              <span class="font-bold text-gray-900 dark:text-white">{{ formatCurrency(totalAset) }}</span>
            </div>
          </div>

          <!-- Kewajiban -->
          <div v-if="groupedBalances.kewajiban.length > 0">
            <h5 class="mb-2 font-bold uppercase tracking-wider text-red-600 dark:text-red-400">Kewajiban</h5>
            <div class="space-y-1.5">
              <div v-for="bal in groupedBalances.kewajiban" :key="bal.account_id" class="flex justify-between rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-800">
                <span class="text-gray-700 dark:text-gray-300">{{ bal.account_code }} {{ bal.account_name }}</span>
                <span class="font-semibold text-gray-900 dark:text-white">{{ formatCurrency(bal.balance) }}</span>
              </div>
            </div>
            <div class="mt-2 flex justify-between border-t border-gray-200 pt-2 dark:border-gray-700">
              <span class="font-bold text-gray-700 dark:text-gray-300">Total Kewajiban</span>
              <span class="font-bold text-gray-900 dark:text-white">{{ formatCurrency(totalKewajiban) }}</span>
            </div>
          </div>

          <!-- Ekuitas -->
          <div v-if="groupedBalances.ekuitas.length > 0">
            <h5 class="mb-2 font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Ekuitas</h5>
            <div class="space-y-1.5">
              <div v-for="bal in groupedBalances.ekuitas" :key="bal.account_id" class="rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-800">
                <div class="flex justify-between">
                  <div class="flex-1">
                    <span class="text-gray-700 dark:text-gray-300">{{ bal.account_code }} {{ bal.account_name }}</span>
                    <!-- Keterangan khusus untuk Laba Piutang (belum terealisasi) -->
                    <p v-if="bal.account_code === '3-3100'" class="mt-0.5 text-[10px] text-gray-500 dark:text-gray-400">
                      Laba dari piutang yang belum dibayar (belum terima kas)
                    </p>
                    <!-- Keterangan khusus untuk Laba Direalisasi -->
                    <p v-if="bal.account_code === '3-3200'" class="mt-0.5 text-[10px] text-gray-500 dark:text-gray-400">
                      Laba yang sudah terima kas (tersedia untuk diambil owner)
                    </p>
                  </div>
                  <span class="font-semibold text-gray-900 dark:text-white">{{ formatCurrency(bal.balance) }}</span>
                </div>
              </div>
            </div>
            <div class="mt-2 flex justify-between border-t border-gray-200 pt-2 dark:border-gray-700">
              <span class="font-bold text-gray-700 dark:text-gray-300">Total Ekuitas</span>
              <span class="font-bold text-gray-900 dark:text-white">{{ formatCurrency(totalEkuitas) }}</span>
            </div>
          </div>

          <!-- Pendapatan (Seharusnya 0 setelah tutup buku) -->
          <div v-if="groupedBalances.pendapatan.length > 0">
            <h5 class="mb-2 font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">Pendapatan (Sudah Ditutup)</h5>
            <div class="space-y-1.5">
              <div v-for="bal in groupedBalances.pendapatan" :key="bal.account_id" class="flex justify-between rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-800">
                <span class="text-gray-700 dark:text-gray-300">{{ bal.account_code }} {{ bal.account_name }}</span>
                <span class="font-semibold text-gray-900 dark:text-white">{{ formatCurrency(bal.balance) }}</span>
              </div>
            </div>
          </div>

          <!-- Beban (Seharusnya 0 setelah tutup buku) -->
          <div v-if="groupedBalances.beban.length > 0">
            <h5 class="mb-2 font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Beban (Sudah Ditutup)</h5>
            <div class="space-y-1.5">
              <div v-for="bal in groupedBalances.beban" :key="bal.account_id" class="flex justify-between rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-800">
                <span class="text-gray-700 dark:text-gray-300">{{ bal.account_code }} {{ bal.account_name }}</span>
                <span class="font-semibold text-gray-900 dark:text-white">{{ formatCurrency(bal.balance) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </AdminLayout>
</template>
