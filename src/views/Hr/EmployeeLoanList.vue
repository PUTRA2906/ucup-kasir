<template>
  <AdminLayout>
    <PageBreadcrumb pageTitle="Kasbon Karyawan" class="hidden md:block" />

    <!-- Mobile Header -->
    <MobilePageHeader title="Kasbon Karyawan" subtitle="Pinjaman & Pemotongan Gaji">
      <template #actions>
        <button
          @click="openForm()"
          class="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm transition hover:bg-blue-500 active:scale-95"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </template>
    </MobilePageHeader>

    <!-- Desktop Header -->
    <div class="mb-4 hidden items-center justify-between md:flex">
      <h2 class="text-lg font-bold text-gray-900 dark:text-white">Daftar Kasbon Karyawan</h2>
      <button
        @click="openForm()"
        class="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-500"
      >
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Tambah Kasbon
      </button>
    </div>

    <!-- Form Modal -->
    <div v-if="showForm" class="mb-4 rounded-2xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-500/30 dark:bg-blue-500/10">
      <h3 class="mb-3 text-sm font-bold text-gray-900 dark:text-white">{{ editTarget ? 'Edit' : 'Tambah' }} Kasbon</h3>
      <div class="space-y-3">
        <div>
          <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Karyawan <span class="text-red-500">*</span></label>
          <SelectField
            v-model="formLoan.employee_id"
            :options="store.employees.map((e) => ({ label: e.name, value: e.id }))"
            title="Pilih Karyawan"
            placeholder="- Pilih Karyawan -"
            searchable
            search-placeholder="Cari karyawan..."
            button-class="flex w-full items-center justify-between rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
        </div>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Tanggal Kasbon</label>
            <DateField
              v-model="formLoan.loan_date"
              title="Tanggal Kasbon"
              button-class="flex w-full items-center justify-between rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Jumlah Kasbon <span class="text-red-500">*</span></label>
            <CurrencyInput
              v-model="formLoan.amount"
              required
              class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              placeholder="0"
            />
          </div>
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Keterangan</label>
          <textarea
            v-model="formLoan.description"
            rows="2"
            class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            placeholder="Keterangan kasbon..."
          ></textarea>
        </div>
        <div class="flex gap-2">
          <button
            @click="closeForm"
            class="rounded-xl border border-gray-300 bg-white px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
          >
            Batal
          </button>
          <button
            @click="handleSubmit"
            :disabled="store.loading"
            class="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {{ store.loading ? 'Menyimpan...' : 'Simpan' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Filter Desktop -->
    <div class="mb-4 hidden flex-wrap items-center gap-3 md:flex">
      <div class="relative flex-1 max-w-xs">
        <svg class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Cari nama karyawan..."
          class="w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-xs text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder-gray-500"
        />
      </div>
      <SelectField
        v-model="filterStatus"
        :options="[
          { label: 'Semua Status', value: '' },
          { label: 'Aktif', value: 'active' },
          { label: 'Lunas', value: 'paid' },
          { label: 'Dibatalkan', value: 'cancelled' },
        ]"
        title="Pilih Status"
        placeholder="Semua Status"
        button-class="flex items-center justify-between rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-xs text-gray-900 focus:border-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
      />
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
              placeholder="Cari nama karyawan..."
              class="w-full rounded-xl border border-gray-300 bg-gray-50 py-2.5 pl-10 pr-4 text-xs text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
            />
          </div>
          <SelectField
            v-model="filterStatus"
            :options="[
              { label: 'Semua Status', value: '' },
              { label: 'Aktif', value: 'active' },
              { label: 'Lunas', value: 'paid' },
              { label: 'Dibatalkan', value: 'cancelled' },
            ]"
            title="Pilih Status"
            placeholder="Semua Status"
            button-class="flex w-full items-center justify-between rounded-xl border border-gray-300 bg-gray-50 px-3 py-2 text-xs text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          />
        </div>
      </transition>
    </div>

    <!-- Loading -->
    <div v-if="store.loading && store.employeeLoans.length === 0" class="flex items-center justify-center py-20">
      <div class="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
    </div>

    <!-- Empty State -->
    <div v-else-if="filteredLoans.length === 0" class="py-20 text-center">
      <svg class="mx-auto mb-4 h-16 w-16 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
      <p class="mb-1 text-sm font-medium text-gray-500 dark:text-gray-400">Tidak ada kasbon ditemukan</p>
      <p class="mb-4 text-xs text-gray-400 dark:text-gray-500">Coba ubah filter atau tambah kasbon baru</p>
      <button
        @click="openForm()"
        class="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-500"
      >
        + Tambah Kasbon
      </button>
    </div>

    <!-- Desktop Table -->
    <div v-else class="hidden overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900 md:block">
      <table class="w-full text-left text-xs">
        <thead>
          <tr class="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
            <th class="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Tanggal</th>
            <th class="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Karyawan</th>
            <th class="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-300">Jumlah</th>
            <th class="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-300">Sisa</th>
            <th class="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Status</th>
            <th class="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-300">Aksi</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="loan in filteredLoans"
            :key="loan.id"
            class="cursor-pointer border-b border-gray-100 transition hover:bg-blue-50/50 dark:border-gray-800 dark:hover:bg-blue-500/5"
          >
            <td class="px-4 py-3 text-gray-600 dark:text-gray-400">{{ formatDate(loan.loan_date) }}</td>
            <td class="px-4 py-3 font-medium text-gray-900 dark:text-white">{{ loan.employee?.name || '-' }}</td>
            <td class="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">{{ formatCurrency(loan.amount) }}</td>
            <td class="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">{{ formatCurrency(loan.remaining_amount) }}</td>
            <td class="px-4 py-3">
              <span class="rounded-lg px-2 py-0.5 text-[9px] font-bold uppercase" :class="getStatusBadge(loan.status)">
                {{ getStatusLabel(loan.status) }}
              </span>
            </td>
            <td class="px-4 py-3 text-right">
              <button
                v-if="loan.status === 'active'"
                @click.stop="editLoan(loan)"
                class="mr-2 rounded-lg border border-gray-300 px-2.5 py-1 text-[9px] font-medium text-gray-600 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800"
              >
                Edit
              </button>
              <button
                v-if="loan.status === 'active'"
                @click.stop="handleDelete(loan.id)"
                class="rounded-lg border border-red-300 px-2.5 py-1 text-[9px] font-medium text-red-600 hover:bg-red-50 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10"
              >
                Hapus
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Mobile Card Grid -->
    <div v-if="filteredLoans.length > 0" class="grid grid-cols-1 gap-3 md:hidden">
      <div
        v-for="loan in filteredLoans"
        :key="loan.id"
        class="cursor-pointer rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm transition hover:border-blue-300 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-blue-500/50"
      >
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <p class="text-sm font-semibold text-gray-900 dark:text-white">{{ loan.employee?.name || '-' }}</p>
            <p class="text-[10px] text-gray-500 dark:text-gray-400">{{ formatDate(loan.loan_date) }}</p>
          </div>
          <span class="rounded-lg px-2 py-0.5 text-[9px] font-bold uppercase" :class="getStatusBadge(loan.status)">
            {{ getStatusLabel(loan.status) }}
          </span>
        </div>
        <div class="mt-2 grid grid-cols-2 gap-2">
          <div>
            <p class="text-[9px] text-gray-500 dark:text-gray-400">Jumlah Kasbon</p>
            <p class="text-xs font-bold text-gray-900 dark:text-white">{{ formatCurrency(loan.amount) }}</p>
          </div>
          <div>
            <p class="text-[9px] text-gray-500 dark:text-gray-400">Sisa</p>
            <p class="text-xs font-bold text-gray-900 dark:text-white">{{ formatCurrency(loan.remaining_amount) }}</p>
          </div>
        </div>
        <div v-if="loan.description" class="mt-2 text-[10px] text-gray-600 dark:text-gray-400">
          {{ loan.description }}
        </div>
        <div v-if="loan.status === 'active'" class="mt-2 flex gap-2">
          <button
            @click.stop="editLoan(loan)"
            class="flex-1 rounded-lg border border-gray-300 px-2.5 py-1 text-[9px] font-medium text-gray-600 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            Edit
          </button>
          <button
            @click.stop="handleDelete(loan.id)"
            class="flex-1 rounded-lg border border-red-300 px-2.5 py-1 text-[9px] font-medium text-red-600 hover:bg-red-50 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10"
          >
            Hapus
          </button>
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
import SelectField from '@/components/common/SelectField.vue'
import DateField from '@/components/common/DateField.vue'
import CurrencyInput from '@/components/common/CurrencyInput.vue'
import { useHrStore } from '@/stores/hr'
import type { EmployeeLoanInsert } from '@/types/database'

