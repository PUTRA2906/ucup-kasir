<template>
  <Transition
    enter-active-class="transition-all duration-200 ease-out"
    enter-from-class="-translate-y-2 opacity-0"
    enter-to-class="translate-y-0 opacity-100"
    leave-active-class="transition-all duration-150 ease-in"
    leave-from-class="translate-y-0 opacity-100"
    leave-to-class="-translate-y-2 opacity-0"
  >
    <div
      v-if="show"
      class="mb-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300"
      role="status"
    >
      <span class="h-2 w-2 shrink-0 rounded-full bg-amber-500" />
      <span class="flex-1">
        Mode Offline — perubahan disimpan lokal dan dikirim saat online kembali.
      </span>
      <button
        v-if="pending > 0"
        class="shrink-0 rounded-md bg-amber-500/15 px-2 py-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300"
        type="button"
        @click="retry"
      >
        {{ pending }} tertunda
      </button>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { isNativeApp } from '@/lib/platform'
import { isOfflineMode, retryConnection } from '@/lib/connectionMode'
import { getSyncQueue } from '@/lib/sqlite'

const native = isNativeApp()
const pending = ref(0)
let timer: ReturnType<typeof setInterval> | null = null

// Banner hanya muncul di native saat benar-benar memakai mode offline
// (sudah menyetujui / sedang offline). Bukan saat layar blokir.
const show = computed(() => native && isOfflineMode())

async function refreshPending() {
  if (!native || !isOfflineMode()) return
  try {
    const queue = await getSyncQueue()
    pending.value = queue.length
  } catch {
    /* abaikan — DB mungkin belum siap */
  }
}

function retry() {
  void retryConnection()
}

onMounted(() => {
  void refreshPending()
  timer = setInterval(refreshPending, 15_000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>
