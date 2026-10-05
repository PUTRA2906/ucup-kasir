<template>
  <AdminLayout>
    <PageBreadcrumb pageTitle="Matriks Harga" class="hidden md:block" />
    <MobilePageHeader
      title="Matriks Harga"
      subtitle="Kelola harga tier & harga khusus"
     
    />

    <div class="mx-auto max-w-3xl space-y-4">
      <!-- Mobile: dua kartu besar -->
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          type="button"
          class="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 text-left shadow-sm transition active:scale-[0.99] hover:border-brand-200 dark:border-gray-800 dark:bg-white/[0.03]"
          @click="$router.push('/price-matrix/tiers')"
        >
          <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 ring-1 ring-blue-500/15 dark:text-blue-400">
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
          </span>
          <span class="min-w-0 flex-1">
            <span class="block text-sm font-bold text-gray-900 dark:text-white">Harga Tier</span>
            <span class="mt-0.5 block text-xs leading-snug text-gray-500 dark:text-gray-400">Diskon berdasarkan jumlah — eceran, grosir, partai besar.</span>
          </span>
          <span class="shrink-0 text-gray-300 dark:text-gray-600">›</span>
        </button>

        <button
          type="button"
          class="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 text-left shadow-sm transition active:scale-[0.99] hover:border-brand-200 dark:border-gray-800 dark:bg-white/[0.03]"
          @click="$router.push('/price-matrix/customers')"
        >
          <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-600 ring-1 ring-cyan-500/15 dark:text-cyan-400">
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
          </span>
          <span class="min-w-0 flex-1">
            <span class="block text-sm font-bold text-gray-900 dark:text-white">Harga per Pelanggan</span>
            <span class="mt-0.5 block text-xs leading-snug text-gray-500 dark:text-gray-400">Harga khusus satu pelanggan — kontrak, loyalitas, promo.</span>
          </span>
          <span class="shrink-0 text-gray-300 dark:text-gray-600">›</span>
        </button>

        <button
          type="button"
          class="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 text-left shadow-sm transition active:scale-[0.99] hover:border-brand-200 dark:border-gray-800 dark:bg-white/[0.03]"
          @click="$router.push('/price-matrix/groups')"
        >
          <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 ring-1 ring-violet-500/15 dark:text-violet-400">
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          </span>
          <span class="min-w-0 flex-1">
            <span class="block text-sm font-bold text-gray-900 dark:text-white">Grup Pelanggan</span>
            <span class="mt-0.5 block text-xs leading-snug text-gray-500 dark:text-gray-400">Kumpulkan pelanggan, atur harga sekali untuk semua anggotanya.</span>
          </span>
          <span class="shrink-0 text-gray-300 dark:text-gray-600">›</span>
        </button>

        <button
          type="button"
          class="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 text-left shadow-sm transition active:scale-[0.99] hover:border-brand-200 dark:border-gray-800 dark:bg-white/[0.03]"
          @click="$router.push('/price-matrix/group-prices')"
        >
          <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-fuchsia-500/10 text-fuchsia-600 ring-1 ring-fuchsia-500/15 dark:text-fuchsia-400">
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
          </span>
          <span class="min-w-0 flex-1">
            <span class="block text-sm font-bold text-gray-900 dark:text-white">Harga per Grup</span>
            <span class="mt-0.5 block text-xs leading-snug text-gray-500 dark:text-gray-400">Harga khusus untuk semua anggota grup sekaligus.</span>
          </span>
          <span class="shrink-0 text-gray-300 dark:text-gray-600">›</span>
        </button>
      </div>

      <!-- Desktop: ringkasan kecil -->
      <div class="hidden rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03] md:block">
        <h3 class="text-sm font-bold text-gray-900 dark:text-white">Cara pakai</h3>
        <p class="mt-1 text-xs leading-relaxed text-gray-600 dark:text-gray-400">
          Buat <b class="text-gray-900 dark:text-white">Harga Tier</b> untuk diskon otomatis berdasarkan jumlah pembelian,
          <b class="text-gray-900 dark:text-white">Harga Khusus</b> per pelanggan, atau <b class="text-gray-900 dark:text-white">Grup Pelanggan</b> + <b class="text-gray-900 dark:text-white">Harga per Grup</b> untuk banyak pelanggan sekaligus. Prioritas saat transaksi: harga pelanggan → harga grup → tier → harga normal.
        </p>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import AdminLayout from '@/components/layout/AdminLayout.vue'
import MobilePageHeader from '@/components/common/MobilePageHeader.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
</script>
