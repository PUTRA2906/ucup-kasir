<template>
  <div class="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
    <h3 class="mb-6 text-lg font-semibold text-gray-900 dark:text-white">Daftar Transaksi</h3>
    <div class="overflow-x-auto">
      <table class="w-full text-left text-sm">
        <thead>
          <tr class="border-b border-gray-200 dark:border-gray-700">
            <th class="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">No. Transaksi</th>
            <th class="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Tanggal</th>
            <th class="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Customer</th>
            <th class="px-4 py-3 text-right font-medium text-gray-700 dark:text-gray-300">Total</th>
            <th class="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Pembayaran</th>
            <th class="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">Status</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="tx in transactions.slice(0, 10)" :key="tx.id" class="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/50">
            <td class="px-4 py-3 font-medium text-brand-600 dark:text-brand-400">{{ tx.transaction_number }}</td>
            <td class="px-4 py-3 text-gray-600 dark:text-gray-400">{{ formatDate(tx.created_at) }}</td>
            <td class="px-4 py-3 text-gray-900 dark:text-white">{{ tx.customer_name || '-' }}</td>
            <td class="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">{{ formatCurrency(tx.total) }}</td>
            <td class="px-4 py-3 text-gray-600 dark:text-gray-400">{{ formatMethod(tx.payment_method) }}</td>
            <td class="px-4 py-3">
              <span :class="[
                'inline-flex rounded-full px-2 py-1 text-xs font-medium',
                tx.payment_status === 'lunas'
                  ? 'bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-400'
                  : 'bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-warning-400'
              ]">
                {{ tx.payment_status === 'lunas' ? 'Lunas' : 'Belum Lunas' }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Transaction } from '@/types/database'

interface Props {
  transactions: Transaction[]
}

defineProps<Props>()

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value || 0)

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const formatMethod = (method: string) => {
  const methods: Record<string, string> = {
    tunai: 'Tunai',
    transfer: 'Transfer',
    qris: 'QRIS',
  }
  return methods[method] || method
}
</script>
