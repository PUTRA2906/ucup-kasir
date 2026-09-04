<template>
  <AdminLayout>
    <PageBreadcrumb :pageTitle="isEdit ? 'Edit Karyawan' : 'Tambah Karyawan'" class="hidden md:block" />

    <!-- Mobile Header -->
    <MobilePageHeader :title="isEdit ? 'Edit Karyawan' : 'Tambah Karyawan'" subtitle="Data pribadi &amp; pekerjaan" @back="$router.back()" />

    <!-- Error -->
    <div v-if="errorMsg" class="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
      {{ errorMsg }}
    </div>

    <form v-if="!loading || isEdit" @submit.prevent="handleSubmit" class="space-y-4">
      <!-- Data Pribadi -->
      <div class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h3 class="mb-3 text-sm font-bold text-gray-900 dark:text-white">Data Pribadi</h3>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div class="sm:col-span-2">
            <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Nama Lengkap <span class="text-red-500">*</span></label>
            <input
              v-model="form.name"
              type="text"
              required
              class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-xs text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              placeholder="Nama karyawan"
            />
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Jenis Kelamin</label>
            <select v-model="form.gender" class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white">
              <option value="">- Pilih -</option>
              <option value="laki_laki">Laki-laki</option>
              <option value="perempuan">Perempuan</option>
            </select>
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Tanggal Lahir</label>
            <input v-model="form.birth_date" type="date" class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Tempat Lahir</label>
            <input v-model="form.birth_place" type="text" class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white" placeholder="Kota kelahiran" />
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">No. Telepon</label>
            <input v-model="form.phone" type="tel" class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white" placeholder="08xxxx" />
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Email</label>
            <input v-model="form.email" type="email" class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white" placeholder="email@contoh.com" />
          </div>
          <div class="sm:col-span-2">
            <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Alamat</label>
            <textarea v-model="form.address" rows="2" class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white" placeholder="Alamat lengkap"></textarea>
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Jenis Identitas</label>
            <select v-model="form.identity_type" class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white">
              <option value="">- Pilih -</option>
              <option value="ktp">KTP</option>
              <option value="sim">SIM</option>
              <option value="passport">Paspor</option>
            </select>
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Nomor Identitas</label>
            <input v-model="form.identity_number" type="text" class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white" placeholder="NIK" />
          </div>
        </div>
      </div>

      <!-- Data Pekerjaan -->
      <div class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h3 class="mb-3 text-sm font-bold text-gray-900 dark:text-white">Data Pekerjaan</h3>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Departemen</label>
            <select v-model="form.department_id" class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white">
              <option value="">- Pilih -</option>
              <option v-for="d in store.departments" :key="d.id" :value="d.id">{{ d.name }}</option>
            </select>
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Jabatan</label>
            <select v-model="form.position_id" class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white">
              <option value="">- Pilih -</option>
              <option v-for="p in filteredPositions" :key="p.id" :value="p.id">{{ p.name }}</option>
            </select>
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Tanggal Bergabung</label>
            <input v-model="form.join_date" type="date" class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Status Karyawan</label>
            <select v-model="form.status" class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white">
              <option value="aktif">Aktif</option>
              <option value="cuti">Cuti</option>
              <option value="nonaktif">Nonaktif</option>
              <option value="keluar">Keluar</option>
            </select>
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Tipe Gaji</label>
            <select v-model="form.salary_type" class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white">
              <option value="bulanan">Bulanan</option>
              <option value="harian">Harian</option>
              <option value="mingguan">Mingguan</option>
            </select>
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Gaji Pokok (Rp) <span class="text-red-500">*</span></label>
            <input
              v-model.number="form.base_salary"
              type="number"
              min="0"
              step="1000"
              required
              class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-xs text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              placeholder="0"
            />
          </div>
          <div v-if="isEdit" class="sm:col-span-2">
            <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Tanggal Keluar</label>
            <input v-model="form.resign_date" type="date" class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
          </div>
        </div>
      </div>

      <!-- Info Bank & Lainnya -->
      <div class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h3 class="mb-3 text-sm font-bold text-gray-900 dark:text-white">Info Bank &amp; Lainnya</h3>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Nama Bank</label>
            <input v-model="form.bank_name" type="text" class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white" placeholder="BCA, BRI, dst" />
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Nomor Rekening</label>
            <input v-model="form.bank_account_number" type="text" class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white" placeholder="Nomor rekening" />
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Nama Rekening</label>
            <input v-model="form.bank_account_name" type="text" class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white" placeholder="Sesuai rekening" />
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">NPWP</label>
            <input v-model="form.npwp" type="text" class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white" placeholder="Nomor NPWP" />
          </div>
          <div class="sm:col-span-2">
            <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Catatan</label>
            <textarea v-model="form.notes" rows="2" class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white" placeholder="Catatan tambahan"></textarea>
          </div>
          <div class="sm:col-span-2">
            <label class="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
              <input v-model="form.is_active" type="checkbox" class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
              Karyawan aktif
            </label>
          </div>
        </div>
      </div>

      <!-- Submit -->
      <div class="flex gap-3">
        <button
          type="button"
          @click="$router.back()"
          class="flex-1 rounded-xl border border-gray-300 bg-white py-3 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          Batal
        </button>
        <button
          type="submit"
          :disabled="store.loading"
          class="flex flex-[2] items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
        >
          <svg v-if="store.loading" class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
          </svg>
          {{ isEdit ? 'Simpan Perubahan' : 'Simpan Karyawan' }}
        </button>
      </div>
    </form>
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import MobilePageHeader from '@/components/common/MobilePageHeader.vue'
import { useHrStore } from '@/stores/hr'

