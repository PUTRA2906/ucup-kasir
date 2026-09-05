<template>
  <AdminLayout>
    <PageBreadcrumb pageTitle="Absensi" class="hidden md:block" />

    <!-- Mobile Header -->
    <MobilePageHeader title="Absensi" subtitle="Data kehadiran karyawan" back-to="/" />

    <!-- Filter -->
    <div class="mb-4 flex flex-wrap items-center gap-3">
      <div class="relative flex-1 min-w-[200px]">
        <svg class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Cari karyawan..."
          class="w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-xs text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
        />
      </div>
      <input
        v-model="filterDate"
        type="date"
        class="rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
      />
      <select
        v-model="filterStatus"
        class="rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
      >
        <option value="">Semua Status</option>
        <option value="hadir">Hadir</option>
        <option value="izin">Izin</option>
        <option value="sakit">Sakit</option>
        <option value="cuti">Cuti</option>
        <option value="alpa">Alpa</option>
      </select>
      <button
        @click="showModal = true"
        class="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-500"
      >
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
        Input Absensi
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading && store.attendance.length === 0" class="flex items-center justify-center py-16">
      <div class="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
    </div>

    <div v-else-if="filteredAttendance.length === 0" class="rounded-2xl border border-gray-200 bg-white p-10 text-center dark:border-gray-800 dark:bg-gray-900">
      <p class="text-sm text-gray-500 dark:text-gray-400">Tidak ada data absensi.</p>
    </div>

    <!-- Desktop Table -->
    <div v-else class="hidden overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900 md:block">
      <table class="w-full text-left text-xs">
        <thead>
          <tr class="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
            <th class="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Tanggal</th>
            <th class="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Karyawan</th>
            <th class="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Check In</th>
            <th class="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Check Out</th>
            <th class="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Status</th>
            <th class="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Keterangan</th>
            <th class="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-300">Aksi</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="att in filteredAttendance" :key="att.id" class="border-b border-gray-100 transition hover:bg-blue-50/50 dark:border-gray-800 dark:hover:bg-blue-500/5">
            <td class="px-4 py-3 text-gray-900 dark:text-white">{{ att.attendance_date }}</td>
            <td class="px-4 py-3 font-medium text-gray-900 dark:text-white">{{ att.employee?.name || '-' }}</td>
            <td class="px-4 py-3 text-gray-600 dark:text-gray-400">{{ att.check_in || '-' }}</td>
            <td class="px-4 py-3 text-gray-600 dark:text-gray-400">{{ att.check_out || '-' }}</td>
            <td class="px-4 py-3">
              <span class="rounded-lg px-2 py-0.5 text-[9px] font-bold uppercase" :class="getStatusBadge(att.status)">{{ att.status }}</span>
            </td>
            <td class="px-4 py-3 text-gray-600 dark:text-gray-400">{{ att.notes || '-' }}</td>
            <td class="px-4 py-3 text-right">
              <button @click="editAttendance(att)" class="mr-2 rounded-lg border border-gray-300 px-2.5 py-1 text-[9px] font-medium text-gray-600 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800">Edit</button>
              <button @click="handleDelete(att.id)" class="rounded-lg border border-red-300 px-2.5 py-1 text-[9px] font-medium text-red-600 hover:bg-red-50 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10">Hapus</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Mobile Cards -->
    <div v-else class="grid grid-cols-1 gap-3 md:hidden">
      <div v-for="att in filteredAttendance" :key="att.id" class="rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div class="flex items-center justify-between">
          <div class="flex-1">
            <p class="text-sm font-semibold text-gray-900 dark:text-white">{{ att.employee?.name || '-' }}</p>
            <p class="text-[10px] text-gray-500 dark:text-gray-400">{{ att.attendance_date }}</p>
          </div>
          <span class="rounded-lg px-2 py-0.5 text-[9px] font-bold uppercase" :class="getStatusBadge(att.status)">{{ att.status }}</span>
        </div>
        <div class="mt-2 flex items-center gap-2 text-[10px] text-gray-500 dark:text-gray-400">
          <span>Masuk: {{ att.check_in || '-' }}</span>
          <span>Pulang: {{ att.check_out || '-' }}</span>
        </div>
      </div>
    </div>

    <!-- Modal Input Absensi -->
    <div v-if="showModal" class="fixed inset-0 z-50 flex items-end justify-center bg-black/50 md:items-center" @click.self="showModal = false">
      <div class="w-full max-w-lg rounded-t-2xl bg-white p-4 md:rounded-2xl dark:bg-gray-900" @click.stop>
        <div class="mb-4 flex items-center justify-between">
          <h3 class="text-sm font-bold text-gray-900 dark:text-white">{{ editAttId ? 'Edit' : 'Input' }} Absensi</h3>
          <button @click="closeModal" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div class="space-y-3">
          <div>
            <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Karyawan <span class="text-red-500">*</span></label>
            <select v-model="attForm.employee_id" class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white">
              <option value="">- Pilih -</option>
              <option v-for="e in store.employees" :key="e.id" :value="e.id">{{ e.name }} ({{ e.employee_code }})</option>
            </select>
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Tanggal <span class="text-red-500">*</span></label>
            <input v-model="attForm.attendance_date" type="date" required class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Check In</label>
              <input v-model="attForm.check_in" type="time" class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
            </div>
            <div>
              <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Check Out</label>
              <input v-model="attForm.check_out" type="time" class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
            </div>
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Status <span class="text-red-500">*</span></label>
            <select v-model="attForm.status" class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white">
              <option value="hadir">Hadir</option>
              <option value="izin">Izin</option>
              <option value="sakit">Sakit</option>
              <option value="cuti">Cuti</option>
              <option value="alpa">Alpa</option>
            </select>
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Keterangan</label>
            <textarea v-model="attForm.notes" rows="2" class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white" placeholder="Catatan"></textarea>
          </div>
          <div class="flex gap-2 pt-2">
            <button @click="closeModal" class="flex-1 rounded-xl border border-gray-300 bg-white py-2.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">Batal</button>
            <button @click="handleAttSubmit" :disabled="store.loading" class="flex-[2] rounded-xl bg-blue-600 py-2.5 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50">{{ store.loading ? 'Menyimpan...' : 'Simpan' }}</button>
          </div>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { useConfirm } from '@/composables/useConfirm'
