<template>
  <AdminLayout>
    <PageBreadcrumb pageTitle="Invoice Pelanggan" class="hidden md:block" />

    <!-- Mobile Header -->
    <MobilePageHeader title="Daftar Invoice" subtitle="Riwayat transaksi & status pembayaran" :back-to="'/customer-invoices/' + encodeURIComponent(kecamatan)" />

    <!-- Mobile View -->
    <div class="md:hidden space-y-4 pb-6">
      <!-- Loading Skeleton -->
      <div v-if="loading" class="space-y-4 animate-pulse">
        <!-- Kartu Profil Customer Skeleton -->
        <div class="rounded-3xl border border-gray-200 bg-white p-4 space-y-3.5 dark:border-gray-800 dark:bg-white/[0.03]">
          <!-- Identitas -->
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-start gap-3 flex-1 min-w-0">
              <div class="h-10 w-10 flex-shrink-0 rounded-2xl bg-gray-200 dark:bg-gray-800"></div>
              <div class="flex-1 space-y-2 pt-0.5">
                <div class="h-3.5 w-36 rounded bg-gray-200 dark:bg-gray-800"></div>
                <div class="h-2.5 w-52 rounded bg-gray-200 dark:bg-gray-800"></div>
              </div>
            </div>
            <div class="h-7 w-16 flex-shrink-0 rounded-xl bg-gray-200 dark:bg-gray-800"></div>
          </div>
          <!-- Metrik 3 kolom -->
          <div class="rounded-2xl border border-gray-200 p-2.5 grid grid-cols-3 gap-1 dark:border-gray-800">
            <div v-for="i in 3" :key="i" class="flex flex-col items-center space-y-1.5 py-1">
              <div class="h-2 w-12 rounded bg-gray-200 dark:bg-gray-800"></div>
              <div class="h-3 w-14 rounded bg-gray-200 dark:bg-gray-800"></div>
            </div>
          </div>
        </div>

        <!-- Search & Filter Skeleton -->
        <div class="space-y-2.5">
          <div class="h-10 w-full rounded-2xl bg-gray-200 dark:bg-gray-800"></div>
          <div class="flex items-center gap-1.5">
            <div class="h-7 w-20 rounded-xl bg-gray-200 dark:bg-gray-800"></div>
            <div class="h-7 w-28 rounded-xl bg-gray-200 dark:bg-gray-800"></div>
            <div class="h-7 w-20 rounded-xl bg-gray-200 dark:bg-gray-800"></div>
          </div>
        </div>

        <!-- List Invoice Skeleton -->
        <div class="space-y-2.5">
          <div
            v-for="i in 5"
            :key="i"
            class="rounded-2xl border border-gray-200 bg-white p-3.5 flex items-center justify-between dark:border-gray-800 dark:bg-white/[0.03]"
          >
            <div class="space-y-1.5">
              <div class="flex items-center gap-2">
                <div class="h-3 w-24 rounded bg-gray-200 dark:bg-gray-800"></div>
                <div class="h-3.5 w-14 rounded bg-gray-200 dark:bg-gray-800"></div>
              </div>
              <div class="h-2.5 w-36 rounded bg-gray-200 dark:bg-gray-800"></div>
            </div>
            <div class="text-right space-y-1.5">
              <div class="h-3.5 w-20 rounded bg-gray-200 dark:bg-gray-800 ml-auto"></div>
              <div class="h-2.5 w-16 rounded bg-gray-200 dark:bg-gray-800 ml-auto"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Customer tidak ditemukan -->
      <div
        v-else-if="!customer"
        class="rounded-2xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-white/[0.03]"
      >
        <p class="text-gray-600 dark:text-gray-400">Customer tidak ditemukan</p>
        <button
          @click="router.push(`/customer-invoices/${encodeURIComponent(kecamatan)}`)"
          class="mt-4 rounded-xl bg-brand-500 px-4 py-2 text-sm font-bold text-white hover:bg-brand-600"
        >
          Kembali Pilih Customer
        </button>
      </div>

      <!-- Content -->
      <div v-else class="space-y-4">
        <!-- Kartu Profil Customer -->
        <div class="bg-white rounded-3xl border border-gray-200 p-4 space-y-3.5 shadow-sm dark:bg-white/[0.03] dark:border-gray-800">
          <!-- Identitas -->
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-start gap-3 min-w-0 flex-1">
              <div class="w-10 h-10 flex-shrink-0 rounded-2xl bg-brand-100 text-brand-600 border border-brand-200 flex items-center justify-center font-extrabold text-sm dark:bg-brand-500/20 dark:text-brand-400 dark:border-brand-500/30">
                {{ customerInitial }}
              </div>
              <div class="min-w-0 flex-1">
                <h2 class="text-sm font-bold text-gray-900 leading-tight break-words dark:text-white">{{ customer.name }}</h2>
                <p class="text-[11px] text-gray-500 leading-snug break-words dark:text-gray-400">{{ customerSubtitle }}</p>
              </div>
            </div>
            <button
              @click="goToAddTransaction"
              class="flex-shrink-0 px-2.5 py-1.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-[11px] flex items-center gap-1 shadow-md shadow-brand-500/20 active:scale-95 transition whitespace-nowrap"
            >
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
              <span>Faktur</span>
            </button>
          </div>

          <!-- Metrik 3 Kolom -->
          <div class="bg-gray-50 rounded-2xl p-2.5 border border-gray-200 grid grid-cols-3 gap-1 text-center divide-x divide-gray-200 dark:bg-gray-900/50 dark:border-gray-800 dark:divide-gray-800">
            <div>
              <span class="text-[10px] text-gray-500 block font-medium dark:text-gray-400">Nota</span>
              <span class="text-xs font-extrabold text-gray-900 dark:text-white">{{ filteredInvoices.length }} Inv</span>
            </div>
            <div>
              <span class="text-[10px] text-gray-500 block font-medium dark:text-gray-400">Total Order</span>
              <span class="text-xs font-extrabold text-success-600 dark:text-success-400">{{ formatCurrencyShort(totalBill) }}</span>
            </div>
            <div>
              <span class="text-[10px] text-warning-600 block font-medium dark:text-warning-400">Sisa Piutang</span>
              <span class="text-xs font-extrabold text-error-600 dark:text-error-400">{{ formatCurrencyShort(totalRemaining) }}</span>
            </div>
          </div>
        </div>

        <!-- Search & Quick Filter -->
        <div class="space-y-2.5">
          <div class="relative">
            <svg class="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Cari nomor faktur / invoice..."
              class="w-full bg-white border border-gray-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:border-brand-500 shadow-sm dark:bg-white/[0.03] dark:border-gray-800 dark:text-white dark:placeholder-gray-500"
            />
          </div>

          <!-- Quick Filter Status -->
          <div class="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs pb-1">
            <button
              @click="filters.paymentStatus = ''"
              :class="[
                'px-3.5 py-1.5 rounded-xl font-semibold whitespace-nowrap shadow-sm transition',
                filters.paymentStatus === ''
                  ? 'bg-brand-500 text-white'
                  : 'bg-white text-gray-700 border border-gray-200 dark:bg-white/[0.03] dark:border-gray-800 dark:text-gray-300'
              ]"
            >
              Semua ({{ customerInvoices.length }})
            </button>
            <button
              @click="filters.paymentStatus = 'belum_lunas'"
              :class="[
                'px-3.5 py-1.5 rounded-xl whitespace-nowrap transition',
                filters.paymentStatus === 'belum_lunas'
                  ? 'bg-error-500 text-white font-semibold shadow-sm'
                  : 'bg-white text-error-600 border border-error-200 dark:bg-white/[0.03] dark:border-error-500/20 dark:text-error-400'
              ]"
            >
              Belum Lunas ({{ unpaidCount }})
            </button>
            <button
              @click="filters.paymentStatus = 'lunas'"
              :class="[
                'px-3.5 py-1.5 rounded-xl whitespace-nowrap transition',
                filters.paymentStatus === 'lunas'
                  ? 'bg-success-500 text-white font-semibold shadow-sm'
                  : 'bg-white text-success-600 border border-success-200 dark:bg-white/[0.03] dark:border-success-500/20 dark:text-success-400'
              ]"
            >
              Lunas ({{ paidCount }})
            </button>
          </div>
        </div>

        <!-- List Item Invoice -->
        <div class="space-y-2.5">
          <div
            v-for="invoice in filteredInvoices"
            :key="invoice.id"
            @click="viewInvoice(invoice)"
            :class="[
              'bg-white rounded-2xl border p-3.5 flex items-center justify-between relative overflow-hidden active:scale-[0.99] transition cursor-pointer shadow-sm',
              invoice.payment_status === 'belum_lunas'
                ? 'border-error-300 dark:border-error-500/30'
                : 'border-gray-200 dark:border-gray-800',
              'dark:bg-white/[0.03]'
            ]"
          >
            <div
              v-if="invoice.payment_status === 'belum_lunas'"
              class="absolute left-0 top-0 bottom-0 w-1 bg-error-500"
            ></div>
            <div :class="['space-y-1', invoice.payment_status === 'belum_lunas' ? 'pl-1' : '']">
              <div class="flex items-center gap-2">
                <span class="text-xs font-bold text-gray-900 dark:text-white">{{ formatDateShort(invoice.created_at) }}</span>
                <span
                  :class="[
                    'text-[9px] px-1.5 py-0.5 rounded border font-semibold',
                    invoice.payment_status === 'lunas'
                      ? 'text-success-600 bg-success-50 border-success-200 dark:bg-success-500/10 dark:text-success-400 dark:border-success-500/20'
                      : 'text-error-600 bg-error-50 border-error-200 dark:bg-error-500/10 dark:text-error-400 dark:border-error-500/20'
                  ]"
                >
                  {{ invoice.payment_status === 'lunas' ? 'Lunas' : 'Belum Lunas' }}
                </span>
              </div>
              <p class="text-[10px] text-gray-500 font-mono dark:text-gray-400">{{ invoice.transaction_number }}</p>
            </div>
            <div class="text-right">
              <span
                :class="[
                  'text-xs font-black block',
                  invoice.payment_status === 'belum_lunas'
                    ? 'text-error-600 dark:text-error-400'
                    : 'text-gray-900 dark:text-white'
                ]"
              >
                {{ invoice.remaining_amount > 0 ? formatCurrency(invoice.remaining_amount) : formatCurrency(invoice.total) }}
              </span>
              <span class="text-[9px] text-gray-500 dark:text-gray-400">
                {{ invoice.payment_method === 'tempo' ? `Tempo: ${formatTempo(invoice.created_at)}` : formatPaymentMethod(invoice.payment_method) }}
              </span>
            </div>
          </div>

          <!-- Empty State -->
          <div
            v-if="filteredInvoices.length === 0"
            class="bg-white rounded-2xl border border-gray-200 p-8 text-center dark:bg-white/[0.03] dark:border-gray-800"
          >
            <p class="text-gray-500 text-sm dark:text-gray-400">Tidak ada invoice ditemukan</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Desktop View -->
    <div class="hidden md:block space-y-6 px-4 md:px-0">
      <!-- Loading Skeleton -->
      <div v-if="loading" class="space-y-6">
        <LoadingSkeleton type="card" />
        <div class="grid grid-cols-3 gap-3">
          <LoadingSkeleton type="stats" />
          <LoadingSkeleton type="stats" />
          <LoadingSkeleton type="stats" />
        </div>
        <div class="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
          <table class="w-full">
            <tbody>
              <LoadingSkeleton v-for="i in 5" :key="i" type="table-row" :columns="6" />
            </tbody>
          </table>
        </div>
      </div>

      <!-- Customer tidak ditemukan -->
      <div
        v-else-if="!customer"
        class="rounded-xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-white/[0.03]"
      >
        <p class="text-gray-600 dark:text-gray-400">Customer tidak ditemukan</p>
        <button
          @click="router.push(`/customer-invoices/${encodeURIComponent(kecamatan)}`)"
          class="mt-4 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
        >
          Kembali Pilih Customer
        </button>
      </div>

      <!-- Daftar Invoice -->
      <div v-else class="space-y-6">
        <!-- Kartu Informasi Customer -->
        <div class="rounded-xl border border-gray-200 bg-white p-4 sm:p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-start gap-3 min-w-0 flex-1">
              <div
                class="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-brand-100 text-base font-bold text-brand-600 dark:bg-brand-500/15 dark:text-brand-400"
              >
                {{ customerInitial }}
              </div>
              <div class="min-w-0 flex-1">
                <h1 class="text-lg font-bold text-gray-900 break-words dark:text-white">
                  {{ customer.name }}
                </h1>
                <p class="mt-0.5 text-sm text-gray-600 break-words dark:text-gray-400">
                  {{ customerSubtitle }}
                </p>
                <p v-if="customer.phone" class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  {{ customer.phone }}
                </p>
              </div>
            </div>
            <!-- Tombol untuk desktop -->
            <div class="flex-shrink-0 self-start items-center gap-2">
              <button
                @click="router.push(`/customer-invoices/${encodeURIComponent(kecamatan)}`)"
                class="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03]"
              >
                ← Ganti Customer
              </button>
            </div>
          </div>

          <div class="mt-4 grid grid-cols-1 gap-3 border-t border-gray-100 pt-4 sm:grid-cols-3 dark:border-gray-800">
            <div class="flex items-center justify-between gap-2 sm:block">
              <p class="text-xs text-gray-500 dark:text-gray-400">Jumlah Invoice</p>
              <p class="text-lg font-bold text-gray-900 sm:mt-0.5 dark:text-white">{{ filteredInvoices.length }}</p>
            </div>
            <div class="flex items-center justify-between gap-2 sm:block">
              <p class="text-xs text-gray-500 dark:text-gray-400">Total Transaksi</p>
              <p class="text-lg font-bold text-gray-900 sm:mt-0.5 dark:text-white">{{ formatCurrency(totalBill) }}</p>
            </div>
            <div class="flex items-center justify-between gap-2 sm:block">
              <p class="text-xs text-gray-500 dark:text-gray-400">Belum Lunas</p>
              <p class="text-lg font-bold text-warning-600 sm:mt-0.5 dark:text-warning-400">{{ formatCurrency(totalRemaining) }}</p>
            </div>
          </div>
        </div>

        <!-- Desktop Filter -->
        <div class="mb-4">
          <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                Urutan
              </label>
              <select
                v-model="filters.sortOrder"
                class="h-10 w-full appearance-none rounded-lg border border-gray-300 bg-white px-4 pr-10 text-sm text-gray-800 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              >
                <option value="newest">Terbaru</option>
                <option value="oldest">Terlama</option>
              </select>
            </div>
            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                Status Pembayaran
              </label>
              <select
                v-model="filters.paymentStatus"
                class="h-10 w-full appearance-none rounded-lg border border-gray-300 bg-white px-4 pr-10 text-sm text-gray-800 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              >
                <option value="">Semua Status</option>
                <option value="lunas">Lunas</option>
                <option value="belum_lunas">Belum Lunas</option>
              </select>
            </div>
            <div>
              <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                Metode Pembayaran
              </label>
              <select
                v-model="filters.paymentMethod"
                class="h-10 w-full appearance-none rounded-lg border border-gray-300 bg-white px-4 pr-10 text-sm text-gray-800 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              >
                <option value="">Semua Metode</option>
                <option value="cash">Cash</option>
                <option value="transfer">Transfer</option>
                <option value="qris">QRIS</option>
                <option value="tempo">Tempo</option>
              </select>
            </div>
            <div class="flex items-end">
              <button
                @click="resetFilters"
                class="h-10 w-full rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
              >
                Reset Filter
              </button>
            </div>
          </div>
        </div>

        <DataTable
          :columns="invoiceColumns"
          :data="filteredInvoices"
          :per-page="10"
          :searchable="true"
          :paginated="true"
          :show-filter="true"
          title="Daftar Invoice"
          :subtitle="`${filteredInvoices.length} invoice`"
          :empty-text="'Customer ini belum memiliki invoice'"
          @menu-action="handleMenuAction"
          @filter-click="showFilterModal = true"
        >
          <template #actions>
            <button
              @click="goToAddTransaction"
              class="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-600"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
              Tambah Transaksi
            </button>
          </template>

          <template #mobile-header>
            <span class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Tanggal Invoice
            </span>
          </template>

          <template #mobile-summary="{ row }">
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium text-gray-900 truncate dark:text-white">
                {{ formatDate(row.created_at) }}
              </p>
              <p class="text-xs text-gray-500 truncate dark:text-gray-400">
                {{ row.transaction_number }}
                <span
                  :class="[
                    'ml-1 inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium',
                    row.payment_status === 'lunas'
                      ? 'bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-400'
                      : 'bg-warning-50 text-warning-600 dark:bg-warning-500/10 dark:text-warning-400'
                  ]"
                >
                  {{ row.payment_status === 'lunas' ? 'Lunas' : 'Belum Lunas' }}
                </span>
              </p>
            </div>
          </template>

          <template #cell-transaction_number="{ row }">
            <router-link
              :to="invoiceDetailUrl(row.id)"
              class="font-medium text-brand-600 hover:underline dark:text-brand-400"
            >
              {{ row.transaction_number }}
            </router-link>
          </template>

          <template #cell-created_at="{ value }">
            <span class="text-gray-600 dark:text-gray-400">{{ formatDate(value) }}</span>
          </template>

          <template #cell-total="{ value }">
            <span class="font-medium text-gray-900 dark:text-white">{{ formatCurrency(value) }}</span>
          </template>

          <template #cell-remaining_amount="{ value, row }">
            <span v-if="row.remaining_amount > 0" class="font-medium text-warning-600 dark:text-warning-400">
              {{ formatCurrency(value) }}
            </span>
            <span v-else class="text-gray-400 dark:text-gray-600">-</span>
          </template>

          <template #cell-payment_method="{ row }">
            <div class="flex flex-col gap-1 items-end md:items-start">
              <span class="text-gray-800 dark:text-white/90">{{ formatPaymentMethod(row.payment_method) }}</span>
              <span
                :class="[
                  'inline-flex w-fit items-center rounded-full px-2 py-0.5 text-[10px] font-medium',
                  row.payment_status === 'lunas'
                    ? 'bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-400'
                    : 'bg-warning-50 text-warning-600 dark:bg-warning-500/10 dark:text-warning-400'
                ]"
              >
                {{ row.payment_status === 'lunas' ? 'Lunas' : 'Belum Lunas' }}
              </span>
            </div>
          </template>

          <template #cell-status="{ value }">
            <span
              :class="[
                'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                value === 'selesai'
                  ? 'bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-400'
                  : 'bg-error-50 text-error-600 dark:bg-error-500/10 dark:text-error-400'
              ]"
            >
              {{ value === 'selesai' ? 'Selesai' : 'Batal' }}
            </span>
          </template>

          <template #rowActions="{ row }">
            <button
              @click="viewInvoice(row)"
              class="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-600"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Lihat Invoice
            </button>
          </template>
        </DataTable>
      </div>
    </div>

    <!-- Invoice Filter Modal -->
    <InvoiceFilterModal
      v-model="filters"
      :is-open="showFilterModal"
      @close="showFilterModal = false"
      @apply="applyFilters"
    />
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import DataTable from '@/components/tables/DataTable.vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import MobilePageHeader from '@/components/common/MobilePageHeader.vue'
import InvoiceFilterModal from '@/components/common/InvoiceFilterModal.vue'
import LoadingSkeleton from '@/components/common/LoadingSkeleton.vue'
import { useCustomersStore } from '@/stores/customers'
import { useTransactionsStore } from '@/stores/transactions'
import { useToast } from '@/composables/useToast'

