<template>
  <AdminLayout>
    <PageBreadcrumb pageTitle="Jurnal Umum" class="hidden md:block" />

    <!-- Mobile Header -->
    <MobilePageHeader title="Jurnal Umum" subtitle="Pencatatan Transaksi Keuangan">
      <template #actions>
        <button
          @click="showFilterModal = true"
          class="mr-2 flex h-8 w-8 items-center justify-center rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-white/[0.03]"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
        </button>
        <button
          @click="router.push('/finance/journal/new')"
          class="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-white hover:bg-blue-500"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </button>
      </template>
    </MobilePageHeader>

    <!-- Desktop Header Action -->
    <div class="mb-4 hidden items-center justify-between md:flex">
      <button
        @click="showFilterModal = true"
        class="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
      >
        Filter Periode
      </button>
      <button
        @click="router.push('/finance/journal/new')"
        class="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
      >
        + Buat Jurnal
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="store.loading" class="flex items-center justify-center py-20">
      <div class="text-center">
        <div class="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
        <p class="text-sm text-gray-500 dark:text-gray-400">Memuat jurnal...</p>
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="store.error" class="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-500/30 dark:bg-red-500/10">
      <p class="text-sm text-red-600 dark:text-red-400">{{ store.error }}</p>
    </div>

    <!-- Empty -->
    <div v-else-if="store.journals.length === 0" class="rounded-2xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-gray-900">
      <div class="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10">
        <svg class="h-7 w-7 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      </div>
      <h3 class="text-sm font-bold text-gray-900 dark:text-white">Belum ada jurnal</h3>
      <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Transaksi penjualan otomatis masuk jurnal. Tambah jurnal manual untuk beban &amp; penyesuaian.</p>
      <button
        @click="router.push('/finance/journal/new')"
        class="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
      >
        + Buat Jurnal
      </button>
    </div>

    <!-- Journal List -->
    <div v-else class="space-y-3">
      <!-- Filter Chips -->
      <div class="flex items-center gap-2 overflow-x-auto pb-1">
        <!-- Filter Status -->
        <button
          v-for="opt in statusOptions"
          :key="opt.value"
          @click="statusFilter = opt.value"
          :class="[
            'flex-shrink-0 rounded-lg border px-3 py-1.5 text-[11px] font-medium transition-colors',
            statusFilter === opt.value
              ? 'border-blue-500 bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400'
              : 'border-gray-300 bg-white text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300'
          ]"
        >
          {{ opt.label }}
        </button>

        <!-- Divider -->
        <div class="h-6 w-px bg-gray-300 dark:bg-gray-700"></div>

        <!-- Filter Periode Cepat -->
        <button
          v-for="opt in periodOptions"
          :key="opt.value"
          @click="applyQuickPeriod(opt.value)"
          :class="[
            'flex-shrink-0 rounded-lg border px-3 py-1.5 text-[11px] font-medium transition-colors',
            periodFilter === opt.value
              ? 'border-emerald-500 bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
              : 'border-gray-300 bg-white text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300'
          ]"
        >
          {{ opt.label }}
        </button>
      </div>

      <!-- Desktop Table -->
      <div class="hidden overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm md:block dark:border-gray-800 dark:bg-gray-900">
        <table class="w-full text-left text-sm">
          <thead class="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
            <tr>
              <th class="px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">No. Jurnal</th>
              <th class="px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Tanggal</th>
              <th class="px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Keterangan</th>
              <th class="px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Referensi</th>
              <th class="px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Total</th>
              <th class="px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Status</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
            <tr
              v-for="j in filteredJournals"
              :key="j.id"
              @click="router.push(`/finance/journal/${j.id}`)"
              class="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <td class="px-4 py-3 font-mono text-xs font-bold text-blue-600 dark:text-blue-400">{{ j.journal_number }}</td>
              <td class="px-4 py-3 text-xs text-gray-600 dark:text-gray-400">{{ formatDate(j.entry_date) }}</td>
              <td class="px-4 py-3 text-xs font-medium text-gray-900 dark:text-white">{{ j.description }}</td>
              <td class="px-4 py-3">
                <span v-if="j.reference_type" class="rounded-lg px-2 py-0.5 text-[9px] font-bold uppercase" :class="getRefBadge(j.reference_type)">
                  {{ getRefLabel(j.reference_type) }}
                </span>
                <span v-else class="text-xs text-gray-400 dark:text-gray-500">—</span>
              </td>
              <td class="px-4 py-3 text-xs font-bold text-gray-900 dark:text-white">{{ formatCurrency(journalTotal(j)) }}</td>
              <td class="px-4 py-3">
                <span class="rounded-lg px-2 py-0.5 text-[9px] font-bold uppercase" :class="getStatusBadge(j.status)">
                  {{ getStatusLabel(j.status) }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Mobile Cards -->
      <div class="grid grid-cols-1 gap-2.5 md:hidden">
        <div
          v-for="j in filteredJournals"
          :key="j.id"
          @click="router.push(`/finance/journal/${j.id}`)"
          class="rounded-xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-gray-900"
        >
          <div class="mb-2 flex items-start justify-between">
            <div class="flex-1 min-w-0">
              <p class="text-xs font-bold text-gray-900 dark:text-white">{{ j.description }}</p>
              <p class="font-mono text-[10px] text-blue-600 dark:text-blue-400">{{ j.journal_number }}</p>
              <p class="text-[9px] text-gray-500 dark:text-gray-400">{{ formatDate(j.entry_date) }}</p>
            </div>
            <span class="rounded-lg px-2 py-0.5 text-[9px] font-bold uppercase" :class="getStatusBadge(j.status)">
              {{ getStatusLabel(j.status) }}
            </span>
          </div>
          <div class="flex items-center justify-between border-t border-gray-200 pt-2 dark:border-gray-700">
            <div>
              <span v-if="j.reference_type" class="rounded-lg px-2 py-0.5 text-[9px] font-bold uppercase" :class="getRefBadge(j.reference_type)">
                {{ getRefLabel(j.reference_type) }}
              </span>
            </div>
            <p class="text-xs font-bold text-gray-900 dark:text-white">{{ formatCurrency(journalTotal(j)) }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Filter Modal -->
    <div
      v-if="showFilterModal"
      class="fixed inset-0 z-50 flex items-end justify-center bg-black/50 md:items-center"
      @click.self="showFilterModal = false"
    >
      <div class="w-full max-w-md rounded-t-3xl bg-white p-6 md:rounded-2xl dark:bg-gray-900" @click.stop>
        <div class="mb-4 flex items-center justify-between">
          <h3 class="text-lg font-bold text-gray-900 dark:text-white">Filter Periode</h3>
          <button
            @click="showFilterModal = false"
            class="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="space-y-4">
          <div>
            <label class="mb-1 block text-xs text-gray-500 dark:text-gray-400">Dari Tanggal</label>
            <DateField
              v-model="tempStartDate"
              title="Tanggal Mulai"
              button-class="flex w-full items-center justify-between rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div>
            <label class="mb-1 block text-xs text-gray-500 dark:text-gray-400">Sampai Tanggal</label>
            <DateField
              v-model="tempEndDate"
              title="Tanggal Selesai"
              button-class="flex w-full items-center justify-between rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>

          <div class="flex gap-2 pt-2">
            <button
              @click="resetDateFilter"
              class="flex-1 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Reset
            </button>
            <button
              @click="applyDateFilter"
              class="flex-1 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-500"
            >
              Terapkan
            </button>
          </div>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onActivated } from 'vue'
import { useRouter } from 'vue-router'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import MobilePageHeader from '@/components/common/MobilePageHeader.vue'
import DateField from '@/components/common/DateField.vue'
import { useFinanceStore } from '@/stores/finance'
import { useAutoNavigationStack } from '@/composables/useAutoNavigationStack'
import { localDateFromIso } from '@/utils/date'
import type { JournalEntry } from '@/types/database'

const router = useRouter()
const store = useFinanceStore()

const statusFilter = ref<'semua' | 'posted'>('semua')
const statusOptions = [
  { value: 'semua', label: 'Semua' },
  { value: 'posted', label: 'Posted' },
] as const

const periodFilter = ref<string>('semua')
const periodOptions = [
  { value: 'semua', label: 'Semua' },
  { value: 'terbaru', label: 'Terbaru' },
  { value: 'hari-ini', label: 'Hari Ini' },
  { value: 'minggu-ini', label: 'Minggu Ini' },
  { value: 'bulan-ini', label: 'Bulan Ini' },
  { value: 'bulan-lalu', label: 'Bulan Lalu' },
] as const

const showFilterModal = ref(false)
const startDate = ref<string | undefined>(undefined)
const endDate = ref<string | undefined>(undefined)
const tempStartDate = ref('')
const tempEndDate = ref('')

// Auto register/unregister modal di navigation stack
useAutoNavigationStack(showFilterModal, 'journal-list-filter-modal')

const applyQuickPeriod = (period: string) => {
  periodFilter.value = period

  if (period === 'semua') {
    startDate.value = undefined
    endDate.value = undefined
    return
  }

  // Gunakan zona waktu lokal (bukan UTC)
  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth()
  const day = today.getDate()

  // Helper untuk format tanggal ke YYYY-MM-DD
  const formatDate = (date: Date) => {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  switch (period) {
    case 'terbaru':
      // 7 hari terakhir
      const sevenDaysAgo = new Date(year, month, day - 7)
      startDate.value = formatDate(sevenDaysAgo)
      endDate.value = formatDate(new Date(year, month, day))
      break

    case 'hari-ini':
      startDate.value = formatDate(new Date(year, month, day))
      endDate.value = formatDate(new Date(year, month, day))
      break

    case 'minggu-ini':
      const dayOfWeek = today.getDay()
      const startOfWeek = new Date(year, month, day - dayOfWeek)
      const endOfWeek = new Date(year, month, day + (6 - dayOfWeek))
      startDate.value = formatDate(startOfWeek)
      endDate.value = formatDate(endOfWeek)
      break

    case 'bulan-ini':
      startDate.value = formatDate(new Date(year, month, 1))
      endDate.value = formatDate(new Date(year, month + 1, 0))
      break

    case 'bulan-lalu':
      startDate.value = formatDate(new Date(year, month - 1, 1))
      endDate.value = formatDate(new Date(year, month, 0))
      break
  }
}

const filteredJournals = computed(() => {
  let journals = store.journals

  // Filter berdasarkan status
  if (statusFilter.value !== 'semua') {
    journals = journals.filter((j) => j.status === statusFilter.value)
  }

  // Filter berdasarkan rentang tanggal
  if (startDate.value || endDate.value) {
    journals = journals.filter((j) => {
      // Tanggal LOKAL dari timestamp (split('T') akan ambil bagian UTC → geser hari)
      const entryDateStr = localDateFromIso(j.entry_date)

      if (startDate.value && entryDateStr < startDate.value) return false
      if (endDate.value && entryDateStr > endDate.value) return false
      return true
    })
  }

  // Urutkan dari tanggal terbaru
  return [...journals].sort((a, b) => {
    const dateA = new Date(a.entry_date).getTime()
    const dateB = new Date(b.entry_date).getTime()
    return dateB - dateA
  })
})

const applyDateFilter = () => {
  startDate.value = tempStartDate.value || undefined
  endDate.value = tempEndDate.value || undefined
  periodFilter.value = 'semua' // Reset periode cepat saat apply manual
  showFilterModal.value = false
}

const resetDateFilter = () => {
  tempStartDate.value = ''
  tempEndDate.value = ''
  startDate.value = undefined
  endDate.value = undefined
  periodFilter.value = 'semua'
  showFilterModal.value = false
}

const journalTotal = (j: JournalEntry) => {
  return (j.lines || []).reduce((sum, l) => sum + (l.debit || 0), 0)
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value || 0)

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = { posted: 'Posted', draft: 'Draft' }
  return labels[status] || status
}

const getStatusBadge = (status: string) => {
  const badges: Record<string, string> = {
    posted: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400',
    draft: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
  }
  return badges[status] || 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400'
}

const getRefLabel = (ref: string) => {
  const labels: Record<string, string> = {
    manual: 'Manual',
    transaction: 'Penjualan',
    return: 'Retur',
    payment: 'Pembayaran',
  }
  return labels[ref] || ref
}

const getRefBadge = (ref: string) => {
  const badges: Record<string, string> = {
    manual: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400',
    transaction: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400',
    return: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400',
    payment: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400',
  }
  return badges[ref] || 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400'
}

onMounted(async () => {
  // Tampilkan semua jurnal sebagai default
  // User bisa pilih filter periode jika perlu
  await store.fetchJournals()
})

onActivated(async () => {
  // Refresh journals setiap kali halaman diaktifkan (user kembali dari halaman lain)
  // Ini memastikan jurnal baru langsung terlihat
  await store.fetchJournals()
})
</script>