import { useToast } from '@/composables/useToast'
import { ref, reactive, computed, onMounted } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import MobilePageHeader from '@/components/common/MobilePageHeader.vue'
import { useHrStore } from '@/stores/hr'
import type { AttendanceInsert } from '@/types/database'

const { confirm } = useConfirm()
const toast = useToast()
const store = useHrStore()
const loading = computed(() => store.loading)

const searchQuery = ref('')
const filterDate = ref(new Date().toISOString().split('T')[0])
const filterStatus = ref('')
const showModal = ref(false)
const editAttId = ref<string | null>(null)

const defaultForm = () => ({
  employee_id: '',
  attendance_date: new Date().toISOString().split('T')[0],
  check_in: '08:00',
  check_out: '17:00',
  status: 'hadir',
  notes: '',
})
const attForm = reactive(defaultForm())

const filteredAttendance = computed(() => {
  let list = store.attendance
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter((a) => (a.employee?.name || '').toLowerCase().includes(q))
  }
  if (filterDate.value) {
    list = list.filter((a) => a.attendance_date === filterDate.value)
  }
  if (filterStatus.value) {
    list = list.filter((a) => a.status === filterStatus.value)
  }
  return list.sort((a, b) => b.attendance_date.localeCompare(a.attendance_date))
})

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'hadir': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
    case 'izin': return 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400'
    case 'sakit': return 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
    case 'cuti': return 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400'
    case 'alpa': return 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400'
    default: return 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
  }
}

const closeModal = () => {
  showModal.value = false
  editAttId.value = null
  Object.assign(attForm, defaultForm())
}

const editAttendance = (att: any) => {
  editAttId.value = att.id
  attForm.employee_id = att.employee_id
  attForm.attendance_date = att.attendance_date
  attForm.check_in = att.check_in || ''
  attForm.check_out = att.check_out || ''
  attForm.status = att.status
  attForm.notes = att.notes || ''
  showModal.value = true
}

const handleAttSubmit = async () => {
  if (!attForm.employee_id || !attForm.attendance_date) return
  try {
    const payload: AttendanceInsert = {
      employee_id: attForm.employee_id,
      attendance_date: attForm.attendance_date,
      check_in: attForm.check_in || undefined,
      check_out: attForm.check_out || undefined,
      status: attForm.status as AttendanceInsert['status'],
      notes: attForm.notes || undefined,
    }
    if (editAttId.value) {
      await store.updateAttendance(editAttId.value, payload)
    } else {
      await store.createAttendance(payload)
    }
    closeModal()
  } catch (e: any) { toast.error('Gagal!', e.message) }
}

const handleDelete = async (id: string) => {
  if (!(await confirm('Hapus data absensi ini?'))) return
  try { await store.deleteAttendance(id) } catch (e: any) { toast.error('Gagal!', e.message) }
}

onMounted(async () => {
  await Promise.all([store.fetchAttendance(), store.fetchEmployees()])
})
</script>