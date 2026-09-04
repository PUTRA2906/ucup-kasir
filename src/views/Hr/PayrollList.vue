<template>
  <AdminLayout>
    <PageBreadcrumb pageTitle="Payroll" class="hidden md:block" />

    <!-- Mobile Header -->
    <MobilePageHeader title="Payroll" subtitle="Periode penggajian" back-to="/">
      <template #actions>
        <button
          @click="$router.push('/hr/payroll/period/new')"
          class="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm hover:bg-blue-500 active:scale-95"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
        </button>
      </template>
    </MobilePageHeader>

    <!-- Desktop Header -->
    <div class="mb-4 hidden items-center justify-between md:flex">
      <h2 class="text-lg font-bold text-gray-900 dark:text-white">Periode Payroll</h2>
      <button
        @click="$router.push('/hr/payroll/period/new')"
        class="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-500"
      >
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
        Buat Periode Baru
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading && store.payrollPeriods.length === 0" class="flex items-center justify-center py-16">
      <div class="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
    </div>

    <div v-else-if="store.payrollPeriods.length === 0" class="rounded-2xl border border-gray-200 bg-white p-10 text-center dark:border-gray-800 dark:bg-gray-900">
      <p class="text-sm text-gray-500 dark:text-gray-400">Belum ada periode payroll.</p>
      <button @click="$router.push('/hr/payroll/period/new')" class="mt-3 rounded-xl bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-500">+ Buat Periode</button>
    </div>

    <!-- Desktop Table -->
    <div v-else class="hidden overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900 md:block">
      <table class="w-full text-left text-xs">
        <thead>
          <tr class="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
            <th class="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Kode Periode</th>
            <th class="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Periode</th>
            <th class="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-300">Total Karyawan</th>
            <th class="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-300">Gross</th>
            <th class="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-300">Potongan</th>
            <th class="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-300">Net</th>
            <th class="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Status</th>
            <th class="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-300">Aksi</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="p in sortedPeriods"
            :key="p.id"
            @click="$router.push(`/hr/payroll/${p.id}`)"
            class="cursor-pointer border-b border-gray-100 transition hover:bg-blue-50/50 dark:border-gray-800 dark:hover:bg-blue-500/5"
          >
            <td class="px-4 py-3 font-mono text-[10px] font-medium text-gray-900 dark:text-white">{{ p.period_code }}</td>
            <td class="px-4 py-3 text-gray-600 dark:text-gray-400">{{ p.start_date }} → {{ p.end_date }}</td>
            <td class="px-4 py-3 text-right text-gray-900 dark:text-white">{{ p.total_employee }}</td>
            <td class="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">{{ formatCurrency(p.total_gross) }}</td>
            <td class="px-4 py-3 text-right text-red-600">{{ formatCurrency(p.total_deduction) }}</td>
            <td class="px-4 py-3 text-right font-bold text-gray-900 dark:text-white">{{ formatCurrency(p.total_net) }}</td>
            <td class="px-4 py-3">
              <span class="rounded-lg px-2 py-0.5 text-[9px] font-bold uppercase" :class="getStatusBadge(p.status)">{{ statusLabel(p.status) }}</span>
            </td>
            <td class="px-4 py-3 text-right">
              <button
                v-if="p.status === 'draft'"
                @click.stop="handleGenerate(p.id)"
                class="rounded-lg border border-amber-300 px-2.5 py-1 text-[9px] font-medium text-amber-700 hover:bg-amber-50 dark:border-amber-500/30 dark:text-amber-400 dark:hover:bg-amber-500/10"
              >
                Generate
              </button>
              <button
                v-if="p.status === 'generated'"
                @click.stop="handlePost(p.id)"
                class="rounded-lg border border-emerald-300 px-2.5 py-1 text-[9px] font-medium text-emerald-700 hover:bg-emerald-50 dark:border-emerald-500/30 dark:text-emerald-400 dark:hover:bg-emerald-500/10"
              >
                Jurnal
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Mobile Cards -->
    <div v-else class="grid grid-cols-1 gap-3 md:hidden">
      <div
        v-for="p in sortedPeriods"
        :key="p.id"
        @click="$router.push(`/hr/payroll/${p.id}`)"
        class="cursor-pointer rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm transition hover:border-blue-300 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-blue-500/50"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-semibold text-gray-900 dark:text-white">{{ p.period_code }}</p>
            <p class="text-[10px] text-gray-500 dark:text-gray-400">{{ p.start_date }} → {{ p.end_date }}</p>
          </div>
          <span class="rounded-lg px-2 py-0.5 text-[9px] font-bold uppercase" :class="getStatusBadge(p.status)">{{ statusLabel(p.status) }}</span>
        </div>
        <div class="mt-2 grid grid-cols-2 gap-2 text-[10px]">
          <div>
            <span class="text-gray-500 dark:text-gray-400">Karyawan:</span>
            <span class="ml-1 font-medium text-gray-900 dark:text-white">{{ p.total_employee }}</span>
          </div>
          <div>
            <span class="text-gray-500 dark:text-gray-400">Net:</span>
            <span class="ml-1 font-bold text-gray-900 dark:text-white">{{ formatCurrency(p.total_net) }}</span>
          </div>
        </div>
        <div class="mt-2 flex gap-2">
          <button
            v-if="p.status === 'draft'"
            @click.stop="handleGenerate(p.id)"
            class="rounded-lg bg-amber-100 px-2.5 py-1 text-[9px] font-medium text-amber-700 hover:bg-amber-200 dark:bg-amber-500/20 dark:text-amber-400"
          >
            Generate Payroll
          </button>
          <button
            v-if="p.status === 'generated'"
            @click.stop="handlePost(p.id)"
            class="rounded-lg bg-emerald-100 px-2.5 py-1 text-[9px] font-medium text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400"
          >
            Post Jurnal
          </button>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import MobilePageHeader from '@/components/common/MobilePageHeader.vue'
import { useHrStore } from '@/stores/hr'

const router = useRouter()
const store = useHrStore()
const loading = computed(() => store.loading)

const sortedPeriods = computed(() => [...store.payrollPeriods].sort((a, b) => b.created_at.localeCompare(a.created_at)))

const formatCurrency = (v: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v || 0)

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'draft': return 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
    case 'generated': return 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
    case 'paid': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
    case 'cancelled': return 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400'
    default: return 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
  }
}

const statusLabel = (s: string) => {
  switch (s) {
    case 'draft': return 'Draft'
    case 'generated': return 'Siap Bayar'
    case 'paid': return 'Dibayar'
    case 'cancelled': return 'Batal'
    default: return s
  }
}

const handleGenerate = async (periodId: string) => {
  if (!confirm('Generate payroll untuk periode ini? Aksi ini tidak bisa dibatalkan.')) return
  try {
    await store.generatePayroll(periodId)
  } catch (e: any) { alert(e.message) }
}

const handlePost = async (periodId: string) => {
  if (!confirm('Post jurnal akuntansi untuk payroll ini?')) return
  try {
    await store.postPayrollJournal(periodId)
  } catch (e: any) { alert(e.message) }
}

onMounted(() => store.fetchPayrollPeriods())
</script>