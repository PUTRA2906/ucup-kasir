<template>
  <AdminLayout>
    <PageBreadcrumb pageTitle="Slip Gaji" class="hidden md:block" />

    <!-- Mobile Header -->
    <MobilePageHeader title="Slip Gaji" :subtitle="`${filteredPayrolls.length} slip gaji`">
      <template #actions>
        <button
          @click="showCreateForm = true"
          class="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm hover:bg-blue-500 active:scale-95"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
        </button>
      </template>
    </MobilePageHeader>

    <!-- Desktop Header -->
    <div class="mb-4 hidden items-center justify-between md:flex">
      <h2 class="text-lg font-bold text-gray-900 dark:text-white">Daftar Slip Gaji</h2>
      <button
        @click="showCreateForm = true"
        class="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-500"
      >
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
        Buat Slip Gaji
      </button>
    </div>

    <!-- Filters -->
    <div class="mb-4 grid grid-cols-1 gap-2 md:grid-cols-2">
      <div>
        <input
          v-model="filterSearch"
          type="text"
          placeholder="Cari karyawan atau kode..."
          class="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder-gray-500"
        />
      </div>
      <div>
        <DateRangeField
          v-model:start="filterStartDate"
          v-model:end="filterEndDate"
          title="Filter Periode"
          placeholder="Semua periode"
          button-class="flex w-full items-center justify-between rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
        />
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading && store.payrolls.length === 0" class="flex items-center justify-center py-16">
      <div class="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
    </div>

    <!-- Empty State -->
    <div v-else-if="filteredPayrolls.length === 0" class="rounded-2xl border border-gray-200 bg-white p-10 text-center dark:border-gray-800 dark:bg-gray-900">
      <p class="text-sm text-gray-500 dark:text-gray-400">Belum ada slip gaji.</p>
      <button @click="showCreateForm = true" class="mt-3 rounded-xl bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-500">+ Buat Slip Gaji</button>
    </div>

    <!-- Desktop Table -->
    <div v-else class="hidden overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900 md:block">
      <table class="w-full text-left text-xs">
        <thead>
          <tr class="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
            <th class="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Kode</th>
            <th class="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Karyawan</th>
            <th class="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Periode</th>
            <th class="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-300">Gaji</th>
            <th class="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-300">Insentif</th>
            <th class="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-300">Kasbon</th>
            <th class="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-300">Net</th>
            <th class="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Status</th>
            <th class="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-300">Aksi</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="p in filteredPayrolls"
            :key="p.id"
            class="border-b border-gray-100 transition hover:bg-blue-50/50 dark:border-gray-800 dark:hover:bg-blue-500/5"
          >
            <td class="px-4 py-3 font-mono text-[10px] font-medium text-gray-900 dark:text-white">{{ p.period_code }}</td>
            <td class="px-4 py-3 text-gray-900 dark:text-white">{{ p.employee?.name || '-' }}</td>
            <td class="px-4 py-3 text-gray-600 dark:text-gray-400">{{ formatDate(p.period_start) }} - {{ formatDate(p.period_end) }}</td>
            <td class="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">{{ formatCurrency(p.base_salary) }}</td>
            <td class="px-4 py-3 text-right font-medium text-emerald-600 dark:text-emerald-400">{{ formatCurrency(p.incentive_amount) }}</td>
            <td class="px-4 py-3 text-right font-medium text-red-600 dark:text-red-400">{{ formatCurrency(p.kasbon_deduction) }}</td>
            <td class="px-4 py-3 text-right font-bold text-gray-900 dark:text-white">{{ formatCurrency(p.total_net) }}</td>
            <td class="px-4 py-3">
              <span class="rounded-full px-2 py-0.5 text-[10px] font-medium" :class="getStatusBadge(p.status)">
                {{ p.status === 'paid' ? 'Dibayar' : 'Draft' }}
              </span>
            </td>
            <td class="px-4 py-3 text-right">
              <div class="flex items-center justify-end gap-2">
                <button
                  @click="router.push(`/hr/payroll/print/${p.id}`)"
                  class="rounded-lg border border-blue-300 px-2.5 py-1 text-[9px] font-medium text-blue-600 hover:bg-blue-50 dark:border-blue-500/30 dark:text-blue-400 dark:hover:bg-blue-500/10"
                >
                  Cetak
                </button>
                <button
                  v-if="p.status === 'draft'"
                  @click="handlePostJournal(p.id)"
                  class="rounded-lg border border-emerald-300 px-2.5 py-1 text-[9px] font-medium text-emerald-700 hover:bg-emerald-50 dark:border-emerald-500/30 dark:text-emerald-400 dark:hover:bg-emerald-500/10"
                >
                  Bayar & Jurnal
                </button>
                <button
                  @click="handleDelete(p.id)"
                  class="rounded-lg border border-red-300 px-2.5 py-1 text-[9px] font-medium text-red-700 hover:bg-red-50 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10"
                >
                  Hapus
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Mobile Cards -->
    <div v-if="filteredPayrolls.length > 0" class="space-y-3 pb-4 md:hidden">
      <div
        v-for="p in filteredPayrolls"
        :key="p.id"
        class="rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm dark:border-gray-800 dark:bg-gray-900"
      >
        <div class="flex items-start justify-between">
          <div class="flex-1 min-w-0">
            <p class="text-xs font-bold text-blue-600 dark:text-blue-400">{{ p.period_code }}</p>
            <p class="text-[10px] text-gray-500 dark:text-gray-400">{{ p.employee?.name || '-' }}</p>
          </div>
          <div class="flex items-center gap-2 flex-shrink-0">
            <span class="rounded-full px-2 py-0.5 text-[10px] font-medium" :class="getStatusBadge(p.status)">
              {{ p.status === 'paid' ? 'Dibayar' : 'Draft' }}
            </span>
            <button
              @click="toggleExpand(p.id)"
              class="rounded-lg p-1 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              <svg
                class="h-4 w-4 transition-transform"
                :class="{ 'rotate-180': expandedCards.includes(p.id) }"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Collapsed View -->
        <div v-if="!expandedCards.includes(p.id)" class="mt-2">
          <div class="flex items-center justify-between">
            <p class="text-[10px] text-gray-500 dark:text-gray-400">{{ formatDate(p.period_start) }} - {{ formatDate(p.period_end) }}</p>
            <p class="text-sm font-bold text-gray-900 dark:text-white">{{ formatCurrency(p.total_net) }}</p>
          </div>
        </div>

        <!-- Expanded View -->
        <div v-else class="mt-2 space-y-2">
          <div class="border-t border-gray-100 pt-2 dark:border-gray-800">
            <p class="text-[10px] text-gray-500 dark:text-gray-400 mb-1">{{ formatDate(p.period_start) }} - {{ formatDate(p.period_end) }}</p>
            <div class="grid grid-cols-2 gap-2 text-[10px]">
              <div>
                <p class="text-gray-500 dark:text-gray-400">Gaji</p>
                <p class="font-medium text-gray-900 dark:text-white">{{ formatCurrency(p.incentive_amount) }}</p>
              </div>
              <div>
                <p class="text-gray-500 dark:text-gray-400">Pot. Kasbon</p>
                <p class="font-medium text-red-600 dark:text-red-400">{{ formatCurrency(p.kasbon_deduction) }}</p>
              </div>
              <div>
                <p class="text-gray-500 dark:text-gray-400">Gaji Bersih</p>
                <p class="font-bold text-gray-900 dark:text-white">{{ formatCurrency(p.total_net) }}</p>
              </div>
            </div>

            <!-- Detail Gaji -->
            <div
              v-if="p.incentive_details && p.incentive_details.length > 0"
              class="mt-2 rounded-xl border border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50"
            >
              <p class="border-b border-gray-100 px-3 py-1.5 text-[10px] font-semibold text-gray-600 dark:border-gray-800 dark:text-gray-400">
                Detail Gaji
              </p>
              <div class="divide-y divide-gray-100 dark:divide-gray-800">
                <div
                  v-for="(detail, idx) in p.incentive_details"
                  :key="idx"
                  class="px-3 py-2"
                >
                  <div class="flex items-start justify-between gap-2">
                    <div class="min-w-0 flex-1">
                      <div class="flex items-center gap-1.5 flex-wrap">
                        <span
                          :class="detail.type === 'loader'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400'"
                          class="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase"
                        >
                          {{ detail.type === 'loader' ? 'Loader' : 'Driver' }}
                        </span>
                        <span class="text-[10px] font-medium text-gray-700 dark:text-gray-300">
                          {{ detail.do_number }}
                        </span>
                        <span class="text-[9px] text-gray-400 dark:text-gray-500">
                          {{ formatDate(detail.date) }}
                        </span>
                      </div>
                      <p class="mt-0.5 text-[9px] leading-relaxed text-gray-500 dark:text-gray-400">
                        {{ detail.description }}
                      </p>
                    </div>
                    <p class="flex-shrink-0 text-[10px] font-semibold text-gray-900 dark:text-white">
                      {{ formatCurrency(detail.amount) }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="flex gap-2 border-t border-gray-100 pt-2 dark:border-gray-800">
            <button
              @click="router.push(`/hr/payroll/print/${p.id}`)"
              class="flex-1 rounded-lg bg-blue-100 px-3 py-1.5 text-[11px] font-medium text-blue-700 hover:bg-blue-200 active:scale-95 dark:bg-blue-500/20 dark:text-blue-400"
            >
              Cetak
            </button>
            <button
              v-if="p.status === 'draft'"
              @click="handlePostJournal(p.id)"
              class="flex-1 rounded-lg bg-emerald-100 px-3 py-1.5 text-[11px] font-medium text-emerald-700 hover:bg-emerald-200 active:scale-95 dark:bg-emerald-500/20 dark:text-emerald-400"
            >
              Bayar & Jurnal
            </button>
            <button
              @click="handleDelete(p.id)"
              class="flex-1 rounded-lg bg-red-100 px-3 py-1.5 text-[11px] font-medium text-red-700 hover:bg-red-200 active:scale-95 dark:bg-red-500/20 dark:text-red-400"
            >
              Hapus
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Form Modal -->
    <CreatePayrollForm v-if="showCreateForm" @close="showCreateForm = false" @created="handleCreated" />
  </AdminLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useConfirm } from '@/composables/useConfirm'
