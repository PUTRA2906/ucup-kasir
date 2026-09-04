<template>
  <AdminLayout>
    <PageBreadcrumb pageTitle="Detail Jurnal" class="hidden md:block" />

    <!-- Mobile Header -->
    <MobilePageHeader title="Detail Jurnal" :subtitle="journal?.journal_number" @back="router.back()" />

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-20">
      <div class="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-500/30 dark:bg-red-500/10">
      <p class="text-sm text-red-600 dark:text-red-400">{{ error }}</p>
    </div>

    <!-- Not Found -->
    <div v-else-if="!journal" class="rounded-2xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-gray-900">
      <p class="text-sm text-gray-500 dark:text-gray-400">Jurnal tidak ditemukan</p>
    </div>

    <!-- Content -->
    <template v-else>
      <!-- Header Card -->
      <div class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <p class="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">No. Jurnal</p>
            <p class="font-mono text-sm font-bold text-blue-600 dark:text-blue-400">{{ journal.journal_number }}</p>
          </div>
          <div>
            <p class="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Tanggal</p>
            <p class="text-sm font-bold text-gray-900 dark:text-white">{{ formatDate(journal.entry_date) }}</p>
          </div>
          <div class="col-span-2">
            <p class="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Keterangan</p>
            <p class="text-sm font-bold text-gray-900 dark:text-white">{{ journal.description }}</p>
          </div>
          <div>
            <p class="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Status</p>
            <span class="rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase" :class="getStatusBadge(journal.status)">
              {{ getStatusLabel(journal.status) }}
            </span>
          </div>
          <div>
            <p class="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Referensi</p>
            <span v-if="journal.reference_type" class="rounded-lg px-2 py-0.5 text-[9px] font-bold uppercase" :class="getRefBadge(journal.reference_type)">
              {{ getRefLabel(journal.reference_type) }}
            </span>
            <span v-else class="text-sm text-gray-400 dark:text-gray-500">—</span>
          </div>
        </div>
      </div>

      <!-- Lines Table (Desktop) -->
      <div class="hidden overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm md:block dark:border-gray-800 dark:bg-gray-900">
        <div class="border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
          <h3 class="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Baris Jurnal</h3>
        </div>
        <table class="w-full text-left text-sm">
          <thead class="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
            <tr>
              <th class="px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Akun</th>
              <th class="px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Kode</th>
              <th class="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Debit</th>
              <th class="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Kredit</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
            <tr v-for="l in journal.lines" :key="l.id" class="hover:bg-gray-50 dark:hover:bg-gray-800">
              <td class="px-4 py-3 text-xs font-medium text-gray-900 dark:text-white">{{ l.account_name }}</td>
              <td class="px-4 py-3 font-mono text-xs text-blue-600 dark:text-blue-400">{{ l.account_code }}</td>
              <td class="px-4 py-3 text-right text-xs font-bold text-emerald-600 dark:text-emerald-400">{{ l.debit ? formatCurrency(l.debit) : '-' }}</td>
              <td class="px-4 py-3 text-right text-xs font-bold text-red-600 dark:text-red-400">{{ l.credit ? formatCurrency(l.credit) : '-' }}</td>
            </tr>
          </tbody>
          <tfoot class="border-t border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
            <tr>
              <td class="px-4 py-3 text-xs font-bold text-gray-700 dark:text-gray-300" colspan="2">Total</td>
              <td class="px-4 py-3 text-right text-xs font-bold text-emerald-700 dark:text-emerald-400">{{ formatCurrency(journalTotal) }}</td>
              <td class="px-4 py-3 text-right text-xs font-bold text-red-700 dark:text-red-400">{{ formatCurrency(journalTotal) }}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <!-- Lines Cards (Mobile) -->
      <div class="rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm md:hidden dark:border-gray-800 dark:bg-gray-900">
        <div class="mb-2.5 border-b border-gray-200 pb-2 dark:border-gray-700">
          <h3 class="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Baris Jurnal</h3>
        </div>
        <div class="space-y-2">
          <div
            v-for="l in journal.lines"
            :key="l.id"
            class="rounded-xl border border-gray-200 bg-gray-50 p-2.5 dark:border-gray-700 dark:bg-gray-800"
          >
            <div class="flex items-start justify-between gap-2">
              <div class="flex-1 min-w-0">
                <p class="truncate text-xs font-medium text-gray-900 dark:text-white">{{ l.account_name }}</p>
                <p class="font-mono text-[10px] text-blue-600 dark:text-blue-400">{{ l.account_code }}</p>
              </div>
              <div class="flex-shrink-0 text-right">
                <p v-if="l.debit" class="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                  D: {{ formatCurrency(l.debit) }}
                </p>
                <p v-if="l.credit" class="text-[11px] font-bold text-red-600 dark:text-red-400">
                  K: {{ formatCurrency(l.credit) }}
                </p>
                <p v-if="!l.debit && !l.credit" class="text-[11px] text-gray-400 dark:text-gray-500">—</p>
              </div>
            </div>
          </div>
          <div class="flex items-center justify-between border-t border-gray-200 pt-2 dark:border-gray-700">
            <span class="text-[10px] font-bold uppercase text-gray-500 dark:text-gray-400">Total</span>
            <div class="text-right">
              <p class="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">D: {{ formatCurrency(journalTotal) }}</p>
              <p class="text-[11px] font-bold text-red-600 dark:text-red-400">K: {{ formatCurrency(journalTotal) }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex gap-2">
        <button
          @click="router.back()"
          class="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          Kembali
        </button>
        <button
          v-if="journal.status === 'posted'"
          @click="handleVoid"
          class="flex-1 rounded-xl border border-red-500 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
        >
          Void Jurnal
        </button>
      </div>
    </template>
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import MobilePageHeader from '@/components/common/MobilePageHeader.vue'
import { useFinanceStore } from '@/stores/finance'
import type { JournalEntry } from '@/types/database'

const router = useRouter()
const route = useRoute()
const store = useFinanceStore()

const loading = ref(true)
const error = ref<string | null>(null)
const journal = ref<JournalEntry | null>(null)

const journalTotal = computed(() => {
  return (journal.value?.lines || []).reduce((s, l) => s + (l.debit || 0), 0)
})

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', maximumFractionDigits: 0,
  }).format(value || 0)

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })

const getStatusLabel = (s: string) => {
  const labels: Record<string, string> = { posted: 'Posted', draft: 'Draft', void: 'Void' }
  return labels[s] || s
}

const getStatusBadge = (s: string) => {
  const badges: Record<string, string> = {
    posted: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400',
    draft: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
    void: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400',
  }
  return badges[s] || 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400'
}

const getRefLabel = (r: string) => {
  const labels: Record<string, string> = {
    manual: 'Manual', transaction: 'Penjualan', return: 'Retur',
    payment: 'Pembayaran', void: 'Pembatalan',
  }
  return labels[r] || r
}

const getRefBadge = (r: string) => {
  const badges: Record<string, string> = {
    manual: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400',
    transaction: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400',
    return: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400',
    payment: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400',
    void: 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400',
  }
  return badges[r] || 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400'
}

const handleVoid = async () => {
  if (!confirm('Void jurnal ini? Data tetap tersimpan tapi status menjadi void.')) return
  try {
    await store.voidJournal(journal.value!.id)
    journal.value!.status = 'void'
  } catch (e: any) {
    error.value = e.message
  }
}

onMounted(async () => {
  try {
    const id = route.params.id as string
    journal.value = await store.getJournal(id)
  } catch (e: any) {
    error.value = e.message
  } finally {
    loading.value = false
  }
})
</script>