<template>
  <div class="flex items-center justify-between">
    <div>
      <p class="text-[11px] tracking-wide text-gray-500 dark:text-gray-400">
        Selamat Datang,
      </p>
      <h1 class="text-xl font-extrabold leading-tight tracking-tight text-gray-900 dark:text-white">
        {{ displayName.toUpperCase() }}
      </h1>
    </div>
    <router-link
      to="/notifications"
      class="relative rounded-xl border border-gray-300 bg-white p-2.5 text-gray-500 transition hover:text-gray-900 active:scale-95 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-400 dark:hover:text-white"
    >
      <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
        />
      </svg>
      <span
        v-if="unreadCount > 0"
        class="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white"
      >
        {{ unreadCount > 9 ? '9+' : unreadCount }}
      </span>
    </router-link>
  </div>
</template>

<script setup lang="ts">
interface Props {
  displayName: string
  unreadCount: number
}

defineProps<Props>()
</script>
