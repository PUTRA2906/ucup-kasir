<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { financeService } from '@/services/finance'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'
import type { ClosingPeriod } from '@/types/database'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import MobilePageHeader from '@/components/common/MobilePageHeader.vue'
import ClosePeriodModal from '@/components/finance/ClosePeriodModal.vue'
import SnapshotBalanceModal from '@/components/finance/SnapshotBalanceModal.vue'

const toast = useToast()
const { confirm } = useConfirm()

const loading = ref(false)
const periods = ref<ClosingPeriod[]>([])
const filterStatus = ref<'all' | 'closed' | 'reopened'>('all')
const showClosePeriodModal = ref(false)
const showSnapshotModal = ref(false)
const selectedPeriod = ref<ClosingPeriod | null>(null)

const filteredPeriods = computed(() => {
  if (filterStatus.value === 'all') return periods.value
  return periods.value.filter(p => p.status === filterStatus.value)
})

const formatDate = (dateStr: string) => {
  if (!dateStr) return ''
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

const formatDateTime = (dateStr: string) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const fetchPeriods = async () => {
  loading.value = true
  try {
    periods.value = await financeService.getClosingPeriods()
  } catch (error: any) {
    toast.error('Gagal Memuat Data', error.message)
  } finally {
    loading.value = false
  }
}

const handleReopen = async (period: ClosingPeriod) => {
  const confirmed = await confirm({
    title: 'Buka Kembali Periode?',
    message: `Buka kembali periode ${formatDate(period.period_start)} - ${formatDate(period.period_end)}?\n\nTransaksi dalam periode ini akan bisa diubah kembali.\nAnda perlu tutup ulang periode ini setelah selesai.`,
    confirmText: 'Ya, Buka Kembali',
    cancelText: 'Batal',
    variant: 'danger'
  })

  if (!confirmed) return

  try {
    await financeService.reopenPeriod(period.id)
    toast.success('Berhasil', 'Periode berhasil dibuka kembali')
    await fetchPeriods()
  } catch (error: any) {
    toast.error('Gagal Membuka Periode', error.message)
  }
}

const handleViewSnapshot = (period: ClosingPeriod) => {
  selectedPeriod.value = period
  showSnapshotModal.value = true
}

const handleClosePeriodSuccess = async () => {
  await fetchPeriods()
}

onMounted(() => {
  fetchPeriods()
})
</script>

<template>
  <AdminLayout>
    <PageBreadcrumb pageTitle="Tutup Buku" class="hidden md:block" />

    <!-- Mobile Header -->
    <MobilePageHeader title="Tutup Buku" subtitle="Kunci Periode Akuntansi" back-to="/finance">
      <template #actions>
        <button
          @click="showClosePeriodModal = true"
          class="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-white hover:bg-blue-700"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </template>
    </MobilePageHeader>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-20">
      <div class="text-center">
        <div class="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
        <p class="text-sm text-gray-500 dark:text-gray-400">Memuat data...</p>
      </div>
    </div>

    <!-- Content -->
    <div v-else class="space-y-4 pb-6">
      <!-- Header Desktop -->
      <div class="hidden items-center justify-between md:flex">
        <div>
          <h2 class="text-xl font-bold text-gray-900 dark:text-white">Daftar Periode Tertutup</h2>
          <p class="text-sm text-gray-600 dark:text-gray-400">
            Kelola periode akuntansi yang sudah dikunci
          </p>
        </div>
        <button
          @click="showClosePeriodModal = true"
          class="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          <svg class="mr-2 inline-block h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Tutup Periode Baru
        </button>
      </div>

      <!-- Filter -->
      <div class="flex items-center gap-2 overflow-x-auto pb-2">
        <button
          @click="filterStatus = 'all'"
          :class="[
            'whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition-colors',
            filterStatus === 'all'
              ? 'bg-blue-600 text-white'
              : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800'
          ]"
        >
          Semua ({{ periods.length }})
        </button>
        <button
          @click="filterStatus = 'closed'"
          :class="[
            'whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition-colors',
            filterStatus === 'closed'
              ? 'bg-blue-600 text-white'
              : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800'
          ]"
        >
          Tertutup ({{ periods.filter(p => p.status === 'closed').length }})
        </button>
        <button
          @click="filterStatus = 'reopened'"
          :class="[
            'whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition-colors',
            filterStatus === 'reopened'
              ? 'bg-blue-600 text-white'
              : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800'
          ]"
        >
          Dibuka Kembali ({{ periods.filter(p => p.status === 'reopened').length }})
        </button>
      </div>

      <!-- Empty State -->
      <div v-if="filteredPeriods.length === 0" class="rounded-2xl border border-gray-200 bg-white p-12 text-center dark:border-gray-800 dark:bg-gray-900">
        <svg class="mx-auto mb-4 h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <h3 class="mb-2 text-lg font-bold text-gray-900 dark:text-white">Belum Ada Periode Tertutup</h3>
        <p class="mb-4 text-sm text-gray-600 dark:text-gray-400">
          Tutup periode akuntansi untuk mengunci transaksi dalam rentang waktu tertentu.
        </p>
        <button
          @click="showClosePeriodModal = true"
          class="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          Tutup Periode Baru
        </button>
      </div>

      <!-- Table Desktop -->
      <div v-else class="hidden overflow-x-auto rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 md:block">
        <table class="w-full text-sm">
          <thead class="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800">
            <tr>
              <th class="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">Periode</th>
              <th class="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">Ditutup</th>
              <th class="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">Status</th>
              <th class="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">Catatan</th>
              <th class="px-4 py-3 text-right font-medium text-gray-700 dark:text-gray-300">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200 dark:divide-gray-800">
            <tr v-for="period in filteredPeriods" :key="period.id" class="hover:bg-gray-50 dark:hover:bg-gray-800">
              <td class="px-4 py-3">
                <div class="font-semibold text-gray-900 dark:text-white">
                  {{ formatDate(period.period_start) }} - {{ formatDate(period.period_end) }}
                </div>
              </td>
              <td class="px-4 py-3 text-gray-600 dark:text-gray-400">
                {{ formatDateTime(period.closed_at) }}
              </td>
              <td class="px-4 py-3">
                <span
                  v-if="period.status === 'closed'"
                  class="inline-flex items-center rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                >
                  <span class="mr-1.5 h-1.5 w-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400"></span>
                  Tertutup
                </span>
                <span
                  v-else
                  class="inline-flex items-center rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-400"
                >
                  <span class="mr-1.5 h-1.5 w-1.5 rounded-full bg-gray-500"></span>
                  Dibuka Kembali
                </span>
              </td>
              <td class="px-4 py-3 text-gray-600 dark:text-gray-400">
                {{ period.notes || '-' }}
              </td>
              <td class="px-4 py-3 text-right">
                <div class="flex items-center justify-end gap-2">
                  <button
                    @click="handleViewSnapshot(period)"
                    class="rounded-lg px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-500/10"
                  >
                    Lihat Snapshot
                  </button>
                  <button
                    v-if="period.status === 'closed'"
                    @click="handleReopen(period)"
                    class="rounded-lg px-3 py-1.5 text-xs font-medium text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-500/10"
                  >
                    Buka Kembali
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Card Mobile -->
      <div v-if="filteredPeriods.length > 0" class="space-y-3 md:hidden">
        <div
          v-for="period in filteredPeriods"
          :key="period.id"
          class="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
        >
          <!-- Header -->
          <div class="mb-3 flex items-start justify-between">
            <div>
              <h3 class="font-bold text-gray-900 dark:text-white">
                {{ formatDate(period.period_start) }} - {{ formatDate(period.period_end) }}
              </h3>
              <p class="text-xs text-gray-600 dark:text-gray-400">
                Ditutup: {{ formatDateTime(period.closed_at) }}
              </p>
            </div>
            <span
              v-if="period.status === 'closed'"
              class="inline-flex items-center rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
            >
              Tertutup
            </span>
            <span
              v-else
              class="inline-flex items-center rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-400"
            >
              Dibuka Kembali
            </span>
          </div>

          <!-- Catatan -->
          <p v-if="period.notes" class="mb-3 text-xs text-gray-600 dark:text-gray-400">
            {{ period.notes }}
          </p>

          <!-- Actions -->
          <div class="flex items-center gap-2">
            <button
              @click="handleViewSnapshot(period)"
              class="flex-1 rounded-xl border border-blue-300 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700 hover:bg-blue-100 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20"
            >
              Lihat Snapshot
            </button>
            <button
              v-if="period.status === 'closed'"
              @click="handleReopen(period)"
              class="flex-1 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700 hover:bg-amber-100 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400 dark:hover:bg-amber-500/20"
            >
              Buka Kembali
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Floating Action Button (Mobile) -->
    <button
      @click="showClosePeriodModal = true"
      class="fixed bottom-6 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 md:hidden"
    >
      <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
      </svg>
    </button>

    <!-- Modals -->
    <ClosePeriodModal
      :show="showClosePeriodModal"
      @close="showClosePeriodModal = false"
      @success="handleClosePeriodSuccess"
    />
    <SnapshotBalanceModal
      :show="showSnapshotModal"
      :closing-period="selectedPeriod"
      @close="showSnapshotModal = false"
    />
  </AdminLayout>
</template>
