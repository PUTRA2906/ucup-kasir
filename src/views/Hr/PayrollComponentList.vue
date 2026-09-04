<template>
  <AdminLayout>
    <PageBreadcrumb pageTitle="Komponen Gaji" class="hidden md:block" />

    <!-- Mobile Header -->
    <MobilePageHeader title="Komponen Gaji" subtitle="Tunjangan &amp; potongan" back-to="/">
      <template #actions>
        <button @click="openForm()" class="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm hover:bg-blue-500 active:scale-95">
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
        </button>
      </template>
    </MobilePageHeader>

    <!-- Desktop Header -->
    <div class="mb-4 hidden items-center justify-between md:flex">
      <h2 class="text-lg font-bold text-gray-900 dark:text-white">Daftar Komponen Gaji</h2>
      <button @click="openForm()" class="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-500">
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
        Tambah Komponen
      </button>
    </div>

    <!-- Form -->
    <div v-if="showForm" class="mb-4 rounded-2xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-500/30 dark:bg-blue-500/10">
      <h3 class="mb-3 text-sm font-bold text-gray-900 dark:text-white">{{ editTarget ? 'Edit' : 'Tambah' }} Komponen</h3>
      <div class="space-y-3">
        <div>
          <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Nama Komponen <span class="text-red-500">*</span></label>
          <input v-model="formComp.name" type="text" required class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-xs text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white" placeholder="Contoh: Tunjangan Makan, Potongan Alpha" />
        </div>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Tipe <span class="text-red-500">*</span></label>
            <select v-model="formComp.type" class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white">
              <option value="tunjangan">Tunjangan</option>
              <option value="potongan">Potongan</option>
            </select>
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Tipe Nilai</label>
            <select v-model="formComp.is_percentage" class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white">
              <option :value="false">Nominal (Rp)</option>
              <option :value="true">Persentase (%)</option>
            </select>
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Nilai <span class="text-red-500">*</span></label>
            <input v-model.number="formComp.amount" type="number" min="0" step="0.01" required class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white" placeholder="0" />
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Berlaku Untuk</label>
            <select v-model="formComp.apply_to" class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white">
              <option value="semua">Semua Karyawan</option>
              <option value="per_jabatan">Per Jabatan</option>
              <option value="per_karyawan">Per Karyawan</option>
            </select>
          </div>
          <div v-if="formComp.apply_to === 'per_jabatan'">
            <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Jabatan</label>
            <select v-model="formComp.position_id" class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white">
              <option value="">- Pilih -</option>
              <option v-for="p in store.positions" :key="p.id" :value="p.id">{{ p.name }}</option>
            </select>
          </div>
          <div v-if="formComp.apply_to === 'per_karyawan'">
            <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Karyawan</label>
            <select v-model="formComp.employee_id" class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white">
              <option value="">- Pilih -</option>
              <option v-for="e in store.employees" :key="e.id" :value="e.id">{{ e.name }}</option>
            </select>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <input v-model="formComp.is_active" type="checkbox" class="h-4 w-4 rounded border-gray-300 text-blue-600" />
          <span class="text-xs text-gray-700 dark:text-gray-300">Aktif</span>
        </div>
        <div class="flex gap-2">
          <button @click="closeForm" class="rounded-xl border border-gray-300 bg-white px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">Batal</button>
          <button @click="handleSubmit" :disabled="store.loading" class="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50">{{ store.loading ? 'Menyimpan...' : 'Simpan' }}</button>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="store.loading && store.payrollComponents.length === 0" class="flex items-center justify-center py-16">
      <div class="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
    </div>

    <div v-else-if="store.payrollComponents.length === 0" class="rounded-2xl border border-gray-200 bg-white p-10 text-center dark:border-gray-800 dark:bg-gray-900">
      <p class="text-sm text-gray-500 dark:text-gray-400">Belum ada komponen gaji.</p>
    </div>

    <!-- Desktop Table -->
    <div v-else class="hidden overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900 md:block">
      <table class="w-full text-left text-xs">
        <thead>
          <tr class="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
            <th class="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Nama</th>
            <th class="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Tipe</th>
            <th class="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-300">Nilai</th>
            <th class="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Berlaku</th>
            <th class="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Status</th>
            <th class="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-300">Aksi</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="c in store.payrollComponents" :key="c.id" class="border-b border-gray-100 transition hover:bg-blue-50/50 dark:border-gray-800 dark:hover:bg-blue-500/5">
            <td class="px-4 py-3 font-medium text-gray-900 dark:text-white">{{ c.name }}</td>
            <td class="px-4 py-3">
              <span class="rounded-lg px-2 py-0.5 text-[9px] font-bold uppercase" :class="c.type === 'tunjangan' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400'">{{ c.type }}</span>
            </td>
            <td class="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">{{ formatValue(c) }}</td>
            <td class="px-4 py-3 text-gray-600 dark:text-gray-400">{{ applyToLabel(c) }}</td>
            <td class="px-4 py-3">
              <span class="rounded-lg px-2 py-0.5 text-[9px] font-bold" :class="c.is_active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'">{{ c.is_active ? 'Aktif' : 'Nonaktif' }}</span>
            </td>
            <td class="px-4 py-3 text-right">
              <button @click="editComp(c)" class="mr-2 rounded-lg border border-gray-300 px-2.5 py-1 text-[9px] font-medium text-gray-600 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800">Edit</button>
              <button @click="handleDelete(c.id)" class="rounded-lg border border-red-300 px-2.5 py-1 text-[9px] font-medium text-red-600 hover:bg-red-50 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10">Hapus</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Mobile Cards -->
    <div v-else class="grid grid-cols-1 gap-3 md:hidden">
      <div v-for="c in store.payrollComponents" :key="c.id" class="rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-semibold text-gray-900 dark:text-white">{{ c.name }}</p>
            <p class="text-[10px] text-gray-500 dark:text-gray-400">{{ applyToLabel(c) }}</p>
          </div>
          <div class="text-right">
            <p class="text-sm font-bold text-gray-900 dark:text-white">{{ formatValue(c) }}</p>
            <span class="rounded-lg px-2 py-0.5 text-[9px] font-bold uppercase" :class="c.type === 'tunjangan' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400'">{{ c.type }}</span>
          </div>
        </div>
        <div class="mt-2 flex gap-2">
          <button @click="editComp(c)" class="rounded-lg border border-gray-300 px-2.5 py-1 text-[9px] font-medium text-gray-600 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800">Edit</button>
          <button @click="handleDelete(c.id)" class="rounded-lg border border-red-300 px-2.5 py-1 text-[9px] font-medium text-red-600 hover:bg-red-50 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10">Hapus</button>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import MobilePageHeader from '@/components/common/MobilePageHeader.vue'