const router = useRouter()
const route = useRoute()
const customersStore = useCustomersStore()
const transactionsStore = useTransactionsStore()
const toast = useToast()

const kecamatan = route.params.kecamatan as string
const customerId = route.params.customerId as string
const encodeURIComponent = (s: string) => window.encodeURIComponent(s)
const loading = ref(true)
const showFilterModal = ref(false)
const searchQuery = ref('')

// Filter state
const filters = ref({
  sortOrder: 'newest',
  paymentStatus: '',
  paymentMethod: '',
  dateFrom: '',
  dateTo: '',
  minAmount: null as number | null,
  maxAmount: null as number | null
})

const customer = computed(() =>
  customersStore.customers.find((c) => c.id === customerId)
)

const customerInvoices = computed(() => {
  if (!customer.value) return []
  return transactionsStore.transactions
    .filter((t) => t.customer_id === customerId)
})

const filteredInvoices = computed(() => {
  let result = [...customerInvoices.value]

  // Filter by search query
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(t =>
      t.transaction_number.toLowerCase().includes(query)
    )
  }

  // Filter by payment status
  if (filters.value.paymentStatus) {
    result = result.filter(t => t.payment_status === filters.value.paymentStatus)
  }

  // Filter by payment method
  if (filters.value.paymentMethod) {
    result = result.filter(t => t.payment_method === filters.value.paymentMethod)
  }

  // Filter by date range
  if (filters.value.dateFrom) {
    const fromDate = new Date(filters.value.dateFrom)
    fromDate.setHours(0, 0, 0, 0)
    result = result.filter(t => new Date(t.created_at) >= fromDate)
  }

  if (filters.value.dateTo) {
    const toDate = new Date(filters.value.dateTo)
    toDate.setHours(23, 59, 59, 999)
    result = result.filter(t => new Date(t.created_at) <= toDate)
  }

  // Filter by amount range
  if (filters.value.minAmount !== null && filters.value.minAmount > 0) {
    result = result.filter(t => t.total >= filters.value.minAmount!)
  }

  if (filters.value.maxAmount !== null && filters.value.maxAmount > 0) {
    result = result.filter(t => t.total <= filters.value.maxAmount!)
  }

  // Sort by date
  result.sort((a, b) => {
    const dateA = new Date(a.created_at).getTime()
    const dateB = new Date(b.created_at).getTime()
    return filters.value.sortOrder === 'newest' ? dateB - dateA : dateA - dateB
  })

  return result
})

