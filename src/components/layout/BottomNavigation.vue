<template>
  <nav
    v-if="hasActiveMenu"
    class="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white px-2 pb-4 pt-2 md:hidden dark:border-slate-800 dark:bg-[#0d162d]/95"
  >
    <div
      class="grid items-end text-center"
      :style="{ gridTemplateColumns: `repeat(${visibleCount}, minmax(0, 1fr))` }"
    >
      <!-- Home -->
      <router-link
        v-if="can('dashboard.read')"
        to="/"
        class="flex flex-col items-center gap-1 transition-colors"
        :class="isActive('/') ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'"
      >
        <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
        <span class="text-[10px]" :class="isActive('/') ? 'font-bold' : 'font-medium'">Home</span>
      </router-link>

      <!-- Keuangan -->
      <router-link
        v-if="can('finance.read')"
        to="/quick-menu/keuangan"
        class="flex flex-col items-center gap-1 transition-colors"
        :class="isActive('/quick-menu/keuangan') ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'"
      >
        <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0 0 4h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5" />
          <path d="M16 14h.01" />
        </svg>
        <span class="text-[10px]" :class="isActive('/quick-menu/keuangan') ? 'font-bold' : 'font-medium'">Keuangan</span>
      </router-link>

      <!-- Transaksi (Floating Button) -->
      <router-link
        v-if="can('transaction.write')"
        to="/transactions/add-from-home"
        class="group flex flex-col items-center"
      >
        <div
          class="-mt-8 flex h-14 w-14 items-center justify-center rounded-full border-4 border-white bg-blue-600 text-white shadow-lg transition-transform hover:bg-blue-500 active:scale-95 dark:border-[#080e1e]"
        >
          <svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </div>
        <span class="mt-1 text-[10px] font-semibold text-slate-600 dark:text-slate-300">Transaksi</span>
      </router-link>

      <!-- Laporan -->
      <router-link
        v-if="can('report.sales.read')"
        to="/reports"
        class="flex flex-col items-center gap-1 transition-colors"
        :class="isActive('/reports') ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'"
      >
        <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
        <span class="text-[10px]" :class="isActive('/reports') ? 'font-bold' : 'font-medium'">Laporan</span>
      </router-link>

      <!-- Profil -->
      <router-link
        to="/settings"
        class="flex flex-col items-center gap-1 transition-colors"
        :class="isActive('/settings') ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'"
      >
        <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" />
        </svg>
        <span class="text-[10px]" :class="isActive('/settings') ? 'font-bold' : 'font-medium'">Profil</span>
      </router-link>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'
import { computed } from 'vue'
import { usePermission } from '@/composables/usePermission'

const route = useRoute()
const { can } = usePermission()

const isActive = (path: string) => {
  if (path === '/') {
    return route.path === '/'
  }
  // Exact match untuk /reports agar sub-route tidak ikut aktif
  if (path === '/reports') {
    return route.path === '/reports'
  }
  return route.path.startsWith(path)
}

const visibleCount = computed(() => {
  let count = 1 // Profil selalu tampil
  if (can('dashboard.read')) count++
  if (can('finance.read')) count++
  if (can('transaction.write')) count++
  if (can('report.sales.read')) count++
  return count
})

const hasActiveMenu = computed(() => {
  // Hanya tampilkan bottom nav di halaman utama menu, bukan sub-halaman
  const exactPaths = ['/', '/reports', '/quick-menu/keuangan', '/settings', '/settings/profile']
  const prefixPaths = ['/transactions/add-from-home']
  const onMenuPage =
    exactPaths.includes(route.path) ||
    prefixPaths.some(p => route.path.startsWith(p))

  return onMenuPage
})
</script>
