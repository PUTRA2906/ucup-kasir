<template>
  <AdminLayout>
    <PageBreadcrumb pageTitle="Daftar Karyawan" class="hidden md:block" />

    <!-- Mobile Header -->
    <MobilePageHeader title="Karyawan" subtitle="Manajemen data karyawan" back-to="/">
      <template #actions>
        <button
          @click="$router.push('/hr/employees/add')"
          class="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm transition hover:bg-blue-500 active:scale-95"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </template>
    </MobilePageHeader>

    <!-- Search + Filter Desktop -->
    <div class="mb-4 hidden flex-wrap items-center gap-3 md:flex">
      <div class="relative flex-1 max-w-xs">
        <svg class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Cari nama atau kode..."
          class="w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-xs text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder-gray-500 dark:focus:border-blue-500"
        />
      </div>
      <select
        v-model="filterDepartment"
        class="rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-xs text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
      >
        <option value="">Semua Departemen</option>
        <option v-for="d in departments" :key="d.id" :value="d.id">{{ d.name }}</option>
      </select>
      <select
        v-model="filterStatus"
        class="rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-xs text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
      >
        <option value="">Semua Status</option>
        <option value="aktif">Aktif</option>
        <option value="cuti">Cuti</option>
        <option value="nonaktif">Nonaktif</option>
        <option value="keluar">Keluar</option>
      </select>
      <button
        @click="openAddPage"
        class="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-500"
      >
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Tambah Karyawan
      </button>
    </div>

    <!-- Mobile Filter Dropdown -->
    <div class="mb-3 md:hidden">
      <button
        @click="showMobileFilter = !showMobileFilter"
        class="flex w-full items-center justify-between rounded-xl border border-gray-300 bg-white px-4 py-3 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
      >
        <span class="flex items-center gap-2">
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          Filter
          <span v-if="activeFilterCount > 0" class="rounded-full bg-blue-500 px-1.5 py-0.5 text-[9px] text-white">{{ activeFilterCount }}</span>
        </span>
        <svg class="h-4 w-4 transition" :class="showMobileFilter && 'rotate-180'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <transition
        enter-active-class="transition-all duration-200 ease-out"
        enter-from-class="opacity-0 -translate-y-2"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition-all duration-150 ease-in"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 -translate-y-2"
      >
        <div v-if="showMobileFilter" class="mt-2 space-y-2 rounded-xl border border-gray-300 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
          <div class="relative">
            <svg class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Cari nama atau kode..."
              class="w-full rounded-xl border border-gray-300 bg-gray-50 py-2.5 pl-10 pr-4 text-xs text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
            />
          </div>
          <select
            v-model="filterDepartment"
            class="w-full rounded-xl border border-gray-300 bg-gray-50 px-3 py-2 text-xs text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="">Semua Departemen</option>
            <option v-for="d in departments" :key="d.id" :value="d.id">{{ d.name }}</option>
          </select>
          <select
            v-model="filterStatus"
            class="w-full rounded-xl border border-gray-300 bg-gray-50 px-3 py-2 text-xs text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="">Semua Status</option>
            <option value="aktif">Aktif</option>
            <option value="cuti">Cuti</option>
            <option value="nonaktif">Nonaktif</option>
            <option value="keluar">Keluar</option>
          </select>
        </div>
      </transition>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-20">
      <div class="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
    </div>

    <!-- Empty State -->
    <div v-else-if="filteredEmployees.length === 0" class="py-20 text-center">
      <svg class="mx-auto mb-4 h-16 w-16 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
      <p class="mb-1 text-sm font-medium text-gray-500 dark:text-gray-400">Tidak ada karyawan ditemukan</p>
      <p class="mb-4 text-xs text-gray-400 dark:text-gray-500">Coba ubah filter atau tambah karyawan baru</p>
      <button
        @click="openAddPage"
        class="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-500"
      >
        + Tambah Karyawan
      </button>
    </div>

    <!-- Desktop Table -->
    <div v-else class="hidden overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900 md:block">
      <table class="w-full text-left text-xs">
        <thead>
          <tr class="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
            <th class="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Kode</th>
            <th class="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Nama</th>
            <th class="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Departemen</th>
            <th class="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Jabatan</th>
            <th class="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">No. Telepon</th>
            <th class="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Status</th>
            <th class="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-300">Aksi</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="emp in filteredEmployees"
            :key="emp.id"
            @click="router.push(`/hr/employees/${emp.id}`)"
            class="cursor-pointer border-b border-gray-100 transition hover:bg-blue-50/50 dark:border-gray-800 dark:hover:bg-blue-500/5"
          >
            <td class="px-4 py-3 font-mono text-[10px] text-gray-500 dark:text-gray-400">{{ emp.employee_code || '-' }}</td>
            <td class="px-4 py-3 font-medium text-gray-900 dark:text-white">{{ emp.name }}</td>
            <td class="px-4 py-3 text-gray-600 dark:text-gray-400">{{ emp.department?.name || (emp.position as any)?.department?.name || '-' }}</td>
            <td class="px-4 py-3 text-gray-600 dark:text-gray-400">{{ emp.position?.name || '-' }}</td>
            <td class="px-4 py-3 text-gray-600 dark:text-gray-400">{{ emp.phone || '-' }}</td>
            <td class="px-4 py-3">
              <span class="rounded-lg px-2 py-0.5 text-[9px] font-bold uppercase" :class="getStatusBadge(emp.status)">
                {{ emp.status }}
              </span>
            </td>
            <td class="px-4 py-3 text-right">
              <button
                @click.stop="router.push(`/hr/employees/edit/${emp.id}`)"
                class="rounded-lg border border-gray-300 px-2.5 py-1 text-[9px] font-medium text-gray-600 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800"
              >
                Edit
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Mobile Card Grid -->
    <div v-else class="grid grid-cols-1 gap-3 md:hidden">
      <div
        v-for="emp in filteredEmployees"
        :key="emp.id"
        @click="router.push(`/hr/employees/${emp.id}`)"
        class="cursor-pointer rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm transition hover:border-blue-300 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-blue-500/50"
      >
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-sm font-bold text-blue-600 dark:text-blue-400">
            {{ getInitial(emp.name) }}
          </div>
          <div class="flex-1 min-w-0">
            <p class="truncate text-sm font-semibold text-gray-900 dark:text-white">{{ emp.name }}</p>
            <p class="text-[10px] text-gray-500 dark:text-gray-400">{{ emp.employee_code || '-' }}</p>
          </div>
          <span class="rounded-lg px-2 py-0.5 text-[9px] font-bold uppercase" :class="getStatusBadge(emp.status)">
            {{ emp.status }}
          </span>
        </div>
        <div class="mt-2 flex items-center gap-2 text-[10px] text-gray-500 dark:text-gray-400">
          <span class="flex items-center gap-1">
            <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            {{ emp.department?.name || (emp.position as any)?.department?.name || '-' }}
          </span>
          <span class="flex items-center gap-1">
            <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2v-7a2 2 0 00-2-2H5a2 2 0 00-2 2v7a2 2 0 002 2z" />
            </svg>
            {{ emp.position?.name || '-' }}
          </span>
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
const departments = computed(() => store.departments)

const searchQuery = ref('')
const filterDepartment = ref('')
const filterStatus = ref('')
const showMobileFilter = ref(false)

const activeFilterCount = computed(() => {
  let count = 0
  if (searchQuery.value) count++
  if (filterDepartment.value) count++
  if (filterStatus.value) count++
  return count
})

const filteredEmployees = computed(() => {
  let list = store.employees
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter((e) => e.name.toLowerCase().includes(q) || (e.employee_code || '').toLowerCase().includes(q))
  }
  if (filterDepartment.value) {
    list = list.filter((e) => {
      const deptId = e.department_id || e.position?.department_id
      return deptId === filterDepartment.value
    })
  }
  if (filterStatus.value) {
    list = list.filter((e) => e.status === filterStatus.value)
  }
  return list
})

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

const openAddPage = () => router.push('/hr/employees/add')

onMounted(async () => {
  await Promise.all([
    store.fetchEmployees(),
    store.fetchDepartments(),
    store.fetchPositions(),
  ])
})
</script>