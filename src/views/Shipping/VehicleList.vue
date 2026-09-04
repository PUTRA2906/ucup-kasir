<template>
  <AdminLayout>
    <PageBreadcrumb pageTitle="Kendaraan" class="hidden md:block" />

    <!-- Mobile Header -->
    <MobilePageHeader title="Kendaraan" subtitle="Kelola armada" back-to="/">
      <template #actions>
        <button @click="openForm()" class="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm hover:bg-blue-500 active:scale-95">
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
        </button>
      </template>
    </MobilePageHeader>

    <!-- Desktop Header -->
    <div class="mb-4 hidden items-center justify-between md:flex">
      <h2 class="text-lg font-bold text-gray-900 dark:text-white">Daftar Kendaraan</h2>
      <button @click="openForm()" class="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-500">
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
        Tambah Kendaraan
      </button>
    </div>

    <!-- Form -->
    <div v-if="showForm" class="mb-4 rounded-2xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-500/30 dark:bg-blue-500/10">
      <h3 class="mb-3 text-sm font-bold text-gray-900 dark:text-white">{{ editTarget ? 'Edit' : 'Tambah' }} Kendaraan</h3>
      <div class="space-y-3">
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Plat Nomor <span class="text-red-500">*</span></label>
            <input v-model="form.plate_number" type="text" required class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-xs text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white" placeholder="B 1234 XYZ" />
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Tipe Kendaraan <span class="text-red-500">*</span></label>
            <select v-model="form.vehicle_type" class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white">
              <option value="pickup">Pickup</option>
              <option value="box">Box</option>
              <option value="dump_truck">Dump Truck</option>
              <option value="wingbox">Wingbox</option>
              <option value="tronton">Tronton</option>
              <option value="fuso">Fuso</option>
              <option value="motor">Motor</option>
              <option value="lainnya">Lainnya</option>
            </select>
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Merek</label>
            <input v-model="form.brand" type="text" class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white" placeholder="Mitsubishi, Hino, dll" />
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Kapasitas (kg)</label>
            <input v-model.number="form.capacity_kg" type="number" min="0" step="100" class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white" placeholder="0" />
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Status</label>
            <select v-model="form.status" class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white">
              <option value="tersedia">Tersedia</option>
              <option value="dipakai">Sedang Dipakai</option>
              <option value="service">Service</option>
            </select>
          </div>
          <div class="flex items-center pt-6">
            <label class="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
              <input v-model="form.is_active" type="checkbox" class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
              Aktif
            </label>
          </div>
        </div>
        <div class="flex gap-2">
          <button @click="closeForm" class="rounded-xl border border-gray-300 bg-white px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">Batal</button>
          <button @click="handleSubmit" :disabled="store.loading" class="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50">{{ store.loading ? 'Menyimpan...' : 'Simpan' }}</button>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="store.loading && store.vehicles.length === 0" class="flex items-center justify-center py-16">
      <div class="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
    </div>

    <div v-else-if="store.vehicles.length === 0" class="rounded-2xl border border-gray-200 bg-white p-10 text-center dark:border-gray-800 dark:bg-gray-900">
      <p class="text-sm text-gray-500 dark:text-gray-400">Belum ada kendaraan.</p>
    </div>

    <!-- Desktop Table -->
    <div v-else class="hidden overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900 md:block">
      <table class="w-full text-left text-xs">
        <thead>
          <tr class="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
            <th class="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Plat Nomor</th>
            <th class="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Tipe</th>
            <th class="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Merek</th>
            <th class="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-300">Kapasitas</th>
            <th class="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Status</th>
            <th class="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-300">Aksi</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="v in store.vehicles" :key="v.id" class="border-b border-gray-100 transition hover:bg-blue-50/50 dark:border-gray-800 dark:hover:bg-blue-500/5">
            <td class="px-4 py-3 font-medium text-gray-900 dark:text-white">{{ v.plate_number }}</td>
            <td class="px-4 py-3 text-gray-600 dark:text-gray-400">{{ v.vehicle_type }}</td>
            <td class="px-4 py-3 text-gray-600 dark:text-gray-400">{{ v.brand || '-' }}</td>
            <td class="px-4 py-3 text-right text-gray-900 dark:text-white">{{ formatNumber(v.capacity_kg) }} kg</td>
            <td class="px-4 py-3"><span class="rounded-lg px-2 py-0.5 text-[9px] font-bold uppercase" :class="getStatusBadge(v.status)">{{ v.status }}</span></td>
            <td class="px-4 py-3 text-right">
              <button @click="editVehicle(v)" class="mr-2 rounded-lg border border-gray-300 px-2.5 py-1 text-[9px] font-medium text-gray-600 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800">Edit</button>
              <button @click="handleDelete(v.id)" class="rounded-lg border border-red-300 px-2.5 py-1 text-[9px] font-medium text-red-600 hover:bg-red-50 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10">Hapus</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Mobile Cards -->
    <div v-else class="grid grid-cols-1 gap-3 md:hidden">
      <div v-for="v in store.vehicles" :key="v.id" class="rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-semibold text-gray-900 dark:text-white">{{ v.plate_number }}</p>
            <p class="text-[10px] text-gray-500 dark:text-gray-400">{{ v.vehicle_type }}{{ v.brand ? ' · ' + v.brand : '' }}</p>
          </div>
          <span class="rounded-lg px-2 py-0.5 text-[9px] font-bold uppercase" :class="getStatusBadge(v.status)">{{ v.status }}</span>
        </div>
        <div class="mt-1 flex items-center justify-between">
          <p class="text-[10px] text-gray-500 dark:text-gray-400">{{ formatNumber(v.capacity_kg) }} kg</p>
          <div class="flex gap-2">
            <button @click="editVehicle(v)" class="rounded-lg border border-gray-300 px-2.5 py-1 text-[9px] font-medium text-gray-600 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800">Edit</button>
            <button @click="handleDelete(v.id)" class="rounded-lg border border-red-300 px-2.5 py-1 text-[9px] font-medium text-red-600 hover:bg-red-50 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10">Hapus</button>
          </div>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import MobilePageHeader from '@/components/common/MobilePageHeader.vue'
