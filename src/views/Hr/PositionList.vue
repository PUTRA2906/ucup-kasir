<template>
  <AdminLayout>
    <PageBreadcrumb pageTitle="Jabatan" class="hidden md:block" />

    <!-- Mobile Header -->
    <MobilePageHeader title="Jabatan" subtitle="Kelola jabatan &amp; gaji pokok" back-to="/">
      <template #actions>
        <button @click="openForm()" class="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm hover:bg-blue-500 active:scale-95">
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
        </button>
      </template>
    </MobilePageHeader>

    <!-- Desktop Header -->
    <div class="mb-4 hidden items-center justify-between md:flex">
      <h2 class="text-lg font-bold text-gray-900 dark:text-white">Daftar Jabatan</h2>
      <button @click="openForm()" class="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-500">
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
        Tambah Jabatan
      </button>
    </div>

    <!-- Form -->
    <div v-if="showForm" class="mb-4 rounded-2xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-500/30 dark:bg-blue-500/10">
      <h3 class="mb-3 text-sm font-bold text-gray-900 dark:text-white">{{ editTarget ? 'Edit' : 'Tambah' }} Jabatan</h3>
      <div class="space-y-3">
        <div>
          <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Nama Jabatan <span class="text-red-500">*</span></label>
          <input v-model="formPos.name" type="text" required class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-xs text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white" placeholder="Nama jabatan" />
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Departemen</label>
          <select v-model="formPos.department_id" class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white">
            <option value="">- Pilih -</option>
            <option v-for="d in store.departments" :key="d.id" :value="d.id">{{ d.name }}</option>
          </select>
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Gaji Pokok (Rp) <span class="text-red-500">*</span></label>
          <CurrencyInput v-model="formPos.base_salary" required class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white" placeholder="0"/>
        </div>
        <div class="flex items-center gap-2">
          <input v-model="formPos.is_active" type="checkbox" class="h-4 w-4 rounded border-gray-300 text-blue-600" />
          <span class="text-xs text-gray-700 dark:text-gray-300">Aktif</span>
        </div>
        <div class="flex gap-2">
          <button @click="showForm = false; resetForm()" class="rounded-xl border border-gray-300 bg-white px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">Batal</button>
          <button @click="handleSubmit" :disabled="store.loading" class="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50">{{ store.loading ? 'Menyimpan...' : 'Simpan' }}</button>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="store.loading && store.positions.length === 0" class="flex items-center justify-center py-16">
      <div class="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
    </div>

    <div v-else-if="store.positions.length === 0" class="rounded-2xl border border-gray-200 bg-white p-10 text-center dark:border-gray-800 dark:bg-gray-900">
      <p class="text-sm text-gray-500 dark:text-gray-400">Belum ada jabatan.</p>
    </div>

    <!-- Desktop Table -->
    <div v-else class="hidden overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900 md:block">
      <table class="w-full text-left text-xs">
        <thead>
          <tr class="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
            <th class="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Nama</th>
            <th class="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Departemen</th>
            <th class="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-300">Gaji Pokok</th>
            <th class="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Status</th>
            <th class="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-300">Aksi</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in store.positions" :key="p.id" class="border-b border-gray-100 transition hover:bg-blue-50/50 dark:border-gray-800 dark:hover:bg-blue-500/5">
            <td class="px-4 py-3 font-medium text-gray-900 dark:text-white">{{ p.name }}</td>
            <td class="px-4 py-3 text-gray-600 dark:text-gray-400">{{ (p as any).department?.name || '-' }}</td>
            <td class="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">{{ formatCurrency(p.base_salary) }}</td>
            <td class="px-4 py-3">
              <span class="rounded-lg px-2 py-0.5 text-[9px] font-bold" :class="p.is_active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'">{{ p.is_active ? 'Aktif' : 'Nonaktif' }}</span>
            </td>
            <td class="px-4 py-3 text-right">
              <button @click="editPos(p)" class="mr-2 rounded-lg border border-gray-300 px-2.5 py-1 text-[9px] font-medium text-gray-600 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800">Edit</button>
              <button @click="handleDelete(p.id)" class="rounded-lg border border-red-300 px-2.5 py-1 text-[9px] font-medium text-red-600 hover:bg-red-50 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10">Hapus</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Mobile Cards -->
    <div v-else class="grid grid-cols-1 gap-3 md:hidden">
      <div v-for="p in store.positions" :key="p.id" class="rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-semibold text-gray-900 dark:text-white">{{ p.name }}</p>
            <p class="text-[10px] text-gray-500 dark:text-gray-400">{{ (p as any).department?.name || 'Tanpa departemen' }}</p>
          </div>
          <span class="rounded-lg px-2 py-0.5 text-[9px] font-bold" :class="p.is_active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'">{{ p.is_active ? 'Aktif' : 'Nonaktif' }}</span>
        </div>
        <div class="mt-1 flex items-center justify-between">
          <p class="text-xs font-bold text-gray-900 dark:text-white">{{ formatCurrency(p.base_salary) }}</p>
          <div class="flex gap-2">
            <button @click="editPos(p)" class="rounded-lg border border-gray-300 px-2.5 py-1 text-[9px] font-medium text-gray-600 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800">Edit</button>
            <button @click="handleDelete(p.id)" class="rounded-lg border border-red-300 px-2.5 py-1 text-[9px] font-medium text-red-600 hover:bg-red-50 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10">Hapus</button>
          </div>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { useConfirm } from '@/composables/useConfirm'
import { useToast } from '@/composables/useToast'
import { ref, reactive, onMounted } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import CurrencyInput from '@/components/common/CurrencyInput.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import MobilePageHeader from '@/components/common/MobilePageHeader.vue'
import { useHrStore } from '@/stores/hr'

const { confirm } = useConfirm()
const toast = useToast()
const store = useHrStore()
const showForm = ref(false)
const editTarget = ref<string | null>(null)
const formPos = reactive({ name: '', department_id: '', base_salary: 0, is_active: true })

const resetForm = () => {
  formPos.name = ''
  formPos.department_id = ''
  formPos.base_salary = 0
  formPos.is_active = true
  editTarget.value = null
}

const openForm = () => { resetForm(); showForm.value = true }

const editPos = (p: any) => {
  editTarget.value = p.id
  formPos.name = p.name
  formPos.department_id = p.department_id || ''
  formPos.base_salary = p.base_salary
  formPos.is_active = p.is_active
  showForm.value = true
}

const handleSubmit = async () => {
  if (!formPos.name.trim()) return
  try {
    const payload = { name: formPos.name.trim(), department_id: formPos.department_id || undefined, base_salary: Number(formPos.base_salary) || 0, is_active: formPos.is_active }
    if (editTarget.value) {
      await store.updatePosition(editTarget.value, payload)
    } else {
      await store.createPosition(payload)
    }
    resetForm()
    showForm.value = false
  } catch (e: any) { toast.error('Gagal!', e.message) }
}

const handleDelete = async (id: string) => {
  if (!(await confirm('Hapus jabatan ini?'))) return
  try { await store.deletePosition(id) } catch (e: any) { toast.error('Gagal!', e.message) }
}

const formatCurrency = (v: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v || 0)

onMounted(() => Promise.all([store.fetchPositions(), store.fetchDepartments()]))
</script>