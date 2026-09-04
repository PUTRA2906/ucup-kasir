<template>
  <AdminLayout>
    <PageBreadcrumb pageTitle="Neraca" class="hidden md:block" />

    <!-- Mobile Header -->
    <MobilePageHeader title="Neraca" subtitle="Balance Sheet" @back="$router.back()">
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
        <p class="text-sm text-gray-500 dark:text-gray-400">Memuat neraca...</p>
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
          <h2 class="text-sm font-bold text-gray-900 dark:text-white">Neraca</h2>
          <p class="text-[10px] text-gray-500 dark:text-gray-400">Per {{ formatPeriod() }}</p>
        </div>
        <div
          class="rounded-xl px-3 py-2"
          :class="isBalanced ? 'border border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10' : 'border border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10'"
        >
          <p class="text-[10px] font-bold" :class="isBalanced ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'">
            {{ isBalanced ? '✓ Balance: Aset = Kewajiban + Ekuitas' : '⚠️ Tidak Balance: selisih ' + formatCurrency(Math.abs(totalAssets - totalLiabilitiesEquity)) }}
          </p>
        </div>
      </div>

      <!-- Empty -->
      <div v-if="accounts.length === 0" class="rounded-2xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-gray-900">
        <p class="text-sm text-gray-500 dark:text-gray-400">Belum ada saldo akun.</p>
      </div>

      <!-- Statement Grid -->
      <div v-else class="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <!-- Aset -->
        <div class="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div class="border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
            <div class="flex items-center justify-between">
              <h3 class="text-sm font-bold text-gray-900 dark:text-white">ASET</h3>
              <span class="text-xs font-black text-gray-900 dark:text-white">{{ formatCurrency(totalAssets) }}</span>
            </div>
          </div>
          <div class="divide-y divide-gray-200 dark:divide-gray-700">
            <div
              v-for="row in asetRows"
              :key="row.account_id"
              @click="router.push(`/finance/ledger?account=${row.account_id}`)"
              class="flex cursor-pointer items-center justify-between px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <div>
                <p class="text-xs font-medium text-gray-900 dark:text-white">{{ row.account_name }}</p>
                <p class="font-mono text-[10px] text-blue-600 dark:text-blue-400">{{ row.account_code }}</p>
              </div>
              <p class="text-xs font-bold text-gray-900 dark:text-white">{{ formatCurrency(row.balance) }}</p>
            </div>
          </div>
          <div class="border-t border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold uppercase text-gray-500 dark:text-gray-400">Total Aset</span>
              <span class="text-sm font-black text-gray-900 dark:text-white">{{ formatCurrency(totalAssets) }}</span>
            </div>
          </div>
        </div>

        <!-- Kewajiban + Ekuitas -->
        <div class="space-y-4">
          <!-- Kewajiban -->
          <div class="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div class="border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
              <div class="flex items-center justify-between">
                <h3 class="text-sm font-bold text-gray-900 dark:text-white">KEWAJIBAN</h3>
                <span class="text-xs font-black text-gray-900 dark:text-white">{{ formatCurrency(totalLiabilities) }}</span>
              </div>
            </div>
            <div v-if="liabilityRows.length === 0" class="px-4 py-4">
              <p class="text-xs text-gray-400 dark:text-gray-500">Tidak ada kewajiban.</p>
            </div>
            <div v-else class="divide-y divide-gray-200 dark:divide-gray-700">
              <div
                v-for="row in liabilityRows"
                :key="row.account_id"
                @click="router.push(`/finance/ledger?account=${row.account_id}`)"
                class="flex cursor-pointer items-center justify-between px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <div>
                  <p class="text-xs font-medium text-gray-900 dark:text-white">{{ row.account_name }}</p>
                  <p class="font-mono text-[10px] text-blue-600 dark:text-blue-400">{{ row.account_code }}</p>
                </div>
                <p class="text-xs font-bold text-gray-900 dark:text-white">{{ formatCurrency(row.balance) }}</p>
              </div>
            </div>
            <div class="border-t border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold uppercase text-gray-500 dark:text-gray-400">Total Kewajiban</span>
                <span class="text-sm font-black text-gray-900 dark:text-white">{{ formatCurrency(totalLiabilities) }}</span>
              </div>
            </div>
          </div>

          <!-- Ekuitas -->
          <div class="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div class="border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
              <div class="flex items-center justify-between">
                <h3 class="text-sm font-bold text-gray-900 dark:text-white">EKUITAS</h3>
                <span class="text-xs font-black text-gray-900 dark:text-white">{{ formatCurrency(totalEquity) }}</span>
              </div>
            </div>
            <div class="divide-y divide-gray-200 dark:divide-gray-700">
              <div
                v-for="row in equityRows"
                :key="row.account_id"
                @click="router.push(`/finance/ledger?account=${row.account_id}`)"
                class="flex cursor-pointer items-center justify-between px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <div>
                  <p class="text-xs font-medium text-gray-900 dark:text-white">{{ row.account_name }}</p>
                  <p class="font-mono text-[10px] text-blue-600 dark:text-blue-400">{{ row.account_code }}</p>
                </div>
                <p class="text-xs font-bold text-gray-900 dark:text-white">{{ formatCurrency(row.balance) }}</p>
              </div>
              <!-- Laba ditahan dari laba periode berjalan -->
              <div class="flex items-center justify-between px-4 py-2.5 bg-emerald-50/60 dark:bg-emerald-500/5">
                <div>
                  <p class="text-xs font-medium text-emerald-700 dark:text-emerald-400">Laba (Rugi) Periode Berjalan</p>
                  <p class="text-[10px] text-emerald-600/70 dark:text-emerald-500/70">dari pendapatan − beban</p>
                </div>
                <p class="text-xs font-bold text-emerald-700 dark:text-emerald-400">{{ formatCurrency(currentProfit) }}</p>
              </div>
            </div>
            <div class="border-t border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold uppercase text-gray-500 dark:text-gray-400">Total Ekuitas</span>
                <span class="text-sm font-black text-gray-900 dark:text-white">{{ formatCurrency(totalEquityWithProfit) }}</span>
              </div>
            </div>
          </div>

          <!-- Total Kewajiban + Ekuitas -->
          <div class="rounded-2xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white p-4 shadow-sm dark:border-blue-500/40 dark:from-blue-500/10 dark:to-gray-900">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Total Kewajiban + Ekuitas</span>
              <span class="text-base font-black text-blue-700 dark:text-blue-400">{{ formatCurrency(totalLiabilitiesEquity) }}</span>
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

