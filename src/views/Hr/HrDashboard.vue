<template>
  <AdminLayout>
    <PageBreadcrumb pageTitle="Dashboard HR" class="hidden md:block" />

    <!-- Mobile Header -->
    <MobilePageHeader title="Dashboard HR" subtitle="Manajemen Karyawan &amp; Payroll" @back="$router.back()" />

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-20">
      <div class="text-center">
        <div class="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
        <p class="text-sm text-gray-500 dark:text-gray-400">Memuat data karyawan...</p>
      </div>
    </div>

    <div v-else class="space-y-4">
      <!-- Statistik Cards -->
      <div class="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div class="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-3.5 shadow-sm dark:border-blue-500/30 dark:from-blue-500/10 dark:to-gray-900">
          <div class="mb-2 flex items-center justify-between">
            <span class="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Total Karyawan</span>
            <div class="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-500/20">
              <svg class="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
          </div>
          <p class="mb-0.5 text-lg font-black leading-none text-gray-900 dark:text-white">{{ stats.totalEmployees }}</p>
          <p class="text-[9px] text-blue-600 dark:text-blue-400">Aktif: {{ stats.activeEmployees }}</p>
        </div>

        <div class="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-3.5 shadow-sm dark:border-emerald-500/30 dark:from-emerald-500/10 dark:to-gray-900">
          <div class="mb-2 flex items-center justify-between">
            <span class="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Hadir Hari Ini</span>
            <div class="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/20">
              <svg class="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <p class="mb-0.5 text-lg font-black leading-none text-gray-900 dark:text-white">{{ stats.todayPresent }}</p>
          <p class="text-[9px] text-emerald-600 dark:text-emerald-400">Absen: {{ stats.todayAbsent }}</p>
        </div>

        <div class="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-3.5 shadow-sm dark:border-amber-500/30 dark:from-amber-500/10 dark:to-gray-900">
          <div class="mb-2 flex items-center justify-between">
            <span class="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Departemen</span>
            <div class="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-500/20">
              <svg class="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
          </div>
          <p class="mb-0.5 text-lg font-black leading-none text-gray-900 dark:text-white">{{ stats.departmentCount }}</p>
          <button @click="router.push('/hr/departments')" class="mt-1 text-[9px] font-medium text-amber-700 underline hover:no-underline dark:text-amber-300">
            Kelola →
          </button>
        </div>

        <div class="rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50 to-white p-3.5 shadow-sm dark:border-purple-500/30 dark:from-purple-500/10 dark:to-gray-900">
          <div class="mb-2 flex items-center justify-between">
            <span class="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">Beban Gaji</span>
            <div class="flex h-6 w-6 items-center justify-center rounded-lg bg-purple-500/20">
              <svg class="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
          <p class="mb-0.5 text-lg font-black leading-none text-gray-900 dark:text-white">{{ formatCurrency(latestPayroll?.total_net || 0) }}</p>
          <p class="text-[9px] text-purple-600 dark:text-purple-400">{{ latestPayroll?.period_code || 'Belum ada payroll' }}</p>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <h3 class="mb-3 text-sm font-bold text-gray-900 dark:text-white">Aksi Cepat</h3>
        <div class="grid grid-cols-2 gap-2 md:grid-cols-5">
          <button @click="router.push('/hr/employees/add')" class="rounded-xl border border-gray-200 p-3 text-left text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
            <span class="mb-1 block text-base">👤</span>Tambah Karyawan
          </button>
          <button @click="router.push('/hr/attendance')" class="rounded-xl border border-gray-200 p-3 text-left text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
            <span class="mb-1 block text-base">📅</span>Input Absensi
          </button>
          <button @click="router.push('/hr/payroll/period/new')" class="rounded-xl border border-gray-200 p-3 text-left text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
            <span class="mb-1 block text-base">💰</span>Buat Payroll
          </button>
          <button @click="router.push('/hr/payroll/components')" class="rounded-xl border border-gray-200 p-3 text-left text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
            <span class="mb-1 block text-base">⚙️</span>Komponen Gaji
          </button>
          <button @click="router.push('/hr/departments')" class="rounded-xl border border-gray-200 p-3 text-left text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
            <span class="mb-1 block text-base">🏢</span>Departemen
          </button>
        </div>
      </div>

      <!-- Karyawan Terbaru -->
      <div class="rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div class="mb-3 flex items-center justify-between border-b border-gray-200 pb-2 dark:border-gray-700">
          <h3 class="text-sm font-bold text-gray-900 dark:text-white">Karyawan Terbaru</h3>
          <button @click="router.push('/hr/employees')" class="text-[10px] font-medium text-blue-600 hover:underline dark:text-blue-400">
            Lihat semua →
          </button>
        </div>
        <div v-if="recentEmployees.length === 0" class="py-6 text-center">
          <p class="text-sm text-gray-500 dark:text-gray-400">Belum ada karyawan.</p>
          <button @click="router.push('/hr/employees/add')" class="mt-3 rounded-xl bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-500">
            + Tambah Karyawan
          </button>
        </div>
        <div v-else class="space-y-2">
          <div
            v-for="emp in recentEmployees"
            :key="emp.id"
            @click="router.push(`/hr/employees/${emp.id}`)"
            class="flex cursor-pointer items-center gap-2.5 rounded-xl border border-gray-200 bg-gray-50 p-2.5 hover:border-blue-300 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-500/50"
          >
            <div class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-xs font-bold text-blue-600 dark:text-blue-400">
              {{ getInitial(emp.name) }}
            </div>
            <div class="flex-1 min-w-0">
              <p class="truncate text-xs font-medium text-gray-900 dark:text-white">{{ emp.name }}</p>
              <p class="text-[9px] text-gray-500 dark:text-gray-400">{{ emp.employee_code }} · {{ emp.position?.name || 'Tanpa jabatan' }}</p>
            </div>
            <span class="rounded-lg px-2 py-0.5 text-[9px] font-bold uppercase" :class="getStatusBadge(emp.status)">
              {{ emp.status }}
            </span>
          </div>
        </div>
      </div>

      <!-- Periode Payroll Terakhir -->
      <div class="rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div class="mb-3 flex items-center justify-between border-b border-gray-200 pb-2 dark:border-gray-700">
          <h3 class="text-sm font-bold text-gray-900 dark:text-white">Periode Payroll</h3>
          <button @click="router.push('/hr/payroll')" class="text-[10px] font-medium text-blue-600 hover:underline dark:text-blue-400">
            Kelola →
          </button>
        </div>
        <div v-if="recentPeriods.length === 0" class="py-6 text-center">
          <p class="text-sm text-gray-500 dark:text-gray-400">Belum ada periode payroll.</p>
          <button @click="router.push('/hr/payroll/period/new')" class="mt-3 rounded-xl bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-500">
            + Buat Periode
          </button>
        </div>
        <div v-else class="space-y-2">
          <div
            v-for="p in recentPeriods"
            :key="p.id"
            @click="router.push(`/hr/payroll/${p.id}`)"
            class="flex cursor-pointer items-center gap-2.5 rounded-xl border border-gray-200 bg-gray-50 p-2.5 hover:border-blue-300 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-500/50"
          >
            <div class="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-purple-500/10 text-[10px] font-bold text-purple-600 dark:text-purple-400">
              {{ String(p.period_month).padStart(2, '0') }}
            </div>
            <div class="flex-1 min-w-0">
              <p class="truncate text-xs font-medium text-gray-900 dark:text-white">{{ p.period_code }}</p>
              <p class="text-[9px] text-gray-500 dark:text-gray-400">{{ p.total_employee }} karyawan</p>
            </div>
            <div class="text-right">
              <p class="text-xs font-bold text-gray-900 dark:text-white">{{ formatCurrency(p.total_net) }}</p>
              <span class="rounded-lg px-2 py-0.5 text-[9px] font-bold uppercase" :class="getPayrollStatusBadge(p.status)">
                {{ getPayrollStatusLabel(p.status) }}
              </span>
            </div>
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
import { useHrStore } from '@/stores/hr'