const unpaidCount = computed(() =>
  customerInvoices.value.filter(t => t.payment_status === 'belum_lunas').length
)

const paidCount = computed(() =>
  customerInvoices.value.filter(t => t.payment_status === 'lunas').length
)

const customerInitial = computed(() => {
  const name = customer.value?.name || '?'
  return name.charAt(0).toUpperCase()
})

const customerSubtitle = computed(() => {
  if (!customer.value) return '-'
  return (
    [customer.value.store_name, customer.value.kecamatan, customer.value.address]
      .filter(Boolean)
      .join(' · ') || '-'
  )
})

const totalBill = computed(() =>
  filteredInvoices.value.reduce((sum, t) => sum + (t.total || 0), 0)
)

const totalRemaining = computed(() =>
  filteredInvoices.value.reduce((sum, t) => sum + (t.remaining_amount || 0), 0)
)

const applyFilters = () => {
  showFilterModal.value = false
}

const resetFilters = () => {
  filters.value = {
    sortOrder: 'newest',
    paymentStatus: '',
    paymentMethod: '',
    dateFrom: '',
    dateTo: '',
    minAmount: null,
    maxAmount: null
  }
}

const invoiceDetailUrl = (transactionId: string) =>
  `/customer-invoices/${encodeURIComponent(kecamatan)}/${customerId}/${transactionId}`

