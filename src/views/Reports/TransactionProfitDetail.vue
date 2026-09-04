<template>
  <AdminLayout hide-bottom-nav>
    <PageBreadcrumb pageTitle="Detail Laba Transaksi" class="hidden md:block" />

    <div class="space-y-4 pb-8">
      <!-- Loading -->
      <div v-if="loading" class="flex items-center justify-center py-12">
        <div class="text-center">
          <svg class="mx-auto h-10 w-10 animate-spin text-brand-500" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p class="mt-3 text-xs text-gray-500 dark:text-gray-400">Memuat detail transaksi...</p>
        </div>
      </div>

      <!-- Error -->
      <div v-else-if="error" class="rounded-2xl border border-error-200 bg-error-50 p-6 text-center dark:border-error-500/30 dark:bg-error-500/10">
        <p class="text-xs font-medium text-error-700 dark:text-error-400">{{ error }}</p>
        <button
          @click="load()"
          class="mt-3 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-[11px] font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
        >
          Coba Lagi
        </button>
      </div>

      <template v-else-if="detail && tx">
        <!-- Header -->
        <MobilePageHeader
          :title="tx.transaction_number"
          :subtitle="(tx.customer_name || 'Tanpa Customer') + ' • ' + formatFullDate(tx.created_at)"
          back-to="/reports/transaction-profit"
        >
          <template #badge>
            <span
              :class="[
                'rounded-full px-2.5 py-1 text-[10px] font-bold',
                tx.payment_status === 'lunas'
                  ? 'bg-success-100 text-success-700 dark:bg-success-900 dark:text-success-400'
                  : 'bg-warning-100 text-warning-700 dark:bg-warning-900 dark:bg-warning-400'
              ]"
            >
              {{ tx.payment_status === 'lunas' ? 'LUNAS' : 'TEMPO' }}
            </span>
          </template>
        </MobilePageHeader>

        <!-- Total Laba Transaksi -->
        <div class="rounded-2xl border border-gray-200 bg-gradient-to-br from-brand-500/10 to-transparent p-4 shadow-sm dark:border-gray-800 dark:from-brand-500/5">
          <p class="text-[10px] font-medium text-gray-500 dark:text-gray-400">Total Laba Kotor Transaksi</p>
          <p class="mt-1 text-2xl font-black text-gray-900 dark:text-white">{{ formatCurrency(tx.transaction_profit) }}</p>
          <p class="mt-0.5 text-[10px] text-gray-500 dark:text-gray-400">
            Penjualan {{ formatCurrency(tx.total || 0) }} • HPP {{ formatCurrency(tx.transaction_cogs) }} • Margin {{ tx.profit_margin.toFixed(1) }}%
          </p>
        </div>

        <!-- Riil vs Tertahan -->
        <div class="grid grid-cols-2 gap-3">
          <div class="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3 dark:border-emerald-500/30 dark:bg-emerald-500/10">
            <div class="flex items-center gap-1.5">
              <svg class="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p class="text-[10px] font-medium text-emerald-700 dark:text-emerald-400">Laba Riil</p>
            </div>
            <p class="mt-1 text-base font-bold text-emerald-700 dark:text-emerald-400">{{ formatCurrency(tx.realized_profit) }}</p>
            <p class="mt-0.5 text-[9px] text-emerald-600/70 dark:text-emerald-500/60">Kas masuk {{ formatCurrency(tx.cash_received) }}</p>
          </div>
          <div class="rounded-2xl border border-amber-200 bg-amber-50/60 p-3 dark:border-amber-500/30 dark:bg-amber-500/10">
            <div class="flex items-center gap-1.5">
              <svg class="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p class="text-[10px] font-medium text-amber-700 dark:text-amber-400">Laba Tertahan</p>
            </div>
            <p class="mt-1 text-base font-bold text-amber-700 dark:text-amber-400">{{ formatCurrency(tx.unrealized_profit) }}</p>
            <p class="mt-0.5 text-[9px] text-amber-600/70 dark:text-amber-500/60">Piutang {{ formatCurrency(tx.receivable) }}</p>
          </div>
        </div>

        <!-- Rincian Barang & Laba Per Item -->
        <div class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div class="flex items-center justify-between border-b border-gray-100 pb-2 dark:border-gray-800">
            <span class="text-[11px] font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
              Rincian Barang ({{ detail.items.length }})
            </span>
          </div>

          <div class="mt-2 space-y-3">
            <div
              v-for="(item, index) in detail.items"
              :key="index"
              class="rounded-xl border border-gray-100 p-3 dark:border-gray-800"
            >
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <p class="text-xs font-bold text-gray-900 dark:text-white">{{ item.product_name }}</p>
                  <p class="mt-0.5 text-[10px] text-gray-500 dark:text-gray-400">
                    {{ item.quantity }} × {{ formatCurrency(item.price) }}
                    <span v-if="item.returned_qty > 0" class="text-error-600 dark:text-error-400">
                      (retur {{ item.returned_qty }})
                    </span>
                  </p>
                </div>
                <p class="text-xs font-bold text-gray-900 dark:text-white">{{ formatCurrency(item.subtotal) }}</p>
              </div>

              <!-- Bar retur -->
              <div
                v-if="item.returned_value > 0"
                class="mt-1.5 flex items-center justify-between rounded-lg bg-error-500/10 px-2 py-1 text-[10px] text-error-600 dark:text-error-400"
              >
                <span>Retur</span>
                <span class="font-bold">-{{ formatCurrency(item.returned_value) }}</span>
              </div>

              <!-- Grid laba item -->
              <div class="mt-2 grid grid-cols-3 gap-1.5">
                <div class="rounded-lg bg-gray-50 p-1.5 text-center dark:bg-white/[0.03]">
                  <p class="text-[8px] text-gray-500 dark:text-gray-400">HPP</p>
                  <p class="text-[10px] font-bold text-gray-700 dark:text-gray-300">{{ formatCompact(item.cogs) }}</p>
                </div>
                <div class="rounded-lg bg-emerald-500/10 p-1.5 text-center">
                  <p class="text-[8px] text-emerald-600/70 dark:text-emerald-500/60">Laba</p>
                  <p class="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">{{ formatCompact(item.profit) }}</p>
                </div>
                <div class="rounded-lg bg-brand-500/10 p-1.5 text-center">
                  <p class="text-[8px] text-brand-500/70 dark:text-brand-400/60">Margin</p>
                  <p class="text-[10px] font-bold text-brand-600 dark:text-brand-400">{{ item.margin.toFixed(0) }}%</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Riwayat Pembayaran -->
        <div class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <span class="text-[11px] font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
            Riwayat Pembayaran
          </span>
          <div class="mt-2 space-y-2">
            <div v-if="(tx.payments || []).length === 0" class="py-3 text-center">
              <p class="text-xs text-gray-400 dark:text-gray-500">Belum ada pembayaran</p>
            </div>
            <div
              v-for="(p, index) in (tx.payments || [])"
              :key="index"
              class="flex items-center justify-between rounded-xl border border-gray-100 px-3 py-2 text-xs dark:border-gray-800"
            >
              <div>
                <p class="font-medium text-gray-900 dark:text-white">{{ formatPaymentMethod(p.payment_method) }}</p>
                <p class="text-[9px] text-gray-500 dark:text-gray-400">{{ formatFullDate(p.created_at) }}</p>
              </div>
              <span class="font-bold text-emerald-600 dark:text-emerald-400">{{ formatCurrency(p.amount) }}</span>
            </div>
          </div>
        </div>

        <!-- Ringkasan Keuangan Transaksi -->
        <div class="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <span class="text-[11px] font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
            Ringkasan Keuangan
          </span>
          <div class="mt-2 space-y-1.5 text-xs">
            <div class="flex justify-between">
              <span class="text-gray-500 dark:text-gray-400">Total Penjualan</span>
              <span class="font-medium text-gray-900 dark:text-white">{{ formatCurrency(tx.total) }}</span>
            </div>
            <div v-if="tx.discount > 0" class="flex justify-between">
              <span class="text-gray-500 dark:text-gray-400">Diskon</span>
              <span class="font-medium text-error-600 dark:text-error-400">-{{ formatCurrency(tx.discount) }}</span>
            </div>
            <div v-if="(tx.return_amount || 0) > 0" class="flex justify-between">
              <span class="text-gray-500 dark:text-gray-400">Retur</span>
              <span class="font-medium text-error-600 dark:text-error-400">-{{ formatCurrency(tx.return_amount || 0) }}</span>
            </div>
            <div class="flex justify-between border-t border-gray-100 pt-1.5 dark:border-gray-800">
              <span class="text-gray-500 dark:text-gray-400">HPP (Modal)</span>
              <span class="font-medium text-gray-900 dark:text-white">{{ formatCurrency(tx.transaction_cogs) }}</span>
            </div>
            <div class="flex justify-between">
              <span class="font-medium text-gray-700 dark:text-gray-300">Laba Kotor</span>
              <span class="font-bold text-gray-900 dark:text-white">{{ formatCurrency(tx.transaction_profit) }}</span>
            </div>
          </div>
        </div>
      </template>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import MobilePageHeader from '@/components/common/MobilePageHeader.vue'
import { salesReportEnhancedServiceAdapter as salesReportEnhancedService } from '@/services'
import type { TransactionProfitDetail } from '@/services/salesReportEnhanced'

const route = useRoute()
const router = useRouter()

const detail = ref<TransactionProfitDetail | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

const tx = computed(() => detail.value?.transaction)

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value || 0)

const formatCompact = (value: number) => {
  const abs = Math.abs(value)
  if (abs >= 1000000) return `Rp${(value / 1000000).toFixed(1)}jt`
  if (abs >= 1000) return `Rp${(value / 1000).toFixed(0)}rb`
  return `Rp${value || 0}`
}

const formatFullDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

const formatPaymentMethod = (value: string) => {
  const methods: Record<string, string> = {
    tunai: 'Tunai',
    transfer: 'Transfer',
    qris: 'QRIS',
  }
  return methods[value] || value || 'Tunai'
}

const load = async () => {
  loading.value = true
  error.value = null
  try {
    detail.value = await salesReportEnhancedService.getTransactionProfitDetail(route.params.id as string)
  } catch (e: any) {
    error.value = e.message || 'Gagal memuat detail'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>