const route = useRoute()
const router = useRouter()
const store = useHrStore()

const isEdit = computed(() => !!route.params.id)
const loading = ref(false)
const errorMsg = ref('')

const form = reactive({
  name: '',
  gender: '',
  birth_place: '',
  birth_date: '',
  phone: '',
  email: '',
  address: '',
  identity_type: '',
  identity_number: '',
  department_id: '',
  position_id: '',
  join_date: '',
  resign_date: '',
  status: 'aktif',
  salary_type: 'bulanan',
  base_salary: 0,
  bank_name: '',
  bank_account_number: '',
  bank_account_name: '',
  npwp: '',
  notes: '',
  is_active: true,
})

const filteredPositions = computed(() => {
  if (!form.department_id) return store.positions
  return store.positions.filter((p) => !p.department_id || p.department_id === form.department_id)
})

const loadForm = async () => {
  if (!isEdit.value) return
  loading.value = true
  try {
    const emp = await store.getEmployee(route.params.id as string)
    if (!emp) {
      errorMsg.value = 'Karyawan tidak ditemukan'
      return
    }
    form.name = emp.name || ''
    form.gender = emp.gender || ''
    form.birth_place = emp.birth_place || ''
    form.birth_date = emp.birth_date || ''
    form.phone = emp.phone || ''
    form.email = emp.email || ''
    form.address = emp.address || ''
    form.identity_type = emp.identity_type || ''
    form.identity_number = emp.identity_number || ''
    form.department_id = emp.department_id || ''
    form.position_id = emp.position_id || ''
    form.join_date = emp.join_date || ''
    form.resign_date = emp.resign_date || ''
    form.status = emp.status
    form.salary_type = emp.salary_type
    form.base_salary = emp.base_salary || 0
    form.bank_name = emp.bank_name || ''
    form.bank_account_number = emp.bank_account_number || ''
    form.bank_account_name = emp.bank_account_name || ''
    form.npwp = emp.npwp || ''
    form.notes = emp.notes || ''
    form.is_active = emp.is_active
  } catch (e: any) {
    errorMsg.value = e.message
  } finally {
    loading.value = false
  }
}

const handleSubmit = async () => {
  errorMsg.value = ''
  if (!form.name.trim()) {
    errorMsg.value = 'Nama karyawan wajib diisi'
    return
  }
  const payload: any = {
    name: form.name.trim(),
    gender: form.gender || null,
    birth_place: form.birth_place || null,
    birth_date: form.birth_date || null,
    phone: form.phone || null,
    email: form.email || null,
    address: form.address || null,
    identity_type: form.identity_type || null,
    identity_number: form.identity_number || null,
    department_id: form.department_id || null,
    position_id: form.position_id || null,
    join_date: form.join_date || null,
    resign_date: form.resign_date || null,
    status: form.status,
    salary_type: form.salary_type,
    base_salary: Number(form.base_salary) || 0,
    bank_name: form.bank_name || null,
    bank_account_number: form.bank_account_number || null,
    bank_account_name: form.bank_account_name || null,
    npwp: form.npwp || null,
    notes: form.notes || null,
    is_active: form.is_active,
  }

  try {
    if (isEdit.value) {
      await store.updateEmployee(route.params.id as string, payload)
    } else {
      await store.createEmployee(payload)
    }
    router.push('/hr/employees')
  } catch (e: any) {
    errorMsg.value = e.message
  }
}

onMounted(async () => {
  await Promise.all([store.fetchDepartments(), store.fetchPositions()])
  await loadForm()
})
</script>