const viewInvoice = (transaction: any) => {
  router.push(invoiceDetailUrl(transaction.id))
}

const goToAddTransaction = () => {
  router.push(`/customer-invoices/${encodeURIComponent(kecamatan)}/${customerId}/add-transaction`)
}

const handleMenuAction = ({ action, row }: { action: string; row: any }) => {
  if (action === 'detail') viewInvoice(row)
}

const invoiceColumns = [
  { key: 'transaction_number', label: 'NO. INVOICE', sortable: true, width: 'w-2/12' },
  { key: 'created_at', label: 'TANGGAL', sortable: true, width: 'w-2/12' },
  { key: 'total', label: 'TOTAL', sortable: true, width: 'w-2/12' },
  { key: 'remaining_amount', label: 'SISA', sortable: true, width: 'w-2/12' },
  { key: 'payment_method', label: 'PEMBAYARAN', sortable: true, width: 'w-2/12' },
  { key: 'status', label: 'STATUS', sortable: true, width: 'w-1/12' },
]

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value || 0)

const formatCurrencyShort = (value: number) => {
  if (value >= 1000000) {
    return `Rp ${(value / 1000000).toFixed(1)}jt`
  } else if (value >= 1000) {
    return `Rp ${(value / 1000).toFixed(0)}k`
  }
  return formatCurrency(value)
}

const formatDate = (value: string) => {
  const date = new Date(value)
  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

const formatDateShort = (value: string) => {
  const date = new Date(value)
  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

const formatTempo = (createdAt: string) => {
  const date = new Date(createdAt)
  date.setDate(date.getDate() + 2) // Tempo 2 hari dari tanggal transaksi
  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
  })
}

const formatPaymentMethod = (value: string) => {
  const methods: Record<string, string> = {
    tunai: 'Tunai',
    cash: 'Tunai',
    transfer: 'Transfer',
    qris: 'QRIS',
    tempo: 'Tempo',
  }
  return methods[value] || value
}

onMounted(async () => {
  try {
    await Promise.all([
      customersStore.fetchCustomers(),
      transactionsStore.fetchTransactions(),
    ])
  } catch (error) {
    console.error('Error loading invoice data:', error)
    toast.error('Gagal!', 'Gagal memuat data customer dan transaksi')
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
