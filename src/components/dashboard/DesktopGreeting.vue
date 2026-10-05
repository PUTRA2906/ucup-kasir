<template>
  <div class="flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-6 md:flex sm:flex-row sm:items-center sm:justify-between dark:border-gray-800 dark:bg-white/[0.03]">
    <div>
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
        Selamat datang, {{ displayName }} 👋
      </h1>
      <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">{{ todayLabel }}</p>
    </div>
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
      <router-link
        to="/products"
        class="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 sm:w-auto dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
      >
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M4 6h16M4 10h16M4 14h16M4 18h16"
          />
        </svg>
        Lihat Produk
      </router-link>
      <router-link
        to="/products/add"
        class="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 sm:w-auto"
      >
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Tambah Produk
      </router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  displayName: string
  todayLabel: string
}

defineProps<Props>()
</script>