const { confirm } = useConfirm()
const toast = useToast()
const store = useHrStore()

const showForm = ref(false)
const editTarget = ref<string | null>(null)
const searchQuery = ref('')
const filterStatus = ref('')
const showMobileFilter = ref(false)

const defaultForm = () => ({
  employee_id: '',
  loan_date: new Date().toISOString().split('T')[0],
  amount: 0,
  description: '',
})
const formLoan = reactive(defaultForm())

const activeFilterCount = computed(() => {
  let count = 0
  if (searchQuery.value) count++
  if (filterStatus.value) count++
  return count
})

const filteredLoans = computed(() => {
  let list = store.employeeLoans
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter((l) => l.employee?.name?.toLowerCase().includes(q))
  }
  if (filterStatus.value) {
    list = list.filter((l) => l.status === filterStatus.value)
  }
  return list
})

const resetForm = () => {
  Object.assign(formLoan, defaultForm())
  editTarget.value = null
}
const openForm = () => { resetForm(); showForm.value = true }
const closeForm = () => { resetForm(); showForm.value = false }

const editLoan = (loan: any) => {
  editTarget.value = loan.id
  formLoan.employee_id = loan.employee_id
  formLoan.loan_date = loan.loan_date
  formLoan.amount = loan.amount
  formLoan.description = loan.description || ''
  showForm.value = true
}

