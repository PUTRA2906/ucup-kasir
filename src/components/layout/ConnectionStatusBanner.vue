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
        Koneksi terputus — data yang tampil mungkin tidak terbaru. Perubahan tidak dapat disimpan
        sampai online kembali.
      </span>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { isOnlineRef } from '@/lib/network'

// Mode offline sudah dihapus (lihat docs/RBAC_PLAN.md §7.3). Banner ini
// hanya memberi tahu bahwa data yang ter-cache mungkin basi; penulisan tetap
// ditolak server sampai koneksi pulih.
const show = computed(() => !isOnlineRef.value)
</script>
