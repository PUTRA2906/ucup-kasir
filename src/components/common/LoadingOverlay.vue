<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-200 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="visible"
        class="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm"
        aria-live="assertive"
        aria-busy="true"
      >
        <!-- Spinner card -->
        <div class="flex flex-col items-center gap-4 rounded-2xl bg-white px-10 py-8 shadow-xl dark:bg-gray-900">
          <!-- Spinner -->
          <svg
            class="h-10 w-10 animate-spin text-brand-500"
            fill="none"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle
              class="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="4"
            />
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>

          <!-- Pesan utama -->
          <p class="text-sm font-semibold text-gray-800 dark:text-white">
            {{ message || 'Memuat...' }}
          </p>

          <!-- Pesan sub (opsional) -->
          <p
            v-if="subMessage"
            class="mt-0.5 text-center text-xs text-gray-500 dark:text-gray-400"
          >
            {{ subMessage }}
          </p>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    /** Tampilkan/sembunyikan overlay */
    visible: boolean
    /** Teks utama di bawah spinner */
    message?: string
    /** Teks keterangan tambahan (opsional) */
    subMessage?: string
  }>(),
  {
    message: 'Memuat...',
    subMessage: '',
  }
)
</script>
