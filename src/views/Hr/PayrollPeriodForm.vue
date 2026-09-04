<template>
  <AdminLayout>
    <PageBreadcrumb pageTitle="Buat Periode Payroll" class="hidden md:block" />

    <!-- Mobile Header -->
    <MobilePageHeader title="Periode Payroll" subtitle="Buat periode penggajian baru" @back="$router.back()" />

    <!-- Error -->
    <div v-if="errorMsg" class="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">{{ errorMsg }}</div>

    <form @submit.prevent="handleSubmit" class="space-y-4">
      <div class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h3 class="mb-3 text-sm font-bold text-gray-900 dark:text-white">Detail Periode</h3>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Bulan <span class="text-red-500">*</span></label>
            <select
              v-model.number="form.month"
              class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              <option v-for="m in months" :key="m.value" :value="m.value">{{ m.label }}</option>
            </select>
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Tahun <span class="text-red-500">*</span></label>
            <input
              v-model.number="form.year"
              type="number"
              min="2000"
              :max="new Date().getFullYear() + 2"
              class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Tanggal Mulai <span class="text-red-500">*</span></label>
            <input
              v-model="form.start_date"
              type="date"
              required
              class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Tanggal Selesai <span class="text-red-500">*</span></label>
            <input
              v-model="form.end_date"
              type="date"
              required
              class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>
        </div>
      </div>

      <div class="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
        <p class="text-xs text-amber-800 dark:text-amber-300">
          Kode periode akan dibuat otomatis berdasarkan bulan dan tahun, contoh: <b>PRL-2026-09</b>. Pastikan tanggal mulai dan selesai sesuai dengan bulan/tahun yang dipilih.
        </p>
      </div>

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
          class="flex-[2] items-center justify-center rounded-xl bg-blue-600 py-3 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
        >
          {{ store.loading ? 'Menyimpan...' : 'Simpan Periode' }}
        </button>
      </div>
    </form>
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import MobilePageHeader from '@/components/common/MobilePageHeader.vue'
import { useHrStore } from '@/stores/hr'

const router = useRouter()
const store = useHrStore()
const errorMsg = ref('')

const now = new Date()
const form = reactive({
  month: now.getMonth() + 1,
  year: now.getFullYear(),
  start_date: '',
  end_date: '',
})

const months = [
  { value: 1, label: 'Januari' },
  { value: 2, label: 'Februari' },
  { value: 3, label: 'Maret' },
  { value: 4, label: 'April' },
  { value: 5, label: 'Mei' },
  { value: 6, label: 'Juni' },
  { value: 7, label: 'Juli' },
  { value: 8, label: 'Agustus' },
  { value: 9, label: 'September' },
  { value: 10, label: 'Oktober' },
  { value: 11, label: 'November' },
  { value: 12, label: 'Desember' },
]

const setDefaultDates = () => {
  const start = new Date(form.year, form.month - 1, 1)
  const end = new Date(form.year, form.month, 0)
  form.start_date = start.toISOString().split('T')[0]
  form.end_date = end.toISOString().split('T')[0]
}

const handleSubmit = async () => {
  errorMsg.value = ''
  if (!form.start_date || !form.end_date) {
    errorMsg.value = 'Tanggal mulai dan selesai wajib diisi'
    return
  }
  if (form.end_date < form.start_date) {
    errorMsg.value = 'Tanggal selesai tidak boleh sebelum tanggal mulai'
    return
  }
  try {
    const created = await store.createPayrollPeriod({
      period_code: `PRL-${form.year}-${String(form.month).padStart(2, '0')}`,
      period_month: form.month,
      period_year: form.year,
      start_date: form.start_date,
      end_date: form.end_date,
      status: 'draft',
      total_employee: 0,
      total_gross: 0,
      total_deduction: 0,
      total_net: 0,
    })
    router.push(`/hr/payroll/${created.id}`)
  } catch (e: any) {
    errorMsg.value = e.message
  }
}

onMounted(() => {
  setDefaultDates()
  store.fetchPayrollPeriods()
})
</script>