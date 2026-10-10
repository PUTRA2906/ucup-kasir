<template>
  <AdminLayout hide-bottom-nav>
    <PageBreadcrumb pageTitle="Laporan Piutang Menua" class="hidden md:block" />

    <MobilePageHeader title="Piutang Menua" subtitle="Aging Receivables" />

    <!-- Loading -->
    <div v-if="loading" class="flex flex-col items-center justify-center py-20 gap-3">
      <div class="h-10 w-10 animate-spin rounded-full border-4 border-red-500 border-t-transparent"></div>
      <p class="text-sm text-gray-500 dark:text-gray-400">Memuat laporan...</p>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="mx-4 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-500/30 dark:bg-red-500/10 md:mx-0">
      <p class="text-sm text-red-600 dark:text-red-400">{{ error }}</p>
      <button @click="loadReport" class="mt-2 text-xs font-medium text-red-700 underline dark:text-red-300">Coba Lagi</button>
    </div>

    <div v-else class="space-y-4 px-4 pb-24 md:px-0 md:pb-6">

      <!-- Info tanggal + range picker (mobile & desktop) -->
      <div class="flex flex-wrap items-center justify-between gap-3">
       
        <DateRangeField
          v-model:start="dateStart"
          v-model:end="dateEnd"
          title="Pilih Rentang Tanggal"
          placeholder="Ubah tanggal"
          button-class="flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
          @update:start="onDateChange"
          @update:end="onDateChange"
        />
      </div>

      <!-- Summary Cards -->
      <div class="grid grid-cols-2 gap-3 md:grid-cols-4">
        <!-- Total -->
        <div class="col-span-2 md:col-span-4 rounded-2xl border-2 border-red-200 bg-gradient-to-br from-red-50 to-white p-4 shadow-sm dark:border-red-500/30 dark:from-red-500/10 dark:to-gray-900">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-xs font-bold uppercase tracking-wider text-red-600 dark:text-red-400">Total Piutang Belum Lunas</p>
              <p class="mt-1 text-3xl font-black text-gray-900 dark:text-white">{{ formatCurrency(report.summary.grand_total) }}</p>
              <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{{ report.summary.customer_count }} pelanggan</p>
            </div>
            <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10">
              <svg class="h-7 w-7 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <!-- 0–3 Bulan -->
        <div class="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-3.5 shadow-sm dark:border-emerald-500/30 dark:from-emerald-500/10 dark:to-gray-900">
          <p class="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">0–3 Bulan</p>
          <p class="mt-1 text-lg font-black leading-none text-gray-900 dark:text-white">{{ formatCurrency(report.summary.total_current) }}</p>
          <p class="mt-1 text-[10px] text-gray-500">{{ pct(report.summary.total_current) }}% dari total</p>
          <div class="mt-2 h-1.5 w-full rounded-full bg-gray-200 dark:bg-gray-700">
            <div class="h-full rounded-full bg-emerald-500" :style="{ width: pct(report.summary.total_current) + '%' }"></div>
          </div>
        </div>

        <!-- 3–6 Bulan -->
        <div class="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-3.5 shadow-sm dark:border-amber-500/30 dark:from-amber-500/10 dark:to-gray-900">
          <p class="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">3–6 Bulan</p>
          <p class="mt-1 text-lg font-black leading-none text-gray-900 dark:text-white">{{ formatCurrency(report.summary.total_3_6) }}</p>
          <p class="mt-1 text-[10px] text-gray-500">{{ pct(report.summary.total_3_6) }}% dari total</p>
          <div class="mt-2 h-1.5 w-full rounded-full bg-gray-200 dark:bg-gray-700">
            <div class="h-full rounded-full bg-amber-500" :style="{ width: pct(report.summary.total_3_6) + '%' }"></div>
          </div>
        </div>

        <!-- 6 Bln–1 Thn -->
        <div class="rounded-2xl border border-orange-200 bg-gradient-to-br from-orange-50 to-white p-3.5 shadow-sm dark:border-orange-500/30 dark:from-orange-500/10 dark:to-gray-900">
          <p class="text-[10px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">6 Bln–1 Thn</p>
          <p class="mt-1 text-lg font-black leading-none text-gray-900 dark:text-white">{{ formatCurrency(report.summary.total_6_12) }}</p>
          <p class="mt-1 text-[10px] text-gray-500">{{ pct(report.summary.total_6_12) }}% dari total</p>
          <div class="mt-2 h-1.5 w-full rounded-full bg-gray-200 dark:bg-gray-700">
            <div class="h-full rounded-full bg-orange-500" :style="{ width: pct(report.summary.total_6_12) + '%' }"></div>
          </div>
        </div>

        <!-- >1 Tahun -->
        <div class="rounded-2xl border border-red-200 bg-gradient-to-br from-red-50 to-white p-3.5 shadow-sm dark:border-red-500/30 dark:from-red-500/10 dark:to-gray-900">
          <p class="text-[10px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400">&gt;1 Tahun</p>
          <p class="mt-1 text-lg font-black leading-none text-gray-900 dark:text-white">{{ formatCurrency(report.summary.total_over1year) }}</p>
          <p class="mt-1 text-[10px] text-gray-500">{{ pct(report.summary.total_over1year) }}% dari total</p>
          <div class="mt-2 h-1.5 w-full rounded-full bg-gray-200 dark:bg-gray-700">
            <div class="h-full rounded-full bg-red-500" :style="{ width: pct(report.summary.total_over1year) + '%' }"></div>
          </div>
        </div>
      </div>

      <!-- Search & Filter -->
      <div class="flex gap-2">
        <div class="relative flex-1">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Cari pelanggan atau kecamatan..."
            class="w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-9 pr-4 text-sm placeholder-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
            @input="currentPage = 1"
          />
          <svg class="absolute left-3 top-3 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <select
          v-model="bucketFilter"
          class="rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-700 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          @change="currentPage = 1"
        >
          <option value="all">Semua</option>
          <option value="current">0–3 bulan</option>
          <option value="3_6">3–6 bulan</option>
          <option value="6_12">6 bln–1 thn</option>
          <option value="over1year">&gt;1 tahun</option>
        </select>
      </div>

      <!-- Empty -->
      <div v-if="filteredRows.length === 0" class="rounded-2xl border-2 border-dashed border-gray-300 p-10 text-center dark:border-gray-700">
        <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p class="mt-3 text-sm font-medium text-gray-900 dark:text-white">Tidak ada piutang</p>
        <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">{{ searchQuery ? 'Coba kata kunci lain' : 'Semua tagihan sudah lunas 🎉' }}</p>
      </div>

      <template v-else>
        <!-- Info paginasi -->
        <div class="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>{{ paginationInfo }}</span>
          <span>{{ filteredRows.length }} pelanggan</span>
        </div>

        <!-- ── Mobile Cards ── -->
        <div class="space-y-3 md:hidden">
          <div
            v-for="row in pagedRows"
            :key="row.customer_id || row.customer_name"
            class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900"
            :class="{ 'border-red-300 dark:border-red-500/40': row.over1year > 0 }"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2">
                  <span v-if="row.over1year > 0" class="flex-shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700 dark:bg-red-500/20 dark:text-red-400">&gt;1 tahun</span>
                  <p class="truncate text-sm font-bold text-gray-900 dark:text-white">{{ row.customer_name }}</p>
                </div>
                <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{{ row.kecamatan }}</p>
              </div>
              <div class="text-right">
                <p class="text-sm font-black text-red-600 dark:text-red-400">{{ formatCurrency(row.total) }}</p>
                <p class="text-[10px] text-gray-500">Sejak {{ formatDate(row.oldest_date) }}</p>
              </div>
            </div>

            <!-- Breakdown -->
            <div class="mt-3 grid grid-cols-4 gap-1.5 border-t border-gray-100 pt-3 dark:border-gray-800">
              <div class="text-center">
                <p class="text-[9px] font-semibold text-emerald-600">0–3 Bln</p>
                <p class="text-xs font-bold text-gray-900 dark:text-white">{{ row.current > 0 ? formatShort(row.current) : '–' }}</p>
              </div>
              <div class="text-center">
                <p class="text-[9px] font-semibold text-amber-600">3–6 Bln</p>
                <p class="text-xs font-bold text-gray-900 dark:text-white">{{ row.days3_6 > 0 ? formatShort(row.days3_6) : '–' }}</p>
              </div>
              <div class="text-center">
                <p class="text-[9px] font-semibold text-orange-600">6 Bln–1 Thn</p>
                <p class="text-xs font-bold text-gray-900 dark:text-white">{{ row.days6_12 > 0 ? formatShort(row.days6_12) : '–' }}</p>
              </div>
              <div class="text-center">
                <p class="text-[9px] font-semibold text-red-600">&gt;1 Thn</p>
                <p class="text-xs font-bold" :class="row.over1year > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'">
                  {{ row.over1year > 0 ? formatShort(row.over1year) : '–' }}
                </p>
              </div>
            </div>

            <!-- Bar aging -->
            <div class="mt-2 flex h-1.5 w-full overflow-hidden rounded-full">
              <div class="bg-emerald-500" :style="{ width: rowPct(row, 'current') + '%' }"></div>
              <div class="bg-amber-500" :style="{ width: rowPct(row, '3_6') + '%' }"></div>
              <div class="bg-orange-500" :style="{ width: rowPct(row, '6_12') + '%' }"></div>
              <div class="bg-red-600" :style="{ width: rowPct(row, 'over1year') + '%' }"></div>
            </div>

            <button
              v-if="row.customer_id"
              @click="goToInvoice(row)"
              class="mt-3 w-full rounded-lg bg-brand-500 px-3 py-2 text-xs font-semibold text-white active:scale-95 hover:bg-brand-600"
            >
              Lihat Invoice
            </button>
          </div>
        </div>

        <!-- ── Desktop Table ── -->
        <div class="hidden overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm md:block dark:border-gray-800 dark:bg-gray-900">
          <table class="w-full text-sm">
            <thead class="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">#</th>
                <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">Pelanggan</th>
                <th class="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500">Kecamatan</th>
                <th class="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-emerald-600">0–3 Bulan</th>
                <th class="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-amber-600">3–6 Bulan</th>
                <th class="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-orange-600">6 Bln–1 Thn</th>
                <th class="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-red-600">&gt;1 Tahun</th>
                <th class="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">Total</th>
                <th class="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
              <tr
                v-for="(row, idx) in pagedRows"
                :key="row.customer_id || row.customer_name"
                class="hover:bg-gray-50 dark:hover:bg-white/[0.02]"
                :class="{ 'bg-red-50/50 dark:bg-red-500/5': row.over1year > 0 }"
              >
                <td class="px-4 py-3 text-xs text-gray-400">{{ (currentPage - 1) * perPage + idx + 1 }}</td>
                <td class="px-4 py-3 font-medium text-gray-900 dark:text-white">{{ row.customer_name }}</td>
                <td class="px-4 py-3 text-gray-500 dark:text-gray-400">{{ row.kecamatan }}</td>
                <td class="px-4 py-3 text-right text-emerald-700 dark:text-emerald-400">{{ row.current > 0 ? formatCurrency(row.current) : '–' }}</td>
                <td class="px-4 py-3 text-right text-amber-700 dark:text-amber-400">{{ row.days3_6 > 0 ? formatCurrency(row.days3_6) : '–' }}</td>
                <td class="px-4 py-3 text-right text-orange-700 dark:text-orange-400">{{ row.days6_12 > 0 ? formatCurrency(row.days6_12) : '–' }}</td>
                <td class="px-4 py-3 text-right font-semibold" :class="row.over1year > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-400'">
                  {{ row.over1year > 0 ? formatCurrency(row.over1year) : '–' }}
                </td>
                <td class="px-4 py-3 text-right font-bold text-red-600 dark:text-red-400">{{ formatCurrency(row.total) }}</td>
                <td class="px-4 py-3 text-right">
                  <button
                    v-if="row.customer_id"
                    @click="goToInvoice(row)"
                    class="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-600"
                  >
                    Invoice
                  </button>
                </td>
              </tr>
            </tbody>
            <tfoot class="bg-gray-50 dark:bg-gray-800">
              <tr class="font-bold">
                <td class="px-4 py-3" colspan="3">
                  <span class="text-xs text-gray-600 dark:text-gray-300">Total ({{ filteredRows.length }} pelanggan)</span>
                </td>
                <td class="px-4 py-3 text-right text-emerald-700 dark:text-emerald-400">{{ formatCurrency(filteredSummary.total_current) }}</td>
                <td class="px-4 py-3 text-right text-amber-700 dark:text-amber-400">{{ formatCurrency(filteredSummary.total_3_6) }}</td>
                <td class="px-4 py-3 text-right text-orange-700 dark:text-orange-400">{{ formatCurrency(filteredSummary.total_6_12) }}</td>
                <td class="px-4 py-3 text-right text-red-600 dark:text-red-400">{{ formatCurrency(filteredSummary.total_over1year) }}</td>
                <td class="px-4 py-3 text-right text-red-600 dark:text-red-400">{{ formatCurrency(filteredSummary.grand_total) }}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>

        <!-- ── Pagination ── -->
        <div class="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-white/[0.03]">
          <span class="text-xs text-gray-500 dark:text-gray-400">{{ paginationInfo }}</span>
          <div class="flex items-center gap-2">
            <button
              @click="currentPage--"
              :disabled="currentPage === 1"
              class="flex h-8 w-8 items-center justify-center rounded-lg border transition active:scale-95"
              :class="currentPage === 1
                ? 'border-gray-200 bg-gray-100 text-gray-400 dark:border-gray-800 dark:bg-gray-800'
                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300'"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <!-- Nomor halaman -->
            <div class="flex items-center gap-1">
              <button
                v-for="p in visiblePages"
                :key="p"
                @click="typeof p === 'number' && (currentPage = p)"
                :disabled="p === '...'"
                class="flex h-8 min-w-[2rem] items-center justify-center rounded-lg border text-xs font-medium transition"
                :class="p === currentPage
                  ? 'border-brand-500 bg-brand-500 text-white'
                  : p === '...'
                  ? 'border-transparent bg-transparent text-gray-400 cursor-default'
                  : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300'"
              >
                {{ p }}
              </button>
            </div>

            <button
              @click="currentPage++"
              :disabled="currentPage === totalPages"
              class="flex h-8 w-8 items-center justify-center rounded-lg border transition active:scale-95"
              :class="currentPage === totalPages
                ? 'border-gray-200 bg-gray-100 text-gray-400 dark:border-gray-800 dark:bg-gray-800'
                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300'"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </template>

    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import MobilePageHeader from '@/components/common/MobilePageHeader.vue'
