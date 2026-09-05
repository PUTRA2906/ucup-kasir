<template>
  <AdminLayout>
    <PageBreadcrumb pageTitle="Detail Payroll" class="hidden md:block" />

    <!-- Mobile Header -->
    <MobilePageHeader title="Payroll" :subtitle="period?.period_code || ''" back-to="/hr/payroll" />

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-20">
      <div class="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
    </div>

    <div v-else-if="!period" class="py-20 text-center">
      <p class="text-sm text-gray-500">Periode tidak ditemukan</p>
    </div>

    <template v-else>
      <!-- Period Summary -->
      <div class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div class="mb-3 flex items-center justify-between">
          <div>
            <h2 class="text-base font-bold text-gray-900 dark:text-white">{{ period.period_code }}</h2>
            <p class="text-[10px] text-gray-500 dark:text-gray-400">{{ period.start_date }} → {{ period.end_date }}</p>
          </div>
          <span class="rounded-lg px-2 py-0.5 text-[9px] font-bold uppercase" :class="statusBadge(period.status)">{{ statusLabel(period.status) }}</span>
        </div>
        <div class="grid grid-cols-3 gap-3 border-t border-gray-200 pt-3 dark:border-gray-700">
          <div>
            <p class="text-[9px] text-gray-500 dark:text-gray-400">Karyawan</p>
            <p class="text-sm font-bold text-gray-900 dark:text-white">{{ period.total_employee }}</p>
          </div>
          <div>
            <p class="text-[9px] text-gray-500 dark:text-gray-400">Gross</p>
            <p class="text-sm font-bold text-gray-900 dark:text-white">{{ formatCurrency(period.total_gross) }}</p>
          </div>
          <div>
            <p class="text-[9px] text-gray-500 dark:text-gray-400">Net</p>
            <p class="text-sm font-bold text-emerald-600 dark:text-emerald-400">{{ formatCurrency(period.total_net) }}</p>
          </div>
        </div>

        <!-- Actions -->
        <div v-if="period.status === 'draft' || period.status === 'generated'" class="mt-3 flex gap-2 border-t border-gray-200 pt-3 dark:border-gray-700">
          <button
            v-if="period.status === 'draft'"
            @click="handleGenerate"
            :disabled="store.loading"
            class="flex-1 rounded-xl bg-amber-500 py-2.5 text-xs font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
          >
            Generate Payroll
          </button>
          <button
            v-if="period.status === 'generated'"
            @click="handlePost"
            :disabled="store.loading"
            class="flex-1 rounded-xl bg-emerald-600 py-2.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            Post Jurnal Akuntansi
          </button>
        </div>
      </div>

      <!-- Search -->
      <div class="mt-4">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Cari karyawan..."
          class="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-xs text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder-gray-500"
        />
      </div>

      <!-- Payroll Rows -->
      <div v-if="filteredPayrolls.length === 0" class="mt-4 rounded-2xl border border-gray-200 bg-white p-10 text-center dark:border-gray-800 dark:bg-gray-900">
        <p class="text-sm text-gray-500 dark:text-gray-400">Belum ada data payroll. Klik "Generate Payroll" untuk menghitung gaji.</p>
      </div>

      <!-- Desktop Table -->
      <div v-else class="mt-4 hidden overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900 md:block">
        <table class="w-full text-left text-xs">
          <thead>
            <tr class="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
              <th class="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Karyawan</th>
              <th class="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-300">Gaji Pokok</th>
              <th class="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-300">Tunjangan</th>
              <th class="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-300">Potongan</th>
              <th class="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-300">Net</th>
              <th class="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in filteredPayrolls" :key="p.id" @click="expandedPayrollId = expandedPayrollId === p.id ? null : p.id" class="cursor-pointer border-b border-gray-100 transition hover:bg-blue-50/50 dark:border-gray-800 dark:hover:bg-blue-500/5">
              <td class="px-4 py-3 font-medium text-gray-900 dark:text-white">{{ p.employee?.name || '-' }}</td>
              <td class="px-4 py-3 text-right text-gray-600 dark:text-gray-400">{{ formatCurrency(p.base_salary) }}</td>
              <td class="px-4 py-3 text-right text-emerald-600">{{ formatCurrency(p.total_allowance) }}</td>
              <td class="px-4 py-3 text-right text-red-600">{{ formatCurrency(p.total_deduction) }}</td>
              <td class="px-4 py-3 text-right font-bold text-gray-900 dark:text-white">{{ formatCurrency(p.total_net) }}</td>
              <td class="px-4 py-3">
                <span class="rounded-lg px-2 py-0.5 text-[9px] font-bold uppercase" :class="p.status === 'paid' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'">{{ p.status }}</span>
              </td>
            </tr>
            <tr v-if="expandedPayrollId" class="bg-gray-50 dark:bg-gray-800">
              <td colspan="6" class="px-4 py-3">
                <div v-if="expandedPayroll" class="space-y-1.5">
                  <div v-for="item in expandedPayroll.items || []" :key="item.id" class="flex items-center justify-between text-[11px]">
                    <span class="text-gray-600 dark:text-gray-400">{{ item.component_name }}</span>
                    <span :class="item.component_type === 'tunjangan' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'">
                      {{ item.component_type === 'tunjangan' ? '+' : '-' }} {{ formatCurrency(item.amount) }}
                    </span>
                  </div>
                  <div v-if="!(expandedPayroll.items || []).length" class="text-[11px] text-gray-400">Tidak ada komponen.</div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Mobile Cards -->
      <div v-else class="mt-4 grid grid-cols-1 gap-3 md:hidden">
        <div
          v-for="p in filteredPayrolls"
          :key="p.id"
          @click="expandedPayrollId = expandedPayrollId === p.id ? null : p.id"
          class="cursor-pointer rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm transition hover:border-blue-300 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-blue-500/50"
        >
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-semibold text-gray-900 dark:text-white">{{ p.employee?.name || '-' }}</p>
              <p class="text-[10px] text-gray-500 dark:text-gray-400">{{ p.employee?.position?.name || 'Tanpa jabatan' }}</p>
            </div>
            <div class="text-right">
              <p class="text-sm font-bold text-gray-900 dark:text-white">{{ formatCurrency(p.total_net) }}</p>
              <span class="rounded-lg px-2 py-0.5 text-[9px] font-bold uppercase" :class="p.status === 'paid' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'">{{ p.status }}</span>
            </div>
          </div>
          <div v-if="expandedPayrollId === p.id" class="mt-2 space-y-1.5 border-t border-gray-200 pt-2 dark:border-gray-700">
            <div class="flex justify-between text-[10px]">
              <span class="text-gray-500">Gaji Pokok</span>
              <span class="font-medium text-gray-900 dark:text-white">{{ formatCurrency(p.base_salary) }}</span>
            </div>
            <div class="flex justify-between text-[10px]">
              <span class="text-gray-500">Tunjangan</span>
              <span class="font-medium text-emerald-600">{{ formatCurrency(p.total_allowance) }}</span>
            </div>
            <div class="flex justify-between text-[10px]">
              <span class="text-gray-500">Potongan</span>
              <span class="font-medium text-red-600">{{ formatCurrency(p.total_deduction) }}</span>
            </div>
            <div v-for="item in p.items || []" :key="item.id" class="flex justify-between text-[10px] pl-2">
              <span class="text-gray-400">{{ item.component_name }}</span>
              <span :class="item.component_type === 'tunjangan' ? 'text-emerald-600' : 'text-red-600'">{{ item.component_type === 'tunjangan' ? '+' : '-' }} {{ formatCurrency(item.amount) }}</span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </AdminLayout>
