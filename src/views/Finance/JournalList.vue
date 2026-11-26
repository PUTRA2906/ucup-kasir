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
          v-can="'finance.write'"
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
        v-can="'finance.write'"
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
              <th class="w-16 px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
            <tr
              v-for="j in paginatedJournals"
              :key="j.id"
              class="hover:bg-gray-50 dark:hover:bg-gray-800"
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
              <td class="px-4 py-3 text-right">
                <button
                  @click="handleDelete(j)"
                  :disabled="deletingId === j.id"
                  class="rounded-lg p-2 text-red-600 transition hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-500/15"
                  title="Hapus jurnal"
                >
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </td>
            </tr>
            <tr v-if="paginatedJournals.length === 0">
              <td colspan="7" class="px-4 py-8 text-center text-xs text-gray-500 dark:text-gray-400">Tidak ada jurnal pada filter ini</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Mobile Cards -->
      <div class="grid grid-cols-1 gap-2.5 md:hidden">
        <div
          v-for="j in paginatedJournals"
          :key="j.id"
          class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900"
        >
          <!-- Header -->
          <div class="flex items-start justify-between gap-2 px-3 pt-3 pb-2">
            <div class="flex-1 min-w-0">
              <p class="text-xs font-bold leading-snug text-gray-900 dark:text-white line-clamp-2">{{ j.description }}</p>
              <p class="mt-0.5 font-mono text-[10px] text-blue-600 dark:text-blue-400">{{ j.journal_number }}</p>
              <p class="text-[9px] text-gray-500 dark:text-gray-400">{{ formatDate(j.entry_date) }}</p>
            </div>
            <span class="flex-shrink-0 rounded-lg px-2 py-0.5 text-[9px] font-bold uppercase" :class="getStatusBadge(j.status)">
              {{ getStatusLabel(j.status) }}
            </span>
          </div>

          <!-- Baris akun: akun + debit + kredit -->
          <div class="border-t border-gray-200 dark:border-gray-700">
            <table class="w-full table-fixed">
              <colgroup>
                <col />
                <col class="w-[78px]" />
                <col class="w-[78px]" />
              </colgroup>
              <thead>
                <tr class="bg-gray-50 dark:bg-gray-800/60">
                  <th class="px-3 py-1.5 text-left text-[9px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Akun</th>
                  <th class="px-2 py-1.5 text-right text-[9px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Debit</th>
                  <th class="px-3 py-1.5 text-right text-[9px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Kredit</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="l in journalLines(j)"
                  :key="l.id"
                  class="border-t border-gray-100 dark:border-gray-800"
                >
                  <td class="px-3 py-1.5 align-top">
                    <p class="text-[10px] font-medium leading-tight text-gray-900 dark:text-white line-clamp-2">{{ l.account_name }}</p>
                    <p class="font-mono text-[9px] leading-tight text-blue-600 dark:text-blue-400">{{ l.account_code }}</p>
                  </td>
                  <td
                    class="px-2 py-1.5 text-right align-top text-[10px] font-bold leading-tight tabular-nums"
                    :class="l.debit ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-300 dark:text-gray-600'"
                  >
                    {{ l.debit ? formatNumber(l.debit) : '—' }}
                  </td>
                  <td
                    class="px-3 py-1.5 text-right align-top text-[10px] font-bold leading-tight tabular-nums"
                    :class="l.credit ? 'text-red-600 dark:text-red-400' : 'text-gray-300 dark:text-gray-600'"
                  >
                    {{ l.credit ? formatNumber(l.credit) : '—' }}
                  </td>
                </tr>
                <tr v-if="journalLines(j).length === 0">
                  <td colspan="3" class="px-3 py-2 text-[10px] text-gray-400 dark:text-gray-500">Tidak ada baris jurnal</td>
                </tr>
              </tbody>
              <tfoot>
                <tr class="border-t border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/60">
                  <td class="px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Total (Rp)</td>
                  <td class="px-2 py-1.5 text-right text-[10px] font-bold tabular-nums text-emerald-700 dark:text-emerald-400">{{ formatNumber(journalTotalDebit(j)) }}</td>
                  <td class="px-3 py-1.5 text-right text-[10px] font-bold tabular-nums text-red-700 dark:text-red-400">{{ formatNumber(journalTotalCredit(j)) }}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <!-- Footer -->
          <div class="flex items-center justify-between border-t border-gray-200 px-3 py-2 dark:border-gray-700">
            <span v-if="j.reference_type" class="rounded-lg px-2 py-0.5 text-[9px] font-bold uppercase" :class="getRefBadge(j.reference_type)">
              {{ getRefLabel(j.reference_type) }}
            </span>
            <span v-else class="text-[9px] text-gray-400 dark:text-gray-500">—</span>
            <button
              @click.stop="handleDelete(j)"
              :disabled="deletingId === j.id"
              class="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold text-red-600 transition active:scale-95 hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-500/15"
            >
              <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              {{ deletingId === j.id ? 'Menghapus...' : 'Hapus' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Pagination -->
      <div
        v-if="filteredJournals.length > 0"
        class="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900"
      >
        <div class="text-xs text-gray-600 dark:text-gray-400">
          {{ paginationInfo }}
        </div>
        <div class="flex items-center gap-2">
          <button
            @click="previousPage"
            :disabled="currentPage === 1"
            :class="[
              'flex h-8 w-8 items-center justify-center rounded-lg border transition active:scale-95',
              currentPage === 1
                ? 'border-gray-200 bg-gray-100 text-gray-400 dark:border-gray-800 dark:bg-gray-800'
                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
            ]"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span class="text-sm font-medium text-gray-900 dark:text-white">
            {{ currentPage }} / {{ totalPages }}
          </span>
          <button
            @click="nextPage"
            :disabled="currentPage === totalPages"
            :class="[
              'flex h-8 w-8 items-center justify-center rounded-lg border transition active:scale-95',
              currentPage === totalPages
                ? 'border-gray-200 bg-gray-100 text-gray-400 dark:border-gray-800 dark:bg-gray-800'
                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
            ]"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
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
import { ref, computed, onMounted, onActivated, watch } from 'vue'
import { useRouter } from 'vue-router'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import MobilePageHeader from '@/components/common/MobilePageHeader.vue'
import DateField from '@/components/common/DateField.vue'
import { useFinanceStore } from '@/stores/finance'
import { useAutoNavigationStack } from '@/composables/useAutoNavigationStack'
import { useConfirm } from '@/composables/useConfirm'
import { useToast } from '@/composables/useToast'
import { businessDateFromIso, parseBusinessDate } from '@/utils/date'
import type { JournalEntry } from '@/types/database'

