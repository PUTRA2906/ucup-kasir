<template>
  <div class="space-y-3">
    <div class="flex items-center justify-between px-1">
      <span class="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
        Menu Cepat
      </span>
    </div>

    <div>
      <div class="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/[0.03] overflow-hidden">
        <div
          ref="menuCarouselContainer"
          class="overflow-x-auto scrollbar-hide snap-x snap-mandatory"
          @scroll="handleMenuScroll"
        >
          <div class="flex gap-3">
            <div class="min-w-full snap-center grid grid-cols-4 gap-y-4 gap-x-2 p-4" style="grid-template-rows: repeat(2, auto);">
              <router-link
                to="/transactions/add"
                class="group flex flex-col items-center transition active:scale-95"
              >
                <div class="flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-500/20 bg-cyan-500/10 text-cyan-500 transition-transform group-hover:scale-105">
                  <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <span class="mt-2 text-[11px] font-medium leading-tight text-center text-gray-700 dark:text-gray-300">
                  Buat Faktur
                </span>
              </router-link>

              <router-link
                to="/transactions"
                class="group flex flex-col items-center transition active:scale-95"
              >
                <div class="flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-500/20 bg-cyan-500/10 text-cyan-500 transition-transform group-hover:scale-105">
                  <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                </div>
                <span class="mt-2 text-[11px] font-medium leading-tight text-center text-gray-700 dark:text-gray-300">
                  Daftar Faktur
                </span>
              </router-link>

              <router-link
                to="/returns"
                class="group flex flex-col items-center transition active:scale-95"
              >
                <div class="flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-500/20 bg-cyan-500/10 text-cyan-500 transition-transform group-hover:scale-105">
                  <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
                <span class="mt-2 text-[11px] font-medium leading-tight text-center text-gray-700 dark:text-gray-300">
                  Retur
                </span>
              </router-link>

              <router-link
                to="/customers"
                class="group flex flex-col items-center transition active:scale-95"
              >
                <div class="flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-500/20 bg-cyan-500/10 text-cyan-500 transition-transform group-hover:scale-105">
                  <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <span class="mt-2 text-[11px] font-medium leading-tight text-center text-gray-700 dark:text-gray-300">
                  Customer
                </span>
              </router-link>

              <router-link
                to="/products"
                class="group flex flex-col items-center transition active:scale-95"
              >
                <div class="flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-500/20 bg-cyan-500/10 text-cyan-500 transition-transform group-hover:scale-105">
                  <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <span class="mt-2 text-[11px] font-medium leading-tight text-center text-gray-700 dark:text-gray-300">
                  Produk
                </span>
              </router-link>

              <router-link
                to="/categories"
                class="group flex flex-col items-center transition active:scale-95"
              >
                <div class="flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-500/20 bg-cyan-500/10 text-cyan-500 transition-transform group-hover:scale-105">
                  <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                </div>
                <span class="mt-2 text-[11px] font-medium leading-tight text-center text-gray-700 dark:text-gray-300">
                  Kategori
                </span>
              </router-link>

              <button
                v-for="(group, idx) in menuGroups.slice(0, 2)"
                :key="group.slug"
                type="button"
                @click="$emit('navigate-group', group.slug)"
                class="group flex flex-col items-center transition active:scale-95"
              >
                <div class="relative">
                  <div
                    class="flex h-14 w-14 items-center justify-center rounded-2xl border transition-transform group-hover:scale-105"
                    :class="group.iconClass"
                  >
                    <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="group.iconPath" />
                    </svg>
                  </div>
                  <span
                    v-if="group.slug === 'pengiriman' && pendingShipmentsCount > 0"
                    class="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white shadow-sm"
                  >
                    {{ pendingShipmentsCount > 9 ? '9+' : pendingShipmentsCount }}
                  </span>
                </div>
                <span class="mt-2 text-[11px] font-medium leading-tight text-center text-gray-700 dark:text-gray-300">
                  {{ group.title }}
                </span>
              </button>
            </div>

            <div v-if="menuGroups.length > 2" class="min-w-full snap-center grid grid-cols-4 gap-y-4 gap-x-2 p-4" style="grid-template-rows: repeat(2, auto);">
              <button
                v-for="group in menuGroups.slice(2)"
                :key="group.slug"
                type="button"
                @click="$emit('navigate-group', group.slug)"
                class="group flex flex-col items-center transition active:scale-95"
              >
                <div class="relative">
                  <div
                    class="flex h-14 w-14 items-center justify-center rounded-2xl border transition-transform group-hover:scale-105"
                    :class="group.iconClass"
                  >
                    <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="group.iconPath" />
                    </svg>
                  </div>
                </div>
                <span class="mt-2 text-[11px] font-medium leading-tight text-center text-gray-700 dark:text-gray-300">
                  {{ group.title }}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="mt-3 flex justify-center gap-1.5">
        <button
          v-for="idx in 2"
          :key="idx"
          type="button"
          class="h-1.5 rounded-full transition-all"
          :class="currentMenuIndex === idx - 1 ? 'w-6 bg-brand-500' : 'w-1.5 bg-gray-300 dark:bg-gray-600'"
          @click="scrollToMenu(idx - 1)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface MenuGroup {
  slug: string
  title: string
  iconPath: string
  iconClass: string
}

interface Props {
  menuGroups: MenuGroup[]
  pendingShipmentsCount: number
}

defineProps<Props>()
defineEmits<{
  'navigate-group': [slug: string]
}>()

const menuCarouselContainer = ref<HTMLElement | null>(null)
const currentMenuIndex = ref(0)

const handleMenuScroll = () => {
  if (!menuCarouselContainer.value) return
  const scrollLeft = menuCarouselContainer.value.scrollLeft
  const slideWidth = menuCarouselContainer.value.offsetWidth
  currentMenuIndex.value = Math.round(scrollLeft / slideWidth)
}

const scrollToMenu = (index: number) => {
  if (!menuCarouselContainer.value) return
  const slideWidth = menuCarouselContainer.value.offsetWidth
  menuCarouselContainer.value.scrollTo({
    left: index * slideWidth,
    behavior: 'smooth'
  })
}
</script>

<style scoped>
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
</style>
