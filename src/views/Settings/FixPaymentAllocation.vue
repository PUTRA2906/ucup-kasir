<template>
  <AdminLayout hide-bottom-nav>
    <PageBreadcrumb pageTitle="Perbaikan Laba Terealisasi" class="hidden md:block" />

    <!-- Mobile Header -->
    <MobilePageHeader title="Perbaikan Sistem" subtitle="Fix Alokasi Pembayaran & Laba Terealisasi" />

    <div class="max-w-2xl mx-auto space-y-4 pb-24 md:pb-6">
      <!-- Info Card -->
      <div class="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-4 dark:border-blue-500/30 dark:from-blue-500/10 dark:to-gray-900">
        <div class="flex items-start gap-3">
          <div class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-blue-500/20">
            <svg class="h-5 w-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div class="flex-1">
            <h3 class="text-sm font-bold text-gray-900 dark:text-white mb-1">Apa yang diperbaiki?</h3>
            <p class="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
              Tool ini memperbaiki perhitungan <strong>Laba Terealisasi</strong> di laporan laba rugi.
              Jika Anda mengalami masalah dimana laba terealisasi tidak berubah saat ada pembayaran cicilan,
              jalankan perbaikan ini.
            </p>
          </div>
        </div>
      </div>

      <!-- Status Card -->
      <div v-if="!hasRun" class="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-sm font-bold text-gray-900 dark:text-white">Status</h3>
          <span class="inline-flex items-center gap-1.5 rounded-lg bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
            <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Perlu Diperbaiki
          </span>
        </div>
        <p class="text-xs text-gray-500 dark:text-gray-400">
          Belum ada perbaikan yang dijalankan. Klik tombol di bawah untuk memulai.
        </p>
      </div>

      <!-- Result Card -->
      <div v-else class="rounded-2xl border bg-white p-4 dark:bg-gray-900"
           :class="result.fixedPayments > 0
             ? 'border-emerald-200 dark:border-emerald-500/30'
             : 'border-gray-200 dark:border-gray-800'">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-sm font-bold text-gray-900 dark:text-white">Hasil Perbaikan</h3>
          <span v-if="result.fixedPayments > 0" class="inline-flex items-center gap-1.5 rounded-lg bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
            <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            Berhasil
          </span>
          <span v-else class="inline-flex items-center gap-1.5 rounded-lg bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
            <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            Sudah OK
          </span>
        </div>

        <!-- Statistics -->
        <div class="grid grid-cols-2 gap-2 mb-3">
          <div class="rounded-xl border border-gray-200 bg-gray-50 p-2.5 dark:border-gray-700 dark:bg-gray-800">
            <p class="text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1">Mode</p>
            <p class="text-sm font-bold text-gray-900 dark:text-white uppercase">{{ result.mode }}</p>
          </div>
          <div class="rounded-xl border border-gray-200 bg-gray-50 p-2.5 dark:border-gray-700 dark:bg-gray-800">
            <p class="text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1">Total Pembayaran</p>
            <p class="text-sm font-bold text-gray-900 dark:text-white">{{ result.totalPayments }}</p>
          </div>
          <div class="rounded-xl border p-2.5 col-span-2"
               :class="result.fixedPayments > 0
                 ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10'
                 : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800'">
            <p class="text-[10px] font-medium mb-1"
               :class="result.fixedPayments > 0
                 ? 'text-emerald-600 dark:text-emerald-400'
                 : 'text-gray-500 dark:text-gray-400'">
              Pembayaran yang Diperbaiki
            </p>
            <p class="text-lg font-black"
               :class="result.fixedPayments > 0
                 ? 'text-emerald-700 dark:text-emerald-400'
                 : 'text-gray-900 dark:text-white'">
              {{ result.fixedPayments }}
            </p>
          </div>
        </div>

        <!-- Details -->
        <div v-if="result.details.length > 0" class="border-t border-gray-200 pt-3 dark:border-gray-700">
          <p class="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Detail Perbaikan:</p>
          <div class="space-y-1.5 max-h-48 overflow-y-auto">
            <div v-for="(detail, index) in result.details" :key="detail.paymentId"
                 class="flex items-center justify-between rounded-lg bg-gray-50 px-2.5 py-2 dark:bg-gray-800">
              <div class="flex items-center gap-2 flex-1 min-w-0">
                <span class="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded bg-emerald-500/20 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                  {{ index + 1 }}
                </span>
                <div class="flex-1 min-w-0">
                  <p class="text-xs font-medium text-gray-900 dark:text-white">
                    {{ formatCurrency(detail.amount) }}
                  </p>
                  <p class="text-[10px] text-gray-500 dark:text-gray-400">
                    {{ detail.allocationsCreated }} alokasi dibuat
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Errors -->
        <div v-if="result.errors.length > 0" class="border-t border-red-200 pt-3 mt-3 dark:border-red-500/30">
          <p class="text-xs font-medium text-red-700 dark:text-red-400 mb-2">⚠️ Error:</p>
          <div class="space-y-1">
            <div v-for="(error, index) in result.errors" :key="index"
                 class="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 rounded px-2 py-1">
              {{ error }}
            </div>
          </div>
        </div>

        <!-- Success Message -->
        <div v-if="result.fixedPayments > 0" class="mt-3 rounded-lg bg-emerald-50 border border-emerald-200 p-3 dark:bg-emerald-500/10 dark:border-emerald-500/30">
          <p class="text-xs text-emerald-700 dark:text-emerald-400">
            ✅ Perbaikan selesai! Silakan cek <router-link to="/reports/profit-loss" class="font-bold underline">Laporan Laba Rugi</router-link> untuk melihat hasilnya.
          </p>
        </div>
      </div>

      <!-- Action Button -->
      <button
        @click="runFix"
        :disabled="loading"
        class="w-full rounded-xl py-3.5 text-sm font-bold transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        :class="hasRun && result.fixedPayments === 0
          ? 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
          : 'bg-blue-600 text-white hover:bg-blue-500'"
      >
        <span v-if="loading" class="flex items-center justify-center gap-2">
          <svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Memperbaiki...
        </span>
        <span v-else>
          {{ hasRun ? 'Jalankan Lagi' : 'Jalankan Perbaikan' }}
        </span>
      </button>

      <!-- Help -->
      <div class="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800">
        <h3 class="text-xs font-bold text-gray-900 dark:text-white mb-2">Kapan harus menjalankan ini?</h3>
        <ul class="space-y-1.5 text-xs text-gray-600 dark:text-gray-400">
          <li class="flex items-start gap-2">
            <svg class="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
            <span>Setelah update aplikasi yang menambahkan fitur laba terealisasi akurat</span>
          </li>
          <li class="flex items-start gap-2">
            <svg class="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
            <span>Jika laporan laba rugi menunjukkan laba terealisasi yang salah</span>
          </li>
          <li class="flex items-start gap-2">
            <svg class="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
            <span>Pembayaran cicilan tidak mengubah laba terealisasi</span>
          </li>
        </ul>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import MobilePageHeader from '@/components/common/MobilePageHeader.vue'
import { fixPaymentAllocation } from '@/utils/fixPaymentAllocation'
import type { PaymentAllocationResult } from '@/utils/fixPaymentAllocation'
import { useToast } from '@/composables/useToast'

const toast = useToast()

const loading = ref(false)
const hasRun = ref(false)
const result = ref<PaymentAllocationResult>({
  mode: 'supabase',
  totalPayments: 0,
  fixedPayments: 0,
  errors: [],
  details: [],
})

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value || 0)

async function runFix() {
  loading.value = true

  try {
    result.value = await fixPaymentAllocation()
    hasRun.value = true

    if (result.value.fixedPayments > 0) {
      toast.success('Perbaikan Berhasil', `Berhasil memperbaiki ${result.value.fixedPayments} pembayaran`)
    } else if (result.value.errors.length > 0) {
      toast.error('Perbaikan Gagal', 'Silakan cek error di bawah')
    } else {
      toast.success('Sudah Benar', 'Semua pembayaran sudah dialokasikan dengan benar')
    }
  } catch (error: any) {
    console.error('Error fixing payment allocation:', error)
    toast.error('Error', error.message || 'Gagal menjalankan perbaikan')
  } finally {
    loading.value = false
  }
}
</script>