import { useToast } from '@/composables/useToast'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import MobilePageHeader from '@/components/common/MobilePageHeader.vue'
import DateRangeField from '@/components/common/DateRangeField.vue'
import CreatePayrollForm from '@/components/hr/CreatePayrollForm.vue'
import { useHrStore } from '@/stores/hr'

const { confirm } = useConfirm()
const toast = useToast()
const router = useRouter()
const store = useHrStore()
const loading = computed(() => store.loading)

const showCreateForm = ref(false)
const expandedCards = ref<string[]>([])
const filterSearch = ref('')
const filterStartDate = ref('')
const filterEndDate = ref('')

const filteredPayrolls = computed(() => {
  // Guard clause untuk prevent crash jika store.payrolls undefined/null
  if (!store.payrolls || !Array.isArray(store.payrolls)) {
    return []
  }
  
  let result = [...store.payrolls]

  if (filterSearch.value) {
    const search = filterSearch.value.toLowerCase()
    result = result.filter((p) =>
      p.period_code.toLowerCase().includes(search) ||
      p.employee?.name?.toLowerCase().includes(search)  // Optional chaining untuk safety
    )
  }

  if (filterStartDate.value) {
    result = result.filter((p) => p.period_start >= filterStartDate.value)
  }

  if (filterEndDate.value) {
    result = result.filter((p) => p.period_end <= filterEndDate.value)
  }

  return result
})

