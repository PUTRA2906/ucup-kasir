<template>
  <AdminLayout>
    <PageBreadcrumb pageTitle="Departemen" class="hidden md:block" />

    <!-- Mobile Header -->
    <MobilePageHeader title="Departemen" subtitle="Kelola departemen" back-to="/">
      <template #actions>
        <button
          @click="showForm = true; editTarget = null"
          class="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm hover:bg-blue-500 active:scale-95"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
        </button>
      </template>
    </MobilePageHeader>

    <!-- Desktop Header -->
    <div class="mb-4 hidden items-center justify-between md:flex">
      <h2 class="text-lg font-bold text-gray-900 dark:text-white">Daftar Departemen</h2>
      <button
        @click="showForm = true; editTarget = null"
        class="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-500"
      >
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
        Tambah Departemen
      </button>
    </div>

    <!-- Form Modal -->
    <div v-if="showForm" class="mb-4 rounded-2xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-500/30 dark:bg-blue-500/10">
      <h3 class="mb-3 text-sm font-bold text-gray-900 dark:text-white">{{ editTarget ? 'Edit' : 'Tambah' }} Departemen</h3>
      <div class="space-y-3">
        <div>
          <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Nama Departemen <span class="text-red-500">*</span></label>
          <input
            v-model="formDept.name"
            type="text"
            required
            class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-xs text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            placeholder="Nama departemen"
          />
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Deskripsi</label>
          <textarea
            v-model="formDept.description"
            rows="2"
            class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            placeholder="Deskripsi departemen"
          ></textarea>
        </div>
        <div class="flex items-center gap-2">
          <input v-model="formDept.is_active" type="checkbox" class="h-4 w-4 rounded border-gray-300 text-blue-600" />
          <span class="text-xs text-gray-700 dark:text-gray-300">Aktif</span>
        </div>
        <div class="flex gap-2">
          <button
            @click="showForm = false"
            class="rounded-xl border border-gray-300 bg-white px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
          >
            Batal
          </button>
          <button
            @click="handleDeptSubmit"
            :disabled="store.loading"
            class="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {{ store.loading ? 'Menyimpan...' : 'Simpan' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="store.loading && store.departments.length === 0" class="flex items-center justify-center py-16">
      <div class="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
    </div>

    <!-- Empty -->
    <div v-else-if="store.departments.length === 0" class="rounded-2xl border border-gray-200 bg-white p-10 text-center dark:border-gray-800 dark:bg-gray-900">
      <p class="text-sm text-gray-500 dark:text-gray-400">Belum ada departemen.</p>
    </div>

    <!-- Desktop Table -->
    <div v-else class="hidden overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900 md:block">
      <table class="w-full text-left text-xs">
        <thead>
          <tr class="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
            <th class="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Nama</th>
            <th class="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Deskripsi</th>
            <th class="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Status</th>
            <th class="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-300">Aksi</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="d in store.departments" :key="d.id" class="border-b border-gray-100 transition hover:bg-blue-50/50 dark:border-gray-800 dark:hover:bg-blue-500/5">
            <td class="px-4 py-3 font-medium text-gray-900 dark:text-white">{{ d.name }}</td>
            <td class="px-4 py-3 text-gray-600 dark:text-gray-400">{{ d.description || '-' }}</td>
            <td class="px-4 py-3">
              <span class="rounded-lg px-2 py-0.5 text-[9px] font-bold" :class="d.is_active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'">
                {{ d.is_active ? 'Aktif' : 'Nonaktif' }}
              </span>
            </td>
            <td class="px-4 py-3 text-right">
              <button @click="editDept(d)" class="mr-2 rounded-lg border border-gray-300 px-2.5 py-1 text-[9px] font-medium text-gray-600 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800">Edit</button>
              <button @click="handleDelete(d.id)" class="rounded-lg border border-red-300 px-2.5 py-1 text-[9px] font-medium text-red-600 hover:bg-red-50 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10">Hapus</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Mobile Cards -->
    <div v-else class="grid grid-cols-1 gap-3 md:hidden">
      <div v-for="d in store.departments" :key="d.id" class="rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-semibold text-gray-900 dark:text-white">{{ d.name }}</p>
            <p class="text-[10px] text-gray-500 dark:text-gray-400">{{ d.description || '-' }}</p>
          </div>
          <span class="rounded-lg px-2 py-0.5 text-[9px] font-bold" :class="d.is_active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'">
            {{ d.is_active ? 'Aktif' : 'Nonaktif' }}
          </span>
        </div>
        <div class="mt-2 flex gap-2">
          <button @click="editDept(d)" class="rounded-lg border border-gray-300 px-2.5 py-1 text-[9px] font-medium text-gray-600 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800">Edit</button>
          <button @click="handleDelete(d.id)" class="rounded-lg border border-red-300 px-2.5 py-1 text-[9px] font-medium text-red-600 hover:bg-red-50 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10">Hapus</button>
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

const store = useHrStore()
const showForm = ref(false)
const editTarget = ref<string | null>(null)
const formDept = reactive({ name: '', description: '', is_active: true })

const resetForm = () => {
  formDept.name = ''
  formDept.description = ''
  formDept.is_active = true
  editTarget.value = null
}

const editDept = (d: any) => {
  editTarget.value = d.id
  formDept.name = d.name
  formDept.description = d.description || ''
  formDept.is_active = d.is_active
  showForm.value = true
}

const handleDeptSubmit = async () => {
  if (!formDept.name.trim()) return
  try {
    if (editTarget.value) {
      await store.updateDepartment(editTarget.value, { name: formDept.name.trim(), description: formDept.description || undefined, is_active: formDept.is_active })
    } else {
      await store.createDepartment({ name: formDept.name.trim(), description: formDept.description || undefined, is_active: formDept.is_active })
    }
    resetForm()
    showForm.value = false
  } catch (e: any) {
    alert(e.message)
  }
}

const handleDelete = async (id: string) => {
  if (!confirm('Hapus departemen ini?')) return
  try {
    await store.deleteDepartment(id)
  } catch (e: any) {
    alert(e.message)
  }
}

onMounted(() => store.fetchDepartments())
</script>