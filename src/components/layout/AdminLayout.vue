<template>
  <div class="min-h-screen xl:flex">
    <app-sidebar class="hidden md:block" />
    <Backdrop />
    <div
      class="flex-1 transition-all duration-300 ease-in-out"
      :class="[isExpanded || isHovered ? 'lg:ml-[290px]' : 'lg:ml-[90px]']"
    >
      <app-header class="hidden md:block" />
      <div class="p-4 mx-auto max-w-(--breakpoint-2xl) pb-24 md:p-6 md:pb-6">
        <slot></slot>
      </div>
    </div>
    <bottom-navigation />
  </div>
</template>

<script setup>
import AppSidebar from './AppSidebar.vue'
import AppHeader from './AppHeader.vue'
import BottomNavigation from './BottomNavigation.vue'
import { useSidebar } from '@/composables/useSidebar'
import Backdrop from './Backdrop.vue'
const { isExpanded, isHovered } = useSidebar()
</script>
