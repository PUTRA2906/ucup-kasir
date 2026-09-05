<template>
  <div class="min-h-dvh bg-gray-50 dark:bg-gray-900">
    <!-- Sticky Header -->
    <header
      class="sticky top-0 z-20 border-b border-gray-200 bg-white/90 px-4 py-3 backdrop-blur dark:border-gray-800 dark:bg-gray-900/90"
    >
      <div class="mx-auto flex max-w-md items-center justify-between">
        <div class="flex items-center gap-3">
          <button
            type="button"
            @click="router.back()"
            class="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 text-gray-600 transition active:scale-95 dark:bg-gray-800 dark:text-gray-300"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <h1 class="text-base font-bold leading-tight text-gray-900 dark:text-white">{{ group.title }}</h1>
            <p class="text-[11px] text-gray-500 dark:text-gray-400">{{ group.items.length }} fitur tersedia</p>
          </div>
        </div>
      </div>
    </header>

    <main class="mx-auto max-w-md space-y-5 px-4 py-4">
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
          :placeholder="`Cari fitur ${group.title.toLowerCase()}...`"
          class="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-xs text-gray-900 placeholder-gray-400 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        />
      </div>

      <!-- Search Result -->
      <div
        v-if="search.trim()"
        class="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:divide-gray-800 dark:border-gray-800 dark:bg-white/[0.03]"
      >
        <router-link
          v-for="item in filteredItems"
          :key="item.id"
          :to="item.to"
          class="flex items-center justify-between p-3.5 transition hover:bg-gray-50 active:scale-[0.99] dark:hover:bg-white/[0.03]"
        >
          <div class="flex items-center gap-3">
            <div
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
              :class="item.iconClass"
            >
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="item.iconPath" />
              </svg>
            </div>
            <div>
              <p class="text-xs font-semibold text-gray-900 dark:text-white">{{ item.label }}</p>
              <p class="text-[10px] text-gray-500 dark:text-gray-400">{{ item.description }}</p>
            </div>
          </div>
          <svg class="h-3.5 w-3.5 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </router-link>
        <p v-if="filteredItems.length === 0" class="p-6 text-center text-xs text-gray-500 dark:text-gray-400">
          Tidak ada fitur yang cocok.
        </p>
      </div>

      <!-- Full List — seksi dengan judul di luar kartu (gaya home.html) -->
      <div v-else class="space-y-5">
        <section v-for="sub in subgroups" :key="sub.title" class="space-y-2">
          <h2 class="px-1 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            {{ sub.title }}
          </h2>

          <div class="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:divide-gray-800 dark:border-gray-800 dark:bg-white/[0.03]">
            <router-link
              v-for="item in sub.items"
              :key="item.id"
              :to="item.to"
              class="flex items-center justify-between p-3.5 transition hover:bg-gray-50 active:scale-[0.99] dark:hover:bg-white/[0.03]"
            >
              <div class="flex items-center gap-3">
                <div
                  class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                  :class="item.iconClass"
                >
                  <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="item.iconPath" />
                  </svg>
                </div>
                <div>
                  <p class="text-xs font-semibold text-gray-900 dark:text-white">{{ item.label }}</p>
                  <p class="text-[10px] text-gray-500 dark:text-gray-400">{{ item.description }}</p>
                </div>
              </div>
              <svg class="h-3.5 w-3.5 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </router-link>
          </div>
        </section>
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
  SUBGROUP_ORDER,
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

/** Kelompokkan item grup menjadi subgrup, urut sesuai SUBGROUP_ORDER */
const subgroups = computed<{ title: string; items: QuickMenuItem[] }[]>(() => {
  const map = new Map<string, QuickMenuItem[]>()
  for (const item of group.value.items) {
    const title = SUBGROUP_MAP[item.id] ?? 'Lainnya'
    if (!map.has(title)) map.set(title, [])
    map.get(title)!.push(item)
  }
  const order = SUBGROUP_ORDER[slug] ?? []
  const titles = [...map.keys()]
  titles.sort((a, b) => {
    const ia = order.indexOf(a)
    const ib = order.indexOf(b)
    // Subgrup tanpa urutan eksplisit ditaruh di belakang
    if (ia === -1 && ib === -1) return 0
    if (ia === -1) return 1
    if (ib === -1) return -1
    return ia - ib
  })
  return titles.map((title) => ({ title, items: map.get(title)! }))
})

const search = ref('')

const filteredItems = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return []
  return group.value.items.filter(
    (item) =>
      item.label.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q)
  )
})
</script>