import { useHrStore } from '@/stores/hr'
import type { PayrollComponentInsert } from '@/types/database'

const store = useHrStore()
const showForm = ref(false)
const editTarget = ref<string | null>(null)

const defaultForm = () => ({
  name: '',
  type: 'tunjangan',
  amount: 0,
  is_percentage: false,
  apply_to: 'semua',
  position_id: '',
  employee_id: '',
  is_active: true,
})
const formComp = reactive(defaultForm())

const resetForm = () => {
  Object.assign(formComp, defaultForm())
  editTarget.value = null
}
const openForm = () => { resetForm(); showForm.value = true }
const closeForm = () => { resetForm(); showForm.value = false }

const editComp = (c: any) => {
  editTarget.value = c.id
  formComp.name = c.name
  formComp.type = c.type
  formComp.amount = c.amount
  formComp.is_percentage = c.is_percentage
  formComp.apply_to = c.apply_to
  formComp.position_id = c.position_id || ''
  formComp.employee_id = c.employee_id || ''
  formComp.is_active = c.is_active
  showForm.value = true
}

const formatValue = (c: any) => {
  const val = Number(c.amount) || 0
  if (c.is_percentage) return val + '%'
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val)
}

const applyToLabel = (c: any) => {
  switch (c.apply_to) {
    case 'semua': return 'Semua Karyawan'
    case 'per_jabatan': return `Jabatan: ${c.position?.name || '-'}`
    case 'per_karyawan': return `Karyawan: ${c.employee?.name || '-'}`
    default: return c.apply_to
  }
}

const handleSubmit = async () => {
  if (!formComp.name.trim()) return
  try {
    const payload: PayrollComponentInsert = {
      name: formComp.name.trim(),
      type: formComp.type as PayrollComponentInsert['type'],
      amount: Number(formComp.amount) || 0,
      is_percentage: formComp.is_percentage,
      apply_to: formComp.apply_to as PayrollComponentInsert['apply_to'],
      position_id: formComp.apply_to === 'per_jabatan' ? formComp.position_id || undefined : undefined,
      employee_id: formComp.apply_to === 'per_karyawan' ? formComp.employee_id || undefined : undefined,
      is_active: formComp.is_active,
    }
    if (editTarget.value) {
      await store.updatePayrollComponent(editTarget.value, payload)
    } else {
      await store.createPayrollComponent(payload)
    }
    closeForm()
  } catch (e: any) { alert(e.message) }
}

const handleDelete = async (id: string) => {
  if (!confirm('Hapus komponen ini?')) return
  try { await store.deletePayrollComponent(id) } catch (e: any) { alert(e.message) }
}

onMounted(() => Promise.all([store.fetchPayrollComponents(), store.fetchPositions(), store.fetchEmployees()]))
</script>