</template>

<script setup lang="ts">
import { useConfirm } from '@/composables/useConfirm'
import { useToast } from '@/composables/useToast'
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import MobilePageHeader from '@/components/common/MobilePageHeader.vue'
import { useHrStore } from '@/stores/hr'

const { confirm } = useConfirm()
const toast = useToast()
const route = useRoute()
const store = useHrStore()

const loading = ref(true)
const searchQuery = ref('')
const expandedPayrollId = ref<string | null>(null)

const period = computed(() => store.payrollPeriods.find((p) => p.id === route.params.id) || null)
const expandedPayroll = computed(() => store.payrolls.find((p) => p.id === expandedPayrollId.value) || null)

const filteredPayrolls = computed(() => {
  let list = store.payrolls.filter((p) => p.period_id === route.params.id)
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter((p) => (p.employee?.name || '').toLowerCase().includes(q))
  }
  return list
})

const formatCurrency = (v: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v || 0)

const statusLabel = (s: string) => {
  switch (s) {
    case 'draft': return 'Draft'
    case 'generated': return 'Siap Bayar'
    case 'paid': return 'Dibayar'
    case 'cancelled': return 'Batal'
    default: return s
  }
}

const statusBadge = (s: string) => {
  switch (s) {
    case 'draft': return 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
    case 'generated': return 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
    case 'paid': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
    case 'cancelled': return 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400'
    default: return 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
  }
}

const handleGenerate = async () => {
  if (!(await confirm('Generate payroll untuk periode ini?'))) return
  try {
    await store.generatePayroll(route.params.id as string)
  } catch (e: any) { toast.error('Gagal!', e.message) }
}

const handlePost = async () => {
  if (!(await confirm('Post jurnal akuntansi untuk payroll ini?'))) return
  try {
    await store.postPayrollJournal(route.params.id as string)
  } catch (e: any) { toast.error('Gagal!', e.message) }
}

onMounted(async () => {
  await Promise.all([
    store.fetchPayrollPeriods(),
    store.fetchPayrolls(route.params.id as string),
    store.fetchEmployees(),
  ])
  loading.value = false
})
</script>