const router = useRouter()
const store = useFinanceStore()
const { confirm } = useConfirm()
const toast = useToast()

const deletingId = ref<string | null>(null)

const handleDelete = async (j: JournalEntry) => {
  if (deletingId.value) return

  // Jurnal di periode tertutup tidak boleh dihapus
  try {
    const date = businessDateFromIso(j.entry_date)
    if (date && (await store.checkPeriodClosed(date))) {
      toast.error(
        'Periode Tertutup',
        `Jurnal ini berada di periode yang sudah ditutup (${date}). Buka kembali periode tersebut terlebih dahulu.`
      )
      return
    }
  } catch {
    // Pengecekan gagal — biarkan server menolak bila perlu.
  }

  const ok = await confirm({
    title: 'Hapus Jurnal?',
    message: `Jurnal ${j.journal_number} akan dihapus permanen dan tidak dapat dikembalikan.`,
    confirmText: 'Ya, Hapus',
    cancelText: 'Batal',
    variant: 'danger',
  })
  if (!ok) return

  deletingId.value = j.id
  try {
    await store.deleteJournal(j.id)
    toast.success('Berhasil!', 'Jurnal berhasil dihapus')
  } catch (e) {
    toast.error('Gagal!', e instanceof Error ? e.message : 'Gagal menghapus jurnal')
  } finally {
    deletingId.value = null
  }
}

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