const formatCurrency = (v: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v || 0)

const formatDate = (d: string) => {
  if (!d) return '-'
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y.slice(2)}`
}

const getStatusBadge = (status: string) => {
  return status === 'paid'
    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-400'
    : 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-400'
}

const toggleExpand = (id: string) => {
  const idx = expandedCards.value.indexOf(id)
  if (idx === -1) {
    expandedCards.value.push(id)
  } else {
    expandedCards.value.splice(idx, 1)
  }
}

const handlePostJournal = async (id: string) => {
  if (!(await confirm('Post jurnal akuntansi untuk slip gaji ini? Status akan berubah menjadi "Dibayar".'))) return
  try {
    await store.postPayrollJournal(id)
    toast.success('Berhasil!', 'Jurnal akuntansi berhasil diposting')
  } catch (e: any) {
    toast.error('Gagal!', e.message)
  }
}

const handleDelete = async (id: string) => {
  const payroll = store.payrolls.find((p) => p.id === id)
  const msg = payroll?.status === 'paid'
    ? 'Hapus slip gaji ini? Jurnal akuntansi yang sudah diposting juga akan ikut terhapus.'
    : 'Hapus slip gaji ini?'

  if (!(await confirm(msg))) return
  try {
    await store.deletePayroll(id)
    toast.success('Berhasil!', 'Slip gaji berhasil dihapus')
  } catch (e: any) {
    toast.error('Gagal!', e.message)
  }
}

const handleCreated = () => {
  showCreateForm.value = false
  toast.success('Berhasil!', 'Slip gaji berhasil dibuat')
}

onMounted(() => store.fetchPayrolls())
</script>
