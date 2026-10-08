<template>
  <Transition name="modal">
    <div v-if="visible" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click.stop></div>

      <!-- Modal -->
      <div class="relative w-full max-w-md rounded-2xl bg-white shadow-2xl dark:bg-gray-900">
        <!-- Header -->
        <div class="border-b border-gray-200 px-6 py-4 dark:border-gray-800">
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500/10">
              <svg class="h-5 w-5 animate-spin text-indigo-500" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <div>
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Sinkronisasi Database</h3>
              <p class="text-sm text-gray-500 dark:text-gray-400">{{ currentStep }}</p>
            </div>
          </div>
        </div>

        <!-- Progress Bar -->
        <div class="px-6 py-4">
          <div class="mb-2 flex items-center justify-between text-sm">
            <span class="font-medium text-gray-700 dark:text-gray-300">Progress</span>
            <span class="text-gray-500 dark:text-gray-400">{{ progress }}%</span>
          </div>
          <div class="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
            <div
              class="h-full rounded-full bg-indigo-500 transition-all duration-300"
              :style="{ width: `${progress}%` }"
            ></div>
          </div>
        </div>

        <!-- Log Activity -->
        <div class="border-t border-gray-200 px-6 py-4 dark:border-gray-800">
          <h4 class="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Activity Log</h4>
          <div class="max-h-48 space-y-2 overflow-y-auto">
            <div
              v-for="(log, index) in logs"
              :key="index"
              class="flex items-start gap-2 text-xs"
            >
              <svg
                v-if="log.type === 'success'"
                class="mt-0.5 h-4 w-4 shrink-0 text-green-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              <svg
                v-else-if="log.type === 'error'"
                class="mt-0.5 h-4 w-4 shrink-0 text-red-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
              <svg
                v-else
                class="mt-0.5 h-4 w-4 shrink-0 text-blue-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span class="flex-1 text-gray-600 dark:text-gray-400">
                {{ log.message }}
              </span>
              <span class="shrink-0 text-gray-400">{{ log.time }}</span>
            </div>
          </div>
        </div>

        <!-- Footer dengan status -->
        <div v-if="statusMessage" class="border-t border-gray-200 px-6 py-3 dark:border-gray-800">
          <p class="text-center text-sm text-gray-500 dark:text-gray-400">{{ statusMessage }}</p>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

export interface SyncLog {
  type: 'info' | 'success' | 'error'
  message: string
  time: string
}

interface Props {
  visible: boolean
  currentStep?: string
  progress?: number
  logs?: SyncLog[]
  statusMessage?: string
}

const props = withDefaults(defineProps<Props>(), {
  currentStep: 'Memulai sinkronisasi...',
  progress: 0,
  logs: () => [],
  statusMessage: '',
})
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .relative,
.modal-leave-active .relative {
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.modal-enter-from .relative,
.modal-leave-to .relative {
  transform: scale(0.95);
  opacity: 0;
}
</style>
