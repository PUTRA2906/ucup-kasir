<template>
  <AdminLayout>
    <div class="flex min-h-[60vh] items-center justify-center px-4 py-10">
      <div
        class="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm dark:border-gray-800 dark:bg-white/[0.03]"
      >
        <div
          class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-500 dark:bg-red-500/10 dark:text-red-400"
        >
          <svg class="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </div>

        <p class="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
          Error 403
        </p>
        <h1 class="mt-1 text-xl font-extrabold text-gray-900 dark:text-white">
          Akses Ditolak
        </h1>
        <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Akun Anda tidak memiliki izin untuk membuka halaman ini. Hubungi pemilik
          toko bila Anda merasa seharusnya punya akses.
        </p>

        <div v-if="roleLabel" class="mt-3 text-xs text-gray-400 dark:text-gray-500">
          Role Anda: <span class="font-semibold text-gray-600 dark:text-gray-300">{{ roleLabel }}</span>
        </div>

        <div class="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button
            type="button"
            class="inline-flex min-h-11 items-center justify-center rounded-xl bg-brand-500 px-4 text-sm font-semibold text-white transition hover:bg-brand-600 active:scale-[0.98]"
            @click="goHome"
          >
            Kembali ke Dashboard
          </button>
          <button
            type="button"
            class="inline-flex min-h-11 items-center justify-center rounded-xl border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 active:scale-[0.98] dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            @click="signOut"
          >
            Keluar Akun
          </button>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import { useAuthStore } from '@/stores/auth'
import { ROLE_LABELS } from '@/constants/permissions'

const router = useRouter()
const authStore = useAuthStore()

const roleLabel = computed(() => (authStore.role ? ROLE_LABELS[authStore.role] : ''))

function goHome() {
  // Dashboard pun butuh `dashboard.read`. Kalau pun tidak punya, guard akan
  // mengembalikan ke /403 — jadi cukup arahkan ke beranda.
  router.push('/')
}

async function signOut() {
  const result = await authStore.signOut()
  if (!result.cancelled) router.push('/signin')
}
</script>
