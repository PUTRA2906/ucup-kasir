<template>
  <AdminLayout>
    <PageBreadcrumb pageTitle="Arus Kas" class="hidden md:block" />

    <!-- Mobile Header -->
    <MobilePageHeader title="Arus Kas" subtitle="Cash Flow" @back="$router.back()">
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
        <p class="text-sm text-gray-500 dark:text-gray-400">Memuat arus kas...</p>
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-500/30 dark:bg-red-500/10">
      <p class="text-sm text-red-600 dark:text-red-400">{{ error }}</p>
    </div>

    <!-- Content -->
    <template v-else>
      <!-- Filter Pills (Mobile) -->
      <div class="mb-4 flex items-center gap-2 overflow-x-auto md:hidden">
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

      <!-- Stat Cards (Mobile 2 Kolom) -->
      <div class="grid grid-cols-2 gap-3 md:grid-cols-4">
        <!-- Kas Masuk -->
        <div class="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-3.5 shadow-sm dark:border-emerald-500/30 dark:from-emerald-500/10 dark:to-gray-900">
          <div class="mb-2 flex items-center justify-between">
            <span class="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Kas Masuk</span>
            <div class="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/20">
              <svg class="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 11l5-5m0 0l5 5m-5-5v12" />
              </svg>
            </div>
          </div>
          <p class="text-lg font-black leading-none text-gray-900 dark:text-white">{{ formatCurrency(cashFlow.cashIn) }}</p>
          <p class="text-[9px] text-emerald-600 dark:text-emerald-400">Masuk Kas + Bank</p>
        </div>

        <!-- Kas Keluar -->
        <div class="rounded-2xl border border-red-200 bg-gradient-to-br from-red-50 to-white p-3.5 shadow-sm dark:border-red-500/30 dark:from-red-500/10 dark:to-gray-900">
          <div class="mb-2 flex items-center justify-between">
            <span class="text-[10px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400">Kas Keluar</span>
            <div class="flex h-6 w-6 items-center justify-center rounded-lg bg-red-500/20">
              <svg class="h-3.5 w-3.5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 13l5 5m0 0l5-5m-5 5V6" />
              </svg>
            </div>
          </div>
          <p class="text-lg font-black leading-none text-gray-900 dark:text-white">{{ formatCurrency(cashFlow.cashOut) }}</p>
          <p class="text-[9px] text-red-600 dark:text-red-400">Keluar Kas + Bank</p>
        </div>

        <!-- Arus Kas Bersih -->
        <div class="col-span-2 rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-3.5 shadow-sm md:col-span-2 dark:border-blue-500/30 dark:from-blue-500/10 dark:to-gray-900">
          <div class="mb-2 flex items-center justify-between">
            <span class="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Arus Kas Bersih</span>
            <div class="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-500/20">
              <svg class="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
          <p class="text-lg font-black leading-none" :class="cashFlow.netCash >= 0 ? 'text-gray-900 dark:text-white' : 'text-red-600 dark:text-red-400'">
            {{ formatCurrency(cashFlow.netCash) }}
          </p>
          <p class="text-[9px] text-blue-600 dark:text-blue-400">Masuk − Keluar</p>
        </div>
      </div>

      <!-- Breakdown Kas vs Bank -->
      <div v-if="cashFlow.lines.length > 0" class="grid grid-cols-2 gap-3">
        <div class="rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p class="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Kas (1-1000)</p>
          <p class="mt-1 text-sm font-black text-gray-900 dark:text-white">{{ formatCurrency(kasNet) }}</p>
          <p class="text-[9px] text-gray-500 dark:text-gray-400">Masuk {{ formatCurrency(kasIn) }} · Keluar {{ formatCurrency(kasOut) }}</p>
        </div>
        <div class="rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p class="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Bank (1-1010)</p>
          <p class="mt-1 text-sm font-black text-gray-900 dark:text-white">{{ formatCurrency(bankNet) }}</p>
          <p class="text-[9px] text-gray-500 dark:text-gray-400">Masuk {{ formatCurrency(bankIn) }} · Keluar {{ formatCurrency(bankOut) }}</p>
        </div>
      </div>

      <!-- Rincian Transaksi -->
      <div class="rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div class="mb-3 flex items-center justify-between border-b border-gray-200 pb-2 dark:border-gray-700">
          <h3 class="text-sm font-bold text-gray-900 dark:text-white">Rincian Transaksi Kas</h3>
        </div>
        <div v-if="cashFlow.lines.length === 0" class="py-6 text-center">
          <p class="text-sm text-gray-500 dark:text-gray-400">Belum ada arus kas di periode ini.</p>
        </div>
        <div v-else class="space-y-2">
          <div
            v-for="(line, i) in cashFlow.lines"
            :key="i"
            class="flex items-center gap-2.5 rounded-xl border border-gray-200 bg-gray-50 p-2.5 dark:border-gray-700 dark:bg-gray-800"
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
              <div class="flex items-center gap-1.5">
                <p class="truncate text-xs font-medium text-gray-900 dark:text-white">
                  {{ line.is_payment ? line.customer_name || line.description : line.description }}
                </p>
                <span
                  class="flex-shrink-0 rounded-lg px-1.5 py-0.5 text-[8px] font-bold uppercase"
                  :class="line.account_code === '1-1000'
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
                    : 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400'"
                >
                  {{ line.account_code === '1-1000' ? 'Kas' : 'Bank' }}
                </span>
              </div>
              <p class="truncate text-[9px] text-gray-500 dark:text-gray-400">
                {{ line.is_payment
                  ? 'Bayar ' + formatDate(line.entry_date) + ' · ' + line.journal_number
                  : line.journal_number + ' · ' + formatDate(line.entry_date) }}
              </p>
            </div>
            <div class="text-right">
              <p class="text-xs font-bold" :class="line.debit > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'">
                {{ line.debit > 0 ? '+' : '−' }}{{ formatCurrency(line.debit > 0 ? line.debit : line.credit) }}
              </p>
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
              @click="showFilterModal = false"
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
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import MobilePageHeader from '@/components/common/MobilePageHeader.vue'
import { useFinanceStore } from '@/stores/finance'

