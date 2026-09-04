<template>
  <AdminLayout>
    <PageBreadcrumb pageTitle="Neraca Saldo" class="hidden md:block" />

    <!-- Mobile Header -->
    <MobilePageHeader title="Neraca Saldo" subtitle="Trial Balance" @back="$router.back()">
      <template #actions>
        <button
          @click="showFilterModal = true"
          class="flex h-8 w-8 items-center justify-center rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-white/[0.03]"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </button>
      </template>
    </MobilePageHeader>

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center py-20">
      <div class="text-center">
        <div class="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
        <p class="text-sm text-gray-500 dark:text-gray-400">Memuat neraca saldo...</p>
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-500/30 dark:bg-red-500/10">
      <p class="text-sm text-red-600 dark:text-red-400">{{ error }}</p>
    </div>

    <!-- Content -->
    <template v-else>
      <!-- Header Card -->
      <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="text-sm font-bold text-gray-900 dark:text-white">Neraca Saldo</h2>
          <p class="text-[10px] text-gray-500 dark:text-gray-400">Per {{ formatPeriod() }}</p>
        </div>
        <div v-if="!balanced" class="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-500/30 dark:bg-amber-500/10">
          <p class="text-[10px] font-bold text-amber-700 dark:text-amber-400">
            ⚠️ Tidak Balance: selisih {{ formatCurrency(totalDebit - totalCredit) }}
          </p>
        </div>
        <div v-else class="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 dark:border-emerald-500/30 dark:bg-emerald-500/10">
          <p class="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">✓ Balance</p>
        </div>
      </div>

      <!-- Empty -->
      <div v-if="rows.length === 0" class="rounded-2xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-gray-900">
        <p class="text-sm text-gray-500 dark:text-gray-400">Belum ada saldo akun.</p>
      </div>

      <!-- Content (Desktop + Mobile) -->
      <div v-else>
        <!-- Table (Desktop) -->
        <div class="hidden overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm md:block dark:border-gray-800 dark:bg-gray-900">
        <table class="w-full text-left text-sm">
          <thead class="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
            <tr>
              <th class="px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Kode</th>
              <th class="px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Nama Akun</th>
              <th class="px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Tipe</th>
              <th class="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Debit</th>
              <th class="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Kredit</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
            <tr
              v-for="row in rows"
              :key="row.account_id"
              @click="router.push(`/finance/ledger?account=${row.account_id}`)"
              class="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <td class="px-4 py-3 font-mono text-xs font-bold text-blue-600 dark:text-blue-400">{{ row.account_code }}</td>
              <td class="px-4 py-3 text-xs font-medium text-gray-900 dark:text-white">{{ row.account_name }}</td>
              <td class="px-4 py-3">
                <span class="rounded-lg px-2 py-0.5 text-[9px] font-bold uppercase" :class="getTypeBadge(row.account_type)">
                  {{ getTypeLabel(row.account_type) }}
                </span>
              </td>
              <td class="px-4 py-3 text-right text-xs font-bold text-emerald-600 dark:text-emerald-400">{{ row.debit ? formatCurrency(row.debit) : '-' }}</td>
              <td class="px-4 py-3 text-right text-xs font-bold text-red-600 dark:text-red-400">{{ row.credit ? formatCurrency(row.credit) : '-' }}</td>
            </tr>
          </tbody>
          <tfoot class="border-t border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
            <tr>
              <td class="px-4 py-3 text-xs font-bold text-gray-700 dark:text-gray-300" colspan="3">Total</td>
              <td class="px-4 py-3 text-right text-xs font-bold text-emerald-700 dark:text-emerald-400">{{ formatCurrency(totalDebit) }}</td>
              <td class="px-4 py-3 text-right text-xs font-bold text-red-700 dark:text-red-400">{{ formatCurrency(totalCredit) }}</td>
            </tr>
          </tfoot>
        </table>
      </div>

        <!-- Mobile Cards -->
        <div class="rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm md:hidden dark:border-gray-800 dark:bg-gray-900">
        <div class="mb-2.5 border-b border-gray-200 pb-2 dark:border-gray-700">
          <h3 class="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Neraca Saldo</h3>
        </div>
        <div class="space-y-2">
          <div
            v-for="row in rows"
            :key="row.account_id"
            @click="router.push(`/finance/ledger?account=${row.account_id}`)"
            class="cursor-pointer rounded-xl border border-gray-200 bg-gray-50 p-2.5 dark:border-gray-700 dark:bg-gray-800"
          >
            <div class="flex items-start justify-between gap-2">
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-1.5">
                  <p class="truncate text-xs font-medium text-gray-900 dark:text-white">{{ row.account_name }}</p>
                  <span class="rounded-lg px-1.5 py-0.5 text-[9px] font-bold uppercase flex-shrink-0" :class="getTypeBadge(row.account_type)">
                    {{ getTypeLabel(row.account_type) }}
                  </span>
                </div>
                <p class="font-mono text-[10px] text-blue-600 dark:text-blue-400">{{ row.account_code }}</p>
              </div>
              <div class="flex-shrink-0 text-right">
                <p v-if="row.debit" class="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                  D: {{ formatCurrency(row.debit) }}
                </p>
                <p v-if="row.credit" class="text-[11px] font-bold text-red-600 dark:text-red-400">
                  K: {{ formatCurrency(row.credit) }}
                </p>
              </div>
            </div>
          </div>
        </div>
        <div class="mt-2.5 flex items-center justify-between border-t border-gray-200 pt-2.5 dark:border-gray-700">
          <span class="text-[10px] font-bold uppercase text-gray-500 dark:text-gray-400">Total</span>
          <div class="text-right">
            <p class="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">D: {{ formatCurrency(totalDebit) }}</p>
            <p class="text-[11px] font-bold text-red-700 dark:text-red-400">K: {{ formatCurrency(totalCredit) }}</p>
          </div>
        </div>
        </div>
      </div>
    </template>

    <!-- Filter Modal -->
    <div
      v-if="showFilterModal"
      class="fixed inset-0 z-50 flex items-end justify-center bg-black/50 md:items-center"
      @click.self="showFilterModal = false"
    >
      <div class="w-full max-w-md rounded-t-3xl bg-white p-6 md:rounded-2xl dark:bg-gray-900" @click.stop>
        <div class="mb-4 flex items-center justify-between">
          <h3 class="text-lg font-bold text-gray-900 dark:text-white">Filter Tanggal</h3>
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
            <label class="mb-1 block text-xs text-gray-500 dark:text-gray-400">Sampai Tanggal</label>
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
import { useRouter } from 'vue-router'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import MobilePageHeader from '@/components/common/MobilePageHeader.vue'
import { useFinanceStore } from '@/stores/finance'
import type { AccountBalance } from '@/types/database'

