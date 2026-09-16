<template>
  <AdminLayout>
    <PageBreadcrumb pageTitle="Supplier" class="hidden md:block" />

    <!-- Mobile Header -->
    <MobilePageHeader title="Supplier" subtitle="Master Pemasok" back-to="/quick-menu/pembelian">
      <template #actions>
        <router-link
          to="/purchasing/suppliers/add"
          class="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-white hover:bg-blue-500"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </router-link>
      </template>
    </MobilePageHeader>

    <!-- Desktop Header -->
    <div class="mb-4 hidden items-center justify-between md:flex">
      <div></div>
      <router-link
        to="/purchasing/suppliers/add"
        class="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
      >
        + Tambah Supplier
      </router-link>
    </div>

    <!-- Loading -->
    <div v-if="store.loading" class="flex items-center justify-center py-20">
      <div class="text-center">
        <div class="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
        <p class="text-sm text-gray-500 dark:text-gray-400">Memuat supplier...</p>
      </div>
    </div>

    <div v-else>
      <!-- Error -->
      <div v-if="store.error" class="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-500/30 dark:bg-red-500/10">
        <p class="text-sm text-red-600 dark:text-red-400">{{ store.error }}</p>
      </div>

      <!-- Empty -->
      <div v-if="!store.error && store.suppliers.length === 0" class="rounded-2xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-gray-900">
        <div class="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10">
          <svg class="h-7 w-7 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <h3 class="text-sm font-bold text-gray-900 dark:text-white">Belum ada supplier</h3>
        <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Tambah supplier pertama untuk mulai pembelian.</p>
        <router-link
          to="/purchasing/suppliers/add"
          class="mt-4 inline-block rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
        >
          Tambah Supplier
        </router-link>
      </div>

      <!-- Supplier List -->
      <div v-else-if="store.suppliers.length > 0" class="space-y-3">
        <!-- Desktop Table -->
        <div class="hidden overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm md:block dark:border-gray-800 dark:bg-gray-900">
          <table class="w-full text-left text-sm">
            <thead class="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
              <tr>
                <th class="px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Nama</th>
                <th class="px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Kontak</th>
                <th class="px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Tipe</th>
                <th class="px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Termin</th>
                <th class="px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Status</th>
                <th class="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Aksi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
              <tr v-for="s in store.suppliers" :key="s.id" class="hover:bg-gray-50 dark:hover:bg-gray-800">
                <td class="px-4 py-3">
                  <p class="font-medium text-gray-900 dark:text-white">{{ s.name }}</p>
                  <p v-if="s.contact_person" class="text-[10px] text-gray-500 dark:text-gray-400">{{ s.contact_person }}</p>
                </td>
                <td class="px-4 py-3 text-xs text-gray-600 dark:text-gray-400">
                  <p v-if="s.phone">{{ s.phone }}</p>
                  <p v-if="s.email" class="text-gray-500 dark:text-gray-500">{{ s.email }}</p>
                </td>
                <td class="px-4 py-3 text-xs">
                  <span class="rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase" :class="getTypeBadge(s.supplier_type)">
                    {{ s.supplier_type }}
                  </span>
                </td>
                <td class="px-4 py-3 text-xs text-gray-600 dark:text-gray-400">{{ s.payment_term === 'tunai' ? 'Tunai' : s.payment_term + ' Hari' }}</td>
                <td class="px-4 py-3">
                  <span class="rounded-lg px-2 py-0.5 text-[9px] font-bold uppercase" :class="s.is_active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'">
                    {{ s.is_active ? 'Aktif' : 'Nonaktif' }}
                  </span>
                </td>
                <td class="px-4 py-3">
                  <div class="flex items-center justify-end gap-1">
                    <router-link
                      :to="`/purchasing/suppliers/${s.id}/edit`"
                      class="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700"
                    >
                      <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </router-link>
                    <button
                      @click="handleDelete(s)"
                      class="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                    >
                      <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Mobile Cards -->
        <div class="grid grid-cols-1 gap-2.5 md:hidden">
          <div
            v-for="s in store.suppliers"
            :key="s.id"
            class="rounded-xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-gray-900"
          >
            <div class="flex items-start justify-between">
              <div class="flex-1 min-w-0">
                <p class="text-xs font-bold text-gray-900 dark:text-white">{{ s.name }}</p>
                <p v-if="s.contact_person" class="text-[10px] text-gray-500 dark:text-gray-400">{{ s.contact_person }}</p>
              </div>
              <span class="rounded-lg px-2 py-0.5 text-[9px] font-bold uppercase" :class="getTypeBadge(s.supplier_type)">
                {{ s.supplier_type }}
              </span>
            </div>
            <div class="mt-2 space-y-0.5 text-[10px] text-gray-500 dark:text-gray-400">
              <p v-if="s.phone">{{ s.phone }}</p>
              <p>{{ s.payment_term === 'tunai' ? 'Tunai' : s.payment_term + ' Hari' }}</p>
            </div>
            <div class="mt-2 flex items-center justify-between border-t border-gray-200 pt-2 dark:border-gray-700">
              <span class="rounded-lg px-2 py-0.5 text-[9px] font-bold uppercase" :class="s.is_active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'">
                {{ s.is_active ? 'Aktif' : 'Nonaktif' }}
              </span>
              <div class="flex gap-1">
                <router-link
                  :to="`/purchasing/suppliers/${s.id}/edit`"
                  class="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
                >
                  <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </router-link>
                <button
                  @click="handleDelete(s)"
                  class="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                >
                  <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { useConfirm } from '@/composables/useConfirm'
import { useToast } from '@/composables/useToast'
import { ref, onMounted } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import MobilePageHeader from '@/components/common/MobilePageHeader.vue'
import { usePurchasingStore } from '@/stores/purchasing'

const { confirm } = useConfirm()
const toast = useToast()
const store = usePurchasingStore()

const getTypeBadge = (type: string) => {
  const badges: Record<string, string> = {
    langsung: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400',
    distributor: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
    grosir: 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400',
    importir: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400',
  }
  return badges[type] || 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400'
}

const handleDelete = async (s: any) => {
  if (!(await confirm(`Hapus supplier "${s.name}"?`))) return
  try {
    await store.deleteSupplier(s.id)
  } catch (e: any) {
    toast.error('Gagal!', e.message)
  }
}

onMounted(async () => {
  if (store.suppliers.length === 0) {
    await store.fetchSuppliers()
  }
})
</script>