<template>
  <AdminLayout>
    <PageBreadcrumb pageTitle="Dashboard Keuangan" class="hidden md:block" />

    <!-- Mobile Header -->
    <MobilePageHeader title="Dashboard Keuangan" subtitle="Ringkasan Pembukuan &amp; Arus Kas" @back="$router.back()">
      <template #actions>
        <button
          @click="showFilterModal = true"
          class="flex h-8 w-8 items-center justify-center rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-white/[0.03]"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
        </button>
      </template>
    </MobilePageHeader>

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center py-20">
      <div class="text-center">
        <div class="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
        <p class="text-sm text-gray-500 dark:text-gray-400">Memuat data keuangan...</p>
      </div>
    </div>

    <!-- Content -->
    <div v-else class="space-y-4 pb-6">
      <!-- Filter Pills (Mobile) -->
      <div class="flex items-center gap-2 overflow-x-auto pb-2 md:hidden">
        <button
          @click="showFilterModal = true"
          class="flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 whitespace-nowrap dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
        >
          <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {{ formatDateRange() }}
        </button>
      </div>

      <!-- Summary Cards (Mobile 2 Kolom) -->
      <div class="grid grid-cols-2 gap-3 md:grid-cols-4">
        <!-- Card: Saldo Kas -->
        <div class="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-3.5 shadow-sm dark:border-emerald-500/30 dark:from-emerald-500/10 dark:to-gray-900">
          <div class="mb-2 flex items-center justify-between">
            <span class="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Saldo Kas</span>
            <div class="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/20">
              <svg class="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
          <p class="mb-0.5 text-lg font-black leading-none text-gray-900 dark:text-white">
            {{ formatCurrency(cashBalance) }}
          </p>
          <p class="text-[9px] text-emerald-600 dark:text-emerald-400">
            Masuk {{ formatCurrency(cashFlow.cashIn) }}
          </p>
          <p class="text-[9px] text-red-600 dark:text-red-400">
            Keluar {{ formatCurrency(cashFlow.cashOut) }}
          </p>
        </div>

        <!-- Card: Piutang -->
        <div class="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-3.5 shadow-sm dark:border-amber-500/30 dark:from-amber-500/10 dark:to-gray-900">
          <div class="mb-2 flex items-center justify-between">
            <span class="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Piutang</span>
            <div class="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-500/20">
              <svg class="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p class="mb-0.5 text-lg font-black leading-none text-gray-900 dark:text-white">
            {{ formatCurrency(receivableBalance) }}
          </p>
          <p class="text-[9px] text-amber-600 dark:text-amber-400">Piutang Usaha</p>
          <button
            @click="router.push('/finance/ledger?account=piutang')"
            class="mt-1 text-[9px] font-medium text-amber-700 underline hover:no-underline dark:text-amber-300"
          >
            Lihat Buku Besar
          </button>
        </div>

        <!-- Card: Laba Bersih -->
        <div class="rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50 to-white p-3.5 shadow-sm dark:border-purple-500/30 dark:from-purple-500/10 dark:to-gray-900">
          <div class="mb-2 flex items-center justify-between">
            <span class="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">Laba Bersih</span>
            <div class="flex h-6 w-6 items-center justify-center rounded-lg bg-purple-500/20">
              <svg class="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
          <p class="mb-0.5 text-lg font-black leading-none text-gray-900 dark:text-white">
            {{ formatCurrency(netProfit) }}
          </p>
          <p class="text-[9px] text-purple-600 dark:text-purple-400">Pendapatan − Beban</p>
        </div>

        <!-- Card: Total Aset -->
        <div class="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-3.5 shadow-sm dark:border-blue-500/30 dark:from-blue-500/10 dark:to-gray-900">
          <div class="mb-2 flex items-center justify-between">
            <span class="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Total Aset</span>
            <div class="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-500/20">
              <svg class="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
          </div>
          <p class="mb-0.5 text-lg font-black leading-none text-gray-900 dark:text-white">
            {{ formatCurrency(totalAssets) }}
          </p>
          <button
            @click="router.push('/finance/balance-sheet')"
            class="mt-1 text-[9px] font-medium text-blue-700 underline hover:no-underline dark:text-blue-300"
          >
            Lihat Neraca
          </button>
        </div>
      </div>

      <!-- Akun dengan Saldo Terbesar -->
      <div class="rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div class="mb-3 flex items-center justify-between border-b border-gray-200 pb-2 dark:border-gray-700">
          <h3 class="text-sm font-bold text-gray-900 dark:text-white">Saldo Akun (Aset)</h3>
          <button
            @click="router.push('/finance/balance-sheet')"
            class="text-[10px] font-medium text-blue-600 hover:underline dark:text-blue-400"
          >
            Neraca →
          </button>
        </div>
        <div v-if="assetBalances.length === 0" class="py-6 text-center">
          <p class="text-sm text-gray-500 dark:text-gray-400">Belum ada saldo akun. Mulai dengan jurnal atau transaksi penjualan.</p>
          <button
            @click="router.push('/finance/journal/new')"
            class="mt-3 rounded-xl bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-500"
          >
            + Buat Jurnal
          </button>
        </div>
        <div v-else class="space-y-2">
          <div
            v-for="acc in assetBalances.slice(0, 5)"
            :key="acc.account_id"
            @click="router.push(`/finance/ledger?account=${acc.account_id}`)"
            class="flex cursor-pointer items-center gap-2.5 rounded-xl border border-gray-200 bg-gray-50 p-2.5 hover:border-blue-300 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-500/50"
          >
            <div class="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-[10px] font-bold text-blue-600 dark:text-blue-400">
              {{ acc.account_code.split('-')[1] }}
            </div>
            <div class="flex-1 min-w-0">
              <p class="truncate text-xs font-medium text-gray-900 dark:text-white">{{ acc.account_name }}</p>
              <p class="text-[9px] text-gray-500 dark:text-gray-400">{{ acc.account_code }}</p>
            </div>
            <div class="text-right">
              <p class="text-xs font-bold text-gray-900 dark:text-white">{{ formatCurrency(acc.balance) }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Arus Kas Terbaru -->
      <div class="rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div class="mb-3 flex items-center justify-between border-b border-gray-200 pb-2 dark:border-gray-700">
          <h3 class="text-sm font-bold text-gray-900 dark:text-white">Arus Kas Terbaru</h3>
          <button
            @click="router.push('/finance/cash-flow')"
            class="text-[10px] font-medium text-blue-600 hover:underline dark:text-blue-400"
          >
            Detail →
          </button>
        </div>
        <div v-if="cashFlow.lines.length === 0" class="py-6 text-center">
          <p class="text-sm text-gray-500 dark:text-gray-400">Belum ada arus kas di periode ini.</p>
        </div>
        <div v-else class="space-y-2">
          <div
            v-for="line in cashFlow.lines.slice(0, 5)"
            :key="line.journal_number + line.entry_date"
            class="flex items-center gap-2.5"
          >
            <div
              class="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg"
              :class="line.debit > 0 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/10 text-red-600 dark:text-red-400'"
            >
              <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  v-if="line.debit > 0"
                  stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M7 11l5-5m0 0l5 5m-5-5v12"
                />
                <path
                  v-else
                  stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M7 13l5 5m0 0l5-5m-5 5V6"
                />
              </svg>
            </div>
            <div class="flex-1 min-w-0">
              <p class="truncate text-xs font-medium text-gray-900 dark:text-white">{{ line.description }}</p>
              <p class="text-[9px] text-gray-500 dark:text-gray-400">{{ formatDateTime(line.entry_date) }}</p>
            </div>
            <div class="text-right">
              <p class="text-xs font-bold" :class="line.debit > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'">
                {{ line.debit > 0 ? '+' : '−' }}{{ formatCurrency(line.debit > 0 ? line.debit : line.credit) }}
              </p>
            </div>
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
      <div
        class="w-full max-w-md rounded-t-3xl bg-white p-6 md:rounded-2xl dark:bg-gray-900"
        @click.stop
      >
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
            <label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Rentang Waktu</label>
            <div class="grid grid-cols-2 gap-2">
              <button
                v-for="opt in rangeOptions"
                :key="opt.value"
                @click="tempRange = opt.value"
                class="rounded-xl border border-gray-300 px-3 py-2 text-sm font-medium transition hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                :class="tempRange === opt.value ? 'border-blue-500 bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'"
              >
                {{ opt.label }}
              </button>
            </div>
          </div>

          <!-- Custom Date Range -->
          <div>
            <label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Custom Range</label>
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="mb-1 block text-xs text-gray-500 dark:text-gray-400">Dari</label>
                <input
                  type="date"
                  v-model="tempCustom.start"
                  class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>
              <div>
                <label class="mb-1 block text-xs text-gray-500 dark:text-gray-400">Sampai</label>
                <input
                  type="date"
                  v-model="tempCustom.end"
                  class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>
            </div>
          </div>

          <div class="flex gap-2 pt-2">
            <button
              @click="showFilterModal = false; tempRange = 'thisMonth'"
              class="flex-1 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Batal
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

const router = useRouter()
const store = useFinanceStore()

const showFilterModal = ref(false)
const tempRange = ref('thisMonth')
const tempCustom = ref({
  start: new Date().toISOString().split('T')[0],
  end: new Date().toISOString().split('T')[0],
})

const rangeOptions = [
  { value: 'today', label: 'Hari Ini' },
  { value: '7days', label: '7 Hari' },
  { value: '30days', label: '30 Hari' },
  { value: 'thisMonth', label: 'Bulan Ini' },
]

// Periode aktif (start, end ISO date)
const startDate = ref('')
const endDate = ref('')

const loading = computed(() => store.loading)

const balances = ref<any[]>([])
const cashFlow = ref<any>({ cashIn: 0, cashOut: 0, netCash: 0, lines: [] })

const cashBalance = computed(() => {
  const kas = balances.value.find((b) => b.account_code === '1-1000')
  const bank = balances.value.find((b) => b.account_code === '1-1010')
  return (kas?.balance || 0) + (bank?.balance || 0)
})

const receivableBalance = computed(() => {
  const piutang = balances.value.find((b) => b.account_code === '1-1100')
  return piutang?.balance || 0
})

const assetBalances = computed(() =>
  balances.value.filter((b) => b.account_type === 'aset' && b.balance !== 0)
)

const totalAssets = computed(() =>
  assetBalances.value.reduce((sum, b) => sum + Math.abs(b.balance), 0)
)

// Laba bersih = pendapatan − beban (dari saldo akun)
const netProfit = computed(() => {
  const pendapatan = balances.value
    .filter((b) => b.account_type === 'pendapatan')
    .reduce((sum, b) => sum + b.balance, 0)
  const beban = balances.value
    .filter((b) => b.account_type === 'beban')
    .reduce((sum, b) => sum + b.balance, 0)
  return pendapatan - beban
})

const setPeriod = (start: string, end: string) => {
  startDate.value = start
  endDate.value = end
}

const fetchData = async () => {
  const [bal, cf] = await Promise.all([
    store.getAccountBalances(endDate.value || undefined),
    store.getCashFlow(startDate.value || undefined, endDate.value || undefined),
  ])
  balances.value = bal
  cashFlow.value = cf
}

const applyFilter = () => {
  const today = new Date()
  const endIso = today.toISOString().split('T')[0]

  let start = ''
  switch (tempRange.value) {
    case 'today':
      start = endIso
      break
    case '7days':
      const d7 = new Date(today)
      d7.setDate(today.getDate() - 6)
      start = d7.toISOString().split('T')[0]
      break
    case '30days':
      const d30 = new Date(today)
      d30.setDate(today.getDate() - 29)
      start = d30.toISOString().split('T')[0]
      break
    default:
      start = tempCustom.value.start
  }
  const end = tempRange.value === 'thisMonth' ? endIso : tempCustom.value.end

  setPeriod(start, end)
  showFilterModal.value = false
  fetchData()
}

const formatDateRange = () => {
  if (!startDate.value || !endDate.value) return 'Bulan Ini'
  if (startDate.value === endDate.value) {
    return new Date(startDate.value).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
  }
  return `${new Date(startDate.value).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} - ${new Date(endDate.value).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value || 0)

const formatDateTime = (dateString: string) =>
  new Date(dateString).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })

onMounted(async () => {
  // Default: bulan ini
  const today = new Date()
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
  setPeriod(firstDay.toISOString().split('T')[0], today.toISOString().split('T')[0])
  tempCustom.value.end = today.toISOString().split('T')[0]
  await fetchData()
})
</script>