const router = useRouter()
const store = useFinanceStore()

const loading = ref(false)
const error = ref<string | null>(null)
const showFilterModal = ref(false)

const endDate = ref<string | undefined>(undefined)
const tempEnd = ref('')

const balances = ref<AccountBalance[]>([])

// Trial balance: saldo positif akun normal_debit → debit,
// saldo positif akun normal_kredit → kredit,
// saldo negatif (kebalikan) → ditempatkan di kolom sebaliknya
const rows = computed(() =>
  balances.value
    .filter((b) => b.balance !== 0)
    .map((b) => ({
      ...b,
      debit: b.normal_balance === 'debit' ? (b.balance > 0 ? b.balance : 0) : (b.balance < 0 ? Math.abs(b.balance) : 0),
      credit: b.normal_balance === 'kredit' ? (b.balance > 0 ? b.balance : 0) : (b.balance < 0 ? Math.abs(b.balance) : 0),
    }))
)

const totalDebit = computed(() => rows.value.reduce((s, r) => s + r.debit, 0))
const totalCredit = computed(() => rows.value.reduce((s, r) => s + r.credit, 0))
const balanced = computed(() => totalDebit.value === totalCredit.value)

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

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', maximumFractionDigits: 0,
  }).format(value || 0)

const formatPeriod = () => {
  if (!endDate.value) return 'Semua Periode'
  return new Date(endDate.value).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

const fetchData = async () => {
  loading.value = true
  error.value = null
  try {
    balances.value = await store.getAccountBalances(endDate.value || undefined)
  } catch (e: any) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

const applyFilter = () => {
  endDate.value = tempEnd.value || undefined
  showFilterModal.value = false
  fetchData()
}

const resetFilter = () => {
  tempEnd.value = ''
  endDate.value = undefined
  showFilterModal.value = false
  fetchData()
}

onMounted(fetchData)
</script>