const store = useFinanceStore()

const sumByAccount = (code: string, side: 'in' | 'out') =>
  computed(() =>
    cashFlow.value.lines
      .filter((l: any) => l.account_code === code)
      .reduce((s: number, l: any) => s + (side === 'in' ? (l.debit || 0) : (l.credit || 0)), 0)
  ).value

const kasIn = computed(() => sumByAccount('1-1000', 'in'))
const kasOut = computed(() => sumByAccount('1-1000', 'out'))
const kasNet = computed(() => kasIn.value - kasOut.value)

const bankIn = computed(() => sumByAccount('1-1010', 'in'))
const bankOut = computed(() => sumByAccount('1-1010', 'out'))
const bankNet = computed(() => bankIn.value - bankOut.value)

const loading = ref(false)
const error = ref<string | null>(null)
const showFilterModal = ref(false)

const cashFlow = ref<any>({ cashIn: 0, cashOut: 0, netCash: 0, lines: [] })

const startDate = ref('')
const endDate = ref('')

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

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', maximumFractionDigits: 0,
  }).format(value || 0)

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })

const formatDateRange = () => {
  if (!startDate.value || !endDate.value) return 'Bulan Ini'
  if (startDate.value === endDate.value) {
    return new Date(startDate.value).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
  }
  return `${new Date(startDate.value).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} - ${new Date(endDate.value).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`
}

const fetchData = async () => {
  loading.value = true
  error.value = null
  try {
    cashFlow.value = await store.getCashFlow(
      startDate.value || undefined,
      endDate.value || undefined
    )
  } catch (e: any) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

const applyFilter = () => {
  const today = new Date()
  const endIso = today.toISOString().split('T')[0]

  let start = ''
  switch (tempRange.value) {
    case 'today':
      start = endIso
      break
    case '7days': {
      const d7 = new Date(today)
      d7.setDate(today.getDate() - 6)
      start = d7.toISOString().split('T')[0]
      break
    }
    case '30days': {
      const d30 = new Date(today)
      d30.setDate(today.getDate() - 29)
      start = d30.toISOString().split('T')[0]
      break
    }
    default:
      start = tempCustom.value.start
  }
  const end = tempRange.value === 'thisMonth' ? endIso : tempCustom.value.end

  startDate.value = start
  endDate.value = end
  showFilterModal.value = false
  fetchData()
}

onMounted(async () => {
  const today = new Date()
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
  startDate.value = firstDay.toISOString().split('T')[0]
  endDate.value = today.toISOString().split('T')[0]
  await fetchData()
})
</script>