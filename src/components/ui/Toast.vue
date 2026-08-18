<template>
  <Transition name="toast">
    <div
      v-if="visible"
      :class="['fixed right-3 top-20 z-[9999] w-[calc(50%-0.75rem)] rounded-lg border p-2.5 shadow-xl md:right-6 md:top-24 md:w-full md:max-w-xs md:p-3', variantClasses[variant].container]"
    >
      <div class="flex items-start gap-2 md:gap-2.5">
        <div :class="['flex-shrink-0', variantClasses[variant].icon]">
          <component :is="icons[variant]" class="h-3.5 w-3.5 md:h-4 md:w-4" />
        </div>

        <div class="flex-1 min-w-0">
          <h4 class="mb-0.5 text-[11px] font-semibold leading-tight text-gray-900 md:text-xs dark:text-white">
            {{ title }}
          </h4>
          <p class="text-[10px] leading-tight text-gray-600 md:text-xs dark:text-gray-300">{{ message }}</p>
        </div>

        <button
          @click="close"
          class="flex-shrink-0 rounded p-0.5 text-gray-500 hover:bg-gray-200 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
        >
          <svg class="h-3 w-3 md:h-3.5 md:w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { SuccessIcon, ErrorIcon, WarningIcon, InfoCircleIcon } from '@/icons'

interface ToastProps {
  variant: 'success' | 'error' | 'warning' | 'info'
  title: string
  message: string
  duration?: number
}

const props = withDefaults(defineProps<ToastProps>(), {
  duration: 5000
})

const emit = defineEmits<{
  close: []
}>()

const visible = ref(false)
let timeoutId: ReturnType<typeof setTimeout> | null = null

const variantClasses = {
  success: {
    container: 'border-success-500 bg-success-100 dark:border-success-500 dark:bg-success-900',
    icon: 'text-success-600 dark:text-success-400',
  },
  error: {
    container: 'border-error-500 bg-error-100 dark:border-error-500 dark:bg-error-900',
    icon: 'text-error-600 dark:text-error-400',
  },
  warning: {
    container: 'border-warning-500 bg-warning-100 dark:border-warning-500 dark:bg-warning-900',
    icon: 'text-warning-600 dark:text-warning-400',
  },
  info: {
    container:
      'border-blue-light-500 bg-blue-light-100 dark:border-blue-light-500 dark:bg-blue-light-900',
    icon: 'text-blue-light-600 dark:text-blue-light-400',
  },
}

const icons = {
  success: SuccessIcon,
  error: ErrorIcon,
  warning: WarningIcon,
  info: InfoCircleIcon,
}

const close = () => {
  visible.value = false
  if (timeoutId) {
    clearTimeout(timeoutId)
    timeoutId = null
  }
  setTimeout(() => {
    emit('close')
  }, 300)
}

onMounted(() => {
  visible.value = true

  if (props.duration > 0) {
    timeoutId = setTimeout(() => {
      close()
    }, props.duration)
  }
})
</script>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  transform: translateY(-20px);
  opacity: 0;
}

.toast-leave-to {
  transform: translateY(-20px);
  opacity: 0;
}

@media (min-width: 768px) {
  .toast-enter-from {
    transform: translateX(100%);
    opacity: 0;
  }

  .toast-leave-to {
    transform: translateX(100%);
    opacity: 0;
  }
}
</style>
