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
        v-if="open"
        class="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
        @click.self="handleReject"
      >
        <Transition
          enter-active-class="transition-all duration-200 ease-out"
          enter-from-class="scale-95 opacity-0"
          enter-to-class="scale-100 opacity-100"
          leave-active-class="transition-all duration-150 ease-in"
          leave-from-class="scale-100 opacity-100"
          leave-to-class="scale-95 opacity-0"
        >
          <div
            v-if="open"
            class="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-900"
          >
            <!-- Icon -->
            <div
              class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-500/15"
            >
              <svg
                class="h-6 w-6 text-amber-600 dark:text-amber-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
                />
              </svg>
            </div>

            <h3 class="mt-4 text-center text-lg font-semibold text-gray-900 dark:text-white">
              Tidak Ada Koneksi Internet
            </h3>

            <p class="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
              Perangkat Anda sedang offline. Anda dapat tetap memakai aplikasi dalam
              <span class="font-medium text-gray-800 dark:text-gray-200">Mode Offline</span>.
            </p>

            <!-- Penjelasan mode offline -->
            <div
              class="mt-4 space-y-2 rounded-xl border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-400"
            >
              <div class="flex items-start gap-2">
                <svg class="mt-0.5 h-4 w-4 shrink-0 text-success-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                <span>Data dibaca &amp; disimpan dari penyimpanan lokal di perangkat.</span>
              </div>
              <div class="flex items-start gap-2">
                <svg class="mt-0.5 h-4 w-4 shrink-0 text-success-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                <span>Transaksi baru tetap tercatat dan dikirim otomatis saat online kembali.</span>
              </div>
              <div class="flex items-start gap-2">
                <svg class="mt-0.5 h-4 w-4 shrink-0 text-warning-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Data mungkin belum selengkap versi terbaru dari server.</span>
              </div>
            </div>

            <!-- Actions -->
            <div class="mt-6 flex flex-col gap-2">
              <button
                @click="handleAccept"
                class="w-full rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 focus:outline-hidden focus:ring-3 focus:ring-brand-500/30"
              >
                Masuk Mode Offline
              </button>
              <button
                @click="handleReject"
                class="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-white/[0.03]"
              >
                Tidak, Tunggu Online
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { onUnmounted, watch } from 'vue'
import {
  isConsentOpen,
  acceptOffline,
  rejectOffline,
} from '@/lib/connectionMode'
import { useNavigationStack } from '@/composables/useNavigationStack'

const { registerDialog, unregisterDialog } = useNavigationStack()

const open = isConsentOpen

// Tombol back Android = tolak (tutup popup, tampilkan layar blokir).
// `immediate` penting: saat cold start tanpa internet popup bisa sudah
// terbuka sebelum komponen ini dipasang — handler back tetap harus ada.
watch(
  open,
  (isOpen) => {
    if (isOpen) registerDialog('offline-consent-dialog', () => rejectOffline())
    else unregisterDialog('offline-consent-dialog')
  },
  { immediate: true }
)

onUnmounted(() => unregisterDialog('offline-consent-dialog'))

const handleAccept = () => acceptOffline()
const handleReject = () => rejectOffline()
</script>
