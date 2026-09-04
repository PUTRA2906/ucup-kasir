<template>
  <AdminLayout>
    <PageBreadcrumb pageTitle="Buku Besar" class="hidden md:block" />

    <!-- Mobile Header -->
    <MobilePageHeader title="Buku Besar" subtitle="Riwayat Saldo Per Akun" @back="$router.back()">
      <template #actions>
        <button
          @click="showAccountModal = true"
          class="flex h-8 w-8 items-center justify-center rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-white/[0.03]"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
        </button>
      </template>
    </MobilePageHeader>

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center py-20">
      <div class="text-center">
        <div class="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
        <p class="text-sm text-gray-500 dark:text-gray-400">Memuat buku besar...</p>
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-500/30 dark:bg-red-500/10">
      <p class="text-sm text-red-600 dark:text-red-400">{{ error }}</p>
    </div>

    <!-- Content -->
    <template v-else>
      <!-- Account Selector (Desktop) -->
      <div class="mb-4 hidden items-center justify-between gap-3 md:flex">
        <div class="relative w-full max-w-md">
          <select
            :value="selectedAccount?.id || ''"
            @change="handleAccountSelect(($event.target as HTMLSelectElement).value)"
            class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          >
            <option value="" disabled>Pilih akun...</option>
            <option v-for="acc in store.accounts" :key="acc.id" :value="acc.id">
              {{ acc.code }} — {{ acc.name }}
            </option>
          </select>
        </div>
        <div class="flex items-center gap-2">
          <button
            @click="showFilterModal = true"
            class="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Filter Tanggal
          </button>
        </div>
      </div>

      <!-- Selected Account Info -->
      <div v-if="selectedAccount" class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div class="flex items-start justify-between">
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-black" :class="getTypeBg(selectedAccount.type)">
              {{ selectedAccount.code.split('-')[1] }}
            </div>
            <div>
              <p class="text-sm font-bold text-gray-900 dark:text-white">{{ selectedAccount.name }}</p>
              <div class="flex items-center gap-2">
                <span class="font-mono text-[10px] text-blue-600 dark:text-blue-400">{{ selectedAccount.code }}</span>
                <span class="rounded-lg px-2 py-0.5 text-[9px] font-bold uppercase" :class="getTypeBadge(selectedAccount.type)">
                  {{ getTypeLabel(selectedAccount.type) }}
                </span>
              </div>
            </div>
          </div>
          <div class="text-right">
            <p class="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Saldo Akhir</p>
            <p class="text-lg font-black" :class="ledgerNormalizedBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'">
              {{ formatCurrency(ledgerEndingBalance) }}
            </p>
            <p v-if="startDate" class="text-[9px] text-gray-400 dark:text-gray-500">
              Awal: {{ formatCurrency(ledger.balance) }}
            </p>
            <span
              class="mt-1.5 inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[9px] font-bold uppercase"
              :class="accountBalanced
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
                : 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400'"
            >
              {{ accountBalanced ? '✓ Balance' : '✗ Tidak Balance' }}
            </span>
          </div>
        </div>
      </div>

      <!-- Empty (no account selected) -->
      <div v-if="!selectedAccount" class="rounded-2xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-gray-900">
        <div class="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10">
          <svg class="h-7 w-7 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 class="text-sm font-bold text-gray-900 dark:text-white">Pilih akun untuk melihat buku besar</h3>
        <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Pilih akun dari daftar di atas (desktop) atau tombol ikon di pojok kanan atas (mobile).</p>
      </div>

      <!-- Ledger Table (Desktop) -->
      <template v-else>
        <div class="hidden overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm md:block dark:border-gray-800 dark:bg-gray-900">
          <table class="w-full text-left text-sm">
            <thead class="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
              <tr>
                <th class="px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Tanggal</th>
                <th class="px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Keterangan</th>
                <th class="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Debit</th>
                <th class="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Kredit</th>
                <th class="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Saldo</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
              <tr
                v-for="(entry, i) in ledger.entries"
                :key="i"
                class="hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <td class="px-4 py-3 text-xs text-gray-600 dark:text-gray-400">{{ formatDate(entry.entry_date) }}</td>
                <td class="px-4 py-3 text-xs font-medium text-gray-900 dark:text-white">
                  {{ entry.description }}
                  <span v-if="entry.reference_type" class="ml-1 rounded-lg px-1.5 py-0.5 text-[9px] font-bold uppercase" :class="getRefBadge(entry.reference_type)">
                    {{ getRefLabel(entry.reference_type) }}
                  </span>
                </td>
                <td class="px-4 py-3 text-right text-xs font-bold text-emerald-600 dark:text-emerald-400">{{ entry.debit ? formatCurrency(entry.debit) : '-' }}</td>
                <td class="px-4 py-3 text-right text-xs font-bold text-red-600 dark:text-red-400">{{ entry.credit ? formatCurrency(entry.credit) : '-' }}</td>
                <td class="px-4 py-3 text-right text-xs font-bold" :class="normalizeBalance(entry.balance) >= 0 ? 'text-gray-900 dark:text-white' : 'text-red-600 dark:text-red-400'">{{ formatCurrency(entry.balance) }}</td>
              </tr>
              <tr v-if="ledger.entries.length === 0">
                <td colspan="5" class="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                  Belum ada transaksi di akun ini.
                </td>
              </tr>
            </tbody>
            <tfoot class="border-t border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
              <tr>
                <td class="px-4 py-3 text-xs font-bold text-gray-700 dark:text-gray-300" colspan="2">Total</td>
                <td class="px-4 py-3 text-right text-xs font-bold text-emerald-700 dark:text-emerald-400">{{ formatCurrency(ledgerTotalDebit) }}</td>
                <td class="px-4 py-3 text-right text-xs font-bold text-red-700 dark:text-red-400">{{ formatCurrency(ledgerTotalCredit) }}</td>
                <td class="px-4 py-3 text-right text-xs font-bold text-gray-900 dark:text-white">{{ formatCurrency(ledgerEndingBalance) }}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <!-- Ledger Cards (Mobile) -->
        <div class="rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm md:hidden dark:border-gray-800 dark:bg-gray-900">
          <div class="mb-2.5 border-b border-gray-200 pb-2 dark:border-gray-700">
            <h3 class="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Riwayat Transaksi</h3>
          </div>
          <div v-if="ledger.entries.length === 0" class="py-6 text-center">
            <p class="text-sm text-gray-500 dark:text-gray-400">Belum ada transaksi di akun ini.</p>
          </div>
          <div v-else class="space-y-2">
            <div
              v-for="(entry, i) in ledger.entries"
              :key="i"
              class="rounded-xl border border-gray-200 bg-gray-50 p-2.5 dark:border-gray-700 dark:bg-gray-800"
            >
              <div class="mb-1.5 flex items-start justify-between gap-2">
                <div class="flex-1 min-w-0">
                  <p class="truncate text-xs font-medium text-gray-900 dark:text-white">{{ entry.description }}</p>
                  <div class="mt-0.5 flex items-center gap-1.5">
                    <p class="text-[9px] text-gray-500 dark:text-gray-400">{{ formatDate(entry.entry_date) }}</p>
                    <span v-if="entry.reference_type" class="rounded-lg px-1.5 py-0.5 text-[9px] font-bold uppercase" :class="getRefBadge(entry.reference_type)">
                      {{ getRefLabel(entry.reference_type) }}
                    </span>
                  </div>
                </div>
                <div class="flex-shrink-0 text-right">
                  <p class="text-[11px] font-bold" :class="normalizeBalance(entry.balance) >= 0 ? 'text-gray-900 dark:text-white' : 'text-red-600 dark:text-red-400'">
                    {{ formatCurrency(entry.balance) }}
                  </p>
                </div>
              </div>
              <div class="flex items-center justify-between border-t border-gray-200 pt-1.5 dark:border-gray-700">
                <p v-if="entry.debit" class="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                  D: {{ formatCurrency(entry.debit) }}
                </p>
                <p v-else class="text-[10px] text-gray-400 dark:text-gray-500">D: —</p>
                <p v-if="entry.credit" class="text-[10px] font-bold text-red-600 dark:text-red-400">
                  K: {{ formatCurrency(entry.credit) }}
                </p>
                <p v-else class="text-[10px] text-gray-400 dark:text-gray-500">K: —</p>
              </div>
            </div>
            <div class="border-t border-gray-200 pt-2 dark:border-gray-700">
              <div class="flex items-center justify-between">
                <span class="text-[10px] font-bold uppercase text-gray-500 dark:text-gray-400">Total</span>
                <div class="flex items-center gap-3">
                  <p class="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                    D: {{ formatCurrency(ledgerTotalDebit) }}
                  </p>
                  <p class="text-[11px] font-bold text-red-600 dark:text-red-400">
                    K: {{ formatCurrency(ledgerTotalCredit) }}
                  </p>
                </div>
              </div>
            </div>
            <div class="flex items-center justify-between border-t border-gray-200 pt-2 dark:border-gray-700">
              <span class="text-[10px] font-bold uppercase text-gray-500 dark:text-gray-400">Saldo Akhir</span>
              <p class="text-[11px] font-bold" :class="ledgerNormalizedBalance >= 0 ? 'text-gray-900 dark:text-white' : 'text-red-600 dark:text-red-400'">
                {{ formatCurrency(ledgerEndingBalance) }}
              </p>
            </div>
            <div class="mt-2 flex items-center justify-center">
              <span
                class="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[9px] font-bold uppercase"
                :class="accountBalanced
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
                  : 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400'"
              >
                {{ accountBalanced ? '✓ Balance' : '✗ Tidak Balance' }}
              </span>
            </div>
          </div>
        </div>
      </template>
    </template>

    <!-- Account Modal (Mobile) -->
    <div
      v-if="showAccountModal"
      class="fixed inset-0 z-50 flex items-end justify-center bg-black/50 md:items-center"
      @click.self="showAccountModal = false"
    >
      <div class="w-full max-w-md rounded-t-3xl bg-white p-6 md:rounded-2xl dark:bg-gray-900" @click.stop>
        <div class="mb-4 flex items-center justify-between">
          <h3 class="text-lg font-bold text-gray-900 dark:text-white">Pilih Akun</h3>
          <button
            @click="showAccountModal = false"
            class="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="max-h-[60vh] space-y-1.5 overflow-y-auto">
          <button
            v-for="acc in store.accounts"
            :key="acc.id"
            @click="handleAccountSelect(acc.id)"
            class="flex w-full items-center justify-between rounded-xl border border-gray-200 px-3 py-2.5 text-left hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
            :class="acc.id === selectedAccount?.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10' : ''"
          >
            <div class="flex items-center gap-2.5">
              <span class="rounded-lg px-2 py-0.5 text-[9px] font-bold uppercase" :class="getTypeBadge(acc.type)">
                {{ getTypeLabel(acc.type) }}
              </span>
              <div>
                <p class="text-xs font-medium text-gray-900 dark:text-white">{{ acc.name }}</p>
                <p class="font-mono text-[10px] text-blue-600 dark:text-blue-400">{{ acc.code }}</p>
              </div>
            </div>
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
          <h3 class="text-lg font-bold text-gray-900 dark:text-white">Filter Rentang Tanggal</h3>
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
            <label class="mb-1 block text-xs text-gray-500 dark:text-gray-400">Dari</label>
            <input
              type="date"
              v-model="tempStart"
              class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div>
            <label class="mb-1 block text-xs text-gray-500 dark:text-gray-400">Sampai</label>
            <input
              type="date"
              v-model="tempEnd"
              class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>

          <div class="flex gap-2 pt-2">
            <button
              @click="resetFilter"
              class="flex-1 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Reset
            </button>
            <button
              @click="applyFilter"
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
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import MobilePageHeader from '@/components/common/MobilePageHeader.vue'
import { useFinanceStore } from '@/stores/finance'
import type { Account } from '@/types/database'