import DateRangeField from '@/components/common/DateRangeField.vue'
import { agingReceivablesServiceAdapter } from '@/services'
import type { AgingRow, AgingReport } from '@/services/agingReceivables'

const router = useRouter()

// ── State ───────────────────────────────────────────────────────────────────
const loading = ref(true)
const error = ref<string | null>(null)
const searchQuery = ref('')
const bucketFilter = ref<'all' | 'current' | '3_6' | '6_12' | 'over1year'>('all')
const currentPage = ref(1)
const perPage = 15

const todayStr = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const dateStart = ref('')       // kosong = semua
const dateEnd = ref(todayStr()) // default hari ini

const report = ref<AgingReport>({
  rows: [],
  summary: { total_current: 0, total_3_6: 0, total_6_12: 0, total_over1year: 0, grand_total: 0, customer_count: 0 },
  as_of_date: todayStr(),
})

// ── Computed ─────────────────────────────────────────────────────────────────

const filteredRows = computed(() => {
  let rows = report.value.rows
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    rows = rows.filter(r =>
      r.customer_name.toLowerCase().includes(q) ||
      r.kecamatan.toLowerCase().includes(q)
    )
  }
  if (bucketFilter.value !== 'all') {
    rows = rows.filter(r => {
      if (bucketFilter.value === 'current') return r.current > 0
      if (bucketFilter.value === '3_6') return r.days3_6 > 0
      if (bucketFilter.value === '6_12') return r.days6_12 > 0
      if (bucketFilter.value === 'over1year') return r.over1year > 0
      return true
    })
  }
  return rows
})

