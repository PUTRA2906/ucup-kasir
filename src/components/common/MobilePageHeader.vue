<template>
  <div class="mb-4 flex items-center gap-3 border-b border-gray-200 px-4 pb-4 dark:border-gray-800 md:hidden">
    <!-- Back Button -->
    <button
      v-if="!hideBackButton"
      @click="handleBack"
      class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-gray-300 bg-white text-gray-500 transition hover:bg-gray-50 active:scale-95 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
    >
      <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          :d="iconType === 'close' ? 'M6 18L18 6M6 6l12 12' : 'M15 19l-7-7 7-7'"
        />
      </svg>
    </button>

    <!-- Title + Subtitle -->
    <div class="min-w-0 flex-1">
      <h1 class="truncate text-lg font-extrabold leading-tight text-gray-900 dark:text-white">
        {{ title }}
      </h1>
      <p v-if="subtitle" class="truncate text-[10px] text-gray-500 dark:text-gray-400">
        {{ subtitle }}
      </p>
    </div>

    <!-- Badge Slot (right side, before actions) -->
    <div v-if="$slots.badge" class="shrink-0">
      <slot name="badge" />
    </div>

    <!-- Actions Slot -->
    <div v-if="$slots.actions" class="flex shrink-0 items-center gap-2">
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits, getCurrentInstance } from 'vue'
import { useRouter } from 'vue-router'

interface Props {
  title: string
  subtitle?: string
  backTo?: string
  fallbackRoute?: string
  iconType?: 'arrow' | 'close'
  hideBackButton?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  subtitle: '',
  backTo: '',
  fallbackRoute: '',
  iconType: 'arrow',
  hideBackButton: false,
})

const emit = defineEmits<{
  (e: 'back'): void
}>()

const router = useRouter()

function handleBack() {
  // 1. Jika ada backTo eksplisit, gunakan itu
  if (props.backTo) {
    router.push(props.backTo)
    return
  }

  // 2. Emit event dulu untuk custom handler
  emit('back')

  // 3. Cek apakah ada listener @back
  const hasBackListener = !!getCurrentInstance()?.vnode.props?.onBack
  if (hasBackListener) {
    return // Custom handler akan menangani
  }

  // 4. Smart back: cek apakah ada history yang valid
  // Jika history length > 1, gunakan router.back()
  // Jika tidak ada atau terlalu pendek, gunakan fallbackRoute atau parent route
  if (window.history.length > 2) {
    router.back()
  } else {
    // Fallback ke route parent atau fallbackRoute
    if (props.fallbackRoute) {
      router.push(props.fallbackRoute)
    } else {
      // Ekstrak parent route dari current path
      const currentPath = router.currentRoute.value.path
      const parentPath = currentPath.split('/').slice(0, -1).join('/') || '/'
      router.push(parentPath)
    }
  }
}
</script>