const router = useRouter()
const route = useRoute()
const store = useFinanceStore()

const loading = ref(false)
const error = ref<string | null>(null)

const selectedAccount = ref<Account | null>(null)
const ledger = ref<any>({ balance: 0, entries: [] })

const showAccountModal = ref(false)
const showFilterModal = ref(false)

// Date filter state
const startDate = ref<string | undefined>(undefined)
const endDate = ref<string | undefined>(undefined)
const tempStart = ref('')
const tempEnd = ref('')

const ledgerTotalDebit = computed(() =>
  ledger.value.entries.reduce((s: number, e: any) => s + (e.debit || 0), 0)
)
const ledgerTotalCredit = computed(() =>
  ledger.value.entries.reduce((s: number, e: any) => s + (e.credit || 0), 0)
)

// Saldo akhir = saldo awal + mutasi dalam rentang (atau saldo baris terakhir)
const ledgerEndingBalance = computed(() => {
  const entries = ledger.value.entries || []
  if (entries.length > 0) {
    return entries[entries.length - 1].balance
  }
  return ledger.value.balance || 0
})

// Normalisasi saldo ke arah normal akun:
//   aset/beban  → saldo debit = positif normal
//   kewajiban/ekuitas/pendapatan → saldo kredit = positif normal
const normalizeBalance = (value: number) => {
  if (!selectedAccount.value) return value
  return selectedAccount.value.normal_balance === 'debit' ? value : -value
}