const filteredSummary = computed(() => ({
  total_current: filteredRows.value.reduce((s, r) => s + r.current, 0),
  total_3_6: filteredRows.value.reduce((s, r) => s + r.days3_6, 0),
  total_6_12: filteredRows.value.reduce((s, r) => s + r.days6_12, 0),
  total_over1year: filteredRows.value.reduce((s, r) => s + r.over1year, 0),
  grand_total: filteredRows.value.reduce((s, r) => s + r.total, 0),
}))

const totalPages = computed(() => Math.max(1, Math.ceil(filteredRows.value.length / perPage)))

const pagedRows = computed(() => {
  const start = (currentPage.value - 1) * perPage
  return filteredRows.value.slice(start, start + perPage)
})

const paginationInfo = computed(() => {
  const total = filteredRows.value.length
  if (total === 0) return 'Tidak ada data'
  const from = (currentPage.value - 1) * perPage + 1
  const to = Math.min(currentPage.value * perPage, total)
  return `${from}–${to} dari ${total}`
})

// Halaman yang ditampilkan di pagination (maks 5, dengan ellipsis)
const visiblePages = computed((): (number | '...')[] => {
  const total = totalPages.value
  const cur = currentPage.value
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

  const pages: (number | '...')[] = [1]
  if (cur > 3) pages.push('...')
  for (let p = Math.max(2, cur - 1); p <= Math.min(total - 1, cur + 1); p++) pages.push(p)
  if (cur < total - 2) pages.push('...')
  pages.push(total)
  return pages
})

