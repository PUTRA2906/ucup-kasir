<template>
  <div class="min-h-dvh bg-white dark:bg-gray-900">
    <!-- Sticky Header -->
    <header
      class="sticky top-0 z-20 border-b border-gray-200 bg-white/90 px-4 py-3 backdrop-blur dark:border-gray-800 dark:bg-gray-900/90"
    >
      <div class="mx-auto flex max-w-md items-center justify-between">
        <div class="flex items-center gap-3">
          <button
            type="button"
            @click="router.back()"
            class="flex h-8 w-8 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 transition active:scale-95 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <h1 class="font-bold leading-tight text-gray-900 dark:text-white">{{ group.title }}</h1>
            <p class="text-[11px] text-gray-500 dark:text-gray-400">{{ group.items.length }} fitur tersedia</p>
          </div>
        </div>
      </div>
    </header>

    <main class="mx-auto max-w-md space-y-4 px-4 py-4">
      <!-- Search -->
      <div class="relative">
        <svg
          class="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          v-model="search"
          type="text"
          placeholder="Cari fitur..."
          class="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        />
      </div>

      <!-- Search Result -->
      <div
        v-if="search.trim()"
        class="space-y-2.5 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]"
      >
        <router-link
          v-for="item in filteredItems"
          :key="item.id"
          :to="item.to"
          class="flex items-center gap-3 rounded-xl p-2.5 transition hover:bg-gray-50 active:scale-[0.99] dark:hover:bg-white/[0.03]"
        >
          <div
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border"
            :class="item.iconClass"
          >
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="item.iconPath" />
            </svg>
          </div>
          <span class="flex-1 text-sm font-semibold text-gray-800 dark:text-gray-100">{{ item.label }}</span>
          <svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </router-link>
      </div>

      <!-- Full List — dikelompokkan per subgrup -->
      <div v-else class="space-y-4">
        <div
          v-for="sub in subgroups"
          :key="sub.title"
          class="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03]"
        >
          <!-- Subgroup Header -->
          <div class="flex items-center gap-2 border-b border-gray-100 px-4 py-2.5 dark:border-gray-800">
          
            <span class="text-[11px] font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">
              {{ sub.title }}
            </span>
            <span class="text-[10px] text-gray-400">({{ sub.items.length }})</span>
          </div>

          <div class="divide-y divide-gray-100 dark:divide-gray-800">
            <router-link
              v-for="item in sub.items"
              :key="item.id"
              :to="item.to"
              class="flex items-center gap-3 p-3.5 transition hover:bg-gray-50 active:scale-[0.99] dark:hover:bg-white/[0.03]"
            >
              <div
                class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border"
                :class="item.iconClass"
              >
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="item.iconPath" />
                </svg>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-xs font-bold text-gray-800 dark:text-white">
                   {{ item.label }}
                </p>
                <p class="text-[10px] text-gray-500 dark:text-gray-400">{{ item.description }}</p>
              </div>
              
            </router-link>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  QUICK_MENU_GROUPS,
  SUBGROUP_MAP,
  getGroupItems,
  type QuickMenuGroup,
  type QuickMenuItem,
} from '@/data/quickMenu'

const route = useRoute()
const router = useRouter()

const slug = route.params.slug as string
const group = computed<QuickMenuGroup>(() => {
  const meta = QUICK_MENU_GROUPS.find((g) => g.slug === slug)
  return {
    title: meta?.title ?? 'Menu',
    slug,
    color: meta?.color ?? 'bg-gray-400',
    items: getGroupItems(slug),
  }
})

/** Kelompokkan item grup menjadi subgrup (urut sesuai urutan tampil item) */
const subgroups = computed<{ title: string; items: QuickMenuItem[] }[]>(() => {
  const map = new Map<string, QuickMenuItem[]>()
  for (const item of group.value.items) {
    const title = SUBGROUP_MAP[item.id] ?? 'Lainnya'
    if (!map.has(title)) map.set(title, [])
    map.get(title)!.push(item)
  }
  return [...map.entries()].map(([title, items]) => ({ title, items }))
})

const search = ref('')

const filteredItems = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return []
  return group.value.items.filter((item) => item.label.toLowerCase().includes(q))
})
</script>
