<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="visible"
        class="fixed inset-0 z-[55] flex flex-col items-center justify-center bg-white px-6 py-10 dark:bg-gray-950"
      >
        <div class="flex w-full max-w-sm flex-col items-center text-center">
          <!-- Icon -->
          <div
            class="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800"
          >
            <svg
              class="h-10 w-10 text-gray-400 dark:text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.8"
                d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
              />
            </svg>
          </div>

          <h1 class="text-xl font-bold text-gray-900 dark:text-white">Tidak Ada Internet</h1>
          <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Aplikasi memerlukan koneksi internet untuk menyimpan perubahan. Sambungkan perangkat
            ke internet lalu coba lagi.
          </p>

          <!-- Progress saat mencoba -->
          <div
            v-if="retrying"
            class="mt-6 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400"
          >
            <svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Memeriksa koneksi...
          </div>

          <!-- Actions -->
          <div class="mt-8 flex w-full flex-col gap-2">
            <button
              @click="handleRetry"
              :disabled="retrying"
              class="w-full rounded-xl bg-brand-500 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-brand-500/20 transition active:scale-[0.98] hover:bg-brand-600 disabled:opacity-60"
            >
              Coba Lagi
            </button>
            <button
              @click="browseCached"
              class="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-white/[0.03]"
            >
              Lihat Data Tersimpan
            </button>
          </div>
          <p class="mt-3 text-[11px] text-gray-400 dark:text-gray-600">
            Data tersimpan hanya bisa dibaca; transaksi baru tidak dapat dibuat.
          </p>

          <p v-if="lastChecked" class="mt-6 text-xs text-gray-400 dark:text-gray-600">
            Terakhir diperiksa: {{ lastChecked }}
          </p>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { isOnlineRef, probeConnectivity } from '@/lib/network'

const retrying = ref(false)
const lastChecked = ref<string | null>(null)

// Pengguna boleh menembus layar ini untuk melihat data yang sudah ter-cache
// (read-only). Nilai kembali false begitu koneksi pulih, supaya layar tidak
// menutupi UI lagi pada pemutusan berikutnya.
const dismissed = ref(false)

// Mode offline sudah dihapus: tanpa internet aplikasi tidak bisa menyimpan
// perubahan (transaksi wajib lewat RPC Supabase). Layar ini menutupi UI
// selama offline, kecuali pengguna memilih melihat data tersimpan.
const visible = computed(() => !isOnlineRef.value && !dismissed.value)

function browseCached() {
  dismissed.value = true
}

// Koneksi pulih → reset agar pemutusan berikutnya menampilkan layar lagi.
watch(isOnlineRef, (online) => {
  if (online) dismissed.value = false
})

async function handleRetry() {
  if (retrying.value) return
  retrying.value = true
  try {
    await probeConnectivity()
    const now = new Date()
    lastChecked.value = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  } finally {
    retrying.value = false
  }
}
</script>