// Reset page saat filter berubah
watch([searchQuery, bucketFilter], () => { currentPage.value = 1 })

// ── Methods ──────────────────────────────────────────────────────────────────

async function loadReport() {
  loading.value = true
  error.value = null
  try {
    report.value = await agingReceivablesServiceAdapter.getAgingReport(dateEnd.value || undefined)
  } catch (e: any) {
    error.value = e.message || 'Gagal memuat laporan'
  } finally {
    loading.value = false
  }
}

// Dipanggil saat DateRangeField emit update
function onDateChange() {
  setTimeout(() => { currentPage.value = 1; loadReport() }, 50)
}

function goToInvoice(row: AgingRow) {
  const kec = row.kecamatan && row.kecamatan !== '-' ? row.kecamatan : 'Lainnya'
  router.push(`/customer-invoices/${encodeURIComponent(kec)}/${row.customer_id}`)
}

// ── Formatting ───────────────────────────────────────────────────────────────
function formatCurrency(v: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v || 0)
}
function formatShort(v: number) {
  if (v >= 1_000_000) return 'Rp ' + (v / 1_000_000).toFixed(1) + 'jt'
  if (v >= 1_000) return 'Rp ' + (v / 1_000).toFixed(0) + 'rb'
  return 'Rp ' + v
}
function formatDate(s: string) {
  if (!s) return '-'
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(s))
}
function pct(v: number) {
  const t = report.value.summary.grand_total
  return t ? Math.round((v / t) * 100) : 0
}
function rowPct(row: AgingRow, bucket: 'current' | '3_6' | '6_12' | 'over1year') {
  if (!row.total) return 0
  const v = bucket === 'current' ? row.current
    : bucket === '3_6' ? row.days3_6
    : bucket === '6_12' ? row.days6_12
    : row.over1year
  return Math.round((v / row.total) * 100)
}

onMounted(loadReport)
</script>