const accounts = ref<AccountBalance[]>([])

// Kelompokkan berdasarkan tipe. Pakai saldo bertanda (bukan Math.abs):
// akun yang saldonya berlawanan normal_balance (mis. persediaan negatif) harus
// mengurangi total bagiannya, bukan dibalik jadi positif.
const asetRows = computed(() =>
  accounts.value.filter((b) => b.account_type === 'aset' && b.balance !== 0)
)
const liabilityRows = computed(() =>
  accounts.value.filter((b) => b.account_type === 'kewajiban' && b.balance !== 0)
)
const equityRows = computed(() =>
  accounts.value.filter((b) => b.account_type === 'ekuitas' && b.balance !== 0)
)

const totalAssets = computed(() => asetRows.value.reduce((s, r) => s + r.balance, 0))
const totalLiabilities = computed(() => liabilityRows.value.reduce((s, r) => s + r.balance, 0))
const totalEquity = computed(() => equityRows.value.reduce((s, r) => s + r.balance, 0))

// Laba periode berjalan = pendapatan − beban (dari saldo)
const currentProfit = computed(() => {
  const pendapatan = accounts.value
    .filter((b) => b.account_type === 'pendapatan')
    .reduce((s, r) => s + r.balance, 0)
  const beban = accounts.value
    .filter((b) => b.account_type === 'beban')
    .reduce((s, r) => s + r.balance, 0)
  return pendapatan - beban
})

const totalEquityWithProfit = computed(() => totalEquity.value + currentProfit.value)
const totalLiabilitiesEquity = computed(() => totalLiabilities.value + totalEquityWithProfit.value)
const isBalanced = computed(() => totalAssets.value === totalLiabilitiesEquity.value)

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
    accounts.value = await store.getAccountBalances(endDate.value || undefined)
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