const ledgerNormalizedBalance = computed(() => normalizeBalance(ledgerEndingBalance.value))

// Balance = saldo akhir searah dengan normal akun (positif setelah normalisasi)
const accountBalanced = computed(() => ledgerNormalizedBalance.value >= 0)

const getTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    aset: 'Aset', kewajiban: 'Kewajiban', ekuitas: 'Ekuitas',
    pendapatan: 'Pendapatan', beban: 'Beban',
  }
  return labels[type] || type
}

const getTypeBadge = (type: string) => {
  const badges: Record<string, string> = {
    aset: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400',
    kewajiban: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
    ekuitas: 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400',
    pendapatan: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400',
    beban: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400',
  }
  return badges[type] || 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400'
}

const getTypeBg = (type: string) => {
  const bgs: Record<string, string> = {
    aset: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    kewajiban: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    ekuitas: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
    pendapatan: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    beban: 'bg-red-500/10 text-red-600 dark:text-red-400',
  }
  return bgs[type] || 'bg-gray-500/10 text-gray-600'
}

const getRefLabel = (ref: string) => {
  const labels: Record<string, string> = {
    manual: 'Manual', transaction: 'Penjualan', return: 'Retur',
    payment: 'Pembayaran', void: 'Pembatalan',
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

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', maximumFractionDigits: 0,
  }).format(value || 0)

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })

