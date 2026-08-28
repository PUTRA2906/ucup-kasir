<template>
  <FullScreenLayout>
    <div class="flex flex-col items-center justify-center w-full h-screen bg-gray-50 dark:bg-gray-900">
      <div class="flex flex-col items-center max-w-md px-6 text-center">
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

        <h1 class="mb-2 text-xl font-semibold text-gray-800 dark:text-white/90">
          Mengunduh data...
        </h1>
        <p class="mb-4 text-sm text-gray-500 dark:text-gray-400">
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
      </div>
    </div>
  </FullScreenLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import FullScreenLayout from '@/components/layout/FullScreenLayout.vue'
import { useSyncStore } from '@/stores/sync'
import { isNativeApp } from '@/lib/platform'

const props = defineProps<{
  onComplete?: () => void
}>()

const router = useRouter()
const syncStore = useSyncStore()

const message = ref('Mempersiapkan data...')
const progress = ref(0)
const error = ref<string | null>(null)
const syncing = ref(false)

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
    router.push(redirect || '/products')
  }
}

function retry() {
  startDownload()
}

function continueToApp() {
  finish()
}

onMounted(() => {
  startDownload()
})
</script>