const handleSubmit = async () => {
  if (!formLoan.employee_id) {
    toast.error('Validasi!', 'Pilih karyawan untuk kasbon ini')
    return
  }
  if (!formLoan.amount || formLoan.amount <= 0) {
    toast.error('Validasi!', 'Jumlah kasbon harus lebih dari 0')
    return
  }
  try {
    const payload: EmployeeLoanInsert = {
      employee_id: formLoan.employee_id,
      loan_date: formLoan.loan_date,
      amount: Number(formLoan.amount),
      remaining_amount: Number(formLoan.amount),
      description: formLoan.description || undefined,
      status: 'active',
    }
    if (editTarget.value) {
      await store.updateEmployeeLoan(editTarget.value, payload)
      toast.success('Berhasil!', 'Kasbon berhasil diperbarui')
    } else {
      await store.createEmployeeLoan(payload)
      toast.success('Berhasil!', 'Kasbon berhasil ditambahkan')
    }
    closeForm()
  } catch (e: any) {
    toast.error('Gagal!', e.message)
  }
}

const handleDelete = async (id: string) => {
  const confirmed = await confirm({
    title: 'Hapus Kasbon',
    message: 'Apakah Anda yakin ingin menghapus kasbon ini? Tindakan ini tidak dapat dibatalkan.'
  })
  if (!confirmed) return
  try {
    await store.deleteEmployeeLoan(id)
    toast.success('Berhasil!', 'Kasbon berhasil dihapus')
  } catch (e: any) {
    toast.error('Gagal!', e.message)
  }
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value || 0)

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'active': return 'Aktif'
    case 'paid': return 'Lunas'
    case 'cancelled': return 'Dibatalkan'
    default: return status
  }
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'active': return 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
    case 'paid': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
    case 'cancelled': return 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
    default: return 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
  }
}

onMounted(async () => {
  await Promise.all([
    store.fetchEmployeeLoans(),
    store.fetchEmployees(),
  ])
})
</script>
