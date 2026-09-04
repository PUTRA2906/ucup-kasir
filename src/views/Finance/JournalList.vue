<template>
  <AdminLayout>
    <PageBreadcrumb pageTitle="Jurnal Umum" class="hidden md:block" />

    <!-- Mobile Header -->
    <MobilePageHeader title="Jurnal Umum" subtitle="Pencatatan Transaksi Keuangan" @back="$router.back()">
      <template #actions>
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
      <div></div>
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
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import MobilePageHeader from '@/components/common/MobilePageHeader.vue'
import { useFinanceStore } from '@/stores/finance'
import type { JournalEntry } from '@/types/database'

const router = useRouter()
const store = useFinanceStore()

const statusFilter = ref<'semua' | 'posted' | 'void'>('semua')
const statusOptions = [
  { value: 'semua', label: 'Semua' },
  { value: 'posted', label: 'Posted' },
  { value: 'void', label: 'Void' },
] as const

const filteredJournals = computed(() => {
  if (statusFilter.value === 'semua') return store.journals
  return store.journals.filter((j) => j.status === statusFilter.value)
})

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
  const labels: Record<string, string> = { posted: 'Posted', draft: 'Draft', void: 'Void' }
  return labels[status] || status
}

const getStatusBadge = (status: string) => {
  const badges: Record<string, string> = {
    posted: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400',
    draft: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
    void: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400',
  }
  return badges[status] || 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400'
}

const getRefLabel = (ref: string) => {
  const labels: Record<string, string> = {
    manual: 'Manual',
    transaction: 'Penjualan',
    return: 'Retur',
    payment: 'Pembayaran',
    void: 'Pembatalan',
  }
  return labels[ref] || ref
}

const getRefBadge = (ref: string) => {
  const badges: Record<string, string> = {
    manual: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400',
    transaction: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400',
    return: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400',
    payment: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400',
    void: 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400',
  }
  return badges[ref] || 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400'
}

onMounted(async () => {
  if (store.journals.length === 0) {
    await store.fetchJournals()
  }
})
</script>