const router = useRouter()
const store = useHrStore()

const loading = computed(() => store.loading)

const stats = computed(() => {
  const total = store.employees.length
  const active = store.employees.filter((e) => e.status === 'aktif' && e.is_active).length
  const today = new Date().toISOString().split('T')[0]
  const todayAtt = store.attendance.filter((a) => a.attendance_date === today)
  const present = todayAtt.filter((a) => a.status === 'hadir').length
  const absent = todayAtt.filter((a) => a.status === 'alpa').length
  return {
    totalEmployees: total,
    activeEmployees: active,
    todayPresent: present,
    todayAbsent: absent,
    departmentCount: store.departments.length,
  }
})

const recentEmployees = computed(() =>
  [...store.employees]
    .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
    .slice(0, 5)
)

const recentPeriods = computed(() => store.payrollPeriods.slice(0, 5))
const latestPayroll = computed(() => store.payrollPeriods[0])

const getInitial = (name: string) => (name || '?').charAt(0).toUpperCase()

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'aktif': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
    case 'cuti': return 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
    case 'nonaktif': return 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
    case 'keluar': return 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400'
    default: return 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
  }
}

const getPayrollStatusLabel = (status: string) => {
  switch (status) {
    case 'draft': return 'Draft'
    case 'generated': return 'Siap Bayar'
    case 'paid': return 'Dibayar'
    case 'cancelled': return 'Batal'
    default: return status
  }
}

const getPayrollStatusBadge = (status: string) => {
  switch (status) {
    case 'draft': return 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
    case 'generated': return 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
    case 'paid': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
    case 'cancelled': return 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400'
    default: return 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
  }
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value || 0)

onMounted(async () => {
  await Promise.all([
    store.fetchEmployees(),
    store.fetchDepartments(),
    store.fetchAttendance(
      new Date().toISOString().split('T')[0],
      new Date().toISOString().split('T')[0]
    ),
    store.fetchPayrollPeriods(),
  ])
})
</script>
