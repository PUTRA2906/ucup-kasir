<template>
  <AdminLayout>
    <PageBreadcrumb pageTitle="Detail Karyawan" class="hidden md:block" />

    <!-- Mobile Header -->
    <MobilePageHeader title="Detail Karyawan" :subtitle="data?.employee_code || ''" back-to="/hr/employees">
      <template #actions>
        <button
          @click="$router.push(`/hr/employees/edit/${route.params.id}`)"
          class="flex h-8 w-8 items-center justify-center rounded-xl border border-gray-300 bg-white text-gray-500 transition hover:bg-gray-50 active:scale-95 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
      </template>
    </MobilePageHeader>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-20">
      <div class="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
    </div>

    <div v-else-if="!data" class="py-20 text-center">
      <p class="text-sm text-gray-500">Karyawan tidak ditemukan</p>
    </div>

    <template v-else>
      <!-- Profile Card -->
      <div class="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div class="bg-gradient-to-r from-blue-500 to-purple-600 p-4 md:p-6">
          <div class="flex items-center gap-4">
            <div class="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-white/20 text-xl font-bold text-white">
              {{ getInitial(data.name) }}
            </div>
            <div class="text-white">
              <h2 class="text-lg font-bold">{{ data.name }}</h2>
              <p class="text-sm text-white/80">{{ data.employee_code }}</p>
              <span class="mt-1 inline-block rounded-lg px-2.5 py-0.5 text-[10px] font-bold uppercase" :class="getStatusBadge(data.status)">
                {{ data.status }}
              </span>
            </div>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-0 md:grid-cols-4">
          <div class="border-b border-gray-200 p-4 md:border-r dark:border-gray-700">
            <p class="text-[10px] text-gray-500 dark:text-gray-400">Jabatan</p>
            <p class="mt-0.5 text-xs font-medium text-gray-900 dark:text-white">{{ data.position?.name || '-' }}</p>
          </div>
          <div class="border-b border-gray-200 p-4 dark:border-gray-700">
            <p class="text-[10px] text-gray-500 dark:text-gray-400">Departemen</p>
            <p class="mt-0.5 text-xs font-medium text-gray-900 dark:text-white">{{ (data.position as any)?.department?.name || data.department?.name || '-' }}</p>
          </div>
          <div class="border-b border-gray-200 p-4 md:border-r dark:border-gray-700">
            <p class="text-[10px] text-gray-500 dark:text-gray-400">Tipe Gaji</p>
            <p class="mt-0.5 text-xs font-medium text-gray-900 dark:text-white">{{ data.salary_type || '-' }}</p>
          </div>
          <div class="border-b border-gray-200 p-4 dark:border-gray-700">
            <p class="text-[10px] text-gray-500 dark:text-gray-400">Gaji Pokok</p>
            <p class="mt-0.5 text-xs font-bold text-gray-900 dark:text-white">{{ formatCurrency(data.base_salary) }}</p>
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="mt-4">
        <div class="flex gap-1 rounded-xl border border-gray-200 bg-gray-100 p-1 dark:border-gray-700 dark:bg-gray-800">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            @click="activeTab = tab.key"
            :class="[
              'flex-1 rounded-lg px-3 py-2 text-[10px] font-bold transition',
              activeTab === tab.key
                ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200',
            ]"
          >
            {{ tab.label }}
          </button>
        </div>
      </div>

      <!-- Tab: Info Pribadi -->
      <div v-if="activeTab === 'info'" class="mt-4 space-y-4">
        <div class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h3 class="mb-3 text-sm font-bold text-gray-900 dark:text-white">Data Pribadi</h3>
          <div class="grid grid-cols-2 gap-3 text-xs">
            <div>
              <p class="text-[10px] text-gray-500 dark:text-gray-400">Jenis Kelamin</p>
              <p class="font-medium text-gray-900 dark:text-white">{{ formatGender(data.gender) }}</p>
            </div>
            <div>
              <p class="text-[10px] text-gray-500 dark:text-gray-400">Tempat/Tgl Lahir</p>
              <p class="font-medium text-gray-900 dark:text-white">{{ data.birth_place ? data.birth_place + ', ' : '' }}{{ data.birth_date || '-' }}</p>
            </div>
            <div>
              <p class="text-[10px] text-gray-500 dark:text-gray-400">No. Telepon</p>
              <p class="font-medium text-gray-900 dark:text-white">{{ data.phone || '-' }}</p>
            </div>
            <div>
              <p class="text-[10px] text-gray-500 dark:text-gray-400">Email</p>
              <p class="font-medium text-gray-900 dark:text-white">{{ data.email || '-' }}</p>
            </div>
            <div class="col-span-2">
              <p class="text-[10px] text-gray-500 dark:text-gray-400">Alamat</p>
              <p class="font-medium text-gray-900 dark:text-white">{{ data.address || '-' }}</p>
            </div>
            <div>
              <p class="text-[10px] text-gray-500 dark:text-gray-400">Identitas</p>
              <p class="font-medium text-gray-900 dark:text-white">{{ data.identity_type ? data.identity_type.toUpperCase() + ': ' + (data.identity_number || '') : '-' }}</p>
            </div>
            <div>
              <p class="text-[10px] text-gray-500 dark:text-gray-400">Tanggal Masuk</p>
              <p class="font-medium text-gray-900 dark:text-white">{{ data.join_date || '-' }}</p>
            </div>
          </div>
        </div>

        <div class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h3 class="mb-3 text-sm font-bold text-gray-900 dark:text-white">Info Bank</h3>
          <div class="grid grid-cols-2 gap-3 text-xs">
            <div>
              <p class="text-[10px] text-gray-500 dark:text-gray-400">Bank</p>
              <p class="font-medium text-gray-900 dark:text-white">{{ data.bank_name || '-' }}</p>
            </div>
            <div>
              <p class="text-[10px] text-gray-500 dark:text-gray-400">No. Rekening</p>
              <p class="font-medium text-gray-900 dark:text-white">{{ data.bank_account_number || '-' }}</p>
            </div>
            <div>
              <p class="text-[10px] text-gray-500 dark:text-gray-400">Nama Rekening</p>
              <p class="font-medium text-gray-900 dark:text-white">{{ data.bank_account_name || '-' }}</p>
            </div>
            <div>
              <p class="text-[10px] text-gray-500 dark:text-gray-400">NPWP</p>
              <p class="font-medium text-gray-900 dark:text-white">{{ data.npwp || '-' }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Tab: Absensi -->
      <div v-if="activeTab === 'attendance'" class="mt-4 space-y-3">
        <div class="flex items-center gap-2">
          <input v-model="attFilterMonth" type="month" class="rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
        </div>
        <div v-if="filteredAttendance.length === 0" class="rounded-2xl border border-gray-200 bg-white p-6 text-center dark:border-gray-800 dark:bg-gray-900">
          <p class="text-xs text-gray-500">Belum ada data absensi.</p>
        </div>
        <div v-else class="space-y-2">
          <div
            v-for="att in filteredAttendance"
            :key="att.id"
            class="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900"
          >
            <div class="flex-1">
              <p class="text-xs font-medium text-gray-900 dark:text-white">{{ att.attendance_date }}</p>
              <p class="text-[10px] text-gray-500">{{ att.check_in || '-' }} → {{ att.check_out || '-' }}</p>
            </div>
            <span class="rounded-lg px-2 py-0.5 text-[9px] font-bold uppercase" :class="getAttendanceBadge(att.status)">
              {{ att.status }}
            </span>
          </div>
        </div>
      </div>

      <!-- Tab: Riwayat Payroll -->
      <div v-if="activeTab === 'payroll'" class="mt-4 space-y-3">
        <div v-if="employeePayrolls.length === 0" class="rounded-2xl border border-gray-200 bg-white p-6 text-center dark:border-gray-800 dark:bg-gray-900">
          <p class="text-xs text-gray-500">Belum ada riwayat payroll.</p>
        </div>
        <div v-else class="space-y-2">
          <div
            v-for="p in employeePayrolls"
            :key="p.id"
            @click="router.push(`/hr/payroll/${p.id}`)"
            class="cursor-pointer rounded-xl border border-gray-200 bg-white p-3 hover:border-blue-300 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-blue-500/50"
          >
            <div class="flex items-center justify-between">
              <div>
                <p class="text-xs font-medium text-gray-900 dark:text-white">{{ (p as any).period_code || 'Periode' }}</p>
                <p class="text-[10px] text-gray-500 dark:text-gray-400">Gross: {{ formatCurrency(p.total_gross) }}</p>
              </div>
              <div class="text-right">
                <p class="text-xs font-bold text-gray-900 dark:text-white">{{ formatCurrency(p.total_net) }}</p>
                <span class="rounded-lg px-2 py-0.5 text-[9px] font-bold uppercase" :class="p.status === 'paid' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'">
                  {{ p.status }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Desktop Edit Button -->
    <div v-if="data && !loading" class="mt-4 hidden md:flex justify-end">
      <button
        @click="$router.push(`/hr/employees/edit/${data.id}`)"
        class="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-blue-500"
      >
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
        Edit Karyawan
      </button>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import MobilePageHeader from '@/components/common/MobilePageHeader.vue'
import { useHrStore } from '@/stores/hr'

const route = useRoute()
const router = useRouter()
const store = useHrStore()

const loading = ref(true)
const data = computed(() => store.employees.find((e) => e.id === route.params.id) || null)
const activeTab = ref('info')
const attFilterMonth = ref(new Date().toISOString().slice(0, 7))

const tabs = [
  { key: 'info', label: 'Info' },
  { key: 'attendance', label: 'Absensi' },
  { key: 'payroll', label: 'Payroll' },
]

const getInitial = (name: string) => (name || '?').charAt(0).toUpperCase()

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'aktif': return 'bg-emerald-500/20 text-emerald-300'
    case 'cuti': return 'bg-amber-500/20 text-amber-300'
    case 'nonaktif': return 'bg-gray-500/20 text-gray-300'
    case 'keluar': return 'bg-red-500/20 text-red-300'
    default: return 'bg-gray-500/20 text-gray-300'
  }
}

const getAttendanceBadge = (status: string) => {
  switch (status) {
    case 'hadir': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
    case 'izin': return 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400'
    case 'sakit': return 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
    case 'cuti': return 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400'
    case 'alpa': return 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400'
    default: return 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
  }
}

const formatGender = (g?: string) => {
  if (g === 'laki_laki') return 'Laki-laki'
  if (g === 'perempuan') return 'Perempuan'
  return '-'
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value || 0)

const filteredAttendance = computed(() => {
  return store.attendance.filter((a) => {
    if (a.employee_id !== route.params.id) return false
    if (attFilterMonth.value && !a.attendance_date.startsWith(attFilterMonth.value)) return false
    return true
  }).sort((a, b) => b.attendance_date.localeCompare(a.attendance_date))
})

const employeePayrolls = computed(() => {
  return store.payrolls.filter((p) => p.employee_id === route.params.id).sort((a, b) => b.created_at.localeCompare(a.created_at))
})

onMounted(async () => {
  await Promise.all([
    store.fetchEmployees(),
    store.fetchAttendance(),
    store.fetchPayrollPeriods(),
  ])
  loading.value = false
})
</script>