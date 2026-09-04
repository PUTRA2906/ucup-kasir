<template>
  <div class="mb-4 flex items-center gap-3 border-b border-gray-200 pb-4 dark:border-gray-800 md:hidden">
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
import { defineProps, defineEmits } from 'vue'
import { useRouter } from 'vue-router'

interface Props {
  title: string
  subtitle?: string
  backTo?: string
  iconType?: 'arrow' | 'close'
  hideBackButton?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  subtitle: '',
  backTo: '',
  iconType: 'arrow',
  hideBackButton: false,
})

const emit = defineEmits<{
  (e: 'back'): void
}>()

const router = useRouter()

function handleBack() {
  if (props.backTo) {
    router.push(props.backTo)
  } else {
    emit('back')
  }
}
</script>