import { useShippingStore } from '@/stores/shipping'

const store = useShippingStore()
const showForm = ref(false)
const editTarget = ref<string | null>(null)
const form = reactive<{ plate_number: string; vehicle_type: string; brand: string; capacity_kg: number; status: 'tersedia' | 'dipakai' | 'service'; is_active: boolean }>({ plate_number: '', vehicle_type: 'pickup', brand: '', capacity_kg: 0, status: 'tersedia', is_active: true })

const resetForm = () => {
  form.plate_number = ''
  form.vehicle_type = 'pickup'
  form.brand = ''
  form.capacity_kg = 0
  form.status = 'tersedia'
  form.is_active = true
  editTarget.value = null
}
const openForm = () => { resetForm(); showForm.value = true }
const closeForm = () => { resetForm(); showForm.value = false }

const editVehicle = (v: any) => {
  editTarget.value = v.id
  form.plate_number = v.plate_number
  form.vehicle_type = v.vehicle_type
  form.brand = v.brand || ''
  form.capacity_kg = v.capacity_kg
  form.status = v.status
  form.is_active = v.is_active
  showForm.value = true
}

const handleSubmit = async () => {
  if (!form.plate_number.trim()) return
  try {
    const payload = { plate_number: form.plate_number.trim().toUpperCase(), vehicle_type: form.vehicle_type, brand: form.brand?.trim() || undefined, capacity_kg: Number(form.capacity_kg) || 0, status: form.status, is_active: form.is_active }
    if (editTarget.value) {
      await store.updateVehicle(editTarget.value, payload)
    } else {
      await store.createVehicle(payload)
    }
    closeForm()
  } catch (e: any) { alert(e.message) }
}

const handleDelete = async (id: string) => {
  if (!confirm('Hapus kendaraan ini?')) return
  try { await store.deleteVehicle(id) } catch (e: any) { alert(e.message) }
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'tersedia': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
    case 'dipakai': return 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
    case 'service': return 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400'
    default: return 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
  }
}

const formatNumber = (n: number) => new Intl.NumberFormat('id-ID').format(n || 0)

onMounted(() => store.fetchVehicles())
</script>