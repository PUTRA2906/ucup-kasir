<template>
  <nav
    class="fixed bottom-0 left-0 right-0 z-50 h-16 flex items-center justify-around border-t bg-white px-2 backdrop-blur-md md:hidden dark:border-gray-800 dark:bg-[#0d162d]/95"
  >
    <!-- Home -->
    <router-link
      to="/"
      class="nav-btn flex flex-1 flex-col items-center justify-center py-1 transition-colors"
      :class="isActive('/') ? 'font-semibold text-blue-500' : 'text-gray-400 hover:text-gray-900 dark:hover:text-white'"
    >
      <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
        />
      </svg>
      <span class="mt-1 text-[10px]">Home</span>
    </router-link>

    <!-- Kios -->
    <router-link
      to="/customer-invoices"
      class="nav-btn flex flex-1 flex-col items-center justify-center py-1 transition-colors"
      :class="isActive('/customer-invoices') ? 'font-semibold text-blue-500' : 'text-gray-400 hover:text-gray-900 dark:hover:text-white'"
    >
      <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
        />
      </svg>
      <span class="mt-1 text-[10px]">Kios</span>
    </router-link>

    <!-- Transaksi (Floating Button) -->
    <router-link
      to="/transactions/add"
      class="group flex flex-1 flex-col items-center justify-center py-1 -mt-4"
    >
      <div
        class="flex h-12 w-12 items-center justify-center rounded-full border-4 border-white bg-blue-600 text-white shadow-lg shadow-blue-600/40 transition-transform group-hover:scale-105 dark:border-[#080e1e]"
      >
        <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
      </div>
      <span class="mt-0.5 text-[10px] font-medium text-gray-500 dark:text-gray-300">Transaksi</span>
    </router-link>

    <!-- Stok -->
    <router-link
      to="/stock"
      class="nav-btn flex flex-1 flex-col items-center justify-center py-1 transition-colors"
      :class="isActive('/stock') ? 'font-semibold text-blue-500' : 'text-gray-400 hover:text-gray-900 dark:hover:text-white'"
    >
      <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
        />
      </svg>
      <span class="mt-1 text-[10px]">Stok</span>
    </router-link>

    <!-- Pengaturan -->
    <router-link
      to="/settings"
      class="nav-btn flex flex-1 flex-col items-center justify-center py-1 transition-colors"
      :class="isActive('/settings') ? 'font-semibold text-blue-500' : 'text-gray-400 hover:text-gray-900 dark:hover:text-white'"
    >
      <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
        />
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
      <span class="mt-1 text-[10px]">Pengaturan</span>
    </router-link>
  </nav>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'
import { computed } from 'vue'

const route = useRoute()

const isActive = (path: string) => {
  if (path === '/') {
    return route.path === '/'
  }
  return route.path.startsWith(path)
}
</script>