// Pagination
const currentPage = ref(1)
const itemsPerPage = 10

const totalPages = computed(() =>
  Math.max(1, Math.ceil(filteredJournals.value.length / itemsPerPage))
)

const paginatedJournals = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  return filteredJournals.value.slice(start, start + itemsPerPage)
})

const paginationInfo = computed(() => {
  const total = filteredJournals.value.length
  if (total === 0) return '0 jurnal'
  const start = (currentPage.value - 1) * itemsPerPage + 1
  const end = Math.min(currentPage.value * itemsPerPage, total)
  return `${start}-${end} dari ${total}`
})

const nextPage = () => {
  if (currentPage.value < totalPages.value) currentPage.value++
}

const previousPage = () => {
  if (currentPage.value > 1) currentPage.value--
}

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
      // Tanggal bisnis = bagian tanggal UTC dari entry_date (lihat
      // businessDateFromIso). Konversi ke zona lokal bisa menggeser hari.
      const entryDateStr = businessDateFromIso(j.entry_date)

      if (startDate.value && entryDateStr < startDate.value) return false
      if (endDate.value && entryDateStr > endDate.value) return false
      return true
    })
  }

  // Urutkan dari tanggal terbaru, lalu waktu pembuatan terbaru
  return [...journals].sort((a, b) => {
    const dateA = new Date(a.entry_date).getTime()
    const dateB = new Date(b.entry_date).getTime()

    // Primary sort: entry_date (terbaru dulu)
    if (dateB !== dateA) {
      return dateB - dateA
    }

    // Secondary sort: created_at (terbaru dulu) untuk jurnal dengan tanggal sama
    const createdA = new Date(a.created_at).getTime()
    const createdB = new Date(b.created_at).getTime()
    return createdB - createdA
  })
})

// Kembali ke halaman 1 saat filter berubah
watch([statusFilter, startDate, endDate], () => {
  currentPage.value = 1
})

// Jaga agar currentPage tidak melebihi totalPages (mis. setelah hapus data)
watch(totalPages, (tp) => {
  if (currentPage.value > tp) currentPage.value = tp
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

const journalTotalDebit = (j: JournalEntry) => {
  return (j.lines || []).reduce((sum, l) => sum + (l.debit || 0), 0)
}

const journalTotalCredit = (j: JournalEntry) => {
  return (j.lines || []).reduce((sum, l) => sum + (l.credit || 0), 0)
}

/** Baris jurnal, urutkan debit dulu lalu kredit agar mudah dibaca di mobile. */
const journalLines = (j: JournalEntry) => {
  return [...(j.lines || [])].sort((a, b) => {
    const aDebit = a.debit || 0
    const bDebit = b.debit || 0
    if (aDebit && !bDebit) return -1
    if (!aDebit && bDebit) return 1
    return 0
  })
}

/** Angka tanpa simbol mata uang (kolom tabel sempit). */
const formatNumber = (value: number) =>
  new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(value || 0)

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value || 0)

const formatDate = (dateString: string) => {
  // `entry_date` = tanggal_bisnis + jam, jadi bagian tanggal UTC adalah
  // tanggal bisnis. `new Date(...)` akan menggesernya di zona > UTC.
  const d = parseBusinessDate(dateString)
  return d
    ? d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
    : dateString
}

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
    void: 'Void',
    purchase: 'Pembelian',
    purchase_payment: 'Bayar Utang',
    purchase_return: 'Retur Beli',
    payroll: 'Gaji',
    closing: 'Tutup Buku',
    reclassify: 'Reklasifikasi',
    stock_adjustment: 'Adj. Stok',
    adjusting: 'Penyesuaian',
  }
  return labels[ref] || ref
}

const getRefBadge = (ref: string) => {
  const badges: Record<string, string> = {
    manual: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400',
    transaction: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400',
    return: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400',
    payment: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400',
    void: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400',
    purchase: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
    purchase_payment: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
    purchase_return: 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400',
    payroll: 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-400',
    closing: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400',
    reclassify: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400',
    stock_adjustment: 'bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-400',
    adjusting: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
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
