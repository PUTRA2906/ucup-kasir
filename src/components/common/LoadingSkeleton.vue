<template>
  <!-- Mobile Greeting Banner Skeleton -->
  <div v-if="type === 'mobile-greeting'" class="flex items-center justify-between md:hidden animate-pulse">
    <div class="flex items-center gap-3">
      <div class="h-12 w-12 rounded-2xl bg-gray-200 dark:bg-gray-800"></div>
      <div class="space-y-2">
        <div class="h-2.5 w-24 rounded bg-gray-200 dark:bg-gray-800"></div>
        <div class="h-4 w-32 rounded bg-gray-200 dark:bg-gray-800"></div>
      </div>
    </div>
    <div class="h-10 w-10 rounded-xl bg-gray-200 dark:bg-gray-800"></div>
  </div>

  <!-- Mobile Grid Menu Skeleton -->
  <div
    v-else-if="type === 'mobile-menu'"
    class="space-y-3 rounded-2xl border border-gray-200 bg-white p-4 md:hidden dark:border-gray-800 dark:bg-white/[0.03] animate-pulse"
  >
    <div class="flex items-center justify-between border-b border-gray-200 pb-2 dark:border-gray-800">
      <div class="h-3 w-20 rounded bg-gray-200 dark:bg-gray-800"></div>
      <div class="h-2.5 w-16 rounded bg-gray-200 dark:bg-gray-800"></div>
    </div>
    <div class="grid grid-cols-4 gap-y-4 gap-x-2">
      <div v-for="i in 8" :key="i" class="flex flex-col items-center space-y-2">
        <div class="h-12 w-12 rounded-2xl bg-gray-200 dark:bg-gray-800"></div>
        <div class="h-2.5 w-14 rounded bg-gray-200 dark:bg-gray-800"></div>
      </div>
    </div>
  </div>

  <!-- Card Skeleton -->
  <div
    v-else-if="type === 'card'"
    class="rounded-2xl border border-gray-200 bg-white p-6 animate-pulse dark:border-gray-800 dark:bg-white/[0.03]"
  >
    <div class="space-y-4">
      <div class="h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-800"></div>
      <div class="h-3 w-full rounded bg-gray-200 dark:bg-gray-800"></div>
      <div class="h-3 w-5/6 rounded bg-gray-200 dark:bg-gray-800"></div>
    </div>
  </div>

  <!-- List Item Skeleton -->
  <div
    v-else-if="type === 'list-item'"
    class="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 animate-pulse dark:border-gray-800 dark:bg-white/[0.03]"
  >
    <div class="h-12 w-12 rounded-lg bg-gray-200 dark:bg-gray-800"></div>
    <div class="flex-1 space-y-2">
      <div class="h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-800"></div>
      <div class="h-3 w-1/2 rounded bg-gray-200 dark:bg-gray-800"></div>
    </div>
  </div>

  <!-- Table Row Skeleton -->
  <tr v-else-if="type === 'table-row'" class="animate-pulse">
    <td v-for="i in columns" :key="i" class="px-4 py-3">
      <div class="h-4 rounded bg-gray-200 dark:bg-gray-800" :class="i === 1 ? 'w-3/4' : 'w-full'"></div>
    </td>
  </tr>

  <!-- Stats Card Skeleton -->
  <div
    v-else-if="type === 'stats'"
    class="rounded-xl border border-gray-200 bg-white p-4 animate-pulse dark:border-gray-800 dark:bg-white/[0.03]"
  >
    <div class="space-y-3">
      <div class="h-3 w-20 rounded bg-gray-200 dark:bg-gray-800"></div>
      <div class="h-6 w-32 rounded bg-gray-200 dark:bg-gray-800"></div>
      <div class="h-2.5 w-24 rounded bg-gray-200 dark:bg-gray-800"></div>
    </div>
  </div>

  <!-- Form Skeleton -->
  <div v-else-if="type === 'form'" class="space-y-4 animate-pulse">
    <div v-for="i in fields" :key="i" class="space-y-2">
      <div class="h-3 w-24 rounded bg-gray-200 dark:bg-gray-800"></div>
      <div class="h-10 w-full rounded-lg bg-gray-200 dark:bg-gray-800"></div>
    </div>
  </div>

  <!-- Default Full Page Skeleton -->
  <div v-else class="space-y-6 animate-pulse">
    <div class="h-8 w-48 rounded bg-gray-200 dark:bg-gray-800"></div>
    <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      <div v-for="i in 4" :key="i" class="h-24 rounded-xl bg-gray-200 dark:bg-gray-800"></div>
    </div>
    <div class="h-64 rounded-2xl bg-gray-200 dark:bg-gray-800"></div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  type?:
    | 'mobile-greeting'
    | 'mobile-menu'
    | 'card'
    | 'list-item'
    | 'table-row'
    | 'stats'
    | 'form'
    | 'default'
  columns?: number
  fields?: number
}>()
</script>
