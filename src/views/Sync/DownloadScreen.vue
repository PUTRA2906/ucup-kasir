<template>
  <FullScreenLayout>
    <div class="flex flex-col items-center justify-center w-full min-h-screen bg-gray-50 dark:bg-gray-900 px-6 py-10">
      <div class="flex flex-col items-center w-full max-w-md">
        <!-- Spinner -->
        <div
          class="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-brand-50 dark:bg-brand-500/10"
        >
          <svg
            class="h-8 w-8 animate-spin text-brand-600 dark:text-brand-400"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              class="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="4"
            ></circle>
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        </div>

        <h1 class="mb-2 text-xl font-semibold text-gray-800 dark:text-white/90 text-center">
          Mengunduh data...
        </h1>
        <p class="mb-4 text-sm text-gray-500 dark:text-gray-400 text-center">
          {{ message }}
        </p>

        <!-- Progress bar -->
        <div class="w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
          <div
            class="h-2 rounded-full bg-brand-500 transition-all duration-500"
            :style="{ width: `${progress}%` }"
          ></div>
        </div>

        <!-- Error state -->
        <div
          v-if="error"
          class="mt-5 w-full rounded-lg border border-error-200 bg-error-50 p-3 text-sm text-error-700 dark:border-error-500/20 dark:bg-error-500/10 dark:text-error-300"
        >
          <p>{{ error }}</p>
        </div>

        <!-- Action buttons -->
        <div v-if="error" class="mt-4 flex gap-3">
          <button
            @click="retry"
            :disabled="syncing"
            class="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
          >
            {{ syncing ? 'Memproses...' : 'Coba Lagi' }}
          </button>
          <button
            @click="continueToApp"
            class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Lanjut dengan data yang ada
          </button>
        </div>

        <!-- Log Panel (hanya di Android) -->
        <div
          v-if="hasLogs"
          class="mt-6 w-full"
        >
          <!-- Toggle button -->
          <button
            @click="showLog = !showLog"
            class="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-500 transition hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-800/60 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            <span class="flex items-center gap-1.5">
              <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M9 12h6m-6 4h6M9 8h6M7 3h10a2 2 0 012 2v14a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2z" />
              </svg>
              Log proses
              <span
                v-if="errorCount > 0"
                class="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-600 dark:bg-red-500/20 dark:text-red-400"
              >
                {{ errorCount }} error
              </span>
            </span>
            <svg
              :class="['h-4 w-4 transition-transform duration-200', showLog ? 'rotate-180' : '']"
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          <!-- Log entries -->
          <div
            v-show="showLog"
            ref="logContainerRef"
            class="mt-1 max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-gray-950 p-2 font-mono text-[11px] leading-relaxed dark:border-gray-800"
          >
            <div
              v-for="entry in logEntries"
              :key="entry.id"
              :class="[
                'flex gap-1.5',
                entry.level === 'error' ? 'text-red-400' :
                entry.level === 'warn'  ? 'text-yellow-400' :
                                          'text-green-400',
              ]"
            >
              <!-- Timestamp -->
              <span class="shrink-0 text-gray-600">{{ formatTs(entry.ts) }}</span>
              <!-- Level badge -->
              <span
                :class="[
                  'shrink-0 uppercase',
                  entry.level === 'error' ? 'text-red-500' :
                  entry.level === 'warn'  ? 'text-yellow-500' :
                                            'text-brand-400',
                ]"
              >{{ entry.level }}</span>
              <!-- Pesan -->
              <span class="break-all text-gray-300">{{ entry.message }}</span>
            </div>
            <!-- Penanda akhir untuk auto-scroll -->
            <div ref="logBottomRef"></div>
          </div>
        </div>
      </div>
    </div>
  </FullScreenLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import FullScreenLayout from '@/components/layout/FullScreenLayout.vue'
import { useSyncStore } from '@/stores/sync'
import { isNativeApp } from '@/lib/platform'
import { useStartupLog } from '@/composables/useStartupLog'

const props = defineProps<{
  onComplete?: () => void
}>()

const router = useRouter()
const syncStore = useSyncStore()
const { entries, onLog } = useStartupLog()

const message = ref('Mempersiapkan data...')
const progress = ref(0)
const error = ref<string | null>(null)
const syncing = ref(false)

// Log panel state
const showLog = ref(false)
const logContainerRef = ref<HTMLElement | null>(null)
const logBottomRef = ref<HTMLElement | null>(null)

// Hanya tampilkan panel di native (Android)
const logEntries = computed(() => (isNativeApp() ? entries.value : []))
const hasLogs = computed(() => logEntries.value.length > 0)
const errorCount = computed(() => logEntries.value.filter((e) => e.level === 'error').length)

// Auto-scroll ke bawah setiap ada log baru (hanya saat panel terbuka)
let unsubscribe: (() => void) | null = null
onMounted(() => {
  unsubscribe = onLog(async () => {
    if (!showLog.value) return
    await nextTick()
    logBottomRef.value?.scrollIntoView({ behavior: 'smooth' })
  })
  startDownload()
})

onUnmounted(() => {
  unsubscribe?.()
})

// Auto-scroll saat panel dibuka pertama kali agar langsung melihat log terbaru
watch(showLog, async (open) => {
  if (!open) return
  await nextTick()
  logBottomRef.value?.scrollIntoView({ behavior: 'instant' })
})

/** Format epoch ms → HH:MM:SS */
function formatTs(ts: number): string {
  const d = new Date(ts)
  return [d.getHours(), d.getMinutes(), d.getSeconds()]
    .map((n) => String(n).padStart(2, '0'))
    .join(':')
}

async function startDownload() {
  // Web: tidak ada sinkronisasi offline — langsung lanjut ke app.
  if (!isNativeApp()) {
    finish()
    return
  }

  syncing.value = true
  error.value = null
  progress.value = 15

  try {
    const result = await syncStore.downloadAll()
    if (!result.success) {
      error.value = result.message || 'Gagal mengunduh data'
      progress.value = 100
      return
    }
    progress.value = 100
    message.value = result.downloaded
      ? `${result.downloaded} data berhasil diunduh`
      : 'Tidak ada data untuk diunduh'

    // Lanjut ke app
    finish()
  } catch (e: any) {
    error.value = e.message || 'Gagal mengunduh data'
    progress.value = 100
  } finally {
    syncing.value = false
  }
}

function finish() {
  if (props.onComplete) {
    props.onComplete()
  } else {
    const redirect = router.currentRoute.value.query.redirect as string | undefined
    router.push(redirect || '/')
  }
}

function retry() {
  startDownload()
}

function continueToApp() {
  finish()
}
</script>