const fetchLedger = async () => {
  if (!selectedAccount.value) return
  loading.value = true
  error.value = null
  try {
    ledger.value = await store.getLedger(
      selectedAccount.value.id,
      startDate.value || undefined,
      endDate.value || undefined
    )
  } catch (e: any) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

const handleAccountSelect = async (accountId: string) => {
  if (!accountId) return
  selectedAccount.value = store.accounts.find((a) => a.id === accountId) || null
  showAccountModal.value = false
  if (selectedAccount.value) {
    await fetchLedger()
  }
}

const applyFilter = () => {
  startDate.value = tempStart.value || undefined
  endDate.value = tempEnd.value || undefined
  showFilterModal.value = false
  fetchLedger()
}

const resetFilter = () => {
  tempStart.value = ''
  tempEnd.value = ''
  startDate.value = undefined
  endDate.value = undefined
  showFilterModal.value = false
  fetchLedger()
}

onMounted(async () => {
  loading.value = true
  try {
    if (store.accounts.length === 0) {
      await store.fetchAccounts()
    }
    // Support ?account= param (account_id or 'piutang' shortcut)
    const accountParam = route.query.account as string | undefined
    if (accountParam) {
      let acc: Account | null = null
      if (accountParam === 'piutang') {
        acc = store.accounts.find((a) => a.code === '1-1100') || null
      } else {
        acc = store.accounts.find((a) => a.id === accountParam) || null
      }
      if (acc) {
        selectedAccount.value = acc
        await fetchLedger()
      }
    }
  } catch (e: any) {
    error.value = e.message
  } finally {
    loading.value = false
  }
})
</script>