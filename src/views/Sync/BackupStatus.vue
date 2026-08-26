<template>
  <div class="flex items-center gap-2">
    <!-- Online + synced -->
    <span
      v-if="!isOnline"
      class="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300"
    >
      <span class="h-1.5 w-1.5 rounded-full bg-gray-400"></span>
      Offline
    </span>

    <span
      v-else-if="uploading || syncing"
      class="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-600 dark:bg-brand-500/10 dark:text-brand-400"
    >
      <svg
        class="h-3 w-3 animate-spin"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      Backup...
    </span>

    <span
      v-else-if="hasPending"
      class="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
    >
      <span class="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
      Menunggu backup
    </span>

    <span
      v-else
      class="inline-flex items-center gap-1.5 rounded-full bg-success-50 px-2.5 py-1 text-xs font-medium text-success-600 dark:bg-success-500/10 dark:text-success-400"
    >
      <span class="h-1.5 w-1.5 rounded-full bg-success-500"></span>
      Tersinkron
    </span>

    <!-- Tombol backup manual -->
    <button
      @click="manualBackup"
      :disabled="!isOnline || uploading"
      class="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
      title="Backup data ke server"
    >
      <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
      </svg>
      Backup
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { useSyncStore } from '@/stores/sync'
import { useNetwork } from '@/lib/network'

const syncStore = useSyncStore()
const { isOnline } = useNetwork()

const uploading = computed(() => syncStore.uploading)
const syncing = computed(() => syncStore.syncing)
const hasPending = computed(() => syncStore.hasPending)

let timer: ReturnType<typeof setInterval> | null = null

async function manualBackup() {
  if (!isOnline.value || uploading.value) return
  await syncStore.uploadAll()
}

onMounted(() => {
  // Refresh pending count berkala (dari sync_queue)
  timer = setInterval(async () => {
    try {
      const { getSyncQueue } = await import('@/lib/sqlite')
      const queue = await getSyncQueue()
      syncStore.pendingCount = queue.length
    } catch {
      // non-critical
    }
  }, 30000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>
